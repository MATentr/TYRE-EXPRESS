"""Tyre Express Backend - Roadside Assistance API."""
import os
import uuid
import math
import base64
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import bcrypt
import jwt
import stripe
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---- Config ----
mongo_url = os.environ["MONGO_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
JWT_EXP_HOURS = 24 * 7
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
stripe.api_key = os.environ["STRIPE_API_KEY"]

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Tyre Express API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("tyre-express")


# ---- Models ----
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"  # user | mechanic
    phone: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    garage_name: Optional[str] = None
    services: Optional[List[str]] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class LocationIn(BaseModel):
    lat: float
    lng: float


class RequestIn(BaseModel):
    issue_type: str  # puncture | engine | battery | fuel | other
    lat: float
    lng: float
    description: Optional[str] = None
    photo_b64: Optional[str] = None


class RequestUpdateIn(BaseModel):
    status: str  # accepted | rejected | en_route | arrived | completed | cancelled


class SOSContactIn(BaseModel):
    name: str
    phone: str


class ReviewIn(BaseModel):
    rating: int
    comment: Optional[str] = None


class AiAnalyzeIn(BaseModel):
    image_b64: str


class PaymentIntentIn(BaseModel):
    request_id: str
    amount_cents: int
    method: str = "card"  # card | upi | cash


# ---- Helpers ----
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")


def haversine_km(a_lat, a_lng, b_lat, b_lng) -> float:
    R = 6371.0
    dlat = math.radians(b_lat - a_lat)
    dlng = math.radians(b_lng - a_lng)
    x = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(a_lat))
        * math.cos(math.radians(b_lat))
        * math.sin(dlng / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(x))


def clean(doc):
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ---- Auth ----
@api.post("/auth/register")
async def register(data: RegisterIn):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password_hash": hash_pw(data.password),
        "role": data.role,
        "phone": data.phone or "",
        "vehicle_type": data.vehicle_type,
        "vehicle_number": data.vehicle_number,
        "garage_name": data.garage_name,
        "services": data.services or [],
        "lat": data.lat,
        "lng": data.lng,
        "rating_avg": 5.0,
        "rating_count": 0,
        "online": data.role == "mechanic",
        "sos_contacts": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_token(user_id)
    return {"token": token, "user": clean(doc.copy())}


@api.post("/auth/login")
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"])
    return {"token": token, "user": clean(dict(user))}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


@api.patch("/auth/location")
async def update_location(loc: LocationIn, user=Depends(current_user)):
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"lat": loc.lat, "lng": loc.lng}}
    )
    return {"ok": True}


@api.patch("/auth/online")
async def toggle_online(online: bool = True, user=Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"online": online}})
    return {"online": online}


# ---- Mechanics ----
@api.get("/mechanics/nearby")
async def mechanics_nearby(
    lat: float, lng: float, radius_km: float = 25.0, user=Depends(current_user)
):
    mechs = await db.users.find(
        {"role": "mechanic", "online": True},
        {"_id": 0, "password_hash": 0},
    ).to_list(500)
    result = []
    for m in mechs:
        if m.get("lat") is None or m.get("lng") is None:
            continue
        d = haversine_km(lat, lng, m["lat"], m["lng"])
        if d <= radius_km:
            m["distance_km"] = round(d, 2)
            m["eta_min"] = max(5, int(d * 2.5))
            result.append(m)
    result.sort(key=lambda x: x["distance_km"])
    return result


# ---- Service Requests ----
@api.post("/requests")
async def create_request(data: RequestIn, user=Depends(current_user)):
    # Find nearest online mechanic
    mechs = await db.users.find(
        {"role": "mechanic", "online": True}, {"_id": 0, "password_hash": 0}
    ).to_list(500)
    nearest = None
    best_d = 1e9
    for m in mechs:
        if m.get("lat") is None:
            continue
        d = haversine_km(data.lat, data.lng, m["lat"], m["lng"])
        if d < best_d:
            best_d = d
            nearest = m

    est_cost = {"puncture": 500, "engine": 1500, "battery": 800, "fuel": 400, "other": 700}.get(
        data.issue_type, 700
    )
    eta_min = max(5, int(best_d * 2.5)) if nearest else 15

    req_id = str(uuid.uuid4())
    doc = {
        "id": req_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_phone": user.get("phone", ""),
        "issue_type": data.issue_type,
        "description": data.description or "",
        "photo_b64": data.photo_b64,
        "lat": data.lat,
        "lng": data.lng,
        "assigned_mechanic_id": nearest["id"] if nearest else None,
        "mechanic_name": nearest["name"] if nearest else None,
        "mechanic_phone": nearest.get("phone") if nearest else None,
        "mechanic_lat": nearest["lat"] if nearest else None,
        "mechanic_lng": nearest["lng"] if nearest else None,
        "garage_name": nearest.get("garage_name") if nearest else None,
        "distance_km": round(best_d, 2) if nearest else None,
        "eta_min": eta_min,
        "estimated_cost": est_cost,
        "status": "pending" if nearest else "no_mechanic",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payment_status": "unpaid",
        "rating": None,
    }
    await db.requests.insert_one(doc)
    return clean(doc.copy())


@api.get("/requests/my")
async def my_requests(user=Depends(current_user)):
    docs = await db.requests.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return docs


@api.get("/requests/assigned")
async def assigned_requests(user=Depends(current_user)):
    if user["role"] != "mechanic":
        raise HTTPException(403, "Mechanic only")
    docs = await db.requests.find(
        {"assigned_mechanic_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return docs


@api.get("/requests/{rid}")
async def get_request(rid: str, user=Depends(current_user)):
    doc = await db.requests.find_one({"id": rid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api.patch("/requests/{rid}")
async def update_request(rid: str, upd: RequestUpdateIn, user=Depends(current_user)):
    doc = await db.requests.find_one({"id": rid})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.requests.update_one(
        {"id": rid},
        {"$set": {"status": upd.status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    updated = await db.requests.find_one({"id": rid}, {"_id": 0})
    return updated


@api.post("/requests/{rid}/review")
async def review_request(rid: str, r: ReviewIn, user=Depends(current_user)):
    doc = await db.requests.find_one({"id": rid})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.requests.update_one(
        {"id": rid},
        {"$set": {"rating": r.rating, "review": r.comment or ""}},
    )
    if doc.get("assigned_mechanic_id"):
        mech = await db.users.find_one({"id": doc["assigned_mechanic_id"]})
        if mech:
            new_count = mech.get("rating_count", 0) + 1
            new_avg = (
                (mech.get("rating_avg", 5.0) * mech.get("rating_count", 0)) + r.rating
            ) / new_count
            await db.users.update_one(
                {"id": mech["id"]},
                {"$set": {"rating_avg": round(new_avg, 2), "rating_count": new_count}},
            )
    return {"ok": True}


# ---- SOS Contacts ----
@api.get("/sos/contacts")
async def get_sos(user=Depends(current_user)):
    return user.get("sos_contacts", [])


@api.post("/sos/contacts")
async def add_sos(contact: SOSContactIn, user=Depends(current_user)):
    contacts = user.get("sos_contacts", [])
    contacts.append({"id": str(uuid.uuid4()), "name": contact.name, "phone": contact.phone})
    await db.users.update_one({"id": user["id"]}, {"$set": {"sos_contacts": contacts}})
    return contacts


@api.delete("/sos/contacts/{cid}")
async def del_sos(cid: str, user=Depends(current_user)):
    contacts = [c for c in user.get("sos_contacts", []) if c["id"] != cid]
    await db.users.update_one({"id": user["id"]}, {"$set": {"sos_contacts": contacts}})
    return contacts


@api.post("/sos/alert")
async def sos_alert(loc: LocationIn, user=Depends(current_user)):
    """Mock SOS - in production would send SMS to all sos_contacts."""
    contacts = user.get("sos_contacts", [])
    alert = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "lat": loc.lat,
        "lng": loc.lng,
        "sent_to": [c["phone"] for c in contacts],
        "map_link": f"https://www.openstreetmap.org/?mlat={loc.lat}&mlon={loc.lng}#map=17/{loc.lat}/{loc.lng}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sos_alerts.insert_one(alert.copy())
    return clean(alert)


# ---- AI Photo Detection ----
@api.post("/ai/analyze")
async def ai_analyze(data: AiAnalyzeIn, user=Depends(current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"ai-analyze-{uuid.uuid4()}",
            system_message=(
                "You are an expert automobile mechanic. Look at the photo and identify "
                "the vehicle issue. Reply STRICTLY in this JSON format only, no prose: "
                '{"issue_type": "puncture|engine|battery|fuel|other", '
                '"confidence": 0.0-1.0, "notes": "short human explanation", '
                '"estimated_cost_inr": number}'
            ),
        ).with_model("openai", "gpt-4o")

        msg = UserMessage(
            text="Analyze this vehicle problem photo:",
            file_contents=[ImageContent(image_base64=data.image_b64)],
        )
        resp = await chat.send_message(msg)

        import json, re
        text = str(resp).strip()
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                parsed = json.loads(m.group(0))
                return parsed
            except Exception:
                pass
        return {"issue_type": "other", "confidence": 0.5, "notes": text[:200], "estimated_cost_inr": 700}
    except Exception as e:
        log.exception("AI analyze failed")
        raise HTTPException(500, f"AI analysis failed: {e}")


# ---- Payment ----
@api.post("/payments/intent")
async def create_payment_intent(data: PaymentIntentIn, user=Depends(current_user)):
    req = await db.requests.find_one({"id": data.request_id})
    if not req:
        raise HTTPException(404, "Request not found")

    if data.method == "cash":
        await db.requests.update_one(
            {"id": data.request_id},
            {"$set": {"payment_status": "cash_pending", "payment_method": "cash"}},
        )
        return {"method": "cash", "status": "cash_pending"}

    if data.method == "upi":
        # Mock UPI
        await db.requests.update_one(
            {"id": data.request_id},
            {"$set": {"payment_status": "paid", "payment_method": "upi"}},
        )
        return {"method": "upi", "status": "paid", "upi_link": f"upi://pay?pa=tyreexpress@upi&am={data.amount_cents/100}"}

    try:
        intent = stripe.PaymentIntent.create(
            amount=data.amount_cents,
            currency="inr",
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
            metadata={"request_id": data.request_id, "user_id": user["id"]},
        )
        await db.requests.update_one(
            {"id": data.request_id},
            {"$set": {"payment_intent_id": intent.id, "payment_method": "card"}},
        )
        return {"client_secret": intent.client_secret, "payment_intent_id": intent.id}
    except Exception as e:
        log.exception("Stripe intent failed")
        raise HTTPException(500, f"Stripe error: {e}")


@api.post("/payments/mock-confirm/{rid}")
async def mock_confirm(rid: str, user=Depends(current_user)):
    """Mock payment confirmation for demo (bypasses Stripe SDK client)."""
    await db.requests.update_one(
        {"id": rid}, {"$set": {"payment_status": "paid"}}
    )
    return {"paid": True}


# ---- Admin ----
@api.get("/admin/stats")
async def admin_stats(user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return {
        "users": await db.users.count_documents({"role": "user"}),
        "mechanics": await db.users.count_documents({"role": "mechanic"}),
        "requests_total": await db.requests.count_documents({}),
        "requests_completed": await db.requests.count_documents({"status": "completed"}),
    }


# ---- Health ----
@api.get("/")
async def root():
    return {"app": "Tyre Express", "status": "ok"}


# ---- Seed sample data ----
@app.on_event("startup")
async def seed():
    await db.users.create_index("email", unique=True)
    if await db.users.count_documents({"role": "mechanic"}) < 3:
        samples = [
            {
                "name": "Ravi Kumar",
                "email": "ravi@tyreexpress.com",
                "garage_name": "Ravi's 24x7 Garage",
                "phone": "+919876543210",
                "lat": 12.9716, "lng": 77.5946,  # Bangalore center
                "services": ["puncture", "engine", "battery"],
                "rating_avg": 4.8, "rating_count": 42,
            },
            {
                "name": "Suresh M",
                "email": "suresh@tyreexpress.com",
                "garage_name": "Highway Auto Care",
                "phone": "+919876543211",
                "lat": 12.9756, "lng": 77.6046,
                "services": ["puncture", "fuel"],
                "rating_avg": 4.6, "rating_count": 28,
            },
            {
                "name": "Anil Sharma",
                "email": "anil@tyreexpress.com",
                "garage_name": "Roadside Rescue Pro",
                "phone": "+919876543212",
                "lat": 12.9616, "lng": 77.5846,
                "services": ["engine", "battery", "fuel", "puncture", "other"],
                "rating_avg": 4.9, "rating_count": 87,
            },
        ]
        for s in samples:
            if await db.users.find_one({"email": s["email"]}):
                continue
            s.update({
                "id": str(uuid.uuid4()),
                "password_hash": hash_pw("mechanic123"),
                "role": "mechanic",
                "online": True,
                "sos_contacts": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            await db.users.insert_one(s)
        log.info("Seeded sample mechanics")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

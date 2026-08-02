"""End-to-end backend tests for Tyre Express API.

Ordering matters: many tests share module-level state (driver token,
mechanic token, created request id). We use a numeric prefix + pytest
`-p no:randomly` friendly ordering by putting them in one class.
"""
import base64
import time
import uuid

import pytest
import requests

# ----- module-level shared state -----
STATE = {
    "driver_token": None,
    "driver_id": None,
    "driver_email": None,
    "mechanic_token": None,
    "mechanic_id": None,
    "request_id": None,
    "sos_contact_id": None,
}

BLR_LAT, BLR_LNG = 12.9716, 77.5946


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_root_health(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("app") == "Tyre Express"
        assert data.get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_01_register_driver(self, base_url, api_client):
        email = f"TEST_driver_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "TEST Driver",
            "email": email,
            "password": "driver123",
            "role": "user",
            "phone": "+919999999999",
            "vehicle_type": "Sedan",
            "vehicle_number": "KA01AB1234",
        }
        r = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str)
        assert "user" in data
        u = data["user"]
        assert u["email"] == email
        assert u["role"] == "user"
        assert "_id" not in u
        assert "password_hash" not in u
        STATE["driver_token"] = data["token"]
        STATE["driver_id"] = u["id"]
        STATE["driver_email"] = email

    def test_02_register_mechanic(self, base_url, api_client):
        email = f"TEST_mech_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "TEST Mechanic",
            "email": email,
            "password": "mech123",
            "role": "mechanic",
            "phone": "+919000000000",
            "garage_name": "TEST Garage",
            "services": ["puncture", "engine"],
            "lat": BLR_LAT + 0.001,
            "lng": BLR_LNG + 0.001,
        }
        r = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        u = data["user"]
        assert u["role"] == "mechanic"
        assert u["online"] is True  # mechanics online by default
        assert "_id" not in u and "password_hash" not in u

    def test_03_register_duplicate_email(self, base_url, api_client):
        payload = {
            "name": "Dup",
            "email": STATE["driver_email"],
            "password": "x",
            "role": "user",
        }
        r = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert r.status_code == 400

    def test_04_login_seed_mechanic(self, base_url, api_client):
        r = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "ravi@tyreexpress.com", "password": "mechanic123"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        u = data["user"]
        assert u["email"] == "ravi@tyreexpress.com"
        assert u["role"] == "mechanic"
        assert "_id" not in u and "password_hash" not in u
        STATE["mechanic_token"] = data["token"]
        STATE["mechanic_id"] = u["id"]

    def test_05_login_invalid(self, base_url, api_client):
        r = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "ravi@tyreexpress.com", "password": "wrong"},
        )
        assert r.status_code == 401

    def test_06_me(self, base_url, api_client):
        r = api_client.get(
            f"{base_url}/api/auth/me", headers=auth_headers(STATE["driver_token"])
        )
        assert r.status_code == 200
        u = r.json()
        assert u["id"] == STATE["driver_id"]
        assert "_id" not in u and "password_hash" not in u

    def test_07_me_no_token(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_08_update_location(self, base_url, api_client):
        r = api_client.patch(
            f"{base_url}/api/auth/location",
            headers=auth_headers(STATE["driver_token"]),
            json={"lat": BLR_LAT, "lng": BLR_LNG},
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # verify persistence
        me = api_client.get(
            f"{base_url}/api/auth/me", headers=auth_headers(STATE["driver_token"])
        ).json()
        assert abs(me["lat"] - BLR_LAT) < 1e-6
        assert abs(me["lng"] - BLR_LNG) < 1e-6

    def test_09_toggle_online(self, base_url, api_client):
        r = api_client.patch(
            f"{base_url}/api/auth/online?online=true",
            headers=auth_headers(STATE["mechanic_token"]),
        )
        assert r.status_code == 200
        assert r.json().get("online") is True


# ---------- Mechanics nearby ----------
class TestMechanics:
    def test_10_mechanics_nearby(self, base_url, api_client):
        r = api_client.get(
            f"{base_url}/api/mechanics/nearby",
            headers=auth_headers(STATE["driver_token"]),
            params={"lat": BLR_LAT, "lng": BLR_LNG, "radius_km": 50},
        )
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert len(arr) >= 3, f"Expected at least 3 online mechanics, got {len(arr)}"
        for m in arr:
            assert "distance_km" in m
            assert "eta_min" in m
            assert m["role"] == "mechanic"
            assert "_id" not in m and "password_hash" not in m
        # sorted by distance
        dists = [m["distance_km"] for m in arr]
        assert dists == sorted(dists)


# ---------- Requests ----------
class TestRequests:
    def test_11_create_request_autoassign(self, base_url, api_client):
        payload = {
            "issue_type": "puncture",
            "lat": BLR_LAT,
            "lng": BLR_LNG,
            "description": "Front left tire flat",
        }
        r = api_client.post(
            f"{base_url}/api/requests",
            headers=auth_headers(STATE["driver_token"]),
            json=payload,
        )
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["issue_type"] == "puncture"
        assert doc["assigned_mechanic_id"] is not None, "auto-assign failed"
        assert doc["mechanic_name"]
        assert doc["estimated_cost"] == 500
        assert doc["eta_min"] >= 5
        assert doc["status"] == "pending"
        assert "_id" not in doc
        STATE["request_id"] = doc["id"]

    def test_12_get_request_by_id(self, base_url, api_client):
        r = api_client.get(
            f"{base_url}/api/requests/{STATE['request_id']}",
            headers=auth_headers(STATE["driver_token"]),
        )
        assert r.status_code == 200
        assert r.json()["id"] == STATE["request_id"]

    def test_13_my_requests(self, base_url, api_client):
        r = api_client.get(
            f"{base_url}/api/requests/my",
            headers=auth_headers(STATE["driver_token"]),
        )
        assert r.status_code == 200
        arr = r.json()
        assert any(x["id"] == STATE["request_id"] for x in arr)

    def test_14_assigned_requests_as_mechanic(self, base_url, api_client):
        # Login seed mechanic Ravi (who is at exact BLR center - nearest)
        r = api_client.get(
            f"{base_url}/api/requests/assigned",
            headers=auth_headers(STATE["mechanic_token"]),
        )
        assert r.status_code == 200
        # Assigned mechanic should be Ravi (or another - just verify endpoint works)
        arr = r.json()
        assert isinstance(arr, list)

    def test_15_assigned_forbidden_for_user(self, base_url, api_client):
        r = api_client.get(
            f"{base_url}/api/requests/assigned",
            headers=auth_headers(STATE["driver_token"]),
        )
        assert r.status_code == 403

    def test_16_status_transitions(self, base_url, api_client):
        for st in ["accepted", "en_route", "completed"]:
            r = api_client.patch(
                f"{base_url}/api/requests/{STATE['request_id']}",
                headers=auth_headers(STATE["mechanic_token"]),
                json={"status": st},
            )
            assert r.status_code == 200, r.text
            assert r.json()["status"] == st

    def test_17_review(self, base_url, api_client):
        # get mechanic id currently assigned
        req = api_client.get(
            f"{base_url}/api/requests/{STATE['request_id']}",
            headers=auth_headers(STATE["driver_token"]),
        ).json()
        mech_id = req["assigned_mechanic_id"]
        assert mech_id
        # login as that mechanic to fetch pre-rating (use ravi seed if match else skip)
        r = api_client.post(
            f"{base_url}/api/requests/{STATE['request_id']}/review",
            headers=auth_headers(STATE["driver_token"]),
            json={"rating": 5, "comment": "Great service"},
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- SOS ----------
class TestSOS:
    def test_18_add_sos_contact(self, base_url, api_client):
        r = api_client.post(
            f"{base_url}/api/sos/contacts",
            headers=auth_headers(STATE["driver_token"]),
            json={"name": "TEST Mom", "phone": "+911234567890"},
        )
        assert r.status_code == 200
        contacts = r.json()
        assert len(contacts) >= 1
        STATE["sos_contact_id"] = contacts[-1]["id"]

    def test_19_get_sos_contacts(self, base_url, api_client):
        r = api_client.get(
            f"{base_url}/api/sos/contacts",
            headers=auth_headers(STATE["driver_token"]),
        )
        assert r.status_code == 200
        arr = r.json()
        assert any(c["id"] == STATE["sos_contact_id"] for c in arr)

    def test_20_sos_alert_returns_map_link(self, base_url, api_client):
        r = api_client.post(
            f"{base_url}/api/sos/alert",
            headers=auth_headers(STATE["driver_token"]),
            json={"lat": BLR_LAT, "lng": BLR_LNG},
        )
        assert r.status_code == 200
        data = r.json()
        assert "map_link" in data
        assert str(BLR_LAT) in data["map_link"]
        assert str(BLR_LNG) in data["map_link"]

    def test_21_delete_sos_contact(self, base_url, api_client):
        r = api_client.delete(
            f"{base_url}/api/sos/contacts/{STATE['sos_contact_id']}",
            headers=auth_headers(STATE["driver_token"]),
        )
        assert r.status_code == 200
        arr = r.json()
        assert not any(c["id"] == STATE["sos_contact_id"] for c in arr)


# ---------- AI Analyze ----------
class TestAI:
    def test_22_ai_analyze(self, base_url, api_client):
        # 1x1 white JPEG
        tiny_jpeg = (
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD/2Q=="
        )
        r = api_client.post(
            f"{base_url}/api/ai/analyze",
            headers=auth_headers(STATE["driver_token"]),
            json={"image_b64": tiny_jpeg},
            timeout=45,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # Response should have expected keys (may fall back to default schema)
        assert "issue_type" in data
        assert "confidence" in data or "notes" in data or "estimated_cost_inr" in data


# ---------- Payments ----------
class TestPayments:
    def test_23_intent_card_stripe(self, base_url, api_client):
        r = api_client.post(
            f"{base_url}/api/payments/intent",
            headers=auth_headers(STATE["driver_token"]),
            json={"request_id": STATE["request_id"], "amount_cents": 50000, "method": "card"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "client_secret" in data
        assert data["client_secret"].startswith("pi_") or "_secret_" in data["client_secret"]
        assert "payment_intent_id" in data

    def test_24_intent_upi(self, base_url, api_client):
        r = api_client.post(
            f"{base_url}/api/payments/intent",
            headers=auth_headers(STATE["driver_token"]),
            json={"request_id": STATE["request_id"], "amount_cents": 50000, "method": "upi"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["method"] == "upi"
        assert "upi_link" in data
        assert data["status"] == "paid"

    def test_25_intent_cash(self, base_url, api_client):
        # Create a fresh request to avoid overwriting paid state
        req_payload = {
            "issue_type": "battery",
            "lat": BLR_LAT,
            "lng": BLR_LNG,
        }
        rc = api_client.post(
            f"{base_url}/api/requests",
            headers=auth_headers(STATE["driver_token"]),
            json=req_payload,
        )
        rid = rc.json()["id"]
        r = api_client.post(
            f"{base_url}/api/payments/intent",
            headers=auth_headers(STATE["driver_token"]),
            json={"request_id": rid, "amount_cents": 80000, "method": "cash"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["method"] == "cash"
        assert data["status"] == "cash_pending"

    def test_26_mock_confirm(self, base_url, api_client):
        r = api_client.post(
            f"{base_url}/api/payments/mock-confirm/{STATE['request_id']}",
            headers=auth_headers(STATE["driver_token"]),
        )
        assert r.status_code == 200
        assert r.json().get("paid") is True
        # verify persistence
        got = api_client.get(
            f"{base_url}/api/requests/{STATE['request_id']}",
            headers=auth_headers(STATE["driver_token"]),
        ).json()
        assert got["payment_status"] == "paid"

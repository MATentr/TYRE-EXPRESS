# Tyre Express - Product Requirements

## Overview
Mobile roadside assistance app connecting stranded drivers with nearby mechanics in 2 taps.

## Tech Stack
- Frontend: Expo SDK 54 + React Native (expo-router)
- Backend: FastAPI + Motor (async MongoDB)
- Maps: OpenStreetMap via Leaflet in react-native-webview (no API key)
- AI: GPT-4o vision via Emergent LLM key
- Payments: Stripe test mode + UPI mock + Cash

## Roles
- **Driver (user)** - request help, track mechanic, pay & review
- **Mechanic** - go online, accept/decline requests, mark en-route/completed
- **Admin** - stats (basic)

## Core Flows
1. Register/Login (email+password JWT)
2. Driver Home: full-screen dark OSM map + issue chips + REQUEST HELP CTA. On tap → creates request, assigns nearest online mechanic, auto-dials mechanic phone, opens live tracking.
3. Live Tracking: map with route polyline, mechanic card, call button, status updates.
4. AI Detect: snap photo → GPT-4o classifies issue → 1-tap confirm creates request.
5. Payment: Stripe card / UPI mock / Cash, bill generation.
6. Rating & review after completion.
7. SOS: emergency contacts + one-tap alert with OSM location link.
8. Mechanic Dashboard: online toggle, stats, accept/decline requests, mark complete.

## Backend Endpoints (all under `/api`)
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `PATCH /auth/location`, `PATCH /auth/online`
- `GET /mechanics/nearby`
- `POST /requests`, `GET /requests/my`, `GET /requests/assigned`, `GET /requests/{id}`, `PATCH /requests/{id}`, `POST /requests/{id}/review`
- `GET/POST/DELETE /sos/contacts`, `POST /sos/alert`
- `POST /ai/analyze`
- `POST /payments/intent`, `POST /payments/mock-confirm/{rid}`
- `GET /admin/stats`

## Design
- Dark asphalt (#111315) + Safety Yellow (#FFD600), Signal Red (#FF3B30) for SOS/errors.
- 56pt+ primary CTAs, kebab-case testIDs on all interactive elements.

## Seed Data
Three mechanics around Bangalore (12.9716, 77.5946). Password `mechanic123`.

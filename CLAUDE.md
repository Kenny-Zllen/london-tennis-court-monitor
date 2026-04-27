# London Tennis Court Monitor — Claude Code Project Context

## 1. Project Overview

This is a full-stack cached tennis court monitoring prototype.

The project started as a London tennis venue discovery frontend and has evolved into a deployed full-stack prototype with:

- React + Vite + Tailwind frontend
- FastAPI backend
- Vercel frontend deployment
- Render backend deployment
- Multi-venue backend architecture
- Cached snapshot API
- Protected manual refresh endpoints
- Static fallback behavior
- Investigation workflows for different booking platforms

The project is not a live scraping tool and not an auto-booking system.

Normal users should only read cached snapshot data from the backend or static fallback data. Any refresh operation must remain developer-controlled and protected by a token.

---

## 2. Current Product State

### Frontend

Frontend stack:

- React
- Vite
- Tailwind CSS
- Deployed on Vercel

Frontend responsibilities:

- Venue discovery UI
- Multi-venue snapshot dashboard
- Snapshot date selector
- Venue selector
- System status display
- Backend connection / fallback state
- Official booking redirects
- Static fallback when backend is unavailable

Frontend must not:

- Call ClubSpark directly
- Call Better directly
- Trigger refresh endpoints automatically
- Expose refresh tokens
- Scrape booking pages
- Submit booking forms
- Auto-book anything

### Backend

Backend stack:

- FastAPI
- Python
- Deployed on Render
- Cached JSON files
- Protected manual refresh endpoints

Backend responsibilities:

- Serve venue registry
- Serve cached snapshot dates
- Serve cached snapshot data
- Run protected developer-only refresh operations
- Normalize venue-specific data into a common cached snapshot format

Backend must not:

- Trigger refresh from normal GET endpoints
- Auto-book
- Bypass login
- Submit booking forms
- Expose refresh tokens
- Run public user-triggered scraping

---

## 3. Current Supported Venues

### Fully / partially supported cached venues

#### Finsbury Park

Venue id:

```text
finsbury-park

Booking platform:

ClubSpark / LTA

Current method:

Playwright-rendered page investigation / parser

Current data characteristics:

Public booking page is visible without login.
Rendered page text contains court / time / status.
Parser generates cached records.
Price extraction was found unreliable near court boundaries, so price should not be shown unless explicitly validated.
Records should generally be grouped by court.

Expected display fields:

court
timeRange
status
confidence internally, not prominent in UI
Lee Valley Hockey and Tennis Centre

Venue id:

lee-valley

Booking platform:

Better

Current method:

Better public JSON API

Confirmed public API:

https://better-admin.org.uk/api/activities/venue/lee-valley-hockey-and-tennis-centre/activity/tennis-court-outdoor/times?date=YYYY-MM-DD

Confirmed response fields:

starts_at.format_24_hour
ends_at.format_24_hour
duration
price.formatted_amount
spaces
name
date
venue_slug
category_slug
action_to_show.status
allows_anonymous_bookings

Manual investigation result:

No login required to view slot visibility.
Slot data is public and structured.
Booking itself may still require a Better account because allows_anonymous_bookings can be false.
Local parser found example results:
total slots: 12
available slots: 7
unavailable slots: 5
price: £14.00
confidence: high

Expected display fields:

activity
timeRange
status
spaces
price
confidence internally, not prominent in UI
sourceStatus internally, not prominent in UI
Registry-only venues

These may be present in the venue registry but should not be treated as supported cached venues yet:

Clapham Common
Wimbledon Park

They should remain:

snapshotSupported: false
refreshSupported: false

unless explicitly investigated and validated.

4. Critical Constraints

Do not add:

frontend live scraping
frontend direct calls to ClubSpark
frontend direct calls to Better
public refresh buttons
exposed refresh tokens
auto-booking
login bypassing
booking form submission
scheduler / cron refresh unless explicitly requested
alerts unless explicitly requested
maps unless explicitly requested
payments
account system

Normal frontend users must only read cached backend data.

Refresh endpoints must remain protected by:

X-Refresh-Token

and server environment variable:

REFRESH_TOKEN

Never put the real REFRESH_TOKEN in:

frontend code
GitHub
README
docs
screenshots
committed .env files
5. Architecture
Frontend architecture

Frontend source:

src/

Important frontend areas:

src/api/
src/components/
src/data/

Frontend should use:

import.meta.env.VITE_API_BASE_URL

to decide backend base URL.

Default local backend:

http://127.0.0.1:8000

Production backend:

https://london-tennis-court-monitor-api.onrender.com

Frontend should read backend via API utilities, not hard-code endpoints in components.

Frontend must keep fallback behavior:

Finsbury Park static fallback should continue to work if backend unavailable.
Lee Valley may have no frontend static fallback; if unavailable, show a clear message:
“Backend unavailable and no static fallback is available for this venue.”
Backend architecture

Backend main file:

backend/main.py

Venue registry:

backend/data/venues.json

Canonical cache path:

backend/data/snapshots/{venue_id}/{YYYY-MM-DD}.json

Examples:

backend/data/snapshots/finsbury-park/2026-04-26.json
backend/data/snapshots/lee-valley/2026-04-27.json

Avoid maintaining multiple inconsistent cache paths.

If older paths exist, migrate them or keep only temporary read fallback.

6. Backend API Endpoints

Current / target endpoints:

Health
GET /health

Expected:

{ "status": "ok" }
Venue registry
GET /api/venues

Returns all venues in the registry.

Venue snapshot dates
GET /api/venues/{venue_id}/snapshots

Returns available cached snapshot dates for a venue.

Venue snapshot by date
GET /api/venues/{venue_id}/snapshot?date=YYYY-MM-DD

Returns cached snapshot JSON for a selected venue/date.

Normal GET endpoints must only read cached JSON. They must not refresh, scrape, call Playwright, call Better, or call ClubSpark.

Protected venue refresh
POST /api/venues/{venue_id}/refresh?date=YYYY-MM-DD

Requires:

X-Refresh-Token: <token>

Token is checked against environment variable:

REFRESH_TOKEN

If missing or invalid:

missing server token → 500 clear error
missing/invalid request token → 401
Backwards-compatible Finsbury endpoints

Keep these working unless explicitly removed later:

GET /api/finsbury/snapshots
GET /api/finsbury/snapshot?date=YYYY-MM-DD
POST /api/finsbury/refresh?date=YYYY-MM-DD

They can internally call the venue-based logic for finsbury-park.

7. Venue Data Methods
Finsbury Park method

Finsbury Park uses a rendered booking page flow.

Constraints:

Use Playwright only in protected manual refresh.
Do not run Playwright on normal GET requests.
Do not expose refresh through frontend.
Save normalized snapshot JSON to canonical cache path.

Target cache path:

backend/data/snapshots/finsbury-park/YYYY-MM-DD.json

Finsbury display:

group by court
sort courts numerically
sort time ranges chronologically
show court / timeRange / status
do not show unreliable price
Lee Valley method

Lee Valley uses Better public JSON API.

Endpoint pattern:

https://better-admin.org.uk/api/activities/venue/lee-valley-hockey-and-tennis-centre/activity/tennis-court-outdoor/times?date=YYYY-MM-DD

Backend HTTP requirements:

Use Python requests
Use certifi for SSL verification
Do not use verify=False
Do not disable SSL verification

Recommended request:

requests.get(
    url,
    headers=headers,
    timeout=20,
    verify=certifi.where(),
)

Headers:

Accept: application/json
Origin: https://bookings.better.org.uk
Referer: https://bookings.better.org.uk/location/lee-valley-hockey-and-tennis-centre/tennis-court-outdoor/YYYY-MM-DD/by-time
User-Agent: normal browser-like user agent

Lee Valley response mapping:

Input fields:

starts_at.format_24_hour
ends_at.format_24_hour
price.formatted_amount
spaces
name
action_to_show.status
date
venue_slug
category_slug

Output record:

{
  "venue": "Lee Valley Hockey and Tennis Centre",
  "activity": "Outdoor Court Hire",
  "timeRange": "10:00 - 11:00",
  "status": "Available",
  "spaces": 6,
  "price": "£14.00",
  "sourceStatus": "BOOK",
  "confidence": "high"
}

Status mapping:

if spaces > 0 and action_to_show.status === "BOOK" → Available
if spaces === 0 → Unavailable
otherwise use conservative status based on action_to_show.status

Target cache path:

backend/data/snapshots/lee-valley/YYYY-MM-DD.json

Lee Valley display:

group by activity, usually Outdoor Court Hire
show timeRange / status / spaces / price
do not show confidence prominently
do not show sourceStatus prominently
add note: slot visibility is public, but booking may require Better account
8. Cached Snapshot JSON Shape

Use this general shape:

{
  "meta": {
    "venueId": "lee-valley",
    "venueName": "Lee Valley Hockey and Tennis Centre",
    "source": "Better public activity times API",
    "checkedDate": "2026-04-27",
    "sourceUrl": "...",
    "lastCheckedAt": "...",
    "isLive": false,
    "disclaimer": "Cached static snapshot data only. Not live availability. Always confirm and book through the official Better booking page."
  },
  "records": []
}

For Finsbury, source should reflect ClubSpark / rendered-page snapshot.

For Lee Valley, source should reflect Better public JSON API.

Always include:

isLive: false

Do not call it real-time availability.

9. Frontend UI Requirements

The frontend should behave as a multi-venue cached snapshot dashboard.

Venue selector

Show supported venues only:

snapshotSupported === true

Expected supported venues:

Finsbury Park
Lee Valley Hockey and Tennis Centre
Date selector

When venue changes:

fetch available dates
select latest date by default
fetch snapshot for that venue/date

If no dates:

No cached dates for this venue yet. A protected backend refresh is required before records can be displayed.
Data source badge

Show:

Source: FastAPI cached backend when backend is used
Source: Static frontend fallback when fallback is used
System status

SystemStatus should show:

selected venue
selected date
backend connected / fallback
data source
records loaded
last checked / generated
live scraping disabled
auto-booking disabled

Avoid excessive duplicated metadata below the SystemStatus panel.

Record display

Finsbury:

group by court
show timeRange / status
do not show price unless validated

Lee Valley:

group by activity
show timeRange / status / spaces / price

Do not show:

raw sourceStatus prominently
confidence prominently
refresh token
refresh button
Official booking button

Dynamic by venue:

Finsbury → ClubSpark booking URL
Lee Valley → Better official booking URL
Required disclaimers

Always include:

Cached snapshot data only. Not live availability.
Always confirm and book through the official venue booking page.

For Lee Valley also include:

Slot visibility is public, but booking may require a Better account.
10. Local Development Commands
Frontend
npm run dev
Backend

From project root:

source backend/.venv/bin/activate
REFRESH_TOKEN=dev-secret python -m uvicorn backend.main:app --reload --port 8000
Frontend build
npm run build
Backend checks
python -m py_compile backend/main.py
python -m json.tool backend/data/venues.json
API checks
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/venues
curl http://127.0.0.1:8000/api/venues/finsbury-park/snapshots
curl http://127.0.0.1:8000/api/venues/lee-valley/snapshots
Finsbury refresh
curl -X POST \
  -H "X-Refresh-Token: dev-secret" \
  "http://127.0.0.1:8000/api/venues/finsbury-park/refresh?date=2026-04-26"
Lee Valley refresh
curl -X POST \
  -H "X-Refresh-Token: dev-secret" \
  "http://127.0.0.1:8000/api/venues/lee-valley/refresh?date=2026-04-27"
Lee Valley snapshot check
curl "http://127.0.0.1:8000/api/venues/lee-valley/snapshot?date=2026-04-27"
11. Deployment
Frontend deployment

Platform:

Vercel

Frontend env var:

VITE_API_BASE_URL=https://london-tennis-court-monitor-api.onrender.com
Backend deployment

Platform:

Render

Root directory:

backend

Build command:

pip install -r requirements.txt && playwright install chromium

Start command:

uvicorn main:app --host 0.0.0.0 --port $PORT

Environment variables:

PYTHON_VERSION=3.12.8
REFRESH_TOKEN=<secret>

Never commit real REFRESH_TOKEN.

12. Git Rules

Before committing:

git status

Do not commit:

backend/.venv/
__pycache__/
*.pyc
node_modules/
dist/
investigation-output/
.env
.DS_Store

Suggested commit messages:

Add multi-venue cached monitoring dashboard
Fix Lee Valley backend cache handling
Improve venue snapshot frontend state handling
Document multi-venue cached monitoring architecture

If files are changed in backend and frontend, remind the user:

GitHub push is needed.
Render redeploy is needed if backend changes.
Vercel redeploy is needed if frontend changes, usually automatic after push.
13. Current Major Goal: MVP v11

The next major goal is MVP v11:

Stable multi-venue cached monitoring dashboard

Definition of done:

Finsbury Park and Lee Valley are both supported cached venues.
Backend venue registry marks both as snapshotSupported and refreshSupported.
Canonical cache path is used consistently:
backend/data/snapshots/{venue_id}/{YYYY-MM-DD}.json
GET endpoints read from the same path that refresh endpoints write to.
Finsbury refresh still works.
Lee Valley refresh works using Better public JSON API with requests + certifi.
Frontend venue selector switches between Finsbury and Lee Valley.
Finsbury display is court-based.
Lee Valley display is activity-based with spaces and price.
Normal frontend users only read cached data.
No frontend refresh button.
No token exposure.
README and architecture docs updated.
Build and syntax checks pass.
# Architecture

## Current Architecture

London Tennis Court Monitor is a React + Vite frontend on Vercel with a FastAPI backend on Render.

The frontend never requests ClubSpark or Better directly. Normal backend `GET` endpoints read cached JSON files only. External booking platforms are contacted only by protected manual refresh endpoints that require `X-Refresh-Token`.

## Current Diagram

```text
User Browser
    |
    v
Vercel React Frontend
    |
    | GET cached snapshot data only
    v
Render FastAPI Backend
    |
    | reads JSON files
    v
backend/data/snapshots/{venue_id}/YYYY-MM-DD.json

Fallback:
React Frontend -> bundled Finsbury static snapshots

Booking:
User Browser -> official venue booking page
```

## Venue Registry

The backend registry lives at:

```text
backend/data/venues.json
```

Supported cached venues:

- `finsbury-park`: Playwright-rendered page snapshot
- `lee-valley`: Better public JSON API snapshot

Registry-only venues:

- `clapham-common`
- `wimbledon-park`

## Canonical Cache Path

All backend cached snapshots use:

```text
backend/data/snapshots/
  finsbury-park/
    YYYY-MM-DD.json
  lee-valley/
    YYYY-MM-DD.json
```

Venue-based endpoints read and write only this canonical structure.

## API Design

```text
GET  /api/venues
GET  /api/venues/{venue_id}/snapshots
GET  /api/venues/{venue_id}/snapshot?date=YYYY-MM-DD
POST /api/venues/{venue_id}/refresh?date=YYYY-MM-DD
```

Backwards-compatible Finsbury aliases remain:

```text
GET  /api/finsbury/snapshots
GET  /api/finsbury/snapshot?date=YYYY-MM-DD
POST /api/finsbury/refresh?date=YYYY-MM-DD
```

## Refresh Sequences

Finsbury Park:

```text
Developer + X-Refresh-Token
    |
    v
POST /api/venues/finsbury-park/refresh
    |
    v
Playwright loads public ClubSpark guest page once
    |
    v
Rendered text parser extracts court / time / status
    |
    v
backend/data/snapshots/finsbury-park/YYYY-MM-DD.json
```

Lee Valley:

```text
Developer + X-Refresh-Token
    |
    v
POST /api/venues/lee-valley/refresh
    |
    v
requests.get Better public times API once
    |
    v
Parser normalizes time / spaces / status / price
    |
    v
backend/data/snapshots/lee-valley/YYYY-MM-DD.json
```

Both refresh paths are manual, protected, and not triggered by normal frontend visits.

## Frontend Fetch And Fallback

```text
Load snapshot dashboard
    |
    v
GET /api/venues
    |
    v
Show venues with snapshotSupported: true
    |
    v
GET /api/venues/{venue_id}/snapshots
    |
    v
GET /api/venues/{venue_id}/snapshot?date=latest
```

If the backend is unavailable:

- Finsbury Park falls back to bundled static frontend snapshots.
- Lee Valley shows a clear message because no static frontend fallback exists.

## Safety Boundaries

- No frontend scraping
- No public refresh button
- No refresh token in frontend code
- No auto-booking
- No login bypass
- No booking form submission
- No scheduler or alerts yet
- Users always book through official venue pages

## Future Roadmap

- Add stale-data age indicators
- Add manual validation workflow for cached snapshots
- Add more venues only after terms and data access are reviewed
- Add conservative scheduled refresh only after rate limits and terms are understood
- Consider optional alerts only after cached backend behavior is stable and compliant

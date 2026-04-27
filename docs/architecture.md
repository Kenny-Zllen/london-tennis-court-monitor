# Architecture

## Current Architecture

London Tennis Court Monitor is a React + Vite frontend deployed on Vercel with a small FastAPI backend deployed on Render.

The production frontend does not request booking platforms directly. Normal backend GET requests serve cached JSON snapshot data only. External booking data is requested only by protected manual refresh endpoints for supported venues.

## Components

1. **React + Vite frontend**
   - Provides the main application shell and client-side interactivity.
   - Handles venue filtering, search, snapshot date selection, and snapshot filters.
   - Uses static frontend snapshot files as a fallback if the backend is unavailable.

2. **Tailwind CSS UI**
   - Used for responsive layout, cards, filters, badges, status panels, and dashboard sections.

3. **Static venue dataset**
   - Stored in `src/data/venues.js`.
   - Powers the frontend venue finder and official booking links.

4. **Static frontend snapshot dataset**
   - Stored as dated files in `src/data/finsburySnapshots/`.
   - Used as a fallback when the FastAPI backend cannot be reached.

5. **FastAPI cached-data backend**
   - Stored in `backend/`.
   - Deployed separately from the frontend.
   - Serves cached venue snapshot JSON files from `backend/data/`.
   - Does not scrape booking platforms during normal user visits.

6. **Backend venue registry**
   - Stored in `backend/data/venues.json`.
   - Lists venue IDs, names, areas, booking platforms, official booking URLs, and whether snapshots or refreshes are supported.
   - Finsbury Park and Lee Valley currently have cached snapshot and protected refresh support.

7. **Local-only investigation and updater scripts**
   - Stored in `scripts/`.
   - Used to investigate rendered page text, parse candidates, summarize parser output, and generate static frontend snapshots.

## Current Diagram

```text
User Browser
    |
    v
Vercel React Frontend
    |
    | reads cached data when backend is available
    v
Render FastAPI Backend
    |
    | normal GET endpoints read JSON only
    v
Cached snapshot files

Fallback path:
Vercel React Frontend -> bundled static snapshot files

User booking action:
User Browser -> official venue booking page
```

## Venue-Based API Design

MVP v8 introduces general venue endpoints:

```text
GET /api/venues
GET /api/venues/{venue_id}/snapshots
GET /api/venues/{venue_id}/snapshot?date=YYYY-MM-DD
POST /api/venues/{venue_id}/refresh?date=YYYY-MM-DD
```

Backwards-compatible Finsbury endpoints remain available:

```text
GET /api/finsbury/snapshots
GET /api/finsbury/snapshot?date=YYYY-MM-DD
POST /api/finsbury/refresh?date=YYYY-MM-DD
```

For now, `finsbury-park` and `lee-valley` have cached snapshot support. Other venues can appear in the registry before they have parsing or refresh support.

## Protected Refresh Flow

Finsbury Park uses a rendered-page refresh path:

```text
Developer request with X-Refresh-Token
    |
    v
POST /api/venues/finsbury-park/refresh
    |
    | opens public ClubSpark guest page once
    v
Playwright rendered text capture
    |
    v
Parser extracts court / time / status candidates
    |
    v
backend/data/finsburySnapshots/YYYY-MM-DD.json
```

Lee Valley uses a structured API refresh path:

```text
Developer request with X-Refresh-Token
    |
    v
POST /api/venues/lee-valley/refresh
    |
    | calls Better public activity times API once
    v
Structured JSON time / price / spaces / status data
    |
    v
Parser normalizes cached records
    |
    v
backend/data/snapshots/lee-valley/YYYY-MM-DD.json
```

Both refresh paths are manual and protected. They are not triggered by normal frontend visits.

## Future Path For Adding Venues

To add another venue safely:

1. Add the venue to `backend/data/venues.json` with `snapshotSupported: false`.
2. Investigate the venue manually and review terms, visibility, and request behavior.
3. Create a venue-specific parser only if public data access is appropriate.
4. Add a cache folder and update backend routing helpers for that venue.
5. Enable `snapshotSupported` only after cached data can be produced reliably.
6. Enable `refreshSupported` only after protected manual refresh is implemented and tested.

## Future Architecture If Broader Monitoring Is Added

Live monitoring is not currently implemented. If it is added later, it should be designed conservatively and ethically:

- Backend worker outside the frontend
- Conservative polling
- Cached results
- Last checked timestamp
- Frontend reads cached backend data
- Users still book through official venue pages

```text
Backend worker
    |
    | conservative checks after terms and limits are reviewed
    v
Official booking platform
    |
    v
Cache / API with last checked timestamp
    |
    v
React Frontend on Vercel
    |
    v
User opens official booking page to confirm and book
```

This future design would still avoid auto-booking, login bypassing, and aggressive polling.

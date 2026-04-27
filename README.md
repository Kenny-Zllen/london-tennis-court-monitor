# London Tennis Court Monitor

A beta-ready, full-stack cached tennis court monitoring product for discovering London tennis venues, filtering by booking details, and viewing cached booking-status snapshots across multiple supported venues. The React frontend is deployed on Vercel, and the FastAPI backend on Render serves cached snapshot data only. This is cached monitoring, not live availability.

## Project Overview

London Tennis Court Monitor is a React and FastAPI web app that helps users browse London tennis venues, view cached snapshot data for supported venues, and quickly navigate to official booking systems.

The app includes a venue finder with search, area filtering, booking platform filtering, and responsive venue cards. It also includes an experimental multi-venue snapshot dashboard for cached Finsbury Park and Lee Valley booking-status data.

This project is intentionally scoped as a discovery and portfolio tool. It is not an auto-booking bot, and it does not provide live court availability.

## Live Demo

[https://london-tennis-court-monitor.vercel.app/](https://london-tennis-court-monitor.vercel.app/)

## Features

- London tennis venue finder
- Search by venue, area, platform, or facilities
- Area filter
- Booking platform filter
- Responsive venue cards
- Official booking page links
- Empty states for unmatched filters
- Experimental multi-venue cached snapshot dashboard
- Venue selector for supported cached snapshot venues
- Snapshot date selector per selected venue
- Snapshot records grouped by court
- Snapshot records sorted by start time
- Lee Valley records grouped by activity with spaces and price
- Snapshot filters for court and status
- FastAPI cached-data backend with static frontend fallback
- Multi-venue backend registry
- Protected manual refresh endpoint for supported venues
- Clear availability disclaimers

## Tech Stack

- Vite
- React
- JavaScript
- Tailwind CSS
- FastAPI
- Vercel deployment
- Render backend deployment

## MVP v2: Experimental Finsbury Park Snapshot

The app includes an experimental static daily booking-status snapshot for Finsbury Park.

The snapshot uses parsed candidate records from local rendered-page investigation output. Records are displayed in the frontend as static datasets, grouped by court and sorted by slot start time.

Multiple pre-generated snapshot dates can be included in `src/data/finsburySnapshots/`. The frontend date selector only switches between those bundled static files.

The snapshot shows:

- Court
- Time range
- Booking status

Price is intentionally excluded because parser validation found that price association may be unreliable near court boundaries.

This section is not live availability. The frontend does not request ClubSpark or any booking platform. Users must always confirm availability and book through the official ClubSpark page.

## MVP v10: Multi-Venue Snapshot Frontend

MVP v10 updates the frontend snapshot dashboard so users can switch between supported cached venues.

Currently supported frontend snapshot venues:

- Finsbury Park
- Lee Valley Hockey and Tennis Centre

The frontend reads the backend venue registry from:

```text
GET /api/venues
```

It only shows venues where `snapshotSupported` is `true`. When a venue is selected, the frontend reads cached snapshot dates and cached snapshot records from:

```text
GET /api/venues/{venue_id}/snapshots
GET /api/venues/{venue_id}/snapshot?date=YYYY-MM-DD
```

The frontend does not call ClubSpark, Better, or any booking platform directly. It does not expose `REFRESH_TOKEN`, and there is no public refresh button.

Display behavior:

- Finsbury Park records are grouped by court.
- Lee Valley records are grouped by activity and show time range, status, spaces, and price.
- Both venues show cached-data disclaimers and official booking links.
- If the backend is unavailable, Finsbury Park falls back to bundled static frontend data.
- If Lee Valley backend data is unavailable and no static fallback exists, the UI explains that no static fallback is available for that venue.

## MVP v9.3: Multi-Venue Cached Backend Architecture

MVP v9.3 supports two cached backend snapshot venues while keeping normal frontend reads cache-only.

The backend now has a venue registry at `backend/data/venues.json`. The registry lists venues with IDs, names, areas, booking platforms, official booking URLs, and whether cached snapshots or protected refreshes are supported.

Current support status:

- Finsbury Park: cached snapshots supported, protected manual refresh supported through rendered-page Playwright investigation
- Lee Valley Hockey and Tennis Centre: cached snapshots supported, protected manual refresh supported through the Better public activity times API
- Clapham Common: registry-only
- Wimbledon Park: registry-only

Cached backend snapshots use this canonical path:

```text
backend/data/snapshots/{venue_id}/YYYY-MM-DD.json
```

The general backend endpoints are:

```text
GET /api/venues
GET /api/venues/{venue_id}/snapshots
GET /api/venues/{venue_id}/snapshot?date=YYYY-MM-DD
POST /api/venues/{venue_id}/refresh?date=YYYY-MM-DD
```

The older Finsbury-specific endpoints still work as backwards-compatible aliases:

```text
GET /api/finsbury/snapshots
GET /api/finsbury/snapshot?date=YYYY-MM-DD
POST /api/finsbury/refresh?date=YYYY-MM-DD
```

Protected refresh is currently implemented for `finsbury-park` and `lee-valley`. Other venues are listed for future expansion, but they do not have cached snapshot parsing or refresh workflows yet.

## Investigation Workflow

The Finsbury Park snapshot came from an investigation workflow:

- Manual review of the public ClubSpark booking page
- Raw HTML check to see whether slot data appeared in the page response
- Rendered-page investigation to confirm slot-like text appeared after JavaScript rendering
- Local parser prototype to extract candidate court, time, and status records from saved rendered text
- Local summary script to validate candidate counts and highlight parser risks
- Optional protected backend refresh that can manually regenerate cached Finsbury Park JSON
- Manual decision to exclude price from the frontend snapshot

Lee Valley support came from a separate investigation workflow:

- Manual review of the Better booking flow
- HTML and rendered-page checks to avoid opening-hours false positives
- Public Better activity times API investigation
- Local parser validation for time, spaces, status, and price fields
- Protected backend refresh that can manually regenerate cached Lee Valley JSON

These investigation scripts are not part of the production frontend and are not used for live monitoring. Normal frontend visits do not trigger Playwright, ClubSpark requests, or Better API requests.

## Ethical Constraints

This project keeps clear boundaries:

- No auto-booking
- No login bypassing
- No frontend requests to ClubSpark
- No frontend requests to Better
- No public production scraping
- No public refresh button
- Refresh token is never exposed to the frontend
- No scheduler or repeated polling
- No alerts or notifications
- No payment handling
- Users are redirected to official booking pages

Any future availability work should remain conservative, transparent, and aligned with booking platform terms.

## Limitations

This app does not show live court availability.

Cached venue snapshots may be incomplete or outdated. They are based on manual protected refreshes, not a live data feed.

The production app does not include:

- Live scraping
- Scheduled checks
- Alerting
- Login
- Maps
- Auto-booking
- Real-time monitoring

Users must confirm availability, prices, booking rules, and court details through the official venue booking page.

## Future Roadmap

Possible future improvements include:

- Expanding and verifying the London venue dataset
- Improving venue detail quality
- Adding richer facility tags
- Adding sorting options
- Improving the Finsbury Park parser validation workflow
- Investigating whether structured availability data can be accessed responsibly
- Adding clearer stale-data handling if future snapshots are updated manually
- Considering a backend only if live availability can be handled ethically, conservatively, and in line with platform terms

## How to Run Locally

Install frontend dependencies:

```bash
npm install
```

Create a local frontend environment file if you want to point the React app at the FastAPI backend:

```bash
cp .env.example .env
```

`.env.example` contains:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Optional local investigation scripts are available for development research only. They are not required to run the frontend.

Update the static Finsbury Park snapshot for a selected date:

```bash
npm run update:finsbury:snapshot -- --date=2026-04-27
```

This writes a dated static snapshot file such as:

```text
src/data/finsburySnapshots/2026-04-27.js
```

It also updates:

```text
src/data/finsburySnapshots/index.js
```

If no date is provided, the updater uses today's date:

```bash
npm run update:finsbury:snapshot
```

Changing the snapshot date requires running the local updater and redeploying or pushing the generated static data. The production website does not fetch new dates dynamically.

## Backend API Prototype

The project also includes a small FastAPI backend prototype under `backend/`.

The backend serves cached local JSON snapshot data only for normal GET requests. It does not scrape ClubSpark or Better when users visit the frontend, schedule checks, log users in, send alerts, or book courts.

Install backend dependencies:

```bash
python -m pip install -r backend/requirements.txt
```

Run the backend locally:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Test the health endpoint:

```bash
curl http://127.0.0.1:8000/health
```

List cached Finsbury Park snapshot dates:

```bash
curl http://127.0.0.1:8000/api/finsbury/snapshots
```

List all registered backend venues:

```bash
curl http://127.0.0.1:8000/api/venues
```

List cached snapshot dates for a venue:

```bash
curl http://127.0.0.1:8000/api/venues/finsbury-park/snapshots
curl http://127.0.0.1:8000/api/venues/lee-valley/snapshots
```

Fetch the latest cached snapshot:

```bash
curl http://127.0.0.1:8000/api/finsbury/snapshot
```

Fetch a specific cached snapshot date:

```bash
curl "http://127.0.0.1:8000/api/finsbury/snapshot?date=2026-04-26"
```

The venue-based equivalent is:

```bash
curl "http://127.0.0.1:8000/api/venues/finsbury-park/snapshot?date=2026-04-26"
curl "http://127.0.0.1:8000/api/venues/lee-valley/snapshot?date=2026-04-27"
```

Normal backend reads are cache-based. Users must still confirm availability and book through the official venue booking page.

When the backend is running locally, the snapshot dashboard reads supported venues and cached snapshots from the FastAPI backend. If the backend is unavailable, the frontend falls back to bundled Finsbury Park static snapshot files from `src/data/finsburySnapshots/`.

The deployed Vercel frontend still works without a deployed backend because of this Finsbury fallback. It does not fetch ClubSpark, Better, or dynamically generate new dates.

### Protected Manual Refresh

The backend includes a protected manual refresh endpoint:

```text
POST /api/finsbury/refresh?date=YYYY-MM-DD
```

The venue-based refresh endpoint is:

```text
POST /api/venues/{venue_id}/refresh?date=YYYY-MM-DD
```

It requires this header:

```text
X-Refresh-Token: <your-token>
```

The expected token is read from the backend environment variable:

```text
REFRESH_TOKEN
```

Example local test:

```bash
REFRESH_TOKEN=dev-secret python -m uvicorn backend.main:app --reload --port 8000
curl -X POST \
  -H "X-Refresh-Token: dev-secret" \
  "http://127.0.0.1:8000/api/venues/finsbury-park/refresh?date=2026-04-26"
```

Lee Valley refresh example:

```bash
curl -X POST \
  -H "X-Refresh-Token: dev-secret" \
  "http://127.0.0.1:8000/api/venues/lee-valley/refresh?date=2026-04-27"
```

These endpoints are for developer use only. Finsbury Park loads the public ClubSpark booking page once with Playwright, parses rendered court/time/status candidates, writes cached JSON under `backend/data/snapshots/finsbury-park/`, and returns a summary. Lee Valley calls the Better public activity times API once, converts structured time/price/spaces/status records, writes cached JSON under `backend/data/snapshots/lee-valley/`, and returns a summary. Normal frontend users do not trigger refreshes.

### Render Deployment Settings

Deploy the backend as a Render Web Service using these settings:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt && playwright install chromium`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

Add this Render environment variable:

```text
PYTHON_VERSION=3.12.8
REFRESH_TOKEN=<a-long-random-secret>
```

Render may need Playwright browser installation support for the protected refresh endpoint. If Chromium launch fails after deployment, use Render logs to confirm whether `playwright install chromium` completed successfully.

The backend CORS configuration allows local Vite development origins and the deployed Vercel frontend:

```text
https://london-tennis-court-monitor.vercel.app
```

After deploying the backend, the frontend can be pointed at it with:

```bash
VITE_API_BASE_URL=https://london-tennis-court-monitor-api.onrender.com
```

## Portfolio Value

This project demonstrates practical frontend and product engineering skills:

- Turning a real user problem into a focused MVP
- Building reusable React components
- Structuring static data cleanly
- Implementing client-side search and filtering
- Designing responsive UI with Tailwind CSS
- Presenting investigation-derived data responsibly
- Communicating technical and ethical limitations clearly
- Avoiding overclaims about live availability or automation

For an engineering/software portfolio, the project shows product judgement, systems thinking, and the ability to balance a useful user experience with responsible technical boundaries.

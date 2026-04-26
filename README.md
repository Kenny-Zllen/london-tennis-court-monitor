# London Tennis Court Monitor

A frontend-only portfolio MVP for discovering London tennis venues, filtering by booking details, and opening official booking pages.

## Project Overview

London Tennis Court Monitor is a React web app that helps users browse London tennis venues and quickly navigate to official booking systems.

The app includes a venue finder with search, area filtering, booking platform filtering, and responsive venue cards. MVP v2 also adds an experimental Finsbury Park static daily booking-status snapshot based on local investigation output.

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
- Experimental Finsbury Park static daily snapshot
- Static snapshot date selector for pre-generated dates
- Snapshot records grouped by court
- Snapshot records sorted by start time
- Snapshot filters for court and status
- Clear availability disclaimers

## Tech Stack

- Vite
- React
- JavaScript
- Tailwind CSS
- Vercel deployment

## MVP v2: Experimental Finsbury Park Snapshot

MVP v2 includes an experimental static daily booking-status snapshot for Finsbury Park.

The snapshot uses parsed candidate records from local rendered-page investigation output. Records are displayed in the frontend as static datasets, grouped by court and sorted by slot start time.

Multiple pre-generated snapshot dates can be included in `src/data/finsburySnapshots/`. The frontend date selector only switches between those bundled static files.

The snapshot shows:

- Court
- Time range
- Booking status

Price is intentionally excluded because parser validation found that price association may be unreliable near court boundaries.

This section is not live availability. The frontend does not request ClubSpark or any booking platform. Users must always confirm availability and book through the official ClubSpark page.

## Investigation Workflow

The Finsbury Park snapshot came from a local-only investigation workflow:

- Manual review of the public ClubSpark booking page
- Raw HTML check to see whether slot data appeared in the page response
- Rendered-page investigation to confirm slot-like text appeared after JavaScript rendering
- Local parser prototype to extract candidate court, time, and status records from saved rendered text
- Local summary script to validate candidate counts and highlight parser risks
- Manual decision to exclude price from the frontend snapshot

These investigation scripts are not part of the production frontend and are not used for live monitoring.

## Ethical Constraints

This project keeps clear boundaries:

- No auto-booking
- No login bypassing
- No frontend requests to ClubSpark
- No production scraper
- No scheduler or repeated polling
- No alerts or notifications
- No payment handling
- Users are redirected to official booking pages

Any future availability work should remain conservative, transparent, and aligned with booking platform terms.

## Limitations

This app does not show live court availability.

The Finsbury Park snapshot is static and may be incomplete or outdated. It is based on local investigation output, not a live data feed.

The production app does not include:

- Backend services
- Database
- Scraping
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

Install dependencies:

```bash
npm install
```

Start the development server:

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

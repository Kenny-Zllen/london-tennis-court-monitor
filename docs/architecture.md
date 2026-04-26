# Architecture

## Current Architecture

London Tennis Court Monitor is currently a frontend-only React application deployed on Vercel.

The production app uses static data only. It does not run a backend, scraper, scheduler, alerting service, login flow, database, or auto-booking system.

## Components

1. **React + Vite frontend**
   - Provides the main application shell and client-side interactivity.
   - Handles venue filtering, search, and snapshot filtering in the browser.

2. **Tailwind CSS UI**
   - Used for responsive layout, cards, filters, badges, and page styling.

3. **Static venue dataset**
   - Stored in `src/data/venues.js`.
   - Powers the London venue finder and official booking links.

4. **Static Finsbury Park snapshot dataset**
   - Stored as dated files in `src/data/finsburySnapshots/`.
   - Contains parsed candidate records from local investigation output.
   - Displayed as pre-generated static snapshots, not live availability.

5. **Local-only investigation scripts**
   - Stored in `scripts/`.
   - Used to investigate raw HTML, rendered page text, parser candidates, and parser summaries.
   - Not part of the production frontend.

6. **No production backend or scraper**
   - The deployed frontend does not request ClubSpark.
   - Users are redirected to official booking pages.

7. **Vercel deployment**
   - Hosts the built static frontend.

## Current Diagram

```text
User Browser
    |
    v
Vercel Static Frontend
    |
    +-- React + Vite app
    +-- Tailwind CSS UI
    +-- Static venue data
    +-- Static Finsbury Park snapshot data
    |
    v
Official booking pages opened by user action

Local development only:
scripts/ -> investigation-output/ -> reviewed static snapshot data
```

## Future Architecture If Live Monitoring Is Added

Live monitoring is not currently implemented. If it is added later, it should be designed conservatively and ethically.

A possible future architecture:

1. **Backend worker**
   - Runs outside the frontend.
   - Checks one venue or a small set of venues only after data access rules are understood.

2. **Conservative polling**
   - Avoids aggressive repeated requests.
   - Uses low-frequency checks and respects platform terms.

3. **Caching**
   - Stores the latest checked result.
   - Prevents the frontend from triggering repeated requests to booking platforms.

4. **Last checked timestamp**
   - Clearly shows when the cached data was last updated.
   - Helps users understand freshness and uncertainty.

5. **Frontend reads cached data**
   - The React app would read from the project backend or cache, not directly from ClubSpark.

6. **Official booking remains external**
   - Users still confirm availability and complete bookings through the official ClubSpark page.

## Possible Future Diagram

```text
Backend Worker
    |
    | conservative scheduled checks
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
User opens official ClubSpark page to confirm and book
```

This future design would still avoid auto-booking, login bypassing, and aggressive polling.

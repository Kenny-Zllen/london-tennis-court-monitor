# London Tennis Court Monitor

A frontend-only MVP portfolio project for discovering London tennis venues, viewing an experimental static Finsbury Park booking-status snapshot, and quickly opening official booking pages.

## Project Overview

London Tennis Court Monitor is a React web app that helps users browse a curated list of London tennis venues. Users can filter venues by area, booking platform, and search text, then open the relevant official booking page in a new tab.

The current MVP v2 also includes an experimental Finsbury Park snapshot. This uses 78 parsed candidate records from a local rendered-page investigation output and displays them as a static daily snapshot grouped by court and sorted by start time.

The project is designed as a clean, practical discovery tool rather than an automated booking system. It focuses on user experience, data presentation, filtering logic, and clear product boundaries.

## Live Demo

[https://london-tennis-court-monitor.vercel.app/](https://london-tennis-court-monitor.vercel.app/)

## Features

- Clean homepage for London tennis venue discovery
- Static venue data stored in a dedicated data file
- Area filter
- Booking platform filter
- Search by venue, area, platform, or facilities
- Responsive venue card layout
- Venue details including:
  - Venue name
  - Area
  - Booking platform
  - Number of courts
  - Booking rule
  - Facilities
- Official booking page button for each venue
- Experimental Finsbury Park static daily snapshot
- Snapshot records grouped by court and sorted by start time
- Snapshot filters for status and court
- Empty state when no venues match the filters
- Clear MVP disclaimer about availability

## Tech Stack

- Vite
- React
- JavaScript
- Tailwind CSS

## Current MVP Scope

This version is a frontend-only prototype using static venue data and a static Finsbury Park investigation snapshot.

The MVP includes:

- A curated list of example London tennis venues
- Client-side filtering and search
- Reusable React components
- Links to official venue booking pages
- A static Finsbury Park daily snapshot using all 78 parsed candidate records from local investigation output
- Grouped snapshot presentation by court, sorted by slot start time
- Responsive styling with Tailwind CSS

The production frontend does not request ClubSpark and does not perform live scraping or monitoring. No backend services, database, scheduler, user accounts, maps, notifications, alerting, payments, login flow, or booking automation are included.

## Limitations

This MVP does not show live court availability.

The Finsbury Park section is a static daily snapshot generated from local rendered-page investigation output. It is useful for demonstrating a possible product direction, but it may be incomplete or outdated.

Users must always confirm availability, booking rules, and court details through the official ClubSpark page before booking.

Price is intentionally excluded from the frontend snapshot because parser validation found that price association may be unreliable near court boundaries. Some venue details may use placeholder text such as "Check official page" where exact information should be verified directly with the provider.

The app does not:

- Scrape booking websites
- Automatically reserve courts
- Log users in to booking platforms
- Store user data
- Send alerts or notifications
- Run scheduled checks
- Process payments
- Display real-time availability

## Future Roadmap

Possible future improvements include:

- Expanding the venue dataset
- Improving data quality with verified venue information
- Adding more detailed facility tags
- Adding sorting options
- Adding a map view
- Adding saved favourites
- Adding user-friendly notes about booking windows
- Improving the Finsbury Park parser validation workflow
- Investigating whether structured availability data can be accessed responsibly
- Exploring a backend service only if live availability can be handled ethically, conservatively, and in line with venue platform terms

## How to Run Locally

Clone the repository and install dependencies:

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

## Portfolio Value

This project demonstrates practical frontend engineering skills through a focused, real-world product idea.

It shows the ability to:

- Translate a user problem into a simple product experience
- Build a React app with reusable components
- Organise static data cleanly
- Implement client-side filtering and search
- Present investigation-derived data without overclaiming it as live availability
- Design responsive layouts with Tailwind CSS
- Communicate MVP scope and limitations clearly
- Avoid overclaiming functionality that does not exist yet

For an engineering/software portfolio, the project highlights structured thinking, product judgement, and the ability to build a useful prototype with clear technical boundaries.

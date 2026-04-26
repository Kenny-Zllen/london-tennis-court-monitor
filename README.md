# London Tennis Court Monitor

A frontend-only MVP portfolio project for discovering London tennis venues and quickly opening their official booking pages.

## Project Overview

London Tennis Court Monitor is a React web app that helps users browse a curated list of London tennis venues. Users can filter venues by area, booking platform, and search text, then open the relevant official booking page in a new tab.

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
- Empty state when no venues match the filters
- Clear MVP disclaimer about availability

## Tech Stack

- Vite
- React
- JavaScript
- Tailwind CSS

## Current MVP Scope

This version is a frontend-only prototype using static venue data.

The MVP includes:

- A curated list of example London tennis venues
- Client-side filtering and search
- Reusable React components
- Links to official venue booking pages
- Responsive styling with Tailwind CSS

No backend services, database, user accounts, maps, notifications, scraping, payments, or booking automation are included.

## Limitations

This MVP does not show live court availability yet.

Users must confirm availability, pricing, booking rules, and court details through the official venue booking page. Some venue details may use placeholder text such as "Check official page" where exact information should be verified directly with the provider.

The app does not:

- Scrape booking websites
- Automatically reserve courts
- Log users in to booking platforms
- Store user data
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
- Exploring a backend service only if live availability can be handled responsibly and in line with venue platform terms

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
- Design responsive layouts with Tailwind CSS
- Communicate MVP scope and limitations clearly
- Avoid overclaiming functionality that does not exist yet

For an engineering/software portfolio, the project highlights structured thinking, product judgement, and the ability to build a useful prototype with clear technical boundaries.

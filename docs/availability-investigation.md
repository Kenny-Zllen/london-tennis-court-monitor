# Availability Investigation

## 1. Objective

Investigate how to safely and ethically add availability monitoring for one venue only, starting with Finsbury Park.

This document is a planning note for a future phase of the London Tennis Court Monitor project. It does not describe implemented functionality, and no scraping, backend service, automation, alerts, database, or live monitoring has been added yet.

The goal is to understand whether public court availability information can be accessed responsibly before making any technical decisions.

## 2. Why We Start With One Venue Only

Starting with one venue keeps the investigation narrow and controlled.

Focusing on a single venue helps avoid overbuilding, reduces the risk of unnecessary traffic to booking platforms, and makes it easier to understand the real technical and ethical constraints before scaling the idea.

This approach also makes the project easier to explain in a portfolio context: first investigate one real booking flow, document what is publicly visible, then decide whether a responsible MVP v2 is possible.

## 3. Target Venue: Finsbury Park

Initial target venue:

- Finsbury Park
- Booking platform: ClubSpark / LTA
- Current app behaviour: redirect users to the official booking page

Finsbury Park is a good first target because it is already included in the static MVP venue dataset and appears to use a common public booking platform.

## 4. Known Booking Page URLs to Investigate

Known URLs for manual investigation:

- [https://clubspark.lta.org.uk/FinsburyPark/Booking](https://clubspark.lta.org.uk/FinsburyPark/Booking)
- [https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDateIframe](https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDateIframe)

These URLs should be reviewed manually before any automated access is considered.

## 5. Manual Investigation Checklist

Before implementation, manually inspect the booking flow:

- Open the booking page in a browser
- Check if availability is visible without login
- Inspect the Network tab
- Look for XHR/fetch requests
- Check whether slot data is present in the HTML or loaded dynamically
- Check whether date query parameters are used
- Check whether booking requires login
- Check `robots.txt` and platform terms before automated access

Important notes to capture during investigation:

- Is the availability table visible to anonymous users?
- Does changing the date update the URL?
- Does changing the date trigger a network request?
- Is slot data returned as HTML, JSON, or embedded script data?
- Are prices, statuses, court numbers, and times visible publicly?
- Are there rate limits or platform warnings?
- Does the page block automated browsers?

## 6. Ethical and Technical Constraints

Any future availability feature must follow clear constraints:

- No auto-booking
- No login bypassing
- No aggressive polling
- Cache results
- Show last checked time
- Redirect users to the official booking page

The app should remain a discovery and information tool. It should not compete with or interfere with official booking systems.

If availability data is added later, users should still complete bookings through the official venue page.

## 7. Possible Technical Approaches

Possible approaches, depending on what the manual investigation finds:

### Static Redirect Only

Keep the current behaviour and redirect users to the official Finsbury Park booking page.

This is the safest approach if availability is not publicly visible, requires login, is restricted by terms, or would require excessive automated access.

### HTML Parsing if Public Slots Are Rendered in HTML

If public availability is rendered directly in the HTML without login, a future backend could request the page occasionally, parse visible slot information, cache it, and show a limited summary.

This should only be considered after reviewing terms, `robots.txt`, and expected request volume.

### Playwright Browser Automation Only if Necessary

If availability is visible publicly but only after client-side rendering, browser automation could be considered later.

This should be treated as a last resort because it is heavier, more fragile, and more likely to create unnecessary load.

### Future Backend API Only After Data Access Is Understood

A backend API should only be designed after the data source, access rules, required refresh rate, and caching strategy are understood.

The frontend should not directly scrape or automate booking pages.

## 8. Proposed MVP v2

A responsible MVP v2 could focus only on Finsbury Park.

Possible MVP v2 display:

- Availability for Finsbury Park only
- Date
- Time
- Court
- Price or status, if publicly visible
- Last checked timestamp
- Official booking button

The page should clearly explain that availability may be delayed or incomplete and that users must confirm details on the official booking page.

The initial refresh strategy should be conservative. For example, cache availability results and avoid frequent repeated checks.

## 9. Open Questions Before Implementation

Questions to answer before writing code:

- Is Finsbury Park availability visible without logging in?
- Is the slot data public and intended for anonymous users?
- Is the data available in HTML, JSON, or another format?
- Do booking dates use query parameters or request payloads?
- Are court names, prices, and booking statuses visible?
- What does ClubSpark's `robots.txt` allow?
- Do ClubSpark or the venue terms permit automated access?
- What is an acceptable cache duration?
- How should the app show stale or unavailable data?
- What should happen if the booking platform changes its page structure?
- Should the feature stop at one venue for the portfolio MVP?
- What wording best communicates that users must book through the official page?

No implementation should begin until these questions have been answered and documented.

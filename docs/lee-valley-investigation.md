# Lee Valley Investigation

## Objective

Investigate whether Lee Valley Hockey and Tennis Centre can safely and ethically support a future cached booking-status snapshot.

This is investigation only. Do not enable production snapshot support, public refresh support, scraping, scheduling, alerts, login automation, or auto-booking for Lee Valley yet.

## Target Venue

Lee Valley Hockey and Tennis Centre

## Current Registry Status

Lee Valley is listed in the backend venue registry, but snapshot support is not enabled:

```text
snapshotSupported: false
refreshSupported: false
```

This means the production backend should treat Lee Valley as registry-only until investigation is complete and manually reviewed.

## Known Official Booking URL

From `backend/data/venues.json`:

```text
https://www.better.org.uk/leisure-centre/lee-valley/hockey-and-tennis-centre
```

## Public Times API Finding

Investigation found a public JSON endpoint for Lee Valley outdoor tennis court time slots:

```text
https://better-admin.org.uk/api/activities/venue/lee-valley-hockey-and-tennis-centre/activity/tennis-court-outdoor/times?date=YYYY-MM-DD
```

This endpoint appears to return structured slot fields, including:

- `starts_at.format_24_hour`
- `ends_at.format_24_hour`
- `duration`
- `price.formatted_amount`
- `spaces`
- `name`
- `date`
- `venue_slug`
- `category_slug`
- `action_to_show.status`
- `allows_anonymous_bookings`

No-login slot visibility is confirmed for investigation purposes because the endpoint returns structured time, price, spaces, and status data without using an account.

Booking itself may still require an account. The response field `allows_anonymous_bookings` may be `false`, so this project must continue sending users to the official booking page and must not submit booking forms or bypass login.

Lee Valley remains investigation-only:

```text
snapshotSupported: false
refreshSupported: false
```

The next step is to decide whether adding backend cached support is ethical, useful, and technically reliable.

## Manual Investigation Checklist

- Open the official booking page in a browser.
- Check whether court availability is visible without login.
- Check whether a date can be selected without login.
- Check whether court, time, status, or price data appears.
- Separate venue information from booking-slot information.
- Treat opening hours such as `Mon 10:00 - 22:00` as generic venue information, not slot availability.
- Inspect the browser Network tab.
- Check whether data appears in raw HTML, XHR/fetch responses, or JavaScript-rendered page text.
- Check whether login is required before availability is visible.
- Check terms and robots.txt before any automation beyond manual/local investigation.

## Local Script Detection Notes

The Lee Valley investigation scripts intentionally avoid treating ordinary venue opening hours as booking slots.

Generic venue indicators include:

- Opening Hours
- Mon, Tue, Wed, Thu, Fri, Sat, Sun
- telephone or phone text
- venue URL text
- leisure centre
- Better

Potential booking-slot indicators require at least two stronger signals:

- court, pitch, or resource label
- bookable slot time range outside an opening-hours context
- availability status such as Available, Booked, Unavailable, or Full
- price pattern near possible slot text
- booking button or `Book` text near a specific time
- date-specific booking table or grid text

If only opening hours are found, the scripts should conclude:

```text
Only venue opening hours found; booking slot data is not confirmed.
```

If signals remain weak, the scripts should conclude:

```text
Booking data not confirmed. Manual browser/network investigation required.
```

## Ethical Constraints

- No auto-booking.
- No login bypass.
- No aggressive polling.
- No form submission.
- No production frontend scraping.
- No production refresh support until the API use is reviewed.
- Use cache-only data if implemented later.
- Users must book through the official venue page.

## Decision Criteria

Continue to rendered-page investigation only if public slot data is visible without login and appears parseable.

Keep Lee Valley as registry-only if login, payment-wall, account access, or restricted access is required before availability is visible.

Only consider future snapshot support if:

- Public slot data is visible without login.
- Data access appears compatible with venue terms.
- A conservative parser can extract court, time, and status reliably.
- The team decides whether to include price, since price is structured in the API but still needs product review.
- Cached results can be shown with a clear last checked timestamp.
- Users are still redirected to the official booking page to book.

## Local API Parser Prototype

Use this local-only command to fetch the public API once for a selected date:

```bash
npm run investigate:lee-valley:times-api -- --date=2026-04-27
```

If no date is supplied, the script uses today's date.

The script saves:

```text
investigation-output/lee-valley-times-YYYY-MM-DD.json
investigation-output/lee-valley-normalized-YYYY-MM-DD.json
```

The normalized file is shaped like a cached snapshot candidate, but it is not used by the production backend or frontend yet.

## Open Questions Before Implementation

- Is availability visible to guests, or does it require a user account?
- Does the venue use a booking iframe, embedded provider, or separate booking system?
- Are date and activity selections represented in the URL or only client-side state?
- Is slot data present in raw HTML, network responses, or rendered text?
- Are court names and time ranges stable enough to parse?
- Is price visible, and can it be safely associated with a slot?
- What terms or rate limits apply to automated access?
- Would a future cached snapshot be useful without showing price?

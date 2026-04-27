# Lee Valley Investigation

## Objective

Document the investigation that moved Lee Valley Hockey and Tennis Centre from registry-only status to cached backend snapshot support.

This remains cached monitoring only. The production frontend does not request Better directly, does not expose refresh credentials, and does not book courts.

## Target Venue

Lee Valley Hockey and Tennis Centre

## Current Registry Status

Lee Valley is now a supported cached backend venue:

```text
snapshotSupported: true
refreshSupported: true
snapshotMethod: public-json-api
```

## Official Booking URL

```text
https://bookings.better.org.uk/location/lee-valley-hockey-and-tennis-centre/tennis-court-outdoor
```

Users must confirm availability and complete booking through the official Better booking page.

## Public Slot Visibility

Investigation confirmed that outdoor tennis court slot visibility is available through a public Better JSON endpoint without logging in:

```text
https://better-admin.org.uk/api/activities/venue/lee-valley-hockey-and-tennis-centre/activity/tennis-court-outdoor/times?date=YYYY-MM-DD
```

The booking action itself may still require a Better account. The API response can include `allows_anonymous_bookings: false`, so this project must not submit booking forms or bypass login.

## API Response Schema

Useful fields observed in the Better API response:

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

## Local Parser Result

The local investigation parser successfully normalized a sample date:

```text
total slots: 12
available slots: 7
unavailable slots: 5
price: £14.00
confidence: high
```

The normalized cached record shape is:

```json
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
```

## Backend Support Decision

Lee Valley is supported through cached backend refresh because:

- Slot data is public and structured.
- The response includes clear time, spaces, status, and price fields.
- The backend can fetch the endpoint once during a protected manual refresh.
- Normal frontend users read cached JSON only.

Cached files are written to:

```text
backend/data/snapshots/lee-valley/YYYY-MM-DD.json
```

## Local Investigation Script

Run the local-only parser without touching production cache:

```bash
npm run investigate:lee-valley:times-api -- --date=2026-04-27
```

It saves:

```text
investigation-output/lee-valley-times-YYYY-MM-DD.json
investigation-output/lee-valley-normalized-YYYY-MM-DD.json
```

## Ethical Constraints

- No auto-booking.
- No login bypass.
- No form submission.
- No frontend scraping.
- No public refresh button.
- No scheduler or alerts yet.
- Cache results and show clear stale-data wording.
- Users must book through the official Better page.

## Remaining Limitations

- Cached snapshots can become stale.
- Price is shown because the Better API provides structured `price.formatted_amount`, but users must still confirm price on Better.
- `spaces` is treated as an availability signal, not a guarantee.
- Terms and acceptable request frequency should be reviewed before any scheduled refresh is considered.

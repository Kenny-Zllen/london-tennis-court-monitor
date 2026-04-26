# Finsbury Park Parser Summary

This report summarizes the local parser output from `investigation-output/finsbury-slot-candidates.json`.

No web requests are made by this summary script. This is an investigation artifact only.

## Counts

- Total candidates: 78
- Candidates with price: 4

## Count by Court

- Court 1: 9
- Court 2: 8
- Court 3: 8
- Court 4 (no floodlights): 8
- Court 5 (no floodlights): 10
- Court 6: 10
- Court 7: 12
- Court 8: 13

## Count by Status

- Booked: 68
- Closed: 2
- Unavailable: 8

## Count by Confidence

- medium: 78

## Possible Issues

- Missing court: 0
- Missing timeRange: 0
- Missing status: 0
- Price near court boundary: 2

## Records With Price Near Court Boundary

- Court 1, 20:00 - 21:00, Booked, £12.00: 19:00 - 20:00 | Booked | 20:00 - 21:00 | Booked | £12.00 | Court 2
- Court 7, 20:00 - 21:00, Booked, £12.00: 19:00 - 20:00 | Booked | 20:00 - 21:00 | Booked | £12.00 | Court 8

## Conclusion

The parser is suitable for investigation because it produces structured candidate records from the saved rendered text and highlights records that may need manual review.

It is not safe to show this output directly in the app yet. The extraction depends on visible text layout, price association is still approximate, and recurring sessions or booking labels may need better structured handling.

Before an MVP v2, the candidates should be manually validated against the rendered screenshot and official booking page. The next phase should confirm the data structure, decide which statuses should be displayed, and define clear wording for stale or incomplete availability data.

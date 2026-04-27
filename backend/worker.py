"""
Court Watch polling worker.

Loops forever, scraping each active venue for the next N days, upserting
slots into Postgres, and logging status transitions to slot_events.

Run locally:
    cd backend
    source .venv/bin/activate
    python worker.py                # full loop
    python worker.py --once          # one cycle then exit
    python worker.py --venue lee-valley --once
    python worker.py --dates-ahead 1 --once

Env (set in backend/.env):
    SUPABASE_URL
    SUPABASE_SECRET_KEY
    WORKER_DATES_AHEAD       default 3
    WORKER_CYCLE_INTERVAL    default 120  (seconds between cycles)
"""

from __future__ import annotations

import argparse
import os
import random
import sys
import time
from datetime import date, datetime, timedelta, timezone

from dotenv import load_dotenv

from db import get_active_venues, upsert_slot_and_log_event
from scrapers import scrape_better, scrape_clubspark

load_dotenv()

DEFAULT_DATES_AHEAD = int(os.getenv("WORKER_DATES_AHEAD", "3"))
DEFAULT_CYCLE_INTERVAL = int(os.getenv("WORKER_CYCLE_INTERVAL", "120"))


def scrape_one(venue: dict, target_date: str) -> list[dict]:
    platform = venue.get("platform")

    if platform == "clubspark":
        return scrape_clubspark(venue, target_date)

    if platform == "better":
        return scrape_better(venue, target_date)

    print(f"  warn: unknown platform '{platform}' for {venue['id']}, skipping")
    return []


def cycle(dates_ahead: int, only_venue: str | None) -> None:
    venues = get_active_venues()

    if only_venue:
        venues = [v for v in venues if v["id"] == only_venue]

    if not venues:
        print("  no active venues to scrape")
        return

    today = date.today()
    target_dates = [(today + timedelta(days=i)).isoformat() for i in range(dates_ahead)]

    print(
        f"\n=== cycle {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')}Z  "
        f"venues={len(venues)} dates={target_dates} ==="
    )

    total_slots = 0
    total_events = 0

    for venue in venues:
        for target_date in target_dates:
            label = f"  {venue['id']:<18} {target_date}"
            try:
                slots = scrape_one(venue, target_date)
                events = sum(1 for s in slots if upsert_slot_and_log_event(s))
                total_slots += len(slots)
                total_events += events
                print(f"{label}  ok   slots={len(slots):<3} events={events}")
            except Exception as exc:
                print(f"{label}  FAIL {type(exc).__name__}: {exc}")

            time.sleep(random.uniform(1.0, 3.0))

    print(f"--- cycle done: {total_slots} slots, {total_events} events logged ---")


def main() -> int:
    parser = argparse.ArgumentParser(description="Court Watch polling worker")
    parser.add_argument("--once", action="store_true", help="run a single cycle and exit")
    parser.add_argument("--venue", default=None, help="restrict to a single venue id")
    parser.add_argument(
        "--dates-ahead",
        type=int,
        default=DEFAULT_DATES_AHEAD,
        help=f"number of dates to scrape per cycle (default {DEFAULT_DATES_AHEAD})",
    )
    parser.add_argument(
        "--cycle-interval",
        type=int,
        default=DEFAULT_CYCLE_INTERVAL,
        help=f"seconds between cycles (default {DEFAULT_CYCLE_INTERVAL})",
    )
    args = parser.parse_args()

    print("Court Watch worker starting")
    print(f"  dates ahead:    {args.dates_ahead}")
    print(f"  cycle interval: {args.cycle_interval}s")
    print(f"  once:           {args.once}")
    print(f"  only venue:     {args.venue or '(all)'}")

    if args.once:
        cycle(args.dates_ahead, args.venue)
        return 0

    while True:
        started = time.time()
        try:
            cycle(args.dates_ahead, args.venue)
        except KeyboardInterrupt:
            print("\nstopped by user")
            return 0
        except Exception as exc:
            print(f"!! cycle crashed: {type(exc).__name__}: {exc}")

        elapsed = time.time() - started
        sleep_for = max(10.0, args.cycle_interval - elapsed)
        print(f"=== sleeping {sleep_for:.0f}s ===")
        try:
            time.sleep(sleep_for)
        except KeyboardInterrupt:
            print("\nstopped by user")
            return 0


if __name__ == "__main__":
    sys.exit(main())

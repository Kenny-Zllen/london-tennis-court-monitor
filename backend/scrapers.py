"""
Per-platform scrapers used by the worker.

ClubSpark uses Playwright to render the public booking page.
Better uses the public JSON activity-times API.

Both return a list of normalized slot dicts with these keys:
  venue_id, slot_date, start_time, end_time, court, activity,
  status, price_pence, spaces, source_status
"""

from __future__ import annotations

import re

import certifi
import requests
from playwright.sync_api import sync_playwright

# --- ClubSpark --------------------------------------------------------

COURT_PATTERN = re.compile(r"^Court\s+\d+(?:\s+\(.+\))?$")
TIME_PATTERN = re.compile(r"^(?:at\s+)?(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$")
STATUS_PATTERN = re.compile(
    r"^(Available|Unavailable|Booked|Not available|Closed)$", re.IGNORECASE
)


def scrape_clubspark(venue: dict, target_date: str) -> list[dict]:
    booking_url = (
        f"{venue['official_booking_url']}/BookByDate"
        f"#?date={target_date}&role=guest"
    )

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1200})

        try:
            page.goto(booking_url, wait_until="domcontentloaded", timeout=30000)

            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass

            page.wait_for_timeout(3000)
            text = page.locator("body").inner_text(timeout=10000)
        finally:
            browser.close()

    return _parse_clubspark_text(text, venue["id"], target_date)


def _parse_clubspark_text(text: str, venue_id: str, target_date: str) -> list[dict]:
    lines = [
        line.strip()
        for line in text.replace("\u00a0", " ").splitlines()
        if line.strip()
    ]

    records: list[dict] = []
    seen: set = set()
    current_court: str | None = None

    for index, line in enumerate(lines):
        if COURT_PATTERN.match(line):
            current_court = line
            continue

        if not current_court:
            continue

        time_match = TIME_PATTERN.match(line)
        next_line = lines[index + 1] if index + 1 < len(lines) else ""
        status_match = STATUS_PATTERN.match(line)

        slot = None

        if time_match and STATUS_PATTERN.match(next_line):
            slot = _make_clubspark_slot(
                venue_id,
                target_date,
                current_court,
                time_match.group(1),
                time_match.group(2),
                next_line,
            )
        elif status_match and next_line.startswith("at "):
            ntm = TIME_PATTERN.match(next_line)
            if ntm:
                slot = _make_clubspark_slot(
                    venue_id,
                    target_date,
                    current_court,
                    ntm.group(1),
                    ntm.group(2),
                    line,
                )

        if not slot:
            continue

        key = (slot["court"], slot["start_time"], slot["end_time"], slot["status"].lower())
        if key in seen:
            continue
        seen.add(key)
        records.append(slot)

    return records


def _make_clubspark_slot(
    venue_id: str,
    target_date: str,
    court: str,
    start_hhmm: str,
    end_hhmm: str,
    raw_status: str,
) -> dict:
    return {
        "venue_id": venue_id,
        "slot_date": target_date,
        "start_time": f"{start_hhmm}:00",
        "end_time": f"{end_hhmm}:00",
        "court": court,
        "activity": "",
        "status": _normalize_clubspark_status(raw_status),
        "price_pence": None,
        "spaces": None,
        "source_status": raw_status,
    }


def _normalize_clubspark_status(raw: str) -> str:
    lowered = raw.strip().lower()
    if lowered == "available":
        return "Available"
    if lowered == "booked":
        return "Booked"
    if lowered in {"unavailable", "not available"}:
        return "Unavailable"
    if lowered == "closed":
        return "Closed"
    return raw


# --- Better -----------------------------------------------------------

LEE_VALLEY_VENUE_SLUG = "lee-valley-hockey-and-tennis-centre"
LEE_VALLEY_ACTIVITY_SLUG = "tennis-court-outdoor"
LEE_VALLEY_ACTIVITY_NAME = "Outdoor Court Hire"

BETTER_HEADERS = {
    "Accept": "application/json",
    "Origin": "https://bookings.better.org.uk",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}

PRICE_PATTERN = re.compile(r"(\d+)\.(\d{2})")


def scrape_better(venue: dict, target_date: str) -> list[dict]:
    # V1: only Lee Valley is wired up. To support more Better venues later,
    # store venue_slug + activity_slug on the venues table and read here.
    if venue["id"] != "lee-valley":
        return []

    url = (
        "https://better-admin.org.uk/api/activities/venue/"
        f"{LEE_VALLEY_VENUE_SLUG}/activity/{LEE_VALLEY_ACTIVITY_SLUG}"
        f"/times?date={target_date}"
    )
    headers = {
        **BETTER_HEADERS,
        "Referer": (
            "https://bookings.better.org.uk/location/"
            f"{LEE_VALLEY_VENUE_SLUG}/{LEE_VALLEY_ACTIVITY_SLUG}"
            f"/{target_date}/by-time"
        ),
    }

    response = requests.get(url, headers=headers, timeout=20, verify=certifi.where())
    response.raise_for_status()
    payload = response.json()

    raw = _extract_better_records(payload)
    return [
        slot
        for slot in (_normalize_better_record(r, venue["id"], target_date) for r in raw)
        if slot is not None
    ]


def _extract_better_records(payload) -> list:
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    for key in ("data", "results", "times"):
        value = payload.get(key)
        if isinstance(value, list):
            return value
    return []


def _normalize_better_record(record: dict, venue_id: str, target_date: str) -> dict | None:
    starts_at = _better_time(record.get("starts_at"))
    ends_at = _better_time(record.get("ends_at"))
    if not starts_at or not ends_at:
        return None

    spaces_raw = record.get("spaces")
    spaces = int(spaces_raw) if spaces_raw is not None else 0

    action = record.get("action_to_show") or {}
    source_status = (
        action.get("status") if isinstance(action, dict) else None
    ) or record.get("status") or "Unknown"

    if spaces > 0 and str(source_status).upper() == "BOOK":
        status = "Available"
    else:
        status = "Unavailable"

    price_pence = None
    price_obj = record.get("price") or {}
    formatted = price_obj.get("formatted_amount") if isinstance(price_obj, dict) else None
    if isinstance(formatted, str):
        match = PRICE_PATTERN.search(formatted)
        if match:
            price_pence = int(match.group(1)) * 100 + int(match.group(2))

    return {
        "venue_id": venue_id,
        "slot_date": target_date,
        "start_time": _hhmmss(starts_at),
        "end_time": _hhmmss(ends_at),
        "court": "",
        "activity": LEE_VALLEY_ACTIVITY_NAME,
        "status": status,
        "price_pence": price_pence,
        "spaces": spaces,
        "source_status": source_status,
    }


def _better_time(value) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get("format_24_hour")
    return None


def _hhmmss(value: str) -> str:
    if len(value) == 5:
        return f"{value}:00"
    return value

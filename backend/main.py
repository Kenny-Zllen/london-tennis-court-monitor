import json
import os
import re
from datetime import date, datetime
from pathlib import Path

import certifi
import requests
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="London Tennis Court Monitor API",
    description="API for cached local tennis venue snapshot data.",
    version="0.2.0",
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "https://london-tennis-court-monitor.vercel.app",
]

BACKEND_DATA_DIR = Path(__file__).parent / "data"
VENUE_REGISTRY_PATH = BACKEND_DATA_DIR / "venues.json"
SNAPSHOT_DATA_DIR = BACKEND_DATA_DIR / "snapshots"
FINSBURY_DATA_DIR = SNAPSHOT_DATA_DIR / "finsbury-park"
LEE_VALLEY_DATA_DIR = SNAPSHOT_DATA_DIR / "lee-valley"
VENUE_DATA_DIRS = {
    "finsbury-park": FINSBURY_DATA_DIR,
    "lee-valley": LEE_VALLEY_DATA_DIR,
}
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
COURT_HEADING_PATTERN = re.compile(r"^Court\s+\d+(?:\s+\(.+\))?$")
TIME_RANGE_PATTERN = re.compile(r"^(?:at\s+)?(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$")
STATUS_PATTERN = re.compile(r"^(Available|Unavailable|Booked|Not available|Closed)$", re.I)
BOOKING_BASE_URL = "https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDate"
FINSBURY_SNAPSHOT_DISCLAIMER = (
    "Cached static snapshot data only. Not live availability. "
    "Some records may require manual validation. Always confirm and book "
    "through the official ClubSpark page."
)
LEE_VALLEY_VENUE_ID = "lee-valley"
LEE_VALLEY_VENUE_NAME = "Lee Valley Hockey and Tennis Centre"
LEE_VALLEY_ACTIVITY_NAME = "Outdoor Court Hire"
LEE_VALLEY_VENUE_SLUG = "lee-valley-hockey-and-tennis-centre"
LEE_VALLEY_ACTIVITY_SLUG = "tennis-court-outdoor"
LEE_VALLEY_SNAPSHOT_DISCLAIMER = (
    "Cached static snapshot data only. Not live availability. Always confirm "
    "and book through the official Better booking page."
)
FINSBURY_VENUE_ID = "finsbury-park"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_venue_registry() -> list[dict]:
    if not VENUE_REGISTRY_PATH.exists():
        return []

    with VENUE_REGISTRY_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_venue(venue_id: str) -> dict:
    for venue in load_venue_registry():
        if venue.get("id") == venue_id:
            return venue

    raise HTTPException(
        status_code=404,
        detail=f"Venue '{venue_id}' was not found.",
    )


def require_snapshot_supported(venue_id: str) -> dict:
    venue = get_venue(venue_id)

    if not venue.get("snapshotSupported"):
        raise HTTPException(
            status_code=404,
            detail="Snapshot support is not implemented for this venue yet.",
        )

    if venue_id not in VENUE_DATA_DIRS:
        raise HTTPException(
            status_code=404,
            detail=f"No cached snapshot data directory is configured for {venue['name']}.",
        )

    return venue


def get_snapshot_dates_for_venue(venue_id: str) -> list[str]:
    require_snapshot_supported(venue_id)
    data_dir = VENUE_DATA_DIRS[venue_id]

    if not data_dir.exists():
        return []

    return sorted(
        path.stem
        for path in data_dir.glob("*.json")
        if DATE_PATTERN.match(path.stem)
    )


def validate_date_string(date_value: str) -> str:
    if not DATE_PATTERN.match(date_value):
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD.",
        )

    try:
        date.fromisoformat(date_value)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid date. Use a real calendar date in YYYY-MM-DD format.",
        ) from exc

    return date_value


def load_snapshot_for_venue(venue_id: str, date: str) -> dict:
    venue = require_snapshot_supported(venue_id)
    snapshot_path = VENUE_DATA_DIRS[venue_id] / f"{date}.json"

    if not snapshot_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No cached snapshot found for {venue_id}/{date}",
        )

    with snapshot_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def build_booking_url(date_value: str) -> str:
    return f"{BOOKING_BASE_URL}#?date={date_value}&role=guest"


def build_lee_valley_api_url(date_value: str) -> str:
    return (
        "https://better-admin.org.uk/api/activities/venue/"
        f"{LEE_VALLEY_VENUE_SLUG}/activity/{LEE_VALLEY_ACTIVITY_SLUG}"
        f"/times?date={date_value}"
    )


def build_lee_valley_referer_url(date_value: str) -> str:
    return (
        "https://bookings.better.org.uk/location/"
        f"{LEE_VALLEY_VENUE_SLUG}/{LEE_VALLEY_ACTIVITY_SLUG}"
        f"/{date_value}/by-time"
    )


def parse_rendered_text(text: str) -> list[dict]:
    lines = [
        line.strip()
        for line in text.replace("\u00a0", " ").splitlines()
        if line.strip()
    ]
    records = []
    current_court = None

    for index, line in enumerate(lines):
        if COURT_HEADING_PATTERN.match(line):
            current_court = line
            continue

        if not current_court:
            continue

        time_match = TIME_RANGE_PATTERN.match(line)
        status_match = STATUS_PATTERN.match(line)
        next_line = lines[index + 1] if index + 1 < len(lines) else ""

        if time_match and STATUS_PATTERN.match(next_line):
            records.append(
                {
                    "court": current_court,
                    "timeRange": f"{time_match.group(1)} - {time_match.group(2)}",
                    "status": next_line,
                    "confidence": "medium",
                }
            )
            continue

        if status_match and next_line.startswith("at "):
            next_time_match = TIME_RANGE_PATTERN.match(next_line)

            if next_time_match:
                records.append(
                    {
                        "court": current_court,
                        "timeRange": (
                            f"{next_time_match.group(1)} - "
                            f"{next_time_match.group(2)}"
                        ),
                        "status": line,
                        "confidence": "medium",
                    }
                )

    return sort_records(dedupe_records(records))


def dedupe_records(records: list[dict]) -> list[dict]:
    seen = set()
    deduped = []

    for record in records:
        key = (
            record["court"],
            record["timeRange"],
            record["status"].lower(),
        )

        if key in seen:
            continue

        seen.add(key)
        deduped.append(record)

    return deduped


def sort_records(records: list[dict]) -> list[dict]:
    def sort_key(record: dict) -> tuple[int, int]:
        court_match = re.search(r"\d+", record["court"])
        court_number = int(court_match.group()) if court_match else 999
        hours, minutes = record["timeRange"].split(" - ")[0].split(":")
        start_minutes = int(hours) * 60 + int(minutes)
        return court_number, start_minutes

    return sorted(records, key=sort_key)


def count_by(records: list[dict], field: str) -> dict:
    counts = {}

    for record in records:
        key = record.get(field, "Missing")
        counts[key] = counts.get(key, 0) + 1

    return counts


def require_valid_refresh_token(refresh_token: str | None) -> None:
    expected_token = os.getenv("REFRESH_TOKEN")

    if not expected_token:
        raise HTTPException(
            status_code=500,
            detail="REFRESH_TOKEN is not configured on the backend server.",
        )

    if not refresh_token or refresh_token != expected_token:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized refresh request.",
        )


def refresh_finsbury_snapshot_cache(date_value: str) -> dict:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="Playwright is not installed on the backend server.",
        ) from exc

    source_url = build_booking_url(date_value)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1200})

        try:
            page.goto(source_url, wait_until="domcontentloaded", timeout=30000)

            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass

            page.wait_for_timeout(3000)
            rendered_text = page.locator("body").inner_text(timeout=10000)
        finally:
            browser.close()

    records = parse_rendered_text(rendered_text)
    last_checked_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    snapshot = {
        "meta": {
            "venueId": FINSBURY_VENUE_ID,
            "venueName": "Finsbury Park",
            "source": "Protected manual FastAPI refresh",
            "checkedDate": date_value,
            "sourceUrl": source_url,
            "lastCheckedAt": last_checked_at,
            "isLive": False,
            "disclaimer": FINSBURY_SNAPSHOT_DISCLAIMER,
        },
        "records": records,
    }

    FINSBURY_DATA_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_path = FINSBURY_DATA_DIR / f"{date_value}.json"

    with snapshot_path.open("w", encoding="utf-8") as file:
        json.dump(snapshot, file, indent=2)
        file.write("\n")

    return {
        "status": "refreshed",
        "date": date_value,
        "venueId": FINSBURY_VENUE_ID,
        "recordsGenerated": len(records),
        "countByCourt": count_by(records, "court"),
        "countByStatus": count_by(records, "status"),
        "lastCheckedAt": last_checked_at,
    }


def get_lee_valley_records_from_response(payload: object) -> list[dict]:
    if isinstance(payload, list):
        return payload

    if not isinstance(payload, dict):
        return []

    for key in ["data", "results", "times"]:
        value = payload.get(key)

        if isinstance(value, list):
            return value

    return []


def get_lee_valley_time_value(record: dict, field: str) -> str:
    value = record.get(field)

    if isinstance(value, str):
        return value

    if isinstance(value, dict) and value.get("format_24_hour"):
        return value["format_24_hour"]

    return "Unknown"


def get_lee_valley_source_status(record: dict) -> str:
    action_to_show = record.get("action_to_show")

    if isinstance(action_to_show, dict) and action_to_show.get("status"):
        return action_to_show["status"]

    return record.get("status") or "Unknown"


def map_lee_valley_status(record: dict) -> str:
    spaces = int(record.get("spaces") or 0)
    source_status = get_lee_valley_source_status(record).upper()

    if spaces > 0 and source_status == "BOOK":
        return "Available"

    if spaces == 0:
        return "Unavailable"

    if source_status in ["FULL", "UNAVAILABLE", "SOLD_OUT", "CLOSED"]:
        return "Unavailable"

    return "Unavailable"


def normalize_lee_valley_record(record: dict) -> dict:
    start_time = get_lee_valley_time_value(record, "starts_at")
    end_time = get_lee_valley_time_value(record, "ends_at")

    return {
        "venue": LEE_VALLEY_VENUE_NAME,
        "activity": LEE_VALLEY_ACTIVITY_NAME,
        "timeRange": f"{start_time} - {end_time}",
        "status": map_lee_valley_status(record),
        "spaces": int(record.get("spaces") or 0),
        "price": (record.get("price") or {}).get("formatted_amount", "Unknown"),
        "sourceStatus": get_lee_valley_source_status(record),
        "confidence": "high",
    }


def refresh_lee_valley_snapshot_cache(date_value: str) -> dict:
    source_url = build_lee_valley_api_url(date_value)
    headers = {
        "Accept": "application/json",
        "Origin": "https://bookings.better.org.uk",
        "Referer": build_lee_valley_referer_url(date_value),
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
    }

    try:
        response = requests.get(
            source_url,
            headers=headers,
            timeout=20,
            verify=certifi.where(),
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Lee Valley Better API request failed: {exc}",
        ) from exc

    if not response.ok:
        detail = response.text.replace("\n", " ").strip()[:500]
        raise HTTPException(
            status_code=502,
            detail=(
                "Lee Valley Better API request failed with "
                f"status {response.status_code} {response.reason}: {detail}"
            ),
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail="Lee Valley Better API returned invalid JSON.",
        ) from exc

    raw_records = get_lee_valley_records_from_response(payload)
    records = [normalize_lee_valley_record(record) for record in raw_records]
    last_checked_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    snapshot = {
        "meta": {
            "venueId": LEE_VALLEY_VENUE_ID,
            "venueName": LEE_VALLEY_VENUE_NAME,
            "source": "Better public activity times API",
            "checkedDate": date_value,
            "sourceUrl": source_url,
            "lastCheckedAt": last_checked_at,
            "isLive": False,
            "disclaimer": LEE_VALLEY_SNAPSHOT_DISCLAIMER,
        },
        "records": records,
    }

    LEE_VALLEY_DATA_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_path = LEE_VALLEY_DATA_DIR / f"{date_value}.json"

    with snapshot_path.open("w", encoding="utf-8") as file:
        json.dump(snapshot, file, indent=2)
        file.write("\n")

    return {
        "status": "refreshed",
        "date": date_value,
        "venueId": LEE_VALLEY_VENUE_ID,
        "recordsGenerated": len(records),
        "countByStatus": count_by(records, "status"),
        "lastCheckedAt": last_checked_at,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/venues")
def list_venues() -> dict:
    return {"venues": load_venue_registry()}


@app.get("/api/venues/{venue_id}/snapshots")
def list_venue_snapshots(venue_id: str) -> dict:
    venue = require_snapshot_supported(venue_id)
    available_dates = get_snapshot_dates_for_venue(venue_id)
    latest_date = available_dates[-1] if available_dates else None
    record_count = 0

    if latest_date:
        latest_snapshot = load_snapshot_for_venue(venue_id, latest_date)
        record_count = len(latest_snapshot.get("records", []))

    return {
        "venue": venue["name"],
        "venueId": venue["id"],
        "venueName": venue["name"],
        "availableDates": available_dates,
        "latestDate": latest_date,
        "recordCount": record_count,
    }


@app.get("/api/venues/{venue_id}/snapshot")
def get_venue_snapshot(
    venue_id: str,
    date: str | None = Query(default=None),
) -> dict:
    venue = require_snapshot_supported(venue_id)
    available_dates = get_snapshot_dates_for_venue(venue_id)

    if not available_dates:
        raise HTTPException(
            status_code=404,
            detail=f"No cached snapshots found for {venue_id}",
        )

    selected_date = date or available_dates[-1]

    validate_date_string(selected_date)

    return load_snapshot_for_venue(venue_id, selected_date)


@app.post("/api/venues/{venue_id}/refresh")
def refresh_venue_snapshot(
    venue_id: str,
    date: str | None = Query(default=None),
    refresh_token: str | None = Header(default=None, alias="X-Refresh-Token"),
) -> dict:
    require_valid_refresh_token(refresh_token)

    venue = get_venue(venue_id)

    if not venue.get("refreshSupported"):
        raise HTTPException(
            status_code=501,
            detail="Refresh is not implemented for this venue yet.",
        )

    selected_date = validate_date_string(date or datetime.utcnow().date().isoformat())

    if venue_id == FINSBURY_VENUE_ID:
        return refresh_finsbury_snapshot_cache(selected_date)

    if venue_id == LEE_VALLEY_VENUE_ID:
        return refresh_lee_valley_snapshot_cache(selected_date)

    raise HTTPException(
        status_code=501,
        detail="Refresh is not implemented for this venue yet.",
    )


@app.get("/api/finsbury/snapshots")
def list_finsbury_snapshots() -> dict:
    return list_venue_snapshots(FINSBURY_VENUE_ID)


@app.get("/api/finsbury/snapshot")
def get_finsbury_snapshot(date: str | None = Query(default=None)) -> dict:
    return get_venue_snapshot(FINSBURY_VENUE_ID, date)


@app.post("/api/finsbury/refresh")
def refresh_finsbury_snapshot(
    date: str | None = Query(default=None),
    refresh_token: str | None = Header(default=None, alias="X-Refresh-Token"),
) -> dict:
    return refresh_venue_snapshot(FINSBURY_VENUE_ID, date, refresh_token)

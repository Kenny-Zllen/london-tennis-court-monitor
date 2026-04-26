import json
import os
import re
from datetime import date, datetime
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="London Tennis Court Monitor API",
    description="Read-only API for cached local Finsbury Park snapshot data.",
    version="0.1.0",
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

DATA_DIR = Path(__file__).parent / "data" / "finsburySnapshots"
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
COURT_HEADING_PATTERN = re.compile(r"^Court\s+\d+(?:\s+\(.+\))?$")
TIME_RANGE_PATTERN = re.compile(r"^(?:at\s+)?(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$")
STATUS_PATTERN = re.compile(r"^(Available|Unavailable|Booked|Not available|Closed)$", re.I)
BOOKING_BASE_URL = "https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDate"
SNAPSHOT_DISCLAIMER = (
    "Cached static snapshot data only. Not live availability. "
    "Some records may require manual validation. Always confirm and book "
    "through the official ClubSpark page."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_snapshot_dates() -> list[str]:
    if not DATA_DIR.exists():
        return []

    return sorted(
        path.stem
        for path in DATA_DIR.glob("*.json")
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


def load_snapshot(date: str) -> dict:
    snapshot_path = DATA_DIR / f"{date}.json"

    if not snapshot_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No cached Finsbury Park snapshot found for {date}.",
        )

    with snapshot_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def build_booking_url(date_value: str) -> str:
    return f"{BOOKING_BASE_URL}#?date={date_value}&role=guest"


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


def refresh_snapshot(date_value: str) -> dict:
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
            "venueName": "Finsbury Park",
            "source": "Protected manual FastAPI refresh",
            "checkedDate": date_value,
            "sourceUrl": source_url,
            "lastCheckedAt": last_checked_at,
            "isLive": False,
            "disclaimer": SNAPSHOT_DISCLAIMER,
        },
        "records": records,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_path = DATA_DIR / f"{date_value}.json"

    with snapshot_path.open("w", encoding="utf-8") as file:
        json.dump(snapshot, file, indent=2)
        file.write("\n")

    return {
        "status": "refreshed",
        "date": date_value,
        "recordsGenerated": len(records),
        "countByCourt": count_by(records, "court"),
        "countByStatus": count_by(records, "status"),
        "lastCheckedAt": last_checked_at,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/finsbury/snapshots")
def list_finsbury_snapshots() -> dict:
    return {
        "venue": "Finsbury Park",
        "availableDates": get_snapshot_dates(),
    }


@app.get("/api/finsbury/snapshot")
def get_finsbury_snapshot(date: str | None = Query(default=None)) -> dict:
    available_dates = get_snapshot_dates()

    if not available_dates:
        raise HTTPException(
            status_code=404,
            detail="No cached Finsbury Park snapshots are available.",
        )

    selected_date = date or available_dates[-1]

    validate_date_string(selected_date)

    return load_snapshot(selected_date)


@app.post("/api/finsbury/refresh")
def refresh_finsbury_snapshot(
    date: str | None = Query(default=None),
    refresh_token: str | None = Header(default=None, alias="X-Refresh-Token"),
) -> dict:
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

    selected_date = validate_date_string(date or datetime.utcnow().date().isoformat())
    return refresh_snapshot(selected_date)

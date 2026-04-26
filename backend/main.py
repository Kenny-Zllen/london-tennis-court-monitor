import json
import re
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
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
]

DATA_DIR = Path(__file__).parent / "data" / "finsburySnapshots"
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
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


def load_snapshot(date: str) -> dict:
    snapshot_path = DATA_DIR / f"{date}.json"

    if not snapshot_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No cached Finsbury Park snapshot found for {date}.",
        )

    with snapshot_path.open("r", encoding="utf-8") as file:
        return json.load(file)


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

    if not DATE_PATTERN.match(selected_date):
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD.",
        )

    return load_snapshot(selected_date)

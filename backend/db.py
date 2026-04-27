"""
Supabase client + helpers used by the worker.

The service-role secret key bypasses RLS, so this module must only be
imported by trusted server-side code (worker, refresh endpoint).
Never import from the frontend.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

_client: Optional[Client] = None


def get_db() -> Client:
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SECRET_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SECRET_KEY must be set in backend/.env"
            )
        _client = create_client(url, key)
    return _client


def get_active_venues() -> list[dict]:
    db = get_db()
    res = db.table("venues").select("*").eq("is_active", True).execute()
    return res.data or []


def upsert_slot_and_log_event(slot: dict) -> bool:
    """
    Upsert a normalized slot. If it is new or its status changed,
    insert a row into slot_events and return True.

    Expected slot keys:
      venue_id, slot_date, start_time, end_time,
      court, activity, status, price_pence, spaces, source_status
    """
    db = get_db()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"

    venue_id = slot["venue_id"]
    slot_date = slot["slot_date"]
    start = slot["start_time"]
    end = slot["end_time"]
    court = slot.get("court") or ""
    activity = slot.get("activity") or ""

    res = (
        db.table("slots")
        .select("id, status")
        .eq("venue_id", venue_id)
        .eq("slot_date", slot_date)
        .eq("start_time", start)
        .eq("end_time", end)
        .eq("court", court)
        .eq("activity", activity)
        .execute()
    )
    existing = res.data[0] if res.data else None

    payload = {
        "venue_id": venue_id,
        "slot_date": slot_date,
        "start_time": start,
        "end_time": end,
        "court": court,
        "activity": activity,
        "status": slot["status"],
        "price_pence": slot.get("price_pence"),
        "spaces": slot.get("spaces"),
        "source_status": slot.get("source_status"),
        "last_seen_at": now_iso,
    }

    if existing is None:
        ins = db.table("slots").insert(payload).execute()
        new_slot = ins.data[0]
        db.table("slot_events").insert(
            {
                "slot_id": new_slot["id"],
                "venue_id": venue_id,
                "slot_date": slot_date,
                "start_time": start,
                "end_time": end,
                "court": court,
                "activity": activity,
                "prev_status": None,
                "new_status": slot["status"],
                "price_pence": slot.get("price_pence"),
                "spaces": slot.get("spaces"),
            }
        ).execute()
        return True

    db.table("slots").update(payload).eq("id", existing["id"]).execute()

    if existing["status"] != slot["status"]:
        db.table("slot_events").insert(
            {
                "slot_id": existing["id"],
                "venue_id": venue_id,
                "slot_date": slot_date,
                "start_time": start,
                "end_time": end,
                "court": court,
                "activity": activity,
                "prev_status": existing["status"],
                "new_status": slot["status"],
                "price_pence": slot.get("price_pence"),
                "spaces": slot.get("spaces"),
            }
        ).execute()
        return True

    return False

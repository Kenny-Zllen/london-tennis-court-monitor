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


def get_live_dates(venue_id: str) -> list[str]:
    db = get_db()
    res = (
        db.table("slots")
        .select("slot_date")
        .eq("venue_id", venue_id)
        .order("slot_date")
        .execute()
    )
    seen: set[str] = set()
    dates: list[str] = []
    for row in res.data or []:
        d = row["slot_date"]
        if d not in seen:
            seen.add(d)
            dates.append(d)
    return dates


def get_live_slots(venue_id: str, slot_date: str) -> list[dict]:
    db = get_db()
    res = (
        db.table("slots")
        .select("*")
        .eq("venue_id", venue_id)
        .eq("slot_date", slot_date)
        .order("start_time")
        .execute()
    )
    return res.data or []


def get_latest_seen_at(venue_id: str, slot_date: str) -> Optional[str]:
    db = get_db()
    res = (
        db.table("slots")
        .select("last_seen_at")
        .eq("venue_id", venue_id)
        .eq("slot_date", slot_date)
        .order("last_seen_at", desc=True)
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0]["last_seen_at"]
    return None


def upsert_slot_and_log_event(slot: dict) -> dict | None:
    """
    Upsert a normalized slot. If it is new or its status changed,
    insert a row into slot_events and return the inserted event row.
    Otherwise return None.

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
        ev = db.table("slot_events").insert(
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
        return ev.data[0] if ev.data else None

    db.table("slots").update(payload).eq("id", existing["id"]).execute()

    if existing["status"] != slot["status"]:
        ev = db.table("slot_events").insert(
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
        return ev.data[0] if ev.data else None

    return None


# --- Telegram subscriptions ----------------------------------------------

def insert_subscription(sub: dict) -> dict:
    db = get_db()
    res = db.table("tg_subscriptions").insert(sub).execute()
    return res.data[0]


def list_subscriptions_for_chat(chat_id: int) -> list[dict]:
    db = get_db()
    res = (
        db.table("tg_subscriptions")
        .select("*")
        .eq("chat_id", chat_id)
        .eq("active", True)
        .order("id")
        .execute()
    )
    return res.data or []


def deactivate_subscription(sub_id: int, chat_id: int) -> bool:
    db = get_db()
    res = (
        db.table("tg_subscriptions")
        .update({"active": False})
        .eq("id", sub_id)
        .eq("chat_id", chat_id)
        .execute()
    )
    return bool(res.data)


def find_matching_subscriptions(event: dict) -> list[dict]:
    """Subscriptions whose criteria match a Booked->Available slot event."""
    db = get_db()
    res = (
        db.table("tg_subscriptions")
        .select("*")
        .eq("active", True)
        .contains("venue_ids", [event["venue_id"]])
        .execute()
    )
    matches = []
    start_t = event["start_time"][:5]  # HH:MM
    iso_weekday = datetime.fromisoformat(event["slot_date"]).isoweekday()
    for sub in res.data or []:
        days = sub.get("days_of_week")
        if days and iso_weekday not in days:
            continue
        tf = (sub.get("time_from") or "")[:5]
        tt = (sub.get("time_to") or "")[:5]
        if tf and start_t < tf:
            continue
        if tt and start_t >= tt:
            continue
        matches.append(sub)
    return matches


def record_notification(subscription_id: int, slot_event_id: int) -> bool:
    """Returns True if newly inserted (i.e. should send), False if dedup hit."""
    db = get_db()
    try:
        db.table("tg_notifications").insert(
            {"subscription_id": subscription_id, "slot_event_id": slot_event_id}
        ).execute()
        return True
    except Exception:
        return False

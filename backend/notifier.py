"""
Telegram notifier: turn slot_events into Telegram messages.

Called by the worker each time `upsert_slot_and_log_event` produces a
new event whose new_status is 'Available'. We look up matching active
subscriptions, dedupe via tg_notifications, and post a message.
"""

from __future__ import annotations

import os

import requests
from dotenv import load_dotenv

from db import find_matching_subscriptions, record_notification

load_dotenv()

TELEGRAM_API = "https://api.telegram.org"


def _format_message(event: dict) -> str:
    venue = event["venue_id"]
    date = event["slot_date"]
    start = event["start_time"][:5]
    end = event["end_time"][:5]
    court = event.get("court") or event.get("activity") or ""
    price = event.get("price_pence")
    price_str = f" — £{price/100:.2f}" if price else ""
    line2 = f"{court}  {start}–{end}{price_str}" if court else f"{start}–{end}{price_str}"
    return (
        f"🎾 *Court available!*\n"
        f"{venue} — {date}\n"
        f"{line2}\n"
        f"Book it on the official venue page before it goes."
    )


def notify_event(event: dict) -> int:
    """Send Telegram messages for each matching subscription. Returns count sent."""
    if event.get("new_status") != "Available":
        return 0

    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        return 0

    subs = find_matching_subscriptions(event)
    if not subs:
        return 0

    text = _format_message(event)
    sent = 0
    for sub in subs:
        if not record_notification(sub["id"], event["id"]):
            continue
        try:
            requests.post(
                f"{TELEGRAM_API}/bot{token}/sendMessage",
                json={
                    "chat_id": sub["chat_id"],
                    "text": text,
                    "parse_mode": "Markdown",
                },
                timeout=10,
            )
            sent += 1
        except Exception as exc:
            print(f"  notify fail chat={sub['chat_id']}: {exc}")
    return sent

"""
Court Watch Telegram bot.

Long-polling bot that lets a user subscribe to court availability alerts.

Commands:
    /start              welcome + help
    /venues             list supported venues
    /watch <venue> <HH-HH> [days]
                        e.g. /watch finsbury-park 18-20
                             /watch finsbury-park 18-20 mon,wed,fri
    /list               list my active subscriptions
    /unwatch <id>       cancel subscription by id
    /help               show command help

Run: python bot.py
Env: TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SECRET_KEY
"""

from __future__ import annotations

import os
import re
import sys

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
)

from db import (
    deactivate_subscription,
    get_active_venues,
    insert_subscription,
    list_subscriptions_for_chat,
)

load_dotenv()

WEEKDAY_TO_INT = {
    "mon": 1, "tue": 2, "wed": 3, "thu": 4,
    "fri": 5, "sat": 6, "sun": 7,
}
INT_TO_WEEKDAY = {v: k for k, v in WEEKDAY_TO_INT.items()}

HELP_TEXT = (
    "*Court Watch* — get pinged when a London tennis court opens up.\n\n"
    "*Commands*\n"
    "/venues — list supported venues\n"
    "/watch <venue> <HH-HH> [days] — subscribe\n"
    "  e.g. `/watch finsbury-park 18-20`\n"
    "  e.g. `/watch finsbury-park 18-20 sat,sun`\n"
    "/list — your active subscriptions\n"
    "/unwatch <id> — cancel a subscription\n"
)

TIME_ARG_RE = re.compile(r"^(\d{1,2})-(\d{1,2})$")


async def start_cmd(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_markdown(HELP_TEXT)


async def help_cmd(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_markdown(HELP_TEXT)


async def venues_cmd(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    venues = get_active_venues()
    if not venues:
        await update.message.reply_text("No active venues yet.")
        return
    lines = ["*Active venues:*"]
    for v in venues:
        lines.append(f"• `{v['id']}` — {v['name']} ({v.get('area') or '?'})")
    await update.message.reply_markdown("\n".join(lines))


def _parse_days(arg: str | None) -> list[int] | None:
    if not arg:
        return None
    out = []
    for tok in arg.split(","):
        tok = tok.strip().lower()[:3]
        if tok in WEEKDAY_TO_INT:
            out.append(WEEKDAY_TO_INT[tok])
    return out or None


def _format_days(days: list[int] | None) -> str:
    if not days:
        return "any day"
    return ",".join(INT_TO_WEEKDAY[d] for d in sorted(days))


async def watch_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    args = ctx.args
    if len(args) < 2:
        await update.message.reply_markdown(
            "Usage: `/watch <venue_id> <HH-HH> [days]`\n"
            "e.g. `/watch finsbury-park 18-20 sat,sun`"
        )
        return

    venue_id = args[0]
    venues = {v["id"]: v for v in get_active_venues()}
    if venue_id not in venues:
        await update.message.reply_text(
            f"Unknown venue '{venue_id}'. Try /venues to list them."
        )
        return

    m = TIME_ARG_RE.match(args[1])
    if not m:
        await update.message.reply_text("Time must be like 18-20 (24-hour).")
        return
    h_from, h_to = int(m.group(1)), int(m.group(2))
    if not (0 <= h_from < 24 and 0 < h_to <= 24 and h_from < h_to):
        await update.message.reply_text("Time range looks off.")
        return

    days = _parse_days(args[2] if len(args) >= 3 else None)

    sub = insert_subscription({
        "chat_id": update.effective_chat.id,
        "username": update.effective_user.username,
        "venue_ids": [venue_id],
        "days_of_week": days,
        "time_from": f"{h_from:02d}:00",
        "time_to": f"{h_to:02d}:00",
    })
    await update.message.reply_markdown(
        f"✅ Subscribed (#{sub['id']}): {venues[venue_id]['name']}, "
        f"{h_from:02d}:00–{h_to:02d}:00, {_format_days(days)}.\n"
        f"You'll get pinged when a slot opens."
    )


async def list_cmd(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    subs = list_subscriptions_for_chat(update.effective_chat.id)
    if not subs:
        await update.message.reply_text(
            "No active subscriptions. Use /watch to add one."
        )
        return
    lines = ["*Your subscriptions:*"]
    for s in subs:
        venues = ",".join(s["venue_ids"])
        tf = (s.get("time_from") or "")[:5] or "00:00"
        tt = (s.get("time_to") or "")[:5] or "24:00"
        lines.append(
            f"#{s['id']} — {venues}, {tf}–{tt}, {_format_days(s.get('days_of_week'))}"
        )
    lines.append("\nCancel with `/unwatch <id>`.")
    await update.message.reply_markdown("\n".join(lines))


async def unwatch_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not ctx.args:
        await update.message.reply_text("Usage: /unwatch <id>")
        return
    try:
        sub_id = int(ctx.args[0])
    except ValueError:
        await update.message.reply_text("Subscription id must be a number.")
        return
    ok = deactivate_subscription(sub_id, update.effective_chat.id)
    if ok:
        await update.message.reply_text(f"Cancelled subscription #{sub_id}.")
    else:
        await update.message.reply_text(
            f"No active subscription #{sub_id} on your account."
        )


def main() -> int:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("TELEGRAM_BOT_TOKEN is not set")
        return 1

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("venues", venues_cmd))
    app.add_handler(CommandHandler("watch", watch_cmd))
    app.add_handler(CommandHandler("list", list_cmd))
    app.add_handler(CommandHandler("unwatch", unwatch_cmd))

    print("Court Watch bot starting (long-polling)…")
    app.run_polling(allowed_updates=Update.ALL_TYPES)
    return 0


if __name__ == "__main__":
    sys.exit(main())

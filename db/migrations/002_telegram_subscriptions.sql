-- =====================================================================
-- Migration 002: lightweight Telegram subscriptions for MVP bot
-- =====================================================================
-- Decoupled from auth.users: keyed directly on Telegram chat_id so a
-- user can subscribe without signing up on the website first.
-- =====================================================================

create table if not exists public.tg_subscriptions (
  id              bigserial primary key,
  chat_id         bigint not null,
  username        text,
  venue_ids       text[] not null,
  days_of_week    int[],          -- 1=Mon..7=Sun; null = any day
  time_from       time,           -- slot must start >= this; null = any
  time_to         time,           -- slot must start <  this; null = any
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists tg_subs_chat_idx
  on public.tg_subscriptions (chat_id);
create index if not exists tg_subs_active_idx
  on public.tg_subscriptions (active) where active = true;

create table if not exists public.tg_notifications (
  id              bigserial primary key,
  subscription_id bigint not null references public.tg_subscriptions(id) on delete cascade,
  slot_event_id   bigint not null references public.slot_events(id) on delete cascade,
  sent_at         timestamptz not null default now(),
  unique (subscription_id, slot_event_id)
);

create index if not exists tg_notifications_sub_idx
  on public.tg_notifications (subscription_id);

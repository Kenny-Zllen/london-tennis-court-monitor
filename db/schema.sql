-- =====================================================================
-- Court Watch — Supabase schema (V1: Watcher MVP)
-- =====================================================================
-- Paste this entire file into Supabase SQL Editor and run.
-- It is idempotent: safe to re-run.
--
-- Tables:
--   venues             registry of supported tennis venues
--   slots              latest known state of every (venue, date, time) slot
--   slot_events        append-only diff log of status transitions
--   watches            user subscription rules
--   notifications      delivery log + dedup key
--   telegram_links     user_id <-> Telegram chat_id binding
--   telegram_link_codes one-time codes for the /link <code> flow
--   waitlist           landing page email capture
--
-- Auth users live in Supabase's built-in `auth.users` table.
-- =====================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- venues
-- ---------------------------------------------------------------------
create table if not exists public.venues (
  id                   text primary key,
  name                 text not null,
  area                 text,
  platform             text not null,           -- 'clubspark' | 'better' | 'enable' | ...
  official_booking_url text not null,
  timezone             text not null default 'Europe/London',
  snapshot_method      text,                    -- 'playwright-rendered-page' | 'public-json-api' | ...
  poll_interval_sec    int  not null default 90,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- slots — current known state. UPSERT target for the polling worker.
-- ---------------------------------------------------------------------
create table if not exists public.slots (
  id              bigserial primary key,
  venue_id        text not null references public.venues(id) on delete cascade,
  slot_date       date not null,
  start_time      time not null,
  end_time        time not null,
  court           text,                          -- e.g. 'Court 3' (ClubSpark venues)
  activity        text,                          -- e.g. 'Outdoor Court Hire' (Lee Valley)
  status          text not null,                 -- 'Available' | 'Booked' | 'Unavailable' | 'Closed' | 'Unknown'
  price_pence     int,                           -- store as int pence; NULL when unknown
  spaces          int,                           -- NULL when unknown
  source_status   text,                          -- raw upstream status string
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- A slot is uniquely identified by venue + date + time + court/activity.
  -- COALESCE so NULLs don't break uniqueness.
  constraint slots_unique_slot
    unique (venue_id, slot_date, start_time, end_time, court, activity)
);

create index if not exists slots_venue_date_idx on public.slots (venue_id, slot_date);
create index if not exists slots_date_status_idx on public.slots (slot_date, status);
create index if not exists slots_updated_at_idx on public.slots (updated_at desc);

-- ---------------------------------------------------------------------
-- slot_events — append-only diff log. Source of notifications.
-- ---------------------------------------------------------------------
create table if not exists public.slot_events (
  id              bigserial primary key,
  slot_id         bigint not null references public.slots(id) on delete cascade,
  venue_id        text not null,                 -- denormalized for fast filter
  slot_date       date not null,
  start_time      time not null,
  end_time        time not null,
  court           text,
  activity        text,
  prev_status     text,
  new_status      text not null,
  price_pence     int,
  spaces          int,
  detected_at     timestamptz not null default now()
);

create index if not exists slot_events_detected_idx on public.slot_events (detected_at desc);
create index if not exists slot_events_venue_date_idx on public.slot_events (venue_id, slot_date);
create index if not exists slot_events_new_status_idx on public.slot_events (new_status, detected_at desc);

-- ---------------------------------------------------------------------
-- watches — user subscription rules
-- ---------------------------------------------------------------------
create table if not exists public.watches (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text,                         -- friendly label, e.g. 'Sat evenings N4'
  venue_ids        text[] not null,              -- array of venue.id
  days_of_week     int[],                        -- ISO 1=Mon .. 7=Sun; NULL = any day
  time_from        time,                         -- slot must start >= this
  time_to          time,                         -- slot must end   <= this
  date_from        date,                         -- NULL = today
  date_to          date,                         -- NULL = today + 14
  max_price_pence  int,                          -- NULL = any price
  min_spaces       int not null default 1,
  channels         text[] not null default '{telegram}',  -- 'telegram' | 'web_push' | 'email'
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists watches_user_idx on public.watches (user_id);
create index if not exists watches_active_idx on public.watches (active) where active = true;

-- ---------------------------------------------------------------------
-- notifications — delivery log + dedup
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id              bigserial primary key,
  watch_id        uuid not null references public.watches(id) on delete cascade,
  slot_event_id   bigint not null references public.slot_events(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  channel         text not null,                 -- 'telegram' | 'web_push' | 'email'
  status          text not null default 'pending', -- 'pending' | 'sent' | 'failed'
  error           text,
  payload         jsonb,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),

  -- Dedup: never notify the same user about the same slot transition twice on the same channel.
  constraint notifications_dedup
    unique (watch_id, slot_event_id, channel)
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_status_idx on public.notifications (status) where status = 'pending';

-- ---------------------------------------------------------------------
-- telegram_links — bind a website user to a Telegram chat
-- ---------------------------------------------------------------------
create table if not exists public.telegram_links (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  chat_id             bigint not null unique,
  telegram_username   text,
  linked_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- telegram_link_codes — one-time codes for the /link flow
-- ---------------------------------------------------------------------
create table if not exists public.telegram_link_codes (
  code         text primary key,                 -- short random string e.g. 'A7K9-2P4M'
  user_id      uuid not null references auth.users(id) on delete cascade,
  expires_at   timestamptz not null default (now() + interval '15 minutes'),
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists telegram_link_codes_user_idx on public.telegram_link_codes (user_id);

-- ---------------------------------------------------------------------
-- waitlist — landing page captures
-- ---------------------------------------------------------------------
create table if not exists public.waitlist (
  id               bigserial primary key,
  email            text not null unique,
  referral_source  text,
  created_at       timestamptz not null default now()
);

-- =====================================================================
-- updated_at trigger
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists slots_set_updated_at on public.slots;
create trigger slots_set_updated_at
  before update on public.slots
  for each row execute function public.set_updated_at();

drop trigger if exists watches_set_updated_at on public.watches;
create trigger watches_set_updated_at
  before update on public.watches
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
-- Public-readable reference data
alter table public.venues       enable row level security;
alter table public.slots        enable row level security;
alter table public.slot_events  enable row level security;

drop policy if exists "venues are public read" on public.venues;
create policy "venues are public read"
  on public.venues for select
  using (true);

drop policy if exists "slots are public read" on public.slots;
create policy "slots are public read"
  on public.slots for select
  using (true);

drop policy if exists "slot_events are public read" on public.slot_events;
create policy "slot_events are public read"
  on public.slot_events for select
  using (true);

-- User-private data
alter table public.watches              enable row level security;
alter table public.notifications        enable row level security;
alter table public.telegram_links       enable row level security;
alter table public.telegram_link_codes  enable row level security;

drop policy if exists "users manage own watches" on public.watches;
create policy "users manage own watches"
  on public.watches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "users read own telegram link" on public.telegram_links;
create policy "users read own telegram link"
  on public.telegram_links for select
  using (auth.uid() = user_id);

drop policy if exists "users manage own link codes" on public.telegram_link_codes;
create policy "users manage own link codes"
  on public.telegram_link_codes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Waitlist: anyone can insert, nobody can read (only service role)
alter table public.waitlist enable row level security;
drop policy if exists "anyone can join waitlist" on public.waitlist;
create policy "anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- NOTE: backend worker uses the Supabase service_role key, which bypasses RLS.

-- =====================================================================
-- Seed venues (5 to start)
-- =====================================================================
insert into public.venues (id, name, area, platform, official_booking_url, snapshot_method, poll_interval_sec) values
  ('finsbury-park',     'Finsbury Park',                       'Haringey',                       'clubspark', 'https://clubspark.lta.org.uk/FinsburyPark/Booking',                                              'playwright-rendered-page', 90),
  ('lee-valley',        'Lee Valley Hockey and Tennis Centre', 'Queen Elizabeth Olympic Park',   'better',    'https://bookings.better.org.uk/location/lee-valley-hockey-and-tennis-centre/tennis-court-outdoor', 'public-json-api',          90),
  ('clissold-park',     'Clissold Park',                       'Hackney',                        'clubspark', 'https://clubspark.lta.org.uk/ClissoldPark/Booking',                                              'playwright-rendered-page', 90),
  ('highbury-fields',   'Highbury Fields',                     'Islington',                      'clubspark', 'https://clubspark.lta.org.uk/HighburyFields/Booking',                                            'playwright-rendered-page', 90),
  ('hackney-downs',     'Hackney Downs',                       'Hackney',                        'clubspark', 'https://clubspark.lta.org.uk/HackneyDowns/Booking',                                              'playwright-rendered-page', 90)
on conflict (id) do update set
  name                 = excluded.name,
  area                 = excluded.area,
  platform             = excluded.platform,
  official_booking_url = excluded.official_booking_url,
  snapshot_method      = excluded.snapshot_method;

-- =====================================================================
-- Done.
-- Verify with:
--   select count(*) from public.venues;          -- expect 5
--   select tablename from pg_tables where schemaname = 'public';
-- =====================================================================

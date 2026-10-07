-- BARAMEEL RUN — Migration 009
-- Live player positions for the shared Route Map.
begin;

create table if not exists public.player_locations (
  player_id uuid primary key references public.players(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy_meters double precision,
  updated_at timestamptz not null default now()
);

create index if not exists player_locations_updated_at_idx
  on public.player_locations(updated_at desc);

alter table public.player_locations enable row level security;

drop policy if exists player_locations_no_client_read on public.player_locations;
create policy player_locations_no_client_read
  on public.player_locations for select
  to authenticated
  using (false);

drop policy if exists player_locations_no_client_write on public.player_locations;
create policy player_locations_no_client_write
  on public.player_locations for all
  to authenticated
  using (false)
  with check (false);

commit;

-- BARAMEEL RUN V23.2 — server-controlled checkpoint validation
begin;

create table if not exists public.checkpoint_definitions (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 120 check (radius_meters between 20 and 1000),
  points bigint not null default 10000 check (points >= 0),
  active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_checkpoint_definitions_active
  on public.checkpoint_definitions(active);

create table if not exists public.checkpoint_claims (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  checkpoint_id text not null references public.checkpoint_definitions(id),
  points_awarded bigint not null default 0,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  unique(player_id, checkpoint_id)
);

create index if not exists idx_checkpoint_claims_player
  on public.checkpoint_claims(player_id, created_at desc);

create or replace function public.claim_checkpoint(
  p_player_id uuid,
  p_checkpoint_id text,
  p_idempotency_key text,
  p_lat double precision,
  p_lng double precision
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cp public.checkpoint_definitions%rowtype;
  existing public.checkpoint_claims%rowtype;
  new_claim public.checkpoint_claims%rowtype;
  distance_m double precision;
begin
  if p_idempotency_key is not null then
    select * into existing
    from public.checkpoint_claims
    where idempotency_key = p_idempotency_key
    limit 1;

    if found then
      select * into cp
      from public.checkpoint_definitions
      where id = existing.checkpoint_id;

      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'type', 'checkpoint',
        'checkpoint_id', existing.checkpoint_id,
        'checkpoint_name', coalesce(cp.name, existing.checkpoint_id),
        'points_awarded', existing.points_awarded
      );
    end if;
  end if;

  select * into cp
  from public.checkpoint_definitions
  where id = trim(p_checkpoint_id)
  for update;

  if not found then
    raise exception using errcode='P0001', message='CHECKPOINT_NOT_FOUND';
  end if;

  if not cp.active then
    raise exception using errcode='P0001', message='CHECKPOINT_NOT_ACTIVE';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    raise exception using errcode='P0001', message='CHECKPOINT_LOCATION_REQUIRED';
  end if;

  distance_m :=
    2.0 * 6371000.0 * asin(
      sqrt(
        sin(radians(cp.lat - p_lat) / 2.0)^2 +
        cos(radians(p_lat)) * cos(radians(cp.lat)) *
        sin(radians(cp.lng - p_lng) / 2.0)^2
      )
    );

  if distance_m > cp.radius_meters then
    raise exception using errcode='P0001', message='CHECKPOINT_TOO_FAR';
  end if;

  begin
    insert into public.checkpoint_claims(player_id,checkpoint_id,points_awarded,idempotency_key)
    values(p_player_id,cp.id,cp.points,p_idempotency_key)
    returning * into new_claim;
  exception
    when unique_violation then
      raise exception using errcode='P0001', message='CHECKPOINT_ALREADY_CLAIMED';
  end;

  update public.players
  set points = coalesce(points,0) + new_claim.points_awarded,
      weekly_points = coalesce(weekly_points,0) + new_claim.points_awarded
  where id = p_player_id;

  return jsonb_build_object(
    'ok', true,
    'type', 'checkpoint',
    'checkpoint_id', cp.id,
    'checkpoint_name', cp.name,
    'points_awarded', new_claim.points_awarded,
    'distance_meters', round(distance_m)
  );
end;
$$;

revoke all on function public.claim_checkpoint(uuid,text,text,double precision,double precision)
  from public, anon, authenticated;

grant execute on function public.claim_checkpoint(uuid,text,text,double precision,double precision)
  to service_role;

commit;

-- BARAMEEL RUN — Master QR server validation and atomic claim
-- Migration 008
begin;

-- Tight physical validation by default. Exact coordinates can be corrected later
-- without changing the rest of the system.
update public.checkpoint_locations
set radius_meters = 20
where radius_meters = 120;

create or replace function public.resolve_and_claim_master_checkpoint(
  p_player_id uuid,
  p_qr_token text,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_meters double precision default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  qr public.master_qr_codes%rowtype;
  location_row public.checkpoint_locations%rowtype;
  stage_row public.game_stages%rowtype;
  challenge public.checkpoint_challenges%rowtype;
  existing public.checkpoint_challenge_claims%rowtype;
  new_claim public.checkpoint_challenge_claims%rowtype;
  distance_m double precision;
begin
  if p_qr_token is null or trim(p_qr_token) = '' then
    raise exception using errcode='P0001', message='MASTER_QR_REQUIRED';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    raise exception using errcode='P0001', message='CHECKPOINT_LOCATION_REQUIRED';
  end if;

  -- A very poor GPS fix is not accepted for a physical checkpoint.
  if p_accuracy_meters is not null and p_accuracy_meters > 50 then
    raise exception using errcode='P0001', message='GPS_ACCURACY_TOO_LOW';
  end if;

  if p_idempotency_key is not null then
    select * into existing
    from public.checkpoint_challenge_claims
    where idempotency_key = p_idempotency_key
    limit 1;

    if found then
      select * into challenge
      from public.checkpoint_challenges
      where id = existing.challenge_id;

      select * into location_row
      from public.checkpoint_locations
      where id = challenge.location_id;

      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'stage_id', challenge.stage_id,
        'challenge_id', challenge.id,
        'checkpoint_id', challenge.location_id,
        'checkpoint_name', location_row.name,
        'points_awarded', existing.points_awarded,
        'visibility', challenge.visibility
      );
    end if;
  end if;

  select * into qr
  from public.master_qr_codes
  where qr_token = trim(p_qr_token)
    and active = true
  for update;

  if not found then
    raise exception using errcode='P0001', message='MASTER_QR_INVALID';
  end if;

  select * into location_row
  from public.checkpoint_locations
  where id = qr.location_id
    and active = true
  for update;

  if not found then
    raise exception using errcode='P0001', message='CHECKPOINT_LOCATION_INACTIVE';
  end if;

  -- Stage is server-selected, never supplied by the browser.
  select * into stage_row
  from public.game_stages
  where active = true
  order by stage_number asc
  limit 1
  for update;

  if not found then
    raise exception using errcode='P0001', message='NO_ACTIVE_STAGE';
  end if;

  select * into challenge
  from public.checkpoint_challenges
  where stage_id = stage_row.id
    and location_id = location_row.id
    and active = true
  limit 1
  for update;

  if not found then
    raise exception using errcode='P0001', message='CHECKPOINT_NOT_CONFIGURED';
  end if;

  distance_m :=
    2.0 * 6371000.0 * asin(
      sqrt(
        sin(radians(location_row.lat - p_lat) / 2.0)^2 +
        cos(radians(p_lat)) * cos(radians(location_row.lat)) *
        sin(radians(location_row.lng - p_lng) / 2.0)^2
      )
    );

  if distance_m > location_row.radius_meters then
    raise exception using errcode='P0001',
      message='CHECKPOINT_NOT_AT_PHYSICAL_LOCATION';
  end if;

  begin
    insert into public.checkpoint_challenge_claims(
      player_id, challenge_id, points_awarded, idempotency_key
    )
    values(
      p_player_id, challenge.id, challenge.points, p_idempotency_key
    )
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
    'stage_id', stage_row.id,
    'stage_number', stage_row.stage_number,
    'challenge_id', challenge.id,
    'checkpoint_id', location_row.id,
    'checkpoint_name', location_row.name,
    'challenge_code', challenge.challenge_code,
    'points_awarded', new_claim.points_awarded,
    'visibility', challenge.visibility,
    'distance_meters', round(distance_m),
    'gps_accuracy_meters', p_accuracy_meters
  );
end;
$$;

revoke all on function public.resolve_and_claim_master_checkpoint(uuid,text,double precision,double precision,double precision,text)
  from public, anon, authenticated;

grant execute on function public.resolve_and_claim_master_checkpoint(uuid,text,double precision,double precision,double precision,text)
  to service_role;

commit;

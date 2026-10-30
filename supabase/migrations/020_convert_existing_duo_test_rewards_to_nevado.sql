-- BARAMEEL DUO — convert the already-issued successful test match to NEVADO
-- Targeted only to the successful attempt confirmed in the supplied SQL export.
-- Does not create a new attempt, change discovery probability, or touch other rewards.

begin;

do $$
declare
  v_attempt_id uuid := '05f65c9e-8fbd-4a30-805d-caebf0397c0f';
  v_attempt public.duo_link_attempts%rowtype;
  v_count integer;
begin
  select * into v_attempt
  from public.duo_link_attempts
  where id = v_attempt_id
    and discovered = true
  for update;

  if not found then
    raise exception 'Expected successful Duo attempt % was not found; no rewards changed', v_attempt_id;
  end if;

  select count(*) into v_count
  from public.player_pending_rewards
  where source_type = 'DUO'
    and source_id = v_attempt_id
    and status = 'PENDING';

  if v_count <> 2 then
    raise exception 'Expected exactly 2 pending rewards for Duo attempt %, found %; no rewards changed',
      v_attempt_id, v_count;
  end if;

  update public.player_pending_rewards
  set reward_type = 'PRODUCT',
      reward_label = 'NEVADO CHOCOLATE NUT SOFT SERVE — 1 FREE ICE CREAM',
      amount = 0,
      product_code = 'NEVADO_ICE_CREAM',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'reward_pool_id', 'NEVADO_ICE_CREAM',
        'fixed_duo_reward', true,
        'shared_match', true,
        'units_per_user', 1,
        'validity_days', 7,
        'converted_from_legacy_duo_reward', true
      )
  where source_type = 'DUO'
    and source_id = v_attempt_id
    and status = 'PENDING';

end $$;

commit;

-- Verification: must return exactly two PRODUCT / NEVADO_ICE_CREAM rows.
select
  id as reward_id,
  player_id,
  source_id as duo_attempt_id,
  reward_type,
  reward_label,
  product_code,
  status,
  created_at
from public.player_pending_rewards
where source_type = 'DUO'
  and source_id = '05f65c9e-8fbd-4a30-805d-caebf0397c0f'
order by player_id;

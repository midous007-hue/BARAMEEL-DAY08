-- BARAMEEL DUO REWARDS — Fixed NEVADO product
-- New successful Duo matches award one NEVADO cone to each user.
-- Existing pending rewards and historical attempts are intentionally preserved.

begin;

update public.duo_reward_pool
set active = false,
    weight = 0,
    updated_at = now()
where id <> 'NEVADO_ICE_CREAM';

insert into public.duo_reward_pool (
  id, reward_type, reward_label, amount, product_code, weight, active, metadata
) values (
  'NEVADO_ICE_CREAM',
  'PRODUCT',
  'NEVADO CHOCOLATE NUT SOFT SERVE — 1 FREE ICE CREAM',
  0,
  'NEVADO_ICE_CREAM',
  1,
  true,
  jsonb_build_object(
    'fixed_duo_reward', true,
    'units_per_user', 1,
    'validity_days', 7,
    'shared_match', true
  )
)
on conflict (id) do update
set reward_type = excluded.reward_type,
    reward_label = excluded.reward_label,
    amount = excluded.amount,
    product_code = excluded.product_code,
    weight = excluded.weight,
    active = true,
    metadata = public.duo_reward_pool.metadata || excluded.metadata,
    updated_at = now();

commit;

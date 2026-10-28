-- BARAMEEL DUO CONNECT — Phase 1
-- One random discovery attempt per registered player pair; each successful pair
-- creates one independently drawn, pending reward per player. The fixed in-store
-- Master QR settles a pending reward only after server-side token validation.
-- The probability and reward weights below are operational starting values and
-- can be tuned in Supabase before public launch.

begin;

create table if not exists public.duo_connect_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  discovery_probability numeric(6,5) not null default 0.10000
    check (discovery_probability >= 0 and discovery_probability <= 1),
  updated_at timestamptz not null default now()
);

insert into public.duo_connect_settings(id, enabled, discovery_probability)
values (1, true, 0.10000)
on conflict (id) do nothing;

create table if not exists public.duo_reward_pool (
  id text primary key,
  reward_type text not null check (reward_type in ('MARKS','POINTS','PRODUCT')),
  reward_label text not null,
  amount bigint not null default 0 check (amount >= 0),
  product_code text,
  weight numeric(12,4) not null default 0 check (weight >= 0),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reward_type = 'PRODUCT' and product_code is not null) or reward_type <> 'PRODUCT')
);

-- Starting distribution after a duo is discovered:
-- 85% Marks (20–100), 14% points and 1% a free menu item. Tune weights/amounts
-- before launch; a reward is drawn independently for each player in the pair.
insert into public.duo_reward_pool(id,reward_type,reward_label,amount,product_code,weight,active,metadata) values
('MARKS_20','MARKS','20 BARAMEEL MARKS',20,null,45,true,'{"initial":true}'::jsonb),
('MARKS_30','MARKS','30 BARAMEEL MARKS',30,null,20,true,'{"initial":true}'::jsonb),
('MARKS_50','MARKS','50 BARAMEEL MARKS',50,null,12,true,'{"initial":true}'::jsonb),
('MARKS_75','MARKS','75 BARAMEEL MARKS',75,null,5,true,'{"initial":true}'::jsonb),
('MARKS_100','MARKS','100 BARAMEEL MARKS',100,null,3,true,'{"initial":true}'::jsonb),
('POINTS_5000','POINTS','5,000 BARAMEEL POINTS',5000,null,14,true,'{"initial":true}'::jsonb),
('FREE_MENU_ITEM','PRODUCT','FREE MENU ITEM — SELECTED AT BARAMEEL',0,'FREE_ITEM',1,true,'{"initial":true,"staff_selects_eligible_item":true}'::jsonb)
on conflict (id) do nothing;

create table if not exists public.duo_link_attempts (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references public.players(id) on delete cascade,
  player_b_id uuid not null references public.players(id) on delete cascade,
  scanned_by_player_id uuid not null references public.players(id) on delete cascade,
  discovered boolean not null,
  discovery_probability numeric(6,5) not null check (discovery_probability >= 0 and discovery_probability <= 1),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  check (player_a_id < player_b_id),
  unique (player_a_id, player_b_id)
);

create index if not exists idx_duo_attempts_player_a on public.duo_link_attempts(player_a_id, created_at desc);
create index if not exists idx_duo_attempts_player_b on public.duo_link_attempts(player_b_id, created_at desc);

create table if not exists public.player_pending_rewards (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  reward_type text not null check (reward_type in ('MARKS','POINTS','PRODUCT')),
  reward_label text not null,
  amount bigint not null default 0 check (amount >= 0),
  product_code text,
  status text not null default 'PENDING' check (status in ('PENDING','REDEEMED','VOID')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (source_type, source_id, player_id),
  check ((reward_type = 'PRODUCT' and product_code is not null) or reward_type <> 'PRODUCT')
);

create index if not exists idx_pending_rewards_player_status
  on public.player_pending_rewards(player_id, status, created_at desc);

create table if not exists public.master_redemption_claims (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  pending_reward_id uuid not null unique references public.player_pending_rewards(id),
  idempotency_key text not null unique,
  reward_type text not null check (reward_type in ('MARKS','POINTS','PRODUCT')),
  reward_label text not null,
  amount bigint not null default 0,
  product_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_master_redemption_player
  on public.master_redemption_claims(player_id, created_at desc);

alter table public.duo_connect_settings enable row level security;
alter table public.duo_reward_pool enable row level security;
alter table public.duo_link_attempts enable row level security;
alter table public.player_pending_rewards enable row level security;
alter table public.master_redemption_claims enable row level security;

revoke all on public.duo_connect_settings, public.duo_reward_pool, public.duo_link_attempts,
  public.player_pending_rewards, public.master_redemption_claims from public, anon, authenticated;
grant all on public.duo_connect_settings, public.duo_reward_pool, public.duo_link_attempts,
  public.player_pending_rewards, public.master_redemption_claims to service_role;

create or replace function public.resolve_duo_link(
  p_scanner_player_id uuid,
  p_other_player_code text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scanner public.players%rowtype;
  v_other public.players%rowtype;
  v_attempt public.duo_link_attempts%rowtype;
  v_settings public.duo_connect_settings%rowtype;
  v_reward public.player_pending_rewards%rowtype;
  v_pool_item public.duo_reward_pool%rowtype;
  v_low uuid;
  v_high uuid;
  v_code text;
  v_success boolean;
  v_total_weight numeric;
  v_target numeric;
  v_cumulative numeric;
  v_recipient uuid;
begin
  if coalesce(trim(p_idempotency_key),'') = '' then
    raise exception using errcode='P0001', message='DUO_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into v_attempt
  from public.duo_link_attempts
  where idempotency_key = p_idempotency_key;
  if found then
    if v_attempt.scanned_by_player_id <> p_scanner_player_id then
      raise exception using errcode='P0001', message='IDEMPOTENCY_KEY_REUSED';
    end if;
    select * into v_reward
    from public.player_pending_rewards
    where source_type='DUO' and source_id=v_attempt.id and player_id=p_scanner_player_id;
    return jsonb_build_object(
      'ok',true,'discovered',v_attempt.discovered,'already_attempted',true,
      'attempt_id',v_attempt.id,'reward',case when v_reward.id is null then null else
        jsonb_build_object('id',v_reward.id,'reward_type',v_reward.reward_type,'reward_label',v_reward.reward_label,
          'amount',v_reward.amount,'product_code',v_reward.product_code,'status',v_reward.status) end
    );
  end if;

  select * into v_scanner
  from public.players
  where id=p_scanner_player_id
  for update;
  if not found or v_scanner.auth_user_id is null or
     v_scanner.player_code !~* '^BM-[A-Z0-9]{8}$' or length(trim(coalesce(v_scanner.nickname,''))) < 3 then
    raise exception using errcode='P0001', message='DUO_PLAYER_NOT_REGISTERED';
  end if;

  v_code := upper(trim(coalesce(p_other_player_code,'')));
  if v_code !~ '^BM-[A-Z0-9]{8}$' then
    raise exception using errcode='P0001', message='DUO_PLAYER_CODE_INVALID';
  end if;

  select * into v_other
  from public.players
  where upper(player_code)=v_code and auth_user_id is not null
  limit 1;
  if not found or v_other.player_code !~* '^BM-[A-Z0-9]{8}$' or
     length(trim(coalesce(v_other.nickname,''))) < 3 then
    raise exception using errcode='P0001', message='DUO_PLAYER_NOT_FOUND';
  end if;

  if v_scanner.id=v_other.id or v_scanner.auth_user_id=v_other.auth_user_id then
    raise exception using errcode='P0001', message='DUO_CANNOT_CONNECT_TO_SELF';
  end if;

  v_low := least(v_scanner.id,v_other.id);
  v_high := greatest(v_scanner.id,v_other.id);

  -- Serialize attempts for the normalized pair so simultaneous scans cannot
  -- produce two draws or bypass the unique-pair rule.
  perform pg_advisory_xact_lock(hashtextextended(v_low::text || ':' || v_high::text, 0));

  select * into v_attempt
  from public.duo_link_attempts
  where player_a_id=v_low and player_b_id=v_high;
  if found then
    select * into v_reward
    from public.player_pending_rewards
    where source_type='DUO' and source_id=v_attempt.id and player_id=p_scanner_player_id;
    return jsonb_build_object(
      'ok',true,'discovered',v_attempt.discovered,'already_attempted',true,
      'attempt_id',v_attempt.id,'reward',case when v_reward.id is null then null else
        jsonb_build_object('id',v_reward.id,'reward_type',v_reward.reward_type,'reward_label',v_reward.reward_label,
          'amount',v_reward.amount,'product_code',v_reward.product_code,'status',v_reward.status) end
    );
  end if;

  select * into v_settings from public.duo_connect_settings where id=1;
  if not found or not v_settings.enabled then
    raise exception using errcode='P0001', message='DUO_CONNECT_PAUSED';
  end if;

  v_success := random() < v_settings.discovery_probability;
  insert into public.duo_link_attempts(
    player_a_id,player_b_id,scanned_by_player_id,discovered,discovery_probability,idempotency_key
  ) values (
    v_low,v_high,p_scanner_player_id,v_success,v_settings.discovery_probability,p_idempotency_key
  ) returning * into v_attempt;

  if not v_success then
    return jsonb_build_object(
      'ok',true,'discovered',false,'already_attempted',false,'attempt_id',v_attempt.id
    );
  end if;

  select coalesce(sum(weight),0) into v_total_weight
  from public.duo_reward_pool where active and weight>0;
  if v_total_weight <= 0 then
    raise exception using errcode='P0001', message='DUO_REWARD_POOL_NOT_CONFIGURED';
  end if;

  foreach v_recipient in array array[v_low,v_high] loop
    v_target := random() * v_total_weight;
    v_cumulative := 0;
    v_pool_item := null;

    for v_pool_item in
      select * from public.duo_reward_pool where active and weight>0 order by id
    loop
      v_cumulative := v_cumulative + v_pool_item.weight;
      if v_cumulative >= v_target then
        exit;
      end if;
    end loop;

    if v_pool_item.id is null or v_cumulative < v_target then
      raise exception using errcode='P0001', message='DUO_REWARD_DRAW_FAILED';
    end if;

    insert into public.player_pending_rewards(
      player_id,source_type,source_id,reward_type,reward_label,amount,product_code,status,idempotency_key,metadata
    ) values (
      v_recipient,'DUO',v_attempt.id,v_pool_item.reward_type,v_pool_item.reward_label,
      v_pool_item.amount,v_pool_item.product_code,'PENDING',
      'duo:' || v_attempt.id::text || ':' || v_recipient::text,
      jsonb_build_object('pair_attempt_id',v_attempt.id,'reward_pool_id',v_pool_item.id)
    )
    on conflict (source_type,source_id,player_id) do nothing;
  end loop;

  select * into v_reward
  from public.player_pending_rewards
  where source_type='DUO' and source_id=v_attempt.id and player_id=p_scanner_player_id;

  return jsonb_build_object(
    'ok',true,'discovered',true,'already_attempted',false,'attempt_id',v_attempt.id,
    'partner_code',v_other.player_code,'reward_for_both',true,
    'reward',jsonb_build_object('id',v_reward.id,'reward_type',v_reward.reward_type,'reward_label',v_reward.reward_label,
      'amount',v_reward.amount,'product_code',v_reward.product_code,'status',v_reward.status)
  );
end;
$$;

revoke all on function public.resolve_duo_link(uuid,text,text) from public, anon, authenticated;
grant execute on function public.resolve_duo_link(uuid,text,text) to service_role;

create or replace function public.redeem_player_pending_reward(
  p_player_id uuid,
  p_reward_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward public.player_pending_rewards%rowtype;
  v_claim public.master_redemption_claims%rowtype;
begin
  if coalesce(trim(p_idempotency_key),'') = '' then
    raise exception using errcode='P0001', message='REDEMPTION_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into v_claim from public.master_redemption_claims where idempotency_key=p_idempotency_key;
  if found then
    if v_claim.player_id <> p_player_id or v_claim.pending_reward_id <> p_reward_id then
      raise exception using errcode='P0001', message='IDEMPOTENCY_KEY_REUSED';
    end if;
    return jsonb_build_object('ok',true,'idempotent',true,'claim_id',v_claim.id,
      'reward_id',v_claim.pending_reward_id,'reward_type',v_claim.reward_type,
      'reward_label',v_claim.reward_label,'amount',v_claim.amount,'product_code',v_claim.product_code);
  end if;

  select * into v_reward
  from public.player_pending_rewards
  where id=p_reward_id and player_id=p_player_id
  for update;
  if not found then
    raise exception using errcode='P0001', message='PENDING_REWARD_NOT_FOUND';
  end if;
  if v_reward.status <> 'PENDING' then
    raise exception using errcode='P0001', message='PENDING_REWARD_ALREADY_REDEEMED';
  end if;

  insert into public.master_redemption_claims(
    player_id,pending_reward_id,idempotency_key,reward_type,reward_label,amount,product_code
  ) values (
    p_player_id,v_reward.id,p_idempotency_key,v_reward.reward_type,v_reward.reward_label,v_reward.amount,v_reward.product_code
  ) returning * into v_claim;

  if v_reward.reward_type='MARKS' then
    update public.players set marks=coalesce(marks,0)+v_reward.amount where id=p_player_id;
  elsif v_reward.reward_type='POINTS' then
    update public.players
    set points=coalesce(points,0)+v_reward.amount,
        weekly_points=coalesce(weekly_points,0)+v_reward.amount
    where id=p_player_id;
  elsif v_reward.reward_type <> 'PRODUCT' then
    raise exception using errcode='P0001', message='PENDING_REWARD_TYPE_INVALID';
  end if;

  update public.player_pending_rewards
  set status='REDEEMED',redeemed_at=now()
  where id=v_reward.id and status='PENDING';

  return jsonb_build_object('ok',true,'claim_id',v_claim.id,'reward_id',v_reward.id,
    'reward_type',v_reward.reward_type,'reward_label',v_reward.reward_label,
    'amount',v_reward.amount,'product_code',v_reward.product_code,'status','REDEEMED');
end;
$$;

revoke all on function public.redeem_player_pending_reward(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.redeem_player_pending_reward(uuid,uuid,text) to service_role;

commit;

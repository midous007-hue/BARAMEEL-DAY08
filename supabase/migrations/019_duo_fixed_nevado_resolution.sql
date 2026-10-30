-- BARAMEEL DUO CONNECT — fixed NEVADO reward for both matched players
-- Preserves discovery probability, pair locking, idempotency and prior reward rows.
-- Only newly successful matches use this fixed reward.

begin;

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
     v_scanner.player_code !~* '^BM-[A-Z0-9]{7,8}$' or length(trim(coalesce(v_scanner.nickname,''))) < 3 then
    raise exception using errcode='P0001', message='DUO_PLAYER_NOT_REGISTERED';
  end if;

  v_code := upper(trim(coalesce(p_other_player_code,'')));
  if v_code !~ '^BM-[A-Z0-9]{7,8}$' then
    raise exception using errcode='P0001', message='DUO_PLAYER_CODE_INVALID';
  end if;

  select * into v_other
  from public.players
  where upper(player_code)=v_code and auth_user_id is not null
  limit 1;
  if not found or v_other.player_code !~* '^BM-[A-Z0-9]{7,8}$' or
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

  -- A successful Duo always grants the same NEVADO product to both players.
  -- Read the active reward once so both pending records are identical.
  select * into v_pool_item
  from public.duo_reward_pool
  where id = 'NEVADO_ICE_CREAM'
    and active = true
    and weight > 0
    and reward_type = 'PRODUCT'
    and product_code = 'NEVADO_ICE_CREAM'
  for share;

  if not found then
    raise exception using errcode='P0001', message='DUO_REWARD_POOL_NOT_CONFIGURED';
  end if;

  foreach v_recipient in array array[v_low,v_high] loop

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

commit;

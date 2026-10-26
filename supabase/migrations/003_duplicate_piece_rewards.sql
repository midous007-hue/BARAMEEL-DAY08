-- BARAMEEL: restore duplicate-piece outcomes without changing ticket/auth flow.
-- Apply once in Supabase SQL Editor after reviewing the current production schema.
-- While missing pieces remain, draw from the weighted active pool. If the selected
-- piece is already owned, grant +1,000 points and show the existing duplicate UI.
-- When the full collection is complete, retain the existing +5,000 completion bonus.
begin;

create or replace function public.consume_universal_scan(
  p_player_id uuid,
  p_ticket_id uuid,
  p_idempotency_key text,
  p_qr_value text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.scan_tickets%rowtype;
  existing public.scans%rowtype;
  chosen public.collection_pieces%rowtype;
  chosen_image public.collection_images%rowtype;
  total_missing integer;
  target numeric;
  cumulative numeric := 0;
  rec record;
  points_awarded bigint := 10000;
  is_duplicate boolean := false;
  result jsonb;
begin
  if p_qr_value <> 'BARAMEEL-UNIVERSAL' then
    raise exception using errcode='P0001', message='INVALID_UNIVERSAL_QR';
  end if;

  if p_idempotency_key is not null then
    select * into existing from public.scans where idempotency_key = p_idempotency_key limit 1;
    if found then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'scan_id', existing.id,
        'duplicate', existing.duplicate,
        'points', existing.points_awarded,
        'collection_id', existing.collection_id,
        'image_id', existing.image_id,
        'rarity', (select rarity from public.collection_pieces where id=existing.piece_id),
        'piece_number', (select piece_number from public.collection_pieces where id=existing.piece_id)
      );
    end if;
  end if;

  select * into t
  from public.scan_tickets
  where id=p_ticket_id and player_id=p_player_id
  for update;

  if not found then raise exception using errcode='P0001', message='SCAN_TICKET_REQUIRED'; end if;
  if t.consumed_at is not null then raise exception using errcode='P0001', message='SCAN_TICKET_ALREADY_USED'; end if;
  if t.expires_at is not null and t.expires_at < now() then raise exception using errcode='P0001', message='SCAN_TICKET_EXPIRED'; end if;

  update public.scan_tickets
  set consumed_at=now(), idempotency_key=coalesce(idempotency_key,p_idempotency_key)
  where id=t.id;

  select count(*) into total_missing
  from public.collection_pieces cp
  where cp.active
    and not exists(select 1 from public.player_pieces pp where pp.player_id=p_player_id and pp.piece_id=cp.id);

  if total_missing > 0 then
    -- Draw from the full active pool while missing pieces remain.
    -- Already-owned outcomes become duplicate rewards instead of being impossible.
    select sum(cp.weight) into target
    from public.collection_pieces cp
    where cp.active;

    target := random() * target;
    for rec in
      select cp.*
      from public.collection_pieces cp
      where cp.active
      order by cp.id
    loop
      cumulative := cumulative + rec.weight;
      if cumulative >= target then
        chosen := rec;
        exit;
      end if;
    end loop;
  end if;

  if chosen.id is not null then
    select * into chosen_image from public.collection_images where id=chosen.image_id;
    select exists(
      select 1 from public.player_pieces pp
      where pp.player_id=p_player_id and pp.piece_id=chosen.id
    ) into is_duplicate;
    -- Duplicate pieces award the documented 1,000 bonus points.
    -- A completed collection keeps the existing 5,000-point completion reward below.
    points_awarded := case when is_duplicate then 1000 else coalesce(chosen.points,10000) end;

    insert into public.player_pieces(player_id,piece_id)
    values(p_player_id,chosen.id)
    on conflict(player_id,piece_id)
    do update set obtain_count=public.player_pieces.obtain_count+1;

    result := jsonb_build_object(
      'ok',true,
      'type','piece',
      'collection_id',chosen_image.collection_id,
      'image_id',chosen.image_id,
      'piece_number',chosen.piece_number,
      'rarity',coalesce(chosen.rarity,'COMMON'),
      'points',points_awarded,
      'duplicate',is_duplicate
    );

    insert into public.scans(
      player_id,ticket_id,qr_value,result_type,collection_id,image_id,piece_id,
      points_awarded,duplicate,idempotency_key,metadata
    ) values(
      p_player_id,t.id,p_qr_value,case when is_duplicate then 'duplicate' else 'piece' end,chosen_image.collection_id,chosen.image_id,chosen.id,
      points_awarded,is_duplicate,p_idempotency_key,
      jsonb_build_object('rarity',coalesce(chosen.rarity,'COMMON'),'points',points_awarded)
    );

    update public.players
    set points=points+points_awarded,
        weekly_points=weekly_points+points_awarded,
        scans_count=scans_count+1
    where id=p_player_id;

    return result;
  end if;

  insert into public.scans(
    player_id,ticket_id,qr_value,result_type,points_awarded,duplicate,idempotency_key,metadata
  ) values(
    p_player_id,t.id,p_qr_value,'bonus',5000,false,p_idempotency_key,
    jsonb_build_object('reason','all_pieces_collected')
  );

  update public.players
  set points=points+5000,
      weekly_points=weekly_points+5000,
      scans_count=scans_count+1
  where id=p_player_id;

  return jsonb_build_object('ok',true,'type','bonus','points',5000,'duplicate',false,'rarity','COMPLETION');
end;
$$;

revoke all on function public.consume_universal_scan(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.consume_universal_scan(uuid,uuid,text,text) to service_role;

commit;

-- BARAMEEL V20.8 — rarity-aware reward economy + weighted universal scan
-- Run once in Supabase SQL Editor AFTER the existing V20.6/V20.7 backend is live.
-- Keeps player_pieces/scans history intact; only adds piece metadata and replaces the scan RPC.

begin;

alter table public.collection_pieces
  add column if not exists rarity text,
  add column if not exists points bigint not null default 10000;

-- Exact ALEXANDRIA 01 rarity matrix. Print distribution stays unchanged;
-- reward values are normalized to 10k → 100k as requested.
with v(image_id, piece_number, rarity, points, weight) as (
values
  ('image01', 1, 'UNCOMMON', 20000, 0.75),
  ('image01', 2, 'UNCOMMON', 20000, 0.75),
  ('image01', 3, 'COMMON', 10000, 1.63),
  ('image01', 4, 'RARE', 40000, 0.58),
  ('image01', 5, 'EPIC', 60000, 0.38),
  ('image01', 6, 'RARE', 40000, 0.58),
  ('image01', 7, 'COMMON', 10000, 1.63),
  ('image01', 8, 'UNCOMMON', 20000, 0.74),
  ('image01', 9, 'COMMON', 10000, 1.63),
  ('image02', 1, 'COMMON', 10000, 1.63),
  ('image02', 2, 'UNCOMMON', 20000, 0.74),
  ('image02', 3, 'COMMON', 10000, 1.63),
  ('image02', 4, 'RARE', 40000, 0.57),
  ('image02', 5, 'EPIC', 60000, 0.38),
  ('image02', 6, 'UNCOMMON', 20000, 0.74),
  ('image02', 7, 'COMMON', 10000, 1.63),
  ('image02', 8, 'UNCOMMON', 20000, 0.74),
  ('image02', 9, 'COMMON', 10000, 1.63),
  ('image03', 1, 'COMMON', 10000, 1.63),
  ('image03', 2, 'UNCOMMON', 20000, 0.74),
  ('image03', 3, 'COMMON', 10000, 1.63),
  ('image03', 4, 'RARE', 40000, 0.57),
  ('image03', 5, 'MYTHIC', 100000, 0.20),
  ('image03', 6, 'RARE', 40000, 0.57),
  ('image03', 7, 'COMMON', 10000, 1.63),
  ('image03', 8, 'UNCOMMON', 20000, 0.74),
  ('image03', 9, 'COMMON', 10000, 1.63),
  ('image04', 1, 'COMMON', 10000, 1.63),
  ('image04', 2, 'UNCOMMON', 20000, 0.74),
  ('image04', 3, 'COMMON', 10000, 1.63),
  ('image04', 4, 'RARE', 40000, 0.57),
  ('image04', 5, 'UNCOMMON', 20000, 0.74),
  ('image04', 6, 'UNCOMMON', 20000, 0.74),
  ('image04', 7, 'COMMON', 10000, 1.63),
  ('image04', 8, 'COMMON', 10000, 1.63),
  ('image04', 9, 'COMMON', 10000, 1.63),
  ('image05', 1, 'COMMON', 10000, 1.63),
  ('image05', 2, 'UNCOMMON', 20000, 0.74),
  ('image05', 3, 'COMMON', 10000, 1.63),
  ('image05', 4, 'RARE', 40000, 0.57),
  ('image05', 5, 'UNCOMMON', 20000, 0.74),
  ('image05', 6, 'UNCOMMON', 20000, 0.74),
  ('image05', 7, 'COMMON', 10000, 1.63),
  ('image05', 8, 'COMMON', 10000, 1.63),
  ('image05', 9, 'COMMON', 10000, 1.63),
  ('image06', 1, 'COMMON', 10000, 1.63),
  ('image06', 2, 'UNCOMMON', 20000, 0.74),
  ('image06', 3, 'COMMON', 10000, 1.63),
  ('image06', 4, 'RARE', 40000, 0.57),
  ('image06', 5, 'UNCOMMON', 20000, 0.74),
  ('image06', 6, 'UNCOMMON', 20000, 0.74),
  ('image06', 7, 'COMMON', 10000, 1.63),
  ('image06', 8, 'COMMON', 10000, 1.63),
  ('image06', 9, 'COMMON', 10000, 1.63),
  ('image07', 1, 'COMMON', 10000, 1.63),
  ('image07', 2, 'UNCOMMON', 20000, 0.74),
  ('image07', 3, 'COMMON', 10000, 1.63),
  ('image07', 4, 'RARE', 40000, 0.57),
  ('image07', 5, 'EPIC', 60000, 0.37),
  ('image07', 6, 'UNCOMMON', 20000, 0.74),
  ('image07', 7, 'COMMON', 10000, 1.63),
  ('image07', 8, 'UNCOMMON', 20000, 0.74),
  ('image07', 9, 'COMMON', 10000, 1.63),
  ('image08', 1, 'COMMON', 10000, 1.63),
  ('image08', 2, 'UNCOMMON', 20000, 0.74),
  ('image08', 3, 'COMMON', 10000, 1.63),
  ('image08', 4, 'RARE', 40000, 0.57),
  ('image08', 5, 'UNCOMMON', 20000, 0.74),
  ('image08', 6, 'UNCOMMON', 20000, 0.74),
  ('image08', 7, 'COMMON', 10000, 1.63),
  ('image08', 8, 'COMMON', 10000, 1.63),
  ('image08', 9, 'COMMON', 10000, 1.62),
  ('image09', 1, 'COMMON', 10000, 1.62),
  ('image09', 2, 'UNCOMMON', 20000, 0.74),
  ('image09', 3, 'COMMON', 10000, 1.62),
  ('image09', 4, 'RARE', 40000, 0.57),
  ('image09', 5, 'LEGENDARY', 80000, 0.30),
  ('image09', 6, 'RARE', 40000, 0.57),
  ('image09', 7, 'COMMON', 10000, 1.62),
  ('image09', 8, 'UNCOMMON', 20000, 0.74),
  ('image09', 9, 'COMMON', 10000, 1.62),
  ('image10', 1, 'COMMON', 10000, 1.62),
  ('image10', 2, 'UNCOMMON', 20000, 0.74),
  ('image10', 3, 'COMMON', 10000, 1.62),
  ('image10', 4, 'RARE', 40000, 0.57),
  ('image10', 5, 'EPIC', 60000, 0.37),
  ('image10', 6, 'RARE', 40000, 0.57),
  ('image10', 7, 'COMMON', 10000, 1.62),
  ('image10', 8, 'UNCOMMON', 20000, 0.74),
  ('image10', 9, 'COMMON', 10000, 1.62)
)
update public.collection_pieces cp
set rarity=v.rarity,
    points=v.points,
    weight=v.weight,
    active=true
from v
where cp.image_id=v.image_id and cp.piece_number=v.piece_number;

-- The current browser resolves PNG master paths to WebP, but keep DB metadata aligned too.
update public.collection_images
set master_file=replace(master_file,'.png','.webp')
where master_file like '%.png';

create index if not exists idx_collection_pieces_rarity on public.collection_pieces(rarity);

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
    select sum(cp.weight) into target
    from public.collection_pieces cp
    where cp.active
      and not exists(select 1 from public.player_pieces pp where pp.player_id=p_player_id and pp.piece_id=cp.id);

    target := random() * target;
    for rec in
      select cp.*
      from public.collection_pieces cp
      where cp.active
        and not exists(select 1 from public.player_pieces pp where pp.player_id=p_player_id and pp.piece_id=cp.id)
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
    points_awarded := coalesce(chosen.points,10000);

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
      'duplicate',false
    );

    insert into public.scans(
      player_id,ticket_id,qr_value,result_type,collection_id,image_id,piece_id,
      points_awarded,duplicate,idempotency_key,metadata
    ) values(
      p_player_id,t.id,p_qr_value,'piece',chosen_image.collection_id,chosen.image_id,chosen.id,
      points_awarded,false,p_idempotency_key,
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

-- BARAMEEL V22 — Marks wallet
begin;
alter table public.players add column if not exists marks bigint not null default 0;
create index if not exists idx_players_marks on public.players(marks);
create or replace function public.convert_points_to_marks(p_player_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.players%rowtype;convertible bigint;earned bigint;begin select * into p from public.players where id=p_player_id for update;if not found then raise exception using errcode='P0001',message='PLAYER_NOT_FOUND';end if;convertible:=floor(coalesce(p.points,0)/1000)*1000;earned:=convertible/1000;if earned>0 then update public.players set points=points-convertible,marks=marks+earned where id=p_player_id;end if;return jsonb_build_object('ok',true,'points_remaining',coalesce(p.points,0)-convertible,'marks_added',earned,'marks_total',coalesce(p.marks,0)+earned);end;$$;
revoke all on function public.convert_points_to_marks(uuid) from public,anon,authenticated;grant execute on function public.convert_points_to_marks(uuid) to service_role;
commit;
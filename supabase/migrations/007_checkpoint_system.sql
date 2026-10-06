-- BARAMEEL RUN — Stage / Location / Challenge / Master QR architecture
-- Migration 007
begin;

create table if not exists public.game_stages (
  id text primary key,
  name text not null,
  stage_number integer not null unique check (stage_number > 0),
  active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.checkpoint_locations (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 120 check (radius_meters between 20 and 1000),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.checkpoint_challenges (
  id text primary key,
  stage_id text not null references public.game_stages(id) on delete cascade,
  location_id text not null references public.checkpoint_locations(id) on delete cascade,
  challenge_code text not null,
  points bigint not null default 10000 check (points >= 0),
  visibility text not null default 'visible'
    check (visibility in ('visible','hinted','hidden','secret')),
  discovery_order integer not null default 1 check (discovery_order > 0),
  hint text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(stage_id, location_id),
  unique(stage_id, challenge_code)
);

create table if not exists public.master_qr_codes (
  id text primary key,
  qr_token text not null unique,
  location_id text not null references public.checkpoint_locations(id) on delete cascade,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.checkpoint_challenge_claims (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  challenge_id text not null references public.checkpoint_challenges(id) on delete cascade,
  points_awarded bigint not null default 0,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  unique(player_id, challenge_id)
);

create index if not exists idx_checkpoint_challenges_stage
  on public.checkpoint_challenges(stage_id, active);

create index if not exists idx_checkpoint_challenges_location
  on public.checkpoint_challenges(location_id, active);

create index if not exists idx_master_qr_location
  on public.master_qr_codes(location_id, active);

create index if not exists idx_checkpoint_challenge_claims_player
  on public.checkpoint_challenge_claims(player_id, created_at desc);

-- Stage 01
insert into public.game_stages (id,name,stage_number,active)
values ('STAGE01','STAGE 01',1,true)
on conflict (id) do update
set name=excluded.name,
    stage_number=excluded.stage_number,
    active=excluded.active;

-- Physical checkpoint locations
insert into public.checkpoint_locations
  (id,name,lat,lng,radius_meters,active)
values
  ('CP01','CP01',31.191153,29.918580,120,true),
  ('CP02','CP02',31.189221,29.920068,120,true),
  ('CP03','CP03',31.190137,29.921695,120,true),
  ('CP04','CP04',31.192098,29.922995,120,true),
  ('CP05','CP05',31.191448,29.915061,120,true),
  ('CP06','CP06',31.190885,29.919299,120,true),
  ('CP07','CP07',31.190167,29.923662,120,true),
  ('CP08','CP08',31.188251,29.921631,120,true),
  ('CP09','CP09',31.193291,29.917204,120,true),
  ('CP10','CP10',31.188515,29.920420,120,true),
  ('CP11','CP11',31.188033,29.919152,120,true),
  ('CP12','CP12',31.191579,29.913372,120,true),
  ('CP13','CP13',31.192904,29.923414,120,true)
on conflict (id) do update
set name=excluded.name,
    lat=excluded.lat,
    lng=excluded.lng,
    radius_meters=excluded.radius_meters,
    active=excluded.active;

-- Stage 01 challenge layer.
-- Visibility is deliberately progressive and can later be changed without moving
-- the physical checkpoint.
insert into public.checkpoint_challenges
  (id,stage_id,location_id,challenge_code,points,visibility,discovery_order,hint,active)
values
  ('STAGE01_CP01','STAGE01','CP01','STAGE01-CP01',10000,'visible',1,null,true),
  ('STAGE01_CP02','STAGE01','CP02','STAGE01-CP02',10000,'hinted',2,'A clue leads the player toward the next discovery.',true),
  ('STAGE01_CP03','STAGE01','CP03','STAGE01-CP03',10000,'hinted',3,'Follow the clue and explore the area.',true),
  ('STAGE01_CP04','STAGE01','CP04','STAGE01-CP04',10000,'hidden',4,'The location is not shown directly.',true),
  ('STAGE01_CP05','STAGE01','CP05','STAGE01-CP05',15000,'hidden',5,'Look beyond the obvious route.',true),
  ('STAGE01_CP06','STAGE01','CP06','STAGE01-CP06',10000,'visible',6,null,true),
  ('STAGE01_CP07','STAGE01','CP07','STAGE01-CP07',20000,'secret',7,'A secret discovery is waiting nearby.',true),
  ('STAGE01_CP08','STAGE01','CP08','STAGE01-CP08',10000,'hinted',8,'Use the environment as your guide.',true),
  ('STAGE01_CP09','STAGE01','CP09','STAGE01-CP09',15000,'hidden',9,'This one rewards careful exploration.',true),
  ('STAGE01_CP10','STAGE01','CP10','STAGE01-CP10',10000,'visible',10,null,true),
  ('STAGE01_CP11','STAGE01','CP11','STAGE01-CP11',20000,'secret',11,'Not every discovery announces itself.',true),
  ('STAGE01_CP12','STAGE01','CP12','STAGE01-CP12',15000,'hidden',12,'Search where the route becomes less obvious.',true),
  ('STAGE01_CP13','STAGE01','CP13','STAGE01-CP13',25000,'secret',13,'The hardest discoveries are meant to be earned.',true)
on conflict (id) do update
set stage_id=excluded.stage_id,
    location_id=excluded.location_id,
    challenge_code=excluded.challenge_code,
    points=excluded.points,
    visibility=excluded.visibility,
    discovery_order=excluded.discovery_order,
    hint=excluded.hint,
    active=excluded.active;

-- One master physical QR identity per physical checkpoint.
-- The QR token itself does not expose CP/stage information.
insert into public.master_qr_codes (id,qr_token,location_id,active)
values
  ('QR_CP01','BRM-Q1-01','CP01',true),
  ('QR_CP02','BRM-Q1-02','CP02',true),
  ('QR_CP03','BRM-Q1-03','CP03',true),
  ('QR_CP04','BRM-Q1-04','CP04',true),
  ('QR_CP05','BRM-Q1-05','CP05',true),
  ('QR_CP06','BRM-Q1-06','CP06',true),
  ('QR_CP07','BRM-Q1-07','CP07',true),
  ('QR_CP08','BRM-Q1-08','CP08',true),
  ('QR_CP09','BRM-Q1-09','CP09',true),
  ('QR_CP10','BRM-Q1-10','CP10',true),
  ('QR_CP11','BRM-Q1-11','CP11',true),
  ('QR_CP12','BRM-Q1-12','CP12',true),
  ('QR_CP13','BRM-Q1-13','CP13',true)
on conflict (id) do update
set qr_token=excluded.qr_token,
    location_id=excluded.location_id,
    active=excluded.active;

-- Compatibility view for existing code/admin inspection.
create or replace view public.active_stage01_checkpoints as
select
  c.id as challenge_id,
  c.stage_id,
  c.location_id as checkpoint_id,
  l.name,
  l.lat,
  l.lng,
  l.radius_meters,
  c.points,
  c.visibility,
  c.discovery_order,
  c.hint,
  c.active
from public.checkpoint_challenges c
join public.checkpoint_locations l on l.id=c.location_id
where c.stage_id='STAGE01'
  and c.active=true
  and l.active=true;

commit;

-- Store the phone number entered at registration without treating it as verified.
-- Phone numbers are optional for existing players and are not unique because they are unverified.
alter table public.players
  add column if not exists phone_number text;

comment on column public.players.phone_number is
  'Phone number provided by the player at registration; not verified.';

-- Persist only a server-keyed HMAC of the six-digit player PIN.
-- The PIN itself is never stored or returned to clients.
alter table public.players
  add column if not exists pin_hash text;

comment on column public.players.pin_hash is
  'Server-keyed HMAC-SHA256 of the player PIN; never expose this field to clients.';

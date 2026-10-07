-- BARAMEEL RUN — Migration 010
-- Calibrate CP01 to the exact physical QR location supplied by the game operator.
begin;

update public.checkpoint_locations
set lat = 31.1909169,
    lng = 29.9193794,
    radius_meters = 10
where id = 'CP01';

commit;

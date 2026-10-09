-- BARAMEEL RUN — Migration 011
-- Reconcile CP01 with the operator-confirmed physical location.
-- Migration 010 used a 10m radius, which conflicts with the 20m minimum
-- constraint introduced by migration 007 and can cause that migration to fail.
-- Keep the schema's existing 20m minimum and use a 30m field-tunable radius
-- to tolerate ordinary GPS drift while retaining server-side distance checks.
begin;

update public.checkpoint_locations
set lat = 31.1909169,
    lng = 29.9193794,
    radius_meters = 30
where id = 'CP01';

commit;

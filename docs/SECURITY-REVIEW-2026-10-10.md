# BARAMEEL WORLD — Security & Reliability Review
Date: 2026-10-10
Working branch: `clean-development`
Reference snapshot: `clean-development-backup-20261010`

## Changes made in this review

- `supabase/migrations/012_checkpoint_security_hardening.sql`
  - Enables RLS and revokes direct `anon`/`authenticated` table access for stage definitions, physical checkpoint coordinates, challenge definitions, Master QR tokens, and challenge claim records.
  - Tightens the server-side checkpoint RPC to require a finite usable GPS accuracy value (0–50m), validate the player and coordinate ranges, and prevent idempotency-key reuse across players or checkpoints.
  - Keeps RPC execution restricted to `service_role`.
- `checkpoint-scanner.html`
  - Removes acceptance of legacy `BARAMEEL-CHECKPOINT-...` values. Production scanner accepts the Master QR token format only.
- `app.js`
  - Adds user-friendly handling for missing Master QR tokens and reused idempotency keys.
- `sw.js`
  - Bumps the cache namespace and refreshes the core app/route-map cache URLs to reduce stale-code risk.
- Route-map routing URL was reviewed against the public OSRM foot-service convention. The service path remains `/routed-foot/route/v1/driving/`; do not change the profile segment to `foot` for this hosted endpoint.

## Not verified / still required

1. **Do not consider this production-secure until Migration 012 is applied and tested in the connected Supabase project.** GitHub commits do not deploy SQL migrations or Edge Functions.
2. Verify actual RLS, grants, and function definitions in the live database, including the `convert_points_to_marks` RPC and reward-claim/redeem RPCs.
3. Existing Master QR tokens in Migration 007/008 are predictable sequential values (`BRM-Q1-01` … `BRM-Q1-13`). Do not rotate them without coordinating physical printed QR codes. Before public launch, replace with high-entropy opaque tokens and ensure old tokens are revoked.
4. The live-players endpoint returns exact recent coordinates to any authenticated player. It needs an explicit location-sharing/consent model, retention policy, and ideally rate limiting before public launch.
5. Confirm a weekly reset job exists and is enabled for `weekly_points`; repository code alone does not prove a scheduled job is configured.
6. Confirm checkpoint radii in the deployed database match intended field-tested values. Migration 011 calibrates CP01 to 30m; CP02–CP13 require field review. Client GPS readings are not tamper-proof, so GPS geofencing alone is not strong anti-cheat.
7. Test the full flow on real iOS and Android devices: authentication, camera QR scan, permission-denied states, weak GPS, wrong physical location, duplicate scan, points award, wallet conversion, final Barameel scan and reward claim.
8. Service-worker changes require a deployed build and device test. Confirm the new worker activates, old caches are removed, and no internal page displays the splash screen.
9. Confirm map style glyph/font assets load and that walking directions, re-routing, and location tracking work on-device.
10. Review API rate limits and abuse controls for checkpoint scans, live-player polling, receipt claims, and rewards redemption.

## Safety constraints preserved

- Work remains on `clean-development`; `main` was not changed.
- Players may collect revealed checkpoints in any physical order; do not enforce a forced route order.
- Barameel remains available independently of checkpoint completion.
- Artwork and established visual identity were not redesigned.

## Deployment status

Source changes committed to GitHub only. Supabase migration/function deployment and physical-device testing are not confirmed.

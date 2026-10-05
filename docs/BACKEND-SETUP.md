# BARAMEEL RUN — V23.2 BACKEND SETUP

The GitHub Pages frontend cannot securely own global player identity, one-time QR tickets, server-side reward draws, leaderboards, or checkpoint anti-farming rules.

## Required Edge Functions

- POST /player — create or sync the persistent player identity.
- POST /scan-ticket — issue a one-time server scan ticket for the Universal BARAMEEL QR.
- POST /scan — atomically consume the Universal BARAMEEL QR ticket and resolve its server-side reward.
- POST /checkpoint-scan — validate a checkpoint QR, validate player location against the server checkpoint radius, prevent duplicate claims, and award checkpoint points.
- POST /receipt-draw — validate and atomically consume a one-time receipt code and resolve its configured reward.
- POST /analytics — record gameplay events.
- POST /leaderboard — return the live leaderboard.

## Database migrations

Apply migrations in order, including:

- 002_rarity_points.sql
- 003_receipt_codes.sql
- 004_marks_wallet.sql
- 005_checkpoint_run.sql

The checkpoint migration intentionally creates no live coordinates. Populate checkpoint_definitions only with the approved production checkpoint dataset.

## Client rules

- The browser contains only the Supabase publishable key.
- Server-side secrets stay in Edge Function secrets.
- LocalStorage is a cache, not the source of truth.
- Player points, weekly points, collection pieces, receipt claims and checkpoint claims are server-side.
- A successful checkpoint reward must never be shown before the checkpoint RPC confirms it.
- The same checkpoint may not be farmed by the same player.
- Idempotency keys protect retry paths.

## Collection catalog

The UI reads assets/collections/index.json. Each listed collection must point to a collection.json containing exactly 10 master images. Each master image contains its configured 3×3 piece definition.

Do not add QR files per piece/image/collection. BARAMEEL-UNIVERSAL remains the single Universal gameplay QR.

# BARAMEEL V20.7.2 — COMPLETE CODE PACKAGE (NO ASSETS)

This package is intended to replace the code/config files in the existing
BARAMEEL-DAY08 GitHub repository WITHOUT replacing anything under `assets/`.

Included:
- Root HTML flow: index/world/run/screen02/screen03/screen04/screen05/screen06
- Placeholder hub pages: duo-link/menu/post/my-barameel
- app.js, config.js, styles.css
- barameel-v205-fix.js
- Supabase Edge Function source for scan, player, analytics,
  admin-grant-ticket, and scan-ticket

Assets are intentionally NOT included.

Important:
1. Keep the existing `assets/` directory exactly as it is.
2. Keep the deployed Supabase functions active. Uploading source to GitHub does
   NOT itself deploy an Edge Function.
3. `scan-ticket` is included as source because it is already deployed in the
   Supabase project used by the game.
4. The collection master paths are read from the existing
   `assets/collections/collection01/collection.json`; the current repository
   version points to `.webp` master files.
5. Screen06 V20.7.2 does NOT display the whole master over the puzzle.
   It decodes the WebP in memory and applies it as a 3x3 background crop,
   preserving the existing piece layout.
6. app.js uses a versioned collection cache key and `cache:'no-store'` so an
   older collection.json session cache does not block the current WebP paths.

Recommended GitHub replacement:
- Replace the listed root code files.
- Replace/create `supabase/functions/*/index.ts` as included.
- Do NOT delete or re-upload assets.
- Commit the code changes together as one commit.

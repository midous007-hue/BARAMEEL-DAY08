BARAMEEL V21.0 — DESIGN PRECISION

Fixes in this build:
- Splash navigation is independent of app.js/Supabase and always proceeds to world.html after 1.7s or tap.
- BARAMEEL WORLD RUN/DUO and MENU/POST hotspots aligned to the actual artwork cards.
- Screen 06 hero 3x3 overlay aligned to the inner artwork cells, not the outer frame.
- Thumbnail card geometry retained and count numerals aligned to the printed /9 area with condensed retro typography.
- Reward display refuses the legacy 100-point visual; if an old server response contains 100, the client resolves the piece rarity/points from collection metadata for presentation.
- screen05 handoff also resolves piece points/rarity from collection metadata when a legacy 100 response is received.
- Supabase migration 002_rarity_points.sql remains required once to make the SERVER actually award 10,000–100,000 points. Client display fallback does not replace the server fix.

UPLOAD: replace the root code files and keep the existing production WebP masters in assets/collections/collection01/masters/. This package includes the stable non-master assets and the current collection JSON; the production master WebP files are intentionally not overwritten.

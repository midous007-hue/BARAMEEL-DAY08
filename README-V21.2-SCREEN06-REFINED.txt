BARAMEEL V21.2 — SCREEN 06 REFINED

This build is based on the stable V21.1 interaction build.

SCREEN 06 changes:
- Replaced assets/screen06-puzzle.webp with the newly supplied 954x1649 artwork.
- Exact hero 3x3 grid geometry aligned to the printed golden frames in the new artwork.
- Collection name ALEXANDRIA aligned inside the top dropdown field beside the artwork arrow.
- Removed all /9 and collected-count text from the ten bottom cards. The supplied artwork owns the card footer.
- Bottom ten cards use exact artwork-aligned transparent hotspots and inner image grids.
- MY REWARDS and SCAN MORE hotspots moved to the new artwork positions.
- Added a yellow star-shaped live points badge with a thin red outline in the empty points area.
- Added rarity-aware count-up animation and arcade counter sound. Higher point values use longer/faster pitch escalation.
- Added SUPER / AMAZING / SPECTACULAR / JACKPOT star flash. EPIC/LEGENDARY/MYTHIC use the stronger jackpot audio.
- Preserved the approved character-specific arcade selection sounds and the existing Supabase / Universal QR / Auto Ticket architecture.
- Updated collection cache-busting to V21.2.

UPLOAD:
Replace the code files at repo root and keep the existing production assets/masters if they are already present. This ZIP includes the new screen06 artwork and the existing runtime assets included in V21.1.

SUPABASE:
No new SQL is required for these Screen 06 UI changes. The rarity-points migration from V21.1 remains included and should already have been run once if the server-side rarity points have not yet been enabled.

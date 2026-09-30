BARAMEEL V20.8 — DESIGN PRECISION BUILD

Purpose
-------
This build keeps the working V20.6/V20.7 gameplay architecture intact and applies a design/interaction precision pass.
Do NOT delete or replace the existing assets folder.

What changed
------------
1) Hotspots and inputs were re-aligned to the actual artwork bounds:
   - BARAMEEL WORLD cards/social icons/profile
   - RUN nickname field + START RUN
   - Runner selection cards + continue buttons
   - Progress BACK + SCAN QR
   - Scanner BACK + camera/collections buttons + inline camera window
   - ALEXANDRIA dropdown, 3x3 hero grid, reward number, MY REWARDS, SCAN MORE, thumbnails

2) Back navigation
   - Visible BARAMEEL-style BACK control added to screens that had no visible artwork back control.
   - Existing artwork back controls remain the source of truth on screens 02/03/04/05/06.

3) Audio
   - Restores the approved classic BARAMEEL arcade audio bank:
     audio/tap.wav
     audio/select.wav
     audio/confirm.wav
     audio/back.wav
     audio/scan.wav
     audio/error.wav
     audio/reward-levelup.mp3
     audio/completion-arcade.wav
   - Button/navigation sounds use the arcade bank instead of the newer unpleasant sound set.
   - Reward count-up uses reward-levelup.mp3 plus restrained arcade tick layering.

4) Scanner error handling
   - Any QR that is not BARAMEEL-UNIVERSAL now gets a framed error message + error sound.
   - Repeated detection of the same wrong QR is debounced so the error sound does not spam.
   - Ticket/auth/server errors also appear in the same framed guidance UI.

5) Guidance UI
   - Scanner guidance/error/success messages now appear in a designed BARAMEEL frame that fades in/out instead of floating plain text.

6) Typography
   - Input/dynamic UI uses a retro display font with safe fallbacks.
   - The artwork itself is never altered.

7) Rarity-aware points
   - COMMON = 10,000
   - UNCOMMON = 20,000
   - RARE = 40,000
   - EPIC = 60,000
   - LEGENDARY = 80,000
   - MYTHIC = 100,000
   - Existing rarity/print-weight distribution is preserved.
   - Reward number is animated from 0 to the exact server-awarded value.
   - Visual/sound intensity increases with rarity.
   - Screen 06 displays the reward number inside the existing POINTS artwork area.

8) ALEXANDRIA
   - Collection label position and hero 3x3 grid were re-aligned to the artwork.
   - Thumbnail rows were re-aligned.
   - Existing yellow 1–10 artwork circles are preserved; duplicate dynamic number circles were removed.
   - 9/9 now cleanly switches the hero to the full master image with completion effect.

CRITICAL BACKEND STEP
---------------------
Run this SQL ONCE in Supabase SQL Editor before testing the new point economy:

supabase/migrations/002_rarity_points.sql

That migration:
- adds rarity + points to collection_pieces;
- applies the exact ALEXANDRIA 90-piece rarity matrix;
- changes server-side reward points from the old fixed 100 to the rarity values above;
- changes reward selection weights from uniform to the approved per-piece print-share weights;
- keeps ONE BARAMEEL-UNIVERSAL QR and server-side ticket consumption;
- keeps idempotency and player history intact;
- keeps the 5,000 completion bonus when no missing pieces remain.

Upload
------
Upload/replace the files in this package at the repository root.
KEEP the existing assets/ folder and its current artwork/master WebP files.
The package includes only the updated collection.json inside assets/collections/collection01/ plus the approved audio bank.

Do not replace:
- Supabase publishable key configuration with a secret key.
- Existing production assets with older PNG artwork.
- Existing player data or Supabase tables.

After upload
------------
1. Run 002_rarity_points.sql in Supabase.
2. Wait for GitHub Pages deployment.
3. Open BARAMEEL RUN.
4. Enter a nickname.
5. Test runner selection and back navigation.
6. Open scanner and test one correct Universal QR.
7. Test one unrelated/wrong QR: it must show the framed error + error sound and must NOT consume the ticket.
8. Confirm the awarded piece appears in the correct hero cell and thumbnail.
9. Confirm the displayed reward equals the rarity value and the player total increases by the same server-side amount.

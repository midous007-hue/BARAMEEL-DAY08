BARAMEEL V20.9 — DESIGN / AUDIO / POINTS PRECISION

This package is built on the stable V20.7.2/V20.8 gameplay architecture.
The Universal QR, automatic scan ticket, Supabase player identity, server-side reward draw,
idempotency and collection state are preserved.

CHANGES IN THIS BUILD
---------------------
1) BARAMEEL RUN entry artwork
   - Replaces assets/screen01-start.webp with the supplied 942x1669 BARAMEEL RUN artwork.
   - The artwork is displayed at its native aspect ratio.
   - The nickname input is aligned to the cream input field in the artwork.
   - Placeholder is exactly: TYPE YOUR NICKNAME.
   - Native placeholder behavior makes it disappear as soon as the player starts typing.
   - Input uses one consistent retro display font (Righteous) matching the 70s BARAMEEL direction.

2) BARAMEEL WORLD hotspots
   - RUN and DUO LINK hotspots are aligned to the complete upper cards.
   - MENU and POST hotspots are aligned to the complete lower cards (the previous vertical position was wrong).
   - MY BARAMEEL and social hotspots were re-aligned to their actual artwork regions.

3) CLASSIC CHARACTER ARCADE AUDIO — RESTORED
   - Character selection no longer uses the generic select.wav sound.
   - The approved character-selection motif from the earlier V8/V13 build is restored exactly:
       ROOKIE  = root 392
       SKATER  = root 440
       BRONA   = root 494
       RACER   = root 554
       CHILLER = root 622
       DREAMER = root 698
   - Each character therefore has a distinct arcade pitch/motif.
   - Button/navigation sounds now use the same restrained square/triangle arcade synthesis family.
   - Error sound is a short descending arcade signal, not a harsh sawtooth buzzer.
   - Completion keeps the approved completion-arcade asset.

4) WRONG QR
   - Any QR other than BARAMEEL-UNIVERSAL is rejected before the scan API is called.
   - The ticket is NOT consumed for a wrong QR.
   - A framed error message appears and the arcade error sound plays.
   - Repeated reads of the same wrong QR are debounced.

5) TYPOGRAPHY
   - Dynamic UI typography is standardized around Righteous with safe fallbacks.
   - System/helper copy remains readable through the existing condensed fallback.
   - Artwork typography is never replaced by HTML text.

6) RARITY POINTS — SERVER SOURCE OF TRUTH
   COMMON     = 10,000
   UNCOMMON   = 20,000
   RARE       = 40,000
   EPIC       = 60,000
   LEGENDARY  = 80,000
   MYTHIC     = 100,000

   - Reward value comes from the server-selected collection_pieces row.
   - The client only animates/displays the server-awarded value.
   - Reward animation duration and arcade pitch range scale with rarity.
   - The old fixed 100-point reward is removed from the new RPC.

7) ALEXANDRIA SCREEN 06
   - Reward number is positioned inside the designed POINTS panel area, not over the artwork label/crown.
   - ALEXANDRIA selector is re-centered to its designed header field.
   - 3x3 hero pieces, thumbnails, SCAN MORE and MY REWARDS behavior remain intact.

CRITICAL SUPABASE STEP
----------------------
The browser cannot safely change the production reward engine.
Run this ONCE in Supabase SQL Editor:

  supabase/migrations/002_rarity_points.sql

That migration:
- adds rarity + points to collection_pieces;
- writes the 90-piece ALEXANDRIA rarity/point matrix;
- replaces consume_universal_scan with the rarity-aware server function;
- awards 10,000–100,000 points server-side;
- preserves weighted missing-piece selection;
- preserves Universal QR + scan tickets + idempotency;
- preserves the 5,000-point completion bonus.

VERIFY AFTER RUNNING SQL
------------------------
Run:

  select rarity, points, count(*)
  from public.collection_pieces
  group by rarity, points
  order by points;

The result must contain only the configured values:
10000 / 20000 / 40000 / 60000 / 80000 / 100000.

Then make one fresh scan. The returned reward JSON must contain the piece rarity and
its matching points value. If a fresh scan still returns "points": 100, the old
consume_universal_scan function is still active and the migration has not replaced it.
Do not compensate this in the browser; the production source of truth must remain Supabase.

UPLOAD
------
Upload the package contents to the repository root.
Keep the existing assets folder and all existing collection masters/thumbnails/audio.
This package intentionally replaces ONLY:
  assets/screen01-start.webp
and the code/config files included in the package.

Do not expose or replace any Supabase secret/service-role key.

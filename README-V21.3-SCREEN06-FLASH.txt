BARAMEEL V21.3 — SCREEN 06 FLASH / POINTS REFINEMENT

This build is based on the stable V21.2 Screen 06 build.

Changes in this build:
- Removed the CSS yellow star badge behind the live points number. The artwork's own STAR = POINTS = crown graphic remains untouched.
- Live points are now transparent text only: strong yellow fill + thin red outline + subtle dark shadow.
- Points count-up starts at 0 and ends at the server/collection value (10,000–100,000 according to rarity).
- Reward word flash happens AFTER the count-up completes.
- Added lightweight WebP reward flashes:
  assets/rewards/reward-super.webp
  assets/rewards/reward-amazing.webp
  assets/rewards/reward-spectacular.webp
- Flash images are preloaded and use a short screen/mirror-like brightness animation.
- EPIC / LEGENDARY / MYTHIC finish with the JACKPOT flash and jackpot arcade sound after the count-up.
- Corrected all 10 lower thumbnail card positions against the supplied 954×1649 artwork. The internal 3×3 crop stays inside each gold card frame.
- Large 3×3 hero geometry is preserved from V21.2 because it matches the supplied artwork.
- MY REWARDS / SCAN MORE hotspots remain aligned to the new artwork.
- No Supabase schema/function change is required for this build.

UPLOAD:
Replace the code/assets from this folder over the same GitHub Pages repo while keeping the existing collection master WebP files in assets/collections/collection01/masters/.

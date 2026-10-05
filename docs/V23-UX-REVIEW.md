# BARAMEEL RUN V23.4 — CURRENT UX / FLOW REVIEW

## Locked player journey

BARAMEEL WORLD → HOW IT WORKS (first run only) → START FLASH (once per run start) → NICKNAME → CHOOSE RUNNER → CONFIRM → MY RUN

From MY RUN, the experience intentionally splits into two independent paths:

### COLLECTION HUNT

MY RUN → COLLECTION HUNT → BARAMEEL UNIVERSAL QR → server reward → collection piece/configured reward → collection progress

The Collection path stays collection-focused. It does not route to the city map or checkpoint scanner.

Screen 06 is a reusable master Collection Puzzle screen. ALEXANDRIA is one collection in the catalog. Each configured collection contains 10 different master images, and each image has its own 3×3 piece definition.

### CHECKPOINT RUN

MY RUN → CHECKPOINT RUN → LIVE ROUTE MAP → move → checkpoint → CHECKPOINT QR → server validation → checkpoint points → next checkpoint → … → BARAMEEL FINAL ZONE

The route map uses the production configuration when supplied and does not invent checkpoint coordinates in the client. The map viewport is an interactive layer integrated inside the artwork's existing map frame.

### SHARED PROGRESSION

Collection-path points and checkpoint-path points feed one server-side player balance:

COLLECTION PATH POINTS + CHECKPOINT PATH POINTS → ONE PLAYER POINT BALANCE

That shared balance drives rank and Marks eligibility.

### BARAMEEL VISIT / RECEIPT BRIDGE

The receipt is not a third gameplay path.

BARAMEEL FINAL ZONE → PURCHASE → RECEIPT CODE → server validation → VERIFY → BARAMEEL REWARD DROP → REWARD CLAIMED → downstream completion

Receipt rewards are server-defined. The UI must not hard-code one reward type or a fixed reward amount.

## V23.4 interaction fixes

- START FLASH no longer repeats immediately after HOW IT WORKS.
- START FLASH is shown once for each explicit new run start.
- WORLD card glow repeats briefly on selection and stays clipped to each card hotspot geometry.
- Screen 04 is now the MY RUN branch dashboard.
- Universal QR scanner uses its own artwork frame and keeps the camera/video inside it.
- Screen 06 supports multiple collections through assets/collections/index.json.
- Scan More from Screen 06 stays in the Collection path.
- Checkpoint scanner is separate from the Universal QR scanner and sends only server-confirmed success to CHECKPOINT FOUND.
- Checkpoint result data is placed into the approved checkpoint result fields.
- Route map is rendered inside the artwork map viewport, with no hard-coded checkpoint markers.
- Receipt input is placed inside the receipt-code frame and receipt verification has a dedicated thermal-printer style audio cue.
- Run Complete summarizes the Checkpoint Run only; it is not a global game-complete screen.
- Existing approved arcade sounds remain in place. Jackpot audio/effects are reserved for genuinely rare high-value outcomes.

## Production gates

The repository now contains the checkpoint server schema/function, but checkpoint_definitions still requires the approved production dataset and the new checkpoint-scan Edge Function/migration must be deployed before checkpoint rewards are considered live.

The Universal QR and receipt reward functions likewise require the compatible Supabase migrations/functions to be deployed.

## Dynamic artwork rule

Dynamic points, ranks, names, distances, collection names, reward labels and status values are injected by code into dedicated artwork fields. Do not bake changing gameplay numbers into the artwork.


## V23.4 avatar architecture
The player enters a nickname once, then chooses one of six visual avatars. The avatar has no class, stat, speed, jump, boost, rarity, or special ability. The nickname is the primary player identity. The selected avatar is shown with the nickname on the live checkpoint map and can be surfaced on player-owned progression screens such as MY RUN and checkpoint results. Screen 02 is the avatar-selection screen. Screen 03 is obsolete and must not be linked by any live navigation.

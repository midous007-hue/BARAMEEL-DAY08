# BARAMEEL RUN V23 UX Review — clean-development

## Player-first rules
Every screen must answer:
1. WHERE AM I?
2. WHAT JUST HAPPENED?
3. WHY AM I HERE?
4. WHAT DO I DO NOW?
5. WHAT HAPPENS AFTER I TAP?
6. CAN I GO BACK, AND WHERE WILL BACK TAKE ME?
7. WHAT IS LIVE DATA versus fixed artwork?
8. What is the current run state and what is the final goal?

## Locked journey
WORLD -> HOW IT WORKS (first run only) -> START FLASH (once per run start) -> NICKNAME -> CHOOSE RUNNER -> CONFIRM -> MY PROGRESS -> BARAMEEL QR -> REWARD -> LIVE ROUTE -> CHECKPOINT SCAN -> CHECKPOINT FOUND -> conditional PIECE -> ROUTE -> repeat/explore -> FINAL ZONE -> BARAMEEL FINISH -> RECEIPT CODE -> VERIFY -> DROP -> RUN COMPLETE -> LIVE TOP 20 -> MARKS.

## V23 fixes applied
- Service worker cache bumped to v23 and flow pages included to prevent stale START FLASH behavior.
- START FLASH is guarded: it only runs after HOW IT WORKS has been seen and only once per browser session/run start.
- LIVE ROUTE now uses a real interactive map layer with browser location and configuration-driven destination/checkpoints. No static geographic route is hard-coded in the UI.
- Route map treats checkpoints as discoverable points rather than a forced fixed sequence.
- Checkpoint scanner no longer auto-succeeds after a timer. It waits for a checkpoint QR with the test format BARAMEEL-CHECKPOINT-<ID>.
- RUN COMPLETE Back now returns to the actual parent screen recorded by the flow instead of forcing the player back into the route.
- Receipt no-code path records its parent before RUN COMPLETE.

## Production blockers still intentionally not invented
- BARAMEEL destination coordinates are not present in config.js.
- Production checkpoint dataset/schema and server-side checkpoint validation endpoint are not present in the current repository.
- Therefore the live route engine is configuration-ready, but destination/checkpoint data must be supplied before claiming production-ready geographic routing.
- The checkpoint scanner currently gates the UI on a checkpoint QR format for flow testing; server-side validation must be added before production rewards are granted.

## Artwork audit from the uploaded V23 candidate pack
Approved for the current flow layer:
- how-it-works.webp
- start-flash-screen.webp
- checkpoint-found.webp
- checkpoint-scanner.webp
- leaderboard.webp
- new-collection-piece.webp
- new-piece-found.webp
- reveal-barameel-box.webp
- verifying-code.webp
- what-are-barameel-marks.webp
- your-barameel-drop.webp

Hold for artwork revision before using as final:
- route-map.webp — blank map viewport is correct, but the fixed five checkpoint/progress circles must be removed because checkpoint count is dynamic.
- collections.webp — contains static 0/10 dynamic progress.
- screen04-rewards.webp.webp — contains sample live player values; must be empty.
- receipt-code.webp — contains ENTER CODE HERE placeholder inside the artwork; remove placeholder content while keeping a clean integrated code area.
- rewarded-added.webp — contains static +5,000; must be empty.
- run-complete.webp — contains static collection images/progress and must be dynamic/empty.
- marks-wallet.webp — contains a dynamic date placeholder; remove it.
- checkpoint-reached.webp — not part of the locked current core flow; do not wire it until its role is explicitly approved.

## Motion rule
Motion must be short, purposeful and state-driven:
- tap: small feedback
- confirm: stronger confirmation
- scan: scanning motion only while camera is active
- reward: reveal/shine only when reward is actually received
- jackpot: rare, reserved for true high-value outcomes
- navigation: quick transition, no long loading illusion
- respect prefers-reduced-motion
- never use animation to imply a reward or success before the backend/result actually confirms it.

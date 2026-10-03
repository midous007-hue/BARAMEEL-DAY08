BARAMEEL V22 — RUN FLOW BUILD

Branch: clean-development

Protected core screens: index.html, world.html (visual hotspot precision + stronger arcade feedback only), run.html, screen02.html, screen03.html, screen04.html, screen05.html.

The protected core Supabase/Universal QR/Ticket path was not rewritten.

Added post-core RUN screens: how-it-works.html, start-flash.html, collections.html, route-map.html, checkpoint-scanner.html, checkpoint-found.html, new-piece-found.html, new-collection-piece.html, receipt-code.html, verifying-code.html, reveal-barameel-box.html, your-barameel-drop.html, rewarded-added.html, run-complete.html, leaderboard.html, marks-wallet.html, barameel-marks.html.

Interaction layer: barameel-flow.css / barameel-flow.js. Stronger haptic patterns, louder synthesized arcade feedback, display/input typography, transparent artwork-aligned controls, and lightweight transition/preload behavior.

Business logic: Points remain Points. Marks are Barameel chips used for product redemption. The Marks explanation screen does not show EGP. Receipt Code is optional; CONTINUE WITHOUT CODE is the secondary path. Receipt codes are intended as one-time server-side purchase keys.

Supabase additions: 003_receipt_codes.sql, 004_marks_wallet.sql, receipt-draw, leaderboard, wallet. These additions are isolated from the existing production scan/player functions.

IMPORTANT: the new Supabase migration/function files are in GitHub but are not live until the Supabase project applies the migrations and deploys the new Edge Functions. Existing production functions were not replaced.
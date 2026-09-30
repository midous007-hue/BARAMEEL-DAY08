BARAMEEL V20.6.1 — AUTO TICKET + PIECE FIX

IMPORTANT:
The previous V20.6 file correctly automated the ticket, but it omitted the existing
barameel-v205-fix.js bridge. That bridge is required because the live scan response
can contain the piece fields outside result.reward. Without it, points can update
while the collection piece is not written to the client state.

This version restores that bridge and keeps the automatic ticket behavior.

FILES:
- screen05.html
- barameel-v205-fix.js
- README.txt

INSTALL:
1. Replace screen05.html in GitHub.
2. Make sure barameel-v205-fix.js is also in the repo root (this ZIP includes it).
3. Do NOT change app.js.
4. Do NOT add ?ticket=.
5. Commit and hard-refresh.

EXPECTED:
Screen05 -> automatic ticket -> one successful scan -> piece + points -> Screen06.
SCAN MORE -> automatic fresh ticket after the consumed ticket.
Refresh before scan -> same valid ticket reused.

No changes to /scan, consume_universal_scan, or the reward draw.

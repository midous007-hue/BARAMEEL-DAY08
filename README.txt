BARAMEEL V20.6 — AUTOMATIC SCAN TICKET

This is a minimal Screen05-only update.
No change is required to app.js, /scan, or the server-side reward draw.

Install:
1. Replace the root screen05.html with the file in this ZIP.
2. Keep the existing app.js (V20.4) unchanged.
3. Do NOT add ?ticket= to the URL.
4. Hard refresh the game.

New flow:
Screen05 opens -> /scan-ticket automatically issues/reuses a ticket.
Open camera -> scan BARAMEEL-UNIVERSAL -> /scan consumes that ticket.
SCAN MORE -> Screen05 -> a fresh ticket is created after the previous one was consumed.
Refresh before scanning -> the existing valid ticket is reused by the server.

Expected:
+100 and a piece on a normal scan, then Screen06.
The universal QR remains exactly the same.

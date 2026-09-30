BARAMEEL V20.5 — PIECE DISPLAY FIX

Problem fixed:
- Scan was awarding points but Screen06 could remain on image01 with 0/9 because the reward shape was not normalized consistently and Screen06 did not re-sync player state before rendering.
- Screen06 now:
  1) syncs the player from Supabase,
  2) opens the image returned by the scan,
  3) renders the collected piece from server/player state,
  4) keeps the existing points animation and visual design.

Files:
1. barameel-v205-fix.js
2. screen05.html
3. screen06.html

Deploy:
- Upload/replace these 3 files in the repository root.
- Do NOT change Supabase keys, Edge Functions, SQL, or the scanner artwork.
- Keep the existing app.js. The small v20.5 bridge runs after app.js and normalizes any reward shape returned by /scan.

Test:
Use the still-valid test ticket URL format:
screen05.html?ticket=<ticket-id>
Then scan the real BARAMEEL-UNIVERSAL QR.
Expected:
- points increase,
- Screen06 opens on the awarded image,
- the awarded piece is no longer faded,
- the image count becomes 1/9 (or the next correct count),
- refreshing/reopening the collection keeps the piece because it is reloaded from the server.

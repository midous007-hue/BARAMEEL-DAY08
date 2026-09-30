BARAMEEL V20.7 — WEBP SCREEN06 FIX

Replace screen06.html only.

This version is designed for the current repository state where
collection.json points to the real .webp master files.

Key changes:
- Loads the selected master with a real <img> element, not CSS background only.
- Waits for the selected WebP to load/decode before revealing the master.
- Keeps the existing 3x3 piece rendering and the existing thumbnails.
- After the selected image is ready, preloads all 10 WebP masters concurrently.
- Uses one browser cache entry per master.
- No Supabase, ticket, scan, reward, or app.js changes.
- Does not require renaming any more files.

IMPORTANT:
The file paths in collection.json must point to the actual .webp files:
assets/collections/collection01/masters/image01-master.webp ... image10-master.webp

Install:
1. Replace screen06.html in GitHub with this file.
2. Do not replace app.js or barameel-v205-fix.js.
3. Hard refresh.
4. Test a successful scan and open Screen06.

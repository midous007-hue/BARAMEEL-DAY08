BARAMEEL V20.7.1 — COMPREHENSIVE CODE-ONLY PATCH

IMPORTANT:
Do NOT replace, rename, or delete anything inside assets/.
This package changes only root code files.

Why this version:
The live collection.json now points to WebP masters. The app previously cached
collection.json in sessionStorage under a non-versioned key, so an older cached
JSON could continue pointing to PNG paths even after the GitHub file was changed.
The new app uses a versioned collection cache and fetches collection.json with a
cache-busting query.

It also keeps the working automatic scan-ticket flow and the V20.5 piece bridge.

Files:
- app.js
- screen05.html
- screen06.html
- barameel-v205-fix.js

Install:
1. Replace these four root files only.
2. Do NOT touch the assets folder.
3. Do NOT change Supabase.
4. Do NOT manually add ?ticket=.
5. Commit all four together.
6. Open the game in a private/incognito tab for the first test, or clear the site's
   sessionStorage once. The new app cache version should also prevent the old
   collection JSON from being reused.
7. Test one scan -> Screen06.

Expected:
- Automatic ticket remains active.
- Piece remains visible in the 3x3 and thumbnail.
- Screen06 uses the WebP masters from the current collection.json.
- Selected master loads first.
- Remaining masters preload afterward.
- No "IMAGE ERROR" overlay is used; if the actual WebP cannot be decoded, the
  screen reports IMAGE UNAVAILABLE instead of hiding the real problem.

If IMAGE UNAVAILABLE still appears:
That proves the issue is in the actual master asset being served, not the
collection cache or screen code. At that point we should validate/re-encode the
10 WebP files themselves; no further code changes should be made.

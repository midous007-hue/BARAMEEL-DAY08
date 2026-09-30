BARAMEEL V21.1 — INTERACTION FIX

Root cause fixed:
app.js exported playPointsCountUp without defining it. That caused a ReferenceError during app initialization, so window.BR was never created. As a result run.html loaded visually but BACK and START RUN had no working handler.

Fix:
- Defined playPointsCountUp before exporting BR.
- Kept all existing V21.0 design, assets, Supabase, Universal QR, Auto Ticket and collection logic unchanged.
- screen01-start.webp remains in assets.

Upload the contents over the current BARAMEEL-DAY08 repo.
No database migration is required for this interaction fix.

BARAMEEL WORLD — V20.5 SUPABASE FIXED

# BARAMEEL WORLD — V20.3 SUPABASE CONNECTED

Clean BARAMEEL WORLD / BARAMEEL RUN master connected to the existing Supabase project.

## Current architecture
ONE printed QR -> BARAMEEL-UNIVERSAL -> authenticated player -> server scan ticket -> server-side reward draw -> player collection.

## Before GitHub Pages
1. Deploy the included Supabase Edge Functions.
2. Keep the Supabase secret key only in Edge Function secrets.
3. Do not mix files from V12/V13/V14/V15/V16/V17/V18/V19 into this project.
4. Upload this folder's contents to the new repository root.

The browser configuration already contains the public Supabase URL and publishable key.

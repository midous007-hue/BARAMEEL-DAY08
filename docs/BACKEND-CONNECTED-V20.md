# BARAMEEL WORLD V20 — Supabase Connected

## Browser configuration
The project is configured with:
- Supabase URL: `https://gwsbvhgkrocksygmxvdm.supabase.co`
- Supabase publishable key: stored in `config.js`
- Edge Function base: `https://gwsbvhgkrocksygmxvdm.supabase.co/functions/v1`

The publishable key is intentionally browser-visible. **Never** put a Supabase secret/service-role key in this repository.

## Important
This build is connected to Supabase, but gameplay is not live until the compatible Edge Functions are deployed.

Deploy these functions from the included `supabase/functions/` directory:
- `player`
- `scan`
- `analytics`
- `admin-grant-ticket`

The functions use the server-side secret key internally. Store that key only as an Edge Function secret; never put it in GitHub.

## First QR test
The scan endpoint requires a server-issued scan ticket. For the first controlled test:
1. Open the game and let anonymous sign-in create the player.
2. Use the returned player code to create one `scan_tickets` row in Supabase SQL Editor (see the backend docs).
3. Open `screen05.html?ticket=THE_TICKET_UUID`.
4. Scan the single `BARAMEEL-UNIVERSAL` QR.
5. The server consumes the ticket and returns the reward.

Do not create a client-side random reward. The server remains the source of truth.

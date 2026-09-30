export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-player-id, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
import { createClient } from "npm:@supabase/supabase-js@2";
function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("Server secret key is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function getBearer(req: Request) {
  const h = req.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}
async function requireUser(req: Request, admin: ReturnType<typeof adminClient>) {
  const token = getBearer(req);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const admin = adminClient();
  const user = await requireUser(req, admin);
  if (!user) return json({ error: "AUTH_REQUIRED" }, 401);
  const { data: player, error: playerError } = await admin.from("players").select("id, player_code").eq("auth_user_id", user.id).single();
  if (playerError || !player) return json({ error: "PLAYER_NOT_INITIALIZED" }, 409);
  const { data, error } = await admin.rpc("issue_scan_ticket", {
    p_player_id: player.id,
    p_source: "scanner",
    p_metadata: { player_code: player.player_code, automatic: true },
  });
  if (error) return json({ ok: false, error: String(error.message || "TICKET_ISSUE_FAILED") }, 409);
  return json(data);
});

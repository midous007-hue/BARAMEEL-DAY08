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
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bearer(req: Request) {
  const value = req.headers.get("Authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function requireUser(req: Request, admin: ReturnType<typeof adminClient>) {
  const token = bearer(req);
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

  let body: any = {};
  try { body = await req.json(); }
  catch { return json({ error: "INVALID_JSON" }, 400); }

  const checkpointId = String(body.checkpoint_id || "").trim().toUpperCase();
  const idempotencyKey = String(body.idempotency_key || crypto.randomUUID()).slice(0, 120);
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!checkpointId) return json({ ok: false, error: "CHECKPOINT_SCAN_REQUIRED", code: "CHECKPOINT_SCAN_REQUIRED" }, 400);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ ok: false, error: "CHECKPOINT_LOCATION_REQUIRED", code: "CHECKPOINT_LOCATION_REQUIRED" }, 400);
  }

  const { data: player, error: playerError } = await admin
    .from("players")
    .select("id,player_code,nickname,runner,points,weekly_points")
    .eq("auth_user_id", user.id)
    .single();

  if (playerError || !player) return json({ error: "PLAYER_NOT_INITIALIZED" }, 409);

  const { data, error } = await admin.rpc("claim_checkpoint", {
    p_player_id: player.id,
    p_checkpoint_id: checkpointId,
    p_idempotency_key: idempotencyKey,
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    const code = String(error.message || "CHECKPOINT_SCAN_FAILED").toUpperCase();
    return json({ ok: false, error: code, code }, 409);
  }

  const { data: claims, error: claimsError } = await admin
    .from("checkpoint_claims")
    .select("checkpoint_id,points_awarded")
    .eq("player_id", player.id)
    .order("created_at", { ascending: true });

  if (claimsError) return json({ ok: false, error: "CHECKPOINT_STATE_FAILED", code: "CHECKPOINT_STATE_FAILED" }, 500);

  const checkpointIds = (claims || []).map((row: any) => String(row.checkpoint_id));
  const { data: rank } = await admin.rpc("player_rank", { p_player_id: player.id });

  return json({
    ...data,
    player: {
      id: player.id,
      playerId: player.player_code,
      nickname: player.nickname,
      runner: player.runner,
      points: Number(player.points || 0),
      weeklyPoints: Number(player.weekly_points || 0),
      checkpoints: checkpointIds,
      rank: Number(rank || 0),
    },
    checkpoints: checkpointIds,
  });
});

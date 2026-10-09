export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const admin = adminClient();
  const user = await requireUser(req, admin);
  if (!user) return json({ ok: false, error: "AUTH_REQUIRED", code: "AUTH_REQUIRED" }, 401);

  let body: any = {};
  try { body = await req.json(); }
  catch { return json({ ok: false, error: "INVALID_JSON", code: "INVALID_JSON" }, 400); }

  // New flow: scan an opaque Master QR token.
  // Legacy checkpoint_id is intentionally retained only for isolated Test Mode.
  const qrToken = String(body.qr_token || "").trim();
  const idempotencyKey = String(body.idempotency_key || crypto.randomUUID()).slice(0, 120);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const accuracy = body.accuracy_meters == null ? null : Number(body.accuracy_meters);

  // Production claims must resolve from an active server-side Master QR token.
  // Never accept a client-supplied checkpoint ID as proof of physical presence.
  if (!qrToken) {
    return json({ ok: false, error: "MASTER_QR_REQUIRED", code: "MASTER_QR_REQUIRED" }, 400);
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ ok: false, error: "CHECKPOINT_LOCATION_REQUIRED", code: "CHECKPOINT_LOCATION_REQUIRED" }, 400);
  }
  // Physical checkpoint claims must include a usable GPS accuracy reading.
  // The scanner already sends coords.accuracy; reject missing or implausible values
  // instead of letting a null accuracy bypass the server-side quality gate.
  if (accuracy === null || !Number.isFinite(accuracy) || accuracy < 0) {
    return json({ ok: false, error: "GPS_ACCURACY_REQUIRED", code: "GPS_ACCURACY_REQUIRED" }, 400);
  }
  if (accuracy > 50) {
    return json({ ok: false, error: "GPS_ACCURACY_TOO_LOW", code: "GPS_ACCURACY_TOO_LOW" }, 409);
  }

  const { data: player, error: playerError } = await admin
    .from("players")
    .select("id,player_code,nickname,runner,points,weekly_points")
    .eq("auth_user_id", user.id)
    .single();

  if (playerError || !player) {
    return json({ ok: false, error: "PLAYER_NOT_INITIALIZED", code: "PLAYER_NOT_INITIALIZED" }, 409);
  }

  const result = await admin.rpc("resolve_and_claim_master_checkpoint", {
    p_player_id: player.id,
    p_qr_token: qrToken,
    p_lat: lat,
    p_lng: lng,
    p_accuracy_meters: accuracy,
    p_idempotency_key: idempotencyKey,
  });
  const data = result.data;
  const error = result.error;

  if (error) {
    // Postgres RPC errors can expose the stable SQLSTATE separately from the
    // human message. Normalize all fields so the client never falls back to
    // a generic error for a known checkpoint validation failure.
    console.error("[checkpoint-scan] RPC error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    const raw = [
      error.code,
      error.message,
      error.details,
      error.hint,
    ].filter(Boolean).join(" ").toUpperCase();

    let code = "CHECKPOINT_SCAN_FAILED";
    if (raw.includes("CHECKPOINT_NOT_AT_PHYSICAL_LOCATION")) {
      code = "CHECKPOINT_NOT_AT_PHYSICAL_LOCATION";
    } else if (raw.includes("GPS_ACCURACY_TOO_LOW")) {
      code = "GPS_ACCURACY_TOO_LOW";
    } else if (raw.includes("MASTER_QR_INVALID")) {
      code = "MASTER_QR_INVALID";
    } else if (raw.includes("CHECKPOINT_ALREADY_CLAIMED")) {
      code = "CHECKPOINT_ALREADY_CLAIMED";
    } else if (raw.includes("CHECKPOINT_LOCATION_REQUIRED")) {
      code = "CHECKPOINT_LOCATION_REQUIRED";
    } else if (raw.includes("CHECKPOINT_LOCATION_INACTIVE")) {
      code = "CHECKPOINT_LOCATION_INACTIVE";
    } else if (raw.includes("NO_ACTIVE_STAGE")) {
      code = "NO_ACTIVE_STAGE";
    } else if (raw.includes("CHECKPOINT_NOT_CONFIGURED")) {
      code = "CHECKPOINT_NOT_CONFIGURED";
    } else if (raw.includes("PLAYER_NOT_INITIALIZED")) {
      code = "PLAYER_NOT_INITIALIZED";
    }

    return json({ ok: false, error: code, code }, 409);
  }

  const { data: freshPlayer, error: freshPlayerError } = await admin
    .from("players")
    .select("id,player_code,nickname,runner,points,weekly_points")
    .eq("id", player.id)
    .single();

  if (freshPlayerError || !freshPlayer) {
    return json({ ok: false, error: "PLAYER_STATE_FAILED", code: "PLAYER_STATE_FAILED" }, 500);
  }

  const { data: claims, error: claimsError } = await admin
    .from("checkpoint_challenge_claims")
    .select("challenge_id,points_awarded")
    .eq("player_id", player.id)
    .order("created_at", { ascending: true });

  if (claimsError) {
    return json({ ok: false, error: "CHECKPOINT_STATE_FAILED", code: "CHECKPOINT_STATE_FAILED" }, 500);
  }

  const challengeIds = (claims || []).map((row: any) => String(row.challenge_id || "")).filter(Boolean);
  const { data: challengeRows, error: challengeRowsError } = challengeIds.length
    ? await admin.from("checkpoint_challenges").select("id,location_id").in("id", challengeIds)
    : { data: [], error: null };
  if (challengeRowsError) {
    return json({ ok: false, error: "CHECKPOINT_STATE_FAILED", code: "CHECKPOINT_STATE_FAILED" }, 500);
  }
  const locationByChallenge = new Map((challengeRows || []).map((row: any) => [String(row.id), String(row.location_id)]));
  const claimsList = [...new Set(challengeIds.map((id: string) => locationByChallenge.get(id)).filter(Boolean) as string[])];

  return json({
    ...data,
    player: {
      id: player.id,
      playerId: player.player_code,
      nickname: player.nickname,
      runner: player.runner,
      points: Number(freshPlayer.points || 0),
      weeklyPoints: Number(freshPlayer.weekly_points || 0),
      checkpoints: claimsList,
      challengeClaims: claimsList,
    },
    checkpoints: claimsList,
    challenge_claims: claimsList,
  });
});

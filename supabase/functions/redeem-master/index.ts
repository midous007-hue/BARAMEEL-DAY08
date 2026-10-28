import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SERVER_CONFIGURATION_ERROR");
  return createClient(url, key, { auth: { persistSession: false } });
}

function bearer(req: Request) {
  const header = req.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function requireUser(req: Request, admin: ReturnType<typeof adminClient>) {
  const token = bearer(req);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

function constantTimeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function safeErrorCode(error: unknown) {
  const message = String((error as { message?: string })?.message || "MASTER_REDEMPTION_FAILED").toUpperCase();
  const match = message.match(/[A-Z][A-Z0-9_]{3,}/g);
  return match?.find((part) => part.startsWith("PENDING_") ||
    part.startsWith("REDEMPTION_") || part === "IDEMPOTENCY_KEY_REUSED") ||
    "MASTER_REDEMPTION_FAILED";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

  const masterToken = String(Deno.env.get("BARAMEEL_MASTER_REDEMPTION_QR_TOKEN") || "").trim();
  if (!masterToken) {
    console.error("BARAMEEL_MASTER_REDEMPTION_QR_TOKEN secret is not configured.");
    return json({ ok: false, code: "MASTER_REDEMPTION_NOT_CONFIGURED" }, 503);
  }

  let admin: ReturnType<typeof adminClient>;
  try {
    admin = adminClient();
  } catch (error) {
    console.error("Master redemption server configuration error:", error);
    return json({ ok: false, code: "SERVER_CONFIGURATION_ERROR" }, 500);
  }

  try {
    const user = await requireUser(req, admin);
    if (!user) return json({ ok: false, code: "AUTH_REQUIRED" }, 401);

    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return json({ ok: false, code: "INVALID_REQUEST_BODY" }, 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return json({ ok: false, code: "INVALID_REQUEST_BODY" }, 400);
    }

    const scannedToken = String(body.qr_token || "").trim();
    const rewardId = String(body.reward_id || "").trim();
    const idempotencyKey = String(body.idempotency_key || "").trim();

    if (!constantTimeEqual(scannedToken, masterToken)) {
      return json({ ok: false, code: "MASTER_QR_INVALID" }, 403);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rewardId)) {
      return json({ ok: false, code: "PENDING_REWARD_NOT_FOUND" }, 400);
    }
    if (!idempotencyKey || idempotencyKey.length > 120) {
      return json({ ok: false, code: "REDEMPTION_IDEMPOTENCY_KEY_REQUIRED" }, 400);
    }

    const { data: player, error: playerError } = await admin
      .from("players")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (playerError || !player) return json({ ok: false, code: "PLAYER_NOT_INITIALIZED" }, 409);

    const { data, error } = await admin.rpc("redeem_player_pending_reward", {
      p_player_id: player.id,
      p_reward_id: rewardId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      const code = safeErrorCode(error);
      const status = code === "PENDING_REWARD_NOT_FOUND" ? 404 : 409;
      return json({ ok: false, code }, status);
    }

    return json(data || { ok: false, code: "MASTER_REDEMPTION_FAILED" });
  } catch (error) {
    console.error("Unexpected master redemption error:", error);
    return json({ ok: false, code: "MASTER_REDEMPTION_FAILED" }, 500);
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-player-id, x-idempotency-key",
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

function safeErrorCode(error: unknown) {
  const message = String((error as { message?: string })?.message || "DUO_CONNECT_FAILED").toUpperCase();
  const match = message.match(/[A-Z][A-Z0-9_]{3,}/g);
  return match?.find((part) => part.startsWith("DUO_") || part.startsWith("PLAYER_") ||
    part.startsWith("PENDING_") || part === "IDEMPOTENCY_KEY_REUSED") || "DUO_CONNECT_FAILED";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

  let admin: ReturnType<typeof adminClient>;
  try {
    admin = adminClient();
  } catch (error) {
    console.error("Duo Connect server configuration error:", error);
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

    // Always derive the scanning player's identity from the authenticated session.
    // Never trust a player ID supplied by the browser.
    const { data: player, error: playerError } = await admin
      .from("players")
      .select("id,player_code,nickname,auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (playerError || !player) {
      return json({ ok: false, code: "PLAYER_NOT_INITIALIZED" }, 409);
    }
    if (!/^BM-[A-Z0-9]{8}$/i.test(String(player.player_code || "")) ||
        String(player.nickname || "").trim().length < 3) {
      return json({ ok: false, code: "DUO_PLAYER_NOT_REGISTERED" }, 409);
    }

    const action = String(body.action || "connect").trim().toLowerCase();

    if (action === "status") {
      const [pendingResult, attemptResult] = await Promise.all([
        admin.from("player_pending_rewards")
          .select("id,source_type,source_id,reward_type,reward_label,amount,product_code,status,created_at,redeemed_at")
          .eq("player_id", player.id)
          .eq("status", "PENDING")
          .order("created_at", { ascending: false })
          .limit(20),
        admin.from("duo_link_attempts")
          .select("id,player_a_id,player_b_id,scanned_by_player_id,discovered,created_at")
          .or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (pendingResult.error || attemptResult.error) {
        console.error("Duo status lookup failed:", pendingResult.error || attemptResult.error);
        return json({ ok: false, code: "DUO_STATUS_UNAVAILABLE" }, 503);
      }

      let lastAttempt: Record<string, unknown> | null = null;
      const attempt = attemptResult.data?.[0];
      if (attempt) {
        const partnerId = attempt.player_a_id === player.id ? attempt.player_b_id : attempt.player_a_id;
        const { data: partner } = await admin.from("players")
          .select("player_code,nickname")
          .eq("id", partnerId)
          .maybeSingle();
        lastAttempt = {
          id: attempt.id,
          discovered: attempt.discovered,
          created_at: attempt.created_at,
          partner_code: partner?.player_code || null,
          partner_nickname: partner?.nickname || null,
        };
      }

      return json({
        ok: true,
        player_code: player.player_code,
        pending_rewards: pendingResult.data || [],
        last_attempt: lastAttempt,
      });
    }

    const otherPlayerCode = String(body.other_player_code || "").trim().toUpperCase();
    const idempotencyKey = String(body.idempotency_key || "").trim();
    if (!/^BM-[A-Z0-9]{8}$/.test(otherPlayerCode)) {
      return json({ ok: false, code: "DUO_PLAYER_CODE_INVALID" }, 400);
    }
    if (!idempotencyKey || idempotencyKey.length > 120) {
      return json({ ok: false, code: "DUO_IDEMPOTENCY_KEY_REQUIRED" }, 400);
    }

    const { data, error } = await admin.rpc("resolve_duo_link", {
      p_scanner_player_id: player.id,
      p_other_player_code: otherPlayerCode,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      const code = safeErrorCode(error);
      const status = code === "DUO_CONNECT_PAUSED" ? 503 :
        code === "DUO_PLAYER_NOT_FOUND" ? 404 :
        code === "DUO_PLAYER_NOT_REGISTERED" ? 409 :
        code === "DUO_PLAYER_CODE_INVALID" || code === "DUO_CANNOT_CONNECT_TO_SELF" ? 400 : 409;
      console.warn("Duo Connect attempt rejected:", code);
      return json({ ok: false, code }, status);
    }
    return json(data || { ok: false, code: "DUO_CONNECT_FAILED" });
  } catch (error) {
    console.error("Unexpected Duo Connect error:", error);
    return json({ ok: false, code: "DUO_CONNECT_FAILED" }, 500);
  }
});

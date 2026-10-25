import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-player-id, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server secret key is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getBearer(req: Request) {
  const header = req.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function requireUser(req: Request, admin: ReturnType<typeof adminClient>) {
  const token = getBearer(req);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function hashPlayerPin(pin: string) {
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const secret = Deno.env.get("SUPABASE_PIN_PEPPER") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    secretKeys.default;
  if (!secret) throw new Error("PIN hashing secret is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("barameel-player-pin:v1:" + pin),
  );
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function newPlayerCode() {
  return "BM-" + crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

const avatars = ["avatar01", "avatar02", "avatar03", "avatar04", "avatar05", "avatar06"];
const legacyAvatars: Record<string, string> = {
  rookie: "avatar01",
  skater: "avatar02",
  brona: "avatar03",
  racer: "avatar04",
  chiller: "avatar05",
  dreamer: "avatar06",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  let admin: ReturnType<typeof adminClient>;
  try {
    admin = adminClient();
  } catch (error) {
    console.error("Player function configuration error:", error);
    return json({ ok: false, error: "SERVER_CONFIGURATION_ERROR" }, 500);
  }

  try {
    const user = await requireUser(req, admin);
    if (!user) return json({ ok: false, error: "AUTH_REQUIRED" }, 401);

    let body: Record<string, unknown> = {};
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed;
    } catch {
      return json({ ok: false, error: "INVALID_REQUEST_BODY" }, 400);
    }

    const nickname = String(body.nickname || "").trim().slice(0, 24);
    const phoneNumber = String(body.phone_number || "").trim().slice(0, 32);
    const suppliedPin = String(body.pin || "").trim();
    if (nickname.length < 3) return json({ ok: false, error: "INVALID_NICKNAME" }, 400);
    if (!/^\\d{6}$/.test(suppliedPin)) return json({ ok: false, error: "INVALID_PIN" }, 400);
    const pinHash = await hashPlayerPin(suppliedPin);

    const requestedAvatar = String(body.avatar || body.runner || "").toLowerCase();
    const avatar = avatars.includes(requestedAvatar)
      ? requestedAvatar
      : (legacyAvatars[requestedAvatar] || "avatar01");

    // A phone-authenticated user is the durable identity. Never create an anonymous
    // profile from the registration form; recover an older profile by the verified phone.
    const verifiedPhone = String(user.phone || "").trim();
    if (!verifiedPhone) {
      return json({ ok: false, error: "VERIFIED_PHONE_REQUIRED" }, 403);
    }
    if (phoneNumber && phoneNumber !== verifiedPhone) {
      return json({ ok: false, error: "VERIFIED_PHONE_MISMATCH" }, 403);
    }

    // First look up the authenticated user's player profile.
    const existingLookup = await admin
      .from("players")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (existingLookup.error) {
      console.error("Player lookup failed:", existingLookup.error);
      return json({ ok: false, error: "PLAYER_LOOKUP_FAILED" }, 500);
    }

    let player = existingLookup.data;

    // If browser history/storage was cleared, OTP creates a fresh client session.
    // Reattach the existing player row so points, pieces and checkpoint claims remain intact.
    if (!player) {
      const phoneLookup = await admin
        .from("players")
        .select("*")
        .eq("phone_number", verifiedPhone)
        .limit(2);

      if (phoneLookup.error) {
        console.error("Verified phone profile lookup failed:", phoneLookup.error);
        return json({ ok: false, error: "PLAYER_PHONE_LOOKUP_FAILED" }, 500);
      }
      const phoneMatches = phoneLookup.data || [];
      if (phoneMatches.length > 1) {
        console.error("Multiple legacy profiles share verified phone:", verifiedPhone);
        return json({ ok: false, error: "PLAYER_PHONE_DUPLICATE" }, 409);
      }
      if (phoneMatches.length === 1) {
        const recovered = phoneMatches[0];
        // Verify the PIN before reattaching a legacy profile to this auth identity.
        if (recovered.pin_hash && !constantTimeEqual(String(recovered.pin_hash), pinHash)) {
          return json({ ok: false, error: "PIN_MISMATCH" }, 401);
        }
        const reclaimed = await admin
          .from("players")
          .update({ auth_user_id: user.id, nickname: nickname || recovered.nickname, phone_number: verifiedPhone, runner: avatar })
          .eq("id", recovered.id)
          .select("*")
          .single();
        if (reclaimed.error || !reclaimed.data) {
          console.error("Could not reattach verified phone profile:", reclaimed.error);
          return json({ ok: false, error: "PLAYER_RECOVERY_FAILED" }, 500);
        }
        player = reclaimed.data;
      }
    }

    if (player) {
      if (player.pin_hash) {
        if (!constantTimeEqual(String(player.pin_hash), pinHash)) {
          return json({ ok: false, error: "PIN_MISMATCH" }, 401);
        }
      } else {
        // Legacy profiles did not persist a PIN. Enroll one once, only after phone-auth verification.
        const enrolled = await admin
          .from("players")
          .update({ pin_hash: pinHash })
          .eq("id", player.id)
          .is("pin_hash", null)
          .select("*")
          .maybeSingle();
        if (enrolled.error) {
          console.error("Legacy player PIN enrollment failed:", enrolled.error);
          return json({ ok: false, error: "PIN_ENROLLMENT_FAILED" }, 500);
        }
        if (enrolled.data) {
          player = enrolled.data;
        } else {
          const reread = await admin.from("players").select("*").eq("id", player.id).single();
          if (reread.error || !reread.data || !reread.data.pin_hash ||
              !constantTimeEqual(String(reread.data.pin_hash), pinHash)) {
            return json({ ok: false, error: "PIN_MISMATCH" }, 401);
          }
          player = reread.data;
        }
      }
    }

    if (!player) {
      let insertError: unknown = null;

      // Retry only for generated player-code collisions. If another request
      // creates the same user's profile concurrently, re-read that profile.
      for (let attempt = 0; attempt < 5; attempt++) {
        const inserted = await admin
          .from("players")
          .insert({
            auth_user_id: user.id,
            player_code: newPlayerCode(),
            nickname,
            runner: avatar,
            phone_number: phoneNumber || null,
            pin_hash: pinHash,
          })
          .select("*")
          .single();

        if (!inserted.error && inserted.data) {
          player = inserted.data;
          insertError = null;
          break;
        }

        insertError = inserted.error;
        const concurrentLookup = await admin
          .from("players")
          .select("*")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!concurrentLookup.error && concurrentLookup.data) {
          player = concurrentLookup.data;
          insertError = null;
          break;
        }

        // Do not retry non-unique-constraint errors.
        if (inserted.error?.code !== "23505") break;
      }

      if (!player) {
        console.error("Player profile insert failed:", insertError);
        return json({ ok: false, error: "PLAYER_CREATE_FAILED" }, 500);
      }
    } else {
      const patch: Record<string, unknown> = {};
      if (nickname) patch.nickname = nickname;
      if (phoneNumber) patch.phone_number = phoneNumber;
      if (body.avatar || body.runner) patch.runner = avatar;

      if (Object.keys(patch).length) {
        const updated = await admin
          .from("players")
          .update(patch)
          .eq("id", player.id)
          .select("*")
          .single();

        if (updated.error || !updated.data) {
          console.error("Player profile update failed:", updated.error);
          return json({ ok: false, error: "PLAYER_UPDATE_FAILED" }, 500);
        }
        player = updated.data;
      }
    }

    if (!player?.id) {
      console.error("Player profile missing after create/lookup.");
      return json({ ok: false, error: "PLAYER_PROFILE_MISSING" }, 500);
    }

    // The current schema uses checkpoint_challenge_claims. Do not query the
    // removed legacy checkpoint_claims table.
    const claimsResult = await admin
      .from("checkpoint_challenge_claims")
      .select("challenge_id,created_at")
      .eq("player_id", player.id)
      .order("created_at", { ascending: true });

    if (claimsResult.error) {
      console.error("Checkpoint challenge claims lookup failed:", claimsResult.error);
      return json({ ok: false, error: "CHECKPOINT_STATE_FAILED" }, 500);
    }

    const challengeIds = [...new Set((claimsResult.data || [])
      .map((row: { challenge_id: string }) => String(row.challenge_id))
      .filter(Boolean))];

    let checkpointIds: string[] = [];
    if (challengeIds.length) {
      const challengeResult = await admin
        .from("checkpoint_challenges")
        .select("id,location_id")
        .in("id", challengeIds);

      if (challengeResult.error) {
        console.error("Checkpoint challenge lookup failed:", challengeResult.error);
        return json({ ok: false, error: "CHECKPOINT_STATE_FAILED" }, 500);
      }

      const locationByChallenge = new Map(
        (challengeResult.data || []).map((row: { id: string; location_id: string }) => [
          String(row.id),
          String(row.location_id),
        ]),
      );

      checkpointIds = [...new Set(challengeIds
        .map((id) => locationByChallenge.get(id))
        .filter((id): id is string => Boolean(id)))];
    }

    const ownedPiecesResult = await admin
      .from("player_pieces")
      .select("piece_id")
      .eq("player_id", player.id);

    if (ownedPiecesResult.error) {
      console.error("Player pieces lookup failed:", ownedPiecesResult.error);
      return json({ ok: false, error: "COLLECTION_STATE_FAILED" }, 500);
    }

    const pieceIds = (ownedPiecesResult.data || [])
      .map((row: { piece_id: string | null }) => row.piece_id)
      .filter((id): id is string => Boolean(id));

    const collected: Record<string, Record<string, number[]>> = {};
    if (pieceIds.length) {
      const pieceResult = await admin
        .from("collection_pieces")
        .select("id,image_id,piece_number")
        .in("id", pieceIds);

      if (pieceResult.error) {
        console.error("Collection pieces lookup failed:", pieceResult.error);
        return json({ ok: false, error: "COLLECTION_STATE_FAILED" }, 500);
      }

      const imageIds = [...new Set((pieceResult.data || [])
        .map((row: { image_id: string | null }) => row.image_id)
        .filter((id): id is string => Boolean(id)))];

      const imageResult = imageIds.length
        ? await admin.from("collection_images").select("id,collection_id").in("id", imageIds)
        : { data: [], error: null };

      if (imageResult.error) {
        console.error("Collection images lookup failed:", imageResult.error);
        return json({ ok: false, error: "COLLECTION_STATE_FAILED" }, 500);
      }

      const collectionByImage = new Map(
        (imageResult.data || []).map((row: { id: string; collection_id: string }) => [
          String(row.id),
          String(row.collection_id),
        ]),
      );

      for (const row of pieceResult.data || []) {
        const collectionId = collectionByImage.get(String(row.image_id));
        if (!collectionId || !row.image_id) continue;
        const imageId = String(row.image_id);
        collected[collectionId] ||= {};
        collected[collectionId][imageId] ||= [];
        collected[collectionId][imageId].push(Number(row.piece_number));
      }
    }

    for (const collectionId of Object.keys(collected)) {
      for (const imageId of Object.keys(collected[collectionId])) {
        collected[collectionId][imageId] = [...new Set(collected[collectionId][imageId])]
          .sort((a, b) => a - b);
      }
    }

    const rankResult = await admin.rpc("player_rank", { p_player_id: player.id });
    if (rankResult.error) {
      console.error("Player rank lookup failed:", rankResult.error);
      return json({ ok: false, error: "PLAYER_RANK_FAILED" }, 500);
    }

    const runner = String(player.runner || "").toLowerCase();
    return json({
      ok: true,
      player: {
        id: player.id,
        playerId: player.player_code,
        nickname: player.nickname,
        phone_number: player.phone_number || null,
        runner,
        avatar: avatars.includes(runner) ? runner : (legacyAvatars[runner] || "avatar01"),
        points: player.points,
        weeklyPoints: player.weekly_points,
        checkpoints: checkpointIds,
        collected,
        scans: player.scans_count,
        rank: Number(rankResult.data || 0),
      },
    });
  } catch (error) {
    console.error("Unexpected player function error:", error);
    return json({ ok: false, error: "PLAYER_FUNCTION_FAILED" }, 500);
  }
});



export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-player-id, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


import { createClient } from "npm:@supabase/supabase-js@2";
export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("Server secret key is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}
export function publishableKey() {
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  return keys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
}
export function json(body: unknown, status=200, headers: Record<string,string>={}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}
export function getBearer(req: Request) {
  const h=req.headers.get("Authorization")||"";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}
export async function requireUser(req: Request, admin: ReturnType<typeof adminClient>) {
  const token=getBearer(req);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: corsHeaders});
  if (req.method !== "POST") return json({error:"METHOD_NOT_ALLOWED"},405);

  const admin=adminClient();
  const user=await requireUser(req,admin);
  if (!user) return json({error:"AUTH_REQUIRED"},401);

  let body:any={};
  try { body=await req.json(); } catch { return json({error:"INVALID_JSON"},400); }

  const qr=String(body.qr||"").trim();
  if(qr!=="BARAMEEL-UNIVERSAL") return json({error:"INVALID_UNIVERSAL_QR"},400);

  const ticketId=String(body.ticket_id||"").trim();
  const idempotency=String(body.idempotency_key||crypto.randomUUID()).slice(0,120);

  const {data: player}=await admin.from("players").select("id").eq("auth_user_id",user.id).single();
  if(!player) return json({error:"PLAYER_NOT_INITIALIZED"},409);

  const {data,error}=await admin.rpc("consume_universal_scan",{
    p_player_id:player.id,p_ticket_id:ticketId,p_idempotency_key:idempotency,p_qr_value:qr
  });
  if(error) {
    const code=String(error.message||"SCAN_FAILED");
    return json({ok:false,error:code},409);
  }

  return json(data);
});

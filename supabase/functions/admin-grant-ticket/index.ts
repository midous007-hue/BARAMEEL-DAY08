

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

  const adminSecret=Deno.env.get("BARAMEEL_ADMIN_SECRET")||"";
  const supplied=req.headers.get("x-barameel-admin-secret")||"";
  if(!adminSecret || supplied!==adminSecret) return json({error:"FORBIDDEN"},403);

  let body:any={};
  try { body=await req.json(); } catch { return json({error:"INVALID_JSON"},400); }
  const playerCode=String(body.player_code||"").trim();
  if(!playerCode) return json({error:"PLAYER_CODE_REQUIRED"},400);

  const {data: player}=await admin.from("players").select("id,player_code").eq("player_code",playerCode).single();
  if(!player) return json({error:"PLAYER_NOT_FOUND"},404);

  const {data: ticket,error}=await admin.from("scan_tickets").insert({
    player_id:player.id,source:String(body.source||"admin").slice(0,40),
    metadata:body.metadata||{}
  }).select("id,issued_at").single();

  if(error) return json({error:error.message},500);
  return json({ok:true,ticket});
});

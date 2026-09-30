

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


function newPlayerCode() {
  return "BM-" + crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: corsHeaders});
  if (req.method !== "POST") return json({error:"METHOD_NOT_ALLOWED"},405);

  const admin=adminClient();
  const user=await requireUser(req,admin);
  if (!user) return json({error:"AUTH_REQUIRED"},401);

  let body: any={};
  try { body=await req.json(); } catch {}
  const nickname=String(body.nickname||"").trim().slice(0,24);
  const runner=["brona","chiller","dreamer","racer","rookie","skater"].includes(body.runner) ? body.runner : "brona";

  let {data: player}=await admin.from("players").select("*").eq("auth_user_id",user.id).maybeSingle();
  if (!player) {
    let code="";
    for(let i=0;i<5;i++) {
      code=newPlayerCode();
      const {error}=await admin.from("players").insert({auth_user_id:user.id,player_code:code,nickname,runner}).select("*").single();
      if(!error) break;
    }
    const retry = await admin.from("players").select("*").eq("auth_user_id",user.id).single();
    player = retry.data;
  } else {
    const patch:any={};
    if(nickname) patch.nickname=nickname;
    if(body.runner) patch.runner=runner;
    if(Object.keys(patch).length) {
      const r=await admin.from("players").update(patch).eq("id",player.id).select("*").single();
      if(!r.error) player=r.data;
    }
  }

  const {data: rank}=await admin.rpc("player_rank",{p_player_id:player.id});
  return json({
    ok:true,
    player:{
      id:player.id, playerId:player.player_code, nickname:player.nickname, runner:player.runner,
      points:player.points, weeklyPoints:player.weekly_points, checkpoints:player.checkpoints,
      scans:player.scans_count, rank:Number(rank||0)
    }
  });
});

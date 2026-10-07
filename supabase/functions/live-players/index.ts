import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
}
function adminClient(){
  const url=Deno.env.get("SUPABASE_URL")!;
  const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const key=keys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!key)throw new Error("Server secret key is not configured");
  return createClient(url,key,{auth:{persistSession:false}});
}
function bearer(req:Request){
  const v=req.headers.get("Authorization")||"";
  return v.startsWith("Bearer ")?v.slice(7):"";
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({ok:false,error:"METHOD_NOT_ALLOWED",code:"METHOD_NOT_ALLOWED"},405);

  const admin=adminClient();
  const token=bearer(req);
  if(!token)return json({ok:false,error:"AUTH_REQUIRED",code:"AUTH_REQUIRED"},401);
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)return json({ok:false,error:"AUTH_REQUIRED",code:"AUTH_REQUIRED"},401);

  let body:any={};try{body=await req.json()}catch{}
  const lat=Number(body.lat),lng=Number(body.lng);
  const accuracy=body.accuracy_meters==null?null:Number(body.accuracy_meters);

  const {data:player,error:playerError}=await admin.from("players")
    .select("id,player_code,nickname,avatar")
    .eq("auth_user_id",data.user.id).single();
  if(playerError||!player)return json({ok:false,error:"PLAYER_NOT_INITIALIZED",code:"PLAYER_NOT_INITIALIZED"},409);

  if(Number.isFinite(lat)&&Number.isFinite(lng)){
    await admin.from("player_locations").upsert({
      player_id:player.id,lat,lng,
      accuracy_meters:Number.isFinite(accuracy)?accuracy:null,
      updated_at:new Date().toISOString()
    },{onConflict:"player_id"});
  }

  const cutoff=new Date(Date.now()-90000).toISOString();
  const {data:rows,error:rowsError}=await admin.from("player_locations")
    .select("player_id,lat,lng,accuracy_meters,updated_at,players!inner(player_code,nickname,avatar)")
    .gte("updated_at",cutoff);
  if(rowsError)return json({ok:false,error:"LIVE_PLAYERS_FAILED",code:"LIVE_PLAYERS_FAILED"},500);

  return json({
    ok:true,
    players:(rows||[]).map((r:any)=>({
      id:r.player_id,
      player_code:r.players?.player_code||null,
      nickname:r.players?.nickname||"PLAYER",
      avatar:r.players?.avatar||null,
      lat:Number(r.lat),lng:Number(r.lng),
      accuracy_meters:r.accuracy_meters==null?null:Number(r.accuracy_meters),
      updated_at:r.updated_at
    }))
  });
});
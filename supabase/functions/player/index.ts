export const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-player-id, x-idempotency-key","Access-Control-Allow-Methods":"POST, OPTIONS"};
import { createClient } from "npm:@supabase/supabase-js@2";
function adminClient(){const url=Deno.env.get("SUPABASE_URL")!;const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");const key=keys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!key)throw new Error("Server secret key is not configured");return createClient(url,key,{auth:{persistSession:false}})}
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}
function getBearer(req:Request){const h=req.headers.get("Authorization")||"";return h.startsWith("Bearer ")?h.slice(7):""}
async function requireUser(req:Request,admin:ReturnType<typeof adminClient>){const token=getBearer(req);if(!token)return null;const {data,error}=await admin.auth.getUser(token);if(error||!data.user)return null;return data.user}
function newPlayerCode(){return "BM-"+crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);const admin=adminClient();const user=await requireUser(req,admin);if(!user)return json({error:"AUTH_REQUIRED"},401);let body:any={};try{body=await req.json()}catch{}const nickname=String(body.nickname||"").trim().slice(0,24);
const avatars=["avatar01","avatar02","avatar03","avatar04","avatar05","avatar06"];
const legacy={rookie:"avatar01",skater:"avatar02",brona:"avatar03",racer:"avatar04",chiller:"avatar05",dreamer:"avatar06"};
const requested=String(body.avatar||body.runner||"").toLowerCase();
const avatar=avatars.includes(requested)?requested:(legacy[requested]||"avatar01");let {data:player}=await admin.from("players").select("*").eq("auth_user_id",user.id).maybeSingle();if(!player){let code="";for(let i=0;i<5;i++){code=newPlayerCode();const {error}=await admin.from("players").insert({auth_user_id:user.id,player_code:code,nickname,runner:avatar}).select("*").single();if(!error)break}const retry=await admin.from("players").select("*").eq("auth_user_id",user.id).single();player=retry.data}else{const patch:any={};if(nickname)patch.nickname=nickname;if(body.avatar||body.runner)patch.runner=avatar;if(Object.keys(patch).length){const r=await admin.from("players").update(patch).eq("id",player.id).select("*").single();if(!r.error)player=r.data}}const {data:claims}=await admin.from('checkpoint_claims').select('checkpoint_id').eq('player_id',player.id).order('created_at',{ascending:true});const checkpointIds=(claims||[]).map((row:any)=>String(row.checkpoint_id));
const {data:ownedPieces}=await admin.from('player_pieces').select('piece_id').eq('player_id',player.id);
const pieceIds=(ownedPieces||[]).map((row:any)=>row.piece_id).filter(Boolean);
let collected:any={};
if(pieceIds.length){
  const {data:pieceRows}=await admin.from('collection_pieces').select('id,image_id,piece_number').in('id',pieceIds);
  const imageIds=(pieceRows||[]).map((row:any)=>row.image_id).filter(Boolean);
  const {data:imageRows}=imageIds.length?await admin.from('collection_images').select('id,collection_id').in('id',imageIds):{data:[]};
  const imageMap=new Map((imageRows||[]).map((row:any)=>[String(row.id),String(row.collection_id)]));
  for(const row of pieceRows||[]){
    const collectionId=imageMap.get(String(row.image_id));if(!collectionId)continue;
    if(!collected[collectionId])collected[collectionId]={};
    const imageId=String(row.image_id);if(!collected[collectionId][imageId])collected[collectionId][imageId]=[];
    collected[collectionId][imageId].push(Number(row.piece_number));
  }
}
for(const cid of Object.keys(collected))for(const iid of Object.keys(collected[cid]))collected[cid][iid]=[...new Set(collected[cid][iid])].sort((a:number,b:number)=>a-b);
const {data:rank}=await admin.rpc("player_rank",{p_player_id:player.id});return json({ok:true,player:{id:player.id,playerId:player.player_code,nickname:player.nickname,runner:player.runner,avatar:avatars.includes(String(player.runner||"").toLowerCase())?String(player.runner).toLowerCase():(legacy[String(player.runner||"").toLowerCase()]||"avatar01"),points:player.points,weeklyPoints:player.weekly_points,checkpoints:checkpointIds,collected,scans:player.scans_count,rank:Number(rank||0)}})});

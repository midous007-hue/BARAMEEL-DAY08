/* BARAMEEL WORLD — V20.8 DESIGN PRECISION BUILD
   Presentation/scanner client only. Production game state stays server-side.
   ONE printed QR = BARAMEEL-UNIVERSAL.
*/
(() => {
  const VERSION = '20260930-20.8';
  const STORAGE = 'barameel.world.player.v20.4';
  const API_BASE = String(window.BARAMEEL_API_BASE || '').replace(/\/$/, '');
  const SUPABASE_URL = String(window.BARAMEEL_SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = String(window.BARAMEEL_SUPABASE_PUBLISHABLE_KEY || '');
  let supa = null;
  let authPromise = null;
  const RUNNERS = ['rookie','skater','brona','racer','chiller','dreamer'];
  const RUNNER_NAMES = {rookie:'THE ROOKIE',skater:'THE SKATER',brona:'BRONA',racer:'THE RACER',chiller:'THE CHILLER',dreamer:'THE DREAMER'};
  const DEFAULTS = {playerId:null,playerCode:null,nickname:'',runner:'brona',points:0,weeklyPoints:0,rank:null,playerCount:0,checkpoints:[],collected:{collection01:{}},totalScans:0,lastReward:null,lastSeen:null};
  let state = loadState();
  if (!state.playerId) { state.playerId = crypto.randomUUID(); saveState(); }

  function loadState(){ try { return {...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE)||'{}')}; } catch { return {...DEFAULTS}; } }
  function saveState(){ state.lastSeen = Date.now(); localStorage.setItem(STORAGE, JSON.stringify(state)); }
  function patchState(p){ state = {...state,...p}; saveState(); return state; }
  function setNickname(v){ patchState({nickname:String(v||'').trim().slice(0,24)}); }
  function setRunner(v){ if(RUNNERS.includes(v)) patchState({runner:v}); }
  function selected(){ return state.runner || 'brona'; }
  function pieces(c='collection01', i='image01'){ return (state.collected?.[c]?.[i]||[]).map(Number).sort((a,b)=>a-b); }
  function hasPiece(c,i,p){ return pieces(c,i).includes(Number(p)); }
  function count(c,i){ return pieces(c,i).length; }
  function mergePlayer(p){
    if(!p) return state;
    state = {...state,...p};
    if(p.collected) state.collected = p.collected;
    saveState();
    return state;
  }

  // These are the classic BARAMEEL arcade assets from the earlier approved build.
  const SOUND_FILES={
    tap:'./audio/tap.wav',
    select:'./audio/select.wav',
    confirm:'./audio/confirm.wav',
    back:'./audio/back.wav',
    scan:'./audio/scan.wav',
    error:'./audio/error.wav',
    completion:'./audio/completion-arcade.wav',
    levelup:'./audio/reward-levelup.mp3'
  };
  const bank={}; let audioCtx=null;
  function audio(){
    if(audioCtx) return audioCtx;
    const C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
    audioCtx=new C();
    const g=audioCtx.createGain(); g.gain.value=.72; g.connect(audioCtx.destination); audioCtx.master=g;
    return audioCtx;
  }
  function unlockAudio(){ const c=audio(); if(!c) return; if(c.state==='suspended') c.resume().catch(()=>{}); }
  function tone(f,d=.07,type='square',gain=.12,delay=0){
    const c=audio(); if(!c) return;
    try{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(c.master);o.start(t);o.stop(t+d+.02);}catch{}
  }
  function prime(){Object.entries(SOUND_FILES).forEach(([k,src])=>{if(bank[k])return;const a=new Audio(src);a.preload='auto';a.playsInline=true;bank[k]=a;});}
  function fallback(k){
    if(k==='error') [220,165,110].forEach((f,i)=>tone(f,.12,'sawtooth',.15,i*.11));
    else if(k==='scan') [520,780,1040].forEach((f,i)=>tone(f,.055,'square',.12,i*.055));
    else if(k==='confirm') [523,659,784].forEach((f,i)=>tone(f,.07,'square',.13,i*.06));
    else if(k==='select') [392,523,659].forEach((f,i)=>tone(f,.065,'square',.12,i*.05));
    else if(k==='back') [659,523,392].forEach((f,i)=>tone(f,.07,'square',.11,i*.06));
    else tone(740,.06,'square',.11);
  }
  function play(k){
    prime(); unlockAudio();
    const a=bank[k];
    if(!a){fallback(k);return;}
    try{a.currentTime=0;a.volume=(k==='error'?0.9:0.82);const p=a.play();p?.catch(()=>fallback(k));}catch{fallback(k);}
  }
  function playSelect(){play('select');}
  function playCompletionSound(){play('completion');}

  const RARITY={COMMON:{points:10000,duration:950,volume:.58},UNCOMMON:{points:20000,duration:1200,volume:.62},RARE:{points:40000,duration:1550,volume:.68},EPIC:{points:60000,duration:1900,volume:.74},LEGENDARY:{points:80000,duration:2350,volume:.80},MYTHIC:{points:100000,duration:2850,volume:.88}};
  function rewardSpec(rarity,points){
    const key=String(rarity||'').toUpperCase();
    const spec=RARITY[key]||{points:Number(points)||10000,duration:1400,volume:.65};
    return {...spec,points:Number(points)||spec.points,rarity:key||'REWARD'};
  }
  function playRewardReveal(points,rarity='COMMON'){
    const spec=rewardSpec(rarity,points);
    prime(); unlockAudio();
    const a=bank.levelup;
    if(a){try{a.currentTime=0;a.volume=spec.volume;const p=a.play();p?.catch(()=>fallback('confirm'));}catch{fallback('confirm');}}
    // Light arcade ticks sit underneath the approved reward asset; higher tiers climb further and longer.
    const steps=Math.max(12,Math.min(34,Math.round(spec.duration/75)));
    const start=420, end=720+(spec.points/100000)*980;
    for(let i=0;i<steps;i++){
      const p=i/(steps-1), f=start+(end-start)*(p*p);
      tone(f,.035,'square',.055+(spec.points/100000)*.045,(i*(spec.duration/steps))/1000);
    }
    if(spec.rarity==='LEGENDARY'||spec.rarity==='MYTHIC'){
      [880,1175,1568].forEach((f,i)=>tone(f,.08,'triangle',.10+(spec.points/100000)*.05,(spec.duration-260+i*80)/1000));
    }
    return spec;
  }
  // Backward-compatible alias used by older pages.
  function playPointsCountUp(points,rarity){return playRewardReveal(points,rarity);}

  ['pointerdown','touchstart','mousedown','keydown'].forEach(e=>window.addEventListener(e,unlockAudio,{capture:true,passive:true}));
  function go(url){location.href=url;}
  function goAfter(url,sound='tap',delay=180){play(sound);setTimeout(()=>go(url),delay);}
  function idle(fn){if('requestIdleCallback' in window)requestIdleCallback(fn,{timeout:900});else setTimeout(fn,80);}
  function preload(src){const i=new Image();i.decoding='async';i.src=src;return i;}
  function preloadAll(xs){xs.forEach(preload);}
  function flash(target=document.body){let el=target.querySelector?.('.barameel-flash');if(!el){el=document.createElement('div');el.className='barameel-flash';target.appendChild(el);}el.classList.remove('on');void el.offsetWidth;el.classList.add('on');}

  async function ensureAuth(){
    if(!SUPABASE_URL||!SUPABASE_KEY)return null;
    if(authPromise)return authPromise;
    authPromise=(async()=>{try{
      if(!window.supabase?.createClient)throw new Error('SUPABASE_CLIENT_UNAVAILABLE');
      if(!supa)supa=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      let {data:{session},error:getError}=await supa.auth.getSession();
      if(getError)throw getError;
      if(!session){const r=await supa.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session;}
      if(!session?.access_token)throw new Error('AUTH_SESSION_MISSING');
      return session;
    }catch(e){console.error('[BARAMEEL AUTH]',e);return null;}})();
    return authPromise;
  }
  async function api(path,body,method='POST'){
    if(!API_BASE)return {ok:false,code:'BACKEND_NOT_CONFIGURED',error:'BACKEND_NOT_CONFIGURED'};
    const session=await ensureAuth();
    if(!session?.access_token)return {ok:false,code:'AUTH_UNAVAILABLE',error:'AUTH_UNAVAILABLE'};
    try{
      const r=await fetch(API_BASE+path,{method,headers:{'content-type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+session.access_token},body:body?JSON.stringify(body):undefined,cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){console.error('[BARAMEEL API]',path,r.status,data);return {ok:false,...data,error:data.error||`HTTP_${r.status}`};}
      return data;
    }catch(e){console.error('[BARAMEEL API]',path,e);return {ok:false,code:'NETWORK_ERROR',error:'NETWORK_ERROR'};}
  }
  async function track(event,meta={}){return api('/analytics',{event_name:event,payload:{...meta,path:location.pathname,ts:Date.now()}});}
  async function syncPlayer(){const r=await api('/player',{nickname:state.nickname,runner:state.runner});if(r?.player)mergePlayer(r.player);return r;}
  async function scanUniversal({ticketId=null}){
    if(!ticketId)return {ok:false,code:'SCAN_TICKET_REQUIRED',error:'SCAN_TICKET_REQUIRED'};
    const r=await api('/scan',{qr:'BARAMEEL-UNIVERSAL',ticket_id:ticketId,idempotency_key:'scan-'+crypto.randomUUID()});
    if(r?.player)mergePlayer(r.player);
    if(r?.reward){
      const reward=r.reward,c=reward.collection_id||reward.collection||'collection01',i=reward.image_id||reward.image||'image01',piece=Number(reward.piece_number||reward.piece||0);
      if(c&&i&&piece){const next={...state.collected};next[c]={...(next[c]||{})};next[c][i]=Array.from(new Set([...(next[c][i]||[]).map(Number),piece]));mergePlayer({collected:next,lastReward:reward});}
    }
    return r;
  }
  async function duoLink(otherPlayerCode){const r=await api('/duo-link',{player_id:state.playerId,other_player_code:String(otherPlayerCode||'').trim(),idempotency_key:'duo-'+crypto.randomUUID()});if(r?.player)mergePlayer(r.player);return r;}
  async function fetchCollection(id='collection01'){
    const key='barameel.collection.'+id+'.v20.8';
    try{const c=sessionStorage.getItem(key);if(c)return JSON.parse(c);}catch{}
    const r=await fetch(`./assets/collections/${id}/collection.json?v=20260930-20.8`,{cache:'no-store'});
    if(!r.ok)throw Error('COLLECTION_UNAVAILABLE');
    const d=await r.json();try{sessionStorage.setItem(key,JSON.stringify(d));}catch{}return d;
  }
  function parseUniversalQR(raw){const s=decodeURIComponent(String(raw||'')).trim();if(/^BARAMEEL[-_:]?UNIVERSAL$/i.test(s))return {type:'universal',token:'BARAMEEL-UNIVERSAL'};if(/(?:^|[?&])qr=BARAMEEL-UNIVERSAL(?:&|$)/i.test(s))return {type:'universal',token:'BARAMEEL-UNIVERSAL'};return null;}

  window.BR={VERSION,RUNNERS,RUNNER_NAMES,RARITY,get state(){return state},setNickname,setRunner,selected,pieces,hasPiece,count,mergePlayer,play,playSelect,playCompletionSound,playPointsCountUp,playRewardReveal,rewardSpec,go,goAfter,idle,preload,preloadAll,flash,api,track,syncPlayer,scanUniversal,duoLink,fetchCollection,parseUniversalQR,saveState,ensureAuth,API_BASE};
  idle(async()=>{const r=await syncPlayer();try{sessionStorage.setItem('barameelPlayerSync',JSON.stringify({ok:!!r?.ok,code:r?.code||null,error:r?.error||null,ts:Date.now()}));}catch{}});
})();

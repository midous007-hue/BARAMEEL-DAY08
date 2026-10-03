/* BARAMEEL WORLD — V21.1 INTERACTION FIX BUILD
   Presentation/scanner client only. Production game state stays server-side.
   ONE printed QR = BARAMEEL-UNIVERSAL.
*/
(() => {
  const VERSION = '20261001-21.4';
  const STORAGE = 'barameel.world.player.v20.4';
  const API_BASE = String(window.BARAMEEL_API_BASE || '').replace(/\/$/, '');
  const SUPABASE_URL = String(window.BARAMEEL_SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = String(window.BARAMEEL_SUPABASE_PUBLISHABLE_KEY || '');
  let supa = null;
  let authPromise = null;
  const RUNNERS = ['rookie','skater','brona','racer','chiller','dreamer'];
  const RUNNER_NAMES = {rookie:'THE ROOKIE',skater:'THE SKATER',brona:'BRONA',racer:'THE RACER',chiller:'THE CHILLER',dreamer:'THE DREAMER'};
  const DEFAULTS = {playerId:null,playerCode:null,nickname:'',runner:'brona',points:0,weeklyPoints:0,rank:null,playerCount:0,checkpoints:[],collected:{collection01:{}},totalScans:0,lastReward:null,runHowItWorksSeen:false,lastSeen:null};
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

  // CLASSIC BARAMEEL CHARACTER-SELECT ARCADE AUDIO — restored from the approved V13/V8 selection build.
  // Selection is intentionally synthesized per runner so every character has a distinct motif/pitch.
  const SOUND_FILES={completion:'./audio/completion-arcade.wav'};
  const bank={}; let audioCtx=null;
  function audio(){
    if(audioCtx) return audioCtx;
    const C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
    audioCtx=new C();
    const g=audioCtx.createGain(); g.gain.value=.95; g.connect(audioCtx.destination); audioCtx.master=g;
    return audioCtx;
  }
  function unlockAudio(){const c=audio();if(!c)return;if(c.state==='suspended')c.resume().catch(()=>{});}
  function tone(f,d=.07,type='square',gain=.12,delay=0){
    const c=audio();if(!c)return;
    try{
      const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
      o.type=type;o.frequency.value=f;
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(gain,t+.006);
      g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g).connect(c.master);o.start(t);o.stop(t+d+.02);
    }catch{}
  }
  function playArcadeTap(){unlockAudio();tone(740,.055,'square',.16);tone(1040,.065,'triangle',.12,.045)}
  function playArcadeConfirm(){unlockAudio();[523,659,784,1047].forEach((f,i)=>tone(f,.065,i===3?'triangle':'square',.18,i*.055))}
  function playArcadeBack(){unlockAudio();tone(659,.065,'square',.10);tone(523,.075,'square',.09,.065);tone(392,.10,'triangle',.075,.135)}
  function playArcadeScan(){unlockAudio();[660,880,1175,1568].forEach((f,i)=>tone(f,.052,'square',.16,i*.052))}
  function playArcadeError(){unlockAudio();tone(247,.085,'square',.18);tone(196,.095,'triangle',.16,.085);tone(147,.12,'square',.13,.18)}
  function prime(){
    if(bank.completion)return;
    const a=new Audio(SOUND_FILES.completion);a.preload='auto';a.playsInline=true;bank.completion=a;
  }
  function play(k){
    if(k==='tap'){playArcadeTap();return}
    if(k==='confirm'){playArcadeConfirm();return}
    if(k==='back'){playArcadeBack();return}
    if(k==='scan'){playArcadeScan();return}
    if(k==='error'){playArcadeError();return}
    if(k==='select'){playArcadeTap();return}
    if(k==='completion'){
      unlockAudio();prime();const a=bank.completion;
      try{a.currentTime=0;a.volume=.9;const q=a.play();q?.catch(()=>{});return}catch{}
    }
    playArcadeTap();
  }
  // Exact character-specific motif from the earlier approved selection screen.
  function playSelect(runner){
    unlockAudio();
    const roots={rookie:392,skater:440,brona:494,racer:554,chiller:622,dreamer:698};
    const root=roots[runner]||494;
    [1,1.25,1.5,2,2.5].forEach((m,i)=>tone(root*m,.065,i===4?'triangle':'square',.18,i*.045));
  }
  // POINTS COUNT-UP — classic BARAMEEL arcade counter. The pitch and number of ticks rise with rarity/value.
  function playPointsCountUp(points,rarity='COMMON'){
    const spec=rewardSpec(rarity,points), value=Math.max(10000,Number(points)||spec.points);
    unlockAudio();
    const root={COMMON:392,UNCOMMON:440,RARE:494,EPIC:554,LEGENDARY:622,MYTHIC:698}[spec.rarity]||494;
    const ratio=Math.max(.1,Math.min(1,value/100000));
    const steps=Math.max(8,Math.min(20,Math.round(8+ratio*12)));
    const span=Math.max(760,Math.min(2200,spec.duration));
    for(let i=0;i<steps;i++){
      const p=i/Math.max(1,steps-1),f=root*(1.0+1.65*p+0.15*ratio*p);
      tone(f, i===steps-1 ? .075 : .045, i%4===3?'triangle':'square', .06+.028*ratio, (span*p)/1000);
    }
    const end=Math.max(.05,(span-120)/1000);
    tone(root*2.5,.11,'triangle',.09+.05*ratio,end);
    tone(root*3,.14,'sine',.075+.06*ratio,end+.075);
    return spec;
  }
  function playJackpot(rarity='EPIC',delay=.15){
    unlockAudio();
    const roots={EPIC:554,LEGENDARY:622,MYTHIC:698};
    const root=roots[String(rarity).toUpperCase()]||554;
    const chord=[1,1.25,1.5,2,2.5,3];
    chord.forEach((m,i)=>tone(root*m,.13,i<3?'triangle':'sine',.07+(i*.012),delay+i*.065));
    tone(root*4,.18,'triangle',.13,delay+.40);
    tone(root*5,.22,'sine',.10,delay+.50);
  }
  // Backward-compatible reward reveal hook.
  function playRewardReveal(points,rarity='COMMON'){
    unlockAudio();
    const spec=rewardSpec(rarity,points), ratio=Math.max(.1,Math.min(1,spec.points/100000));
    const roots={COMMON:392,UNCOMMON:440,RARE:494,EPIC:554,LEGENDARY:622,MYTHIC:698};
    const root=roots[spec.rarity]||494;
    const motif=[1,1.25,1.5,2,2.5];
    const steps=Math.max(8,Math.min(22,Math.round(spec.duration/115)));
    for(let i=0;i<steps;i++){
      const p=i/Math.max(1,steps-1),f=root*motif[i%motif.length]*(1+.35*p*ratio);
      tone(f,.05,i%5===4?'triangle':'square',.055+.035*ratio,(i*(spec.duration/steps))/1000);
    }
    const end=(spec.duration-180)/1000;
    tone(root*3,.08,'triangle',.12+.08*ratio,Math.max(0,end));
    if(spec.rarity==='RARE'||spec.rarity==='EPIC'||spec.rarity==='LEGENDARY'||spec.rarity==='MYTHIC')tone(root*4,.10,'triangle',.10+.08*ratio,Math.max(0,end+.08));
    if(spec.rarity==='LEGENDARY'||spec.rarity==='MYTHIC'){
      tone(root*5,.12,'triangle',.13+.08*ratio,Math.max(0,end+.16));
      tone(root*6,.14,'triangle',.12+.09*ratio,Math.max(0,end+.25));
    }
    return spec;
  }
  function playCompletionSound(){play('completion')}
  ['pointerdown','touchstart','mousedown','keydown'].forEach(e=>window.addEventListener(e,unlockAudio,{capture:true,passive:true}));

  const RARITY={COMMON:{points:10000,duration:950,volume:.58},UNCOMMON:{points:20000,duration:1200,volume:.62},RARE:{points:40000,duration:1550,volume:.68},EPIC:{points:60000,duration:1900,volume:.74},LEGENDARY:{points:80000,duration:2350,volume:.80},MYTHIC:{points:100000,duration:2850,volume:.88}};
  function rewardSpec(rarity,points){
    const key=String(rarity||'').toUpperCase();
    const spec=RARITY[key]||{points:Number(points)||10000,duration:1400,volume:.65};
    return {...spec,points:Number(points)||spec.points,rarity:key||'REWARD'};
  }
  function go(url){location.href=url;}
  function haptic(kind='tap'){try{const p={tap:[12],confirm:[18,34,22],scan:[16,28,18,42],reward:[24,42,24,58],jackpot:[30,55,30,75,45,90],error:[28,48,28]}[kind]||[12];navigator.vibrate?.(p)}catch{}}
  function markRunHowItWorksSeen(){patchState({runHowItWorksSeen:true})}
  function goAfter(url,sound='tap',delay=180){haptic(sound);play(sound);setTimeout(()=>go(url),delay);}
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
    const key='barameel.collection.'+id+'.v21.2';
    try{const c=sessionStorage.getItem(key);if(c)return JSON.parse(c);}catch{}
    const r=await fetch(`./assets/collections/${id}/collection.json?v=20261001-21.4`,{cache:'no-store'});
    if(!r.ok)throw Error('COLLECTION_UNAVAILABLE');
    const d=await r.json();try{sessionStorage.setItem(key,JSON.stringify(d));}catch{}return d;
  }
  function parseUniversalQR(raw){const s=decodeURIComponent(String(raw||'')).trim();if(/^BARAMEEL[-_:]?UNIVERSAL$/i.test(s))return {type:'universal',token:'BARAMEEL-UNIVERSAL'};if(/(?:^|[?&])qr=BARAMEEL-UNIVERSAL(?:&|$)/i.test(s))return {type:'universal',token:'BARAMEEL-UNIVERSAL'};return null;}

  window.BR={VERSION,RUNNERS,RUNNER_NAMES,RARITY,get state(){return state},setNickname,setRunner,selected,pieces,hasPiece,count,mergePlayer,play,playSelect,playCompletionSound,haptic,markRunHowItWorksSeen,playPointsCountUp,playJackpot,playRewardReveal,rewardSpec,go,goAfter,idle,preload,preloadAll,flash,api,track,syncPlayer,scanUniversal,duoLink,fetchCollection,parseUniversalQR,saveState,ensureAuth,API_BASE};
  idle(async()=>{const r=await syncPlayer();try{sessionStorage.setItem('barameelPlayerSync',JSON.stringify({ok:!!r?.ok,code:r?.code||null,error:r?.error||null,ts:Date.now()}));}catch{}});
})();

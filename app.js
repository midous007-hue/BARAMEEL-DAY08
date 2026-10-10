/* BARAMEEL WORLD — V23.2 INTERACTION + FLOW BUILD
   Presentation/scanner client only. Production game state stays server-side.
   ONE printed QR = BARAMEEL-UNIVERSAL.
*/
(() => {
  const VERSION = '20261008-performance-1';
  const STORAGE = 'barameel.world.player.v23.6';
  const API_BASE = String(window.BARAMEEL_API_BASE || '').replace(/\/$/, '');
  const SUPABASE_URL = String(window.BARAMEEL_SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = String(window.BARAMEEL_SUPABASE_PUBLISHABLE_KEY || '');
  let supa = null;
  let authPromise = null;
  let supabaseLoaderPromise = null;
  const AVATARS = ['avatar01','avatar02','avatar03','avatar04','avatar05','avatar06'];
  const LEGACY_AVATAR_MAP = {rookie:'avatar01',skater:'avatar02',brona:'avatar03',racer:'avatar04',chiller:'avatar05',dreamer:'avatar06'};
  const DEFAULTS = {playerId:null,playerCode:null,nickname:'',avatar:'avatar01',runner:'avatar01',points:0,weeklyPoints:0,rank:null,playerCount:0,checkpoints:[],collected:{collection01:{}},totalScans:0,lastReward:null,runHowItWorksSeen:false,routeProgress:0,routeDistance:null,nextCheckpoint:null,activePath:null,lastSeen:null};
  const memoryStorage = Object.create(null);
  const safeStorage = {
    get(key){ try{return window.localStorage.getItem(key)}catch{return Object.prototype.hasOwnProperty.call(memoryStorage,key)?memoryStorage[key]:null} },
    set(key,value){ try{window.localStorage.setItem(key,value);return true}catch{memoryStorage[key]=String(value);return false} },
    remove(key){ try{window.localStorage.removeItem(key)}catch{} delete memoryStorage[key] }
  };
  const safeSession = {
    get(key){ try{return window.sessionStorage.getItem(key)}catch{return null} },
    set(key,value){ try{window.sessionStorage.setItem(key,value);return true}catch{return false} },
    remove(key){ try{window.sessionStorage.removeItem(key)}catch{} }
  };
  function makeId(prefix='id'){
    try{if(window.crypto?.randomUUID)return prefix+'-'+window.crypto.randomUUID()}catch{}
    try{const a=new Uint8Array(16);window.crypto?.getRandomValues?.(a);if(a.length){return prefix+'-'+Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')}}catch{}
    return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
  }
  let state = loadState();
  if (!state.playerId) { state.playerId = makeId('player'); saveState(); }

  function loadState(){
    const legacyKeys=['barameel.world.player.v23.5','barameel.world.player.v23.4','barameel.world.player.v23.3','barameel.world.player.v23.2'];
    try{
      let raw=safeStorage.get(STORAGE);
      if(!raw){
        for(const key of legacyKeys){
          const legacy=safeStorage.get(key);
          if(legacy){raw=legacy;break}
        }
      }
      const parsed=raw?JSON.parse(raw):{};
      const next={...DEFAULTS,...parsed};
      if(parsed?.weekly_points!=null&&next.weeklyPoints==null)next.weeklyPoints=Number(parsed.weekly_points)||0;
      return next;
    }catch{return {...DEFAULTS}}
  }
  function saveState(){ state.lastSeen = Date.now(); safeStorage.set(STORAGE, JSON.stringify(state)); }
  function patchState(p){ state = {...state,...p}; saveState(); return state; }
  function setNickname(v){ patchState({nickname:String(v||'').trim().slice(0,24)}); }
  function setAvatar(v){const id=String(v||'').toLowerCase();if(AVATARS.includes(id))patchState({avatar:id,runner:id});}
  function setRunner(v){const id=LEGACY_AVATAR_MAP[String(v||'').toLowerCase()]||String(v||'').toLowerCase();if(AVATARS.includes(id))setAvatar(id)}
  function selectedAvatar(){const id=String(state.avatar||'').toLowerCase();return AVATARS.includes(id)?id:(LEGACY_AVATAR_MAP[String(state.runner||'').toLowerCase()]||'avatar01')}
  function selected(){ return selectedAvatar(); }
  function pieces(c='collection01', i='image01'){ return (state.collected?.[c]?.[i]||[]).map(Number).sort((a,b)=>a-b); }
  function hasPiece(c,i,p){ return pieces(c,i).includes(Number(p)); }
  function count(c,i){ return pieces(c,i).length; }
  function mergePlayer(p){
    if(!p) return state;
    const local=state||DEFAULTS;
    const incoming={...p};
    const localPoints=Number(local.points||0);
    const incomingPoints=Number(incoming.points);
    if(Number.isFinite(incomingPoints) && incomingPoints===0 && localPoints>0) incoming.points=localPoints;
    const localWeekly=Number(local.weeklyPoints||0);
    const incomingWeekly=Number(incoming.weeklyPoints??incoming.weekly_points);
    if(Number.isFinite(incomingWeekly) && incomingWeekly===0 && localWeekly>0) incoming.weeklyPoints=localWeekly;
    if(incoming.weekly_points!=null && incoming.weeklyPoints==null) incoming.weeklyPoints=Number(incoming.weekly_points)||0;
    if(incoming.collected){
      const merged={...local.collected};
      for(const [cid,images] of Object.entries(incoming.collected||{})){
        merged[cid]={...(merged[cid]||{})};
        for(const [iid,piecesList] of Object.entries(images||{})){
          merged[cid][iid]=Array.from(new Set([...(merged[cid][iid]||[]).map(Number),...(Array.isArray(piecesList)?piecesList:[]).map(Number)])).sort((a,b)=>a-b);
        }
      }
      incoming.collected=merged;
    }
    if((incoming.lastReward==null || incoming.lastReward==='') && local.lastReward) incoming.lastReward=local.lastReward;
    state={...local,...incoming};
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
    const g=audioCtx.createGain(); g.gain.value=1.38; const limiter=audioCtx.createDynamicsCompressor(); limiter.threshold.value=-7; limiter.knee.value=10; limiter.ratio.value=5; limiter.attack.value=.003; limiter.release.value=.14; g.connect(limiter).connect(audioCtx.destination); audioCtx.master=g;
    return audioCtx;
  }
  function unlockAudio(){const c=audio();if(!c)return;if(c.state==='suspended')c.resume().catch(()=>{});}
  function tone(f,d=.07,type='square',gain=.12,delay=0){
    const c=audio();if(!c)return;
    try{
      const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
      o.type=type;o.frequency.value=f;
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(Math.min(gain*1.3,.28),t+.006);
      g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g).connect(c.master);o.start(t);o.stop(t+d+.02);
    }catch{}
  }
  function playArcadeTap(){unlockAudio();tone(740,.055,'square',.16);tone(1040,.065,'triangle',.12,.045)}
  function playArcadeConfirm(){unlockAudio();[523,659,784,1047].forEach((f,i)=>tone(f,.065,i===3?'triangle':'square',.18,i*.055))}
  function playArcadeBack(){unlockAudio();tone(659,.065,'square',.10);tone(523,.075,'square',.09,.065);tone(392,.10,'triangle',.075,.135)}
  function playArcadeScan(){unlockAudio();[660,880,1175,1568].forEach((f,i)=>tone(f,.052,'square',.16,i*.052))}
  function playArcadeReward(){unlockAudio();[392,494,622,784].forEach((f,i)=>tone(f,.075,i===3?'triangle':'square',.16,i*.07));tone(1047,.11,'triangle',.12,.30)}
  function playArcadeError(){unlockAudio();tone(247,.085,'square',.18);tone(196,.095,'triangle',.16,.085);tone(147,.12,'square',.13,.18)}
  function playReceiptPrint(){
    const c=audio();if(!c)return;
    try{
      const start=c.currentTime;
      const motorGain=c.createGain();motorGain.gain.setValueAtTime(.0001,start);motorGain.connect(c.master);
      const motor=c.createOscillator();motor.type='triangle';motor.frequency.setValueAtTime(82,start);motor.frequency.exponentialRampToValueAtTime(116,start+.62);
      motorGain.gain.exponentialRampToValueAtTime(.045,start+.03);motorGain.gain.exponentialRampToValueAtTime(.0001,start+.76);
      motor.connect(motorGain);motor.start(start);motor.stop(start+.8);
      for(let i=0;i<15;i++){
        const t=start+.05+i*.045,o=c.createOscillator(),g=c.createGain();
        o.type='square';o.frequency.value=118+(i%3)*17;
        g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.032,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.035);
        o.connect(g).connect(c.master);o.start(t);o.stop(t+.045);
      }
      const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*.22),c.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,.35);
      const noise=c.createBufferSource(),filter=c.createBiquadFilter(),ng=c.createGain();noise.buffer=buffer;filter.type='bandpass';filter.frequency.value=2600;filter.Q.value=.65;
      ng.gain.setValueAtTime(.0001,start+.67);ng.gain.exponentialRampToValueAtTime(.075,start+.71);ng.gain.exponentialRampToValueAtTime(.0001,start+.87);
      noise.connect(filter).connect(ng).connect(c.master);noise.start(start+.67);noise.stop(start+.9);
    }catch{}
  }
  function prime(){
    if(bank.completion)return;
    const a=new Audio(SOUND_FILES.completion);a.preload='auto';a.playsInline=true;bank.completion=a;
  }
  function play(k){
    if(k==='tap'){playArcadeTap();return}
    if(k==='confirm'){playArcadeConfirm();return}
    if(k==='back'){playArcadeBack();return}
    if(k==='scan'){playArcadeScan();return}
    if(k==='reward'){playArcadeReward();return}
    if(k==='jackpot'){playJackpot('EPIC',0);return}
    if(k==='error'){playArcadeError();return}
    if(k==='receipt'){playReceiptPrint();return}
    if(k==='select'){playArcadeTap();return}
    if(k==='completion'){
      unlockAudio();prime();const a=bank.completion;
      try{a.currentTime=0;a.volume=.9;const q=a.play();q?.catch(()=>{});return}catch{}
    }
    playArcadeTap();
  }
  // Exact character-specific motif from the earlier approved selection screen.
  function playAvatarSelect(avatar){
    unlockAudio();
    const roots={avatar01:392,avatar02:440,avatar03:494,avatar04:554,avatar05:622,avatar06:698};
    const root=roots[String(avatar||'').toLowerCase()]||494;
    [1,1.25,1.5,2,2.5].forEach((m,i)=>tone(root*m,.065,i===4?'triangle':'square',.18,i*.045));
  }
  // POINTS COUNT-UP — classic BARAMEEL arcade counter. The pitch and number of ticks rise with rarity/value.
  function playPointsCountUp(points,rarity='COMMON'){
    const spec=rewardSpec(rarity,points), value=Math.max(10000,Number(points)||spec.points);
    unlockAudio();
    const root={COMMON:392,UNCOMMON:440,RARE:494,EPIC:554,LEGENDARY:622,MYTHIC:698}[spec.rarity]||494;
    const ratio=Math.max(.1,Math.min(1,value/100000));
    const steps=Math.max(10,Math.min(24,Math.round(10+ratio*14)));
    const span=Math.max(760,Math.min(2200,spec.duration));
    for(let i=0;i<steps;i++){
      const p=i/Math.max(1,steps-1),f=root*(1.0+1.65*p+0.15*ratio*p);
      tone(f, i===steps-1 ? .105 : .072, i%4===3?'triangle':'square', .105+.055*ratio, (span*p)/1000);
    }
    const end=Math.max(.05,(span-120)/1000);
    tone(root*2.5,.13,'triangle',.13+.07*ratio,end);
    tone(root*3,.16,'sine',.10+.075*ratio,end+.075);
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
  function playSelect(value){return playAvatarSelect(LEGACY_AVATAR_MAP[String(value||'').toLowerCase()]||String(value||''))}
  function playCompletionSound(){play('completion')}
  ['pointerdown','touchstart','mousedown','keydown'].forEach(e=>window.addEventListener(e,unlockAudio,{capture:true,passive:true}));

  const RARITY={COMMON:{points:10000,duration:950,volume:.58},UNCOMMON:{points:20000,duration:1200,volume:.62},RARE:{points:40000,duration:1550,volume:.68},EPIC:{points:60000,duration:1900,volume:.74},LEGENDARY:{points:80000,duration:2350,volume:.80},MYTHIC:{points:100000,duration:2850,volume:.88}};
  function rewardSpec(rarity,points){
    const key=String(rarity||'').toUpperCase();
    const spec=RARITY[key]||{points:Number(points)||10000,duration:1400,volume:.65};
    return {...spec,points:Number(points)||spec.points,rarity:key||'REWARD'};
  }
  function go(url){location.href=url;}
  function haptic(kind='tap'){try{const p={tap:[12],confirm:[18,34,22],scan:[16,28,18,42],reward:[24,42,24,58],jackpot:[30,55,30,75,45,90],error:[28,48,28]}[kind]||[12];if(typeof navigator.vibrate==='function')navigator.vibrate(p);document.body?.classList.remove('haptic-pulse');void document.body?.offsetWidth;document.body?.classList.add('haptic-pulse');}catch{}}
  function markRunHowItWorksSeen(){patchState({runHowItWorksSeen:true})}
  function goAfter(url,sound='tap',delay=180){haptic(sound);play(sound);setTimeout(()=>go(url),delay);}
  function idle(fn){if('requestIdleCallback' in window)requestIdleCallback(fn,{timeout:900});else setTimeout(fn,80);}
  function preload(src){const i=new Image();i.decoding='async';i.src=src;return i;}
  function preloadAll(xs){xs.forEach(preload);}
  function flash(target=document.body){let el=target.querySelector?.('.barameel-flash');if(!el){el=document.createElement('div');el.className='barameel-flash';target.appendChild(el);}el.classList.remove('on');void el.offsetWidth;el.classList.add('on');}

  async function loadSupabaseClient(){
    if(window.supabase?.createClient) return true;
    if(supabaseLoaderPromise) return supabaseLoaderPromise;
    supabaseLoaderPromise=new Promise(resolve=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.async=true;s.onload=()=>resolve(!!window.supabase?.createClient);s.onerror=()=>resolve(false);document.head.appendChild(s);});
    return supabaseLoaderPromise;
  }
  async function ensureAuth(){
    if(!SUPABASE_URL||!SUPABASE_KEY)return null;
    if(authPromise)return authPromise;
    authPromise=(async()=>{try{
      if(!await loadSupabaseClient())throw new Error('SUPABASE_CLIENT_UNAVAILABLE');
      if(!supa)supa=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      let {data:{session},error:getError}=await supa.auth.getSession();
      if(getError)throw getError;
      if(!session){const r=await supa.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session;}
      if(!session?.access_token)throw new Error('AUTH_SESSION_MISSING');
      return session;
    }catch(e){console.error('[BARAMEEL AUTH]',e);return null;}})();
    return authPromise;
  }
  function normalizeErrorCode(value=''){
    let c=String(value||'').trim().toUpperCase();
    if(!c)return '';
    c=c.replace(/^ERROR:\s*/,'').replace(/^P0001:\s*/,'').replace(/^POSTGRES ERROR:\s*/,'');
    if(c.includes('CHECKPOINT_NOT_AT_PHYSICAL_LOCATION'))return 'CHECKPOINT_NOT_AT_PHYSICAL_LOCATION';
    if(c.includes('GPS_ACCURACY_TOO_LOW'))return 'GPS_ACCURACY_TOO_LOW';
    if(c.includes('MASTER_QR_REQUIRED'))return 'MASTER_QR_REQUIRED';
    if(c.includes('MASTER_QR_INVALID'))return 'MASTER_QR_INVALID';
    if(c.includes('CHECKPOINT_ALREADY_CLAIMED'))return 'CHECKPOINT_ALREADY_CLAIMED';
    if(c.includes('CHECKPOINT_LOCATION_REQUIRED'))return 'CHECKPOINT_LOCATION_REQUIRED';
    if(c.includes('PLAYER_NOT_INITIALIZED'))return 'PLAYER_NOT_INITIALIZED';
    return c;
  }
  function friendlyError(code=''){
    const c=normalizeErrorCode(code);
    const map={
      NETWORK_ERROR:'CHECK YOUR CONNECTION AND TRY AGAIN.',
      AUTH_UNAVAILABLE:'WE COULDN’T CONNECT YOU. TRY AGAIN.',
      BACKEND_NOT_CONFIGURED:'BARAMEEL RUN IS TEMPORARILY UNAVAILABLE.',
      UNAVAILABLE_AUTH:'WE COULDN’T CONNECT YOU. TRY AGAIN.',
      EXPIRED_TICKET:'THIS SCAN EXPIRED. TRY AGAIN.',
      SCAN_TICKET_REQUIRED:'READYING YOUR SCAN. TRY AGAIN.',
      MASTER_QR_REQUIRED:'SCAN THE OFFICIAL BARAMEEL CHECKPOINT QR TO CONTINUE.',
      HTTP_500:'SOMETHING WENT WRONG. TRY AGAIN.',
      HTTP_502:'SOMETHING WENT WRONG. TRY AGAIN.',
      HTTP_503:'BARAMEEL RUN IS BUSY. TRY AGAIN.',GPS_ACCURACY_REQUIRED:'GPS LOCATION QUALITY IS NEEDED. ENABLE PRECISE LOCATION AND TRY AGAIN.',CHECKPOINT_NOT_CONFIGURED:'CHECKPOINT RUN IS NOT ACTIVE YET.',CHECKPOINT_LOCATION_REQUIRED:'LOCATION IS REQUIRED TO CLEAR A CHECKPOINT.',CHECKPOINT_NOT_ACTIVE:'THAT CHECKPOINT IS NOT ACTIVE.',CHECKPOINT_NOT_FOUND:'THAT CHECKPOINT IS NOT ACTIVE.',CHECKPOINT_TOO_FAR:'MOVE CLOSER TO THE CHECKPOINT AND TRY AGAIN.',CHECKPOINT_NOT_AT_PHYSICAL_LOCATION:'THIS CHECKPOINT IS NOT AT ITS PHYSICAL LOCATION.',GPS_ACCURACY_TOO_LOW:'GPS SIGNAL IS NOT ACCURATE ENOUGH. MOVE TO AN OPEN AREA AND TRY AGAIN.',MASTER_QR_INVALID:'THIS CHECKPOINT QR IS NOT VALID.',CHECKPOINT_ALREADY_CLAIMED:'YOU ALREADY CLEARED THIS CHECKPOINT.',PLAYER_NOT_INITIALIZED:'PLAYER SETUP IS NOT COMPLETE. OPEN BARAMEEL RUN AGAIN.',CHECKPOINT_SCAN_REQUIRED:'SCAN A CHECKPOINT QR FIRST.',RECEIPT_CODE_REQUIRED:'ENTER YOUR RECEIPT CODE.',RECEIPT_CODE_INVALID:'THAT RECEIPT CODE IS NOT VALID.',RECEIPT_CODE_ALREADY_USED:'THAT RECEIPT CODE WAS ALREADY USED.'
    };
    return map[c]||'SOMETHING WENT WRONG. TRY AGAIN.';
  }
  async function api(path,body,method='POST'){
    if(!API_BASE)return {ok:false,code:'BACKEND_NOT_CONFIGURED',error:'BACKEND_NOT_CONFIGURED',message:friendlyError('BACKEND_NOT_CONFIGURED')};
    const session=await ensureAuth();
    if(!session?.access_token)return {ok:false,code:'AUTH_UNAVAILABLE',error:'AUTH_UNAVAILABLE',message:friendlyError('AUTH_UNAVAILABLE')};
    try{
      const r=await fetch(API_BASE+path,{method,headers:{'content-type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+session.access_token},body:body?JSON.stringify(body):undefined,cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){console.error('[BARAMEEL API]',path,r.status,data);const rawCode=[data.code,data.error,data.message].filter(Boolean).join(' ');const code=normalizeErrorCode(rawCode)||`HTTP_${r.status}`;return {ok:false,...data,code,error:data.error||code,message:friendlyError(code)};}
      return data;
    }catch(e){console.error('[BARAMEEL API]',path,e);return {ok:false,code:'NETWORK_ERROR',error:'NETWORK_ERROR',message:friendlyError('NETWORK_ERROR')};}
  }
  async function track(event,meta={}){return api('/analytics',{event_name:event,payload:{...meta,path:location.pathname,ts:Date.now()}});}
  async function syncPlayer(){
    const avatar=selectedAvatar();
    const r=await api('/player',{nickname:state.nickname,avatar,runner:avatar});
    if(r?.player){
      const p={...r.player};
      p.avatar=AVATARS.includes(String(p.avatar||'').toLowerCase())?String(p.avatar).toLowerCase():avatar;
      p.runner=p.avatar;
      if(p.points==null && p.weekly_points!=null)p.points=Number(p.weekly_points)||0;
      if(p.weeklyPoints==null && p.weekly_points!=null)p.weeklyPoints=Number(p.weekly_points)||0;
      mergePlayer(p);
    }
    return r;
  }
  async function scanUniversal({ticketId=null}){
    if(!ticketId)return {ok:false,code:'SCAN_TICKET_REQUIRED',error:'SCAN_TICKET_REQUIRED'};
    const r=await api('/scan',{qr:'BARAMEEL-UNIVERSAL',ticket_id:ticketId,idempotency_key:makeId('scan')});
    if(r?.player)mergePlayer(r.player);
    const reward=r?.reward||normalizeReward(r)||(String(r?.type||'').toLowerCase()==='piece'?r:null);
    if(reward){
      const c=reward.collection_id||reward.collection||'collection01',i=reward.image_id||reward.image||'image01',piece=Number(reward.piece_number||reward.piece||0);
      if(c&&i&&piece){const next={...state.collected};next[c]={...(next[c]||{})};next[c][i]=Array.from(new Set([...(next[c][i]||[]).map(Number),piece]));mergePlayer({collected:next,lastReward:reward});}
    }
    const awarded=Number((r?.points_awarded??r?.points)??0);
    if(Number.isFinite(awarded)&&awarded>0) patchState({points:Number(state.points||0)+awarded,weeklyPoints:Number(state.weeklyPoints||0)+awarded});
    return r;
  }
  async function scanCheckpoint({checkpointId=null,qrToken=null,lat=null,lng=null,accuracyMeters=null}){
    const id=String(checkpointId||'').trim();
    const token=String(qrToken||'').trim();
    if(!token&&!id)return {ok:false,code:'CHECKPOINT_SCAN_REQUIRED',error:'CHECKPOINT_SCAN_REQUIRED'};
    const r=await api('/checkpoint-scan',{qr_token:token||null,checkpoint_id:token?null:id,lat:Number.isFinite(Number(lat))?Number(lat):null,lng:Number.isFinite(Number(lng))?Number(lng):null,accuracy_meters:Number.isFinite(Number(accuracyMeters))?Number(accuracyMeters):null,idempotency_key:makeId('checkpoint')});
    if(r?.player)mergePlayer(r.player);
    if(Array.isArray(r?.checkpoints))mergePlayer({checkpoints:r.checkpoints});
    return r;
  }
  async function duoLink(otherPlayerCode){const r=await api('/duo-link',{player_id:state.playerId,other_player_code:String(otherPlayerCode||'').trim(),idempotency_key:makeId('duo')});if(r?.player)mergePlayer(r.player);return r;}
  async function fetchCollection(id='collection01'){
    const key='barameel.collection.'+id+'.v23.2';
    try{const c=sessionStorage.getItem(key);if(c)return JSON.parse(c);}catch{}
    const r=await fetch(`./assets/collections/${id}/collection.json?v=${VERSION}`,{cache:'no-store'});
    if(!r.ok)throw Error('COLLECTION_UNAVAILABLE');
    const d=await r.json();try{sessionStorage.setItem(key,JSON.stringify(d));}catch{}return d;
  }
  async function listCollections(){
    const key='barameel.collections.index.v23.2';
    try{const cached=sessionStorage.getItem(key);if(cached)return JSON.parse(cached);}catch{}
    const r=await fetch('./assets/collections/index.json?v='+VERSION,{cache:'no-store'});
    if(!r.ok)throw Error('COLLECTION_INDEX_UNAVAILABLE');
    const d=await r.json();
    if(!Array.isArray(d.collections)||!d.collections.length)throw Error('COLLECTION_INDEX_EMPTY');
    const normalized=d.collections.filter(x=>x&&x.id).map(x=>({id:String(x.id),displayName:String(x.displayName||x.name||x.id).toUpperCase(),path:String(x.path||('assets/collections/'+x.id+'/collection.json'))}));
    try{sessionStorage.setItem(key,JSON.stringify(normalized));}catch{}
    return normalized;
  }
  function normalizeReward(result){
    const candidates=[result?.reward,result?.data?.reward,result?.reward_result,result?.data,result];
    for(const raw of candidates){
      if(!raw||typeof raw!=='object') continue;
      const collection_id=raw.collection_id??raw.collection??raw.collectionId;
      const image_id=raw.image_id??raw.image??raw.imageId;
      const piece_number=Number(raw.piece_number??raw.piece??raw.pieceNumber);
      if(collection_id&&image_id&&Number.isFinite(piece_number)&&piece_number>0){
        return {...raw,collection_id:String(collection_id),image_id:String(image_id),piece_number,points:Number(raw.points??raw.points_awarded??result?.points_awarded??result?.points??0),rarity:String(raw.rarity??result?.rarity??'COMMON').toUpperCase()};
      }
    }
    return null;
  }
  function parseUniversalQR(raw){const s=decodeURIComponent(String(raw||'')).trim();if(/^BARAMEEL[-_:]?UNIVERSAL$/i.test(s))return {type:'universal',token:'BARAMEEL-UNIVERSAL'};if(/(?:^|[?&])qr=BARAMEEL-UNIVERSAL(?:&|$)/i.test(s))return {type:'universal',token:'BARAMEEL-UNIVERSAL'};return null;}

  window.BR={VERSION,safeStorage,safeSession,makeId,friendlyError,normalizeReward,AVATARS,RARITY,get state(){return state},setNickname,setAvatar,setRunner,selectedAvatar,selected,playSelect,playAvatarSelect,pieces,hasPiece,count,mergePlayer,play,playSelect,playCompletionSound,haptic,markRunHowItWorksSeen,playPointsCountUp,playJackpot,playRewardReveal,rewardSpec,go,goAfter,idle,preload,preloadAll,flash,api,track,syncPlayer,scanUniversal,scanCheckpoint,duoLink,fetchCollection,listCollections,parseUniversalQR,saveState,ensureAuth,API_BASE};
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js?v='+VERSION,{updateViaCache:'none'}).catch(()=>{});}
  if(document.body?.dataset?.backend==='required') idle(async()=>{const r=await syncPlayer();try{sessionStorage.setItem('barameelPlayerSync',JSON.stringify({ok:!!r?.ok,code:r?.code||null,error:r?.error||null,ts:Date.now()}));}catch{}});
})();

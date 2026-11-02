/* BARAMEEL MENU — image-led screen flow.
   Screen artwork is untouched; transparent native hotspots provide the interactions.
*/
(() => {
  'use strict';
  const A = window.BARAMEEL_MENU_ASSETS || {};
  const page = document.querySelector('[data-barameel-menu]');
  if (!page) return;
  const screen = page.dataset.screen || 'categories';
  const stage = page.querySelector('.bm-menu-stage');
  const flash = page.querySelector('.bm-menu-flash');
  const anatomy = page.querySelector('.bm-menu-anatomy');
  const live = page.querySelector('.bm-menu-live');
  const soundEnabledKey = 'barameel.menu.sound.enabled';
  let audioContext = null;
  let lastTapAt = 0;

  function soundEnabled(){ try{return localStorage.getItem(soundEnabledKey)!=='0'}catch{return true} }
  function unlockAudio(){
    try{
      const C=window.AudioContext||window.webkitAudioContext;
      if(!C)return null;
      audioContext=audioContext||new C();
      if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
      return audioContext;
    }catch{return null}
  }
  function chime(kind='select'){
    if(!soundEnabled())return;
    const c=unlockAudio(); if(!c)return;
    const now=c.currentTime;
    const patterns=kind==='back'?[587,440,330]:kind==='family'?[330,494,659,880]:[392,587,784];
    patterns.forEach((freq,i)=>{
      const o=c.createOscillator(),g=c.createGain();
      o.type=i===patterns.length-1?'triangle':'square';
      o.frequency.setValueAtTime(freq,now+i*.047);
      g.gain.setValueAtTime(.0001,now+i*.047);
      g.gain.exponentialRampToValueAtTime(.075,now+i*.047+.008);
      g.gain.exponentialRampToValueAtTime(.0001,now+i*.047+.105);
      o.connect(g).connect(c.destination);o.start(now+i*.047);o.stop(now+i*.047+.115);
    });
  }
  function haptic(){try{navigator.vibrate?.([10,18,10])}catch{}}
  function impact(target,kind){
    const now=Date.now(); if(now-lastTapAt<110)return; lastTapAt=now;
    page.querySelectorAll('.bm-menu-hotspot.is-selected').forEach(x=>x.classList.remove('is-selected'));
    target?.classList.add('is-selected');
    flash?.classList.remove('on'); if(flash){void flash.offsetWidth;flash.classList.add('on')}
    page.classList.remove('is-transitioning');void page.offsetWidth;page.classList.add('is-transitioning');
    chime(kind);haptic();
  }
  function navigate(url,target,kind){impact(target,kind);setTimeout(()=>{location.href=url},160)}
  page.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault(); const url=el.dataset.go; if(url)navigate(url,el,el.dataset.sound||'select');
  }));
  if(stage){stage.addEventListener('click',()=>{
    if(screen==='product'&&anatomy){anatomy.classList.add('is-open');anatomy.setAttribute('aria-hidden','false');chime('family');live.textContent='NANO VOLT product anatomy opened';}
  });}
  function closeAnatomy(){if(!anatomy)return;anatomy.classList.remove('is-open');anatomy.setAttribute('aria-hidden','true');chime('back');}
  anatomy?.querySelectorAll('[data-close-anatomy]').forEach(el=>el.addEventListener('click',closeAnatomy));
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&anatomy?.classList.contains('is-open'))closeAnatomy()});
  const soundToggle=page.querySelector('[data-sound-toggle]');
  soundToggle?.addEventListener('click',()=>{const enabled=!soundEnabled();try{localStorage.setItem(soundEnabledKey,enabled?'1':'0')}catch{}soundToggle.setAttribute('aria-pressed',String(enabled));if(enabled)chime('select')});
})();

/* BARAMEEL WORLD — lightweight PWA install invitation */
(() => {
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;
  const KEY = 'barameel-pwa-invite-dismissed-v2';
  const SESSION_KEY = 'barameel-pwa-invite-hidden-session-v2';
  let deferredPrompt = null;
  let helpOpen = false;
  try { if (localStorage.getItem(KEY) === '1') return; } catch {}

  const style = document.createElement('style');
  style.textContent = `
    #bw-install-card{position:fixed;z-index:99999;left:14px;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));max-width:460px;margin:0 auto;padding:14px 15px;background:#14234F;color:#F5E9D2;border:2px solid #F2A93B;border-radius:16px;box-shadow:0 12px 36px #0009;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;gap:12px;align-items:center}
    #bw-install-card[hidden],#bw-install-help[hidden]{display:none}
    #bw-install-card img{width:54px;height:54px;object-fit:contain;flex-shrink:0;border-radius:10px}
    #bw-install-copy{min-width:0;flex:1}
    #bw-install-copy strong{display:block;font-size:14px;line-height:1.25;letter-spacing:.2px}
    #bw-install-copy span{display:block;font-size:12px;line-height:1.4;margin-top:4px;opacity:.9}
    #bw-install-actions{display:flex;flex-direction:column;gap:7px;flex-shrink:0}
    #bw-install-actions button{font:700 12px system-ui;border:0;border-radius:9px;padding:10px 11px;cursor:pointer}
    #bw-install-now{background:#F2A93B;color:#14234F}
    #bw-install-later{background:transparent;color:#F5E9D2;border:1px solid #F5E9D2!important;padding:6px!important}
    #bw-install-help{position:fixed;inset:0;z-index:100000;background:#020817cc;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #bw-install-help-panel{width:min(100%,420px);background:#F5E9D2;color:#14234F;border:3px solid #F2A93B;border-radius:18px;padding:22px;box-shadow:0 20px 60px #0008}
    #bw-install-help-panel h2{margin:0 0 10px;font-size:20px}
    #bw-install-help-panel p,#bw-install-help-panel li{font-size:14px;line-height:1.55}
    #bw-install-help-panel ol{padding-inline-start:22px}
    #bw-install-help-close{display:block;width:100%;padding:12px;border:0;border-radius:10px;background:#14234F;color:#F5E9D2;font-weight:700;margin-top:16px}
    @media(max-width:380px){#bw-install-card{left:8px;right:8px;padding:10px;gap:8px}#bw-install-card img{width:44px;height:44px}#bw-install-copy strong{font-size:12px}#bw-install-copy span{font-size:11px}#bw-install-actions button{padding:9px 8px;font-size:11px}}
    @media(prefers-reduced-motion:no-preference){#bw-install-card{animation:bwInstallIn .35s ease-out}@keyframes bwInstallIn{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}}
  `;
  document.head.appendChild(style);

  const card = document.createElement('aside');
  card.id = 'bw-install-card';
  card.hidden = true;
  card.setAttribute('aria-label', 'Add BARAMEEL WORLD to your home screen');
  card.innerHTML = `
    <img src="./icon-192.png" alt="">
    <div id="bw-install-copy"><strong>BARAMEEL WORLD</strong><span>أضف عالم براميل إلى شاشة موبايلك وافتحه بضغطة واحدة.</span></div>
    <div id="bw-install-actions"><button id="bw-install-now" type="button">إضافة عالم براميل</button><button id="bw-install-later" type="button" aria-label="إغلاق">لاحقًا ×</button></div>`;
  document.body.appendChild(card);

  const help = document.createElement('div');
  help.id = 'bw-install-help';
  help.hidden = true;
  help.innerHTML = `
    <section id="bw-install-help-panel" role="dialog" aria-modal="true" aria-labelledby="bw-install-help-title">
      <h2 id="bw-install-help-title">ضيف BARAMEEL WORLD</h2>
      <p id="bw-install-help-intro">خلي عالم براميل على شاشة موبايلك عشان تفتحه بسرعة في أي وقت.</p>
      <ol id="bw-install-help-steps"></ol>
      <button id="bw-install-help-close" type="button">تمام</button>
    </section>`;
  document.body.appendChild(help);

  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
  function showHelp() {
    const steps = help.querySelector('#bw-install-help-steps');
    steps.replaceChildren();
    const items = isIOS()
      ? ['افتح اللعبة في متصفح Safari.','اضغط زر المشاركة (المربع والسهم لأعلى).','اختار “Add to Home Screen” أو “إضافة إلى الشاشة الرئيسية”.','اضغط “Add” أو “إضافة”.']
      : ['افتح قائمة المتصفح (⋮).','اختار “Install app” أو “Add to Home screen”.','أكد الإضافة، وهتظهر أيقونة براميل على الشاشة الرئيسية.'];
    items.forEach(text => { const li=document.createElement('li'); li.textContent=text; steps.appendChild(li); });
    help.hidden = false;
    helpOpen = true;
  }
  function dismiss() {
    card.hidden = true;
    help.hidden = true;
    try { localStorage.setItem(KEY, '1'); } catch {}
  }
  card.querySelector('#bw-install-now').addEventListener('click', async () => {
    if (deferredPrompt) {
      const installPrompt = deferredPrompt;
      deferredPrompt = null;
      card.hidden = true;
      installPrompt.prompt();
      let outcome = 'dismissed';
      try { outcome = (await installPrompt.userChoice)?.outcome || 'dismissed'; } catch {}
      if (outcome === 'accepted') {
        try { localStorage.setItem(KEY, '1'); } catch {}
      } else {
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      }
    } else {
      showHelp();
    }
  });
  card.querySelector('#bw-install-later').addEventListener('click', dismiss);
  help.querySelector('#bw-install-help-close').addEventListener('click', () => { help.hidden=true; helpOpen=false; });
  help.addEventListener('click', e => { if(e.target===help){help.hidden=true;helpOpen=false;} });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    card.querySelector('#bw-install-now').textContent = 'تثبيت الآن';
    let hiddenThisSession = false;
    try { hiddenThisSession = sessionStorage.getItem(SESSION_KEY) === '1'; } catch {}
    if (!hiddenThisSession) card.hidden = false;
  });
  window.addEventListener('appinstalled', () => { card.hidden=true; try {localStorage.setItem(KEY,'1')}catch{} });
  // Do not advertise a native install before Chrome confirms it can install the PWA.
  // The old timer showed a fake install invitation even when no install prompt existed,
  // sending Android users to manual "Add to Home screen" and creating only a shortcut.
  // iOS has no beforeinstallprompt event, so keep its explicit Safari instructions.
  window.setTimeout(() => {
    if (isIOS() && !helpOpen && !window.matchMedia('(display-mode: standalone)').matches && window.navigator.standalone !== true) {
      let hiddenThisSession = false;
      try { hiddenThisSession = sessionStorage.getItem(SESSION_KEY) === '1'; } catch {}
      if (!hiddenThisSession) card.hidden = false;
      card.querySelector('#bw-install-now').textContent = 'طريقة الإضافة';
    }
  }, 2200);
})();
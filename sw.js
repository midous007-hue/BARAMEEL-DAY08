const CACHE='barameel-world-performance-58';
const CORE=['./','./index.html','./world.html?v=20261010-neon-logo-19','./how-it-works.html?v=20261010-run-transition-1','./run.html?v=20261010-run-transition-1','./assets/screen01-start.webp?v=20261010-run-transition-1','./assets/screen06-puzzle.webp?v=20261023-piece-separators-1','./styles.css','./barameel-flow.css','./barameel-flow.js','./config.js','./app.js?v=20261015-master-qr-2','./run.html?v=20261011-run-engine-5','./assets/run-car-lights-off.webp?v=20261011-run-engine-5','./assets/run-car-lights-on.webp?v=20261011-run-engine-5','./assets/run-bruna-car.webp?v=20261011-run-engine-5','./assets/run-classic-engine-start.mp3?v=20261011-run-engine-5','./assets/barameel-run-mode-select.webp?v=20261011-mode-select-1','./run-briefing.html?v=20261011-compass-stable-1','./assets/alexandria-stage01-map.webp?v=20261010-map-1','./assets/barameel-world-splash.webp','./assets/barameel-world.webp','./assets/barameel-map-style.json?v=20261008-performance-2','./route-map.html?v=20261020-navigation-stability-1','./assets/route-map-v49.webp?v=20261010-skip-flow-1','./screen02.html?v=20261011-avatar-art-10','./assets/avatar-selection-twilight.webp?v=20261011-avatar-art-10','./assets/barameel-run-avatar-logo.web.webp?v=20261011-avatar-art-10'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET') return;
 const req=event.request,url=new URL(req.url);
 if(url.origin!==location.origin) return;
 event.respondWith(caches.match(req).then(cached=>{
   const network=fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});}return response;}).catch(()=>cached);
   return cached||network;
 }));
});
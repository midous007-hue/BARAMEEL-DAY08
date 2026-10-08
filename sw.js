const CACHE='barameel-world-performance-1';
const CORE=['./','./index.html','./world.html','./styles.css','./barameel-flow.css','./barameel-flow.js','./config.js','./app.js','./assets/barameel-world-splash.webp','./assets/barameel-world.webp','./assets/barameel-map-style.json'];
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
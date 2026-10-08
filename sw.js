const CACHE='barameel-world-v23.5-redeploy-29.4';
const CORE=[
'./','./index.html','./world.html','./how-it-works.html','./start-flash.html','./run.html',
'./screen02.html','./screen04.html','./screen05.html','./screen06.html',
'./route-map.html','./checkpoint-scanner.html','./checkpoint-found.html','./barameel-final-zone.html',
'./new-collection-piece.html','./receipt-code.html','./verifying-code.html',
'./reveal-barameel-box.html','./your-barameel-drop.html','./rewarded-added.html','./run-complete.html',
'./leaderboard.html','./marks-wallet.html','./barameel-marks.html','./styles.css','./barameel-flow.css',
'./barameel-flow.js','./config.js','./app.js?v=20261007-26.2','./assets/collections/index.json'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{
  await Promise.allSettled(CORE.map(url=>cache.add(url).catch(()=>null)));
}).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
  }).catch(()=>caches.match(event.request)));
});

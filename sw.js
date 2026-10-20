/* SELIGER: conservative offline app shell.
 * Caches only files hosted in this repository; does NOT bulk-download OSM tiles,
 * publisher imagery, or external APIs. Users should not rely on it for navigation.
 */
const CACHE='seliger-trip-20261020-v4';
const FILES=['./','./index.html','./app.js','./chart-core.js','./mobile.js','./mobile.css','./map.js','./favicon.svg','./data/latest.json','./data/history.json','./data/reports.json','./data/map_points.json','./data/research_areas.json','./data/area_anchors.json','./data/trip_base.json','./data/trip_scenarios.json','./data/water.json','./data/water_history.json','./data/forum_scan_state.json'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  await Promise.allSettled(FILES.map(async url=>{
   const response=await fetch(url,{cache:'reload'});
   if(response.ok)await cache.put(url,response);
  }));
  await self.skipWaiting();
 }));
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('seliger-trip-')&&key!==CACHE).map(key=>caches.delete(key)))),
  self.clients.claim()
 ]));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 const url=new URL(request.url);
 const isDataset=url.pathname.includes('/data/')&&url.pathname.endsWith('.json');
 if(isDataset){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{
    const live=await fetch(request);
    if(!live.ok)throw new Error('HTTP '+live.status);
    await cache.put(request,live.clone());
    return live;
   }catch(error){
    const stored=await cache.match(request,{ignoreSearch:true});
    return stored||new Response(JSON.stringify({offline:true,error:'Ранее сохранённые данные недоступны'}),{status:503,headers:{'Content-Type':'application/json; charset=utf-8'}});
   }
  })());
  return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // Network-first avoids pinning an old version when GitHub Pages updates.
  // The previously visited copy remains available offline.
  try{
   const res=await fetch(request);
   if(res.ok)await cache.put(request,res.clone());
   return res;
  }catch(error){
   const found=await cache.match(request,{ignoreSearch:true});
   return found||cache.match('./index.html')||new Response('Нет интернета. Открой SELIGER после подключения к сети.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
 })());
});

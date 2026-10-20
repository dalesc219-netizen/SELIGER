/* SELIGER map: source-grounded, approximate fishing reports only. No fabricated depth data. */
(()=>{'use strict';
const root=document.getElementById('mapPage');if(!root)return;
const mapEl=document.getElementById('seligerMap'),list=document.getElementById('mapReports'),count=document.getElementById('mapCount'),status=document.getElementById('mapStatus');
let map=null,markers=null,records=[],filter='all',userMarker=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','&quot;',"'":'&#39;'}[c]));
function visible(r){return filter==='all'||r.fish.some(f=>f.toLowerCase().includes(filter))}
function makeCard(r){
 const el=document.createElement('article');el.className='m-box map-report-card';el.dataset.reportId=r.id;
 const type=r.accuracy==='settlement'?'ориентир: населённый пункт':'ориентир: участок акватории';
 el.innerHTML='<div class="report-head"><strong>'+esc(r.name)+'</strong><time>'+esc(r.observed_at)+'</time></div>'+
 '<p class="source-note">'+esc(type)+' · зона неопределённости до '+Number(r.radius_m/1000).toFixed(1)+' км</p>'+
 '<p>'+esc(r.summary)+'</p><p class="source-note">Рыба: '+r.fish.map(esc).join(', ')+'</p>'+
 '<div class="map-card-actions"><button type="button" data-focus="'+esc(r.id)+'">Найти район на карте</button><a href="'+esc(r.source)+'" target="_blank" rel="noopener noreferrer">Сообщение #'+esc(r.post_number)+' ↗</a></div>';
 return el;
}
function redraw(){
 const selected=records.filter(visible);list.replaceChildren(...selected.map(makeCard));count.textContent=selected.length+' ориентиров';
 if(map&&markers){markers.clearLayers();for(const r of selected){
  const p=L.circleMarker([r.lat,r.lon],{radius:9,color:'#dcf6dd',weight:2,fillColor:r.kind==='catch'?'#26b29d':'#cda67b',fillOpacity:.85}).addTo(markers);
  const area=L.circle([r.lat,r.lon],{radius:r.radius_m,weight:1,color:'#80c9c3',opacity:.5,fillColor:'#69b9ae',fillOpacity:.06,dashArray:'4 6'}).addTo(markers);
  p.bindPopup('<strong>'+esc(r.name)+'</strong><p>'+esc(r.summary)+'</p><p>Не точка ловли. Погрешность до '+(r.radius_m/1000).toFixed(1)+' км.</p><a href="'+esc(r.source)+'" target="_blank" rel="noopener noreferrer">Исходное сообщение ↗</a>',{maxWidth:270});
  r._marker=p;
 }}
}
function fallback(){
 status.textContent='Для интерактивной карты требуется подключение к сети. Список ориентиров и ссылки доступны ниже.';
 mapEl.innerHTML='<iframe title="Карта Селигера OpenStreetMap" src="https://www.openstreetmap.org/export/embed.html?bbox=32.55%2C57.05%2C33.45%2C57.48&layer=mapnik" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;border:0"></iframe>';
}
function initMap(){
 if(map||!root.classList.contains('active'))return;
 if(typeof window.L==='undefined'){fallback();return}
 map=L.map(mapEl,{zoomControl:false,preferCanvas:true}).setView([57.245,33.045],10);
 L.control.zoom({position:'bottomright'}).addTo(map);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
 markers=L.layerGroup().addTo(map);
 status.textContent='Карта: OpenStreetMap · кружки обозначают район, а не место поклёвки.';
 redraw();requestAnimationFrame(()=>map.invalidateSize());setTimeout(()=>map.invalidateSize(),350);
}
list.addEventListener('click',e=>{const btn=e.target.closest('[data-focus]');if(!btn)return;const r=records.find(x=>x.id===btn.dataset.focus);if(!r)return;if(map){map.setView([r.lat,r.lon],12,{animate:true});r._marker?.openPopup();mapEl.scrollIntoView({behavior:'smooth',block:'center'})}else{window.open('https://www.openstreetmap.org/?mlat='+r.lat+'&mlon='+r.lon+'#map=12/'+r.lat+'/'+r.lon,'_blank','noopener')}});
root.querySelector('#mapFilter').addEventListener('change',e=>{filter=e.target.value;redraw()});
root.querySelector('#mapGps').addEventListener('click',()=>{
 const button=root.querySelector('#mapGps');if(!navigator.geolocation){status.textContent='На этом устройстве GPS недоступен';return}
 button.disabled=true;status.textContent='Запрашиваем разрешение на геопозицию…';
 navigator.geolocation.getCurrentPosition(pos=>{
  button.disabled=false;const lat=pos.coords.latitude,lon=pos.coords.longitude;
  status.textContent='GPS: приблизительная точность ±'+Math.round(pos.coords.accuracy)+' м';
  if(!map){window.open('https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lon+'#map=13/'+lat+'/'+lon,'_blank','noopener');return}
  if(userMarker)map.removeLayer(userMarker);
  userMarker=L.circleMarker([lat,lon],{radius:8,color:'#fff',weight:3,fillColor:'#54a7ee',fillOpacity:1}).addTo(map).bindPopup('Моё местоположение по GPS');
  map.setView([lat,lon],13);userMarker.openPopup();
 },e=>{button.disabled=false;status.textContent='GPS не получен: '+e.message},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
});
window.addEventListener('seliger:tab',e=>{if(e.detail?.id==='map')initMap();else if(map&&e.detail?.id==='charts')setTimeout(()=>map.invalidateSize(),150)});
(async()=>{
 try{const response=await fetch('data/map_points.json?ts='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const d=await response.json();
 records=(d.points||[]).filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)&&Array.isArray(r.fish)&&r.source);
 const non=document.getElementById('unlocatedReports');if(non)non.textContent=(d.unlocated_references||[]).length+' сообщения не нанесены: точное место не указано.';
 redraw();if(root.classList.contains('active'))initMap();
 }catch(e){count.textContent='Нет данных точек';status.textContent='Не удалось загрузить отчёты. Карта доступна без маркеров.'}
})();
})();
/* SELIGER map: source-grounded, approximate fishing reports only. No fabricated depth data. */
(()=>{'use strict';
const root=document.getElementById('mapPage');if(!root)return;
const mapEl=document.getElementById('seligerMap'),list=document.getElementById('mapReports'),count=document.getElementById('mapCount'),status=document.getElementById('mapStatus');
let map=null,markers=null,records=[],filter='all',userMarker=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function visible(r){return filter==='all'||r.fish.some(f=>f.toLowerCase().includes(filter))}
function makeCard(r){
 const el=document.createElement('article');el.className='m-box map-report-card';el.dataset.reportId=r.id;
 const type=r.accuracy==='settlement'?'ориентир: населённый пункт':'ориентир: участок акватории';
 el.innerHTML='<div class="report-head"><strong>'+esc(r.name)+'</strong><time>'+esc(r.observed_at)+'</time></div>'+
 '<p class="source-note">'+esc(type)+' · условный район вокруг ориентира ~'+Number(r.radius_m/1000).toFixed(1)+' км</p>'+
 '<p>'+esc(r.summary)+'</p><p class="source-note">Рыба: '+r.fish.map(esc).join(', ')+'</p>'+
 '<div class="map-card-actions"><button type="button" data-focus="'+esc(r.id)+'">Найти район на карте</button><a href="'+esc(r.source)+'" target="_blank" rel="noopener noreferrer">Сообщение #'+esc(r.post_number)+' ↗</a></div>';
 return el;
}
function redraw(){
 const selected=records.filter(visible);list.replaceChildren(...selected.map(makeCard));count.textContent=selected.length+' ориентиров';
 if(map&&markers){markers.clearLayers();for(const r of selected){
  const p=L.circleMarker([r.lat,r.lon],{radius:9,color:'#dcf6dd',weight:2,fillColor:r.kind==='catch'?'#26b29d':'#cda67b',fillOpacity:.85}).addTo(markers);
  const area=L.circle([r.lat,r.lon],{radius:r.radius_m,weight:1,color:'#80c9c3',opacity:.5,fillColor:'#69b9ae',fillOpacity:.06,dashArray:'4 6'}).addTo(markers);
  p.bindPopup('<strong>'+esc(r.name)+'</strong><p>'+esc(r.summary)+'</p><p>Не точка ловли. Условный район ~'+(r.radius_m/1000).toFixed(1)+' км, не измеренная GPS-точность.</p><a href="'+esc(r.source)+'" target="_blank" rel="noopener noreferrer">Исходное сообщение ↗</a>',{maxWidth:270});
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
root.querySelector('#toggleHistoricalDepths').addEventListener('click',()=>{
 const holder=root.querySelector('#depthsFrameContainer'),frame=root.querySelector('#depthsFrame'),button=root.querySelector('#toggleHistoricalDepths');
 holder.hidden=!holder.hidden;
 button.textContent=holder.hidden?'Показать карту глубин':'Скрыть карту глубин';
 if(!holder.hidden){
  if(!frame.getAttribute('src'))frame.setAttribute('src','https://etomesto.com/map.php?map=3723&secret=187f65f&x=33.096397&y=57.156052');
  holder.scrollIntoView({behavior:'smooth',block:'center'});
 }
});
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
/* Research zones are intentionally separate from geographic report pins. */
let researchAreas=[];
const researchList=root.querySelector('#researchAreaCards'),researchCount=root.querySelector('#researchCount');
const fishGroup={мирная:['плотва','подлещик','лещ','густера','язь','линь']};
function researchFiltered(r){
 const fish=root.querySelector('#researchSpecies').value,season=root.querySelector('#researchSeason').value;
 const matchFish=fish==='all'||(fish==='мирная'?r.species.some(x=>fishGroup.мирная.includes(x)):r.species.includes(fish));
 const matchSeason=season==='all'||(season==='october'?r.october_evidence_count>0:r.is_confirmed_october_catch===true);
 return matchFish&&matchSeason;
}
function researchDraw(){
 const rows=researchAreas.filter(researchFiltered);researchList.replaceChildren();
 researchCount.textContent=rows.length+' из '+researchAreas.length+' районов';
 if(!rows.length){researchList.textContent='Подтверждённых районов с такими условиями нет.';return}
 for(const r of rows){
  const article=document.createElement('article');article.className='research-area-card';
  const dates=r.october_evidence_count>0?'Октябрьские записи: '+r.october_evidence_count:'Октябрьские уловы не подтверждены';
  const depth=r.depth_range_m?.length===2?'Из отдельных отчётов: '+r.depth_range_m.join('–')+' м':'Подтверждённых глубин нет';
  const links=(r.source_urls||[]).slice(0,6).map((u,i)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Источник '+(i+1)+' ↗</a>').join(' ');
  article.innerHTML='<div class="report-head"><strong>'+esc(r.name)+'</strong><span class="research-accuracy">класс '+esc(r.location_accuracy)+'</span></div><p class="research-evidence">'+esc(dates)+' · авторских источников: '+Number(r.independent_sources_count||0)+'</p><p>Рыба: '+r.species.map(esc).join(', ')+'</p><p>'+esc(depth)+'</p><p>'+esc(r.evidence_summary)+'</p><p class="research-negative"><b>Ограничения:</b> '+esc(r.negative_reports||r.limitations)+'</p><div class="research-links">'+links+'</div><p class="source-note">Точка поимки не установлена — GPS не публикуем.</p>';
  researchList.append(article);
 }
}
for(const id of ['researchSpecies','researchSeason'])root.querySelector('#'+id).addEventListener('change',researchDraw);
(async()=>{try{const r=await fetch('data/research_areas.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();researchAreas=(d.areas||[]).filter(x=>x&&x.latitude===null&&x.longitude===null&&Array.isArray(x.species));researchDraw()}catch(e){researchCount.textContent='Данные недоступны';researchList.textContent='Не удалось загрузить исследовательские районы.'}})();
(async()=>{try{
 const response=await fetch('data/forum_scan_state.json?ts='+Date.now(),{cache:'no-store'});
 if(!response.ok)return;const d=await response.json();
 const el=document.getElementById('forumCoverage');
 if(!el)return;
 el.textContent='Проверка форума: '+(d.pages_completed||0)+' из '+(d.estimated_total_pages||248)+' страниц основной темы · '+(d.candidate_count||0)+' сообщений на ручную проверку. '+(d.status==='blocked'||d.status==='robots_disallow'?'Автоматический доступ ограничен.':d.status==='complete'?'Архив индексирован.':'Разбор продолжается; найденные упоминания НЕ становятся GPS-метками автоматически.');
}catch(e){}})();
(async()=>{
 try{const response=await fetch('data/map_points.json?ts='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const d=await response.json();
 records=(d.points||[]).filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)&&Array.isArray(r.fish)&&r.source);
 const non=document.getElementById('unlocatedReports');if(non)non.textContent=(d.unlocated_references||[]).length+' сообщения не нанесены: точное место не указано.';
 redraw();if(root.classList.contains('active'))initMap();
 }catch(e){count.textContent='Нет данных точек';status.textContent='Не удалось загрузить отчёты. Карта доступна без маркеров.'}
})();
})();
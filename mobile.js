(() => {
'use strict';
const $=id=>document.getElementById(id);
const nav=document.createElement('nav');nav.className='mobile-nav';nav.setAttribute('aria-label','Разделы приложения');
nav.innerHTML=[['today','◉','Сегодня'],['charts','▥','Графики'],['map','⌖','Карта'],['water','≈','Вода'],['reports','≋','Отчёты']].map(([id,ico,label])=>'<button type="button" data-tab="'+id+'" aria-label="'+label+'"><span class="navicon">'+ico+'</span>'+label+'</button>').join('');
document.body.append(nav);
const networkBadge=document.createElement('div');networkBadge.id='networkBadge';networkBadge.className='network-badge';networkBadge.setAttribute('role','status');networkBadge.setAttribute('aria-live','polite');
networkBadge.textContent='Офлайн: показаны последние сохранённые данные. Карта глубин и подложка могут быть недоступны.';
document.body.append(networkBadge);
const updateNetwork=()=>{const offline=!navigator.onLine;networkBadge.classList.toggle('show',offline);networkBadge.hidden=!offline;};
window.addEventListener('offline',updateNetwork);window.addEventListener('online',updateNetwork);updateNetwork();
const dock=document.createElement('aside');dock.id='weatherDock';dock.className='weather-dock';dock.setAttribute('aria-label','Погодные показатели · быстрый переход к графикам');
dock.innerHTML=[
 ['tempChart','thermo','🌡','temp','Температура'],
 ['windChart','wind','➤','wind','Ветер'],
 ['rainChart','rain','◉','bite','Осадки'],
 ['pressureChart','pressure','◎','pressure','Давление']
].map(([target,klass,ico,source,title])=>'<button type="button" class="dock-item '+klass+'" data-chart="'+target+'" aria-label="'+title+'" title="'+title+'"><span class="dock-symbol">'+ico+'</span><span class="dock-value" data-source="'+source+'">—</span></button>').join('');
document.body.append(dock);
let activeDock='tempChart';
function markDock(id){activeDock=id;dock.querySelectorAll('button').forEach(b=>b.classList.toggle('dock-active',b.dataset.chart===id));}
function syncDock(){dock.querySelectorAll('[data-source]').forEach(x=>{const src=document.getElementById(x.dataset.source);if(src)x.textContent=src.textContent.trim()||'—'})}
markDock(activeDock);
dock.addEventListener('click',e=>{const b=e.target.closest('[data-chart]');if(!b)return;markDock(b.dataset.chart);tab('charts');setTimeout(()=>document.getElementById(b.dataset.chart)?.closest('.panel')?.scrollIntoView({behavior:'smooth',block:'start'}),110)});
document.addEventListener('seliger:weather',syncDock);
const sourceIds=['temp','wind','bite','pressure'];
const observer=new MutationObserver(syncDock);
sourceIds.forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,characterData:true,subtree:true})});

const main=document.querySelector('main');
const controls=main.querySelector('.controls'),metrics=main.querySelector('.metrics'),grid=main.querySelector('.grid');
const weather=document.createElement('div');weather.className='weather-strip';weather.id='daystrip';weather.setAttribute('aria-label','Ближайшие три дня');
metrics.after(weather);
const tripHeading=document.createElement('div');tripHeading.className='trip-heading';
tripHeading.innerHTML='<strong>Поездка · 22–25 октября</strong><span id="tripSource">Загружаем прогноз…</span><small class="trip-base-note">Старт: база «Ладья» · Бараново, 18 · свой причал</small>';
metrics.after(tripHeading);

const analytical=main.querySelector('.species'),sectionTitle=main.querySelector('.section'),safety=main.querySelector('#safety'),foot=main.querySelector('.foot');
const today=[main.querySelector('header'),main.querySelector('.top'),metrics,tripHeading,weather,sectionTitle,analytical,safety,foot];
const chartSections=[controls,grid];
const chartJump=document.createElement('div');chartJump.className='chart-jumps';chartJump.setAttribute('aria-label','Быстрый переход к графикам');
chartJump.innerHTML=[['tempChart','Температура'],['windChart','Ветер'],['rainChart','Осадки'],['pressureChart','Давление'],['biteChart','Клёв'],['historyChart','История']].map(([id,name])=>'<button type="button" data-chart="'+id+'">'+name+'</button>').join('');
controls.after(chartJump);
chartSections.push(chartJump);
chartJump.addEventListener('click',event=>{const b=event.target.closest('[data-chart]');if(!b)return;const target=document.getElementById(b.dataset.chart);if(target){markDock(b.dataset.chart);target.closest('.panel')?.scrollIntoView({behavior:'smooth',block:'start'});b.blur();}});

today.forEach(x=>x.dataset.view='today');chartSections.forEach(x=>x.dataset.view='charts');
const reports=document.createElement('section');reports.className='mobile-page';reports.id='reportsPage';reports.dataset.view='reports';
reports.innerHTML='<h2 class="m-title">Селигер · рыболовный радар</h2><div class="m-box"><h3>Русфишинг: отчёты с водоёма</h3><p>Открывай оригинальные сообщения рыболовов. Пока это ссылки на источники, а не автоматическая выгрузка; свежесть уловов приложение не выдумывает.</p><p><a href="https://www.rusfishing.ru/forum/threads/seliger.1485/unread" target="_blank" rel="noopener noreferrer">↗ Последние сообщения по Селигеру</a></p><p><a href="https://www.rusfishing.ru/forum/forums/ozero-seliger.80/" target="_blank" rel="noopener noreferrer">↗ Темы по плёсам и акваториям</a></p><p class="source-note">Идея перенесена из RYBA: отделяем отзывы с водоёма от модельного прогноза и проверяем давность сообщения. Без даты и подтверждения места не корректируем индекс клёва.</p></div><div class="m-box"><h3>Октябрьские ориентиры</h3><p><b>Судак:</b> проверять локальные ямы и бровки, ориентируясь на эхолот; в сумерках учитывать сокращение светового дня.</p><p><b>Щука:</b> искать границы травы, пупки и перепады глубин. Не считать один отчёт доказательством общей активности.</p><p><b>Окунь:</b> оценивать скопления кормовой рыбы и участки с меньшим волнением.</p></div><div class="m-box"><h3>Безопасность с лодки</h3><p>На Селигере ветер у Осташкова не гарантирует такую же волну на другом плёсе. Для открытой воды особенно важны направление ветра, длина разгона волны и фактические порывы.</p><p>Осенью: постоянно надетый спасжилет, связь, сухой аварийный комплект и маршрут возвращения. Данные сайта не являются разрешением на выход.</p></div>';
grid.after(reports);
const waterPage=document.createElement('section');waterPage.className='mobile-page';waterPage.id='waterPage';waterPage.dataset.view='water';
waterPage.innerHTML='<h2 class="m-title">Селигер · вода</h2><div class="water-grid"><article class="m-box"><h3>Уровень воды · Осташков</h3><div class="water-reading" id="lakeLevel">—</div><p id="lakeLevelDate">Загружаем измерения…</p></article><article class="m-box"><h3>Температура воды</h3><div class="water-reading" id="lakeTemperature">—</div><p id="lakeTemperatureDate">Проверяем доступные измерения…</p></article></div><p class="source-note" id="lakeCaution">Уровень — сантиметры над нулём гидропоста, не глубина озера. Устаревшие измерения не используем как текущие.</p><p><a href="https://ris.kim-online.ru/" target="_blank" rel="noopener noreferrer">Первоисточник: Канал имени Москвы ↗</a></p><p><a href="https://allrivers.info/gauge/seliger-ostashkov" target="_blank" rel="noopener noreferrer">История гидропоста и температуры воды ↗</a></p><div class="m-box"><h3>Что важно для клёва 22–25 октября</h3><p>Сильнее одного числа температуры важны её изменение, перемешивание верхнего слоя ветром, устойчивость уровня, расположение кормовой рыбы и рельеф.</p><p>Ветер и порывы влияют и на возможность безопасно ловить с лодки. Данные по волне открытых плёсов не выдаются за измеренные, если нет проверенного источника.</p><p>Время суток, освещённость и изменения давления рассматриваем как вспомогательные факторы, а не гарантии улова.</p></div>';
const trendCard=document.createElement('div');trendCard.className='m-box';trendCard.innerHTML='<h3>Изменение уровня воды</h3><div id="waterTrend" class="source-note">Загружаем историю измерений…</div>';waterPage.append(trendCard);
waterPage.insertAdjacentHTML('beforeend','<div class="m-box"><h3>Факторы для прогноза клёва</h3><div class="factor-grid"><div><b>Уровень и динамика</b><p>Гидропост Осташков / Канал имени Москвы. Важно изменение, а не только отметка.</p></div><div><b>Температура воды</b><p>Датированные измерения гидропоста. Пока нет свежих данных — не включаем в индекс.</p></div><div><b>Ветер и порывы</b><p>Open-Meteo; особенно важны направление ветра и разгон волны на открытых плёсах.</p></div><div><b>Давление и его изменение</b><p>Open-Meteo, почасовой прогноз. Второстепенный фактор, связь с поклёвками неоднозначна.</p></div><div><b>Свет и погода</b><p>Восход, закат, осадки — Open-Meteo. Заметны при выборе утреннего и вечернего окна.</p></div><div><b>Кормовая рыба и рельеф</b><p>Эхолот на лодке и датированные сообщения Русфишинга. По API эти данные не получить.</p></div></div><p class="source-note">Текущий индекс клёва экспериментальный и использует только погоду и время суток. Температуру и уровень воды он пока не учитывает: для этого нужны свежие измерения и проверенная модель.</p></div>');
grid.after(waterPage);
const mapPage=document.createElement('section');mapPage.className='mobile-page map-page';mapPage.id='mapPage';mapPage.dataset.view='map';
mapPage.innerHTML='<div class="map-title-line"><h2 class="m-title">Карта Селигера</h2><span id="mapCount" class="source-note">Загружаем точки…</span></div>'+
'<div class="map-toolbar"><label>Рыба <select id="mapFilter" aria-label="Фильтр по виду рыбы"><option value="all">Все</option><option value="щук">Щука</option><option value="судак">Судак</option><option value="окун">Окунь</option><option value="плотв">Плотва</option></select></label><button type="button" id="mapGps">⌖ Мой GPS</button></div>'+
'<div id="seligerMap" role="region" aria-label="Интерактивная карта Селигера"></div><p class="source-note" id="mapStatus">Загружаем подложку OpenStreetMap…</p>'+
'<div class="m-box depth-box"><h3>Глубины Селигера · архив</h3><p>Историческая карта глубин по материалам 1970-х — 2001 года. Она показывается отдельно от наших меток: разрешение на объединение слоёв не подтверждено.</p><button type="button" id="toggleHistoricalDepths" class="m-btn">Показать карту глубин</button><div id="depthsFrameContainer" hidden><iframe id="depthsFrame" title="Историческая карта глубин Селигера от ЭтоМесто" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p><a href="https://etomesto.com/map-tver_seliger-glubiny/" target="_blank" rel="noopener noreferrer">Открыть карту на сайте правообладателя ↗</a></p><p class="source-note">Глубины исторические, для навигации на лодке нужен эхолот и актуальная обстановка. Если просмотр внутри приложения блокируется сайтом источника — открой ссылку выше.</p></div>'+
'<div class="map-title-line"><h3>Отчёты с привязкой к району</h3></div><p class="source-note">Метки — ориентиры, а не места поимки. Полупрозрачный круг показывает неопределённость местоположения.</p><div id="mapReports"></div><p class="source-note" id="unlocatedReports"></p><p class="source-note" id="forumCoverage">Подсчитываем обработанные страницы форума…</p>';
mapPage.insertAdjacentHTML('beforeend','<section class="m-box research-section" id="researchAreasSection"><div class="map-title-line"><h3>Районы поиска · октябрь</h3><span id="researchCount" class="source-note">Загружаем…</span></div><p class="source-note">Сводка многолетних отчётов. Это список акваторий для разведки, а НЕ точки поклёвок и не вероятность клёва. Точных GPS-координат поимок нет.</p><label class="research-filter">Вид рыбы <select id="researchSpecies" aria-label="Вид рыбы для исследовательских районов"><option value="all">Все виды</option><option value="судак">Судак</option><option value="щука">Щука</option><option value="окунь">Окунь</option><option value="мирная">Мирная рыба</option></select></label><label class="research-filter">Свидетельства <select id="researchSeason" aria-label="Сезонность доказательств"><option value="all">Все, с пометкой сезона</option><option value="october">Есть октябрьские отчёты</option><option value="verified-catch">Подтверждённый октябрьский улов</option></select></label><div id="researchAreaCards" class="research-card-list"></div><p class="source-note">Охват архива Русфишинга частичный. Данные не гарантируют улов; глубины в карточках — из отдельных отчётов, не карта изобат.</p></section>');
mapPage.insertAdjacentHTML('beforeend','<section class="m-box trip-scenarios" id="tripScenariosSection"><h3>Выезды от базы «Ладья» · 22–25 октября</h3><p class="source-note">База и свой причал подтверждены. Это сценарии исследования, не судоводительские маршруты: положение причала и безопасные проходы ещё не проверены.</p><div id="tripScenarioCards">Загружаем план…</div><p class="source-note"><a href="https://tvoy-seliger.com/razmeshenie/ladya/" target="_blank" rel="noopener noreferrer">Ладья: спуск водной техники и причалы ↗</a></p></section>');
grid.after(mapPage);


let previousTab=null;
const tabOrder=['today','charts','map','water','reports'];
function tab(id){
 const entering=previousTab!==null&&previousTab!==id;
 const direction=tabOrder.indexOf(id)>=tabOrder.indexOf(previousTab)?'forward':'backward';
 for(const el of document.querySelectorAll('[data-view]')){
  const visible=el.dataset.view===id;
  el.classList.toggle('is-hidden',!visible);
  el.classList.remove('view-enter-forward','view-enter-backward');
  if(visible&&entering){void el.offsetWidth;el.classList.add('view-enter-'+direction);}
 }
 for(const x of [reports,waterPage,mapPage])x.classList.toggle('active',x.dataset.view===id);
 nav.querySelectorAll('button').forEach(b=>{const on=b.dataset.tab===id;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false')});
 previousTab=id;
 try{window.history.replaceState(null,'','#'+id)}catch(e){}
 window.scrollTo({top:0,behavior:'instant'});
 if(id==='charts')requestAnimationFrame(()=>{if(typeof charts!=='undefined')Object.values(charts).forEach(c=>c?.resize?.())});
 window.dispatchEvent(new CustomEvent('seliger:tab',{detail:{id}}));
}
nav.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
tab(['today','charts','map','water','reports'].includes(location.hash.slice(1))?location.hash.slice(1):'today');
const escape=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const reportEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadReports(){
 const el=document.getElementById('reportsPage');
 try{
  const r=await fetch('data/reports.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
  const d=await r.json();const items=Array.isArray(d.reports)?d.reports:[];
  el.innerHTML='<h2 class="m-title">Русфишинг · Селигер</h2><p class="source-note">Проверенные выдержки с датами и первоисточниками. Это НЕ прямая лента последних уловов; новых октябрьских отчётов 2026 пока не подтверждено. Последняя редакционная проверка: '+reportEscape(d.updated_at)+'</p><div class="report-list">'+items.map(x=>'<article class="m-box report-card"><div class="report-head"><strong>'+reportEscape(x.fish)+'</strong><time>'+reportEscape(x.date)+'</time></div><p class="source-note">'+reportEscape(x.area)+' · '+reportEscape(x.kind)+'</p><p>'+reportEscape(x.text)+'</p><a target="_blank" rel="noopener noreferrer" href="'+reportEscape(x.source)+'">Открыть сообщение на Русфишинге ↗</a></article>').join('')+'</div><div class="m-box"><a href="https://www.rusfishing.ru/forum/threads/seliger.1485/unread" target="_blank" rel="noopener noreferrer">Проверить самые новые сообщения на форуме ↗</a></div>';
 }catch(e){el.innerHTML='<h2 class="m-title">Русфишинг · Селигер</h2><p>Отчёты временно недоступны. <a target="_blank" rel="noopener noreferrer" href="https://www.rusfishing.ru/forum/threads/seliger.1485/">Открыть форум ↗</a></p>'}
}
async function loadWater(){
 try{const r=await fetch('data/water.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();
 const level=d.level||{},temperature=d.temperature||{};
 const age=x=>{if(!x?.measured_at)return null;const t=Date.parse(x.measured_at);return Number.isFinite(t)?Math.max(0,(Date.now()-t)/3600000):null};
 const valid=x=>age(x)!==null&&age(x)<=48;
 const dateLabel=t=>{if(!t)return '—';const dt=new Date(t);return Number.isFinite(dt.getTime())?dt.toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' МСК':t;};
 $('lakeLevel').textContent=valid(level)&&Number.isFinite(level.cm)?Number(level.cm).toFixed(0)+' см':'Нет свежих данных';
 $('lakeLevelDate').textContent=level.measured_at?'Измерено: '+dateLabel(level.measured_at)+' · '+(valid(level)?'актуальность ≤48 ч':'устарело, не для прогноза'):'Достоверных показаний пока нет';
 $('lakeTemperature').textContent=valid(temperature)&&Number.isFinite(temperature.celsius)?Number(temperature.celsius).toFixed(1)+' °C':'Нет свежих данных';
 $('lakeTemperatureDate').textContent=temperature.measured_at?'Измерено: '+dateLabel(temperature.measured_at)+' · '+(valid(temperature)?'актуальность ≤48 ч':'устарело, не для прогноза'):'Свежей температуры воды пока нет';
 try{
   const hr=await fetch('data/water_history.json?v='+Date.now(),{cache:'no-store'});
   if(hr.ok){
    const list=(await hr.json()).filter(x=>Number.isFinite(x.level_cm)&&x.measured_at).sort((a,b)=>a.measured_at.localeCompare(b.measured_at));
    const recent=list.slice(-5);
    if(recent.length<2){$('waterTrend').textContent='Для анализа тенденции требуется минимум два измерения с разными датами.';}
    else{
     const change=recent[recent.length-1].level_cm-recent[0].level_cm;
     $('waterTrend').textContent='За период '+dateLabel(recent[0].measured_at)+' — '+dateLabel(recent[recent.length-1].measured_at)+': '+(change>0?'+':'')+change.toFixed(0)+' см. Отдельных замеров: '+recent.length+'.';
    }
   }else{$('waterTrend').textContent='История измерений пока не сформирована.';}
  }catch(e){$('waterTrend').textContent='История уровня пока недоступна.'}
 }catch(e){$('lakeLevelDate').textContent='Данные гидропоста ещё не получены';$('lakeTemperatureDate').textContent='Данные о температуре воды ещё не получены'}
}
loadReports();loadWater();

function dateKey(d){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
async function dayWeather(){
 const targetDates=['2026-10-22','2026-10-23','2026-10-24','2026-10-25'];
 const box=$('daystrip');
 box.setAttribute('aria-label','Прогноз на поездку: 22–25 октября');
 const fmt=t=>t?t.slice(11,16):'—';
 try {
  let daily=null,mode='сохранённый прогноз';
  try {
   const r=await fetch('data/latest.json?v='+Date.now(),{cache:'no-store'});
   if(r.ok){const snapshot=await r.json();daily=snapshot.daily;const age=Date.now()-Date.parse(snapshot.saved_at||'');mode=!Number.isFinite(age)?'резервная копия без даты':age>12*3600000?'⚠ сохранённый прогноз старше 12 ч':age>6*3600000?'⚠ сохранённый прогноз старше 6 ч':'сохранённый прогноз';}
  }catch(e){}
  try {
   const u='https://api.open-meteo.com/v1/forecast?latitude=57.146&longitude=33.108&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,sunrise,sunset&forecast_days=7&timezone=Europe%2FMoscow&wind_speed_unit=ms';
   const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),7000);
   try {const r=await fetch(u,{cache:'no-store',signal:ctl.signal});if(r.ok){const d=(await r.json()).daily;if(d?.time?.length){daily=d;mode='свежий прогноз';}}}
   finally{clearTimeout(timeout)}
  }catch(e){}
  if(!daily?.time)throw Error('Нет прогноза для дат поездки');
  box.innerHTML=targetDates.map(date=>{
   const i=daily.time.indexOf(date);
   if(i<0)return '<div class="daycard"><strong>'+date.slice(8)+'.10</strong><small>Прогноз недоступен</small></div>';
   const dayLabel=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',weekday:'short',day:'numeric',month:'short'}).format(new Date(date+'T12:00:00+03:00'));
   const gust=daily.wind_gusts_10m_max?.[i],rain=daily.precipitation_sum?.[i];
   return '<div class="daycard"><strong>'+escape(dayLabel)+'</strong><div class="daytemp">'+Math.round(daily.temperature_2m_max[i])+'° / '+Math.round(daily.temperature_2m_min[i])+'°</div><small>Осадки '+(Number.isFinite(rain)?rain.toFixed(1):'—')+' мм</small><small>Порывы до '+(Number.isFinite(gust)?Math.round(gust):'—')+' м/с</small><small>☀ '+fmt(daily.sunrise?.[i])+' · ☾ '+fmt(daily.sunset?.[i])+'</small></div>';
  }).join('');
  const modeLabel=document.getElementById('tripSource');
  if(modeLabel)modeLabel.textContent='22–25 октября · '+mode;
 }catch(e){box.innerHTML='<p class="source-note">Прогноз 22–25 октября пока недоступен. Проверь подключение или обнови страницу.</p>'}
}
dayWeather();
window.addEventListener('orientationchange',()=>setTimeout(()=>{if(typeof charts!=='undefined')Object.values(charts).forEach(c=>c?.resize?.())},300));
const refresh=$('refresh');refresh.addEventListener('click',dayWeather);
})();
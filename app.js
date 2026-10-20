const LAT=57.146,LON=33.108,TZ='Europe/Moscow';
const vars=['temperature_2m','apparent_temperature','wind_speed_10m','wind_gusts_10m','wind_direction_10m','precipitation','precipitation_probability','pressure_msl'];
const url=`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=${vars.join(',')}&current=${vars.filter(v=>v!=='precipitation_probability').join(',')}&timezone=${TZ}&wind_speed_unit=ms&forecast_days=16&past_days=2`;
let hourly=null,history=[],period='6h',charts={};
const $=id=>document.getElementById(id),round=(n,d=0)=>Number.isFinite(n)?Number(n).toFixed(d):'—';
const mmHg=hpa=>hpa==null?null:hpa*0.750061683;
function biteAt(i,s){const h=hourly;const v=(key)=>h[key]?.[i]??null;const wind=v('wind_speed_10m'),gust=v('wind_gusts_10m'),rain=v('precipitation'),p=v('pressure_msl'),before=h.pressure_msl?.[Math.max(0,i-3)];if([wind,gust,rain,p,before].some(x=>x==null))return null;const hour=Number(h.time[i].slice(11,13));let score=67-Math.max(0,wind-3)*5-Math.max(0,gust-8)*3-Math.min(25,rain*8)-Math.min(18,Math.abs(p-before)*4);if(s==='zander')score+=hour>=17||hour<=8?12:-5;if(s==='pike')score+=hour>=7&&hour<=17?5:0;if(s==='perch')score+=hour>=9&&hour<=16?8:-5;if(s==='peaceful')score+=hour>=8&&hour<=18?4:-8;return Math.max(5,Math.min(95,Math.round(score)));}
function opts(unit){return {responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#a9c1cc',boxWidth:12}},tooltip:{backgroundColor:'#233947'}},scales:{x:{ticks:{color:'#91a7b2',maxTicksLimit:9,maxRotation:0},grid:{color:'#20343f'}},y:{ticks:{color:'#91a7b2',callback:v=>v+unit},grid:{color:'#20343f'}}}}}
const line=(label,data,color,fill=false)=>({label,data,borderColor:color,backgroundColor:color+'33',borderWidth:2,pointRadius:0,tension:.25,fill,spanGaps:true});
function make(id,labels,sets,unit='',type='line'){
 charts[id]?.destroy();
 const chartOpts=opts(unit);
 const now=nowMoscowHour(),indexes=indices();
 chartOpts.nowIndex=indexes.findIndex(i=>hourly?.time?.[i]>=now);
 chartOpts.nowMarker=chartOpts.nowIndex>=0&&chartOpts.nowIndex<labels.length;
 chartOpts.markPast=false;
 charts[id]=new Chart($(id),{type,data:{labels,datasets:sets},options:chartOpts});
}
function nowMoscowHour(){const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});const p=Object.fromEntries(fmt.formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':00';}
function indices(){
 if(!hourly?.time?.length)return [];
 const now=nowMoscowHour(),t=hourly.time;
 let center=t.findIndex(x=>x>=now);if(center<0)center=t.length-1;
 let first,last;
 if(period==='6h'){first=center;last=center+6;}
 else {first=center;last=center+(period==='24h'?23:period==='3d'?71:167);}
 first=Math.max(0,first);last=Math.min(t.length-1,last);
 return Array.from({length:Math.max(0,last-first+1)},(_,i)=>first+i);
}
function prettyHour(t,full=false){
 const [,mo,day,hour,minute]=String(t).match(/^\d{4}-(\d\d)-(\d\d)T(\d\d):(\d\d)/)||[];
 if(!mo)return String(t);
 const clock=hour+':'+minute;
 if(!full&&String(t).slice(0,10)===nowMoscowHour().slice(0,10))return clock;
 const month=['янв.','февр.','мар.','апр.','мая','июн.','июл.','авг.','сен.','окт.','ноя.','дек.'][Number(mo)-1];
 return Number(day)+' '+month+' '+clock;
}
function rainInformation(ix){
 const r=$('rainSummary');
 if(!r)return;
 const amounts=ix.map(i=>hourly.precipitation?.[i]).filter(x=>Number.isFinite(x));
 const chances=ix.map(i=>hourly.precipitation_probability?.[i]).filter(x=>Number.isFinite(x));
 if(!amounts.length&&!chances.length){r.textContent='Данные об осадках пока недоступны';return}
 const sum=amounts.reduce((a,b)=>a+b,0);
 const maxChance=chances.length?Math.round(Math.max(...chances)):null;
 r.textContent=(amounts.length?'Осадки за период: '+sum.toFixed(1)+' мм':'Количество осадков неизвестно')+
 (maxChance!==null?' · Максимальная вероятность: '+maxChance+'%':' · Вероятность не предоставлена')+
 (sum===0&&maxChance===0?' · Сухо по прогнозу':'');
}
function render(){if(!hourly)return;if(typeof Chart==='undefined'){ $('status').textContent='Библиотека графиков не загрузилась. Проверь подключение к сети.';return;}const ix=indices(),labels=ix.map(i=>prettyHour(hourly.time[i]));const val=k=>ix.map(i=>hourly[k]?.[i]??null);if(!ix.length){$('status').textContent='Нет прогноза на выбранный период';return;}
make('tempChart',labels,[line('Воздух',val('temperature_2m'),'#77ddbd'),line('Ощущается',val('apparent_temperature'),'#e7b56e')],'°');make('windChart',labels,[line('Ветер',val('wind_speed_10m'),'#6aa6e7'),line('Порывы',val('wind_gusts_10m'),'#f0a76d')],' м/с');rainInformation(ix);make('rainChart',labels,[{label:'Осадки, мм',data:val('precipitation'),backgroundColor:'#66aee6',borderRadius:3}], ' мм','bar');make('rainChanceChart',labels,[line('Вероятность, %',val('precipitation_probability'),'#e4c66d')],' %');make('pressureChart',labels,[line('Давление',val('pressure_msl').map(mmHg),'#c0a3f5')],' мм');make('biteChart',labels,[line('Щука',ix.map(i=>biteAt(i,'pike')),'#78ddaa'),line('Судак',ix.map(i=>biteAt(i,'zander')),'#eeb675'),line('Окунь',ix.map(i=>biteAt(i,'perch')),'#87b9f2'),line('Мирная',ix.map(i=>biteAt(i,'peaceful')),'#d0a6ef')],'');renderHistory(ix);}
function renderHistory(ix){const key=$('compareMetric').value,valid=history.filter(x=>x.hourly?.time?.length&&x.saved_at);$('historyMessage').textContent=valid.length<2?'Для сравнения нужны минимум два сохранённых выпуска. GitHub Actions накапливает их автоматически после настройки.':`Доступно сохранённых выпусков: ${valid.length}`;const labels=ix.map(i=>prettyHour(hourly.time[i]));const colors=['#70dbb8','#edb86b','#7eaee9','#d7a4e9','#e48d96'];const sets=valid.slice(-5).map((snap,j)=>{const lookup=new Map(snap.hourly.time.map((t,i)=>[t,snap.hourly[key]?.[i]]));return line(new Date(snap.saved_at).toLocaleString('ru-RU',{timeZone:TZ,day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}),ix.map(i=>{let n=lookup.get(hourly.time[i]);return n==null?null:key==='pressure_msl'?mmHg(n):n}),colors[j]);});make('historyChart',labels,sets,key==='pressure_msl'?' мм':'');}
function current(c){const a=c||{},stamp=a.time||new Intl.DateTimeFormat('sv-SE',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T');let i=hourly.time.indexOf(stamp.slice(0,13)+':00');if(i<0)i=hourly.time.findIndex(t=>t>=stamp.slice(0,13));if(i<0)i=hourly.time.length-1;const t=a.temperature_2m??hourly.temperature_2m[i],f=a.apparent_temperature??hourly.apparent_temperature[i],w=a.wind_speed_10m??hourly.wind_speed_10m[i],g=a.wind_gusts_10m??hourly.wind_gusts_10m[i],p=a.pressure_msl??hourly.pressure_msl[i];$('temp').textContent=round(t,1)+'°';$('feels').textContent='Ощущается '+round(f,1)+'°';$('wind').textContent=round(w,1)+' м/с';$('gust').textContent='Порывы '+round(g,1)+' м/с';$('pressure').textContent=round(mmHg(p))+' мм';$('pressureTrend').textContent='Изменение за 3 ч '+round((p-(hourly.pressure_msl[Math.max(0,i-3)]??p))*0.75006,1)+' мм';for(const s of ['pike','zander','perch','peaceful'])$(s+'Score').textContent=(biteAt(i,s)??'—')+'/100';$('bite').textContent=round(a.precipitation??hourly.precipitation[i]??null,1)+' мм';$('biteName').textContent='Количество осадков · сейчас';const bad=(w>=6||g>=10||t<=2||(a.precipitation??hourly.precipitation[i]??0)>=2);$('safety').textContent=bad?'⚠ Возможны сложные условия: холод, порывы ветра или осадки. Перед выходом проверь волну, маршрут и фактическую погоду. Спасжилет обязателен.':'Оперативных пороговых предупреждений по доступным параметрам нет. Это НЕ подтверждение безопасности: на открытых плёсах проверяй волну, направление ветра и фактическую обстановку. Спасжилет обязателен.';}
let lastWeatherTime=null;
function updatedLabel(saved,origin){
 const when=saved?new Date(saved):new Date();
 const label=Number.isNaN(when.getTime())?'время неизвестно':when.toLocaleString('ru-RU',{timeZone:TZ,day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 return (origin==='live'?'● Свежий прогноз':'◷ Сохранённый прогноз')+' · '+label+' МСК';
}
function applyData(d,origin){
 if(!d?.hourly?.time?.length||!d.hourly.temperature_2m?.length)throw Error('Неполные погодные данные');
 hourly=d.hourly;lastWeatherTime=d.saved_at||new Date().toISOString();
 current(d.current);render();
 $('status').textContent=updatedLabel(lastWeatherTime,origin);
 document.dispatchEvent(new CustomEvent('seliger:weather',{detail:{origin,at:lastWeatherTime}}));
}
async function fetchTimed(resource,ms){
 const ctl=new AbortController(),id=setTimeout(()=>ctl.abort(),ms);
 try{const r=await fetch(resource,{cache:'no-store',signal:ctl.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}
 finally{clearTimeout(id)}
}
let loadingPromise=null;
async function load(){
 if(loadingPromise)return loadingPromise;
 loadingPromise=(async()=>{
  $('status').textContent='Загружаем прогноз…';
  let displayed=false;const failures=[];
  const historyPromise=fetchTimed('data/history.json?v='+Date.now(),6500).then(d=>{history=Array.isArray(d)?d:[];if(hourly)renderHistory(indices())}).catch(()=>{history=[]});
  try{
   const cached=await fetchTimed('data/latest.json?v='+Date.now(),7000);
   applyData(cached,'cache');displayed=true;
  }catch(e){failures.push('резервная копия: '+e.message)}
  try{
   const fresh=await fetchTimed(url+'&_='+Date.now(),10000);
   applyData(fresh,'live');displayed=true;
  }catch(e){failures.push('прямой запрос: '+e.message)}
  await historyPromise;
  if(!displayed)$('status').textContent='⚠ Нет погодных данных. '+failures.join('; ')+'. Нажми «Обновить».';
  return displayed;
 })().finally(()=>loadingPromise=null);
 return loadingPromise;
}
const periodLabels={'6h':'6 часов','24h':'24 часа','3d':'3 дня','7d':'7 дней'};
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{
 period=b.dataset.period;
 document.querySelectorAll('[data-period]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});
 $('periodSummary').textContent='☰  Период: '+periodLabels[period];
 $('periodMenu').open=false;
 render();
}));
$('refresh').onclick=load;
$('compareMetric').onchange=render;
load();

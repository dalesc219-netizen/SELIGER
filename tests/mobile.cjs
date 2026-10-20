const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const scenarios=[{name:'portrait',width:390,height:844},{name:'landscape',width:844,height:390}];
 try {
  for(const scenario of scenarios){
   const page=await browser.newPage({viewport:{width:scenario.width,height:scenario.height},deviceScaleFactor:3,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://api.open-meteo.com/**', async route=>{
    const u=new URL(route.request().url());
    const date=new Date();const first=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()-2));
    const times=Array.from({length:18*24},(_,i)=>new Date(first.getTime()+i*3600000).toISOString().slice(0,16));
    let response;
    if(u.searchParams.has('daily')){
     const dates=times.filter(t=>t.endsWith('T00:00')).slice(0,7).map(t=>t.slice(0,10));
     response={daily:{time:dates,temperature_2m_max:dates.map(()=>10),temperature_2m_min:dates.map(()=>3),precipitation_sum:dates.map(()=>2),wind_gusts_10m_max:dates.map(()=>8),sunrise:dates.map(d=>d+'T07:30'),sunset:dates.map(d=>d+'T17:30')}};
    } else {
     const names=(u.searchParams.get('hourly')||'').split(',');const hourly={time:times};
     names.forEach((name,j)=>hourly[name]=times.map((_,i)=>name==='wind_direction_10m'?230:name==='pressure_msl'?1013+Math.sin(i/10)*2:name==='precipitation_probability'?20:name==='precipitation'?i%14===0?1.2:0:8+j+Math.sin(i/8)*2));
     response={hourly,current:{time:times[49],temperature_2m:7,apparent_temperature:4,wind_speed_10m:3,wind_gusts_10m:6,pressure_msl:1013,precipitation:0}};
    }
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
   });
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await page.locator('.mobile-nav button[data-tab="today"]').waitFor();
   const oversize=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
   assert.equal(oversize,false,scenario.name+' horizontal document overflow');
   await page.locator('#periodSummary').waitFor({state:'attached'});
   assert.ok((await page.locator('#periodSummary').innerText()).includes('6 часов'));
   await page.locator('#daystrip .daycard').first().waitFor({state:'visible',timeout:12000});
   assert.equal(await page.locator('#daystrip .daycard').count(),4,'Trip forecast covers Oct 22–25 only');
   assert.ok((await page.locator('.trip-heading').innerText()).includes('22–25 октября'));

   await page.waitForFunction(()=>typeof window.Chart==='function'&&document.getElementById('pikeScore').textContent.includes('/100'));
   for(const species of ['pike','zander','perch','peaceful'])assert.match(await page.locator('#'+species+'Score').innerText(),new RegExp('[0-9]+/100'));
   await page.locator('[data-tab="charts"]').click();
   await page.locator('#periodSummary').click();
   await page.locator('[data-period="24h"]').click();
   assert.ok((await page.locator('#periodSummary').innerText()).includes('24 часа'));
   await page.locator('#periodSummary').click();
   await page.locator('[data-period="7d"]').click();
   assert.ok((await page.locator('#periodSummary').innerText()).includes('7 дней'));
   await page.locator('#periodSummary').click();
   await page.locator('[data-period="6h"]').click();

   await page.locator('#tempChart').waitFor({state:'visible'});
   await page.waitForFunction(()=>typeof charts!=='undefined'&&charts.tempChart?.config?.options?.nowMarker===true,{timeout:15000});
   const nowMarker=await page.evaluate(()=>({idx:charts.tempChart.config.options.nowIndex,length:charts.tempChart.config.data.labels.length}));
   assert.equal(nowMarker.idx,0,'NOW starts six-hour forecast; no historical hours');
   assert.equal(nowMarker.length,7,'Forecast covers current hour and next six hours');
   const displayedLabels=await page.evaluate(()=>charts.tempChart.config.data.labels);
   assert.ok(displayedLabels.some(x=>/^[0-9]{2}:[0-9]{2}$/.test(x)),'Today uses HH:MM instead of numeric ISO');
   assert.ok(await page.locator('#rainChanceChart').count()===1,'Chance chart exists');
   const precipitation=await page.locator('#rainSummary').innerText();
   assert.ok(precipitation.includes('мм')&&precipitation.includes('%'),'Rain summary has mm and probability');
   await page.locator('.chart-jumps [data-chart="rainChart"]').click();
   const clearance=await page.evaluate(()=>{const panel=document.querySelector('#rainChart').closest('.panel').getBoundingClientRect(), dock=document.querySelector('#weatherDock').getBoundingClientRect(), jumps=document.querySelector('.chart-jumps').getBoundingClientRect();return {panel:panel.top,dock:dock.bottom,jumps:jumps.bottom}});
   assert.ok(clearance.panel>=clearance.dock-5,'Rain panel is not hidden under fixed metrics');
   await page.locator('#periodSummary').click();
   await page.locator('[data-period="6h"]').click();


   await page.waitForFunction(()=>{const c=document.getElementById('tempChart');return c.width>200&&c.height>100&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v>0)},{timeout:15000});
   assert.ok(await page.locator('.chart-jumps button').count()>=6);
   await page.locator('.chart-jumps [data-chart="windChart"]').click();
   assert.equal(await page.locator('.mobile-nav [data-tab="diary"]').count(),0,'Diary hidden for short trip');
   await page.locator('[data-tab="map"]').click();
   await page.locator('#mapPage').waitFor({state:'visible'});
   await page.locator('.map-report-card').first().waitFor({state:'visible'});
   assert.equal(await page.locator('.map-report-card').count(),2,'Two approximate source-backed fishing areas');
   assert.ok(await page.locator('#seligerMap').isVisible(),'Interactive map container visible');
   await page.locator('.trip-scenario-card').first().waitFor({state:'visible'});
   assert.equal(await page.locator('.trip-scenario-card').count(),4,'Four conditional Ladya trip scenarios');
   assert.ok((await page.locator('#tripScenariosSection').innerText()).includes('не судоводительские маршруты'),'Route disclaimer visible');
   await page.locator('#researchAreaCards .research-area-card').first().waitFor({state:'visible'});
   assert.equal(await page.locator('#researchAreaCards .research-area-card').count(),9,'Nine research regions shown without GPS locations');
   await page.locator('#researchSpecies').selectOption('судак');
   assert.equal(await page.locator('#researchAreaCards .research-area-card').count(),7,'Zander research area filter excludes peaceful-only regions');
   await page.locator('#researchSeason').selectOption('verified-catch');
   assert.equal(await page.locator('#researchAreaCards .research-area-card').count(),2,'Only Sosnitsky and Gushcha have confirmed October zander catches');
   await page.locator('#researchSpecies').selectOption('all');
   await page.locator('#researchSeason').selectOption('all');

   assert.ok((await page.locator('.depth-box').innerText()).includes('Историческая карта'),'Historical depths clearly dated');
   await page.locator('#toggleHistoricalDepths').click();
   assert.ok(await page.locator('#depthsFrame').isVisible(),'Depth viewer opens on tap');
   assert.ok((await page.locator('#depthsFrame').getAttribute('src')).startsWith('https://etomesto.com/map.php'),'Depths remain publisher-hosted');
   await page.locator('#toggleHistoricalDepths').click();
   assert.equal(await page.locator('#depthsFrameContainer').isVisible(),false,'Depth viewer hides on tap');
   await page.locator('#mapFilter').selectOption('плотв');
   assert.equal(await page.locator('.map-report-card').count(),1,'Only New Eltsy confirmed for roach; Polonovka unverified species removed');
   await page.locator('#mapFilter').selectOption('судак');
   assert.equal(await page.locator('.map-report-card').count(),1,'Fish filter works');
   await page.locator('[data-tab="water"]').click();
   await page.locator('#waterPage').waitFor({state:'visible'});
   assert.ok((await page.locator('#lakeLevelDate').innerText()).length>5,'Water status visible');
   assert.ok((await page.locator('#lakeTemperatureDate').innerText()).length>5,'Water temperature status visible');
   await page.locator('[data-tab="reports"]').click();
   await page.locator('#reportsPage').waitFor({state:'visible'});
   await page.locator('.report-card').first().waitFor({state:'visible'});
   assert.ok(await page.locator('.report-card').count()>=4,'Dated fishing reports with sources');
   assert.ok(await page.locator('a[href*="rusfishing.ru"]').count()>0);
   assert.equal(await page.locator('.weather-dock .dock-item').count(),4,'Persistent dock icons');
   const dockRect=await page.locator('#weatherDock').boundingBox();
   assert.ok(dockRect&&dockRect.y>=18,'Dynamic Island top clearance');
   // An archived forecast must never show the old snapshot's current=99°C as live weather.
   const stale=await page.evaluate(()=>{
     const oldest=new Date(Date.now()-15*3600000).toISOString();
     const currentForecast=hourly;
     applyData({hourly:currentForecast,current:{time:'2020-01-01T00:00',temperature_2m:99,apparent_temperature:99,wind_speed_10m:99,wind_gusts_10m:99,pressure_msl:999},saved_at:oldest},'cache');
     return {status:document.getElementById('status').textContent,temp:document.getElementById('temp').textContent,safety:document.getElementById('safety').textContent};
   });
   assert.ok(stale.status.includes('Устаревший прогноз'),'Stale saved forecast clearly labeled');
   assert.ok(!stale.temp.includes('99'),'Archived current temperature is not presented as current');
   assert.ok(stale.safety.includes('слишком старый'),'Stale forecast cannot imply safe boating conditions');
   await page.route('https://api.open-meteo.com/**',route=>route.abort('failed'));
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>/прогноз/i.test(document.getElementById('status').textContent),{timeout:16000});
   await page.waitForFunction(()=>document.querySelector('#weatherDock .dock-value').textContent.includes('°'),{timeout:5000});
   await page.locator('#weatherDock button[data-chart="tempChart"]').click();
   await page.locator('#tempChart').waitFor({state:'visible'});
   await page.waitForFunction(()=>{const c=document.getElementById('tempChart');return c.width>150&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(x=>x>0)},{timeout:7000});

   await page.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller!==null,{timeout:12000}).catch(async()=>{
     await page.reload({waitUntil:'domcontentloaded'});
     await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null,{timeout:12000});
   });
   await page.context().setOffline(true);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('.mobile-nav [data-tab="map"]').waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('#networkBadge')?.classList.contains('show'),{timeout:7000});
   await page.locator('.mobile-nav [data-tab="map"]').click();
   await page.locator('.map-report-card').first().waitFor({state:'visible',timeout:7000});
   assert.equal(await page.locator('.map-report-card').count(),2,'Offline reports remain visible');
   await page.context().setOffline(false);
   assert.deepEqual(errors.filter(x=>!/Chart is not defined|Failed to fetch/i.test(x)),[],scenario.name+' JavaScript errors');
   console.log('PASS',scenario.name);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

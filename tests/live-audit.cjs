const {chromium,webkit} = require('playwright');
const fs=require('fs');
const target='https://dalesc219-netizen.github.io/SELIGER/?audit='+Date.now();
const checks=[];
const issues=[];
const out='audit-artifacts';
fs.mkdirSync(out,{recursive:true});
async function tapTab(page,id){
 const b=page.locator('.mobile-nav [data-tab="'+id+'"]');
 await b.scrollIntoViewIfNeeded();
 const r=await b.boundingBox();if(!r)throw Error('Bottom tab not visible: '+id);
 await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
 await page.waitForTimeout(160);
}
async function audit(engine,name,w,h){
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'ru-RU',timezoneId:'Europe/Moscow'});
 const errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>failed.push({url:r.url(),reason:r.failure()?.errorText}));
 const record=(check,ok,details='')=>{checks.push({browser:name,orientation:w<h?'portrait':'landscape',check,ok,details});if(!ok)issues.push(name+' '+(w<h?'portrait':'landscape')+': '+check+' — '+details)};
 try{
  const response=await page.goto(target,{waitUntil:'domcontentloaded',timeout:40000});
  record('Published site responds',response?.status()===200,'HTTP '+response?.status());
  await page.locator('#weatherDock').waitFor({timeout:12000});
  await page.waitForFunction(()=>/Свежий прогноз|Сохранённый прогноз|Нет погодных данных/.test(document.querySelector('#status')?.textContent||''),{timeout:26000});
  const status=await page.locator('#status').innerText();
  record('Weather loaded',!/Нет погодных данных/.test(status),status);
  const metrics=await page.locator('#weatherDock .dock-value').allTextContents();
  record('All mini-metrics populated',metrics.length===4&&metrics.every(v=>v!=='—'&&!v.includes('NaN')),JSON.stringify(metrics));
  const position=await page.evaluate(()=>{const dock=document.getElementById('weatherDock').getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect();return{dockY:Math.round(dock.y),dockBottom:Math.round(dock.bottom),mainY:Math.round(main.y),width:document.documentElement.scrollWidth,screen:innerWidth,navTop:Math.round(document.querySelector('.mobile-nav').getBoundingClientRect().top)}});
  record('Document fits viewport',position.width<=position.screen+2,JSON.stringify(position));
  record('Top dock clearance',position.dockY>=19,JSON.stringify(position));
  const links=await page.locator('link[rel="icon"]').count();
  record('Seliger icon linked',links>=1,String(links));
  await page.screenshot({path:out+'/'+name+'-'+(w<h?'portrait':'landscape')+'-home.png',fullPage:true});
  await tapTab(page,'charts');
  await page.locator('#tempChart').waitFor({state:'visible',timeout:8000});
  await page.waitForTimeout(350);
  const draw=await page.evaluate(()=>['tempChart','windChart','rainChart','pressureChart','biteChart'].map(id=>{const c=document.getElementById(id);if(c.width<50||c.height<50)return{id,w:c.width,h:c.height,drawn:false};const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let used=0;for(let k=3;k<data.length;k+=4)if(data[k]>0)used++;return{id,w:c.width,h:c.height,drawn:used>150,pixels:used}}));
  record('Five graphs contain pixels',draw.every(x=>x.drawn),JSON.stringify(draw));
  await page.screenshot({path:out+'/'+name+'-'+(w<h?'portrait':'landscape')+'-charts.png',fullPage:true});
  await page.locator('#periodSummary').click();
  await page.locator('[data-period="7d"]').click();
  record('Period selection 7d', (await page.locator('#periodSummary').innerText()).includes('7 дней'));
  await page.locator('#weatherDock button[data-chart="windChart"]').click();
  record('Weather dock opens chart',(await page.locator('#windChart').isVisible()));
  await tapTab(page,'map');
  await page.locator('#mapPage').waitFor({state:'visible',timeout:9000});
  await page.locator('.map-report-card').first().waitFor({state:'visible',timeout:9000});
  record('Map reports loaded', (await page.locator('.map-report-card').count())>=2);
  await page.screenshot({path:out+'/'+name+'-'+(w<h?'portrait':'landscape')+'-map.png',fullPage:true});
  await tapTab(page,'water');
  record('Water monitoring',(await page.locator('#waterPage').isVisible()));
  await tapTab(page,'reports');
  record('Reports navigation',(await page.locator('#reportsPage').isVisible()));
  record('No JavaScript errors',errors.length===0,JSON.stringify(errors));
  console.log('AUDIT',name,w+'x'+h,JSON.stringify({status,metrics,position,graphs:draw,errors,failed:failed.slice(0,6)}));
 }catch(e){record('Unhandled audit error',false,String(e.stack||e).slice(0,1000));console.log('AUDIT ERROR',name,w+'x'+h,e.message)}
 await browser.close();
}
(async()=>{
 for(const [engine,name] of [[chromium,'chromium'],[webkit,'webkit']].filter(([,name])=>!process.env.AUDIT_ENGINE||process.env.AUDIT_ENGINE===name)){
  for(const [w,h] of [[402,874],[874,402]])await audit(engine,name,w,h);
 }
 const data={tested_at:new Date().toISOString(),url:target,checks,issues};
 fs.writeFileSync(out+'/report.json',JSON.stringify(data,null,2));
 console.log('SUMMARY',process.env.AUDIT_ENGINE||'all',checks.filter(x=>x.ok).length+'/'+checks.length,'passed; failures',issues.length);
 if(issues.length){for(const x of issues)console.error('FAIL',x);process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
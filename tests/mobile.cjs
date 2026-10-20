const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const scenarios=[{name:'portrait',width:390,height:844},{name:'landscape',width:844,height:390}];
 try {
  for(const scenario of scenarios){
   const page=await browser.newPage({viewport:{width:scenario.width,height:scenario.height},deviceScaleFactor:3,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await page.locator('.mobile-nav button[data-tab="today"]').waitFor();
   const oversize=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
   assert.equal(oversize,false,scenario.name+' horizontal document overflow');
   await page.locator('[data-tab="charts"]').click();
   await page.locator('#tempChart').waitFor({state:'visible'});
   assert.ok(await page.locator('.chart-jumps button').count()>=6);
   await page.locator('.chart-jumps [data-chart="windChart"]').click();
   await page.locator('[data-tab="diary"]').click();
   await page.locator('#catchForm [name=species]').selectOption({label:'Щука'});
   await page.locator('#catchForm [name=spot]').fill('Тестовая точка');
   await page.locator('#catchForm button[type=submit]').click();
   assert.ok((await page.locator('#diaryList').innerText()).includes('Тестовая точка'));
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('[data-tab="diary"]').click();
   assert.ok((await page.locator('#diaryList').innerText()).includes('Тестовая точка'),'local diary persist');
   await page.locator('[data-tab="reports"]').click();
   assert.ok(await page.locator('a[href*="rusfishing.ru"]').count()>0);
   assert.deepEqual(errors.filter(x=>!/Chart is not defined|Failed to fetch/i.test(x)),[],scenario.name+' JavaScript errors');
   console.log('PASS',scenario.name);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

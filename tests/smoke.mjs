import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const html=readFileSync('index.html','utf8');
const app=readFileSync('app.js','utf8');
const mobile=readFileSync('mobile.js','utf8');
const css=readFileSync('mobile.css','utf8');
for(const file of ['data/reports.json','data/map_points.json','map.js','data/water.json','update_water.py','app.js','mobile.js','mobile.css','update_history.py','.github/workflows/weather.yml','.github/workflows/pages.yml']) assert.ok(existsSync(file),file);
for(const id of ['tempChart','windChart','rainChart','pressureChart','biteChart','historyChart','temp','feels','wind','gust','pressure','status','periodMenu','periodSummary','peacefulScore','compareMetric']) {
 assert.ok(html.includes('id="'+id+'"'),id);
}
assert.ok(html.includes('mobile.css')&&html.includes('mobile.js'),'Mobile assets wired');
assert.ok(css.includes('@media(orientation:landscape)'),'Landscape breakpoint');
assert.ok(css.includes('env(safe-area-inset-bottom)'),'iOS home indicator padding');
assert.ok(mobile.includes("data-tab")&&mobile.includes("waterPage"),'Water tab and mobile navigation');
assert.ok(mobile.includes('loadReports()'),'Dated reports wired');
assert.ok(mobile.includes("'map','⌖','Карта'"),'Map navigation');
assert.ok(html.includes('map.js')&&html.includes('leaflet'),'Map modules linked');
assert.ok(!readFileSync('chart-core.js','utf8').includes("c.fillText('СЕЙЧАС'"),'NOW marker not drawn');
assert.ok(!mobile.includes('catchForm'),'Unused trip diary removed');
assert.ok(app.includes('const a=c||{},stamp=a.time'),'Current time fix');
assert.ok(app.includes('wind_gusts_10m'),'Gusts');
assert.ok(app.includes("period='6h'"),'Six-hour default');
assert.ok(app.includes("'peaceful'"),'Peaceful fish available');
console.log('SELIGER static smoke checks passed');

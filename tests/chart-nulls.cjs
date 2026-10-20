'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const events=new Map(),text=[],bars=[];
const ctx=new Proxy({
 setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},setLineDash(){},
 fillText(value){text.push(String(value))},fillRect(...args){bars.push(args)},
 measureText(v){return {width:String(v).length*6}}
},{get(target,prop){return prop in target?target[prop]:undefined},set(target,key,val){target[key]=val;return true}});
const canvas={
 parentElement:{getBoundingClientRect:()=>({width:500,height:250})},
 getContext:()=>ctx,addEventListener:(k,fn)=>events.set(k,fn),
 removeEventListener:()=>{},style:{},getBoundingClientRect:()=>({left:0})
};
const env={window:{},devicePixelRatio:1,ResizeObserver:undefined};
vm.runInNewContext(fs.readFileSync('chart-core.js','utf8'),env,{filename:'chart-core.js'});
function draw(values,type='line'){
 text.length=0;bars.length=0;
 const chart=new env.window.Chart(canvas,{type,data:{labels:['a','b','c'],datasets:[{label:'Test',data:values,borderColor:'#777'}]},options:{}});
 const ticks=text.filter(t=>/^-?\\d+(?:\\.\\d+)?$/.test(t)).map(Number);
 chart.destroy();
 return {ticks,bars:bars.length,allText:text.slice()};
}
const line=draw([null,8,10]);
assert.ok(line.ticks.length>=4,'numeric axis labels rendered');
assert.ok(Math.min(...line.ticks)>5,'null must not pull minimum axis toward zero');
const onlyNull=draw([null,null,null]);
assert.ok(onlyNull.allText.includes('Нет данных за выбранный период'),'all-null chart displays empty state');
const bar=draw([null,5,null],'bar');
assert.equal(bar.bars,1,'missing bar values are skipped, not rendered as zero');
console.log('PASS chart null/missing scale + bars');

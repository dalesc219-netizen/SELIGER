/* SELIGER graph renderer: no CDN required. Compatible with the subset of Chart.js used by app.js. */
(function(){
'use strict';
const styles={bg:'#101f2a',line:'#243c49',axis:'#94b1bf',text:'#eaf5f7'};
class SeligerChart {
 constructor(canvas,config){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.config=config;
  this.touchX=null;this.draw=this.draw.bind(this);
  this.move=e=>{const r=canvas.getBoundingClientRect();this.touchX=e.clientX-r.left;this.draw()};
  this.leave=()=>{this.touchX=null;this.draw()};
  canvas.addEventListener('pointermove',this.move,{passive:true});
  canvas.addEventListener('pointerdown',this.move,{passive:true});
  canvas.addEventListener('pointerleave',this.leave);
  this.observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>this.resize()):null;
  this.observer?.observe(canvas.parentElement||canvas);
  this.resize();
 }
 destroy(){this.observer?.disconnect();this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerdown',this.move);this.canvas.removeEventListener('pointerleave',this.leave);this.destroyed=true}
 resize(){if(this.destroyed)return;const box=this.canvas.parentElement?.getBoundingClientRect();const width=Math.floor(box?.width||this.canvas.clientWidth||0),height=Math.floor(box?.height||this.canvas.clientHeight||0);if(width<80||height<80)return;const dpr=Math.min(devicePixelRatio||1,3);this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);this.canvas.style.width=width+'px';this.canvas.style.height=height+'px';this.ctx.setTransform(dpr,0,0,dpr,0,0);this.w=width;this.h=height;this.draw()}
 draw(){
  if(this.destroyed||!this.w)return;
  const c=this.ctx,w=this.w,h=this.h;const labels=this.config.data.labels||[],series=this.config.data.datasets||[];
  const left=w<430?39:48,right=13,top=33,bottom=32;const pw=w-left-right,ph=h-top-bottom;
  c.clearRect(0,0,w,h);c.font='11px system-ui,sans-serif';
  const numbers=series.flatMap(s=>(s.data||[]).map(Number).filter(Number.isFinite));if(!numbers.length){c.fillStyle=styles.axis;c.textAlign='center';c.fillText('Нет данных за выбранный период',w/2,h/2);return;}
  let lo=Math.min(...numbers),hi=Math.max(...numbers);if(hi===lo){hi+=1;lo-=1}const pad=(hi-lo)*.12;lo-=pad;hi+=pad;
  if(this.config.type==='bar')lo=Math.min(0,lo);
  const X=i=>left+(labels.length<=1?pw/2:i*pw/(labels.length-1)),Y=v=>top+ph*(hi-v)/(hi-lo);
  const markerIndex=this.config.options?.nowIndex;
  const hasNow=this.config.options?.nowMarker&&Number.isInteger(markerIndex)&&markerIndex>=0&&markerIndex<labels.length;
  const markerX=hasNow?X(markerIndex):null;
  if(hasNow&&this.config.options?.markPast){
   c.fillStyle='rgba(121,148,175,0.16)';
   c.fillRect(left,top,Math.max(0,markerX-left),ph);
   c.fillStyle='rgba(78,190,149,0.06)';
   c.fillRect(markerX,top,Math.max(0,w-right-markerX),ph);
  }
  c.strokeStyle=styles.line;c.lineWidth=1;c.fillStyle=styles.axis;c.textAlign='right';
  for(let j=0;j<=4;j++){const val=lo+(hi-lo)*j/4,y=Y(val);c.beginPath();c.moveTo(left,y);c.lineTo(w-right,y);c.stroke();c.fillText(Number(val.toFixed(Math.abs(hi-lo)<5?1:0)).toString(),left-7,y+4);}
  c.textAlign='center';const step=Math.max(1,Math.ceil(labels.length/(w<400?4:7)));
  labels.forEach((v,i)=>{if(i%step===0||i===labels.length-1){c.fillStyle=styles.axis;c.fillText(String(v).slice(0,11),X(i),h-11)}});
  series.forEach((s,si)=>{const values=s.data||[],color=s.borderColor||s.backgroundColor||'#75ddbb';c.strokeStyle=color;c.fillStyle=color;c.lineWidth=2;c.lineJoin='round';c.lineCap='round';
   if(this.config.type==='bar'){const bar=Math.max(2,Math.min(24,pw/Math.max(1,labels.length)*.65));for(let i=0;i<values.length;i++){const v=Number(values[i]);if(!Number.isFinite(v))continue;const y=Y(v),base=Y(0);c.fillRect(X(i)-bar/2,Math.min(y,base),bar,Math.max(1,Math.abs(base-y)));}}
   else{c.beginPath();let started=false;for(let i=0;i<values.length;i++){const v=values[i];if(v===null||v===undefined||!Number.isFinite(Number(v))){started=false;continue;}const x=X(i),y=Y(Number(v));if(!started){c.moveTo(x,y);started=true;}else c.lineTo(x,y);}c.stroke();}
  });
  let legendX=left;series.forEach(s=>{const name=String(s.label||'');c.font='11px system-ui,sans-serif';const tw=c.measureText(name).width;if(legendX+tw+26>w){return;}c.fillStyle=s.borderColor||s.backgroundColor||'#79deb9';c.fillRect(legendX,9,9,9);c.fillStyle=styles.text;c.textAlign='left';c.fillText(name,legendX+14,18);legendX+=tw+30;});
  if(hasNow){
   c.save();
   c.setLineDash([5,4]);c.strokeStyle='#ffcd72';c.lineWidth=2;
   c.beginPath();c.moveTo(markerX,top);c.lineTo(markerX,top+ph);c.stroke();
   c.setLineDash([]);
   c.fillStyle='#ffcd72';c.beginPath();c.arc(markerX,top+ph,4,0,Math.PI*2);c.fill();
   c.font='bold 10px system-ui,sans-serif';
   c.fillStyle='#ffd998';c.textAlign='center';
   const lx=Math.max(left+30,Math.min(w-right-30,markerX));
   c.fillText('СЕЙЧАС',lx,top+13);
   if(this.config.options?.markPast&&w>260){
    c.font='10px system-ui,sans-serif';c.fillStyle='#9faebf';
    c.fillText('МОДЕЛЬ −3ч',left+(markerX-left)/2,top+27);
    c.fillStyle='#86dab9';
    c.fillText('ПРОГНОЗ +3ч',markerX+(w-right-markerX)/2,top+27);
   }
   c.restore();
  }
  if(this.touchX!==null){const idx=Math.max(0,Math.min(labels.length-1,Math.round((this.touchX-left)/pw*(labels.length-1))));const x=X(idx);c.setLineDash([3,3]);c.strokeStyle='#dcebf2';c.beginPath();c.moveTo(x,top);c.lineTo(x,top+ph);c.stroke();c.setLineDash([]);
   const lines=[String(labels[idx]),...series.map(s=>String(s.label||'')+': '+(s.data[idx]===null||s.data[idx]===undefined?'—':Number(s.data[idx]).toFixed(1)))];
   const tipW=Math.min(w-12,Math.max(...lines.map(t=>c.measureText(t).width))+22),tipH=lines.length*17+12,tx=Math.min(w-tipW-5,Math.max(5,x+8)),ty=top+5;
   c.fillStyle='#213846';c.fillRect(tx,ty,tipW,tipH);c.fillStyle='#f0f7f8';c.textAlign='left';lines.forEach((t,j)=>c.fillText(t,tx+10,ty+18+j*17));
  }
 }
}
window.Chart=SeligerChart;
})();

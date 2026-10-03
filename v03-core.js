/* Cassola Inventory v0.3 addon: SKU manager, stock warnings, order suggestions, placed-order receiving */
let v3OrderMode='draft';
const v3Builtins=new Set(seedSkus.map(s=>s.id));
const v3NoAuto=new Set(['redapple','daikon','mango_hard','basil','avocado_half','avocado_soft']);
function v3Num(v){if(v===''||v==null)return null;const n=Number(v);return Number.isFinite(n)?n:null}
function v3DefaultWeeks(cat){if(cat==='蔬果')return .6;if(cat==='冷藏')return 1;if(cat==='处理库存')return 0;return 2}
function v3NormalizeSku(s){
  if(s.icon==null)s.icon=''; if(!s.warningMode)s.warningMode='auto';
  ['blueAt','yellowAt','redAt','targetQty','manualWeeklyUse'].forEach(k=>{s[k]=v3Num(s[k])});
  s.targetWeeks=v3Num(s.targetWeeks)??v3DefaultWeeks(s.category);
  if(s.autoOrder==null)s.autoOrder=!v3NoAuto.has(s.id)&&!['内部','自种'].includes(s.supplier)&&s.category!=='处理库存';
  return s;
}
state.placedOrders=Array.isArray(state.placedOrders)?state.placedOrders:[];
state.hiddenSkuIds=Array.isArray(state.hiddenSkuIds)?state.hiddenSkuIds:[];
state.skus.forEach(v3NormalizeSku); state.version=3; saveState();
function v3Skus(){const hidden=state.hiddenSkuIds||[];return state.skus.filter(s=>!hidden.includes(s.id))}
function v3Cats(){return [...new Set([...categories,...v3Skus().map(s=>s.category).filter(Boolean)])]}
function v3Suppliers(){return ['全部',...new Set([...suppliers.filter(s=>s!=='全部'),...v3Skus().map(s=>s.supplier).filter(Boolean)])]}
function v3Icon(s){return s?.icon||skuIcons[s?.id]||categoryIcons[s?.category]||'📦'}
function v3ParseCount(h){const m=String(h.text||'').match(/(-?\d+(?:\.\d+)?)\s*→\s*(-?\d+(?:\.\d+)?)/);return m?{old:Number(m[1]),next:Number(m[2])}:null}
function v3ParseMove(h){const m=String(h.text||'').match(/([+-])\s*(\d+(?:\.\d+)?)/);return m?Number(m[2]):0}
function v3WeeklyUse(s){
  if(Number(s.manualWeeklyUse)>0)return Number(s.manualWeeklyUse);
  const counts=state.history.map(h=>({h,c:h.type==='count'&&h.skuId===s.id?v3ParseCount(h):null})).filter(x=>x.c).sort((a,b)=>new Date(a.h.at)-new Date(b.h.at));
  if(counts.length<2)return null; const samples=[];
  for(let i=1;i<counts.length;i++){
    const a=counts[i-1],b=counts[i],start=new Date(a.h.at).getTime(),end=new Date(b.h.at).getTime(),days=(end-start)/86400000;if(days<1)continue;
    let arrivals=0,losses=0,out=0,into=0;
    state.history.forEach(h=>{const t=new Date(h.at).getTime();if(t<=start||t>end)return;const q=v3ParseMove(h);if(h.skuId===s.id&&h.type==='arrival')arrivals+=q;if(h.skuId===s.id&&h.type==='loss')losses+=q;if(h.skuId===s.id&&h.type==='transfer')out+=q;if(h.targetId===s.id&&h.type==='transfer')into+=q});
    const used=a.c.next+arrivals+into-losses-out-b.c.next;if(used>=0)samples.push(used*7/days);
  }
  return samples.length?samples.slice(-4).reduce((a,b)=>a+b,0)/Math.min(4,samples.length):null;
}
function v3Coverage(s){const w=v3WeeklyUse(s);return w>0?Number(s.qty)/w:null}
function v3Level(s){
  const q=Number(s.qty)||0;
  if(s.warningMode==='manual'){
    const r=v3Num(s.redAt),y=v3Num(s.yellowAt),b=v3Num(s.blueAt);if([r,y,b].every(v=>v==null))return'ok';if(q<=0)return'zero';if(r!=null&&q<=r)return'red';if(y!=null&&q<=y)return'yellow';if(b!=null&&q<=b)return'blue';return'ok';
  }
  const c=v3Coverage(s);if(c!=null){if(q<=0)return'zero';if(c<=.25)return'red';if(c<=.75)return'yellow';if(c<=1.2)return'blue';return'ok'}
  const target=v3Num(s.targetQty);if(target>0){if(q<=0)return'zero';const r=q/target;if(r<=.2)return'red';if(r<=.5)return'yellow';if(r<=.8)return'blue'}return'ok';
}
function v3Suggestion(s){if(!s.autoOrder)return 0;let target=v3Num(s.targetQty);if(target==null){const w=v3WeeklyUse(s),weeks=v3Num(s.targetWeeks);if(!(w>0)||!(weeks>0))return 0;target=w*weeks}return Math.max(0,Math.ceil((target-Number(s.qty))*10)/10)}
function v3Hint(s){const level=v3Level(s),cov=v3Coverage(s),sug=v3Suggestion(s),manual=[s.redAt,s.yellowAt,s.blueAt].some(v=>v3Num(v)!=null),configured=s.warningMode==='manual'?manual:(cov!=null||v3Num(s.targetQty)!=null),names={zero:'❌ 0库存',red:'🔴 见底',yellow:'🟡 偏低',blue:'🔵 留意',ok:configured?'库存正常':'未设置预警'},parts=[names[level]];if(cov!=null)parts.push(`约 ${fmt(cov)} 周`);if(sug>0)parts.push(`建议 +${fmt(sug)}${s.unit}`);return parts.join(' · ')}

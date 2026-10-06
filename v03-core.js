/* Cassola Inventory v0.3 addon: SKU manager, stock warnings, order suggestions, placed-order receiving */
let v3OrderMode='draft';
let v4AreaFilter='sushi';
const v4Areas=[
  {id:'sushi',label:'Sushi',icon:'🍣'},
  {id:'cucina',label:'Cucina',icon:'🔪'},
  {id:'bar',label:'Bar / Sala',icon:'🍸'},
  {id:'common',label:'Comune',icon:'📦'}
];
function v4AreaMeta(id){return v4Areas.find(x=>x.id===id)||v4Areas[0]}
function v4AreaOf(s){return s?.area||'sushi'}
const v3Builtins=new Set(seedSkus.map(s=>s.id));
const v3NoAuto=new Set(['redapple','daikon','mango_hard','basil','avocado_half','avocado_soft']);

/* Inventory v0.7 · product families. One card may contain multiple concrete SKUs. */
const v6FamilyDefaults={
  butter500:{familyName:'Burro'},butter250:{familyName:'Burro'},
  panna200:{familyName:'Panna'},panna125:{familyName:'Panna'},
  quail18:{familyName:'鹌鹑蛋'},quail12:{familyName:'鹌鹑蛋'},
  gamberi_s800:{familyName:'Gamberi rossi'},gamberi_l800:{familyName:'Gamberi rossi'},
  scampi_s800:{familyName:'Scampi'},scampi_l800:{familyName:'Scampi'},
  ikura1:{familyName:'Ikura'},ikura500:{familyName:'Ikura'},
  surimi1:{familyName:'Surimi'},surimi_hf1:{familyName:'Surimi',brand:'恒丰'},
  glove_m:{familyName:'白手套'},glove_l:{familyName:'白手套'}
};
function v6FamilyKey(name){
  const x=String(name||'SKU').normalize?.('NFKC')||String(name||'SKU');
  return 'family:'+x.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^\w\u00C0-\uFFFF]+/g,'_').replace(/^_+|_+$/g,'');
}
function v6FamilyName(s){return String(s?.familyName||s?.name||'SKU').trim()||String(s?.name||'SKU')}
function v6FamilyId(s){return String(s?.familyId||v6FamilyKey(v6FamilyName(s)))}
function v6Brand(s){return String(s?.brand||'').trim()}
function v6BaseMeasure(s){
  const unit=String(s?.unit||'').trim();
  if(/^kg$/i.test(unit))return{value:1,unit:'kg'};
  if(/^g$/i.test(unit))return{value:.001,unit:'kg'};
  if(/^l$/i.test(unit))return{value:1,unit:'L'};
  if(/^ml$/i.test(unit))return{value:.001,unit:'L'};
  const spec=String(s?.spec||'').trim().replace(/,/g,'.');
  if(!spec||/[–—~-]\s*\d/.test(spec))return null;
  let m=spec.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
  if(m){
    const n=Number(m[1]),u=m[2].toLowerCase();
    if(!(n>=0))return null;
    if(u==='kg')return{value:n,unit:'kg'};
    if(u==='g')return{value:n/1000,unit:'kg'};
    if(u==='l')return{value:n,unit:'L'};
    if(u==='ml')return{value:n/1000,unit:'L'};
  }
  m=spec.match(/(\d+(?:\.\d+)?)\s*(颗|張|张|片|个)(?:装|\/|$)/);
  if(m)return{value:Number(m[1]),unit:m[2]==='張'?'张':m[2]};
  return null;
}
function v6PackageSummary(rows){
  const byUnit=new Map();
  rows.forEach(x=>{const u=String(x.unit||'单位');byUnit.set(u,(byUnit.get(u)||0)+(Number(x.qty)||0))});
  return [...byUnit.entries()].map(([u,q])=>fmt(q)+' '+u).join(' + ');
}
function v6FamilyStockSummary(rows){
  const measures=rows.map(v6BaseMeasure),same=measures.length&&measures.every(Boolean)&&measures.every(x=>x.unit===measures[0].unit);
  const packages=v6PackageSummary(rows);
  if(same){
    const total=rows.reduce((n,x,i)=>n+(Number(x.qty)||0)*measures[i].value,0);
    return{main:fmt(total),unit:measures[0].unit,detail:packages};
  }
  if(rows.length&&rows.every(x=>String(x.unit||'')===String(rows[0].unit||''))){
    return{main:fmt(rows.reduce((n,x)=>n+(Number(x.qty)||0),0)),unit:String(rows[0].unit||''),detail:packages};
  }
  return{main:'混合',unit:'规格',detail:packages};
}
function v6SkuCompare(a,b){
  const ai=categories.indexOf(a.category),bi=categories.indexOf(b.category);
  const ac=ai<0?999:ai,bc=bi<0?999:bi;
  if(ac!==bc)return ac-bc;
  const fa=v6FamilyName(a),fb=v6FamilyName(b),fc=fa.localeCompare(fb,'zh-CN',{numeric:true,sensitivity:'base'});
  if(fc)return fc;
  const bc2=v6Brand(a).localeCompare(v6Brand(b),'zh-CN',{numeric:true,sensitivity:'base'});if(bc2)return bc2;
  const sc=String(a.spec||'').localeCompare(String(b.spec||''),'zh-CN',{numeric:true,sensitivity:'base'});if(sc)return sc;
  return String(a.name||'').localeCompare(String(b.name||''),'zh-CN',{numeric:true,sensitivity:'base'});
}
function v6SkuFamilies(rows){
  const map=new Map();
  rows.slice().sort(v6SkuCompare).forEach(x=>{
    const id=v6FamilyId(x);
    if(!map.has(id))map.set(id,{id,name:v6FamilyName(x),rows:[]});
    map.get(id).rows.push(x);
  });
  return [...map.values()];
}
function v3Num(v){if(v===''||v==null)return null;const n=typeof parseLocaleDecimal==='function'?parseLocaleDecimal(v):Number(v);return Number.isFinite(n)?n:null}
function v3DefaultWeeks(cat){if(cat==='蔬果')return .6;if(cat==='冷藏')return 1;if(cat==='处理库存')return 0;return 2}
function v3NormalizeSku(s){
  if(s.icon==null)s.icon=''; if(!s.warningMode)s.warningMode='auto'; if(!s.area)s.area='sushi';
  const familyDefault=v6FamilyDefaults[String(s.id)]||null;
  if(!String(s.familyName||'').trim())s.familyName=familyDefault?.familyName||String(s.name||'SKU').trim()||'SKU';
  if(!String(s.familyId||'').trim())s.familyId=v6FamilyKey(s.familyName);
  if(!String(s.brand||'').trim()&&familyDefault?.brand)s.brand=familyDefault.brand;
  s.brand=String(s.brand||'').trim();
  ['blueAt','yellowAt','redAt','targetQty','manualWeeklyUse'].forEach(k=>{s[k]=v3Num(s[k])});
  s.targetWeeks=v3Num(s.targetWeeks)??v3DefaultWeeks(s.category);
  s.orderUnit=String(s.orderUnit||s.unit||'').trim()||s.unit||'';
  s.unitsPerOrder=v3Num(s.unitsPerOrder);
  if(!(s.unitsPerOrder>0))s.unitsPerOrder=1;
  if(s.autoOrder==null)s.autoOrder=!v3NoAuto.has(s.id)&&!['内部','自种','待确认'].includes(s.supplier)&&s.category!=='处理库存';
  return s;
}
function v5OrderUnit(s){return String(s?.orderUnit||s?.unit||'')}
function v5UnitsPerOrder(s){const n=v3Num(s?.unitsPerOrder);return n>0?n:1}
function v5OrderToStockQty(s,qty){const n=v3Num(qty);return n==null?null:n*v5UnitsPerOrder(s)}
function v5StockToOrderQty(s,qty){const n=v3Num(qty);return n==null?null:n/v5UnitsPerOrder(s)}
function v5UsesPurchasePack(s){return v5UnitsPerOrder(s)!==1||v5OrderUnit(s)!==String(s?.unit||'')}
function v5PackLabel(s){return v5UsesPurchasePack(s)?`1${v5OrderUnit(s)} = ${fmt(v5UnitsPerOrder(s))}${s?.unit||''}`:''}
state.placedOrders=Array.isArray(state.placedOrders)?state.placedOrders:[];
state.hiddenSkuIds=Array.isArray(state.hiddenSkuIds)?state.hiddenSkuIds:[];
function v4NormalizeOrder(o){
  o.receiptBatches=Array.isArray(o.receiptBatches)?o.receiptBatches:[];
  o.items=Array.isArray(o.items)?o.items:[];
  o.items.forEach(i=>{
    const s=(state.skus||[]).find(x=>x.id===i.skuId);
    if(!i.area)i.area=v4AreaOf(s);
    if(!i.orderUnit)i.orderUnit=i.unit||s?.unit||'';
    if(!(Number(i.unitsPerOrder)>0))i.unitsPerOrder=1;
    if(i.orderQty==null)i.orderQty=(Number(i.orderedQty)||0)/Number(i.unitsPerOrder||1);
    const ordered=Math.max(0,Number(i.orderedQty)||0);
    const oldActual=Math.max(0,Number(i.actualQty)||0);
    if(i.creditedQty==null){
      if(o.status==='received')i.creditedQty=oldActual;
      else i.creditedQty=0;
    }
    i.creditedQty=Math.max(0,Number(i.creditedQty)||0);
    if(!i.lineStatus){
      if(o.status==='received'||i.reviewed){
        const q=oldActual;
        i.lineStatus=q<=0?'out':q<ordered?'short':q>ordered?'over':'received';
        i.dirty=o.status==='received'?false:!!i.reviewed;
      }else{
        i.lineStatus='pending';
        i.actualQty=i.creditedQty;
        i.dirty=false;
      }
    }
    if(i.actualQty==null)i.actualQty=i.creditedQty;
    i.actualQty=Math.max(i.creditedQty,Number(i.actualQty)||0);
    if(i.dirty==null)i.dirty=false;
  });
  if(o.status!=='received')o.status='open';
  return o;
}
function v3EnsureState(){
  state.placedOrders=Array.isArray(state.placedOrders)?state.placedOrders:[];
  state.hiddenSkuIds=Array.isArray(state.hiddenSkuIds)?state.hiddenSkuIds:[];
  state.priceRecords=Array.isArray(state.priceRecords)?state.priceRecords:[];
  state.customCategories=[...new Set((Array.isArray(state.customCategories)?state.customCategories:[]).map(x=>String(x||'').trim()).filter(Boolean))];
  state.skus=(Array.isArray(state.skus)?state.skus:[]).map(v3NormalizeSku);
  state.placedOrders=state.placedOrders.map(v4NormalizeOrder);
  state.version=6;
}
v3EnsureState(); saveState();
function v3Skus(){const hidden=state.hiddenSkuIds||[];return state.skus.filter(s=>!hidden.includes(s.id)).slice().sort(v6SkuCompare)}
function v3Cats(){return typeof inventoryCategories==='function'?inventoryCategories():[...new Set([...categories,...(state.customCategories||[]),...v3Skus().map(s=>s.category).filter(Boolean)])]}
function v3Suppliers(){return ['全部',...new Set([...suppliers.filter(s=>s!=='全部'),...v3Skus().map(s=>s.supplier).filter(Boolean)])]}
function v3Icon(s){return s?.icon||skuIcons[s?.id]||categoryIcons[s?.category]||'📦'}
function v3ParseCount(h){const m=String(h.text||'').match(/(-?\d+(?:\.\d+)?)\s*→\s*(-?\d+(?:\.\d+)?)/);return m?{old:Number(m[1]),next:Number(m[2])}:null}
function v3ParseMove(h){const m=String(h.text||'').match(/([+-])\s*(\d+(?:\.\d+)?)/);return m?Number(m[2]):0}
function v3WeeklyUse(s){
  if(Number(s.manualWeeklyUse)>0)return Number(s.manualWeeklyUse);
  const counts=state.history.filter(h=>!h.employeeSuperseded).map(h=>({h,c:h.type==='count'&&h.skuId===s.id?v3ParseCount(h):null})).filter(x=>x.c).sort((a,b)=>new Date(a.h.at)-new Date(b.h.at));
  if(counts.length<2)return null; const samples=[];
  for(let i=1;i<counts.length;i++){
    const a=counts[i-1],b=counts[i],start=new Date(a.h.at).getTime(),end=new Date(b.h.at).getTime(),days=(end-start)/86400000;if(days<1)continue;
    let arrivals=0,losses=0,out=0,into=0;
    state.history.forEach(h=>{if(h.employeeSuperseded)return;const t=new Date(h.at).getTime();if(t<=start||t>end)return;const q=v3ParseMove(h);if(h.skuId===s.id&&h.type==='arrival')arrivals+=q;if(h.skuId===s.id&&h.type==='loss')losses+=q;if(h.skuId===s.id&&h.type==='transfer')out+=q;if(h.targetId===s.id&&h.type==='transfer')into+=q});
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
function v5SuggestedOrderQty(s){const need=v3Suggestion(s);if(!(need>0))return 0;const factor=v5UnitsPerOrder(s);return v5UsesPurchasePack(s)?Math.ceil(need/factor):need}
function v5SuggestedStockQty(s){const q=v5SuggestedOrderQty(s);return q>0?q*v5UnitsPerOrder(s):0}
function v3StockoutText(s){
  const cov=v3Coverage(s),q=Number(s?.qty)||0;
  if(q<=0)return'已见底';
  if(!(cov>=0))return'';
  const days=cov*7;
  if(days>84)return`预计约 ${Math.round(days/7)} 周后见底`;
  const d=new Date(Date.now()+days*86400000),week=['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
  return`预计约 ${Math.max(1,Math.round(days))} 天后见底 · ${week}附近`;
}
function v3Hint(s){const level=v3Level(s),cov=v3Coverage(s),sug=v3Suggestion(s),manual=[s.redAt,s.yellowAt,s.blueAt].some(v=>v3Num(v)!=null),configured=s.warningMode==='manual'?manual:(cov!=null||v3Num(s.targetQty)!=null),names={zero:'❌ 0库存',red:'🔴 见底',yellow:'🟡 偏低',blue:'🔵 留意',ok:configured?'库存正常':'未设置预警'},parts=[names[level]],forecast=v3StockoutText(s);if(forecast)parts.push(forecast);if(sug>0){const oq=v5SuggestedOrderQty(s),sq=v5SuggestedStockQty(s);parts.push(v5UsesPurchasePack(s)?`建议 +${fmt(oq)}${v5OrderUnit(s)}（${fmt(sq)}${s.unit}）`:`建议 +${fmt(sug)}${s.unit}`)}return parts.join(' · ')}

/* Inventory v0.5 · Price Layer
   Manual price records, IVA normalization, history and compact price tags.
   PDF quote ingestion will write into the same priceRecords[] model later. */

const V45_PRICE_SOURCES={
  manual:'手动',
  quote:'报价单',
  actual:'实际采购'
};
const V45_VAT_LABELS={
  unknown:'IVA 未确认',
  excluded:'IVA 未含',
  included:'IVA 已含'
};

function v45LocalDate(){
  const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function v45Money(v){
  const n=Number(v);
  return Number.isFinite(n)?'€'+n.toFixed(2):'—';
}
function v45RoundMoney(v){
  return Number.isFinite(Number(v))?Math.round(Number(v)*10000)/10000:null;
}
function v45NormalizePriceRecord(r){
  if(!r||typeof r!=='object')return r;
  r.source=r.source||'manual';
  r.vatMode=['included','excluded','unknown'].includes(r.vatMode)?r.vatMode:'unknown';
  r.amount=Number(r.amount)||0;
  r.vatRate=(r.vatRate===''||r.vatRate==null)?null:Number(r.vatRate);
  if(!Number.isFinite(r.vatRate))r.vatRate=null;
  r.priceUnit=r.priceUnit||'';
  r.quoteSpec=r.quoteSpec||'';
  r.supplier=r.supplier||'';
  r.recordDate=r.recordDate||String(r.createdAt||stamp()).slice(0,10);
  if(r.netAmount==null||r.grossAmount==null){
    const calc=v45CalcAmounts(r.amount,r.vatMode,r.vatRate);
    if(r.netAmount==null)r.netAmount=calc.net;
    if(r.grossAmount==null)r.grossAmount=calc.gross;
  }
  return r;
}
function v45EnsurePriceState(){
  state.priceRecords=Array.isArray(state.priceRecords)?state.priceRecords.map(v45NormalizePriceRecord):[];
}
v45EnsurePriceState();

function v45CalcAmounts(amount,vatMode,vatRate){
  const a=Number(amount),rate=vatRate===''||vatRate==null?null:Number(vatRate);
  if(!(a>=0))return {net:null,gross:null};
  const factor=rate!=null&&Number.isFinite(rate)?1+rate/100:null;
  if(vatMode==='excluded')return {net:v45RoundMoney(a),gross:factor?v45RoundMoney(a*factor):null};
  if(vatMode==='included')return {net:factor?v45RoundMoney(a/factor):null,gross:v45RoundMoney(a)};
  return {net:null,gross:null};
}
function v45PriceRecordsFor(skuId){
  return (state.priceRecords||[]).filter(r=>r.skuId===skuId).slice().sort((a,b)=>{
    const ad=String(a.recordDate||'')+' '+String(a.createdAt||''),bd=String(b.recordDate||'')+' '+String(b.createdAt||'');
    return bd.localeCompare(ad);
  });
}
function v45LatestPrice(skuId){return v45PriceRecordsFor(skuId)[0]||null}
function v45ComparablePrevious(latest){
  if(!latest)return null;
  const rows=v45PriceRecordsFor(latest.skuId),idx=rows.findIndex(r=>r.id===latest.id);
  const older=idx>=0?rows.slice(idx+1):rows;
  const spec=String(latest.quoteSpec||'').trim().toLowerCase(),unit=String(latest.priceUnit||'').trim().toLowerCase();
  return older.find(r=>
    String(r.supplier||'')===String(latest.supplier||'')
    && String(r.priceUnit||'').trim().toLowerCase()===unit
    && String(r.quoteSpec||'').trim().toLowerCase()===spec
  )||null;
}
function v45Comparison(latest,previous){
  if(!latest||!previous)return null;
  let a=null,b=null,basis='';
  if(latest.netAmount!=null&&previous.netAmount!=null){
    a=Number(latest.netAmount);b=Number(previous.netAmount);basis='未税';
  }else if(latest.vatMode===previous.vatMode){
    a=Number(latest.amount);b=Number(previous.amount);basis=latest.vatMode==='included'?'含税':'原报价';
  }
  if(!(a>0)||!(b>0))return null;
  return {pct:(a-b)/b*100,delta:a-b,basis,current:a,previous:b};
}
function v45VatShort(r){
  if(!r)return'';
  if(r.vatMode==='unknown')return 'IVA ?';
  const rate=r.vatRate==null?'':(' '+fmt(r.vatRate)+'%');
  return r.vatMode==='included'?('IVA incl.'+rate):('IVA escl.'+rate);
}
function v45SourceLabel(source){return V45_PRICE_SOURCES[source]||source||'手动'}
function v45PricePill(s){
  const r=v45LatestPrice(s?.id);
  if(!r)return'';
  return `<span class="meta-pill v45-price-pill">💶 ${escapeHtml(v45Money(r.amount))}/${escapeHtml(r.priceUnit||s?.unit||'')} · ${escapeHtml(v45VatShort(r))}</span>`;
}
function v45TrendText(latest){
  const prev=v45ComparablePrevious(latest),cmp=v45Comparison(latest,prev);
  if(!prev)return {cls:'neutral',text:'第一条价格记录'};
  if(!cmp)return {cls:'neutral',text:'上次规格 / IVA 基准不同，暂不比较'};
  if(Math.abs(cmp.pct)<0.01)return {cls:'same',text:`${cmp.basis}价格与上次相同`};
  const up=cmp.pct>0;
  return {cls:up?'up':'down',text:`${up?'↑':'↓'} ${Math.abs(cmp.pct).toFixed(1)}% · 上次 ${v45Money(cmp.b)}`};
}
function v45RenderSkuPriceCard(skuId){
  const card=document.getElementById('v45PriceCard');if(!card)return;
  const main=document.getElementById('v45PriceMain'),meta=document.getElementById('v45PriceMeta'),trend=document.getElementById('v45PriceTrend');
  const add=document.getElementById('v45AddPrice'),hist=document.getElementById('v45PriceHistoryBtn');
  if(!skuId){
    main.textContent='先保存 SKU';
    meta.textContent='保存后即可记录报价、IVA 与价格历史';
    trend.textContent='';
    trend.className='v45-price-trend neutral';
    add.disabled=true;hist.disabled=true;
    return;
  }
  add.disabled=false;
  const rows=v45PriceRecordsFor(skuId),r=rows[0];
  hist.disabled=!rows.length;
  if(!r){
    main.textContent='尚未记录价格';
    meta.textContent='支持手动报价 / 报价单 / 实际采购';
    trend.textContent='＋ 记录第一条价格';
    trend.className='v45-price-trend neutral';
    return;
  }
  main.textContent=`${v45Money(r.amount)} / ${r.priceUnit||sku(skuId)?.unit||'单位'}`;
  const calc=[];
  if(r.netAmount!=null)calc.push('未税 '+v45Money(r.netAmount));
  if(r.grossAmount!=null)calc.push('含税 '+v45Money(r.grossAmount));
  meta.textContent=[r.supplier||'供应商未填',v45SourceLabel(r.source),v45VatShort(r),...calc].filter(Boolean).join(' · ');
  const t=v45TrendText(r);
  trend.textContent=t.text;trend.className='v45-price-trend '+t.cls;
}
function v45OpenPriceDialog(skuId){
  const s=sku(skuId);if(!s){showToast('先保存 SKU');return}
  const latest=v45LatestPrice(skuId);
  document.getElementById('v45PriceSkuId').value=skuId;
  document.getElementById('v45PriceTitle').textContent=s.name+' · 记录价格';
  document.getElementById('v45Amount').value='';
  document.getElementById('v45PriceUnit').value=latest?.priceUnit||s.unit||'';
  document.getElementById('v45PriceSupplier').value=latest?.supplier||s.supplier||'';
  document.getElementById('v45PriceSource').value='manual';
  document.getElementById('v45PriceDate').value=v45LocalDate();
  document.getElementById('v45QuoteSpec').value=latest?.quoteSpec||s.spec||'';
  document.getElementById('v45VatMode').value=latest?.vatMode||'unknown';
  document.getElementById('v45VatRate').value=latest?.vatRate??'';
  document.getElementById('v45PriceNote').value='';
  v45RefreshPreview();
  document.getElementById('v45PriceDialog').showModal();
}
function v45RefreshPreview(){
  const a=Number(document.getElementById('v45Amount')?.value),mode=document.getElementById('v45VatMode')?.value||'unknown';
  const rateEl=document.getElementById('v45VatRate'),rate=rateEl?.value===''?null:Number(rateEl?.value);
  if(rateEl)rateEl.disabled=mode==='unknown';
  const box=document.getElementById('v45PricePreview');if(!box)return;
  if(!(a>0)){box.innerHTML='<span>输入价格后，这里自动算 IVA。</span>';return}
  const c=v45CalcAmounts(a,mode,rate);
  if(mode==='unknown'){
    box.innerHTML=`<div><span>输入价</span><b>${escapeHtml(v45Money(a))}</b></div><p>IVA 尚未确认，暂不做税前 / 税后换算。</p>`;
    return;
  }
  const modeText=mode==='excluded'?'报价未含 IVA':'报价已含 IVA';
  box.innerHTML=`<div><span>${modeText}</span><b>${rate==null?'税率待填':escapeHtml(fmt(rate))+'%'}</b></div><div class="v45-preview-grid"><span>未税 <b>${escapeHtml(v45Money(c.net))}</b></span><span>含税 <b>${escapeHtml(v45Money(c.gross))}</b></span></div>`;
}
function v45SavePrice(){
  const skuId=document.getElementById('v45PriceSkuId').value,s=sku(skuId);
  if(!s)return;
  const amount=Number(document.getElementById('v45Amount').value),priceUnit=document.getElementById('v45PriceUnit').value.trim();
  const supplier=document.getElementById('v45PriceSupplier').value.trim(),source=document.getElementById('v45PriceSource').value;
  const recordDate=document.getElementById('v45PriceDate').value||v45LocalDate(),quoteSpec=document.getElementById('v45QuoteSpec').value.trim();
  const vatMode=document.getElementById('v45VatMode').value,rateRaw=document.getElementById('v45VatRate').value;
  const vatRate=vatMode==='unknown'||rateRaw===''?null:Number(rateRaw),note=document.getElementById('v45PriceNote').value.trim();
  if(!(amount>0)){showToast('价格要大于 0');return}
  if(!priceUnit){showToast('报价单位要填');return}
  if(!supplier){showToast('供应商要填');return}
  if(vatRate!=null&&(!Number.isFinite(vatRate)||vatRate<0||vatRate>100)){showToast('IVA 税率不对');return}
  const calc=v45CalcAmounts(amount,vatMode,vatRate);
  const rec={
    id:crypto.randomUUID?.()||('price_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)),
    skuId,skuName:s.name,supplier,recordDate,createdAt:stamp(),source,currency:'EUR',
    amount:v45RoundMoney(amount),priceUnit,quoteSpec,vatMode,vatRate,
    netAmount:calc.net,grossAmount:calc.gross,note
  };
  state.priceRecords.push(rec);
  saveState();
  document.getElementById('v45PriceDialog').close();
  v45RenderSkuPriceCard(skuId);
  if(typeof renderStock==='function')renderStock();
  if(typeof renderOrder==='function')renderOrder();
  showToast('价格记录已保存');
}
function v45OpenPriceHistory(skuId){
  const s=sku(skuId);if(!s)return;
  const rows=v45PriceRecordsFor(skuId),root=document.getElementById('v45PriceHistoryList');
  document.getElementById('v45PriceHistoryTitle').textContent=s.name+' · 价格历史';
  root.innerHTML=rows.length?rows.map((r,idx)=>{
    const prev=v45ComparablePrevious(r),cmp=v45Comparison(r,prev);
    const trend=cmp?(Math.abs(cmp.pct)<.01?'= 0%':((cmp.pct>0?'↑ ':'↓ ')+Math.abs(cmp.pct).toFixed(1)+'%')):'';
    const calc=[];
    if(r.netAmount!=null)calc.push('未税 '+v45Money(r.netAmount));
    if(r.grossAmount!=null)calc.push('含税 '+v45Money(r.grossAmount));
    return `<article class="v45-history-item">
      <div class="v45-history-top"><div><b>${escapeHtml(v45Money(r.amount))} / ${escapeHtml(r.priceUnit)}</b><span class="v45-history-trend ${cmp?(cmp.pct>0?'up':cmp.pct<0?'down':'same'):'neutral'}">${escapeHtml(trend)}</span></div><time>${escapeHtml(r.recordDate||'')}</time></div>
      <div class="v45-history-tags"><span>${escapeHtml(r.supplier||'')}</span><span>${escapeHtml(v45SourceLabel(r.source))}</span><span>${escapeHtml(v45VatShort(r))}</span></div>
      ${r.quoteSpec?`<p>规格：${escapeHtml(r.quoteSpec)}</p>`:''}
      ${calc.length?`<p>${escapeHtml(calc.join(' · '))}</p>`:''}
      ${r.note?`<p class="note">${escapeHtml(r.note)}</p>`:''}
    </article>`;
  }).join(''):'<div class="empty">还没有价格历史。</div>';
  document.getElementById('v45PriceHistoryDialog').showModal();
}
function v45BindPriceUi(){
  document.getElementById('v45AddPrice')?.addEventListener('click',()=>{
    const id=document.getElementById('v3SkuId').value;v45OpenPriceDialog(id);
  });
  document.getElementById('v45PriceHistoryBtn')?.addEventListener('click',()=>{
    const id=document.getElementById('v3SkuId').value;v45OpenPriceHistory(id);
  });
  ['v45Amount','v45VatMode','v45VatRate'].forEach(id=>document.getElementById(id)?.addEventListener('input',v45RefreshPreview));
  document.getElementById('v45VatMode')?.addEventListener('change',v45RefreshPreview);
  document.getElementById('v45SavePrice')?.addEventListener('click',e=>{e.preventDefault();v45SavePrice()});
}
v45BindPriceUi();

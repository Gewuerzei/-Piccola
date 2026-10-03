/* Inventory v0.4 · areas + open / partial receiving */

renderCategoryFilter=function(){
  const el=document.getElementById('categoryFilter'),cur=el.value||'全部';
  el.innerHTML=['全部',...v3Cats()].map(c=>`<option ${c===cur?'selected':''}>${escapeHtml(c)}</option>`).join('');
};
renderSupplierTabs=function(){
  document.getElementById('supplierTabs').innerHTML=v3Suppliers().map(s=>`<button class="${s===activeSupplier?'active':''}" data-supplier="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('');
};

function v4RenderAreaTabs(){
  document.querySelectorAll('[data-v4-area]').forEach(b=>b.classList.toggle('active',b.dataset.v4Area===v4AreaFilter));
}
function v4AreaRows(rows,renderRow){
  return v4Areas.map(a=>{
    const list=rows.filter(x=>v4AreaOf(x)===a.id);
    if(!list.length)return '';
    return `<section class="v4-area-section"><div class="v4-area-head"><span>${a.icon} ${escapeHtml(a.label)}</span><b>${list.length} 项</b></div><div class="v4-area-body">${list.map(renderRow).join('')}</div></section>`;
  }).join('');
}

renderStock=function(){
  v4RenderAreaTabs();
  const q=document.getElementById('searchInput').value.trim().toLowerCase();
  const cat=document.getElementById('categoryFilter').value||'全部';
  const rows=v3Skus().filter(x=>v4AreaOf(x)===v4AreaFilter).filter(x=>(cat==='全部'||x.category===cat)&&(!q||`${x.name} ${x.spec} ${x.supplier}`.toLowerCase().includes(q)));
  document.getElementById('stockList').innerHTML=rows.length?rows.map(x=>{
    const use=v3WeeklyUse(x);
    return `<article class="sku-card"><div class="sku-top"><div class="sku-main"><div class="sku-icon">${v3Icon(x)}</div><div class="sku-copy"><div class="sku-name">${escapeHtml(x.name)}</div><div class="sku-meta">${x.spec?`<span class="meta-pill spec">${escapeHtml(x.spec)}</span>`:''}<span class="meta-pill">${categoryIcons[x.category]||'📦'} ${escapeHtml(x.category)}</span><span class="meta-pill">${escapeHtml(x.supplier)}</span>${typeof v45PricePill==='function'?v45PricePill(x):''}</div><div class="v3-stock-hint">${escapeHtml(v3Hint(x))}${use?` · 周耗≈${fmt(use)}`:''}</div></div></div><div class="stock-value v3-${v3Level(x)}">${fmt(x.qty)} <small>${escapeHtml(x.unit)}</small></div></div><div class="sku-actions v3-four"><button class="mini-btn" data-action="operate" data-id="${x.id}">到货/报损</button><button class="mini-btn" data-action="order" data-id="${x.id}">＋订货</button><button class="mini-btn" data-action="set" data-id="${x.id}">设库存</button><button class="mini-btn" data-v3-edit="${x.id}">编辑</button></div></article>`;
  }).join(''):'<div class="empty">这个区域还没有匹配的 SKU 🗿</div>';
  const areaSkus=v3Skus().filter(x=>v4AreaOf(x)===v4AreaFilter);
  const alerts=areaSkus.filter(x=>['zero','red','yellow'].includes(v3Level(x))).length;
  const pending=Object.keys(state.order).filter(id=>Number(state.order[id])>0&&v4AreaOf(sku(id))===v4AreaFilter).length;
  document.getElementById('stockSummary').innerHTML=`<div class="summary-card"><span>📚 本区SKU</span><b>${areaSkus.length}</b></div><div class="summary-card"><span>⚠️ 需留意</span><b>${alerts}</b></div><div class="summary-card"><span>🛒 草稿</span><b>${pending}</b></div>`;
};

renderCount=function(){
  v4RenderAreaTabs();
  const area=v4AreaMeta(v4AreaFilter);
  const html=v3Cats().map(cat=>{
    const rows=v3Skus().filter(x=>v4AreaOf(x)===v4AreaFilter&&x.category===cat);
    if(!rows.length)return'';
    return `<section class="count-group"><div class="count-title"><span class="category-bubble">${categoryIcons[cat]||'📦'}</span>${escapeHtml(cat)}</div>${rows.map(x=>`<div class="count-row"><div class="count-label"><span class="count-mini-icon">${v3Icon(x)}</span><div class="count-label-text"><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.spec||'无规格')} · 当前 ${fmt(x.qty)} ${escapeHtml(x.unit)}</small></div></div><div class="input-unit"><input class="count-input" data-id="${x.id}" type="number" step="0.1" inputmode="decimal" placeholder="—"><span>${escapeHtml(x.unit)}</span></div></div>`).join('')}</section>`;
  }).join('');
  document.getElementById('countList').innerHTML=html||`<div class="empty">${area.icon} ${escapeHtml(area.label)} 还没有 SKU</div>`;
};

function v3RenderOrder(){
  document.querySelectorAll('[data-v3-order-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v3OrderMode===v3OrderMode));
  document.getElementById('v3DraftPane').classList.toggle('hidden',v3OrderMode!=='draft');
  document.getElementById('v3PlacedPane').classList.toggle('hidden',v3OrderMode!=='placed');
  if(v3OrderMode==='draft')v3RenderDraft();else v3RenderPlaced();
}
renderOrder=v3RenderOrder;

function v4DraftRow(x){
  const a=v4AreaMeta(v4AreaOf(x));
  return `<article class="sku-card order-row"><div class="order-left"><span class="count-mini-icon">${v3Icon(x)}</span><div><div class="sku-name">${escapeHtml(x.name)}</div><div class="sku-meta"><span class="meta-pill spec">${escapeHtml(x.spec||'无规格')}</span><span class="meta-pill">${escapeHtml(x.supplier)}</span><span class="meta-pill">${a.icon} ${escapeHtml(a.label)}</span>${typeof v45PricePill==='function'?v45PricePill(x):''}${v3Suggestion(x)>0?`<span class="meta-pill v3-suggest">建议 ${fmt(v3Suggestion(x))}</span>`:''}</div></div></div><div class="input-unit"><input class="order-input" data-id="${x.id}" value="${fmt(state.order[x.id])}" type="number" step="0.1" inputmode="decimal"><span>${escapeHtml(x.unit)}</span></div><button class="icon-btn" data-remove-order="${x.id}">✕</button></article>`;
}
function v3RenderDraft(){
  const ids=Object.keys(state.order).filter(id=>Number(state.order[id])>0);
  const rows=ids.map(id=>sku(id)).filter(Boolean).filter(x=>!(state.hiddenSkuIds||[]).includes(x.id)).filter(x=>activeSupplier==='全部'||x.supplier===activeSupplier);
  document.getElementById('orderList').innerHTML=rows.length?v4AreaRows(rows,v4DraftRow):'<div class="empty">还没有订货草稿 🗿</div>';
}
function v3Generate(){
  let n=0;
  v3Skus().forEach(s=>{const q=v3Suggestion(s);if(q>0&&!state.order[s.id]){state.order[s.id]=q;n++}});
  saveState();renderAll();showToast(n?`已加入 ${n} 个建议`:'目前没有可计算的新建议');
}
function v3Place(){
  const entries=Object.entries(state.order).filter(([,v])=>Number(v)>0).map(([id,v])=>({s:sku(id),v:Number(v)})).filter(x=>x.s&&!(state.hiddenSkuIds||[]).includes(x.s.id)).filter(x=>activeSupplier==='全部'||x.s.supplier===activeSupplier);
  if(!entries.length){showToast('当前筛选下没有草稿');return}
  const groups=new Map();
  entries.forEach(x=>{if(!groups.has(x.s.supplier))groups.set(x.s.supplier,[]);groups.get(x.s.supplier).push(x)});
  groups.forEach((rows,supplier)=>{
    const o={
      id:crypto.randomUUID?.()||String(Date.now()+Math.random()),
      supplier,createdAt:stamp(),status:'open',partial:false,receiptBatches:[],
      items:rows.map(({s,v})=>({
        skuId:s.id,skuName:s.name,spec:s.spec||'',unit:s.unit,area:v4AreaOf(s),orderedQty:v,
        actualQty:0,creditedQty:0,lineStatus:'pending',dirty:false
      }))
    };
    state.placedOrders.push(o);
    rows.forEach(({s})=>delete state.order[s.id]);
    addHistory('order',rows[0].s.id,`${supplier}：${rows.length} 个 SKU 已下单`,'',{orderId:o.id});
  });
  saveState();v3OrderMode='placed';renderAll();showToast('已转入“已下单”');
}
function v3OrderItem(orderId,skuId){
  const o=state.placedOrders.find(x=>x.id===orderId);
  return{o,item:o?.items.find(i=>i.skuId===skuId)};
}

const v4LineStates={
  pending:{icon:'·',label:'待核对',open:true},
  later:{icon:'🕒',label:'晚到 / 待补',open:true},
  other:{icon:'👥',label:'待他人核对',open:true},
  received:{icon:'✅',label:'收齐',open:false},
  short:{icon:'⬇️',label:'少到 · 已结案',open:false},
  over:{icon:'⬆️',label:'多到 · 已结案',open:false},
  out:{icon:'❌',label:'缺货 · 已结案',open:false}
};
function v4StateMeta(st){return v4LineStates[st]||v4LineStates.pending}
function v4LineClosed(i){return !v4StateMeta(i.lineStatus).open}
function v4OrderOpenItems(o){return (o.items||[]).filter(i=>!v4LineClosed(i))}
function v4OrderDirty(o){return (o.items||[]).filter(i=>i.dirty)}
function v4QtyText(item){
  const unit=escapeHtml(item.unit||sku(item.skuId)?.unit||'');
  const credited=Number(item.creditedQty)||0;
  if(credited>0)return `已入库 ${fmt(credited)} ${unit} · 订 ${fmt(item.orderedQty)}`;
  return `订 ${fmt(item.orderedQty)} ${unit}`;
}
function v4ReceiveRow(o,item){
  const s=sku(item.skuId),st=v4StateMeta(item.lineStatus),closed=v4LineClosed(item)&&!item.dirty;
  const q=Math.max(Number(item.creditedQty)||0,Number(item.actualQty)||0);
  const a=v4AreaMeta(item.area||v4AreaOf(s));
  const rowCls=`v4-state-${item.lineStatus}${item.dirty?' is-dirty':''}${closed?' is-closed':''}`;
  const status=`${st.icon} ${st.label}${item.dirty?' · 待保存':''}`;
  return `<div class="v3-receive-row ${rowCls}" data-v3-order="${o.id}" data-v3-item="${item.skuId}">
    <div class="v3-receive-title"><span class="count-mini-icon">${v3Icon(s)}</span><div><strong>${escapeHtml(s?.name||item.skuName)}</strong><small>${v4QtyText(item)} · ${a.icon} ${escapeHtml(a.label)}</small></div><span class="v4-line-pill">${escapeHtml(status)}</span></div>
    <div class="v4-qty-caption"><span>累计实到</span><b>${q>(Number(item.creditedQty)||0)?('本次新增 +'+fmt(q-(Number(item.creditedQty)||0))+' '+escapeHtml(item.unit||s?.unit||'')):'本次新增 0'}</b></div>
    <div class="v3-stepper"><button ${closed?'disabled':''} data-v3-step="-1">−</button><input ${closed?'disabled':''} class="v3-receive-qty" type="number" step="0.1" inputmode="decimal" min="${fmt(item.creditedQty||0)}" value="${fmt(q)}"><button ${closed?'disabled':''} data-v3-step="1">＋</button></div>
    ${closed?`<div class="v4-closed-note">${st.icon} ${escapeHtml(st.label)} · 累计实到 ${fmt(item.creditedQty||0)} ${escapeHtml(item.unit||s?.unit||'')}</div>`:`
    <div class="v4-receive-actions">
      <button data-v4-line-status="received">✅ 收齐</button>
      <button data-v4-line-status="later">🕒 晚到</button>
      <button data-v4-line-status="other">👥 待他人</button>
      <button data-v4-line-status="out">❌ 缺货</button>
      <button data-v4-line-status="short">⬇️ 少到</button>
      <button data-v4-line-status="over">⬆️ 多到</button>
    </div>`}
  </div>`;
}
function v4OrderAreaSections(o){
  return v4Areas.map(a=>{
    const items=(o.items||[]).filter(i=>(i.area||v4AreaOf(sku(i.skuId)))===a.id);
    if(!items.length)return'';
    const outstanding=items.filter(i=>!v4LineClosed(i)||i.dirty).length;
    return `<section class="v4-receive-area"><div class="v4-area-head"><span>${a.icon} ${escapeHtml(a.label)}</span><b>${outstanding?('🔔 '+outstanding+' 待处理'):'✓ 已处理'}</b></div><div class="v3-receive-list">${items.map(i=>v4ReceiveRow(o,i)).join('')}</div></section>`;
  }).join('');
}
function v4RenderReceivingBell(){
  const box=document.getElementById('v4ReceivingBell');if(!box)return;
  const openOrders=(state.placedOrders||[]).filter(o=>o.status!=='received');
  const items=openOrders.flatMap(o=>(o.items||[]).filter(i=>!v4LineClosed(i)||i.dirty));
  if(!items.length){box.classList.add('hidden');box.innerHTML='';return}
  const later=items.filter(i=>i.lineStatus==='later'&&!i.dirty).length;
  const other=items.filter(i=>i.lineStatus==='other'&&!i.dirty).length;
  const pending=items.filter(i=>i.lineStatus==='pending').length;
  const unsaved=items.filter(i=>i.dirty&&i.lineStatus!=='pending').length;
  box.classList.remove('hidden');
  box.innerHTML=`<div><span class="v4-bell-icon">🔔</span><div><b>还有 ${items.length} 项未结束</b><small>待核对 ${pending} · 晚到 ${later} · 待他人 ${other} · 待保存 ${unsaved}</small></div></div><span>${openOrders.length} 张单</span>`;
}
function v3RenderPlaced(){
  const orders=state.placedOrders.slice().reverse();
  v4RenderReceivingBell();
  document.getElementById('v3PlacedList').innerHTML=orders.length?orders.map(o=>{
    v4NormalizeOrder(o);
    const open=v4OrderOpenItems(o),dirty=v4OrderDirty(o),done=o.status==='received'||(open.length===0&&dirty.length===0);
    const dirtyClosed=dirty.filter(i=>v4LineClosed(i)).length;
    const status=done?'✅ 已结案':(open.length?`🔔 ${open.length} 项未结束`:`💾 ${dirtyClosed} 项待保存`);
    const batches=(o.receiptBatches||[]).length;
    return `<article class="v3-placed-card ${done?'done':''}">
      <div class="v3-placed-head"><div><div class="eyebrow">${escapeHtml(o.supplier||'订单')}</div><h3>${new Date(o.createdAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</h3><small class="v4-batch-count">${batches?('已保存 '+batches+' 次收货'):'尚未入库'}</small></div><span>${status}</span></div>
      ${v4OrderAreaSections(o)}
      <div class="v4-order-footer">
        <button class="btn secondary" data-v4-export-order="${o.id}">📤 本单 JSON</button>
        ${done?`<div class="v3-finished">这张供应商单已经结案，历史差异仍保留。</div>`:`<button class="btn primary large" data-v3-finish="${o.id}" ${dirty.length?'':'disabled'}>📥 保存本次收货${dirty.length?' · '+dirty.length+'项':''}</button>`}
      </div>
    </article>`;
  }).join(''):'<div class="empty">还没有“已下单”订单 📦</div>';
}
function v3Step(orderId,skuId,d){
  const {o,item}=v3OrderItem(orderId,skuId);if(!o||!item||o.status==='received'||(v4LineClosed(item)&&!item.dirty))return;
  const min=Number(item.creditedQty)||0;
  item.actualQty=Math.max(min,Math.round(((Number(item.actualQty)||0)+d)*10)/10);
  item.lineStatus='pending';item.dirty=true;
  saveState();v3RenderPlaced();
}
function v3Qty(orderId,skuId,v){
  const {o,item}=v3OrderItem(orderId,skuId);if(!o||!item||o.status==='received'||(v4LineClosed(item)&&!item.dirty))return;
  const min=Number(item.creditedQty)||0,n=Math.max(min,Number(v)||0);
  item.actualQty=n;item.lineStatus='pending';item.dirty=true;
  saveState();v3RenderPlaced();
}
function v4SetLineStatus(orderId,skuId,status){
  const {o,item}=v3OrderItem(orderId,skuId);if(!o||!item||o.status==='received')return;
  const ordered=Number(item.orderedQty)||0,credited=Number(item.creditedQty)||0,q=Math.max(credited,Number(item.actualQty)||0);
  if(status==='received'){
    if(credited>ordered){item.lineStatus='over';item.actualQty=credited}
    else{item.lineStatus='received';item.actualQty=ordered}
  }else if(status==='later'){
    if(q>=ordered&&ordered>0){showToast('数量已经到齐，用“收齐”或“多到”');return}
    item.lineStatus='later';item.actualQty=q;
  }else if(status==='other'){
    item.lineStatus='other';item.actualQty=credited;
  }else if(status==='out'){
    item.lineStatus='out';item.actualQty=credited;
  }else if(status==='short'){
    if(!(q>0&&q<ordered)){showToast('“少到”要先填 0 和订货量之间的实到数量');return}
    item.lineStatus='short';item.actualQty=q;
  }else if(status==='over'){
    if(!(q>ordered)){showToast('“多到”要先填大于订货量的实到数量');return}
    item.lineStatus='over';item.actualQty=q;
  }else return;
  item.dirty=true;
  saveState();v3RenderPlaced();
}
function v3Finish(id){
  const o=state.placedOrders.find(x=>x.id===id);if(!o||o.status==='received')return;
  const dirty=v4OrderDirty(o);
  if(!dirty.length){showToast('先选择这次收货的处理结果');return}
  if(dirty.some(i=>i.lineStatus==='pending')){showToast('有改过数量的货品还没选“收齐 / 晚到 / 少到…”');return}
  const at=stamp(),batch={id:crypto.randomUUID?.()||String(Date.now()+Math.random()),at,deviceName:state.syncMeta?.deviceName||'本设备',lines:[]};
  dirty.forEach(i=>{
    const s=sku(i.skuId),before=Number(i.creditedQty)||0,after=Math.max(before,Number(i.actualQty)||0),delta=after-before;
    if(s&&delta>0){
      s.qty=Number(s.qty)+delta;
      addHistory('arrival',s.id,`+${fmt(delta)} ${s.unit} → ${fmt(s.qty)} ${s.unit}`,`${o.supplier} · 分批收货 · ${v4StateMeta(i.lineStatus).label}`,{orderId:o.id,receiptId:batch.id});
    }
    i.creditedQty=after;i.dirty=false;i.reviewed=true;
    if(v4LineClosed(i))i.closedAt=at;
    batch.lines.push({skuId:i.skuId,deltaQty:delta,cumulativeActualQty:after,status:i.lineStatus});
  });
  o.receiptBatches=o.receiptBatches||[];o.receiptBatches.push(batch);
  const open=v4OrderOpenItems(o);
  o.status=open.length?'open':'received';
  if(!open.length)o.receivedAt=at;
  o.partial=(o.items||[]).some(i=>['short','over','out'].includes(i.lineStatus));
  saveState();renderAll();
  showToast(open.length?`本次已入库，🔔 还有 ${open.length} 项挂着`:(o.partial?'订单已结案（有差异）':'收货完成'));
}
function v4CopyPlacedOrder(id){
  const o=state.placedOrders.find(x=>x.id===id);if(!o)return;
  const rows=(o.items||[]).map(i=>{
    const s=sku(i.skuId),name=i.skuName||s?.name||'SKU',spec=i.spec||s?.spec||'',unit=i.unit||s?.unit||'';
    return `${name}${spec?' '+spec:''} x${fmt(i.orderedQty)}${unit}`;
  });
  if(!rows.length){showToast('这张订单没有商品');return}
  const txt=rows.join('\n'),supplier=o.supplier||'供应商';
  navigator.clipboard?.writeText(txt).then(()=>showToast(`${supplier} 订单已复制`)).catch(()=>{prompt(`复制给 ${supplier}：`,txt)});
}
function v4ExportOrder(id){
  const o=state.placedOrders.find(x=>x.id===id);if(!o)return;
  const skuIds=new Set((o.items||[]).map(i=>i.skuId));
  const payload={
    format:'cassola-order-handoff-v1',exportedAt:stamp(),exportDevice:state.syncMeta?.deviceName||'本设备',
    order:JSON.parse(JSON.stringify(o)),
    skus:v3Skus().filter(s=>skuIds.has(s.id)).map(s=>({id:s.id,name:s.name,spec:s.spec,unit:s.unit,area:v4AreaOf(s),supplier:s.supplier}))
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const day=new Date().toISOString().slice(0,10),safe=String(o.supplier||'order').replace(/[^\w\u4e00-\u9fff-]+/g,'-');
  a.download=`cassola-order-${safe}-${day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showToast('本单 JSON 已导出');
}

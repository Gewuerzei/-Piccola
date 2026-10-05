/* Inventory v0.6.2 · active receiving inbox + year / quarter / week archive */
let v4ArchiveYearOpen=null;
let v4ArchiveQuarterOpen=null;
let v4ArchiveWeekOpen=null;
const v4ExpandedSettledOrders=new Set();
let v4PendingFocusIndex=0;

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
    return `<section class="count-group"><div class="count-title"><span class="category-bubble">${categoryIcons[cat]||'📦'}</span>${escapeHtml(cat)}</div>${rows.map(x=>`<div class="count-row"><div class="count-label"><span class="count-mini-icon">${v3Icon(x)}</span><div class="count-label-text"><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.spec||'无规格')} · 当前 ${fmt(x.qty)} ${escapeHtml(x.unit)}</small></div></div><div class="input-unit"><input class="count-input" data-id="${x.id}" type="text" inputmode="decimal" autocomplete="off" placeholder="—"><span>${escapeHtml(x.unit)}</span></div></div>`).join('')}</section>`;
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
  const a=v4AreaMeta(v4AreaOf(x)),orderQty=v5StockToOrderQty(x,state.order[x.id])??0,pack=v5PackLabel(x),suggested=v5SuggestedOrderQty(x);
  return `<article class="sku-card order-row"><div class="order-left"><span class="count-mini-icon">${v3Icon(x)}</span><div><div class="sku-name">${escapeHtml(x.name)}</div><div class="sku-meta"><span class="meta-pill spec">${escapeHtml(x.spec||'无规格')}</span><span class="meta-pill">${escapeHtml(x.supplier)}</span><span class="meta-pill">${a.icon} ${escapeHtml(a.label)}</span>${pack?`<span class="meta-pill">📦 ${escapeHtml(pack)}</span>`:''}${typeof v45PricePill==='function'?v45PricePill(x):''}${suggested>0?`<span class="meta-pill v3-suggest">建议 ${fmt(suggested)}${escapeHtml(v5OrderUnit(x))}</span>`:''}</div></div></div><div class="input-unit"><input class="order-input" data-id="${x.id}" value="${fmt(orderQty)}" type="text" inputmode="decimal" autocomplete="off"><span>${escapeHtml(v5OrderUnit(x))}</span></div><button class="icon-btn" data-remove-order="${x.id}">✕</button></article>`;
}
function v3RenderDraft(){
  const ids=Object.keys(state.order).filter(id=>Number(state.order[id])>0);
  const rows=ids.map(id=>sku(id)).filter(Boolean).filter(x=>!(state.hiddenSkuIds||[]).includes(x.id)).filter(x=>activeSupplier==='全部'||x.supplier===activeSupplier);
  document.getElementById('orderList').innerHTML=rows.length?v4AreaRows(rows,v4DraftRow):'<div class="empty">还没有订货草稿 🗿</div>';
}
function v3Generate(){
  let n=0;
  v3Skus().forEach(s=>{const q=v5SuggestedStockQty(s);if(q>0&&!state.order[s.id]){state.order[s.id]=q;n++}});
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
        skuId:s.id,skuName:s.name,spec:s.spec||'',unit:s.unit,orderUnit:v5OrderUnit(s),unitsPerOrder:v5UnitsPerOrder(s),
        orderQty:v5StockToOrderQty(s,v),area:v4AreaOf(s),orderedQty:v,
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
function v5ItemFactor(item){const n=Number(item?.unitsPerOrder);return n>0?n:1}
function v5ItemOrderUnit(item){return String(item?.orderUnit||item?.unit||'')}
function v5ItemStockUnit(item){return String(item?.unit||'')}
function v5ItemOrderQty(item,stockQty){return (Number(stockQty)||0)/v5ItemFactor(item)}

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
  const stockUnit=escapeHtml(v5ItemStockUnit(item)),orderUnit=escapeHtml(v5ItemOrderUnit(item)),factor=v5ItemFactor(item);
  const ordered=Number(item.orderedQty)||0,orderedOrder=v5ItemOrderQty(item,ordered),credited=Number(item.creditedQty)||0,creditedOrder=v5ItemOrderQty(item,credited);
  const pack=factor!==1||orderUnit!==stockUnit;
  if(credited>0)return `已入库 ${fmt(creditedOrder)} ${orderUnit}${pack?` · ${fmt(credited)} ${stockUnit}`:''} · 订 ${fmt(orderedOrder)} ${orderUnit}`;
  return `订 ${fmt(orderedOrder)} ${orderUnit}${pack?` · ${fmt(ordered)} ${stockUnit}`:''}`;
}
function v4ReceiveRow(o,item){
  const s=sku(item.skuId),st=v4StateMeta(item.lineStatus),closed=v4LineClosed(item)&&!item.dirty;
  const q=Math.max(Number(item.creditedQty)||0,Number(item.actualQty)||0),credited=Number(item.creditedQty)||0;
  const orderUnit=v5ItemOrderUnit(item),stockUnit=v5ItemStockUnit(item),factor=v5ItemFactor(item),qOrder=v5ItemOrderQty(item,q),delta=q-credited,deltaOrder=v5ItemOrderQty(item,delta);
  const pack=factor!==1||orderUnit!==stockUnit,a=v4AreaMeta(item.area||v4AreaOf(s));
  const rowCls=`v4-state-${item.lineStatus}${item.dirty?' is-dirty':''}${closed?' is-closed':''}`;
  const status=`${st.icon} ${st.label}${item.dirty?' · 待保存':''}`;
  return `<div class="v3-receive-row ${rowCls}" data-v3-order="${o.id}" data-v3-item="${item.skuId}">
    <div class="v3-receive-title"><span class="count-mini-icon">${v3Icon(s)}</span><div><strong>${escapeHtml(s?.name||item.skuName)}</strong><small>${v4QtyText(item)} · ${a.icon} ${escapeHtml(a.label)}</small></div><span class="v4-line-pill">${escapeHtml(status)}</span></div>
    <div class="v4-qty-caption"><span>累计实到（${escapeHtml(orderUnit)}）</span><b>${delta>0?('本次新增 +'+fmt(deltaOrder)+' '+escapeHtml(orderUnit)+(pack?' · '+fmt(delta)+' '+escapeHtml(stockUnit):'')):'本次新增 0'}</b></div>
    <div class="v3-stepper"><button ${closed?'disabled':''} data-v3-step="-1">−</button><input ${closed?'disabled':''} class="v3-receive-qty" type="text" inputmode="decimal" autocomplete="off" value="${fmt(qOrder)}"><button ${closed?'disabled':''} data-v3-step="1">＋</button></div>
    ${closed?`<div class="v4-closed-note">${st.icon} ${escapeHtml(st.label)} · 累计实到 ${fmt(v5ItemOrderQty(item,item.creditedQty||0))} ${escapeHtml(orderUnit)}${pack?` · ${fmt(item.creditedQty||0)} ${escapeHtml(stockUnit)}`:''}</div>`:`
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
function v4ActionItems(o){return (o.items||[]).filter(i=>!v4LineClosed(i)||i.dirty)}
function v4SettledItems(o){return (o.items||[]).filter(i=>v4LineClosed(i)&&!i.dirty)}
function v4OrderDone(o){return o.status==='received'||(v4ActionItems(o).length===0&&v4OrderDirty(o).length===0)}
function v4OrderAreaSections(o,mode='all'){
  return v4Areas.map(a=>{
    let items=(o.items||[]).filter(i=>(i.area||v4AreaOf(sku(i.skuId)))===a.id);
    if(mode==='active')items=items.filter(i=>!v4LineClosed(i)||i.dirty);
    else if(mode==='settled')items=items.filter(i=>v4LineClosed(i)&&!i.dirty);
    if(!items.length)return'';
    const outstanding=items.filter(i=>!v4LineClosed(i)||i.dirty).length;
    return `<section class="v4-receive-area"><div class="v4-area-head"><span>${a.icon} ${escapeHtml(a.label)}</span><b>${outstanding?('🔔 '+outstanding+' 待处理'):'✓ 已处理'}</b></div><div class="v3-receive-list">${items.map(i=>v4ReceiveRow(o,i)).join('')}</div></section>`;
  }).join('');
}
function v4RenderReceivingBell(activeOrders){
  const box=document.getElementById('v4ReceivingBell');if(!box)return;
  const items=(activeOrders||[]).flatMap(v4ActionItems);
  if(!items.length){box.classList.add('hidden');box.innerHTML='';return}
  const later=items.filter(i=>i.lineStatus==='later'&&!i.dirty).length;
  const other=items.filter(i=>i.lineStatus==='other'&&!i.dirty).length;
  const pending=items.filter(i=>i.lineStatus==='pending').length;
  const unsaved=items.filter(i=>i.dirty&&i.lineStatus!=='pending').length;
  box.classList.remove('hidden');
  box.innerHTML=`<div class="v4-bell-copy"><span class="v4-bell-icon">🔔</span><div><b>还有 ${items.length} 项未结束</b><small>待核对 ${pending} · 晚到 ${later} · 待他人 ${other} · 待保存 ${unsaved}</small></div></div><div class="v4-bell-actions"><span>${activeOrders.length} 张单</span><button type="button" data-v4-focus-pending>🎯 定位未处理</button></div>`;
}
function v4WeekStartDate(value){
  const d=new Date(value||0);d.setHours(0,0,0,0);
  const mondayOffset=(d.getDay()+6)%7;
  d.setDate(d.getDate()-mondayOffset);
  return d;
}
function v4LocalDateKey(d){
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function v4WeekKey(o){return v4LocalDateKey(v4WeekStartDate(o.createdAt))}
function v4CurrentWeekKey(){return v4LocalDateKey(v4WeekStartDate(Date.now()))}
function v4WeekNumber(start){
  const d=new Date(start);d.setHours(0,0,0,0);
  const thursday=new Date(d);thursday.setDate(d.getDate()+3);
  const jan4=new Date(thursday.getFullYear(),0,4);jan4.setHours(0,0,0,0);
  const jan4Mon=new Date(jan4);jan4Mon.setDate(jan4.getDate()-((jan4.getDay()+6)%7));
  return 1+Math.round((d-jan4Mon)/604800000);
}
function v4WeekLabel(key){
  const start=new Date(key+'T00:00:00'),end=new Date(start);end.setDate(start.getDate()+6);
  const sameMonth=start.getMonth()===end.getMonth();
  const a=`${String(start.getMonth()+1).padStart(2,'0')}/${String(start.getDate()).padStart(2,'0')}`;
  const b=sameMonth?String(end.getDate()).padStart(2,'0'):`${String(end.getMonth()+1).padStart(2,'0')}/${String(end.getDate()).padStart(2,'0')}`;
  return `W${String(v4WeekNumber(start)).padStart(2,'0')} · ${a}–${b}`;
}
function v4ArchiveYearKeyFromWeek(key){return String(new Date(key+'T00:00:00').getFullYear())}
function v4ArchiveQuarterKeyFromWeek(key){
  const d=new Date(key+'T00:00:00');
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth()/3)+1}`;
}
function v4QuarterLabel(key){
  const [y,q]=String(key).split('-Q');
  const n=Number(q),a=(n-1)*3+1,b=n*3;
  return `${y} Q${n} · ${a}–${b}月`;
}
function v4PlacedCard(o,archived=false){
  v4NormalizeOrder(o);
  const open=v4OrderOpenItems(o),dirty=v4OrderDirty(o),done=v4OrderDone(o),dirtyClosed=dirty.filter(i=>v4LineClosed(i)).length;
  const settled=v4SettledItems(o),expanded=v4ExpandedSettledOrders.has(o.id);
  const status=done?'✅ 已结案':(open.length?`🔔 ${open.length} 项未结束`:`💾 ${dirtyClosed} 项待保存`);
  const batches=(o.receiptBatches||[]).length;
  const body=done?v4OrderAreaSections(o,'all'):
    v4OrderAreaSections(o,'active')+
    (settled.length?`<div class="v4-settled-fold"><button type="button" data-v4-toggle-settled="${escapeHtml(o.id)}">${expanded?'▴ 收起':'▾ 查看'}已处理 ${settled.length} 项</button>${expanded?`<div class="v4-settled-body">${v4OrderAreaSections(o,'settled')}</div>`:''}</div>`:'');
  return `<article class="v3-placed-card ${done?'done':'v4-open-order'} ${archived?'v4-archived-order':''}" data-v4-order-card="${escapeHtml(o.id)}">
    <div class="v3-placed-head"><div><div class="eyebrow">${escapeHtml(o.supplier||'订单')}</div><h3>${new Date(o.createdAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</h3><small class="v4-batch-count">${batches?('已保存 '+batches+' 次收货'):'尚未入库'}</small></div><span>${status}</span></div>
    ${body}
    <div class="v4-order-footer">
      <button class="btn secondary" data-v4-copy-order="${escapeHtml(o.id)}">📋 复制订单</button>
      <button class="btn secondary" data-v4-export-order="${escapeHtml(o.id)}">📤 本单 JSON</button>
      ${done?`<div class="v3-finished">历史已保留。</div>`:`<button class="btn primary large" data-v3-finish="${escapeHtml(o.id)}" ${dirty.length?'':'disabled'}>📥 保存本次收货${dirty.length?' · '+dirty.length+'项':''}</button>`}
    </div>
  </article>`;
}
function v4ArchiveTree(doneOrders){
  if(!doneOrders.length)return'';
  const currentWeek=v4CurrentWeekKey();
  const currentRows=doneOrders.filter(o=>v4WeekKey(o)===currentWeek).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const historical=doneOrders.filter(o=>v4WeekKey(o)!==currentWeek);
  const weeks=new Map();
  historical.forEach(o=>{
    const wk=v4WeekKey(o);
    if(!weeks.has(wk))weeks.set(wk,[]);
    weeks.get(wk).push(o);
  });
  const years=new Map();
  for(const [wk,rows] of weeks){
    const y=v4ArchiveYearKeyFromWeek(wk),q=v4ArchiveQuarterKeyFromWeek(wk);
    if(!years.has(y))years.set(y,new Map());
    if(!years.get(y).has(q))years.get(y).set(q,new Map());
    years.get(y).get(q).set(wk,rows);
  }
  const yearKeys=[...years.keys()].sort((a,b)=>Number(b)-Number(a));
  if(v4ArchiveYearOpen&&!years.has(v4ArchiveYearOpen)){v4ArchiveYearOpen=null;v4ArchiveQuarterOpen=null;v4ArchiveWeekOpen=null}
  const currentYearMap=v4ArchiveYearOpen?years.get(v4ArchiveYearOpen):null;
  if(v4ArchiveQuarterOpen&&(!currentYearMap||!currentYearMap.has(v4ArchiveQuarterOpen))){v4ArchiveQuarterOpen=null;v4ArchiveWeekOpen=null}
  const currentQuarterMap=v4ArchiveQuarterOpen&&currentYearMap?currentYearMap.get(v4ArchiveQuarterOpen):null;
  if(v4ArchiveWeekOpen&&(!currentQuarterMap||!currentQuarterMap.has(v4ArchiveWeekOpen)))v4ArchiveWeekOpen=null;

  const currentHtml=currentRows.length?`<section class="v4-current-week">
    <div class="v4-active-head"><div><b>📅 本周已结案</b><small>${escapeHtml(v4WeekLabel(currentWeek))} · 周一到周日</small></div><span>${currentRows.length} 张</span></div>
    ${currentRows.map(o=>v4PlacedCard(o,true)).join('')}
  </section>`:'';

  if(!historical.length)return currentHtml;

  const yearButtons=yearKeys.map(y=>{
    const qmap=years.get(y);
    let count=0;for(const wmap of qmap.values())for(const rows of wmap.values())count+=rows.length;
    return `<button type="button" class="${v4ArchiveYearOpen===y?'active':''}" data-v4-archive-year="${y}"><span>${y} 年</span><b>${count} 张</b></button>`;
  }).join('');

  let quarterHtml='';
  if(currentYearMap){
    const qs=[...currentYearMap.keys()].sort().reverse();
    const buttons=qs.map(q=>{
      const wmap=currentYearMap.get(q);let count=0;for(const rows of wmap.values())count+=rows.length;
      return `<button type="button" class="${v4ArchiveQuarterOpen===q?'active':''}" data-v4-archive-quarter="${q}"><span>${escapeHtml(v4QuarterLabel(q))}</span><b>${count} 张</b></button>`;
    }).join('');
    quarterHtml=`<div class="v4-archive-level"><div class="v4-archive-level-title">${escapeHtml(v4ArchiveYearOpen)} · 季度</div><div class="v4-archive-periods">${buttons}</div></div>`;
  }

  let weekHtml='';
  if(currentQuarterMap){
    const wks=[...currentQuarterMap.keys()].sort().reverse();
    const buttons=wks.map(wk=>`<button type="button" class="${v4ArchiveWeekOpen===wk?'active':''}" data-v4-archive-week="${wk}"><span>${escapeHtml(v4WeekLabel(wk))}</span><b>${currentQuarterMap.get(wk).length} 张</b></button>`).join('');
    weekHtml=`<div class="v4-archive-level"><div class="v4-archive-level-title">${escapeHtml(v4QuarterLabel(v4ArchiveQuarterOpen))} · 周</div><div class="v4-archive-periods">${buttons}</div></div>`;
  }

  let orderHtml='';
  if(v4ArchiveWeekOpen&&currentQuarterMap){
    const rows=(currentQuarterMap.get(v4ArchiveWeekOpen)||[]).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    orderHtml=`<div class="v4-archive-open"><div class="v4-archive-open-head">${escapeHtml(v4WeekLabel(v4ArchiveWeekOpen))} · ${rows.length} 张</div>${rows.map(o=>v4PlacedCard(o,true)).join('')}</div>`;
  }

  return currentHtml+`<section class="v4-archive">
    <div class="v4-archive-head"><div><b>🗄️ 历史订单</b><small>年度 → 季度 → 周。只在点开一周时加载完整订单。</small></div><span>${historical.length} 张</span></div>
    <div class="v4-archive-level"><div class="v4-archive-level-title">年度</div><div class="v4-archive-periods">${yearButtons}</div></div>
    ${quarterHtml}${weekHtml}${orderHtml}
    ${!v4ArchiveYearOpen?'<div class="v4-archive-idle">先选年度，再进入季度和周。</div>':''}
  </section>`;
}
function v4ToggleArchiveYear(key){
  if(v4ArchiveYearOpen===key){v4ArchiveYearOpen=null;v4ArchiveQuarterOpen=null;v4ArchiveWeekOpen=null}
  else{v4ArchiveYearOpen=key;v4ArchiveQuarterOpen=null;v4ArchiveWeekOpen=null}
  v3RenderPlaced();
}
function v4ToggleArchiveQuarter(key){
  if(v4ArchiveQuarterOpen===key){v4ArchiveQuarterOpen=null;v4ArchiveWeekOpen=null}
  else{v4ArchiveQuarterOpen=key;v4ArchiveWeekOpen=null}
  v3RenderPlaced();
}
function v4ToggleArchiveWeek(key){v4ArchiveWeekOpen=v4ArchiveWeekOpen===key?null:key;v3RenderPlaced()}
function v4ToggleSettledOrder(id){if(v4ExpandedSettledOrders.has(id))v4ExpandedSettledOrders.delete(id);else v4ExpandedSettledOrders.add(id);v3RenderPlaced()}
function v4FocusPending(){
  const rows=[...document.querySelectorAll('.v4-open-order .v3-receive-row:not(.is-closed)')];
  if(!rows.length){showToast('当前没有未处理 SKU');return}
  v4PendingFocusIndex=v4PendingFocusIndex%rows.length;
  const el=rows[v4PendingFocusIndex++];
  document.querySelectorAll('.v4-focus-flash').forEach(x=>x.classList.remove('v4-focus-flash'));
  el.classList.add('v4-focus-flash');
  el.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>el.classList.remove('v4-focus-flash'),1400);
}
function v3RenderPlaced(){
  const orders=state.placedOrders.slice();
  orders.forEach(v4NormalizeOrder);
  orders.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const active=orders.filter(o=>!v4OrderDone(o)),done=orders.filter(v4OrderDone);
  v4RenderReceivingBell(active);
  const activeHtml=active.length?`<section class="v4-active-orders"><div class="v4-active-head"><div><b>🔔 未结束工作区</b><small>只展开仍需要处理的 SKU。</small></div><span>${active.length} 张</span></div>${active.map(o=>v4PlacedCard(o,false)).join('')}</section>`:
    '<div class="v4-all-clear">✅ 当前没有未结束订单</div>';
  document.getElementById('v3PlacedList').innerHTML=orders.length?activeHtml+v4ArchiveTree(done):'<div class="empty">还没有“已下单”订单 📦</div>';
}
function v3Step(orderId,skuId,d){
  const {o,item}=v3OrderItem(orderId,skuId);if(!o||!item||o.status==='received'||(v4LineClosed(item)&&!item.dirty))return;
  const min=Number(item.creditedQty)||0,step=v5ItemFactor(item);
  item.actualQty=Math.max(min,Math.round(((Number(item.actualQty)||0)+d*step)*1000)/1000);
  item.lineStatus='pending';item.dirty=true;
  saveState();v3RenderPlaced();
}
function v3Qty(orderId,skuId,v){
  const {o,item}=v3OrderItem(orderId,skuId);if(!o||!item||o.status==='received'||(v4LineClosed(item)&&!item.dirty))return;
  const min=Number(item.creditedQty)||0,parsed=v3Num(v),stock=parsed==null?null:parsed*v5ItemFactor(item),n=Math.max(min,stock??0);
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
    const s=sku(i.skuId),name=i.skuName||s?.name||'SKU',unit=v5ItemOrderUnit(i),qty=i.orderQty==null?v5ItemOrderQty(i,i.orderedQty):Number(i.orderQty);
    return `${name} x${fmt(qty)}${unit}`;
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
    skus:v3Skus().filter(s=>skuIds.has(s.id)).map(s=>({id:s.id,name:s.name,spec:s.spec,unit:s.unit,orderUnit:v5OrderUnit(s),unitsPerOrder:v5UnitsPerOrder(s),area:v4AreaOf(s),supplier:s.supplier}))
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const day=new Date().toISOString().slice(0,10),safe=String(o.supplier||'order').replace(/[^\w\u4e00-\u9fff-]+/g,'-');
  a.download=`cassola-order-${safe}-${day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showToast('本单 JSON 已导出');
}

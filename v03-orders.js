/* Inventory v0.7.3 · iOS-safe drag reorder + visual category sections */
let v4ArchiveYearOpen=null;
let v4ArchiveQuarterOpen=null;
let v4ArchiveWeekOpen=null;
const v4ExpandedSettledOrders=new Set();
const v6ExpandedFamilies=new Set();
let v4PendingFocusIndex=0;

const V6_STOCK_SORT_KEY='cassola_stock_sort_v01';
const V6_STOCK_SORT_MODES=new Set(['category','name','supplier','attention','manual']);
let v6StockSortMode=(()=>{
  try{
    const x=localStorage.getItem(V6_STOCK_SORT_KEY)||'category';
    return V6_STOCK_SORT_MODES.has(x)?x:'category';
  }catch(_){return'category'}
})();
let v6DragState=null;

function v6FamilyAutoCompare(a,b){return v6SkuCompare(a.rows[0],b.rows[0])}
function v6FamilyRank(g){
  const ranks=g.rows.map(x=>x.sortRank==null||x.sortRank===''?NaN:Number(x.sortRank)).filter(Number.isFinite);
  return ranks.length?Math.min(...ranks):Infinity;
}
function v6FamilySupplier(g){
  return [...new Set(g.rows.map(x=>String(x.supplier||'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true,sensitivity:'base'}))[0]||'';
}
function v6FamilyAttention(g){
  const score={zero:5,red:4,yellow:3,blue:2,ok:1};
  return Math.max(...g.rows.map(x=>score[v3Level(x)]||0),0);
}
function v6SortFamilies(families){
  const mode=v6StockSortMode;
  return families.slice().sort((a,b)=>{
    if(mode==='manual'){
      const ar=v6FamilyRank(a),br=v6FamilyRank(b);
      if(ar!==br){
        if(!Number.isFinite(ar))return 1;
        if(!Number.isFinite(br))return-1;
        return ar-br;
      }
    }else if(mode==='name'){
      const n=a.name.localeCompare(b.name,'zh-CN',{numeric:true,sensitivity:'base'});
      if(n)return n;
    }else if(mode==='supplier'){
      const n=v6FamilySupplier(a).localeCompare(v6FamilySupplier(b),'zh-CN',{numeric:true,sensitivity:'base'});
      if(n)return n;
    }else if(mode==='attention'){
      const n=v6FamilyAttention(b)-v6FamilyAttention(a);
      if(n)return n;
    }
    return v6FamilyAutoCompare(a,b);
  });
}
function v6SetStockSortMode(mode){
  v6StockSortMode=V6_STOCK_SORT_MODES.has(mode)?mode:'category';
  try{localStorage.setItem(V6_STOCK_SORT_KEY,v6StockSortMode)}catch(_){}
  renderStock();
}
function v6SyncStockSortUi(q='',cat='全部'){
  const sel=document.getElementById('stockSort'),hint=document.getElementById('stockSortHint');
  if(sel&&sel.value!==v6StockSortMode)sel.value=v6StockSortMode;
  if(!hint)return;
  const messages={
    category:'先按分类，再按商品卡 / 品牌 / 规格排列。',
    name:'按商品卡名称排列，不改变正式库存数据。',
    supplier:'按供应商排列，同商品不同规格仍折叠在一张卡。',
    attention:'见底 / 红 / 黄库存优先显示。',
    manual:(q||cat!=='全部')?'清除搜索并选择“全部分类”后，可直接拖动商品卡。':'抓住每张卡顶部的 ⠿，上下拖动即可保存顺序。'
  };
  hint.textContent=messages[v6StockSortMode]||messages.category;
}
function v6CommitManualFamilyOrder(){
  const list=document.getElementById('stockList');if(!list)return;
  const ids=[...list.children].map(x=>x.dataset?.v6FamilyCard).filter(Boolean);
  if(!ids.length)return;
  const ranks=new Map(ids.map((id,i)=>[String(id),(i+1)*100]));
  (state.skus||[]).forEach(x=>{
    if(v4AreaOf(x)!==v4AreaFilter)return;
    const rank=ranks.get(v6FamilyId(x));
    if(rank!=null)x.sortRank=rank;
  });
  saveState();
}


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
  v6SyncStockSortUi(q,cat);
  const areaRows=v3Skus().filter(x=>v4AreaOf(x)===v4AreaFilter).filter(x=>cat==='全部'||x.category===cat);
  const families=v6SortFamilies(v6SkuFamilies(areaRows).filter(g=>!q||g.rows.some(x=>`${x.name} ${x.familyName||''} ${x.brand||''} ${x.spec} ${x.supplier}`.toLowerCase().includes(q))));
  const canDrag=v6StockSortMode==='manual'&&!q&&cat==='全部';
  const dragHandle=g=>canDrag?`<button type="button" class="v6-drag-handle" data-v6-drag-handle aria-label="拖动 ${escapeHtml(g.name)} 排序"><span>⠿</span> 拖动排序</button>`:'';
  function singleCard(x,g){
    const use=v3WeeklyUse(x);
    return `<article class="sku-card v6-sortable-card" data-v6-family-card="${escapeHtml(g.id)}">${dragHandle(g)}<div class="sku-top"><div class="sku-main"><div class="sku-icon">${v3Icon(x)}</div><div class="sku-copy"><div class="sku-name">${escapeHtml(x.name)}</div><div class="sku-meta">${x.spec?`<span class="meta-pill spec">${escapeHtml(x.spec)}</span>`:''}${x.brand?`<span class="meta-pill">🏷️ ${escapeHtml(x.brand)}</span>`:''}<span class="meta-pill">${categoryIcons[x.category]||'📦'} ${escapeHtml(x.category)}</span><span class="meta-pill">${escapeHtml(x.supplier)}</span>${typeof v45PricePill==='function'?v45PricePill(x):''}</div><div class="v3-stock-hint">${escapeHtml(v3Hint(x))}${use?` · 周耗≈${fmt(use)}`:''}</div></div></div><div class="stock-value v3-${v3Level(x)}">${fmt(x.qty)} <small>${escapeHtml(x.unit)}</small></div></div><div class="sku-actions v3-four"><button class="mini-btn" data-action="operate" data-id="${x.id}">到货/报损</button><button class="mini-btn" data-action="order" data-id="${x.id}">＋订货</button><button class="mini-btn" data-action="set" data-id="${x.id}">设库存</button><button class="mini-btn" data-v3-edit="${x.id}">编辑</button></div></article>`;
  }
  function familyCard(g){
    if(g.rows.length===1)return singleCard(g.rows[0],g);
    const expanded=v6ExpandedFamilies.has(g.id),summary=v6FamilyStockSummary(g.rows);
    const severity={zero:5,red:4,yellow:3,blue:2,ok:1};
    const worst=g.rows.slice().sort((a,b)=>(severity[v3Level(b)]||0)-(severity[v3Level(a)]||0))[0];
    const alerts=g.rows.filter(x=>['zero','red','yellow'].includes(v3Level(x))).length;
    const icon=v3Icon(g.rows[0]),category=g.rows[0].category;
    return `<article class="sku-card v6-family-card v6-sortable-card ${expanded?'expanded':''}" data-v6-family-card="${escapeHtml(g.id)}">
      ${dragHandle(g)}
      <button type="button" class="v6-family-toggle" data-v6-family-toggle="${escapeHtml(g.id)}" aria-expanded="${expanded?'true':'false'}">
        <div class="sku-main"><div class="sku-icon">${icon}</div><div class="sku-copy"><div class="sku-name">${escapeHtml(g.name)}</div><div class="sku-meta"><span class="meta-pill">${categoryIcons[category]||'📦'} ${escapeHtml(category)}</span><span class="meta-pill">🗂️ ${g.rows.length} 个 SKU</span>${alerts?`<span class="meta-pill v6-alert">⚠️ ${alerts} 项</span>`:''}</div><div class="v3-stock-hint">${escapeHtml(summary.detail||'混合包装')} · 点开看规格 / 品牌</div></div></div>
        <div class="v6-family-value"><div class="stock-value v3-${v3Level(worst)}">${escapeHtml(summary.main)} <small>${escapeHtml(summary.unit)}</small></div><span class="v6-family-chevron">⌄</span></div>
      </button>
      <div class="v6-family-body ${expanded?'':'hidden'}">
        ${g.rows.map(x=>{const pack=v5PackLabel(x),use=v3WeeklyUse(x);return `<div class="v6-variant-row">
          <div class="sku-top"><div class="sku-main"><div class="count-mini-icon">${v3Icon(x)}</div><div class="sku-copy"><div class="v6-variant-name">${escapeHtml(x.name)}${x.brand?` · ${escapeHtml(x.brand)}`:''}</div><div class="sku-meta"><span class="meta-pill spec">库存规格 ${escapeHtml(x.spec||'未填写')}</span><span class="meta-pill">库存单位 ${escapeHtml(x.unit||'')}</span><span class="meta-pill">订货单位 ${escapeHtml(v5OrderUnit(x))}</span>${pack?`<span class="meta-pill">📦 ${escapeHtml(pack)}</span>`:''}<span class="meta-pill">${escapeHtml(x.supplier)}</span>${typeof v45PricePill==='function'?v45PricePill(x):''}</div><div class="v3-stock-hint">${escapeHtml(v3Hint(x))}${use?` · 周耗≈${fmt(use)}`:''}</div></div></div><div class="stock-value v3-${v3Level(x)}">${fmt(x.qty)} <small>${escapeHtml(x.unit)}</small></div></div>
          <div class="sku-actions v3-four"><button class="mini-btn" data-action="operate" data-id="${x.id}">到货/报损</button><button class="mini-btn" data-action="order" data-id="${x.id}">＋订货</button><button class="mini-btn" data-action="set" data-id="${x.id}">设库存</button><button class="mini-btn" data-v3-edit="${x.id}">编辑</button></div>
        </div>`}).join('')}
      </div>
    </article>`;
  }
  // Keep canonical SKU categories unchanged. This groups cards visually only;
  // manual drag mode still renders direct card children with no section headers.
  const visibleCardsHtml=(()=>{
    if(v6StockSortMode!=='category'||cat!=='全部')return families.map(familyCard).join('');
    const categoryNames=[...new Set(families.map(g=>String(g.rows[0]?.category||'未分类')))];
    categoryNames.sort((a,b)=>{
      const ai=categories.indexOf(a),bi=categories.indexOf(b);
      if(ai!==bi)return (ai<0?999:ai)-(bi<0?999:bi);
      return a.localeCompare(b,'zh-CN',{numeric:true,sensitivity:'base'});
    });
    return categoryNames.map(category=>{
      const groups=families.filter(g=>String(g.rows[0]?.category||'未分类')===category);
      const totalSkus=groups.reduce((sum,g)=>sum+g.rows.length,0);
      const title=`<div class="v6-stock-category-head"><span class="v6-category-name">${categoryIcons[category]||'📦'} ${escapeHtml(category)}</span><span class="v6-category-count">${groups.length} 张商品卡 · ${totalSkus} 个 SKU</span></div>`;
      return title+groups.map(familyCard).join('');
    }).join('');
  })();
  document.getElementById('stockList').innerHTML=families.length?visibleCardsHtml:'<div class="empty">这个区域还没有匹配的 SKU 🗿</div>';
  const areaSkus=v3Skus().filter(x=>v4AreaOf(x)===v4AreaFilter);
  const alerts=areaSkus.filter(x=>['zero','red','yellow'].includes(v3Level(x))).length;
  const pending=Object.keys(state.order).filter(id=>Number(state.order[id])>0&&v4AreaOf(sku(id))===v4AreaFilter).length;
  document.getElementById('stockSummary').innerHTML=`<div class="summary-card"><span>📚 本区SKU</span><b>${areaSkus.length}</b></div><div class="summary-card"><span>⚠️ 需留意</span><b>${alerts}</b></div><div class="summary-card"><span>🛒 草稿</span><b>${pending}</b></div>`;
};

document.addEventListener('click',e=>{
  const family=e.target.closest('[data-v6-family-toggle]');
  if(!family)return;
  const id=family.dataset.v6FamilyToggle;
  if(v6ExpandedFamilies.has(id))v6ExpandedFamilies.delete(id);else v6ExpandedFamilies.add(id);
  renderStock();
});

/* iOS / Android use Touch Events to keep the whole gesture alive when WebKit
   changes pointer capture; mouse / pen use Pointer Events. The dragged card
   stays in the DOM until release, so moving nodes cannot break capture. */
function v6DragCards(list){
  return [...list.children].filter(x=>x.matches?.('[data-v6-family-card]'));
}
function v6ClearDragMarkers(d){
  d.list.querySelectorAll('.v6-drop-before,.v6-drop-last').forEach(el=>{
    el.classList.remove('v6-drop-before','v6-drop-last');
  });
}
function v6DragPosition(d,clientX,clientY){
  d.y=clientY;
  const delta=clientY-d.startY+(window.scrollY-d.startScrollY);
  if(!d.moved&&Math.abs(delta)<5)return;
  d.moved=true;
  d.card.style.transform='translate3d(0,'+delta+'px,0)';
  d.card.style.zIndex='8';
  v6ClearDragMarkers(d);
  const others=v6DragCards(d.list).filter(el=>el!==d.card);
  d.before=others.find(el=>{
    const rect=el.getBoundingClientRect();
    return clientY<rect.top+rect.height/2;
  })||null;
  if(d.before)d.before.classList.add('v6-drop-before');
  else if(others.length)others[others.length-1].classList.add('v6-drop-last');
}
function v6AutoScrollDrag(d){
  if(v6DragState!==d)return;
  const threshold=85,top=d.y,bottom=window.innerHeight-d.y;
  let speed=0;
  if(top<threshold)speed=-Math.min(18,Math.max(0,(threshold-top)/5));
  else if(bottom<threshold)speed=Math.min(18,Math.max(0,(threshold-bottom)/5));
  if(speed){
    const before=window.scrollY;
    window.scrollBy(0,speed);
    if(before!==window.scrollY&&d.moved)v6DragPosition(d,d.x,d.y);
  }
  d.frame=requestAnimationFrame(()=>v6AutoScrollDrag(d));
}
function v6BeginDrag(handle,mode,id,x,y){
  if(v6DragState||v6StockSortMode!=='manual')return false;
  if(document.getElementById('searchInput').value.trim()||(document.getElementById('categoryFilter').value||'全部')!=='全部')return false;
  const card=handle.closest('[data-v6-family-card]'),list=document.getElementById('stockList');
  if(!card||card.parentElement!==list)return false;
  const d={mode,id,handle,card,list,startY:y,startScrollY:window.scrollY,y,x,moved:false,before:null,frame:0};
  v6DragState=d;
  card.classList.add('v6-dragging');
  document.body.classList.add('v6-sorting');
  if(mode==='pointer')try{handle.setPointerCapture(id)}catch(_){}
  d.frame=requestAnimationFrame(()=>v6AutoScrollDrag(d));
  return true;
}
function v6EndDrag(commit){
  const d=v6DragState;if(!d)return;
  v6DragState=null;
  if(d.frame)cancelAnimationFrame(d.frame);
  v6ClearDragMarkers(d);
  d.card.classList.remove('v6-dragging');
  d.card.style.transform='';
  d.card.style.zIndex='';
  document.body.classList.remove('v6-sorting');
  if(d.mode==='pointer')try{d.handle.releasePointerCapture(d.id)}catch(_){}
  if(!commit||!d.moved)return;
  const oldOrder=v6DragCards(d.list).map(x=>x.dataset.v6FamilyCard).join('|');
  d.list.insertBefore(d.card,d.before);
  const newOrder=v6DragCards(d.list).map(x=>x.dataset.v6FamilyCard).join('|');
  if(oldOrder===newOrder)return;
  v6CommitManualFamilyOrder();
  renderStock();
  showToast('卡片顺序已保存');
}
document.addEventListener('touchstart',e=>{
  const handle=e.target.closest?.('[data-v6-drag-handle]');
  const t=e.changedTouches?.[0];
  if(!handle||!t)return;
  if(v6BeginDrag(handle,'touch',t.identifier,t.clientX,t.clientY))e.preventDefault();
},{passive:false});
document.addEventListener('touchmove',e=>{
  const d=v6DragState;if(!d||d.mode!=='touch')return;
  const t=Array.from(e.changedTouches).find(x=>x.identifier===d.id);
  if(!t)return;
  e.preventDefault();
  d.x=t.clientX;
  v6DragPosition(d,t.clientX,t.clientY);
},{passive:false});
document.addEventListener('touchend',e=>{
  const d=v6DragState;if(d?.mode==='touch'&&Array.from(e.changedTouches).some(x=>x.identifier===d.id))v6EndDrag(true);
});
document.addEventListener('touchcancel',e=>{
  const d=v6DragState;if(d?.mode==='touch'&&Array.from(e.changedTouches).some(x=>x.identifier===d.id))v6EndDrag(false);
});
document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch')return; // handled by Touch Events on iPhone / Android
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const handle=e.target.closest?.('[data-v6-drag-handle]');
  if(handle&&v6BeginDrag(handle,'pointer',e.pointerId,e.clientX,e.clientY))e.preventDefault();
});
document.addEventListener('pointermove',e=>{
  const d=v6DragState;
  if(!d||d.mode!=='pointer'||e.pointerId!==d.id)return;
  e.preventDefault();
  d.x=e.clientX;
  v6DragPosition(d,e.clientX,e.clientY);
});
document.addEventListener('pointerup',e=>{
  if(v6DragState?.mode==='pointer'&&e.pointerId===v6DragState.id)v6EndDrag(true);
});
document.addEventListener('pointercancel',e=>{
  if(v6DragState?.mode==='pointer'&&e.pointerId===v6DragState.id)v6EndDrag(false);
});

document.getElementById('stockSort')?.addEventListener('change',e=>v6SetStockSortMode(e.target.value));

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
function v4WeekAnchorDate(key){
  const d=new Date(key+'T00:00:00');d.setDate(d.getDate()+3);return d;
}
function v4ArchiveYearKeyFromWeek(key){return String(v4WeekAnchorDate(key).getFullYear())}
function v4ArchiveQuarterKeyFromWeek(key){
  const d=v4WeekAnchorDate(key);
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
      ${done?`<div class="v3-finished">历史已保留。</div>`:`<button class="btn secondary" data-v4-authorize-receipt="${escapeHtml(o.id)}">👷 授权员工收货</button><button class="btn primary large" data-v3-finish="${escapeHtml(o.id)}" ${dirty.length?'':'disabled'}>📥 保存本次收货${dirty.length?' · '+dirty.length+'项':''}</button>`}
    </div>
  </article>`;
}

function v4EmployeeScopeAllows(scope,s){
  if(!scope||!s)return false;
  if(scope.kind==='category')return String(s.category||'')===String(scope.value||'');
  if(scope.kind==='area')return String(s.area||'sushi')===String(scope.value||'');
  if(scope.kind==='skuIds')return Array.isArray(scope.skuIds)&&scope.skuIds.map(String).includes(String(s.id));
  return false;
}
function v4ReceiptTaskLinesForEmployee(o,scope){
  return (o.items||[]).filter(i=>{
    if(v4LineClosed(i))return false;
    const s=sku(i.skuId);
    return !!s&&v4EmployeeScopeAllows(scope,s);
  });
}
function v4EnsureEmployeeReceiptDialogs(){
  if(!document.getElementById('v4EmployeeReceiptAuthDialog')){
    const d=document.createElement('dialog');d.id='v4EmployeeReceiptAuthDialog';d.className='v45-dialog v4-employee-receipt-dialog';
    d.innerHTML=`
      <form method="dialog">
        <div class="dialog-head"><div><div class="eyebrow">EMPLOYEE RECEIVING</div><h3>👷 授权员工收货</h3></div><button value="cancel" formnovalidate class="icon-btn">✕</button></div>
        <div class="v4-employee-receipt-note">只有 Supervisor 明确授权后，员工“收货”页才会出现任务。员工提交后仍需 Supervisor 确认才会正式入库。</div>
        <div id="v4ReceiptExisting" class="v4-employee-receipt-existing"></div>
        <label>授权给<select id="v4ReceiptEmployeeSelect"></select></label>
        <div id="v4ReceiptAuthPreview" class="v4-employee-receipt-preview"></div>
        <button type="button" class="btn primary large" id="v4ReceiptAuthorizeBtn">授权这次收货</button>
        <button value="cancel" formnovalidate class="btn secondary large">取消</button>
      </form>`;
    document.body.appendChild(d);
  }
  if(!document.getElementById('v4EmployeeReceiptInboxDialog')){
    const d=document.createElement('dialog');d.id='v4EmployeeReceiptInboxDialog';d.className='v45-dialog v4-employee-receipt-dialog';
    d.innerHTML=`
      <form method="dialog">
        <div class="dialog-head"><div><div class="eyebrow">EMPLOYEE RECEIPT INBOX</div><h3>🚚 员工收货审核</h3></div><button value="cancel" formnovalidate class="icon-btn">✕</button></div>
        <div id="v4EmployeeReceiptInbox" class="v4-employee-receipt-inbox"></div>
        <button value="cancel" formnovalidate class="btn secondary large">关闭</button>
      </form>`;
    document.body.appendChild(d);
  }
}
function v4EmployeeReceiptName(e){return e?.displayName||e?.label||e?.id||'员工'}
function v4RenderReceiptExisting(){
  const dlg=document.getElementById('v4EmployeeReceiptAuthDialog'),box=document.getElementById('v4ReceiptExisting');
  if(!dlg||!box)return;
  const tasks=dlg._existingTasks||[];
  box.innerHTML=tasks.length?'<div class="v4-existing-title">当前授权 / 待审核</div>'+tasks.map(t=>{
    const count=t.order_snapshot?.items?.length||0;
    return '<div class="v4-existing-task"><div><b>'+escapeHtml(t.displayName||t.credential_id)+'</b><small>'+count+' 项 · '+escapeHtml(t.status==='submitted'?'已提交待审核':'已授权未提交')+'</small></div>'+(t.status==='authorized'?'<button type="button" class="btn danger ghost" data-v4-receipt-revoke-task="'+escapeHtml(t.task_id)+'">撤销</button>':'<span>等待审核</span>')+'</div>';
  }).join(''):'';
}
function v4RenderReceiptAuthPreview(){
  const dlg=document.getElementById('v4EmployeeReceiptAuthDialog'),sel=document.getElementById('v4ReceiptEmployeeSelect'),box=document.getElementById('v4ReceiptAuthPreview');
  if(!dlg||!sel||!box)return;
  const o=(state.placedOrders||[]).find(x=>String(x.id)===String(dlg._orderId)),emp=(dlg._employees||[]).find(x=>String(x.id)===String(sel.value));
  if(!o||!emp){box.innerHTML='<div class="empty">没有可授权员工。</div>';return}
  const lines=v4ReceiptTaskLinesForEmployee(o,emp.scope);
  dlg._eligibleLines=lines;
  box.innerHTML=lines.length?`
    <div class="v4-employee-receipt-summary"><b>${escapeHtml(o.supplier||'供应商')}</b><span>${lines.length} 项授权给 ${escapeHtml(v4EmployeeReceiptName(emp))}</span></div>
    ${lines.map(i=>{
      const remaining=Math.max(0,(Number(i.orderedQty)||0)-(Number(i.creditedQty)||0));
      const orderQty=v5ItemOrderQty(i,remaining);
      return `<div class="v4-employee-receipt-line"><div><strong>${escapeHtml(i.skuName||sku(i.skuId)?.name||i.skuId)}</strong><small>${escapeHtml(i.spec||'无规格')}</small></div><b>待收 ${fmt(orderQty)} ${escapeHtml(v5ItemOrderUnit(i))}</b></div>`;
    }).join('')}`:'<div class="empty">这名员工的责任区没有本单待收 SKU。</div>';
}
async function v4OpenEmployeeReceiptAuthorize(orderId){
  v4EnsureEmployeeReceiptDialogs();
  const o=(state.placedOrders||[]).find(x=>String(x.id)===String(orderId));
  if(!o||v4OrderDone(o)){showToast('这张订单已经结案');return}
  if(v4OrderDirty(o).length){showToast('先保存当前 Supervisor 的收货编辑，再授权员工');return}
  if(!window.CassolaCloud?.connected?.()||window.CassolaCloud?.role?.()!=='supervisor'){showToast('先连接 Cloud 才能授权员工收货');return}
  const dlg=document.getElementById('v4EmployeeReceiptAuthDialog'),sel=document.getElementById('v4ReceiptEmployeeSelect'),box=document.getElementById('v4ReceiptAuthPreview');
  box.innerHTML='<div class="empty">正在读取员工…</div>';
  dlg._orderId=o.id;dlg._employees=[];dlg._existingTasks=[];if(!dlg.open)dlg.showModal();
  try{
    const [directory,existing]=await Promise.all([
      window.CassolaCloud.listEmployeeDirectory(),
      window.CassolaCloud.listReceiptTasks(['authorized','submitted'],o.id)
    ]);
    const employees=(directory.employees||[]).filter(e=>v4ReceiptTaskLinesForEmployee(o,e.scope).length>0);
    dlg._employees=employees;dlg._existingTasks=existing.tasks||[];
    sel.innerHTML=employees.length?employees.map(e=>`<option value="${escapeHtml(e.id)}">${escapeHtml(v4EmployeeReceiptName(e))} · ${escapeHtml(e.scope?.label||e.id)}</option>`).join(''):'<option value="">没有符合责任区的员工</option>';
    document.getElementById('v4ReceiptAuthorizeBtn').disabled=!employees.length;
    v4RenderReceiptExisting();v4RenderReceiptAuthPreview();
  }catch(err){
    box.innerHTML='<div class="empty">读取员工失败：'+escapeHtml(err?.message||'未知错误')+'</div>';
  }
}
async function v4AuthorizeEmployeeReceipt(){
  const dlg=document.getElementById('v4EmployeeReceiptAuthDialog'),sel=document.getElementById('v4ReceiptEmployeeSelect');
  const o=(state.placedOrders||[]).find(x=>String(x.id)===String(dlg?._orderId)),emp=(dlg?._employees||[]).find(x=>String(x.id)===String(sel?.value));
  if(!o||!emp)return;
  if(v4OrderDirty(o).length){showToast('本机收货状态刚刚变了，请先保存再授权');return}
  const lines=v4ReceiptTaskLinesForEmployee(o,emp.scope);
  if(!lines.length){showToast('没有可授权的待收 SKU');return}
  const task={
    taskId:crypto.randomUUID?.()||String(Date.now()+Math.random()),
    orderId:o.id,supplier:o.supplier||'',credentialId:emp.id,
    orderSnapshot:{
      createdAt:o.createdAt,
      items:lines.map(i=>({
        skuId:i.skuId,skuName:i.skuName||sku(i.skuId)?.name||'',spec:i.spec||'',unit:i.unit||'',orderUnit:v5ItemOrderUnit(i),
        unitsPerOrder:v5ItemFactor(i),orderedQty:Number(i.orderedQty)||0,creditedQty:Number(i.creditedQty)||0,lineStatus:i.lineStatus||'pending',area:i.area||v4AreaOf(sku(i.skuId))
      }))
    }
  };
  const btn=document.getElementById('v4ReceiptAuthorizeBtn');btn.disabled=true;
  try{
    await window.CassolaCloud.authorizeReceiptTask(task);
    dlg.close();
    showToast('🚚 已授权 '+v4EmployeeReceiptName(emp)+' 收货 · '+lines.length+' 项');
  }catch(err){
    if(err?.data?.error==='receipt_task_exists'||err?.data?.error==='receipt_lines_already_assigned')alert('这张订单里的部分 SKU 已经有未完成的员工收货授权。可在上方“当前授权”里撤销旧任务，或等员工提交 / Supervisor 审核后再授权。');
    else alert('授权失败：'+(err?.data?.detail||err?.message||'未知错误'));
  }finally{btn.disabled=false}
}
function v4ReceiptStatusLabel(st){return v4StateMeta(st).icon+' '+v4StateMeta(st).label}
function v4ReceiptTaskAlreadyApplied(taskId){
  return (state.placedOrders||[]).some(o=>(o.receiptBatches||[]).some(b=>String(b.employeeReceiptTaskId||'')===String(taskId||'')));
}
async function v4OpenEmployeeReceiptInbox(){
  v4EnsureEmployeeReceiptDialogs();
  if(!window.CassolaCloud?.connected?.()||window.CassolaCloud?.role?.()!=='supervisor'){showToast('先连接 Cloud');return}
  const dlg=document.getElementById('v4EmployeeReceiptInboxDialog'),box=document.getElementById('v4EmployeeReceiptInbox');
  box.innerHTML='<div class="empty">正在读取员工收货…</div>';if(!dlg.open)dlg.showModal();
  try{
    const data=await window.CassolaCloud.listReceiptPending(),tasks=data.tasks||[];
    dlg._tasks=tasks;
    box.innerHTML=tasks.length?tasks.map(t=>{
      const applied=v4ReceiptTaskAlreadyApplied(t.task_id),order=(state.placedOrders||[]).find(o=>String(o.id)===String(t.order_id));
      const baseMap=new Map((t.order_snapshot?.items||[]).map(i=>[String(i.skuId),i]));
      const lines=t.submission_payload?.lines||[];
      return `<article class="v4-employee-receipt-review">
        <div class="v4-employee-receipt-review-head"><div><strong>${escapeHtml(t.supplier||'供应商')} · ${escapeHtml(t.displayName||t.credential_id)}</strong><small>${escapeHtml(new Date(t.submitted_at).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</small></div><span>${applied?'本机已入账':(order?'待确认':'本机无订单')}</span></div>
        <div class="v4-employee-receipt-review-lines">${lines.map(l=>{
          const b=baseMap.get(String(l.skuId))||{},cur=order?.items?.find(i=>String(i.skuId)===String(l.skuId));
          const drift=cur&&Math.abs((Number(cur.creditedQty)||0)-(Number(b.creditedQty)||0))>0.000001;
          return `<div><span><b>${escapeHtml(b.skuName||l.skuId)}</b><small>${escapeHtml(v4ReceiptStatusLabel(l.status))}${drift?' · ⚠️ 授权后订单已有变化':''}</small></span><strong>${fmt(Number(l.receivedOrderQty)||0)} ${escapeHtml(b.orderUnit||b.unit||'')}</strong></div>`;
        }).join('')}</div>
        <div class="v4-employee-receipt-review-actions">${applied?`<button type="button" class="btn primary" data-v4-receipt-mark="${escapeHtml(t.task_id)}">补记为已采用</button>`:`<button type="button" class="btn primary" data-v4-receipt-accept="${escapeHtml(t.task_id)}" ${order?'':'disabled'}>✓ 确认入账</button>`}<button type="button" class="btn danger ghost" data-v4-receipt-reject="${escapeHtml(t.task_id)}">拒绝</button></div>
      </article>`;
    }).join(''):'<div class="empty">没有待审核员工收货 🗿☕</div>';
  }catch(err){box.innerHTML='<div class="empty">读取失败：'+escapeHtml(err?.message||'未知错误')+'</div>'}
}
async function v4ApplyEmployeeReceiptTask(taskId){
  const dlg=document.getElementById('v4EmployeeReceiptInboxDialog'),task=(dlg?._tasks||[]).find(t=>String(t.task_id)===String(taskId));
  if(!task)return;
  if(v4ReceiptTaskAlreadyApplied(taskId)){
    await window.CassolaCloud.reviewReceiptTask(taskId,'accepted','Local receipt batch was already applied');
    await v4OpenEmployeeReceiptInbox();return;
  }
  const o=(state.placedOrders||[]).find(x=>String(x.id)===String(task.order_id));
  if(!o){alert('本机找不到这张订单。先把对应订单同步到这台 Supervisor 设备，再审核。');return}
  if(v4OrderDone(o)){alert('这张订单已经在本机结案。为避免重复入库，请拒绝这份员工提交，必要时重新开任务或手动调整。');return}
  if(v4OrderDirty(o).length){showToast('先保存当前 Supervisor 的收货编辑，再审核员工收货');return}
  const baseMap=new Map((task.order_snapshot?.items||[]).map(i=>[String(i.skuId),i]));
  const reports=task.submission_payload?.lines||[];
  let drift=false;
  for(const l of reports){
    const b=baseMap.get(String(l.skuId)),i=o.items?.find(x=>String(x.skuId)===String(l.skuId));
    if(!b||!i){alert('订单结构与授权时不一致，请拒绝并重新授权。');return}
    if(Math.abs(v5ItemFactor(i)-Number(b.unitsPerOrder||1))>0.000001||v5ItemOrderUnit(i)!==String(b.orderUnit||b.unit||'')){
      alert('这个 SKU 的到货包装在授权后变化了。请拒绝这次提交并重新授权，避免换算错误。');return;
    }
    if(Math.abs((Number(i.creditedQty)||0)-(Number(b.creditedQty)||0))>0.000001)drift=true;
  }
  if(drift&&!confirm('⚠️ 授权后这张订单已经有其他收货入账。\n\n员工填写的是“本次到货”，确认后会在现有已入库数量上继续追加。确认这不是同一批货的重复记录吗？'))return;
  if(!confirm('确认采用这份员工收货？\n\n确认后才会正式增加库存、写 receipt batch 和到货历史。'))return;

  const at=stamp(),batch={
    id:crypto.randomUUID?.()||String(Date.now()+Math.random()),at,
    deviceName:state.syncMeta?.deviceName||'本设备',
    employeeReceiptTaskId:task.task_id,employeeReceiptSubmissionId:task.submission_id,
    employeeCredentialId:task.credential_id,lines:[]
  };
  for(const l of reports){
    const b=baseMap.get(String(l.skuId)),i=o.items.find(x=>String(x.skuId)===String(l.skuId)),s=sku(i.skuId);
    const factor=Number(b.unitsPerOrder)||1,before=Number(i.creditedQty)||0,delta=Math.max(0,(Number(l.receivedOrderQty)||0)*factor),after=before+delta,ordered=Number(i.orderedQty)||0;
    if(s&&delta>0){
      s.qty=Number(s.qty)+delta;
      addHistory('arrival',s.id,`+${fmt(delta)} ${s.unit} → ${fmt(s.qty)} ${s.unit}`,`${o.supplier} · 员工收货 · ${task.credential_id} · ${v4ReceiptStatusLabel(l.status)}`,{
        orderId:o.id,receiptId:batch.id,employeeReceiptTaskId:task.task_id,employeeReceiptSubmissionId:task.submission_id,employeeCredentialId:task.credential_id
      });
    }
    i.actualQty=after;i.creditedQty=after;i.dirty=false;i.reviewed=true;
    if(l.status==='later')i.lineStatus='later';
    else if(l.status==='other')i.lineStatus='other';
    else if(l.status==='out')i.lineStatus='out';
    else if(after>ordered+0.000001)i.lineStatus='over';
    else if(after>=ordered-0.000001)i.lineStatus='received';
    else i.lineStatus=l.status==='short'?'short':'short';
    if(v4LineClosed(i))i.closedAt=at;else delete i.closedAt;
    batch.lines.push({skuId:i.skuId,deltaQty:delta,cumulativeActualQty:after,status:i.lineStatus,employeeReportedStatus:l.status});
  }
  o.receiptBatches=o.receiptBatches||[];o.receiptBatches.push(batch);
  const open=v4OrderOpenItems(o);o.status=open.length?'open':'received';
  if(!open.length)o.receivedAt=at;else delete o.receivedAt;
  o.partial=(o.items||[]).some(i=>['short','over','out'].includes(i.lineStatus));
  saveState();renderAll();
  try{
    await window.CassolaCloud.reviewReceiptTask(task.task_id,'accepted','Applied to Supervisor local receipt ledger');
    showToast(open.length?`员工收货已入库 · 🔔 还有 ${open.length} 项`:'员工收货已确认入账');
  }catch(err){
    alert('本机已经完成入库，但 Cloud “已采用”标记失败。\n\n不要重复入库；重新打开收货审核后会显示“本机已入账”，可补记。\n\n'+(err?.message||''));
  }
  await v4OpenEmployeeReceiptInbox();
}
async function v4RevokeEmployeeReceiptTask(taskId){
  if(!confirm('撤销这份员工收货授权？\n\n员工端任务会在下次联网刷新后消失。'))return;
  await window.CassolaCloud.revokeReceiptTask(taskId,'Supervisor revoked receipt authorization');
  showToast('已撤销员工收货授权');
  const dlg=document.getElementById('v4EmployeeReceiptAuthDialog');
  if(dlg?._orderId)await v4OpenEmployeeReceiptAuthorize(dlg._orderId);
}
async function v4RejectEmployeeReceiptTask(taskId){
  if(!confirm('拒绝这份员工收货？\n\n不会修改本机库存。'))return;
  await window.CassolaCloud.reviewReceiptTask(taskId,'rejected','Supervisor rejected employee receipt');
  showToast('已拒绝员工收货');
  await v4OpenEmployeeReceiptInbox();
}

document.addEventListener('change',e=>{
  if(e.target?.id==='v4ReceiptEmployeeSelect')v4RenderReceiptAuthPreview();
});
document.addEventListener('click',async e=>{
  const auth=e.target.closest('[data-v4-authorize-receipt]');if(auth){await v4OpenEmployeeReceiptAuthorize(auth.dataset.v4AuthorizeReceipt);return}
  if(e.target.closest('#v4ReceiptAuthorizeBtn')){await v4AuthorizeEmployeeReceipt();return}
  const revoke=e.target.closest('[data-v4-receipt-revoke-task]');if(revoke){await v4RevokeEmployeeReceiptTask(revoke.dataset.v4ReceiptRevokeTask);return}
  const accept=e.target.closest('[data-v4-receipt-accept]');if(accept){await v4ApplyEmployeeReceiptTask(accept.dataset.v4ReceiptAccept);return}
  const mark=e.target.closest('[data-v4-receipt-mark]');if(mark){await window.CassolaCloud.reviewReceiptTask(mark.dataset.v4ReceiptMark,'accepted','Local receipt batch was already applied');await v4OpenEmployeeReceiptInbox();return}
  const reject=e.target.closest('[data-v4-receipt-reject]');if(reject){await v4RejectEmployeeReceiptTask(reject.dataset.v4ReceiptReject);return}
});

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

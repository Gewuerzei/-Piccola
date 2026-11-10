/* Cassola Inventory v0.9.0 · 库存页侧边栏 + 精简卡片 + 操作面板
   Pietro 2026-11-10：
   - 左侧边栏，顶部切换「分类 / 供应商」；选供应商时整条侧边栏变成供应商，方便订货。
   - 卡片上只留名字、规格、📦 箱规和库存数字；到货/报损、＋订货、设库存、编辑收进点卡片后弹出的面板。
   只改显示：SKU 的 category / supplier / sortRank、订单、历史都不在这里写。
   旧的分类下拉框 #categoryFilter 仍在 DOM 里（隐藏、固定为「全部」），其他代码照旧能读。 */
(function(){
  const RAIL_KEY='cassola_stock_rail_v01';
  const ALL='__all',ALERT='__alert';
  const ALERT_LEVELS=new Set(['zero','red','yellow']);

  function loadRail(){
    try{
      const x=JSON.parse(localStorage.getItem(RAIL_KEY)||'{}');
      return {mode:x.mode==='supplier'?'supplier':'category',category:String(x.category||ALL),supplier:String(x.supplier||ALL)};
    }catch(_){return {mode:'category',category:ALL,supplier:ALL}}
  }
  let rail=loadRail();
  function saveRail(){try{localStorage.setItem(RAIL_KEY,JSON.stringify(rail))}catch(_){}}

  // 「分类」「供应商」现在由侧边栏负责；旧的排序值迁移到默认顺序。
  if(v6StockSortMode==='supplier'){
    v6StockSortMode='category';
    try{localStorage.setItem(V6_STOCK_SORT_KEY,'category')}catch(_){}
  }
  const catFilter=document.getElementById('categoryFilter');
  if(catFilter)catFilter.value='全部';

  const keyOf=x=>rail.mode==='supplier'?String(x.supplier||'').trim():v7CategoryLabel(x.category||'未分类');
  const keyLabel=k=>rail.mode==='supplier'?(k||'未填供应商'):k;
  const keyIcon=k=>rail.mode==='supplier'?'🚚':(categoryIcons[k]||'📦');
  function sortKeys(keys){
    if(rail.mode==='supplier'){
      const tabs=v3Suppliers().filter(x=>x!=='全部');
      const rank=x=>{const i=tabs.indexOf(x);return !x?1e9:i<0?1e8:i};
      return keys.sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b,'zh-CN',{numeric:true,sensitivity:'base'}));
    }
    return keys.sort((a,b)=>v7CategoryOrder(a)-v7CategoryOrder(b)||a.localeCompare(b,'zh-CN',{numeric:true,sensitivity:'base'}));
  }
  const isAlert=x=>ALERT_LEVELS.has(v3Level(x));
  const inDraft=x=>Number(state.order?.[x.id])>0;
  const searchText=x=>`${x.name} ${x.familyName||''} ${x.brand||''} ${x.spec||''} ${x.supplier||''}`.toLowerCase();

  function selected(){return rail.mode==='supplier'?rail.supplier:rail.category}
  function setSelected(k){if(rail.mode==='supplier')rail.supplier=k;else rail.category=k;saveRail()}

  function v9SyncSortUi(q,canDragHere){
    const sel=document.getElementById('stockSort'),hint=document.getElementById('stockSortHint');
    if(sel&&sel.value!==v6StockSortMode)sel.value=v6StockSortMode;
    if(!hint)return;
    // 说明文字只在拖动模式需要，其他时候收起，页面更干净。
    hint.hidden=v6StockSortMode!=='manual';
    const m={
      category:'同一商品的不同规格折叠在一张卡里。点卡片可到货 / 订货 / 设库存 / 编辑。',
      name:'按商品名排列。',
      attention:'见底 / 红 / 黄库存排在前面。',
      manual:canDragHere?'抓住卡片顶部的 ⠿ 上下拖动，顺序会保存。':'清除搜索并在左边选「全部」后，可以拖动排序。'
    };
    hint.textContent=m[v6StockSortMode]||m.category;
  }

  /* ---------- cards ---------- */
  function subLine(x,packHtml){
    return `<div class="v9-sub">${x.spec?`<span class="v9-spec">${escapeHtml(x.spec)}</span>`:''}${packHtml}</div>`;
  }
  function qtyBox(level,main,unit){
    return `<div class="stock-value v9-qty v3-${level}">${escapeHtml(main)} <small>${escapeHtml(unit||'')}</small></div>`;
  }
  function singleCard(x,g,dragHandle){
    return `<article class="sku-card v9-card v6-sortable-card" data-v6-family-card="${escapeHtml(g.id)}">${dragHandle}<button type="button" class="v9-row" data-v9-sku="${escapeHtml(x.id)}" aria-label="${escapeHtml(x.name)} · 操作"><div class="sku-icon v9-icon">${skuVisual(x)}</div><div class="v9-copy"><div class="sku-name">${escapeHtml(x.name)}</div>${subLine(x,v82PackPill(v5PackLabel(x)))}</div>${qtyBox(v3Level(x),fmt(x.qty),x.unit)}</button></article>`;
  }
  function familyCard(g,dragHandle){
    if(g.rows.length===1)return singleCard(g.rows[0],g,dragHandle);
    const expanded=v6ExpandedFamilies.has(g.id),summary=v6FamilyStockSummary(g.rows);
    const severity={zero:5,red:4,yellow:3,blue:2,ok:1};
    const worst=g.rows.slice().sort((a,b)=>(severity[v3Level(b)]||0)-(severity[v3Level(a)]||0))[0];
    const rows=g.rows.map(x=>`<button type="button" class="v9-variant" data-v9-sku="${escapeHtml(x.id)}"><div class="count-mini-icon">${skuVisual(x)}</div><div class="v9-copy"><div class="v9-variant-name">${escapeHtml(x.name)}${x.brand?` · ${escapeHtml(x.brand)}`:''}</div>${subLine(x,v82PackPill(v5PackLabel(x)))}</div>${qtyBox(v3Level(x),fmt(x.qty),x.unit)}</button>`).join('');
    return `<article class="sku-card v9-card v9-family v6-sortable-card ${expanded?'expanded':''}" data-v6-family-card="${escapeHtml(g.id)}">${dragHandle}<button type="button" class="v9-row" data-v6-family-toggle="${escapeHtml(g.id)}" aria-expanded="${expanded?'true':'false'}"><div class="sku-icon v9-icon">${skuVisual(g.rows[0])}</div><div class="v9-copy"><div class="sku-name">${escapeHtml(g.name)}</div><div class="v9-sub"><span class="v9-spec">${g.rows.length} 个规格</span>${v82FamilyPackPill(g.rows)}</div></div><div class="v9-family-value">${qtyBox(v3Level(worst),summary.main,summary.unit)}<span class="v9-chevron" aria-hidden="true">⌄</span></div></button><div class="v9-variants ${expanded?'':'hidden'}">${rows}</div></article>`;
  }
  function groupHead(k,rows){
    const n=rows.length,draft=rows.filter(inDraft).length;
    return `<div class="v9-group-head"><span class="v9-group-name">${keyIcon(k)} ${escapeHtml(keyLabel(k))}</span><span class="v9-group-count">${n} 个 SKU${draft?` · 🛒 ${draft}`:''}</span></div>`;
  }

  /* ---------- rail ---------- */
  function renderRail(areaRows,keys){
    const el=document.getElementById('v9StockRail');if(!el)return;
    const sel=selected();
    const item=(k,glyph,label,rows,extraClass='')=>{
      const alert=rows.some(isAlert),draft=rows.filter(inDraft).length;
      return `<button type="button" class="v9-rail-item ${extraClass} ${k===sel?'on':''}" data-v9-key="${escapeHtml(k)}" aria-pressed="${k===sel?'true':'false'}">${alert&&k!==ALERT?'<i class="v9-dot" aria-label="有要留意的库存"></i>':''}${glyph}<span class="v9-rail-label">${escapeHtml(label)}</span><span class="v9-rail-meta"><span>${rows.length}</span>${draft?`<b class="v9-rail-draft">🛒${draft}</b>`:''}</span></button>`;
    };
    const emoji=e=>`<span class="v9-rail-glyph" aria-hidden="true">${e}</span>`;
    const mono=name=>`<span class="v9-rail-glyph v9-rail-mono" aria-hidden="true">${escapeHtml(([...String(name||'?').trim()][0]||'?').toUpperCase())}</span>`;
    const alerts=areaRows.filter(isAlert);
    el.innerHTML=`<div class="v9-seg" role="group" aria-label="侧边栏分组方式"><button type="button" data-v9-mode="category" class="${rail.mode==='category'?'on':''}">分类</button><button type="button" data-v9-mode="supplier" class="${rail.mode==='supplier'?'on':''}">供应商</button></div>`+
      item(ALL,emoji('🗿'),'全部',areaRows)+
      (alerts.length?item(ALERT,emoji('⚠️'),'需留意',alerts,'v9-rail-alert'):'')+
      keys.map(k=>item(k,rail.mode==='supplier'?mono(k||'?'):emoji(keyIcon(k)),keyLabel(k),areaRows.filter(x=>keyOf(x)===k))).join('');
  }

  /* ---------- list ---------- */
  renderStock=function(){
    v4RenderAreaTabs();
    if(catFilter&&catFilter.value!=='全部')catFilter.value='全部';
    const q=document.getElementById('searchInput').value.trim().toLowerCase();
    const areaRows=v3Skus().filter(x=>v4AreaOf(x)===v4AreaFilter);
    const keys=sortKeys([...new Set(areaRows.map(keyOf))]);
    let sel=selected();
    if(sel!==ALL&&sel!==ALERT&&!keys.includes(sel))sel=ALL;
    if(sel===ALERT&&!areaRows.some(isAlert))sel=ALL;
    if(sel!==selected())setSelected(sel);
    renderRail(areaRows,keys);

    // 搜索时不看侧边栏选了什么：整个区域里找，按当前分组方式分段显示。
    const rows=q?areaRows.filter(x=>searchText(x).includes(q))
      :sel===ALL?areaRows:sel===ALERT?areaRows.filter(isAlert):areaRows.filter(x=>keyOf(x)===sel);
    const canDrag=v6StockSortMode==='manual'&&!q&&sel===ALL;
    v9SyncSortUi(q,canDrag);
    const handle=g=>canDrag?`<button type="button" class="v6-drag-handle" data-v6-drag-handle aria-label="拖动 ${escapeHtml(g.name)} 排序"><span>⠿</span> 拖动排序</button>`:'';
    const cardsFor=list=>v6SortFamilies(v6SkuFamilies(list)).map(g=>familyCard(g,handle(g))).join('');

    let html='';
    if(!rows.length){
      html=`<div class="empty">${q?'没有找到「'+escapeHtml(q)+'」':'这里还没有 SKU'} 🗿</div>`;
    }else if(canDrag){
      // 拖动模式：列表里只能有卡片（v6CommitManualFamilyOrder 读的是直接子元素）。
      html=cardsFor(rows);
    }else if(q||sel===ALL||sel===ALERT){
      const groups=sortKeys([...new Set(rows.map(keyOf))]);
      html=(q?`<div class="v9-list-note">搜索「${escapeHtml(q)}」· ${rows.length} 个 SKU</div>`:'')+
        groups.map(k=>{const r=rows.filter(x=>keyOf(x)===k);return groupHead(k,r)+cardsFor(r)}).join('');
    }else{
      html=groupHead(sel,rows)+cardsFor(rows);
    }
    document.getElementById('stockList').innerHTML=html;
  };

  function scrollListIntoView(){
    const body=document.querySelector('.v9-stock-body');if(!body)return;
    const css=getComputedStyle(document.documentElement);
    const top=(parseFloat(css.getPropertyValue('--cassola-topbar-h'))||76)+(parseFloat(css.getPropertyValue('--v9-toolbar-h'))||64)+8;
    const y=body.getBoundingClientRect().top;
    if(y<top)window.scrollBy({top:y-top,behavior:'instant'});
  }

  /* ---------- action sheet ---------- */
  const sheet=document.createElement('dialog');
  sheet.id='v9SkuSheet';sheet.className='v9-sheet';
  document.body.appendChild(sheet);
  function openSheet(id){
    const x=sku(id);if(!x)return;
    const use=v3WeeklyUse(x),pack=v5PackLabel(x);
    const cat=v7CategoryLabel(x.category||'未分类');
    sheet.innerHTML=`<form method="dialog">
      <div class="dialog-head"><div class="v9-sheet-title"><div class="sku-icon">${skuVisual(x)}</div><div><div class="eyebrow">${escapeHtml((categoryIcons[cat]||'📦')+' '+cat)} · 🚚 ${escapeHtml(x.supplier||'未填供应商')}</div><h3>${escapeHtml(x.name)}${x.brand?` · ${escapeHtml(x.brand)}`:''}</h3></div></div><button value="cancel" formnovalidate class="icon-btn" aria-label="关闭">✕</button></div>
      <div class="v9-sheet-stock">${qtyBox(v3Level(x),fmt(x.qty),x.unit)}<div class="v9-sheet-info"><div class="v9-sub">${x.spec?`<span class="v9-spec">${escapeHtml(x.spec)}</span>`:''}${pack?v82PackPill(pack):`<span class="meta-pill">订货单位 ${escapeHtml(v5OrderUnit(x))}</span>`}${typeof v45PricePill==='function'?v45PricePill(x):''}</div><p>${escapeHtml(v3Hint(x))}${use?` · 周耗≈${escapeHtml(fmt(use))} ${escapeHtml(x.unit||'')}`:''}${inDraft(x)?` · 🛒 草稿 ${escapeHtml(fmt(state.order[x.id]))} ${escapeHtml(v5OrderUnit(x))}`:''}</p></div></div>
      <div class="v9-sheet-actions">
        <button type="button" class="btn v9-act" data-action="operate" data-id="${escapeHtml(x.id)}">📥 到货 / 报损</button>
        <button type="button" class="btn v9-act" data-action="order" data-id="${escapeHtml(x.id)}">🛒 ＋订货</button>
        <button type="button" class="btn v9-act" data-action="set" data-id="${escapeHtml(x.id)}">🔢 设库存</button>
        <button type="button" class="btn v9-act" data-v3-edit="${escapeHtml(x.id)}">✏️ 编辑</button>
      </div></form>`;
    if(!sheet.open)sheet.showModal();
  }
  // 面板里的按钮沿用原来的 data-action / data-v3-edit，由原来的全局点击处理；
  // 这里先关面板（冒泡先到 dialog，再到 document），避免两个弹窗叠在一起。
  sheet.addEventListener('click',e=>{
    if(e.target===sheet){sheet.close();return}
    if(e.target.closest('[data-action],[data-v3-edit]'))sheet.close();
  });

  document.addEventListener('click',e=>{
    const mode=e.target.closest('[data-v9-mode]');
    if(mode){
      if(rail.mode!==mode.dataset.v9Mode){rail.mode=mode.dataset.v9Mode==='supplier'?'supplier':'category';saveRail();renderStock()}
      return;
    }
    const key=e.target.closest('[data-v9-key]');
    if(key){
      const search=document.getElementById('searchInput');
      if(search&&search.value){search.value=''}
      setSelected(key.dataset.v9Key);renderStock();scrollListIntoView();
      return;
    }
    const card=e.target.closest('[data-v9-sku]');
    if(card&&!e.target.closest('[data-v6-drag-handle]')){openSheet(card.dataset.v9Sku);return}
  });

  /* 侧边栏吸顶位置 = 顶栏高度（ui-extras.js 实测）+ 搜索栏高度（这里实测），见 v09-stock-rail.css。 */
  const toolbar=document.querySelector('#view-stock .toolbar.sticky-panel');
  function measure(){document.documentElement.style.setProperty('--v9-toolbar-h',(toolbar?toolbar.offsetHeight:64)+'px')}
  if(toolbar&&'ResizeObserver' in window)new ResizeObserver(measure).observe(toolbar);
  window.addEventListener('resize',measure);
  measure();

  renderStock();
})();

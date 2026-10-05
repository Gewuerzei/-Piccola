/* Cassola UI Extras v0.1 · theme + global command search */
(function(){
  const THEME_KEY='cassola_ui_theme_v01';
  const defaults={mode:'system',accent:'graphite'};
  let media=null;

  function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'')}
  function readTheme(){
    try{return{...defaults,...(JSON.parse(localStorage.getItem(THEME_KEY)||'{}')||{})}}catch(_){return{...defaults}}
  }
  function saveTheme(x){localStorage.setItem(THEME_KEY,JSON.stringify(x));applyTheme()}
  function resolvedMode(mode){
    if(mode==='light'||mode==='dark')return mode;
    return window.matchMedia?.('(prefers-color-scheme: light)').matches?'light':'dark';
  }
  function applyTheme(){
    const t=readTheme(),root=document.documentElement,resolved=resolvedMode(t.mode);
    root.dataset.theme=resolved;root.dataset.themeMode=t.mode;root.dataset.accent=t.accent;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=resolved==='light'?'#f3f1ec':'#161922';
    renderThemeControls();
  }
  function setupMedia(){
    media=window.matchMedia?.('(prefers-color-scheme: light)');
    media?.addEventListener?.('change',()=>{if(readTheme().mode==='system')applyTheme()});
  }

  function injectThemeCard(){
    const settings=document.getElementById('view-settings');if(!settings||document.getElementById('uiThemeCard'))return;
    const card=document.createElement('div');card.id='uiThemeCard';card.className='settings-card ui-theme-card';
    card.innerHTML=`
      <h2>🌗 外观</h2>
      <p>只保存在这台设备，不进入 Cloud。员工和 Supervisor 可以各自选自己喜欢的样子。</p>
      <div class="ui-theme-group">
        <span>外观</span>
        <div class="ui-theme-segment">
          <button type="button" data-theme-mode="system">跟随系统</button>
          <button type="button" data-theme-mode="light">日间</button>
          <button type="button" data-theme-mode="dark">夜间</button>
        </div>
      </div>
      <div class="ui-theme-group">
        <span>Accent</span>
        <div class="ui-accent-grid">
          <button type="button" data-theme-accent="graphite"><i></i>石墨</button>
          <button type="button" data-theme-accent="matcha"><i></i>抹茶</button>
          <button type="button" data-theme-accent="ocean"><i></i>海蓝</button>
          <button type="button" data-theme-accent="sakura"><i></i>樱色</button>
        </div>
      </div>`;
    const local=settings.querySelector('.settings-card:nth-child(2)');
    local?.insertAdjacentElement('afterend',card)||settings.appendChild(card);
    renderThemeControls();
  }
  function renderThemeControls(){
    const t=readTheme();
    document.querySelectorAll('[data-theme-mode]').forEach(b=>b.classList.toggle('active',b.dataset.themeMode===t.mode));
    document.querySelectorAll('[data-theme-accent]').forEach(b=>b.classList.toggle('active',b.dataset.themeAccent===t.accent));
  }

  function latestPriceData(s){
    if(typeof v45LatestPrice!=='function')return null;
    const latest=v45LatestPrice(s.id);if(!latest)return null;
    const prev=typeof v45ComparablePrevious==='function'?v45ComparablePrevious(latest):null;
    const cmp=typeof v45Comparison==='function'?v45Comparison(latest,prev):null;
    return{latest,cmp};
  }
  function openSku(id){
    const s=(state.skus||[]).find(x=>String(x.id)===String(id));if(!s)return;
    window.CassolaHub?.openInventory?.();
    setTimeout(()=>{
      document.querySelector('[data-view="stock"]')?.click();
      document.querySelectorAll('[data-v4-area]').forEach(b=>b.classList.toggle('active',b.dataset.v4Area===(s.area||'sushi')));
      const areaBtn=document.querySelector('#view-stock [data-v4-area="'+CSS.escape(s.area||'sushi')+'"]');areaBtn?.click();
      const input=document.getElementById('searchInput');if(input){input.value=s.name||'';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()}
    },50);
    document.getElementById('globalSearchDialog')?.close();
  }
  function openSupplier(name){
    window.CassolaHub?.openInventory?.();
    setTimeout(()=>{
      document.querySelector('[data-view="order"]')?.click();
      document.querySelector('[data-v3-order-mode="draft"]')?.click();
      const btn=[...document.querySelectorAll('[data-supplier]')].find(b=>b.dataset.supplier===name);
      btn?.click();
    },50);
    document.getElementById('globalSearchDialog')?.close();
  }
  function openOrders(){
    window.CassolaHub?.openInventory?.();
    setTimeout(()=>{
      document.querySelector('[data-view="order"]')?.click();
      document.querySelector('[data-v3-order-mode="placed"]')?.click();
      setTimeout(()=>{if(typeof v4FocusPending==='function')v4FocusPending()},80);
    },50);
    document.getElementById('globalSearchDialog')?.close();
  }
  function openCloudPending(){
    document.getElementById('globalSearchDialog')?.close();
    window.CassolaHub?.openInventory?.();
    setTimeout(()=>window.CassolaCloud?.openPending?.(),80);
  }
  function openCloudProposals(){
    document.getElementById('globalSearchDialog')?.close();
    window.CassolaHub?.openInventory?.();
    setTimeout(()=>window.CassolaEmployeeTools?.openReview?.(),80);
  }
  function openSettings(targetId){
    window.CassolaHub?.openInventory?.();
    setTimeout(()=>{
      document.querySelector('[data-view="settings"]')?.click();
      if(targetId)setTimeout(()=>document.getElementById(targetId)?.scrollIntoView({behavior:'smooth',block:'center'}),80);
    },50);
    document.getElementById('globalSearchDialog')?.close();
  }

  function buildResults(query){
    const q=String(query||'').trim().toLowerCase(),rows=[];
    const skus=typeof v3Skus==='function'?v3Skus():(state.skus||[]);
    const terms=x=>String(x||'').toLowerCase();

    for(const s of skus){
      const hay=[s.name,s.spec,s.supplier,s.category,s.area].map(terms).join(' ');
      if(q&& !hay.includes(q))continue;
      const p=latestPriceData(s),coverage=typeof v3Coverage==='function'?v3Coverage(s):null;
      rows.push({
        kind:'sku',id:s.id,rank:q&&terms(s.name).includes(q)?1:3,
        icon:typeof v3Icon==='function'?v3Icon(s):'📦',
        title:s.name,
        sub:[
          fmt(Number(s.qty)||0)+' '+(s.unit||''),
          s.supplier||'',
          p?.latest?('€'+Number(p.latest.amount||0).toFixed(2)+'/'+(p.latest.priceUnit||s.unit||'')):'',
          Number.isFinite(coverage)?('约 '+coverage.toFixed(1)+' 周'):''
        ].filter(Boolean).join(' · '),
        action:'sku'
      });
    }

    const supplierMap=new Map();
    skus.forEach(s=>{if(s.supplier)supplierMap.set(s.supplier,(supplierMap.get(s.supplier)||0)+1)});
    for(const [name,count] of supplierMap){
      if(q&& !terms(name).includes(q))continue;
      rows.push({kind:'supplier',rank:4,icon:'🚚',title:name,sub:count+' 个 SKU',action:'supplier',value:name});
    }

    const openOrders=(state.placedOrders||[]).filter(o=>{
      if(typeof v4OrderDone==='function')return !v4OrderDone(o);
      return o.status!=='received';
    });
    if(!q||['未处理','待收货','收货','订单','晚到','缺货'].some(x=>x.includes(q)||q.includes(x))){
      rows.push({kind:'command',rank:q?0:7,icon:'🔔',title:'未处理订单',sub:openOrders.length+' 张订单 · 点击定位第一项',action:'orders'});
    }

    const priceUps=[];
    for(const s of skus){
      const p=latestPriceData(s);if(p?.cmp?.pct>0)priceUps.push({s,pct:p.cmp.pct});
    }
    priceUps.sort((a,b)=>b.pct-a.pct);
    if(!q||['涨价','价格','price','价格雷达'].some(x=>x.includes(q)||q.includes(x))){
      priceUps.slice(0,5).forEach(x=>rows.push({
        kind:'price',rank:q?1:8,icon:'📈',title:x.s.name,
        sub:'最近可比价格 ↑ '+x.pct.toFixed(1)+'%',action:'sku',id:x.s.id
      }));
    }

    if(!q||['员工','盘货','submission','未审核'].some(x=>x.includes(q)||q.includes(x))){
      rows.push({kind:'command',rank:q?1:9,icon:'👷',title:'员工盘货待审核',sub:'打开 Cloud submission inbox',action:'employeePending'});
    }
    if(!q||['提议','sku提议','规格','单位'].some(x=>x.includes(q)||q.includes(x))){
      rows.push({kind:'command',rank:q?1:9,icon:'🧪',title:'员工 SKU 提议',sub:'规格 / 单位 / 新 SKU 待审核',action:'skuProposals'});
    }
    if(!q||['供应商','战绩','supplier'].some(x=>x.includes(q)||q.includes(x))){
      rows.push({kind:'command',rank:q?2:10,icon:'🚚',title:'供应商战绩',sub:'结案准确率 · 少到/缺货 · 挂起',action:'analytics',value:'supplierPerformanceCard'});
    }
    if(!q||['检察院','staff','异常','换休'].some(x=>x.includes(q)||q.includes(x))){
      rows.push({kind:'command',rank:q?2:10,icon:'🕵️',title:'Staff 检察院',sub:'只读扫描换休 / 调休 / 人员引用',action:'analytics',value:'staffProsecutorCard'});
    }
    if(!q||['设置','主题','日间','夜间','theme'].some(x=>x.includes(q)||q.includes(x))){
      rows.push({kind:'command',rank:q?2:10,icon:'🌗',title:'外观设置',sub:'日间 / 夜间 / Accent',action:'settings'});
    }

    return rows.sort((a,b)=>a.rank-b.rank||String(a.title).localeCompare(String(b.title),'zh-CN')).slice(0,40);
  }
  function renderSearch(){
    const input=document.getElementById('globalSearchInput'),list=document.getElementById('globalSearchResults');if(!input||!list)return;
    const rows=buildResults(input.value);
    list.innerHTML=rows.length?rows.map(r=>`
      <button type="button" class="global-search-row" data-global-action="${esc(r.action)}" ${r.id?'data-global-id="'+esc(r.id)+'"':''} ${r.value?'data-global-value="'+esc(r.value)+'"':''}>
        <span class="global-search-icon">${esc(r.icon)}</span>
        <span class="global-search-copy"><strong>${esc(r.title)}</strong><small>${esc(r.sub||'')}</small></span>
        <span class="global-search-go">›</span>
      </button>`).join(''):'<div class="empty">没有找到。</div>';
  }
  function openSearch(){
    ensureSearch();
    const d=document.getElementById('globalSearchDialog');d.showModal();
    const input=document.getElementById('globalSearchInput');input.value='';renderSearch();setTimeout(()=>input.focus(),40);
  }
  function ensureSearch(){
    if(document.getElementById('globalSearchDialog'))return;
    const d=document.createElement('dialog');d.id='globalSearchDialog';d.className='global-search-dialog';
    d.innerHTML=`
      <form method="dialog">
        <div class="global-search-head">
          <div><div class="eyebrow">CASSOLA SEARCH</div><h3>⌕ 全局搜索</h3></div>
          <button value="cancel" formnovalidate class="icon-btn">✕</button>
        </div>
        <input id="globalSearchInput" class="global-search-input" type="search" autocomplete="off" placeholder="Wakame / 米兰 / 未处理 / 涨价…" />
        <div id="globalSearchResults" class="global-search-results"></div>
      </form>`;
    document.body.appendChild(d);
    d.querySelector('#globalSearchInput').addEventListener('input',renderSearch);
  }
  function injectSearchButtons(){
    const top=document.querySelector('body > .topbar');
    if(top&&!document.getElementById('globalSearchTopBtn')){
      const b=document.createElement('button');b.id='globalSearchTopBtn';b.type='button';b.className='global-search-trigger';b.textContent='⌕';b.title='全局搜索';b.setAttribute('aria-label','全局搜索');
      const badge=document.getElementById('offlineBadge');top.insertBefore(b,badge||null);
    }
    const hub=document.getElementById('cassolaHub');
    if(hub&&!document.getElementById('globalSearchHubBtn')){
      const shell=hub.querySelector('.cassola-hub-shell'),cloud=document.getElementById('cassolaCloudHubSummary');
      if(shell){
        const b=document.createElement('button');b.id='globalSearchHubBtn';b.type='button';b.className='global-search-hub';b.innerHTML='<span>⌕</span><div><b>全局搜索</b><small>SKU · 供应商 · 订单 · 价格 · Cloud 待办</small></div><em>›</em>';
        cloud?.insertAdjacentElement('afterend',b)||shell.querySelector('.cassola-module-grid')?.insertAdjacentElement('beforebegin',b);
      }
    }
  }

  document.addEventListener('click',e=>{
    const mode=e.target.closest('[data-theme-mode]');if(mode){const t=readTheme();t.mode=mode.dataset.themeMode;saveTheme(t);return}
    const accent=e.target.closest('[data-theme-accent]');if(accent){const t=readTheme();t.accent=accent.dataset.themeAccent;saveTheme(t);return}
    if(e.target.closest('#globalSearchTopBtn,#globalSearchHubBtn')){openSearch();return}
    const row=e.target.closest('[data-global-action]');if(!row)return;
    const action=row.dataset.globalAction,id=row.dataset.globalId,value=row.dataset.globalValue;
    if(action==='sku')openSku(id);
    else if(action==='supplier')openSupplier(value);
    else if(action==='orders')openOrders();
    else if(action==='employeePending')openCloudPending();
    else if(action==='skuProposals')openCloudProposals();
    else if(action==='analytics')openSettings(value);
    else if(action==='settings')openSettings('uiThemeCard');
  });

  document.addEventListener('DOMContentLoaded',()=>{
    setupMedia();applyTheme();injectThemeCard();ensureSearch();injectSearchButtons();
  });
  window.addEventListener('cassola-cloud-reconnected',injectSearchButtons);

  window.CassolaUIExtras={applyTheme,openSearch,injectThemeCard,injectSearchButtons};
})();
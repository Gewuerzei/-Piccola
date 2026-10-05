/* Cassola Analytics v0.1 · supplier performance + price radar + Staff prosecutor */
(function(){
  function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'')}

  function supplierStats(){
    const map=new Map();
    for(const o of state.placedOrders||[]){
      const name=String(o.supplier||'未确认'),x=map.get(name)||{supplier:name,orders:0,lines:0,closed:0,exact:0,short:0,over:0,out:0,open:0,batches:0};
      x.orders++;x.batches+=(o.receiptBatches||[]).length;
      for(const i of o.items||[]){
        x.lines++;
        const st=String(i.lineStatus||'pending');
        if(['pending','later','other'].includes(st))x.open++;
        else{x.closed++;if(st==='received')x.exact++;if(st==='short')x.short++;if(st==='over')x.over++;if(st==='out')x.out++}
      }
      map.set(name,x);
    }
    return [...map.values()].map(x=>({...x,exactRate:x.closed?x.exact/x.closed:null,problemRate:x.closed?(x.short+x.out)/x.closed:null})).sort((a,b)=>(b.orders-a.orders)||a.supplier.localeCompare(b.supplier,'zh-CN'));
  }

  function priceRadar(){
    const rows=[];
    const skus=typeof v3Skus==='function'?v3Skus():(state.skus||[]);
    if(typeof v45LatestPrice!=='function'||typeof v45ComparablePrevious!=='function'||typeof v45Comparison!=='function')return rows;
    for(const s of skus){
      const latest=v45LatestPrice(s.id),prev=v45ComparablePrevious(latest),cmp=v45Comparison(latest,prev);
      if(!latest||!cmp)continue;
      rows.push({s,latest,prev,cmp});
    }
    return rows.sort((a,b)=>Math.abs(b.cmp.pct)-Math.abs(a.cmp.pct));
  }

  function staffState(){
    try{
      const raw=JSON.parse(localStorage.getItem('cassola_staff_v01')||'null');
      return raw&&typeof raw==='object'?raw:null;
    }catch(_){return null}
  }
  function staffAnomalies(){
    const s=staffState();if(!s)return[{level:'info',title:'Staff 尚无本地数据',detail:'没有可扫描的 cassola_staff_v01。'}];
    const people=new Set((s.people||[]).map(p=>String(p.id))),out=[];
    const attendance=s.attendance&&typeof s.attendance==='object'?s.attendance:{};
    for(const [date,map] of Object.entries(attendance)){
      for(const [personId,rec] of Object.entries(map||{})){
        if(!people.has(String(personId)))out.push({level:'warn',title:'排班引用不存在人员',detail:date+' · '+personId});
        if(rec?.swapId&&!((s.swaps||[]).some(x=>x.id===rec.swapId&&x.status==='active')))out.push({level:'warn',title:'孤立 swapId',detail:date+' · '+personId+' · '+rec.swapId});
        if(rec?.moveId&&!((s.restMoves||[]).some(x=>x.id===rec.moveId)))out.push({level:'warn',title:'孤立 moveId',detail:date+' · '+personId+' · '+rec.moveId});
      }
    }
    for(const ev of s.swaps||[]){
      if(ev.status!=='active')continue;
      if(ev.personAId===ev.personBId)out.push({level:'danger',title:'有效换休双方是同一人',detail:ev.id});
      if(!people.has(String(ev.personAId))||!people.has(String(ev.personBId)))out.push({level:'danger',title:'有效换休引用不存在人员',detail:(ev.personAName||ev.personAId)+' ↔ '+(ev.personBName||ev.personBId)});
      const a=attendance?.[ev.personADateAfter]?.[ev.personAId],b=attendance?.[ev.personBDateAfter]?.[ev.personBId];
      if(a?.swapId!==ev.id||b?.swapId!==ev.id)out.push({level:'warn',title:'有效换休与当前周表脱链',detail:(ev.personAName||'A')+' '+(ev.personADateAfter||'?')+' / '+(ev.personBName||'B')+' '+(ev.personBDateAfter||'?')});
    }
    for(const mv of s.restMoves||[]){
      if(!people.has(String(mv.personId)))out.push({level:'warn',title:'个人调休引用不存在人员',detail:mv.personName||mv.personId});
      const rec=attendance?.[mv.toDate]?.[mv.personId];
      if(!rec||rec.moveId!==mv.id)out.push({level:'info',title:'历史调休与当前周表不同',detail:(mv.personName||mv.personId)+' · '+mv.fromDate+' → '+mv.toDate});
    }
    const keys=new Map();
    for(const ev of (s.swaps||[]).filter(x=>x.status==='active')){
      for(const pair of [[ev.personAId,ev.personADateAfter],[ev.personBId,ev.personBDateAfter]]){
        const k=String(pair[0])+'|'+String(pair[1]);keys.set(k,(keys.get(k)||0)+1);
      }
    }
    for(const [k,n] of keys)if(n>1)out.push({level:'danger',title:'同一员工同一天存在多个有效换休',detail:k.replace('|',' · ')+' · '+n+' 条'});
    return out;
  }

  function inject(){
    const settings=document.getElementById('view-settings');if(!settings)return;
    if(!document.getElementById('supplierPerformanceCard')){
      const card=document.createElement('div');card.id='supplierPerformanceCard';card.className='settings-card analytics-card';
      card.innerHTML='<div class="analytics-head"><div><h2>🚚 供应商战绩</h2><p>从已下单 / 收货事务推导，不另造一套人工评分。</p></div><button type="button" class="btn secondary" data-analytics-refresh>刷新</button></div><div id="supplierPerformanceList"></div>';
      settings.appendChild(card);
    }
    if(!document.getElementById('priceRadarCard')){
      const card=document.createElement('div');card.id='priceRadarCard';card.className='settings-card analytics-card';
      card.innerHTML='<div class="analytics-head"><div><h2>📈 Price Radar</h2><p>只比较同供应商、同规格、同报价单位且 IVA 基准可比的价格。</p></div></div><div id="priceRadarList"></div>';
      settings.appendChild(card);
    }
    if(!document.getElementById('staffProsecutorCard')){
      const card=document.createElement('div');card.id='staffProsecutorCard';card.className='settings-card analytics-card';
      card.innerHTML='<div class="analytics-head"><div><h2>🕵️ Staff 检察院</h2><p>只读扫描换休 / 调休 / 人员引用异常，绝不自动改排班。</p></div><button type="button" class="btn secondary" data-analytics-refresh>重扫</button></div><div id="staffProsecutorList"></div>';
      settings.appendChild(card);
    }
    render();
  }

  function renderSupplier(){
    const box=document.getElementById('supplierPerformanceList');if(!box)return;
    const rows=supplierStats();
    box.innerHTML=rows.length?rows.map(x=>{
      const exact=x.exactRate==null?'—':Math.round(x.exactRate*100)+'%';
      const problem=x.problemRate==null?'—':Math.round(x.problemRate*100)+'%';
      return '<div class="analytics-row supplier"><div><strong>'+esc(x.supplier)+'</strong><small>'+x.orders+' 张订单 · '+x.lines+' 行 · '+x.batches+' 次收货批次</small></div><div class="analytics-metrics"><span>准确 <b>'+exact+'</b></span><span>少到/缺货 <b>'+problem+'</b></span><span>挂起 <b>'+x.open+'</b></span></div></div>';
    }).join(''):'<div class="empty">还没有足够的供应商收货记录。</div>';
  }
  function renderPrice(){
    const box=document.getElementById('priceRadarList');if(!box)return;
    const rows=priceRadar();
    box.innerHTML=rows.length?rows.slice(0,12).map(x=>{
      const up=x.cmp.pct>0,cls=up?'up':'down';
      return '<button type="button" class="analytics-row price '+cls+'" data-analytics-sku="'+esc(x.s.id)+'"><div><strong>'+esc(x.s.name)+'</strong><small>'+esc(x.latest.supplier||x.s.supplier)+' · '+esc(x.latest.priceUnit||x.s.unit||'')+'</small></div><div class="price-radar-value"><b>'+(up?'↑ ':'↓ ')+Math.abs(x.cmp.pct).toFixed(1)+'%</b><small>€'+Number(x.cmp.previous).toFixed(2)+' → €'+Number(x.cmp.current).toFixed(2)+'</small></div></button>';
    }).join(''):'<div class="empty">还没有可比较的价格变化。</div>';
  }
  function renderStaff(){
    const box=document.getElementById('staffProsecutorList');if(!box)return;
    const rows=staffAnomalies();
    const actionable=rows.filter(x=>x.level!=='info').length;
    box.innerHTML='<div class="prosecutor-summary '+(actionable?'warn':'ok')+'">'+(actionable?('⚠️ '+actionable+' 项需要人工看看'):'✅ 没发现结构性冲突')+'</div>'+
      (rows.length?rows.slice(0,30).map(x=>'<div class="prosecutor-row '+esc(x.level)+'"><strong>'+esc(x.title)+'</strong><small>'+esc(x.detail)+'</small></div>').join(''):'');
  }
  function render(){renderSupplier();renderPrice();renderStaff()}

  function openSku(id){
    const s=(state.skus||[]).find(x=>String(x.id)===String(id));if(!s)return;
    const input=document.getElementById('searchInput');
    document.querySelector('[data-view="stock"]')?.click();
    document.querySelector('#view-stock [data-v4-area="'+CSS.escape(s.area||'sushi')+'"]')?.click();
    if(input){input.value=s.name;input.dispatchEvent(new Event('input',{bubbles:true}))}
    window.scrollTo({top:0,behavior:'smooth'});
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-analytics-refresh]')){render();return}
    const sku=e.target.closest('[data-analytics-sku]');if(sku){openSku(sku.dataset.analyticsSku);return}
  });
  document.addEventListener('DOMContentLoaded',inject);
  window.CassolaAnalytics={render,inject,supplierStats,priceRadar,staffAnomalies};
})();
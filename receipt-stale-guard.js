/* Cassola Inventory v0.9.3 · 已结案订单的员工收货授权不再遗留
   2026-11-13 Pietro：Gazi 的员工端还挂着 10/30 大兴的收货任务，但那张订单 11/01 已由 Supervisor 本机收货结案。
   原因：订单结案不会自动撤销 Cloud 上的员工收货授权（v0.7.9 只加了手动管理入口）。
   现在：
   1. Supervisor 本机有订单刚结案时，如果 Cloud 上这张订单还有「已授权 · 未提交」的员工收货任务，立即弹窗问要不要一起撤销。
   2. 「已下单」页顶部显示所有「订单已结案、授权还在」的遗留任务，一键撤销（二次确认）。
   只调用现有 Supervisor API（listReceiptTasks / revokeReceiptTask）；不改库存、订单、历史；
   已提交（submitted）的任务不会被撤销，仍走收货审核。离线或 Cloud 出错时静默跳过，下次再查。 */
(function(){
  const NOTE='订单已结案，撤销遗留的员工收货授权';
  const CHECK_GAP_MS=60000;
  let stale=[],checking=false,lastCheck=0,knownClosed=null;

  const cloud=()=>window.CassolaCloud;
  const ready=()=>!!(cloud()?.connected?.()&&cloud()?.role?.()==='supervisor'&&typeof cloud().listReceiptTasks==='function');
  const closedIds=()=>new Set((state.placedOrders||[]).filter(o=>v4OrderDone(o)).map(o=>String(o.id)));
  function line(t){
    const who=t.displayName||t.source_role_name||'员工';
    const d=t.authorized_at?new Date(t.authorized_at).toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'}):'';
    return `${who} · ${t.supplier||'供应商'}${d?' · '+d:''}`;
  }

  async function check({newlyClosed=null}={}){
    if(checking||!ready())return;
    checking=true;lastCheck=Date.now();
    try{
      const data=await cloud().listReceiptTasks(['authorized']);
      const tasks=Array.isArray(data?.tasks)?data.tasks:[];
      const closed=closedIds();
      stale=tasks.filter(t=>t.status==='authorized'&&!t.submission_id&&closed.has(String(t.order_id)));
      renderBanner();
      if(newlyClosed&&newlyClosed.size){
        const just=stale.filter(t=>newlyClosed.has(String(t.order_id)));
        if(just.length&&confirm(`这张订单已经结案，但员工端还挂着收货任务：\n\n${just.map(line).join('\n')}\n\n现在撤销吗？员工下次刷新后任务消失；库存、订单、历史都不变。`)){
          checking=false;await revoke(just);return;
        }
      }
    }catch(_){/* 离线或 Cloud 出错：不打扰，下次再查 */}
    finally{checking=false}
  }

  async function revoke(list){
    let ok=0,fail=0;
    for(const t of list){
      try{await cloud().revokeReceiptTask(t.task_id,NOTE);ok++}catch(_){fail++}
    }
    showToast(fail?`已撤销 ${ok} 条，${fail} 条失败，稍后再试`:`✅ 已撤销 ${ok} 条遗留收货任务`);
    await check();
  }

  function renderBanner(){
    const entry=document.querySelector('#v3PlacedPane .v4-receipt-manager-entry');
    let el=document.getElementById('v93StaleReceiptBanner');
    if(!stale.length||!entry){el?.remove();return}
    if(!el){
      el=document.createElement('div');el.id='v93StaleReceiptBanner';el.className='v93-stale-receipt';el.setAttribute('role','status');
      entry.parentNode.insertBefore(el,entry);
    }
    const names=stale.slice(0,3).map(line).join('；')+(stale.length>3?` 等 ${stale.length} 条`:'');
    el.innerHTML=`<div class="v93-stale-copy"><strong>⚠️ ${stale.length} 条员工收货任务的订单已经结案</strong><small>员工端还看得到：${escapeHtml(names)}</small></div><button type="button" class="btn danger" data-v93-revoke-stale>↩️ 全部撤销</button>`;
  }

  document.addEventListener('click',async e=>{
    if(e.target.closest('[data-v93-revoke-stale]')){
      if(!stale.length)return;
      if(!confirm(`撤销这 ${stale.length} 条遗留的员工收货授权？\n\n${stale.map(line).join('\n')}\n\n员工下次刷新后任务消失；库存、订单、历史都不变。`))return;
      await revoke(stale.slice());
      return;
    }
    // 打开「已下单」时补查一次（最多每分钟一次）
    setTimeout(()=>{
      const pane=document.getElementById('v3PlacedPane');
      if(pane&&!pane.classList.contains('hidden')&&pane.getClientRects().length&&Date.now()-lastCheck>CHECK_GAP_MS)check();
    },0);
  });

  // 每次全量重绘后看有没有新结案的订单；有就立刻查 Cloud。
  const prevRenderAll=renderAll;
  renderAll=function(){
    const r=prevRenderAll.apply(this,arguments);
    try{
      const now=closedIds();
      if(knownClosed){
        const fresh=new Set([...now].filter(id=>!knownClosed.has(id)));
        if(fresh.size)check({newlyClosed:fresh});
      }
      knownClosed=now;
      renderBanner();
    }catch(_){}
    return r;
  };
  knownClosed=closedIds();

  window.addEventListener('cassola-cloud-reconnected',()=>{lastCheck=0;check()});
  setTimeout(check,4000);
})();

/* Cassola Employee Count Import v0.1 · Supervisor scoped submission review */
(function(){
  let pending=null;

  function esc(v){return escapeHtml(String(v??''))}
  function ensureState(){
    if(!Array.isArray(state.employeeSubmissions))state.employeeSubmissions=[];
  }
  function registryRecord(id){
    return (window.CassolaAccessRegistry?.credentials||[]).find(x=>x.id===id)||null;
  }
  function scopeAllows(scope,s){
    if(!scope||!s)return false;
    if(scope.kind==='category')return s.category===scope.value;
    if(scope.kind==='area')return (s.area||'sushi')===scope.value;
    if(scope.kind==='skuIds')return new Set(scope.skuIds||[]).has(s.id);
    return false;
  }
  function sameScope(a,b){
    if(!a||!b)return false;
    return a.id===b.id&&a.kind===b.kind&&a.value===b.value;
  }
  function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))}
  function validTime(v){return Number.isFinite(new Date(v).getTime())}
  function activeFor(key){
    ensureState();
    return state.employeeSubmissions
      .filter(x=>x.effectiveKey===key&&x.status==='active')
      .sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt))[0]||null;
  }
  function validate(data){
    if(!data||data.format!=='cassola-employee-count-v1')throw new Error('不是员工盘货包');
    if(data.role!=='employee')throw new Error('角色不是 employee');
    if(!validDate(data.date)||!validTime(data.submittedAt))throw new Error('日期 / 提交时间无效');
    if(!data.submissionId||!data.credentialId)throw new Error('缺少 submissionId / credentialId');
    const record=registryRecord(data.credentialId);
    if(!record||record.role!=='employee'||!record.scope)throw new Error('这个员工槽位没有登记');
    if(!sameScope(record.scope,data.scope))throw new Error('盘货包 scope 与登记权限不一致');
    const expectedKey=`${record.scope.id}:${data.date}`;
    if(data.effectiveKey!==expectedKey)throw new Error('effectiveKey 不匹配');
    if(!Array.isArray(data.counts)||!data.counts.length)throw new Error('盘货包没有数量');
    ensureState();
    if(state.employeeSubmissions.some(x=>x.submissionId===data.submissionId))throw new Error('这份 submission 已经导入过');

    const seen=new Set(),rows=[];
    for(const item of data.counts){
      if(!item||!item.skuId||seen.has(item.skuId))throw new Error('SKU 重复或缺少 id');
      seen.add(item.skuId);
      const s=sku(item.skuId);
      if(!s)throw new Error(`未知 SKU：${item.skuId}`);
      if(!scopeAllows(record.scope,s))throw new Error(`${s.name} 不属于该员工责任区`);
      const qty=Number(item.qty);
      if(!Number.isFinite(qty)||qty<0)throw new Error(`${s.name} 的数量无效`);
      rows.push({s,qty,old:Number(s.qty)||0});
    }
    if(Array.isArray(data.scopeSkuIds)){
      const scopeIds=[...new Set(data.scopeSkuIds.map(String))];
      if(scopeIds.some(id=>!scopeAllows(record.scope,sku(id))))throw new Error('scopeSkuIds 含越权 SKU');
      if(scopeIds.some(id=>!seen.has(id))||seen.size!==scopeIds.length)throw new Error('盘货包不是完整责任区快照');
    }
    const active=activeFor(expectedKey);
    const incomingAt=new Date(data.submittedAt).getTime();
    const activeAt=active?new Date(active.submittedAt).getTime():-Infinity;
    const stale=!!active&&incomingAt<=activeAt;
    return{record,scope:record.scope,rows,active,stale,effectiveKey:expectedKey};
  }

  function diffClass(delta){
    if(delta===0)return'same';
    const abs=Math.abs(delta);
    return abs>=5?'large':'changed';
  }
  function fmtSigned(n){
    if(n===0)return'±0';
    return (n>0?'+':'')+fmt(n);
  }
  function preview(data){
    let v;
    try{v=validate(data)}catch(err){alert('员工盘货包无法导入：'+err.message);return}
    pending={data,validation:v};
    const changed=v.rows.filter(x=>x.qty!==x.old),same=v.rows.length-changed.length;
    const activeText=v.active?`${v.active.credentialId} · ${new Date(v.active.submittedAt).toLocaleString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`:'无';
    const mode=v.stale?'stale':'ready';
    const banner=v.stale
      ?'<div class="ei-banner stale"><strong>⛔ 不是最新版</strong><span>本机已有同责任区同一天更晚的 active 提交。不会覆盖库存。</span></div>'
      :'<div class="ei-banner ready"><strong>✅ 可采用</strong><span>确认后只更新这个责任区包里列出的 SKU。</span></div>';
    document.getElementById('eiImportSummary').innerHTML=`
      ${banner}
      <div class="ei-meta">
        <div><span>责任区</span><b>${esc(v.scope.label||v.scope.id)}</b></div>
        <div><span>日期</span><b>${esc(data.date)}</b></div>
        <div><span>提交槽位</span><b>${esc(data.credentialId)}</b></div>
        <div><span>提交时间</span><b>${esc(new Date(data.submittedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</b></div>
      </div>
      <div class="ei-latest">当前 active：${esc(activeText)}</div>
      <div class="ei-stats"><div><span>提交 SKU</span><b>${v.rows.length}</b></div><div><span>有差异</span><b>${changed.length}</b></div><div><span>无变化</span><b>${same}</b></div></div>
      <div class="ei-diff-list">${v.rows.map(x=>{
        const delta=x.qty-x.old,cls=diffClass(delta);
        return `<div class="ei-diff-row ${cls}"><div><strong>${esc(x.s.name)}</strong><small>${esc(x.s.spec||'无规格')}</small></div><div class="ei-values"><span>${fmt(x.old)} → <b>${fmt(x.qty)}</b> ${esc(x.s.unit)}</span><em>${fmtSigned(delta)}</em></div></div>`;
      }).join('')}</div>
    `;
    const accept=document.getElementById('eiAcceptBtn');
    accept.classList.toggle('hidden',v.stale);
    document.getElementById('eiImportDialog').showModal();
  }

  function apply(){
    if(!pending)return;
    let v;
    try{v=validate(pending.data)}catch(err){alert('导入状态已经变化，请重新选择文件：'+err.message);return}
    if(v.stale){showToast('这不是当天最新版');return}
    if(!confirm(`采用 ${v.scope.label||v.scope.id} · ${pending.data.date} 的员工盘货？`))return;
    const now=stamp(),submissionId=pending.data.submissionId;
    if(v.active){
      v.active.status='superseded';
      v.active.supersededAt=now;
      v.active.supersededBy=submissionId;
    }
    const batch=`employee:${submissionId}`;
    let changed=0;
    v.rows.forEach(({s,qty,old})=>{
      if(old===qty)return;
      s.qty=qty;
      addHistory('count',s.id,`${fmt(old)} → ${fmt(qty)} ${s.unit}`,`员工盘货 · ${v.scope.label||v.scope.id} · ${pending.data.credentialId}`,{
        batch,employeeSubmissionId:submissionId,employeeScopeId:v.scope.id,employeeCredentialId:pending.data.credentialId
      });
      changed++;
    });
    state.employeeSubmissions.push({
      submissionId,
      effectiveKey:v.effectiveKey,
      date:pending.data.date,
      submittedAt:pending.data.submittedAt,
      importedAt:now,
      appliedAt:now,
      credentialId:pending.data.credentialId,
      scope:JSON.parse(JSON.stringify(v.scope)),
      status:'active',
      deviceRevision:Number(pending.data.deviceRevision)||0,
      counts:v.rows.map(x=>({skuId:x.s.id,qty:x.qty})),
      changedCount:changed
    });
    saveState();
    document.getElementById('eiImportDialog').close();
    pending=null;
    renderAll();
    refresh();
    showToast(`已采用员工盘货 · ${changed} 项变化`);
  }

  function readFile(file){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{preview(JSON.parse(reader.result))}
      catch(_){alert('这个 JSON 无法读取。')}
    };
    reader.readAsText(file);
  }

  function latestRows(){
    ensureState();
    return state.employeeSubmissions
      .filter(x=>x.status==='active')
      .slice().sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,8);
  }
  function refresh(){
    ensureState();
    const list=document.getElementById('eiLatestList');if(!list)return;
    const rows=latestRows();
    list.innerHTML=rows.length?rows.map(x=>`
      <div class="ei-latest-row">
        <div><strong>${esc(x.scope?.label||x.scope?.id||'责任区')}</strong><small>${esc(x.date)} · ${esc(x.credentialId)}</small></div>
        <div><b>${esc(new Date(x.submittedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}))}</b><small>${x.changedCount||0} 项变化</small></div>
      </div>`).join(''):'<div class="ei-empty">还没有采用过员工盘货包。</div>';
  }

  function inject(){
    ensureState();
    const settings=document.getElementById('view-settings');
    if(!settings||document.getElementById('eiImportCard'))return;
    const handoff=document.getElementById('v31HandoffCard');
    const card=document.createElement('div');
    card.className='settings-card ei-import-card';
    card.id='eiImportCard';
    card.innerHTML=`
      <h2>👷 员工盘货包</h2>
      <p>导入员工责任区 JSON，先看库存差异，再由 Supervisor 确认写入总账。同责任区同一天只保留最新 active 提交。</p>
      <label class="btn primary file-btn ei-file-btn">📥 导入员工盘货包<input id="eiImportInput" type="file" accept="application/json,.json"></label>
      <div class="ei-tip">越权 SKU、未知 SKU、重复 submission、旧于当前 active 的文件都会被拦截。</div>
      <div class="ei-latest-title">最近 active 提交</div>
      <div id="eiLatestList"></div>
    `;
    if(handoff)settings.insertBefore(card,handoff.nextSibling);
    else settings.prepend(card);

    const dialog=document.createElement('dialog');
    dialog.id='eiImportDialog';
    dialog.className='ei-import-dialog';
    dialog.innerHTML=`
      <form method="dialog" class="ei-import-form">
        <div class="dialog-head"><div><div class="eyebrow">EMPLOYEE COUNT</div><h3>员工盘货差异</h3></div><button value="cancel" class="icon-btn">✕</button></div>
        <div id="eiImportSummary"></div>
        <div class="ei-import-actions"><button value="cancel" class="btn secondary">取消</button><button id="eiAcceptBtn" value="default" class="btn primary">采用最新版</button></div>
      </form>`;
    document.body.appendChild(dialog);
    document.getElementById('eiImportInput').addEventListener('change',e=>{
      const file=e.target.files?.[0];e.target.value='';if(file)readFile(file);
    });
    document.getElementById('eiAcceptBtn').addEventListener('click',e=>{e.preventDefault();apply()});
    refresh();
  }

  const oldRenderSettings=renderSettings;
  renderSettings=function(){oldRenderSettings();refresh()};

  inject();
  window.CassolaEmployeeImport={refresh,preview};
})();

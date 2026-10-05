/* Cassola Hub · pre-registered role gate + scoped employee count */
(function(){
  const FAIL_KEY='cassola_access_fail_v02';
  const EMPLOYEE_DRAFT_PREFIX='cassola_employee_count_v01';
  let accessSession=null;

  function registry(){
    const r=window.CassolaAccessRegistry;
    return r&&Array.isArray(r.credentials)?r:{version:0,credentials:[]};
  }
  function bytesFromB64(s){
    const raw=atob(s),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  function bytesToB64(bytes){
    let out='';for(const b of bytes)out+=String.fromCharCode(b);
    return btoa(out);
  }
  async function deriveCode(code,record){
    if(!crypto?.subtle)throw new Error('Web Crypto unavailable');
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({
      name:'PBKDF2',hash:'SHA-256',salt:bytesFromB64(record.salt),iterations:Number(record.iterations)||200000
    },key,256);
    return bytesToB64(new Uint8Array(bits));
  }
  async function verifyAccessCode(code){
    for(const record of registry().credentials){
      const got=await deriveCode(code,record);
      if(got===record.hash)return record;
    }
    return null;
  }
  function failState(){
    try{return JSON.parse(sessionStorage.getItem(FAIL_KEY)||'null')||{count:0,until:0}}catch(_){return{count:0,until:0}}
  }
  function clearFailures(){sessionStorage.removeItem(FAIL_KEY)}
  function cooldownSeconds(){
    const f=failState();
    return Math.max(0,Math.ceil(((Number(f.until)||0)-Date.now())/1000));
  }
  function registerFailure(){
    const f=failState(),now=Date.now();
    if((Number(f.until)||0)>now)return f;
    f.count=(Number(f.count)||0)+1;
    if(f.count>=5){f.count=0;f.until=now+30000}
    sessionStorage.setItem(FAIL_KEY,JSON.stringify(f));
    return f;
  }
  function isSupervisor(){return accessSession?.role==='supervisor'}
  function isEmployee(){return accessSession?.role==='employee'}

  function hideStaff(){
    if(window.CassolaStaff)window.CassolaStaff.hide();
  }
  function showMode(mode){
    if(!['gate','hub','inventory','staff','employee'].includes(mode))mode='gate';
    if((mode==='hub'||mode==='inventory'||mode==='staff')&&!isSupervisor())mode=accessSession?'employee':'gate';
    if(mode==='employee'&&!isEmployee())mode=accessSession?'hub':'gate';

    document.body.dataset.cassolaMode=mode;
    if(mode==='staff'){
      if(window.CassolaStaff)window.CassolaStaff.show();
      document.title='Cassola Staff';
    }else{
      hideStaff();
      if(mode==='inventory')document.title='Cassola Inventory';
      else if(mode==='employee')document.title='Cassola Employee';
      else document.title='Cassola';
    }
    if(mode==='employee')renderEmployee();
    if(mode==='hub')renderSupervisorState();
    window.scrollTo(0,0);
  }

  function todayKey(){
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  }
  function draftKey(){
    const scope=accessSession?.scope?.id||'none',cred=accessSession?.id||'none';
    return `${EMPLOYEE_DRAFT_PREFIX}:${scope}:${cred}:${todayKey()}`;
  }
  function loadEmployeeDraft(){
    try{
      const x=JSON.parse(localStorage.getItem(draftKey())||'null');
      return x&&x.date===todayKey()?x:{version:1,date:todayKey(),counts:{},exportRevision:0};
    }catch(_){return{version:1,date:todayKey(),counts:{},exportRevision:0}}
  }
  function saveEmployeeDraft(x){localStorage.setItem(draftKey(),JSON.stringify(x))}
  function scopeSkus(scope){
    let rows=typeof v3Skus==='function'?v3Skus():((typeof state!=='undefined'&&Array.isArray(state.skus))?state.skus:[]);
    if(!scope)return[];
    if(scope.kind==='category')rows=rows.filter(s=>s.category===scope.value);
    else if(scope.kind==='area')rows=rows.filter(s=>(s.area||'sushi')===scope.value);
    else if(scope.kind==='skuIds'){
      const allowed=new Set(scope.skuIds||[]);
      rows=rows.filter(s=>allowed.has(s.id));
    }else return[];
    return rows.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'zh-CN'));
  }
  function employeeProgress(){
    const draft=loadEmployeeDraft(),rows=scopeSkus(accessSession?.scope);
    const filled=rows.filter(s=>draft.counts?.[s.id]!==undefined&&draft.counts?.[s.id]!==null&&draft.counts?.[s.id]!=='').length;
    return{filled,total:rows.length};
  }
  function renderEmployee(){
    const box=document.getElementById('cassolaEmployee');if(!box||!isEmployee())return;
    const scope=accessSession.scope||{},rows=scopeSkus(scope),draft=loadEmployeeDraft();
    const filled=rows.filter(s=>draft.counts?.[s.id]!==undefined&&draft.counts?.[s.id]!==null&&draft.counts?.[s.id]!=='').length;
    box.innerHTML='<div class="cassola-employee-shell">'+
      '<div class="cassola-employee-top"><button type="button" class="cassola-home-btn" data-cassola-logout>⌂</button><div><div class="eyebrow">EMPLOYEE MODE</div><h1>'+escapeHtml(scope.label||'责任区盘货')+'</h1><p>'+escapeHtml(accessSession.label||'员工')+' · '+todayKey()+'</p></div><span class="cassola-role-pill">👷 员工</span></div>'+
      '<div class="cassola-employee-summary"><div><span>责任区 SKU</span><b>'+rows.length+'</b></div><div><span>今日已填</span><b id="cassolaEmployeeFilled">'+filled+'/'+rows.length+'</b></div></div>'+
      '<div class="cassola-employee-note">这里只能填写当前责任区的现场数量。不会进入管理员 Inventory，也不会修改其他 SKU。</div>'+
      '<div class="cassola-employee-counts">'+
      (rows.length?rows.map(s=>{
        const v=draft.counts?.[s.id];
        return '<label class="cassola-employee-row"><div><strong>'+escapeHtml(s.name||'SKU')+'</strong><small>'+escapeHtml(s.spec||'无规格')+' · '+escapeHtml(s.unit||'')+'</small></div><div class="cassola-employee-input"><input data-employee-sku="'+escapeHtml(s.id)+'" type="text" inputmode="decimal" autocomplete="off" placeholder="—" value="'+(v===undefined||v===null?'':escapeHtml(String(v)))+'"><span>'+escapeHtml(s.unit||'')+'</span></div></label>';
      }).join(''):'<div class="empty">这个责任区没有可盘 SKU。</div>')+
      '</div>'+
      '<div class="cassola-employee-actions"><button type="button" class="btn secondary" data-employee-clear>清空今日</button><button type="button" class="btn primary large" data-employee-export>📤 生成今日盘货包</button></div>'+
      '<div class="cassola-employee-foot">只导出本责任区已填写的 SKU · 同责任区同一天以后按 submittedAt 取最新版</div>'+
      '</div>';
  }
  function parseEmployeeQty(raw){
    if(typeof parseLocaleDecimal==='function')return parseLocaleDecimal(raw);
    const n=Number(String(raw??'').trim().replace(',','.'));return Number.isFinite(n)?n:NaN;
  }
  function saveEmployeeInput(input){
    if(!isEmployee())return;
    const id=input.dataset.employeeSku,raw=input.value.trim(),draft=loadEmployeeDraft();
    if(!draft.counts)draft.counts={};
    if(raw==='')delete draft.counts[id];
    else{
      const n=parseEmployeeQty(raw);
      if(!Number.isFinite(n)||n<0)return;
      draft.counts[id]=n;
    }
    saveEmployeeDraft(draft);
    const p=employeeProgress(),el=document.getElementById('cassolaEmployeeFilled');
    if(el)el.textContent=p.filled+'/'+p.total;
  }
  function clearEmployeeDraft(){
    if(!isEmployee())return;
    if(!confirm('清空今天已经填写的盘货数字？'))return;
    localStorage.removeItem(draftKey());
    renderEmployee();
  }
  function exportEmployeeCount(){
    if(!isEmployee())return;
    const scope=accessSession.scope||{},rows=scopeSkus(scope),draft=loadEmployeeDraft(),filled=[];
    rows.forEach(s=>{
      const v=draft.counts?.[s.id];
      if(v===undefined||v===null||v==='')return;
      const n=Number(v);if(!Number.isFinite(n)||n<0)return;
      filled.push({skuId:s.id,name:s.name,qty:n,unit:s.unit||'',spec:s.spec||''});
    });
    if(!filled.length){showToast?.('还没有填写盘货数量');return}
    const missing=rows.length-filled.length;
    if(missing>0&&!confirm(`还有 ${missing} 个责任区 SKU 未填写，仍然生成盘货包？`))return;
    draft.exportRevision=(Number(draft.exportRevision)||0)+1;
    draft.lastExportedAt=new Date().toISOString();
    saveEmployeeDraft(draft);
    const payload={
      format:'cassola-employee-count-v1',
      date:todayKey(),
      submittedAt:draft.lastExportedAt,
      submissionId:crypto.randomUUID?.()||String(Date.now()+Math.random()),
      credentialId:accessSession.id,
      role:'employee',
      scope:{id:scope.id,kind:scope.kind,value:scope.value,label:scope.label},
      effectiveKey:`${scope.id}:${todayKey()}`,
      latestRule:'submittedAt',
      deviceRevision:draft.exportRevision,
      counts:filled
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    const hh=String(new Date().getHours()).padStart(2,'0'),mm=String(new Date().getMinutes()).padStart(2,'0');
    a.download=`cassola-count-${scope.id||'scope'}-${todayKey()}-${hh}${mm}.json`;
    a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    if(typeof showToast==='function')showToast('今日盘货包已生成');
    renderEmployee();
  }

  function renderSupervisorState(){
    const box=document.getElementById('cassolaAccessState');if(!box)return;
    box.innerHTML='<div><span class="cassola-access-dot">🔓</span><div><b>Supervisor</b><small>完整 Inventory / Staff 权限。本次打开期间有效。</small></div></div><button type="button" data-cassola-logout>锁定并退出</button>';
  }

  async function submitGate(e){
    e.preventDefault();
    const input=document.getElementById('cassolaGateCode'),btn=document.getElementById('cassolaGateSubmit'),err=document.getElementById('cassolaGateError');
    const code=input?.value.trim()||'',left=cooldownSeconds();
    err.classList.add('hidden');err.textContent='';
    if(left>0){err.textContent=`尝试太多，请 ${left} 秒后再试。`;err.classList.remove('hidden');return}
    if(!code){err.textContent='请输入 Access Code。';err.classList.remove('hidden');return}
    btn.disabled=true;
    try{
      const record=await verifyAccessCode(code);
      if(!record){
        const f=registerFailure(),cool=Math.max(0,Math.ceil(((Number(f.until)||0)-Date.now())/1000));
        err.textContent=cool>0?`Code 不正确。已冷却 ${cool} 秒。`:'Code 不正确。';
        err.classList.remove('hidden');input.value='';input.focus();return;
      }
      clearFailures();
      accessSession={
        id:record.id,role:record.role,label:record.label,
        scope:record.scope?JSON.parse(JSON.stringify(record.scope)):null
      };
      input.value='';
      showMode(record.role==='supervisor'?'hub':'employee');
    }catch(ex){
      err.textContent='这台浏览器无法验证 Access Code。';
      err.classList.remove('hidden');
    }finally{btn.disabled=false}
  }
  function logout(){
    accessSession=null;
    showMode('gate');
    setTimeout(()=>document.getElementById('cassolaGateCode')?.focus(),80);
  }

  function makeShells(){
    if(!document.getElementById('cassolaGate')){
      const gate=document.createElement('section');
      gate.id='cassolaGate';
      gate.setAttribute('aria-label','Cassola Access');
      gate.innerHTML='<div class="cassola-gate-shell"><div class="cassola-hub-mark">🗿</div><div class="cassola-hub-head"><div class="eyebrow">CASSOLA ACCESS</div><h1>进入 Cassola</h1><p>输入预先登记的 Access Code。不同 Code 会进入不同责任界面。</p></div><form id="cassolaGateForm" class="cassola-gate-card"><label>Access Code<input id="cassolaGateCode" type="password" inputmode="numeric" autocomplete="off" placeholder="••••••"></label><div id="cassolaGateError" class="cassola-access-error hidden"></div><button id="cassolaGateSubmit" type="submit" class="btn primary large">进入</button><small>Access Code 由 Supervisor 预先分配，员工设备不能自行创建管理员权限。</small></form><div class="cassola-hub-foot">Offline-first · Pre-registered roles · Scoped employee data</div></div>';
      document.body.appendChild(gate);
      gate.querySelector('form').addEventListener('submit',submitGate);
    }
    if(!document.getElementById('cassolaHub')){
      const hub=document.createElement('section');
      hub.id='cassolaHub';
      hub.setAttribute('aria-label','Cassola Supervisor 主菜单');
      hub.innerHTML='<div class="cassola-hub-shell"><div class="cassola-hub-mark">🗿</div><div class="cassola-hub-head"><div class="eyebrow">PIETRO 石器时代 ERP</div><h1>Cassola</h1><p>Supervisor 总账。员工责任区通过各自 Access Code 进入，不共享这个界面。</p></div><div id="cassolaAccessState" class="cassola-access-state"></div><div class="cassola-module-grid"><button class="cassola-module-card" data-cassola-open="inventory"><div><div class="cassola-module-icon">📦</div><h2>Inventory</h2><p>盘货、订货、收货、SKU、预警和历史。</p></div><div class="cassola-module-open"><span>Supervisor Inventory</span><span>›</span></div></button><button class="cassola-module-card" data-cassola-open="staff"><div><div class="cassola-module-icon">👥</div><h2>Staff</h2><p>人员、岗位、请假调休、发布与 PDF。</p></div><div class="cassola-module-open"><span>Supervisor Staff</span><span>›</span></div></button></div><div class="cassola-hub-foot">Supervisor · Full local ledger</div></div>';
      document.body.appendChild(hub);
    }
    if(!document.getElementById('cassolaEmployee')){
      const employee=document.createElement('section');
      employee.id='cassolaEmployee';
      employee.setAttribute('aria-label','Cassola Employee');
      document.body.appendChild(employee);
    }

    const invTop=document.querySelector('body > .topbar');
    if(invTop&&!document.getElementById('cassolaHomeInventory')){
      const btn=document.createElement('button');
      btn.id='cassolaHomeInventory';btn.className='cassola-home-btn';btn.type='button';btn.title='返回 Supervisor 主菜单';btn.setAttribute('aria-label','返回 Supervisor 主菜单');btn.textContent='⌂';
      const badge=document.getElementById('offlineBadge');invTop.insertBefore(btn,badge||null);
      btn.addEventListener('click',()=>showMode('hub'));
    }

    document.getElementById('cassolaHub').addEventListener('click',e=>{
      const open=e.target.closest('[data-cassola-open]');
      if(open&&isSupervisor())showMode(open.dataset.cassolaOpen);
      if(e.target.closest('[data-cassola-logout]'))logout();
    });
    document.getElementById('cassolaEmployee').addEventListener('input',e=>{
      if(e.target.matches('[data-employee-sku]'))saveEmployeeInput(e.target);
    });
    document.getElementById('cassolaEmployee').addEventListener('click',e=>{
      if(e.target.closest('[data-cassola-logout]')){logout();return}
      if(e.target.closest('[data-employee-clear]')){clearEmployeeDraft();return}
      if(e.target.closest('[data-employee-export]')){exportEmployeeCount();return}
    });
  }

  document.addEventListener('DOMContentLoaded',function(){
    accessSession=null;
    makeShells();
    showMode('gate');
    setTimeout(()=>document.getElementById('cassolaGateCode')?.focus(),80);
  });

  window.CassolaHub={
    show:function(){showMode(isSupervisor()?'hub':'gate')},
    openInventory:function(){if(isSupervisor())showMode('inventory');else showMode('gate')},
    openStaff:function(){if(isSupervisor())showMode('staff');else showMode('gate')},
    logout,
    session:function(){return accessSession?JSON.parse(JSON.stringify(accessSession)):null}
  };
})();

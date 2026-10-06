/* Cassola Hub · pre-registered role gate + scoped employee count */
(function(){
  const FAIL_KEY='cassola_access_fail_v02';
  const EMPLOYEE_DRAFT_PREFIX='cassola_employee_count_v01';
  let accessSession=null;
  let employeePanel='count';

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
      if(x&&x.date===todayKey()){
        if(!x.counts||typeof x.counts!=='object')x.counts={};
        if(!Array.isArray(x.events))x.events=[];
        return x;
      }
      return{version:2,date:todayKey(),counts:{},events:[],exportRevision:0};
    }catch(_){return{version:2,date:todayKey(),counts:{},events:[],exportRevision:0}}
  }
  function saveEmployeeDraft(x){
    if(!x.counts||typeof x.counts!=='object')x.counts={};
    if(!Array.isArray(x.events))x.events=[];
    x.version=2;
    localStorage.setItem(draftKey(),JSON.stringify(x));
  }
  function employeeEventsForSku(id){
    return loadEmployeeDraft().events.filter(e=>String(e.skuId)===String(id));
  }
  function addEmployeeEvent(event){
    if(!isEmployee())return null;
    const draft=loadEmployeeDraft();
    const row={...event,id:event.id||crypto.randomUUID?.()||String(Date.now()+Math.random()),recordedAt:event.recordedAt||new Date().toISOString()};
    draft.events.push(row);saveEmployeeDraft(draft);return row;
  }
  function removeEmployeeEvent(id){
    if(!isEmployee())return false;
    const draft=loadEmployeeDraft(),before=draft.events.length;
    draft.events=draft.events.filter(e=>String(e.id)!==String(id));
    saveEmployeeDraft(draft);return draft.events.length!==before;
  }
  function scopeSkus(scope){
    const cloudRows=window.CassolaCloud?.employeeCatalog?.(accessSession?.id);
    let rows=isEmployee()&&Array.isArray(cloudRows)
      ?cloudRows
      :(typeof v3Skus==='function'?v3Skus():((typeof state!=='undefined'&&Array.isArray(state.skus))?state.skus:[]));
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
  function receiptDraftKey(taskId){
    const cred=accessSession?.id||'none';
    return `cassola_employee_receipt_v01:${cred}:${String(taskId||'none')}`;
  }
  function loadReceiptDraft(task){
    try{
      const x=JSON.parse(localStorage.getItem(receiptDraftKey(task?.task_id))||'null');
      return x&&x.taskId===task?.task_id?x:{version:1,taskId:task?.task_id,lines:{}};
    }catch(_){return{version:1,taskId:task?.task_id,lines:{}}}
  }
  function saveReceiptDraft(task,draft){
    draft.version=1;draft.taskId=task.task_id;draft.lines=draft.lines||{};
    localStorage.setItem(receiptDraftKey(task.task_id),JSON.stringify(draft));
  }
  function receiptRemainingOrder(line){
    const factor=Number(line?.unitsPerOrder)>0?Number(line.unitsPerOrder):1;
    return Math.max(0,((Number(line?.orderedQty)||0)-(Number(line?.creditedQty)||0))/factor);
  }
  function employeeReceiptTasks(){
    return window.CassolaCloud?.employeeReceiptTasks?.(accessSession?.id)||[];
  }
  function employeeReceiptStatusMeta(status){
    return {
      received:['✅','收齐'],later:['🕒','晚到'],other:['👥','待他人'],
      out:['❌','缺货'],short:['⬇️','少到'],over:['⬆️','多到']
    }[status]||['·','未选择'];
  }
  function employeeCountPanelHtml(rows,draft,filled,queued){
    return '<div class="cassola-employee-summary"><div><span>责任区 SKU</span><b>'+rows.length+'</b></div><div><span>今日已填</span><b id="cassolaEmployeeFilled">'+filled+'/'+rows.length+'</b></div></div>'+
      '<div class="cassola-employee-note">数量可以离线填写。报损 / 熟化转化在“查看详情”记录，会和今日盘货一起交给 Supervisor；规格 / 单位异常仍走提议审核。</div>'+
      '<div class="cassola-employee-counts">'+
      (rows.length?rows.map(s=>{
        const v=draft.counts?.[s.id],eventCount=employeeEventsForSku(s.id).length;
        return '<div class="cassola-employee-row"><div class="cassola-employee-copy"><strong>'+escapeHtml(s.name||'SKU')+'</strong><small>'+escapeHtml(s.spec||'无规格')+' · '+escapeHtml(s.unit||'')+'</small><button type="button" class="cassola-employee-detail" data-employee-detail="'+escapeHtml(s.id)+'">查看详情'+(eventCount?' · 变动 '+eventCount:'')+'</button></div><div class="cassola-employee-input"><input data-employee-sku="'+escapeHtml(s.id)+'" type="text" inputmode="decimal" autocomplete="off" placeholder="—" value="'+(v===undefined||v===null?'':escapeHtml(String(v)))+'"><span>'+escapeHtml(s.unit||'')+'</span></div></div>';
      }).join(''):'<div class="empty">这个责任区没有可盘 SKU。</div>')+
      '</div>'+
      '<div class="cassola-employee-foot">'+(queued?('📵 本机还有 '+queued+' 份待发送 · 点底部“待'+queued+'”手动提交'):'联网优先直接提交 Cloud · JSON 仍保留作离线 / 灾难恢复备用')+'</div>'+
      '<div class="cassola-employee-upload-dock">'+
        '<button type="button" class="btn secondary employee-dock-btn" data-employee-clear><span>🧹</span><small>清空</small></button>'+
        '<button type="button" class="btn secondary employee-dock-btn" data-employee-new-sku><span>＋</span><small>新 SKU</small></button>'+
        '<div class="cassola-employee-dock-cell"><button type="button" class="btn primary employee-dock-btn employee-dock-upload" data-employee-cloud><span>☁️</span><small>上传</small></button>'+(queued?'<button type="button" class="employee-outbox-badge" data-employee-outbox aria-label="上传待发送 '+queued+'">待'+queued+'</button>':'')+'</div>'+
        '<button type="button" class="btn secondary employee-dock-btn" data-employee-export><span>📄</span><small>JSON</small></button>'+
      '</div>';
  }
  function employeeReceiptTaskHtml(task){
    const lines=Array.isArray(task.order_snapshot?.items)?task.order_snapshot.items:[],draft=loadReceiptDraft(task);
    const queued=window.CassolaCloud?.employeeReceiptQueued?.(task.task_id,accessSession?.id);
    return '<article class="cassola-employee-receipt-task" data-employee-receipt-task="'+escapeHtml(task.task_id)+'">'+
      '<div class="cassola-employee-receipt-head"><div><span class="eyebrow">AUTHORIZED RECEIVING</span><h2>🚚 '+escapeHtml(task.supplier||'收货任务')+'</h2><small>Supervisor 授权 · '+escapeHtml(new Date(task.authorized_at).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))+'</small></div><span class="cassola-role-pill">'+(queued?'📵 待发送':'👷 已授权')+'</span></div>'+
      '<div class="cassola-employee-note">只记录这次现场实际收到的货。提交后不会直接入库，仍要 Supervisor 确认。</div>'+
      '<div class="cassola-employee-receipt-lines">'+lines.map(line=>{
        const d=draft.lines?.[line.skuId]||{},remaining=receiptRemainingOrder(line),factor=Number(line.unitsPerOrder)>0?Number(line.unitsPerOrder):1;
        const pack=(factor!==1||String(line.orderUnit||line.unit||'')!==String(line.unit||''))?(' · 1'+escapeHtml(line.orderUnit||line.unit||'')+' = '+escapeHtml(String(factor))+escapeHtml(line.unit||'')):'';
        const meta=employeeReceiptStatusMeta(d.status);
        return '<div class="cassola-employee-receipt-line" data-receipt-line="'+escapeHtml(line.skuId)+'">'+
          '<div class="cassola-employee-receipt-line-head"><div><strong>'+escapeHtml(line.skuName||line.skuId)+'</strong><small>'+escapeHtml(line.spec||'无规格')+pack+'</small></div><b>待收 '+escapeHtml(String(remaining))+' '+escapeHtml(line.orderUnit||line.unit||'')+'</b></div>'+
          '<div class="cassola-employee-receipt-qty"><label>本次到货<input type="text" inputmode="decimal" autocomplete="off" data-employee-receipt-qty="'+escapeHtml(line.skuId)+'" data-task-id="'+escapeHtml(task.task_id)+'" value="'+escapeHtml(d.qty??'')+'" placeholder="0"></label><span>'+escapeHtml(line.orderUnit||line.unit||'')+'</span></div>'+
          '<div class="cassola-employee-receipt-status">'+['received','later','other','out','short','over'].map(st=>{const m=employeeReceiptStatusMeta(st);return '<button type="button" class="'+(d.status===st?'active':'')+'" data-employee-receipt-status="'+st+'" data-task-id="'+escapeHtml(task.task_id)+'" data-sku-id="'+escapeHtml(line.skuId)+'">'+m[0]+' '+m[1]+'</button>'}).join('')+'</div>'+
          '<label class="cassola-employee-receipt-note">备注<input type="text" maxlength="300" data-employee-receipt-note="'+escapeHtml(line.skuId)+'" data-task-id="'+escapeHtml(task.task_id)+'" value="'+escapeHtml(d.note||'')+'" placeholder="可空"></label>'+
          '<div class="cassola-employee-receipt-current">'+meta[0]+' '+meta[1]+'</div>'+
        '</div>';
      }).join('')+'</div>'+
      '<button type="button" class="btn primary large cassola-employee-receipt-submit" data-employee-receipt-submit="'+escapeHtml(task.task_id)+'" '+(queued?'disabled':'')+'>'+(queued?'📵 已保存待发送':'📤 提交本次收货')+'</button>'+
    '</article>';
  }
  function employeeReceiptPanelHtml(tasks){
    if(!tasks.length)return '<div class="cassola-employee-no-task"><span>🚚</span><h2>无任务</h2><p>只有 Supervisor 明确“授权员工收货”后，这里才会出现订单。</p></div>';
    return '<div class="cassola-employee-receipt-summary"><span>当前授权</span><b>'+tasks.length+' 个收货任务</b></div>'+tasks.map(employeeReceiptTaskHtml).join('');
  }
  function renderEmployee(){
    const box=document.getElementById('cassolaEmployee');if(!box||!isEmployee())return;
    const scope=accessSession.scope||{},rows=scopeSkus(scope),draft=loadEmployeeDraft();
    const filled=rows.filter(s=>draft.counts?.[s.id]!==undefined&&draft.counts?.[s.id]!==null&&draft.counts?.[s.id]!=='').length;
    const cached=window.CassolaCloud?.cachedIdentity?.(accessSession.id);
    const responsible=accessSession.displayName||cached?.displayName||'责任区员工';
    const queued=window.CassolaCloud?.outboxCount?.(accessSession.id)||0,tasks=employeeReceiptTasks();
    const receiptMode=employeePanel==='receipt';
    box.innerHTML='<div class="cassola-employee-shell '+(receiptMode?'receipt-mode':'count-mode')+'">'+
      '<div class="cassola-employee-top"><button type="button" class="cassola-home-btn" data-cassola-logout>⌂</button><div><div class="eyebrow">EMPLOYEE MODE</div><h1>'+escapeHtml(scope.label||'责任区盘货')+'</h1><p><b>负责人：'+escapeHtml(responsible)+'</b> · '+todayKey()+'</p></div><span class="cassola-role-pill">👷 员工</span></div>'+
      '<div class="cassola-employee-mode-tabs"><button type="button" data-employee-panel="count" class="'+(!receiptMode?'active':'')+'">📋 盘货</button><button type="button" data-employee-panel="receipt" class="'+(receiptMode?'active':'')+'">🚚 收货'+(tasks.length?' <b>'+tasks.length+'</b>':'')+'</button></div>'+
      (receiptMode?employeeReceiptPanelHtml(tasks):employeeCountPanelHtml(rows,draft,filled,queued))+
      '</div>';
    window.CassolaEmployeeTools?.enhance?.();
  }
  function parseEmployeeQty(raw){
    if(typeof parseLocaleDecimal==='function')return parseLocaleDecimal(raw);
    const n=Number(String(raw??'').trim().replace(',','.'));return Number.isFinite(n)?n:NaN;
  }
  function receiptTaskById(taskId){return employeeReceiptTasks().find(t=>String(t.task_id)===String(taskId))||null}
  function saveEmployeeReceiptField(input,kind){
    const task=receiptTaskById(input.dataset.taskId);if(!task)return;
    const skuId=kind==='qty'?input.dataset.employeeReceiptQty:input.dataset.employeeReceiptNote,draft=loadReceiptDraft(task);
    draft.lines=draft.lines||{};draft.lines[skuId]=draft.lines[skuId]||{};
    if(kind==='qty')draft.lines[skuId].qty=input.value.trim();
    else draft.lines[skuId].note=input.value.trim();
    saveReceiptDraft(task,draft);
  }
  function setEmployeeReceiptStatus(taskId,skuId,status){
    const task=receiptTaskById(taskId);if(!task)return;
    const line=(task.order_snapshot?.items||[]).find(x=>String(x.skuId)===String(skuId));if(!line)return;
    const draft=loadReceiptDraft(task);draft.lines=draft.lines||{};const row=draft.lines[skuId]||{};
    row.status=status;
    if(status==='received')row.qty=String(receiptRemainingOrder(line));
    else if(status==='out'||status==='other')row.qty='0';
    else if(status==='later'&&(row.qty===undefined||row.qty===''))row.qty='0';
    draft.lines[skuId]=row;saveReceiptDraft(task,draft);renderEmployee();
  }
  function buildEmployeeReceiptPayload(task){
    if(!task)return null;
    const draft=loadReceiptDraft(task),lines=Array.isArray(task.order_snapshot?.items)?task.order_snapshot.items:[],out=[];
    for(const line of lines){
      const d=draft.lines?.[line.skuId]||{},status=String(d.status||''),remaining=receiptRemainingOrder(line);
      if(!['received','later','other','out','short','over'].includes(status)){showToast((line.skuName||'SKU')+' 还没选择收货结果');return null}
      const qty=parseEmployeeQty(d.qty??'');
      if(!Number.isFinite(qty)||qty<0){showToast((line.skuName||'SKU')+' 的到货数量不对');return null}
      const eps=.000001;
      if(status==='received'&&Math.abs(qty-remaining)>eps){showToast((line.skuName||'SKU')+' 点“收齐”时数量必须等于待收数量');return null}
      if((status==='out'||status==='other')&&qty>eps){showToast((line.skuName||'SKU')+' 的“缺货 / 待他人”本次数量应为 0');return null}
      if(status==='short'&&!(qty>eps&&qty<remaining-eps)){showToast((line.skuName||'SKU')+' 的“少到”数量要在 0 和待收量之间');return null}
      if(status==='over'&&!(qty>remaining+eps)){showToast((line.skuName||'SKU')+' 的“多到”数量要大于待收量');return null}
      if(status==='later'&&!(qty>=0&&qty<remaining-eps)){showToast((line.skuName||'SKU')+' 已经到齐时不要选“晚到”');return null}
      out.push({skuId:line.skuId,status,receivedOrderQty:qty,note:String(d.note||'').slice(0,300)});
    }
    return{
      format:'cassola-employee-receipt-v1',
      submissionId:crypto.randomUUID?.()||String(Date.now()+Math.random()),
      taskId:task.task_id,orderId:task.order_id,supplier:task.supplier||'',credentialId:accessSession.id,
      submittedAt:new Date().toISOString(),lines:out
    };
  }
  async function submitEmployeeReceiptTask(taskId){
    const task=receiptTaskById(taskId);if(!task)return;
    if(window.CassolaCloud?.employeeReceiptQueued?.(taskId,accessSession.id)){showToast('这份收货已经在待发送队列里');return}
    const payload=buildEmployeeReceiptPayload(task);if(!payload)return;
    if(!window.CassolaCloud?.connected?.()){
      window.CassolaCloud?.queueEmployeeReceipt?.(taskId,payload);
      showToast('📵 收货已保存到待发送队列');renderEmployee();return;
    }
    try{
      await window.CassolaCloud.submitEmployeeReceipt(taskId,payload);
      localStorage.removeItem(receiptDraftKey(taskId));
      showToast('🚚 收货事实已提交给 Supervisor');
      renderEmployee();
    }catch(err){
      if(!navigator.onLine||!err?.status||err.status>=500){
        window.CassolaCloud?.queueEmployeeReceipt?.(taskId,payload);
        showToast('📵 Cloud 没接住，收货已保存待发送');renderEmployee();return;
      }
      alert('提交收货失败：'+(err?.data?.detail||err?.message||'未知错误'));
    }
  }
  async function switchEmployeePanel(mode){
    employeePanel=mode==='receipt'?'receipt':'count';
    if(employeePanel==='receipt'&&window.CassolaCloud?.connected?.()){
      await window.CassolaCloud.refreshStatus?.({silent:true}).catch(()=>{});
    }
    renderEmployee();
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
    if(!confirm('清空今天已经填写的盘货数字和报损 / 转化记录？'))return;
    localStorage.removeItem(draftKey());
    renderEmployee();
  }
  function buildEmployeePayload(){
    if(!isEmployee())return null;
    const scope=accessSession.scope||{},rows=scopeSkus(scope),draft=loadEmployeeDraft(),filled=[];
    rows.forEach(s=>{
      const v=draft.counts?.[s.id];
      if(v===undefined||v===null||v==='')return;
      const n=Number(v);if(!Number.isFinite(n)||n<0)return;
      filled.push({skuId:s.id,name:s.name,qty:n,unit:s.unit||'',spec:s.spec||''});
    });
    if(!filled.length){if(typeof showToast==='function')showToast('还没有填写盘货数量');return null}
    const missing=rows.length-filled.length;
    if(missing>0){if(typeof showToast==='function')showToast(`还有 ${missing} 个责任区 SKU 没盘，先盘完再上传`);return null}
    draft.exportRevision=(Number(draft.exportRevision)||0)+1;
    draft.lastExportedAt=new Date().toISOString();
    saveEmployeeDraft(draft);
    return{
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
      scopeSkuIds:rows.map(s=>s.id),
      counts:filled,
      events:(draft.events||[]).map(e=>({
        id:String(e.id||''),
        type:String(e.type||''),
        skuId:String(e.skuId||''),
        qty:Number(e.qty),
        targetId:e.targetId?String(e.targetId):null,
        note:String(e.note||'').slice(0,300),
        recordedAt:e.recordedAt||draft.lastExportedAt
      }))
    };
  }
  function exportEmployeeCount(){
    const payload=buildEmployeePayload();if(!payload)return;
    const scope=accessSession.scope||{};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    const hh=String(new Date().getHours()).padStart(2,'0'),mm=String(new Date().getMinutes()).padStart(2,'0');
    a.download=`cassola-count-${scope.id||'scope'}-${todayKey()}-${hh}${mm}.json`;
    a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    if(typeof showToast==='function')showToast('JSON 备用盘货包已生成');
    renderEmployee();
  }
  async function uploadEmployeeCount(){
    const payload=buildEmployeePayload();if(!payload)return;
    if(!window.CassolaCloud?.connected?.()){
      window.CassolaCloud?.queueEmployeeSubmission?.(payload);
      if(typeof showToast==='function')showToast('📵 已保存到待发送队列');
      renderEmployee();
      return;
    }
    try{
      await window.CassolaCloud.submitEmployee(payload);
      const draft=loadEmployeeDraft();
      draft.lastCloudSubmissionId=payload.submissionId;
      draft.lastCloudSubmittedAt=payload.submittedAt;
      saveEmployeeDraft(draft);
      renderEmployee();
    }catch(err){
      if(!navigator.onLine||!err?.status||err?.status>=500){
        window.CassolaCloud?.queueEmployeeSubmission?.(payload);
        if(typeof showToast==='function')showToast('📵 Cloud 没接住，已保存待发送');
        renderEmployee();
        return;
      }
      alert('上传 Cloud 失败：'+(err?.data?.detail||err?.message||'未知错误')+'\n\n盘货草稿还在本机，可以稍后重试或导出 JSON。');
    }
  }
  async function flushEmployeeOutbox(){
    if(!window.CassolaCloud?.connected?.()){
      if(typeof showToast==='function')showToast(navigator.onLine?'Cloud 正在重连':'现在仍然没网');
      return;
    }
    const result=await window.CassolaCloud.flushOutbox();
    if(typeof showToast==='function'){
      const parts=['已发 '+result.sent];
      if(result.expired)parts.push('失效 '+result.expired);
      if(result.failed)parts.push('失败 '+result.failed);
      showToast((result.failed||result.expired?'📤 ':'☁️ ')+parts.join(' · '));
    }
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
      window.CassolaCloud?.rememberAccessCode?.(code);
      const cachedIdentity=window.CassolaCloud?.cachedIdentity?.(record.id);
      let cloudConnected=false,cloudRecord=null;
      if(navigator.onLine&&window.CassolaCloud?.login){
        try{
          cloudRecord=await window.CassolaCloud.login(code);
          cloudConnected=!!cloudRecord&&cloudRecord.id===record.id;
        }catch(cloudErr){
          console.warn('Cassola Cloud login unavailable',cloudErr);
        }
      }
      accessSession={
        id:record.id,role:record.role,label:record.label,
        displayName:cloudRecord?.displayName||cachedIdentity?.displayName||null,
        scope:record.scope?JSON.parse(JSON.stringify(record.scope)):null,
        cloudConnected
      };
      input.value='';
      showMode(record.role==='supervisor'?'hub':'employee');
      if(!cloudConnected&&navigator.onLine&&typeof showToast==='function')showToast('已进入本地模式 · Cloud 暂未连接');
    }catch(ex){
      err.textContent='这台浏览器无法验证 Access Code。';
      err.classList.remove('hidden');
    }finally{btn.disabled=false}
  }
  function logout(){
    window.CassolaCloud?.logout?.().catch?.(()=>{});
    accessSession=null;employeePanel='count';
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
      else if(e.target.matches('[data-employee-receipt-qty]'))saveEmployeeReceiptField(e.target,'qty');
      else if(e.target.matches('[data-employee-receipt-note]'))saveEmployeeReceiptField(e.target,'note');
    });
    document.getElementById('cassolaEmployee').addEventListener('click',e=>{
      if(e.target.closest('[data-cassola-logout]')){logout();return}
      const panel=e.target.closest('[data-employee-panel]');if(panel){switchEmployeePanel(panel.dataset.employeePanel);return}
      const receiptStatus=e.target.closest('[data-employee-receipt-status]');if(receiptStatus){setEmployeeReceiptStatus(receiptStatus.dataset.taskId,receiptStatus.dataset.skuId,receiptStatus.dataset.employeeReceiptStatus);return}
      const receiptSubmit=e.target.closest('[data-employee-receipt-submit]');if(receiptSubmit){submitEmployeeReceiptTask(receiptSubmit.dataset.employeeReceiptSubmit);return}
      if(e.target.closest('[data-employee-clear]')){clearEmployeeDraft();return}
      if(e.target.closest('[data-employee-cloud]')){uploadEmployeeCount();return}
      if(e.target.closest('[data-employee-outbox]')){flushEmployeeOutbox();return}
      if(e.target.closest('[data-employee-export]')){exportEmployeeCount();return}
    });
  }

  window.addEventListener('cassola-cloud-reconnected',()=>{
    if(!isEmployee())return;
    const c=window.CassolaCloud?.session?.();
    if(c?.displayName)accessSession.displayName=c.displayName;
    accessSession.cloudConnected=!!c;
    renderEmployee();
  });
  window.addEventListener('cassola-cloud-outbox-change',()=>{if(isEmployee())renderEmployee()});
  window.addEventListener('cassola-cloud-employee-tasks-change',()=>{if(isEmployee())renderEmployee()});

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
    session:function(){return accessSession?JSON.parse(JSON.stringify(accessSession)):null},
    employeeDraft:function(){return isEmployee()?JSON.parse(JSON.stringify(loadEmployeeDraft())):null},
    employeeEventsForSku:function(id){return isEmployee()?JSON.parse(JSON.stringify(employeeEventsForSku(id))):[]},
    addEmployeeEvent,
    removeEmployeeEvent,
    refreshEmployee:function(){if(isEmployee())renderEmployee()}
  };
})();

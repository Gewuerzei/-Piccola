/* Cassola Cloud v0.1 · manual cloud sync + lineage + checkpoints + employee inbox */
(function(){
  const API='https://ktdgxaxkuqwrdqttcajt.supabase.co/functions/v1/cassola-cloud';
  const META_KEY='cassola_cloud_meta_v01';
  const DEVICE_KEY='cassola_cloud_device_v01';
  const IDENTITY_KEY='cassola_cloud_identity_v01';
  const OUTBOX_KEY='cassola_cloud_outbox_v01';
  const EMPLOYEE_CATALOG_KEY='cassola_employee_catalog_v01';
  const EMPLOYEE_RECEIPT_TASK_KEY='cassola_employee_receipt_tasks_v01';
  const EMPLOYEE_INVENTORY_TASK_KEY='cassola_employee_inventory_tasks_v01';
  const STAFF_SCOPE={id:'staff',label:'👥 Staff'};
  const SCOPES=[
    {id:'sushi',label:'🍣 Sushi'},
    {id:'cucina',label:'🔪 Cucina'},
    {id:'bar',label:'🍸 Bar / Sala'},
    {id:'common',label:'📦 Comune'}
  ];
  let token=null,credential=null,lastStatus=null,lastNoticeSig='',refreshTimer=null,employeeCatalog=null,employeeReceiptTasks=null,employeeInventoryTasks=null,reconnectCode=null;

  const clone=v=>JSON.parse(JSON.stringify(v));
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const scopeLabel=id=>([...SCOPES,STAFF_SCOPE].find(x=>x.id===id)?.label||id);
  const areaOf=s=>String(s?.area||'sushi');

  function deviceId(){
    let id=localStorage.getItem(DEVICE_KEY);
    if(!id){id=crypto.randomUUID?.()||('device-'+Date.now()+'-'+Math.random().toString(36).slice(2));localStorage.setItem(DEVICE_KEY,id)}
    return id;
  }
  function readIdentityCache(){
    try{return JSON.parse(localStorage.getItem(IDENTITY_KEY)||'{}')||{}}catch(_){return{}}
  }
  function cachedIdentity(id){
    const row=readIdentityCache()[String(id||'')];
    return row&&typeof row==='object'?clone(row):null;
  }
  function cacheIdentity(row){
    if(!row?.id)return;
    const all=readIdentityCache();
    all[row.id]={id:row.id,displayName:row.displayName||null,label:row.label||'',role:row.role||'',staffPersonId:row.staffPersonId||null,updatedAt:new Date().toISOString()};
    localStorage.setItem(IDENTITY_KEY,JSON.stringify(all));
  }
  function readCatalogCache(){
    try{return JSON.parse(localStorage.getItem(EMPLOYEE_CATALOG_KEY)||'{}')||{}}catch(_){return{}}
  }
  function cacheEmployeeCatalog(credentialId,rows){
    const id=String(credentialId||'');if(!id||!Array.isArray(rows))return;
    const all=readCatalogCache();all[id]={updatedAt:new Date().toISOString(),rows:clone(rows)};
    localStorage.setItem(EMPLOYEE_CATALOG_KEY,JSON.stringify(all));
  }
  function cachedEmployeeCatalog(credentialId){
    const row=readCatalogCache()[String(credentialId||'')];
    return Array.isArray(row?.rows)?clone(row.rows):null;
  }
  function readReceiptTaskCache(){
    try{return JSON.parse(localStorage.getItem(EMPLOYEE_RECEIPT_TASK_KEY)||'{}')||{}}catch(_){return{}}
  }
  function cacheEmployeeReceiptTasks(credentialId,rows){
    const id=String(credentialId||'');if(!id||!Array.isArray(rows))return;
    const all=readReceiptTaskCache();all[id]={updatedAt:new Date().toISOString(),rows:clone(rows)};
    localStorage.setItem(EMPLOYEE_RECEIPT_TASK_KEY,JSON.stringify(all));
  }
  function cachedEmployeeReceiptTasks(credentialId){
    const row=readReceiptTaskCache()[String(credentialId||'')];
    return Array.isArray(row?.rows)?clone(row.rows):[];
  }
  function readInventoryTaskCache(){
    try{return JSON.parse(localStorage.getItem(EMPLOYEE_INVENTORY_TASK_KEY)||'{}')||{}}catch(_){return{}}
  }
  function cacheEmployeeInventoryTasks(credentialId,rows){
    const id=String(credentialId||'');if(!id||!Array.isArray(rows))return;
    const all=readInventoryTaskCache();all[id]={updatedAt:new Date().toISOString(),rows:clone(rows)};
    localStorage.setItem(EMPLOYEE_INVENTORY_TASK_KEY,JSON.stringify(all));
  }
  function cachedEmployeeInventoryTasks(credentialId){
    const row=readInventoryTaskCache()[String(credentialId||'')];
    return Array.isArray(row?.rows)?clone(row.rows):[];
  }
  function readOutbox(){
    try{const x=JSON.parse(localStorage.getItem(OUTBOX_KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}
  }
  function writeOutbox(rows){localStorage.setItem(OUTBOX_KEY,JSON.stringify(rows))}
  function outboxCount(credentialId){
    const id=String(credentialId||credential?.id||'');
    return readOutbox().filter(x=>!id||x.credentialId===id).length;
  }
  function queueOutbox(type,payload,credentialId){
    const id=String(credentialId||payload?.credentialId||credential?.id||'');
    if(!id)throw new Error('credential_required');
    let rows=readOutbox();
    if(type==='employee_submission'){
      rows=rows.filter(x=>!(x.type===type&&x.credentialId===id&&x.payload?.effectiveKey===payload?.effectiveKey));
    }
    if(type==='sku_proposal'&&payload?.proposalId){
      rows=rows.filter(x=>!(x.type===type&&x.credentialId===id&&x.payload?.proposalId===payload.proposalId));
    }
    if(type==='employee_receipt'&&payload?.taskId){
      rows=rows.filter(x=>!(x.type===type&&x.credentialId===id&&x.payload?.taskId===payload.taskId));
    }
    rows.push({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),type,credentialId:id,payload:clone(payload),queuedAt:new Date().toISOString()});
    writeOutbox(rows);
    window.dispatchEvent(new CustomEvent('cassola-cloud-outbox-change',{detail:{count:outboxCount(id)}}));
    return rows[rows.length-1];
  }
  function queueEmployeeSubmission(payload){return queueOutbox('employee_submission',payload,payload?.credentialId)}
  function queueSkuProposal(payload,credentialId){
    const id=credentialId||credential?.id||window.CassolaHub?.session?.()?.id;
    return queueOutbox('sku_proposal',payload,id);
  }
  function queueEmployeeReceipt(taskId,payload){
    const id=payload?.credentialId||credential?.id||window.CassolaHub?.session?.()?.id;
    return queueOutbox('employee_receipt',{taskId,payload},id);
  }
  function employeeReceiptQueued(taskId,credentialId){
    const id=String(credentialId||credential?.id||'');
    return readOutbox().some(x=>x.type==='employee_receipt'&&(!id||x.credentialId===id)&&String(x.payload?.taskId||'')===String(taskId||''));
  }

  function readMeta(){
    try{
      const x=JSON.parse(localStorage.getItem(META_KEY)||'null')||{};
      x.version=1;x.deviceId=x.deviceId||deviceId();x.scopes=x.scopes||{};
      return x;
    }catch(_){return{version:1,deviceId:deviceId(),scopes:{}}}
  }
  function writeMeta(x){localStorage.setItem(META_KEY,JSON.stringify(x))}
  function mutateMeta(fn){const m=readMeta();fn(m);writeMeta(m);return m}
  function bases(){
    const m=readMeta(),out={};
    [...SCOPES,STAFF_SCOPE].forEach(s=>{const id=m.scopes?.[s.id]?.baseVersionId;if(id)out[s.id]=id});
    return out;
  }
  function stable(v){
    if(v===null||typeof v!=='object')return JSON.stringify(v);
    if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
    return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  }
  function fingerprint(v){
    const str=stable(v);let h=2166136261;
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function mapById(rows,key='id'){
    const out={};(rows||[]).forEach(x=>{const id=x?.[key];if(id!=null)out[String(id)]=clone(x)});return out;
  }
  function itemArea(item){
    if(item?.area)return String(item.area);
    const s=(state.skus||[]).find(x=>x.id===item?.skuId);
    return areaOf(s);
  }
  function lineClosed(i){return !['pending','later','other'].includes(String(i?.lineStatus||'pending'))}
  function captureStaffScope(){
    try{
      const raw=JSON.parse(localStorage.getItem('cassola_staff_v01')||'{}')||{};
      return{
        schemaVersion:1,scopeId:'staff',
        people:Array.isArray(raw.people)?clone(raw.people):[],
        roles:Array.isArray(raw.roles)?clone(raw.roles):[],
        schedules:raw.schedules&&typeof raw.schedules==='object'?clone(raw.schedules):{},
        attendance:raw.attendance&&typeof raw.attendance==='object'?clone(raw.attendance):{},
        swaps:Array.isArray(raw.swaps)?clone(raw.swaps):[],
        restMoves:Array.isArray(raw.restMoves)?clone(raw.restMoves):[],
        weekPublications:raw.weekPublications&&typeof raw.weekPublications==='object'?clone(raw.weekPublications):{},
        history:Array.isArray(raw.history)?clone(raw.history):[]
      };
    }catch(_){return{schemaVersion:1,scopeId:'staff',people:[],roles:[],schedules:{},attendance:{},swaps:[],restMoves:[],weekPublications:{},history:[]}}
  }

  function captureScope(scopeId){
    if(scopeId==='staff')return captureStaffScope();
    const allSkus=Array.isArray(state.skus)?state.skus:[];
    const skus=allSkus.filter(s=>areaOf(s)===scopeId);
    const ids=new Set(skus.map(s=>String(s.id)));
    const hidden={};
    (state.hiddenSkuIds||[]).forEach(id=>{if(ids.has(String(id)))hidden[String(id)]=true});
    const order={};
    Object.entries(state.order||{}).forEach(([id,v])=>{if(ids.has(String(id)))order[id]=v});
    const history={};
    (state.history||[]).forEach(h=>{
      if(ids.has(String(h.skuId||''))||ids.has(String(h.targetId||'')))history[String(h.id)]=clone(h);
    });
    const prices={};
    (state.priceRecords||[]).forEach(r=>{if(ids.has(String(r.skuId||'')))prices[String(r.id)]=clone(r)});
    const placedOrders={};
    (state.placedOrders||[]).forEach(o=>{
      const items=(o.items||[]).filter(i=>itemArea(i)===scopeId);
      if(!items.length)return;
      const batches={};
      (o.receiptBatches||[]).forEach(b=>{
        const lines=(b.lines||[]).filter(l=>ids.has(String(l.skuId||''))||items.some(i=>i.skuId===l.skuId));
        if(!lines.length)return;
        const bc=clone(b);bc.lines=mapById(lines,'skuId');batches[String(b.id)]=bc;
      });
      const oc=clone(o);
      oc.items=mapById(items,'skuId');
      oc.receiptBatches=batches;
      oc.status=items.every(lineClosed)?'received':'open';
      oc.partial=items.some(i=>['short','over','out'].includes(String(i.lineStatus)));
      placedOrders[String(o.id)]=oc;
    });
    return{
      schemaVersion:1,scopeId,
      skus:mapById(skus),
      hiddenSkuIds:hidden,
      order,
      history,
      priceRecords:prices,
      placedOrders
    };
  }
  function scopeFingerprint(scopeId){return fingerprint(captureScope(scopeId))}

  function partialOrderToArrays(po){
    const o=clone(po);
    o.items=Object.values(po?.items||{}).map(clone);
    o.receiptBatches=Object.values(po?.receiptBatches||{}).map(b=>{
      const x=clone(b);x.lines=Object.values(b?.lines||{}).map(clone);return x;
    });
    return o;
  }
  function mergeScope(scopeId,cloud){
    if(!cloud||typeof cloud!=='object')throw new Error('cloud_scope_state_invalid');
    if(scopeId==='staff'){
      if(!window.CassolaStaff?.applyCloudState)throw new Error('staff_module_not_ready');
      window.CassolaStaff.applyCloudState(cloud);
      return;
    }
    const beforeSkus=Array.isArray(state.skus)?state.skus:[];
    const previousIds=new Set(beforeSkus.filter(s=>areaOf(s)===scopeId).map(s=>String(s.id)));
    const incomingSkus=Object.values(cloud.skus||{}).map(clone);
    const incomingIds=new Set(incomingSkus.map(s=>String(s.id)));
    const affectedIds=new Set([...previousIds,...incomingIds]);

    state.skus=beforeSkus.filter(s=>!previousIds.has(String(s.id))&&!incomingIds.has(String(s.id))).concat(incomingSkus);

    const preservedHidden=(state.hiddenSkuIds||[]).filter(id=>!affectedIds.has(String(id)));
    const cloudHidden=Object.keys(cloud.hiddenSkuIds||{}).filter(id=>cloud.hiddenSkuIds[id]);
    state.hiddenSkuIds=[...new Set([...preservedHidden,...cloudHidden])];

    const nextOrder={...state.order};
    affectedIds.forEach(id=>delete nextOrder[id]);
    Object.entries(cloud.order||{}).forEach(([id,v])=>{nextOrder[id]=v});
    state.order=nextOrder;

    const historyMap=new Map();
    (state.history||[]).forEach(h=>{
      if(affectedIds.has(String(h.skuId||''))||affectedIds.has(String(h.targetId||'')))return;
      historyMap.set(String(h.id),h);
    });
    Object.values(cloud.history||{}).forEach(h=>historyMap.set(String(h.id),clone(h)));
    state.history=[...historyMap.values()].sort((a,b)=>new Date(a.at||0)-new Date(b.at||0));

    const priceMap=new Map();
    (state.priceRecords||[]).forEach(r=>{if(!affectedIds.has(String(r.skuId||'')))priceMap.set(String(r.id),r)});
    Object.values(cloud.priceRecords||{}).forEach(r=>priceMap.set(String(r.id),clone(r)));
    state.priceRecords=[...priceMap.values()];

    const orderMap=new Map();
    (state.placedOrders||[]).forEach(o=>{
      const oc=clone(o);
      oc.items=(oc.items||[]).filter(i=>itemArea(i)!==scopeId&&!affectedIds.has(String(i.skuId||'')));
      oc.receiptBatches=(oc.receiptBatches||[]).map(b=>{
        const bc=clone(b);
        bc.lines=(bc.lines||[]).filter(l=>!affectedIds.has(String(l.skuId||'')));
        return bc;
      }).filter(b=>(b.lines||[]).length);
      if(oc.items.length)orderMap.set(String(oc.id),oc);
    });

    Object.values(cloud.placedOrders||{}).forEach(raw=>{
      const incoming=partialOrderToArrays(raw),id=String(incoming.id);
      let target=orderMap.get(id);
      if(!target){
        target={...incoming,items:[],receiptBatches:[]};
        delete target.status;delete target.partial;
      }
      const itemMap=new Map((target.items||[]).map(i=>[String(i.skuId),i]));
      (incoming.items||[]).forEach(i=>itemMap.set(String(i.skuId),clone(i)));
      target.items=[...itemMap.values()];

      const batchMap=new Map((target.receiptBatches||[]).map(b=>[String(b.id),b]));
      (incoming.receiptBatches||[]).forEach(b=>{
        const bid=String(b.id),old=batchMap.get(bid);
        if(!old){batchMap.set(bid,clone(b));return}
        const lineMap=new Map((old.lines||[]).map(l=>[String(l.skuId),l]));
        (b.lines||[]).forEach(l=>lineMap.set(String(l.skuId),clone(l)));
        Object.assign(old,clone(b));old.lines=[...lineMap.values()];batchMap.set(bid,old);
      });
      target.receiptBatches=[...batchMap.values()];
      target.status=target.items.every(lineClosed)?'received':'open';
      target.partial=target.items.some(i=>['short','over','out'].includes(String(i.lineStatus)));
      orderMap.set(id,target);
    });
    state.placedOrders=[...orderMap.values()];
  }

  async function api(action,payload={},timeout=10000){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
    try{
      const headers={'Content-Type':'application/json'};
      if(token)headers['x-cassola-session']=token;
      const res=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...payload}),signal:ctrl.signal,cache:'no-store'});
      let data={};try{data=await res.json()}catch(_){}
      if(!res.ok||data.ok===false){
        const err=new Error(data.error||('http_'+res.status));err.data=data;err.status=res.status;throw err;
      }
      return data;
    }finally{clearTimeout(timer)}
  }
  async function login(code){
    const data=await api('login',{code,deviceId:deviceId()},6000);
    token=data.sessionToken;credential=data.credential||null;reconnectCode=String(code||'');
    if(credential)cacheIdentity(credential);
    injectUi();
    await refreshStatus({silent:false}).catch(()=>{});
    startTimer();
    return data.credential;
  }
  function rememberAccessCode(code){reconnectCode=String(code||'')}
  async function reconnect(){
    if(token)return credential;
    if(!navigator.onLine||!reconnectCode)return null;
    try{return await login(reconnectCode)}catch(err){console.warn('Cassola Cloud reconnect failed',err);return null}
  }
  async function logout(){
    const old=token;token=null;credential=null;lastStatus=null;employeeCatalog=null;employeeReceiptTasks=null;employeeInventoryTasks=null;reconnectCode=null;renderCloudUi();
    if(old){
      token=old;try{await api('logout',{},2500)}catch(_){}finally{token=null}
    }
    stopTimer();
  }
  function connected(){return !!token}
  function role(){return credential?.role||null}

  function statusInfo(scopeId,head){
    const m=readMeta().scopes?.[scopeId]||{},dirty=m.fingerprint?scopeFingerprint(scopeId)!==m.fingerprint:true;
    if(!head?.head_version_id)return{icon:'☁️',text:'云端未初始化',cls:'empty',dirty};
    const rel=head.relation||(!m.baseVersionId?'no_local_base':'invalid');
    if(rel==='same')return dirty?{icon:'📱',text:'本机有未上传修改',cls:'local',dirty}:{icon:'✅',text:'已同步',cls:'synced',dirty};
    if(rel==='cloud_descendant')return dirty?{icon:'⚠️',text:'双方都有变化',cls:'conflict',dirty}:{icon:'☁️',text:'云端 Head 已变化',cls:'cloud',dirty};
    if(rel==='diverged')return{icon:'🌿',text:'数据已分叉',cls:'conflict',dirty};
    if(rel==='local_descendant')return{icon:'🌿',text:dirty?'本机分支还有修改':'本机处于分支',cls:'branch',dirty};
    if(rel==='no_local_base')return{icon:'⬇️',text:'云端有数据 · 本机未建立基线',cls:'cloud',dirty};
    if(rel==='cloud_empty')return{icon:'☁️',text:'云端为空',cls:'empty',dirty};
    return{icon:'❔',text:'需要核对云端血缘',cls:'conflict',dirty};
  }
  async function refreshStatus({silent=false}={}){
    if(!token)return null;
    const data=await api('status',{localBases:bases()},6500);
    lastStatus=data;
    if(role()==='employee'){
      employeeCatalog=data.catalogReady?(Array.isArray(data.scopeCatalog)?clone(data.scopeCatalog):[]):null;
      if(employeeCatalog!==null&&credential?.id)cacheEmployeeCatalog(credential.id,employeeCatalog);
      employeeReceiptTasks=Array.isArray(data.receiptTasks)?clone(data.receiptTasks):[];
      employeeInventoryTasks=Array.isArray(data.inventoryTasks)?clone(data.inventoryTasks):[];
      if(credential?.id){
        cacheEmployeeReceiptTasks(credential.id,employeeReceiptTasks);
        cacheEmployeeInventoryTasks(credential.id,employeeInventoryTasks);
      }
      if(credential){
        credential.scope=data.credentialScope||credential.scope||null;
        credential.staffPersonId=data.staffPersonId||credential.staffPersonId||null;
      }
      window.dispatchEvent(new CustomEvent('cassola-cloud-employee-tasks-change',{detail:{receiptCount:employeeReceiptTasks.length,inventoryCount:employeeInventoryTasks.length,scope:clone(data.credentialScope||null),staffPersonId:data.staffPersonId||null}}));
    }
    renderCloudUi();
    if(!silent)maybeNotice(data);
    return data;
  }
  function maybeNotice(data){
    if(role()!=='supervisor')return;
    const alerts=(data.heads||[]).filter(h=>{
      const i=statusInfo(h.scope_id,h);
      return ['cloud','conflict','branch'].includes(i.cls);
    });
    if(!alerts.length)return;
    const sig=alerts.map(h=>h.scope_id+':'+h.head_version_id+':'+h.relation).join('|');
    if(sig===lastNoticeSig)return;lastNoticeSig=sig;
    const dlg=document.getElementById('cloudNoticeDialog'),box=document.getElementById('cloudNoticeBody');
    if(!dlg||!box)return;
    box.innerHTML=alerts.map(h=>{
      const i=statusInfo(h.scope_id,h);
      return '<div class="cloud-notice-row '+i.cls+'"><b>'+i.icon+' '+esc(scopeLabel(h.scope_id))+'</b><span>'+esc(i.text)+'</span></div>';
    }).join('')+'<p>不会自动下载，也不会自动覆盖本机。请由 Supervisor 自己决定。</p>';
    dlg.showModal();
  }

  async function upload(scopeIds){
    if(!token||role()!=='supervisor')throw new Error('cloud_not_connected');
    const m=readMeta(),items=scopeIds.map(id=>({
      scopeId:id,
      baseVersionId:m.scopes?.[id]?.baseVersionId||null,
      state:captureScope(id),
      summary:{skuCount:Object.keys(captureScope(id).skus||{}).length}
    }));
    const data=await api('upload_scopes',{deviceId:deviceId(),items},20000);
    const results=data.results||[];
    mutateMeta(meta=>{
      results.forEach(r=>{
        const id=r.scopeId,current=meta.scopes[id]||{};
        if(r.status==='canonical'||r.status==='branch'){
          current.baseVersionId=r.versionId;current.fingerprint=scopeFingerprint(id);current.cloudContentHash=r.contentHash;current.lastSyncAt=new Date().toISOString();current.branch=r.status==='branch';current.canonicalHeadVersionId=r.headAfter||null;
        }else if(r.status==='same_as_head'){
          current.baseVersionId=r.headVersionId;current.fingerprint=scopeFingerprint(id);current.cloudContentHash=r.contentHash;current.lastSyncAt=new Date().toISOString();current.branch=false;
        }else if(r.status==='noop'){
          current.fingerprint=scopeFingerprint(id);current.lastSyncAt=new Date().toISOString();
        }
        meta.scopes[id]=current;
      });
    });
    const branches=results.filter(r=>r.status==='branch');
    if(branches.length){
      alert('🌿 已上传为分支\n\n'+branches.map(r=>scopeLabel(r.scopeId)).join('、')+' 与当前云端 Head 不是同一条后代链。云端正式 Head 没有被覆盖。');
    }else if(typeof showToast==='function')showToast(scopeIds.length===4?'全店已上传云端':'当前区域已上传云端');
    await refreshStatus({silent:true}).catch(()=>{});
    return data;
  }

  function exportSafetyBackup(){
    try{
      if(typeof saveState==='function')saveState();
      const payload={...clone(state),format:'cassola-cloud-pre-download-backup-v1',exportedAt:new Date().toISOString(),cloudMeta:readMeta()};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='cassola-pre-cloud-'+new Date().toISOString().slice(0,10)+'-'+String(Date.now()).slice(-6)+'.json';
      a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    }catch(_){}
  }
  async function download(scopeIds){
    if(!token||role()!=='supervisor')throw new Error('cloud_not_connected');
    if(!confirm('下载云端会覆盖所选区域的本机数据。\n\n系统会先导出一份本机完整 JSON 安全备份。继续？'))return;
    exportSafetyBackup();
    const data=await api('download_scopes',{scopeIds},15000);
    const rows=(data.scopes||[]).filter(x=>x.head_version_id);
    if(!rows.length){if(typeof showToast==='function')showToast('所选区域云端还没有正式数据');return}
    rows.forEach(row=>mergeScope(row.scope_id,row.state));
    if(typeof v3EnsureState==='function')v3EnsureState();
    if(typeof v45EnsurePriceState==='function')v45EnsurePriceState();
    if(typeof saveState==='function')saveState();
    if(typeof renderAll==='function')renderAll();
    mutateMeta(meta=>{
      rows.forEach(row=>{
        meta.scopes[row.scope_id]={
          ...(meta.scopes[row.scope_id]||{}),
          baseVersionId:row.head_version_id,
          fingerprint:scopeFingerprint(row.scope_id),
          cloudContentHash:row.content_hash,
          lastSyncAt:new Date().toISOString(),
          branch:false,
          canonicalHeadVersionId:row.head_version_id
        };
      });
    });
    if(typeof showToast==='function')showToast(rows.length===4?'已下载全店云端数据':'已下载云端区域');
    await refreshStatus({silent:true}).catch(()=>{});
  }

  async function checkpoint(scopeIds){
    const note=prompt('Checkpoint 备注（可空）','');
    if(note===null)return;
    const data=await api('create_checkpoint',{scopeIds,note},10000);
    const made=(data.results||[]).filter(x=>x.status==='created').length;
    if(typeof showToast==='function')showToast(made?('📸 已创建 '+made+' 个 checkpoint'):'这些区域还没有云端 Head');
  }

  async function listVersions(scopeId){
    return api('list_versions',{scopeId,limit:60},10000);
  }
  async function openHistory(scopeId){
    const dlg=document.getElementById('cloudHistoryDialog'),box=document.getElementById('cloudHistoryBody'),title=document.getElementById('cloudHistoryTitle');
    if(!dlg||!box)return;
    title.textContent=scopeLabel(scopeId)+' · 云端版本';
    box.innerHTML='<div class="cloud-loading">正在读取时间机器…</div>';dlg.dataset.scope=scopeId;dlg.showModal();
    try{
      const data=await listVersions(scopeId),cpByVersion=new Map();
      (data.checkpoints||[]).forEach(cp=>{
        if(!cpByVersion.has(cp.version_id))cpByVersion.set(cp.version_id,[]);
        cpByVersion.get(cp.version_id).push(cp);
      });
      box.innerHTML=(data.versions||[]).length?(data.versions||[]).map(v=>{
        const cps=cpByVersion.get(v.id)||[],current=v.id===data.headVersionId;
        const tags=[current?'👑 当前 Head':'',v.canonical_at_creation?'正式链':'🌿 分支',v.source_kind==='restore'?'♻️ 恢复':'',...cps.map(c=>c.checkpoint_type==='manual'?'📸 手动 checkpoint':'🤖 自动 checkpoint')].filter(Boolean);
        return '<article class="cloud-version '+(current?'current':'')+'"><div class="cloud-version-top"><div><strong>'+esc(new Date(v.created_at).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))+'</strong><small>'+esc(v.actor_credential_id)+' · '+esc(String(v.id).slice(0,8))+'</small></div><div class="cloud-version-tags">'+tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div></div>'+(v.note?'<p>'+esc(v.note)+'</p>':'')+cps.map(c=>c.note?'<p class="cloud-cp-note">'+esc(c.note)+'</p>':'').join('')+(!current?'<button type="button" class="btn secondary" data-cloud-restore="'+esc(v.id)+'">从这个状态恢复云端</button>':'')+'</article>';
      }).join(''):'<div class="empty">这个区域还没有云端版本。</div>';
    }catch(e){box.innerHTML='<div class="empty">读取失败：'+esc(e.message)+'</div>'}
  }
  async function restoreVersion(id){
    if(!confirm('从这个历史状态恢复云端？\n\n不会删除后面的历史，而是创建一个新的恢复版本。本机也不会自动下载。'))return;
    await api('restore_version',{versionId:id,deviceId:deviceId(),note:'Manual restore from history'},15000);
    if(typeof showToast==='function')showToast('♻️ 云端已创建恢复版本 · 本机未自动下载');
    document.getElementById('cloudHistoryDialog')?.close();
    await refreshStatus({silent:false}).catch(()=>{});
  }

  async function submitEmployee(payload){
    if(!token||role()!=='employee')throw new Error('cloud_employee_session_required');
    const data=await api('employee_submit',{payload},12000);
    if(typeof showToast==='function')showToast('☁️ 今日盘货已提交给 Supervisor');
    await refreshStatus({silent:true}).catch(()=>{});
    return data;
  }
  async function submitSkuProposal(proposal){
    if(!token||role()!=='employee')throw new Error('cloud_employee_session_required');
    const data=await api('employee_sku_proposal',{proposal,deviceId:deviceId()},10000);
    if(typeof showToast==='function')showToast('🧪 SKU 提议已交给 Supervisor');
    await refreshStatus({silent:true}).catch(()=>{});
    return data;
  }
  async function listSkuProposals(statuses=['pending']){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('sku_proposals',{statuses},10000);
  }
  async function reviewSkuProposal(id,decision){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    const data=await api('sku_proposal_review',{id,decision},8000);
    await refreshStatus({silent:true}).catch(()=>{});
    return data;
  }
  async function listEmployeeDirectory(){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('employee_directory',{},8000);
  }
  async function authorizeReceiptTask(task){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    const data=await api('receipt_authorize',{task},10000);
    await refreshStatus({silent:true}).catch(()=>{});
    return data;
  }
  async function revokeReceiptTask(taskId,note=''){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    const data=await api('receipt_revoke',{taskId,note},8000);
    await refreshStatus({silent:true}).catch(()=>{});
    return data;
  }
  async function listReceiptTasks(statuses=['authorized'],orderId=''){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('receipt_tasks',{statuses,orderId},8000);
  }
  async function submitEmployeeReceipt(taskId,payload){
    if(!token||role()!=='employee')throw new Error('cloud_employee_session_required');
    const data=await api('receipt_submit',{taskId,payload},12000);
    await refreshStatus({silent:true}).catch(()=>{});
    return data;
  }
  async function listReceiptPending(){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('receipt_pending',{},10000);
  }
  async function reviewReceiptTask(taskId,decision,note=''){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    const data=await api('receipt_review',{taskId,decision,note},8000);
    await refreshStatus({silent:true}).catch(()=>{});
    return data;
  }
  async function staffAccessGet(personId){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('staff_access_get',{personId},8000);
  }
  async function staffAccessCreate(personId,personName){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('staff_access_create',{personId,personName},10000);
  }
  async function staffAccessRegenerate(personId){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('staff_access_regenerate',{personId},10000);
  }
  async function staffAccessSetActive(personId,active){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('staff_access_set_active',{personId,active:!!active},8000);
  }
  async function inventoryTaskOptions(){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('inventory_task_options',{},10000);
  }
  async function publishInventoryTask(personId,selector,label='',note=''){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('inventory_task_publish',{personId,selector,label,note},12000);
  }
  async function listInventoryTasks(personId=''){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('inventory_tasks',{personId},10000);
  }
  async function revokeInventoryTask(taskId){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    return api('inventory_task_revoke',{taskId},8000);
  }
  async function staffUpload(note='Manual Staff upload'){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    const id='staff',m=readMeta(),staffState=captureStaffScope();
    const item={scopeId:id,baseVersionId:m.scopes?.[id]?.baseVersionId||null,state:staffState,summary:{peopleCount:(staffState.people||[]).length},note};
    const data=await api('upload_scopes',{deviceId:deviceId(),items:[item],note},20000);
    const row=(data.results||[])[0];
    if(row){
      mutateMeta(meta=>{
        const current=meta.scopes[id]||{};
        if(row.status==='canonical'||row.status==='branch'){
          current.baseVersionId=row.versionId;current.fingerprint=scopeFingerprint(id);current.cloudContentHash=row.contentHash;current.lastSyncAt=new Date().toISOString();current.branch=row.status==='branch';current.canonicalHeadVersionId=row.headAfter||null;
        }else if(row.status==='same_as_head'){
          current.baseVersionId=row.headVersionId;current.fingerprint=scopeFingerprint(id);current.cloudContentHash=row.contentHash;current.lastSyncAt=new Date().toISOString();current.branch=false;current.canonicalHeadVersionId=row.headVersionId;
        }else if(row.status==='noop'){
          current.fingerprint=scopeFingerprint(id);current.lastSyncAt=new Date().toISOString();
        }
        meta.scopes[id]=current;
      });
      if(row.status==='branch')alert('🌿 Staff 已上传为分支。云端正式 Staff Head 没有被覆盖，请先核对另一台 Supervisor 的修改。');
      else if(typeof showToast==='function')showToast('👥 Staff 已上传云端');
    }
    await refreshStatus({silent:true}).catch(()=>{});
    window.dispatchEvent(new CustomEvent('cassola-cloud-staff-change'));
    return data;
  }
  async function staffDownload(){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    if(!confirm('下载云端 Staff 会覆盖本机人员 / 出勤 / 换休 / 发布版本。\n\n系统会先导出一份本机 Staff JSON。继续？'))return null;
    await window.CassolaStaff?.exportCloudBackup?.();
    const data=await api('download_scopes',{scopeIds:['staff']},15000);
    const row=(data.scopes||[]).find(x=>x.scope_id==='staff'&&x.head_version_id);
    if(!row){if(typeof showToast==='function')showToast('Staff Cloud 还没有正式数据');return null}
    mergeScope('staff',row.state);
    mutateMeta(meta=>{
      meta.scopes.staff={...(meta.scopes.staff||{}),baseVersionId:row.head_version_id,fingerprint:scopeFingerprint('staff'),cloudContentHash:row.content_hash,lastSyncAt:new Date().toISOString(),branch:false,canonicalHeadVersionId:row.head_version_id};
    });
    if(typeof showToast==='function')showToast('👥 已下载 Staff Cloud');
    await refreshStatus({silent:true}).catch(()=>{});
    window.dispatchEvent(new CustomEvent('cassola-cloud-staff-change'));
    return row;
  }
  function staffStatus(){
    const head=(lastStatus?.heads||[]).find(x=>x.scope_id==='staff');
    return statusInfo('staff',head);
  }
  async function staffHistory(){return openHistory('staff')}

  async function flushOutbox(){
    if(!token||role()!=='employee')throw new Error('cloud_employee_session_required');
    const id=credential?.id,all=readOutbox(),mine=all.filter(x=>x.credentialId===id);
    if(!mine.length)return{sent:0,failed:0};
    let sent=0,failed=0,expired=0,remaining=all.slice();
    for(const row of mine){
      try{
        if(row.type==='employee_submission')await api('employee_submit',{payload:row.payload},12000);
        else if(row.type==='sku_proposal')await api('employee_sku_proposal',{proposal:row.payload,deviceId:deviceId()},10000);
        else if(row.type==='employee_receipt')await api('receipt_submit',{taskId:row.payload?.taskId,payload:row.payload?.payload},12000);
        else continue;
        remaining=remaining.filter(x=>x.id!==row.id);sent++;
      }catch(err){
        if(err?.data?.error==='duplicate_submission'||err?.data?.error==='duplicate_proposal'||err?.data?.error==='duplicate_receipt_submission'){
          remaining=remaining.filter(x=>x.id!==row.id);sent++;continue;
        }
        if(row.type==='employee_receipt'&&err?.data?.error==='receipt_task_not_authorized'){
          remaining=remaining.filter(x=>x.id!==row.id);expired++;continue;
        }
        failed++;
      }
    }
    writeOutbox(remaining);
    window.dispatchEvent(new CustomEvent('cassola-cloud-outbox-change',{detail:{count:outboxCount(id)}}));
    await refreshStatus({silent:true}).catch(()=>{});
    return{sent,failed,expired};
  }
  async function reviewEmployee(id,decision,note=''){
    if(!token||role()!=='supervisor')throw new Error('cloud_supervisor_session_required');
    const data=await api('employee_review',{id,decision,note},8000);
    await refreshStatus({silent:true}).catch(()=>{});
    return data;
  }
  async function openPending(){
    const dlg=document.getElementById('cloudPendingDialog'),box=document.getElementById('cloudPendingBody');
    if(!dlg||!box)return;
    box.innerHTML='<div class="cloud-loading">正在收奏折…</div>';dlg.showModal();
    try{
      const data=await api('employee_pending',{statuses:['pending']},10000);
      const localImported=new Set((state.employeeSubmissions||[]).map(x=>String(x.submissionId)));
      box.innerHTML=(data.submissions||[]).length?(data.submissions||[]).map(s=>{
        const already=localImported.has(String(s.submission_id));
        const eventCount=Array.isArray(s.payload?.events)?s.payload.events.length:0;
        return '<article class="cloud-submission"><div class="cloud-version-top"><div><strong>'+esc(s.scope_definition?.label||s.responsibility_scope_id)+'</strong><small>'+esc(s.business_date)+' · '+esc(s.credential_id)+' · '+esc(new Date(s.submitted_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}))+'</small></div><span class="cloud-pending-pill">'+(already?'本机已采用':'待审核')+'</span></div><div class="cloud-sub-items">'+(s.items||[]).slice(0,6).map(i=>'<span>'+esc(i.sku_name||i.sku_id)+' '+esc(i.qty)+' '+esc(i.unit||'')+'</span>').join('')+((s.items||[]).length>6?'<span>＋'+((s.items||[]).length-6)+' 项</span>':'')+(eventCount?'<span>📉 '+eventCount+' 条变动</span>':'')+'</div><div class="cloud-sub-actions">'+(already?'<button type="button" class="btn primary" data-cloud-mark-accepted="'+esc(s.id)+'">补记为已采用</button>':'<button type="button" class="btn primary" data-cloud-review="'+esc(s.id)+'">查看差异</button>')+'<button type="button" class="btn danger ghost" data-cloud-reject="'+esc(s.id)+'">拒绝</button></div></article>';
      }).join(''):'<div class="empty">没有待审核员工盘货 🗿☕</div>';
      dlg._cloudSubs=data.submissions||[];
    }catch(e){box.innerHTML='<div class="empty">读取失败：'+esc(e.message)+'</div>'}
  }
  function cloudSubmissionPayload(s){
    return{
      format:'cassola-employee-count-v1',
      date:s.business_date,
      submittedAt:s.submitted_at,
      submissionId:s.submission_id,
      credentialId:s.credential_id,
      role:'employee',
      scope:s.scope_definition,
      effectiveKey:s.effective_key,
      latestRule:'submittedAt',
      deviceRevision:s.device_revision||0,
      scopeSkuIds:(s.items||[]).map(i=>i.sku_id),
      counts:(s.items||[]).map(i=>({skuId:i.sku_id,name:i.sku_name,qty:Number(i.qty),unit:i.unit||'',spec:i.spec||''})),
      events:Array.isArray(s.payload?.events)?s.payload.events:[]
    };
  }
  async function reviewPending(id){
    const dlg=document.getElementById('cloudPendingDialog'),sub=(dlg?._cloudSubs||[]).find(x=>String(x.id)===String(id));
    if(!sub)return;
    if(!window.CassolaEmployeeImport?.preview){alert('员工盘货审核模块没有加载。');return}
    dlg.close();
    window.CassolaEmployeeImport.preview(cloudSubmissionPayload(sub),{cloudSubmissionId:sub.id});
  }

  function currentScopeSelection(){return document.getElementById('cloudScopeSelect')?.value||(typeof v4AreaFilter!=='undefined'?v4AreaFilter:'sushi')}
  function renderCloudUi(){
    const online=connected();
    document.querySelectorAll('[data-cloud-needs-session]').forEach(el=>{el.disabled=!online});
    const badge=document.getElementById('cloudConnectionState');
    if(badge){badge.textContent=online?'☁️ 已连接':'☁️ 未连接';badge.classList.toggle('online',online)}
    const rows=document.getElementById('cloudScopeRows');
    if(rows){
      if(!online)rows.innerHTML='<div class="cloud-offline-note">当前只运行本地总账。重新输入 Access Code 后会再次连接云端。</div>';
      else{
        const heads=new Map((lastStatus?.heads||[]).map(x=>[x.scope_id,x]));
        rows.innerHTML=SCOPES.map(s=>{
          const h=heads.get(s.id),i=statusInfo(s.id,h);
          return '<div class="cloud-scope-row '+i.cls+'"><span>'+esc(s.label)+'</span><b>'+i.icon+' '+esc(i.text)+'</b></div>';
        }).join('');
      }
    }
    const hub=document.getElementById('cassolaCloudHubSummary');
    if(hub){
      if(!online)hub.innerHTML='<span>☁️ Cloud</span><b>未连接</b>';
      else{
        const pending=lastStatus?.pendingEmployeeSubmissions||0,proposalPending=lastStatus?.pendingSkuProposals||0,receiptPending=lastStatus?.pendingEmployeeReceipts||0,heads=lastStatus?.heads||[];
        const issues=heads.filter(h=>['cloud','conflict','branch'].includes(statusInfo(h.scope_id,h).cls)).length;
        hub.innerHTML='<span>☁️ Cassola Piccola Cloud</span><b>'+(issues?('⚠️ '+issues+' 区需核对'):'✅ 已检查')+(pending?(' · 👷 '+pending+' 盘货'):'')+(receiptPending?(' · 🚚 '+receiptPending+' 收货'):'')+(proposalPending?(' · 🧪 '+proposalPending+' 提议'):'')+'</b>';
      }
    }
    const p=document.getElementById('cloudPendingCount');if(p)p.textContent=String(lastStatus?.pendingEmployeeSubmissions||0);
    const sp=document.getElementById('cloudProposalCount');if(sp)sp.textContent=String(lastStatus?.pendingSkuProposals||0);
    const rp=document.getElementById('cloudReceiptCount');if(rp)rp.textContent=String(lastStatus?.pendingEmployeeReceipts||0);
  }

  function injectUi(){
    if(document.getElementById('cloudSyncCard')){renderCloudUi();return}
    const settings=document.getElementById('view-settings');
    if(settings){
      const card=document.createElement('div');card.id='cloudSyncCard';card.className='settings-card cloud-card';
      card.innerHTML='<div class="cloud-card-head"><div><h2>☁️ Cassola Piccola Cloud</h2><p>自动检查 Head，上传 / 下载永远由 Supervisor 手动决定。</p></div><span id="cloudConnectionState" class="cloud-connection">☁️ 未连接</span></div><div id="cloudScopeRows" class="cloud-scope-rows"></div><label class="cloud-scope-select">操作区域<select id="cloudScopeSelect">'+SCOPES.map(s=>'<option value="'+s.id+'">'+s.label+'</option>').join('')+'</select></label><div class="cloud-actions"><button type="button" class="btn primary" data-cloud-upload-scope data-cloud-needs-session>☁️ 上传所选区域</button><button type="button" class="btn secondary" data-cloud-download-scope data-cloud-needs-session>⬇️ 下载所选区域</button><button type="button" class="btn primary" data-cloud-upload-all data-cloud-needs-session>☁️ 上传全店</button><button type="button" class="btn secondary" data-cloud-download-all data-cloud-needs-session>⬇️ 下载全店</button></div><div class="cloud-actions small"><button type="button" class="btn secondary" data-cloud-checkpoint data-cloud-needs-session>📸 手动 checkpoint</button><button type="button" class="btn secondary" data-cloud-history data-cloud-needs-session>🕰️ 版本历史</button><button type="button" class="btn secondary" data-cloud-pending data-cloud-needs-session>👷 盘货审核 <span id="cloudPendingCount">0</span></button><button type="button" class="btn secondary" data-cloud-receipts data-cloud-needs-session>🚚 收货审核 <span id="cloudReceiptCount">0</span></button><button type="button" class="btn secondary" data-cloud-refresh data-cloud-needs-session>↻ 检查云端</button></div><div class="cloud-rule">云端变化只提醒，不自动下载。分叉上传只生成 branch，不会自动覆盖正式 Head。下载前自动导出本机 JSON 安全备份。</div>';
      const handoff=document.getElementById('v31HandoffCard');if(handoff)settings.insertBefore(card,handoff);else settings.prepend(card);
    }
    const hub=document.getElementById('cassolaHub');
    if(hub&&!document.getElementById('cassolaCloudHubSummary')){
      const stateBox=document.getElementById('cassolaAccessState'),box=document.createElement('div');
      box.id='cassolaCloudHubSummary';box.className='cassola-cloud-hub-summary';
      stateBox?.insertAdjacentElement('afterend',box);
    }
    if(!document.getElementById('cloudNoticeDialog')){
      const d=document.createElement('dialog');d.id='cloudNoticeDialog';d.className='cloud-dialog';d.innerHTML='<form method="dialog"><div class="dialog-head"><div><div class="eyebrow">CASSOLA CLOUD</div><h3>云端 Head 已变化</h3></div><button value="cancel" formnovalidate class="icon-btn">✕</button></div><div id="cloudNoticeBody"></div><button value="cancel" formnovalidate class="btn primary large">知道了 · 我自己决定何时同步</button></form>';document.body.appendChild(d);
    }
    if(!document.getElementById('cloudHistoryDialog')){
      const d=document.createElement('dialog');d.id='cloudHistoryDialog';d.className='cloud-dialog';d.innerHTML='<form method="dialog"><div class="dialog-head"><div><div class="eyebrow">TIME MACHINE</div><h3 id="cloudHistoryTitle">云端版本</h3></div><button value="cancel" formnovalidate class="icon-btn">✕</button></div><div id="cloudHistoryBody" class="cloud-history-body"></div><button value="cancel" formnovalidate class="btn secondary large">关闭</button></form>';document.body.appendChild(d);
    }
    if(!document.getElementById('cloudPendingDialog')){
      const d=document.createElement('dialog');d.id='cloudPendingDialog';d.className='cloud-dialog';d.innerHTML='<form method="dialog"><div class="dialog-head"><div><div class="eyebrow">EMPLOYEE INBOX</div><h3>👷 云端员工盘货</h3></div><button value="cancel" formnovalidate class="icon-btn">✕</button></div><div id="cloudPendingBody" class="cloud-history-body"></div><button value="cancel" formnovalidate class="btn secondary large">关闭</button></form>';document.body.appendChild(d);
    }
    renderCloudUi();
  }

  document.addEventListener('click',async e=>{
    try{
      if(e.target.closest('[data-cloud-upload-scope]')){await upload([currentScopeSelection()]);return}
      if(e.target.closest('[data-cloud-download-scope]')){await download([currentScopeSelection()]);return}
      if(e.target.closest('[data-cloud-upload-all]')){await upload(SCOPES.map(s=>s.id));return}
      if(e.target.closest('[data-cloud-download-all]')){await download(SCOPES.map(s=>s.id));return}
      if(e.target.closest('[data-cloud-checkpoint]')){await checkpoint([currentScopeSelection()]);return}
      if(e.target.closest('[data-cloud-history]')){await openHistory(currentScopeSelection());return}
      if(e.target.closest('[data-cloud-pending]')){await openPending();return}
      if(e.target.closest('[data-cloud-receipts]')){if(typeof v4OpenEmployeeReceiptInbox==='function')await v4OpenEmployeeReceiptInbox();else alert('员工收货审核模块没有加载。');return}
      if(e.target.closest('[data-cloud-refresh]')){await refreshStatus({silent:false});if(typeof showToast==='function')showToast('云端 Head 已检查');return}
      const restore=e.target.closest('[data-cloud-restore]');if(restore){await restoreVersion(restore.dataset.cloudRestore);return}
      const review=e.target.closest('[data-cloud-review]');if(review){await reviewPending(review.dataset.cloudReview);return}
      const reject=e.target.closest('[data-cloud-reject]');if(reject){if(confirm('拒绝这份员工盘货？')){await reviewEmployee(reject.dataset.cloudReject,'rejected');await openPending()}return}
      const mark=e.target.closest('[data-cloud-mark-accepted]');if(mark){await reviewEmployee(mark.dataset.cloudMarkAccepted,'accepted','Local copy was already applied');await openPending();return}
    }catch(err){
      console.error('cloud action',err);
      alert('Cloud 操作失败：'+(err?.data?.detail||err?.message||'未知错误'));
    }
  });

  function startTimer(){
    stopTimer();refreshTimer=setInterval(()=>{if(document.visibilityState==='visible'&&token)refreshStatus({silent:false}).catch(()=>{})},300000);
  }
  function stopTimer(){if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null}}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&token)refreshStatus({silent:false}).catch(()=>{})});
  window.addEventListener('online',()=>{if(!token&&reconnectCode)reconnect().then(()=>window.dispatchEvent(new CustomEvent('cassola-cloud-reconnected'))).catch(()=>{})});
  document.addEventListener('DOMContentLoaded',injectUi);

  window.CassolaCloud={
    login,logout,connected,role,refreshStatus,upload,download,checkpoint,
    submitEmployee,reviewEmployee,openPending,
    submitSkuProposal,listSkuProposals,reviewSkuProposal,
    listEmployeeDirectory,authorizeReceiptTask,revokeReceiptTask,listReceiptTasks,submitEmployeeReceipt,listReceiptPending,reviewReceiptTask,
    staffAccessGet,staffAccessCreate,staffAccessRegenerate,staffAccessSetActive,
    inventoryTaskOptions,publishInventoryTask,listInventoryTasks,revokeInventoryTask,
    staffUpload,staffDownload,staffStatus,staffHistory,
    queueEmployeeSubmission,queueSkuProposal,queueEmployeeReceipt,employeeReceiptQueued,flushOutbox,outboxCount,
    rememberAccessCode,reconnect,cachedIdentity,
    captureScope,mergeScope,meta:readMeta,deviceId,
    session:()=>credential?clone(credential):null,
    employeeCatalog:(credentialId)=>{
      if(employeeCatalog!==null)return clone(employeeCatalog);
      return cachedEmployeeCatalog(credentialId||credential?.id);
    },
    cachedEmployeeCatalog,
    employeeReceiptTasks:(credentialId)=>{
      if(employeeReceiptTasks!==null)return clone(employeeReceiptTasks);
      return cachedEmployeeReceiptTasks(credentialId||credential?.id);
    },
    cachedEmployeeReceiptTasks,
    employeeInventoryTasks:(credentialId)=>{
      if(employeeInventoryTasks!==null)return clone(employeeInventoryTasks);
      return cachedEmployeeInventoryTasks(credentialId||credential?.id);
    },
    cachedEmployeeInventoryTasks,
    inventoryCatalog:()=>{
      const rows=[];
      for(const sc of SCOPES){
        const part=captureScope(sc.id);
        Object.values(part.skus||{}).forEach(x=>rows.push(clone(x)));
      }
      return rows;
    },
    captureStaffScope,
    injectUi
  };
})();

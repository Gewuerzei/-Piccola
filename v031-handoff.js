/* v0.3.1 · group-chat JSON handoff with revision guards */
const V31_META_KEY='cassola_inventory_sync_meta_v031';
let v31PendingImport=null;

function v31HashString(str){
  let h=2166136261;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16).padStart(8,'0');
}
function v31Snapshot(st=state){
  return {
    skus:st.skus||[],
    history:st.history||[],
    order:st.order||{},
    placedOrders:st.placedOrders||[],
    hiddenSkuIds:st.hiddenSkuIds||[]
  };
}
function v31Fingerprint(st=state){return v31HashString(JSON.stringify(v31Snapshot(st)))}
function v31Shadow(){
  try{return JSON.parse(localStorage.getItem(V31_META_KEY)||'null')}catch(e){return null}
}
function v31DeviceName(){
  return (state.syncMeta?.deviceName||v31Shadow()?.deviceName||'本设备').trim()||'本设备';
}
function v31WriteRaw(){
  localStorage.setItem(APP_KEY,JSON.stringify(state));
  localStorage.setItem(V31_META_KEY,JSON.stringify(state.syncMeta));
}
function v31EnsureMeta(){
  const shadow=v31Shadow();
  const fp=v31Fingerprint(state);
  const existing=state.syncMeta||shadow;
  state.syncMeta={
    revision:Math.max(1,Number(existing?.revision)||1),
    updatedAt:existing?.updatedAt||stamp(),
    contentHash:existing?.contentHash||fp,
    deviceName:(existing?.deviceName||'本设备').trim()||'本设备'
  };
  if(state.syncMeta.contentHash!==fp && !shadow){
    state.syncMeta.contentHash=fp;
    state.syncMeta.updatedAt=stamp();
  }
  v31WriteRaw();
}
v31EnsureMeta();

saveState=function(){
  const fp=v31Fingerprint(state);
  const shadow=v31Shadow()||state.syncMeta||{};
  const prevHash=state.syncMeta?.contentHash||shadow.contentHash;
  const prevRev=Math.max(Number(state.syncMeta?.revision)||0,Number(shadow.revision)||0,1);
  const device=(state.syncMeta?.deviceName||shadow.deviceName||'本设备').trim()||'本设备';
  if(fp!==prevHash){
    state.syncMeta={revision:prevRev+1,updatedAt:stamp(),contentHash:fp,deviceName:device};
  }else{
    state.syncMeta={revision:prevRev,updatedAt:state.syncMeta?.updatedAt||shadow.updatedAt||stamp(),contentHash:fp,deviceName:device};
  }
  v31WriteRaw();
  v31RefreshCard();
};

function v31FmtTime(v){
  if(!v)return'—';
  try{return new Date(v).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return String(v)}
}
function v31SafeName(v){return String(v||'设备').replace(/[\\/:*?"<>|\s]+/g,'-').slice(0,24)}
function v31Diff(incoming){
  const localMap=new Map((state.skus||[]).map(s=>[s.id,s]));
  const inMap=new Map((incoming.skus||[]).map(s=>[s.id,s]));
  const ids=new Set([...localMap.keys(),...inMap.keys()]);
  let stock=0,skuChanges=0;
  ids.forEach(id=>{
    const a=localMap.get(id),b=inMap.get(id);
    if(!a||!b){skuChanges++;return}
    if(Number(a.qty)!==Number(b.qty))stock++;
    if([a.name,a.spec,a.unit,a.category,a.supplier,a.area,a.icon,a.warningMode,a.targetQty,a.targetWeeks,a.autoOrder].join('|')!==[b.name,b.spec,b.unit,b.category,b.supplier,b.area,b.icon,b.warningMode,b.targetQty,b.targetWeeks,b.autoOrder].join('|'))skuChanges++;
  });
  const localHist=new Set((state.history||[]).map(h=>h.id));
  const newHistory=(incoming.history||[]).filter(h=>!localHist.has(h.id)).length;
  const localOrders=new Map((state.placedOrders||[]).map(o=>[o.id,o]));
  const orderChanges=(incoming.placedOrders||[]).filter(o=>{
    const local=localOrders.get(o.id);
    return !local||JSON.stringify(local)!==JSON.stringify(o);
  }).length;
  return {stock,skuChanges,newHistory,orderChanges};
}
function v31InjectUi(){
  const settings=document.getElementById('view-settings');
  if(!settings||document.getElementById('v31HandoffCard'))return;
  const first=settings.querySelector('.settings-card');
  const card=document.createElement('div');
  card.className='settings-card v31-handoff-card';
  card.id='v31HandoffCard';
  card.innerHTML=`
    <h2>📨 群聊数据交接</h2>
    <p>导出后发到内部群。下一位操作前先导入群里最新版本。</p>
    <div class="v31-status">
      <div><span>本机数据版本</span><b id="v31Revision">#1</b></div>
      <div><span>最后修改</span><b id="v31Updated">—</b></div>
    </div>
    <label class="v31-device-label">设备名
      <input id="v31Device" type="text" placeholder="例如 Pietro / 店长" />
    </label>
    <div class="v31-tip">旧版本会被拦截；同版本但内容不同会提示“分叉冲突”。</div>
  `;
  settings.insertBefore(card,first);
  const exportBtn=document.getElementById('exportBtn');
  const importLabel=document.getElementById('importInput')?.closest('label');
  if(exportBtn)exportBtn.textContent='导出群聊 JSON';
  if(importLabel){
    const input=document.getElementById('importInput');
    importLabel.childNodes[0].textContent='导入群聊 JSON';
    if(input)input.setAttribute('aria-label','导入群聊 JSON');
  }
  document.getElementById('v31Device')?.addEventListener('change',e=>{
    const name=e.target.value.trim()||'本设备';
    state.syncMeta=state.syncMeta||{};
    state.syncMeta.deviceName=name;
    const sh=v31Shadow()||{};
    localStorage.setItem(V31_META_KEY,JSON.stringify({...sh,...state.syncMeta,deviceName:name}));
    v31WriteRaw();v31RefreshCard();showToast('设备名已保存');
  });
  const dialog=document.createElement('dialog');
  dialog.id='v31ImportDialog';
  dialog.innerHTML=`
    <form method="dialog" class="v31-import-form">
      <div class="dialog-head">
        <div><div class="eyebrow">JSON HANDOFF</div><h3>导入前核对</h3></div>
        <button value="cancel" class="icon-btn">✕</button>
      </div>
      <div id="v31ImportSummary"></div>
      <div class="v31-import-actions">
        <button value="cancel" class="btn secondary">取消</button>
        <button id="v31ForceBtn" value="default" class="btn danger ghost hidden">强制采用</button>
        <button id="v31AcceptBtn" value="default" class="btn primary">确认导入</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);
  document.getElementById('v31AcceptBtn').addEventListener('click',e=>{e.preventDefault();v31ApplyImport(false)});
  document.getElementById('v31ForceBtn').addEventListener('click',e=>{e.preventDefault();v31ApplyImport(true)});
  v31RefreshCard();
}
function v31RefreshCard(){
  if(!document.getElementById('v31HandoffCard'))return;
  document.getElementById('v31Revision').textContent='#'+(state.syncMeta?.revision||1);
  document.getElementById('v31Updated').textContent=v31FmtTime(state.syncMeta?.updatedAt);
  document.getElementById('v31Device').value=v31DeviceName();
}

function v31Export(e){
  e?.preventDefault?.();e?.stopImmediatePropagation?.();
  saveState();
  const meta={...state.syncMeta,deviceName:v31DeviceName(),contentHash:v31Fingerprint(state)};
  const payload={...state,syncMeta:meta,exportedAt:stamp(),exportDevice:meta.deviceName,format:'cassola-handoff-v1'};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const d=new Date().toISOString().slice(0,10);
  a.download=`cassola-v${meta.revision}-${v31SafeName(meta.deviceName)}-${d}.json`;
  a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showToast(`已导出数据版本 #${meta.revision}`);
}

function v31PreviewImport(data){
  const localRev=Number(state.syncMeta?.revision)||1;
  const incomingMeta=data.syncMeta||{};
  const incomingRev=Number(incomingMeta.revision)||0;
  const incomingHash=incomingMeta.contentHash||v31Fingerprint(data);
  const localHash=v31Fingerprint(state);
  const sameContent=incomingHash===localHash;
  let mode='newer',title='✅ 可以导入',detail='导入后本机会采用这份较新的数据。';
  if(incomingRev===0){mode='legacy';title='⚠️ 旧版数据包';detail='这份 JSON 没有版本号。默认不允许直接覆盖当前数据。'}
  else if(incomingRev<localRev){mode='older';title='⛔ 这是旧版本';detail=`本机已经是 #${localRev}，文件只有 #${incomingRev}。`}
  else if(incomingRev===localRev&&!sameContent){mode='fork';title='⚠️ 同版本分叉冲突';detail='两台设备从同一个版本各自修改过。不能自动判断哪一份应该覆盖。'}
  else if(incomingRev===localRev&&sameContent){mode='same';title='ℹ️ 已经是同一份数据';detail='版本号和内容都一致，不需要重复导入。'}
  const diff=v31Diff(data);
  v31PendingImport={data,mode,incomingRev,incomingHash,localRev};
  const device=escapeHtml(incomingMeta.deviceName||data.exportDevice||'未知设备');
  document.getElementById('v31ImportSummary').innerHTML=`
    <div class="v31-import-banner v31-${mode}"><strong>${title}</strong><span>${escapeHtml(detail)}</span></div>
    <div class="v31-compare">
      <div><span>本机</span><b>#${localRev}</b><small>${escapeHtml(v31DeviceName())}</small></div>
      <div class="v31-arrow">→</div>
      <div><span>文件</span><b>#${incomingRev||'?'}</b><small>${device}</small></div>
    </div>
    <div class="v31-diff-grid">
      <div><span>库存变化</span><b>${diff.stock}</b></div>
      <div><span>SKU资料变化</span><b>${diff.skuChanges}</b></div>
      <div><span>新增历史</span><b>${diff.newHistory}</b></div>
      <div><span>订单 / 收货变化</span><b>${diff.orderChanges}</b></div>
    </div>
    <div class="v31-file-time">导出时间：${escapeHtml(v31FmtTime(data.exportedAt||incomingMeta.updatedAt))}</div>
  `;
  const accept=document.getElementById('v31AcceptBtn'),force=document.getElementById('v31ForceBtn');
  accept.classList.toggle('hidden',!['newer'].includes(mode));
  force.classList.toggle('hidden',!['older','legacy','fork'].includes(mode));
  if(mode==='same'){accept.classList.add('hidden');force.classList.add('hidden')}
  document.getElementById('v31ImportDialog').showModal();
}
function v31ImportFile(file,e){
  e?.stopImmediatePropagation?.();
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!Array.isArray(data.skus))throw new Error('bad');
      v31PreviewImport(data);
    }catch(err){alert('这个 JSON 无法读取，或不是 Cassola Inventory 数据包。')}
  };
  reader.readAsText(file);
}
function v31ApplyImport(force){
  if(!v31PendingImport)return;
  const p=v31PendingImport;
  if(force&&!confirm('确定强制采用这份数据？这会覆盖本机当前状态。'))return;
  const oldLocalRev=Number(state.syncMeta?.revision)||1;
  const localDevice=v31DeviceName();
  state=migrate(p.data);
  if(typeof v3EnsureState==='function')v3EnsureState();
  const fp=v31Fingerprint(state);
  const importedName=p.data.syncMeta?.deviceName||p.data.exportDevice||'导入设备';
  const revision=force?Math.max(oldLocalRev,p.incomingRev||0)+1:Math.max(1,p.incomingRev);
  state.syncMeta={revision,updatedAt:force?stamp():(p.data.syncMeta?.updatedAt||p.data.exportedAt||stamp()),contentHash:fp,deviceName:localDevice};
  v31WriteRaw();
  document.getElementById('v31ImportDialog').close();
  v31PendingImport=null;
  renderAll();
  showToast(force?`已强制采用，生成新版本 #${revision}`:`已导入版本 #${revision}`);
}

function v31BindTransferButtons(){
  const exportBtn=document.getElementById('exportBtn');
  const importInput=document.getElementById('importInput');
  exportBtn?.addEventListener('click',v31Export,true);
  importInput?.addEventListener('change',e=>{
    e.stopImmediatePropagation();
    const f=e.target.files?.[0];
    if(f)v31ImportFile(f,e);
    e.target.value='';
  },true);
}

v31InjectUi();
v31BindTransferButtons();
v31RefreshCard();

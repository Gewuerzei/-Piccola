/* Staff departments v0.4.8 · local-only, preview-first migration bridge.
   This does NOT upload production Cloud or overwrite cassola_staff_v01. */
(function(){
  'use strict';
  const ROOT='cassola_staff_departments_v01';
  const BACKUP_PREFIX='cassola_staff_safe_merge_backup_';
  const LEGACY='cassola_staff_v01';
  const CLONE=x=>JSON.parse(JSON.stringify(x));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const depts={sushi:'🍣 Sushi',sala:'🍷 Bar/Sala',cucina:'🍳 Cucina'};
  let candidate=null,week=weekStart(new Date()),busy=false;
  function weekStart(d){const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-(x.getDay()+6)%7);return x.toISOString().slice(0,10)}
  function dayIso(s,offset){const x=new Date(s+'T12:00:00');x.setDate(x.getDate()+offset);return x.toISOString().slice(0,10)}
  function read(){
    try{const x=JSON.parse(localStorage.getItem(ROOT)||'null');return x?.schema===1?x:{schema:1,directory:{},departments:{},updatedAt:''}}catch(_){return{schema:1,directory:{},departments:{},updatedAt:''}}
  }
  function legacy(){try{return JSON.parse(localStorage.getItem(LEGACY)||'null')||{}}catch(_){return{}}}
  function saveWithBackup(next){
    const prev=localStorage.getItem(ROOT),original=localStorage.getItem(LEGACY);
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    // Abort rather than discard a backup if the device is out of storage.
    localStorage.setItem(BACKUP_PREFIX+stamp,JSON.stringify({savedAt:new Date().toISOString(),legacy:original,previousDepartments:prev}));
    try{localStorage.setItem(ROOT,JSON.stringify(next))}catch(err){throw new Error('设备空间不足，无法安全写入。原数据保留；请先导出 Staff JSON。')}
  }
  function ensureDialog(){
    let d=document.getElementById('staffSafeMergeDialog');if(d)return d;
    d=document.createElement('dialog');d.id='staffSafeMergeDialog';d.className='staff-dialog staff-safe-merge-dialog';
    d.innerHTML='<div class="dialog-head"><div><div class="eyebrow">STAFF DEPARTMENT IMPORT</div><h3>🛡️ 安全导入 Cloud 历史</h3></div><button class="icon-btn" type="button" data-merge-close>✕</button></div><div id="staffSafeMergeContent"></div>';
    document.body.appendChild(d);
    d.addEventListener('click',ev=>{
      if(ev.target.closest('[data-merge-close]'))d.close();
      const b=ev.target.closest('[data-merge-version]');if(b)void previewVersion(b.dataset.mergeVersion);
      if(ev.target.closest('[data-merge-apply]'))applyCandidate();
    });
    return d;
  }
  async function openMerge(){
    if(busy)return;
    const d=ensureDialog(),box=d.querySelector('#staffSafeMergeContent');candidate=null;
    if(!d.open)d.showModal();
    box.innerHTML='<p>正在只读查询 Staff Cloud 版本…</p>';
    if(!window.CassolaCloud?.connected?.()||window.CassolaCloud.role?.()!=='supervisor'){
      box.innerHTML='<p>需要 Supervisor Cloud 会话；请先登录 Access。不会使用任何替换下载。</p>';return;
    }
    busy=true;
    try{
      const data=await window.CassolaCloud.staffLegacyVersions();
      box.innerHTML='<p class="staff-merge-note">选择包含目标员工的旧版本。预览前不写任何数据；所有版本都属于旧共享 Staff，不能靠版本名称判断部门。</p>'+
        (data.versions||[]).map(v=>'<div class="staff-merge-version"><div><b>'+esc(new Date(v.created_at).toLocaleString('zh-CN'))+'</b><small>'+esc(v.note||'历史快照')+' · '+esc(String(v.id).slice(0,8))+(v.id===data.headVersionId?' · 当前 Head':'')+'</small></div><button class="btn secondary" type="button" data-merge-version="'+esc(v.id)+'">查看人员</button></div>').join('')+
        '<p class="staff-merge-note">不会调用 restore_version，也不会修改 Cloud Head。</p>';
    }catch(e){box.textContent='读取失败：'+(e?.message||e)}
    finally{busy=false}
  }
  async function previewVersion(id){
    if(busy)return;busy=true;
    const box=document.getElementById('staffSafeMergeContent');box.textContent='正在读取该历史版本…';
    try{
      const data=await window.CassolaCloud.staffLegacyVersionState(id);
      const source=data.state,people=source.people||[],localPeople=legacy().people||[],root=read();
      if(!people.length||people.length>250)throw new Error('人数不符合安全导入要求');
      const localIds=new Set(localPeople.map(p=>String(p.id)));
      const conflict=people.filter(p=>localIds.has(String(p.id))||Boolean(root.directory?.[String(p.id)]&&root.directory[String(p.id)].name!==p.name));
      const existingSet=new Set(Object.values(root.departments).flatMap(d=>(d?.people||[]).map(p=>String(p.id))));
      const already=people.filter(p=>existingSet.has(String(p.id))).length;
      candidate={versionId:id,state:source,people:CLONE(people),conflicts:conflict,already};
      const roles=new Map((source.roles||[]).map(r=>[String(r.id),String(r.name||r.id)]));
      box.innerHTML='<div class="staff-merge-alert">🔍 本次仅做本机分部门导入。Sushi 原人员与周休不会删除。</div>'+
        '<p><b>历史版本：</b>'+esc(new Date(data.version.created_at).toLocaleString('zh-CN'))+' · 共 '+people.length+' 人</p>'+
        '<label>确认这组人员所属部门<select id="staffMergeTarget"><option value="">请选择部门（必选）</option><option value="sushi">🍣 Sushi</option><option value="sala">🍷 Bar/Sala</option><option value="cucina">🍳 Cucina</option></select></label>'+
        '<div class="staff-merge-people">'+people.map(p=>'<div><b>'+esc(p.name)+'</b><small>原标记：'+esc(roles.get(String(p.primaryRole))||p.primaryRole||'未设')+'</small></div>').join('')+'</div>'+
        '<p class="staff-merge-note">与本机人员 ID 相同：'+conflict.length+'；已在其他本机分区的人员：'+already+'。Sala 的旧岗位标签只当作端菜区域，不授予 Sushi / Cucina 的厨房权限。</p>'+
        '<button type="button" class="btn primary large" data-merge-apply '+(conflict.length||already?'disabled':'')+'>确认后导入本机分区（保留旧账）</button>';
      if(conflict.length||already)box.innerHTML+='<p class="staff-merge-error">⚠️ 存在人员 ID 重叠，已停止自动合并；需要人工人员映射，不能简单复制。</p>';
    }catch(e){box.textContent='预览失败：'+(e?.message||e)}
    finally{busy=false}
  }
  function applyCandidate(){
    if(!candidate||candidate.conflicts.length||candidate.already)return;
    const dept=document.getElementById('staffMergeTarget')?.value;
    if(!depts[dept]){alert('请先选择这组员工的真实部门');return}
    const root=read(),source=candidate.state;
    if(root.departments[dept]){alert('该部门已有本机数据，为保护现有排休，本次拒绝覆盖。请先检查来源。');return}
    const localIds=new Set((legacy().people||[]).map(p=>String(p.id)));
    if(candidate.people.some(p=>localIds.has(String(p.id))||root.directory?.[String(p.id)])){alert('人员已发生变化，请重新预览');return}
    if(!confirm('确认将 '+candidate.people.length+' 人导入 '+depts[dept]+' 的【本机独立副本】？\n\n现有 Sushi 人员、休息表、Cloud Head 都不会改变。自动保存恢复备份。'))return;
    const roles=new Map((source.roles||[]).map(r=>[String(r.id),String(r.name||r.id)]));
    const next=CLONE(root);
    next.departments[dept]={sourceVersionId:candidate.versionId,importedAt:new Date().toISOString(),people:CLONE(candidate.people),attendance:CLONE(source.attendance||{}),weekPublications:CLONE(source.weekPublications||{}),schedules:CLONE(source.schedules||{}),swaps:CLONE(source.swaps||[]),restMoves:CLONE(source.restMoves||[])};
    for(const p of candidate.people){
      next.directory[String(p.id)]={id:String(p.id),name:p.name,department:dept,serviceStation:dept==='sala'?(roles.get(String(p.primaryRole))||p.primaryRole||''):'',legacyPrimaryRole:p.primaryRole||'',sourceVersionId:candidate.versionId};
    }
    next.updatedAt=new Date().toISOString();
    try{saveWithBackup(next)}catch(e){alert(e.message);return}
    const activated=window.CassolaStaff?.activateImportedDepartment?.(dept)===true;
    candidate=null;ensureDialog().close();renderExtraPeople();renderDepartment(dept);
    alert('✅ 已导入 '+depts[dept]+' · '+source.people.length+' 人。'+(activated?'\n现在可切到对应部门直接编辑。':'\n若该部门已有不同的本机编辑数据，已保留原数据，请先检查并处理。')+'\n尚未上传 Cloud。');
  }
  function renderExtraPeople(){
    if(window.CassolaStaff?.departmentWorkspacesEnabled?.())return;
    const base=document.getElementById('staffPeopleList');if(!base)return;
    let el=document.getElementById('staffMergedPeoplePanel');
    if(!el){el=document.createElement('section');el.id='staffMergedPeoplePanel';base.insertAdjacentElement('afterend',el)}
    const root=read(),ds=Object.entries(root.departments).filter(([d])=>d!=='sushi');
    el.innerHTML=ds.map(([d,st])=>'<div class="staff-merge-people-panel"><h3>'+depts[d]+' · '+(st.people||[]).length+' 人 <small>本机分区 · 未上传</small></h3>'+
      (st.people||[]).map(p=>'<div class="staff-merge-people-row"><b>'+esc(p.name)+'</b><small>'+esc(d==='sala'?('负责出餐：'+(root.directory[p.id]?.serviceStation||'未设')):'本部门人员')+'</small></div>').join('')+'</div>').join('');
  }
  function renderDepartment(dept){
    if(window.CassolaStaff?.departmentWorkspacesEnabled?.())return;
    const message=document.getElementById('staffDepartmentMessage');if(!message)return;
    let work=document.getElementById('staffLocalDepartmentWeek');
    if(!work){work=document.createElement('div');work.id='staffLocalDepartmentWeek';message.insertAdjacentElement('afterend',work)}
    work.innerHTML='';work.hidden=true;
    if(dept==='sushi'){message.hidden=false;return}
    const data=read().departments?.[dept];if(!data){message.hidden=false;return}
    message.hidden=true;work.hidden=false;
    const start=week,dates=Array.from({length:7},(_,i)=>dayIso(start,i));
    work.innerHTML='<div class="staff-merge-alert">📱 '+depts[dept]+' · 本机独立分区（未云同步）。只读预览，排休编辑/发布待正式 Staff v2 权限部署。</div>'+
      '<div class="staff-merge-week-nav"><button type="button" data-dept-prev>‹ 上周</button><b>'+esc(start)+' 起</b><button type="button" data-dept-next>下周 ›</button></div>'+
      '<div class="staff-merge-week-table"><table><thead><tr><th>人员</th>'+dates.map(d=>'<th>'+d.slice(5)+'</th>').join('')+'</tr></thead><tbody>'+
      (data.people||[]).map(p=>'<tr><th>'+esc(p.name)+'</th>'+dates.map(d=>{const st=data.attendance?.[d]?.[p.id]?.status||'work';return '<td>'+({rest:'🌙',leave:'📝',swap:'🔧',absent:'❌'}[st]||'·')+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>';
    work.querySelector('[data-dept-prev]').addEventListener('click',()=>{week=dayIso(week,-7);renderDepartment(dept)});
    work.querySelector('[data-dept-next]').addEventListener('click',()=>{week=dayIso(week,7);renderDepartment(dept)});
  }
  // Pietro approved the 2026-10-12 PDF. The corresponding frozen v1 publication
  // has 8 roster rows in the exact PDF order. We store ONLY the SHA256 of
  // source person-id + name pairs and day offsets (not people's private names).
  // If local data is another roster, refuse instead of assuming an ordering.
  const VERIFIED_PDF_WEEK='2026-10-12';
  const VERIFIED_PDF_ROSTER_SHA256='e2eddcd9c6a7132c11bf2fff7cf31b35aea2ca98270730f921c37a045c4e80ea';
  const VERIFIED_PDF_REST_DAYS=[14,15,12,13,14,13,12,15];
  let pdfRecoveryBusy=false;
  async function buildVerifiedPdfRows(data){
    const publication=(data.weekPublications?.[VERIFIED_PDF_WEEK]||[]).find(p=>Number(p.version)===1);
    const frozen=publication?.snapshot?.people;
    const active=(data.people||[]).filter(p=>p.active!==false);
    if(!Array.isArray(frozen)||frozen.length!==8||active.length!==8||publication?.snapshot?.weekStart!==VERIFIED_PDF_WEEK)
      throw new Error('当前没有匹配的 10/12 Sushi v1 八人发布名册，不进行自动恢复');
    if(!globalThis.crypto?.subtle||!globalThis.TextEncoder)
      throw new Error('当前浏览器不能执行安全名册校验，请使用 HTTPS 重新打开 Piccola');
    const originals=new Map(active.map(p=>[String(p.id),p]));
    if(originals.size!==8)throw new Error('本机人员 ID 不唯一，已阻止恢复');
    for(const person of frozen){
      const local=originals.get(String(person.id));
      if(!local||local.name!==person.name)
        throw new Error('本机人员和旧发布名册不一致，已阻止自动对应');
    }
    const signature=frozen.map(p=>String(p.id)+'\u0001'+String(p.name)).join('\u0002');
    const digest=await globalThis.crypto.subtle.digest('SHA-256',new globalThis.TextEncoder().encode(signature));
    const fingerprint=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
    if(fingerprint!==VERIFIED_PDF_ROSTER_SHA256)
      throw new Error('发布名册不符合已核对的原 PDF；不会按照错误顺序恢复');
    return frozen.map((p,i)=>({personId:String(p.id),name:p.name,date:'2026-10-'+VERIFIED_PDF_REST_DAYS[i]}));
  }
  async function openRestRecovery(){
    if(pdfRecoveryBusy)return;
    pdfRecoveryBusy=true;
    const button=document.getElementById('staffPdfRestButton');
    if(button){button.disabled=true;button.textContent='⏳ 正在核对原 PDF 名册…'}
    try{
      const rows=await buildVerifiedPdfRows(legacy());
      const schedule=rows.map(r=>r.name+'：'+r.date.slice(5).replace('-','/')+' 休息').join('\n');
      if(!confirm('已与 Pietro 确认的 10/12–10/18 Sushi PDF 自动对齐八人。\n\n'+schedule+
        '\n\n确认一键恢复到【本机】？会先自动备份，不修改原发布 v1 或 Cloud。'))return;
      const result=window.CassolaStaff?.applyVerifiedRestWeek?.(rows.map(({personId,date})=>({personId,date})));
      if(!result)throw new Error('Staff 数据恢复接口尚未准备好');
      alert(result.inserted?'✅ 已自动恢复 '+result.inserted+' 条 Sushi 休息记录。原发布 v1 保留，修改仅在本机。':'✅ 本机八人的休息记录已存在，无需重复恢复。');
    }catch(err){alert('🛑 未改动排休：'+(err?.message||err))}
    finally{
      pdfRecoveryBusy=false;
      if(button){button.disabled=false;button.textContent='⚡ 一键恢复已核对周休'}
    }
  }
  function exportCombinedBackup(){
    const getJson=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}};
    const payload={
      format:'cassola-staff-all-departments-backup-v2',
      exportedAt:new Date().toISOString(),
      legacy:legacy(),
      importedSidecar:read(),
      editableDepartments:{
        sushi:legacy(),
        sala:getJson('cassola_staff_department_sala_v01'),
        cucina:getJson('cassola_staff_department_cucina_v01')
      },
      departmentCloudMeta:getJson('cassola_staff_department_cloud_meta_v01'),
      warning:'Private Staff backup with all current editable department workspaces. Avatars are not included; export each department full backup for IndexedDB avatars.'
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='cassola-staff-all-departments-'+new Date().toISOString().slice(0,10)+'.json';
    a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    alert('已生成合并 Staff 备份文件（包含旧 Sushi 工作本与本机部门副本，但不含头像）。请保存到安全位置。');
  }
  function init(){
    const parent=document.querySelector('#staff-view-settings .staff-settings-stack');
    if(parent&&!document.getElementById('staffSafeMergeCard')){
      const card=document.createElement('div');card.className='staff-settings-card';card.id='staffSafeMergeCard';
      card.innerHTML='<h3>🛡️ Staff 历史人员导入</h3><p>从冻结的旧 Staff 历史提取人员。导入会创建对应部门可编辑的本机工作副本，既不覆盖 Sushi，也不会自动上传。需要跨端同步时，使用周休页面的部门 Cloud 按钮。</p>'+
        '<div class="staff-settings-actions"><button class="btn primary" type="button" id="staffOpenSafeMerge">☁️ 历史版本安全导入</button><button class="btn secondary" type="button" id="staffExportDeptBackup">📦 备份合并数据 JSON</button></div>';
      parent.insertBefore(card,parent.firstChild);card.querySelector('#staffOpenSafeMerge').addEventListener('click',openMerge);card.querySelector('#staffExportDeptBackup').addEventListener('click',exportCombinedBackup);
    }
    const sushi=document.getElementById('staffWeekLegacyContent');
    if(sushi&&!document.getElementById('staffPdfRestButton')){
      const strip=document.createElement('div');strip.className='staff-rest-recover-banner';
      strip.innerHTML='<span>📄 10/12 Sushi PDF 已确认，可以自动核对旧 v1 名册并恢复休息日。</span><button class="btn primary" type="button" id="staffPdfRestButton">⚡ 一键恢复已核对周休</button>';
      sushi.insertBefore(strip,sushi.firstChild);strip.querySelector('button').addEventListener('click',openRestRecovery);
    }
    renderExtraPeople();
  }
  window.CassolaStaffDepartments={init,renderExtraPeople,renderDepartment,openMerge,read};
})();

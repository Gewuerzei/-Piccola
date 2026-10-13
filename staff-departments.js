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
    candidate=null;ensureDialog().close();renderExtraPeople();renderDepartment(dept);
    alert('✅ 已导入 '+depts[dept]+' · '+source.people.length+' 人至本机独立分区。\n\nSushi 原数据完全未动；尚未上传 Cloud。');
  }
  function renderExtraPeople(){
    const base=document.getElementById('staffPeopleList');if(!base)return;
    let el=document.getElementById('staffMergedPeoplePanel');
    if(!el){el=document.createElement('section');el.id='staffMergedPeoplePanel';base.insertAdjacentElement('afterend',el)}
    const root=read(),ds=Object.entries(root.departments).filter(([d])=>d!=='sushi');
    el.innerHTML=ds.map(([d,st])=>'<div class="staff-merge-people-panel"><h3>'+depts[d]+' · '+(st.people||[]).length+' 人 <small>本机分区 · 未上传</small></h3>'+
      (st.people||[]).map(p=>'<div class="staff-merge-people-row"><b>'+esc(p.name)+'</b><small>'+esc(d==='sala'?('负责出餐：'+(root.directory[p.id]?.serviceStation||'未设')):'本部门人员')+'</small></div>').join('')+'</div>').join('');
  }
  function renderDepartment(dept){
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
  function openRestRecovery(){
    const people=(legacy().people||[]).filter(p=>p.active!==false);
    if(people.length!==8){alert('此工具只适用于 Pietro 已核对的 2026-10-12 Sushi 八人 PDF。当前人员数不匹配，已阻止恢复。');return}
    let d=document.getElementById('staffPdfRestDialog');
    if(!d){
      d=document.createElement('dialog');d.id='staffPdfRestDialog';d.className='staff-dialog staff-safe-merge-dialog';
      d.innerHTML='<div class="dialog-head"><div><div class="eyebrow">PDF WEEK RECOVERY</div><h3>🛟 恢复 10/12–10/18 Sushi 周休</h3></div><button type="button" class="icon-btn" data-rest-close>✕</button></div><div id="staffPdfRestContent"></div>';
      document.body.appendChild(d);
      d.addEventListener('click',ev=>{
        if(ev.target.closest('[data-rest-close]'))d.close();
        if(ev.target.closest('[data-rest-apply]'))applyRestSelection();
      });
    }
    const rows=people.map(p=>{
      let existing='';
      for(let i=12;i<=18;i++)if(legacy().attendance?.['2026-10-'+i]?.[p.id]?.status==='rest')existing='2026-10-'+i;
      return '<label class="staff-rest-row"><b>'+esc(p.name)+'</b><select data-rest-person="'+esc(p.id)+'"><option value="">选择 PDF 上的休息日</option>'+
      Array.from({length:7},(_,i)=>{const day=12+i,v='2026-10-'+day;return '<option value="'+v+'" '+(existing===v?'selected':'')+'>周'+['一','二','三','四','五','六','日'][i]+' 10/'+day+'</option>'}).join('')+'</select></label>';
    });
    d.querySelector('#staffPdfRestContent').innerHTML='<p class="staff-merge-alert">原 Cloud v1 只保存了发布记录，没有休息单元格。请按已确认的 PDF 为每人选择休息日。恢复前自动备份，保存后会显示为与旧 v1 不一致，可再发布新版。</p>'+
      '<div class="staff-rest-rows">'+rows.join('')+'</div>'+
      '<p class="staff-merge-note">仅写本机 Sushi 2026-10-12 当周，不修改 Sala、Cloud Head 或原始发布 v1；发现与现有记录冲突会停止。</p>'+
      '<button class="btn primary large" type="button" data-rest-apply>核对 8 人后恢复本机周休</button>';
    if(!d.open)d.showModal();
  }
  function applyRestSelection(){
    const rows=[...document.querySelectorAll('[data-rest-person]')].map(el=>({personId:el.dataset.restPerson,date:el.value}));
    if(rows.length!==8||rows.some(x=>!x.date)){alert('请对照 PDF 为每位员工选择休息日（共 8 人）。尚未写入任何记录。');return}
    const source=legacy(),names=new Map((source.people||[]).map(p=>[p.id,p.name]));
    const lines=rows.map(row=>(names.get(row.personId)||'未知人员')+'：'+row.date).join('\n');
    if(!confirm('请最后对照 10/12 周原 PDF 核实：\n\n'+lines+'\n\n确认创建本机备份并恢复以上休息日？原已发布 v1 不变。'))return;
    try{
      const done=window.CassolaStaff?.applyVerifiedRestWeek?.(rows);
      if(!done)throw new Error('Staff 恢复接口不可用');
      document.getElementById('staffPdfRestDialog')?.close();
      alert(done.inserted?'✅ 已恢复 '+done.inserted+' 条本机 Sushi 休息记录。原 v1 未改写；请核实并重新发布新版。':'本机已包含这些休息记录，无需重复恢复。');
    }catch(e){alert('🛑 已阻止恢复：'+(e?.message||e))}
  }
  function init(){
    const parent=document.querySelector('#staff-view-settings .staff-settings-stack');
    if(parent&&!document.getElementById('staffSafeMergeCard')){
      const card=document.createElement('div');card.className='staff-settings-card';card.id='staffSafeMergeCard';
      card.innerHTML='<h3>🛡️ Staff 跨部门安全合并</h3><p>从 Cloud 历史版本只读提取人员，预览后导入独立本机部门副本。不会用「替换下载」，不会清空 Sushi 排休。部门 Cloud 正式分区尚未上线。</p>'+
        '<div class="staff-settings-actions"><button class="btn primary" type="button" id="staffOpenSafeMerge">☁️ 历史版本安全导入</button></div>';
      parent.insertBefore(card,parent.firstChild);card.querySelector('button').addEventListener('click',openMerge);
    }
    const sushi=document.getElementById('staffWeekLegacyContent');
    if(sushi&&!document.getElementById('staffPdfRestButton')){
      const strip=document.createElement('div');strip.className='staff-rest-recover-banner';
      strip.innerHTML='<span>📄 10/12 Sushi 旧 PDF 已核对，但旧 v1 没有保存休息单元格。</span><button class="btn secondary" type="button" id="staffPdfRestButton">🛟 从 PDF 恢复周休</button>';
      sushi.insertBefore(strip,sushi.firstChild);strip.querySelector('button').addEventListener('click',openRestRecovery);
    }
    renderExtraPeople();
  }
  window.CassolaStaffDepartments={init,renderExtraPeople,renderDepartment,openMerge,read};
})();

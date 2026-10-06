/* Cassola Employee Tools v0.2 · SKU proposals + loss / conversion facts */
(function(){
  const UNITS=['个','颗','包','盒','袋','箱','瓶','罐','kg','g','L','ml','份','把','托','件'];
  const EMPLOYEE_CONVERSION_TARGETS={
    avocado_hard:['avocado_half','avocado_soft'],
    avocado_half:['avocado_soft'],
    mango_hard:['mango_soft']
  };

  function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'')}
  function today(){
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  }
  function session(){return window.CassolaHub?.session?.()||null}
  function catalog(){
    const current=session(),cloud=window.CassolaCloud?.employeeCatalog?.(current?.id);
    if(Array.isArray(cloud))return cloud;
    return typeof v3Skus==='function'?v3Skus():((typeof state!=='undefined'&&Array.isArray(state.skus))?state.skus:[]);
  }
  function findSku(id){return catalog().find(x=>String(x.id)===String(id))||null}
  function unitOptions(){return UNITS.map(x=>'<option value="'+esc(x)+'"></option>').join('')}
  function ensureDialogs(){
    if(!document.getElementById('employeeSkuDetailDialog')){
      const d=document.createElement('dialog');d.id='employeeSkuDetailDialog';d.className='employee-tool-dialog';
      d.innerHTML=`
        <form method="dialog" id="employeeSkuDetailForm">
          <div class="dialog-head">
            <div><div class="eyebrow">SKU DETAIL</div><h3 id="employeeSkuDetailTitle">SKU 详情</h3></div>
            <button value="cancel" formnovalidate class="icon-btn">✕</button>
          </div>
          <input type="hidden" id="employeeSkuDetailId" />
          <div id="employeeSkuCurrent" class="employee-standard-card"></div>
          <datalist id="employeeUnitOptions">${unitOptions()}</datalist>
          <div class="employee-movement-card">
            <strong>📉 今日库存变动</strong>
            <small>和今日盘货一起上传。Supervisor 采用后写入报损 / 内部转换历史；这里不会单独修改正式库存数量。</small>
            <div class="employee-movement-grid">
              <div class="employee-movement-box loss">
                <b>🗑️ 报损</b>
                <label>数量<input id="employeeLossQty" type="text" inputmode="decimal" autocomplete="off" placeholder="例如 2" /></label>
                <label>原因<input id="employeeLossNote" maxlength="300" placeholder="例如 内部氧化 / 腐坏 / 发霉" /></label>
                <button type="button" class="btn danger ghost" id="employeeLossAdd">记入今日报损</button>
              </div>
              <div class="employee-movement-box transfer">
                <b>🔄 转化</b>
                <label>转成<select id="employeeTransferTarget"></select></label>
                <label>数量<input id="employeeTransferQty" type="text" inputmode="decimal" autocomplete="off" placeholder="例如 2" /></label>
                <label>备注<input id="employeeTransferNote" maxlength="300" placeholder="例如 熟化：硬 → 软" /></label>
                <button type="button" class="btn secondary" id="employeeTransferAdd">记入今日转化</button>
              </div>
            </div>
            <div id="employeeMovementDraft" class="employee-movement-draft"></div>
          </div>
          <div class="employee-proposal-card">
            <strong>🧪 现场规格 / 单位不一致</strong>
            <small>这里只提交提议，不会直接修改正式 SKU。</small>
            <div class="employee-proposal-grid">
              <label>现场规格<input id="employeeSkuSpec" maxlength="100" placeholder="例如 6kg / 箱" /></label>
              <label>库存单位<input id="employeeSkuUnit" list="employeeUnitOptions" maxlength="24" placeholder="保持原单位 / 可自定义" /></label>
              <label>订货单位<input id="employeeSkuOrderUnit" list="employeeUnitOptions" maxlength="24" placeholder="保持原单位 / 可自定义" /></label>
              <label>1 大包装 = 几个最小包装<input id="employeeSkuFactor" type="text" inputmode="decimal" autocomplete="off" placeholder="例如 10" /></label>
            </div>
            <label>备注<input id="employeeSkuNote" maxlength="300" placeholder="例如：今天到的是整箱，标签写 6kg" /></label>
            <button type="button" class="btn primary large" id="employeeSkuChangeSubmit">提交给 Supervisor</button>
          </div>
          <div class="employee-proposal-card issue">
            <strong>🚩 这个 SKU 有问题</strong>
            <label>问题描述<input id="employeeSkuIssueNote" maxlength="300" placeholder="例如：标签不清楚 / 商品不是同一个规格" /></label>
            <button type="button" class="btn secondary" id="employeeSkuIssueSubmit">只报告问题</button>
          </div>
          <button value="cancel" formnovalidate class="btn secondary large">关闭</button>
        </form>`;
      document.body.appendChild(d);
    }

    if(!document.getElementById('employeeNewSkuDialog')){
      const d=document.createElement('dialog');d.id='employeeNewSkuDialog';d.className='employee-tool-dialog';
      d.innerHTML=`
        <form method="dialog" id="employeeNewSkuForm">
          <div class="dialog-head">
            <div><div class="eyebrow">FIELD SKU PROPOSAL</div><h3>＋ 现场新 SKU</h3></div>
            <button value="cancel" formnovalidate class="icon-btn">✕</button>
          </div>
          <div class="employee-proposal-banner">🟠 新 SKU 只会进入待审核区。Supervisor 接受以后才会进入正式库存。</div>
          <datalist id="employeeNewUnitOptions">${unitOptions()}</datalist>
          <label>名称<input id="employeeNewName" maxlength="80" required placeholder="例如 硬芒果" /></label>
          <div class="employee-proposal-grid">
            <label>规格<input id="employeeNewSpec" maxlength="100" placeholder="例如 6kg / 箱" /></label>
            <label>库存单位<input id="employeeNewUnit" list="employeeNewUnitOptions" maxlength="24" required placeholder="个 / 包 / 箱 / 其他" /></label>
            <label>订货单位<input id="employeeNewOrderUnit" list="employeeNewUnitOptions" maxlength="24" placeholder="与库存单位相同" /></label>
            <label>1 大包装 = 几个最小包装<input id="employeeNewFactor" type="text" inputmode="decimal" autocomplete="off" value="1" /></label>
          </div>
          <div class="employee-proposal-grid">
            <label>区域<select id="employeeNewArea"><option value="sushi">🍣 Sushi</option><option value="cucina">🔪 Cucina</option><option value="bar">🍸 Bar / Sala</option><option value="common">📦 Comune</option></select></label>
            <label>现场数量<input id="employeeNewQty" type="text" inputmode="decimal" autocomplete="off" placeholder="可空" /></label>
          </div>
          <label>备注<input id="employeeNewNote" maxlength="300" placeholder="为什么现有列表里没有它？" /></label>
          <button type="button" class="btn primary large" id="employeeNewSkuSubmit">提交新 SKU 提议</button>
          <button value="cancel" formnovalidate class="btn secondary large">取消</button>
        </form>`;
      document.body.appendChild(d);
    }

    if(!document.getElementById('employeeProposalReviewDialog')){
      const d=document.createElement('dialog');d.id='employeeProposalReviewDialog';d.className='employee-tool-dialog supervisor-proposal-dialog';
      d.innerHTML=`
        <form method="dialog">
          <div class="dialog-head">
            <div><div class="eyebrow">SKU PROPOSALS</div><h3>🧪 员工 SKU 提议</h3></div>
            <button value="cancel" formnovalidate class="icon-btn">✕</button>
          </div>
          <div id="employeeProposalReviewList" class="employee-proposal-review-list"></div>
          <button value="cancel" formnovalidate class="btn secondary large">关闭</button>
        </form>`;
      document.body.appendChild(d);
    }
  }

  async function submitOrQueue(proposal){
    if(window.CassolaCloud?.connected?.()){
      try{
        await window.CassolaCloud.submitSkuProposal(proposal);
        return{queued:false};
      }catch(err){
        if(navigator.onLine&&err?.status&&err.status<500)throw err;
      }
    }
    window.CassolaCloud?.queueSkuProposal?.(proposal);
    if(typeof showToast==='function')showToast('📵 SKU 提议已保存待发送');
    return{queued:true};
  }

  function openDetail(id){
    ensureDialogs();
    const sku=findSku(id);if(!sku){alert('找不到这个 SKU。');return}
    document.getElementById('employeeSkuDetailId').value=sku.id;
    document.getElementById('employeeSkuDetailTitle').textContent=sku.name||'SKU 详情';
    document.getElementById('employeeSkuCurrent').innerHTML=
      '<div><span>正式规格</span><b>'+esc(sku.spec||'未填写')+'</b></div>'+
      '<div><span>库存单位</span><b>'+esc(sku.unit||'未填写')+'</b></div>'+
      '<div><span>订货包装</span><b>'+esc(sku.orderUnit||sku.unit||'未填写')+(Number(sku.unitsPerOrder)>1?' · 1='+esc(sku.unitsPerOrder):'')+'</b></div>';
    document.getElementById('employeeSkuSpec').value='';
    document.getElementById('employeeSkuUnit').value='';
    document.getElementById('employeeSkuOrderUnit').value='';
    document.getElementById('employeeSkuFactor').value='';
    document.getElementById('employeeSkuNote').value='';
    document.getElementById('employeeSkuIssueNote').value='';
    document.getElementById('employeeLossQty').value='';
    document.getElementById('employeeLossNote').value='';
    document.getElementById('employeeTransferQty').value='';
    document.getElementById('employeeTransferNote').value='';
    const configured=Array.isArray(sku.conversionTargets)&&sku.conversionTargets.length?sku.conversionTargets:EMPLOYEE_CONVERSION_TARGETS[String(sku.id)]||[];
    const allowedIds=new Set(configured.map(String));
    const targets=catalog().filter(x=>allowedIds.has(String(x.id))&&String(x.unit||'')===String(sku.unit||''));
    const targetSelect=document.getElementById('employeeTransferTarget');
    targetSelect.innerHTML=targets.length?targets.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' · '+esc(x.unit||'')+'</option>').join(''):'<option value="">没有同单位可转化 SKU</option>';
    const preferred={avocado_hard:'avocado_soft',avocado_half:'avocado_soft',mango_hard:'mango_soft'}[String(sku.id)];
    if(preferred&&targets.some(x=>String(x.id)===preferred))targetSelect.value=preferred;
    targetSelect.disabled=!targets.length;
    document.getElementById('employeeTransferAdd').disabled=!targets.length;
    renderMovementDraft();
    document.getElementById('employeeSkuDetailDialog').showModal();
  }

  function parseMovementQty(id){
    const raw=document.getElementById(id)?.value||'';
    const n=typeof parseLocaleDecimal==='function'?parseLocaleDecimal(raw):Number(String(raw).replace(',','.'));
    return Number.isFinite(n)?n:NaN;
  }
  function movementSku(){return findSku(document.getElementById('employeeSkuDetailId')?.value)}
  function renderMovementDraft(){
    const root=document.getElementById('employeeMovementDraft');if(!root)return;
    const source=movementSku();if(!source){root.innerHTML='';return}
    const events=window.CassolaHub?.employeeEventsForSku?.(source.id)||[];
    root.innerHTML=events.length?'<div class="employee-movement-title">今日已记录 '+events.length+' 条</div>'+events.map(e=>{
      const target=e.targetId?findSku(e.targetId):null;
      const label=e.type==='loss'
        ?('🗑️ 报损 '+esc(e.qty)+' '+esc(source.unit||''))
        :('🔄 '+esc(source.name)+' → '+esc(target?.name||e.targetId||'目标')+' · '+esc(e.qty)+' '+esc(source.unit||''));
      return '<div class="employee-movement-item"><div><b>'+label+'</b>'+(e.note?'<small>'+esc(e.note)+'</small>':'')+'</div><button type="button" data-employee-event-remove="'+esc(e.id)+'">✕</button></div>';
    }).join(''):'<div class="employee-movement-empty">今天还没有报损 / 转化记录。</div>';
  }
  function addLossEvent(){
    const source=movementSku();if(!source)return;
    const qty=parseMovementQty('employeeLossQty'),note=document.getElementById('employeeLossNote').value.trim();
    if(!(qty>0)){if(typeof showToast==='function')showToast('报损数量要大于 0');return}
    if(!note){if(typeof showToast==='function')showToast('写一下报损原因');return}
    window.CassolaHub?.addEmployeeEvent?.({type:'loss',skuId:source.id,qty,note});
    document.getElementById('employeeLossQty').value='';
    document.getElementById('employeeLossNote').value='';
    renderMovementDraft();window.CassolaHub?.refreshEmployee?.();
    if(typeof showToast==='function')showToast('🗑️ 已记入今日报损');
  }
  function addTransferEvent(){
    const source=movementSku();if(!source)return;
    const targetId=document.getElementById('employeeTransferTarget').value,target=findSku(targetId);
    const qty=parseMovementQty('employeeTransferQty'),note=document.getElementById('employeeTransferNote').value.trim();
    if(!target){if(typeof showToast==='function')showToast('先选择转化目标');return}
    if(String(target.unit||'')!==String(source.unit||'')){if(typeof showToast==='function')showToast('转化目标必须和来源使用同一库存单位');return}
    if(!(qty>0)){if(typeof showToast==='function')showToast('转化数量要大于 0');return}
    window.CassolaHub?.addEmployeeEvent?.({type:'transfer',skuId:source.id,targetId:target.id,qty,note});
    document.getElementById('employeeTransferQty').value='';
    document.getElementById('employeeTransferNote').value='';
    renderMovementDraft();window.CassolaHub?.refreshEmployee?.();
    if(typeof showToast==='function')showToast('🔄 已记入今日转化');
  }
  function removeMovementEvent(id){
    if(window.CassolaHub?.removeEmployeeEvent?.(id)){
      renderMovementDraft();window.CassolaHub?.refreshEmployee?.();
      if(typeof showToast==='function')showToast('已移除这条今日变动');
    }
  }

  async function submitChange(){
    const sku=findSku(document.getElementById('employeeSkuDetailId').value);if(!sku)return;
    const proposed={
      name:sku.name||'',
      spec:document.getElementById('employeeSkuSpec').value.trim(),
      unit:document.getElementById('employeeSkuUnit').value,
      orderUnit:document.getElementById('employeeSkuOrderUnit').value,
      unitsPerOrder:parseFloat(String(document.getElementById('employeeSkuFactor').value||'').replace(',','.'))||0
    };
    if(!proposed.spec&&!proposed.unit&&!proposed.orderUnit&&!proposed.unitsPerOrder){
      if(typeof showToast==='function')showToast('先填写一个现场变化');return;
    }
    const p={
      proposalId:crypto.randomUUID?.()||String(Date.now()+Math.random()),
      proposalType:'sku_change',
      skuId:sku.id,
      businessDate:today(),
      proposed,
      note:document.getElementById('employeeSkuNote').value.trim()
    };
    try{
      const r=await submitOrQueue(p);
      document.getElementById('employeeSkuDetailDialog').close();
      if(!r.queued&&typeof showToast==='function')showToast('🧪 已交给 Supervisor 审核');
    }catch(err){alert('提交失败：'+(err?.data?.detail||err?.message||'未知错误'))}
  }

  async function submitIssue(){
    const sku=findSku(document.getElementById('employeeSkuDetailId').value);if(!sku)return;
    const note=document.getElementById('employeeSkuIssueNote').value.trim();
    if(!note){if(typeof showToast==='function')showToast('写一下哪里不对');return}
    const p={
      proposalId:crypto.randomUUID?.()||String(Date.now()+Math.random()),
      proposalType:'sku_issue',
      skuId:sku.id,
      businessDate:today(),
      proposed:{},
      note
    };
    try{
      const r=await submitOrQueue(p);
      document.getElementById('employeeSkuDetailDialog').close();
      if(!r.queued&&typeof showToast==='function')showToast('🚩 问题已报告');
    }catch(err){alert('提交失败：'+(err?.data?.detail||err?.message||'未知错误'))}
  }

  function openNewSku(){
    ensureDialogs();
    ['employeeNewName','employeeNewSpec','employeeNewQty','employeeNewNote'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('employeeNewUnit').value='';
    document.getElementById('employeeNewOrderUnit').value='';
    document.getElementById('employeeNewFactor').value='1';
    document.getElementById('employeeNewArea').value='sushi';
    document.getElementById('employeeNewSkuDialog').showModal();
  }

  async function submitNewSku(){
    const name=document.getElementById('employeeNewName').value.trim();
    const unit=document.getElementById('employeeNewUnit').value;
    if(!name||!unit){if(typeof showToast==='function')showToast('名称和库存单位必须填');return}
    const sessionNow=session(),scope=sessionNow?.scope||{};
    const qtyRaw=document.getElementById('employeeNewQty').value.trim();
    const qty=qtyRaw===''?null:Number(qtyRaw.replace(',','.'));
    if(qty!==null&&(!Number.isFinite(qty)||qty<0)){if(typeof showToast==='function')showToast('现场数量不对');return}
    const p={
      proposalId:crypto.randomUUID?.()||String(Date.now()+Math.random()),
      proposalType:'new_sku',
      businessDate:today(),
      proposed:{
        name,
        spec:document.getElementById('employeeNewSpec').value.trim(),
        unit,
        orderUnit:document.getElementById('employeeNewOrderUnit').value||unit,
        unitsPerOrder:Number(String(document.getElementById('employeeNewFactor').value||'1').replace(',','.'))||1,
        area:document.getElementById('employeeNewArea').value,
        category:scope.kind==='category'?scope.value:''
      },
      qty,
      note:document.getElementById('employeeNewNote').value.trim()
    };
    try{
      const r=await submitOrQueue(p);
      document.getElementById('employeeNewSkuDialog').close();
      if(!r.queued&&typeof showToast==='function')showToast('🧪 新 SKU 已进入待审核');
    }catch(err){alert('提交失败：'+(err?.data?.detail||err?.message||'未知错误'))}
  }

  function proposalTypeLabel(type){
    if(type==='new_sku')return'＋ 新 SKU';
    if(type==='sku_change')return'🧪 规格 / 单位';
    return'🚩 SKU 问题';
  }
  function proposalSummary(p){
    const x=p.proposed||{};
    if(p.proposal_type==='new_sku')return [x.name,x.spec,x.unit,x.area].filter(Boolean).join(' · ');
    if(p.proposal_type==='sku_change')return [
      x.spec?('规格 '+x.spec):'',
      x.unit?('库存单位 '+x.unit):'',
      x.orderUnit?('订货单位 '+x.orderUnit):'',
      Number(x.unitsPerOrder)>1?('1='+x.unitsPerOrder):''
    ].filter(Boolean).join(' · ');
    return p.note||'只报告问题';
  }

  async function openReview(){
    ensureDialogs();
    const dlg=document.getElementById('employeeProposalReviewDialog'),list=document.getElementById('employeeProposalReviewList');
    list.innerHTML='<div class="cloud-loading">正在读取员工 SKU 提议…</div>';dlg.showModal();
    try{
      const data=await window.CassolaCloud.listSkuProposals(['pending']);
      const rows=data.proposals||[];
      dlg._proposals=rows;
      list.innerHTML=rows.length?rows.map(p=>`
        <article class="employee-review-card">
          <div class="employee-review-top">
            <div><strong>${esc(proposalTypeLabel(p.proposal_type))} · ${esc(p.current_snapshot?.name||p.proposed?.name||p.sku_id||'SKU')}</strong><small>负责人：${esc(p.display_name||p.credential_id)} · ${esc(p.business_date)}</small></div>
            <span>待审核</span>
          </div>
          ${p.current_snapshot?'<div class="employee-review-current">当前：'+esc(p.current_snapshot.spec||'无规格')+' · '+esc(p.current_snapshot.unit||'')+'</div>':''}
          <div class="employee-review-proposed">提议：<b>${esc(proposalSummary(p))}</b></div>
          ${p.qty!==null&&p.qty!==undefined?'<div class="employee-review-qty">现场数量：<b>'+esc(p.qty)+' '+esc(p.proposed?.unit||'')+'</b></div>':''}
          ${p.note?'<p>'+esc(p.note)+'</p>':''}
          <div class="employee-review-actions">
            <button type="button" class="btn primary" data-proposal-accept="${esc(p.id)}">${p.proposal_type==='sku_issue'?'✓ 标记已处理':'✓ 采用到本机'}</button>
            <button type="button" class="btn danger ghost" data-proposal-reject="${esc(p.id)}">拒绝 · 重新盘点 🗿</button>
          </div>
        </article>`).join(''):'<div class="empty">没有待审核 SKU 提议。</div>';
    }catch(err){list.innerHTML='<div class="empty">读取失败：'+esc(err?.message||'未知错误')+'</div>'}
  }

  function localSku(id){return (state.skus||[]).find(x=>String(x.id)===String(id))||null}
  function applyProposalLocal(p){
    if(p.proposal_type==='sku_issue')return{changed:false,message:'问题已标记处理'};
    const proposed=p.proposed||{};
    if(p.proposal_type==='sku_change'){
      const s=localSku(p.sku_id);if(!s)throw new Error('本机找不到这个 SKU，请先下载对应区域云端');
      const changed=[];
      ['spec','unit','orderUnit'].forEach(k=>{
        const v=String(proposed[k]??'').trim();
        if(v&&String(s[k]??'')!==v){changed.push(k);s[k]=v}
      });
      const factor=Number(proposed.unitsPerOrder);
      if(factor>0&&Number(s.unitsPerOrder||1)!==factor){s.unitsPerOrder=factor;changed.push('unitsPerOrder')}
      if(typeof v3NormalizeSku==='function')v3NormalizeSku(s);
      if(changed.length&&typeof addHistory==='function')addHistory('adjust',s.id,'规格 / 单位已更新','员工 SKU 提议 · '+(p.display_name||p.credential_id),{employeeSkuProposalId:p.proposal_id});
      if(typeof saveState==='function')saveState();
      if(typeof renderAll==='function')renderAll();
      return{changed:!!changed.length,message:changed.length?'已采用规格 / 单位提议':'本机已经是这个规格'};
    }
    if(p.proposal_type==='new_sku'){
      const already=(state.skus||[]).find(s=>String(s.employeeSkuProposalId||'')===String(p.proposal_id||''));
      if(already)return{changed:false,message:'这份新 SKU 提议已写入本机'};
      const duplicate=(state.skus||[]).find(s=>String(s.name||'').trim().toLowerCase()===String(proposed.name||'').trim().toLowerCase()&&String(s.spec||'')===String(proposed.spec||''));
      if(duplicate&&!confirm('本机已经有同名同规格 SKU：'+duplicate.name+'\n仍然新建？'))throw new Error('cancelled');
      const id='employee-'+(crypto.randomUUID?.()||String(Date.now()+Math.random()));
      let s={
        id,name:String(proposed.name||'新 SKU'),icon:'📦',spec:String(proposed.spec||''),unit:String(proposed.unit||'个'),
        orderUnit:String(proposed.orderUnit||proposed.unit||'个'),unitsPerOrder:Number(proposed.unitsPerOrder)>0?Number(proposed.unitsPerOrder):1,
        category:String(proposed.category||p.scope_definition?.value||'待确认'),supplier:'待确认',area:String(proposed.area||'sushi'),
        qty:Number(p.qty)||0,warningMode:'auto',manualWeeklyUse:null,targetWeeks:2,targetQty:null,autoOrder:false,
        employeeSkuProposalId:p.proposal_id||''
      };
      if(typeof v3NormalizeSku==='function')s=v3NormalizeSku(s);
      state.skus.push(s);
      if(Number(s.qty)>0&&typeof addHistory==='function')addHistory('count',s.id,'0 → '+fmt(s.qty)+' '+s.unit,'员工新 SKU 提议 · '+(p.display_name||p.credential_id),{employeeSkuProposalId:p.proposal_id});
      if(typeof saveState==='function')saveState();
      if(typeof renderAll==='function')renderAll();
      return{changed:true,message:'已新建 SKU · 供应商保持待确认'};
    }
    throw new Error('unknown_proposal_type');
  }

  async function acceptProposal(id){
    const dlg=document.getElementById('employeeProposalReviewDialog');
    const p=(dlg?._proposals||[]).find(x=>String(x.id)===String(id));if(!p)return;
    if(!confirm((p.proposal_type==='sku_issue'?'标记这个问题已处理？':'采用这份员工 SKU 提议到本机 Inventory？')+'\n\n采用后仍需由 Supervisor 自己上传 Cloud。'))return;
    try{
      const r=applyProposalLocal(p);
      await window.CassolaCloud.reviewSkuProposal(p.id,'accepted');
      if(typeof showToast==='function')showToast('🧪 '+r.message);
      await openReview();
    }catch(err){if(err?.message!=='cancelled')alert('采用失败：'+(err?.message||'未知错误'))}
  }
  async function rejectProposal(id){
    if(!confirm('拒绝这份提议？员工需要重新确认现场情况。'))return;
    try{
      await window.CassolaCloud.reviewSkuProposal(id,'rejected');
      if(typeof showToast==='function')showToast('🗿 已拒绝，等重新盘点');
      await openReview();
    }catch(err){alert('拒绝失败：'+(err?.message||'未知错误'))}
  }

  function injectSupervisorButton(){
    const card=document.getElementById('cloudSyncCard');if(!card||card.querySelector('[data-cloud-proposals]'))return;
    const tools=card.querySelector('.cloud-actions.small');if(!tools)return;
    const b=document.createElement('button');b.type='button';b.className='btn secondary';b.dataset.cloudProposals='';
    b.innerHTML='🧪 SKU 提议 <span id="cloudProposalCount">0</span>';
    tools.insertBefore(b,tools.lastElementChild);
  }

  function enhance(){ensureDialogs()}

  document.addEventListener('click',e=>{
    const detail=e.target.closest('[data-employee-detail]');if(detail){openDetail(detail.dataset.employeeDetail);return}
    if(e.target.closest('[data-employee-new-sku]')){openNewSku();return}
    if(e.target.closest('#employeeLossAdd')){e.preventDefault();addLossEvent();return}
    if(e.target.closest('#employeeTransferAdd')){e.preventDefault();addTransferEvent();return}
    const movementRemove=e.target.closest('[data-employee-event-remove]');if(movementRemove){e.preventDefault();removeMovementEvent(movementRemove.dataset.employeeEventRemove);return}
    if(e.target.closest('#employeeSkuChangeSubmit')){e.preventDefault();submitChange();return}
    if(e.target.closest('#employeeSkuIssueSubmit')){e.preventDefault();submitIssue();return}
    if(e.target.closest('#employeeNewSkuSubmit')){e.preventDefault();submitNewSku();return}
    if(e.target.closest('[data-cloud-proposals]')){openReview();return}
    const accept=e.target.closest('[data-proposal-accept]');if(accept){acceptProposal(accept.dataset.proposalAccept);return}
    const reject=e.target.closest('[data-proposal-reject]');if(reject){rejectProposal(reject.dataset.proposalReject);return}
  });

  document.addEventListener('DOMContentLoaded',()=>{ensureDialogs();injectSupervisorButton()});
  window.addEventListener('cassola-cloud-reconnected',injectSupervisorButton);

  window.CassolaEmployeeTools={enhance,openReview,injectSupervisorButton};
})();
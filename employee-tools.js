/* Cassola Employee Tools v0.3 · SKU proposal center + loss / conversion facts */
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
    const current=session(),map=new Map();
    const add=rows=>(Array.isArray(rows)?rows:[]).forEach(x=>{if(x?.id&&!map.has(String(x.id)))map.set(String(x.id),x)});
    add(window.CassolaHub?.currentEmployeeCatalog?.());
    add(window.CassolaCloud?.employeeCatalog?.(current?.id));
    const receipts=window.CassolaCloud?.employeeReceiptTasks?.(current?.id)||[];
    receipts.forEach(t=>add((t?.order_snapshot?.items||[]).map(x=>({
      id:x.skuId,name:x.skuName||x.skuId,spec:x.spec||'',unit:x.unit||'',orderUnit:x.orderUnit||x.unit||'',
      unitsPerOrder:Number(x.unitsPerOrder)>0?Number(x.unitsPerOrder):1,area:x.area||'',supplier:t.supplier||'',category:x.category||''
    }))));
    if(map.size)return[...map.values()];
    return typeof v3Skus==='function'?v3Skus():((typeof state!=='undefined'&&Array.isArray(state.skus))?state.skus:[]);
  }
  function findSku(id){return catalog().find(x=>String(x.id)===String(id))||null}
  function proposalCatalog(){
    const current=session(),map=new Map(),add=rows=>(Array.isArray(rows)?rows:[]).forEach(x=>{if(x?.id)map.set(String(x.id),x)});
    add(window.CassolaCloud?.employeeCatalog?.(current?.id));
    (window.CassolaCloud?.employeeInventoryTasks?.(current?.id)||[]).forEach(t=>add(t.sku_snapshot||[]));
    (window.CassolaCloud?.employeeReceiptTasks?.(current?.id)||[]).forEach(t=>add((t?.order_snapshot?.items||[]).map(x=>({
      id:x.skuId,name:x.skuName||x.skuId,spec:x.spec||'',unit:x.unit||'',orderUnit:x.orderUnit||x.unit||'',
      unitsPerOrder:Number(x.unitsPerOrder)>0?Number(x.unitsPerOrder):1,area:x.area||'',supplier:t.supplier||'',category:x.category||''
    }))));
    return map.size?[...map.values()]:catalog();
  }
  function proposalCategories(){return [...new Set(proposalCatalog().map(x=>String(x.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'))}
  function proposalSuppliers(){return [...new Set(proposalCatalog().map(x=>String(x.supplier||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'))}
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
          <div class="employee-movement-card" id="employeeMovementCard">
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
            <strong>🧪 现场规格 / 包装不一致</strong>
            <small>记录现场真正看到的包装。这里只提交提议，不会直接修改正式 SKU；Supervisor 可以更新原 SKU，也可以把它新建成同商品的另一个规格 SKU。</small>
            <div class="employee-proposal-grid">
              <label>现场库存规格<input id="employeeSkuSpec" maxlength="100" placeholder="例如 500g / 1kg / 20张" /></label>
              <label>现场品牌（可选）<input id="employeeSkuBrand" maxlength="80" placeholder="例如 Kikkoman / 恒丰" /></label>
              <label>现场库存单位<input id="employeeSkuUnit" list="employeeUnitOptions" maxlength="24" placeholder="包 / 盒 / 瓶" /></label>
              <label>现场订货单位<input id="employeeSkuOrderUnit" list="employeeUnitOptions" maxlength="24" placeholder="箱 / 件；不换算时同库存单位" /></label>
              <label>换算：1 订货单位 = 几个库存单位<input id="employeeSkuFactor" type="text" inputmode="decimal" autocomplete="off" placeholder="例如 10" /></label>
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
          <datalist id="employeeCategoryOptions"></datalist>
          <datalist id="employeeSupplierOptions"></datalist>
          <label>名称<input id="employeeNewName" maxlength="80" required placeholder="例如 Ikura / Surimi" /></label>
          <div class="employee-proposal-grid">
            <label>商品卡 / 商品族<input id="employeeNewFamilyName" maxlength="80" placeholder="同商品不同规格填同一个，例如 Ikura" /></label>
            <label>品牌（可选）<input id="employeeNewBrand" maxlength="80" placeholder="例如 Kikkoman / 恒丰" /></label>
            <label>库存规格<input id="employeeNewSpec" maxlength="100" placeholder="例如 500g / 1kg / 20张" /></label>
            <label>库存单位<input id="employeeNewUnit" list="employeeNewUnitOptions" maxlength="24" required placeholder="个 / 包 / 箱 / 其他" /></label>
            <label>订货单位<input id="employeeNewOrderUnit" list="employeeNewUnitOptions" maxlength="24" placeholder="与库存单位相同" /></label>
            <label>换算：1 订货单位 = 几个库存单位<input id="employeeNewFactor" type="text" inputmode="decimal" autocomplete="off" value="1" /></label>
          </div>
          <div class="employee-proposal-grid">
            <label>分类<input id="employeeNewCategory" list="employeeCategoryOptions" maxlength="60" placeholder="例如 蔬果 / 冷冻" /></label>
            <label>供应商<input id="employeeNewSupplier" list="employeeSupplierOptions" maxlength="120" placeholder="例如 大兴 / 米兰" /></label>
            <label>区域<select id="employeeNewArea"><option value="sushi">🍣 Sushi</option><option value="cucina">🔪 Cucina</option><option value="bar">🍸 Bar / Sala</option><option value="common">📦 Comune</option></select></label>
            <label>现场数量<input id="employeeNewQty" type="text" inputmode="decimal" autocomplete="off" placeholder="可空" /></label>
          </div>
          <label>备注<input id="employeeNewNote" maxlength="300" placeholder="为什么现有列表里没有它？" /></label>
          <button type="button" class="btn primary large" id="employeeNewSkuSubmit">提交新 SKU 提议</button>
          <button value="cancel" formnovalidate class="btn secondary large">取消</button>
        </form>`;
      document.body.appendChild(d);
    }

    if(!document.getElementById('employeeNewCategoryDialog')){
      const d=document.createElement('dialog');d.id='employeeNewCategoryDialog';d.className='employee-tool-dialog';
      d.innerHTML=`
        <form method="dialog">
          <div class="dialog-head">
            <div><div class="eyebrow">CATEGORY PROPOSAL</div><h3>＋ 提议新分类</h3></div>
            <button value="cancel" formnovalidate class="icon-btn">✕</button>
          </div>
          <div class="employee-proposal-banner">🏷️ 只是提议。Supervisor 批准后才会进入正式 Inventory 分类。</div>
          <label>新分类名称<input id="employeeNewCategoryName" maxlength="60" placeholder="例如 果泥 / 冷藏甜品" /></label>
          <label>说明<input id="employeeNewCategoryNote" maxlength="300" placeholder="为什么现有分类不合适？" /></label>
          <button type="button" class="btn primary large" id="employeeNewCategorySubmit">提交分类提议</button>
          <button value="cancel" formnovalidate class="btn secondary large">取消</button>
        </form>`;
      document.body.appendChild(d);
    }

    if(!document.getElementById('employeeReclassifyDialog')){
      const d=document.createElement('dialog');d.id='employeeReclassifyDialog';d.className='employee-tool-dialog';
      d.innerHTML=`
        <form method="dialog">
          <div class="dialog-head">
            <div><div class="eyebrow">RECLASSIFY PROPOSAL</div><h3 id="employeeReclassifyTitle">🏷️ 重新归类 SKU</h3></div>
            <button value="cancel" formnovalidate class="icon-btn">✕</button>
          </div>
          <input type="hidden" id="employeeReclassifySkuId" />
          <div id="employeeReclassifyCurrent" class="employee-standard-card"></div>
          <datalist id="employeeReclassifyCategoryOptions"></datalist>
          <label>建议分类<input id="employeeReclassifyCategory" list="employeeReclassifyCategoryOptions" maxlength="60" placeholder="选择已有分类，也可以填写新分类" /></label>
          <label>说明<input id="employeeReclassifyNote" maxlength="300" placeholder="为什么要重新归类？" /></label>
          <div class="employee-proposal-banner">Supervisor 批准后才会改正式 SKU。若这是新分类，批准时会同时登记分类。</div>
          <button type="button" class="btn primary large" id="employeeReclassifySubmit">提交归类提议</button>
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

  function refreshProposalOptions(){
    const cats=proposalCategories(),sups=proposalSuppliers();
    const c1=document.getElementById('employeeCategoryOptions'),c2=document.getElementById('employeeReclassifyCategoryOptions'),sp=document.getElementById('employeeSupplierOptions');
    const catHtml=cats.map(x=>'<option value="'+esc(x)+'"></option>').join('');
    if(c1)c1.innerHTML=catHtml;if(c2)c2.innerHTML=catHtml;
    if(sp)sp.innerHTML=sups.map(x=>'<option value="'+esc(x)+'"></option>').join('');
  }
  function panelHtml(){
    const rows=proposalCatalog();
    return '<section class="employee-sku-center">'+
      '<div class="employee-sku-center-intro"><div><span class="eyebrow">SKU FIELD TOOLS</span><h2>📦 SKU 现场功能</h2><p>发现现实可以，改正式数据库不行。新 SKU / 新分类 / 重新归类都先交给 Supervisor。🗿💢</p></div></div>'+
      '<div class="employee-sku-center-actions"><button type="button" class="btn primary" data-employee-new-sku>＋ 新 SKU</button><button type="button" class="btn secondary" data-employee-new-category>🏷️ 新分类</button></div>'+
      '<div class="employee-sku-center-list">'+
        (rows.length?rows.map(x=>'<article class="employee-sku-center-row"><div><strong>'+esc(x.name||'SKU')+'</strong><small>'+esc(x.spec||'无规格')+' · '+esc(x.category||'未分类')+' · '+esc(x.supplier||'未设供应商')+'</small></div><button type="button" class="btn secondary" data-employee-reclassify="'+esc(x.id)+'">重新归类</button></article>').join(''):'<div class="empty">当前还没有可查看的正式 SKU。新 SKU 仍可以单独提议。</div>')+
      '</div>'+
      '<div class="employee-sku-center-foot">员工提交的是 proposal，不会直接创建 / 改名 / 改分类 / 改库存。Supervisor 可以看完再决定要不要收编这只 SKU。</div>'+
    '</section>';
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

  function openDetail(id,opts={}){
    ensureDialogs();
    const sku=findSku(id);if(!sku){alert('找不到这个 SKU。');return}
    document.getElementById('employeeSkuDetailId').value=sku.id;
    document.getElementById('employeeSkuDetailTitle').textContent=(opts.specOnly?'现场规格上报 · ':'')+(sku.name||'SKU 详情');
    const orderUnit=String(sku.orderUnit||sku.unit||'未填写'),stockUnit=String(sku.unit||'未填写'),factor=Number(sku.unitsPerOrder)>0?Number(sku.unitsPerOrder):1;
    document.getElementById('employeeSkuCurrent').innerHTML=
      '<div><span>库存规格</span><b>'+esc(sku.spec||'未填写')+'</b></div>'+
      '<div><span>品牌</span><b>'+esc(sku.brand||'未填写')+'</b></div>'+
      '<div><span>库存单位</span><b>'+esc(stockUnit)+'</b></div>'+
      '<div><span>订货单位 / 换算</span><b>'+esc(orderUnit)+' · 1 '+esc(orderUnit)+' = '+esc(factor)+' '+esc(stockUnit)+'</b></div>';
    document.getElementById('employeeMovementCard')?.classList.toggle('hidden',!!opts.specOnly);
    document.getElementById('employeeSkuSpec').value='';
    document.getElementById('employeeSkuBrand').value='';
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
      brand:document.getElementById('employeeSkuBrand').value.trim(),
      unit:document.getElementById('employeeSkuUnit').value,
      orderUnit:document.getElementById('employeeSkuOrderUnit').value,
      unitsPerOrder:parseFloat(String(document.getElementById('employeeSkuFactor').value||'').replace(',','.'))||0
    };
    if(!proposed.spec&&!proposed.brand&&!proposed.unit&&!proposed.orderUnit&&!proposed.unitsPerOrder){
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
    ensureDialogs();refreshProposalOptions();
    ['employeeNewName','employeeNewFamilyName','employeeNewBrand','employeeNewSpec','employeeNewQty','employeeNewNote','employeeNewCategory','employeeNewSupplier'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('employeeNewUnit').value='';
    document.getElementById('employeeNewOrderUnit').value='';
    document.getElementById('employeeNewFactor').value='1';
    const scope=session()?.scope||{};
    document.getElementById('employeeNewArea').value=scope.kind==='area'?scope.value:'sushi';
    if(scope.kind==='category')document.getElementById('employeeNewCategory').value=scope.value||'';
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
        familyName:document.getElementById('employeeNewFamilyName').value.trim(),
        brand:document.getElementById('employeeNewBrand').value.trim(),
        spec:document.getElementById('employeeNewSpec').value.trim(),
        unit,
        orderUnit:document.getElementById('employeeNewOrderUnit').value||unit,
        unitsPerOrder:Number(String(document.getElementById('employeeNewFactor').value||'1').replace(',','.'))||1,
        area:document.getElementById('employeeNewArea').value,
        category:document.getElementById('employeeNewCategory').value.trim()||(scope.kind==='category'?scope.value:''),
        supplier:document.getElementById('employeeNewSupplier').value.trim()
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

  function openNewCategory(){
    ensureDialogs();refreshProposalOptions();
    document.getElementById('employeeNewCategoryName').value='';
    document.getElementById('employeeNewCategoryNote').value='';
    document.getElementById('employeeNewCategoryDialog').showModal();
  }
  async function submitNewCategory(){
    const category=document.getElementById('employeeNewCategoryName').value.trim(),note=document.getElementById('employeeNewCategoryNote').value.trim();
    if(!category){if(typeof showToast==='function')showToast('分类名称不能为空');return}
    if(proposalCategories().includes(category)){if(typeof showToast==='function')showToast('这个分类已经存在');return}
    const p={proposalId:crypto.randomUUID?.()||String(Date.now()+Math.random()),proposalType:'new_category',businessDate:today(),proposed:{category},note};
    try{
      const r=await submitOrQueue(p);document.getElementById('employeeNewCategoryDialog').close();
      if(!r.queued&&typeof showToast==='function')showToast('🏷️ 新分类已交给 Supervisor');
    }catch(err){alert('提交失败：'+(err?.data?.detail||err?.message||'未知错误'))}
  }
  function openReclassify(id){
    ensureDialogs();refreshProposalOptions();
    const sku=proposalCatalog().find(x=>String(x.id)===String(id));if(!sku){alert('找不到这个正式 SKU。');return}
    document.getElementById('employeeReclassifySkuId').value=sku.id;
    document.getElementById('employeeReclassifyTitle').textContent='🏷️ '+(sku.name||'SKU')+' · 重新归类';
    document.getElementById('employeeReclassifyCurrent').innerHTML='<div><span>当前分类</span><b>'+esc(sku.category||'未分类')+'</b></div><div><span>供应商</span><b>'+esc(sku.supplier||'未设置')+'</b></div>';
    document.getElementById('employeeReclassifyCategory').value='';
    document.getElementById('employeeReclassifyNote').value='';
    document.getElementById('employeeReclassifyDialog').showModal();
  }
  async function submitReclassify(){
    const skuId=document.getElementById('employeeReclassifySkuId').value,sku=proposalCatalog().find(x=>String(x.id)===String(skuId));
    if(!sku)return;
    const category=document.getElementById('employeeReclassifyCategory').value.trim(),note=document.getElementById('employeeReclassifyNote').value.trim();
    if(!category){if(typeof showToast==='function')showToast('先填写建议分类');return}
    if(category===String(sku.category||'')){if(typeof showToast==='function')showToast('它现在已经是这个分类');return}
    const p={proposalId:crypto.randomUUID?.()||String(Date.now()+Math.random()),proposalType:'sku_reclassify',skuId:sku.id,businessDate:today(),proposed:{category},note};
    try{
      const r=await submitOrQueue(p);document.getElementById('employeeReclassifyDialog').close();
      if(!r.queued&&typeof showToast==='function')showToast('🏷️ 归类提议已交给 Supervisor');
    }catch(err){alert('提交失败：'+(err?.data?.detail||err?.message||'未知错误'))}
  }

  function proposalTypeLabel(type){
    if(type==='new_sku')return'＋ 新 SKU';
    if(type==='new_category')return'🏷️ 新分类';
    if(type==='sku_reclassify')return'🏷️ 重新归类';
    if(type==='sku_change')return'🧪 规格 / 单位';
    return'🚩 SKU 问题';
  }
  function proposalSummary(p){
    const x=p.proposed||{};
    if(p.proposal_type==='new_sku')return [
      x.name,
      x.familyName?('商品卡 '+x.familyName):'',
      x.brand?('品牌 '+x.brand):'',
      x.spec?('库存规格 '+x.spec):'',
      x.unit?('库存单位 '+x.unit):'',
      x.orderUnit?('订货单位 '+x.orderUnit):'',
      Number(x.unitsPerOrder)>0?('1 '+(x.orderUnit||'订货单位')+' = '+x.unitsPerOrder+' '+(x.unit||'库存单位')):'',
      x.category,x.supplier,x.area
    ].filter(Boolean).join(' · ');
    if(p.proposal_type==='new_category')return '新分类 '+(x.category||'');
    if(p.proposal_type==='sku_reclassify')return (p.current_snapshot?.category||'未分类')+' → '+(x.category||'');
    if(p.proposal_type==='sku_change')return [
      x.spec?('库存规格 '+x.spec):'',
      x.brand?('品牌 '+x.brand):'',
      x.unit?('库存单位 '+x.unit):'',
      x.orderUnit?('订货单位 '+x.orderUnit):'',
      Number(x.unitsPerOrder)>0?('1 '+(x.orderUnit||'订货单位')+' = '+x.unitsPerOrder+' '+(x.unit||'库存单位')):''
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
      list.innerHTML=rows.length?rows.map(p=>{
        const c=p.current_snapshot||null;
        const currentHtml=c
          ?'<div class="employee-review-current">当前：库存规格 '+esc(c.spec||'无规格')+
            ' · 品牌 '+esc(c.brand||'未填写')+
            ' · 库存单位 '+esc(c.unit||'')+
            ' · 订货单位 '+esc(c.orderUnit||c.unit||'')+
            ' · 1 '+esc(c.orderUnit||c.unit||'')+' = '+esc(Number(c.unitsPerOrder)>0?c.unitsPerOrder:1)+' '+esc(c.unit||'')+
            '</div>'
          :'';
        const variantBtn=p.proposal_type==='sku_change'
          ?'<button type="button" class="btn secondary" data-proposal-new-variant="'+esc(p.id)+'">＋ 新建规格 SKU</button>'
          :'';
        return '<article class="employee-review-card">'+
          '<div class="employee-review-top">'+
            '<div><strong>'+esc(proposalTypeLabel(p.proposal_type))+' · '+esc(c?.name||p.proposed?.name||p.sku_id||'SKU')+'</strong><small>负责人：'+esc(p.display_name||p.credential_id)+' · '+esc(p.business_date)+'</small></div>'+
            '<span>待审核</span>'+
          '</div>'+
          currentHtml+
          '<div class="employee-review-proposed">提议：<b>'+esc(proposalSummary(p))+'</b></div>'+
          (p.qty!==null&&p.qty!==undefined?'<div class="employee-review-qty">现场数量：<b>'+esc(p.qty)+' '+esc(p.proposed?.unit||'')+'</b></div>':'')+
          (p.note?'<p>'+esc(p.note)+'</p>':'')+
          '<div class="employee-review-actions">'+
            '<button type="button" class="btn primary" data-proposal-accept="'+esc(p.id)+'">'+(p.proposal_type==='sku_issue'?'✓ 标记已处理':p.proposal_type==='sku_change'?'✓ 更新当前 SKU':'✓ 采用到本机')+'</button>'+
            variantBtn+
            '<button type="button" class="btn danger ghost" data-proposal-reject="'+esc(p.id)+'">拒绝 · 重新盘点 🗿</button>'+
          '</div>'+
        '</article>';
      }).join(''):'<div class="empty">没有待审核 SKU 提议。</div>';
    }catch(err){list.innerHTML='<div class="empty">读取失败：'+esc(err?.message||'未知错误')+'</div>'}
  }

  function localSku(id){return (state.skus||[]).find(x=>String(x.id)===String(id))||null}
  function applyProposalLocal(p){
    if(p.proposal_type==='sku_issue')return{changed:false,message:'问题已标记处理'};
    const proposed=p.proposed||{};
    if(p.proposal_type==='sku_change'){
      const s=localSku(p.sku_id);if(!s)throw new Error('本机找不到这个 SKU，请先下载对应区域云端');
      const changed=[];
      ['spec','brand','unit','orderUnit'].forEach(k=>{
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
    if(p.proposal_type==='new_category'){
      const name=String(proposed.category||'').trim();if(!name)throw new Error('分类名称为空');
      state.customCategories=Array.isArray(state.customCategories)?state.customCategories:[];
      const existed=(typeof v3Cats==='function'?v3Cats():[]).includes(name);
      if(!state.customCategories.includes(name)&&!(typeof categories!=='undefined'&&categories.includes(name)))state.customCategories.push(name);
      if(typeof saveState==='function')saveState();
      if(typeof renderAll==='function')renderAll();
      return{changed:!existed,message:(existed?'分类已经存在 · ':'已登记分类 · ')+name};
    }
    if(p.proposal_type==='sku_reclassify'){
      const s=localSku(p.sku_id);if(!s)throw new Error('本机找不到这个 SKU，请先下载对应区域云端');
      const next=String(proposed.category||'').trim();if(!next)throw new Error('新分类为空');
      const old=String(s.category||'');if(old===next)return{changed:false,message:'本机已经是这个分类'};
      s.category=next;state.customCategories=Array.isArray(state.customCategories)?state.customCategories:[];
      if(!state.customCategories.includes(next)&&!(typeof categories!=='undefined'&&categories.includes(next)))state.customCategories.push(next);
      if(typeof addHistory==='function')addHistory('adjust',s.id,'分类 '+old+' → '+next,'员工归类提议 · '+(p.display_name||p.credential_id),{employeeSkuProposalId:p.proposal_id});
      if(typeof saveState==='function')saveState();
      if(typeof renderAll==='function')renderAll();
      return{changed:true,message:'已重新归类 · '+next};
    }
    if(p.proposal_type==='new_sku'){
      const already=(state.skus||[]).find(s=>String(s.employeeSkuProposalId||'')===String(p.proposal_id||''));
      if(already)return{changed:false,message:'这份新 SKU 提议已写入本机'};
      const duplicate=(state.skus||[]).find(s=>String(s.name||'').trim().toLowerCase()===String(proposed.name||'').trim().toLowerCase()&&String(s.spec||'')===String(proposed.spec||''));
      if(duplicate&&!confirm('本机已经有同名同规格 SKU：'+duplicate.name+'\n仍然新建？'))throw new Error('cancelled');
      const id='employee-'+(crypto.randomUUID?.()||String(Date.now()+Math.random()));
      let s={
        id,name:String(proposed.name||'新 SKU'),familyName:String(proposed.familyName||proposed.name||'新 SKU'),brand:String(proposed.brand||''),icon:'📦',spec:String(proposed.spec||''),unit:String(proposed.unit||'个'),
        orderUnit:String(proposed.orderUnit||proposed.unit||'个'),unitsPerOrder:Number(proposed.unitsPerOrder)>0?Number(proposed.unitsPerOrder):1,
        category:String(proposed.category||p.scope_definition?.value||'待确认'),supplier:String(proposed.supplier||'待确认'),area:String(proposed.area||'sushi'),
        qty:Number(p.qty)||0,warningMode:'auto',manualWeeklyUse:null,targetWeeks:2,targetQty:null,autoOrder:false,
        employeeSkuProposalId:p.proposal_id||''
      };
      if(typeof v3NormalizeSku==='function')s=v3NormalizeSku(s);
      state.customCategories=Array.isArray(state.customCategories)?state.customCategories:[];
      if(s.category&&!state.customCategories.includes(s.category)&&!(typeof categories!=='undefined'&&categories.includes(s.category)))state.customCategories.push(s.category);
      state.skus.push(s);
      if(Number(s.qty)>0&&typeof addHistory==='function')addHistory('count',s.id,'0 → '+fmt(s.qty)+' '+s.unit,'员工新 SKU 提议 · '+(p.display_name||p.credential_id),{employeeSkuProposalId:p.proposal_id});
      if(typeof saveState==='function')saveState();
      if(typeof renderAll==='function')renderAll();
      return{changed:true,message:'已新建 SKU · '+s.category+' · '+s.supplier};
    }
    throw new Error('unknown_proposal_type');
  }

  function applyProposalAsVariantLocal(p){
    if(p.proposal_type!=='sku_change')throw new Error('只有规格 / 包装提议可以新建规格 SKU');
    const current=localSku(p.sku_id);if(!current)throw new Error('本机找不到这个 SKU，请先下载对应区域云端');
    const proposed=p.proposed||{};
    const marker=String(p.proposal_id||'')+':variant';
    const already=(state.skus||[]).find(x=>String(x.employeeSkuProposalId||'')===marker);
    if(already)return{changed:false,message:'这个规格 SKU 已经建立'};
    const nextSpec=String(proposed.spec||current.spec||'').trim();
    const nextBrand=String(proposed.brand||current.brand||'').trim();
    const nextUnit=String(proposed.unit||current.unit||'').trim();
    const nextOrderUnit=String(proposed.orderUnit||current.orderUnit||nextUnit).trim()||nextUnit;
    const nextFactor=Number(proposed.unitsPerOrder)>0?Number(proposed.unitsPerOrder):(Number(current.unitsPerOrder)>0?Number(current.unitsPerOrder):1);
    const currentFamilyId=String(current.familyId||'');
    const duplicate=(state.skus||[]).find(x=>
      String(x.familyId||'')===currentFamilyId&&String(x.spec||'')===nextSpec&&String(x.brand||'')===nextBrand&&
      String(x.unit||'')===nextUnit&&String(x.orderUnit||'')===nextOrderUnit&&Number(x.unitsPerOrder||1)===nextFactor
    );
    if(duplicate&&!confirm('同一商品卡里已经有相同规格 / 品牌 SKU：'+duplicate.name+'\n仍然新建？'))throw new Error('cancelled');
    const id='employee-'+(crypto.randomUUID?.()||String(Date.now()+Math.random()));
    let row={
      ...current,id,qty:0,spec:nextSpec,brand:nextBrand,unit:nextUnit,orderUnit:nextOrderUnit,unitsPerOrder:nextFactor,
      familyName:current.familyName||current.name,
      familyId:current.familyId||(typeof v6FamilyKey==='function'?v6FamilyKey(current.familyName||current.name):''),
      warningMode:'auto',manualWeeklyUse:null,targetQty:null,employeeSkuProposalId:marker,autoOrder:false
    };
    delete row.blueAt;delete row.yellowAt;delete row.redAt;
    if(typeof v3NormalizeSku==='function')row=v3NormalizeSku(row);
    state.skus.push(row);
    if(typeof addHistory==='function')addHistory('adjust',row.id,'新建同商品规格 SKU','员工现场规格提议 · '+(p.display_name||p.credential_id),{employeeSkuProposalId:p.proposal_id,sourceSkuId:current.id});
    if(typeof saveState==='function')saveState();
    if(typeof renderAll==='function')renderAll();
    return{changed:true,message:'已新建规格 SKU · '+(row.familyName||row.name)+' · '+(row.spec||'无规格')};
  }
  async function acceptProposalAsVariant(id){
    const dlg=document.getElementById('employeeProposalReviewDialog');
    const p=(dlg?._proposals||[]).find(x=>String(x.id)===String(id));if(!p)return;
    if(!confirm('把现场包装作为“同商品的新规格 SKU”建立？\n\n原 SKU 不会被修改，新 SKU 初始库存为 0。之后可在库存卡中分别盘货。'))return;
    try{
      const result=applyProposalAsVariantLocal(p);
      await window.CassolaCloud.reviewSkuProposal(p.id,'accepted');
      if(typeof showToast==='function')showToast('🗂️ '+result.message);
      await openReview();
    }catch(err){if(err?.message!=='cancelled')alert('新建规格 SKU 失败：'+(err?.message||'未知错误'))}
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
    const specReport=e.target.closest('[data-employee-spec-report]');if(specReport){openDetail(specReport.dataset.employeeSpecReport,{specOnly:true});return}
    const detail=e.target.closest('[data-employee-detail]');if(detail){openDetail(detail.dataset.employeeDetail);return}
    if(e.target.closest('[data-employee-new-sku]')){openNewSku();return}
    if(e.target.closest('[data-employee-new-category]')){openNewCategory();return}
    const reclass=e.target.closest('[data-employee-reclassify]');if(reclass){openReclassify(reclass.dataset.employeeReclassify);return}
    if(e.target.closest('#employeeLossAdd')){e.preventDefault();addLossEvent();return}
    if(e.target.closest('#employeeTransferAdd')){e.preventDefault();addTransferEvent();return}
    const movementRemove=e.target.closest('[data-employee-event-remove]');if(movementRemove){e.preventDefault();removeMovementEvent(movementRemove.dataset.employeeEventRemove);return}
    if(e.target.closest('#employeeSkuChangeSubmit')){e.preventDefault();submitChange();return}
    if(e.target.closest('#employeeSkuIssueSubmit')){e.preventDefault();submitIssue();return}
    if(e.target.closest('#employeeNewSkuSubmit')){e.preventDefault();submitNewSku();return}
    if(e.target.closest('#employeeNewCategorySubmit')){e.preventDefault();submitNewCategory();return}
    if(e.target.closest('#employeeReclassifySubmit')){e.preventDefault();submitReclassify();return}
    if(e.target.closest('[data-cloud-proposals]')){openReview();return}
    const variant=e.target.closest('[data-proposal-new-variant]');if(variant){acceptProposalAsVariant(variant.dataset.proposalNewVariant);return}
    const accept=e.target.closest('[data-proposal-accept]');if(accept){acceptProposal(accept.dataset.proposalAccept);return}
    const reject=e.target.closest('[data-proposal-reject]');if(reject){rejectProposal(reject.dataset.proposalReject);return}
  });

  document.addEventListener('DOMContentLoaded',()=>{ensureDialogs();injectSupervisorButton()});
  window.addEventListener('cassola-cloud-reconnected',injectSupervisorButton);

  window.CassolaEmployeeTools={enhance,openReview,injectSupervisorButton,panelHtml};
})();
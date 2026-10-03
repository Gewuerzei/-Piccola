function v3OpenSku(id=''){const editing=!!id,s=editing?sku(id):{id:'',name:'',spec:'',unit:'',category:'蔬果',supplier:'大兴',qty:0,icon:'',warningMode:'auto',targetWeeks:.6,autoOrder:true};if(!s)return;v3NormalizeSku(s);document.getElementById('v3SkuTitle').textContent=editing?'编辑 SKU':'新建 SKU';document.getElementById('v3SkuId').value=s.id||'';document.getElementById('v3Name').value=s.name||'';document.getElementById('v3Spec').value=s.spec||'';document.getElementById('v3Unit').value=s.unit||'';document.getElementById('v3Category').value=s.category||'';document.getElementById('v3Supplier').value=s.supplier||'';document.getElementById('v3Icon').value=s.icon||'';document.getElementById('v3Qty').value=s.qty??0;document.getElementById('v3WarningMode').value=s.warningMode||'auto';document.getElementById('v3Blue').value=s.blueAt??'';document.getElementById('v3Yellow').value=s.yellowAt??'';document.getElementById('v3Red').value=s.redAt??'';document.getElementById('v3Weekly').value=s.manualWeeklyUse??'';document.getElementById('v3Weeks').value=s.targetWeeks??v3DefaultWeeks(s.category);document.getElementById('v3Target').value=s.targetQty??'';document.getElementById('v3AutoOrder').checked=s.autoOrder!==false;document.getElementById('v3DeleteSku').classList.toggle('hidden',!editing);v3WarningForm();document.getElementById('v3SkuDialog').showModal()}
function v3WarningForm(){document.getElementById('v3ManualThresholds').classList.toggle('hidden',document.getElementById('v3WarningMode').value!=='manual')}
function v3SaveSku(e){e.preventDefault();const id=document.getElementById('v3SkuId').value,name=document.getElementById('v3Name').value.trim(),spec=document.getElementById('v3Spec').value.trim(),unit=document.getElementById('v3Unit').value.trim(),category=document.getElementById('v3Category').value.trim(),supplier=document.getElementById('v3Supplier').value.trim(),icon=document.getElementById('v3Icon').value.trim();if(!name||!unit||!category||!supplier){showToast('名称、单位、分类、供应商要填');return}const data={name,spec,unit,category,supplier,icon,qty:Math.max(0,Number(document.getElementById('v3Qty').value)||0),warningMode:document.getElementById('v3WarningMode').value,blueAt:v3Num(document.getElementById('v3Blue').value),yellowAt:v3Num(document.getElementById('v3Yellow').value),redAt:v3Num(document.getElementById('v3Red').value),manualWeeklyUse:v3Num(document.getElementById('v3Weekly').value),targetWeeks:v3Num(document.getElementById('v3Weeks').value)??v3DefaultWeeks(category),targetQty:v3Num(document.getElementById('v3Target').value),autoOrder:document.getElementById('v3AutoOrder').checked};if(id){const s=sku(id),old=Number(s.qty);Object.assign(s,data);if(old!==data.qty)addHistory('adjust',id,`${fmt(old)} → ${fmt(data.qty)} ${unit}`,'SKU 编辑库存')}else{state.skus.push(v3NormalizeSku({id:`custom_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,...data}))}saveState();document.getElementById('v3SkuDialog').close();renderAll();showToast(id?'SKU 已更新':'SKU 已创建')}
function v3Delete(){const id=document.getElementById('v3SkuId').value,s=sku(id);if(!s||!confirm(`删除 ${s.name}？`))return;if(v3Builtins.has(id)){state.hiddenSkuIds=state.hiddenSkuIds||[];if(!state.hiddenSkuIds.includes(id))state.hiddenSkuIds.push(id)}else state.skus=state.skus.filter(x=>x.id!==id);delete state.order[id];saveState();document.getElementById('v3SkuDialog').close();renderAll();showToast('SKU 已删除')}

renderHistory=function(){
  const filter=document.getElementById('historyFilter').value||'all';
  const rows=state.history.filter(h=>filter==='all'||h.type===filter).slice().reverse().slice(0,300);
  const labels={count:'盘货',arrival:'到货',loss:'报损',transfer:'内部转换',adjust:'调整',order:'下单'};
  document.getElementById('historyList').innerHTML=rows.length?rows.map(h=>{
    const s=sku(h.skuId),target=h.targetId?sku(h.targetId):null;
    return `<article class="history-item"><div class="history-top"><div class="history-type type-${escapeHtml(h.type)}">${labels[h.type]||h.type}</div><div class="history-time">${new Date(h.at).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</div></div><div class="history-body"><span class="history-inline-icon">${v3Icon(s)}</span><span>${escapeHtml(s?.name||h.skuName||'SKU')}：${escapeHtml(h.text||'')}</span></div>${target?`<div class="history-note">→ ${v3Icon(target)} ${escapeHtml(target.name)}</div>`:''}${h.note?`<div class="history-note">${escapeHtml(h.note)}</div>`:''}</article>`;
  }).join(''):'<div class="empty">还没有历史记录</div>';
};

renderSettings=function(){document.getElementById('skuCount').textContent=v3Skus().length;checkStorage()};
renderAll=function(){renderCategoryFilter();renderStock();renderCount();renderSupplierTabs();v3RenderOrder();renderHistory();renderSettings();updateNetworkBadge()};

document.addEventListener('click',e=>{
  const edit=e.target.closest('[data-v3-edit]');if(edit){v3OpenSku(edit.dataset.v3Edit);return}
  const mode=e.target.closest('[data-v3-order-mode]');if(mode){v3OrderMode=mode.dataset.v3OrderMode;v3RenderOrder();return}
  const step=e.target.closest('[data-v3-step]');if(step){const r=step.closest('[data-v3-order]');v3Step(r.dataset.v3Order,r.dataset.v3Item,Number(step.dataset.v3Step));return}
  const miss=e.target.closest('[data-v3-missing]');if(miss){const r=miss.closest('[data-v3-order]');v3Mark(r.dataset.v3Order,r.dataset.v3Item,true);return}
  const ok=e.target.closest('[data-v3-reviewed]');if(ok){const r=ok.closest('[data-v3-order]');v3Mark(r.dataset.v3Order,r.dataset.v3Item,false);return}
  const fin=e.target.closest('[data-v3-finish]');if(fin){v3Finish(fin.dataset.v3Finish);return}
});
document.getElementById('addSkuBtn').addEventListener('click',()=>v3OpenSku());
document.getElementById('addSkuSettingsBtn').addEventListener('click',()=>v3OpenSku());
document.getElementById('v3WarningMode').addEventListener('change',v3WarningForm);
document.getElementById('v3SaveSku').addEventListener('click',v3SaveSku);
document.getElementById('v3DeleteSku').addEventListener('click',e=>{e.preventDefault();v3Delete()});
document.getElementById('v3SuggestBtn').addEventListener('click',v3Generate);
document.getElementById('v3PlaceBtn').addEventListener('click',v3Place);
document.getElementById('v3PlacedList').addEventListener('change',e=>{if(e.target.classList.contains('v3-receive-qty')){const r=e.target.closest('[data-v3-order]');v3Qty(r.dataset.v3Order,r.dataset.v3Item,e.target.value)}});
document.getElementById('searchInput').addEventListener('input',renderStock);
document.getElementById('categoryFilter').addEventListener('change',renderStock);
renderAll();

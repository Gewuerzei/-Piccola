/* Cassola Insights v0.1 · count difference review */
(function(){
  let lastSummary=null;

  function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'')}
  function signed(n){return (n>0?'+':'')+fmt(n)}
  function ensureDialog(){
    if(document.getElementById('countDiffDialog'))return;
    const d=document.createElement('dialog');d.id='countDiffDialog';d.className='count-diff-dialog';
    d.innerHTML=`
      <form method="dialog">
        <div class="dialog-head">
          <div><div class="eyebrow">COUNT REVIEW</div><h3>盘货差异</h3></div>
          <button value="cancel" formnovalidate class="icon-btn">✕</button>
        </div>
        <div id="countDiffSummary"></div>
        <div id="countDiffList" class="count-diff-list"></div>
        <div class="count-diff-actions">
          <button value="cancel" formnovalidate class="btn secondary">知道了</button>
          <button type="button" class="btn primary hidden" id="countDiffRecheck">回盘货复核</button>
        </div>
      </form>`;
    document.body.appendChild(d);
    document.getElementById('countDiffRecheck').addEventListener('click',recheckLarge);
  }

  function showCountSummary(summary){
    ensureDialog();lastSummary=summary;
    const diffs=summary?.diffs||[],large=diffs.filter(x=>x.large),same=Math.max(0,(summary?.filled||0)-(summary?.changed||0));
    document.getElementById('countDiffSummary').innerHTML=
      '<div class="count-diff-stats">'+
      '<div><span>完成</span><b>'+esc(summary?.filled||0)+'</b></div>'+
      '<div><span>有变化</span><b>'+esc(summary?.changed||0)+'</b></div>'+
      '<div class="'+(large.length?'warn':'')+'"><span>大幅变化</span><b>'+esc(large.length)+'</b></div>'+
      '</div>'+
      '<p class="count-diff-note">'+(large.length?'⚠️ 大幅变化不会阻止保存，但建议再看一眼。':'✅ 没发现需要特别复核的大幅变化。')+(same?' · '+same+' 项数量未变':'')+'</p>';

    const rows=large.length?large:diffs.slice(0,12);
    document.getElementById('countDiffList').innerHTML=rows.length?rows.map(x=>{
      const pct=x.pct==null?'':(' · '+(x.pct>0?'+':'')+x.pct.toFixed(0)+'%');
      return '<div class="count-diff-row '+(x.large?'large':'')+'"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.old)+' → '+esc(x.next)+' '+esc(x.unit)+'</small></div><b>'+esc(signed(x.delta))+esc(pct)+'</b></div>';
    }).join(''):'<div class="empty">本轮输入数量都没有变化。</div>';

    document.getElementById('countDiffRecheck').classList.toggle('hidden',!large.length);
    document.getElementById('countDiffDialog').showModal();
  }

  function recheckLarge(){
    const large=(lastSummary?.diffs||[]).filter(x=>x.large);if(!large.length)return;
    document.getElementById('countDiffDialog').close();
    if(typeof switchView==='function')switchView('count');
    setTimeout(()=>{
      large.forEach(x=>{
        const input=document.querySelector('.count-input[data-id="'+CSS.escape(String(x.skuId))+'"]');
        if(!input)return;
        input.value=x.next;
        input.closest('.count-row')?.classList.add('count-review-row');
      });
      const first=document.querySelector('.count-review-row');
      first?.scrollIntoView({behavior:'smooth',block:'center'});
      if(typeof showToast==='function')showToast('已标出需要复核的 SKU');
      setTimeout(()=>document.querySelectorAll('.count-review-row').forEach(x=>x.classList.remove('count-review-row')),8000);
    },80);
  }

  document.addEventListener('DOMContentLoaded',ensureDialog);
  window.CassolaInsights={showCountSummary};
})();
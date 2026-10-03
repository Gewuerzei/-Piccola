/* Cassola Hub · Inventory + Staff */
(function(){
  function showMode(mode){
    if(!['hub','inventory','staff'].includes(mode)) mode='hub';
    document.body.dataset.cassolaMode=mode;
    if(mode==='staff'){
      if(window.CassolaStaff) window.CassolaStaff.show();
      document.title='Cassola Staff';
    }else if(mode==='inventory'){
      if(window.CassolaStaff) window.CassolaStaff.hide();
      document.title='Cassola Inventory';
    }else{
      if(window.CassolaStaff) window.CassolaStaff.hide();
      document.title='Cassola';
    }
    window.scrollTo(0,0);
  }

  function makeHub(){
    if(document.getElementById('cassolaHub')) return;
    const hub=document.createElement('section');
    hub.id='cassolaHub';
    hub.setAttribute('aria-label','Cassola 主菜单');
    hub.innerHTML=
      '<div class="cassola-hub-shell">'+
      '<div class="cassola-hub-mark">🗿</div>'+
      '<div class="cassola-hub-head"><div class="eyebrow">PIETRO 石器时代 ERP</div><h1>Cassola</h1><p>一个入口，两套小工具。库存管东西，Staff 管人。</p></div>'+
      '<div class="cassola-module-grid">'+
      '<button class="cassola-module-card" data-cassola-open="inventory"><div><div class="cassola-module-icon">📦</div><h2>Inventory</h2><p>盘货、订货、收货、SKU、预警和历史。</p></div><div class="cassola-module-open"><span>库存系统</span><span>›</span></div></button>'+
      '<button class="cassola-module-card" data-cassola-open="staff"><div><div class="cassola-module-icon">👥</div><h2>Staff</h2><p>人员、头像、岗位、请假调休、拖拽排班和 PDF。</p></div><div class="cassola-module-open"><span>人员排班</span><span>›</span></div></button>'+
      '</div><div class="cassola-hub-foot">Offline-first · Local data · JSON handoff</div></div>';
    document.body.appendChild(hub);

    const invTop=document.querySelector('body > .topbar');
    if(invTop && !document.getElementById('cassolaHomeInventory')){
      const btn=document.createElement('button');
      btn.id='cassolaHomeInventory';
      btn.className='cassola-home-btn';
      btn.type='button';
      btn.title='返回主菜单';
      btn.setAttribute('aria-label','返回主菜单');
      btn.textContent='⌂';
      const badge=document.getElementById('offlineBadge');
      invTop.insertBefore(btn,badge||null);
      btn.addEventListener('click',function(){showMode('hub')});
    }

    hub.addEventListener('click',function(e){
      const btn=e.target.closest('[data-cassola-open]');
      if(btn) showMode(btn.dataset.cassolaOpen);
    });
  }

  document.addEventListener('DOMContentLoaded',function(){
    makeHub();
    showMode('hub');
  });

  window.CassolaHub={
    show:function(){showMode('hub')},
    openInventory:function(){showMode('inventory')},
    openStaff:function(){showMode('staff')}
  };
})();

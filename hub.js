/* Cassola Hub · module launcher + local admin PIN */
(function(){
  const ACCESS_KEY='cassola_access_v01';
  const SESSION_KEY='cassola_admin_unlocked_v01';
  const FAIL_KEY='cassola_admin_pin_fail_v01';
  const PIN_ITERATIONS=120000;
  let pendingAdminAction=null;

  function readAccess(){
    try{
      const x=JSON.parse(localStorage.getItem(ACCESS_KEY)||'null');
      return x&&x.version===1?x:{version:1};
    }catch(_){return {version:1}}
  }
  function writeAccess(x){localStorage.setItem(ACCESS_KEY,JSON.stringify(x))}
  function adminConfigured(){const x=readAccess();return !!(x.adminPin?.salt&&x.adminPin?.hash)}
  function adminUnlocked(){return sessionStorage.getItem(SESSION_KEY)==='1'}
  function setAdminUnlocked(v){
    if(v)sessionStorage.setItem(SESSION_KEY,'1');
    else sessionStorage.removeItem(SESSION_KEY);
    renderAccessState();
  }
  function bytesToB64(bytes){
    let s='';for(const b of bytes)s+=String.fromCharCode(b);
    return btoa(s);
  }
  function b64ToBytes(s){
    const raw=atob(s),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  async function derivePin(pin,salt,iterations=PIN_ITERATIONS){
    if(!crypto?.subtle)throw new Error('Web Crypto unavailable');
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256);
    return bytesToB64(new Uint8Array(bits));
  }
  async function savePin(pin){
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const hash=await derivePin(pin,salt,PIN_ITERATIONS);
    const x=readAccess(),now=new Date().toISOString();
    x.version=1;
    x.adminPin={salt:bytesToB64(salt),hash,iterations:PIN_ITERATIONS,createdAt:x.adminPin?.createdAt||now,updatedAt:now};
    writeAccess(x);
    sessionStorage.removeItem(FAIL_KEY);
    setAdminUnlocked(true);
  }
  async function verifyPin(pin){
    const x=readAccess(),p=x.adminPin;if(!p)return false;
    const got=await derivePin(pin,b64ToBytes(p.salt),Number(p.iterations)||PIN_ITERATIONS);
    return got===p.hash;
  }
  function failState(){
    try{return JSON.parse(sessionStorage.getItem(FAIL_KEY)||'null')||{count:0,until:0}}catch(_){return{count:0,until:0}}
  }
  function registerFailure(){
    const f=failState(),now=Date.now();
    f.count=(f.until>now?f.count:0)+1;
    if(f.count>=5){f.until=now+30000;f.count=0}
    sessionStorage.setItem(FAIL_KEY,JSON.stringify(f));
    return f;
  }
  function clearFailures(){sessionStorage.removeItem(FAIL_KEY)}
  function cooldownSeconds(){
    const f=failState(),left=Math.ceil((Number(f.until)||0-Date.now())/1000);
    return Math.max(0,left);
  }
  function pinValid(pin){return /^\d{4,8}$/.test(pin)}

  function showMode(mode){
    if(!['hub','inventory','staff'].includes(mode)) mode='hub';
    if((mode==='inventory'||mode==='staff')&&!adminUnlocked()){requestAdmin(function(){showMode(mode)});return}
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
    renderAccessState();
    window.scrollTo(0,0);
  }

  function makeAccessDialog(){
    if(document.getElementById('cassolaAccessDialog'))return;
    const d=document.createElement('dialog');
    d.id='cassolaAccessDialog';
    d.className='cassola-access-dialog';
    d.innerHTML='<form class="cassola-access-form" id="cassolaAccessForm">'+
      '<div class="cassola-access-lock">🔐</div>'+
      '<div class="cassola-access-copy"><div class="eyebrow">LOCAL ADMIN LOCK</div><h2 id="cassolaAccessTitle">管理员 PIN</h2><p id="cassolaAccessText"></p></div>'+
      '<div id="cassolaAccessFields"></div>'+
      '<div id="cassolaAccessError" class="cassola-access-error hidden"></div>'+
      '<div class="cassola-access-actions"><button type="button" class="btn secondary" data-cassola-pin-cancel>取消</button><button type="submit" class="btn primary" id="cassolaAccessSubmit">确认</button></div>'+
      '</form>';
    document.body.appendChild(d);
    d.addEventListener('click',function(e){
      if(e.target.closest('[data-cassola-pin-cancel]')){pendingAdminAction=null;d.close()}
    });
    d.addEventListener('cancel',function(){pendingAdminAction=null});
    d.querySelector('form').addEventListener('submit',handlePinSubmit);
  }

  function openPinDialog(mode,after){
    makeAccessDialog();
    pendingAdminAction=after||null;
    const d=document.getElementById('cassolaAccessDialog');
    d.dataset.pinMode=mode;
    const title=document.getElementById('cassolaAccessTitle'),text=document.getElementById('cassolaAccessText'),fields=document.getElementById('cassolaAccessFields'),err=document.getElementById('cassolaAccessError'),submit=document.getElementById('cassolaAccessSubmit');
    err.classList.add('hidden');err.textContent='';
    if(mode==='setup'){
      title.textContent='设置管理员 PIN';
      text.textContent='PIN 只保存在这台设备，不会写进 GitHub 或导出的业务数据。';
      fields.innerHTML='<label>新 PIN<input id="cassolaPin1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" placeholder="4–8 位数字"></label><label>再输入一次<input id="cassolaPin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off"></label>';
      submit.textContent='设置并解锁';
    }else if(mode==='change'){
      title.textContent='修改管理员 PIN';
      text.textContent='新 PIN 会替换这台设备上的旧 PIN。';
      fields.innerHTML='<label>新 PIN<input id="cassolaPin1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" placeholder="4–8 位数字"></label><label>再输入一次<input id="cassolaPin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off"></label>';
      submit.textContent='保存新 PIN';
    }else{
      title.textContent='解锁管理员';
      text.textContent='Inventory / Staff 管理功能需要管理员 PIN。';
      fields.innerHTML='<label>管理员 PIN<input id="cassolaPin1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" autofocus></label>';
      submit.textContent='解锁';
    }
    d.showModal();
    setTimeout(()=>document.getElementById('cassolaPin1')?.focus(),80);
  }

  async function handlePinSubmit(e){
    e.preventDefault();
    const d=document.getElementById('cassolaAccessDialog'),mode=d.dataset.pinMode,err=document.getElementById('cassolaAccessError'),submit=document.getElementById('cassolaAccessSubmit');
    const p1=document.getElementById('cassolaPin1')?.value||'',p2=document.getElementById('cassolaPin2')?.value||'';
    err.classList.add('hidden');err.textContent='';
    if(!pinValid(p1)){err.textContent='PIN 必须是 4–8 位数字。';err.classList.remove('hidden');return}
    if((mode==='setup'||mode==='change')&&p1!==p2){err.textContent='两次 PIN 不一致。';err.classList.remove('hidden');return}
    if(mode==='unlock'){
      const left=cooldownSeconds();
      if(left>0){err.textContent=`输错太多次，请 ${left} 秒后再试。`;err.classList.remove('hidden');return}
    }
    submit.disabled=true;
    try{
      if(mode==='setup'||mode==='change'){
        await savePin(p1);
        d.close();
        const fn=pendingAdminAction;pendingAdminAction=null;
        renderAccessState();
        if(fn)fn();
      }else{
        const ok=await verifyPin(p1);
        if(ok){
          clearFailures();setAdminUnlocked(true);d.close();
          const fn=pendingAdminAction;pendingAdminAction=null;
          if(fn)fn();
        }else{
          const f=registerFailure(),left=Math.ceil(Math.max(0,(f.until-Date.now())/1000));
          err.textContent=left>0?`PIN 不对。已锁定 ${left} 秒。`:'PIN 不对。';
          err.classList.remove('hidden');
          document.getElementById('cassolaPin1').value='';
          document.getElementById('cassolaPin1').focus();
        }
      }
    }catch(ex){
      err.textContent='这台浏览器无法建立管理员锁。';
      err.classList.remove('hidden');
    }finally{submit.disabled=false}
  }

  function requestAdmin(after){
    if(adminUnlocked()){if(after)after();return}
    openPinDialog(adminConfigured()?'unlock':'setup',after);
  }

  function renderAccessState(){
    const box=document.getElementById('cassolaAccessState');if(!box)return;
    const configured=adminConfigured(),unlocked=adminUnlocked();
    if(!configured){
      box.innerHTML='<div><span class="cassola-access-dot">🔐</span><div><b>管理员 PIN 未设置</b><small>先在本机建立管理员锁。</small></div></div><button type="button" data-cassola-pin-setup>设置 PIN</button>';
    }else if(unlocked){
      box.innerHTML='<div><span class="cassola-access-dot">🔓</span><div><b>管理员已解锁</b><small>本次页面会话有效，重新打开会自动上锁。</small></div></div><div class="cassola-access-inline"><button type="button" data-cassola-pin-change>修改 PIN</button><button type="button" data-cassola-pin-lock>立即锁定</button></div>';
    }else{
      box.innerHTML='<div><span class="cassola-access-dot">🔒</span><div><b>管理员已锁定</b><small>员工责任区会放在这道锁外面。</small></div></div><button type="button" data-cassola-pin-unlock>解锁</button>';
    }
  }

  function makeHub(){
    if(document.getElementById('cassolaHub')) return;
    const hub=document.createElement('section');
    hub.id='cassolaHub';
    hub.setAttribute('aria-label','Cassola 主菜单');
    hub.innerHTML=
      '<div class="cassola-hub-shell">'+
      '<div class="cassola-hub-mark">🗿</div>'+
      '<div class="cassola-hub-head"><div class="eyebrow">PIETRO 石器时代 ERP</div><h1>Cassola</h1><p>管理员总账先上锁。员工盘货责任区下一步接在锁外。</p></div>'+
      '<div id="cassolaAccessState" class="cassola-access-state"></div>'+
      '<div class="cassola-module-grid">'+
      '<button class="cassola-module-card" data-cassola-open="inventory"><div><div class="cassola-module-icon">📦</div><h2>Inventory</h2><p>盘货、订货、收货、SKU、预警和历史。</p></div><div class="cassola-module-open"><span>管理员库存系统 🔒</span><span>›</span></div></button>'+
      '<button class="cassola-module-card" data-cassola-open="staff"><div><div class="cassola-module-icon">👥</div><h2>Staff</h2><p>人员、头像、岗位、请假调休、拖拽排班和 PDF。</p></div><div class="cassola-module-open"><span>管理员人员系统 🔒</span><span>›</span></div></button>'+
      '</div><div class="cassola-hub-foot">Offline-first · Local data · Admin PIN stays on this device</div></div>';
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
      if(btn){requestAdmin(function(){showMode(btn.dataset.cassolaOpen)});return}
      if(e.target.closest('[data-cassola-pin-setup]')){openPinDialog('setup');return}
      if(e.target.closest('[data-cassola-pin-unlock]')){openPinDialog('unlock');return}
      if(e.target.closest('[data-cassola-pin-change]')){if(adminUnlocked())openPinDialog('change');else requestAdmin();return}
      if(e.target.closest('[data-cassola-pin-lock]')){setAdminUnlocked(false);showMode('hub');return}
    });
    renderAccessState();
  }

  document.addEventListener('DOMContentLoaded',function(){
    sessionStorage.removeItem(SESSION_KEY);
    makeHub();
    makeAccessDialog();
    showMode('hub');
  });

  window.CassolaHub={
    show:function(){showMode('hub')},
    openInventory:function(){requestAdmin(function(){showMode('inventory')})},
    openStaff:function(){requestAdmin(function(){showMode('staff')})},
    lockAdmin:function(){setAdminUnlocked(false);showMode('hub')},
    isAdminUnlocked:adminUnlocked
  };
})();

/* Cassola Staff Board v0.1 */
(function(){
  const KEY='cassola_staff_v01';
  const DB_NAME='cassola_staff_assets_v01';
  const DB_STORE='avatars';
  let state=null;
  const todayLocal=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day};
  let currentDate=todayLocal();
  let currentShift='dinner';
  let currentView='week';
  let attendanceEdit={personId:null,date:null};
  let pendingAvatarBlob=null;
  let editPersonId=null;
  let importCandidate=null;
  let suppressClickUntil=0;
  const avatarUrlCache=new Map();

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const now=()=>new Date().toISOString();
  const uid=(p='id')=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  const num=v=>Number.isFinite(Number(v))?Number(v):0;

  function defaultState(){
    return {
      version:1,
      people:[],
      roles:[
        {id:'nigiri',name:'Nigiri / Sashimi',icon:'🍣'},
        {id:'maki',name:'Maki',icon:'🍙'},
        {id:'cucina',name:'Cucina',icon:'🔪'},
        {id:'sala',name:'Sala',icon:'🍽️'},
        {id:'lavaggio',name:'Lavaggio',icon:'🧽'},
        {id:'cassa',name:'Cassa',icon:'💳'}
      ],
      schedules:{},
      attendance:{},
      swaps:[],
      weekPublications:{},
      history:[],
      syncMeta:{revision:1,updatedAt:now(),contentHash:'',deviceName:'本设备'}
    };
  }

  function snapshot(s=state){
    return {
      people:s.people||[],
      roles:s.roles||[],
      schedules:s.schedules||{},
      attendance:s.attendance||{},
      swaps:s.swaps||[],
      weekPublications:s.weekPublications||{},
      history:s.history||[]
    };
  }
  function hashString(str){
    let h=2166136261;
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function fingerprint(s=state){return hashString(JSON.stringify(snapshot(s)))}
  function normalize(raw){
    const base=defaultState();
    const s={...base,...(raw||{})};
    s.people=Array.isArray(s.people)?s.people:[];
    s.roles=Array.isArray(s.roles)&&s.roles.length?s.roles:base.roles;
    s.schedules=s.schedules&&typeof s.schedules==='object'?s.schedules:{};
    s.attendance=s.attendance&&typeof s.attendance==='object'?s.attendance:{};
    s.swaps=Array.isArray(s.swaps)?s.swaps:[];
    s.weekPublications=s.weekPublications&&typeof s.weekPublications==='object'?s.weekPublications:{};
    s.history=Array.isArray(s.history)?s.history:[];
    s.syncMeta={...base.syncMeta,...(s.syncMeta||{})};
    s.syncMeta.revision=Math.max(1,num(s.syncMeta.revision)||1);
    s.syncMeta.deviceName=(s.syncMeta.deviceName||'本设备').trim()||'本设备';
    s.people=s.people.map(p=>({
      id:p.id||uid('person'),
      name:p.name||'未命名',
      nickname:p.nickname||'',
      primaryRole:p.primaryRole||'',
      note:p.note||'',
      active:p.active!==false,
      avatarStamp:p.avatarStamp||''
    }));
    s.roles=s.roles.map(r=>({id:r.id||uid('role'),name:r.name||'岗位',icon:r.icon||'📍'}));
    if(!s.syncMeta.contentHash)s.syncMeta.contentHash=fingerprint(s);
    return s;
  }
  function load(){
    try{state=normalize(JSON.parse(localStorage.getItem(KEY)||'null'))}
    catch(e){state=defaultState();state.syncMeta.contentHash=fingerprint(state)}
    localStorage.setItem(KEY,JSON.stringify(state));
  }
  function save(){
    const fp=fingerprint(state);
    if(fp!==state.syncMeta.contentHash){
      state.syncMeta.revision=Math.max(1,num(state.syncMeta.revision))+1;
      state.syncMeta.updatedAt=now();
      state.syncMeta.contentHash=fp;
    }
    localStorage.setItem(KEY,JSON.stringify(state));
    refreshSyncUi();
  }
  function log(type,text,note='',date=currentDate,shift=currentShift){
    state.history.unshift({id:uid('hist'),time:now(),type,text,note,date,shift});
    state.history=state.history.slice(0,1000);
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE)};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function avatarPut(id,blob){
    const db=await openDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(DB_STORE,'readwrite');
      tx.objectStore(DB_STORE).put(blob,id);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
    db.close();
    if(avatarUrlCache.has(id)){URL.revokeObjectURL(avatarUrlCache.get(id));avatarUrlCache.delete(id)}
  }
  async function avatarGet(id){
    const db=await openDb();
    const val=await new Promise((resolve,reject)=>{
      const req=db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(id);
      req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
    });
    db.close();return val;
  }
  async function avatarDelete(id){
    const db=await openDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(DB_STORE,'readwrite');
      tx.objectStore(DB_STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
    db.close();
    if(avatarUrlCache.has(id)){URL.revokeObjectURL(avatarUrlCache.get(id));avatarUrlCache.delete(id)}
  }
  function blobToDataUrl(blob){
    return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)});
  }
  function dataUrlToBlob(url){
    const parts=url.split(','),m=/data:([^;]+);base64/.exec(parts[0]);
    const bin=atob(parts[1]||''),arr=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
    return new Blob([arr],{type:m?.[1]||'image/webp'});
  }
  async function resizePhoto(file){
    const bmp=await createImageBitmap(file);
    const size=256,scale=Math.max(size/bmp.width,size/bmp.height);
    const sw=size/scale,sh=size/scale,sx=(bmp.width-sw)/2,sy=(bmp.height-sh)/2;
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(bmp,sx,sy,sw,sh,0,0,size,size);
    bmp.close?.();
    return await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
  }
  async function getAvatarUrl(id){
    if(avatarUrlCache.has(id))return avatarUrlCache.get(id);
    const blob=await avatarGet(id);
    if(!blob)return null;
    const url=URL.createObjectURL(blob);avatarUrlCache.set(id,url);return url;
  }
  async function hydrateAvatars(root=document){
    const nodes=[...root.querySelectorAll('[data-staff-avatar]')];
    await Promise.all(nodes.map(async el=>{
      const id=el.dataset.staffAvatar;
      const p=state.people.find(x=>x.id===id);
      if(!p?.avatarStamp)return;
      const url=await getAvatarUrl(id);
      if(url&&!el.querySelector('img'))el.innerHTML='<img alt="" src="'+url+'">';
    }));
  }

  function shiftLabel(v){return v==='lunch'?'午班':v==='dinner'?'晚班':'整日'}
  function roleById(id){return state.roles.find(r=>r.id===id)}
  function personById(id){return state.people.find(p=>p.id===id)}
  function scheduleFor(date=currentDate,shift=currentShift,create=true){
    if(!state.schedules[date]&&create)state.schedules[date]={};
    if(!state.schedules[date])return {assignments:{}};
    if(!state.schedules[date][shift]&&create)state.schedules[date][shift]={assignments:{}};
    const sh=state.schedules[date][shift]||{assignments:{}};
    sh.assignments=sh.assignments||{};
    return sh;
  }
  function assignedLane(personId,date=currentDate,shift=currentShift){
    const a=scheduleFor(date,shift,false).assignments||{};
    for(const [lane,ids] of Object.entries(a))if((ids||[]).includes(personId))return lane;
    return '__unassigned';
  }
  function assignPerson(personId,lane,date=currentDate,shift=currentShift,reason='排班'){
    const sh=scheduleFor(date,shift,true),a=sh.assignments;
    for(const key of Object.keys(a))a[key]=(a[key]||[]).filter(id=>id!==personId);
    if(lane&&lane!=='__unassigned'){
      if(!a[lane])a[lane]=[];
      a[lane].push(personId);
    }
    const p=personById(personId); const r=lane==='__off'?'休息':lane==='__leave'?'请假':lane==='__unassigned'?'待安排':(roleById(lane)?.name||'未知岗位');
    log('schedule',(p?.name||'人员')+' → '+r,reason,date,shift);
    save();renderBoard();renderHistory();
  }
  function removePersonEverywhere(personId){
    for(const day of Object.values(state.schedules)){
      for(const sh of Object.values(day||{})){
        if(!sh?.assignments)continue;
        for(const k of Object.keys(sh.assignments))sh.assignments[k]=(sh.assignments[k]||[]).filter(id=>id!==personId);
      }
    }
    for(const date of Object.keys(state.attendance||{})){
      delete state.attendance[date][personId];
      if(!Object.keys(state.attendance[date]).length)delete state.attendance[date];
    }
  }

  function buildApp(){
    if(document.getElementById('staffApp'))return;
    const app=document.createElement('section');app.id='staffApp';
    app.innerHTML=`
      <header class="staff-topbar">
        <div class="staff-brand">
          <button class="staff-mini-home" id="staffHomeBtn" aria-label="返回主菜单">⌂</button>
          <div class="staff-brand-mark">👥</div>
          <div><div class="eyebrow">CASSOLA</div><h1>Staff Board</h1></div>
        </div>
        <div class="staff-top-actions"><span class="staff-version-badge" id="staffTopVersion">#1</span></div>
      </header>
      <main class="staff-main">
        <section class="staff-view active" id="staff-view-week">
          <div class="staff-week-tools">
            <button id="staffPrevWeek">‹</button>
            <div>
              <strong id="staffWeekLabel">本周</strong>
              <small>点格子记录休息 / 请假 / 调休 / 缺勤</small>
            </div>
            <button id="staffNextWeek">›</button>
            <button id="staffThisWeek" class="btn secondary">本周</button>
          </div>
          <div class="staff-section-head">
            <div><h2>周休息表</h2><p>空白默认视为上班；改完可以发布新版再发群。</p></div>
            <div class="staff-section-actions">
              <button class="btn secondary" id="staffWeekVersionsBtn">🕘 版本</button>
              <button class="btn primary" id="staffPublishWeekBtn">📣 发布</button>
              <button class="btn secondary" id="staffWeekPdfBtn">📄 PDF</button>
            </div>
          </div>
          <div class="staff-week-release" id="staffWeekRelease"></div>
          <div class="staff-week-wrap" id="staffWeekTable"></div>
          <div class="staff-status-legend">
            <span>· 上班</span><span>💤 休息</span><span>📝 请假</span><span>🔁 调休</span><span>❌ 缺勤</span>
          </div>
        </section>

        <section class="staff-view" id="staff-view-month">
          <div class="staff-month-tools">
            <input id="staffMonthInput" type="month">
            <button class="btn primary" id="staffMonthPdfBtn">📄 月报 PDF</button>
          </div>
          <div class="staff-section-head">
            <div><h2>月度汇总</h2><p>月底一眼看所有人的休息、请假、调休和缺勤。</p></div>
          </div>
          <div class="staff-month-summary" id="staffMonthSummary"></div>
        </section>

        <section class="staff-view" id="staff-view-board">
          <div class="staff-board-tools">
            <div class="staff-date-row">
              <button id="staffPrevDay">‹</button>
              <input id="staffDate" type="date">
              <button id="staffNextDay">›</button>
              <button id="staffToday" class="staff-today-btn">今天</button>
            </div>
            <div class="staff-shift-seg">
              <button data-staff-shift="lunch">☀️ 午班</button>
              <button data-staff-shift="dinner" class="active">🌙 晚班</button>
            </div>
          </div>
          <div class="staff-board-head">
            <div><h2 id="staffBoardTitle">今日排班</h2><p>长按头像拖动，轻点头像也可以换岗位。</p></div>
            <div class="staff-board-actions">
              <button class="btn secondary" id="staffCopyPrev">复制昨日</button>
              <button class="btn primary" id="staffPdfBtn">📄 PDF</button>
            </div>
          </div>
          <div class="staff-lanes" id="staffLanes"></div>
        </section>

        <section class="staff-view" id="staff-view-people">
          <div class="staff-section-head">
            <div><h2>人员</h2><p>头像只存在本地 / Staff JSON，不写进公开 GitHub。</p></div>
            <div class="staff-section-actions"><button class="btn primary" id="staffAddPerson">＋ 人员</button></div>
          </div>
          <div class="staff-people-list" id="staffPeopleList"></div>
        </section>

        <section class="staff-view" id="staff-view-history">
          <div class="staff-section-head">
            <div><h2>历史</h2><p>人员、岗位、排班、请假和调休变化都留痕。</p></div>
            <div class="staff-section-actions"><button class="btn secondary" id="staffClearHistory">清理旧记录</button></div>
          </div>
          <div class="staff-history-list" id="staffHistoryList"></div>
        </section>

        <section class="staff-view" id="staff-view-settings">
          <div class="staff-settings-stack">
            <div class="staff-settings-card">
              <h3>岗位</h3><p>岗位可随时增删改。删除岗位后，原来排在这个岗位的人会回到“待安排”。</p>
              <div class="staff-role-list" id="staffRoleList"></div>
              <div class="staff-settings-actions"><button class="btn secondary" id="staffAddRole">＋ 岗位</button></div>
            </div>
            <div class="staff-settings-card">
              <h3>📨 群聊 JSON 交接</h3><p>和 Inventory 一样，用版本号防止旧文件静默覆盖。普通 Staff JSON 不带头像；只有“完整备份”才会打包压缩头像。</p>
              <div class="staff-sync-grid">
                <div class="staff-sync-stat"><span>本机版本</span><b id="staffRevision">#1</b></div>
                <div class="staff-sync-stat"><span>最后修改</span><b id="staffUpdated">—</b></div>
              </div>
              <label style="display:block;margin-top:10px;font-size:11px;color:var(--muted)">设备名
                <input id="staffDeviceName" placeholder="例如 Pietro / 店长">
              </label>
              <div class="staff-settings-actions">
                <button class="btn primary" id="staffExportBtn">导出 Staff JSON</button>
                <button class="btn secondary" id="staffExportFullBtn">完整备份（含头像）</button>
                <label class="btn secondary staff-file-label">导入 Staff JSON<input id="staffImportInput" type="file" accept=".json,application/json"></label>
              </div>
            </div>
            <div class="staff-settings-card">
              <h3>本地数据</h3><p>排班与人员资料存在浏览器本地；头像存在 IndexedDB。完整 Staff JSON 可以迁移到另一台设备。</p>
              <div class="staff-settings-actions"><button class="btn danger ghost" id="staffResetBtn">清空 Staff 数据</button></div>
            </div>
            <div class="staff-settings-card">
              <h3>历史记录</h3><p>周休、请假、人员和排岗变化都会留痕。</p>
              <div class="staff-settings-actions"><button class="btn secondary" id="staffOpenHistory">查看历史</button></div>
            </div>
            <div class="staff-settings-card">
              <h3>Staff v0.2</h3><p>Weekly rest · monthly absence summary · optional role board · split JSON backup · local PDF</p>
            </div>
          </div>
        </section>
      </main>
      <nav class="staff-bottom-nav staff-bottom-nav-five">
        <button class="staff-nav-btn active" data-staff-view="week"><span>📅</span><small>周休</small></button>
        <button class="staff-nav-btn" data-staff-view="month"><span>📊</span><small>月度</small></button>
        <button class="staff-nav-btn" data-staff-view="people"><span>👥</span><small>人员</small></button>
        <button class="staff-nav-btn" data-staff-view="board"><span>🧩</span><small>排岗</small></button>
        <button class="staff-nav-btn" data-staff-view="settings"><span>⚙️</span><small>设置</small></button>
      </nav>

      <dialog class="staff-dialog" id="staffPersonDialog">
        <form method="dialog" id="staffPersonForm">
          <div class="dialog-head"><div><div class="eyebrow">STAFF</div><h3 id="staffPersonDialogTitle">新增人员</h3></div><button value="cancel" class="icon-btn">✕</button></div>
          <div class="staff-photo-preview" id="staffPhotoPreview">👤</div>
          <div class="staff-photo-actions">
            <label class="btn secondary staff-file-label">选择头像<input id="staffPhotoInput" type="file" accept="image/*"></label>
            <button type="button" class="btn danger ghost" id="staffRemovePhoto">移除头像</button>
          </div>
          <div class="staff-form-grid">
            <label>姓名<input id="staffPersonName" required></label>
            <label>昵称<input id="staffPersonNickname" placeholder="可空"></label>
          </div>
          <label>主要岗位<select id="staffPersonRole"></select></label>
          <label>备注<textarea id="staffPersonNote" placeholder="例如：只上晚班 / 可顶 Maki"></textarea></label>
          <div class="staff-dialog-actions">
            <button type="button" class="btn danger ghost" id="staffDeletePerson">删除</button>
            <button value="cancel" class="btn secondary">取消</button>
            <button type="button" class="btn primary" id="staffSavePerson">保存</button>
          </div>
        </form>
      </dialog>

      <dialog class="staff-dialog" id="staffMoveDialog">
        <form method="dialog">
          <div class="dialog-head"><div><div class="eyebrow">MOVE</div><h3 id="staffMoveTitle">安排岗位</h3></div><button value="cancel" class="icon-btn">✕</button></div>
          <div class="staff-move-grid" id="staffMoveGrid"></div>
        </form>
      </dialog>

      <dialog class="staff-dialog" id="staffAttendanceDialog">
        <form method="dialog">
          <div class="dialog-head"><div><div class="eyebrow">ATTENDANCE</div><h3 id="staffAttendanceTitle">记录状态</h3></div><button value="cancel" class="icon-btn">✕</button></div>
          <div class="staff-attendance-grid" id="staffAttendanceChoices">
            <button type="button" data-att-status="work">· 上班</button>
            <button type="button" data-att-status="rest">💤 休息</button>
            <button type="button" data-att-status="leave">📝 请假</button>
            <button type="button" data-att-status="swap">🔁 调休</button>
            <button type="button" data-att-status="absent">❌ 缺勤</button>
          </div>
          <input type="hidden" id="staffAttendanceStatus" value="work">
          <div class="staff-leave-portion hidden" id="staffAttendancePortionWrap">
            <span>时段</span>
            <div class="staff-portion-seg">
              <button type="button" data-att-portion="full" class="active">全天</button>
              <button type="button" data-att-portion="am">上午</button>
              <button type="button" data-att-portion="pm">下午</button>
            </div>
            <input type="hidden" id="staffAttendancePortion" value="full">
          </div>
          <div class="staff-form-grid">
            <label>开始日期<input id="staffAttendanceStart" type="date"></label>
            <label>连续到<input id="staffAttendanceEnd" type="date"></label>
          </div>
          <label>备注<textarea id="staffAttendanceNote" placeholder="例如：已批准 / 与 Luca 对调 / 临时缺勤"></textarea></label>
          <div class="staff-dialog-actions staff-attendance-actions">
            <button type="button" class="btn secondary hidden" id="staffSwapRestBtn">🔄 与他人换休</button>
            <button value="cancel" class="btn secondary">取消</button>
            <button type="button" class="btn primary" id="staffSaveAttendance">保存</button>
          </div>
        </form>
      </dialog>

      <dialog class="staff-dialog" id="staffSwapDialog">
        <form method="dialog">
          <div class="dialog-head"><div><div class="eyebrow">REST SWAP</div><h3 id="staffSwapTitle">交换休息日</h3></div><button value="cancel" class="icon-btn">✕</button></div>
          <div class="staff-swap-source" id="staffSwapSource"></div>
          <label>与谁换<select id="staffSwapPartner"></select></label>
          <label>对方的休息日<select id="staffSwapTargetDate"></select></label>
          <label>谁发起这次换休<select id="staffSwapInitiator"></select></label>
          <label>备注<textarea id="staffSwapNote" placeholder="例如：临时有事 / 双方同意"></textarea></label>
          <div class="staff-dialog-actions">
            <button value="cancel" class="btn secondary">取消</button>
            <button type="button" class="btn primary" id="staffConfirmSwap">确认交换</button>
          </div>
        </form>
      </dialog>

      <dialog class="staff-dialog" id="staffWeekVersionsDialog">
        <form method="dialog">
          <div class="dialog-head"><div><div class="eyebrow">WEEK VERSIONS</div><h3 id="staffWeekVersionsTitle">周表版本</h3></div><button value="cancel" class="icon-btn">✕</button></div>
          <div class="staff-week-version-list" id="staffWeekVersionList"></div>
        </form>
      </dialog>

      <dialog class="staff-dialog" id="staffPersonRecordsDialog">
        <form method="dialog">
          <div class="dialog-head"><div><div class="eyebrow">PERSON RECORDS</div><h3 id="staffPersonRecordsTitle">人员记录</h3></div><button value="cancel" class="icon-btn">✕</button></div>
          <div class="staff-person-records" id="staffPersonRecordsList"></div>
        </form>
      </dialog>

      <dialog class="staff-dialog" id="staffImportDialog">
        <form method="dialog">
          <div class="dialog-head"><div><div class="eyebrow">JSON HANDOFF</div><h3>导入前核对</h3></div><button value="cancel" class="icon-btn">✕</button></div>
          <div id="staffImportSummary"></div>
          <div class="staff-dialog-actions">
            <button value="cancel" class="btn secondary">取消</button>
            <button type="button" class="btn danger ghost" id="staffForceImport">强制采用</button>
            <button type="button" class="btn primary" id="staffAcceptImport">确认导入</button>
          </div>
        </form>
      </dialog>
      <div class="staff-toast" id="staffToast"></div>
    `;
    document.body.appendChild(app);
    bindUi();
  }

  function showView(name){
    currentView=name;
    document.querySelectorAll('.staff-view').forEach(v=>v.classList.toggle('active',v.id==='staff-view-'+name));
    document.querySelectorAll('.staff-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.staffView===name));
    if(name==='week')renderWeek();
    if(name==='month')renderMonth();
    if(name==='board')renderBoard();
    if(name==='people')renderPeople();
    if(name==='history')renderHistory();
    if(name==='settings')renderSettings();
    window.scrollTo(0,0);
  }
  function toast(msg){
    const el=document.getElementById('staffToast');if(!el)return;
    el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),1800);
  }

  const ATTENDANCE_STATUS={
    work:{icon:'·',label:'上班',short:'班'},
    rest:{icon:'💤',label:'休息',short:'休'},
    leave:{icon:'📝',label:'请假',short:'假'},
    swap:{icon:'🔁',label:'调休',short:'调'},
    absent:{icon:'❌',label:'缺勤',short:'缺'}
  };
  function localIso(d){
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+day;
  }
  function dateObj(iso){return new Date(iso+'T12:00:00')}
  function weekStartIso(iso=currentDate){
    const d=dateObj(iso),day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return localIso(d);
  }
  function weekDates(iso=currentDate){
    const d=dateObj(weekStartIso(iso));return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return localIso(x)});
  }
  function weekLabel(iso=currentDate){
    const ds=weekDates(iso),a=dateObj(ds[0]),b=dateObj(ds[6]);
    return a.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})+' – '+b.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});
  }
  function attendanceGet(personId,date){
    return state.attendance?.[date]?.[personId]||null;
  }
  function setAttendanceRange(personId,start,end,status,note='',portion='full'){
    const p=personById(personId);if(!p)return;
    let a=dateObj(start),b=dateObj(end||start);if(b<a)b=new Date(a);
    let count=0;
    for(let d=new Date(a);d<=b;d.setDate(d.getDate()+1)){
      const iso=localIso(d);
      if(!state.attendance[iso])state.attendance[iso]={};
      if(status==='work')delete state.attendance[iso][personId];
      else state.attendance[iso][personId]={status,note:note.trim(),portion:portion||'full',updatedAt:now()};
      if(!Object.keys(state.attendance[iso]).length)delete state.attendance[iso];
      count++;
    }
    const meta=ATTENDANCE_STATUS[status]||ATTENDANCE_STATUS.work;
    const portionText=status!=='work'?(portion==='am'?' · 上午':portion==='pm'?' · 下午':' · 全天'):'';
    log('attendance',p.name+' · '+meta.label+portionText+(count>1?' × '+count+'天':''),note,start,'all');
    save();renderWeek();renderMonth();renderHistory();
  }
  function openAttendance(personId,date){
    const p=personById(personId);if(!p)return;
    attendanceEdit={personId,date};
    const rec=attendanceGet(personId,date),status=rec?.status||'work';
    document.getElementById('staffAttendanceTitle').textContent=p.name+' · '+dateLabel(date);
    document.getElementById('staffAttendanceStart').value=date;
    document.getElementById('staffAttendanceEnd').value=date;
    document.getElementById('staffAttendanceStatus').value=status;
    document.getElementById('staffAttendanceNote').value=rec?.note||'';
    const portion=rec?.portion||'full';
    document.getElementById('staffAttendancePortion').value=portion;
    document.querySelectorAll('[data-att-status]').forEach(b=>b.classList.toggle('active',b.dataset.attStatus===status));
    document.querySelectorAll('[data-att-portion]').forEach(b=>b.classList.toggle('active',b.dataset.attPortion===portion));
    document.getElementById('staffAttendancePortionWrap').classList.toggle('hidden',status==='work');
    document.getElementById('staffAttendanceDialog').showModal();
  }
  function cloneJson(v){return JSON.parse(JSON.stringify(v))}
  function weekSnapshot(iso=currentDate){
    const dates=weekDates(iso),people=state.people.filter(p=>p.active!==false).map(p=>({id:p.id,name:p.name}));
    const cells={};
    for(const p of people){
      for(const date of dates){
        const rec=attendanceGet(p.id,date);
        if(!rec)continue;
        cells[p.id+'|'+date]={status:rec.status||'work',portion:rec.portion||'full',note:rec.note||''};
      }
    }
    return {weekStart:dates[0],people,cells};
  }
  function weekPublications(iso=currentDate){
    const ws=weekStartIso(iso);
    if(!Array.isArray(state.weekPublications[ws]))state.weekPublications[ws]=[];
    return state.weekPublications[ws];
  }
  function latestWeekPublication(iso=currentDate){
    const list=weekPublications(iso);
    return list.length?list[list.length-1]:null;
  }
  function weekSnapshotDiff(a,b){
    if(!a||!b)return 0;
    let count=0;
    const ap=(a.people||[]).map(x=>x.id+':'+x.name).sort(),bp=(b.people||[]).map(x=>x.id+':'+x.name).sort();
    const peopleKeys=new Set([...ap,...bp]);
    peopleKeys.forEach(k=>{if(!ap.includes(k)||!bp.includes(k))count++});
    const keys=new Set([...Object.keys(a.cells||{}),...Object.keys(b.cells||{})]);
    keys.forEach(k=>{if(JSON.stringify(a.cells?.[k]||null)!==JSON.stringify(b.cells?.[k]||null))count++});
    return count;
  }
  function renderWeekRelease(){
    const box=document.getElementById('staffWeekRelease'),btn=document.getElementById('staffPublishWeekBtn');if(!box||!btn)return;
    const latest=latestWeekPublication(currentDate),snap=weekSnapshot(currentDate),pending=latest?weekSnapshotDiff(latest.snapshot,snap):null;
    if(!latest){
      box.innerHTML='<div><b>尚未发布</b><small>排好本周休息后，发布 v1 再发群。</small></div><span class="staff-release-draft">草稿</span>';
      btn.textContent='📣 发布 v1';
      return;
    }
    const when=new Date(latest.publishedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
    box.innerHTML='<div><b>已发布 v'+latest.version+'</b><small>'+esc(when)+' · '+esc(latest.publishedBy||'本设备')+'</small></div>'+
      (pending?'<span class="staff-release-pending">有 '+pending+' 处未发布修改</span>':'<span class="staff-release-ok">与发布版一致</span>');
    btn.textContent=pending?'📣 发布修改 v'+(latest.version+1):'✓ 已发布 v'+latest.version;
  }
  function publishWeek(){
    const snap=weekSnapshot(currentDate);
    if(!snap.people.length){toast('还没有人员');return}
    const list=weekPublications(currentDate),latest=list.length?list[list.length-1]:null;
    const changes=latest?weekSnapshotDiff(latest.snapshot,snap):0;
    if(latest&&!changes){toast('当前周表和 v'+latest.version+' 一样');return}
    const version=(latest?.version||0)+1;
    const note=version===1?'初次发布':('修改版 · '+changes+' 处变化');
    list.push({
      id:uid('pub'),weekStart:snap.weekStart,version,publishedAt:now(),
      publishedBy:state.syncMeta.deviceName||'本设备',changes,note,snapshot:cloneJson(snap)
    });
    log('publish','发布周休表 v'+version,note,snap.weekStart,'all');
    save();renderWeek();renderHistory();
    toast(version===1?'周休表 v1 已发布':'修改版 v'+version+' 已发布');
  }
  function openWeekVersions(){
    const ws=weekStartIso(currentDate),list=weekPublications(currentDate).slice().reverse();
    document.getElementById('staffWeekVersionsTitle').textContent=weekLabel(currentDate)+' · 版本记录';
    const box=document.getElementById('staffWeekVersionList');
    box.innerHTML=list.length?list.map(pub=>{
      const t=new Date(pub.publishedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
      return '<div class="staff-week-version-item"><div><b>v'+pub.version+'</b><small>'+esc(pub.note||'发布')+'</small></div><div class="staff-week-version-meta">'+esc(t)+'<br>'+esc(pub.publishedBy||'本设备')+'</div></div>';
    }).join(''):'<div class="staff-settings-card"><p>'+esc(ws)+' 还没有发布记录。</p></div>';
    document.getElementById('staffWeekVersionsDialog').showModal();
  }
  function restDatesFor(personId,iso=currentDate){
    return weekDates(iso).filter(date=>attendanceGet(personId,date)?.status==='rest');
  }
  function refreshSwapDialog(){
    const partnerSel=document.getElementById('staffSwapPartner'),dateSel=document.getElementById('staffSwapTargetDate'),initSel=document.getElementById('staffSwapInitiator');
    if(!partnerSel||!dateSel||!initSel)return;
    const sourceId=attendanceEdit.personId,partnerId=partnerSel.value;
    const partner=personById(partnerId),source=personById(sourceId);
    const dates=partnerId?restDatesFor(partnerId,attendanceEdit.date).filter(d=>d!==attendanceEdit.date):[];
    dateSel.innerHTML=dates.length?dates.map(d=>'<option value="'+d+'">'+esc(dateLabel(d))+'</option>').join(''):'<option value="">对方本周没有其他休息日</option>';
    initSel.innerHTML='<option value="'+esc(sourceId)+'">'+esc(source?.name||'当前人员')+'</option>'+
      (partner?'<option value="'+esc(partner.id)+'">'+esc(partner.name)+'</option>':'');
  }
  function openSwapDialog(){
    const source=personById(attendanceEdit.personId),rec=attendanceGet(attendanceEdit.personId,attendanceEdit.date);
    if(!source||rec?.status!=='rest'){toast('先把这一天设为休息');return}
    const partners=state.people.filter(p=>p.active!==false&&p.id!==source.id&&restDatesFor(p.id,attendanceEdit.date).some(d=>d!==attendanceEdit.date));
    if(!partners.length){toast('这周没有可交换休息日的人');return}
    document.getElementById('staffSwapTitle').textContent=source.name+' · 换休';
    document.getElementById('staffSwapSource').innerHTML='<b>'+esc(source.name)+'</b><span>'+esc(dateLabel(attendanceEdit.date))+' 的休息日</span>';
    const sel=document.getElementById('staffSwapPartner');
    sel.innerHTML=partners.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');
    document.getElementById('staffSwapNote').value='';
    refreshSwapDialog();
    document.getElementById('staffAttendanceDialog').close();
    document.getElementById('staffSwapDialog').showModal();
  }
  function confirmSwap(){
    const aId=attendanceEdit.personId,aDate=attendanceEdit.date;
    const bId=document.getElementById('staffSwapPartner').value,bDate=document.getElementById('staffSwapTargetDate').value;
    const initiatorId=document.getElementById('staffSwapInitiator').value||aId,note=document.getElementById('staffSwapNote').value.trim();
    const a=personById(aId),b=personById(bId),aRec=attendanceGet(aId,aDate),bRec=attendanceGet(bId,bDate);
    if(!a||!b||!bDate){toast('没有可交换的休息日');return}
    if(aRec?.status!=='rest'||bRec?.status!=='rest'){toast('休息表刚刚变了，请重新打开');document.getElementById('staffSwapDialog').close();renderWeek();return}
    if(aDate===bDate){toast('不能和同一天交换');return}
    const id=uid('swap'),stamp=now(),weekStart=weekStartIso(aDate),latest=latestWeekPublication(aDate);
    const aNew={...cloneJson(aRec),swapId:id,updatedAt:stamp};
    const bNew={...cloneJson(bRec),swapId:id,updatedAt:stamp};
    delete state.attendance[aDate][aId];
    delete state.attendance[bDate][bId];
    if(!Object.keys(state.attendance[aDate]).length)delete state.attendance[aDate];
    if(!Object.keys(state.attendance[bDate]).length)delete state.attendance[bDate];
    if(!state.attendance[bDate])state.attendance[bDate]={};
    if(!state.attendance[aDate])state.attendance[aDate]={};
    state.attendance[bDate][aId]=aNew;
    state.attendance[aDate][bId]=bNew;
    const initiator=personById(initiatorId)||a;
    state.swaps.push({
      id,createdAt:stamp,weekStart,
      personAId:a.id,personAName:a.name,personADateBefore:aDate,personADateAfter:bDate,
      personBId:b.id,personBName:b.name,personBDateBefore:bDate,personBDateAfter:aDate,
      initiatorId:initiator.id,initiatorName:initiator.name,note,
      publishedVersionBefore:latest?.version||0
    });
    log('swap',initiator.name+' 发起换休：'+a.name+' '+aDate+' ↔ '+b.name+' '+bDate,note,aDate,'all');
    save();
    document.getElementById('staffSwapDialog').close();
    renderWeek();renderMonth();renderHistory();
    toast('换休已记录，记得重新发布修改版');
  }
  function monthlySwapInitiated(personId,month=monthKey()){
    return (state.swaps||[]).filter(x=>x.initiatorId===personId&&(x.personADateBefore||x.weekStart||'').startsWith(month)).length;
  }
  function renderWeek(){
    const box=document.getElementById('staffWeekTable');if(!box)return;
    const dates=weekDates(currentDate),days=['一','二','三','四','五','六','日'];
    document.getElementById('staffWeekLabel').textContent=weekLabel(currentDate);
    const people=state.people.filter(p=>p.active!==false);
    if(!people.length){
      box.innerHTML='<div class="staff-settings-card"><h3>还没有人员</h3><p>先去“人员”添加员工，再回来排周休。</p></div>';
      return;
    }
    let html='<div class="staff-week-grid staff-week-header"><div class="staff-week-person-head">人员</div>';
    dates.forEach((d,i)=>{html+='<div class="staff-week-day-head"><b>'+days[i]+'</b><small>'+d.slice(8)+'</small></div>'});
    html+='</div>';
    for(const p of people){
      html+='<div class="staff-week-grid staff-week-row"><div class="staff-week-person"><div class="staff-week-avatar" data-staff-avatar="'+esc(p.id)+'">👤</div><span>'+esc(p.name)+'</span></div>';
      dates.forEach(d=>{
        const rec=attendanceGet(p.id,d),status=rec?.status||'work',m=ATTENDANCE_STATUS[status]||ATTENDANCE_STATUS.work;
        html+='<button type="button" class="staff-week-cell status-'+esc(status)+'" data-att-person="'+esc(p.id)+'" data-att-date="'+d+'" title="'+esc(rec?.note||m.label)+'"><span>'+m.icon+'</span><small>'+m.label+'</small></button>';
      });
      html+='</div>';
    }
    box.innerHTML=html;
    box.querySelectorAll('[data-att-person]').forEach(b=>b.addEventListener('click',()=>openAttendance(b.dataset.attPerson,b.dataset.attDate)));
    hydrateAvatars(box);
  }
  function moveWeek(delta){
    const d=dateObj(currentDate);d.setDate(d.getDate()+delta*7);currentDate=localIso(d);renderWeek();
  }
  function monthKey(){return (document.getElementById('staffMonthInput')?.value||currentDate.slice(0,7))}
  function monthlyCounts(personId,month=monthKey()){
    const out={rest:0,leave:0,swap:0,absent:0};
    for(const [date,map] of Object.entries(state.attendance||{})){
      if(!date.startsWith(month))continue;
      const rec=map?.[personId],st=rec?.status;
      if(st&&out[st]!==undefined){
        out[st]+=['am','pm'].includes(rec?.portion)?0.5:1;
      }
    }
    return out;
  }
  function renderMonth(){
    const input=document.getElementById('staffMonthInput'),box=document.getElementById('staffMonthSummary');if(!input||!box)return;
    if(!input.value)input.value=currentDate.slice(0,7);
    const month=input.value,people=state.people.filter(p=>p.active!==false);
    const total={rest:0,leave:0,swap:0,absent:0};
    const rows=people.map(p=>{const c=monthlyCounts(p.id,month);Object.keys(total).forEach(k=>total[k]+=c[k]);return {p,c}});
    box.innerHTML=
      '<div class="staff-month-total"><div><span>休息</span><b>'+total.rest+'</b></div><div><span>请假</span><b>'+total.leave+'</b></div><div><span>调休</span><b>'+total.swap+'</b></div><div class="'+(total.absent?'danger':'')+'"><span>缺勤</span><b>'+total.absent+'</b></div></div>'+
      (rows.length?rows.map(({p,c})=>'<div class="staff-month-row '+(c.absent?'has-absence':'')+'"><div class="staff-month-person"><div class="staff-week-avatar" data-staff-avatar="'+esc(p.id)+'">👤</div><b>'+esc(p.name)+'</b></div><div class="staff-month-stat"><span>💤</span><b>'+c.rest+'</b></div><div class="staff-month-stat"><span>📝</span><b>'+c.leave+'</b></div><div class="staff-month-stat"><span>🔁</span><b>'+c.swap+'</b></div><div class="staff-month-stat absent"><span>❌</span><b>'+c.absent+'</b></div></div>').join(''):'<div class="staff-settings-card"><p>还没有人员。</p></div>');
    hydrateAvatars(box);
  }
  async function shareCanvasPdf(canvas,name){
    const jpg=canvas.toDataURL('image/jpeg',.92);
    const pdf=jpegCanvasToPdf(jpg,canvas.width,canvas.height);
    const file=new File([pdf],name,{type:'application/pdf'});
    try{
      if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name.replace('.pdf','')});toast('PDF 已生成')}
      else downloadBlob(file,file.name);
    }catch(e){if(e.name!=='AbortError')downloadBlob(file,file.name)}
  }
  async function generateWeekPdf(){
    const people=state.people.filter(p=>p.active!==false);if(!people.length){toast('还没有人员');return}
    toast('正在生成周表 PDF…');
    const dates=weekDates(currentDate),W=1754,H=1240,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#151821';ctx.font='700 54px system-ui,sans-serif';ctx.fillText('Cassola · 周休息表',70,82);
    ctx.fillStyle='#535b69';ctx.font='600 27px system-ui,sans-serif';ctx.fillText(weekLabel(currentDate)+' · version #'+state.syncMeta.revision,72,128);
    const left=70,top=180,nameW=300,colW=(W-left*2-nameW)/7;
    const rowH=Math.min(68,(H-top-75)/(people.length+1));
    const days=['一','二','三','四','五','六','日'];
    ctx.font='700 22px system-ui,sans-serif';
    ctx.fillStyle='#f0f2f5';ctx.fillRect(left,top,W-left*2,rowH);
    ctx.fillStyle='#242a35';ctx.fillText('人员',left+16,top+rowH*.65);
    dates.forEach((d,i)=>{ctx.fillText('周'+days[i]+' '+d.slice(5).replace('-','/'),left+nameW+i*colW+12,top+rowH*.65)});
    people.forEach((p,ri)=>{
      const y=top+rowH*(ri+1);ctx.fillStyle=ri%2?'#fafafa':'#f5f6f8';ctx.fillRect(left,y,W-left*2,rowH);
      ctx.fillStyle='#222833';ctx.font='700 '+Math.max(16,Math.min(22,rowH*.34))+'px system-ui,sans-serif';ctx.fillText(p.name,left+16,y+rowH*.63);
      dates.forEach((d,i)=>{
        const st=attendanceGet(p.id,d)?.status||'work',m=ATTENDANCE_STATUS[st]||ATTENDANCE_STATUS.work;
        ctx.fillStyle=st==='absent'?'#b4232c':'#343b48';ctx.font='700 '+Math.max(16,Math.min(22,rowH*.34))+'px system-ui,sans-serif';
        ctx.fillText(m.short,left+nameW+i*colW+colW*.42,y+rowH*.63);
      });
    });
    ctx.fillStyle='#6f7785';ctx.font='500 18px system-ui,sans-serif';ctx.fillText('班=上班  休=休息  假=请假  调=调休  缺=缺勤',70,H-34);
    await shareCanvasPdf(canvas,'Cassola-Week-'+dates[0]+'-v'+state.syncMeta.revision+'.pdf');
  }
  async function generateMonthPdf(){
    const people=state.people.filter(p=>p.active!==false);if(!people.length){toast('还没有人员');return}
    const month=monthKey();toast('正在生成月报 PDF…');
    const W=1754,H=1240,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#151821';ctx.font='700 54px system-ui,sans-serif';ctx.fillText('Cassola · 月度缺勤汇总',70,82);
    ctx.fillStyle='#535b69';ctx.font='600 27px system-ui,sans-serif';ctx.fillText(month+' · version #'+state.syncMeta.revision,72,128);
    const cols=[70,650,900,1150,1400],heads=['人员','休息','请假','调休','缺勤'],top=180,rowH=Math.min(62,(H-top-70)/(people.length+1));
    ctx.fillStyle='#f0f2f5';ctx.fillRect(70,top,W-140,rowH);ctx.fillStyle='#242a35';ctx.font='700 23px system-ui,sans-serif';
    heads.forEach((h,i)=>ctx.fillText(h,cols[i]+10,top+rowH*.64));
    people.forEach((p,i)=>{const y=top+rowH*(i+1),c=monthlyCounts(p.id,month);ctx.fillStyle=i%2?'#fafafa':'#f5f6f8';ctx.fillRect(70,y,W-140,rowH);ctx.fillStyle='#222833';ctx.font='700 '+Math.max(16,Math.min(22,rowH*.35))+'px system-ui,sans-serif';ctx.fillText(p.name,cols[0]+10,y+rowH*.64);ctx.font='600 '+Math.max(16,Math.min(22,rowH*.35))+'px system-ui,sans-serif';ctx.fillText(String(c.rest),cols[1]+20,y+rowH*.64);ctx.fillText(String(c.leave),cols[2]+20,y+rowH*.64);ctx.fillText(String(c.swap),cols[3]+20,y+rowH*.64);ctx.fillStyle=c.absent?'#b4232c':'#222833';ctx.fillText(String(c.absent),cols[4]+20,y+rowH*.64)});
    ctx.fillStyle='#6f7785';ctx.font='500 18px system-ui,sans-serif';ctx.fillText('空白日期默认视为上班；本表只汇总已记录的非正常状态。',70,H-34);
    await shareCanvasPdf(canvas,'Cassola-Month-'+month+'-v'+state.syncMeta.revision+'.pdf');
  }
  function dateLabel(date){
    const d=new Date(date+'T12:00:00');
    return d.toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'});
  }
  function moveDate(delta){
    const d=new Date(currentDate+'T12:00:00');d.setDate(d.getDate()+delta);currentDate=d.toISOString().slice(0,10);
    document.getElementById('staffDate').value=currentDate;renderBoard();
  }

  function cardHtml(p){
    const subtitle=p.nickname||roleById(p.primaryRole)?.name||'';
    return '<button type="button" class="staff-person-card" draggable="true" data-person-id="'+esc(p.id)+'">'+
      '<div class="staff-avatar" data-staff-avatar="'+esc(p.id)+'">'+(p.avatarStamp?'👤':'👤')+'</div>'+
      '<b>'+esc(p.name)+'</b><small>'+esc(subtitle)+'</small></button>';
  }
  function laneHtml(id,name,icon,ids,special=false){
    const people=(ids||[]).map(personById).filter(Boolean);
    return '<section class="staff-lane '+(special?'special ':'')+'" data-staff-drop="'+esc(id)+'">'+
      '<div class="staff-lane-head"><div class="staff-lane-title"><div class="staff-role-icon">'+esc(icon)+'</div><div><strong>'+esc(name)+'</strong><small>'+esc(shiftLabel(currentShift))+'</small></div></div><div class="staff-lane-count">'+people.length+' 人</div></div>'+
      '<div class="staff-lane-body">'+(people.length?people.map(cardHtml).join(''):'<div class="staff-empty">拖到这里，或点人员头像安排</div>')+'</div></section>';
  }
  function renderBoard(){
    const lanes=document.getElementById('staffLanes');if(!lanes)return;
    const sh=scheduleFor(currentDate,currentShift,false),a=sh.assignments||{};
    const active=state.people.filter(p=>p.active!==false);
    const assigned=new Set();
    Object.values(a).forEach(ids=>(ids||[]).forEach(id=>assigned.add(id)));
    const unassigned=active.filter(p=>!assigned.has(p.id)).map(p=>p.id);
    let html='';
    state.roles.forEach(r=>html+=laneHtml(r.id,r.name,r.icon,a[r.id]||[]));
    html+=laneHtml('__unassigned','待安排','🧩',unassigned,true);
    html+='<div class="staff-special-grid">'+laneHtml('__off','休息','💤',a.__off||[],true)+laneHtml('__leave','请假 / 调休','📝',a.__leave||[],true)+'</div>';
    lanes.innerHTML=html;
    document.getElementById('staffBoardTitle').textContent=dateLabel(currentDate)+' · '+shiftLabel(currentShift);
    document.getElementById('staffDate').value=currentDate;
    document.querySelectorAll('[data-staff-shift]').forEach(b=>b.classList.toggle('active',b.dataset.staffShift===currentShift));
    installCards();
    hydrateAvatars(lanes);
    refreshSyncUi();
  }

  function installCards(){
    document.querySelectorAll('#staffLanes .staff-person-card').forEach(card=>{
      const id=card.dataset.personId;
      card.addEventListener('click',e=>{if(Date.now()<suppressClickUntil)return;e.preventDefault();openMove(id)});
      card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',id);card.classList.add('drag-source')});
      card.addEventListener('dragend',()=>card.classList.remove('drag-source'));
      card.addEventListener('contextmenu',e=>e.preventDefault());
      installLongPressDrag(card,id);
    });
    document.querySelectorAll('#staffLanes [data-staff-drop]').forEach(lane=>{
      lane.addEventListener('dragover',e=>{e.preventDefault();lane.classList.add('drag-over')});
      lane.addEventListener('dragleave',()=>lane.classList.remove('drag-over'));
      lane.addEventListener('drop',e=>{
        e.preventDefault();document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
        const id=e.dataTransfer.getData('text/plain');if(id)assignPerson(id,lane.dataset.staffDrop);
      });
    });
  }
  function installLongPressDrag(card,id){
    let timer=null,startX=0,startY=0,dragging=false,ghost=null;
    const clear=()=>{if(timer)clearTimeout(timer);timer=null};
    card.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse')return;
      startX=e.clientX;startY=e.clientY;
      timer=setTimeout(()=>{
        dragging=true;suppressClickUntil=Date.now()+600;
        ghost=card.cloneNode(true);ghost.classList.add('staff-drag-ghost');ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';document.body.appendChild(ghost);
        card.classList.add('drag-source');
        try{card.setPointerCapture(e.pointerId)}catch(_){}
      },340);
    });
    card.addEventListener('pointermove',e=>{
      if(!dragging){
        if(Math.hypot(e.clientX-startX,e.clientY-startY)>10)clear();
        return;
      }
      e.preventDefault();ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
      document.querySelectorAll('#staffLanes [data-staff-drop]').forEach(x=>x.classList.remove('drag-over'));
      ghost.style.display='none';const hit=document.elementFromPoint(e.clientX,e.clientY);ghost.style.display='';
      hit?.closest?.('[data-staff-drop]')?.classList.add('drag-over');
    });
    const finish=e=>{
      clear();
      if(dragging){
        ghost.style.display='none';const hit=document.elementFromPoint(e.clientX,e.clientY);ghost.remove();card.classList.remove('drag-source');
        document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
        const lane=hit?.closest?.('[data-staff-drop]');if(lane)assignPerson(id,lane.dataset.staffDrop,'拖拽安排');
      }
      dragging=false;ghost=null;
    };
    card.addEventListener('pointerup',finish);card.addEventListener('pointercancel',finish);
  }

  function openMove(personId){
    const p=personById(personId);if(!p)return;
    document.getElementById('staffMoveTitle').textContent=p.name+' · '+dateLabel(currentDate);
    const current=assignedLane(personId);
    const choices=[
      ...state.roles.map(r=>({id:r.id,name:r.icon+' '+r.name})),
      {id:'__unassigned',name:'🧩 待安排'},
      {id:'__off',name:'💤 休息'},
      {id:'__leave',name:'📝 请假 / 调休'}
    ];
    const grid=document.getElementById('staffMoveGrid');
    grid.innerHTML=choices.map(c=>'<button type="button" data-move-lane="'+esc(c.id)+'" class="'+(c.id===current?'active':'')+'">'+esc(c.name)+'</button>').join('');
    grid.onclick=e=>{
      const b=e.target.closest('[data-move-lane]');if(!b)return;
      assignPerson(personId,b.dataset.moveLane,'点选安排');document.getElementById('staffMoveDialog').close();
    };
    document.getElementById('staffMoveDialog').showModal();
  }

  function renderPeople(){
    const list=document.getElementById('staffPeopleList');if(!list)return;
    const arr=state.people.filter(p=>p.active!==false);
    list.innerHTML=arr.length?arr.map(p=>{
      const role=roleById(p.primaryRole)?.name||'未设主要岗位';
      return '<div class="staff-person-row"><div class="staff-avatar" data-staff-avatar="'+esc(p.id)+'">👤</div><div class="staff-person-copy"><b>'+esc(p.name)+(p.nickname?' · '+esc(p.nickname):'')+'</b><small>'+esc(role)+(p.note?' · '+esc(p.note):'')+'</small></div><div class="staff-row-actions"><button class="staff-icon-btn" data-person-records="'+esc(p.id)+'" title="人员记录">🕘</button><button class="staff-icon-btn" data-edit-person="'+esc(p.id)+'">✎</button></div></div>';
    }).join(''):'<div class="staff-settings-card"><h3>还没有人员</h3><p>点“＋ 人员”，可以从微信头像开始组建这支臭排班军团🗿。</p></div>';
    list.querySelectorAll('[data-edit-person]').forEach(b=>b.addEventListener('click',()=>openPerson(b.dataset.editPerson)));
    list.querySelectorAll('[data-person-records]').forEach(b=>b.addEventListener('click',()=>openPersonRecords(b.dataset.personRecords)));
    hydrateAvatars(list);
  }

  function openPersonRecords(personId){
    const p=personById(personId);if(!p)return;
    const rows=[];
    for(const [date,map] of Object.entries(state.attendance||{})){
      const rec=map?.[personId];if(!rec)continue;
      rows.push({date,...rec});
    }
    rows.sort((a,b)=>b.date.localeCompare(a.date));
    const title=document.getElementById('staffPersonRecordsTitle');
    const list=document.getElementById('staffPersonRecordsList');
    title.textContent=p.name+' · 人员记录';
    list.innerHTML=rows.length?rows.map(rec=>{
      const meta=ATTENDANCE_STATUS[rec.status]||{icon:'·',label:rec.status||'记录'};
      const part=rec.status!=='work'?(rec.portion==='am'?'上午':rec.portion==='pm'?'下午':'全天'):'';
      return '<div class="staff-person-record-item">'+
        '<div class="staff-person-record-date">'+esc(rec.date)+'</div>'+
        '<div class="staff-person-record-main"><b>'+esc(meta.icon+' '+meta.label)+(part?' · '+esc(part):'')+'</b>'+
        (rec.note?'<small>'+esc(rec.note)+'</small>':'')+'</div>'+
      '</div>';
    }).join(''):'<div class="staff-settings-card"><p>这个人还没有休假 / 调休 / 缺勤记录。</p></div>';
    document.getElementById('staffPersonRecordsDialog').showModal();
  }

  function fillRoleOptions(selected=''){
    const sel=document.getElementById('staffPersonRole');
    sel.innerHTML='<option value="">未指定</option>'+state.roles.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.icon+' '+r.name)+'</option>').join('');
    sel.value=selected||'';
  }
  async function openPerson(id=null){
    editPersonId=id;pendingAvatarBlob=null;
    const p=id?personById(id):null;
    document.getElementById('staffPersonDialogTitle').textContent=p?'编辑人员':'新增人员';
    document.getElementById('staffPersonName').value=p?.name||'';
    document.getElementById('staffPersonNickname').value=p?.nickname||'';
    document.getElementById('staffPersonNote').value=p?.note||'';
    fillRoleOptions(p?.primaryRole||'');
    document.getElementById('staffDeletePerson').style.display=p?'inline-block':'none';
    const prev=document.getElementById('staffPhotoPreview');prev.innerHTML='👤';
    if(p?.avatarStamp){const url=await getAvatarUrl(p.id);if(url)prev.innerHTML='<img alt="" src="'+url+'">'}
    document.getElementById('staffPersonDialog').showModal();
  }
  async function savePerson(){
    const name=document.getElementById('staffPersonName').value.trim();if(!name){toast('先写名字🗿');return}
    let p=editPersonId?personById(editPersonId):null;
    if(!p){p={id:uid('person'),name:'',nickname:'',primaryRole:'',note:'',active:true,avatarStamp:''};state.people.push(p)}
    const wasNew=!editPersonId;
    p.name=name;p.nickname=document.getElementById('staffPersonNickname').value.trim();
    p.primaryRole=document.getElementById('staffPersonRole').value;p.note=document.getElementById('staffPersonNote').value.trim();
    if(pendingAvatarBlob==='remove'){await avatarDelete(p.id);p.avatarStamp=''}
    else if(pendingAvatarBlob instanceof Blob){await avatarPut(p.id,pendingAvatarBlob);p.avatarStamp=now()}
    log('person',(wasNew?'新增人员：':'更新人员：')+p.name);
    save();document.getElementById('staffPersonDialog').close();renderPeople();renderBoard();renderHistory();toast('人员已保存');
  }
  async function deletePerson(){
    const p=personById(editPersonId);if(!p)return;
    if(!confirm('删除 '+p.name+'？历史记录会保留，但今后的排班不再显示这个人。'))return;
    state.people=state.people.filter(x=>x.id!==p.id);removePersonEverywhere(p.id);await avatarDelete(p.id);
    log('person','删除人员：'+p.name);save();document.getElementById('staffPersonDialog').close();renderPeople();renderBoard();renderHistory();toast('已删除');
  }

  function renderHistory(){
    const list=document.getElementById('staffHistoryList');if(!list)return;
    list.innerHTML=state.history.length?state.history.slice(0,300).map(h=>{
      const labels={schedule:'排班',attendance:'出勤',person:'人员',role:'岗位',import:'导入',copy:'复制'};
      return '<div class="staff-history-item"><span class="staff-history-badge">'+esc(labels[h.type]||h.type)+'</span><div class="staff-history-copy">'+esc(h.text)+'<small>'+esc(h.note||'')+(h.date?' · '+esc(h.date)+' '+esc(shiftLabel(h.shift)):'')+'</small></div><div class="staff-history-time">'+esc(new Date(h.time).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))+'</div></div>';
    }).join(''):'<div class="staff-settings-card"><p>还没有历史记录。</p></div>';
  }

  function renderRoles(){
    const box=document.getElementById('staffRoleList');if(!box)return;
    box.innerHTML=state.roles.map(r=>'<div class="staff-role-row" data-role-row="'+esc(r.id)+'"><input class="staff-role-emoji" value="'+esc(r.icon)+'" maxlength="4" aria-label="岗位图标"><input class="staff-role-name" value="'+esc(r.name)+'" aria-label="岗位名称"><button class="staff-icon-btn" data-role-delete="'+esc(r.id)+'">✕</button></div>').join('');
    box.querySelectorAll('[data-role-row]').forEach(row=>{
      const id=row.dataset.roleRow;
      const inputs=row.querySelectorAll('input');
      inputs.forEach(inp=>inp.addEventListener('change',()=>{
        const r=roleById(id);if(!r)return;
        r.icon=row.querySelector('.staff-role-emoji').value.trim()||'📍';
        r.name=row.querySelector('.staff-role-name').value.trim()||'岗位';
        log('role','更新岗位：'+r.name);save();renderBoard();fillRoleOptions();toast('岗位已更新');
      }));
    });
    box.querySelectorAll('[data-role-delete]').forEach(btn=>btn.addEventListener('click',()=>{
      const r=roleById(btn.dataset.roleDelete);if(!r)return;
      if(!confirm('删除岗位 '+r.name+'？已经排在这里的人会回到待安排。'))return;
      for(const day of Object.values(state.schedules))for(const sh of Object.values(day||{}))if(sh?.assignments)delete sh.assignments[r.id];
      state.people.forEach(p=>{if(p.primaryRole===r.id)p.primaryRole=''});
      state.roles=state.roles.filter(x=>x.id!==r.id);log('role','删除岗位：'+r.name);save();renderRoles();renderBoard();toast('岗位已删除');
    }));
  }
  function renderSettings(){renderRoles();refreshSyncUi()}
  function refreshSyncUi(){
    const r=state?.syncMeta?.revision||1,u=state?.syncMeta?.updatedAt;
    const top=document.getElementById('staffTopVersion');if(top)top.textContent='#'+r;
    const a=document.getElementById('staffRevision');if(a)a.textContent='#'+r;
    const b=document.getElementById('staffUpdated');if(b)b.textContent=u?new Date(u).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
    const d=document.getElementById('staffDeviceName');if(d&&document.activeElement!==d)d.value=state?.syncMeta?.deviceName||'本设备';
  }

  function copyPreviousDay(){
    const src=new Date(currentDate+'T12:00:00');src.setDate(src.getDate()-1);const srcDate=src.toISOString().slice(0,10);
    const from=scheduleFor(srcDate,currentShift,false);
    if(!Object.keys(from.assignments||{}).length){toast('昨日这个班次没有排班');return}
    if(Object.keys(scheduleFor(currentDate,currentShift,false).assignments||{}).length&&!confirm('今天已经有排班，确定用昨日覆盖？'))return;
    const dest=scheduleFor(currentDate,currentShift,true);
    dest.assignments=JSON.parse(JSON.stringify(from.assignments||{}));
    log('copy','复制 '+srcDate+' '+shiftLabel(currentShift)+' → '+currentDate,'整班复制');save();renderBoard();renderHistory();toast('昨日排班已复制');
  }

  async function exportJson(includeAvatars=false){
    save();
    const payload={...state,format:includeAvatars?'cassola-staff-backup-v1':'cassola-staff-handoff-v1',exportedAt:now()};
    if(includeAvatars){
      const avatars={};
      for(const p of state.people){
        if(!p.avatarStamp)continue;
        const blob=await avatarGet(p.id);
        if(blob)avatars[p.id]=await blobToDataUrl(blob);
      }
      payload.avatars=avatars;
    }
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    const dev=(state.syncMeta.deviceName||'device').replace(/[^\w\u4e00-\u9fff-]+/g,'-').slice(0,20);
    const prefix=includeAvatars?'cassola-staff-full-v':'cassola-staff-v';
    a.download=prefix+state.syncMeta.revision+'-'+dev+'-'+todayLocal()+'.json';
    a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast(includeAvatars?'已导出完整 Staff 备份 #'+state.syncMeta.revision:'已导出 Staff #'+state.syncMeta.revision);
  }
  function importDiff(data){
    const lp=new Map(state.people.map(p=>[p.id,p])),ip=new Map((data.people||[]).map(p=>[p.id,p]));
    const lr=new Map(state.roles.map(r=>[r.id,r])),ir=new Map((data.roles||[]).map(r=>[r.id,r]));
    let people=0,roles=0;
    new Set([...lp.keys(),...ip.keys()]).forEach(id=>{if(JSON.stringify(lp.get(id))!==JSON.stringify(ip.get(id)))people++});
    new Set([...lr.keys(),...ir.keys()]).forEach(id=>{if(JSON.stringify(lr.get(id))!==JSON.stringify(ir.get(id)))roles++});
    const localHist=new Set(state.history.map(h=>h.id));const hist=(data.history||[]).filter(h=>!localHist.has(h.id)).length;
    let attendance=0;
    const dates=new Set([...Object.keys(state.attendance||{}),...Object.keys(data.attendance||{})]);
    dates.forEach(date=>{
      const a=state.attendance?.[date]||{},b=data.attendance?.[date]||{};
      const ids=new Set([...Object.keys(a),...Object.keys(b)]);
      ids.forEach(id=>{if(JSON.stringify(a[id]||null)!==JSON.stringify(b[id]||null))attendance++});
    });
    return {people,roles,hist,attendance};
  }
  function previewImport(data){
    const incoming=normalize(data),localRev=num(state.syncMeta.revision),inRev=num(incoming.syncMeta.revision);
    const localHash=fingerprint(state),inHash=incoming.syncMeta.contentHash||fingerprint(incoming);
    let mode='newer',title='✅ 可以导入',detail='这份 Staff 数据比本机更新。';
    if(!data.syncMeta?.revision){mode='legacy';title='⚠️ 旧版数据包';detail='没有版本号，默认不直接覆盖。'}
    else if(inRev<localRev){mode='older';title='⛔ 这是旧版本';detail='本机 #'+localRev+'，文件只有 #'+inRev+'。'}
    else if(inRev===localRev&&inHash!==localHash){mode='fork';title='⚠️ 同版本分叉冲突';detail='两台设备从同一版本各自改过，不能自动判断谁覆盖谁。'}
    else if(inRev===localRev&&inHash===localHash){mode='same';title='ℹ️ 已经是同一份数据';detail='不需要重复导入。'}
    const d=importDiff(incoming);importCandidate={raw:data,incoming,mode,inRev,localRev};
    const cls=(mode==='newer'||mode==='same')?'':(mode==='fork'?'warn':'danger');
    document.getElementById('staffImportSummary').innerHTML=
      '<div class="staff-import-banner '+cls+'"><strong>'+esc(title)+'</strong><span>'+esc(detail)+'</span></div>'+
      '<div class="staff-import-compare" style="margin-top:10px"><div><span>本机</span><b>#'+localRev+'</b></div><div class="arrow">→</div><div><span>文件</span><b>#'+(inRev||'?')+'</b></div></div>'+
      '<div class="staff-sync-grid"><div class="staff-sync-stat"><span>人员变化</span><b>'+d.people+'</b></div><div class="staff-sync-stat"><span>休假/缺勤变化</span><b>'+d.attendance+'</b></div><div class="staff-sync-stat"><span>新增历史</span><b>'+d.hist+'</b></div><div class="staff-sync-stat"><span>头像</span><b>'+Object.keys(data.avatars||{}).length+'</b></div></div>';
    document.getElementById('staffAcceptImport').style.display=mode==='newer'?'inline-block':'none';
    document.getElementById('staffForceImport').style.display=['older','legacy','fork'].includes(mode)?'inline-block':'none';
    document.getElementById('staffImportDialog').showModal();
  }
  async function applyImport(force=false){
    if(!importCandidate)return;
    if(force&&!confirm('确定强制采用这份 Staff 数据？这会覆盖本机当前排班。'))return;
    const localDevice=state.syncMeta.deviceName,oldRev=num(state.syncMeta.revision),raw=importCandidate.raw;
    const incoming=normalize(raw);state=incoming;
    state.syncMeta.deviceName=localDevice;
    state.syncMeta.revision=force?Math.max(oldRev,num(incoming.syncMeta.revision))+1:Math.max(1,num(incoming.syncMeta.revision));
    state.syncMeta.updatedAt=force?now():(incoming.syncMeta.updatedAt||raw.exportedAt||now());
    state.syncMeta.contentHash=fingerprint(state);
    for(const [id,url] of Object.entries(raw.avatars||{})){try{await avatarPut(id,dataUrlToBlob(url))}catch(_){}}
    state.syncMeta.contentHash=fingerprint(state);
    localStorage.setItem(KEY,JSON.stringify(state));
    document.getElementById('staffImportDialog').close();importCandidate=null;
    renderAll();toast(force?'已强制采用，现为 #'+state.syncMeta.revision:'已导入 #'+state.syncMeta.revision);
  }

  async function clearAll(){
    if(!confirm('清空 Staff 的人员、岗位自定义、排班和历史？Inventory 不受影响。'))return;
    if(!confirm('再确认一次：这个动作不能撤销，除非你有 Staff JSON。'))return;
    for(const p of state.people)try{await avatarDelete(p.id)}catch(_){}
    state=defaultState();state.syncMeta.contentHash=fingerprint(state);localStorage.setItem(KEY,JSON.stringify(state));renderAll();toast('Staff 已清空');
  }

  async function generatePdf(){
    if(!state.people.length){toast('还没有人员，PDF 会很寂寞🗿');return}
    toast('正在生成 PDF…');
    const W=1754,H=1240,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#151821';ctx.font='700 58px system-ui, sans-serif';ctx.fillText('Cassola Staff',72,88);
    ctx.font='600 31px system-ui, sans-serif';ctx.fillStyle='#444b59';ctx.fillText(dateLabel(currentDate)+' · '+shiftLabel(currentShift),74,137);
    ctx.font='500 21px system-ui, sans-serif';ctx.fillStyle='#717988';ctx.fillText('排班版本 #'+state.syncMeta.revision+' · '+new Date().toLocaleString('zh-CN'),74,174);
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(72,202);ctx.lineTo(W-72,202);ctx.stroke();

    const a=scheduleFor(currentDate,currentShift,false).assignments||{},assigned=new Set();
    Object.values(a).forEach(ids=>(ids||[]).forEach(id=>assigned.add(id)));
    const active=state.people.filter(p=>p.active!==false),unassigned=active.filter(p=>!assigned.has(p.id)).map(p=>p.id);
    const rows=[
      ...state.roles.map(r=>({id:r.id,name:r.icon+' '+r.name,ids:a[r.id]||[]})),
      {id:'__off',name:'💤 休息',ids:a.__off||[]},
      {id:'__leave',name:'📝 请假 / 调休',ids:a.__leave||[]},
      {id:'__unassigned',name:'🧩 待安排',ids:unassigned}
    ];
    const left=72,right=W-72,labelW=300,chipW=185,chipH=62,gap=12,perLine=Math.max(1,Math.floor((right-left-labelW)/(chipW+gap)));
    const heights=rows.map(r=>Math.max(82,Math.ceil(Math.max(1,r.ids.length)/perLine)*74));
    const available=H-250-55,total=heights.reduce((x,y)=>x+y,0),scale=Math.min(1,available/total);
    let y=225;
    for(let ri=0;ri<rows.length;ri++){
      const row=rows[ri],rh=heights[ri]*scale;
      ctx.fillStyle=ri%2?'#fafafa':'#f5f6f8';roundRect(ctx,left,y,right-left,rh-6,22);ctx.fill();
      ctx.fillStyle='#212631';ctx.font='700 '+Math.round(27*scale)+'px system-ui, sans-serif';ctx.fillText(row.name,left+20,y+Math.min(45*scale,rh/2+8));
      let x=left+labelW,cy=y+10;
      for(let i=0;i<row.ids.length;i++){
        const p=personById(row.ids[i]);if(!p)continue;
        const col=i%perLine;if(col===0&&i>0)cy+=74*scale;
        x=left+labelW+col*(chipW+gap)*scale;
        ctx.fillStyle='#ffffff';roundRect(ctx,x,cy,chipW*scale,chipH*scale,18*scale);ctx.fill();
        ctx.strokeStyle='#e3e5ea';ctx.lineWidth=1.5;roundRect(ctx,x,cy,chipW*scale,chipH*scale,18*scale);ctx.stroke();
        const ax=x+12*scale,ay=cy+8*scale,as=46*scale;
        ctx.save();ctx.beginPath();ctx.arc(ax+as/2,ay+as/2,as/2,0,Math.PI*2);ctx.clip();
        const blob=await avatarGet(p.id);
        if(blob){try{const bmp=await createImageBitmap(blob);ctx.drawImage(bmp,ax,ay,as,as);bmp.close?.()}catch(_){ctx.fillStyle='#dfe3eb';ctx.fillRect(ax,ay,as,as)}}
        else{ctx.fillStyle='#dfe3eb';ctx.fillRect(ax,ay,as,as);ctx.fillStyle='#626a78';ctx.font=Math.round(22*scale)+'px system-ui';ctx.fillText('👤',ax+10*scale,ay+31*scale)}
        ctx.restore();
        ctx.fillStyle='#222833';ctx.font='700 '+Math.round(20*scale)+'px system-ui, sans-serif';
        let nm=p.name;if(nm.length>8)nm=nm.slice(0,8)+'…';ctx.fillText(nm,x+66*scale,cy+36*scale);
      }
      y+=rh;
    }
    ctx.fillStyle='#7b8492';ctx.font='500 18px system-ui, sans-serif';ctx.fillText('Generated locally by Cassola Staff Board',72,H-28);

    const jpg=canvas.toDataURL('image/jpeg',.92);
    const pdf=jpegCanvasToPdf(jpg,W,H);
    const file=new File([pdf],'Cassola-Staff-'+currentDate+'-'+currentShift+'-v'+state.syncMeta.revision+'.pdf',{type:'application/pdf'});
    try{
      if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Cassola Staff '+currentDate});toast('PDF 已生成')}
      else downloadBlob(file,file.name);
    }catch(e){if(e.name!=='AbortError')downloadBlob(file,file.name)}
  }
  function roundRect(ctx,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  }
  function downloadBlob(blob,name){
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast('PDF 已生成');
  }
  function jpegCanvasToPdf(dataUrl,w,h){
    const bin=atob(dataUrl.split(',')[1]),img=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)img[i]=bin.charCodeAt(i);
    const enc=s=>new TextEncoder().encode(s),parts=[],offsets=[0],push=b=>parts.push(typeof b==='string'?enc(b):b);
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const length=()=>parts.reduce((n,p)=>n+p.length,0);
    const obj=(n,body)=>{offsets[n]=length();push(n+' 0 obj\n');push(body);push('\nendobj\n')};
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=length();push('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+w+' /Height '+h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+img.length+' >>\nstream\n');push(img);push('\nendstream\nendobj\n');
    const stream='q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n';obj(5,'<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
    const xref=length();push('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
    const total=length(),out=new Uint8Array(total);let pos=0;for(const p of parts){out.set(p,pos);pos+=p.length}return out;
  }

  function bindUi(){
    document.getElementById('staffHomeBtn').addEventListener('click',()=>window.CassolaHub?.show());
    document.querySelectorAll('.staff-nav-btn').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.staffView)));
    document.getElementById('staffPrevWeek').addEventListener('click',()=>moveWeek(-1));
    document.getElementById('staffNextWeek').addEventListener('click',()=>moveWeek(1));
    document.getElementById('staffThisWeek').addEventListener('click',()=>{currentDate=todayLocal();renderWeek()});
    document.getElementById('staffWeekPdfBtn').addEventListener('click',generateWeekPdf);
    document.getElementById('staffMonthInput').addEventListener('change',renderMonth);
    document.getElementById('staffMonthPdfBtn').addEventListener('click',generateMonthPdf);
    document.querySelectorAll('[data-att-status]').forEach(b=>b.addEventListener('click',()=>{
      document.getElementById('staffAttendanceStatus').value=b.dataset.attStatus;
      document.querySelectorAll('[data-att-status]').forEach(x=>x.classList.toggle('active',x===b));
      document.getElementById('staffAttendancePortionWrap').classList.toggle('hidden',b.dataset.attStatus==='work');
    }));
    document.querySelectorAll('[data-att-portion]').forEach(b=>b.addEventListener('click',()=>{
      document.getElementById('staffAttendancePortion').value=b.dataset.attPortion;
      document.querySelectorAll('[data-att-portion]').forEach(x=>x.classList.toggle('active',x===b));
    }));
    document.getElementById('staffAttendanceStart').addEventListener('change',e=>{
      const end=document.getElementById('staffAttendanceEnd');if(!end.value||end.value<e.target.value)end.value=e.target.value;
    });
    document.getElementById('staffSaveAttendance').addEventListener('click',()=>{
      if(!attendanceEdit.personId)return;
      const start=document.getElementById('staffAttendanceStart').value||attendanceEdit.date;
      const end=document.getElementById('staffAttendanceEnd').value||start;
      const status=document.getElementById('staffAttendanceStatus').value||'work';
      const note=document.getElementById('staffAttendanceNote').value||'';
      const portion=document.getElementById('staffAttendancePortion').value||'full';
      setAttendanceRange(attendanceEdit.personId,start,end,status,note,portion);
      document.getElementById('staffAttendanceDialog').close();
    });
    document.getElementById('staffOpenHistory').addEventListener('click',()=>showView('history'));
    document.getElementById('staffPrevDay').addEventListener('click',()=>moveDate(-1));
    document.getElementById('staffNextDay').addEventListener('click',()=>moveDate(1));
    document.getElementById('staffToday').addEventListener('click',()=>{currentDate=todayLocal();renderBoard()});
    document.getElementById('staffDate').addEventListener('change',e=>{currentDate=e.target.value||currentDate;renderBoard()});
    document.querySelectorAll('[data-staff-shift]').forEach(b=>b.addEventListener('click',()=>{currentShift=b.dataset.staffShift;renderBoard()}));
    document.getElementById('staffAddPerson').addEventListener('click',()=>openPerson());
    document.getElementById('staffSavePerson').addEventListener('click',savePerson);
    document.getElementById('staffDeletePerson').addEventListener('click',deletePerson);
    document.getElementById('staffPhotoInput').addEventListener('change',async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{pendingAvatarBlob=await resizePhoto(file);const url=URL.createObjectURL(pendingAvatarBlob);document.getElementById('staffPhotoPreview').innerHTML='<img alt="" src="'+url+'">'}catch(_){toast('这个图片没读成功')}
      e.target.value='';
    });
    document.getElementById('staffRemovePhoto').addEventListener('click',()=>{pendingAvatarBlob='remove';document.getElementById('staffPhotoPreview').innerHTML='👤'});
    document.getElementById('staffAddRole').addEventListener('click',()=>{
      const name=prompt('新岗位名称');if(!name?.trim())return;const icon=prompt('岗位图标（Emoji）','📍')||'📍';
      state.roles.push({id:uid('role'),name:name.trim(),icon:icon.trim()||'📍'});log('role','新增岗位：'+name.trim());save();renderRoles();renderBoard();toast('岗位已添加');
    });
    document.getElementById('staffCopyPrev').addEventListener('click',copyPreviousDay);
    document.getElementById('staffPdfBtn').addEventListener('click',generatePdf);
    document.getElementById('staffExportBtn').addEventListener('click',()=>exportJson(false));
    document.getElementById('staffExportFullBtn').addEventListener('click',()=>exportJson(true));
    document.getElementById('staffImportInput').addEventListener('change',e=>{
      const file=e.target.files?.[0];if(!file)return;
      const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!Array.isArray(data.people)||!Array.isArray(data.roles))throw new Error();previewImport(data)}catch(_){alert('这个文件不是有效的 Cassola Staff JSON。')}};r.readAsText(file);e.target.value='';
    });
    document.getElementById('staffAcceptImport').addEventListener('click',()=>applyImport(false));
    document.getElementById('staffForceImport').addEventListener('click',()=>applyImport(true));
    document.getElementById('staffDeviceName').addEventListener('change',e=>{state.syncMeta.deviceName=e.target.value.trim()||'本设备';localStorage.setItem(KEY,JSON.stringify(state));refreshSyncUi();toast('设备名已保存')});
    document.getElementById('staffResetBtn').addEventListener('click',clearAll);
    document.getElementById('staffClearHistory').addEventListener('click',()=>{
      if(state.history.length<=200){toast('历史还不多，不用清理');return}
      if(confirm('只保留最近 200 条 Staff 历史？')){state.history=state.history.slice(0,200);save();renderHistory()}
    });
  }

  function renderAll(){renderWeek();renderMonth();renderBoard();renderPeople();renderHistory();renderSettings();showView(currentView)}
  function init(){load();buildApp();renderAll()}
  function show(){if(!state)init();document.getElementById('staffApp')?.removeAttribute('aria-hidden');renderAll()}
  function hide(){document.getElementById('staffApp')?.setAttribute('aria-hidden','true')}

  document.addEventListener('DOMContentLoaded',init);
  window.CassolaStaff={show,hide,render:renderAll};
})();

const APP_KEY = 'cassola_inventory_v01';

function parseLocaleDecimal(value){
  if(typeof value==='number')return Number.isFinite(value)?value:NaN;
  const raw=String(value??'').trim().replace(/\s+/g,'').replace(/,/g,'.');
  if(!raw)return NaN;
  return Number(raw);
}

const seedSkus = [
  // 寿司基础
  ['rice20','寿司米','20kg','袋','寿司基础','米兰'],['soy20','寿司酱油','20L','箱','寿司基础','米兰'],['mirin18','寿司美林','18L','箱','寿司基础','米兰'],['sake18','寿司清酒','18L','箱','寿司基础','米兰'],['shiragiku20','寿司白菊','20L','箱','寿司基础','米兰'],['nori','寿司紫菜','','包','寿司基础','米兰'],['ginger10','寿司生姜','10kg净含量','箱','寿司基础','米兰'],['wasabi','Wasabi','','份','寿司基础','米兰'],
  // 干货
  ['blackrice1','寿司黑米','1kg','包','干货','米兰'],['pistacchio1','Pistacchio碎','1kg','包','干货','米兰'],['onion400','洋葱碎','400g','包','干货','米兰'],['mandorle500','Mandorle杏仁片','500g','包','干货','米兰'],['almondgrain1','杏仁粒','1kg','包','干货','米兰'],['peanut1','花生仁','1kg','包','干货','米兰'],['sesamewhite1','白芝麻','1kg','包','干货','米兰'],['sesameblack1','黑芝麻','1kg','包','干货','米兰'],['kombu','昆布','','包','干货','米兰'],['tacos135','Tacos片','135g','小盒','干货','米兰'],['cornchips450','玉米薯片','450g','包','干货','米兰'],['inari20','豆皮','20张/包','包','干货','米兰'],
  // 酱料
  ['chili450','仙女牌辣椒酱','450ml','瓶','酱料','米兰'],['yuzu1','食研芥末柚子汁','1L','瓶','酱料','米兰'],['ponzu1','Ponzu Kikkoman','1L','瓶','酱料','米兰'],['sesameoil175','芝麻油','1.75L','瓶','酱料','米兰'],['peach240','桃子罐头','240g净含量','罐','酱料','Tosano'],
  // 冷藏
  ['mayo505','Maionese','5.05kg','桶','冷藏','米兰'],['condensed397','炼乳','397g','罐','冷藏','米兰'],['phila165','Philadelphia','1.65kg','盒','冷藏','米兰'],['butter500','Burro','500g','块','冷藏','Tosano'],['butter250','Burro','250g','块','冷藏','Tosano'],['panna200','Panna','200ml','盒','冷藏','Tosano'],['panna125','Panna','125ml','盒','冷藏','Tosano'],['pannafungo125','Panna蘑菇','125ml','盒','冷藏','Tosano'],['orange750','橙汁','750ml','瓶','冷藏','Tosano'],['passionpuree1','浓缩百香果汁','1kg','袋','冷藏','米兰'],['mangopuree1','浓缩芒果','1kg','袋','冷藏','米兰'],['tonno13','Tonno罐头','1.3kg净含量','罐','冷藏','Tosano'],
  // 蔬果
  ['lime','青柠檬','','箱','蔬果','大兴'],['greenapple','青苹果','','篮/箱','蔬果','大兴'],['redapple','红苹果','','颗','蔬果','大兴'],['salad','摆盘沙拉菜','','篮','蔬果','大兴'],['quail18','鹌鹑蛋','18颗装','盒','蔬果','大兴'],['quail12','鹌鹑蛋','12颗装','盒','蔬果','大兴'],['strawberry','草莓','','小盒','蔬果','大兴'],['mango_hard','硬芒果','','颗','蔬果','Tosano'],['mango_soft','软芒果','','颗','蔬果','大兴'],['passion','百香果','','小箱','蔬果','大兴'],['cucumber','黄瓜','','篮','蔬果','大兴'],['avocado_hard','Avocado硬','','箱','蔬果','大兴'],['avocado_half','Avocado半硬','','箱','蔬果','大兴'],['avocado_soft','Avocado软','','箱','蔬果','大兴'],['daikon','白萝卜','','篮','蔬果','大兴'],['radish','水萝卜','','包','蔬果','Tosano'],['basil','Basilico','自己种','份','蔬果','自种'],
  // 冷冻
  ['kataifi1','Kadaifi','1kg','包','冷冻','米兰'],['gamberi_s800','gamberi rossi小','800g','盒','冷冻','米兰'],['gamberi_l800','gamberi rossi大','800g','盒','冷冻','米兰'],['scampi_l800','Scampi大','800g','盒','冷冻','米兰'],['scampi_s800','Scampi小','800g','盒','冷冻','米兰'],['amaebi_c1_2','Amaebi C1','2kg','盒','冷冻','米兰'],['capesante900','Capesante','900g','包','冷冻','米兰'],['wakame1','Wakame','1kg','包','冷冻','米兰'],['tobiko500','Tobiko','500g','盒','冷冻','米兰'],['ikura1','Ikura','1kg','盒','冷冻','米兰'],['ikura500','Ikura','500g','盒','冷冻','米兰'],['surimi1','Surimi','1kg','包','冷冻','米兰'],['surimi_hf1','Surimi恒丰','1kg','包','冷冻','米兰'],['anguilla','Anguilla','','包','冷冻','米兰'],['polipo_raw','Polipo原料','11–12kg/箱','箱','冷冻','米兰'],
  // 处理库存
  ['nigiri_shrimp','Nigiri虾','','包','处理库存','内部'],['maki_shrimp','Maki虾','','包','处理库存','内部'],['nigiri_amaebi','Nigiri Amaebi','','包','处理库存','内部'],['amaebi碎','碎Amaebi','','包','处理库存','内部'],['polipo_processed','Polipo','2根腿/包','包','处理库存','内部'],['maki_amaebi','Maki Amaebi','','包','处理库存','内部'],['lobster','龙虾','','包','处理库存','内部'],
  // 耗材
  ['zongye','粽叶','','箱','耗材','米兰'],['glove_m','白M手套','','盒','耗材','米兰'],['glove_l','白L手套','','盒','耗材','米兰'],

  // Bar / Sala · 甜点
  ['sala_mochi_mango','Mochi mango','','个','甜点','待确认','bar'],
  ['sala_mochi_fragola','Mochi fragola','','个','甜点','待确认','bar'],
  ['sala_mochi_coco','Mochi coco','','个','甜点','待确认','bar'],
  ['sala_mochi_cioccolato','Mochi cioccolato','','个','甜点','待确认','bar'],
  ['sala_mochi_matcha','Mochi matcha','','个','甜点','待确认','bar'],
  ['sala_mochi_tropical','Mochi tropical','','个','甜点','待确认','bar'],
  ['sala_tartufo_pistacchio','Tartufo pistacchio','','个','甜点','待确认','bar'],
  ['sala_tartufo_bianco','Tartufo bianco','','个','甜点','待确认','bar'],
  ['sala_croccante_arachide','Croccante arachide','','个','甜点','待确认','bar'],
  ['sala_croccante_fragola','Croccante fragola','','个','甜点','待确认','bar'],
  ['sala_croccante_mango','Croccante mango','','个','甜点','待确认','bar'],
  ['sala_croccante_pesca','Croccante pesca','','个','甜点','待确认','bar'],
  ['sala_bacio_bianco','Bacio bianco','','个','甜点','待确认','bar'],
  ['sala_esotica','Esotica','','个','甜点','待确认','bar'],
  ['sala_glosa','Glosa','','个','甜点','待确认','bar'],
  ['sala_passion','Passion','','个','甜点','待确认','bar'],
  ['sala_segreta_caffe','Segreta al caffe','','个','甜点','待确认','bar'],
  ['sala_tiramisu','Tiramisu','','个','甜点','待确认','bar'],
  ['sala_black_biscuits','Black biscuits','','个','甜点','待确认','bar'],
  ['sala_catalana_coccio','Catalana in coccio','','个','甜点','待确认','bar'],
  ['sala_cremoso_frutti','Cremoso ai frutti','','个','甜点','待确认','bar'],
  ['sala_ricotta_cioccolato','Ricotta e cioccolato monoporzione','','个','甜点','待确认','bar'],
  ['sala_coppa_mascarpone_fragola','Coppa mascarpone fragola','','个','甜点','待确认','bar'],
  ['sala_coppa_mascarpone','Coppa mascarpone','','个','甜点','待确认','bar'],
  ['sala_coppa_profiterol','Coppa profiterol','','个','甜点','待确认','bar'],
  ['sala_croccante_pistacchio','Croccante pistacchio','','个','甜点','待确认','bar'],
  ['sala_croccante_amarena','Croccante amarena','','个','甜点','待确认','bar'],
  ['sala_souffle_cioccolato','Souffle cioccolato','','个','甜点','待确认','bar'],
  ['sala_souffle_pistacchio','Souffle pistacchio','','个','甜点','待确认','bar'],
  ['sala_hip_pop_fragola','Hip pop fragola','','个','甜点','待确认','bar'],
  ['sala_twitty_fior_latte','Twitty fior di latte','','个','甜点','待确认','bar'],

  // Bar / Sala · 酒水
  ['sala_limoncello','Limoncello','','瓶','酒水','待确认','bar'],
  ['sala_baileys','Baileys','','瓶','酒水','待确认','bar'],
  ['sala_liquirizia','Liquirizia','','瓶','酒水','待确认','bar'],
  ['sala_melonne','Melonne','','瓶','酒水','待确认','bar'],
  ['sala_prugne_ciemme','Prugne Ciemme','','瓶','酒水','待确认','bar'],
  ['sala_amaro_del_capo','Amaro del Capo','','瓶','酒水','待确认','bar'],
  ['sala_montenegro','Montenegro','','瓶','酒水','待确认','bar'],
  ['sala_branca_menta','Branca Menta','','瓶','酒水','待确认','bar'],
  ['sala_branca_fernet','Branca Fernet','','瓶','酒水','待确认','bar'],
  ['sala_jager','Jager','','瓶','酒水','待确认','bar'],
  ['sala_sambuca','Sambuca','','瓶','酒水','待确认','bar'],
  ['sala_piave','Piave','','瓶','酒水','待确认','bar'],
  ['sala_uvaviva','Uvaviva','','瓶','酒水','待确认','bar'],
  ['sala_brandy','Brandy','','瓶','酒水','待确认','bar'],
  ['sala_prugne_poli','Prugne Poli','','瓶','酒水','待确认','bar'],

  // Bar / Sala · 糖浆
  ['sala_sciroppo_zuccheri','Sciroppo zuccheri','','瓶','糖浆','待确认','bar'],
  ['sala_sciroppo_menta','Sciroppo menta','','瓶','糖浆','待确认','bar'],
  ['sala_sciroppo_fragola','Sciroppo fragola','','瓶','糖浆','待确认','bar'],
  ['sala_sciroppo_passion','Sciroppo passion fruit','','瓶','糖浆','待确认','bar'],
  ['sala_sciroppo_violetta','Sciroppo violetta','','瓶','糖浆','待确认','bar'],
  ['sala_sciroppo_sambuca','Sciroppo sambuca','','瓶','糖浆','待确认','bar'],

  // Bar / Sala · 饮料
  ['sala_gingerino','Gingerino','','瓶/罐','饮料','待确认','bar'],
  ['sala_crodini','Crodini','','瓶/罐','饮料','待确认','bar'],
  ['sala_acqua_tonica','Acqua tonica','','瓶/罐','饮料','待确认','bar'],
  ['sala_acqua_tonica_pompelmo','Acqua tonica pompelmo','','瓶/罐','饮料','待确认','bar'],
  ['sala_limon_soda','Limon soda','','瓶/罐','饮料','待确认','bar'],
  ['sala_fanta','Fanta','','瓶/罐','饮料','待确认','bar'],
  ['sala_coca','Coca','','瓶/罐','饮料','待确认','bar'],
  ['sala_coca_zero','Coca Zero','','瓶/罐','饮料','待确认','bar'],
  ['sala_te_pesca','Te pesca','','瓶/罐','饮料','待确认','bar'],
  ['sala_te_limone','Te limone','','瓶/罐','饮料','待确认','bar'],
  ['sala_latte','Latte','','瓶/盒','饮料','待确认','bar'],

  // Bar / Sala · 调味 / 餐桌
  ['sala_soia_senza_glutine','Salsa soia senza glutine','','瓶','Sala调味','待确认','bar'],
  ['sala_soia_meno_sale','Salsa soia meno sale','','瓶','Sala调味','待确认','bar'],
  ['sala_sale_bustina','Sale in bustina','','包','Sala调味','待确认','bar'],
  ['sala_olio_oliva_bustina','Olio oliva in bustina','','包','Sala调味','待确认','bar'],
  ['sala_zenzeri_rossi','Zenzeri rossi','','包','Sala调味','待确认','bar'],
  ['sala_panna','Panna','','盒','Sala调味','待确认','bar']
].map(([id,name,spec,unit,category,supplier,area='sushi'])=>({id,name,spec,unit,category,supplier,area,qty:0}));

const categories = ['寿司基础','干货','酱料','冷藏','蔬果','冷冻','处理库存','耗材','甜点','酒水','糖浆','饮料','Sala调味'];
const suppliers = ['全部','大兴','米兰','Tosano','内部','自种','待确认'];
const categoryIcons = {
  '寿司基础':'🍣','干货':'🌾','酱料':'🫙','冷藏':'🧊','蔬果':'🥬','冷冻':'❄️','处理库存':'🔪','耗材':'🧤',
  '甜点':'🍰','酒水':'🥃','糖浆':'🍹','饮料':'🥤','Sala调味':'🧂'
};
const skuIcons = {
  rice20:'🍚', blackrice1:'🍚', soy20:'🫙', mirin18:'🍶', sake18:'🍶', shiragiku20:'🍶', nori:'🌿', ginger10:'🫚', wasabi:'🌱',
  pistacchio1:'🥜', onion400:'🧅', mandorle500:'🌰', almondgrain1:'🌰', peanut1:'🥜', sesamewhite1:'⚪️', sesameblack1:'⚫️', kombu:'🌿', tacos135:'🌮', cornchips450:'🌽', inari20:'🟨',
  chili450:'🌶️', yuzu1:'🍋', ponzu1:'🫙', sesameoil175:'🫗', peach240:'🍑',
  mayo505:'🥣', condensed397:'🥛', phila165:'🧀', butter500:'🧈', butter250:'🧈', panna200:'🥛', panna125:'🥛', pannafungo125:'🍄', orange750:'🍊', passionpuree1:'🟡', mangopuree1:'🥭', tonno13:'🐟',
  lime:'🍋‍🟩', greenapple:'🍏', redapple:'🍎', salad:'🥬', quail18:'🥚', quail12:'🥚', strawberry:'🍓', mango_hard:'🥭', mango_soft:'🥭', passion:'🟡', cucumber:'🥒', avocado_hard:'🥑', avocado_half:'🥑', avocado_soft:'🥑', daikon:'🥕', radish:'🔴', basil:'🌿',
  kataifi1:'🧶', gamberi_s800:'🦐', gamberi_l800:'🦐', scampi_l800:'🦐', scampi_s800:'🦐', amaebi_c1_2:'🦐', capesante900:'🐚', wakame1:'🌿', tobiko500:'🟠', ikura1:'🟠', ikura500:'🟠', surimi1:'🦀', surimi_hf1:'🦀', anguilla:'🐟', polipo_raw:'🐙',
  nigiri_shrimp:'🦐', maki_shrimp:'🦐', nigiri_amaebi:'🦐', 'amaebi碎':'🦐', polipo_processed:'🐙', maki_amaebi:'🦐', lobster:'🦞',
  zongye:'🍃', glove_m:'🧤', glove_l:'🧤'
};
function iconFor(s){ return skuIcons[s?.id] || categoryIcons[s?.category] || '📦'; }

let state = loadState();
let activeSupplier = '全部';

function initialState(){
  const current = {
    lime:0.8, greenapple:1, redapple:5, salad:1, quail18:5, quail12:0, strawberry:3,
    mango_hard:9, mango_soft:1, passion:1.5, cucumber:1.7, avocado_hard:0, avocado_half:5.5,
    avocado_soft:8, daikon:0.8, radish:3
  };
  const skus = seedSkus.map(x=>({...x,qty:current[x.id] ?? 0}));
  const order = {salad:2, strawberry:12, quail18:4, mango_soft:2, cucumber:1, avocado_hard:8};
  const history = [
    {id:'seed-loss-strawberry',type:'loss',skuId:'strawberry',skuName:'草莓',text:'-7 小盒（报损）',note:'10/02 前面没包好，发霉',at:'2026-10-02T12:30:06+02:00'},
    {id:'seed-arrival-strawberry',type:'arrival',skuId:'strawberry',skuName:'草莓',text:'+4 小盒（临时补货）',note:'10/02 临时补货',at:'2026-10-02T12:30:06+02:00'},
    {id:'seed-count-veg',type:'count',skuId:'salad',skuName:'蔬果盘货',text:'10/02 周五蔬果基线已预装',note:'Avocado：硬0 / 半硬5.5 / 软8；草莓现存3',at:'2026-10-02T12:31:47+02:00'}
  ];
  return {version:2, skus, history, order, customCategories:[], createdAt:new Date().toISOString()};
}
function loadState(){
  try{
    const raw=localStorage.getItem(APP_KEY);
    if(!raw) return initialState();
    const parsed=JSON.parse(raw);
    return migrate(parsed);
  }catch(e){return initialState();}
}
function migrate(s){
  const base=initialState();
  if(!s.skus) return base;
  const existing=new Map(s.skus.map(x=>[x.id,x]));
  base.skus=seedSkus.map(seed=>({...seed,...existing.get(seed.id)}));
  const custom=s.skus.filter(x=>!base.skus.some(y=>y.id===x.id));
  base.skus.push(...custom);
  base.history=Array.isArray(s.history)?s.history:[];
  base.order=s.order||{};
  base.customCategories=[...new Set((Array.isArray(s.customCategories)?s.customCategories:[]).map(x=>String(x||'').trim()).filter(Boolean))];
  return {...base,...s,version:2,skus:base.skus,history:base.history,order:base.order,customCategories:base.customCategories};
}
function saveState(){localStorage.setItem(APP_KEY,JSON.stringify(state));}
function inventoryCategories(){
  return [...new Set([
    ...categories,
    ...(Array.isArray(state.customCategories)?state.customCategories:[]),
    ...(Array.isArray(state.skus)?state.skus.map(s=>String(s.category||'').trim()).filter(Boolean):[])
  ])];
}
function sku(id){return state.skus.find(x=>x.id===id)}
function fmt(n){return Number.isInteger(Number(n))?String(Number(n)):String(Number(n).toFixed(2)).replace(/0+$/,'').replace(/\.$/,'')}
function stamp(){return new Date().toISOString()}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast._t);showToast._t=setTimeout(()=>t.classList.remove('show'),1800)}
function escapeHtml(str=''){return str.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function renderAll(){renderCategoryFilter();renderStock();renderCount();renderSupplierTabs();renderOrder();renderHistory();renderSettings();updateNetworkBadge();}

function renderCategoryFilter(){
  const sel=document.getElementById('categoryFilter');
  const cur=sel.value||'全部';
  sel.innerHTML=['全部',...inventoryCategories()].map(c=>`<option ${c===cur?'selected':''}>${c}</option>`).join('');
}
function renderStock(){
  const q=document.getElementById('searchInput').value.trim().toLowerCase();
  const cat=document.getElementById('categoryFilter').value||'全部';
  const rows=state.skus.filter(x=>(cat==='全部'||x.category===cat)&&(!q||`${x.name} ${x.spec} ${x.supplier}`.toLowerCase().includes(q)));
  const list=document.getElementById('stockList');
  list.innerHTML=rows.length?rows.map(x=>`
    <article class="sku-card">
      <div class="sku-top">
        <div class="sku-main">
          <div class="sku-icon" aria-hidden="true">${iconFor(x)}</div>
          <div class="sku-copy">
            <div class="sku-name">${escapeHtml(x.name)}</div>
            <div class="sku-meta">
              ${x.spec?`<span class="meta-pill spec">${escapeHtml(x.spec)}</span>`:''}
              <span class="meta-pill">${categoryIcons[x.category]||'📦'} ${escapeHtml(x.category)}</span>
              <span class="meta-pill">${escapeHtml(x.supplier)}</span>
            </div>
          </div>
        </div>
        <div class="stock-value">${fmt(x.qty)} <small>${escapeHtml(x.unit)}</small></div>
      </div>
      <div class="sku-actions">
        <button class="mini-btn" data-action="operate" data-id="${x.id}">到货 / 报损</button>
        <button class="mini-btn" data-action="order" data-id="${x.id}">＋ 订货</button>
        <button class="mini-btn" data-action="set" data-id="${x.id}">设库存</button>
      </div>
    </article>`).join(''):'<div class="empty">没有匹配的 SKU</div>';
  const nonzero=state.skus.filter(x=>Number(x.qty)>0).length;
  const pending=Object.values(state.order).filter(v=>Number(v)>0).length;
  document.getElementById('stockSummary').innerHTML=`
    <div class="summary-card"><span>📚 SKU总数</span><b>${state.skus.length}</b></div>
    <div class="summary-card"><span>✨ 有库存</span><b>${nonzero}</b></div>
    <div class="summary-card"><span>🛒 订货草稿</span><b>${pending}</b></div>`;
}
function renderCount(){
  const root=document.getElementById('countList');
  root.innerHTML=inventoryCategories().map(cat=>{
    const rows=state.skus.filter(x=>x.category===cat);
    if(!rows.length) return '';
    return `<section class="count-group"><div class="count-title"><span class="category-bubble">${categoryIcons[cat]||'📦'}</span>${cat}</div>${rows.map(x=>`
      <div class="count-row">
        <div class="count-label"><span class="count-mini-icon">${iconFor(x)}</span><div class="count-label-text"><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.spec||'无规格')} · 当前 ${fmt(x.qty)} ${escapeHtml(x.unit)}</small></div></div>
        <div class="input-unit"><input class="count-input" data-id="${x.id}" type="text" inputmode="decimal" autocomplete="off" placeholder="—"><span>${escapeHtml(x.unit)}</span></div>
      </div>`).join('')}</section>`;
  }).join('');
}
function renderSupplierTabs(){
  document.getElementById('supplierTabs').innerHTML=suppliers.map(s=>`<button class="${s===activeSupplier?'active':''}" data-supplier="${s}">${s}</button>`).join('');
}
function renderOrder(){
  const ids=Object.keys(state.order).filter(id=>Number(state.order[id])>0);
  const rows=ids.map(id=>sku(id)).filter(Boolean).filter(x=>activeSupplier==='全部'||x.supplier===activeSupplier);
  const root=document.getElementById('orderList');
  root.innerHTML=rows.length?rows.map(x=>`
    <article class="sku-card order-row">
      <div class="order-left"><span class="count-mini-icon">${iconFor(x)}</span><div><div class="sku-name">${escapeHtml(x.name)}</div><div class="sku-meta"><span class="meta-pill spec">${escapeHtml(x.spec||'无规格')}</span><span class="meta-pill">${escapeHtml(x.supplier)}</span></div></div></div>
      <div class="input-unit"><input class="order-input" data-id="${x.id}" value="${fmt(state.order[x.id])}" type="text" inputmode="decimal" autocomplete="off"><span>${escapeHtml(x.unit)}</span></div>
      <button class="icon-btn" data-remove-order="${x.id}" aria-label="删除">✕</button>
    </article>`).join(''):'<div class="empty">还没有订货草稿 🗿</div>';
}
function renderHistory(){
  const filter=document.getElementById('historyFilter').value||'all';
  const rows=state.history.filter(h=>filter==='all'||h.type===filter).slice().reverse().slice(0,300);
  const labels={count:'盘货',arrival:'到货',loss:'报损',transfer:'内部转换',adjust:'调整'};
  document.getElementById('historyList').innerHTML=rows.length?rows.map(h=>{
    const s=sku(h.skuId); const target=h.targetId?sku(h.targetId):null;
    return `<article class="history-item"><div class="history-top"><div class="history-type type-${escapeHtml(h.type)}">${labels[h.type]||h.type}</div><div class="history-time">${new Date(h.at).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</div></div>
    <div class="history-body"><span class="history-inline-icon">${iconFor(s)}</span><span>${escapeHtml(s?.name||h.skuName||'SKU')}：${escapeHtml(h.text||'')}</span></div>${target?`<div class="history-note">→ ${iconFor(target)} ${escapeHtml(target.name)}</div>`:''}${h.note?`<div class="history-note">${escapeHtml(h.note)}</div>`:''}</article>`;
  }).join(''):'<div class="empty">还没有历史记录</div>';
}
function renderSettings(){document.getElementById('skuCount').textContent=state.skus.length;checkStorage();}

function addHistory(type, skuId, text, note='', extra={}){
  state.history.push({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),type,skuId,skuName:sku(skuId)?.name||'',text,note,at:stamp(),...extra});
  if(state.history.length>3000) state.history=state.history.slice(-3000);
}

function openAction(id, preset='arrival'){
  const s=sku(id); if(!s)return;
  document.getElementById('dialogSkuId').value=id;
  document.getElementById('dialogCategory').textContent=`${s.category} · ${s.supplier}`;
  document.getElementById('dialogTitle').textContent=`${s.name} ${s.spec||''}`;
  document.getElementById('actionUnit').textContent=s.unit;
  document.getElementById('actionQty').value='';
  document.getElementById('actionNote').value='';
  document.getElementById('actionType').value=preset;
  const target=document.getElementById('transferTarget');
  target.innerHTML=state.skus.filter(x=>x.id!==id).map(x=>`<option value="${x.id}">${escapeHtml(x.name)} ${escapeHtml(x.spec||'')}</option>`).join('');
  syncActionForm();
  document.getElementById('actionDialog').showModal();
}
function syncActionForm(){
  const t=document.getElementById('actionType').value;
  document.getElementById('targetWrap').classList.toggle('hidden',t!=='transfer');
}
function confirmAction(e){
  e.preventDefault();
  const id=document.getElementById('dialogSkuId').value; const s=sku(id); if(!s)return;
  const type=document.getElementById('actionType').value; const qty=parseLocaleDecimal(document.getElementById('actionQty').value); const note=document.getElementById('actionNote').value.trim();
  if(!Number.isFinite(qty)||qty<=0){showToast('数量要大于 0');return;}
  if(type==='arrival'){
    s.qty=Number(s.qty)+qty; addHistory('arrival',id,`+${fmt(qty)} ${s.unit} → ${fmt(s.qty)} ${s.unit}`,note);
  } else if(type==='loss'){
    s.qty=Math.max(0,Number(s.qty)-qty); addHistory('loss',id,`-${fmt(qty)} ${s.unit} → ${fmt(s.qty)} ${s.unit}`,note);
  } else if(type==='adjust'){
    const old=Number(s.qty); s.qty=qty; addHistory('adjust',id,`${fmt(old)} → ${fmt(qty)} ${s.unit}`,note);
  } else if(type==='transfer'){
    const targetId=document.getElementById('transferTarget').value; const to=sku(targetId); if(!to)return;
    if(Number(s.qty)<qty){showToast('转出数量超过当前库存');return;}
    s.qty=Number(s.qty)-qty; to.qty=Number(to.qty)+qty; addHistory('transfer',id,`-${fmt(qty)} ${s.unit}（剩 ${fmt(s.qty)}）`,note,{targetId,text2:`+${fmt(qty)} ${to.unit}`});
  }
  saveState();document.getElementById('actionDialog').close();renderAll();showToast('已保存');
}

function saveBulkCount(){
  const inputs=[...document.querySelectorAll('.count-input')],diffs=[]; let filled=0,changed=0;
  const batch=stamp();
  inputs.forEach(inp=>{
    if(inp.value==='')return;
    const s=sku(inp.dataset.id); const next=parseLocaleDecimal(inp.value); if(!s||!Number.isFinite(next)||next<0)return;
    const old=Number(s.qty),delta=next-old,abs=Math.abs(delta),pct=old!==0?delta/Math.abs(old)*100:null;
    const large=abs>=5||(old>0&&abs>=1&&Math.abs(pct)>=35)||(old===0&&next>=3)||(next===0&&old>=2);
    s.qty=next;addHistory('count',s.id,`${fmt(old)} → ${fmt(next)} ${s.unit}`,'',{batch});
    filled++;if(delta!==0){changed++;diffs.push({skuId:s.id,name:s.name,unit:s.unit,old,next,delta,pct,large})}
  });
  if(!filled){showToast('还没填盘货数量');return;}
  saveState();renderAll();showToast(`已保存 ${filled} 个 SKU · ${changed} 项变化`);switchView('stock');
  setTimeout(()=>window.CassolaInsights?.showCountSummary?.({filled,changed,diffs,batch}),80);
}
function fillCurrent(){document.querySelectorAll('.count-input').forEach(inp=>{inp.value=sku(inp.dataset.id)?.qty??0});showToast('已带入当前库存');}
function setOrder(id, value){const n=parseLocaleDecimal(value),s=sku(id);if(!Number.isFinite(n)||n<=0||!s)delete state.order[id];else{const stock=typeof v5OrderToStockQty==='function'?v5OrderToStockQty(s,n):n;state.order[id]=stock}saveState();renderOrder();renderStock();}
function addOrderPrompt(id){const s=sku(id);if(!s)return;const cur=state.order[id]?((typeof v5StockToOrderQty==='function'?v5StockToOrderQty(s,state.order[id]):state.order[id])):'';const orderUnit=typeof v5OrderUnit==='function'?v5OrderUnit(s):s.unit;const ans=prompt(`${s.name} 订多少 ${orderUnit}？`,cur===''?'':fmt(cur));if(ans===null)return;setOrder(id,ans);showToast('已加入订货草稿');}
function copyOrder(){
  const rows=Object.entries(state.order).filter(([,v])=>Number(v)>0).map(([id,v])=>({s:sku(id),v:Number(v)})).filter(x=>x.s).filter(x=>activeSupplier==='全部'||x.s.supplier===activeSupplier);
  if(!rows.length){showToast('当前没有订货草稿');return;}
  const supplierSet=new Set(rows.map(x=>x.s.supplier));
  if(activeSupplier==='全部'&&supplierSet.size>1){showToast('先点一个供应商，再复制给供应商');return;}
  const supplier=activeSupplier==='全部'?[...supplierSet][0]:activeSupplier;
  const txt=rows.map(({s,v})=>{const q=typeof v5StockToOrderQty==='function'?v5StockToOrderQty(s,v):v,u=typeof v5OrderUnit==='function'?v5OrderUnit(s):s.unit;return `${s.name} x${fmt(q)}${u}`}).join('\n');
  navigator.clipboard?.writeText(txt).then(()=>showToast(`${supplier} 订货单已复制`)).catch(()=>{prompt(`复制给 ${supplier}：`,txt)});
}

function exportBackup(){
  const blob=new Blob([JSON.stringify({...state,exportedAt:stamp()},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`cassola-inventory-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast('备份已导出');
}
function importBackup(file){
  const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.skus))throw new Error('bad');state=migrate(data);saveState();renderAll();showToast('备份已恢复');}catch(e){alert('这个备份文件无法读取。')}};reader.readAsText(file);
}

async function checkStorage(){
  const el=document.getElementById('storageStatus');
  if(!navigator.storage){el.textContent='浏览器没有提供存储状态接口，但本地数据仍可使用。';return;}
  const est=await navigator.storage.estimate?.(); const persisted=await navigator.storage.persisted?.();
  let txt=persisted?'已获得持久化存储。':'当前为浏览器普通本地存储。';
  if(est?.usage!=null) txt+=` 已使用约 ${(est.usage/1024).toFixed(0)} KB。`;
  el.textContent=txt;
}
async function requestPersist(){if(!navigator.storage?.persist){showToast('Safari未提供该接口');return;}const ok=await navigator.storage.persist();showToast(ok?'已请求持久化':'未获得持久化权限');checkStorage();}
function updateNetworkBadge(){const b=document.getElementById('offlineBadge');const off=!navigator.onLine;b.textContent=off?'当前离线':'离线可用';b.classList.toggle('offline',off)}

function switchView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  if(name==='history')renderHistory(); if(name==='order')renderOrder(); if(name==='settings')renderSettings();
  window.scrollTo({top:0,behavior:'instant'});
}

document.addEventListener('click',e=>{
  const nav=e.target.closest('.nav-btn');if(nav){switchView(nav.dataset.view);return;}
  const op=e.target.closest('[data-action="operate"]');if(op){openAction(op.dataset.id,'arrival');return;}
  const set=e.target.closest('[data-action="set"]');if(set){openAction(set.dataset.id,'adjust');return;}
  const ord=e.target.closest('[data-action="order"]');if(ord){addOrderPrompt(ord.dataset.id);return;}
  const sup=e.target.closest('[data-supplier]');if(sup){activeSupplier=sup.dataset.supplier;renderSupplierTabs();renderOrder();return;}
  const rem=e.target.closest('[data-remove-order]');if(rem){delete state.order[rem.dataset.removeOrder];saveState();renderOrder();renderStock();return;}
});
document.getElementById('searchInput').addEventListener('input',renderStock);
document.getElementById('categoryFilter').addEventListener('change',renderStock);
document.getElementById('historyFilter').addEventListener('change',renderHistory);
document.getElementById('actionType').addEventListener('change',syncActionForm);
document.getElementById('confirmActionBtn').addEventListener('click',confirmAction);
document.getElementById('saveCountBtn').addEventListener('click',saveBulkCount);
document.getElementById('fillCurrentBtn').addEventListener('click',fillCurrent);
document.getElementById('copyOrderBtn').addEventListener('click',copyOrder);
document.getElementById('clearOrderBtn').addEventListener('click',()=>{if(confirm('清空订货草稿？')){state.order={};saveState();renderAll();}});
document.getElementById('orderList').addEventListener('change',e=>{if(e.target.classList.contains('order-input'))setOrder(e.target.dataset.id,e.target.value)});
document.getElementById('exportBtn').addEventListener('click',exportBackup);
document.getElementById('importInput').addEventListener('change',e=>{if(e.target.files?.[0])importBackup(e.target.files[0]);e.target.value='';});
document.getElementById('persistBtn').addEventListener('click',requestPersist);
document.getElementById('resetDemoBtn').addEventListener('click',()=>{if(confirm('恢复内置 SKU？库存会归零，但历史记录保留。')){const hist=state.history;state=initialState();state.history=hist;saveState();renderAll();showToast('SKU 已恢复')}});
window.addEventListener('online',updateNetworkBadge);window.addEventListener('offline',updateNetworkBadge);

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'})
      .then(reg=>{
        reg.update().catch(()=>{});
        document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{})});
      })
      .catch(()=>{});
  });
}
renderAll();

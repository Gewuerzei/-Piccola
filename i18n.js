/* Cassola i18n v0.1 · employee-facing language switch (中文 / Italiano / বাংলা)
   - Device preference, like the theme: localStorage `cassola_ui_lang_v01`.
     It never enters Inventory / Staff / Cloud data.
   - Only display text is translated. Values sent to Cloud (units, categories,
     SKU ids, task labels, proposal fields) stay exactly as before.
   - Supervisor screens stay Chinese. Translation covers the Access gate, the
     employee count / receiving / SKU-proposal screens and their dialogs.
   - Missing translations fall back to the original Chinese text. */
(function(){
  const KEY='cassola_ui_lang_v01';
  const LANGS=[
    {id:'zh',label:'中文',locale:'zh-CN',html:'zh-CN'},
    {id:'it',label:'Italiano',locale:'it-IT',html:'it'},
    {id:'bn',label:'বাংলা',locale:'bn-BD',html:'bn'}
  ];
  let lang='zh';
  try{const saved=localStorage.getItem(KEY);if(LANGS.some(x=>x.id===saved))lang=saved}catch(_){}

  const UI=window.CASSOLA_I18N_UI||{};
  const SKU=window.CASSOLA_I18N_SKU||{names:{},units:{},categories:{},suppliers:{}};

  function fill(text,vars){
    if(!vars)return text;
    return String(text).replace(/\{(\w+)\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(vars,k)?String(vars[k]):m);
  }
  function t(zh,vars){
    const row=lang==='zh'?null:(Object.prototype.hasOwnProperty.call(UI,zh)?UI[zh]:null);
    return fill((row&&row[lang])||zh,vars);
  }
  function lookup(map,value){
    if(lang==='zh'||value===undefined||value===null)return value;
    const row=map[String(value).trim()];
    return row&&row[lang]?row[lang]:null;
  }
  /* Translated SKU name, or the original when there is no translation. */
  function sku(name){const hit=lookup(SKU.names,name);return hit||name}
  /* The original name, only when it differs from what is shown. */
  function skuOriginal(name){const hit=lookup(SKU.names,name);return hit&&hit!==name?name:''}
  /* Units like "瓶/罐" are translated part by part. */
  function unit(u){
    if(lang==='zh'||!u)return u;
    return String(u).split('/').map(p=>lookup(SKU.units,p)||p).join('/');
  }
  function category(c){if(!c)return c;return lookup(SKU.categories,c)||c}
  /* Supplier names like "Cattel/Lodi/恒丰" are translated part by part. */
  function supplier(v){
    if(lang==='zh'||!v)return v;
    return String(v).split('/').map(p=>lookup(SKU.suppliers||{},p)||p).join('/');
  }
  /* Task / scope labels. The Cloud generates a few fixed patterns
     ("供应商 · 米兰", "组合盘货 · 42 SKU", "岗位 Sushi + 个人任务", "🥬 蔬果",
     "无盘货任务"); those are translated, anything a Supervisor typed shows as-is. */
  function label(v){
    if(lang==='zh'||!v)return v;
    const s=String(v).trim();
    if(Object.prototype.hasOwnProperty.call(UI,s))return t(s);
    let m=s.match(/^岗位 (.*?)( \+ 个人任务)?$/);
    if(m)return t('岗位 {name}',{name:m[1]})+(m[2]?' + '+t('个人任务'):'');
    m=s.match(/^组合盘货 · (\d+) SKU$/);
    if(m)return t('组合盘货 · {n} SKU',{n:m[1]});
    m=s.match(/^(供应商|分类|区域|SKU) · (.+)$/);
    if(m){
      const k=m[1],x=m[2];
      const shown=k==='供应商'?supplier(x):k==='分类'?category(x):k==='SKU'?sku(x):x;
      return (k==='SKU'?'SKU':t(k))+' · '+shown;
    }
    m=s.match(/^(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*)\s+(.+)$/u);
    if(m){const c=lookup(SKU.categories,m[2]);if(c)return m[1]+' '+c}
    return s;
  }
  function locale(){return (LANGS.find(x=>x.id===lang)||LANGS[0]).locale}
  function htmlLang(){return (LANGS.find(x=>x.id===lang)||LANGS[0]).html}
  function setLang(next){
    if(!LANGS.some(x=>x.id===next)||next===lang)return;
    lang=next;
    try{localStorage.setItem(KEY,lang)}catch(_){}
    window.dispatchEvent(new CustomEvent('cassola-lang-change',{detail:{lang}}));
  }
  function switcherHtml(){
    return '<div class="cassola-lang-switch" role="group" aria-label="Language">'+
      LANGS.map(x=>'<button type="button" lang="'+x.html+'" data-cassola-lang="'+x.id+'" class="'+(x.id===lang?'active':'')+'" aria-pressed="'+(x.id===lang?'true':'false')+'">'+x.label+'</button>').join('')+
    '</div>';
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-cassola-lang]');
    if(b){e.preventDefault();setLang(b.dataset.cassolaLang)}
  });

  window.CassolaI18n={t,sku,skuOriginal,unit,category,supplier,label,locale,htmlLang,setLang,switcherHtml,lang:()=>lang,languages:()=>LANGS.map(x=>({...x}))};
})();

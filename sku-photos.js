/* Cassola SKU Photos v0.1 · optional real photos, kept on THIS device
   - The SKU editor gets "📷 拍照 / 相册": iPhone offers camera or photo library.
   - The photo is cropped to a 256px square JPEG (~10–20KB) and stored in its
     own IndexedDB `cassola_sku_photos_v01` (key = SKU id). It never touches
     `cassola_inventory_v01`, SKU fields, the avatar IndexedDB or Cloud.
   - Not synced yet: other phones keep showing the illustration until a Cloud
     photo store exists. Removing the photo brings the illustration back.
   - window.CassolaSkuVisual(sku, fallbackEmoji) returns the picture HTML used
     by every SKU icon slot: photo > specific illustration > SKU's own emoji
     > category illustration > fallback emoji. */
(function(){
  const DB='cassola_sku_photos_v01',STORE='photos',SIZE=256;
  const urls=new Map();
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  /* ---------- picture HTML for any SKU-like object ---------- */
  function visual(s,fallback){
    const id=String(s?.id??s?.skuId??'');
    const url=id?urls.get(id):null;
    if(url)return '<span class="sku-art sku-photo"><img src="'+url+'" alt="" loading="lazy" decoding="async"></span>';
    const art=window.CassolaSkuArt;
    const exact=art?art.svg(s,{allowCategory:false}):'';
    if(exact)return '<span class="sku-art">'+exact+'</span>';
    if(s&&s.icon)return esc(s.icon);
    const cat=art?art.svg(s):'';
    if(cat)return '<span class="sku-art">'+cat+'</span>';
    return fallback===undefined?'📦':fallback;
  }

  /* ---------- IndexedDB ---------- */
  function openDb(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window))return reject(new Error('IndexedDB unavailable'));
      const r=indexedDB.open(DB,1);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
  }
  async function tx(mode,fn){
    const db=await openDb();
    try{
      return await new Promise((resolve,reject)=>{
        const t=db.transaction(STORE,mode);let out;
        Promise.resolve(fn(t.objectStore(STORE))).then(v=>{out=v});
        t.oncomplete=()=>resolve(out);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
      });
    }finally{db.close()}
  }
  async function loadAll(){
    try{
      const rows=[];
      await tx('readonly',st=>new Promise(res=>{const c=st.openCursor();c.onsuccess=()=>{const cur=c.result;if(!cur)return res();rows.push([String(cur.key),cur.value]);cur.continue()}}));
      rows.forEach(([id,v])=>{const blob=v&&v.blob instanceof Blob?v.blob:null;if(blob)urls.set(id,URL.createObjectURL(blob))});
    }catch(err){console.warn('SKU photos unavailable',err)}
    if(urls.size)rerender();
  }
  function rerender(){
    try{if(typeof renderAll==='function')renderAll()}catch(_){}
    try{window.CassolaHub?.refreshEmployee?.()}catch(_){}
  }
  async function save(id,blob){
    await tx('readwrite',st=>{st.put({blob,savedAt:new Date().toISOString(),bytes:blob.size},id)});
    if(urls.has(id))URL.revokeObjectURL(urls.get(id));
    urls.set(id,URL.createObjectURL(blob));
    rerender();
  }
  async function remove(id){
    await tx('readwrite',st=>{st.delete(id)});
    if(urls.has(id)){URL.revokeObjectURL(urls.get(id));urls.delete(id)}
    rerender();
  }

  /* ---------- image → 256px square JPEG ---------- */
  function decode(file){
    if(typeof createImageBitmap==='function')return createImageBitmap(file).catch(()=>viaImg(file));
    return viaImg(file);
  }
  function viaImg(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{resolve(img);setTimeout(()=>URL.revokeObjectURL(url),1000)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('这张图片无法读取'))};
      img.src=url;
    });
  }
  async function shrink(file){
    const src=await decode(file);
    const w=src.width||src.naturalWidth,h=src.height||src.naturalHeight;
    if(!w||!h)throw new Error('这张图片无法读取');
    const side=Math.min(w,h),sx=(w-side)/2,sy=(h-side)/2;
    const canvas=document.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';
    ctx.drawImage(src,sx,sy,side,side,0,0,SIZE,SIZE);
    src.close?.();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
    if(!blob)throw new Error('照片压缩失败');
    return blob;
  }

  /* ---------- SKU editor: 📷 拍照 / 相册 ---------- */
  function currentSku(){
    const id=document.getElementById('v3SkuId')?.value||'';
    const s=id&&typeof state!=='undefined'?(state.skus||[]).find(x=>String(x.id)===String(id)):null;
    return{id,s};
  }
  function refreshEditor(){
    const row=document.getElementById('v8PhotoRow');if(!row)return;
    const {id,s}=currentSku();
    const preview=document.getElementById('v8PhotoPreview'),input=document.getElementById('v8PhotoInput');
    const pick=row.querySelector('.v8-photo-pick'),del=document.getElementById('v8PhotoRemove'),hint=document.getElementById('v8PhotoHint');
    preview.innerHTML=s?visual(s,'📦'):'<span class="v8-photo-empty">📷</span>';
    const has=!!(id&&urls.has(id));
    del.classList.toggle('hidden',!has);
    input.disabled=!s;pick.classList.toggle('disabled',!s);
    hint.textContent=!s?'先保存这个 SKU，再回来添加照片。':has?'这台设备显示你拍的照片；移除后恢复自动插图。':'没有照片时显示自动插图。照片只保存在这台设备。';
  }
  function injectEditor(){
    const form=document.getElementById('v3SkuForm');
    if(!form||document.getElementById('v8PhotoRow'))return;
    const anchor=form.querySelector('.v3-form-grid.two');if(!anchor)return;
    const row=document.createElement('div');row.id='v8PhotoRow';row.className='v8-photo-row';
    row.innerHTML='<div id="v8PhotoPreview" class="v8-photo-preview" aria-hidden="true"></div>'+
      '<div class="v8-photo-side"><div class="v8-photo-buttons">'+
        '<label class="btn secondary v8-photo-pick">📷 拍照 / 相册<input id="v8PhotoInput" type="file" accept="image/*"></label>'+
        '<button type="button" class="btn danger ghost hidden" id="v8PhotoRemove">移除照片</button>'+
      '</div><small id="v8PhotoHint"></small></div>';
    anchor.insertAdjacentElement('afterend',row);
    document.getElementById('v8PhotoInput').addEventListener('change',async e=>{
      const file=e.target.files?.[0];e.target.value='';
      const {id}=currentSku();if(!file||!id)return;
      try{
        const blob=await shrink(file);
        await save(id,blob);refreshEditor();
        if(typeof showToast==='function')showToast('📷 照片已保存（只在这台设备）');
      }catch(err){alert('照片没有保存：'+(err?.message||'未知错误'))}
    });
    document.getElementById('v8PhotoRemove').addEventListener('click',async()=>{
      const {id}=currentSku();if(!id||!confirm('移除这张照片？会恢复自动插图。'))return;
      try{await remove(id);refreshEditor()}catch(err){alert('移除失败：'+(err?.message||'未知错误'))}
    });
    const dlg=document.getElementById('v3SkuDialog');
    if(dlg&&typeof MutationObserver==='function')new MutationObserver(()=>{if(dlg.open)refreshEditor()}).observe(dlg,{attributes:true,attributeFilter:['open']});
  }

  window.CassolaSkuVisual=visual;
  window.CassolaSkuPhotos={has:id=>urls.has(String(id)),remove,count:()=>urls.size};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{injectEditor();loadAll()});
  else{injectEditor();loadAll()}
})();

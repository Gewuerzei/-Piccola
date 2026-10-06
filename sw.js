const CACHE='cassola-suite-v078';
const CORE=[
  './','./index.html','./styles.css','./v03.css','./hub.css','./cloud.css','./staff.css','./employee-tools.css','./inventory-insights.css','./analytics.css','./ui-extras.css',
  './app.js','./v03-core.js','./inventory-prices.js','./v03-orders.js','./v03-ui.js','./v031-handoff.js','./employee-import.js',
  './staff.js','./access-registry.js','./hub.js','./cloud-sync.js','./employee-tools.js','./inventory-insights.js','./analytics.js','./ui-extras.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'
];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request)
      .then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r})
      .catch(()=>caches.match(e.request).then(hit=>hit||caches.match('./index.html')))
  );
});

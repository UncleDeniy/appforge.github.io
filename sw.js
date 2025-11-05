
const CACHE='appforge-v21';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','/index.html','/apps.html','/os.html','/articles.html','/view.html','/assets/css/style.css','/assets/js/app.js'])))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{let cl=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,cl)); return res;})).catch(()=>caches.match('/index.html')))});

const CACHE = 'hogwarts-v7-kids';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './vendor/three.js', './models/female.glb', './models/male.glb', './models/female-clothes.glb', './models/male-clothes.glb', './models/female-hair.glb', './models/male-hair.glb'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('hogwarts-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin && !['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const hit = await caches.match(event.request, {ignoreSearch:true}) || await caches.match('./index.html');
      const network = fetch(event.request).then(async res => {
        if (res.ok) {const cache=await caches.open(CACHE); await cache.put('./index.html',res.clone());}
        return res;
      });
      if (!hit) return network;
      return Promise.race([network.catch(() => hit),new Promise(resolve => setTimeout(() => resolve(hit),3000))]);
    })());
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(event.request);
    if (hit) return hit;
    try {
      const res = await fetch(event.request);
      if (res.ok || res.type === 'opaque') {const cache=await caches.open(CACHE); await cache.put(event.request,res.clone());}
      return res;
    } catch(e) {
      if (url.hostname === 'fonts.googleapis.com') return new Response('', {headers:{'Content-Type':'text/css'}});
      return Response.error();
    }
  })());
});

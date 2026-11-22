const CACHE = 'hogwarts-v14-students';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './vendor/three.js', './models/female.glb', './models/male.glb', './models/female-clothes.glb', './models/male-clothes.glb', './models/female-hair.glb', './models/male-hair.glb'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // A cold page is downloading the same models. Do not open thirteen
    // parallel connections or reuse last release's HTTP-cached model bytes.
    for (const path of CORE) {
      const request = new Request(new URL(path, location.href), {cache:'reload'});
      for (let attempt = 1; ; attempt++) {
        try { await cache.add(request); break; }
        catch (error) {
          if (attempt === 3) throw error;
          await new Promise(resolve => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
        }
      }
    }
    await self.skipWaiting();
  })());
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
      const cache = await caches.open(CACHE).catch(() => null);
      const hit = cache && (await cache.match(event.request, {ignoreSearch:true}) || await cache.match('./index.html'));
      const network = fetch(event.request).then(async res => {
        if (cache && res.ok) await cache.put('./index.html', res.clone()).catch(() => {});
        return res;
      });
      if (!hit) return network;
      return Promise.race([network.catch(() => hit),new Promise(resolve => setTimeout(() => resolve(hit),3000))]);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE).catch(() => null);
    const hit = cache && await cache.match(event.request);
    if (hit && event.request.cache !== 'reload') return hit;
    try {
      const res = await fetch(event.request);
      if (cache && (res.ok || res.type === 'opaque')) await cache.put(event.request, res.clone()).catch(() => {});
      return res;
    } catch(e) {
      if (hit) return hit;
      if (url.hostname === 'fonts.googleapis.com') return new Response('', {headers:{'Content-Type':'text/css'}});
      return Response.error();
    }
  })());
});

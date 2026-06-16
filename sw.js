const CACHE = 'bigmaple-v4';
const FILES = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Cache-first para la app propia: carga instantánea sin esperar a la red.
// Si está en caché, lo sirve de inmediato (funciona offline).
// En segundo plano intenta actualizar la copia cuando hay internet.
self.addEventListener('fetch', e => {
  const req = e.request;
  // Solo manejamos peticiones GET del mismo origen (la app).
  // Las librerías externas (fonts, emailjs, xlsx) se dejan pasar normal:
  // si fallan por falta de internet, la app sigue funcionando.
  const url = new URL(req.url);
  const mismoOrigen = url.origin === self.location.origin;

  if (!mismoOrigen) {
    // Recurso externo: intenta red, si falla no rompe nada.
    e.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Recurso propio: cache-first.
  e.respondWith(
    caches.match(req).then(cached => {
      const red = fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
      // Devuelve lo cacheado de inmediato si existe; si no, espera la red.
      return cached || red;
    })
  );
});

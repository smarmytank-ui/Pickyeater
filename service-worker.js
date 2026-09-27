const CACHE_NAME = 'food-my-way-v2-3';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './site.webmanifest',
  './picky-mark.svg',
  './favicon.ico',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png',
  './apple-touch-icon.png',
  './privacy.html',
  './terms.html',
  './support.html',
  './legal.css'
];

self.addEventListener('install', event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event=>{
  if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  if(event.request.mode === 'navigate'){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put('./index.html', copy));
          return response;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      const fresh = fetch(event.request).then(response=>{
        if(response.ok){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request, copy));
        }
        return response;
      });
      return cached || fresh;
    })
  );
});

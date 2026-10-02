const CACHE_NAME = 'food-my-way-v2-67-1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=2.67.1',
  './app.js?v=2.67.1',
  './config.js?v=2.67.1',
  './site.webmanifest',
  './picky-mark.svg',
  './favicon.ico',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png',
  './apple-touch-icon.png',
  './food-my-way-pfp-32.png',
  './food-my-way-pfp-180.png',
  './food-my-way-pfp-192.png',
  './food-my-way-pfp-512.png',
  './food-my-way-social.png',
  './privacy.html',
  './terms.html',
  './support.html',
  './legal.css',
  './landing.css',
  './picky-adults.html',
  './picky-kids.html',
  './sensory-friendly-meals.html',
  './easy-weeknight-meals.html',
  './survival-kit.html',
  './survival-kit.css',
  './survival-kit-access.css',
  './survival-kit.js'
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
  const url=new URL(event.request.url);
  if(event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Account, purchase, telemetry, and cloud data must always go directly to the network.
  if(url.pathname.startsWith('/api/')) return;

  if(event.request.mode === 'navigate'){
    event.respondWith(
      fetch(event.request)
        .catch(()=>caches.match(event.request,{ignoreSearch:true}).then(cached=>cached || caches.match('./index.html')))
    );
    return;
  }

  const networkFirst=url.pathname.endsWith('/config.js') || url.pathname.endsWith('/service-worker.js');
  const canStore=response=>{
    const policy=response.headers.get('cache-control') || '';
    return response.ok && response.type!=='opaque' && !/\b(?:no-store|private)\b/i.test(policy);
  };
  const fetchAndStore=()=>fetch(event.request).then(response=>{
    if(canStore(response)){
      const copy=response.clone();
      return caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)).then(()=>response);
    }
    return response;
  });

  if(networkFirst){
    event.respondWith(fetchAndStore().catch(()=>caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      const fresh=fetchAndStore();
      return cached || fresh;
    })
  );
});

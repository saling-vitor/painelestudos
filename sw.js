// V13.1.0 · final brand kit
const V='study-pwa-v13-1-16-topic-state-unmark';
const CORE=['./','./index.html','./manifest-v13.1.7.webmanifest','./assets/css/app.css?v=13.1.15','./assets/js/config.js?v=12.7','./assets/js/cloud-core.js?v=13.1.15','./assets/js/map-cloud-bridge.js?v=13.1.12','./assets/js/app.js?v=13.1.15','./assets/study-collage.jpg','./data/catalog.json','./data/simulados.json','./reader.html','./offline.html'];
const UI_ICONS=['./assets/ui-icons/sf-black-filled/admin.png','./assets/ui-icons/sf-black-filled/archive.png','./assets/ui-icons/sf-black-filled/calendar.png','./assets/ui-icons/sf-black-filled/chevron-left.png','./assets/ui-icons/sf-black-filled/chevron-right.png','./assets/ui-icons/sf-black-filled/close.png','./assets/ui-icons/sf-black-filled/cloud.png','./assets/ui-icons/sf-black-filled/courses.png','./assets/ui-icons/sf-black-filled/device.png','./assets/ui-icons/sf-black-filled/document.png','./assets/ui-icons/sf-black-filled/simulations.png','./assets/ui-icons/sf-black-filled/download.png','./assets/ui-icons/sf-black-filled/grid.png','./assets/ui-icons/sf-black-filled/home.png','./assets/ui-icons/sf-black-filled/list.png','./assets/ui-icons/sf-black-filled/maps.png','./assets/ui-icons/sf-black-filled/more.png','./assets/ui-icons/sf-black-filled/plus.png','./assets/ui-icons/sf-black-filled/progress.png','./assets/ui-icons/sf-black-filled/search.png','./assets/ui-icons/sf-black-filled/settings.png','./assets/ui-icons/sf-black-filled/star.png','./assets/ui-icons/sf-black-filled/success.png','./assets/ui-icons/sf-black-filled/sync.png','./assets/ui-icons/sf-black-filled/trash.png','./assets/ui-icons/sf-black-filled/upload.png','./assets/ui-icons/sf-black-filled/user.png','./assets/ui-icons/sf-black-filled/warning.png'];
const BRAND_ASSETS=[
  './assets/brand/logo/logo-horizontal-v13-1-7.png',
  './assets/brand/logo/marca-simplificada-v13-1-7.png',
  './assets/brand/app-icons/apple-touch-icon-v13-1-7.png',
  './assets/brand/app-icons/icon-192-v13-1-7.png',
  './assets/brand/app-icons/icon-512-v13-1-7.png',
  './assets/brand/app-icons/icon-maskable-192-v13-1-7.png',
  './assets/brand/app-icons/icon-maskable-512-v13-1-7.png',
  './assets/brand/favicon/favicon-v13-1-7.ico',
  './assets/brand/favicon/favicon-16x16-v13-1-7.png',
  './assets/brand/favicon/favicon-32x32-v13-1-7.png',
  './assets/brand/favicon/favicon-48x48-v13-1-7.png',
  './assets/brand/favicon/favicon-96x96-v13-1-7.png',
  './assets/brand/splash/splash-iphone-1290x2796-v13-1-7.png',
  './assets/brand/splash/splash-ipad-2048x2732-v13-1-7.png',
  './assets/brand/social/og-image-v13-1-7.png',
  './assets/brand/mascot/mascote-pensando.png?v=13.1.0',
  './assets/brand/mascot/mascote-livros-feliz.png?v=13.1.0',
  './assets/brand/mascot/mascote-ideia.png?v=13.1.0'
]
const DEFAULT_ASSETS=['./assets/capas/default-imported-map.webp'];
const SIMULATION_COVERS=['./assets/capas/simulados/simulation-aocp.webp','./assets/capas/simulados/simulation-fundatec.webp','./assets/capas/simulados/simulation-fepese.webp','./assets/capas/simulados/simulation-objetiva.webp','./assets/capas/simulados/simulation-legalle.webp'];
const sameOrigin=request=>new URL(request.url).origin===self.location.origin;
const absolute=path=>new URL(path,self.registration.scope).href;
async function cacheOptional(cache,path){try{const req=new Request(absolute(path),{cache:'reload'}),r=await fetch(req);if(r.ok)await cache.put(req,r)}catch{}}
async function cacheCatalogResources(cache){try{const req=new Request(absolute('./data/catalog.json'),{cache:'reload'}),r=await fetch(req);if(!r.ok)return;const data=await r.clone().json();await cache.put(req,r);const paths=[...(data.maps||[]).flatMap(m=>[m.href,m.cover]),...(data.courses||[]).map(c=>c.edital)].filter(Boolean);await Promise.allSettled(paths.map(p=>cacheOptional(cache,'./'+String(p).replace(/^\.\//,''))))}catch{}}
async function cacheSimulationResources(cache){try{const req=new Request(absolute('./data/simulados.json'),{cache:'reload'}),r=await fetch(req);if(!r.ok)return;const data=await r.clone().json();await cache.put(req,r);const paths=(data.simulations||[]).map(s=>s.href).filter(Boolean);await Promise.allSettled(paths.map(p=>cacheOptional(cache,'./'+String(p).replace(/^\.\//,''))))}catch{}}async function networkFirst(request,fallback){try{const r=await fetch(request);if(r&&r.ok){const cache=await caches.open(V);await cache.put(request,r.clone())}return r}catch{const hit=await caches.match(request,{ignoreSearch:true});if(hit)return hit;if(fallback){const fb=await caches.match(absolute(fallback),{ignoreSearch:true});if(fb)return fb}return new Response('Offline',{status:503,statusText:'Offline'})}}
async function cacheFirst(request){const hit=await caches.match(request);if(hit)return hit;try{const r=await fetch(request);if(r&&r.ok){const cache=await caches.open(V);await cache.put(request,r.clone())}return r}catch{return new Response('Offline',{status:503,statusText:'Offline'})}}
self.addEventListener('install',e=>e.waitUntil((async()=>{const cache=await caches.open(V);await cache.addAll([...CORE,...UI_ICONS,...BRAND_ASSETS,...DEFAULT_ASSETS,...SIMULATION_COVERS]);await cacheCatalogResources(cache);await cacheSimulationResources(cache);await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('study-pwa-')&&k!==V).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||!sameOrigin(r))return;const u=new URL(r.url);if(r.mode==='navigate'){if(/\/simulados\/.*\.html$/i.test(u.pathname)){e.respondWith(networkFirst(r));return}const fallback=u.pathname.endsWith('/reader.html')?'./reader.html':'./index.html';e.respondWith(networkFirst(r,fallback));return}if(/\/cursos\/.*\/(?:mapas\/.*\.html|documentos\/.*\.pdf)$/i.test(u.pathname)||/\/data\/(?:catalog|simulados)\.json$/i.test(u.pathname)){e.respondWith(networkFirst(r));return}e.respondWith(cacheFirst(r))});

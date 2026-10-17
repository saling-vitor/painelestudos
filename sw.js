// V15.51.0-G · release automática do sistema
const V='study-pwa-v15-51-0-release';
const CORE=['./','./index.html','./manifest-v15.23.6.webmanifest','./manifest-light-v15.36.2.webmanifest','./manifest-v15.23.6.webmanifest?v=15.51.0','./manifest-light-v15.36.2.webmanifest?v=15.51.0','./assets/css/design-system/nanquim-tokens.css?v=15.51.0','./assets/css/design-system/nanquim-typography.css?v=15.51.0','./assets/css/app.css?v=15.51.0','./assets/css/study-dashboard.css?v=15.51.0','./assets/css/study-planner.css?v=15.51.0','./assets/css/mobile-first.css?v=15.51.0','./assets/css/camada-1-refinos-telas.css?v=15.51.0','./assets/css/camada-2-responsivo-dispositivos.css?v=15.51.0','./assets/css/camada-3-automacao-configuracoes.css?v=15.51.0','./assets/css/camada-4-vidro-ambiente.css?v=15.51.0','./assets/css/camada-5-acabamento-final.css?v=15.51.0','./assets/css/design-system/nanquim-materials.css?v=15.51.0','./assets/css/design-system/nanquim-application.css?v=15.51.0','./assets/css/design-system/prancha.css?v=15.51.0','./assets/fonts/archivo-latin-wght-normal.woff2','./assets/fonts/anton-latin-400-normal.woff2','./assets/fonts/ibm-plex-mono-latin-400-normal.woff2','./assets/fonts/ibm-plex-mono-latin-500-normal.woff2','./assets/ui/topographic-lines-v15-48-1.svg','./assets/js/config.js?v=15.51.0','./assets/js/config.js','./assets/js/cloud-core.js','./assets/js/map-cloud-bridge.js','./assets/js/cloud-core.js?v=15.51.0','./assets/js/map-cloud-bridge.js?v=15.51.0','./assets/js/app/state.js?v=15.51.0','./assets/js/app/core.js?v=15.51.0','./assets/js/app/study-time.js?v=15.51.0','./assets/js/app/router.js?v=15.51.0','./assets/js/app/maps.js?v=15.51.0','./assets/js/app/review-schedule.js?v=15.51.0','./assets/js/app/courses.js?v=15.51.0','./assets/js/app/search.js?v=15.51.0','./assets/js/app/map-library.js?v=15.51.0','./assets/js/app/progress.js?v=15.51.0','./assets/js/app/reader.js?v=15.51.0','./assets/js/app/sync.js?v=15.51.0','./assets/js/app/diagnostics.js?v=15.51.0','./assets/js/app/backup.js?v=15.51.0','./assets/js/app/restore-points.js?v=15.51.0','./assets/js/app/ui.js?v=15.51.0','./assets/js/app/course-pdf-autofill-v15-40-0.js?v=15.51.0','./assets/js/app/simulations.js?v=15.51.0','./assets/js/app/study-coach.js?v=15.51.0','./assets/js/app/study-dashboard.js?v=15.51.0','./assets/js/app/study-planner.js?v=15.51.0','./assets/js/app/mobile-ux.js?v=15.51.0','./assets/js/app/study-automation-v15-37-0.js?v=15.51.0','./assets/js/app/settings-control-center-v15-38-0.js?v=15.51.0','./assets/js/app/updates.js?v=15.51.0','./assets/js/app-icon-settings-v15-36-2.js?v=15.51.0','./assets/js/app.js?v=15.51.0','./assets/js/app/dynamic-liquid-glass-v2.js?v=15.51.0','./assets/js/app/prancha-data.js?v=15.51.0','./assets/js/app/prancha-ui.js?v=15.51.0','./assets/js/app/prancha-home.js?v=15.51.0','./assets/js/app/prancha-courses.js?v=15.51.0','./assets/js/app/prancha-maps.js?v=15.51.0','./assets/js/app/prancha-simulations.js?v=15.51.0','./assets/js/app/prancha-progress.js?v=15.51.0','./assets/js/app/prancha-agenda.js?v=15.51.0','./assets/js/app/prancha-settings.js?v=15.51.0','./assets/js/app/prancha-boot.js?v=15.51.0','./assets/brand/topographic-editorial-v1/covers/home-hero.png','./data/catalog.json','./data/simulados.json','./data/search-index.json','./reader.html','./offline.html'];
// Ícones rasterizados originais Lucide; sempre offline nas três plataformas.
const UI_ICONS=[
  './assets/ui-icons/lucide/home.png',
  './assets/ui-icons/lucide/courses.png',
  './assets/ui-icons/lucide/maps.png',
  './assets/ui-icons/lucide/book-open.png',
  './assets/ui-icons/lucide/simulations.png',
  './assets/ui-icons/lucide/progress.png',
  './assets/ui-icons/lucide/settings.png',
  './assets/ui-icons/lucide/search.png',
  './assets/ui-icons/lucide/download.png',
  './assets/ui-icons/lucide/upload.png',
  './assets/ui-icons/lucide/sync.png',
  './assets/ui-icons/lucide/plus.png',
  './assets/ui-icons/lucide/chevron-right.png',
  './assets/ui-icons/lucide/chevron-left.png',
  './assets/ui-icons/lucide/chevron-down.png',
  './assets/ui-icons/lucide/document.png',
  './assets/ui-icons/lucide/star.png',
  './assets/ui-icons/lucide/grid.png',
  './assets/ui-icons/lucide/list.png',
  './assets/ui-icons/lucide/close.png',
  './assets/ui-icons/lucide/trash.png',
  './assets/ui-icons/lucide/archive.png',
  './assets/ui-icons/lucide/admin.png',
  './assets/ui-icons/lucide/cloud.png',
  './assets/ui-icons/lucide/cloud-check.png',
  './assets/ui-icons/lucide/cloud-upload.png',
  './assets/ui-icons/lucide/cloud-off.png',
  './assets/ui-icons/lucide/cloud-alert.png',
  './assets/ui-icons/lucide/user.png',
  './assets/ui-icons/lucide/warning.png',
  './assets/ui-icons/lucide/success.png',
  './assets/ui-icons/lucide/calendar.png',
  './assets/ui-icons/lucide/more.png',
  './assets/ui-icons/lucide/device.png',
  './assets/ui-icons/lucide/bolt.png',
  './assets/ui-icons/lucide/target.png',
  './assets/ui-icons/lucide/chart-bars.png',
  './assets/ui-icons/lucide/clock.png',
  './assets/ui-icons/lucide/play.png',
  './assets/ui-icons/lucide/pause.png',
  './assets/ui-icons/lucide/stop.png',
  './assets/ui-icons/lucide/focus.png',
  './assets/ui-icons/lucide/help.png',
  './assets/ui-icons/lucide/question.png',
  './assets/ui-icons/lucide/repeat.png',
  './assets/ui-icons/lucide/file-down.png',
  './assets/ui-icons/lucide/notebook-pen.png',
];
const BRAND_ASSETS=[
  "./assets/brand/topographic-editorial-v1/svg/horizontal-dark-transparente.svg",
  "./assets/brand/topographic-editorial-v1/svg/compacto-dark-transparente.svg",
  "./assets/brand/topographic-editorial-v1/svg/simbolo-dark-transparente.svg",
  "./assets/brand/topographic-editorial-v1/svg/horizontal-light-transparente.svg",
  "./assets/brand/topographic-editorial-v1/svg/compacto-light-transparente.svg",
  "./assets/brand/topographic-editorial-v1/svg/simbolo-light-transparente.svg",
  "./assets/brand/topographic-editorial-v1/svg/favicon.svg",
  "./assets/brand/topographic-editorial-v1/png/horizontal-dark-2172px.png",
  "./assets/brand/topographic-editorial-v1/icons/favicon.ico",
  "./assets/brand/topographic-editorial-v1/icons/favicon-16.png",
  "./assets/brand/topographic-editorial-v1/icons/favicon-32.png",
  "./assets/brand/topographic-editorial-v1/icons/favicon-48.png",
  "./assets/brand/topographic-editorial-v1/icons/pwa-icon-192.png",
  "./assets/brand/topographic-editorial-v1/icons/pwa-icon-512.png",
  "./assets/brand/topographic-editorial-v1/icons/pwa-icon-light-192.png",
  "./assets/brand/topographic-editorial-v1/icons/pwa-icon-light-512.png",
  "./assets/brand/topographic-editorial-v1/icons/pwa-maskable-512.png",
  "./assets/brand/topographic-editorial-v1/icons/pwa-maskable-light-512.png",
  "./assets/brand/topographic-editorial-v1/icons/apple-touch-icon.png",
  "./assets/brand/topographic-editorial-v1/icons/apple-touch-icon-light.png",
  "./assets/brand/topographic-editorial-v1/covers/home-hero.png",
];
const EMPTY_ILLUSTRATION_ASSETS=[
  "./assets/empty-states/01_empty-retomar.png",
  "./assets/empty-states/02_empty-mapas.png",
  "./assets/empty-states/03_empty-cursos.png",
  "./assets/empty-states/04_empty-desconectado.png",
  "./assets/empty-states/05_empty-duvidas.png",
  "./assets/empty-states/06_empty-mapas-filtro.png",
  "./assets/empty-states/07_empty-dia-livre.png",
  "./assets/empty-states/08_empty-simulados-home.png",
  "./assets/empty-states/09_empty-progresso.png",
  "./assets/empty-states/10_empty-curso-filtro.png",
  "./assets/empty-states/11_empty-busca-biblioteca.png",
  "./assets/empty-states/12_empty-busca-resultado.png",
  "./assets/empty-states/13_empty-progresso-filtro.png",
  "./assets/empty-states/14_empty-simulados-biblioteca.png",
  "./assets/empty-states/15_empty-simulados-historico.png",
  "./assets/empty-states/16_empty-revisoes.png",
  "./assets/empty-states/17_empty-caderno-erros.png",
  "./assets/empty-states/18_empty-restauracao.png",
  "./assets/empty-states/19_empty-versoes.png"
];
const DEFAULT_ASSETS=['./assets/capas/padroes/padrao-novo-mapa.png','./assets/capas/padroes/padrao-novo-curso.png','./assets/capas/padroes/padrao-simulado.png','./assets/brand/topographic-editorial-v1/covers/default-study.png','./assets/brand/topographic-editorial-v1/covers/default-course.png'];
const SIMULATION_COVERS=['./assets/capas/simulados/simulation-aocp.webp','./assets/capas/simulados/simulation-fundatec.webp','./assets/capas/simulados/simulation-fepese.webp','./assets/capas/simulados/simulation-objetiva.webp','./assets/capas/simulados/simulation-legalle.webp'];
const sameOrigin=request=>new URL(request.url).origin===self.location.origin;
const absolute=path=>new URL(path,self.registration.scope).href;
async function cacheOptional(cache,path){try{const req=new Request(absolute(path),{cache:'reload'}),r=await fetch(req);if(r.ok)await cache.put(req,r)}catch{}}
async function cacheCatalogResources(cache){try{const req=new Request(absolute('./data/catalog.json'),{cache:'reload'}),r=await fetch(req);if(!r.ok)return;const data=await r.clone().json();await cache.put(req,r);const paths=[...(data.maps||[]).flatMap(m=>[m.href,m.cover]),...(data.courses||[]).map(c=>c.edital),...Object.values(data.bundledCourseAssets||{}).map(c=>c.edital)].filter(Boolean);await Promise.allSettled(paths.map(p=>cacheOptional(cache,'./'+String(p).replace(/^\.\//,''))))}catch{}}
async function cacheSimulationResources(cache){try{const req=new Request(absolute('./data/simulados.json'),{cache:'reload'}),r=await fetch(req);if(!r.ok)return;const data=await r.clone().json();await cache.put(req,r);const paths=(data.simulations||[]).map(s=>s.href).filter(Boolean);await Promise.allSettled(paths.map(p=>cacheOptional(cache,'./'+String(p).replace(/^\.\//,''))))}catch{}}async function networkFirst(request,fallback){try{const r=await fetch(request);if(r&&r.ok){const cache=await caches.open(V);await cache.put(request,r.clone())}return r}catch{const hit=await caches.match(request,{ignoreSearch:true});if(hit)return hit;if(fallback){const fb=await caches.match(absolute(fallback),{ignoreSearch:true});if(fb)return fb}return new Response('Offline',{status:503,statusText:'Offline'})}}
async function cacheFirst(request){const hit=await caches.match(request);if(hit)return hit;try{const r=await fetch(request);if(r&&r.ok){const cache=await caches.open(V);await cache.put(request,r.clone())}return r}catch{return new Response('Offline',{status:503,statusText:'Offline'})}}
// O PWA deve ativar antes de baixar catálogos, mídias e capas não essenciais.
// O aquecimento secundário preserva o suporte offline sem bloquear navigator.serviceWorker.ready.
const BOOT_ASSETS=['./','./index.html','./offline.html','./reader.html','./assets/css/app.css?v=15.51.0','./assets/css/camada-5-acabamento-final.css?v=15.51.0','./assets/js/app.js?v=15.51.0',...UI_ICONS];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(V);await cache.addAll(BOOT_ASSETS)})()));
let warmCachePromise=null;
function warmOfflineCache(){
  if(!warmCachePromise)warmCachePromise=(async()=>{
    const cache=await caches.open(V);
    const paths=[...CORE,...UI_ICONS,...BRAND_ASSETS,...EMPTY_ILLUSTRATION_ASSETS,...DEFAULT_ASSETS,...SIMULATION_COVERS];
    await Promise.allSettled(paths.map(path=>cacheOptional(cache,path)));
    await Promise.allSettled([cacheCatalogResources(cache),cacheSimulationResources(cache)]);
  })().finally(()=>{warmCachePromise=null});
  return warmCachePromise;
}
self.addEventListener('message',event=>{
  const data=event.data||{};
  if(data.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
  if(data.type==='WARM_CACHE')event.waitUntil(warmOfflineCache());
});
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('study-pwa-')&&k!==V).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||!sameOrigin(r))return;const u=new URL(r.url);if(/\/version\.json$/i.test(u.pathname)){e.respondWith(fetch(r,{cache:'no-store'}));return}if(r.mode==='navigate'){if(/\/simulados\/.*\.html$/i.test(u.pathname)){e.respondWith(cacheFirst(r));return}const fallback=u.pathname.endsWith('/reader.html')?'./reader.html':'./index.html';e.respondWith(networkFirst(r,fallback));return}if(/\/cursos\/.*\/mapas\/.*\.html$/i.test(u.pathname)){e.respondWith(cacheFirst(r));return}if(/\/cursos\/.*\/documentos\/.*\.pdf$/i.test(u.pathname)){e.respondWith(cacheFirst(r));return}if(/\/data\/(?:catalog|simulados)\.json$/i.test(u.pathname)){e.respondWith(networkFirst(r));return}e.respondWith(cacheFirst(r))});

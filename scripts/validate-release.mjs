import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const exists=file=>fs.existsSync(path.join(ROOT,file));
let failed=false;
function fail(message){failed=true;console.error('✖ '+message)}
function ok(message){console.log('✓ '+message)}
function check(condition,message){condition?ok(message):fail(message)}
function parseJson(file){try{const value=JSON.parse(read(file));ok(file+' JSON');return value}catch(error){fail(file+' JSON inválido: '+error.message);return null}}
function cleanAsset(value){return String(value||'').split(/[?#]/)[0].replace(/^\.\//,'')}
function nonEmpty(file){try{const stat=fs.statSync(path.join(ROOT,file));return stat.isFile()&&stat.size>0}catch{return false}}

for(const file of ['assets/js/app.js','sw.js','index.html','version.json'])check(exists(file),file+' existe');
const version=parseJson('version.json');
const catalog=parseJson('data/catalog.json');
const simulations=parseJson('data/simulados.json');
const searchIndex=parseJson('data/search-index.json');
if(!version||!catalog||!simulations||!searchIndex)process.exit(1);
const expected=String(version.version||'');
const expectedLabel=String(version.label||'');
const automation=version.automation||{};
const moduleFiles=["assets/js/app/state.js","assets/js/app/core.js","assets/js/app/study-time.js","assets/js/app/router.js","assets/js/app/maps.js","assets/js/app/review-schedule.js","assets/js/app/courses.js","assets/js/app/search.js","assets/js/app/map-library.js","assets/js/app/progress.js","assets/js/app/reader.js","assets/js/app/sync.js","assets/js/app/diagnostics.js","assets/js/app/backup.js","assets/js/app/restore-points.js","assets/js/app/ui.js","assets/js/app/simulations.js","assets/js/app/study-coach.js","assets/js/app/study-dashboard.js","assets/js/app/study-planner.js","assets/js/app/mobile-ux.js","assets/js/app/updates.js","assets/js/app/dynamic-liquid-glass-v2.js"];
for(const file of moduleFiles)check(exists(file),file+' existe');
const stateModule=read('assets/js/app/state.js');
const allJs=[...moduleFiles.map(read),read('assets/js/app.js')].join('\n');
const index=read('index.html');
const sw=read('sw.js');
check(stateModule.includes(`APP_VERSION='${expected}'`)||stateModule.includes(`APP_VERSION = '${expected}'`),'APP_VERSION = '+expected);
check(expectedLabel===`V${expected}-G`||expectedLabel===`V${expected}-D`||expectedLabel===`V${expected}-T`||expectedLabel===`V${expected}-M`,'version.json label coerente com '+expected);
check(automation.enabled===true,'versionamento automático habilitado');
check(/^\d+\.\d+$/.test(String(automation.series||'')),'série automática X.Y configurada');
check(Number.isInteger(Number(automation.runBase))&&Number(automation.runBase)>=0,'runBase automático configurado');
if(process.env.GITHUB_RUN_NUMBER){
  check(Number(version.build?.runNumber)===Number(process.env.GITHUB_RUN_NUMBER),'build usa GITHUB_RUN_NUMBER atual');
  check(version.build?.automatic===true,'build automático registrado em version.json');
  check(String(version.build?.commit||'').length>=7,'build registra commit');
}
check(stateModule.includes(`APP_VERSION_LABEL='${expectedLabel}'`)||stateModule.includes(`APP_VERSION_LABEL = '${expectedLabel}'`),'APP_VERSION_LABEL = '+expectedLabel);
check(index.includes(`id="appInstalledVersion">${expectedLabel}</strong>`),'index versão instalada = '+expectedLabel);
check(index.includes(`id="whatsNewVersion">${expectedLabel}</h2>`),'index novidades = '+expectedLabel);
check(index.includes(`app.js?v=${expected}`),'index.html app.js query');
const indexVersionRefs=[...index.matchAll(/[?&]v=(\d+\.\d+\.\d+)/g)].map(match=>match[1]);
const staleIndexRefs=indexVersionRefs.filter(value=>value!==expected);
check(staleIndexRefs.length===0,'index.html sem versões antigas em query strings');
for(const file of moduleFiles)check(index.includes(file+`?v=${expected}`),'index module '+file);
check(index.includes(`app.css?v=${expected}`),'index.html app.css query');
check(index.includes(`study-planner.css?v=${expected}`),'index.html study-planner.css query');
check(index.includes(`mobile-first.css?v=${expected}`),'index.html mobile-first.css query');

/* AUDITORIA V15.47 · nova base limpa */
const activeCssFiles=[...index.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map(match=>cleanAsset(match[1]));
const activeJsFiles=[...index.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map(match=>cleanAsset(match[1]));
check(activeCssFiles.length===45,'auditoria: build ativo usa 45 CSS com módulo final de navegação V2');
check(activeJsFiles.length===30,'auditoria: build ativo usa 30 scripts JS diretos após consolidação');
check(index.includes(`nav-liquid-glass-v15-48-2.css?v=${expected}`),'Lista Mestra V2: módulo cromático e vidro ativo');
check(sw.includes(`nav-liquid-glass-v15-48-2.css?v=${expected}`),'Lista Mestra V2: estilo precached no PWA');
const navV2Css=read('assets/css/nav-liquid-glass-v15-48-2.css');
for(const section of ['home','courses','maps','simulations','progress','agenda','settings'])check(navV2Css.includes(`data-nav="${section}"`),'Identidade cromática de navegação: '+section);
check(navV2Css.includes('mm-reduced-transparency'),'V2 preserva preferência de transparência reduzida');
const deadLegacyFiles=[
  'assets/css/ipad-cloud-compact-v15-36-1.css',
  'assets/css/button-depth-v15-36-14.css',
  'assets/css/map-card-cleanup-v15-36-23.css',
  'assets/js/app/review-polish-v15-36-34.js',
  'assets/css/topographic-environment-v15-42.css',
  'assets/ui/topographic-map-v15-42.svg',
  'assets/js/app/course-pdf-autofill-v15-39-0.js',
  'assets/home-hero-panel.webp'
];
for(const file of deadLegacyFiles)check(!exists(file),'auditoria: legado removido '+file);
for(const file of deadLegacyFiles)check(!index.includes(file),'auditoria: index não referencia '+file);
for(const file of deadLegacyFiles)check(!sw.includes(file),'auditoria: service worker não referencia '+file);
const v13BrandLegacy=[
  'assets/brand/app-icons/apple-touch-icon-v13-1-7.png',
  'assets/brand/app-icons/icon-192-v13-1-7.png',
  'assets/brand/app-icons/icon-512-v13-1-7.png',
  'assets/brand/app-icons/icon-maskable-192-v13-1-7.png',
  'assets/brand/app-icons/icon-maskable-512-v13-1-7.png',
  'assets/brand/favicon/favicon-16x16-v13-1-7.png',
  'assets/brand/favicon/favicon-32x32-v13-1-7.png',
  'assets/brand/favicon/favicon-48x48-v13-1-7.png',
  'assets/brand/favicon/favicon-96x96-v13-1-7.png',
  'assets/brand/favicon/favicon-v13-1-7.ico',
  'assets/brand/logo/logo-horizontal-v13-1-7.png',
  'assets/brand/logo/marca-simplificada-v13-1-7.png',
  'assets/brand/social/og-image-v13-1-7.png',
  'assets/brand/splash/splash-ipad-2048x2732-v13-1-7.png',
  'assets/brand/splash/splash-iphone-1290x2796-v13-1-7.png'
];
for(const file of v13BrandLegacy)check(!exists(file),'auditoria: duplicata V13 removida '+file);
const activeCssText=activeCssFiles.filter(exists).map(read).join('\n');
const baselineCssText=activeCssFiles.filter(file=>!['assets/css/master-refinement-v15-48-1.css','assets/css/nav-liquid-glass-v15-48-2.css'].includes(file)).filter(exists).map(read).join('\n');
const importantCount=(baselineCssText.match(/!important/g)||[]).length;
check(exists('assets/css/master-refinement-v15-48-1.css'),'refinamento responsivo V15.48.1 existe');
const legacyBlueCount=(activeCssText.match(/#6d8298|rgba?\(\s*109\s*,\s*130\s*,\s*152/gi)||[]).length;
check(importantCount<=6694,'auditoria: !important não regrediu ('+importantCount+')');
const navGlassImportant=(read('assets/css/nav-liquid-glass-v15-48-2.css').match(/!important/g)||[]).length;
check(navGlassImportant<=90,'auditoria: V2 preserva limite próprio de overrides ('+navGlassImportant+')');
check(legacyBlueCount<=19,'auditoria: azul legacy ficou restrito a semântica ('+legacyBlueCount+')');
const automationCss=read('assets/css/study-automation-v15-37-0.css');
const settingsControlCss=read('assets/css/settings-control-center-v15-38-0.css');
const v211Css=read('assets/css/v211-parity-v15-42.css');
check(!settingsControlCss.includes('rgba(109,130,152'),'auditoria: configurações sem azul estrutural legacy');
check(!v211Css.includes('--v211-blue'),'auditoria: token V211 azul não utilizado removido');
check(automationCss.includes('.automation-issues span.is-info{border-left-color:rgba(109,130,152,.52)}'),'auditoria: azul semântico de informação preservado');
check(read('assets/css/button-glass-v15-36-15.css').includes('CONSOLIDADO V15.47 · NORMALIZAÇÃO DE BOTÕES'),'auditoria: button-depth consolidado');
check(read('assets/css/ipad-stage2-v01.css').includes('CONSOLIDADO V15.47 · STATUS DA NUVEM NO iPAD'),'auditoria: nuvem iPad consolidada');
check(read('assets/css/course-covers-fullbleed-v15-36-31.css').includes('CONSOLIDADO V15.47 · MAP CARD FOOT'),'auditoria: cleanup de map card consolidado');
check(read('assets/js/app/mobile-ux.js').includes('CONSOLIDADO V15.47 · REVIEW POLISH RESPONSIVO'),'auditoria: patch responsivo JS consolidado');
check(index.includes(`home-refine-v01.css?v=${expected}`),'index.html home-refine query');
check(index.includes(`map-accent-v01.css?v=${expected}`),'index.html map-accent query');
check(index.includes(`ui-chrome-refine-v01.css?v=${expected}`),'index.html ui-chrome query');
check(index.includes(`topographic-environment-v15-43.css?v=${expected}`),'index.html ambiente topográfico raster V15.43');
check(index.includes(`design-system-v15-42.css?v=${expected}`),'index.html Design System V15.42');
check(index.includes(`v211-parity-v15-42.css?v=${expected}`),'index.html paridade visual V211');
check(index.includes(`black-editorial-liquid-glass-v2.css?v=${expected}`),'index.html Black Editorial + Liquid Glass V2');
check(exists('assets/css/black-editorial-liquid-glass-v2.css'),'CSS Black Editorial + Liquid Glass V2 existe');
check(index.includes(`dynamic-liquid-glass-v2.css?v=${expected}`),'index.html Dynamic Liquid Glass V2 CSS');
check(index.includes(`assets/js/app/dynamic-liquid-glass-v2.js?v=${expected}`),'index.html Dynamic Liquid Glass V2 runtime');
check(exists('assets/css/dynamic-liquid-glass-v2.css'),'Dynamic Liquid Glass V2 CSS existe');
check(exists('assets/js/app/dynamic-liquid-glass-v2.js'),'Dynamic Liquid Glass V2 runtime existe');
const dynamicGlassCss=read('assets/css/dynamic-liquid-glass-v2.css');
const dynamicGlassJs=read('assets/js/app/dynamic-liquid-glass-v2.js');
check(dynamicGlassCss.includes('--mm-glass-rim-light'),'Dynamic Glass define refractive rim');
check(dynamicGlassCss.includes('--mm-motion-morph'),'Dynamic Glass define motion tokens');
check(!dynamicGlassCss.includes('.mm-active-lens'),'Dynamic Glass não contém lente móvel');
check(!dynamicGlassCss.includes('.mm-pressed')&&!dynamicGlassCss.includes('.mm-specular'),'CSS sem press optics/specular tracking');
check(!dynamicGlassJs.includes('ensureLens')&&!dynamicGlassJs.includes('pointermove')&&!dynamicGlassJs.includes('mm-pressed'),'runtime sem lente, ponteiro guiado ou lens compression');
check(!read('assets/css/nav-liquid-glass-v15-48-2.css').includes('--mm-topo-opacity'),'topografia sem override final de navegação');
check(!read('assets/css/master-refinement-v15-48-1.css').includes('--mm-topo-opacity:.86'),'topografia sem override de brilho legado');
check(dynamicGlassCss.includes('.mm-reduced-transparency'),'Dynamic Glass oferece fallback de transparência');
check(dynamicGlassCss.includes('"Inter"')||dynamicGlassCss.includes('family=Inter'),'Inter configurada como tipografia principal');
check(dynamicGlassJs.includes('requestAnimationFrame'),'runtime óptico usa requestAnimationFrame');
check(dynamicGlassJs.includes('IntersectionObserver'),'runtime limita Micro Glass à viewport');
check(dynamicGlassJs.includes('prefers-reduced-motion'),'runtime detecta Reduce Motion');
check(dynamicGlassJs.includes('prefers-reduced-transparency'),'runtime detecta Reduce Transparency');
check(!/getImageData|drawImage\s*\(/.test(dynamicGlassJs),'runtime não faz análise de pixel das capas');
const blackEditorialCss=read('assets/css/black-editorial-liquid-glass-v2.css');
check(blackEditorialCss.includes('--mm-bg-deep:#020202'),'Black Editorial token --mm-bg-deep neutro');
check(blackEditorialCss.includes('--mm-glass-regular-bg:rgba(9,9,9,.60)'),'Liquid Glass Regular neutro');
check(blackEditorialCss.includes('--mm-glass-dense-bg:rgba(8,8,8,.82)'),'Liquid Glass Dense neutro');
check(blackEditorialCss.includes('--mm-glass-clear-bg:rgba(12,12,12,.24)'),'Liquid Glass Clear neutro');
check(!(new RegExp('\\b(?:blue|navy|cyan|teal)\\b','i')).test(blackEditorialCss),'tema final sem nomes estruturais blue/navy/cyan/teal');
check(blackEditorialCss.includes('body :is(input,select,textarea):not([type="checkbox"]):not([type="radio"])'),'Black Editorial cobre formulários fora de .app');
check(blackEditorialCss.includes('background:#0A0A0A!important'),'controles estruturais usam preto neutro');
for(const legacy of ['#101319','rgba(8,11,15','rgba(10,13,18','rgba(19,22,28','#a9c8e7','rgba(169,200,231','#030406','#06080b','rgba(39,50,64','rgba(54,59,66','rgba(8,14,22','#12151a']){
  check(!activeCssText.includes(legacy),'cromia estrutural fria removida: '+legacy);
}
const mmSaturates=[...blackEditorialCss.matchAll(/saturate\((\d+(?:\.\d+)?)%\)/g)].map(match=>Number(match[1]));
check(mmSaturates.length>0&&Math.max(...mmSaturates)<=135,'Liquid Glass saturate principal <= 135%');
check(blackEditorialCss.includes('@media(prefers-reduced-transparency:reduce)'),'fallback prefers-reduced-transparency');
check(blackEditorialCss.includes('@media(prefers-contrast:more)'),'fallback prefers-contrast');
check(blackEditorialCss.includes('@media(prefers-reduced-motion:reduce)'),'fallback prefers-reduced-motion');
check(blackEditorialCss.includes('@media(forced-colors:active)'),'fallback forced-colors');
check(exists('assets/css/topographic-environment-v15-43.css'),'CSS topográfico raster V15.43 existe');
check(exists('assets/ui/topographic-lines-v15-48-1.svg'),'SVG topográfico vetorial oficial existe');
const topoRasterCss=read('assets/css/topographic-environment-v15-43.css');
const topoRasterStat=fs.statSync(path.join(ROOT,'assets/ui/topographic-lines-v15-48-1.svg'));
check(topoRasterStat.size>100000,'SVG topográfico original preserva a geometria vetorial em alta qualidade');
check(topoRasterCss.includes('topographic-lines-v15-48-1.svg'),'CSS topográfico referencia o SVG oficial V15.48.1');
check(/background-repeat\s*:\s*no-repeat/i.test(topoRasterCss),'topografia raster não repete');
check(!/background-repeat\s*:\s*repeat(?:\s|;|!)/i.test(topoRasterCss),'topografia raster não usa mosaico repeat');
check(!/(?:^|[;{])\s*(?:-webkit-)?filter\s*:\s*blur\s*\(/im.test(topoRasterCss),'background raster não aplica blur');
check(topoRasterCss.includes('--mm-topo-opacity:.46'),'topografia desktop usa opacidade .46');
check(topoRasterCss.includes('--mm-topo-opacity:.42'),'topografia tablet usa opacidade .42');
check(topoRasterCss.includes('--mm-topo-opacity:.32'),'topografia smartphone usa opacidade .32');
check(topoRasterCss.includes('opacity:.025!important'),'topografia reduz ruído em transparência/contraste');
check(topoRasterCss.includes('body:has(#reader.open)::before'),'leitor oculta o ambiente topográfico global');
check(!blackEditorialCss.includes('topographic-map-v15-42.svg'),'Black Editorial não reativa o SVG topográfico legado');
check(!blackEditorialCss.includes('--mm-topo-size'),'Black Editorial não redefine escala topográfica legada');
check(sw.includes('./assets/ui/topographic-lines-v15-48-1.svg'),'service worker pré-cacheia SVG topográfico oficial');
check(sw.includes(`./assets/css/topographic-environment-v15-43.css?v=${expected}`),'service worker pré-cacheia CSS topográfico raster');
check(!sw.includes('./assets/ui/topographic-map-v15-42.svg'),'service worker não pré-cacheia SVG topográfico legado');
check(!sw.includes('topographic-environment-v15-42.css'),'service worker não pré-cacheia CSS topográfico legado');
check(index.includes('id="forceAppRefreshBtn"'),'index botão atualização forçada');
check(allJs.includes(`sw.js?v=${expected}`),'registro sw.js query');
const swVersionRefs=[...sw.matchAll(/[?&]v=(\d+\.\d+\.\d+)/g)].map(match=>match[1]);
const staleSwRefs=swVersionRefs.filter(value=>value!==expected);
check(staleSwRefs.length===0,'service worker sem versões antigas em query strings');

const unsafeDollarForEach=/(?<!\$)\$\([^)]*\)\s*\.forEach\s*\(/g;
const unsafeDollarMatches=[...allJs.matchAll(unsafeDollarForEach)].map(match=>match[0]);
if(unsafeDollarMatches.length){
 fail('Use $$() para coleções antes de .forEach(). Encontrado: '+unsafeDollarMatches.join(' | '));
}else{
 ok('Coleções .forEach usam $$() ou querySelectorAll()');
}
const cacheToken='study-pwa-v'+expected.replaceAll('.','-');
check(sw.includes(cacheToken),'cache '+cacheToken);
const coreMatch=sw.match(/const CORE=\[(.*?)\];/s);
if(!coreMatch){fail('CORE não encontrado em sw.js')}else{
 const refs=[...coreMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(match=>match[1]);
 for(const ref of refs){if(ref==='./'){ok('CORE ./');continue}const file=cleanAsset(ref);check(exists(file),'CORE '+file)}
}
for(const map of catalog.maps||[]){
 if(map.href){const file=cleanAsset(map.href);check(exists(file),'Mapa '+file);if(/\.html$/i.test(file))check(nonEmpty(file),'Mapa não vazio '+file)}
 if(map.cover)check(exists(cleanAsset(map.cover)),'Capa '+cleanAsset(map.cover));
}
for(const sim of simulations.simulations||[]){
 if(sim.href){const file=cleanAsset(sim.href);check(exists(file),'Simulado '+file);if(/\.html$/i.test(file))check(nonEmpty(file),'Simulado não vazio '+file)}
}
check(Number(searchIndex.version)===1,'search-index versão 1');
check(Array.isArray(searchIndex.items),'search-index items');
const expectedTopics=(catalog.maps||[]).filter(map=>map.source==='bundled').reduce((sum,map)=>sum+Number(map.topics||0),0);
check((searchIndex.items||[]).length===expectedTopics,'search-index '+expectedTopics+' tópicos');
for(const file of ['index.html','reader.html','offline.html'])check(nonEmpty(file),'HTML principal não vazio '+file);
if(failed){console.error('\nVALIDAÇÃO FALHOU.');process.exit(1)}
console.log('\n✓ Release validada.')

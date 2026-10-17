import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const exists=file=>fs.existsSync(path.join(ROOT,file));
let failed=false;
/* V15.51 · as 45 folhas de remendo foram consolidadas em 5 camadas (mesma ordem de cascata).
   scripts/css-layers.json liga cada folha antiga à camada; readCss() devolve o trecho "@origem" correspondente,
   para que as travas históricas continuem valendo sobre o conteúdo real. */
const CSS_LAYERS=JSON.parse(read('scripts/css-layers.json'));
const layerKey=name=>Object.keys(CSS_LAYERS).find(k=>k===name||k.endsWith('/'+name)||k.endsWith(name));
function readCss(file){if(exists(file))return read(file);const k=layerKey(file);if(!k)return read(file);const t=read(CSS_LAYERS[k]);const m='/* ════ @origem '+k+' ════ */';const i=t.indexOf(m);if(i<0)return '';const j=t.indexOf('/* ════ @origem ',i+m.length);return t.slice(i+m.length,j<0?undefined:j)}
function cssExists(file){if(exists(file))return true;const k=layerKey(file);return !!k&&exists(CSS_LAYERS[k])&&read(CSS_LAYERS[k]).includes('@origem '+k+' ')}
function cssIn(text,name){if(text.includes(name))return true;const dot=name.startsWith('./')?'./':'';name=name.slice(dot.length);const base=name.split('?')[0];const k=layerKey(base);return !!k&&text.includes(dot+CSS_LAYERS[k]+name.slice(base.length))&&cssExists(k)}

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
const moduleFiles=["assets/js/app/state.js","assets/js/app/core.js","assets/js/app/study-time.js","assets/js/app/router.js","assets/js/app/maps.js","assets/js/app/map-category.js","assets/js/app/review-schedule.js","assets/js/app/courses.js","assets/js/app/search.js","assets/js/app/map-library.js","assets/js/app/progress.js","assets/js/app/reader.js","assets/js/app/sync.js","assets/js/app/diagnostics.js","assets/js/app/backup.js","assets/js/app/restore-points.js","assets/js/app/ui.js","assets/js/app/simulations.js","assets/js/app/study-coach.js","assets/js/app/study-dashboard.js","assets/js/app/study-planner.js","assets/js/app/mobile-ux.js","assets/js/app/updates.js","assets/js/app/dynamic-liquid-glass-v2.js"];
for(const file of moduleFiles)check(exists(file),file+' existe');
const stateModule=read('assets/js/app/state.js');
const allJs=[...moduleFiles.map(read),read('assets/js/app.js')].join('\n');
const index=read('index.html');
const sw=read('sw.js');
check(stateModule.includes(`APP_VERSION='${expected}'`)||stateModule.includes(`APP_VERSION = '${expected}'`),'APP_VERSION = '+expected);
check(new RegExp('^V'+expected.replaceAll('.','\\.')+'-(G|D|T|M|D\\+T|T\\+M|D\\+M)$').test(expectedLabel),'version.json label coerente com '+expected);
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
check(cssIn(index,`app.css?v=${expected}`),'index.html app.css query');
check(cssIn(index,`study-planner.css?v=${expected}`),'index.html study-planner.css query');
check(cssIn(index,`mobile-first.css?v=${expected}`),'index.html mobile-first.css query');

/* AUDITORIA V15.47 · nova base limpa */
const activeCssFiles=[...index.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map(match=>cleanAsset(match[1]));
const activeJsFiles=[...index.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map(match=>cleanAsset(match[1]));
check(activeCssFiles.length===14,'auditoria V15.51: 14 CSS (9 de base/design system + 5 camadas consolidadas)');
check(cssIn(index,`home-responsive-v15-48-162.css?v=${expected}`),'Home responsiva: estilos finais conectados');
check(cssIn(index,`assets/css/black-smoked-uniform-v15-48-163.css?v=${expected}`),'Black Smoked Uniforme: CSS final conectado');
check(cssIn(sw,`assets/css/black-smoked-uniform-v15-48-163.css?v=${expected}`),'Black Smoked Uniforme: CSS disponivel offline');
check(activeCssFiles.at(-2)==='assets/css/design-system/nanquim-application.css','Nanquim: camada de aplicação antes das pranchas');
check(activeCssFiles.at(-1)==='assets/css/design-system/prancha.css','Pranchas: CSS final conectado');
const nanquimSheets=["assets/css/design-system/nanquim-tokens.css","assets/css/design-system/nanquim-typography.css","assets/css/design-system/nanquim-materials.css","assets/css/design-system/nanquim-application.css"];
for(const file of nanquimSheets){check(exists(file),'Nanquim CSS: '+file);check(index.includes(file+`?v=${expected}`),'Nanquim index: '+file);check(sw.includes(file+`?v=${expected}`),'Nanquim PWA: '+file)}
// Nanquim PWA: testar metadados de todas as entradas escuras, inclusive a página offline.
const readerEntry=read('reader.html'),offlineEntry=read('offline.html');
const darkManifest=parseJson('manifest-v15.23.6.webmanifest');
check(index.includes('name="theme-color" content="#000000"'),'Nanquim: metadado do portal');
check(readerEntry.includes('name="theme-color" content="#000000"'),'Nanquim: metadado do leitor');
check(offlineEntry.includes('name="theme-color" content="#000000"'),'Nanquim: metadado offline');
check(offlineEntry.includes('manifest-v15.23.6.webmanifest?v='+expected),'Nanquim: offline manifesto versionado');
check(darkManifest.theme_color==='#000000'&&darkManifest.background_color==='#000000','Nanquim: manifesto escuro e splash PWA');
const genericManifest=parseJson('manifest.webmanifest');
check(genericManifest.theme_color==='#000000'&&genericManifest.background_color==='#000000','Nanquim: manifesto genérico sem tema legado');
const nanquimTypography=read(nanquimSheets[1]);
for(const t of ['display','h1','h2','h3','title','body','body-sm','label','input','caption','eyebrow','tabbar','kpi','kpi-sm'])check(nanquimTypography.includes('--fs-'+t+':'),'token '+t);
const nanquimApp=read(nanquimSheets[3]);
check(nanquimApp.includes('prefers-reduced-transparency')&&nanquimApp.includes('prefers-reduced-motion'),'fallback de acessibilidade');
check(!nanquimApp.includes('html *{'),'sem reset global de cores temáticas');
const blackSmokedCss=readCss('assets/css/black-smoked-uniform-v15-48-163.css');
/* V15.51: as travas abaixo conferem o valor EFETIVO. O :root do Grafite fumê definia --mm-smoke-card-black, --mm-smoke-inset,
   --mm-ivory-strong e --mm-smoke-card-filter, mas nanquim-application.css os redefine depois para o mesmo :root —
   as declarações antigas nunca valiam e foram removidas como código morto. A autoridade é a camada de aplicação Nanquim. */
const nanquimAppCss=read('assets/css/design-system/nanquim-application.css');
check(blackSmokedCss.includes('--mm-smoke-opacity:.84')&&nanquimAppCss.includes('--mm-smoke-card-black:var(--nq-grafite-1)'),'Nanquim: card em grafite-1 (sem cinza azulado), valor efetivo da camada de aplicação');
check(!/(?:linear|radial|conic)-gradient\s*\(/.test(blackSmokedCss),'Black Smoked: sem gradientes cromaticos');
check(nanquimAppCss.includes('--mm-smoke-inset:var(--nq-grafite-2)')&&blackSmokedCss.includes('.study-rhythm-kpis>article'),'Cards e componentes internos usam grafite-2 compartilhado (valor efetivo)');
check(blackSmokedCss.includes('--mm-smoke-tint:0%')&&nanquimAppCss.includes('--mm-ivory-strong:var(--nq-papel)'),'Nanquim: zero tingimento cromático e texto em papel (valor efetivo)');
check(nanquimAppCss.includes('--mm-smoke-card-filter:none')&&blackSmokedCss.includes('backdrop-filter:var(--mm-smoke-card-filter)!important'),'Cards de leitura sólidos: filtro do card passa pelo token e o valor efetivo é none (vidro só no que flutua)');
check(blackSmokedCss.includes('--mm-card-surface:var(--mm-smoke-card-black)')&&blackSmokedCss.includes('html:not(.is-phone-layout) .app .side'),'Todos os cards e sidebar: superficie grafite canonica');
check(blackSmokedCss.includes('prefers-reduced-transparency')&&blackSmokedCss.includes('forced-colors'),'Black Smoked: alternativas de acessibilidade');

check(cssIn(sw,`home-responsive-v15-48-162.css?v=${expected}`),'Home responsiva: estilos no cache PWA');
check(cssIn(index,`empty-illustrations-v15-48-160.css?v=${expected}`),'19 estados vazios: CSS editorial carregado');
check(cssIn(sw,`empty-illustrations-v15-48-160.css?v=${expected}`),'19 estados vazios: CSS disponível offline no PWA');
check(activeJsFiles.length===42,'auditoria: build ativo usa 42 scripts JS diretos (30 + 10 módulos das pranchas + fluxo de estudo V15.52 + categorias V15.53)');
check(cssIn(index,`nav-liquid-glass-v15-48-2.css?v=${expected}`),'Lista Mestra V2: módulo cromático e vidro ativo');
check(cssIn(index,`lucide-png-v15-48-172.css?v=${expected}`),'Ícones Lucide PNG carregados na interface');
check(cssIn(sw,`lucide-png-v15-48-172.css?v=${expected}`),'Ícones Lucide PNG disponíveis no PWA offline');
const solidIcons=readCss('assets/css/lucide-png-v15-48-172.css');
for(const name of ['home','courses','maps','simulations','progress','settings','calendar','cloud','cloud-check','cloud-upload','cloud-off','cloud-alert','play','pause','focus','help'])check(solidIcons.includes(`.ui-icon.icon-${name}`),'Ícone Lucide PNG: '+name);
check(cssIn(sw,`nav-liquid-glass-v15-48-2.css?v=${expected}`),'Lista Mestra V2: estilo precached no PWA');
const navV2Css=readCss('assets/css/nav-liquid-glass-v15-48-2.css');
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
check(!activeCssText.includes('../ui-icons/sf-black-filled/'),'auditoria: CSS ativo sem dependência de PNG antigo');
check(/const UI_ICONS=\[[\s\S]*?assets\/ui-icons\/lucide\/home\.png/.test(sw),'PWA pré-cacheia ícones PNG oficiais');
check(!activeCssText.includes('data:image/svg+xml'),'CSS ativo sem SVG embutido em ícones');
check(!solidIcons.includes('data:image/svg+xml'),'Biblioteca de interface 100% PNG');
const pngAssets=[...sw.matchAll(/'\.\/assets\/ui-icons\/lucide\/([^']+\.png)'/g)].map(match=>'assets/ui-icons/lucide/'+match[1]);
check(new Set(pngAssets).size===47,'47 arquivos PNG oficiais no manifesto PWA');
for(const png of pngAssets)check(nonEmpty(png),'PNG Lucide presente: '+png);
for(const cover of ['assets/capas/padroes/padrao-simulado.png','assets/capas/padroes/padrao-novo-curso.png','assets/capas/padroes/padrao-novo-mapa.png'])check(nonEmpty(cover),'Capa PNG oficial presente: '+cover);
check(stateModule.includes('assets/capas/padroes/padrao-novo-curso.png')&&stateModule.includes('assets/capas/padroes/padrao-novo-mapa.png'),'Defaults curso/mapa apontam para capas oficiais');
check(allJs.includes("key:'padrao'")&&allJs.includes('padrao-simulado.png'),'Padrão simulado ativo sem eliminar capas específicas');
const newHomeCss='assets/css/home-responsive-v15-48-162.css';
const smokedCss='assets/css/black-smoked-uniform-v15-48-163.css';
check(cssExists('assets/css/master-refinement-v15-48-1.css'),'refinamento responsivo V15.48.1 existe');
const legacyBlueCount=(activeCssText.match(/#6d8298|rgba?\(\s*109\s*,\s*130\s*,\s*152/gi)||[]).length;
/* V15.51: orçamento único de !important sobre TODO o CSS ativo. Base V15.50 = 8 768; a limpeza de declarações
   comprovadamente sobrescritas removeu 1 198. Qualquer novo !important exige remover outro. */
const importantTotal=(activeCssText.match(/!important/g)||[]).length;
check(importantTotal<=7570,'auditoria: !important total controlado <=7570 ('+importantTotal+'; era 8768 na V15.50)');
const homeImportantCount=(readCss(newHomeCss).match(/!important/g)||[]).length;
check(homeImportantCount<=450,'auditoria: overrides da Home responsiva <=450 ('+homeImportantCount+')');
const smokedImportantCount=(readCss(smokedCss).match(/!important/g)||[]).length;
check(smokedImportantCount<=110,'Black Smoked: limite de overrides do modulo <=110 ('+smokedImportantCount+')');
const navGlassImportant=(readCss('assets/css/nav-liquid-glass-v15-48-2.css').match(/!important/g)||[]).length;
check(navGlassImportant<=90,'auditoria: V2 preserva limite próprio de overrides ('+navGlassImportant+')');
const ipadLayoutCss=readCss('assets/css/ipad-portrait-nav-v15-36-17.css');
const designTabletCss=readCss('assets/css/design-system-v15-42.css');
const homeTabletCss=readCss('assets/css/desktop-home-ipad-nav-v15-36-36.css');
const finalDockCss=readCss('assets/css/nav-liquid-glass-v15-48-2.css');
const globalTopoCss=readCss('assets/css/topographic-environment-v15-43.css');
check(ipadLayoutCss.includes('height:50px!important'),'dock iPad usa alvos compactos de 50 px');
check(ipadLayoutCss.includes('padding:4px!important'),'dock iPad usa padding vertical compacto');
check(!designTabletCss.includes('NAVEGAÇÃO RESPONDE À LARGURA'),'breakpoint obsoleto do iPad removido');
check(!homeTabletCss.includes('grid-template-columns:repeat(7,minmax(0,1fr))'),'grid iPad com autoridade única');
check(finalDockCss.includes('ÚNICA pintura óptica'),'dock iPad tem uma superfície de vidro canônica');
check(!readCss('assets/css/master-refinement-v15-48-1.css').includes('html.is-ipad:not(.is-phone-layout) .bottom-nav,html.is-phone-layout .bottom-nav'),'master não redefine fundo óptico do iPad');
check(globalTopoCss.includes('html.is-ipad:not(.is-phone-layout) body::before{\n    transform:none;'),'raster do iPad sem camada GPU artificial');
check(finalDockCss.includes('content:none!important;'),'dock elimina pseudo-layer');
const legacyTabletNav=readCss('assets/css/review-polish-v15-36-34.css');
const ipadContentCss=readCss('assets/css/ipad-course-refine-v15-38-2.css');
const baseIpadCss=readCss('assets/css/responsive-polish-v15-36-16.css');
check(!legacyTabletNav.includes('dock inferior de cinco destinos'),'variante obsoleta de cinco destinos removida');
check(!legacyTabletNav.includes('html.is-ipad:not(.is-phone-layout) .bottom-nav .bottom-nav-simulations'),'legado não esconde Simulados e Calendário');
check(!ipadContentCss.includes('--ipad-bottom-nav-height'),'sem faixa reservada para dock fora da viewport');
check(ipadContentCss.includes('height:100dvh!important'),'área rolável ocupa viewport até a borda');
check(!baseIpadCss.includes('dock lateral em qualquer orientação'),'sidebar legada restringida a paisagem');
check(read('tests/e2e/app.spec.mjs').includes('Dock iPad [T] · geometria'),'teste visual do dock iPad presente');
check(legacyBlueCount<=19,'auditoria: azul legacy ficou restrito a semântica ('+legacyBlueCount+')');
const automationCss=readCss('assets/css/study-automation-v15-37-0.css');
const settingsControlCss=readCss('assets/css/settings-control-center-v15-38-0.css');
const v211Css=readCss('assets/css/v211-parity-v15-42.css');
check(!settingsControlCss.includes('rgba(109,130,152'),'auditoria: configurações sem azul estrutural legacy');
check(!v211Css.includes('--v211-blue'),'auditoria: token V211 azul não utilizado removido');
check(automationCss.includes('.automation-issues span.is-info{border-left-color:rgba(133,126,114,.52)}'),'Nanquim: informação neutra em papel-3 (azul legado removido)');
check(readCss('assets/css/button-glass-v15-36-15.css').includes('CONSOLIDADO V15.47 · NORMALIZAÇÃO DE BOTÕES'),'auditoria: button-depth consolidado');
check(readCss('assets/css/ipad-stage2-v01.css').includes('CONSOLIDADO V15.47 · STATUS DA NUVEM NO iPAD'),'auditoria: nuvem iPad consolidada');
check(readCss('assets/css/course-covers-fullbleed-v15-36-31.css').includes('CONSOLIDADO V15.47 · MAP CARD FOOT'),'auditoria: cleanup de map card consolidado');
check(read('assets/js/app/mobile-ux.js').includes('CONSOLIDADO V15.47 · REVIEW POLISH RESPONSIVO'),'auditoria: patch responsivo JS consolidado');
check(cssIn(index,`home-refine-v01.css?v=${expected}`),'index.html home-refine query');
check(cssIn(index,`map-accent-v01.css?v=${expected}`),'index.html map-accent query');
check(cssIn(index,`ui-chrome-refine-v01.css?v=${expected}`),'index.html ui-chrome query');
check(cssIn(index,`topographic-environment-v15-43.css?v=${expected}`),'index.html ambiente topográfico raster V15.43');
check(cssIn(index,`design-system-v15-42.css?v=${expected}`),'index.html Design System V15.42');
check(cssIn(index,`v211-parity-v15-42.css?v=${expected}`),'index.html paridade visual V211');
check(cssIn(index,`black-editorial-liquid-glass-v2.css?v=${expected}`),'index.html Black Editorial + Liquid Glass V2');
check(cssExists('assets/css/black-editorial-liquid-glass-v2.css'),'CSS Black Editorial + Liquid Glass V2 existe');
check(cssIn(index,`dynamic-liquid-glass-v2.css?v=${expected}`),'index.html Dynamic Liquid Glass V2 CSS');
check(index.includes(`assets/js/app/dynamic-liquid-glass-v2.js?v=${expected}`),'index.html Dynamic Liquid Glass V2 runtime');
check(cssExists('assets/css/dynamic-liquid-glass-v2.css'),'Dynamic Liquid Glass V2 CSS existe');
check(exists('assets/js/app/dynamic-liquid-glass-v2.js'),'Dynamic Liquid Glass V2 runtime existe');
const dynamicGlassCss=readCss('assets/css/dynamic-liquid-glass-v2.css');
const dynamicGlassJs=read('assets/js/app/dynamic-liquid-glass-v2.js');
check(dynamicGlassCss.includes('--mm-glass-rim-light'),'Dynamic Glass define refractive rim');
check(dynamicGlassCss.includes('--mm-motion-morph'),'Dynamic Glass define motion tokens');
check(!dynamicGlassCss.includes('.mm-active-lens'),'Dynamic Glass não contém lente móvel');
check(!dynamicGlassCss.includes('.mm-pressed')&&!dynamicGlassCss.includes('.mm-specular'),'CSS sem press optics/specular tracking');
check(!dynamicGlassJs.includes('ensureLens')&&!dynamicGlassJs.includes('pointermove')&&!dynamicGlassJs.includes('mm-pressed'),'runtime sem lente, ponteiro guiado ou lens compression');
check(!readCss('assets/css/nav-liquid-glass-v15-48-2.css').includes('--mm-topo-opacity'),'topografia sem override final de navegação');
check(!readCss('assets/css/master-refinement-v15-48-1.css').includes('--mm-topo-opacity:.86'),'topografia sem override de brilho legado');
check(dynamicGlassCss.includes('.mm-reduced-transparency'),'Dynamic Glass oferece fallback de transparência');
check(dynamicGlassCss.includes('--sans:"Archivo"')&&!dynamicGlassCss.includes('googleapis'),'Archivo local configurada como tipografia principal');
// Pranchas V15.49: módulos, CSS, fontes locais, PWA e orçamento de overrides próprio
const pranchaModules=['data','ui','home','courses','maps','simulations','progress','agenda','settings','boot'].map(n=>'assets/js/app/prancha-'+n+'.js');
for(const file of pranchaModules){check(exists(file),'Pranchas: '+file+' existe');check(index.includes(file+`?v=${expected}`),'Pranchas index: '+file);check(sw.includes(file+`?v=${expected}`),'Pranchas PWA: '+file)}
const pranchaIdx=pranchaModules.map(f=>index.indexOf(f));
check(pranchaIdx.every((v,i)=>v>0&&(i===0||v>pranchaIdx[i-1])),'Pranchas: ordem de carregamento data → ui → páginas → boot');
check(index.indexOf('dynamic-liquid-glass-v2.js')<pranchaIdx[0],'Pranchas: carregadas depois do runtime existente');
const pranchaCss=readCss('assets/css/design-system/prancha.css');
check(cssIn(sw,'assets/css/design-system/prancha.css?v='+expected),'Pranchas PWA: prancha.css');
for(const font of ['archivo-latin-wght-normal.woff2','anton-latin-400-normal.woff2','ibm-plex-mono-latin-400-normal.woff2','ibm-plex-mono-latin-500-normal.woff2']){check(exists('assets/fonts/'+font),'Fonte local '+font);check(readCss('assets/css/design-system/nanquim-typography.css').includes('../../fonts/'+font),'Fonte declarada '+font);check(sw.includes('./assets/fonts/'+font),'Fonte offline '+font)}
for(const lic of ['archivo','anton','ibm-plex-mono'])check(exists('assets/fonts/LICENSE-'+lic+'.txt'),'Licença OFL '+lic);
for(const token of ['#ECE6DA','#C3AA84','#B8614E','#8C9A6C'])check(pranchaCss.toLowerCase().includes(token.toLowerCase()),'Pranchas: token '+token);
const nqTokens=readCss('assets/css/design-system/nanquim-tokens.css');
for(const fam of ['"Archivo"','"IBM Plex Mono"','"Anton"'])check(nqTokens.includes(fam),'Família oficial '+fam+' nos tokens');
/* Conceitos V15.50: travas de fonte, tamanho e cor em todo o CSS ativo */
const activeCssAll=activeCssFiles.filter(exists).map(f=>[f,read(f)]);
const pxFont=activeCssAll.flatMap(([f,t])=>[...t.matchAll(/font-size\s*:\s*[\d.]+(?:px|rem)\b|\bfont\s*:[^;{}]*?\s[\d.]+px[\s/]/g)].map(m=>f+': '+m[0]));
check(pxFont.length===0,'Escala: nenhum font-size em px/rem fora dos tokens --fs ('+pxFont.slice(0,3).join(' | ')+')');
const badFamily=activeCssAll.filter(([f,t])=>/["']?(Inter|JetBrains Mono|Bahnschrift)["']?\s*[,;]/.test(t)||/fonts\.googleapis|fonts\.gstatic/.test(t)).map(([f])=>f);
check(badFamily.length===0,'Fontes: só Archivo, IBM Plex Mono e Anton locais ('+badFamily.join(', ')+')');
const PALETTE_OK=new Set(['000000','050505','0a0a09','111110','191817','242320','ece6da','b9b2a5','857e72','c3aa84','d8c59e','8a7756','b8614e','8c9a6c','c08a6e','a3ad8a','b98a8a','a294b4','8fa1b3','8fafa6','cfa35e','a8a29a','ece2d0','0b0a09','2b2824','080807']);
const offPalette=[];
for(const [f,t0] of activeCssAll){const t=t0.replace(/url\([^)]*\)/g,'').replace(/\/\*[\s\S]*?\*\//g,'');for(const m of t.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/g)){let h=m[1]?m[1].toLowerCase():[m[2],m[3],m[4]].map(n=>Number(n).toString(16).padStart(2,'0')).join('');if(h.length===3)h=[...h].map(c=>c+c).join('');if(!PALETTE_OK.has(h))offPalette.push(f.split('/').pop()+' '+h)}}
check(offPalette.length===0,'Paleta: toda cor do CSS ativo é Nanquim/Papel/Latão/Óxido/Musgo/pigmento ('+[...new Set(offPalette)].slice(0,5).join(', ')+')');
const stateJs=read('assets/js/app/state.js');
check(stateJs.includes("'Obras, Gestão e Orçamento':'terracota'")&&stateJs.includes("'Infraestrutura e Mobilidade Urbana':'ocre'")&&stateJs.includes("'Acessibilidade e Segurança':'ametista'"),'Pigmentos: categorias seguem o conceito');
check(read('assets/js/app/maps.js').includes('function applyMapCoverAccents(root=document){}'),'Pigmentos: cor do card vem da categoria, não da capa');
const pranchaImportant=(pranchaCss.match(/!important/g)||[]).length;
check(pranchaImportant<=21,'Pranchas: !important limitado à camada de integração ('+pranchaImportant+')');
check(!/fonts\.googleapis|fonts\.gstatic/.test(pranchaCss),'Pranchas: fontes sem dependência de rede');
const pranchaJs=pranchaModules.map(read).join('\n');
check(pranchaJs.includes("studyapp.prancha.off"),'Pranchas: interface clássica disponível');
check(pranchaJs.includes('buildStudyBackup')&&pranchaJs.includes('restoreStudyBackup')&&pranchaJs.includes('localPreferences'),'Pranchas: dados no backup e na sincronização');

const navGlassCss=readCss('assets/css/nav-liquid-glass-v15-48-2.css');
const mobileGlassCss=readCss('assets/css/mobile-first.css');
check(navGlassCss.includes('WebKit iPadOS/iOS'),'dock WebKit usa um único material');
check(navGlassCss.includes('overflow:visible!important'),'dock móvel sem clipping do compositor');
check(navGlassCss.includes('touch-action:manipulation'),'dock preserva captura de toque');
check(dynamicGlassJs.includes("q(':scope > .mm-scroll-edge',dock)?.remove()"),'runtime remove overlays do dock');
check(!dynamicGlassJs.includes('ensureScrollEdge(dock)'),'runtime não recria scroll-edge do dock');
check(!mobileGlassCss.includes('background:rgba(9,9,10,.985)!important'),'mobile não reativa tarja opaca');
check(!mobileGlassCss.includes('will-change:transform;'),'topbar sem composição GPU permanente');
check(read('assets/js/app/updates.js').includes('sw.js?v='+expected),'registro do Service Worker usa versão atual');
check(dynamicGlassJs.includes('requestAnimationFrame'),'runtime óptico usa requestAnimationFrame');
check(dynamicGlassJs.includes('IntersectionObserver'),'runtime limita Micro Glass à viewport');
check(dynamicGlassJs.includes('prefers-reduced-motion'),'runtime detecta Reduce Motion');
check(dynamicGlassJs.includes('prefers-reduced-transparency'),'runtime detecta Reduce Transparency');
check(!/getImageData|drawImage\s*\(/.test(dynamicGlassJs),'runtime não faz análise de pixel das capas');
const blackEditorialCss=readCss('assets/css/black-editorial-liquid-glass-v2.css');
check(blackEditorialCss.includes('--mm-bg-deep:#000000'),'Nanquim: --mm-bg-deep em nanquim puro');
check(blackEditorialCss.includes('--mm-glass-regular-bg:rgba(10,10,9,.60)'),'Vidro regular em grafite-1');
check(blackEditorialCss.includes('--mm-glass-dense-bg:rgba(10,10,9,.82)'),'Vidro denso em grafite-1');
check(blackEditorialCss.includes('--mm-glass-clear-bg:rgba(10,10,9,.24)'),'Vidro claro em grafite-1');
check(!(new RegExp('\\b(?:blue|navy|cyan|teal)\\b','i')).test(blackEditorialCss),'tema final sem nomes estruturais blue/navy/cyan/teal');
check(blackEditorialCss.includes('body :is(input,select,textarea):not([type="checkbox"]):not([type="radio"])'),'Black Editorial cobre formulários fora de .app');
check(blackEditorialCss.includes('background:#0a0a09!important'),'controles estruturais usam grafite-1');
for(const legacy of ['#101319','rgba(8,11,15','rgba(10,13,18','rgba(19,22,28','#a9c8e7','rgba(169,200,231','#030406','#06080b','rgba(39,50,64','rgba(54,59,66','rgba(8,14,22','#12151a']){
  check(!activeCssText.includes(legacy),'cromia estrutural fria removida: '+legacy);
}
const mmSaturates=[...blackEditorialCss.matchAll(/saturate\((\d+(?:\.\d+)?)%\)/g)].map(match=>Number(match[1]));
check(mmSaturates.length>0&&Math.max(...mmSaturates)<=135,'Liquid Glass saturate principal <= 135%');
check(blackEditorialCss.includes('@media(prefers-reduced-transparency:reduce)'),'fallback prefers-reduced-transparency');
check(blackEditorialCss.includes('@media(prefers-contrast:more)'),'fallback prefers-contrast');
check(blackEditorialCss.includes('@media(prefers-reduced-motion:reduce)'),'fallback prefers-reduced-motion');
check(blackEditorialCss.includes('@media(forced-colors:active)'),'fallback forced-colors');
check(cssExists('assets/css/topographic-environment-v15-43.css'),'CSS topográfico raster V15.43 existe');
check(exists('assets/ui/topographic-lines-v15-48-1.svg'),'SVG topográfico vetorial oficial existe');
/* V15.51: o body::before da topografia é pintado em definitivo pelo refino mestre V15.48.1 (as regras equivalentes
   da folha V15.43 eram sobrescritas e foram removidas). As travas leem as duas origens juntas. */
const topoRasterCss=readCss('assets/css/topographic-environment-v15-43.css')+'\n'+readCss('assets/css/master-refinement-v15-48-1.css');
const topoRasterStat=fs.statSync(path.join(ROOT,'assets/ui/topographic-lines-v15-48-1.svg'));
check(topoRasterStat.size>100000,'SVG topográfico original preserva a geometria vetorial em alta qualidade');
check(topoRasterCss.includes('topographic-lines-v15-48-1.svg'),'CSS topográfico referencia o SVG oficial V15.48.1');
check(/background-repeat\s*:\s*no-repeat/i.test(topoRasterCss),'topografia raster não repete');
check(!/background-repeat\s*:\s*repeat(?:\s|;|!)/i.test(topoRasterCss),'topografia raster não usa mosaico repeat');
check(!/(?:^|[;{])\s*(?:-webkit-)?filter\s*:\s*blur\s*\(/im.test(topoRasterCss),'background raster não aplica blur');
check(/:root\s*\{\s*--mm-topo-opacity:\.20\s*;/.test(topoRasterCss),'topografia desktop mantém .20');
check(/html\.is-ipad:not\(\.is-phone-layout\)\s*\{\s*--mm-topo-opacity:\.32\s*;/.test(topoRasterCss),'topografia iPad usa .32');
check(/html\.is-phone-layout\s*\{\s*--mm-topo-opacity:\.28\s*;/.test(topoRasterCss),'topografia smartphone usa .28');
check(/@media\(max-width:1180px\)\s*\{\s*:root\s*\{\s*--mm-topo-opacity:\.21\s*;/.test(topoRasterCss),'fallback histórico por largura preservado');
check(topoRasterCss.includes('transform:none;'),'transform de proteção do dock do iPad preservado');
check(!readCss('assets/css/nav-liquid-glass-v15-48-2.css').includes('--mm-topo-opacity'),'dock não sobrepõe topografia');
check(read('tests/e2e/app.spec.mjs').includes('Topografia [T+M] · intensidade'),'teste de visibilidade WebKit presente');
check(topoRasterCss.includes('opacity:.025!important'),'topografia reduz ruído em transparência/contraste');
check(topoRasterCss.includes('body:has(#reader.open)::before'),'leitor oculta o ambiente topográfico global');
check(!blackEditorialCss.includes('topographic-map-v15-42.svg'),'Black Editorial não reativa o SVG topográfico legado');
check(!blackEditorialCss.includes('--mm-topo-size'),'Black Editorial não redefine escala topográfica legada');
check(sw.includes('./assets/ui/topographic-lines-v15-48-1.svg'),'service worker pré-cacheia SVG topográfico oficial');
check(cssIn(sw,`./assets/css/topographic-environment-v15-43.css?v=${expected}`),'service worker pré-cacheia CSS topográfico raster');
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
// V211: preserve the authored inline standard and provide an offline-only reader fallback for imported maps.
const v211ThemeSource=readCss('assets/css/design-system/nanquim-study-v211.css').trim();
check(readerEntry.includes('mmNanquimReaderStyle')&&readerEntry.includes('mm-nanquim-(?:v211-standard|map-theme|reader-theme)')&&readerEntry.includes('mindmap-app'),'V211: reader offline skips duplicate inline theme');
const bundledV211Maps=(catalog.maps||[]).filter(map=>String(map.href||'').startsWith('cursos/porto-alegre/mapas/')&&/\.html$/i.test(map.href));
check(bundledV211Maps.length>=14,'V211: 14 estudos integrados disponíveis');
for(const map of bundledV211Maps){
 const file=cleanAsset(map.href);
 const html=read(file);
 check((html.match(/id="mm-nanquim-v211-standard"/g)||[]).length===1,'V211: tema offline único '+file);
 check(html.includes(v211ThemeSource),'V211: CSS canônico embutido '+file);
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

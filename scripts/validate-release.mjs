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
const moduleFiles=["assets/js/app/state.js","assets/js/app/core.js","assets/js/app/study-time.js","assets/js/app/router.js","assets/js/app/maps.js","assets/js/app/review-schedule.js","assets/js/app/courses.js","assets/js/app/search.js","assets/js/app/map-library.js","assets/js/app/progress.js","assets/js/app/reader.js","assets/js/app/sync.js","assets/js/app/diagnostics.js","assets/js/app/backup.js","assets/js/app/restore-points.js","assets/js/app/ui.js","assets/js/app/simulations.js","assets/js/app/study-coach.js","assets/js/app/study-dashboard.js","assets/js/app/study-planner.js","assets/js/app/mobile-ux.js","assets/js/app/updates.js"];
for(const file of moduleFiles)check(exists(file),file+' existe');
const stateModule=read('assets/js/app/state.js');
const allJs=[...moduleFiles.map(read),read('assets/js/app.js')].join('\n');
const index=read('index.html');
const sw=read('sw.js');
check(stateModule.includes(`APP_VERSION='${expected}'`)||stateModule.includes(`APP_VERSION = '${expected}'`),'APP_VERSION = '+expected);
check(expectedLabel===`V${expected}-G`||expectedLabel===`V${expected}-D`||expectedLabel===`V${expected}-T`||expectedLabel===`V${expected}-M`,'version.json label coerente com '+expected);
check(stateModule.includes(`APP_VERSION_LABEL='${expectedLabel}'`)||stateModule.includes(`APP_VERSION_LABEL = '${expectedLabel}'`),'APP_VERSION_LABEL = '+expectedLabel);
check(index.includes(`id="appInstalledVersion">${expectedLabel}</strong>`),'index versão instalada = '+expectedLabel);
check(index.includes(`id="whatsNewVersion">${expectedLabel}</h2>`),'index novidades = '+expectedLabel);
check(index.includes(`app.js?v=${expected}`),'index.html app.js query');
for(const file of moduleFiles)check(index.includes(file+`?v=${expected}`),'index module '+file);
check(index.includes(`app.css?v=${expected}`),'index.html app.css query');
check(index.includes(`study-planner.css?v=${expected}`),'index.html study-planner.css query');
check(index.includes(`mobile-first.css?v=${expected}`),'index.html mobile-first.css query');
check(index.includes(`home-refine-v01.css?v=${expected}`),'index.html home-refine query');
check(index.includes(`map-accent-v01.css?v=${expected}`),'index.html map-accent query');
check(allJs.includes(`sw.js?v=${expected}`),'registro sw.js query');

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

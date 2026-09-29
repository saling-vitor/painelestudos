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
const app=read('assets/js/app.js');
const index=read('index.html');
const sw=read('sw.js');
check(app.includes(`APP_VERSION='${expected}'`)||app.includes(`APP_VERSION = '${expected}'`),'APP_VERSION = '+expected);
check(index.includes(`app.js?v=${expected}`),'index.html app.js query');
check(index.includes(`app.css?v=${expected}`),'index.html app.css query');
check(app.includes(`sw.js?v=${expected}`),'registro sw.js query');
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

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const write=(file,content)=>fs.writeFileSync(path.join(ROOT,file),content);
const json=file=>JSON.parse(read(file));

const versionFile='version.json';
const stateFile='assets/js/app/state.js';
const indexFile='index.html';
const updatesFile='assets/js/app/updates.js';
const swFile='sw.js';
const iconSettingsFile='assets/js/app-icon-settings-v15-36-2.js';

const meta=json(versionFile);
const automation=meta.automation||{};
const sourceVersion=String(meta.version||'').trim();
if(!/^\d+\.\d+\.\d+$/.test(sourceVersion))throw new Error('version.json.version precisa usar X.Y.Z');

const sourceParts=sourceVersion.split('.').map(Number);
const series=String(automation.series||sourceParts.slice(0,2).join('.')).trim();
if(!/^\d+\.\d+$/.test(series))throw new Error('version.json.automation.series precisa usar X.Y');

const labelMatch=String(meta.label||'').match(/-(G|D|T|M|D\+T|T\+M|D\+M)$/i);
const channel=String(automation.channel||labelMatch?.[1]||'G').toUpperCase();
const runNumber=Number(process.env.GITHUB_RUN_NUMBER||0);
const runBase=Number(automation.runBase||0);
const autoEnabled=automation.enabled!==false&&runNumber>0&&runBase>=0;

let releaseVersion=sourceVersion;
let sequence=null;
if(autoEnabled){
  // Mantém o version.json da main como versão única; automatiza apenas a
  // sincronização dos identificadores, metadados e caches do artefato.
  sequence=sourceParts[2];
  releaseVersion=sourceVersion;
}
const releaseLabel='V'+releaseVersion+'-'+channel;

function gitValue(args,fallback=''){
  try{return execFileSync('git',args,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()||fallback}catch{return fallback}
}
const commit=String(process.env.GITHUB_SHA||gitValue(['rev-parse','HEAD'])).slice(0,12);
const releasedAt=gitValue(['show','-s','--format=%cI','HEAD'],meta.releasedAt||new Date().toISOString());

meta.version=releaseVersion;
meta.label=releaseLabel;
meta.releasedAt=releasedAt;
if(autoEnabled){
  meta.build={
    automatic:true,
    runNumber,
    sequence,
    commit
  };
}else{
  delete meta.build;
}
write(versionFile,JSON.stringify(meta,null,2)+'\n');

const replaceThreePartQuery=(content)=>content.replace(/([?&]v=)\d+\.\d+\.\d+/g,'$1'+releaseVersion);

let state=read(stateFile);
state=state.replace(/const APP_VERSION='[^']+',APP_VERSION_LABEL='[^']+';/,
  "const APP_VERSION='"+releaseVersion+"',APP_VERSION_LABEL='"+releaseLabel+"';");
if(!state.includes("APP_VERSION='"+releaseVersion+"'")||!state.includes("APP_VERSION_LABEL='"+releaseLabel+"'")){
  throw new Error('Falha ao sincronizar APP_VERSION em '+stateFile);
}
write(stateFile,state);

let index=replaceThreePartQuery(read(indexFile));
index=index.replace(/(id="appInstalledVersion">)[^<]+(<\/strong>)/,'$1'+releaseLabel+'$2');
index=index.replace(/(id="whatsNewVersion">)[^<]+(<\/h2>)/,'$1'+releaseLabel+'$2');
if(!index.includes('id="appInstalledVersion">'+releaseLabel+'</strong>'))throw new Error('Falha ao sincronizar versão instalada no index');
if(!index.includes('app.js?v='+releaseVersion))throw new Error('Falha ao sincronizar cache-busting do index');
write(indexFile,index);

let updates=replaceThreePartQuery(read(updatesFile));
updates=updates.replace(/sw\.js\?v=[0-9.]+/g,'sw.js?v='+releaseVersion);
if(!updates.includes("register('sw.js?v="+releaseVersion+"'"))throw new Error('Falha ao sincronizar registro do service worker');
write(updatesFile,updates);

let sw=replaceThreePartQuery(read(swFile));
const swCache='study-pwa-v'+releaseVersion.replaceAll('.','-')+'-release';
sw=sw.replace(/^\/\/[^\n]*\n/,'// '+releaseLabel+' · release automática do sistema\n');
sw=sw.replace(/const V='study-pwa-v[^']+';/,"const V='"+swCache+"';");
if(!sw.includes(swCache))throw new Error('Falha ao sincronizar cache do service worker');
write(swFile,sw);

// Mantém ícones Claro/Escuro/Automático e manifests no mesmo cache-bust da release.
let iconSettings=replaceThreePartQuery(read(iconSettingsFile));
write(iconSettingsFile,iconSettings);

console.log('✓ Release sincronizada: '+releaseLabel+(autoEnabled?' · run '+runNumber+' · '+commit:' · modo local'));

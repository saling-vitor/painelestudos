'use strict';
function safeBackupJson(value,fallback){try{return JSON.parse(JSON.stringify(value))}catch{return fallback}}
function buildStudyBackup(){const mapStates={},mapNotes={},modified={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)||'';if(key.startsWith('mindmap_state::')){mapStates[key]=localStorage.getItem(key);const mk='studyapp.modified::'+key;if(localStorage.getItem(mk))modified[key]=localStorage.getItem(mk)}else if(key.startsWith('mindmap_notes::')){mapNotes[key]=localStorage.getItem(key);const mk='studyapp.modified::'+key;if(localStorage.getItem(mk))modified[key]=localStorage.getItem(mk)}}return{type:'meus-mapas-backup',schemaVersion:1,createdAt:new Date().toISOString(),appVersion:APP_VERSION,data:{mapStates,mapNotes,modified,favorites:[...favs],mapActivity:safeBackupJson(state.mapActivity,{}),simulationActivity:safeBackupJson(state.simActivity,{}),simulationAttempts:safeBackupJson(state.simAttempts,{}),simulationOverrides:safeBackupJson(state.simulationOverrides||{},{}),examStatuses:safeBackupJson(readExamStatuses(),{}),studyTime:safeBackupJson(readStudyTime(),{}),studyDashboard:safeBackupJson(window.StudyDashboard?.exportData?.()||{},{}),studyPlanner:safeBackupJson(window.StudyPlanner?.exportData?.()||{},{}),reviewSchedule:safeBackupJson(readReviewSchedule(),{}),preferences:{mapLayout:state.mapLayout,prCoursesLayout:localStorage.getItem('studyapp.prCoursesLayout')||'capas',allMapsSort:state.allMapsSort||'az',lastMap:localStorage.getItem('studyapp.lastMap')||'',mapContentSources:readMapContentSources()}}}}
function downloadStudyBackup(){const backup=buildStudyBackup(),blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a'),d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');a.href=url;a.download='meus-mapas-backup-'+date+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);try{localStorage.setItem('studyapp.lastBackupRequestedAt',backup.createdAt)}catch{}window.SettingsControlCenter?.render?.();toast('Download do backup solicitado. Confirme o arquivo salvo na pasta Downloads.')}
function validateStudyBackup(backup){
  const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  if(!record(backup)||backup.type!=='meus-mapas-backup'||Number(backup.schemaVersion)!==1||!record(backup.data))return false;
  const data=backup.data;
  // O esquema V1 aceita campos opcionais de versões anteriores, mas nunca
  // arrays ou valores primitivos onde a restauração espera um mapa de registros.
  const groups=['mapStates','mapNotes','modified','mapActivity','simulationActivity',
    'simulationAttempts','simulationOverrides','examStatuses','studyTime',
    'studyDashboard','studyPlanner','reviewSchedule','preferences'];
  if(!groups.some(key=>Object.prototype.hasOwnProperty.call(data,key)))return false;
  for(const key of groups)if(data[key]!==undefined&&!record(data[key]))return false;
  if(data.favorites!==undefined&&(!Array.isArray(data.favorites)||
    !data.favorites.every(item=>typeof item==='string')))return false;
  for(const key of ['mapStates','mapNotes','modified']){
    if(data[key]&&Object.values(data[key]).some(value=>typeof value!=='string'))return false;
  }
  if(data.preferences?.mapContentSources!==undefined&&!record(data.preferences.mapContentSources))return false;
  return true;
}
function mergeTimestampObject(current={},incoming={},timestampField=''){const out={...current};for(const[k,v]of Object.entries(incoming||{})){if(!timestampField){const incomingTs=activityTimestamp(v),currentTs=activityTimestamp(out[k]);if(incomingTs>currentTs)out[k]=v;continue}const incomingTs=activityTimestamp(v?.[timestampField]),currentTs=activityTimestamp(out[k]?.[timestampField]);if(incomingTs>currentTs)out[k]=v}return out}
// Backups são arquivos externos: só podem escrever estados/notas dos mapas.
// Impedir que uma chave arbitrária dentro do JSON sobrescreva configurações,
// autenticação, cache ou qualquer namespace diferente de mindmap_*.
function backupMapEntries(group,prefix){
  if(!group||typeof group!=='object'||Array.isArray(group))return[];
  return Object.entries(group).filter(([key,value])=>key.startsWith(prefix)&&key.length>prefix.length&&typeof value==='string');
}
function applyBackupStorageGroup(group={},modified={},prefix='mindmap_state::'){
  for(const[key,value]of backupMapEntries(group,prefix)){
    const current=localStorage.getItem(key),currentTs=activityTimestamp(localStorage.getItem('studyapp.modified::'+key)),
      incomingTs=activityTimestamp(modified?.[key]);
    // Em mesclagem, carimbo ausente NÃO torna o backup mais novo.
    // Dois registros sem carimbo são ambíguos: preservar o progresso local.
    if(current===null||(incomingTs>0&&incomingTs>=currentTs)){
      localStorage.setItem(key,value);
      if(incomingTs)localStorage.setItem('studyapp.modified::'+key,modified[key]);
    }
  }
}
function replaceBackupStorageGroups(data){
  const remove=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)||'';
    if(/^mindmap_(state|notes)::/.test(key)||/^studyapp\.modified::mindmap_(state|notes)::/.test(key))remove.push(key);
  }
  remove.forEach(key=>localStorage.removeItem(key));
  const entries=[...backupMapEntries(data.mapStates,'mindmap_state::'),...backupMapEntries(data.mapNotes,'mindmap_notes::')];
  for(const[key,value]of entries){
    localStorage.setItem(key,value);
    const stamp=data.modified?.[key];
    if(typeof stamp==='string'&&activityTimestamp(stamp))localStorage.setItem('studyapp.modified::'+key,stamp);
  }
}
function rebuildSimulationResults(){state.simResults={};for(const[key,list]of Object.entries(state.simAttempts||{}))if(Array.isArray(list)&&list[0])state.simResults[key]={...list[0]};localStorage.setItem('studyapp.simResults',JSON.stringify(state.simResults))}
async function restoreStudyBackup(backup,options={}){if(!validateStudyBackup(backup))throw new Error('Arquivo de backup inválido.');const data=backup.data||{},replace=options.replace===true;if(replace)replaceBackupStorageGroups(data);else{applyBackupStorageGroup(data.mapStates,data.modified,'mindmap_state::');applyBackupStorageGroup(data.mapNotes,data.modified,'mindmap_notes::')}if(replace)favs.clear();for(const id of data.favorites||[])favs.add(id);localStorage.setItem('studyapp.favs',JSON.stringify([...favs]));state.mapActivity=replace?safeBackupJson(data.mapActivity,{}):mergeTimestampObject(state.mapActivity,data.mapActivity);localStorage.setItem('studyapp.mapActivity',JSON.stringify(state.mapActivity));state.simActivity=replace?safeBackupJson(data.simulationActivity,{}):mergeTimestampObject(state.simActivity,data.simulationActivity,'lastOpenedAt');localStorage.setItem('studyapp.simActivity',JSON.stringify(state.simActivity));state.simAttempts=replace?safeBackupJson(data.simulationAttempts,{}):mergeSimulationAttempts(state.simAttempts,data.simulationAttempts);localStorage.setItem('studyapp.simAttempts',JSON.stringify(state.simAttempts));rebuildSimulationResults();
if(data.simulationOverrides&&typeof data.simulationOverrides==='object'&&!Array.isArray(data.simulationOverrides)){
  state.simulationOverrides=replace?safeBackupJson(data.simulationOverrides,{}):
    mergePreferenceRecordMap(state.simulationOverrides||{},data.simulationOverrides);
  localStorage.setItem('studyapp.simulationOverrides',JSON.stringify(state.simulationOverrides));
}
if(data.examStatuses&&typeof data.examStatuses==='object'&&!Array.isArray(data.examStatuses)){
  const merged=replace?safeBackupJson(data.examStatuses,{}):
    mergePreferenceRecordMap(readExamStatuses(),data.examStatuses);
  localStorage.setItem(examStatusesStorageKey(),JSON.stringify(merged));
}
if(replace)writeStudyTime(data.studyTime||{});else if(data.studyTime)mergeStudyTime(data.studyTime);if(replace)mergeReviewSchedule(data.reviewSchedule||{},true);else if(data.reviewSchedule)mergeReviewSchedule(data.reviewSchedule,false);if(data.studyDashboard&&window.StudyDashboard?.importData)window.StudyDashboard.importData(data.studyDashboard,{merge:!replace,silent:true});if(data.studyPlanner&&window.StudyPlanner?.importData)window.StudyPlanner.importData(data.studyPlanner,{mergeData:!replace,silent:true});const prefs=data.preferences||{};if(replace){if(prefs.lastMap)localStorage.setItem('studyapp.lastMap',prefs.lastMap);else localStorage.removeItem('studyapp.lastMap')}else if(!localStorage.getItem('studyapp.lastMap')&&prefs.lastMap)localStorage.setItem('studyapp.lastMap',prefs.lastMap);if(prefs.mapLayout==='grid'||prefs.mapLayout==='list'){state.mapLayout=prefs.mapLayout;localStorage.setItem('studyapp.mapLayout',prefs.mapLayout)}if(prefs.prCoursesLayout==='lista'||prefs.prCoursesLayout==='capas')localStorage.setItem('studyapp.prCoursesLayout',prefs.prCoursesLayout);
if(['az','za','recent','opened','progress-desc','progress-asc','topics-desc','topics-asc'].includes(prefs.allMapsSort)){
  state.allMapsSort=prefs.allMapsSort;localStorage.setItem('studyapp.allMapsSort',prefs.allMapsSort);
}if(replace)writeMapContentSources(prefs.mapContentSources||{});else if(prefs.mapContentSources&&typeof prefs.mapContentSources==='object')writeMapContentSources({...prefs.mapContentSources,...readMapContentSources()});touchPreferences();refreshActiveView();updateCloudUI();if(StudyCloud.session())syncNow(true);if(!options.silent)toast(replace?'Ponto restaurado.':'Backup restaurado e mesclado.');return true}
async function prepareStudyBackupRestore(file){if(!file)return;let backup;try{backup=JSON.parse(await file.text())}catch{throw new Error('O arquivo selecionado não é um JSON válido.')}if(!validateStudyBackup(backup))throw new Error('Este arquivo não é um backup válido do Meus Mapas.');askConfirm('Restaurar backup?','Este backup substituirá/mesclará dados locais deste aparelho. Valores locais mais novos serão preservados.',async()=>{await createRestorePoint('before-backup-restore','Antes de restaurar backup');await restoreStudyBackup(backup)},'Restaurar backup')}

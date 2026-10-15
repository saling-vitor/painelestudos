(()=>{'use strict';const CFG=()=>window.STUDY_APP_CONFIG||{};const AUTH_KEY='studyapp.auth';const DEVICE_KEY='studyapp.device';const QUEUE_KEY='studyapp.syncQueue';const PRIVATE_CACHE='study-private-v11';const j=(v,f=null)=>{try{return JSON.parse(v)||f}catch{return f}};const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;const isNetworkError=e=>!online()||e instanceof TypeError||/failed to fetch|networkerror|load failed|network request failed|internet connection/i.test(String(e?.message||e||''));const pending=()=>{const a=j(localStorage.getItem(QUEUE_KEY),[]);return Array.isArray(a)?a:[]};const emitQueue=()=>{try{window.dispatchEvent(new CustomEvent('studycloud:queuechange',{detail:{pending:pending().length}}))}catch{}};const savePending=a=>{localStorage.setItem(QUEUE_KEY,JSON.stringify(a));emitQueue()};const markPending=key=>{if(!key)return;const a=pending(),i=a.findIndex(x=>x.key===key),item={key,queued_at:new Date().toISOString()};if(i>=0)a[i]=item;else a.push(item);savePending(a)};const clearPending=key=>savePending(pending().filter(x=>x.key!==key));const pendingCount=()=>pending().length;const same=(a,b)=>{try{return JSON.stringify(a)===JSON.stringify(b)}catch{return false}};const device=()=>{let d=localStorage.getItem(DEVICE_KEY);if(!d){d=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random());localStorage.setItem(DEVICE_KEY,d)}return d};const session=()=>j(localStorage.getItem(AUTH_KEY),null);const redirect=()=>location.origin+location.pathname+'#settings';const recoveryRedirect=()=>location.origin+location.pathname+'?password-recovery=1';const normalizeSession=data=>{if(data?.access_token&&!data.expires_at&&data.expires_in)data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in);return data};const configured=()=>!!(CFG().supabaseUrl&&CFG().supabaseAnonKey);function hdr(extra={},token=true){const h={'apikey':CFG().supabaseAnonKey,'Content-Type':'application/json',...extra};const s=session();if(token&&s?.access_token)h.Authorization='Bearer '+s.access_token;return h}async function api(path,opt={}){if(!configured())throw new Error('Nuvem não configurada');const r=await fetch(CFG().supabaseUrl+path,opt);let data=null;const t=await r.text();if(t)try{data=JSON.parse(t)}catch{data=t}if(!r.ok)throw new Error(data?.msg||data?.message||data?.error_description||String(data||r.status));return data}async function signIn(email,password){const data=normalizeSession(await api('/auth/v1/token?grant_type=password',{method:'POST',headers:hdr({},false),body:JSON.stringify({email,password})}));localStorage.setItem(AUTH_KEY,JSON.stringify(data));return data}async function signUp(email,password){const data=normalizeSession(await api('/auth/v1/signup?redirect_to='+encodeURIComponent(redirect()),{method:'POST',headers:hdr({},false),body:JSON.stringify({email,password})}));if(data?.access_token)localStorage.setItem(AUTH_KEY,JSON.stringify(data));return data}async function requestPasswordReset(email){email=String(email||'').trim();if(!email)throw new Error('Informe o e-mail da conta.');await api('/auth/v1/recover?redirect_to='+encodeURIComponent(recoveryRedirect()),{method:'POST',headers:hdr({},false),body:JSON.stringify({email})});return true}function consumeAuthRedirect(){const raw=String(location.hash||'').replace(/^#/,'').trim();if(!raw)return null;const params=new URLSearchParams(raw),accessToken=params.get('access_token');if(!accessToken)return null;const type=params.get('type')||'',expiresIn=Number(params.get('expires_in'))||3600,sessionData=normalizeSession({access_token:accessToken,refresh_token:params.get('refresh_token')||'',token_type:params.get('token_type')||'bearer',expires_in:expiresIn});localStorage.setItem(AUTH_KEY,JSON.stringify(sessionData));if(type==='recovery')sessionStorage.setItem('studyapp.passwordRecovery','1');history.replaceState(null,'',location.pathname+'#settings');return{type,session:sessionData}}function passwordRecoveryPending(){return sessionStorage.getItem('studyapp.passwordRecovery')==='1'}function clearPasswordRecovery(){sessionStorage.removeItem('studyapp.passwordRecovery')}async function updatePassword(password){password=String(password||'');if(password.length<8)throw new Error('A nova senha deve ter pelo menos 8 caracteres.');await ensure();const current=session();if(!current?.access_token)throw new Error('O link de recuperação expirou. Solicite um novo e-mail.');return api('/auth/v1/user',{method:'PUT',headers:hdr(),body:JSON.stringify({password})})}async function signOut(){localStorage.removeItem(AUTH_KEY);clearPasswordRecovery()}async function me(){await ensure();const s=session();if(!s?.access_token)return null;try{return await api('/auth/v1/user',{headers:hdr()})}catch{return null}}async function refresh(){const s=session();if(!s?.refresh_token)return null;const data=normalizeSession(await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:hdr({},false),body:JSON.stringify({refresh_token:s.refresh_token})}));localStorage.setItem(AUTH_KEY,JSON.stringify(data));return data}async function ensure(){let s=session();if(!s)return null;const exp=(s.expires_at||0)*1000;if(exp&&exp-Date.now()<60000)try{s=await refresh()}catch{}return s}async function rows(table,query=''){await ensure();return api('/rest/v1/'+table+(query?'?'+query:''),{headers:hdr({'Accept':'application/json'})})}async function upsert(table,obj,onConflict=''){await ensure();return api('/rest/v1/'+table+(onConflict?'?on_conflict='+encodeURIComponent(onConflict):''),{method:'POST',headers:hdr({'Prefer':'resolution=merge-duplicates,return=representation'}),body:JSON.stringify(obj)})}async function insert(table,obj){await ensure();return api('/rest/v1/'+table,{method:'POST',headers:hdr({'Prefer':'return=representation'}),body:JSON.stringify(obj)})}async function patch(table,query,obj){await ensure();return api('/rest/v1/'+table+'?'+query,{method:'PATCH',headers:hdr({'Prefer':'return=representation'}),body:JSON.stringify(obj)})}async function removeRows(table,query){await ensure();return api('/rest/v1/'+table+'?'+query,{method:'DELETE',headers:hdr({'Prefer':'return=representation'})})}// Mapas HTML grandes sao armazenados em partes privadas no mesmo bucket.
// Supabase Free limita cada objeto a 50 MB; o HTML original e remontado sem perdas.
const MAP_PARTS_TAG='<!-- MEUS_MAPAS_PARTS_V1 -->\n';
const MAP_SPLIT_THRESHOLD=32*1024*1024;
const MAP_PART_BYTES=8*1024*1024;
const MAP_MANIFEST_MAX=128*1024;
function storageHeaders(type='text/html',upsertFile=true){
 const s=session();
 return{apikey:CFG().supabaseAnonKey,Authorization:'Bearer '+s.access_token,'Content-Type':type,'x-upsert':String(upsertFile)};
}
function objectUrl(path,authenticated=false){
 return CFG().supabaseUrl+'/storage/v1/object/'+(authenticated?'authenticated/':'')+CFG().bucket+'/'+path;
}
async function uploadRaw(path,blob,contentType='text/html',upsertFile=true){
 const r=await fetch(objectUrl(path),{method:'POST',headers:storageHeaders(contentType,upsertFile),body:blob});
 const t=await r.text();
 if(!r.ok)throw new Error(t||'Falha ao enviar arquivo ('+r.status+').');
 return t?j(t,t):true;
}
async function objectResponse(path,method='GET'){
 const auth=session();
 const r=await fetch(objectUrl(path,true),{method,headers:{apikey:CFG().supabaseAnonKey,Authorization:'Bearer '+auth.access_token}});
 if(!r.ok)throw new Error(method==='HEAD'?'Arquivo nao disponivel':(await r.text())||String(r.status));
 return r;
}
function unpackManifest(text,path){
 if(!text.startsWith(MAP_PARTS_TAG))return null;
 let data;
 try{data=JSON.parse(text.slice(MAP_PARTS_TAG.length))}catch{throw new Error('Manifesto do mapa esta corrompido.')}
 const prefix=path+'.parts/';
 if(data?.schema!==1||!Array.isArray(data.parts)||!data.parts.length||!Number.isSafeInteger(data.bytes)||data.bytes<0||data.parts.length>5000||data.parts.some(p=>typeof p!=='string'||!p.startsWith(prefix)||!/^[-\w./]+$/.test(p)||p.includes('..'))){
  throw new Error('Manifesto das partes do mapa e invalido.');
 }
 return data;
}
async function tinyManifest(path){
 if(!/\.html?$/i.test(path))return null;
 try{
  const r=await objectResponse(path,'HEAD');
  const bytes=Number(r.headers.get('content-length'));
  if(!Number.isFinite(bytes)||bytes<1||bytes>MAP_MANIFEST_MAX)return null;
  const text=await (await objectResponse(path)).text();
  return text.length<MAP_MANIFEST_MAX?unpackManifest(text,path):null;
 }catch{return null;}
}
async function deleteObjectPaths(paths){
 const list=[...new Set((paths||[]).filter(Boolean))];
 if(!list.length)return[];
 // Supabase Storage aceita ate 1000 chaves por requisicao de remocao.
 let result=[];
 for(let i=0;i<list.length;i+=200){
  const r=await fetch(CFG().supabaseUrl+'/storage/v1/object/'+CFG().bucket,{method:'DELETE',headers:storageHeaders('application/json'),body:JSON.stringify({prefixes:list.slice(i,i+200)})});
  const t=await r.text();
  if(!r.ok)throw new Error(t||String(r.status));
  result.push(t?j(t,t):true);
 }
 return result;
}
async function removeFiles(paths){
 await ensure();
 const list=[...new Set((paths||[]).filter(Boolean))];
 if(!list.length)return[];
 const expanded=[...list];
 for(const path of list){
  const manifest=await tinyManifest(path);
  if(manifest)expanded.push(...manifest.parts);
 }
 return deleteObjectPaths(expanded);
}
async function upload(path,blob,contentType='text/html',upsertFile=true){
 await ensure();
 if(!blob||typeof blob.size!=='number')blob=new Blob([blob],{type:contentType});
 const eligible=/^text\/html(?:;|$)/i.test(contentType)&&/\.html?$/i.test(path);
 const previous=eligible&&upsertFile?await tinyManifest(path):null;
 if(!eligible||blob.size<=MAP_SPLIT_THRESHOLD){
  const result=await uploadRaw(path,blob,contentType,upsertFile);
  if(previous)await deleteObjectPaths(previous.parts).catch(e=>console.warn('Limpeza das partes anteriores:',e));
  return result;
 }
 // Cada parte usa um caminho unico: nenhuma atualizacao sobrescreve dados anteriores
 // antes de o manifesto novo ser salvo com sucesso no caminho original.
 const nonce=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)).replace(/[^a-zA-Z0-9-]/g,'');
 const prefix=path+'.parts/'+nonce+'/';
 const parts=[];
 let manifestAttempted=false;
 try{
  for(let offset=0;offset<blob.size;offset+=MAP_PART_BYTES){
   const item=prefix+String(parts.length).padStart(5,'0')+'.bin';
   await uploadRaw(item,blob.slice(offset,Math.min(blob.size,offset+MAP_PART_BYTES)),'application/octet-stream',false);
   parts.push(item);
  }
  const manifest=MAP_PARTS_TAG+JSON.stringify({schema:1,bytes:blob.size,parts});
  manifestAttempted=true;
  const result=await uploadRaw(path,new Blob([manifest],{type:'text/html'}),'text/html',upsertFile);
  if(previous)await deleteObjectPaths(previous.parts).catch(e=>console.warn('Limpeza das partes anteriores:',e));
  return result;
 }catch(e){
  // Se o servidor gravou o manifesto mas a resposta caiu, apagar as partes
  // corromperia o mapa. Manter partes nesse caso de resultado ambiguo.
  if(!manifestAttempted)await deleteObjectPaths(parts).catch(cleanupError=>console.warn('Falha ao limpar envio incompleto:',cleanupError));
  throw e;
 }
}
async function download(path){
 await ensure();
 const text=await (await objectResponse(path)).text();
 const manifest=unpackManifest(text,path);
 if(!manifest)return text; // Compatibilidade integral com mapas HTML legados.
 const blobs=[];
 // Limitar downloads simultaneos para evitar picos de RAM no iPad/iPhone.
 for(let i=0;i<manifest.parts.length;i+=3){
  const batch=manifest.parts.slice(i,i+3);
  const loaded=await Promise.all(batch.map(async part=>(await objectResponse(part)).blob()));
  blobs.push(...loaded);
 }
 const restored=new Blob(blobs,{type:'text/html;charset=utf-8'});
 if(restored.size!==manifest.bytes)throw new Error('Mapa incompleto na nuvem: tamanho das partes diferente do original.');
 return restored.text();
}
async function downloadBlob(path){await ensure();const s=session();const r=await fetch(CFG().supabaseUrl+'/storage/v1/object/authenticated/'+CFG().bucket+'/'+path,{headers:{apikey:CFG().supabaseAnonKey,Authorization:'Bearer '+s.access_token}});if(!r.ok)throw new Error(await r.text());return r.blob()}async function resolveStorageKey(key,cloud){const s=await ensure();if(!s?.user?.id||!/^mindmap_(state|notes)::/.test(key))return false;const raw=localStorage.getItem(key);if(raw==null){if(!cloud){clearPending(key);return false}const cloudTs=Date.parse(cloud.client_updated_at||cloud.updated_at||0)||Date.now();localStorage.setItem(key,JSON.stringify(cloud.payload||{}));localStorage.setItem('studyapp.modified::'+key,new Date(cloudTs).toISOString());clearPending(key);return'restored'}const localPayload=j(raw,{}),cloudPayload=cloud?.payload||{},localStamp=localStorage.getItem('studyapp.modified::'+key),localTs=Date.parse(localStamp||0)||0,cloudTs=Date.parse(cloud?.client_updated_at||cloud?.updated_at||0)||0;if(!cloud){const stamp=localStamp||new Date().toISOString();await upsert('study_snapshots',{user_id:s.user.id,storage_key:key,payload:localPayload,client_updated_at:stamp,device_id:device(),updated_at:new Date().toISOString()},'user_id,storage_key');clearPending(key);return'uploaded'}const equal=same(localPayload,cloudPayload);if(equal){if(cloudTs>localTs)localStorage.setItem('studyapp.modified::'+key,new Date(cloudTs).toISOString());clearPending(key);return'same'}if(localTs>=cloudTs){const stamp=localStamp||new Date().toISOString();await upsert('study_snapshots',{user_id:s.user.id,storage_key:key,payload:localPayload,client_updated_at:stamp,device_id:device(),updated_at:new Date().toISOString()},'user_id,storage_key');clearPending(key);return'uploaded'}localStorage.setItem(key,JSON.stringify(cloudPayload));localStorage.setItem('studyapp.modified::'+key,new Date(cloudTs||Date.now()).toISOString());clearPending(key);return'restored'}async function syncStorageKey(key){const s=await ensure();if(!s?.user?.id||!/^mindmap_(state|notes)::/.test(key))return false;if(localStorage.getItem(key)==null)return false;if(!online()){markPending(key);return'queued'}try{const q='user_id=eq.'+encodeURIComponent(s.user.id)+'&storage_key=eq.'+encodeURIComponent(key)+'&select=*',data=await rows('study_snapshots',q);return await resolveStorageKey(key,data?.[0]||null)}catch(e){if(isNetworkError(e)){markPending(key);return'queued'}throw e}}async function restoreStorageKey(key){const s=await ensure();if(!s?.user?.id)return false;if(!online())return localStorage.getItem(key)!=null?'local':false;try{const q='user_id=eq.'+encodeURIComponent(s.user.id)+'&storage_key=eq.'+encodeURIComponent(key)+'&select=*',data=await rows('study_snapshots',q);return await resolveStorageKey(key,data?.[0]||null)}catch(e){if(isNetworkError(e)){if(localStorage.getItem(key)!=null)return'local';return false}throw e}}async function reconcileAll(){const s=await ensure();if(!configured()||!s?.user?.id)return{uploaded:0,restored:0,merged:0,total:0,queued:pendingCount(),offline:!online()};const localKeys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^mindmap_(state|notes)::/.test(k||''))localKeys.push(k)}if(!online())return{uploaded:0,restored:0,merged:0,total:localKeys.length,queued:pendingCount(),offline:true};let cloudRows;try{cloudRows=await rows('study_snapshots','user_id=eq.'+encodeURIComponent(s.user.id)+'&select=*')}catch(e){if(isNetworkError(e))return{uploaded:0,restored:0,merged:0,total:localKeys.length,queued:pendingCount(),offline:true};throw e}const cloud=new Map((cloudRows||[]).filter(r=>/^mindmap_(state|notes)::/.test(r.storage_key||'')).map(r=>[r.storage_key,r])),keys=new Set([...cloud.keys(),...localKeys]);let uploaded=0,restored=0,merged=0;for(const k of keys){try{const r=await resolveStorageKey(k,cloud.get(k)||null);if(r==='uploaded')uploaded++;else if(r==='restored')restored++;else if(r==='merged')merged++}catch(e){if(isNetworkError(e)){markPending(k);continue}throw e}}return{uploaded,restored,merged,total:keys.size,queued:pendingCount(),offline:false}}async function syncAll(){return reconcileAll()}async function privateHit(path){if(typeof caches==='undefined')return null;const s=session(),uid=s?.user?.id;if(!uid)return null;const url=new URL('./__private_cache__/'+encodeURIComponent(uid)+'/'+encodeURIComponent(path),location.href).href;return(await caches.open(PRIVATE_CACHE)).match(url)}async function privatePut(path,response){if(typeof caches==='undefined')return;const s=session(),uid=s?.user?.id;if(!uid)return;const url=new URL('./__private_cache__/'+encodeURIComponent(uid)+'/'+encodeURIComponent(path),location.href).href;await(await caches.open(PRIVATE_CACHE)).put(url,response)}async function privateDelete(path){if(typeof caches==='undefined')return false;const s=session(),uid=s?.user?.id;if(!uid)return false;const url=new URL('./__private_cache__/'+encodeURIComponent(uid)+'/'+encodeURIComponent(path),location.href).href;return(await caches.open(PRIVATE_CACHE)).delete(url)}async function cachePrivateBlob(path,blob){if(!path||!blob)return false;await privatePut(path,new Response(blob,{headers:{'Content-Type':blob.type||'application/octet-stream'}}));return true}async function isPrivateCached(path){if(!path)return false;try{return !!(await privateHit(path))}catch{return false}}async function requestPersistentStorage(){if(!navigator.storage||!navigator.storage.persist)return false;try{return await navigator.storage.persist()}catch{return false}}async function storageEstimate(){if(!navigator.storage||!navigator.storage.estimate)return null;try{return await navigator.storage.estimate()}catch{return null}}async function forgetCached(path){return privateDelete(path)}async function downloadCached(path){if(!session()?.user?.id)throw new Error('Sessão da nuvem não encontrada neste aparelho.');if(online())try{const body=await download(path);await privatePut(path,new Response(body,{headers:{'Content-Type':'text/html;charset=utf-8'}}));return body}catch(e){if(!isNetworkError(e))throw e}const hit=await privateHit(path);if(hit)return hit.text();throw new Error('Este mapa ainda não está disponível offline neste aparelho. Abra-o ao menos uma vez com internet.')}async function readCachedBlob(path){if(!path)return null;const hit=await privateHit(path);return hit?hit.blob():null}async function downloadBlobCached(path,options={}){if(!session()?.user?.id)throw new Error('Sessão da nuvem não encontrada neste aparelho.');if(options?.preferCache){const cached=await readCachedBlob(path);if(cached)return cached}if(online())try{const blob=await downloadBlob(path);await privatePut(path,new Response(blob,{headers:{'Content-Type':blob.type||'application/octet-stream'}}));return blob}catch(e){if(!isNetworkError(e))throw e}const cached=await readCachedBlob(path);if(cached)return cached;throw new Error('Este documento ainda não está disponível offline neste aparelho. Abra-o ao menos uma vez com internet.')}async function writeDeviceProbe(){const s=await ensure();if(!s?.user?.id)throw new Error('Entre na conta antes de testar');const at=new Date().toISOString();const probe_id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)).replace(/-/g,'').slice(0,6).toUpperCase();const payload={probe_id,device_id:device(),at};await upsert('study_snapshots',{user_id:s.user.id,storage_key:'__device_probe__',payload,client_updated_at:at,device_id:device(),updated_at:at},'user_id,storage_key');return payload}async function readDeviceProbe(){const s=await ensure();if(!s?.user?.id)throw new Error('Entre na conta antes de testar');const data=await rows('study_snapshots','user_id=eq.'+encodeURIComponent(s.user.id)+'&storage_key=eq.__device_probe__&select=*');const row=data?.[0];return row?{...(row.payload||{}),device_id:row.payload?.device_id||row.device_id,at:row.payload?.at||row.client_updated_at||row.updated_at}:null}async function healthCheck(){const s=await ensure();if(!configured())throw new Error('Nuvem não configurada');if(!s?.user?.id)throw new Error('Entre na conta antes de testar');const result={auth:false,database:false,rls:false,storage:false,download:false,device_id:device(),at:new Date().toISOString()};const u=await me();if(!u?.id||u.id!==s.user.id)throw new Error('Falha ao validar a sessão');result.auth=true;const key='__healthcheck__';const stamp=new Date().toISOString();await upsert('study_snapshots',{user_id:u.id,storage_key:key,payload:{ok:true,stamp,device_id:device()},client_updated_at:stamp,device_id:device(),updated_at:stamp},'user_id,storage_key');result.database=true;const rr=await rows('study_snapshots','user_id=eq.'+encodeURIComponent(u.id)+'&storage_key=eq.'+encodeURIComponent(key)+'&select=user_id,storage_key,payload');if(rr?.[0]?.user_id!==u.id||rr?.[0]?.payload?.stamp!==stamp)throw new Error('RLS/banco não devolveram o registro esperado');result.rls=true;const probe='<!doctype html><meta charset=\"utf-8\"><title>cloud-probe</title><p>'+stamp+'</p>';const path=u.id+'/__healthcheck__/probe.html';await upload(path,new Blob([probe],{type:'text/html'}),'text/html',true);result.storage=true;const downloaded=await download(path);if(!String(downloaded).includes(stamp))throw new Error('O arquivo de teste foi enviado, mas a leitura não conferiu');result.download=true;return result}window.StudyCloud={configured,session,signIn,signUp,signOut,requestPasswordReset,consumeAuthRedirect,passwordRecoveryPending,clearPasswordRecovery,updatePassword,me,rows,insert,upsert,patch,removeRows,upload,download,downloadBlob,downloadCached,downloadBlobCached,readCachedBlob,cachePrivateBlob,isPrivateCached,requestPersistentStorage,storageEstimate,forgetCached,removeFiles,syncStorageKey,restoreStorageKey,reconcileAll,syncAll,pendingCount,isNetworkError,healthCheck,writeDeviceProbe,readDeviceProbe,device};})();
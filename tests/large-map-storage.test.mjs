import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

const source=readFileSync(new URL('../assets/js/cloud-core.js',import.meta.url),'utf8');
const bucket='study-maps';
const base='https://test.supabase.co/storage/v1/object/';

function mockCloud(){
 const objects=new Map(), requests=[],store=new Map([['studyapp.auth',JSON.stringify({access_token:'test-token',user:{id:'owner-1'}})]]);
 const cache=new Map();let failNextChunk=false;
 const ctx={
  Blob,Response,URL,URLSearchParams,console,crypto:webcrypto,Date,Math,JSON,
  navigator:{onLine:true,storage:{}},
  location:{href:'https://site.example/index.html',origin:'https://site.example',pathname:'/index.html'},
  window:{STUDY_APP_CONFIG:{supabaseUrl:'https://test.supabase.co',supabaseAnonKey:'anon',bucket}},
  localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)},
  caches:{open:async()=>({match:async key=>cache.get(String(key))?.clone(),put:async(key,response)=>{cache.set(String(key),response.clone())},delete:async key=>cache.delete(String(key))})},
  fetch:async(url,options={})=>{
   const address=String(url),method=options.method||'GET';
   requests.push({address,method,size:options.body?.size||0});
   if(method==='DELETE'&&address===base+bucket){
    const {prefixes}=JSON.parse(options.body);
    for(const path of prefixes)objects.delete(path);
    return new Response('[]',{status:200});
   }
   let path=address.startsWith(base+'authenticated/'+bucket+'/')?address.slice((base+'authenticated/'+bucket+'/').length):address.startsWith(base+bucket+'/')?address.slice((base+bucket+'/').length):null;
   if(path===null)return new Response('Unknown route',{status:404});
   if(method==='POST'){
    if(options.body.size>50_000_000)return new Response(JSON.stringify({statusCode:'413',error:'Payload too large'}),{status:413});
    if(failNextChunk&&path.endsWith('.bin')){failNextChunk=false;return new Response('Interrupcao de upload',{status:503})}
    objects.set(path,options.body);
    return new Response('{"Key":"ok"}',{status:200});
   }
   const body=objects.get(path);
   if(!body)return new Response('not found',{status:404});
   if(method==='HEAD')return new Response(null,{status:200,headers:{'content-length':String(body.size)}});
   return new Response(body,{status:200,headers:{'content-type':body.type||'application/octet-stream'}});
  }
 };
 runInNewContext(source,ctx,{filename:'assets/js/cloud-core.js'});
 return {api:ctx.window.StudyCloud,objects,requests,ctx,failNextChunk:()=>{failNextChunk=true}};
}

test('51+ MiB HTML imports losslessly in private chunks, preserves old maps and offline reading',async()=>{
 const {api,objects,requests,ctx}=mockCloud();
 const path='owner-1/cangucu/CF88.html';
 const large='<!doctype html><html><head><meta charset="utf-8"></head><body>'+('CONTEUDO E IMAGENS '.repeat(2_800_000))+'📚</body></html>';
 const bytes=new Blob([large]).size;
 assert.ok(bytes>50_000_000,'Fixture must exceed the Supabase Free per-file limit');
 await api.upload(path,new Blob([large],{type:'text/html'}),'text/html',true);
 const parts=[...objects.keys()].filter(k=>k.includes('.parts/'));
 assert.ok(parts.length>=7);
 assert.ok(requests.filter(r=>r.method==='POST').every(r=>r.size<=8*1024*1024));
 const got=await api.download(path);
 assert.equal(got.length,large.length);
 assert.equal(got,large,'HTML including every image and character must be byte-equivalent');
 await api.downloadCached(path);
 ctx.navigator.onLine=false;
 assert.equal(await api.downloadCached(path),large,'Previously opened map must work offline');
 ctx.navigator.onLine=true;
 const small='<!doctype html><title>Atualizado</title><p>Mapa menor</p>';
 await api.upload(path,new Blob([small],{type:'text/html'}),'text/html',true);
 assert.equal(await api.download(path),small);
 assert.equal([...objects.keys()].filter(k=>k.includes('.parts/')).length,0,'Replaced map must not leak old chunks');
 const legacy='<!doctype html><p>legado</p>';
 const legacyPath='owner-1/cangucu/LOPA.html';
 objects.set(legacyPath,new Blob([legacy],{type:'text/html'}));
 assert.equal(await api.download(legacyPath),legacy,'Legacy HTML must continue to work');
});

test('failure uploading a chunk leaves previous map and clears incomplete parts',async()=>{
 const {api,objects,failNextChunk}=mockCloud();
 const path='owner-1/cangucu/CF88.html';
 const old='<!doctype html><p>Original</p>';
 await api.upload(path,new Blob([old]),'text/html',true);
 failNextChunk();
 await assert.rejects(()=>api.upload(path,new Blob(['x'.repeat(34*1024*1024)]),'text/html',true),/Interrupcao de upload/);
 assert.equal(await api.download(path),old);
 assert.equal([...objects.keys()].filter(k=>k.includes('.parts/')).length,0);
});

test('deletion of a large map removes both manifest and every chunk',async()=>{
 const {api,objects}=mockCloud();
 const path='owner-1/cangucu/CF88.html';
 await api.upload(path,new Blob(['x'.repeat(33*1024*1024)]),'text/html',false);
 assert.ok(objects.size>1);
 await api.removeFiles([path]);
 assert.equal(objects.size,0);
});

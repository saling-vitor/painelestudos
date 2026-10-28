import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const catalog=JSON.parse(read('data/catalog.json'));
const decode=value=>String(value||'')
 .replace(/<[^>]+>/g,' ')
 .replace(/&#(x?[0-9a-f]+);/gi,(_,code)=>String.fromCodePoint(code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):parseInt(code,10)))
 .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
 .replace(/\s+/g,' ').trim();
const attr=(source,name)=>{const pattern=name==='class'?/\bclass=["']([^"']*)["']/i:/\bdata-topic-id=["']([^"']+)["']/i;return source.match(pattern)?.[1]||'';};
const classHas=(source,name)=>attr(source,'class').split(/\s+/).includes(name);

function normalizeContent(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')}
function matchingDetailsEnd(html,startIndex){const token=/<\/?details\b[^>]*>/gi;token.lastIndex=startIndex;let depth=1,match;while((match=token.exec(html))){if(/^<\//.test(match[0]))depth--;else depth++;if(depth===0)return match.index}return html.length}
function cleanTopicBody(value){return String(value||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<svg\b[\s\S]*?<\/svg>/gi,' ')}
function topicSignals(content){const normalized=normalizeContent(content),pairs=[['memo','MEMO'],['nao confunda','Não confunda'],['o que decorar','O que decorar'],['como cai','Como cai'],['decore','Decore'],['alta incidencia','Alta incidência'],['vespera','Véspera']];return pairs.filter(([needle])=>normalized.includes(needle)).map(([,label])=>label)}
function topicItems(map){
 if(!map?.href||map.source!=='bundled')return[];
 const html=read(map.href),items=[];
 const details=/<details\b([^>]*)>/gi;
 let match;
 while((match=details.exec(html))){
   const attrs=match[1];
   if(!classHas(attrs,'topic-card'))continue;
   const topicId=attr(attrs,'data-topic-id');
   if(!topicId)continue;
   const summaryEnd=html.indexOf('</summary>',details.lastIndex);
   if(summaryEnd<0)continue;
   const summary=html.slice(details.lastIndex,summaryEnd);
   const name=summary.match(/<span\b[^>]*class=["'][^"']*topic-name[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
   if(!name)continue;
   const title=decode(name[1]);
   if(!title)continue;
   const bodyStart=summaryEnd+'</summary>'.length,bodyEnd=matchingDetailsEnd(html,bodyStart),rawBody=html.slice(bodyStart,bodyEnd),content=decode(cleanTopicBody(rawBody)).slice(0,2200),signals=topicSignals(content),snippet=content.slice(0,300);
   /* V15.57 · marcadores do tópico (data-markers) e variantes de questão embutidas (v134-question-data) */
   const markers=String((attrs.match(/\bdata-markers=["']([^"']*)["']/i)||[])[1]||'').split(/[\s,]+/).filter(Boolean),questions=(rawBody.match(/"difficulty"\s*:\s*"N\d"/g)||[]).length;
   const mapKey=String(map.courseId||'')+'::'+String(map.code||map.id||'').toLowerCase();
   items.push({type:'topic',courseId:map.courseId||'',mapCode:map.code||'',mapKey,topicId,title,snippet,signals,markers,questions,content,keywords:decode([map.code,map.title,map.shortTitle,map.category,map.board,map.contest,title,...signals].filter(Boolean).join(' '))});
 }
 if(Number(map.topics||0)&&items.length!==Number(map.topics))throw new Error(map.code+': catálogo informa '+map.topics+' tópicos, extraídos '+items.length);
 return items;
}

const bundled=(catalog.maps||[]).filter(map=>map.source==='bundled'&&map.href);
const items=bundled.flatMap(topicItems);
/* V15.57 · ficha por mapa para a Auditoria do acervo: template, fonte legal declarada, questões e marcadores */
function mapSummary(map){
 const html=read(map.href),text=decode(cleanTopicBody(html)),mapKey=String(map.courseId||'')+'::'+String(map.code||map.id||'').toLowerCase();
 const own=items.filter(it=>it.mapKey===mapKey);
 const fontes=[...text.matchAll(/[^.{}"<>]{0,40}\bcompilad[oa]\b[^.{}"<>]{0,80}/gi)].map(m=>m[0].trim()).filter(t=>/\d{4}/.test(t));
 return {mapKey,code:map.code||'',bytes:Buffer.byteLength(html),template:/v211-standard/.test(html)?'V211':'',g26:/G26/.test(html),fonte:fontes.sort((a,b)=>b.length-a.length)[0]||'',topics:own.length,topicsWithMarkers:own.filter(it=>it.markers.length).length,questions:own.reduce((n,it)=>n+it.questions,0)};
}
const maps=bundled.map(mapSummary);
const output={version:1,generatedAt:new Date().toISOString(),items,maps};
fs.writeFileSync(path.join(ROOT,'data/search-index.json'),JSON.stringify(output,null,2)+'\n');
console.log('✓ Índice de busca: '+items.length+' tópicos em '+bundled.length+' mapas bundled.');

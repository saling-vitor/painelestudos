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
function matchingDetailsEnd(html,startIndex){const token=/<\\/?details\\b[^>]*>/gi;token.lastIndex=startIndex;let depth=1,match;while((match=token.exec(html))){if(/^<\\//.test(match[0]))depth--;else depth++;if(depth===0)return match.index}return html.length}
function cleanTopicBody(value){return String(value||'').replace(/<script\\b[\\s\\S]*?<\\/script>/gi,' ').replace(/<style\\b[\\s\\S]*?<\\/style>/gi,' ').replace(/<svg\\b[\\s\\S]*?<\\/svg>/gi,' ')}
function topicSignals(content){const normalized=normalizeContent(content),pairs=[['memo','MEMO'],['nao confunda','Não confunda'],['o que decorar','O que decorar'],['como cai','Como cai'],['decore','Decore'],['alta incidencia','Alta incidência'],['vespera','Véspera']];return pairs.filter(([needle])=>normalized.includes(needle)).map(([,label])=>label)}
function topicItems(map){
 if(!map?.href||map.source!=='bundled')return[];
 const html=read(map.href),items=[];
 const details=/<details\\b([^>]*)>/gi;
 let match;
 while((match=details.exec(html))){
   const attrs=match[1];
   if(!classHas(attrs,'topic-card'))continue;
   const topicId=attr(attrs,'data-topic-id');
   if(!topicId)continue;
   const summaryEnd=html.indexOf('</summary>',details.lastIndex);
   if(summaryEnd<0)continue;
   const summary=html.slice(details.lastIndex,summaryEnd);
   const name=summary.match(/<span\\b[^>]*class=["'][^"']*topic-name[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>/i);
   if(!name)continue;
   const title=decode(name[1]);
   if(!title)continue;
   const bodyStart=summaryEnd+'</summary>'.length,bodyEnd=matchingDetailsEnd(html,bodyStart),content=decode(cleanTopicBody(html.slice(bodyStart,bodyEnd))).slice(0,2200),signals=topicSignals(content),snippet=content.slice(0,300);
   const mapKey=String(map.courseId||'')+'::'+String(map.code||map.id||'').toLowerCase();
   items.push({type:'topic',courseId:map.courseId||'',mapCode:map.code||'',mapKey,topicId,title,snippet,signals,content,keywords:decode([map.code,map.title,map.shortTitle,map.category,map.board,map.contest,title,...signals].filter(Boolean).join(' '))});
 }
 if(Number(map.topics||0)&&items.length!==Number(map.topics))throw new Error(map.code+': catálogo informa '+map.topics+' tópicos, extraídos '+items.length);
 return items;
}

const bundled=(catalog.maps||[]).filter(map=>map.source==='bundled'&&map.href);
const items=bundled.flatMap(topicItems);
const output={version:1,generatedAt:new Date().toISOString(),items};
fs.writeFileSync(path.join(ROOT,'data/search-index.json'),JSON.stringify(output,null,2)+'\n');
console.log('✓ Índice de busca: '+items.length+' tópicos em '+bundled.length+' mapas bundled.');

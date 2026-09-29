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
const attr=(source,name)=>{const pattern=name==='class'?/\\bclass=["']([^"']*)["']/i:/\\bdata-topic-id=["']([^"']+)["']/i;return source.match(pattern)?.[1]||'';};
const classHas=(source,name)=>attr(source,'class').split(/\s+/).includes(name);

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
   const end=html.indexOf('</summary>',details.lastIndex);
   if(end<0)continue;
   const summary=html.slice(details.lastIndex,end);
   const name=summary.match(/<span\b[^>]*class=["'][^"']*topic-name[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
   if(!name)continue;
   const title=decode(name[1]);
   if(!title)continue;
   const mapKey=String(map.courseId||'')+'::'+String(map.code||map.id||'').toLowerCase();
   items.push({type:'topic',courseId:map.courseId||'',mapCode:map.code||'',mapKey,topicId,title,keywords:decode([map.code,map.title,map.shortTitle,map.category,map.board,map.contest,title].filter(Boolean).join(' '))});
 }
 if(Number(map.topics||0)&&items.length!==Number(map.topics))throw new Error(map.code+': catálogo informa '+map.topics+' tópicos, extraídos '+items.length);
 return items;
}

const bundled=(catalog.maps||[]).filter(map=>map.source==='bundled'&&map.href);
const items=bundled.flatMap(topicItems);
const output={version:1,generatedAt:new Date().toISOString(),items};
fs.writeFileSync(path.join(ROOT,'data/search-index.json'),JSON.stringify(output,null,2)+'\n');
console.log('✓ Índice de busca: '+items.length+' tópicos em '+bundled.length+' mapas bundled.');

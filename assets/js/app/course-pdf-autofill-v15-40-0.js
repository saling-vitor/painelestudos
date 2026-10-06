'use strict';
const COURSE_PDFJS_SRC='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const COURSE_PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const COURSE_TESSERACT_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let coursePdfJsPromise=null,courseTesseractPromise=null,coursePdfAnalysisToken=0;
const COURSE_AUTOFILL_FIELDS=['title','subtitle','board','city','examDate','institution'];
const BRAZIL_UF='AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO';
const STATE_UF={acre:'AC',alagoas:'AL',amapa:'AP',amazonas:'AM',bahia:'BA',ceara:'CE','distrito federal':'DF','espirito santo':'ES',goias:'GO',maranhao:'MA','mato grosso':'MT','mato grosso do sul':'MS','minas gerais':'MG',para:'PA',paraiba:'PB',parana:'PR',pernambuco:'PE',piaui:'PI','rio de janeiro':'RJ','rio grande do norte':'RN','rio grande do sul':'RS',rondonia:'RO',roraima:'RR','santa catarina':'SC','sao paulo':'SP',sergipe:'SE',tocantins:'TO'};

function editalAscii(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function editalClean(value){return String(value||'').replace(/\u00ad/g,'').replace(/\u0002/g,'-').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
function editalPretty(value){const raw=String(value||'').replace(/\s+/g,' ').replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g,'').trim();if(!raw)return'';if(raw!==raw.toUpperCase())return raw;const small=new Set(['DA','DE','DO','DAS','DOS','E']);return raw.toLocaleLowerCase('pt-BR').split(' ').map((word,index)=>index&&small.has(word.toUpperCase())?word:word?word.charAt(0).toLocaleUpperCase('pt-BR')+word.slice(1):word).join(' ').replace(/\(([a-z]{2,10})\)/g,(_,x)=>'('+x.toUpperCase()+')')}
function editalField(value='',confidence='none',evidence='',meta={}){return{value:String(value||'').trim(),confidence,evidence:String(evidence||'').trim(),...meta}}
function editalLines(text){return editalClean(text).split('\n').map(line=>line.trim()).filter(Boolean)}
function cleanPlace(value){return editalPretty(String(value||'').replace(/\s+(?:[-–—]\s*)?(?:edital|concurso público|concurso publico|estado do|rev\.?).*$/i,'').replace(/\s*\/\s*(?:'+BRAZIL_UF+')\b/i,'').trim())}
function inferStateUf(text){const ascii=editalAscii(text);for(const [state,uf] of Object.entries(STATE_UF))if(ascii.includes(state))return uf;if(/\bcatarinense\b/.test(ascii))return'SC';const m=String(text||'').match(new RegExp('\\b('+BRAZIL_UF+')\\b'));return m?m[1].toUpperCase():''}

function inferEditalBoard(text){
  const source=editalAscii(text);
  const rules=[
    [/\binstituto aocp\b|\binstitutoaocp\.org\.br\b/,'Instituto AOCP'],
    [/\bfundatec\b|\bfundacao universidade empresa de tecnologia e ciencias\b/,'FUNDATEC'],
    [/\binstituto objetiva\b|\bobjetiva instituto\b|\bobjetivas\.com\.br\b/,'Objetiva'],
    [/\bfepese\b/,'FEPESE'],[/\blegalle\b/,'Legalle'],[/\binstituto avalia\b/,'Instituto Avalia'],
    [/\bcebraspe\b|\bcespe\b/,'Cebraspe'],[/\bfundacao getulio vargas\b|\bfgv\b/,'FGV'],
    [/\bfundacao carlos chagas\b|\bfcc\b/,'FCC'],[/\bvunesp\b/,'VUNESP'],[/\bibfc\b/,'IBFC'],
    [/\bibade\b/,'IBADE'],[/\bconsulplan\b/,'Consulplan'],[/\bfundacao la salle\b|\blasalle\b/,'Fundação La Salle']
  ];
  for(const [re,label] of rules)if(re.test(source))return editalField(label,'high',label);
  return editalField();
}

function inferEditalInstitution(text){
  const lines=editalLines(text),head=lines.slice(0,220).join('\n');
  if(/companhia catarinense de [aá]guas e saneamento/i.test(head))return editalField('Companhia Catarinense de Águas e Saneamento - CASAN','high','Companhia Catarinense de Águas e Saneamento – CASAN');
  if(/departamento municipal de habita[cç][aã]o/i.test(head))return editalField('Departamento Municipal de Habitação - DEMHAB','high','Departamento Municipal de Habitação');
  let m=head.match(new RegExp('PREFEITURA\\s+MUNICIPAL\\s+DE\\s+([^\\n/]{2,70})(?:\\s*/\\s*('+BRAZIL_UF+'))?','i'));
  if(m)return editalField('Prefeitura Municipal de '+cleanPlace(m[1]),'high',m[0]);
  m=head.match(new RegExp('MUNIC[IÍ]PIO\\s+DE\\s+([^\\n/]{2,70})(?:\\s*/\\s*('+BRAZIL_UF+'))?','i'));
  if(m)return editalField('Município de '+cleanPlace(m[1]),'high',m[0]);
  const prefix=/^(CÂMARA MUNICIPAL DE|CAMARA MUNICIPAL DE|COMPANHIA |DEPARTAMENTO MUNICIPAL DE|FUNDAÇÃO |FUNDACAO |UNIVERSIDADE |SECRETARIA |TRIBUNAL |CONSELHO |SERVIÇO AUTÔNOMO |SERVICO AUTONOMO )/i,candidates=[];
  for(let i=0;i<Math.min(lines.length,300);i++){
    let line=lines[i].replace(/\s+/g,' ').trim();
    if(line.length<8||line.length>150||!prefix.test(line))continue;
    if(/FUNDATEC|AOCP|OBJETIVA|FEPESE|LEGALLE|AVALIA/i.test(line))continue;
    line=line.replace(/\s+(EDITAL|CONCURSO PÚBLICO|CONCURSO PUBLICO).*$/i,'').trim();
    let score=4;if(i<50)score+=5;
    const ctx=editalAscii(lines.slice(Math.max(0,i-1),i+2).join(' '));if(/edital|concurso publico/.test(ctx))score+=2;
    candidates.push({value:editalPretty(line),score,evidence:lines[i]});
  }
  if(!candidates.length)return editalField();
  candidates.sort((a,b)=>b.score-a.score);
  return editalField(candidates[0].value,candidates[0].score>=8?'high':'medium',candidates[0].evidence);
}

function professionCatalog(){return[
  ['Arquiteto e Urbanista',/\barquiteto\s+e\s+urbanista\b/],['Arquiteto',/\barquiteto\b/],
  ['Engenheiro Civil',/\bengenheiro civil\b/],['Engenheiro',/\bengenheiro\b/],['Analista',/\banalista\b/],
  ['Técnico',/\btecnico\b/],['Advogado',/\badvogado\b/],['Contador',/\bcontador\b/],
  ['Administrador',/\badministrador\b/],['Médico',/\bmedico\b/],['Enfermeiro',/\benfermeiro\b/]
]}
function inferEditalProfession(text){
  const lines=editalLines(text),asciiLines=lines.map(editalAscii),catalog=professionCatalog();
  let chosen='';
  for(const [label,re] of catalog)if(re.test(editalAscii(text))){chosen=label;break}
  if(!chosen)return editalField();
  const key=editalAscii(chosen).replace(/\s+e\s+urbanista$/,'');
  const occurrences=[];
  for(let i=0;i<asciiLines.length;i++){
    if(!asciiLines[i].includes(key))continue;
    const ctx=lines.slice(Math.max(0,i-3),Math.min(lines.length,i+7)).join(' ');
    const a=editalAscii(ctx);let score=1;
    if(/\bcp\s*[-–]?\s*\d{1,3}\b/i.test(ctx))score+=14;
    if(/\bg0?\d\b/i.test(ctx))score+=10;
    if(/c[oó]digo|cargo|habilita[cç][aã]o|escolaridade|vagas|nível superior|nivel superior/i.test(ctx))score+=7;
    if(/prova de t[ií]tulos|cargos de/i.test(ctx))score-=4;
    if(i<300)score+=2;
    occurrences.push({i,ctx,score});
  }
  occurrences.sort((a,b)=>b.score-a.score);
  const best=occurrences[0]||{ctx:'',score:0};
  const cp=best.ctx.match(/\bCP\s*[-–]?\s*(\d{1,3})\b/i);
  const group=best.ctx.match(/\bG(?:RUPO\s*)?0?(\d{1,2})\b/i);
  const numericCode=best.ctx.match(new RegExp('\\b(\\d{3})\\s+'+key.replace(/\s+/g,'\\s+'),'i'));
  const code=cp?'CP '+String(cp[1]).padStart(2,'0'):(numericCode?numericCode[1]:'');
  const display=(cp?code+' · ':'')+chosen;
  return editalField(display,best.score>=12?'high':'medium',best.ctx.slice(0,220),{rawProfession:chosen,code,group:group?String(group[1]).padStart(2,'0'):''});
}

function inferCargoLocality(text,profession,stateUf){
  const lines=editalLines(text),key=editalAscii(profession.rawProfession||profession.value).replace(/\s+e\s+urbanista$/,'');
  if(!key)return'';
  for(let i=0;i<lines.length;i++){
    if(!editalAscii(lines[i]).includes(key))continue;
    const ctx=lines.slice(i,Math.min(lines.length,i+8)).join(' ');
    const after=ctx.slice(Math.max(0,editalAscii(ctx).indexOf(key)+key.length));
    const matches=[...after.matchAll(/\b([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ][a-záàâãéêíóôõúüç]+(?:\s+(?:do|da|de|dos|das)?\s*[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ][a-záàâãéêíóôõúüç]+){0,3})\b/g)];
    for(const m of matches){
      const value=m[1].replace(/\s+/g,' ').trim(),a=editalAscii(value);
      if(/^(curso|ensino|superior|registro|conselho|arquitetura|urbanismo|vaga|salario|inicial|bruto|cadastro|reserva|ampla|concorrencia)$/.test(a))continue;
      if(value.length<4||value.length>45)continue;
      return editalPretty(value)+(stateUf?'/'+stateUf:'');
    }
  }
  return'';
}

function inferEditalCity(text,institution,profession){
  const lines=editalLines(text),head=lines.slice(0,350).join('\n'),stateUf=inferStateUf(head+' '+institution.value);
  let m=head.match(new RegExp('(?:PREFEITURA\\s+MUNICIPAL|MUNIC[IÍ]PIO)\\s+DE\\s+([^\\n/]{2,60})\\s*/\\s*('+BRAZIL_UF+')\\b','i'));
  if(m)return editalField(cleanPlace(m[1])+'/'+String(m[2]).toUpperCase(),'high',m[0]);
  m=head.match(/do\s+Munic[ií]pio\s+de\s+([^,\n]{2,55}),\s*do\s+Estado\s+(?:do|de)\s+([A-Za-zÀ-ÿ ]{4,30})/i);
  if(m){const uf=STATE_UF[editalAscii(m[2]).trim()]||stateUf;return editalField(editalPretty(m[1])+(uf?'/'+uf:''),'high',m[0])}
  const cargoCity=inferCargoLocality(text,profession,stateUf);
  if(cargoCity)return editalField(cargoCity,'medium',profession.evidence);
  const candidates=[];
  for(let i=0;i<Math.min(lines.length,500);i++){
    const line=lines[i];if(line.length>130)continue;
    const re=new RegExp('([A-ZÀ-Ü][A-Za-zÀ-ÿ .’\\'\\-]{2,48})\\s*[/,\\-]\\s*('+BRAZIL_UF+')\\b','i'),match=line.match(re);
    if(!match)continue;
    let city=match[1].replace(/^(cidade|municipio|município|comarca|estado)\s+(de\s+)?/i,'').trim();
    const a=editalAscii(line);let score=2;
    if(/prefeitura|municipio|municipal|cidade|sede|lotacao/.test(a))score+=7;
    if(/cnpj|rua |avenida|executora|realizacao|realização|fundatec|aocp|objetiva/.test(a))score-=8;
    if(i<80)score+=2;
    if(city&&city.length<=50)candidates.push({value:editalPretty(city)+'/'+match[2].toUpperCase(),score,evidence:line});
  }
  if(!candidates.length)return editalField();
  candidates.sort((a,b)=>b.score-a.score);
  return editalField(candidates[0].value,candidates[0].score>=7?'high':'medium',candidates[0].evidence);
}

const EDITAL_MONTHS={janeiro:1,fevereiro:2,marco:3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12};
function editalIsoDate(day,month,year){day=Number(day);month=Number(month);year=Number(year);const d=new Date(year,month-1,day,12);if(Number.isNaN(d.getTime())||d.getFullYear()!==year||d.getMonth()!==month-1||d.getDate()!==day)return'';return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')}
function editalDateMatches(text){
  const out=[];
  for(const m of String(text||'').matchAll(/\b(0?[1-9]|[12]\d|3[01])\s*[\/.\-]\s*(0?[1-9]|1[0-2])\s*[\/.\-]\s*(20\d{2})\b/g)){const iso=editalIsoDate(m[1],m[2],m[3]);if(iso)out.push({iso,index:m.index,raw:m[0]})}
  for(const m of String(text||'').matchAll(/\b(0?[1-9]|[12]\d|3[01])\s+de\s+([A-Za-zÀ-ÿ]+)\s+de\s+(20\d{2})\b/gi)){const month=EDITAL_MONTHS[editalAscii(m[2])];const iso=month?editalIsoDate(m[1],month,m[3]):'';if(iso)out.push({iso,index:m.index,raw:m[0]})}
  return out;
}
function groupNumbers(context){const a=editalAscii(context),m=a.match(/grupos?\s+0?(\d{1,2})(?:\s*(?:e|,|\/)\s*0?(\d{1,2}))?/);return m?[Number(m[1]),...(m[2]?[Number(m[2])]:[])]:[]}
function inferEditalExamDate(text,board,profession){
  const clean=editalClean(text),ascii=editalAscii(clean),dates=editalDateMatches(clean),events=[],re=/(?:aplicacao|realizacao)\s+(?:da|das|de)?\s*(?:provas?\s+)?(?:teorico[- ]objetivas?|objetivas?|escritas?)/g;
  for(const m of ascii.matchAll(re))events.push({index:m.index,label:m[0]});
  const candidates=[],boardName=board.value||'',targetGroup=profession.group?Number(profession.group):0;
  for(const ev of events){
    for(const d of dates){
      const delta=d.index-ev.index,dist=Math.abs(delta);if(dist>190)continue;
      const lo=Math.max(0,Math.min(d.index,ev.index)-110),hi=Math.min(clean.length,Math.max(d.index,ev.index)+220),ctx=clean.slice(lo,hi),a=editalAscii(ctx);
      let score=24+Math.max(0,9-Math.floor(dist/18));
      const sameLine=!clean.slice(Math.min(d.index,ev.index),Math.max(d.index,ev.index)).includes('\n');if(sameLine)score+=7;
      if(boardName==='FUNDATEC'||boardName==='Instituto AOCP')score+=delta>0?10:1;
      else if(boardName==='Objetiva')score+=delta<0?10:4;
      else score+=5;
      if(targetGroup){
        const groups=groupNumbers(ctx);
        if(groups.length)score+=groups.includes(targetGroup)?28:-24;
      }
      if(/gabarito|resultado|homolog|inscri[cç]|isen[cç][aã]o|publica[cç][aã]o do edital|impugna[cç]/i.test(ctx))score-=4;
      candidates.push({iso:d.iso,score,evidence:ctx.replace(/\s+/g,' ').slice(0,240)});
    }
  }
  if(candidates.length){
    candidates.sort((a,b)=>b.score-a.score||a.iso.localeCompare(b.iso));
    const best=candidates[0];if(best.score>=25)return editalField(best.iso,best.score>=45?'high':'medium',best.evidence);
  }
  const lines=editalLines(clean),fallback=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i],ctx=lines.slice(Math.max(0,i-1),Math.min(lines.length,i+2)).join(' '),a=editalAscii(ctx);
    for(const d of editalDateMatches(line)){
      let score=0;
      if(/data da prova/.test(a))score+=14;if(/prova objetiva|provas teorico-objetivas|prova escrita/.test(a))score+=9;
      if(/aplicacao|realizacao/.test(a))score+=8;if(/cronograma/.test(a))score+=2;
      if(/publicacao do edital|extrato|inscri|isenc|recurso|gabarito|resultado|homolog|impugnacao/.test(a))score-=12;
      if(targetGroup){const groups=groupNumbers(ctx);if(groups.length)score+=groups.includes(targetGroup)?18:-18}
      if(score>=7)fallback.push({iso:d.iso,score,evidence:ctx});
    }
  }
  if(!fallback.length)return editalField();
  fallback.sort((a,b)=>b.score-a.score||a.iso.localeCompare(b.iso));
  return editalField(fallback[0].iso,fallback[0].score>=18?'high':'medium',fallback[0].evidence);
}

function inferEditalAcronym(institution,text){
  const source=(institution+' '+text.slice(0,14000)).toUpperCase(),known=['CASAN','DEMHAB','DMAE','CAU','CREA','TJRS','TJSC','MPRS','MPSC','TCE','TRF','UFRGS','UFSC'];
  for(const k of known)if(new RegExp('\\b'+k+'\\b').test(source))return k;
  const m=source.match(/\(([A-Z]{2,10})\)/);return m?m[1]:'';
}
function inferEditalTitle(institution,city,text){
  if(!institution.value&&!city.value)return editalField();
  const acronym=inferEditalAcronym(institution.value,text),cityName=String(city.value||'').split('/')[0].trim();
  if(acronym)return editalField((acronym+(cityName?' '+cityName:'')).trim(),'high',institution.evidence||city.evidence);
  if(/^(Prefeitura Municipal|Município) de /i.test(institution.value)&&cityName)return editalField('Prefeitura '+cityName,'high',institution.evidence);
  if(institution.value&&institution.value.length<=62)return editalField(institution.value,'medium',institution.evidence);
  return editalField(cityName?'Concurso '+cityName:'','low',city.evidence);
}
function inferCourseFromEditalText(text){
  const clean=editalClean(text),board=inferEditalBoard(clean),institution=inferEditalInstitution(clean),subtitle=inferEditalProfession(clean),city=inferEditalCity(clean,institution,subtitle),examDate=inferEditalExamDate(clean,board,subtitle),title=inferEditalTitle(institution,city,clean);
  return{title,subtitle,board,city,examDate,institution};
}

function courseAutofillInput(name){return $('#courseForm')?.elements?.namedItem(name)||null}
function clearCourseAutofillFields(){for(const name of COURSE_AUTOFILL_FIELDS){const input=courseAutofillInput(name);if(input?.dataset?.courseAutofilled==='1'){input.value='';delete input.dataset.courseAutofilled;delete input.dataset.courseConfidence}}}
function renderCourseAutofillStatus(result,stateName='done',message=''){
  const box=$('#coursePdfAutofill');if(!box)return;box.hidden=false;box.className='course-pdf-autofill is-'+stateName;
  const title=$('#coursePdfAutofillTitle'),text=$('#coursePdfAutofillText'),fields=$('#coursePdfAutofillFields');
  if(stateName==='loading'){title.textContent='Analisando edital…';text.textContent=message||'Extraindo texto do PDF no seu aparelho.';fields.innerHTML='';return}
  if(stateName==='error'){title.textContent='Não foi possível preencher automaticamente';text.textContent=message||'Preencha os campos manualmente.';fields.innerHTML='';return}
  const labels={title:'Curso',subtitle:'Cargo',board:'Banca',city:'Cidade',examDate:'Prova',institution:'Órgão'},entries=COURSE_AUTOFILL_FIELDS.map(key=>({key,...result[key]})),found=entries.filter(item=>item.value).length;
  title.textContent=found+' de '+entries.length+' campos identificados';
  text.textContent=message||'Confira as sugestões antes de criar o concurso. Nada será salvo sem sua confirmação.';
  fields.innerHTML=entries.map(item=>'<span class="course-pdf-field '+(item.value?'is-found':'is-missing')+'"><b>'+ESC(labels[item.key])+'</b><small>'+(item.value?ESC(item.value):'Não localizado')+'</small></span>').join('');
}
function resetCoursePdfAutofill({resetForm=false}={}){coursePdfAnalysisToken++;if(resetForm)$('#courseForm')?.reset();else clearCourseAutofillFields();const box=$('#coursePdfAutofill');if(box){box.hidden=true;box.className='course-pdf-autofill';$('#coursePdfAutofillTitle').textContent='';$('#coursePdfAutofillText').textContent='';$('#coursePdfAutofillFields').innerHTML=''}}
function openNewCourseModal(){resetCoursePdfAutofill({resetForm:true});openModal('courseModal')}
function loadCoursePdfJs(){if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=COURSE_PDFJS_WORKER;return Promise.resolve(window.pdfjsLib)}if(coursePdfJsPromise)return coursePdfJsPromise;coursePdfJsPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=COURSE_PDFJS_SRC;script.async=true;script.crossOrigin='anonymous';script.referrerPolicy='no-referrer';script.onload=()=>{if(!window.pdfjsLib)return reject(new Error('Leitor de PDF indisponível.'));window.pdfjsLib.GlobalWorkerOptions.workerSrc=COURSE_PDFJS_WORKER;resolve(window.pdfjsLib)};script.onerror=()=>reject(new Error('Não foi possível carregar o leitor de PDF. Verifique a internet e tente novamente.'));document.head.appendChild(script)}).catch(error=>{coursePdfJsPromise=null;throw error});return coursePdfJsPromise}
function loadCourseTesseract(){if(window.Tesseract?.createWorker)return Promise.resolve(window.Tesseract);if(courseTesseractPromise)return courseTesseractPromise;courseTesseractPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=COURSE_TESSERACT_SRC;script.async=true;script.crossOrigin='anonymous';script.referrerPolicy='no-referrer';script.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(new Error('OCR indisponível.'));script.onerror=()=>reject(new Error('Não foi possível carregar o OCR.'));document.head.appendChild(script)}).catch(error=>{courseTesseractPromise=null;throw error});return courseTesseractPromise}

async function extractCoursePdfText(file,token){
  const pdfjs=await loadCoursePdfJs(),bytes=new Uint8Array(await file.arrayBuffer()),pdf=await pdfjs.getDocument({data:bytes}).promise,maxPages=Math.min(pdf.numPages,160),chunks=[];let chars=0,likelyScan=false;
  for(let pageNumber=1;pageNumber<=maxPages;pageNumber++){
    if(token!==coursePdfAnalysisToken)throw new DOMException('Análise cancelada','AbortError');
    if(pageNumber===1||pageNumber%10===0)renderCourseAutofillStatus({},'loading','Lendo página '+pageNumber+' de '+maxPages+'…');
    const page=await pdf.getPage(pageNumber),content=await page.getTextContent(),parts=[];
    for(const item of content.items||[]){if(!item?.str)continue;parts.push(item.str);parts.push(item.hasEOL?'\n':' ')}
    const pageText=parts.join('').trim();if(pageText){chunks.push(pageText);chars+=pageText.length}page.cleanup?.();
    if(pageNumber===8&&chars<120){likelyScan=true;break}
    if(chars>520000&&pageNumber>=40)break;
  }
  return{text:chunks.join('\n\n'),pdf,likelyScan};
}
async function renderCourseOcrCanvas(pdf,pageNumber){
  const page=await pdf.getPage(pageNumber),viewport=page.getViewport({scale:1.45}),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvasContext:ctx,viewport}).promise;page.cleanup?.();return canvas;
}
function courseCanvasHasContent(canvas){
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,canvas.width,canvas.height).data,step=Math.max(4,Math.floor(Math.min(canvas.width,canvas.height)/55))*4;let dark=0,total=0;
  for(let i=0;i<data.length;i+=step){total++;if(data[i]<235||data[i+1]<235||data[i+2]<235)dark++}
  return total&&dark/total>.004;
}
function courseOcrSchedulePages(total){
  const values=[.45,.5,.55,.62,.7,.78,.86,.94].map(p=>Math.max(1,Math.min(total,Math.round(total*p))));
  return [...new Set(values)];
}
function hasExamEvent(text){const a=editalAscii(text);return/(aplicacao|realizacao).{0,35}(prova|provas).{0,25}(objetiva|teorico-objetiva)/s.test(a)}
async function ocrCoursePdf(pdf,token){
  const T=await loadCourseTesseract(),worker=await T.createWorker('por');let combined='';
  try{
    const metadataPages=[1,2,3,4,5,6].filter(n=>n<=pdf.numPages);
    for(const pageNumber of metadataPages){
      if(token!==coursePdfAnalysisToken)throw new DOMException('Análise cancelada','AbortError');
      renderCourseAutofillStatus({},'loading','PDF digitalizado · reconhecendo página '+pageNumber+'…');
      const canvas=await renderCourseOcrCanvas(pdf,pageNumber);if(!courseCanvasHasContent(canvas))continue;
      const ret=await worker.recognize(canvas);const t=editalClean(ret?.data?.text||'');if(t)combined+='\n'+t;
      const partial=inferCourseFromEditalText(combined);if(partial.board.value&&partial.institution.value&&partial.subtitle.value&&partial.city.value)break;
    }
    for(const pageNumber of courseOcrSchedulePages(pdf.numPages)){
      if(token!==coursePdfAnalysisToken)throw new DOMException('Análise cancelada','AbortError');
      renderCourseAutofillStatus({},'loading','PDF digitalizado · procurando cronograma (pág. '+pageNumber+')…');
      const canvas=await renderCourseOcrCanvas(pdf,pageNumber);if(!courseCanvasHasContent(canvas))continue;
      const ret=await worker.recognize(canvas);const t=editalClean(ret?.data?.text||'');if(t)combined+='\n'+t;
      if(hasExamEvent(t)&&inferCourseFromEditalText(combined).examDate.value)break;
    }
    return editalClean(combined);
  }finally{await worker.terminate().catch(()=>{})}
}
function applyCourseAutofill(result){let applied=0;for(const name of COURSE_AUTOFILL_FIELDS){const suggestion=result[name],input=courseAutofillInput(name);if(!input||!suggestion?.value)continue;const canReplace=!String(input.value||'').trim()||input.dataset.courseAutofilled==='1';if(!canReplace)continue;input.value=suggestion.value;input.dataset.courseAutofilled='1';input.dataset.courseConfidence=suggestion.confidence||'medium';applied++}return applied}
async function handleCourseEditalAutofill(event){
  const input=event?.currentTarget||$('#courseEditalFile'),file=input?.files?.[0];if(!file){resetCoursePdfAutofill();return}if(!validPdf(file)){input.value='';resetCoursePdfAutofill();return}
  clearCourseAutofillFields();const token=++coursePdfAnalysisToken;renderCourseAutofillStatus({},'loading','Preparando leitura do PDF…');
  try{
    const extracted=await extractCoursePdfText(file,token);let text=extracted.text,usedOcr=false;
    if(extracted.likelyScan||editalAscii(text).replace(/\s/g,'').length<120){
      try{const ocrText=await ocrCoursePdf(extracted.pdf,token);if(ocrText){text+='\n'+ocrText;usedOcr=true}}catch(error){if(error?.name==='AbortError')throw error;console.warn('OCR do edital indisponível',error)}
    }
    if(token!==coursePdfAnalysisToken)return;
    if(editalAscii(text).replace(/\s/g,'').length<120)throw new Error('O PDF é digitalizado e o OCR automático não conseguiu ler conteúdo suficiente. Preencha os campos manualmente.');
    const result=inferCourseFromEditalText(text),applied=applyCourseAutofill(result);
    const note=usedOcr?'PDF digitalizado: os campos foram reconhecidos por OCR local. Confira antes de criar o concurso.':(applied?'Confira as sugestões preenchidas automaticamente antes de criar o concurso.':'O texto foi lido, mas os dados principais não puderam ser identificados com segurança.');
    renderCourseAutofillStatus(result,'done',note);if(!applied)toast('Edital lido · confira e preencha os dados do concurso.');
  }catch(error){if(error?.name==='AbortError')return;renderCourseAutofillStatus({},'error',error?.message||'Preencha os campos manualmente.')}
}
document.addEventListener('input',event=>{const input=event.target;if(!input?.form||input.form.id!=='courseForm'||!input.name||!COURSE_AUTOFILL_FIELDS.includes(input.name)||!event.isTrusted)return;delete input.dataset.courseAutofilled;delete input.dataset.courseConfidence});
window.__coursePdfAutofillTest={infer:inferCourseFromEditalText};

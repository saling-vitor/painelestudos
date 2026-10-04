'use strict';
(()=>{
  if(window.__studyAutomationV15370)return;
  window.__studyAutomationV15370=true;

  const SOURCE='study-automation-v1';
  const DEFAULTS={
    autoAgenda:true,
    autoReplan:true,
    simRecovery:true,
    archiveSuggestions:true,
    importInference:true,
    healthSignals:true
  };
  let agendaSyncBusy=false;
  let maintenanceTimer=0;
  let lastMaintenanceAt=0;

  const esc=value=>typeof ESC==='function'?ESC(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
  const tokenSet=value=>new Set(norm(value).split(/\s+/).filter(word=>word.length>2));
  const startDay=value=>{const d=value instanceof Date?new Date(value):new Date(value);return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
  const addDays=(value,days)=>{const d=startDay(value);d.setDate(d.getDate()+Number(days||0));return d};
  const dateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const parseDate=value=>{if(!value)return null;const text=String(value);let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(text);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(text);if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12);const d=new Date(value);return Number.isFinite(d.getTime())?d:null};
  const daysBetween=(a,b)=>Math.round((startDay(b)-startDay(a))/86400000);
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
  const mapKeyOf=map=>map?String(map._key||mapKey(map)):'';
  const nowIso=()=>new Date().toISOString();
  const sanitize=value=>String(value||'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,140);

  function plannerSettings(){
    return window.StudyPlanner?.settings?.()||{};
  }
  function automationSettings(){
    const configured=plannerSettings().automation;
    return{...DEFAULTS,...(configured&&typeof configured==='object'?configured:{})};
  }
  function saveAutomationSettings(patch={}){
    const next={...automationSettings(),...patch};
    window.StudyPlanner?.saveSettings?.({automation:next});
    renderAutomationSettings();
    scheduleMaintenance(true);
    return next;
  }

  function activeCourses(){
    return typeof combinedCourses==='function'?combinedCourses().filter(course=>course?.status!=='archived'):[];
  }
  function mapsForCourse(courseId){
    return typeof combinedMaps==='function'?combinedMaps().filter(map=>map.courseId===courseId):[];
  }
  function courseProgressSafe(courseId){
    const maps=mapsForCourse(courseId);
    return typeof aggregateProgress==='function'?aggregateProgress(maps):{total:0,marked:0,pending:0,done:0,review:0,difficult:0};
  }
  function recentCourseSeconds(courseId,days=7){
    const data=window.StudyDashboard?.exportData?.()||{sessions:[]},cutoff=Date.now()-Math.max(1,days)*86400000;
    return(data.sessions||[]).filter(row=>{
      if(row?.deleted)return false;
      const at=Date.parse(row.endedAt||row.startedAt||row.createdAt||0)||0;
      if(at<cutoff)return false;
      if(String(row.courseId||'')===String(courseId))return true;
      const map=row.mapKey&&typeof mapById==='function'?mapById(row.mapKey):null;
      return map?.courseId===courseId;
    }).reduce((sum,row)=>sum+Math.max(0,Number(row.durationSeconds)||0),0);
  }

  function courseHealth(course){
    if(!course)return{status:'neutral',label:'Sem dados',message:'Curso não identificado.',daysUntilExam:null,requiredTopicsPerDay:0,actualTopicsPerDay:0,marginDays:null,remainingTopics:0};
    const progress=courseProgressSafe(course.id),maps=mapsForCourse(course.id),exam=parseDate(course.examDate||course.exam_date),today=startDay(new Date()),daysUntilExam=exam?daysBetween(today,exam):null;
    let fc=null;
    try{fc=window.StudyPlanner?.forecast?.(course.id)||null}catch{}
    const remainingTopics=Math.max(0,Number(progress.pending)||Math.max(0,(Number(progress.total)||0)-(Number(progress.marked)||0)));
    const secondsPerTopic=Math.max(60,Number(fc?.secondsPerTopic)||12*60);
    const recentSeconds=recentCourseSeconds(course.id,7);
    const actualTopicsPerDay=recentSeconds>0?(recentSeconds/secondsPerTopic/7):0;
    const requiredTopicsPerDay=daysUntilExam!==null&&daysUntilExam>0?remainingTopics/daysUntilExam:0;
    const marginDays=Number.isFinite(Number(fc?.marginDays))?Number(fc.marginDays):null;
    let status='neutral',label='Sem data',message='Informe a data da prova para calcular o ritmo necessário.';

    if(course.status==='archived'){
      status='archived';label='Arquivado';message='Curso fora das prioridades automáticas.';
    }else if(exam&&daysUntilExam<0){
      status='finished';label='Prova realizada';message='A prova já passou. O histórico permanece preservado.';
    }else if(progress.total>0&&remainingTopics===0){
      status='healthy';label='Conteúdo concluído';message=daysUntilExam!==null?'Conteúdo coberto antes da prova.':'Conteúdo coberto.';
    }else if(exam){
      const paceBase=Math.max(.2,actualTopicsPerDay);
      if((marginDays!==null&&marginDays<0)||(daysUntilExam<=7&&requiredTopicsPerDay>paceBase*1.25)){
        status='risk';label='Ritmo em risco';
        message=marginDays!==null&&marginDays<0?'No ritmo estimado, a conclusão fica '+Math.abs(marginDays)+' dia'+(Math.abs(marginDays)===1?'':'s')+' após a prova.':'É preciso acelerar para cobrir o conteúdo restante.';
      }else if((marginDays!==null&&marginDays<7)||(daysUntilExam<=14&&requiredTopicsPerDay>paceBase)){
        status='attention';label='Atenção';
        message=marginDays!==null&&marginDays>=0?'Margem estimada de '+marginDays+' dia'+(marginDays===1?'':'s')+' antes da prova.':'O ritmo atual está próximo do mínimo necessário.';
      }else{
        status='healthy';label='Em dia';
        message=marginDays!==null?'Conclusão estimada '+marginDays+' dia'+(marginDays===1?'':'s')+' antes da prova.':'Ritmo compatível com o prazo atual.';
      }
    }else if(maps.length){
      status='neutral';label='Sem data';message='O curso entra no plano por progresso, revisões e dificuldade.';
    }

    return{
      courseId:course.id,status,label,message,daysUntilExam,
      requiredTopicsPerDay,actualTopicsPerDay,marginDays,
      remainingTopics,totalTopics:Number(progress.total)||0,markedTopics:Number(progress.marked)||0,
      progress,forecast:fc,examDate:exam
    };
  }

  function courseHealthAll(){
    return(typeof combinedCourses==='function'?combinedCourses():[]).map(course=>({course,health:courseHealth(course)}));
  }

  function enhancePriorityRows(){
    if(!window.StudyPlanner?.priorityRows||window.StudyPlanner.priorityRows.__automationWrapped)return;
    const base=window.StudyPlanner.priorityRows.bind(window.StudyPlanner);
    const wrapped=function(maps){
      const rows=base(maps);
      return rows.map(row=>{
        const course=typeof courseById==='function'?courseById(row.map?.courseId):null;
        const health=courseHealth(course),p=row.progress||{},reasons=[...(row.reasons||[])];
        let score=Number(row.score)||0,minutes=Number(row.minutes)||20;
        if(course?.status==='archived')score-=180;
        else if(health.status==='finished')score-=120;
        else if(health.status==='risk'){score+=24;minutes=Math.min(35,minutes+7);reasons.unshift('curso em risco');}
        else if(health.status==='attention'){score+=10;minutes=Math.min(30,minutes+4);reasons.unshift('ritmo pede atenção');}
        const last=typeof activityTimestamp==='function'?activityTimestamp(p.lastActivity):Date.parse(p.lastActivity||0)||0;
        const staleDays=last?Math.floor((Date.now()-last)/86400000):0;
        if(staleDays>=5&&Number(p.marked)>0&&Number(p.pending)>0){
          score+=Math.min(18,6+staleDays);
          reasons.unshift('parado há '+staleDays+'d');
        }
        return{...row,score,minutes,reasons:[...new Set(reasons)].slice(0,4),courseHealth:health};
      }).sort((a,b)=>b.score-a.score||b.progress.difficult-a.progress.difficult||b.progress.review-a.progress.review);
    };
    wrapped.__automationWrapped=true;
    window.StudyPlanner.priorityRows=wrapped;
    window.StudyPlanner.nextPriority=excludeKey=>wrapped().find(row=>row.key!==excludeKey&&row.courseHealth?.status!=='finished'&&row.courseHealth?.status!=='archived')||null;
  }

  function autoAgendaId(day,key){return'SA:'+day+':'+sanitize(key)}
  function availableDays(){
    const value=plannerSettings().availableDays;
    return Array.isArray(value)&&value.length?value.map(Number):[1,2,3,4,5,6];
  }
  function nextAvailableDate(start=new Date(),offset=0){
    const days=availableDays(),base=addDays(start,offset);
    for(let i=0;i<14;i++){const d=addDays(base,i);if(days.includes(d.getDay()))return d}
    return base;
  }
  function agendaData(){return window.StudyDashboard?.exportData?.()||{agenda:[],goals:{dailyMinutes:120}}}
  function replaceAgendaData(data){return window.StudyDashboard?.importData?.(data,{merge:false,silent:true})}
  function manualMinutes(data,day){
    return(data.agenda||[]).filter(row=>!row.deleted&&!row.completedAt&&row.date===day&&row.automationSource!=='smart-plan').reduce((sum,row)=>sum+Math.max(0,Number(row.minutes)||0),0);
  }
  function desiredSmartAgenda(horizonDays=8){
    const settings=plannerSettings(),maxDaily=Math.max(30,Number(settings.maxDailyMinutes)||Number(window.StudyDashboard?.goals?.().dailyMinutes)||120),daysAllowed=availableDays();
    const rows=(window.StudyPlanner?.priorityRows?.()||[]).filter(row=>{
      const course=typeof courseById==='function'?courseById(row.map?.courseId):null;
      const health=row.courseHealth||courseHealth(course);
      const p=row.progress||{};
      return course?.status!=='archived'&&health.status!=='finished'&&(Number(p.pending)>0||Number(p.difficult)>0||Number(p.review)>0||Number(row.dueTopics)>0);
    }).slice(0,14);
    const data=agendaData(),desired=[],lastScheduled=new Map(),today=startDay(new Date());
    for(let di=0;di<horizonDays;di++){
      const day=addDays(today,di);
      if(!daysAllowed.includes(day.getDay()))continue;
      const key=dateKey(day),used=manualMinutes(data,key);
      let budget=Math.max(0,maxDaily-used),count=0;
      if(budget<12)continue;
      const rotated=[...rows.slice(di%Math.max(1,rows.length)),...rows.slice(0,di%Math.max(1,rows.length))];
      for(const row of rotated){
        if(count>=3||budget<12)break;
        const lastDay=lastScheduled.get(row.key);
        if(lastDay!==undefined&&di-lastDay<2&&!row.dueTopics)continue;
        let mins=clamp(row.minutes||20,12,35);
        if(mins>budget&&budget>=12)mins=budget;
        if(mins<12)continue;
        const code=row.map?.code||'MAP',title=row.dueTopics?'Revisão · '+code:(Number(row.progress?.marked)>0?'Continuar · '+code:'Iniciar · '+code);
        desired.push({
          id:autoAgendaId(key,row.key),date:key,kind:'study',title,minutes:Math.round(mins),mapKey:row.key,courseId:row.map?.courseId||'',
          recurrence:'',autoGenerated:true,automationSource:'smart-plan',automationReason:(row.reasons||[]).slice(0,2).join(' · '),
          createdAt:nowIso(),updatedAt:nowIso()
        });
        budget-=mins;count++;lastScheduled.set(row.key,di);
      }
    }
    return desired;
  }

  function cleanupOverdueAutoRows(data){
    const today=dateKey(),now=nowIso();let changed=false;
    for(const row of data.agenda||[]){
      if(row.automationSource!=='smart-plan'||row.deleted||row.completedAt||!row.date||row.date>=today)continue;
      row.deleted=true;row.updatedAt=now;row.automationMoved=true;changed=true;
    }
    return changed;
  }

  function syncAutoAgenda({force=false}={}){
    const cfg=automationSettings();
    if(!cfg.autoAgenda||agendaSyncBusy||!window.StudyPlanner?.priorityRows||!window.StudyDashboard?.exportData)return{changed:false,created:0,updated:0,removed:0};
    const stamp=Date.now();
    if(!force&&stamp-lastMaintenanceAt<4*60*1000)return{changed:false,throttled:true};
    agendaSyncBusy=true;
    try{
      const data=agendaData(),desired=desiredSmartAgenda(),desiredBy=new Map(desired.map(row=>[row.id,row])),today=dateKey(),end=dateKey(addDays(new Date(),8)),now=nowIso();
      let changed=false,created=0,updated=0,removed=0;
      if(cfg.autoReplan&&cleanupOverdueAutoRows(data)){changed=true;removed++}
      for(const row of data.agenda||[]){
        if(row.automationSource!=='smart-plan'||row.deleted||row.completedAt||row.date<today||row.date>end)continue;
        if(!desiredBy.has(row.id)){row.deleted=true;row.updatedAt=now;changed=true;removed++;continue}
        const target=desiredBy.get(row.id);desiredBy.delete(row.id);
        if(row.minutes!==target.minutes||row.title!==target.title||row.automationReason!==target.automationReason||row.date!==target.date){
          Object.assign(row,target,{createdAt:row.createdAt||target.createdAt,updatedAt:now});changed=true;updated++;
        }
      }
      for(const row of desiredBy.values()){
        const prior=(data.agenda||[]).find(item=>item.id===row.id);
        if(prior?.deleted)continue;
        data.agenda=data.agenda||[];data.agenda.push(row);changed=true;created++;
      }
      if(changed)replaceAgendaData(data);
      lastMaintenanceAt=stamp;
      try{localStorage.setItem('studyapp.automation.lastPlan',new Date(stamp).toISOString())}catch{}
      return{changed,created,updated,removed};
    }finally{agendaSyncBusy=false}
  }

  function topicMatchScore(label,item){
    const a=tokenSet(label),b=tokenSet([item?.title,item?.label,item?.section,item?.branch,item?.mapCode].filter(Boolean).join(' '));let score=0;
    for(const word of a)if(b.has(word))score+=word.length>=8?4:2;
    return score;
  }
  function scheduleSimulationRecovery(simulationKey,payload={}){
    const cfg=automationSettings();if(!cfg.simRecovery||!simulationKey)return{topics:0,maps:0};
    const simulation=typeof simulationByKey==='function'?simulationByKey(simulationKey):null;
    const score=Math.max(0,Math.min(100,Number(payload.score)||0));
    const mistakes=Array.isArray(payload.mistakes)?payload.mistakes:[];
    const sections=payload.sections&&typeof payload.sections==='object'?payload.sections:{};
    const hasWeakness=mistakes.length>0||Object.values(sections).some(v=>(Number(v?.total)||0)>(Number(v?.correct)||0))||score<85;
    if(!hasWeakness)return{topics:0,maps:0};

    const recommendations=window.StudyCoach?.recommendations?.(simulationKey)||[];
    const maps=recommendations.map(rec=>({rec,map:typeof mapById==='function'?mapById(rec.key):null})).filter(row=>row.map).slice(0,3);
    const labels=[...mistakes.map(item=>item?.topic||item?.section).filter(Boolean),...Object.entries(sections).filter(([,v])=>(Number(v?.total)||0)>(Number(v?.correct)||0)).map(([name])=>name)];
    const uniqueLabels=[...new Set(labels)].slice(0,12);
    let topicCount=0,mapCount=0;

    if(uniqueLabels.length&&window.StudyPlanner?.exportData&&window.StudyPlanner?.importData){
      const planner=window.StudyPlanner.exportData(),topicReviews={...(planner.topicReviews||{})},items=state?.searchIndex?.items||[],due=nextAvailableDate(new Date(),1),dueAt=new Date(due.getFullYear(),due.getMonth(),due.getDate(),9).toISOString(),updatedAt=nowIso();
      for(const label of uniqueLabels){
        let best=null;
        for(const row of maps){
          const key=mapKeyOf(row.map),candidates=items.filter(item=>item.mapKey===key||String(item.mapCode||'').toLowerCase()===String(row.map.code||'').toLowerCase());
          for(const item of candidates){
            const scoreValue=topicMatchScore(label,item);
            if(!best||scoreValue>best.score)best={score:scoreValue,item,map:row.map,key};
          }
        }
        if(!best||best.score<4||!best.item?.topicId)continue;
        const reviewId=best.key+'::'+String(best.item.topicId),current=topicReviews[reviewId],currentDue=Date.parse(current?.dueAt||0)||Infinity;
        if(currentDue<=Date.parse(dueAt))continue;
        const stateValue=(typeof readMapState==='function'?(readMapState(best.map).topicStates||{})[best.item.topicId]:'')||'';
        topicReviews[reviewId]={...(current||{}),dueAt,intervalDays:1,rating:'simulation',repetitions:Number(current?.repetitions)||0,previousState:stateValue,simulationKey,source:'simulation-recovery',updatedAt};
        topicCount++;
      }
      if(topicCount)window.StudyPlanner.importData({...planner,topicReviews},{mergeData:false,silent:true});
    }

    if(maps.length&&window.StudyDashboard?.exportData&&window.StudyDashboard?.importData){
      const data=agendaData(),attemptKey=sanitize(payload.finishedAt||payload.endedAt||nowIso()),usedDates=new Set();
      for(const row of maps.slice(0,topicCount?1:2)){
        const target=nextAvailableDate(new Date(),1+usedDates.size),day=dateKey(target),id='SR:'+sanitize(simulationKey)+':'+attemptKey+':'+sanitize(mapKeyOf(row.map));
        if((data.agenda||[]).some(item=>item.id===id&&!item.deleted))continue;
        data.agenda.push({id,date:day,kind:'study',title:'Revisão pós-simulado · '+(row.map.code||'MAP'),minutes:20,mapKey:mapKeyOf(row.map),courseId:row.map.courseId||simulation?.courseId||'',recurrence:'',autoGenerated:true,automationSource:'simulation-recovery',automationReason:row.rec.reason||'Erros recentes no simulado',createdAt:nowIso(),updatedAt:nowIso()});
        usedDates.add(day);mapCount++;
      }
      if(mapCount)replaceAgendaData(data);
    }
    scheduleMaintenance(true);
    return{topics:topicCount,maps:mapCount};
  }

  function inferCourseForCandidates(candidates=[]){
    const courses=activeCourses();if(!courses.length||!candidates.length)return null;
    const existingMaps=typeof combinedMaps==='function'?combinedMaps():[];
    const scores=new Map(courses.map(course=>[course.id,0]));
    const evidence=new Map(courses.map(course=>[course.id,[]]));
    for(const candidate of candidates){
      const code=norm(candidate?.declaredCode||candidate?.code),contest=norm(candidate?.contest),board=norm(candidate?.board),title=norm(candidate?.title+' '+candidate?.shortTitle);
      if(code){
        for(const map of existingMaps){
          if(norm(map.code)!==code)continue;
          scores.set(map.courseId,(scores.get(map.courseId)||0)+28);
          evidence.get(map.courseId)?.push('sigla já existe no curso');
        }
      }
      for(const course of courses){
        let score=0;
        const hay=norm([course.title,course.subtitle,course.city,course.institution].filter(Boolean).join(' ')),courseBoard=norm(course.board);
        const courseTokens=tokenSet(hay),contestTokens=tokenSet(contest),titleTokens=tokenSet(title);
        for(const word of contestTokens)if(courseTokens.has(word))score+=word.length>=7?3:2;
        for(const word of titleTokens)if(courseTokens.has(word))score+=1;
        if(board&&courseBoard&&board===courseBoard)score+=4;
        if(contest&&hay&&(contest.includes(hay)||hay.includes(contest)))score+=6;
        if(score){scores.set(course.id,(scores.get(course.id)||0)+score);evidence.get(course.id)?.push('metadados do HTML')}
      }
    }
    const ranked=courses.map(course=>({course,score:scores.get(course.id)||0,evidence:[...new Set(evidence.get(course.id)||[])]})).sort((a,b)=>b.score-a.score);
    if(!ranked[0]||ranked[0].score<6)return null;
    if(ranked[1]&&ranked[0].score-ranked[1].score<2)return null;
    return ranked[0];
  }

  function annotateImportInference(){
    const box=document.getElementById('importPreview'),select=document.getElementById('importCourse');if(!box||!select)return;
    box.querySelector('.automation-import-note')?.remove();
    const label=select.dataset.autoCourseLabel||'';
    if(!label)return;
    const note=document.createElement('div');note.className='automation-import-note';
    note.innerHTML='<span>Curso detectado</span><b>'+esc(label)+'</b><small>Você pode alterar antes de importar.</small>';
    box.prepend(note);
  }
  function wrapImportInference(){
    if(typeof prepareImportFiles==='function'&&!prepareImportFiles.__automationWrapped){
      const base=prepareImportFiles;
      const wrapped=async function(list){
        const result=await base(list),select=document.getElementById('importCourse');
        if(automationSettings().importInference&&select&&select.dataset.userChanged!=='1'&&state?.view!=='course'){
          const match=inferCourseForCandidates(window.importCandidates||importCandidates||[]);
          if(match&&[...select.options].some(opt=>opt.value===String(match.course.id))){
            select.value=String(match.course.id);select.dataset.autoCourseLabel=match.course.title||match.course.id;
            if(typeof renderImportPreview==='function')renderImportPreview();
          }
        }
        annotateImportInference();
        return result;
      };
      wrapped.__automationWrapped=true;window.prepareImportFiles=wrapped;
    }
    if(typeof renderImportPreview==='function'&&!renderImportPreview.__automationWrapped){
      const base=renderImportPreview;
      const wrapped=function(){const result=base.apply(this,arguments);annotateImportInference();return result};
      wrapped.__automationWrapped=true;window.renderImportPreview=wrapped;
    }
    const select=document.getElementById('importCourse');
    if(select&&!select.dataset.automationBound){
      select.dataset.automationBound='1';
      select.addEventListener('change',()=>{select.dataset.userChanged='1';delete select.dataset.autoCourseLabel;annotateImportInference()});
    }
  }

  function diagnostics(){
    const issues=[],courses=typeof combinedCourses==='function'?combinedCourses():[],maps=typeof combinedMaps==='function'?combinedMaps():[],sims=typeof combinedSimulations==='function'?combinedSimulations():[];
    for(const course of courses){
      if(course.status==='archived')continue;
      const health=courseHealth(course);
      if(!parseDate(course.examDate||course.exam_date))issues.push({type:'course-date',severity:'info',label:(course.title||course.id)+' sem data da prova'});
      if(health.status==='finished')issues.push({type:'past-exam',severity:'action',label:(course.title||course.id)+' com prova já realizada'});
      if(health.status==='risk')issues.push({type:'course-risk',severity:'warn',label:(course.title||course.id)+' com ritmo em risco'});
    }
    const seen=new Map();
    for(const map of maps){
      const key=String(map.courseId||'')+'::'+String(map.code||'').toLowerCase();
      if(map.code){if(seen.has(key))issues.push({type:'duplicate-map',severity:'warn',label:'Mapa duplicado: '+(map.code||map.title)});else seen.set(key,true)}
      if(!map.version)issues.push({type:'map-version',severity:'info',label:(map.code||map.title||'Mapa')+' sem versão identificada'});
      if((Number(map.topics)||0)<=0)issues.push({type:'map-topics',severity:'warn',label:(map.code||map.title||'Mapa')+' sem tópicos identificados'});
      if(String(map.category||'Outros')==='Outros')issues.push({type:'map-category',severity:'info',label:(map.code||map.title||'Mapa')+' ainda em Outros'});
    }
    for(const sim of sims){
      if(!sim.courseId||!courses.some(course=>course.id===sim.courseId))issues.push({type:'simulation-course',severity:'info',label:(sim.title||sim.code||'Simulado')+' sem curso vinculado'});
      if((Number(sim.questions)||0)<=0)issues.push({type:'simulation-questions',severity:'info',label:(sim.title||sim.code||'Simulado')+' sem quantidade de questões'});
    }
    const due=window.StudyPlanner?.dueTopics?.()||[];
    if(due.length>=12)issues.push({type:'review-backlog',severity:'warn',label:due.length+' revisões por tópico acumuladas'});
    const overdue=(agendaData().agenda||[]).filter(row=>!row.deleted&&!row.completedAt&&row.date&&row.date<dateKey()&&row.automationSource!=='smart-plan').length;
    if(overdue)issues.push({type:'agenda-overdue',severity:'info',label:overdue+' item'+(overdue===1?'':'s')+' manual'+(overdue===1?'':'is')+' atrasado'+(overdue===1?'':'s')+' na agenda'});
    return{issues,healthy:issues.filter(item=>item.severity==='warn'||item.severity==='action').length===0,total:issues.length,warnings:issues.filter(item=>item.severity==='warn'||item.severity==='action').length};
  }

  function healthBadgeMarkup(health){
    return'<span class="course-health-badge is-'+esc(health.status)+'" title="'+esc(health.message)+'">'+esc(health.label)+'</span>';
  }
  function renderCourseCardSignals(){
    if(!automationSettings().healthSignals)return;
    document.querySelectorAll('#coursesGrid .course-card[data-course],#homeCourses .course-card[data-course]').forEach(card=>{
      card.querySelector('.course-health-badge')?.remove();
      const course=typeof courseById==='function'?courseById(card.dataset.course):null;if(!course)return;
      const host=card.querySelector('.course-card-kicker-row')||card;
      host.insertAdjacentHTML('beforeend',healthBadgeMarkup(courseHealth(course)));
    });
  }

  function formatPace(value){return value>0?(value<1?value.toFixed(1):Math.ceil(value))+' tópicos/dia':'—'}
  function renderCourseAutomation(){
    const view=document.querySelector('[data-view="course"]'),course=state?.courseId&&typeof courseById==='function'?courseById(state.courseId):null;
    if(!view||!course)return;
    let root=document.getElementById('courseAutomationPanel');
    if(!root){root=document.createElement('section');root.id='courseAutomationPanel';root.className='course-automation-panel';document.getElementById('courseProgressSummary')?.insertAdjacentElement('afterend',root)}
    const health=courseHealth(course),rows=(window.StudyPlanner?.priorityRows?.(mapsForCourse(course.id))||[]).filter(row=>row.map?.courseId===course.id&&row.courseHealth?.status!=='finished'),next=rows[0]||null,due=(window.StudyPlanner?.dueTopics?.(course.id)||[]).length,finish=health.forecast?.finishDate instanceof Date?health.forecast.finishDate:null;
    const finishLabel=finish?finish.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'—';
    const margin=health.marginDays===null?'sem prazo':(health.marginDays>=0?health.marginDays+'d de margem':Math.abs(health.marginDays)+'d após a prova');
    root.innerHTML='<div class="course-automation-head"><div><span class="kicker">Automação do curso</span><h3>'+esc(health.label)+'</h3><p>'+esc(health.message)+'</p></div>'+healthBadgeMarkup(health)+'</div>'+
      '<div class="course-automation-metrics"><div><span>Ritmo necessário</span><b>'+esc(formatPace(health.requiredTopicsPerDay))+'</b><small>ritmo recente '+esc(formatPace(health.actualTopicsPerDay))+'</small></div><div><span>Previsão</span><b>'+esc(finishLabel)+'</b><small>'+esc(margin)+'</small></div><div><span>Revisões</span><b>'+due+'</b><small>'+(due?'tópicos para revisar':'tudo em dia')+'</small></div></div>'+
      (next?'<div class="course-automation-next"><div><span>Próximo agora</span><b>'+esc(next.map.code||next.map.shortTitle||next.map.title)+'</b><small>'+esc((next.reasons||[]).slice(0,2).join(' · '))+'</small></div><strong>'+Math.round(next.minutes||20)+' min</strong><button class="primary" type="button" data-auto-study="'+esc(next.key)+'">Estudar agora</button></div>':'')+
      '<div class="course-automation-actions">'+(due?'<button class="secondary" type="button" data-auto-review>Revisar tópicos</button>':'')+'<button class="secondary" type="button" data-auto-plan>Atualizar plano</button>'+(health.status==='finished'&&automationSettings().archiveSuggestions&&typeof cloudCourseById==='function'&&cloudCourseById(course.id)?'<button class="secondary" type="button" data-auto-archive>Revisar / arquivar</button>':'')+'</div>';
    root.querySelector('[data-auto-study]')?.addEventListener('click',async e=>{const key=e.currentTarget.dataset.autoStudy,map=mapById(key);await openMap(key);if(!window.StudyDashboard?.active?.())window.StudyDashboard?.start?.({map,mode:'planned',minutes:next?.minutes||20,label:next?.map?.shortTitle||next?.map?.title||'Sessão planejada'})});
    root.querySelector('[data-auto-review]')?.addEventListener('click',()=>window.StudyPlanner?.showTopicReview?.());
    root.querySelector('[data-auto-plan]')?.addEventListener('click',()=>{const result=syncAutoAgenda({force:true});toast(result.changed?'Plano automático atualizado.':'Plano já está atualizado.')});
    root.querySelector('[data-auto-archive]')?.addEventListener('click',()=>typeof openCourseAdminFor==='function'&&openCourseAdminFor(course.id));
  }

  function renderCoursesOverview(){
    const view=document.querySelector('[data-view="courses"]');if(!view)return;
    let root=document.getElementById('courseAutomationOverview');
    if(!root){root=document.createElement('section');root.id='courseAutomationOverview';root.className='course-automation-overview';const grid=document.getElementById('coursesGrid');grid?.insertAdjacentElement('beforebegin',root)}
    const rows=courseHealthAll().filter(row=>row.course.status!=='archived'),counts={healthy:0,attention:0,risk:0,finished:0,neutral:0};
    rows.forEach(row=>counts[row.health.status]=(counts[row.health.status]||0)+1);
    root.innerHTML='<div><span class="kicker">Ritmo dos concursos</span><b>'+(counts.risk?counts.risk+' em risco':counts.attention?counts.attention+' pedem atenção':'Planejamento em dia')+'</b><small>'+rows.length+' curso'+(rows.length===1?'':'s')+' ativo'+(rows.length===1?'':'s')+'</small></div><div class="course-automation-overview-states"><span class="is-healthy">'+counts.healthy+' em dia</span><span class="is-attention">'+counts.attention+' atenção</span><span class="is-risk">'+counts.risk+' risco</span></div>';
    renderPostExamNotice(view,rows.filter(row=>row.health.status==='finished').map(row=>row.course));
  }
  function renderPostExamNotice(view,courses){
    let root=document.getElementById('coursePostExamNotice');
    if(!automationSettings().archiveSuggestions||!courses.length){root?.remove();return}
    if(!root){root=document.createElement('div');root.id='coursePostExamNotice';root.className='course-post-exam-notice';document.getElementById('courseAutomationOverview')?.insertAdjacentElement('afterend',root)}
    root.innerHTML='<div><span class="kicker">Pós-prova</span><b>'+courses.length+' curso'+(courses.length===1?'':'s')+' com prova realizada</b><small>O histórico continua preservado. Arquive apenas quando quiser retirar o curso das prioridades.</small></div><div>'+courses.slice(0,3).map(course=>'<button type="button" class="secondary" data-post-exam="'+esc(course.id)+'">'+esc(course.title||course.id)+'</button>').join('')+'</div>';
    root.querySelectorAll('[data-post-exam]').forEach(button=>button.onclick=()=>typeof openCourseAdminFor==='function'&&openCourseAdminFor(button.dataset.postExam));
  }

  function renderAutomationSettings(){
    const view=document.querySelector('[data-view="settings"]');if(!view)return;
    let root=document.getElementById('studyAutomationPanel');
    if(!root){
      root=document.createElement('section');root.id='studyAutomationPanel';root.className='panel study-automation-panel';
      const host=view.querySelector('.settings-column-secondary')||view.querySelector('.settings-layout-v3')||view;
      host.appendChild(root);
    }
    const cfg=automationSettings(),diag=diagnostics(),last=localStorage.getItem('studyapp.automation.lastPlan')||'';
    const lastLabel=last?new Date(last).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'ainda não gerado';
    const toggles=[
      ['autoAgenda','Plano diário automático','Distribui estudo nos próximos dias usando prova, progresso, DIF/REV e simulados.'],
      ['autoReplan','Redistribuir atrasos','Move somente sessões automáticas vencidas, respeitando o limite diário.'],
      ['simRecovery','Recuperação pós-simulado','Transforma erros em revisões por tópico ou sessões direcionadas.'],
      ['archiveSuggestions','Pós-prova inteligente','Sugere arquivar cursos encerrados sem apagar histórico.'],
      ['importInference','Importação inteligente','Tenta detectar automaticamente o curso de destino dos HTMLs.']
    ];
    root.innerHTML='<div class="study-automation-head"><div><span class="panel-kicker">Automação</span><h2>Meus Mapas trabalha por você</h2><p>As decisões repetitivas são recalculadas com os dados reais da sua preparação.</p></div><span class="automation-health '+(diag.healthy?'is-ok':'is-attention')+'">'+(diag.healthy?'Sistema saudável':diag.warnings+' ponto'+(diag.warnings===1?'':'s')+' de atenção')+'</span></div>'+
      '<div class="automation-toggle-grid">'+toggles.map(([key,title,desc])=>'<label><span><b>'+esc(title)+'</b><small>'+esc(desc)+'</small></span><input type="checkbox" data-automation-setting="'+key+'" '+(cfg[key]?'checked':'')+'></label>').join('')+'</div>'+
      '<div class="automation-diagnostic"><div><b>Diagnóstico de conteúdo</b><small>Plano atualizado: '+esc(lastLabel)+'</small></div>'+(diag.issues.length?'<div class="automation-issues">'+diag.issues.slice(0,8).map(item=>'<span class="is-'+esc(item.severity)+'">'+esc(item.label)+'</span>').join('')+'</div>':'<p>Nenhuma inconsistência relevante detectada em cursos, mapas, simulados ou agenda.</p>')+'<button type="button" class="secondary" data-automation-refresh>Atualizar plano e diagnóstico</button></div>';
    root.querySelectorAll('[data-automation-setting]').forEach(input=>input.onchange=()=>saveAutomationSettings({[input.dataset.automationSetting]:input.checked}));
    root.querySelector('[data-automation-refresh]')?.addEventListener('click',()=>{const result=syncAutoAgenda({force:true});renderAutomationSettings();toast(result.changed?'Plano e diagnóstico atualizados.':'Diagnóstico atualizado; o plano já estava em dia.')});
  }

  function renderAllAutomation(){
    renderCourseCardSignals();
    if(state?.view==='courses')renderCoursesOverview();
    if(state?.view==='course')renderCourseAutomation();
    if(state?.view==='settings')renderAutomationSettings();
    wrapImportInference();
  }

  function scheduleMaintenance(force=false){
    clearTimeout(maintenanceTimer);
    maintenanceTimer=setTimeout(()=>{try{syncAutoAgenda({force});renderAllAutomation()}catch(error){console.warn('Automação de estudos não pôde ser atualizada.',error)}},force?20:180);
  }

  function wrapRenderers(){
    const wrap=name=>{
      const fn=window[name];if(typeof fn!=='function'||fn.__studyAutomationWrapped)return;
      const wrapped=function(){const result=fn.apply(this,arguments);setTimeout(()=>{renderAllAutomation();scheduleMaintenance(false)},0);return result};
      wrapped.__studyAutomationWrapped=true;window[name]=wrapped;
    };
    ['renderHome','renderCoursesPage','renderCurrentMaps','renderSettings','renderProgress','renderAllMaps','renderSimulations'].forEach(wrap);
    if(typeof window.renderStudyAgenda==='function'&&!window.renderStudyAgenda.__studyAutomationWrapped){
      const fn=window.renderStudyAgenda;
      const wrapped=function(){const result=fn.apply(this,arguments);setTimeout(()=>renderAllAutomation(),0);return result};
      wrapped.__studyAutomationWrapped=true;window.renderStudyAgenda=wrapped;
    }
  }

  function wrapSimulationResult(){
    if(typeof recordSimulationResult!=='function'||recordSimulationResult.__automationWrapped)return;
    const base=recordSimulationResult;
    const wrapped=function(payload={}){
      const key=state?.simulationReaderKey||'';
      const result=base.apply(this,arguments);
      try{scheduleSimulationRecovery(key,payload)}catch(error){console.warn('Recuperação pós-simulado não pôde ser criada.',error)}
      return result;
    };
    wrapped.__automationWrapped=true;window.recordSimulationResult=wrapped;
  }

  function init(){
    enhancePriorityRows();
    wrapRenderers();
    wrapSimulationResult();
    wrapImportInference();
    renderAllAutomation();
    scheduleMaintenance(true);
    window.addEventListener('studyapp:navigation',()=>setTimeout(()=>{renderAllAutomation();scheduleMaintenance(false)},0));
    window.addEventListener('storage',event=>{if(event.key==='studyapp.studyPlanner.v1'||event.key==='studyapp.studyDashboard.v1')setTimeout(()=>{renderAllAutomation();scheduleMaintenance(false)},60)});
  }

  window.StudyAutomation={
    settings:automationSettings,
    saveSettings:saveAutomationSettings,
    courseHealth,
    courses:courseHealthAll,
    diagnostics,
    inferCourse:inferCourseForCandidates,
    syncAgenda:options=>syncAutoAgenda(options||{}),
    recoverSimulation:scheduleSimulationRecovery,
    render:renderAllAutomation,
    run:()=>{const result=syncAutoAgenda({force:true});renderAllAutomation();return result}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
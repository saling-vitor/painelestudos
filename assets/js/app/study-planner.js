'use strict';
(()=>{
  if(window.__studyPlannerV152)return;
  window.__studyPlannerV152=true;

  const DATA_KEY='studyapp.studyPlanner.v1';
  const VERSION=1;
  const DEFAULTS={
    maxDailyMinutes:120,
    availableDays:[1,2,3,4,5,6],
    priorityMode:'balanced',
    timerPosition:null,
    weeklyReviewDay:0
  };
  let dragState=null;

  const esc=value=>typeof ESC==='function'?ESC(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const nowIso=()=>new Date().toISOString();
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
  const safeJson=(value,fallback)=>{try{return JSON.parse(value)}catch{return fallback}};
  const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const dateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day};
  const startDay=value=>{const d=value instanceof Date?new Date(value):new Date(value);return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
  const addDays=(value,days)=>{const d=startDay(value);d.setDate(d.getDate()+Number(days||0));return d};
  const parseDate=value=>{if(!value)return null;if(value instanceof Date)return new Date(value);const text=String(value);const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(text);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));const d=new Date(text);return Number.isFinite(d.getTime())?d:null};
  const fmtMinutes=minutes=>{const n=Math.max(0,Math.round(Number(minutes)||0));if(n<60)return n+' min';const h=Math.floor(n/60),m=n%60;return h+'h'+(m?String(m).padStart(2,'0'):'')};
  const fmtSeconds=seconds=>typeof formatStudyDuration==='function'?formatStudyDuration(seconds):fmtMinutes((Number(seconds)||0)/60);
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
  const words=value=>new Set(norm(value).split(/\s+/).filter(word=>word.length>2));
  const mapKeyOf=map=>map?String(map._key||mapKey(map)):'';

  function normalizeData(input){
    const value=input&&typeof input==='object'?input:{};
    const settings={...DEFAULTS,...(value.settings||{})};
    settings.maxDailyMinutes=clamp(settings.maxDailyMinutes,15,1440)||120;
    settings.availableDays=Array.isArray(settings.availableDays)?settings.availableDays.map(Number).filter(n=>n>=0&&n<=6):[1,2,3,4,5,6];
    if(!settings.availableDays.length)settings.availableDays=[1,2,3,4,5,6];
    settings.priorityMode=['balanced','reviews','specific'].includes(settings.priorityMode)?settings.priorityMode:'balanced';
    const topicReviews=value.topicReviews&&typeof value.topicReviews==='object'&&!Array.isArray(value.topicReviews)?value.topicReviews:{};
    const weeklyReports=value.weeklyReports&&typeof value.weeklyReports==='object'&&!Array.isArray(value.weeklyReports)?value.weeklyReports:{};
    return{version:VERSION,updatedAt:value.updatedAt||'',settings,topicReviews:{...topicReviews},weeklyReports:{...weeklyReports}};
  }
  function read(){return normalizeData(safeJson(localStorage.getItem(DATA_KEY)||'{}',{}))}
  function write(value,{touch=true}={}){
    const data=normalizeData(value);if(touch)data.updatedAt=nowIso();
    try{localStorage.setItem(DATA_KEY,JSON.stringify(data))}catch{}
    if(touch&&typeof touchPreferences==='function')touchPreferences();
    return data;
  }
  function merge(localValue,incomingValue){
    const local=normalizeData(localValue),incoming=normalizeData(incomingValue),localTs=Date.parse(local.updatedAt||0)||0,incomingTs=Date.parse(incoming.updatedAt||0)||0;
    const mergedReviews={...local.topicReviews};
    for(const[key,row]of Object.entries(incoming.topicReviews||{})){
      const cur=mergedReviews[key],a=Date.parse(row?.updatedAt||row?.lastReviewedAt||0)||0,b=Date.parse(cur?.updatedAt||cur?.lastReviewedAt||0)||0;
      if(!cur||a>=b)mergedReviews[key]={...row};
    }
    const weeklyReports={...local.weeklyReports,...incoming.weeklyReports};
    return normalizeData({
      updatedAt:new Date(Math.max(localTs,incomingTs)||Date.now()).toISOString(),
      settings:incomingTs>localTs?incoming.settings:local.settings,
      topicReviews:mergedReviews,
      weeklyReports
    });
  }
  function importData(value,{mergeData=true,silent=true}={}){
    const next=mergeData?merge(read(),value):normalizeData(value);
    write(next,{touch:false});
    if(!silent&&typeof toast==='function')toast('Planejamento restaurado.');
    renderAll();
    return next;
  }
  function hasData(){
    const data=read();
    return!!(data.updatedAt||Object.keys(data.topicReviews).length||Object.keys(data.weeklyReports).length);
  }

  function searchTopicsForMap(map){
    const key=mapKeyOf(map),items=state?.searchIndex?.items||[];
    return items.filter(item=>item.mapKey===key||String(item.mapCode||'').toLowerCase()===String(map?.code||'').toLowerCase());
  }
  function topicTitle(map,topicId){
    const hit=searchTopicsForMap(map).find(item=>String(item.topicId)===String(topicId));
    return hit?.title||hit?.label||String(topicId).replace(/^t[-_]?/i,'Tópico ');
  }
  function topicReviewKey(mapKeyValue,topicId){return String(mapKeyValue)+'::'+String(topicId)}
  function initialTopicDelay(stateValue){if(stateValue==='difficult')return 1;if(stateValue==='review')return 3;if(stateValue==='done')return 7;return 0}
  function topicSourceDate(map){
    const raw=typeof reviewMapModifiedAt==='function'?reviewMapModifiedAt(map):'';
    const ms=typeof activityTimestamp==='function'?activityTimestamp(raw):Date.parse(raw||0)||0;
    return ms?new Date(ms):new Date();
  }
  function topicReviewRows(courseId=''){
    const data=read(),rows=[];
    for(const map of combinedMaps()){
      if(courseId&&map.courseId!==courseId)continue;
      const key=mapKeyOf(map),stateData=readMapState(map),topicStates=stateData.topicStates||{},indexed=searchTopicsForMap(map),indexedIds=new Set(indexed.map(item=>String(item.topicId)));
      const ids=new Set([...Object.keys(topicStates),...indexedIds]);
      for(const topicId of ids){
        const stateValue=topicStates[topicId]||'',stored=data.topicReviews[topicReviewKey(key,topicId)]||null,initial=initialTopicDelay(stateValue);
        if(!stored&&!initial)continue;
        const base=stored?.lastReviewedAt?new Date(stored.lastReviewedAt):topicSourceDate(map);
        const dueAt=stored?.dueAt||addDays(base,initial).toISOString();
        rows.push({
          id:topicReviewKey(key,topicId),map,mapKey:key,courseId:map.courseId,topicId,
          title:topicTitle(map,topicId),state:stateValue,stored,dueAt,
          dueMs:Date.parse(dueAt)||0,intervalDays:Number(stored?.intervalDays)||initial,
          rating:stored?.rating||'',repetitions:Number(stored?.repetitions)||0
        });
      }
    }
    return rows.sort((a,b)=>a.dueMs-b.dueMs||String(a.title).localeCompare(String(b.title),'pt-BR'));
  }
  function dueTopicRows(courseId='',at=new Date()){
    const end=new Date(at.getFullYear(),at.getMonth(),at.getDate()+1).getTime();
    return topicReviewRows(courseId).filter(row=>row.dueMs&&row.dueMs<end);
  }
  function updateMapTopicState(row,nextState){
    const map=row.map,key=mapStateStorageKey(map);if(!key)return;
    const stateData=readMapState(map),topicStates={...(stateData.topicStates||{})};
    topicStates[row.topicId]=nextState;
    stateData.topicStates=topicStates;
    const stamp=nowIso();
    try{
      localStorage.setItem(key,JSON.stringify(stateData));
      localStorage.setItem('studyapp.modified::'+key,stamp);
    }catch{}
    if(typeof touchMapActivity==='function')touchMapActivity(map,stamp);
    if(window.StudyCloud?.syncStorageKey)StudyCloud.syncStorageKey(key).catch(()=>{});
  }
  function rateTopic(reviewId,rating){
    const row=topicReviewRows().find(item=>item.id===reviewId);if(!row)return null;
    const data=read(),prev=row.stored||{},reps=Math.max(0,Number(prev.repetitions)||0);
    let interval=1,nextState='difficult',nextReps=reps;
    if(rating==='wrong'){interval=1;nextReps=0;nextState='difficult'}
    else if(rating==='hard'){interval=Math.min(21,Math.max(3,Math.round((prev.intervalDays||3)*1.35)));nextReps=reps+1;nextState='review'}
    else if(rating==='ok'){interval=Math.min(45,Math.max(7,Math.round((prev.intervalDays||4)*1.8)));nextReps=reps+1;nextState='done'}
    else if(rating==='easy'){interval=Math.min(90,Math.max(15,Math.round((prev.intervalDays||7)*2.15)));nextReps=reps+1;nextState='done'}
    else return null;
    const at=new Date(),record={
      mapKey:row.mapKey,courseId:row.courseId,topicId:row.topicId,title:row.title,
      rating,repetitions:nextReps,intervalDays:interval,lastReviewedAt:at.toISOString(),
      dueAt:addDays(at,interval).toISOString(),updatedAt:at.toISOString()
    };
    data.topicReviews[reviewId]=record;write(data);updateMapTopicState(row,nextState);
    renderAll();return record;
  }

  function latestAttempts(){
    const out=[];
    for(const sim of typeof combinedSimulations==='function'?combinedSimulations():[]){
      const attempts=typeof simulationAttemptsFor==='function'?simulationAttemptsFor(sim):[];
      for(const attempt of attempts)out.push({sim,attempt,at:Date.parse(attempt.finishedAt||0)||0});
    }
    return out.sort((a,b)=>b.at-a.at);
  }
  function mistakeItems(){
    const out=[];
    for(const{sim,attempt}of latestAttempts()){
      const mistakes=Array.isArray(attempt.mistakes)?attempt.mistakes:[];
      for(const item of mistakes){
        out.push({
          id:[sim._key||simulationKey(sim),attempt.finishedAt,item.number].join('::'),
          simulation:sim,simulationKey:sim._key||simulationKey(sim),attempt,
          number:Number(item.number)||0,section:item.section||'',topic:item.topic||item.section||'Questão',
          stem:item.stem||'',userAnswer:item.userAnswer||'',answer:item.answer||'',
          difficulty:item.difficulty||'',finishedAt:attempt.finishedAt
        });
      }
      if(!mistakes.length&&attempt.sections){
        for(const[name,value]of Object.entries(attempt.sections)){
          const total=Number(value?.total)||0,correct=Number(value?.correct)||0,wrong=Math.max(0,total-correct);
          if(!wrong)continue;
          out.push({
            id:[sim._key||simulationKey(sim),attempt.finishedAt,'section',name].join('::'),
            simulation:sim,simulationKey:sim._key||simulationKey(sim),attempt,
            number:0,section:name,topic:name,stem:'',userAnswer:'',answer:'',difficulty:'',
            finishedAt:attempt.finishedAt,aggregate:true,count:wrong
          });
        }
      }
    }
    return out;
  }
  function errorGroups(){
    const groups=new Map();
    for(const item of mistakeItems()){
      const label=item.topic||item.section||'Questões';
      const key=norm(label)||'outros',current=groups.get(key)||{key,label,count:0,items:[]};
      current.count+=item.aggregate?Number(item.count)||1:1;current.items.push(item);groups.set(key,current);
    }
    return[...groups.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'pt-BR'));
  }
  function sectionMatchScore(label,map){
    const a=words(label),b=words([map.code,map.title,map.shortTitle,map.category].filter(Boolean).join(' '));let score=0;
    for(const word of a)if(b.has(word))score+=word.length>7?4:2;
    if(norm(label).includes(norm(map.code||''))&&String(map.code||'').length>1)score+=6;
    return score;
  }
  function simulationWeaknessForMap(map){
    let score=0,labels=[];
    for(const group of errorGroups()){
      const match=sectionMatchScore(group.label,map);
      if(match>0){score+=Math.min(24,group.count*3+match);labels.push(group.label)}
    }
    for(const{attempt}of latestAttempts().slice(0,5)){
      for(const[name,value]of Object.entries(attempt.sections||{})){
        const total=Number(value?.total)||0,correct=Number(value?.correct)||0,pct=total?correct/total:1,match=sectionMatchScore(name,map);
        if(match>0&&pct<.75){score+=Math.round((.75-pct)*40)+match;labels.push(name)}
      }
    }
    return{score,labels:[...new Set(labels)].slice(0,2)};
  }

  function daysUntilExam(map){
    const course=courseById(map?.courseId),d=parseDate(course?.examDate||map?.examDate);if(!d)return null;
    return Math.ceil((startDay(d)-startDay(new Date()))/86400000);
  }
  function priorityRows(maps=combinedMaps()){
    const dueTopics=dueTopicRows(),topicCounts={};
    dueTopics.forEach(row=>topicCounts[row.mapKey]=(topicCounts[row.mapKey]||0)+1);
    const reviewSummary=typeof reviewScheduleSummary==='function'?reviewScheduleSummary(maps):{schedule:{}};
    return maps.map(map=>{
      const key=mapKeyOf(map),p=mapProgress(map),weak=simulationWeaknessForMap(map),days=daysUntilExam(map);
      const schedule=reviewSummary.schedule?.[key],due=Date.parse(schedule?.dueAt||0)||0,today=startDay(new Date()).getTime(),overdueDays=due&&due<today?Math.ceil((today-due)/86400000):0;
      const last=typeof activityTimestamp==='function'?activityTimestamp(p.lastActivity):Date.parse(p.lastActivity||0)||0,ageDays=last?Math.floor((Date.now()-last)/86400000):30;
      let score=(p.difficult||0)*12+(p.review||0)*7+(topicCounts[key]||0)*9+weak.score;
      if(overdueDays)score+=28+Math.min(25,overdueDays*3);
      else if(due&&due<today+86400000)score+=20;
      if(p.marked>0&&p.pending>0)score+=8;
      if(p.marked===0)score+=4;
      score+=Math.min(14,Math.max(0,ageDays));
      if(days!==null&&days>=0){if(days<=7)score+=18;else if(days<=14)score+=13;else if(days<=30)score+=7}
      const mode=read().settings.priorityMode;
      if(mode==='reviews')score+=(p.review||0)*6+(p.difficult||0)*7+(topicCounts[key]||0)*8;
      if(mode==='specific'&&map.category==='Arquitetura e Tecnologia')score+=14;
      const reasons=[];
      if(topicCounts[key])reasons.push(topicCounts[key]+' revisão'+(topicCounts[key]===1?'':'ões')+' por tópico');
      if(p.difficult)reasons.push(p.difficult+' DIF');
      if(p.review)reasons.push(p.review+' REV');
      if(overdueDays)reasons.push('revisão atrasada '+overdueDays+'d');
      if(weak.score)reasons.push('erros em simulados');
      if(days!==null&&days>=0&&days<=30)reasons.push('prova em '+days+'d');
      if(!reasons.length&&p.pending)reasons.push('conteúdo pendente');
      const minutes=topicCounts[key]?Math.min(25,10+topicCounts[key]*3):p.difficult?25:p.review?20:p.pending?20:15;
      return{map,key,progress:p,score,reasons,minutes,dueTopics:topicCounts[key]||0,weakness:weak,daysUntilExam:days};
    }).sort((a,b)=>b.score-a.score||b.progress.difficult-a.progress.difficult||b.progress.review-a.progress.review);
  }
  function nextPriority(excludeKey=''){return priorityRows().find(row=>row.key!==excludeKey)||null}
  function buildTimePlan(minutes){
    let remaining=Math.max(10,Number(minutes)||30),rows=priorityRows(),items=[];
    const due=dueTopicRows();
    if(due.length&&remaining>=10){
      const group=new Map();
      for(const row of due){const arr=group.get(row.mapKey)||[];arr.push(row);group.set(row.mapKey,arr)}
      for(const row of rows){
        const topics=group.get(row.key)||[];if(!topics.length||remaining<10)continue;
        const use=Math.min(remaining,Math.min(20,8+topics.length*3));items.push({kind:'review',map:row.map,key:row.key,minutes:use,title:'Revisar '+(row.map.code||row.map.shortTitle),reason:topics.length+' tópico'+(topics.length===1?'':'s')+' vencido'+(topics.length===1?'':'s')});remaining-=use;if(remaining<10)break;
      }
    }
    for(const row of rows){
      if(remaining<10||items.some(item=>item.key===row.key&&item.kind!=='review'))continue;
      const use=Math.min(remaining,Math.max(10,Math.min(row.minutes,remaining)));items.push({kind:'map',map:row.map,key:row.key,minutes:use,title:row.map.shortTitle||row.map.title||row.map.code,reason:row.reasons.slice(0,2).join(' · ')});remaining-=use;
    }
    return{requested:Number(minutes)||30,planned:(Number(minutes)||30)-remaining,remaining,items};
  }

  function studyTimeDays(){
    const out={};const payload=window.StudyTime?.read?.()||{devices:{}};
    for(const device of Object.values(payload.devices||{}))for(const[key,value]of Object.entries(device.days||{}))out[key]=(out[key]||0)+(Number(value)||0);
    return out;
  }
  function studyTimeMaps(){
    const out={};const payload=window.StudyTime?.read?.()||{devices:{}};
    for(const device of Object.values(payload.devices||{}))for(const[key,value]of Object.entries(device.maps||{}))out[key]=(out[key]||0)+(Number(value)||0);
    return out;
  }
  function forecast(courseId='',dailyMinutes=null){
    const maps=combinedMaps().filter(map=>!courseId||map.courseId===courseId),progress=aggregateProgress(maps),seconds=Object.entries(studyTimeMaps()).filter(([key])=>maps.some(map=>mapKeyOf(map)===key)).reduce((sum,[,value])=>sum+Number(value||0),0);
    const marked=Math.max(1,progress.marked),secondsPerTopic=seconds>0?seconds/marked:12*60,remainingTopics=Math.max(0,progress.total-progress.marked),remainingSeconds=Math.round(remainingTopics*secondsPerTopic),goal=Math.max(15,Number(dailyMinutes)||Number(window.StudyDashboard?.goals?.().dailyMinutes)||120),days=Math.ceil(remainingSeconds/(goal*60)),finish=addDays(new Date(),days);
    const course=courseId?courseById(courseId):null,exam=parseDate(course?.examDate),margin=exam?Math.floor((startDay(exam)-startDay(finish))/86400000):null;
    return{courseId,total:progress.total,marked:progress.marked,remainingTopics,secondsPerTopic,remainingSeconds,dailyMinutes:goal,days,finishDate:finish,examDate:exam,marginDays:margin};
  }

  function weekStart(value=new Date()){
    const d=startDay(value),offset=(d.getDay()+6)%7;return addDays(d,-offset);
  }
  function weeklySnapshot(value=new Date()){
    const start=weekStart(value),end=addDays(start,7),prevStart=addDays(start,-7),days=studyTimeDays();
    let seconds=0,prevSeconds=0;
    for(let i=0;i<7;i++){seconds+=Number(days[dateKey(addDays(start,i))]||0);prevSeconds+=Number(days[dateKey(addDays(prevStart,i))]||0)}
    const sessions=(window.StudyDashboard?.exportData?.().sessions||[]).filter(row=>{const t=Date.parse(row.startedAt||0)||0;return t>=start.getTime()&&t<end.getTime()});
    const attempts=latestAttempts().filter(row=>row.at>=start.getTime()&&row.at<end.getTime());
    const ratings=Object.values(read().topicReviews).filter(row=>{const t=Date.parse(row.lastReviewedAt||0)||0;return t>=start.getTime()&&t<end.getTime()});
    const progress=statProgress(),delta=seconds-prevSeconds,avgScore=attempts.length?Math.round(attempts.reduce((sum,row)=>sum+(Number(row.attempt.score)||0),0)/attempts.length):null;
    return{weekKey:dateKey(start),start,end,seconds,prevSeconds,delta,sessions:sessions.length,attempts:attempts.length,avgScore,ratings:ratings.length,difficult:progress.difficult,review:progress.review,marked:progress.marked,total:progress.total,dueTopics:dueTopicRows().length};
  }
  function saveWeeklySnapshot(snapshot=weeklySnapshot()){
    const data=read();data.weeklyReports[snapshot.weekKey]={...snapshot,start:snapshot.start.toISOString(),end:snapshot.end.toISOString(),savedAt:nowIso()};write(data);return snapshot;
  }

  function agendaData(){return window.StudyDashboard?.exportData?.()||{agenda:[],goals:{}}}
  function replaceAgendaData(data){return window.StudyDashboard?.importData?.(data,{merge:false,silent:true})}
  function rescheduleAgendaItem(id,newDate){
    const data=agendaData(),row=data.agenda?.find(item=>item.id===id);if(!row)return false;
    row.date=newDate;row.updatedAt=nowIso();replaceAgendaData(data);if(typeof toast==='function')toast('Sessão movida para '+new Date(newDate+'T12:00:00').toLocaleDateString('pt-BR'));return true;
  }
  function availableDateCandidates(start=new Date(),count=14){
    const settings=read().settings,out=[];
    for(let i=0;i<count;i++){const d=addDays(start,i);if(settings.availableDays.includes(d.getDay()))out.push(d)}
    return out;
  }
  function dailyPlannedMinutes(date,agenda){
    const key=dateKey(date);return(agenda||[]).filter(item=>!item.deleted&&item.date===key).reduce((sum,item)=>sum+(Number(item.minutes)||0),0);
  }
  function replanWeek(mode='balanced'){
    const data=agendaData(),agenda=data.agenda||[],today=startDay(new Date()),end=addDays(weekStart(today),7),settings=read().settings,max=settings.maxDailyMinutes||120;
    const movable=agenda.filter(item=>!item.deleted&&!item.completed&&(item.kind==='study'||item.kind==='simulation')&&parseDate(item.date)&&parseDate(item.date)<today);
    const future=availableDateCandidates(today,14).filter(d=>d<end||movable.length>3);
    if(!movable.length)return{moved:0,minutes:0};
    if(mode==='reviews')movable.sort((a,b)=>(String(b.title).match(/revis/i)?1:0)-(String(a.title).match(/revis/i)?1:0));
    if(mode==='specific')movable.sort((a,b)=>(String(b.title).match(/TEP|DCAS|EPF|GCO/i)?1:0)-(String(a.title).match(/TEP|DCAS|EPF|GCO/i)?1:0));
    let moved=0,minutes=0;
    for(const item of movable){
      const mins=Math.max(10,Number(item.minutes)||20);
      let target=future.find(d=>dailyPlannedMinutes(d,agenda)+mins<=max);
      if(!target)target=future[future.length-1]||today;
      if(mode==='light'&&dateKey(target)===dateKey(today)){const later=future.find(d=>dateKey(d)!==dateKey(today)&&dailyPlannedMinutes(d,agenda)+mins<=max);if(later)target=later}
      item.date=dateKey(target);item.updatedAt=nowIso();moved++;minutes+=mins;
    }
    replaceAgendaData(data);if(typeof toast==='function')toast(moved+' item'+(moved===1?'':'s')+' redistribuído'+(moved===1?'':'s')+'.');return{moved,minutes};
  }
  function recurrenceDates(start,rule){
    const first=parseDate(start)||new Date(),out=[first];
    if(rule==='none'||!rule)return out;
    if(rule==='weekly'){for(let i=1;i<8;i++)out.push(addDays(first,i*7));return out}
    if(rule==='weekdays'){
      let d=first;while(out.length<20){d=addDays(d,1);if(d.getDay()>=1&&d.getDay()<=5)out.push(d)}return out;
    }
    if(rule==='daily'){for(let i=1;i<14;i++)out.push(addDays(first,i));return out}
    return out;
  }
  function addRecurringAgenda(payload,rule){
    const dates=recurrenceDates(payload.date,rule),created=[];
    for(const d of dates)created.push(window.StudyDashboard?.addAgenda?.({...payload,date:dateKey(d),recurrence:rule})||null);
    return created.filter(Boolean);
  }
  function exportAgendaIcs(){
    const dashboard=agendaData(),manual=(dashboard.agenda||[]).filter(item=>!item.deleted),topics=dueTopicRows().slice(0,100).map(row=>({id:'topic-'+row.id,date:dateKey(row.dueAt),title:'Revisão · '+(row.map.code||'MAP')+' · '+row.title,kind:'review'})),exams=combinedCourses().map(course=>({id:'exam-'+course.id,date:dateKey(parseDate(course.examDate)||new Date()),title:'Prova · '+course.title,kind:'exam'})).filter(item=>item.date);
    const events=[...manual,...topics,...exams],stamp=nowIso().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const clean=value=>String(value||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Meus Mapas//Agenda de Estudos//PT-BR','CALSCALE:GREGORIAN'];
    for(const item of events){
      const d=String(item.date||'').replace(/-/g,'');if(!/^\d{8}$/.test(d))continue;
      lines.push('BEGIN:VEVENT','UID:'+clean(item.id||uid('study'))+'@meus-mapas','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+d,'SUMMARY:'+clean(item.title||'Estudo'),'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const blob=new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='meus-mapas-agenda.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function makeModal(id,className='planner-modal'){
    let root=document.getElementById(id);if(root)return root;
    root=document.createElement('div');root.id=id;root.className=className;root.hidden=true;document.body.appendChild(root);return root;
  }
  function closePlannerModal(id){const el=document.getElementById(id);if(el)el.hidden=true}
  function showTimePlan(minutes=30){
    const plan=buildTimePlan(minutes),modal=makeModal('studyTimePlanModal');
    modal.innerHTML='<div class="planner-modal-card"><div class="planner-modal-head"><div><span class="kicker">Tenho '+plan.requested+' minutos</span><h2>Sessão sugerida</h2><p>'+plan.planned+' min planejados com base nas prioridades atuais.</p></div><button type="button" data-planner-close>×</button></div><div class="planner-sequence">'+plan.items.map((item,index)=>'<article><span>'+(index+1)+'</span><div><b>'+esc(item.title)+'</b><small>'+esc(item.reason)+'</small></div><strong>'+item.minutes+' min</strong></article>').join('')+'</div><div class="planner-modal-actions"><button class="secondary" type="button" data-planner-close>Cancelar</button><button class="primary" type="button" data-timeplan-start '+(!plan.items.length?'disabled':'')+'>Começar primeira sessão</button></div></div>';
    modal.hidden=false;modal.querySelectorAll('[data-planner-close]').forEach(b=>b.onclick=()=>modal.hidden=true);
    modal.querySelector('[data-timeplan-start]').onclick=async()=>{const item=plan.items[0];if(!item)return;modal.hidden=true;await openMap(item.key);window.StudyDashboard?.start?.({map:item.map,mode:'planned',minutes:item.minutes,label:item.title})};
  }
  function showTopicReview(){
    const due=dueTopicRows(),modal=makeModal('topicReviewModal');
    modal.innerHTML='<div class="planner-modal-card topic-review-card"><div class="planner-modal-head"><div><span class="kicker">Revisão espaçada</span><h2>Revisões por tópico</h2><p>'+due.length+' tópico'+(due.length===1?'':'s')+' para revisar agora.</p></div><button type="button" data-planner-close>×</button></div><div class="topic-review-list">'+(due.length?due.slice(0,30).map(row=>'<article data-topic-review="'+esc(row.id)+'"><div class="topic-review-copy"><span>'+esc(row.map.code||'MAP')+'</span><b>'+esc(row.title)+'</b><small>'+esc(row.state==='difficult'?'Marcado DIF':row.state==='review'?'Marcado REV':'Revisão programada')+'</small></div><button class="secondary" type="button" data-topic-open="'+esc(row.id)+'">Abrir</button><div class="topic-rating"><button type="button" data-topic-rate="wrong">Errei</button><button type="button" data-topic-rate="hard">Difícil</button><button type="button" data-topic-rate="ok">OK</button><button type="button" data-topic-rate="easy">Fácil</button></div></article>').join(''):'<div class="empty">Nenhuma revisão por tópico está vencida.</div>')+'</div></div>';
    modal.hidden=false;modal.querySelector('[data-planner-close]').onclick=()=>modal.hidden=true;
    modal.querySelectorAll('[data-topic-open]').forEach(button=>button.onclick=()=>{const row=due.find(x=>x.id===button.dataset.topicOpen);if(row)openMap(row.mapKey,{topicId:row.topicId})});
    modal.querySelectorAll('[data-topic-rate]').forEach(button=>button.onclick=()=>{const article=button.closest('[data-topic-review]'),id=article?.dataset.topicReview;if(!id)return;rateTopic(id,button.dataset.topicRate);article.remove();const left=modal.querySelectorAll('[data-topic-review]').length;modal.querySelector('.planner-modal-head p').textContent=left+' tópico'+(left===1?'':'s')+' para revisar agora.'});
  }
  function showSessionSummary(record){
    if(!record)return;
    const modal=makeModal('sessionSummaryModal'),map=record.mapKey?mapById(record.mapKey):null,start=record.startProgress||{},end=map?mapProgress(map):{},delta={done:Math.max(0,(end.done||0)-(start.done||0)),review:Math.max(0,(end.review||0)-(start.review||0)),difficult:Math.max(0,(end.difficult||0)-(start.difficult||0)),marked:Math.max(0,(end.marked||0)-(start.marked||0))},data=window.StudyDashboard?.exportData?.()||{},recentDoubts=(data.doubts||[]).filter(d=>Date.parse(d.createdAt||0)>=Date.parse(record.startedAt||0)).length;
    modal.innerHTML='<div class="planner-modal-card session-summary-card"><div class="planner-modal-head"><div><span class="kicker">Sessão concluída</span><h2>'+esc(record.label||map?.shortTitle||'Estudo')+'</h2><p>'+esc(fmtSeconds(record.durationSeconds))+' de estudo registrado.</p></div><button type="button" data-planner-close>×</button></div><div class="session-summary-metrics"><div><b>'+delta.marked+'</b><span>tópicos trabalhados</span></div><div><b>'+delta.done+'</b><span>OK</span></div><div><b>'+delta.review+'</b><span>REV</span></div><div><b>'+delta.difficult+'</b><span>DIF</span></div><div><b>'+recentDoubts+'</b><span>dúvidas</span></div></div><div class="planner-modal-actions"><button class="secondary" type="button" data-session-more>+10 min</button><button class="secondary" type="button" data-session-next>Próxima sessão</button><button class="primary" type="button" data-planner-close>Concluir</button></div></div>';
    modal.hidden=false;modal.querySelectorAll('[data-planner-close]').forEach(b=>b.onclick=()=>modal.hidden=true);
    modal.querySelector('[data-session-more]').onclick=async()=>{modal.hidden=true;if(map)await openMap(record.mapKey);window.StudyDashboard?.start?.({map,mode:'planned',minutes:10,label:record.label||'Continuação'})};
    modal.querySelector('[data-session-next]').onclick=async()=>{modal.hidden=true;const next=nextPriority(record.mapKey);if(!next)return toast('Nenhuma próxima prioridade encontrada.');await openMap(next.key);window.StudyDashboard?.start?.({map:next.map,mode:'planned',minutes:next.minutes,label:next.map.shortTitle||next.map.title})};
  }

  function showWeeklyReview(){
    const s=weeklySnapshot(),modal=makeModal('weeklyReviewModal'),pct=s.total?Math.round(s.marked/s.total*100):0,trend=s.delta===0?'igual à semana anterior':(s.delta>0?'+'+fmtSeconds(s.delta)+' vs. semana anterior':'-'+fmtSeconds(Math.abs(s.delta))+' vs. semana anterior');
    saveWeeklySnapshot(s);
    modal.innerHTML='<div class="planner-modal-card weekly-review-card"><div class="planner-modal-head"><div><span class="kicker">Revisão semanal</span><h2>'+s.start.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+' — '+addDays(s.end,-1).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+'</h2><p>'+esc(trend)+'</p></div><button type="button" data-planner-close>×</button></div><div class="weekly-review-metrics"><div><b>'+esc(fmtSeconds(s.seconds))+'</b><span>tempo estudado</span></div><div><b>'+s.sessions+'</b><span>sessões</span></div><div><b>'+s.ratings+'</b><span>revisões de tópico</span></div><div><b>'+s.attempts+'</b><span>simulados</span></div><div><b>'+(s.avgScore===null?'—':s.avgScore+'%')+'</b><span>média simulados</span></div><div><b>'+pct+'%</b><span>cobertura geral</span></div></div><div class="weekly-review-next"><b>Próxima semana</b><p>'+esc(s.dueTopics?('Comece pelas '+s.dueTopics+' revisões por tópico vencidas e pelos mapas com DIF/REV.'):'Mantenha o ritmo e avance nos mapas ainda pendentes.')+'</p><button class="primary" type="button" data-week-replan>Replanejar minha semana</button></div></div>';
    modal.hidden=false;modal.querySelector('[data-planner-close]').onclick=()=>modal.hidden=true;modal.querySelector('[data-week-replan]').onclick=()=>{modal.hidden=true;showReplanModal()};
  }
  function showReplanModal(){
    const modal=makeModal('replanModal');
    modal.innerHTML='<div class="planner-modal-card replan-card"><div class="planner-modal-head"><div><span class="kicker">Agenda adaptativa</span><h2>Replanejar minha semana</h2><p>Redistribui sessões atrasadas respeitando sua carga diária máxima.</p></div><button type="button" data-planner-close>×</button></div><div class="replan-options"><button type="button" data-replan="balanced"><b>Equilibrado</b><span>Distribui a carga entre os próximos dias.</span></button><button type="button" data-replan="light"><b>Manter hoje leve</b><span>Evita concentrar atrasos no dia atual.</span></button><button type="button" data-replan="reviews"><b>Priorizar revisões</b><span>Move primeiro sessões relacionadas à revisão.</span></button><button type="button" data-replan="specific"><b>Priorizar específicos</b><span>Favorece mapas técnicos/específicos.</span></button></div></div>';
    modal.hidden=false;modal.querySelector('[data-planner-close]').onclick=()=>modal.hidden=true;modal.querySelectorAll('[data-replan]').forEach(button=>button.onclick=()=>{const result=replanWeek(button.dataset.replan);modal.hidden=true;if(!result.moved)toast('Não há sessões atrasadas para redistribuir.')});
  }

  window.StudyPlanner={
    exportData:()=>read(),importData,mergeData:merge,hasData,
    topicReviews:topicReviewRows,dueTopics:dueTopicRows,rateTopic,showTopicReview,
    priorityRows,nextPriority,buildTimePlan,showTimePlan,forecast,
    mistakes:mistakeItems,errorGroups,
    weeklySnapshot,showWeeklyReview,
    replanWeek,showReplanModal,rescheduleAgendaItem,addRecurringAgenda,exportAgendaIcs,
    showSessionSummary,
    settings:()=>({...read().settings}),
    saveSettings:patch=>{const data=read();data.settings={...data.settings,...patch};write(data);renderAll();return data.settings}
  };
})();

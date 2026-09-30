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
  let dragState=null,agendaPointerDrag=null,agendaHoldTimer=0;

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
    const courseTotals={};
    for(const item of maps){const course=item.courseId||'',cat=item.category||'Outros';courseTotals[course]||={total:0,cats:{}};const n=Math.max(1,Number(item.topics)||1);courseTotals[course].total+=n;courseTotals[course].cats[cat]=(courseTotals[course].cats[cat]||0)+n}
    return maps.map(map=>{
      const key=mapKeyOf(map),p=mapProgress(map),weak=simulationWeaknessForMap(map),days=daysUntilExam(map),courseWeight=courseTotals[map.courseId||'']||{total:1,cats:{}},categoryShare=(courseWeight.cats[map.category||'Outros']||0)/Math.max(1,courseWeight.total);
      const schedule=reviewSummary.schedule?.[key],due=Date.parse(schedule?.dueAt||0)||0,today=startDay(new Date()).getTime(),overdueDays=due&&due<today?Math.ceil((today-due)/86400000):0;
      const last=typeof activityTimestamp==='function'?activityTimestamp(p.lastActivity):Date.parse(p.lastActivity||0)||0,ageDays=last?Math.floor((Date.now()-last)/86400000):30;
      let score=(p.difficult||0)*12+(p.review||0)*7+(topicCounts[key]||0)*9+weak.score+Math.round(categoryShare*12);
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
      if(categoryShare>=.28)reasons.push('peso alto no conteúdo');if(!reasons.length&&p.pending)reasons.push('conteúdo pendente');
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
    const movable=agenda.filter(item=>!item.deleted&&!item.completedAt&&(item.kind==='study'||item.kind==='simulation')&&parseDate(item.date)&&parseDate(item.date)<today);
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
  function completeAgendaItem(id){
    if(!id)return false;const data=agendaData(),row=data.agenda?.find(item=>item.id===id);if(!row)return false;row.completedAt=nowIso();row.updatedAt=nowIso();replaceAgendaData(data);return true;
  }
  async function startAgendaItem(id){
    const data=agendaData(),item=data.agenda?.find(row=>row.id===id&&!row.deleted);if(!item)return false;
    const map=item.mapKey?mapById(item.mapKey):null;
    if(map)await openMap(item.mapKey);
    window.StudyDashboard?.start?.({map,general:!map,mode:'planned',minutes:Number(item.minutes)||20,label:item.title||'Sessão planejada',agendaId:item.id});
    return true;
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
    const dashboard=agendaData(),manual=(dashboard.agenda||[]).filter(item=>!item.deleted),topics=dueTopicRows().slice(0,100).map(row=>({id:'topic-'+row.id,date:dateKey(row.dueAt),title:'Revisão · '+(row.map.code||'MAP')+' · '+row.title,kind:'review'})),exams=combinedCourses().map(course=>{const d=parseDate(course.examDate);return d?{id:'exam-'+course.id,date:dateKey(d),title:'Prova · '+course.title,kind:'exam'}:null}).filter(Boolean);
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
    modal.querySelector('[data-session-more]').onclick=async()=>{modal.hidden=true;if(map)await openMap(record.mapKey);window.StudyDashboard?.start?.({map,general:!map,mode:'planned',minutes:10,label:record.label||'Continuação'})};
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
    replanWeek,showReplanModal,rescheduleAgendaItem,completeAgendaItem,startAgendaItem,addRecurringAgenda,exportAgendaIcs,
    showSessionSummary,
    settings:()=>({...read().settings}),
    saveSettings:patch=>{const data=read();data.settings={...data.settings,...patch};write(data);renderAll();return data.settings}
  };

  function topicStatus(map,topicId){
    const stateValue=(readMapState(map).topicStates||{})[topicId]||'';
    const review=read().topicReviews[topicReviewKey(mapKeyOf(map),topicId)];
    const due=Date.parse(review?.dueAt||0)||0;
    if(due&&due<new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+1).getTime())return{key:'due',label:'Revisar'};
    if(stateValue==='done')return{key:'done',label:'OK'};
    if(stateValue==='review')return{key:'review',label:'REV'};
    if(stateValue==='difficult')return{key:'difficult',label:'DIF'};
    return{key:'pending',label:'Pendente'};
  }
  function mapMatrixTopics(map){
    const indexed=searchTopicsForMap(map),stateData=readMapState(map),ids=new Set([...indexed.map(item=>String(item.topicId)),...Object.keys(stateData.topicStates||{})]);
    return[...ids].map(id=>{const hit=indexed.find(item=>String(item.topicId)===String(id));return{id,title:hit?.title||topicTitle(map,id),status:topicStatus(map,id)}}).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  }
  function domainEstimate(map){
    const p=mapProgress(map),total=Math.max(1,p.total),score=(p.done||0)+(p.review||0)*.62+(p.difficult||0)*.25;
    return Math.max(0,Math.min(100,Math.round(score/total*100)));
  }
  function ensureMatrixView(){
    let view=document.querySelector('[data-view="matrix"]');if(view)return view;
    view=document.createElement('section');view.className='view planner-matrix-view';view.dataset.view='matrix';
    view.innerHTML='<div class="section-head planner-page-head"><div><div class="kicker">Cobertura</div><h2>Matriz do edital</h2><p>Conteúdos dos mapas organizados por situação de estudo e revisão.</p></div><div class="planner-page-actions"><select id="matrixCourseSelect" aria-label="Curso"></select><button type="button" class="secondary" data-matrix-errors>Caderno de erros</button></div></div><div id="matrixSummary"></div><div class="matrix-filters" id="matrixFilters"><button class="active" data-matrix-filter="all">Todos</button><button data-matrix-filter="pending">Pendentes</button><button data-matrix-filter="difficult">DIF</button><button data-matrix-filter="review">REV</button><button data-matrix-filter="due">Revisar</button><button data-matrix-filter="done">OK</button></div><div id="matrixMaps" class="matrix-map-stack"></div>';
    document.querySelector('.content')?.appendChild(view);
    view.querySelector('[data-matrix-errors]').onclick=()=>nav('errors');
    view.querySelector('#matrixCourseSelect').onchange=()=>renderMatrix();
    view.querySelectorAll('[data-matrix-filter]').forEach(button=>button.onclick=()=>{view.querySelectorAll('[data-matrix-filter]').forEach(b=>b.classList.toggle('active',b===button));view.dataset.matrixFilter=button.dataset.matrixFilter;renderMatrix()});
    return view;
  }
  function renderMatrix(){
    const view=ensureMatrixView(),select=view.querySelector('#matrixCourseSelect'),courses=combinedCourses(),current=select.value||state.courseId||courses[0]?.id||'';
    select.innerHTML=courses.map(course=>'<option value="'+esc(course.id)+'"'+(course.id===current?' selected':'')+'>'+esc(course.title)+'</option>').join('');
    const courseId=select.value||current,maps=combinedMaps().filter(map=>map.courseId===courseId),progress=aggregateProgress(maps),mastery=maps.length?Math.round(maps.reduce((sum,map)=>sum+domainEstimate(map),0)/maps.length):0,fc=forecast(courseId),filter=view.dataset.matrixFilter||'all';
    view.querySelector('#matrixSummary').innerHTML='<div class="matrix-summary-grid"><article><span>Cobertura</span><b>'+formatProgressPercent(progress)+'</b><small>'+progress.marked+' / '+progress.total+' tópicos</small></article><article><span>Domínio estimado</span><b>'+mastery+'%</b><small>OK + REV + DIF ponderados</small></article><article><span>Pendentes</span><b>'+progress.pending+'</b><small>tópicos ainda não marcados</small></article><article><span>Previsão</span><b>'+esc(fc.finishDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}))+'</b><small>'+esc(fmtSeconds(fc.remainingSeconds))+' estimadas</small></article></div><div class="forecast-scenarios"><span>Simular ritmo:</span>'+[60,120,180].map(min=>{const x=forecast(courseId,min);return'<button type="button" data-forecast-min="'+min+'"><b>'+fmtMinutes(min)+'/dia</b><small>'+esc(x.finishDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}))+(x.marginDays!==null?' · '+(x.marginDays>=0?x.marginDays+'d de margem':Math.abs(x.marginDays)+'d após a prova'):'')+'</small></button>'}).join('')+'</div>';
    view.querySelector('#matrixMaps').innerHTML=maps.map(map=>{
      const topics=mapMatrixTopics(map),visible=filter==='all'?topics:topics.filter(topic=>topic.status.key===filter),p=mapProgress(map),due=dueTopicRows(map.courseId).filter(row=>row.mapKey===mapKeyOf(map)).length;
      if(filter!=='all'&&!visible.length)return'';
      return'<article class="matrix-map"><div class="matrix-map-head"><div><span class="map-code compact-code">'+esc(map.code||'MAP')+'</span><div><b>'+esc(map.title||map.shortTitle)+'</b><small>'+formatProgressPercent(p)+' coberto · domínio '+domainEstimate(map)+'%'+(due?' · '+due+' revisões vencidas':'')+'</small></div></div><button type="button" class="secondary" data-matrix-open-map="'+esc(mapKeyOf(map))+'">Abrir mapa</button></div><div class="matrix-topic-list">'+(visible.length?visible.map(topic=>'<button type="button" class="matrix-topic '+topic.status.key+'" data-matrix-topic-map="'+esc(mapKeyOf(map))+'" data-matrix-topic-id="'+esc(topic.id)+'"><span>'+esc(topic.title)+'</span><b>'+esc(topic.status.label)+'</b></button>').join(''):'<div class="empty compact">Nenhum tópico catalogado neste mapa.</div>')+'</div></article>';
    }).join('')||'<div class="empty">Nenhum conteúdo corresponde ao filtro.</div>';
    view.querySelectorAll('[data-matrix-open-map]').forEach(button=>button.onclick=()=>openMap(button.dataset.matrixOpenMap));
    view.querySelectorAll('[data-matrix-topic-map]').forEach(button=>button.onclick=()=>openMap(button.dataset.matrixTopicMap,{topicId:button.dataset.matrixTopicId}));
  }

  function bestMapForError(label,courseId=''){
    return combinedMaps().filter(map=>!courseId||map.courseId===courseId).map(map=>({map,score:sectionMatchScore(label,map)})).sort((a,b)=>b.score-a.score)[0]?.map||null;
  }
  function ensureErrorsView(){
    let view=document.querySelector('[data-view="errors"]');if(view)return view;
    view=document.createElement('section');view.className='view planner-errors-view';view.dataset.view='errors';
    view.innerHTML='<div class="section-head planner-page-head"><div><div class="kicker">Simulados</div><h2>Caderno de erros</h2><p>Erros recentes agrupados por assunto para orientar o próximo estudo.</p></div><div class="planner-page-actions"><button type="button" class="secondary" data-errors-matrix>Matriz do edital</button><button type="button" class="primary" data-errors-simulations>Fazer simulado</button></div></div><div id="errorNotebookSummary"></div><div id="errorNotebookList" class="error-notebook-list"></div>';
    document.querySelector('.content')?.appendChild(view);
    view.querySelector('[data-errors-matrix]').onclick=()=>nav('matrix');view.querySelector('[data-errors-simulations]').onclick=()=>nav('simulations');
    return view;
  }
  function renderErrors(){
    const view=ensureErrorsView(),groups=errorGroups(),items=mistakeItems(),total=groups.reduce((sum,g)=>sum+g.count,0);
    view.querySelector('#errorNotebookSummary').innerHTML='<div class="error-summary-grid"><article><span>Erros registrados</span><b>'+total+'</b><small>'+items.length+' registros/tentativas</small></article><article><span>Assuntos recorrentes</span><b>'+groups.length+'</b><small>agrupamentos detectados</small></article><article><span>Maior concentração</span><b>'+esc(groups[0]?.label||'—')+'</b><small>'+(groups[0]?.count||0)+' erro'+((groups[0]?.count||0)===1?'':'s')+'</small></article></div>';
    view.querySelector('#errorNotebookList').innerHTML=groups.length?groups.map(group=>{
      const sample=group.items[0],map=bestMapForError(group.label,sample?.simulation?.courseId),recent=group.items.slice(0,8);
      return'<article class="error-group"><div class="error-group-head"><div><span>'+group.count+' erro'+(group.count===1?'':'s')+'</span><h3>'+esc(group.label)+'</h3></div><div>'+((map)?'<button type="button" class="secondary" data-error-map="'+esc(mapKeyOf(map))+'">Reestudar '+esc(map.code||'mapa')+'</button>':'')+'</div></div><div class="error-items">'+recent.map(item=>'<button type="button" data-error-sim="'+esc(item.simulationKey)+'"><span>'+(item.number?'Q'+item.number:'Bloco')+'</span><div><b>'+esc(item.stem||item.section||item.topic)+'</b><small>'+esc([item.simulation?.title,item.userAnswer?'Sua resposta '+item.userAnswer:'',item.answer?'Gabarito '+item.answer:''].filter(Boolean).join(' · '))+'</small></div></button>').join('')+'</div></article>';
    }).join(''):'<div class="empty">Finalize simulados para montar automaticamente seu caderno de erros.</div>';
    view.querySelectorAll('[data-error-map]').forEach(button=>button.onclick=()=>openMap(button.dataset.errorMap));
    view.querySelectorAll('[data-error-sim]').forEach(button=>button.onclick=()=>openSimulation(button.dataset.errorSim));
  }

  function renderHomeIntelligence(){
    const root=document.getElementById('homeStudyDashboard');if(!root)return;
    let panel=root.querySelector('.study-intelligence-row');if(!panel){panel=document.createElement('div');panel.className='study-intelligence-row';root.appendChild(panel)}
    const top=priorityRows()[0],courseId=top?.map?.courseId||combinedCourses()[0]?.id||'',fc=forecast(courseId),due=dueTopicRows().length;
    panel.innerHTML='<article class="study-now-card"><span class="kicker">Tenho tempo agora</span><h3>Montar sessão rápida</h3><div class="study-now-buttons">'+[15,30,60,120].map(min=>'<button type="button" data-time-now="'+min+'">'+(min<60?min+' min':min/60+'h')+'</button>').join('')+'</div></article><article class="priority-now-card"><span class="kicker">Prioridade agora</span><h3>'+esc(top?.map?.shortTitle||top?.map?.title||'Seu próximo estudo')+'</h3><p>'+esc(top?.reasons?.slice(0,3).join(' · ')||'Continue o conteúdo pendente.')+'</p><div><button type="button" class="secondary" data-priority-why>Por que agora?</button>'+(top?'<button type="button" class="primary" data-priority-open="'+esc(top.key)+'">Estudar</button>':'')+'</div></article><article class="forecast-home-card"><span class="kicker">Ritmo atual</span><h3>'+esc(fc.finishDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}))+'</h3><p>'+fc.remainingTopics+' tópicos restantes · '+esc(fmtSeconds(fc.remainingSeconds))+' estimadas'+(fc.marginDays!==null?' · '+(fc.marginDays>=0?fc.marginDays+' dias antes da prova':Math.abs(fc.marginDays)+' dias após a prova'):'')+'</p><div><button type="button" class="secondary" data-home-matrix>Matriz</button>'+(due?'<button type="button" class="secondary" data-home-topic-review>'+due+' revisar</button>':'')+'</div></article>';
    panel.querySelectorAll('[data-time-now]').forEach(button=>button.onclick=()=>showTimePlan(Number(button.dataset.timeNow)));
    panel.querySelector('[data-priority-open]')?.addEventListener('click',e=>openMap(e.currentTarget.dataset.priorityOpen));
    panel.querySelector('[data-priority-why]')?.addEventListener('click',()=>{if(!top)return;toast((top.map.code||'Mapa')+' · '+top.reasons.join(' · ')+' · prioridade '+Math.round(top.score))});
    panel.querySelector('[data-home-matrix]').onclick=()=>nav('matrix');panel.querySelector('[data-home-topic-review]')?.addEventListener('click',showTopicReview);
  }

  function renderProgressIntelligence(){
    const view=document.querySelector('[data-view="progress"]');if(!view)return;
    let root=document.getElementById('studyIntelligencePanel');if(!root){root=document.createElement('section');root.id='studyIntelligencePanel';root.className='section study-intelligence-panel';const analytics=document.getElementById('studyAnalyticsPanel');if(analytics)analytics.insertAdjacentElement('beforebegin',root);else view.appendChild(root)}
    const top=priorityRows().slice(0,3),due=dueTopicRows(),groups=errorGroups().slice(0,4),week=weeklySnapshot(),courseId=top[0]?.map?.courseId||combinedCourses()[0]?.id||'',fc=forecast(courseId);
    root.innerHTML='<div class="section-head"><div><div class="kicker">Planejamento adaptativo</div><h2>Próximas decisões</h2><p>Prioridade calculada a partir de DIF, REV, revisões, erros, ritmo e proximidade da prova.</p></div><div class="planner-head-actions"><button class="secondary" type="button" data-progress-matrix>Matriz do edital</button><button class="secondary" type="button" data-progress-errors>Caderno de erros</button></div></div><div class="priority-engine-grid">'+top.map((row,index)=>'<article><span>#'+(index+1)+' · '+esc(row.map.code||'MAP')+'</span><b>'+esc(row.map.shortTitle||row.map.title)+'</b><p>'+esc(row.reasons.slice(0,3).join(' · '))+'</p><div class="priority-score"><i style="width:'+Math.min(100,Math.round(row.score))+'%"></i></div><button type="button" class="secondary" data-priority-map="'+esc(row.key)+'">Abrir</button></article>').join('')+'</div><div class="intelligence-mini-grid"><article><span>Revisão espaçada</span><b>'+due.length+'</b><p>tópicos vencidos agora</p><button type="button" class="secondary" data-topic-reviews>Revisar tópicos</button></article><article><span>Caderno de erros</span><b>'+groups.reduce((sum,g)=>sum+g.count,0)+'</b><p>'+(groups[0]?esc('Mais recorrente: '+groups[0].label):'Finalize simulados para gerar erros')+'</p><button type="button" class="secondary" data-error-notebook>Ver erros</button></article><article><span>Previsão de conclusão</span><b>'+esc(fc.finishDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}))+'</b><p>'+esc(fmtSeconds(fc.remainingSeconds))+' de carga estimada</p><button type="button" class="secondary" data-forecast-matrix>Simular ritmos</button></article><article><span>Revisão semanal</span><b>'+esc(fmtSeconds(week.seconds))+'</b><p>'+week.sessions+' sessões · '+week.attempts+' simulados</p><button type="button" class="secondary" data-weekly-review>Abrir resumo</button></article></div>';
    root.querySelector('[data-progress-matrix]').onclick=()=>nav('matrix');root.querySelector('[data-progress-errors]').onclick=()=>nav('errors');root.querySelector('[data-topic-reviews]').onclick=showTopicReview;root.querySelector('[data-error-notebook]').onclick=()=>nav('errors');root.querySelector('[data-forecast-matrix]').onclick=()=>nav('matrix');root.querySelector('[data-weekly-review]').onclick=showWeeklyReview;
    root.querySelectorAll('[data-priority-map]').forEach(button=>button.onclick=()=>openMap(button.dataset.priorityMap));
  }

  function enhanceStudySettings(){
    const root=document.getElementById('studySettingsPanel');if(!root)return;
    let block=document.getElementById('plannerAdvancedSettings');if(!block){block=document.createElement('section');block.id='plannerAdvancedSettings';block.className='planner-advanced-settings';root.appendChild(block)}
    const s=read().settings;
    block.innerHTML='<div class="planner-settings-head"><div><span class="kicker">Planejamento adaptativo</span><h3>Semana e prioridades</h3></div></div><form id="plannerSettingsForm"><label>Carga máxima por dia <span><input type="number" name="maxDailyMinutes" min="15" max="1440" step="15" value="'+s.maxDailyMinutes+'"> min</span></label><label>Prioridade <select name="priorityMode"><option value="balanced"'+(s.priorityMode==='balanced'?' selected':'')+'>Equilibrada</option><option value="reviews"'+(s.priorityMode==='reviews'?' selected':'')+'>Revisões primeiro</option><option value="specific"'+(s.priorityMode==='specific'?' selected':'')+'>Específicos primeiro</option></select></label><fieldset><legend>Dias disponíveis</legend>'+[['D',0],['S',1],['T',2],['Q',3],['Q',4],['S',5],['S',6]].map(([label,n])=>'<label><input type="checkbox" name="day" value="'+n+'"'+(s.availableDays.includes(n)?' checked':'')+'><span>'+label+'</span></label>').join('')+'</fieldset><div><button type="submit" class="primary">Salvar planejamento</button><button type="button" class="secondary" data-settings-weekly>Revisão semanal</button></div></form>';
    const form=block.querySelector('#plannerSettingsForm');form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),days=[...form.querySelectorAll('[name="day"]:checked')].map(input=>Number(input.value));const data=read();data.settings.maxDailyMinutes=clamp(fd.get('maxDailyMinutes'),15,1440)||120;data.settings.priorityMode=String(fd.get('priorityMode')||'balanced');data.settings.availableDays=days.length?days:[1,2,3,4,5,6];write(data);toast('Planejamento salvo.');renderAll()};
    block.querySelector('[data-settings-weekly]').onclick=showWeeklyReview;
  }

  function enhanceAgenda(){
    const view=document.querySelector('[data-view="agenda"]');if(!view)return;
    const head=view.querySelector('.study-agenda-head');if(head&&!head.querySelector('.agenda-v2-actions')){const actions=document.createElement('div');actions.className='agenda-v2-actions';actions.innerHTML='<button type="button" class="secondary" data-agenda-replan>Replanejar semana</button><button type="button" class="secondary" data-agenda-export>Exportar .ics</button>';head.appendChild(actions);actions.querySelector('[data-agenda-replan]').onclick=showReplanModal;actions.querySelector('[data-agenda-export]').onclick=exportAgendaIcs}
    const form=view.querySelector('#agendaQuickForm');if(form&&!form.querySelector('[name="recurrence"]')){
      const mapLabel=document.createElement('label');mapLabel.innerHTML='Mapa (opcional)<select name="mapKey"><option value="">Sessão geral</option>'+combinedMaps().map(map=>'<option value="'+esc(mapKeyOf(map))+'">'+esc((map.code||'MAP')+' · '+(map.shortTitle||map.title||''))+'</option>').join('')+'</select>';
      const row=document.createElement('label');row.innerHTML='Repetição<select name="recurrence"><option value="none">Não repetir</option><option value="weekly">Semanal · 8 semanas</option><option value="weekdays">Dias úteis · 20 sessões</option><option value="daily">Diária · 14 dias</option></select>';
      form.querySelector('.row')?.insertAdjacentElement('afterend',mapLabel);mapLabel.insertAdjacentElement('afterend',row);
      form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),payload={date:fd.get('date'),title:fd.get('title'),kind:fd.get('kind'),minutes:fd.get('minutes'),mapKey:fd.get('mapKey')||''},rule=fd.get('recurrence');if(rule&&rule!=='none')addRecurringAgenda(payload,rule);else window.StudyDashboard?.addAgenda?.(payload);form.elements.title.value='';form.elements.minutes.value='30'};
    }
    const manualRows=agendaData().agenda||[];
    view.querySelectorAll('.agenda-entry').forEach(article=>{
      const del=article.querySelector('[data-agenda-delete]');if(!del)return;const id=del.dataset.agendaDelete,row=manualRows.find(item=>item.id===id);article.dataset.agendaDragId=id;article.draggable=true;
      article.classList.toggle('is-completed',!!row?.completedAt);
      article.ondragstart=e=>{e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';article.classList.add('is-dragging')};article.ondragend=()=>article.classList.remove('is-dragging');
      const open=article.querySelector('[data-agenda-open]');if(open&&row&&!row.completedAt){open.textContent='Iniciar';open.onclick=e=>{e.preventDefault();startAgendaItem(id)}}
      if(row?.completedAt){const badge=document.createElement('span');badge.className='agenda-completed-badge';badge.textContent='✓ concluído';article.querySelector('div')?.appendChild(badge)}
    });
    const agenda=agendaData().agenda||[],max=read().settings.maxDailyMinutes;
    view.querySelectorAll('.agenda-day[data-agenda-day]').forEach(day=>{
      day.ondragover=e=>{e.preventDefault();day.classList.add('drag-over')};day.ondragleave=()=>day.classList.remove('drag-over');day.ondrop=e=>{e.preventDefault();day.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain');if(id)rescheduleAgendaItem(id,day.dataset.agendaDay)};
      const mins=dailyPlannedMinutes(parseDate(day.dataset.agendaDay)||new Date(),agenda);day.classList.toggle('over-capacity',mins>max);
      let load=day.querySelector('.agenda-day-load');if(mins&&!load){load=document.createElement('small');load.className='agenda-day-load';day.appendChild(load)}if(load)load.textContent=mins?mins+'m':'';
    });
  }

  function beginAgendaPointerDrag(e){
    if(e.pointerType==='mouse')return;
    const article=e.target.closest('.agenda-entry[data-agenda-drag-id]');if(!article||e.target.closest('button'))return;
    clearTimeout(agendaHoldTimer);
    agendaHoldTimer=setTimeout(()=>{const rect=article.getBoundingClientRect();agendaPointerDrag={id:article.dataset.agendaDragId,pointerId:e.pointerId,article,target:null};article.classList.add('is-dragging-touch');article.setPointerCapture?.(e.pointerId);if(navigator.vibrate)navigator.vibrate(18)},260);
  }
  function moveAgendaPointerDrag(e){
    if(!agendaPointerDrag||agendaPointerDrag.pointerId!==e.pointerId)return;
    const el=document.elementFromPoint(e.clientX,e.clientY),day=el?.closest?.('.agenda-day[data-agenda-day]');
    document.querySelectorAll('.agenda-day.drag-over').forEach(node=>{if(node!==day)node.classList.remove('drag-over')});
    if(day){day.classList.add('drag-over');agendaPointerDrag.target=day.dataset.agendaDay}else agendaPointerDrag.target=null;
    e.preventDefault();
  }
  function endAgendaPointerDrag(e){
    clearTimeout(agendaHoldTimer);agendaHoldTimer=0;
    if(!agendaPointerDrag||agendaPointerDrag.pointerId!==e.pointerId)return;
    document.querySelectorAll('.agenda-day.drag-over').forEach(node=>node.classList.remove('drag-over'));
    agendaPointerDrag.article?.classList.remove('is-dragging-touch');
    if(agendaPointerDrag.target)rescheduleAgendaItem(agendaPointerDrag.id,agendaPointerDrag.target);
    agendaPointerDrag=null;
  }

  function applyTimerPosition(){
    const root=document.getElementById('studyTimerFloat'),pos=read().settings.timerPosition;if(!root)return;
    if(!pos){root.style.left='';root.style.top='';root.style.right='';root.style.bottom='';return}
    const maxX=Math.max(8,window.innerWidth-root.offsetWidth-8),maxY=Math.max(8,window.innerHeight-root.offsetHeight-8),x=clamp(pos.x,8,maxX),y=clamp(pos.y,8,maxY);
    root.style.left=x+'px';root.style.top=y+'px';root.style.right='auto';root.style.bottom='auto';
  }
  function beginTimerDrag(e){
    const root=e.target.closest('#studyTimerFloat');if(!root||e.target.closest('button')||!e.target.closest('.study-timer-copy'))return;
    const rect=root.getBoundingClientRect();dragState={root,pointerId:e.pointerId,dx:e.clientX-rect.left,dy:e.clientY-rect.top};root.setPointerCapture?.(e.pointerId);root.classList.add('is-dragging');e.preventDefault();
  }
  function moveTimerDrag(e){
    if(!dragState||e.pointerId!==dragState.pointerId)return;const{root,dx,dy}=dragState,maxX=Math.max(8,innerWidth-root.offsetWidth-8),maxY=Math.max(8,innerHeight-root.offsetHeight-8),x=clamp(e.clientX-dx,8,maxX),y=clamp(e.clientY-dy,8,maxY);root.style.left=x+'px';root.style.top=y+'px';root.style.right='auto';root.style.bottom='auto';e.preventDefault();
  }
  function endTimerDrag(e){
    if(!dragState||e.pointerId!==dragState.pointerId)return;const rect=dragState.root.getBoundingClientRect(),data=read();data.settings.timerPosition={x:Math.round(rect.left),y:Math.round(rect.top)};write(data);dragState.root.classList.remove('is-dragging');dragState=null;
  }

  function ensureReaderRail(){
    const reader=document.getElementById('reader');if(!reader)return null;let rail=document.getElementById('studyReaderRail');if(rail)return rail;
    rail=document.createElement('aside');rail.id='studyReaderRail';rail.className='study-reader-rail';reader.appendChild(rail);return rail;
  }
  function renderReaderRail(){
    const reader=document.getElementById('reader'),rail=ensureReaderRail();if(!reader||!rail)return;
    const open=reader.classList.contains('open'),map=state?.readerMapKey?mapById(state.readerMapKey):null;if(!open||!map){rail.hidden=true;return}rail.hidden=false;
    const active=window.StudyDashboard?.active?.(),p=mapProgress(map),due=dueTopicRows(map.courseId).filter(row=>row.mapKey===mapKeyOf(map)).length,next=nextPriority(mapKeyOf(map));
    rail.innerHTML='<button type="button" data-rail-session><span>◷</span><b>'+(active?(active.running?'Pausar':'Retomar'):'Sessão')+'</b></button><button type="button" data-rail-doubt><span>?</span><b>Dúvida</b></button><button type="button" data-rail-review><span>R</span><b>'+due+' revisar</b></button><button type="button" data-rail-next '+(!next?'disabled':'')+'><span>→</span><b>Próximo</b></button><small>OK '+p.done+' · REV '+p.review+' · DIF '+p.difficult+'</small>';
    rail.querySelector('[data-rail-session]').onclick=()=>{const a=window.StudyDashboard?.active?.();if(!a)window.StudyDashboard?.start?.({map,mode:'free'});else if(a.running)window.StudyDashboard?.pause?.();else window.StudyDashboard?.resume?.();setTimeout(renderReaderRail,30)};
    rail.querySelector('[data-rail-doubt]').onclick=()=>window.StudyDashboard?.openDoubt?.();rail.querySelector('[data-rail-review]').onclick=showTopicReview;rail.querySelector('[data-rail-next]').onclick=()=>{if(next)openMap(next.key)};
  }

  function handlePlannerShortcut(e){
    if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;const tag=e.target?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.target?.isContentEditable)return;
    if(document.querySelector('.modal.open')||document.querySelector('.planner-modal:not([hidden])'))return;
    const key=e.key.toLowerCase(),readerOpen=document.getElementById('reader')?.classList.contains('open'),active=window.StudyDashboard?.active?.();
    if(e.code==='Space'&&active){e.preventDefault();active.running?window.StudyDashboard.pause():window.StudyDashboard.resume();return}
    if(key==='f'&&readerOpen&&typeof toggleReaderFocus==='function'){e.preventDefault();toggleReaderFocus();return}
    if(key==='d'&&readerOpen){e.preventDefault();window.StudyDashboard?.openDoubt?.();return}
    if(key==='r'){e.preventDefault();showTopicReview();return}
  }

  function searchOptions(query=''){
    const q=norm(query),commands=[
      {title:'Agenda de estudos',meta:'Hoje · semana · mês',action:'nav-agenda',tokens:'agenda calendario planejar'},
      {title:'Matriz do edital',meta:'Cobertura · domínio · previsão',action:'nav-matrix',tokens:'matriz edital cobertura'},
      {title:'Caderno de erros',meta:'Erros dos simulados',action:'nav-errors',tokens:'erros simulado'},
      {title:'Revisões por tópico',meta:dueTopicRows().length+' vencidas',action:'topic-review',tokens:'revisao revisar rev dif'},
      {title:'Replanejar minha semana',meta:'Redistribuir sessões atrasadas',action:'replan',tokens:'replanejar semana agenda'},
      {title:'Revisão semanal',meta:'Resumo e próximos focos',action:'weekly-review',tokens:'resumo semana revisao'},
      {title:'Sessão rápida · 30 min',meta:'Plano automático para agora',action:'time-30',tokens:'30 minutos agora sessao'},
      {title:'Sessão rápida · 1h',meta:'Plano automático para agora',action:'time-60',tokens:'60 minutos 1h agora sessao'}
    ];
    const out=q?commands.filter(item=>norm(item.title+' '+item.meta+' '+item.tokens).includes(q)):commands.slice(0,6);
    if(q){
      const dashboard=window.StudyDashboard?.exportData?.()||{};
      for(const doubt of (dashboard.doubts||[]).filter(row=>!row.deleted&&norm(row.text).includes(q)).slice(0,4)){const map=mapById(doubt.mapKey);out.push({title:doubt.text,meta:'Dúvida · '+(map?.code||'Mapa'),action:'open-map:'+doubt.mapKey})}
      for(const group of errorGroups().filter(group=>norm(group.label).includes(q)).slice(0,4)){const map=bestMapForError(group.label,group.items[0]?.simulation?.courseId);out.push({title:group.label,meta:group.count+' erros recorrentes',action:map?'open-map:'+mapKeyOf(map):'nav-errors'})}
      for(const row of dueTopicRows().filter(row=>norm(row.title+' '+row.map.code).includes(q)).slice(0,5))out.push({title:row.title,meta:'Revisar · '+(row.map.code||'MAP'),action:'open-topic:'+row.mapKey+'|'+row.topicId});
      for(const sim of (typeof combinedSimulations==='function'?combinedSimulations():[]).filter(sim=>norm(sim.title+' '+sim.code+' '+sim.board).includes(q)).slice(0,3))out.push({title:sim.title||sim.code,meta:'Simulado · '+(sim.board||''),action:'open-sim:'+(sim._key||simulationKey(sim))});
      if(q.startsWith('dif ')){
        const term=q.slice(4);for(const map of combinedMaps())for(const[id,stateValue]of Object.entries(readMapState(map).topicStates||{}))if(stateValue==='difficult'&&norm(topicTitle(map,id)).includes(term))out.push({title:topicTitle(map,id),meta:'DIF · '+(map.code||'MAP'),action:'open-topic:'+mapKeyOf(map)+'|'+id});
      }
    }
    return out.slice(0,12);
  }
  function activateSearch(action){
    if(!action)return false;
    if(action==='nav-agenda'){nav('agenda');return true}if(action==='nav-matrix'){nav('matrix');return true}if(action==='nav-errors'){nav('errors');return true}if(action==='topic-review'){showTopicReview();return true}if(action==='replan'){showReplanModal();return true}if(action==='weekly-review'){showWeeklyReview();return true}if(action==='time-30'){showTimePlan(30);return true}if(action==='time-60'){showTimePlan(60);return true}
    if(action.startsWith('open-map:')){openMap(action.slice(9));return true}
    if(action.startsWith('open-topic:')){const[value,id]=action.slice(11).split('|');openMap(value,{topicId:id});return true}
    if(action.startsWith('open-sim:')){openSimulation(action.slice(9));return true}
    return false;
  }

  function renderAll(){
    if(state?.view==='home')renderHomeIntelligence();if(state?.view==='progress')renderProgressIntelligence();if(state?.view==='matrix')renderMatrix();if(state?.view==='errors')renderErrors();if(state?.view==='settings')enhanceStudySettings();if(state?.view==='agenda')enhanceAgenda();renderReaderRail();applyTimerPosition();
  }
  Object.assign(window.StudyPlanner,{render:renderAll,renderHome:renderHomeIntelligence,renderProgress:renderProgressIntelligence,renderMatrix,renderErrors,enhanceAgenda,renderReaderRail,searchOptions,activateSearch});

  function init(){
    ensureMatrixView();ensureErrorsView();ensureReaderRail();
    document.addEventListener('pointerdown',beginTimerDrag,{passive:false});document.addEventListener('pointermove',moveTimerDrag,{passive:false});document.addEventListener('pointerup',endTimerDrag);document.addEventListener('pointercancel',endTimerDrag);document.addEventListener('pointerdown',beginAgendaPointerDrag,{passive:true});document.addEventListener('pointermove',moveAgendaPointerDrag,{passive:false});document.addEventListener('pointerup',endAgendaPointerDrag);document.addEventListener('pointercancel',endAgendaPointerDrag);document.addEventListener('keydown',handlePlannerShortcut);
    window.addEventListener('resize',()=>setTimeout(applyTimerPosition,40));
    const reader=document.getElementById('reader');if(reader)new MutationObserver(()=>renderReaderRail()).observe(reader,{attributes:true,attributeFilter:['class']});
    const agenda=document.querySelector('[data-view="agenda"]');if(agenda){let pending=0;new MutationObserver(()=>{clearTimeout(pending);pending=setTimeout(enhanceAgenda,20)}).observe(agenda,{childList:true,subtree:true})}
    const timer=document.getElementById('studyTimerFloat');if(timer)new MutationObserver(()=>applyTimerPosition()).observe(timer,{childList:true,subtree:true});
    setTimeout(()=>{if(new Date().getDay()===read().settings.weeklyReviewDay){const key=dateKey(weekStart());if(!read().weeklyReports[key])saveWeeklySnapshot(weeklySnapshot())}},1200)
  }

  const previousRenderHome=window.renderHome;
  if(typeof previousRenderHome==='function')window.renderHome=function(){const result=previousRenderHome.apply(this,arguments);setTimeout(renderHomeIntelligence,0);return result};
  const previousRenderProgress=window.renderProgress;
  if(typeof previousRenderProgress==='function')window.renderProgress=function(){const result=previousRenderProgress.apply(this,arguments);setTimeout(renderProgressIntelligence,0);return result};
  const previousRenderSettings=window.renderSettings;
  if(typeof previousRenderSettings==='function')window.renderSettings=function(){const result=previousRenderSettings.apply(this,arguments);setTimeout(enhanceStudySettings,0);return result};
  const previousAgenda=window.renderStudyAgenda;
  if(typeof previousAgenda==='function')window.renderStudyAgenda=function(){const result=previousAgenda.apply(this,arguments);setTimeout(enhanceAgenda,0);return result};

  init();

})();

'use strict';
(()=>{
  if(window.__studyDashboardV151)return;
  window.__studyDashboardV151=true;

  const DATA_KEY='studyapp.studyDashboard.v1';
  const ACTIVE_KEY='studyapp.studySession.active';
  const VERSION=1;
  const DEFAULT_GOALS={dailyMinutes:120,weeklyMinutes:600,pomodoroWork:25,pomodoroBreak:5,autoFocus:false};
  let tickHandle=null,flushHandle=null,agendaCursor=new Date(),agendaMode='month';

  const safeJson=(value,fallback)=>{try{return JSON.parse(value)}catch{return fallback}};
  const isoNow=()=>new Date().toISOString();
  const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
  const dateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
  const startOfDay=value=>{const d=value instanceof Date?new Date(value):new Date(value);return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
  const addDays=(value,days)=>{const d=startOfDay(value);d.setDate(d.getDate()+Number(days||0));return d};
  const parseDate=value=>{if(!value)return null;if(value instanceof Date)return new Date(value);const text=String(value).trim();let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(text);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(text);if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));const d=new Date(text);return Number.isFinite(d.getTime())?d:null};
  const fmtClock=seconds=>{const total=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
  const fmtMin=seconds=>typeof formatStudyDuration==='function'?formatStudyDuration(seconds):(Math.round((Number(seconds)||0)/60)+'min');
  const escape=value=>typeof ESC==='function'?ESC(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function normalizeData(input){
    const value=input&&typeof input==='object'?input:{};
    const goals={...DEFAULT_GOALS,...(value.goals||{})};
    goals.dailyMinutes=clamp(goals.dailyMinutes,1,1440)||120;
    goals.weeklyMinutes=clamp(goals.weeklyMinutes,1,10080)||600;
    goals.pomodoroWork=clamp(goals.pomodoroWork,5,180)||25;
    goals.pomodoroBreak=clamp(goals.pomodoroBreak,1,60)||5;
    goals.autoFocus=!!goals.autoFocus;
    const rows=name=>Array.isArray(value[name])?value[name].filter(item=>item&&typeof item==='object').map(item=>({...item})):[];
    return{version:VERSION,updatedAt:value.updatedAt||'',goals,sessions:rows('sessions').slice(-750),agenda:rows('agenda').slice(-750),doubts:rows('doubts').slice(-750)};
  }
  function readData(){return normalizeData(safeJson(localStorage.getItem(DATA_KEY)||'{}',{}))}
  function writeData(value,{touch=true}={}){const data=normalizeData(value);if(touch)data.updatedAt=isoNow();try{localStorage.setItem(DATA_KEY,JSON.stringify(data))}catch{}if(touch&&typeof touchPreferences==='function')touchPreferences();return data}
  function mergeRows(localRows=[],incomingRows=[]){
    const by=new Map();
    for(const row of [...localRows,...incomingRows]){
      if(!row?.id)continue;
      const current=by.get(row.id),incomingTs=Date.parse(row.updatedAt||row.endedAt||row.createdAt||row.startedAt||0)||0,currentTs=Date.parse(current?.updatedAt||current?.endedAt||current?.createdAt||current?.startedAt||0)||0;
      if(!current||incomingTs>=currentTs)by.set(row.id,{...row});
    }
    return[...by.values()].sort((a,b)=>(Date.parse(a.createdAt||a.startedAt||a.date||0)||0)-(Date.parse(b.createdAt||b.startedAt||b.date||0)||0)).slice(-750);
  }
  function mergeData(localValue,incomingValue){
    const local=normalizeData(localValue),incoming=normalizeData(incomingValue),localTs=Date.parse(local.updatedAt||0)||0,incomingTs=Date.parse(incoming.updatedAt||0)||0;
    return normalizeData({version:VERSION,updatedAt:new Date(Math.max(localTs,incomingTs)||Date.now()).toISOString(),goals:incomingTs>localTs?incoming.goals:local.goals,sessions:mergeRows(local.sessions,incoming.sessions),agenda:mergeRows(local.agenda,incoming.agenda),doubts:mergeRows(local.doubts,incoming.doubts)});
  }
  function importData(value,{merge=true,silent=true}={}){const next=merge?mergeData(readData(),value):normalizeData(value);writeData(next,{touch:false});if(!silent)toast('Dados de estudo restaurados.');renderAll();return next}

  function readActive(){const value=safeJson(localStorage.getItem(ACTIVE_KEY)||'null',null);return value&&typeof value==='object'?value:null}
  function saveActive(value){try{if(value)localStorage.setItem(ACTIVE_KEY,JSON.stringify(value));else localStorage.removeItem(ACTIVE_KEY)}catch{}return value}
  function activeElapsed(active=readActive(),now=Date.now()){if(!active)return 0;const base=Math.max(0,Number(active.elapsedSeconds)||0);if(!active.running||!active.lastResumeAt)return base;return base+Math.max(0,Math.floor((now-(Date.parse(active.lastResumeAt)||now))/1000))}
  function currentMapForTimer(){if(state?.readerMapKey){const map=mapById(state.readerMapKey);if(map)return map}const last=typeof lastMap==='function'?lastMap():null;return last||combinedMaps()[0]||null}
  function activeMap(active=readActive()){return active?.mapKey?mapById(active.mapKey):null}
  function flushActive(){const active=readActive();if(!active||!active.running)return 0;const elapsed=activeElapsed(active),accounted=Math.max(0,Number(active.accountedSeconds)||0),delta=Math.max(0,elapsed-accounted);if(delta>0&&window.StudyTime?.add){StudyTime.add(active.mapKey||'__general__',delta,new Date());active.accountedSeconds=accounted+delta;saveActive(active)}return delta}
  function pauseSession({automatic=false}={}){const active=readActive();if(!active||!active.running)return active;flushActive();const fresh=readActive()||active;fresh.elapsedSeconds=activeElapsed(fresh);fresh.running=false;fresh.lastResumeAt='';fresh.pausedAt=isoNow();fresh.updatedAt=isoNow();saveActive(fresh);window.__manualStudySessionActive=true;renderTimer();renderHomeDashboard();if(!automatic)toast('Sessão pausada.');return fresh}
  function resumeSession(){const active=readActive();if(!active||active.running)return active;if(active.targetSeconds&&activeElapsed(active)>=active.targetSeconds)return active;active.running=true;active.lastResumeAt=isoNow();active.updatedAt=isoNow();saveActive(active);window.__manualStudySessionActive=true;if(window.StudyTime?.pause)StudyTime.pause();renderTimer();if(readData().goals.autoFocus&&state?.readerMapKey&&typeof setReaderFocus==='function')setReaderFocus(true);return active}
  function finishSession({silent=false}={}){let active=readActive();if(!active)return null;if(active.running){flushActive();active=readActive()||active;active.elapsedSeconds=activeElapsed(active)}const duration=Math.max(0,Math.floor(Number(active.elapsedSeconds)||0));const data=readData();data.sessions.push({id:active.id,mapKey:active.mapKey||'',courseId:active.courseId||'',label:active.label||'Sessão livre',mode:active.mode||'free',plannedSeconds:Number(active.targetSeconds)||0,durationSeconds:duration,startedAt:active.startedAt||isoNow(),endedAt:isoNow(),createdAt:active.startedAt||isoNow(),updatedAt:isoNow()});writeData(data);saveActive(null);window.__manualStudySessionActive=false;stopTimerIntervals();renderAll();if(!silent)toast('Sessão finalizada · '+fmtMin(duration));return duration}

  function startSession(options={}){
    const existing=readActive();
    if(existing)return existing;
    const map=options.map||currentMapForTimer();
    const data=readData();
    const mode=options.mode||'free';
    const plannedMinutes=Math.max(0,Number(options.minutes)||0);
    const targetSeconds=plannedMinutes>0?Math.round(plannedMinutes*60):(mode==='pomodoro'?data.goals.pomodoroWork*60:0);
    const now=isoNow();
    const active={
      id:uid('session'),
      mapKey:map?String(map._key||mapKey(map)):'',
      courseId:map?.courseId||'',
      label:options.label||(map?.shortTitle||map?.title||map?.code||'Sessão de estudo'),
      mode,
      targetSeconds,
      elapsedSeconds:0,
      accountedSeconds:0,
      startedAt:now,
      lastResumeAt:now,
      running:true,
      createdAt:now,
      updatedAt:now
    };
    saveActive(active);
    window.__manualStudySessionActive=true;
    if(window.StudyTime?.pause)StudyTime.pause();
    ensureTimerIntervals();
    renderTimer();
    renderHomeDashboard();
    if(data.goals.autoFocus&&state?.readerMapKey&&typeof setReaderFocus==='function')setReaderFocus(true);
    return active;
  }
  function startPomodoro(minutes){
    const data=readData(),value=Math.max(5,Number(minutes)||data.goals.pomodoroWork);
    return startSession({mode:'pomodoro',minutes:value,label:'Pomodoro · '+value+' min'});
  }
  function ensureTimerIntervals(){
    if(!tickHandle)tickHandle=setInterval(timerTick,1000);
    if(!flushHandle)flushHandle=setInterval(()=>{if(readActive()?.running)flushActive()},15000);
  }
  function stopTimerIntervals(){
    if(tickHandle){clearInterval(tickHandle);tickHandle=null}
    if(flushHandle){clearInterval(flushHandle);flushHandle=null}
  }
  function timerTick(){
    const active=readActive();
    if(!active){stopTimerIntervals();renderTimer();return}
    const elapsed=activeElapsed(active);
    if(active.running&&active.targetSeconds&&elapsed>=active.targetSeconds){
      finishSession({silent:true});
      toast(active.mode==='pomodoro'?'Pomodoro concluído. Hora de uma pausa.':'Sessão planejada concluída.');
      return;
    }
    renderTimer();
  }
  function sumStudyDays(){
    const out={};
    const payload=window.StudyTime?.read?.()||{devices:{}};
    for(const device of Object.values(payload.devices||{})){
      for(const[key,value]of Object.entries(device.days||{}))out[key]=(out[key]||0)+(Number(value)||0);
    }
    return out;
  }
  function sumStudyMaps(){
    const out={};
    const payload=window.StudyTime?.read?.()||{devices:{}};
    for(const device of Object.values(payload.devices||{})){
      for(const[key,value]of Object.entries(device.maps||{}))out[key]=(out[key]||0)+(Number(value)||0);
    }
    return out;
  }
  function nearestExam(){
    const today=startOfDay(new Date()).getTime();
    const exams=combinedCourses().map(course=>({course,date:parseDate(course.examDate||course.exam_date)})).filter(row=>row.date&&row.date.getTime()>=today).sort((a,b)=>a.date-b.date);
    if(!exams.length)return null;
    const first=exams[0],days=Math.max(0,Math.ceil((startOfDay(first.date)-startOfDay(new Date()))/86400000));
    return{...first,days};
  }
  function reviewEntries(){
    if(typeof syncReviewSchedules!=='function')return[];
    const maps=combinedMaps(),schedule=syncReviewSchedules(maps);
    return maps.map(map=>{
      const key=map._key||mapKey(map),entry=schedule[key];
      if(!entry?.dueAt)return null;
      return{id:'review-'+key,date:dateKey(entry.dueAt),kind:'review',title:map.shortTitle||map.title||map.code||'Revisão',meta:map.code||'',mapKey:key,dueAt:entry.dueAt,computed:true};
    }).filter(Boolean);
  }
  function examEntries(){
    return combinedCourses().map(course=>{
      const date=parseDate(course.examDate||course.exam_date);
      if(!date)return null;
      return{id:'exam-'+course.id,date:dateKey(date),kind:'exam',title:course.title||'Prova',meta:[course.subtitle,course.board].filter(Boolean).join(' · '),courseId:course.id,computed:true};
    }).filter(Boolean);
  }
  function sessionEntries(){
    return readData().sessions.filter(row=>row.startedAt).map(row=>({id:'done-'+row.id,date:dateKey(row.startedAt),kind:'session',title:row.label||'Sessão',meta:fmtMin(row.durationSeconds),mapKey:row.mapKey||'',computed:true}));
  }
  function allAgendaEntries(){
    const manual=readData().agenda.filter(row=>!row.deleted).map(row=>({...row,kind:row.kind||'study'}));
    return[...manual,...reviewEntries(),...examEntries(),...sessionEntries()];
  }
  function entriesForDate(value){
    const key=dateKey(value);
    return allAgendaEntries().filter(item=>item.date===key).sort((a,b)=>{
      const order={exam:0,review:1,study:2,simulation:3,session:4};
      return(order[a.kind]??9)-(order[b.kind]??9);
    });
  }
  function addAgendaItem(payload={}){
    const data=readData(),now=isoNow();
    const row={id:uid('agenda'),date:payload.date||dateKey(),kind:payload.kind||'study',title:String(payload.title||'Sessão planejada').trim()||'Sessão planejada',minutes:Math.max(0,Number(payload.minutes)||0),mapKey:payload.mapKey||'',createdAt:now,updatedAt:now};
    data.agenda.push(row);writeData(data);renderAgenda();renderHomeDashboard();return row;
  }
  function deleteAgendaItem(id){
    const data=readData(),row=data.agenda.find(item=>item.id===id);
    if(!row)return;
    row.deleted=true;row.updatedAt=isoNow();writeData(data);renderAgenda();renderHomeDashboard();
  }

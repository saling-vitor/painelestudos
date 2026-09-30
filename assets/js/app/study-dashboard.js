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

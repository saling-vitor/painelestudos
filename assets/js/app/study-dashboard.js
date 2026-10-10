'use strict';
(()=>{
  if(window.__studyDashboardV151)return;
  window.__studyDashboardV151=true;

  const DATA_KEY='studyapp.studyDashboard.v1';
  const ACTIVE_KEY='studyapp.studySession.active';
  const VERSION=1;
  const DEFAULT_GOALS={dailyMinutes:120,weeklyMinutes:600,pomodoroWork:25,pomodoroBreak:5,autoFocus:false};
  let tickHandle=null,flushHandle=null,agendaCursor=new Date(),agendaMode='month',goalDraft=null;

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
  const fmtDurationInput=minutes=>{const total=Math.max(0,Math.round(Number(minutes)||0)),h=Math.floor(total/60),m=total%60;if(h&&m)return h+'h '+m+'min';if(h)return h+'h';return m+'min'};
  const parseDurationMinutes=(value,fallback=0)=>{const text=String(value??'').trim().toLowerCase().replace(/\s+/g,' ');if(!text)return Number(fallback)||0;let m=text.match(/^(\d+(?:[.,]\d+)?)\s*h(?:\s*(\d{1,2})\s*(?:m|min)?)?$/);if(m)return Math.round(Number(m[1].replace(',','.'))*60)+(Number(m[2])||0);m=text.match(/^(\d+)\s*:\s*(\d{1,2})$/);if(m)return Number(m[1])*60+Math.min(59,Number(m[2])||0);m=text.match(/^(\d+(?:[.,]\d+)?)\s*(?:m|min)$/);if(m)return Math.round(Number(m[1].replace(',','.')));if(/^\d+(?:[.,]\d+)?$/.test(text))return Math.round(Number(text.replace(',','.')));return Number(fallback)||0};
  const escape=value=>typeof ESC==='function'?ESC(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function normalizeData(input){
    const value=input&&typeof input==='object'?input:{};
    const goals={...DEFAULT_GOALS,...(value.goals||{})};
    goals.dailyMinutes=clamp(goals.dailyMinutes,1,1440)||120;
    goals.weeklyMinutes=clamp(goals.weeklyMinutes,1,10080)||600;
    goals.pomodoroWork=clamp(goals.pomodoroWork,5,180)||25;
    goals.pomodoroBreak=clamp(goals.pomodoroBreak,1,60)||5;
    goals.autoFocus=false;
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
  function currentMapForTimer(){if(state?.readerMapKey){const map=mapById(state.readerMapKey);if(map)return map}const last=typeof lastMap==='function'?lastMap():null;return last||null}
  function activeMap(active=readActive()){return active?.mapKey?mapById(active.mapKey):null}
  function flushActive(){const active=readActive();if(!active||!active.running)return 0;const elapsed=activeElapsed(active),accounted=Math.max(0,Number(active.accountedSeconds)||0),delta=Math.max(0,elapsed-accounted);if(delta>0&&window.StudyTime?.add){StudyTime.add(active.mapKey||'__general__',delta,new Date());active.accountedSeconds=accounted+delta;saveActive(active)}return delta}
  function pauseSession({automatic=false}={}){const active=readActive();if(!active||!active.running)return active;flushActive();const fresh=readActive()||active;fresh.elapsedSeconds=activeElapsed(fresh);fresh.running=false;fresh.lastResumeAt='';fresh.pausedAt=isoNow();fresh.updatedAt=isoNow();saveActive(fresh);window.__manualStudySessionActive=true;renderTimer();renderHomeDashboard();if(!automatic)toast('Sessão pausada.');return fresh}
  function resumeSession(){const active=readActive();if(!active||active.running)return active;if(active.targetSeconds&&activeElapsed(active)>=active.targetSeconds)return active;active.running=true;active.lastResumeAt=isoNow();active.updatedAt=isoNow();saveActive(active);if(window.StudyTime?.pause)StudyTime.pause();window.__manualStudySessionActive=true;renderTimer();return active}
  function finishSession({silent=false,suppressSummary=false}={}){let active=readActive();if(!active)return null;if(active.running){flushActive();active=readActive()||active;active.elapsedSeconds=activeElapsed(active)}const duration=Math.max(0,Math.floor(Number(active.elapsedSeconds)||0));const data=readData(),record={id:active.id,mapKey:active.mapKey||'',courseId:active.courseId||'',label:active.label||'Sessão livre',agendaId:active.agendaId||'',mode:active.mode||'free',plannedSeconds:Number(active.targetSeconds)||0,durationSeconds:duration,startedAt:active.startedAt||isoNow(),endedAt:isoNow(),createdAt:active.startedAt||isoNow(),updatedAt:isoNow(),startProgress:active.startProgress||null};data.sessions.push(record);writeData(data);saveActive(null);window.__manualStudySessionActive=false;stopTimerIntervals();renderAll();if(!silent)toast('Sessão finalizada · '+fmtMin(duration));if(record.agendaId&&window.StudyPlanner?.completeAgendaItem)StudyPlanner.completeAgendaItem(record.agendaId);if(!suppressSummary&&window.StudyPlanner?.showSessionSummary)setTimeout(()=>StudyPlanner.showSessionSummary(record),40);return duration}

  function startSession(options={}){
    const existing=readActive();
    if(existing)return existing;
    const map=options.general?null:(options.map||currentMapForTimer());
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
      agendaId:options.agendaId||'',
      mode,
      targetSeconds,
      elapsedSeconds:0,
      accountedSeconds:0,
      startedAt:now,
      lastResumeAt:now,
      running:true,
      createdAt:now,
      updatedAt:now,
      startProgress:map?mapProgress(map):null
    };
    saveActive(active);
    if(window.StudyTime?.pause)StudyTime.pause();
    window.__manualStudySessionActive=true;
    ensureTimerIntervals();
    renderTimer();
    renderHomeDashboard();
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
    return readData().sessions.filter(row=>row.startedAt&&!row.deleted).map(row=>({id:'done-'+row.id,sessionId:row.id,date:dateKey(row.startedAt),kind:'session',title:row.label||'Sessão',meta:fmtMin(row.durationSeconds),mapKey:row.mapKey||'',computed:true,removable:true}));
  }
  function allAgendaEntries(){
    const manual=readData().agenda.filter(row=>!row.deleted).map(row=>({...row,kind:row.kind||'study'})),topicReviews=window.StudyPlanner?.topicReviews?.().map(row=>({id:'topic-review-'+row.id,date:dateKey(row.dueAt),kind:'topic-review',title:(row.map.code||'MAP')+' · '+row.title,meta:'Revisão por tópico',mapKey:row.mapKey,topicId:row.topicId,dueAt:row.dueAt,computed:true}))||[];
    return[...manual,...topicReviews,...reviewEntries(),...examEntries(),...sessionEntries()];
  }
  function entriesForDate(value){
    const key=dateKey(value),todayKey=dateKey();
    return allAgendaEntries().filter(item=>item.date===key||(key===todayKey&&(item.kind==='review'||item.kind==='topic-review')&&item.date<todayKey)).map(item=>(item.kind==='review'||item.kind==='topic-review')&&item.date<todayKey?{...item,meta:[item.meta,'Atrasada'].filter(Boolean).join(' · ')}:item).sort((a,b)=>{
      const order={exam:0,'topic-review':1,review:2,study:3,simulation:4,session:5};
      return(order[a.kind]??9)-(order[b.kind]??9);
    });
  }
  function addAgendaItem(payload={}){
    const data=readData(),now=isoNow();
    const row={id:uid('agenda'),date:payload.date||dateKey(),kind:payload.kind||'study',title:String(payload.title||'Sessão planejada').trim()||'Sessão planejada',minutes:Math.max(0,Number(payload.minutes)||0),mapKey:payload.mapKey||'',recurrence:payload.recurrence||'',createdAt:now,updatedAt:now};
    data.agenda.push(row);writeData(data);renderAgenda();renderHomeDashboard();return row;
  }
  function deleteAgendaItem(id){
    const data=readData(),row=data.agenda.find(item=>item.id===id);
    if(!row)return false;
    row.deleted=true;row.updatedAt=isoNow();writeData(data);renderAgenda();renderHomeDashboard();
    if(typeof toast==='function')toast('Evento removido da agenda.');
    return true;
  }
  function requestDeleteAgendaItem(id){
    const row=readData().agenda.find(item=>item.id===id&&!item.deleted);
    if(!row)return false;
    const recurrence=row.recurrence&&row.recurrence!=='none'?' Apenas esta ocorrência será removida.':'',message='“'+(row.title||'Evento')+'” será removido da agenda.'+recurrence,action=()=>deleteAgendaItem(id);
    if(typeof askConfirm==='function'){askConfirm('Remover da agenda?',message,action,'Remover');return true}
    if(window.confirm('Remover da agenda?\n\n'+message))action();
    return true;
  }
  function deleteSessionRecord(id){
    const data=readData(),row=data.sessions.find(item=>item.id===id);
    if(!row)return false;
    row.deleted=true;row.updatedAt=isoNow();writeData(data);renderAll();
    if(typeof toast==='function')toast('Registro de estudo removido.');
    return true;
  }
  function requestDeleteSessionRecord(id){
    const row=readData().sessions.find(item=>item.id===id&&!item.deleted);
    if(!row)return false;
    const message='“'+(row.label||'Sessão de estudo')+'” será removido da Agenda e do histórico de sessões.',action=()=>deleteSessionRecord(id);
    if(typeof askConfirm==='function'){askConfirm('Remover registro de estudo?',message,action,'Remover');return true}
    if(window.confirm('Remover registro de estudo?\n\n'+message))action();
    return true;
  }

  function timerMapLabel(active){
    const map=activeMap(active);
    return map?.code||map?.shortTitle||map?.title||active?.label||'Estudo';
  }
  function ensureTimerRoot(){
    let root=document.getElementById('studyTimerFloat');
    if(root)return root;
    root=document.createElement('aside');
    root.id='studyTimerFloat';
    root.className='study-timer-float';
    root.setAttribute('aria-live','polite');
    document.body.appendChild(root);
    return root;
  }
  function renderTimer(){
    const root=ensureTimerRoot(),active=readActive();
    if(!active){
      root.className='study-timer-float is-idle';
      root.innerHTML='';
      root.hidden=true;
      return;
    }
    root.hidden=false;
    ensureTimerIntervals();
    const elapsed=activeElapsed(active),target=Math.max(0,Number(active.targetSeconds)||0),progress=target?Math.min(100,Math.round(elapsed/target*100)):0,remaining=target?Math.max(0,target-elapsed):0;
    root.className='study-timer-float is-active'+(active.running?' is-running':' is-paused');
    root.innerHTML='<div class="study-timer-main"><span class="study-timer-pulse"></span><div class="study-timer-copy"><small>'+escape(timerMapLabel(active))+'</small><b>'+fmtClock(target?remaining:elapsed)+'</b><span>'+(target?(progress+'% · '+fmtMin(elapsed)):(active.running?'sessão em andamento':'sessão pausada'))+'</span></div><div class="study-timer-actions"><button type="button" data-study-toggle aria-label="'+(active.running?'Pausar':'Retomar')+'">'+(active.running?'Ⅱ':'▶')+'</button><button type="button" data-study-finish aria-label="Finalizar">■</button><button type="button" data-study-focus aria-label="Modo foco">◎</button></div></div>'+(target?'<div class="study-timer-progress"><i style="width:'+progress+'%"></i></div>':'');
    root.querySelector('[data-study-toggle]').onclick=()=>active.running?pauseSession():resumeSession();
    root.querySelector('[data-study-finish]').onclick=()=>finishSession();
    root.querySelector('[data-study-focus]').onclick=()=>{if(state?.readerMapKey&&typeof toggleReaderFocus==='function')toggleReaderFocus();else toast('Abra um mapa para usar o modo foco.')};
  }
  function goalSnapshot(){
    const data=readData(),today=window.StudyTime?.today?.()||0,week=window.StudyTime?.week?.()||0,dailyTarget=data.goals.dailyMinutes*60,weeklyTarget=data.goals.weeklyMinutes*60;
    return{data,today,week,dailyTarget,weeklyTarget,dailyPct:dailyTarget?Math.min(100,Math.round(today/dailyTarget*100)):0,weeklyPct:weeklyTarget?Math.min(100,Math.round(week/weeklyTarget*100)):0};
  }
  function todayPlanned(){
    const key=dateKey();
    return readData().agenda.filter(item=>!item.deleted&&item.date===key);
  }
  function renderHomeDashboard(){
    const home=document.querySelector('[data-view="home"]');
    if(!home)return;
    let root=document.getElementById('homeStudyDashboard');
    if(!root){
      root=document.createElement('section');
      root.id='homeStudyDashboard';
      root.className='home-study-dashboard';
      const hero=home.querySelector('.hero');
      if(hero)hero.insertAdjacentElement('afterend',root);else home.prepend(root);
    }
    const snap=goalSnapshot(),exam=nearestExam(),planned=todayPlanned(),review=typeof reviewScheduleSummary==='function'?reviewScheduleSummary(combinedMaps()):{dueCount:0},active=readActive();
    const returning=!!(active||window.StudyTime?.week?.()||localStorage.getItem('studyapp.lastMap'));
    home.classList.toggle('study-dashboard-returning',returning);
    const nextPlan=window.StudyCoach?.snapshot?.().items?.[0]||null;
    const nextMap=nextPlan?.kind==='map'&&nextPlan.key?mapById(nextPlan.key):null,nextAccent=nextMap?mapAccentValue(nextMap):'',nextCode=nextMap?.code||nextPlan?.code||'';
    const nextTitle=nextPlan?.title||planned[0]?.title||'Escolher próximo estudo';
    const nextMeta=nextPlan?((nextPlan.reason||'')+(nextPlan.minutes?' · '+nextPlan.minutes+' min':'')):planned[0]?.minutes?(planned[0].minutes+' min planejados'):'Abra um mapa ou use uma sessão livre';
    const commandStyle=nextAccent?' style="'+escape('--map-accent:'+nextAccent)+'" data-map-accent="true"':'';
    const commandMap=nextMap?'<span class="study-command-map-code">'+escape(nextCode)+'</span>':'';
    const coverHtml='<img src="assets/brand/topographic-editorial-v1/covers/home-hero.png" alt="" loading="lazy" decoding="async">';
    const contextText=Number(review.dueCount||0)+' revisões'+(exam?' · prova em '+exam.days+' dia'+(exam.days===1?'':'s'):' · '+planned.length+' itens na agenda');
    root.innerHTML='<div class="study-command-card"'+commandStyle+'>'+
      '<div class="study-command-art" aria-hidden="true">'+coverHtml+'</div>'+
      '<div class="study-command-head"><div class="study-command-copy">'+
        '<div class="study-command-kicker">'+commandMap+'<span class="kicker">Hoje · Estude agora</span></div>'+
        '<h2>'+escape(nextTitle)+'</h2><p>'+escape(nextMeta)+'</p>'+
      '</div><button type="button" class="study-command-help" data-dashboard-help aria-label="Entenda seu plano de hoje" aria-expanded="false"><span class="ui-icon icon-help" aria-hidden="true"></span></button></div>'+
      '<div class="study-command-help-detail" id="studyCommandHelpDetail" hidden>Metas, revisões e progresso são atualizados com os registros reais dos seus estudos.</div>'+
      '<div class="study-command-progress" role="progressbar" aria-label="Meta diária concluída" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+snap.dailyPct+'"><i style="width:'+snap.dailyPct+'%"></i></div>'+
      '<div class="study-command-context">'+escape(contextText)+'</div>'+
      '<div class="study-command-bottom"><div class="study-command-metrics">'+
        '<button type="button" data-dashboard-agenda><span class="ui-icon icon-clock study-command-metric-icon" aria-hidden="true"></span><span class="study-command-metric-label"><span>Meta de hoje</span><b>'+escape(fmtMin(snap.today))+' / '+escape(fmtMin(snap.dailyTarget))+'</b></span><i><em style="width:'+snap.dailyPct+'%"></em></i></button>'+
        '<button type="button" data-dashboard-agenda><span class="ui-icon icon-chart-bars study-command-metric-icon" aria-hidden="true"></span><span class="study-command-metric-label"><span>Semana</span><b>'+escape(fmtMin(snap.week))+' / '+escape(fmtMin(snap.weeklyTarget))+'</b></span><i><em style="width:'+snap.weeklyPct+'%"></em></i></button>'+
        '<button type="button" data-dashboard-agenda><span>Revisões</span><b>'+Number(review.dueCount||0)+'</b><small>pendentes</small></button>'+
        (exam?'<button type="button" data-dashboard-agenda><span>Próxima prova</span><b>'+exam.days+' dia'+(exam.days===1?'':'s')+'</b><small>'+escape(exam.course.title||'Concurso')+'</small></button>':'<button type="button" data-dashboard-agenda><span>Agenda</span><b>'+planned.length+'</b><small>itens hoje</small></button>')+
      '</div><button type="button" class="primary study-command-cta" data-dashboard-start><span>Continuar agora</span><span class="ui-icon icon-chevron-right" aria-hidden="true"></span></button></div>'+
    '</div>';
    root.querySelector('[data-dashboard-start]').onclick=()=>{
      if(active){ensureTimerRoot().classList.add('is-open');renderTimer();return}
      if(nextPlan?.kind==='map'&&nextPlan.key){
        const map=mapById(nextPlan.key);
        Promise.resolve(openMap(nextPlan.key)).then(()=>startSession({map,mode:'planned',minutes:nextPlan.minutes||20,label:nextPlan.title}));
      }else startSession({mode:'free'});
    };
    root.querySelectorAll('[data-dashboard-agenda]').forEach(button=>button.onclick=()=>nav('agenda'));
    const helpButton=root.querySelector('[data-dashboard-help]'),helpDetail=root.querySelector('#studyCommandHelpDetail');
    if(helpButton&&helpDetail)helpButton.onclick=()=>{
      helpDetail.hidden=!helpDetail.hidden;helpButton.setAttribute('aria-expanded',String(!helpDetail.hidden));
    };
    if(window.StudyPlanner?.renderHome)setTimeout(()=>StudyPlanner.renderHome(),0);
  }

function ensureAgendaView(){
    let view=document.querySelector('[data-view="agenda"]');
    if(view)return view;
    view=document.createElement('section');
    view.className='view study-agenda-view';
    view.dataset.view='agenda';
    view.innerHTML='<div class="section-head study-agenda-head"><div><div class="kicker">Planejamento</div><h2>Agenda de estudos</h2><p>Provas, revisões, sessões planejadas e histórico em um só calendário.</p></div><div class="study-agenda-modes"><button type="button" data-agenda-mode="today">Dia</button><button type="button" data-agenda-mode="week">Semana</button><button type="button" data-agenda-mode="month" class="active">Mês</button></div></div><div class="study-agenda-layout"><section class="panel study-agenda-calendar"><div class="study-agenda-toolbar"><button type="button" class="secondary" data-agenda-prev>‹</button><button type="button" class="secondary" data-agenda-today>Hoje</button><strong id="agendaPeriodLabel"></strong><button type="button" class="secondary" data-agenda-next>›</button></div><div id="agendaCalendarGrid"></div></section><aside class="panel study-agenda-side"><div id="agendaDayDetail"></div><form id="agendaQuickForm" class="study-agenda-form"><div class="panel-kicker">Planejar</div><label>Data<input type="date" name="date" required></label><label>Título<input type="text" name="title" maxlength="100" placeholder="Ex.: Revisar Acessibilidade" required></label><div class="row"><label>Tipo<select name="kind"><option value="study">Estudo</option><option value="simulation">Simulado</option></select></label><label>Minutos<input type="number" name="minutes" min="0" max="480" step="5" value="30"></label></div><button class="primary" type="submit">Adicionar à agenda</button></form></aside></div>';
    document.querySelector('.content')?.appendChild(view);
    view.querySelectorAll('[data-agenda-mode]').forEach(button=>button.onclick=()=>{agendaMode=button.dataset.agendaMode;view.querySelectorAll('[data-agenda-mode]').forEach(b=>b.classList.toggle('active',b===button));renderAgenda()});
    view.querySelector('[data-agenda-prev]').onclick=()=>{if(agendaMode==='month')agendaCursor=new Date(agendaCursor.getFullYear(),agendaCursor.getMonth()-1,1);else agendaCursor=addDays(agendaCursor,agendaMode==='week'?-7:-1);renderAgenda()};
    view.querySelector('[data-agenda-next]').onclick=()=>{if(agendaMode==='month')agendaCursor=new Date(agendaCursor.getFullYear(),agendaCursor.getMonth()+1,1);else agendaCursor=addDays(agendaCursor,agendaMode==='week'?7:1);renderAgenda()};
    view.querySelector('[data-agenda-today]').onclick=()=>{agendaCursor=new Date();renderAgenda()};
    const form=view.querySelector('#agendaQuickForm');
    form.elements.date.value=dateKey();
    form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form);addAgendaItem({date:fd.get('date'),title:fd.get('title'),kind:fd.get('kind'),minutes:fd.get('minutes')});form.elements.title.value='';form.elements.minutes.value='30'};
    return view;
  }
  function agendaDotClass(kind){return 'agenda-dot '+(kind||'study')}
  function agendaDayCard(day,{outside=false}={}){
    const entries=entriesForDate(day),today=dateKey(day)===dateKey(),selected=dateKey(day)===dateKey(agendaCursor);
    const visible=entries.slice(0,4);
    return '<button type="button" class="agenda-day'+(outside?' outside':'')+(today?' today':'')+(selected?' selected':'')+'" data-agenda-day="'+dateKey(day)+'"><span class="agenda-day-number">'+day.getDate()+'</span><span class="agenda-day-dots">'+visible.map(item=>'<i class="'+agendaDotClass(item.kind)+'" title="'+escape(item.title)+'"></i>').join('')+(entries.length>4?'<small>+'+(entries.length-4)+'</small>':'')+'</span></button>';
  }
  function monthCalendarHtml(){
    const first=new Date(agendaCursor.getFullYear(),agendaCursor.getMonth(),1),offset=(first.getDay()+6)%7,start=addDays(first,-offset),cells=[];
    for(let i=0;i<42;i++){const day=addDays(start,i);cells.push(agendaDayCard(day,{outside:day.getMonth()!==agendaCursor.getMonth()}))}
    return '<div class="agenda-weekdays"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span><span>DOM</span></div><div class="agenda-month-grid">'+cells.join('')+'</div>';
  }
  function weekCalendarHtml(){
    const d=startOfDay(agendaCursor),offset=(d.getDay()+6)%7,start=addDays(d,-offset);
    const cards=[];
    for(let i=0;i<7;i++){const day=addDays(start,i),entries=entriesForDate(day);cards.push('<button type="button" class="agenda-week-card'+(dateKey(day)===dateKey()?' today':'')+'" data-agenda-day="'+dateKey(day)+'"><small>'+day.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')+'</small><b>'+day.getDate()+'</b><span>'+entries.length+' item'+(entries.length===1?'':'s')+'</span><div>'+entries.slice(0,3).map(item=>'<i class="'+agendaDotClass(item.kind)+'"></i>').join('')+'</div></button>')}
    return '<div class="agenda-week-grid">'+cards.join('')+'</div>';
  }
  function todayCalendarHtml(){
    const entries=entriesForDate(agendaCursor);
    return '<div class="agenda-today-card"><span>'+agendaCursor.toLocaleDateString('pt-BR',{weekday:'long'})+'</span><b>'+agendaCursor.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})+'</b><strong>'+entries.length+' item'+(entries.length===1?'':'s')+'</strong></div>';
  }
  function renderAgendaDayDetail(){
    const root=document.getElementById('agendaDayDetail');
    if(!root)return;
    const entries=entriesForDate(agendaCursor);
    root.innerHTML='<div class="study-agenda-day-head"><span class="kicker">Dia selecionado</span><h3>'+escape(agendaCursor.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}))+'</h3></div><div class="study-agenda-day-list">'+(entries.length?entries.map(item=>'<article class="agenda-entry '+escape(item.kind)+'"><span class="'+agendaDotClass(item.kind)+'"></span><div><b>'+escape(item.title)+'</b><small>'+escape(item.meta||((item.minutes||0)?item.minutes+' min':''))+'</small></div>'+(item.mapKey?'<button type="button" class="secondary" data-agenda-open="'+escape(item.mapKey)+'"'+(item.topicId?' data-agenda-topic="'+escape(item.topicId)+'"':'')+'>Abrir</button>':'')+(!item.computed?'<button type="button" class="agenda-delete" data-agenda-delete="'+escape(item.id)+'" aria-label="Remover da agenda"><span class="ui-icon icon-trash ui-icon-xs" aria-hidden="true"></span><span>Remover</span></button>':item.kind==='session'&&item.sessionId?'<button type="button" class="agenda-delete" data-session-delete="'+escape(item.sessionId)+'" aria-label="Remover registro de estudo"><span class="ui-icon icon-trash ui-icon-xs" aria-hidden="true"></span><span>Remover</span></button>':'')+'</article>').join(''):emptyStateHtml({title:'Dia livre',text:'Nada planejado para este dia.',mascot:'agenda',compact:true,className:'agenda-empty-state'}))+'</div>';
    root.querySelectorAll('[data-agenda-open]').forEach(button=>button.onclick=()=>openMap(button.dataset.agendaOpen,{topicId:button.dataset.agendaTopic||''}));
    root.querySelectorAll('[data-agenda-delete]').forEach(button=>button.onclick=()=>requestDeleteAgendaItem(button.dataset.agendaDelete));
    root.querySelectorAll('[data-session-delete]').forEach(button=>button.onclick=()=>requestDeleteSessionRecord(button.dataset.sessionDelete));
    const form=document.getElementById('agendaQuickForm');if(form)form.elements.date.value=dateKey(agendaCursor);
  }
  function renderAgenda(){
    const view=ensureAgendaView(),grid=view.querySelector('#agendaCalendarGrid'),label=view.querySelector('#agendaPeriodLabel');
    if(!grid||!label)return;
    view.dataset.agendaDisplayMode=agendaMode;
    let agendaEmpty=false;
    if(agendaMode==='today')agendaEmpty=entriesForDate(agendaCursor).length===0;
    else if(agendaMode==='week'){const d=startOfDay(agendaCursor),start=addDays(d,-((d.getDay()+6)%7));agendaEmpty=!Array.from({length:7},(_,i)=>entriesForDate(addDays(start,i))).some(rows=>rows.length)}
    view.classList.toggle('agenda-mode-empty',agendaEmpty&&agendaMode!=='month');
    if(agendaMode==='month'){
      label.textContent=agendaCursor.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
      grid.innerHTML=monthCalendarHtml();
    }else if(agendaMode==='week'){
      const d=startOfDay(agendaCursor),start=addDays(d,-((d.getDay()+6)%7)),end=addDays(start,6);
      label.textContent=start.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+' — '+end.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
      grid.innerHTML=weekCalendarHtml();
    }else{
      label.textContent=agendaCursor.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
      grid.innerHTML=todayCalendarHtml();
    }
    grid.querySelectorAll('[data-agenda-day]').forEach(button=>button.onclick=()=>{agendaCursor=parseDate(button.dataset.agendaDay)||new Date();renderAgenda()});
    renderAgendaDayDetail();
    if(window.StudyPlanner?.enhanceAgenda)setTimeout(()=>StudyPlanner.enhanceAgenda(),0);
  }

  function heatmapHtml(){
    const days=sumStudyDays(),end=startOfDay(new Date()),start=addDays(end,-83),values=[];
    for(let i=0;i<84;i++){const day=addDays(start,i),seconds=days[dateKey(day)]||0;values.push({day,seconds})}
    const max=Math.max(1,...values.map(item=>item.seconds));
    return '<div class="study-heatmap" aria-label="Consistência dos últimos 84 dias">'+values.map(item=>{const ratio=item.seconds/max,level=item.seconds<=0?0:ratio<.25?1:ratio<.5?2:ratio<.75?3:4;return '<i class="heat-'+level+'" title="'+escape(item.day.toLocaleDateString('pt-BR'))+' · '+escape(fmtMin(item.seconds))+'"></i>'}).join('')+'</div><div class="study-heatmap-legend"><span>Menos</span><i class="heat-0"></i><i class="heat-1"></i><i class="heat-2"></i><i class="heat-3"></i><i class="heat-4"></i><span>Mais</span></div>';
  }
  function analyticsSnapshot(){
    const data=readData(),maps=combinedMaps(),times=sumStudyMaps(),ranked=Object.entries(times).map(([key,seconds])=>({key,seconds,map:mapById(key)})).filter(row=>row.seconds>0).sort((a,b)=>b.seconds-a.seconds);
    const weak=maps.map(map=>({map,progress:mapProgress(map)})).filter(row=>row.progress.difficult||row.progress.review).sort((a,b)=>(b.progress.difficult||0)-(a.progress.difficult||0)||(b.progress.review||0)-(a.progress.review||0)).slice(0,5);
    const sessions=data.sessions.filter(row=>!row.deleted&&Number(row.durationSeconds)>0),sessionTotal=sessions.reduce((sum,row)=>sum+(Number(row.durationSeconds)||0),0),mappedTotal=Object.values(times).reduce((sum,value)=>sum+(Number(value)||0),0),total=Math.max(sessionTotal,mappedTotal),average=sessions.length?Math.round(sessionTotal/sessions.length):0;
    const attempts=Object.values(state.simAttempts||{}).reduce((sum,list)=>sum+(Array.isArray(list)?list.filter(row=>!row?.deleted).length:0),0);
    const openDoubts=data.doubts.filter(row=>!row.resolved&&!row.deleted),categoryMap={},courseMap={};
    for(const row of ranked){
      const map=row.map;if(!map)continue;
      const category=map.category||'Outros',course=courseById(map.courseId),courseLabel=course?.title||map.courseId||'Outros';
      categoryMap[category]=(categoryMap[category]||0)+row.seconds;
      courseMap[courseLabel]=(courseMap[courseLabel]||0)+row.seconds;
    }
    const categories=Object.entries(categoryMap).map(([label,seconds])=>({label,seconds})).sort((a,b)=>b.seconds-a.seconds);
    const courses=Object.entries(courseMap).map(([label,seconds])=>({label,seconds})).sort((a,b)=>b.seconds-a.seconds);
    return{data,ranked,weak,sessions,total,average,attempts,openDoubts,categories,courses};
  }
  function analyticsMapLabel(row){
    const map=row?.map;
    if(map){const code=String(map.code||'MAP').trim(),title=String(map.shortTitle||map.title||'').trim();return title&&title.toLocaleLowerCase('pt-BR')!==code.toLocaleLowerCase('pt-BR')?code+' · '+title:code}
    const tail=String(row?.key||'MAP').split('::').pop()||'MAP';
    return tail.replace(/[_-]+/g,' ').trim().toLocaleUpperCase('pt-BR')
  }
  function renderProgressDashboard(){
    const view=document.querySelector('[data-view="progress"]');
    if(!view)return;
    let root=document.getElementById('studyAnalyticsPanel');
    if(!root){
      root=document.createElement('section');
      root.id='studyAnalyticsPanel';
      root.className='study-analytics-panel section';
      const insights=document.getElementById('progressInsights');
      if(insights)insights.insertAdjacentElement('afterend',root);else view.appendChild(root);
    }
    const snap=analyticsSnapshot(),top=snap.ranked.slice(0,3),topCategories=snap.categories.slice(0,2),topCourses=snap.courses.slice(0,2),week=window.StudyTime?.week?.()||0;
    const distribution=top.length?'<details class="study-rhythm-details"><summary><span><b>Distribuição do tempo</b><small>Mapas, disciplinas e concursos mais estudados</small></span><i aria-hidden="true">⌄</i></summary><div class="study-rhythm-distribution"><div><span>Mapas</span>'+top.map(row=>'<div class="study-ranking-row"><span>'+escape(analyticsMapLabel(row))+'</span><b>'+escape(fmtMin(row.seconds))+'</b></div>').join('')+'</div><div><span>Disciplinas</span>'+topCategories.map(row=>'<div class="study-ranking-row"><span>'+escape(row.label)+'</span><b>'+escape(fmtMin(row.seconds))+'</b></div>').join('')+'</div><div><span>Concursos</span>'+topCourses.map(row=>'<div class="study-ranking-row"><span>'+escape(row.label)+'</span><b>'+escape(fmtMin(row.seconds))+'</b></div>').join('')+'</div></div></details>':'<div class="study-rhythm-empty"><b>Seu ritmo começa nas primeiras sessões.</b><span>Estude normalmente; a consistência e a distribuição aparecem aqui sem precisar configurar nada.</span></div>';
    root.innerHTML='<div class="section-head"><div><div class="kicker">Consistência</div><h2>Ritmo de estudo</h2><p>Uma leitura rápida da semana e da sua regularidade.</p></div><button type="button" class="secondary" data-analytics-agenda>Ver agenda</button></div><div class="study-rhythm-shell"><article class="panel study-heatmap-card study-heatmap-primary"><div class="study-card-head"><span>Últimos 84 dias</span><b>'+escape(fmtMin(week))+' nesta semana</b></div>'+heatmapHtml()+'</article><div class="study-rhythm-kpis"><article><span>Semana</span><b>'+escape(fmtMin(week))+'</b></article><article><span>Sessões</span><b>'+snap.sessions.length+'</b></article><article><span>Simulados</span><b>'+snap.attempts+'</b></article><article><span>Tempo total</span><b>'+escape(fmtMin(snap.total))+'</b></article></div></div>'+distribution;
    root.querySelector('[data-analytics-agenda]')?.addEventListener('click',()=>nav('agenda'));
  }
  function ensureDoubtPanel(){
    let panel=document.getElementById('studyDoubtPanel');
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='studyDoubtPanel';
    panel.className='study-doubt-panel';
    panel.hidden=true;
    panel.innerHTML='<div class="study-doubt-card"><div class="study-doubt-head"><div><span class="kicker">Captura rápida</span><h3>Anotar dúvida</h3><small id="studyDoubtMapLabel"></small></div><button type="button" data-doubt-close aria-label="Fechar">×</button></div><textarea id="studyDoubtText" rows="5" maxlength="1200" placeholder="Escreva a dúvida sem sair do mapa…"></textarea><div class="study-doubt-actions"><button type="button" class="secondary" data-doubt-close>Cancelar</button><button type="button" class="primary" data-doubt-save>Salvar dúvida</button></div></div>';
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-doubt-close]').forEach(button=>button.onclick=()=>panel.hidden=true);
    panel.querySelector('[data-doubt-save]').onclick=saveDoubtFromPanel;
    return panel;
  }
  function openDoubtPanel(){
    if(!state?.readerMapKey)return toast('Abra um mapa antes de anotar uma dúvida.');
    const panel=ensureDoubtPanel(),map=mapById(state.readerMapKey);
    panel.hidden=false;
    panel.querySelector('#studyDoubtMapLabel').textContent=[map?.code,map?.shortTitle||map?.title].filter(Boolean).join(' · ');
    const input=panel.querySelector('#studyDoubtText');input.value='';setTimeout(()=>input.focus(),0);
  }
  function saveDoubtFromPanel(){
    const panel=ensureDoubtPanel(),input=panel.querySelector('#studyDoubtText'),text=String(input.value||'').trim();
    if(!text)return toast('Escreva a dúvida antes de salvar.');
    const map=mapById(state.readerMapKey),data=readData(),now=isoNow();
    data.doubts.push({id:uid('doubt'),mapKey:state.readerMapKey||'',courseId:map?.courseId||'',text,resolved:false,createdAt:now,updatedAt:now});
    writeData(data);panel.hidden=true;toast('Dúvida salva.');renderHomeDashboard();renderProgressDashboard();
  }
  function toggleDoubtResolved(id){
    const data=readData(),row=data.doubts.find(item=>item.id===id);if(!row)return;
    row.resolved=!row.resolved;row.updatedAt=isoNow();writeData(data);renderDoubtInbox();renderHomeDashboard();renderProgressDashboard();
  }
  function renderDoubtInbox(){
    let root=document.getElementById('studyDoubtInbox');
    const view=document.querySelector('[data-view="progress"]');
    if(!view)return;
    if(!root){root=document.createElement('section');root.id='studyDoubtInbox';root.className='section study-doubt-inbox';view.appendChild(root)}
    const rows=readData().doubts.filter(row=>!row.deleted).sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)).slice(0,12);
    root.classList.toggle('is-empty',!rows.length);
    root.innerHTML='<div class="section-head"><div><div class="kicker">Anotações</div><h2>Minhas dúvidas</h2><p>'+(rows.length?'Capture durante o estudo e marque quando estiver resolvida.':'Nenhuma dúvida registrada por enquanto.')+'</p></div>'+(rows.length?'<span class="study-doubt-count">'+rows.filter(row=>!row.resolved).length+' abertas</span>':'')+'</div><div class="study-doubt-list">'+(rows.length?rows.map(row=>{const map=mapById(row.mapKey);return '<article class="'+(row.resolved?'resolved':'')+'"><button type="button" data-doubt-toggle="'+escape(row.id)+'" aria-label="'+(row.resolved?'Reabrir dúvida':'Marcar dúvida como resolvida')+'">'+(row.resolved?'✓':'○')+'</button><div><b>'+escape(map?.code||'Dúvida')+'</b><p>'+escape(row.text)+'</p><small>'+escape(new Date(row.createdAt).toLocaleString('pt-BR'))+'</small></div>'+(map?'<button type="button" class="secondary" data-doubt-open="'+escape(row.mapKey)+'">Abrir mapa</button>':'')+'</article>'}).join(''):'<div class="study-doubt-empty"><span aria-hidden="true">○</span><div><b>Nenhuma dúvida registrada</b><small>Quando você salvar uma dúvida durante o estudo, ela aparece aqui.</small></div></div>')+'</div>';
    root.querySelectorAll('[data-doubt-toggle]').forEach(button=>button.onclick=()=>toggleDoubtResolved(button.dataset.doubtToggle));
    root.querySelectorAll('[data-doubt-open]').forEach(button=>button.onclick=()=>openMap(button.dataset.doubtOpen));
  }
  function goalHuman(minutes,label){const total=Math.max(0,Math.round(Number(minutes)||0)),h=Math.floor(total/60),m=total%60;return(h?h+'h':'')+(m?(h?' '+m+'min':m+'min'):'')+(label?' '+label:'')||'0min'+(label?' '+label:'')}
  function goalsFromForm(form){
    const fd=new FormData(form);
    return{dailyMinutes:clamp(parseDurationMinutes(fd.get('dailyMinutes'),120),1,1440)||120,weeklyMinutes:clamp(parseDurationMinutes(fd.get('weeklyMinutes'),600),1,10080)||600,pomodoroWork:clamp(parseDurationMinutes(fd.get('pomodoroWork'),25),5,180)||25,pomodoroBreak:clamp(parseDurationMinutes(fd.get('pomodoroBreak'),5),1,60)||5,autoFocus:false};
  }
  function persistGoalDraft(form){
    goalDraft=goalsFromForm(form);
    const data=readData();
    data.goals={...goalDraft};
    writeData(data,{touch:false});
    return goalDraft;
  }
  function saveGoalsFromForm(form){
    const data=readData();
    // Releia o formulário no submit: um draft anterior não pode sobrescrever campos recém-editados.
    data.goals={...goalsFromForm(form)};
    goalDraft=null;
    writeData(data);renderAll();toast('Metas de estudo salvas.');
  }
  function requestResetStudyTime(scope){
    if(readActive())return toast('Finalize a sessão ativa antes de zerar o tempo de estudo.');
    const labels={today:['Zerar tempo de hoje?','Os minutos contabilizados hoje serão zerados. Sessões e progresso dos mapas não serão apagados.'],week:['Zerar tempo desta semana?','Os minutos contabilizados nesta semana serão zerados. Sessões e progresso dos mapas não serão apagados.'],all:['Zerar todo o histórico de tempo?','Todos os minutos acumulados serão zerados. Sessões, agenda, OK/DIF/REV, notas, simulados e demais dados serão preservados.']},entry=labels[scope];
    if(!entry||!window.StudyTime?.reset)return false;
    const action=async()=>{const result=StudyTime.reset(scope);if(result===false)return toast('Finalize a sessão ativa antes de zerar o tempo.');renderAll();if(typeof syncPreferencesCloud==='function')await syncPreferencesCloud().catch(()=>{});toast(scope==='all'?'Histórico de tempo zerado.':scope==='week'?'Tempo da semana zerado.':'Tempo de hoje zerado.');};
    if(typeof askConfirm==='function'){askConfirm(entry[0],entry[1],action,'Zerar tempo');return true}
    if(window.confirm(entry[0]+'\n\n'+entry[1]))void action();
    return true;
  }
  function renderStudySettings(){
    const view=document.querySelector('[data-view="settings"]');
    if(!view)return;
    let root=document.getElementById('studySettingsPanel');
    if(!root){
      root=document.createElement('div');
      root.id='studySettingsPanel';
      root.className='panel study-settings-panel';
      const layout=view.querySelector('.settings-layout')||view;
      layout.insertAdjacentElement('afterend',root);
    }
    // V15.48.8-G: refresh de nuvem/analytics não pode desmontar
    // o formulário enquanto um campo de duração está sendo editado.
    // O submit continua renderizando normalmente quando o foco sai do input.
    const focused=document.activeElement;
    if((goalDraft&&root.querySelector('#studyGoalsForm'))||(focused&&root.contains(focused)&&focused.matches?.('#studyGoalsForm .study-duration-input')))return;
    const data=readData(),g=goalDraft||data.goals,snap=goalSnapshot();
    const allTime=window.StudyTime?.all?.()||0;
    const manageOpen=!!root.querySelector('.study-time-manage[open]');
    root.innerHTML='<div class="panel-kicker">Rotina de estudo</div><div class="study-settings-head"><div><h2>Metas e timer</h2><p>Defina sua carga de estudo e o comportamento das sessões.</p></div><div class="study-settings-summary"><span>Hoje <b>'+escape(fmtMin(snap.today))+'</b></span><span>Semana <b>'+escape(fmtMin(snap.week))+'</b></span></div></div><form id="studyGoalsForm" class="study-goals-form"><label>Meta diária <b class="study-goal-human">'+escape(goalHuman(g.dailyMinutes,'/ dia'))+'</b><span class="study-duration-field"><input class="study-duration-input" name="dailyMinutes" type="text" inputmode="text" autocomplete="off" value="'+escape(fmtDurationInput(g.dailyMinutes))+'" placeholder="Ex.: 7h 30min"><small>h</small></span></label><label>Meta semanal <b class="study-goal-human">'+escape(goalHuman(g.weeklyMinutes,'/ semana'))+'</b><span class="study-duration-field"><input class="study-duration-input" name="weeklyMinutes" type="text" inputmode="text" autocomplete="off" value="'+escape(fmtDurationInput(g.weeklyMinutes))+'" placeholder="Ex.: 35h"><small>h</small></span></label><label>Pomodoro <b class="study-goal-human">'+escape(goalHuman(g.pomodoroWork,''))+'</b><span class="study-duration-field"><input class="study-duration-input" name="pomodoroWork" type="text" inputmode="text" autocomplete="off" value="'+escape(fmtDurationInput(g.pomodoroWork))+'" placeholder="Ex.: 25min"><small>min</small></span></label><label>Pausa <b class="study-goal-human">'+escape(goalHuman(g.pomodoroBreak,''))+'</b><span class="study-duration-field"><input class="study-duration-input" name="pomodoroBreak" type="text" inputmode="text" autocomplete="off" value="'+escape(fmtDurationInput(g.pomodoroBreak))+'" placeholder="Ex.: 5min"><small>min</small></span></label><div class="study-settings-actions"><button class="primary" type="submit">Salvar metas</button><button class="secondary" type="button" data-settings-pomodoro>Iniciar Pomodoro</button></div></form><details class="study-time-manage"'+(manageOpen?' open':'')+' aria-labelledby="studyTimeManageTitle"><summary><div class="study-time-manage-head"><div><span class="panel-kicker">Tempo registrado</span><h3 id="studyTimeManageTitle">Gerenciar tempo de estudo</h3><p>Corrija contadores sem apagar sessões, agenda, progresso ou anotações.</p></div><div class="study-time-manage-total"><span>Total acumulado</span><b>'+escape(fmtMin(allTime))+'</b></div></div></summary><div class="study-time-manage-body"><div class="study-time-manage-actions"><button type="button" class="secondary" data-study-time-reset="today">Zerar hoje</button><button type="button" class="secondary" data-study-time-reset="week">Zerar semana</button></div><div class="study-time-manage-danger"><button type="button" class="danger" data-study-time-reset="all">Zerar todo o histórico</button></div><small class="study-time-manage-note">A limpeza altera somente as métricas de tempo. OK/DIF/REV, notas, agenda, simulados e demais dados permanecem intactos.</small></div></details>';
    const form=root.querySelector('#studyGoalsForm');
    form.oninput=()=>{persistGoalDraft(form)};
    form.onchange=()=>{persistGoalDraft(form)};
    form.onsubmit=e=>{e.preventDefault();saveGoalsFromForm(form)};
    root.querySelector('[data-settings-pomodoro]').onclick=()=>startPomodoro(g.pomodoroWork);
    root.querySelectorAll('[data-study-time-reset]').forEach(button=>button.onclick=()=>requestResetStudyTime(button.dataset.studyTimeReset));
    if(window.StudyPlanner?.render)setTimeout(()=>StudyPlanner.render(),0);
    setTimeout(()=>window.SettingsControlCenter?.render?.(),0);
  }
  function enhanceStudyPlan(){
    const grid=document.getElementById('homeStudyPlan'),section=document.getElementById('homeReviewSection');
    if(!grid||!section||section.hidden)return;
    let footer=section.querySelector('.study-plan-footer');
    if(!footer){footer=document.createElement('div');footer.className='study-plan-footer';grid.insertAdjacentElement('afterend',footer)}
    const snap=window.StudyCoach?.snapshot?.(),planned=Number(snap?.summary?.plannedMinutes)||0,today=window.StudyTime?.today?.()||0,realized=Math.round(today/60),remaining=Math.max(0,planned-realized),pct=planned?Math.min(100,Math.round(realized/planned*100)):0;
    footer.innerHTML='<span class="study-plan-footer-stat">Planejado <b>'+escape(fmtDurationInput(planned))+'</b></span><span class="study-plan-footer-stat">Realizado <b>'+escape(fmtDurationInput(realized))+'</b></span><span class="study-plan-footer-remaining">'+(remaining?escape(fmtDurationInput(remaining))+' restantes':'Plano concluído')+'</span><i role="progressbar" aria-label="Progresso do plano de hoje" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><em style="width:'+pct+'%"></em></i><strong>'+pct+'%</strong>';
    const start=document.getElementById('homeReviewNowBtn');
    if(start)start.onclick=()=>startDailyPlanFirst();
    const first=grid.querySelector('[data-study-plan-open="0"]');
    if(first)first.onclick=()=>startDailyPlanFirst();
  }
  async function startDailyPlanFirst(){
    const active=readActive();
    if(active){
      if(active.mapKey)await openMap(active.mapKey);
      if(!active.running)resumeSession();
      renderTimer();
      return active;
    }
    const item=window.StudyCoach?.snapshot?.().items?.[0];
    if(!item)return startSession({mode:'free'});
    if(item.kind==='simulation'){nav('simulations');return}
    if(item.key){
      const map=mapById(item.key);
      await openMap(item.key);
      return startSession({map,mode:'planned',minutes:item.minutes||20,label:item.title||map?.shortTitle||'Sessão planejada'});
    }
  }
  function ensureQuickDoubtButton(){
    const reader=document.getElementById('reader');
    if(!reader||document.getElementById('readerDoubtQuick'))return;
    const button=document.createElement('button');
    button.id='readerDoubtQuick';
    button.type='button';
    button.className='reader-doubt-quick';
    button.innerHTML='<span>?</span><b>Anotar dúvida</b>';
    button.onclick=openDoubtPanel;
    reader.appendChild(button);
  }
  function ensureAgendaNav(){
    if(!document.querySelector('.nav [data-nav="agenda"]')){
      const progress=document.querySelector('.nav [data-nav="progress"]');
      if(progress){
        const button=document.createElement('button');
        button.className='nav-btn';
        button.dataset.nav='agenda';
        button.setAttribute('aria-label','Agenda');
        button.innerHTML='<span class="ui-icon icon-calendar ui-icon-md" aria-hidden="true"></span><span class="txt">Agenda</span>';
        progress.insertAdjacentElement('afterend',button);
      }
    }
    if(!document.querySelector('.bottom-nav [data-nav="agenda"]')){
      const progress=document.querySelector('.bottom-nav [data-nav="progress"]');
      if(progress){
        const button=document.createElement('button');
        button.className='bottom-nav-agenda';
        button.dataset.nav='agenda';
        button.setAttribute('aria-label','Agenda');
        button.innerHTML='<span class="ui-icon icon-calendar ui-icon-lg" aria-hidden="true"></span><span class="bottom-nav-label">Agenda</span>';
        progress.insertAdjacentElement('beforebegin',button);
      }
    }
  }
  function renderAll(){
    renderTimer();
    if(state?.view==='home'){renderHomeDashboard();enhanceStudyPlan()}
    if(state?.view==='agenda')renderAgenda();
    if(state?.view==='progress'){renderProgressDashboard();renderDoubtInbox()}
    if(state?.view==='settings')renderStudySettings();
  }

  const baseRenderHome=renderHome;
  renderHome=function(){baseRenderHome();renderHomeDashboard();enhanceStudyPlan()};
  const baseRenderProgress=renderProgress;
  renderProgress=function(){baseRenderProgress();renderProgressDashboard();renderDoubtInbox()};
  const baseRenderSettings=renderSettings;
  renderSettings=function(){baseRenderSettings();renderStudySettings()};

  function init(){
    ensureAgendaNav();
    ensureAgendaView();
    ensureQuickDoubtButton();
    ensureDoubtPanel();
    renderTimer();
    ensureTimerIntervals();
    if(readActive())window.__manualStudySessionActive=true;
    window.StudyTime?.migrateLegacy?.();
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&readActive()?.running)pauseSession({automatic:true})});
    window.addEventListener('pagehide',()=>{if(readActive()?.running)pauseSession({automatic:true})});
    window.addEventListener('storage',e=>{if(e.key===DATA_KEY||e.key===ACTIVE_KEY)renderAll()});
  }

  window.StudyDashboard={
    exportData:()=>readData(),
    importData,
    mergeData,
    hasData:()=>{const d=readData();return!!(d.sessions.length||d.agenda.length||d.doubts.length||d.updatedAt)},
    render:renderAll,
    renderAgenda,
    start:startSession,
    startPomodoro,
    pause:pauseSession,
    resume:resumeSession,
    finish:finishSession,
    active:readActive,
    elapsed:()=>activeElapsed(readActive()),
    addAgenda:addAgendaItem,
    removeAgenda:requestDeleteAgendaItem,
    removeSession:requestDeleteSessionRecord,
    goals:()=>({...readData().goals}),
    openDoubt:openDoubtPanel
  };
  window.renderStudyAgenda=renderAgenda;
  init();
})();

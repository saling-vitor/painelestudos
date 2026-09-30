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

'use strict';
(()=>{
  if(window.__settingsControlCenterV15380)return;
  window.__settingsControlCenterV15380=true;

  const PANEL_META=[
    ['.sync-panel','settings-area-sync','Conta e sincronização',false],
    ['.app-update-panel','settings-area-update','Atualizações',true],
    ['#studyAutomationPanel','settings-area-automation','Automação e planejamento',true],
    ['.admin-panel','settings-area-admin','Administração',true],
    ['#studySettingsPanel','settings-area-study','Metas, timer e foco',true],
    ['.app-appearance-panel','settings-area-appearance','Aparência',true],
    ['.backup-panel','settings-area-backup','Backup e restauração',true],
    ['#appDiagnosticPanel','settings-area-diagnostic','Sobre e diagnóstico',true]
  ];
  let resizeTimer=0;

  const esc=value=>typeof ESC==='function'?ESC(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmtMinutes=value=>{const n=Math.max(0,Math.round(Number(value)||0)),h=Math.floor(n/60),m=n%60;if(h&&m)return h+'h '+m+'min';if(h)return h+'h';return m+'min'};
  const deviceLabel=()=>{
    const root=document.documentElement,ua=navigator.userAgent||'';
    if(root.classList.contains('is-ipad'))return'iPad';
    if(/iPhone|iPod/i.test(ua))return'iPhone';
    if(/Android/i.test(ua))return'Android';
    return'Desktop';
  };

  function settingsView(){return document.querySelector('[data-view="settings"]')}
  function layout(){return settingsView()?.querySelector('.settings-layout-v3')||null}

  function ensureStatusStrip(){
    const view=settingsView(),head=view?.querySelector(':scope>.section-head');if(!view||!head)return null;
    let root=document.getElementById('settingsControlSummary');
    if(!root){root=document.createElement('section');root.id='settingsControlSummary';root.className='settings-control-summary';head.insertAdjacentElement('afterend',root)}
    const cfg=window.StudyAutomation?.settings?.()||{},active=['autoAgenda','autoReplan','simRecovery','archiveSuggestions','importInference'].filter(key=>cfg[key]!==false).length,diag=window.StudyAutomation?.diagnostics?.()||{healthy:true,warnings:0};
    const cloud=window.StudyCloud?.session?.(),pending=(window.StudyCloud?.pendingCount?.()||0)+(typeof preferencesPending==='function'&&preferencesPending()?1:0);
    const stateLabel=diag.healthy?'Tudo funcionando':'Atenção necessária';
    const cloudLabel=cloud?(pending?'Nuvem com '+pending+' pendência'+(pending===1?'':'s'):'Nuvem sincronizada'):'Nuvem desconectada';
    root.innerHTML='<div class="settings-control-state '+(diag.healthy?'is-ok':'is-attention')+'"><span></span><b>'+esc(stateLabel)+'</b></div><span>'+esc(cloudLabel)+'</span><span>'+active+' automações ativas</span><span>'+esc(typeof APP_VERSION_LABEL!=='undefined'?APP_VERSION_LABEL:'Versão atual')+'</span>';
    return root;
  }

  function movePanels(){
    const host=layout();if(!host)return;
    host.classList.add('settings-control-grid');
    for(const col of host.querySelectorAll(':scope>.settings-column')){
      for(const panel of [...col.children])host.appendChild(panel);
    }
    for(const [selector,area] of PANEL_META){
      const panel=document.querySelector(selector);if(!panel)continue;
      panel.classList.add('settings-control-panel',area);
      if(panel.parentElement!==host)host.appendChild(panel);
    }
    host.querySelectorAll(':scope>.settings-column').forEach(col=>{col.hidden=true});
    const order=['settings-area-sync','settings-area-update','settings-area-automation','settings-area-admin','settings-area-study','settings-area-appearance','settings-area-backup','settings-area-diagnostic'];
    order.forEach(cls=>{const panel=host.querySelector('.'+cls);if(panel)host.appendChild(panel)});
  }

  function renderAdminSummary(){
    const panel=document.querySelector('.admin-panel');if(!panel)return;
    let root=panel.querySelector('.settings-admin-summary');
    if(!root){root=document.createElement('div');root.className='settings-admin-summary';const actions=panel.querySelector('.admin-actions');actions?.insertAdjacentElement('beforebegin',root)}
    const courses=typeof combinedCourses==='function'?combinedCourses():[],maps=typeof combinedMaps==='function'?combinedMaps():[],sims=typeof combinedSimulations==='function'?combinedSimulations():[];
    root.innerHTML='<span><b>'+courses.length+'</b> curso'+(courses.length===1?'':'s')+'</span><span><b>'+maps.length+'</b> mapa'+(maps.length===1?'':'s')+'</span><span><b>'+sims.length+'</b> simulado'+(sims.length===1?'':'s')+'</span>';
  }

  function simplifyAppearance(){
    const panel=document.getElementById('appAppearancePanel');if(!panel)return;
    panel.querySelector('.app-icon-live-preview')?.classList.add('settings-redundant-preview');
    const dark=matchMedia('(prefers-color-scheme: dark)').matches,auto=panel.querySelector('[data-app-icon-mode="auto"] small');
    if(auto)auto.textContent='Segue o sistema · '+(dark?'Escuro':'Claro')+' ativo agora';
    const current=document.getElementById('appIconCurrent');
    if(current&&current.textContent.trim()==='Automático')current.textContent='Automático · '+(dark?'Escuro':'Claro');
  }

  async function renderBackupRetention(){
    const panel=document.querySelector('.backup-panel');if(!panel)return;
    let root=panel.querySelector('.settings-backup-retention');
    if(!root){root=document.createElement('div');root.className='settings-backup-retention';const note=panel.querySelector('.settings-security-note');note?.insertAdjacentElement('afterend',root)}
    let count='';
    try{if(typeof listRestorePoints==='function'){const points=await listRestorePoints();count=points.length+' salvo'+(points.length===1?'':'s')+' agora'}}catch{}
    root.innerHTML='<span><b>Retenção automática</b><small>O sistema mantém os últimos 10 pontos de restauração neste dispositivo.</small></span><strong>'+esc(count||'até 10 pontos')+'</strong>';
  }

  function renderGoalRecommendation(){
    const panel=document.getElementById('studySettingsPanel'),head=panel?.querySelector('.study-settings-head');if(!panel||!head)return;
    let root=panel.querySelector('.study-goal-recommendation');
    if(!root){root=document.createElement('div');root.className='study-goal-recommendation';head.insertAdjacentElement('afterend',root)}
    const current=Math.max(0,Number(window.StudyDashboard?.goals?.().dailyMinutes)||0),recommended=Math.max(0,Number(window.StudyAutomation?.recommendedDailyMinutes?.())||current),diff=recommended-current;
    root.classList.toggle('is-deficit',diff>0);
    root.innerHTML='<div><span>Carga recomendada pelas provas atuais</span><b>'+esc(fmtMinutes(recommended))+'/dia</b></div><p>'+(diff>0?'Sua meta atual é '+esc(fmtMinutes(current))+'/dia · déficit estimado de '+esc(fmtMinutes(diff))+'.':'Sua meta atual de '+esc(fmtMinutes(current))+'/dia cobre a recomendação do planejamento.')+'</p>';
  }

  function renderTechnicalSummary(){
    const panel=document.getElementById('appDiagnosticPanel');if(!panel)return;
    const title=panel.querySelector('h2 span:last-child');if(title)title.textContent='Saúde técnica';
    const description=panel.querySelector(':scope>p');if(description)description.textContent='Versão, nuvem, offline, cache e dispositivos desta instalação.';
    let root=panel.querySelector('.settings-device-summary');
    if(!root){root=document.createElement('div');root.className='settings-device-summary';const grid=panel.querySelector('#appDiagnosticGrid');grid?.insertAdjacentElement('beforebegin',root)}
    const data=window.StudyTime?.read?.()||{devices:{}},count=Object.keys(data.devices||{}).length,other=Math.max(0,count-1);
    root.innerHTML='<div><span>'+esc(deviceLabel())+' · este dispositivo</span><b>Ativo agora</b></div><div><span>Perfis de estudo detectados</span><b>'+count+(other?' · '+other+' outro'+(other===1?'':'s'):'')+'</b></div>';
    const disclosure=document.querySelector('.settings-diagnostic-disclosure .settings-disclosure-title b');
    if(disclosure)disclosure.textContent='Dispositivos e testes';
  }

  function mobileToggleLabel(panel,defaultLabel){
    return defaultLabel||panel.querySelector('h2 span:last-child')?.textContent||panel.querySelector('h2')?.textContent||'Configuração';
  }
  function applyMobileCollapsibles(){
    const mobile=matchMedia('(max-width:700px)').matches;
    for(const [selector,,label,collapseDefault] of PANEL_META){
      const panel=document.querySelector(selector);if(!panel)continue;
      let toggle=panel.querySelector(':scope>.settings-mobile-toggle');
      if(!toggle){
        toggle=document.createElement('button');toggle.type='button';toggle.className='settings-mobile-toggle';toggle.innerHTML='<span>'+esc(mobileToggleLabel(panel,label))+'</span><b aria-hidden="true">⌄</b>';panel.prepend(toggle);
        toggle.onclick=()=>{panel.classList.toggle('is-mobile-collapsed');toggle.setAttribute('aria-expanded',String(!panel.classList.contains('is-mobile-collapsed')))};
      }
      if(mobile){
        if(!panel.dataset.mobileCollapseInitialized){panel.dataset.mobileCollapseInitialized='1';panel.classList.toggle('is-mobile-collapsed',!!collapseDefault)}
        toggle.setAttribute('aria-expanded',String(!panel.classList.contains('is-mobile-collapsed')));
      }else{
        panel.classList.remove('is-mobile-collapsed');toggle.setAttribute('aria-expanded','true');
      }
    }
  }

  function renderControlCenter(){
    const view=settingsView();if(!view)return;
    view.classList.add('settings-control-center');
    const subtitle=view.querySelector(':scope>.section-head p');if(subtitle)subtitle.textContent='Centro de controle da conta, estudos, automações, dados e aplicativo.';
    ensureStatusStrip();
    movePanels();
    renderAdminSummary();
    simplifyAppearance();
    void renderBackupRetention();
    renderGoalRecommendation();
    renderTechnicalSummary();
    applyMobileCollapsibles();
  }

  function wrapRenderSettings(){
    const base=window.renderSettings;if(typeof base!=='function'||base.__controlCenterWrapped)return;
    const wrapped=function(){const result=base.apply(this,arguments);setTimeout(renderControlCenter,20);return result};
    wrapped.__controlCenterWrapped=true;window.renderSettings=wrapped;
  }

  function init(){
    wrapRenderSettings();
    setTimeout(renderControlCenter,80);
    window.addEventListener('studyapp:navigation',()=>setTimeout(()=>{if(state?.view==='settings')renderControlCenter()},30));
    window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(state?.view==='settings')renderControlCenter()},100)});
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(state?.view==='settings')simplifyAppearance()});
  }

  window.SettingsControlCenter={render:renderControlCenter};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
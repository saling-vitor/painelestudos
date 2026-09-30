'use strict';
(()=>{
  if(window.__mobileUxV153)return;
  window.__mobileUxV153=true;

  const PHONE_QUERY='(max-width: 480px)';
  const mq=window.matchMedia(PHONE_QUERY);
  let lastY=window.scrollY||0;
  let raf=0;
  let observer=null;

  const isPhone=()=>mq.matches;
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const setPhoneClass=()=>document.documentElement.classList.toggle('is-phone-layout',isPhone());

  function updateTopbar(){
    if(!isPhone()){
      document.documentElement.classList.remove('mobile-topbar-compact','mobile-topbar-hidden');
      lastY=window.scrollY||0;
      return;
    }
    const y=Math.max(0,window.scrollY||0),search=q('#globalSearch'),focused=document.activeElement===search,readerOpen=document.documentElement.classList.contains('mobile-reader-open');
    document.documentElement.classList.toggle('mobile-topbar-compact',y>24);
    const goingDown=y>lastY+5,goingUp=y<lastY-5;
    if(focused||readerOpen||y<72)document.documentElement.classList.remove('mobile-topbar-hidden');
    else if(goingDown&&y>150)document.documentElement.classList.add('mobile-topbar-hidden');
    else if(goingUp)document.documentElement.classList.remove('mobile-topbar-hidden');
    lastY=y;
  }
  function onScroll(){
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;updateTopbar()});
  }

  function updateReaderMode(){
    const open=!!q('#reader.open')||!!q('.simulation-reader.open');
    document.documentElement.classList.toggle('mobile-reader-open',isPhone()&&open);
  }

  function ensureAgendaToday(){
    const view=q('[data-view="agenda"]');
    if(!view)return;
    const active=view.classList.contains('active');
    if(!isPhone()||!active){view.dataset.mobileAgendaOpened='';return}
    if(view.dataset.mobileAgendaOpened==='1')return;
    view.dataset.mobileAgendaOpened='1';
    const today=q('[data-agenda-mode="today"]',view);
    if(today&&!today.classList.contains('active'))today.click();
  }

  function enhanceCourseCards(){
    if(!isPhone())return;
    qa('.course-card').forEach(card=>{
      if(card.dataset.mobileEnhanced==='1')return;
      card.dataset.mobileEnhanced='1';
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='mobile-course-details';
      btn.setAttribute('aria-expanded','false');
      btn.innerHTML='<span>Detalhes</span><i aria-hidden="true">⌄</i>';
      btn.onclick=e=>{
        e.preventDefault();e.stopPropagation();
        const open=card.classList.toggle('mobile-details-open');
        btn.setAttribute('aria-expanded',open?'true':'false');
        btn.querySelector('span').textContent=open?'Menos':'Detalhes';
      };
      card.appendChild(btn);
    });
  }

  const panelLabel=panel=>{
    if(panel.id==='studySettingsPanel')return'Metas e timer';
    if(panel.classList.contains('sync-panel'))return'Sincronização';
    if(panel.classList.contains('admin-panel'))return'Administração';
    if(panel.classList.contains('app-update-panel'))return'Atualizações';
    if(panel.classList.contains('diagnostic-panel'))return'Diagnóstico';
    if(panel.classList.contains('backup-panel'))return'Backup e restauração';
    return panel.querySelector('h2')?.textContent?.trim()||'Configurações';
  };
  function enhanceSettings(){
    if(!isPhone())return;
    const view=q('[data-view="settings"]');if(!view)return;
    qa('.panel',view).forEach(panel=>{
      if(panel.closest('.modal'))return;
      if(panel.querySelector(':scope > .mobile-settings-toggle'))return;
      panel.dataset.mobileAccordion='1';
      panel.classList.add('mobile-settings-panel');
      const label=panelLabel(panel),button=document.createElement('button');
      button.type='button';button.className='mobile-settings-toggle';
      button.innerHTML='<span>'+label+'</span><i aria-hidden="true">⌄</i>';
      const open=panel.classList.contains('sync-panel')||panel.id==='studySettingsPanel';
      panel.classList.toggle('mobile-settings-collapsed',!open);
      button.setAttribute('aria-expanded',open?'true':'false');
      button.onclick=()=>{
        const next=panel.classList.contains('mobile-settings-collapsed');
        panel.classList.toggle('mobile-settings-collapsed',!next);
        button.setAttribute('aria-expanded',next?'true':'false');
      };
      panel.prepend(button);
    });
    const advanced=q('#plannerAdvancedSettings',view);
    if(advanced&&!advanced.querySelector(':scope > .mobile-subsettings-toggle')){
      advanced.dataset.mobileAccordion='1';
      advanced.classList.add('mobile-subsettings','mobile-subsettings-collapsed');
      const button=document.createElement('button');button.type='button';button.className='mobile-subsettings-toggle';button.setAttribute('aria-expanded','false');button.innerHTML='<span>Semana e prioridades</span><i aria-hidden="true">⌄</i>';
      button.onclick=()=>{
        const next=advanced.classList.contains('mobile-subsettings-collapsed');
        advanced.classList.toggle('mobile-subsettings-collapsed',!next);
        button.setAttribute('aria-expanded',next?'true':'false');
      };
      advanced.prepend(button);
    }
  }

  function wrapProgressNode(node,key,title,subtitle,open=false){
    if(!node||node.closest('[data-mobile-progress-group="'+key+'"]'))return;
    const details=document.createElement('details');
    details.className='mobile-progress-group';
    details.dataset.mobileProgressGroup=key;
    details.open=open||!isPhone();
    const summary=document.createElement('summary');
    summary.innerHTML='<span><b>'+title+'</b><small>'+subtitle+'</small></span><i aria-hidden="true">⌄</i>';
    node.parentNode.insertBefore(details,node);
    details.append(summary,node);
  }
  function enhanceProgress(){
    const view=q('[data-view="progress"]');if(!view)return;
    if(!isPhone()){qa('.mobile-progress-group',view).forEach(group=>group.open=true);return}
    if(!view.classList.contains('active'))return;
    wrapProgressNode(q('#progressMetrics',view),'summary','Resumo','Progresso, tópicos e tempo',true);
    const insights=q('#progressInsights',view);
    const summaryGroup=q('[data-mobile-progress-group="summary"]',view);
    if(insights&&summaryGroup&&!insights.closest('.mobile-progress-group'))summaryGroup.appendChild(insights);
    wrapProgressNode(q('#studyIntelligencePanel',view),'priority','Prioridades','Revisões, erros e próximos passos',true);
    wrapProgressNode(q('#studyAnalyticsPanel',view),'performance','Desempenho','Ritmo, consistência e analytics',false);
    const doubts=q('#studyDoubtInbox',view),performance=q('[data-mobile-progress-group="performance"]',view);
    if(doubts&&performance&&!doubts.closest('.mobile-progress-group'))performance.appendChild(doubts);
    wrapProgressNode(q('#progressInfo',view),'subjects','Disciplinas','Mapas, estados e cobertura',false);
    if(!isPhone())qa('.mobile-progress-group',view).forEach(d=>d.open=true);
  }

  function enhanceSkeletons(){
    if(!isPhone())return;
    qa('.boot-loading,.diagnostic-loading,.restore-points-loading').forEach(el=>{
      if(el.dataset.mobileSkeleton==='1')return;
      el.dataset.mobileSkeleton='1';
      el.classList.add('mobile-skeleton');
      if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',el.textContent.trim()||'Carregando');
    });
  }

  function enforcePhoneBottomNav(){
    const nav=q('.bottom-nav');if(!nav)return;
    qa('[data-nav]',nav).forEach(button=>{
      if(!isPhone()){button.removeAttribute('data-phone-hidden');return}
      const view=button.dataset.nav;
      const keep=['home','courses','maps','progress','settings'].includes(view);
      if(keep)button.removeAttribute('data-phone-hidden');else button.setAttribute('data-phone-hidden','1');
    });
  }

  function enhanceAll(){
    setPhoneClass();
    updateReaderMode();
    enforcePhoneBottomNav();
    enhanceCourseCards();
    enhanceSettings();
    enhanceProgress();
    enhanceSkeletons();
    ensureAgendaToday();
    updateTopbar();
  }

  function observe(){
    observer?.disconnect();
    observer=new MutationObserver(mutations=>{
      let readerChanged=false,needsEnhance=false;
      for(const m of mutations){
        if(m.type==='attributes'&&(m.target.id==='reader'||m.target.classList?.contains('simulation-reader')))readerChanged=true;
        if(m.type==='childList'||(m.type==='attributes'&&m.attributeName==='class'))needsEnhance=true;
      }
      if(readerChanged)updateReaderMode();
      if(needsEnhance)setTimeout(enhanceAll,0);
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  }

  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('hashchange',()=>setTimeout(enhanceAll,0));
  window.addEventListener('resize',()=>setTimeout(enhanceAll,40));
  mq.addEventListener?.('change',()=>setTimeout(enhanceAll,0));
  q('#globalSearch')?.addEventListener('focus',()=>document.documentElement.classList.remove('mobile-topbar-hidden'));
  q('#globalSearch')?.addEventListener('blur',()=>setTimeout(updateTopbar,60));

  window.MobileUX={refresh:enhanceAll,isPhone};
  observe();
  enhanceAll();
})();

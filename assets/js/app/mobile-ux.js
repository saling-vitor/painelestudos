'use strict';
(()=>{
  if(window.__mobileUxV153)return;
  window.__mobileUxV153=true;

  const PHONE_QUERY='(max-width: 480px)';
  const mq=window.matchMedia(PHONE_QUERY);
  let lastY=window.scrollY||0;
  let raf=0;
  let observer=null;
  let readerSkeletonSrc='';

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

  function enhanceHome(){
    if(!isPhone())return;
    const card=q('.study-command-card');
    if(card&&!q('.mobile-study-plan-toggle',card)){
      const metrics=q('.study-command-metrics',card),button=document.createElement('button');
      button.type='button';button.className='mobile-study-plan-toggle';button.setAttribute('aria-expanded','false');
      button.innerHTML='<span>Ver plano completo</span><i aria-hidden="true">⌄</i>';
      button.onclick=()=>{
        const open=card.classList.toggle('mobile-plan-expanded');
        button.setAttribute('aria-expanded',open?'true':'false');
        button.querySelector('span').textContent=open?'Ocultar detalhes':'Ver plano completo';
      };
      metrics?.insertAdjacentElement('afterend',button);
    }
  }

  function enhanceCourseView(){
    if(!isPhone())return;
    const view=q('[data-view="course"]');if(!view)return;
    const hero=q('.course-hero',view);if(!hero)return;
    hero.classList.add('mobile-course-compact');
    if(!q('.mobile-course-actions',hero)){
      const actions=document.createElement('div');actions.className='mobile-course-actions';
      actions.innerHTML='<button type="button" data-mobile-course-search><span class="ui-icon icon-search ui-icon-sm" aria-hidden="true"></span><b>Buscar</b></button><button type="button" data-mobile-course-details><span class="ui-icon icon-more ui-icon-sm" aria-hidden="true"></span><b>Detalhes</b></button>';
      const summary=q('#courseProgressSummary',hero);
      (summary||q('#courseDesc',hero)||q('#courseTitle',hero))?.insertAdjacentElement('afterend',actions);
      actions.querySelector('[data-mobile-course-search]').onclick=()=>{
        const open=hero.classList.toggle('mobile-course-search-open');
        if(open)setTimeout(()=>q('#courseSearch',hero)?.focus(),40);
      };
      actions.querySelector('[data-mobile-course-details]').onclick=e=>{
        const open=hero.classList.toggle('mobile-course-expanded');
        e.currentTarget.querySelector('b').textContent=open?'Menos':'Detalhes';
        e.currentTarget.setAttribute('aria-expanded',open?'true':'false');
      };
    }
  }

  function ensureReaderSkeleton(){
    const reader=q('#reader');if(!reader)return null;
    let skeleton=q('#mobileReaderSkeleton',reader);
    if(!skeleton){
      skeleton=document.createElement('div');skeleton.id='mobileReaderSkeleton';skeleton.className='mobile-reader-skeleton';skeleton.hidden=true;
      skeleton.innerHTML='<div class="mobile-reader-skeleton-cover"></div><div class="mobile-reader-skeleton-line wide"></div><div class="mobile-reader-skeleton-line"></div><div class="mobile-reader-skeleton-line short"></div>';
      q('#readerFrame',reader)?.insertAdjacentElement('beforebegin',skeleton);
    }
    return skeleton;
  }
  function showReaderSkeleton(){
    if(!isPhone())return;
    const reader=q('#reader'),frame=q('#readerFrame'),skeleton=ensureReaderSkeleton();
    if(!reader?.classList.contains('open')||!frame||!skeleton)return;
    const src=frame.getAttribute('src')||'';
    if(!src||src==='about:blank')return;
    if(readerSkeletonSrc!==src){readerSkeletonSrc=src;skeleton.hidden=false}
  }
  function hideReaderSkeleton(){const skeleton=q('#mobileReaderSkeleton');if(skeleton)skeleton.hidden=true}
  function enhanceReader(){
    if(!isPhone())return;
    const reader=q('#reader'),frame=q('#readerFrame');if(!reader||!frame)return;
    ensureReaderSkeleton();
    if(frame.dataset.mobileLoadBound!=='1'){
      frame.dataset.mobileLoadBound='1';
      frame.addEventListener('load',()=>setTimeout(hideReaderSkeleton,40));
    }
    let save=q('#mobileReaderSave',reader);
    if(!save){
      save=document.createElement('button');save.id='mobileReaderSave';save.type='button';save.setAttribute('role','menuitem');
      save.innerHTML='<span class="ui-icon icon-download ui-icon-sm" aria-hidden="true"></span><span>Salvar agora</span>';
      save.onclick=()=>{closeReaderMoreMenu?.();if(typeof forceSaveCurrentMap==='function')forceSaveCurrentMap();else q('#readerSave')?.click()};
      q('#readerMoreMenu',reader)?.appendChild(save);
    }
    save.hidden=!state?.readerMapKey;
    if(reader.classList.contains('open'))showReaderSkeleton();else{hideReaderSkeleton();readerSkeletonSrc=''}
  }

  function enhanceAgendaMobile(){
    if(!isPhone())return;
    const view=q('[data-view="agenda"]');if(!view)return;
    const active=q('[data-agenda-mode].active',view)?.dataset.agendaMode||'month';
    view.dataset.mobileAgendaMode=active;
    if(active==='today'){
      const head=q('.study-agenda-day-head',view);
      if(head){
        const dateInput=q('#agendaQuickForm [name="date"]',view),date=dateInput?.value?new Date(dateInput.value+'T12:00:00'):new Date();
        const kicker=head.querySelector('.kicker'),title=head.querySelector('h3');
        if(kicker)kicker.textContent='Hoje';
        if(title)title.textContent=date.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'short'}).replace('.','');
      }
    }
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
  function ensureMoreShortcuts(view){
    if(!isPhone()||!view||q('#mobileMoreShortcuts',view))return;
    const block=document.createElement('section');
    block.id='mobileMoreShortcuts';
    block.className='mobile-more-shortcuts';
    block.innerHTML='<div class="mobile-more-shortcuts-head"><span class="kicker">Acesso rápido</span><b>Mais</b></div><div class="mobile-more-shortcuts-grid"><button type="button" data-mobile-more-nav="agenda"><span class="ui-icon icon-calendar ui-icon-md" aria-hidden="true"></span><b>Calendário</b><small>Agenda de estudos</small></button><button type="button" data-mobile-more-nav="simulations"><span class="ui-icon icon-simulations ui-icon-md" aria-hidden="true"></span><b>Simulados</b><small>Treino de prova</small></button></div>';
    const layout=q('.settings-layout',view);if(layout)layout.insertAdjacentElement('beforebegin',block);else view.appendChild(block);
    qa('[data-mobile-more-nav]',block).forEach(button=>button.onclick=()=>nav(button.dataset.mobileMoreNav));
  }

  function enhanceSettings(){
    if(!isPhone())return;
    const view=q('[data-view="settings"]');if(!view)return;
    ensureMoreShortcuts(view);
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
        if(next){
          qa('.mobile-settings-panel',view).forEach(other=>{
            if(other===panel)return;
            other.classList.add('mobile-settings-collapsed');
            other.querySelector(':scope > .mobile-settings-toggle')?.setAttribute('aria-expanded','false');
          });
        }
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
    enhanceHome();
    enhanceCourseCards();
    enhanceCourseView();
    enhanceSettings();
    enhanceProgress();
    enhanceSkeletons();
    ensureAgendaToday();
    enhanceAgendaMobile();
    enhanceReader();
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

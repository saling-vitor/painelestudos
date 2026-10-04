'use strict';
(()=>{
  if(window.__mobileUxV153)return;
  window.__mobileUxV153=true;

  const PHONE_QUERY='(max-width: 480px)';
  const mq=window.matchMedia(PHONE_QUERY);
  let lastY=window.scrollY||0;
  let raf=0;
  let observer=null;
  let enhanceRaf=0;
  let readerSkeletonSrc='';

  const isPhone=()=>mq.matches&&!document.documentElement.classList.contains('is-ipad');
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
      actions.innerHTML='<button type="button" data-mobile-course-search><span class="ui-icon icon-search ui-icon-sm" aria-hidden="true"></span><b>Buscar</b></button><button type="button" data-mobile-course-filters><span class="ui-icon icon-settings ui-icon-sm" aria-hidden="true"></span><b>Filtros</b></button><button type="button" data-mobile-course-details><span class="ui-icon icon-more ui-icon-sm" aria-hidden="true"></span><b>Detalhes</b></button>';
      const summary=q('#courseProgressSummary',hero);
      (summary||q('#courseDesc',hero)||q('#courseTitle',hero))?.insertAdjacentElement('afterend',actions);
      actions.querySelector('[data-mobile-course-search]').onclick=()=>{
        const open=hero.classList.toggle('mobile-course-search-open');
        if(open)setTimeout(()=>q('#courseSearch',hero)?.focus(),40);
      };
      actions.querySelector('[data-mobile-course-filters]').onclick=e=>{
        const open=hero.classList.toggle('mobile-course-filters-open');
        e.currentTarget.classList.toggle('active',open);
        e.currentTarget.setAttribute('aria-expanded',open?'true':'false');
        e.currentTarget.querySelector('b').textContent=open?'Fechar filtros':'Filtros';
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
        if(title){const label=date.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'short'});title.textContent=label.charAt(0).toLocaleUpperCase('pt-BR')+label.slice(1)}
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
    block.innerHTML='<div class="mobile-more-shortcuts-head"><span class="kicker">Acesso rápido</span><b>Mais</b></div><div class="mobile-more-shortcuts-grid"><button type="button" data-mobile-more-nav="agenda"><span class="ui-icon icon-calendar ui-icon-md" aria-hidden="true"></span><b>Agenda</b><small>Planejamento de estudos</small></button><button type="button" data-mobile-more-nav="simulations"><span class="ui-icon icon-simulations ui-icon-md" aria-hidden="true"></span><b>Simulados</b><small>Treino de prova</small></button></div>';
    const layout=q('.settings-layout',view);if(layout)layout.insertAdjacentElement('beforebegin',block);else view.appendChild(block);
    qa('[data-mobile-more-nav]',block).forEach(button=>button.onclick=()=>nav(button.dataset.mobileMoreNav));
  }

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
    const expanded=qa('.mobile-settings-panel',view).filter(panel=>!panel.classList.contains('mobile-settings-collapsed'));
    if(expanded.length>1){
      const keep=expanded.includes(q('#studySettingsPanel',view))?q('#studySettingsPanel',view):expanded[0];
      expanded.forEach(panel=>{
        const open=panel===keep;
        panel.classList.toggle('mobile-settings-collapsed',!open);
        panel.querySelector(':scope > .mobile-settings-toggle')?.setAttribute('aria-expanded',open?'true':'false');
      });
    }else if(expanded.length===0){
      const preferred=q('#studySettingsPanel',view)||q('.sync-panel',view)||q('.mobile-settings-panel',view);
      if(preferred){
        preferred.classList.remove('mobile-settings-collapsed');
        preferred.querySelector(':scope > .mobile-settings-toggle')?.setAttribute('aria-expanded','true');
      }
    }
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
  function normalizeProgressGroups(view){
    let stack=q('#mobileProgressStack',view);
    if(!stack){
      stack=document.createElement('div');
      stack.id='mobileProgressStack';
      stack.className='mobile-progress-stack';
      const head=q(':scope > .section-head',view);
      if(head)head.insertAdjacentElement('afterend',stack);else view.prepend(stack);
    }
    const order=['summary','attention','rhythm','subjects','notes'];
    const groups=order.map(key=>q('[data-mobile-progress-group="'+key+'"]',view)).filter(Boolean);
    groups.forEach(group=>{if(group.parentElement!==stack)stack.appendChild(group)});
    const current=[...stack.children].filter(node=>node.matches?.('.mobile-progress-group')).map(node=>node.dataset.mobileProgressGroup);
    const desired=groups.map(node=>node.dataset.mobileProgressGroup);
    if(current.join('|')!==desired.join('|'))groups.forEach(group=>stack.appendChild(group));
  }

  function enhanceProgress(){
    const view=q('[data-view="progress"]');if(!view)return;
    if(!isPhone()){qa('.mobile-progress-group',view).forEach(group=>group.open=true);return}
    if(!view.classList.contains('active'))return;
    wrapProgressNode(q('#progressMetrics',view),'summary','Resumo','Progresso, tópicos e foco',true);
    const insights=q('#progressInsights',view);
    const summaryGroup=q('[data-mobile-progress-group="summary"]',view);
    if(insights&&summaryGroup&&!insights.closest('.mobile-progress-group'))summaryGroup.appendChild(insights);
    wrapProgressNode(q('#studyIntelligencePanel',view),'attention','Atenção','Somente pendências e próximos passos',true);
    wrapProgressNode(q('#studyAnalyticsPanel',view),'rhythm','Ritmo','Semana e consistência',true);
    wrapProgressNode(q('#progressInfo',view),'subjects','Progresso por concurso','Mapas, estados e cobertura',false);
    wrapProgressNode(q('#studyDoubtInbox',view),'notes','Minhas dúvidas','Anotações salvas durante o estudo',false);
    normalizeProgressGroups(view);
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

  function scheduleEnhance(){
    if(enhanceRaf)return;
    enhanceRaf=requestAnimationFrame(()=>{
      enhanceRaf=0;
      enhanceAll();
      window.MobileUX?.refreshExtras?.();
    });
  }

  function observe(){
    observer?.disconnect();
    observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length)))scheduleEnhance();
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }

  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('studyapp:navigation',scheduleEnhance);
  window.addEventListener('studyapp:readerchange',scheduleEnhance);
  window.addEventListener('hashchange',scheduleEnhance);
  window.addEventListener('resize',scheduleEnhance);
  mq.addEventListener?.('change',scheduleEnhance);
  q('#globalSearch')?.addEventListener('focus',()=>document.documentElement.classList.remove('mobile-topbar-hidden'));
  q('#globalSearch')?.addEventListener('blur',()=>setTimeout(updateTopbar,60));

  window.MobileUX={refresh:enhanceAll,schedule:scheduleEnhance,isPhone};
  observe();
  enhanceAll();
})();


/* V15.6.1 · controlador de smartphone estável */
(()=>{
  if(window.__mobileUxV1561)return;
  window.__mobileUxV1561=true;

  const mq=window.matchMedia('(max-width: 480px)');
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const isPhone=()=>mq.matches&&!document.documentElement.classList.contains('is-ipad');
  let readerLastY=0;

  function closeMobileMenu({restoreFocus=false}={}){
    const layer=q('#mobileMenuLayer'),trigger=q('#mobileMenuBtn');
    if(layer)layer.hidden=true;
    document.documentElement.classList.remove('mobile-menu-open');
    trigger?.setAttribute('aria-expanded','false');
    if(restoreFocus&&isPhone()&&trigger?.isConnected)trigger.focus({preventScroll:true});
  }

  function cleanupPhoneOnlyUi(){
    closeMobileMenu();
    q('#mobileMenuBtn')?.remove();
    q('#mobileMenuLayer')?.remove();
    const form=q('#agendaQuickForm');
    form?.classList.remove('mobile-agenda-form-collapsed');
    q('#mobileAgendaPlanToggle')?.remove();
    const reader=q('#reader');
    if(reader?.classList.contains('mobile-reader-rail-collapsed'))reader.classList.remove('mobile-reader-rail-collapsed');
    if(reader?.dataset.mobileRailOpen)delete reader.dataset.mobileRailOpen;
    q('#mobileReaderRailToggle')?.remove();
  }

  function ensureMobileMenu(){
    if(!isPhone()){cleanupPhoneOnlyUi();return null}
    const navBar=q('.bottom-nav');
    if(!navBar)return null;
    let trigger=q('#mobileMenuBtn',navBar);
    if(!trigger){
      trigger=document.createElement('button');
      trigger.id='mobileMenuBtn';
      trigger.type='button';
      trigger.className='mobile-menu-trigger';
      trigger.dataset.mobileMenu='menu';
      trigger.setAttribute('aria-label','Abrir Mais');
      trigger.setAttribute('aria-haspopup','dialog');
      trigger.setAttribute('aria-expanded','false');
      trigger.innerHTML='<span class="ui-icon icon-more ui-icon-lg" aria-hidden="true"></span><span class="bottom-nav-label">Mais</span>';
      trigger.addEventListener('click',()=>{
        const layer=ensureMobileMenu();
        if(!layer)return;
        if(layer.hidden)openMobileMenu();else closeMobileMenu({restoreFocus:true});
      });
      navBar.appendChild(trigger);
    }

    let layer=q('#mobileMenuLayer');
    if(!layer){
      layer=document.createElement('div');
      layer.id='mobileMenuLayer';
      layer.className='mobile-menu-layer';
      layer.hidden=true;
      layer.innerHTML='<button type="button" class="mobile-menu-backdrop" aria-label="Fechar menu"></button><section class="mobile-menu-sheet" role="dialog" aria-modal="true" aria-labelledby="mobileMenuTitle"><div class="mobile-menu-handle" aria-hidden="true"></div><div class="mobile-menu-head"><b id="mobileMenuTitle">Mais</b><button type="button" class="mobile-menu-close" aria-label="Fechar">×</button></div><nav class="mobile-menu-options"><button type="button" class="mobile-menu-option" data-mobile-sheet-nav="agenda"><span class="ui-icon icon-calendar" aria-hidden="true"></span><span><b>Agenda</b><small>Hoje, semana e planejamento</small></span><i aria-hidden="true">›</i></button><button type="button" class="mobile-menu-option" data-mobile-sheet-nav="simulations"><span class="ui-icon icon-simulations" aria-hidden="true"></span><span><b>Simulados</b><small>Provas, tentativas e desempenho</small></span><i aria-hidden="true">›</i></button><button type="button" class="mobile-menu-option" data-mobile-sheet-nav="settings"><span class="ui-icon icon-settings" aria-hidden="true"></span><span><b>Configurações</b><small>Metas, nuvem, backup e aplicativo</small></span><i aria-hidden="true">›</i></button></nav></section>';
      document.body.appendChild(layer);
      q('.mobile-menu-backdrop',layer)?.addEventListener('click',()=>closeMobileMenu({restoreFocus:true}));
      q('.mobile-menu-close',layer)?.addEventListener('click',()=>closeMobileMenu({restoreFocus:true}));
      qa('[data-mobile-sheet-nav]',layer).forEach(button=>button.addEventListener('click',()=>{
        const target=button.dataset.mobileSheetNav;
        closeMobileMenu();
        if(typeof nav==='function')nav(target);
      }));
    }
    return layer;
  }

  function openMobileMenu(){
    if(!isPhone())return;
    const layer=ensureMobileMenu(),trigger=q('#mobileMenuBtn');
    if(!layer||!trigger)return;
    layer.hidden=false;
    document.documentElement.classList.add('mobile-menu-open');
    trigger.setAttribute('aria-expanded','true');
    qa('[data-mobile-sheet-nav]',layer).forEach(button=>button.classList.toggle('is-current',button.dataset.mobileSheetNav===state?.view));
    requestAnimationFrame(()=>q('[data-mobile-sheet-nav]',layer)?.focus({preventScroll:true}));
  }

  function ensureAgendaPlanToggle(){
    const view=q('[data-view="agenda"]'),form=q('#agendaQuickForm',view);
    if(!view||!form)return;
    if(!isPhone()){
      form.classList.remove('mobile-agenda-form-collapsed');
      q('#mobileAgendaPlanToggle',view)?.remove();
      return;
    }
    let button=q('#mobileAgendaPlanToggle',view);
    if(button)return;
    button=document.createElement('button');
    button.id='mobileAgendaPlanToggle';
    button.type='button';
    button.className='mobile-agenda-plan-toggle';
    button.setAttribute('aria-controls','agendaQuickForm');
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<span><span class="ui-icon icon-plus ui-icon-sm" aria-hidden="true"></span>Planejar sessão</span><i aria-hidden="true">+</i>';
    form.insertAdjacentElement('beforebegin',button);
    form.classList.add('mobile-agenda-form-collapsed');
    button.addEventListener('click',()=>{
      const collapsed=form.classList.toggle('mobile-agenda-form-collapsed');
      button.setAttribute('aria-expanded',collapsed?'false':'true');
    });
    form.addEventListener('submit',()=>requestAnimationFrame(()=>{
      if(!isPhone())return;
      form.classList.add('mobile-agenda-form-collapsed');
      button.setAttribute('aria-expanded','false');
    }),{passive:true});
  }

  function updateRailToggle(){
    const button=q('#mobileReaderRailToggle'),reader=q('#reader');
    if(!button||!reader)return;
    const collapsed=reader.classList.contains('mobile-reader-rail-collapsed');
    button.setAttribute('aria-expanded',collapsed?'false':'true');
    button.setAttribute('aria-label',collapsed?'Mostrar controles de estudo':'Ocultar controles de estudo');
    const glyph=collapsed?'⌃':'⌄';
    if(button.textContent!==glyph)button.textContent=glyph;
  }

  function setRailCollapsed(value){
    const reader=q('#reader');
    if(!reader||!isPhone())return;
    reader.classList.toggle('mobile-reader-rail-collapsed',!!value);
    updateRailToggle();
  }

  function bindReaderFrameScroll(){
    const frame=q('#readerFrame');
    if(!frame||!isPhone())return;
    try{
      const win=frame.contentWindow;
      if(!win||win.__mobileRailScrollV1561)return;
      win.__mobileRailScrollV1561=true;
      readerLastY=Math.max(0,win.scrollY||0);
      win.addEventListener('scroll',()=>{
        if(!isPhone()||!q('#reader')?.classList.contains('open'))return;
        const y=Math.max(0,win.scrollY||0),delta=y-readerLastY;
        if(delta>12&&y>56)setRailCollapsed(true);
        else if(delta<-12)setRailCollapsed(false);
        readerLastY=y;
      },{passive:true});
    }catch{}
  }

  function ensureReaderRailToggle(){
    const reader=q('#reader'),frame=q('#readerFrame');
    if(!reader)return;
    if(!isPhone()){
      if(reader.classList.contains('mobile-reader-rail-collapsed'))reader.classList.remove('mobile-reader-rail-collapsed');
      if(reader.dataset.mobileRailOpen)delete reader.dataset.mobileRailOpen;
      q('#mobileReaderRailToggle',reader)?.remove();
      return;
    }
    let button=q('#mobileReaderRailToggle',reader);
    if(!button){
      button=document.createElement('button');
      button.id='mobileReaderRailToggle';
      button.type='button';
      button.className='mobile-reader-rail-toggle';
      button.setAttribute('aria-controls','studyReaderRail');
      button.addEventListener('click',()=>setRailCollapsed(!reader.classList.contains('mobile-reader-rail-collapsed')));
      reader.appendChild(button);
    }
    if(reader.classList.contains('open')){
      if(reader.dataset.mobileRailOpen!=='1'){
        reader.dataset.mobileRailOpen='1';
        if(reader.classList.contains('mobile-reader-rail-collapsed'))reader.classList.remove('mobile-reader-rail-collapsed');
        readerLastY=0;
      }
      bindReaderFrameScroll();
      if(frame&&frame.dataset.mobileRailLoadBound!=='1'){
        frame.dataset.mobileRailLoadBound='1';
        frame.addEventListener('load',()=>requestAnimationFrame(bindReaderFrameScroll));
      }
    }else{
      if(reader.dataset.mobileRailOpen)delete reader.dataset.mobileRailOpen;
      if(reader.classList.contains('mobile-reader-rail-collapsed'))reader.classList.remove('mobile-reader-rail-collapsed');
    }
    updateRailToggle();
  }

  function enhanceExtras(){
    if(!isPhone()){cleanupPhoneOnlyUi();return}
    ensureMobileMenu();
    ensureAgendaPlanToggle();
    ensureReaderRailToggle();
  }

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!q('#mobileMenuLayer')?.hidden)closeMobileMenu({restoreFocus:true});
  });
  window.addEventListener('studyapp:navigation',()=>{
    closeMobileMenu();
    requestAnimationFrame(enhanceExtras);
  });
  window.addEventListener('studyapp:readerchange',()=>requestAnimationFrame(enhanceExtras));
  mq.addEventListener?.('change',()=>requestAnimationFrame(enhanceExtras));

  window.MobileUX=window.MobileUX||{};
  window.MobileUX.refreshExtras=enhanceExtras;
  window.MobileUX.closeMenu=closeMobileMenu;
  enhanceExtras();
})();


/* V15.14.1 · Etapa 3 smartphone · cabeçalho, busca, menu e estado de nuvem */
(()=>{
  if(window.__mobileUxV15141)return;
  window.__mobileUxV15141=true;
  const mq=window.matchMedia('(max-width: 480px)');
  const root=document.documentElement;
  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const isPhone=()=>mq.matches&&!root.classList.contains('is-ipad');
  let boundSearch=null;

  function syncCoursesHeader(){
    const view=q('[data-view="courses"]'),head=q(':scope > .section-head',view),copy=head?.querySelector(':scope > div');
    if(!isPhone()){q('#mobileCoursesCount',view)?.remove();return}
    if(!head||!copy)return;
    let count=q('#mobileCoursesCount',view);
    if(!count){
      count=document.createElement('span');
      count.id='mobileCoursesCount';
      count.setAttribute('aria-live','polite');
      copy.appendChild(count);
    }
    const total=qa('#coursesGrid .course-card',view).length;
    const label=total+' '+(total===1?'concurso':'concursos');
    if(count.textContent!==label)count.textContent=label;
  }

  function bindSearch(){
    const input=q('#globalSearch');
    if(!input||input===boundSearch)return;
    boundSearch=input;
    input.addEventListener('focus',()=>{
      if(!isPhone())return;
      root.classList.add('mobile-search-active');
      root.classList.remove('mobile-topbar-hidden');
    });
    input.addEventListener('blur',()=>setTimeout(()=>{
      if(document.activeElement===input)return;
      root.classList.remove('mobile-search-active');
    },100));
  }

  function updateMenuCloud(){
    const cloud=q('#mobileMenuCloud');
    if(!cloud)return;
    const label=q('#mobileMenuCloudLabel'),meta=q('#mobileMenuCloudMeta'),sync=q('#syncTop');
    const sourceLabel=q('.side .cloud-label')||q('.cloud-label');
    const sourceMeta=q('#cloudSideMeta');
    const nextLabel=sourceLabel?.textContent?.trim()||'Nuvem';
    const nextMeta=sourceMeta?.textContent?.trim()||'Estado de sincronização';
    const nextState=sync?.dataset.syncState||'idle';
    if(label&&label.textContent!==nextLabel)label.textContent=nextLabel;
    if(meta&&meta.textContent!==nextMeta)meta.textContent=nextMeta;
    if(cloud.dataset.syncState!==nextState)cloud.dataset.syncState=nextState;
  }

  function syncMenuState(){
    const trigger=q('#mobileMenuBtn');
    const inMenu=['agenda','simulations','settings'].includes(state?.view);
    trigger?.classList.toggle('active',isPhone()&&inMenu);
    qa('[data-mobile-sheet-nav]').forEach(button=>{
      const current=button.dataset.mobileSheetNav===state?.view;
      button.classList.toggle('is-current',current);
      if(current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    updateMenuCloud();
  }

  function enhanceMenu(){
    if(!isPhone())return;
    const layer=q('#mobileMenuLayer'),options=q('.mobile-menu-options',layer);
    if(!layer||!options)return;
    if(!q('.mobile-menu-label[data-mobile-menu-label="library"]',options)){
      const label=document.createElement('div');
      label.className='mobile-menu-label';
      label.dataset.mobileMenuLabel='library';
      label.textContent='Biblioteca';
      options.prepend(label);
    }
    if(!q('.mobile-menu-label[data-mobile-menu-label="system"]',options)){
      const settings=q('[data-mobile-sheet-nav="settings"]',options),label=document.createElement('div');
      label.className='mobile-menu-label';
      label.dataset.mobileMenuLabel='system';
      label.textContent='Sistema';
      if(settings)options.insertBefore(label,settings);else options.appendChild(label);
    }
    if(!q('#mobileMenuCloud',options)){
      const cloud=document.createElement('div');
      cloud.id='mobileMenuCloud';
      cloud.className='mobile-menu-cloud';
      cloud.innerHTML='<span class="ui-icon icon-cloud" aria-hidden="true"></span><span class="mobile-menu-cloud-copy"><b id="mobileMenuCloudLabel">Nuvem</b><small id="mobileMenuCloudMeta">Estado de sincronização</small></span>';
      options.appendChild(cloud);
    }
    syncMenuState();
  }

  function refresh(){
    if(!isPhone()){
      root.classList.remove('mobile-search-active');
      q('#mobileCoursesCount')?.remove();
      return;
    }
    bindSearch();
    syncCoursesHeader();
    enhanceMenu();
    syncMenuState();
  }

  const observer=new MutationObserver(mutations=>{
    if(!isPhone())return;
    if(mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&(m.target?.id==='syncTop'||m.target?.id==='mobileMenuLayer')))){
      requestAnimationFrame(refresh);
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-sync-state','hidden','class']});
  window.addEventListener('studyapp:navigation',()=>requestAnimationFrame(refresh));
  window.addEventListener('resize',()=>requestAnimationFrame(refresh));
  mq.addEventListener?.('change',()=>requestAnimationFrame(refresh));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')requestAnimationFrame(refresh)});
  requestAnimationFrame(refresh);
})();

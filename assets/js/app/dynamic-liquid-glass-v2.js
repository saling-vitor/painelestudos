'use strict';
(()=>{
  if(window.MMDynamicGlass)return;

  const root=document.documentElement;
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
  const supportsBackdrop=!!(window.CSS&&(
    CSS.supports('backdrop-filter','blur(1px)')||
    CSS.supports('-webkit-backdrop-filter','blur(1px)')
  ));
  const fineQuery=matchMedia('(hover:hover) and (pointer:fine)');
  const touchQuery=matchMedia('(pointer:coarse)');
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  const transparencyQuery=matchMedia('(prefers-reduced-transparency: reduce)');

  const microObserved=new WeakSet();
  let enhanceFrame=0;
  let scrollFrame=0;
  const stats={rectReads:0,enhancePasses:0};

  function syncFlags(){
    root.classList.toggle('mm-optics-supported',supportsBackdrop);
    root.classList.toggle('mm-pointer-fine',fineQuery.matches);
    root.classList.toggle('mm-touch',touchQuery.matches||navigator.maxTouchPoints>0);
    root.classList.toggle('mm-reduced-motion',motionQuery.matches);
    root.classList.toggle('mm-reduced-transparency',transparencyQuery.matches);
  }

  function onMedia(query,fn){
    if(query.addEventListener)query.addEventListener('change',fn);
    else query.addListener?.(fn);
  }
  [fineQuery,touchQuery,motionQuery,transparencyQuery].forEach(media=>onMedia(media,()=>{
    syncFlags();
    scheduleEnhance();
  }));

  const microObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    for(const entry of entries){
      entry.target.classList.toggle('mm-visible-glass',entry.isIntersecting&&entry.intersectionRatio>0);
    }
  },{rootMargin:'96px',threshold:0}):null;

  function observeMicro(el){
    if(!el||microObserved.has(el))return;
    microObserved.add(el);
    if(microObserver)microObserver.observe(el);
    else el.classList.add('mm-visible-glass');
  }

  function addClasses(el,...classes){
    if(!el)return;
    for(const cls of classes)if(cls)el.classList.add(cls);
  }

  function markSurface(el,scale){
    if(!el)return;
    addClasses(el,'mm-optical-surface','mm-glass-'+scale);
    if(getComputedStyle(el).position==='static')el.classList.add('mm-position-anchor');
  }

  function accentFrom(el){
    const host=el.closest('.map-card,.course-card,.course-library-card,.simulation-card,.continue-card');
    if(!host)return'';
    const style=getComputedStyle(host);
    const candidates=[
      style.getPropertyValue('--accent'),
      style.getPropertyValue('--course-accent'),
      style.getPropertyValue('--continue-accent')
    ].map(v=>v.trim()).filter(Boolean);
    return candidates.find(value=>value!=='auto'&&value!=='transparent'&&CSS.supports('color',value))||'';
  }

  function applyContextTint(el){
    if(!el||el.dataset.mmTintReady==='1')return;
    el.dataset.mmTintReady='1';
    const accent=accentFrom(el);
    if(!accent)return;
    el.style.setProperty('--mm-context-tint',`color-mix(in srgb, ${accent} 4%, transparent)`);
    el.style.setProperty('--mm-context-tint-strength','.04');
  }

  function ensureScrollEdge(host){
    if(!host||host.querySelector(':scope > .mm-scroll-edge'))return;
    const edge=document.createElement('span');
    edge.className='mm-scroll-edge';
    edge.setAttribute('aria-hidden','true');
    host.append(edge);
  }

  function popoverSource(panel){
    if(panel.id==='globalSearchPanel')return q('#globalSearch');
    if(panel.id==='courseMoreMenu')return q('#courseMoreBtn');
    if(panel.id==='allMapsFilterPanel')return q('#allMapsFilterBtn[aria-expanded="true"],#allMapsMobileFilter[aria-expanded="true"],#allMapsFilterBtn,#allMapsMobileFilter');
    if(panel.classList.contains('map-actions-menu'))return q('.map-admin-btn',panel.closest('.map-card')||document);
    if(panel.classList.contains('simulation-card-action-menu'))return q('.simulation-card-menu-btn',panel.closest('.simulation-card')||document);
    if(panel.classList.contains('reader-more-menu'))return q('[aria-expanded="true"]',panel.parentElement||document);
    if(panel.classList.contains('ui-select-popover')){
      const expanded=qa('.ui-select-trigger[aria-expanded="true"]');
      return expanded.find(el=>el.offsetParent!==null)||expanded[0]||null;
    }
    if(panel.classList.contains('mobile-menu-sheet'))return q('.bottom-nav [data-nav="settings"]');
    return null;
  }

  function markPopover(panel){
    if(!panel)return;
    markSurface(panel,'large');
    const isOpen=!panel.hidden&&getComputedStyle(panel).display!=='none';
    if(!isOpen){
      panel.removeAttribute('data-mm-open');
      return;
    }
    const source=popoverSource(panel);
    if(source){
      const pr=panel.getBoundingClientRect();
      const sr=source.getBoundingClientRect();
      stats.rectReads+=2;
      if(pr.width&&pr.height){
        const x=clamp((sr.left+sr.width/2-pr.left)/pr.width,0,1)*100;
        const y=clamp((sr.top+sr.height/2-pr.top)/pr.height,0,1)*100;
        panel.style.setProperty('--mm-source-x',x.toFixed(1)+'%');
        panel.style.setProperty('--mm-source-y',y.toFixed(1)+'%');
      }
    }
    panel.dataset.mmOpen='true';
  }

  function syncSearchMorph(){
    const shell=q('.global-search-shell'),panel=q('#globalSearchPanel');
    if(!shell||!panel)return;
    const focused=shell.contains(document.activeElement);
    const open=!panel.hidden&&getComputedStyle(panel).display!=='none';
    shell.classList.toggle('mm-search-open',focused||open);
    if(open)markPopover(panel);
    else panel.removeAttribute('data-mm-open');
  }

  function enhanceAll(){
    enhanceFrame=0;
    stats.enhancePasses++;

    const topbar=q('.topbar');
    if(topbar){
      markSurface(topbar,'bar');
      addClasses(topbar,'mm-scroll-density');
      ensureScrollEdge(topbar);
    }

    const side=q('.side');
    if(side){
      markSurface(side,'large');
    }

    const dock=q('.bottom-nav');
    if(dock){
      markSurface(dock,'bar');
      // V15.48.7-T: iPad não deve conter a faixa auxiliar antiga.
      // Criar e ocultar a faixa via CSS deixava uma camada DOM residual.
      if(root.classList.contains('is-ipad')){
        q(':scope > .mm-scroll-edge',dock)?.remove();
      }else{
        ensureScrollEdge(dock);
      }
      /* Seleção estática por item; sem overlay deslizante. */
    }

    qa('.course-primary-actions').forEach(group=>{
      markSurface(group,'controls');
    });

    qa('.course-sticky-bar').forEach(bar=>{
      markSurface(bar,'bar');
      ensureScrollEdge(bar);
    });

    qa(
      '.map-card.has-cover>.fav,'+
      '.map-card.has-cover>.map-admin-btn,'+
      '.course-card-edit,'+
      '.course-library-card .course-card-edit,'+
      '.simulation-card.has-cover .simulation-card-menu-btn'
    ).forEach(el=>{
      markSurface(el,'micro');
      applyContextTint(el);
      observeMicro(el);
    });

    qa(
      '.global-search-panel,.course-more-menu,.reader-more-menu,'+
      '.simulation-card-action-menu,.map-actions-menu,.maps-filter-panel,'+
      '.ui-select-popover,.mobile-menu-sheet,.popover,.context-menu'
    ).forEach(markPopover);

    qa('.modal-card,.planner-modal-card,.study-doubt-card').forEach(el=>{
      markSurface(el,'large');
    });

    syncSearchMorph();
  }

  function scheduleEnhance(){
    if(enhanceFrame)return;
    enhanceFrame=requestAnimationFrame(enhanceAll);
  }

  document.addEventListener('click',()=>scheduleEnhance(),true);
  document.addEventListener('focusin',event=>{
    if(event.target.closest?.('.global-search-shell'))syncSearchMorph();
  });
  document.addEventListener('focusout',event=>{
    if(event.target.closest?.('.global-search-shell'))setTimeout(syncSearchMorph,0);
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='globalSearch')scheduleEnhance();
  });

  window.addEventListener('studyapp:navigation',()=>scheduleEnhance());
  window.addEventListener('resize',()=>{
    scheduleEnhance();
  },{passive:true});

  function syncScroll(){
    scrollFrame=0;
    // O iPad rola .main, e não a janela. A densidade óptica precisa
    // acompanhar esse scroller sem mover nem interceptar o dock.
    const ipadPortrait=root.classList.contains('is-ipad')&&!root.classList.contains('is-phone-layout')&&matchMedia('(orientation: portrait)').matches;
    const mainScroll=ipadPortrait?(q('.main')?.scrollTop||0):0;
    const y=Math.max(0,mainScroll,window.scrollY||document.documentElement.scrollTop||0);
    const t=clamp((y-8)/40);
    const dock=ipadPortrait?q('.bottom-nav'):null;
    if(dock) dock.style.setProperty('--mm-dock-alpha',(.075+t*.035).toFixed(3));
    const topbar=q('.topbar');
    if(topbar){
      topbar.style.setProperty('--mm-bar-alpha',(.54+t*.12).toFixed(3));
      topbar.style.setProperty('--mm-edge-opacity',(.30+t*.28).toFixed(3));
    }
    root.classList.toggle('mm-scrolled',y>8);
  }
  function requestScrollSync(){
    if(!scrollFrame)scrollFrame=requestAnimationFrame(syncScroll);
  }
  window.addEventListener('scroll',requestScrollSync,{passive:true});
  // Escutar o elemento que realmente recebe o movimento no iPad.
  // Manter a ligação ativa na paisagem é inofensivo: syncScroll ignora
  // mainScroll fora do retrato.
  q('.main')?.addEventListener('scroll',requestScrollSync,{passive:true});

  const mutationObserver=new MutationObserver(records=>{
    if(records.some(record=>
      record.type==='childList'||
      record.attributeName==='hidden'||
      record.attributeName==='class'||
      record.attributeName==='aria-expanded'
    ))scheduleEnhance();
  });

  function start(){
    syncFlags();
    enhanceAll();
    syncScroll();
    if(document.body)mutationObserver.observe(document.body,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['hidden','class','aria-expanded']
    });
  }

  window.MMDynamicGlass={
    refresh:scheduleEnhance,
    snapshot:()=>({
      opticsSupported:supportsBackdrop,
      pointerFine:fineQuery.matches,
      touch:touchQuery.matches||navigator.maxTouchPoints>0,
      reducedMotion:motionQuery.matches,
      reducedTransparency:transparencyQuery.matches,
      opticalSurfaces:qa('.mm-optical-surface').length,
      microSurfaces:qa('.mm-glass-micro').length,
      visibleMicroSurfaces:qa('.mm-glass-micro.mm-visible-glass').length,
      rectReads:stats.rectReads,
      enhancePasses:stats.enhancePasses
    })
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
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

  const lensHosts=new Set();
  const microObserved=new WeakSet();
  const geometry=new WeakMap();
  let activeSurface=null;
  let activeRect=null;
  let pointerFrame=0;
  let enhanceFrame=0;
  let scrollFrame=0;
  let pendingPointer=null;
  let pressed=null;
  const stats={pointerFrames:0,pointerRectReads:0,rectReads:0,enhancePasses:0,lensMoves:0};

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

  function markSurface(el,scale,{specular=false,press=true}={}){
    if(!el)return;
    addClasses(el,'mm-optical-surface','mm-glass-'+scale);
    if(getComputedStyle(el).position==='static')el.classList.add('mm-position-anchor');
    if(specular&&fineQuery.matches&&!motionQuery.matches)addClasses(el,'mm-specular');
    else el.classList.remove('mm-specular');
    if(press)addClasses(el,'mm-pressable');
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

  function lensTarget(host){
    if(host.matches('.side'))return q('.nav-btn.active',host);
    if(host.matches('.bottom-nav'))return q(':scope > button.active',host);
    return q(':scope > .active',host)||q(':scope > button[aria-pressed="true"]',host);
  }

  function ensureLens(host){
    if(!host||host.dataset.mmLensHost==='1')return;
    host.dataset.mmLensHost='1';
    addClasses(host,'mm-lens-host');
    const lens=document.createElement('span');
    lens.className='mm-active-lens';
    lens.setAttribute('aria-hidden','true');
    host.append(lens);
    lensHosts.add(host);
  }

  function updateLens(host){
    if(!host||!host.isConnected)return;
    const lens=q(':scope > .mm-active-lens',host);
    const target=lensTarget(host);
    if(!lens||!target||getComputedStyle(host).display==='none'){
      host.style.setProperty('--mm-lens-opacity','0');
      return;
    }
    const hr=host.getBoundingClientRect();
    const tr=target.getBoundingClientRect();
    stats.rectReads+=2;
    if(!hr.width||!hr.height||!tr.width||!tr.height){
      host.style.setProperty('--mm-lens-opacity','0');
      return;
    }
    const x=tr.left-hr.left;
    const y=tr.top-hr.top;
    const radius=parseFloat(getComputedStyle(target).borderRadius)||10;
    host.style.setProperty('--mm-lens-x',x.toFixed(2)+'px');
    host.style.setProperty('--mm-lens-y',y.toFixed(2)+'px');
    host.style.setProperty('--mm-lens-w',tr.width.toFixed(2)+'px');
    host.style.setProperty('--mm-lens-h',tr.height.toFixed(2)+'px');
    host.style.setProperty('--mm-lens-radius',Math.max(8,Math.min(radius,16))+'px');
    host.style.setProperty('--mm-lens-opacity','1');
    stats.lensMoves++;
  }

  function updateAllLenses(){
    for(const host of [...lensHosts]){
      if(!host.isConnected){lensHosts.delete(host);continue}
      updateLens(host);
    }
    root.classList.toggle('mm-lens-ready',lensHosts.size>0);
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
    const large=panel.classList.contains('maps-filter-panel')||panel.classList.contains('mobile-menu-sheet');
    markSurface(panel,large?'large':'large',{specular:!large,press:false});
    const isOpen=!panel.hidden&&getComputedStyle(panel).display!=='none';
    if(!isOpen){
      panel.removeAttribute('data-mm-open');
      return;
    }
    const source=popoverSource(panel);
    if(source){
      source.classList.add('mm-popover-source');
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
      markSurface(topbar,'bar',{specular:true,press:false});
      addClasses(topbar,'mm-scroll-density');
      ensureScrollEdge(topbar);
    }

    const side=q('.side');
    if(side){
      markSurface(side,'large',{specular:true,press:false});
      ensureLens(side);
    }

    const dock=q('.bottom-nav');
    if(dock){
      markSurface(dock,'bar',{specular:false,press:false});
      ensureScrollEdge(dock);
      ensureLens(dock);
      qa(':scope > button',dock).forEach(el=>addClasses(el,'mm-pressable'));
    }

    qa('.course-primary-actions').forEach(group=>{
      markSurface(group,'controls',{specular:true,press:false});
      qa('button',group).forEach(el=>addClasses(el,'mm-pressable'));
    });

    qa('.course-sticky-bar').forEach(bar=>{
      markSurface(bar,'bar',{specular:false,press:false});
      ensureScrollEdge(bar);
      qa('button,.ui-select-trigger',bar).forEach(el=>addClasses(el,'mm-pressable'));
    });

    qa('.side .nav-btn').forEach(el=>addClasses(el,'mm-pressable'));
    qa('.course-study-filters,.category-row').forEach(host=>{
      ensureLens(host);
      qa(':scope > button',host).forEach(el=>addClasses(el,'mm-pressable'));
    });

    qa(
      '.map-card.has-cover>.fav,'+
      '.map-card.has-cover>.map-admin-btn,'+
      '.course-card-edit,'+
      '.course-library-card .course-card-edit,'+
      '.simulation-card.has-cover .simulation-card-menu-btn'
    ).forEach(el=>{
      markSurface(el,'micro',{specular:true,press:true});
      applyContextTint(el);
      observeMicro(el);
    });

    qa(
      '.global-search-panel,.course-more-menu,.reader-more-menu,'+
      '.simulation-card-action-menu,.map-actions-menu,.maps-filter-panel,'+
      '.ui-select-popover,.mobile-menu-sheet,.popover,.context-menu'
    ).forEach(markPopover);

    qa('.modal-card,.planner-modal-card,.study-doubt-card').forEach(el=>{
      markSurface(el,'large',{specular:false,press:false});
    });

    qa(
      '.topbar .search,.topbar #syncTop,.topbar #installBtn,'+
      '.course-study-filter,.category-btn,.ui-select-trigger,'+
      '.course-more-menu button,.map-actions-menu button,'+
      '.simulation-card-action-menu button,.ui-select-option'
    ).forEach(el=>addClasses(el,'mm-pressable'));

    syncSearchMorph();
    requestAnimationFrame(updateAllLenses);
  }

  function scheduleEnhance(){
    if(enhanceFrame)return;
    enhanceFrame=requestAnimationFrame(enhanceAll);
  }

  function readActiveRect(surface){
    if(activeSurface!==surface||!activeRect){
      activeSurface=surface;
      activeRect=surface.getBoundingClientRect();
      geometry.set(surface,activeRect);
      stats.rectReads++;
      stats.pointerRectReads++;
    }
    return activeRect;
  }

  function processPointer(){
    pointerFrame=0;
    const packet=pendingPointer;
    pendingPointer=null;
    if(!packet||!fineQuery.matches||motionQuery.matches)return;
    const {surface,x,y}=packet;
    if(!surface?.isConnected)return;
    const rect=readActiveRect(surface);
    if(!rect.width||!rect.height)return;
    const px=clamp((x-rect.left)/rect.width);
    const py=clamp((y-rect.top)/rect.height);
    const edge=Math.max(Math.abs(px-.5),Math.abs(py-.5))*2;
    const intensity=clamp(.46+edge*.24,.46,.70);
    const alpha=.052+intensity*.038;
    surface.style.setProperty('--glass-x',(px*100).toFixed(1)+'%');
    surface.style.setProperty('--glass-y',(py*100).toFixed(1)+'%');
    surface.style.setProperty('--glass-intensity',intensity.toFixed(3));
    surface.style.setProperty('--glass-highlight-alpha',alpha.toFixed(3));
    surface.style.setProperty('--glass-shadow-x',((.5-px)*5).toFixed(2)+'px');
    stats.pointerFrames++;
  }

  document.addEventListener('pointerover',event=>{
    if(!fineQuery.matches||motionQuery.matches||event.pointerType==='touch')return;
    const surface=event.target.closest?.('.mm-optical-surface.mm-specular.mm-visible-glass,.mm-optical-surface.mm-specular:not(.mm-glass-micro)');
    if(!surface)return;
    if(surface.contains(event.relatedTarget))return;
    activeSurface=surface;
    activeRect=surface.getBoundingClientRect();
    geometry.set(surface,activeRect);
    stats.rectReads++;
    stats.pointerRectReads++;
    surface.classList.add('is-mm-hovered');
  },{passive:true});

  document.addEventListener('pointermove',event=>{
    if(!fineQuery.matches||motionQuery.matches||event.pointerType==='touch')return;
    const surface=event.target.closest?.('.mm-optical-surface.mm-specular.mm-visible-glass,.mm-optical-surface.mm-specular:not(.mm-glass-micro)');
    if(!surface)return;
    pendingPointer={surface,x:event.clientX,y:event.clientY};
    if(!pointerFrame)pointerFrame=requestAnimationFrame(processPointer);
  },{passive:true});

  document.addEventListener('pointerout',event=>{
    const surface=event.target.closest?.('.mm-optical-surface.mm-specular');
    if(!surface||surface.contains(event.relatedTarget))return;
    surface.classList.remove('is-mm-hovered');
    surface.style.setProperty('--glass-intensity','0');
    surface.style.setProperty('--glass-x','50%');
    surface.style.setProperty('--glass-y','0%');
    surface.style.setProperty('--glass-shadow-x','0px');
    if(activeSurface===surface){activeSurface=null;activeRect=null}
  },{passive:true});

  document.addEventListener('pointerdown',event=>{
    const target=event.target.closest?.('.mm-pressable');
    if(!target)return;
    pressed=target;
    target.classList.add('mm-pressed');
    if(target.classList.contains('mm-popover-source'))target.classList.add('mm-source-active');
  },{passive:true});

  const releasePress=()=>{
    if(!pressed)return;
    const target=pressed;
    pressed=null;
    target.classList.remove('mm-pressed','mm-source-active');
  };
  document.addEventListener('pointerup',releasePress,{passive:true});
  document.addEventListener('pointercancel',releasePress,{passive:true});
  window.addEventListener('blur',releasePress,{passive:true});

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
    activeRect=null;
    scheduleEnhance();
  },{passive:true});

  function syncScroll(){
    scrollFrame=0;
    activeRect=null;
    const y=Math.max(0,window.scrollY||document.documentElement.scrollTop||0);
    const t=clamp((y-8)/40);
    const topbar=q('.topbar');
    if(topbar){
      topbar.style.setProperty('--mm-bar-alpha',(.54+t*.12).toFixed(3));
      topbar.style.setProperty('--mm-edge-opacity',(.30+t*.28).toFixed(3));
    }
    root.classList.toggle('mm-scrolled',y>8);
  }
  window.addEventListener('scroll',()=>{
    if(!scrollFrame)scrollFrame=requestAnimationFrame(syncScroll);
  },{passive:true});

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
    updateLenses:updateAllLenses,
    snapshot:()=>({
      opticsSupported:supportsBackdrop,
      pointerFine:fineQuery.matches,
      touch:touchQuery.matches||navigator.maxTouchPoints>0,
      reducedMotion:motionQuery.matches,
      reducedTransparency:transparencyQuery.matches,
      lensHosts:[...lensHosts].filter(el=>el.isConnected).length,
      opticalSurfaces:qa('.mm-optical-surface').length,
      microSurfaces:qa('.mm-glass-micro').length,
      visibleMicroSurfaces:qa('.mm-glass-micro.mm-visible-glass').length,
      pointerFrames:stats.pointerFrames,
      pointerRectReads:stats.pointerRectReads,
      rectReads:stats.rectReads,
      pointerRectReads:stats.pointerRectReads,
      enhancePasses:stats.enhancePasses,
      lensMoves:stats.lensMoves
    })
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
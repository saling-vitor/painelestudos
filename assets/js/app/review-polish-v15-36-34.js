'use strict';
(()=>{
  if(window.__reviewPolishV153634)return;
  window.__reviewPolishV153634=true;

  const root=document.documentElement;
  const q=(selector,scope=document)=>scope.querySelector(selector);
  const isPhone=()=>root.classList.contains('is-phone-layout');
  const isIPad=()=>root.classList.contains('is-ipad');
  const isIPadPortrait=()=>isIPad()&&!isPhone()&&window.matchMedia('(orientation: portrait)').matches;

  function updateScrolledTopbar(){
    root.classList.toggle('topbar-scrolled',!isPhone()&&(window.scrollY||0)>18);
  }

  function updateKeyboardState(){
    if(!isIPad()){root.classList.remove('keyboard-open');return}
    const vv=window.visualViewport;
    if(!vv){root.classList.remove('keyboard-open');return}
    const obscured=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);
    root.classList.toggle('keyboard-open',obscured>120);
  }

  function ensureTabletMoreShortcuts(){
    const view=q('[data-view="settings"]');
    if(!view)return;
    q('#tabletMoreShortcuts',view)?.remove();
  }

  function normalizeNavigationLabels(){
    const bottomAgendaLabel=isIPadPortrait()?'Calendário':'Agenda';
    document.querySelectorAll('.bottom-nav [data-nav="agenda"] .bottom-nav-label').forEach(el=>el.textContent=bottomAgendaLabel);
    document.querySelectorAll('.side [data-nav="agenda"]').forEach(el=>el.setAttribute('aria-label','Agenda'));
    const trigger=q('#mobileMenuBtn .bottom-nav-label');if(trigger)trigger.textContent='Mais';
    const title=q('#mobileMenuTitle');if(title)title.textContent='Mais';
  }

  function refresh(){
    updateScrolledTopbar();
    updateKeyboardState();
    ensureTabletMoreShortcuts();
    normalizeNavigationLabels();
  }

  window.addEventListener('scroll',updateScrolledTopbar,{passive:true});
  window.addEventListener('resize',()=>requestAnimationFrame(refresh),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(refresh,80));
  window.addEventListener('studyapp:navigation',()=>requestAnimationFrame(refresh));
  window.visualViewport?.addEventListener('resize',updateKeyboardState,{passive:true});
  window.visualViewport?.addEventListener('scroll',updateKeyboardState,{passive:true});
  document.addEventListener('focusin',updateKeyboardState);
  document.addEventListener('focusout',()=>setTimeout(updateKeyboardState,80));

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
})();

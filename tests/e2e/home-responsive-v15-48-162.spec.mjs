import {test,expect} from '@playwright/test';

test('Home adaptativa [T+M] · capa panorâmica e simulados horizontais sem overflow',async({page},testInfo)=>{
  const kind=testInfo.project.name;
  if(kind==='desktop-chromium')test.skip();
  await page.goto('/#home');
  await expect(page.locator('#continueBox')).toBeVisible();
  await page.evaluate(()=>{
    const continuation=document.querySelector('#continueBox');
    continuation.innerHTML='<div class="continue-card" style="--continue-accent:#c88469;--map-accent:#c88469"><div class="continue-thumb"><img src="assets/empty-states/01_empty-retomar.png" alt=""></div><div class="continue-content"><div class="continue-map-tags"><span class="continue-map-code">LOPA</span><span class="continue-map-category">Legislação</span></div><b>Lei Orgânica de Porto Alegre</b><p>Porto Alegre · estudo · 18%</p><div class="continue-progress progress-bar"><i style="width:18%"></i></div><div class="continue-states"><span>OK 3</span><span>REV 2</span><span>DIF 1</span></div></div><button class="primary" data-map="mock"><span>Continuar</span></button></div>';
    const section=document.querySelector('#homeSimulationsSection');section.classList.remove('is-empty');
    document.querySelector('#homeSimulations').innerHTML='<div class="simulation-recent-list">'+[1,2,3].map(n=>'<article role="button" tabindex="0" class="simulation-recent-item" style="--simulation-accent:#c88469"><div class="simulation-recent-cover"><img src="assets/empty-states/08_empty-simulados-home.png" alt=""></div><div class="simulation-recent-copy"><div class="simulation-recent-title-row"><b>Simulado '+n+'</b></div><span class="simulation-recent-meta">40 questões · FUNDATEC</span><div class="simulation-recent-state-row"><span class="simulation-recent-status">Em andamento</span></div></div></article>').join('')+'</div>';
  });
  const geom=await page.evaluate(()=>{
    const card=document.querySelector('#continueBox .continue-card'),thumb=card.querySelector('.continue-thumb'),copy=card.querySelector('.continue-content'),btn=card.querySelector('.primary'),list=document.querySelector('#homeSimulations .simulation-recent-list'),rows=[...list.children];
    const rect=e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
    return{phone:document.documentElement.classList.contains('is-phone-layout'),ipad:document.documentElement.classList.contains('is-ipad'),card:rect(card),thumb:rect(thumb),copy:rect(copy),button:rect(btn),rows:rows.map(r=>({box:rect(r),cover:rect(r.querySelector('.simulation-recent-cover')),copy:rect(r.querySelector('.simulation-recent-copy')),grid:getComputedStyle(r).display,columns:getComputedStyle(r).gridTemplateColumns})),list:rect(list),docWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth};
  });
  expect(geom.phone||geom.ipad).toBe(true);
  expect(geom.thumb.top).toBeLessThan(geom.copy.top);
  expect(geom.thumb.width).toBeGreaterThan(geom.card.width-6);
  expect(geom.button.right).toBeLessThanOrEqual(geom.card.right+1);
  expect(geom.button.bottom).toBeLessThanOrEqual(geom.card.bottom+1);
  expect(geom.rows).toHaveLength(3);
  for(let i=0;i<3;i++){
    expect(geom.rows[i].grid).toBe('grid');
    expect(geom.rows[i].cover.right).toBeLessThanOrEqual(geom.rows[i].copy.left+1);
    expect(geom.rows[i].box.height).toBeLessThanOrEqual(96);
    if(i)expect(geom.rows[i].box.top).toBeGreaterThanOrEqual(geom.rows[i-1].box.bottom);
  }
  expect(geom.docWidth).toBeLessThanOrEqual(geom.viewport+2);
});
test('Prioridade Desktop [D] · uma única borda cromática, sem faixa amarela',async({page})=>{
  await page.goto('/#home');
  const selector='#homeStudyDashboard .priority-now-card';
  await expect(page.locator(selector)).toBeVisible();
  const result=await page.locator(selector).evaluate(el=>{
    el.style.setProperty('--map-accent','#c88469');
    const s=getComputedStyle(el),pseudo=getComputedStyle(el,'::before');
    return{before:pseudo.content,display:pseudo.display,border:s.borderLeftColor,borderWidth:s.borderLeftWidth,boxShadow:s.boxShadow,mapAccent:s.getPropertyValue('--map-accent'),theme:s.getPropertyValue('--home-card-theme'),classes:document.documentElement.className,viewport:innerWidth,inline:el.getAttribute('style'),matchesDesktop:el.matches('html:not(.is-ipad):not(.is-phone-layout) #homeStudyDashboard .study-intelligence-row>article.priority-now-card'),cssLoaded:[...document.styleSheets].some(x=>String(x.href||'').includes('camada-5-acabamento-final.css'))};
  });
  expect(result.display).toBe('none');
  // Verifica a cor efetivamente pintada (não apenas o token), após estabilizar a cascata.
  // Um border-color legado transiente não deve prevalecer sobre a identidade do mapa.
  await expect.poll(async()=>page.locator(selector).evaluate(el=>getComputedStyle(el).borderLeftColor),{
    timeout:5000,message:'Borda temática Desktop: '+JSON.stringify(result)
  }).toBe('rgb(200, 132, 105)');
  expect(parseFloat(result.borderWidth)).toBeGreaterThanOrEqual(3);
});

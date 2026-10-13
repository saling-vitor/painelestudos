import { test, expect } from '@playwright/test';

test('Dock iPad [T] · Home editorial, plano cromático e prioridade fumê em retrato e paisagem', async ({page}) => {
  const response=await page.request.get('/version.json');
  expect(response.ok()).toBeTruthy();
  const release=await response.json();
  expect(release.label).toBe('V15.48.157-T');
  await page.addInitScript(v=>localStorage.setItem('studyapp.lastSeenVersion',v),release.version);
  await page.goto('/#home');
  await expect(page.locator('#homeStudyDashboard .study-command-card')).toBeAttached();
  await page.evaluate(()=>{
    const plan=document.getElementById('homeReviewSection');
    if(!plan)throw new Error('Plano do dia ausente');
    plan.hidden=false;
    const host=document.createElement('div');
    host.id='ipadParityFixture';
    host.innerHTML='<article class="study-plan-item has-map-accent is-next" style="--map-accent:#d64b36;--plan-accent:#d64b36"><span class="study-plan-order">1</span><span class="study-plan-cover"><img alt="" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"></span><div class="study-plan-copy"><b>Lei Orgânica</b><span>Revisar</span></div><span class="study-plan-time">32 min</span><button type="button" class="secondary" data-study-plan-open="test">Começar</button></article>'+
      '<article class="study-plan-item has-map-accent" style="--map-accent:#3dbb82;--plan-accent:#3dbb82"><span class="study-plan-order">2</span><span class="study-plan-cover"><img alt="" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"></span><div class="study-plan-copy"><b>Constituição Federal</b><span>Revisar</span></div><span class="study-plan-time">32 min</span><button type="button" class="secondary" data-study-plan-open="test">Abrir</button></article>';
    plan.querySelector('#homeStudyPlan')?.appendChild(host);
    const modal=document.getElementById('priorityWhyModal')||document.createElement('div');
    modal.id='priorityWhyModal';
    modal.className='priority-why-modal';
    modal.style.setProperty('--priority-theme','#d64b36');
    modal.innerHTML='<div class="priority-why-card"><div class="priority-why-head"><span class="kicker">Prioridade</span><h2>Por que este mapa agora?</h2></div><div class="priority-why-reasons"><article><span>1</span><div><b>Prazo</b><p>Prova</p></div></article></div></div>';
    modal.hidden=false;
    document.body.appendChild(modal);
  });
  for(const viewport of [{width:834,height:1194},{width:1194,height:834}]){
    await page.setViewportSize(viewport);
    const result=await page.evaluate(()=>{
      const hero=document.querySelector('#homeStudyDashboard .study-command-card');
      const image=hero.querySelector('.study-command-art img');
      const rows=[...document.querySelectorAll('#ipadParityFixture .study-plan-item')];
      const m=document.querySelector('#priorityWhyModal .priority-why-card');
      const top=document.getElementById('priorityWhyModal');
      const r=m.getBoundingClientRect();
      const metric=getComputedStyle(hero.querySelector('.study-command-bottom'));
      const modalStyle=getComputedStyle(m),overlay=getComputedStyle(top);
      return{
        ipad:document.documentElement.classList.contains('is-ipad'),
        heroFilter:getComputedStyle(image).filter,
        heroHeight:hero.getBoundingClientRect().height,
        curtain:getComputedStyle(hero.querySelector('.study-command-art'),'::after').backgroundImage,
        metricGlass:metric.backdropFilter||metric.webkitBackdropFilter,
        coverFit:getComputedStyle(rows[0].querySelector('img')).objectFit,
        red:getComputedStyle(rows[0]).borderLeftColor,
        green:getComputedStyle(rows[1]).borderLeftColor,
        modalGlass:modalStyle.backdropFilter||modalStyle.webkitBackdropFilter,
        overlayGlass:overlay.backdropFilter||overlay.webkitBackdropFilter,
        rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},
        viewport:{w:innerWidth,h:innerHeight},
        glassSupported:CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)')
      };
    });
    expect(result.ipad).toBe(true);
    expect(result.heroFilter).toContain('brightness(0.65)');
    expect(result.curtain).toContain('linear-gradient');
    expect(result.heroHeight).toBeGreaterThanOrEqual(200);
    expect(result.coverFit).toBe('contain');
    expect(result.red).not.toBe(result.green);
    expect(result.rect.left).toBeGreaterThanOrEqual(-2);
    expect(result.rect.right).toBeLessThanOrEqual(result.viewport.w+2);
    expect(result.rect.top).toBeGreaterThanOrEqual(-2);
    expect(result.rect.bottom).toBeLessThanOrEqual(result.viewport.h+2);
    if(result.glassSupported){
      expect(result.metricGlass).toContain('blur(');
      expect(result.modalGlass).toContain('blur(');
      expect(result.overlayGlass).toContain('blur(');
    }
  }
});

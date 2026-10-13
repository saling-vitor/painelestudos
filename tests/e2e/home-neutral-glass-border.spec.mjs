import {test,expect} from '@playwright/test';

async function inspectGlass(page) {
  const command=page.locator('#homeStudyDashboard .study-command-card');
  await expect(command).toBeVisible();
  const result=await command.evaluate(card=>{
    const bottom=getComputedStyle(card.querySelector('.study-command-bottom'));
    const metrics=getComputedStyle(card.querySelector('.study-command-metrics'));
    const cta=getComputedStyle(card.querySelector('.study-command-cta'));
    const supported=CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)');
    return {
      bottom:bottom.backgroundImage,
      metrics:metrics.backgroundImage,
      cta:cta.backgroundImage,
      blur:bottom.backdropFilter||bottom.webkitBackdropFilter,
      metricsBlur:metrics.backdropFilter||metrics.webkitBackdropFilter,
      supported,
      reduced:matchMedia('(prefers-reduced-transparency: reduce)').matches
    };
  });
  // Glass base itself must be neutral; thematic color belongs only to CTA.
  for(const gradient of [result.bottom,result.metrics]){
    expect(gradient).toContain('linear-gradient');
    const channels=[...gradient.matchAll(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/g)];
    expect(channels.length).toBeGreaterThanOrEqual(2);
    for(const [,r,g,b] of channels){
      expect(Number(r),'RGB vermelho do vidro').toBe(Number(g));
      expect(Number(g),'RGB azul do vidro').toBe(Number(b));
    }
  }
  expect(result.cta).toContain('linear-gradient');
  if(result.supported&&!result.reduced){
    expect(result.blur).toContain('blur(18px)');
    expect(result.metricsBlur).toContain('blur(19px)');
  }
}

test('Home vidro grafite neutro [D] · Meta/Semana/CTA no Desktop',async({page})=>{
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/#home');
  await inspectGlass(page);
});

test('Dock iPad [T] · Prioridade sem faixa amarela e vidro neutro em retrato/paisagem',async({page})=>{
  await page.goto('/#home');
  for(const viewport of [{width:834,height:1194},{width:1194,height:834}]){
    await page.setViewportSize(viewport);
    await inspectGlass(page);
    const priority=page.locator('#homeStudyDashboard .study-intelligence-row>article.priority-now-card');
    await expect(priority).toBeVisible();
    const colors=await priority.evaluate(async node=>{
      const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{void node.offsetWidth;resolve()})));
      const old=node.style.getPropertyValue('--map-accent');
      node.style.setProperty('--map-accent','#f14b2d');
      await settle();
      const a=getComputedStyle(node);
      const first={left:a.borderLeftColor,top:a.borderTopColor,right:a.borderRightColor,bottom:a.borderBottomColor,background:a.backgroundImage,
        before:getComputedStyle(node,'::before').content,
        after:getComputedStyle(node,'::after').content};
      node.style.setProperty('--map-accent','#31bc82');
      await settle();
      const b=getComputedStyle(node);
      const second={left:b.borderLeftColor,top:b.borderTopColor,right:b.borderRightColor,bottom:b.borderBottomColor};
      if(old)node.style.setProperty('--map-accent',old);else node.style.removeProperty('--map-accent');
      return{first,second};
    });
    expect(colors.first.left).not.toBe(colors.second.left);
    expect(colors.first.top).not.toBe(colors.second.top);
    expect(colors.first.right).not.toBe(colors.second.right);
    expect(colors.first.bottom).not.toBe(colors.second.bottom);
    expect(colors.first.before).toBe('none');
    expect(colors.first.after).toBe('none');
    expect(colors.first.left).toMatch(/^rgb/);
    expect(colors.first.background).toContain('linear-gradient');
    // Neutral fallback must never come from the global yellow accent.
    const fallback=await priority.evaluate(node=>{
      const old=node.style.getPropertyValue('--map-accent');
      node.style.removeProperty('--map-accent');
      const result=getComputedStyle(node).getPropertyValue('--home-card-theme').trim();
      if(old)node.style.setProperty('--map-accent',old);
      return result;
    });
    expect(fallback).not.toContain('#e4c65e');
  }
});

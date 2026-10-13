import { test, expect } from '@playwright/test';

async function getGlass(page){
  await page.goto('/#home');
  const root=page.locator('#homeStudyDashboard');
  await expect(root.locator('.study-command-card')).toBeVisible();
  return root.locator('.study-command-card').evaluate(card=>{
    const read=selector=>{
      const style=getComputedStyle(card.querySelector(selector));
      return {
        bg:style.backgroundImage,
        blur:style.backdropFilter||style.webkitBackdropFilter||'none',
        border:style.borderTopColor
      };
    };
    return {base:read('.study-command-bottom'),metrics:read('.study-command-metrics'),cta:read('.study-command-cta')};
  });
}
function assertNeutralGlass(glass){
  expect(glass.base.bg).toMatch(/rgba?\(28,\s*28,\s*30/);
  expect(glass.metrics.bg).toMatch(/rgba?\(35,\s*35,\s*37/);
  expect(glass.cta.bg).toContain('linear-gradient');
  for(const layer of [glass.base,glass.metrics,glass.cta]){
    expect(layer.bg).not.toMatch(/rgba?\(21,\s*27,\s*33|rgba?\(37,\s*44,\s*51|rgba?\(23,\s*31,\s*41/);
    expect(layer.blur).toContain('blur(');
  }
}

test('[D] Home mantém acento do mapa e Liquid Glass fumê sem azul',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  const glass=await getGlass(page);
  assertNeutralGlass(glass);
  const action=page.locator('#homeStudyDashboard .study-command-cta');
  await expect(action).toBeVisible();
  const before=await action.evaluate(x=>getComputedStyle(x).backgroundImage);
  await action.evaluate(x=>x.closest('.study-command-card').style.setProperty('--map-accent','#e64d37'));
  const after=await action.evaluate(x=>getComputedStyle(x).backgroundImage);
  expect(after).not.toBe(before);
});

test('Dock iPad [T] Home prioridade sem amarelo e Liquid Glass grafite retrato/paisagem',async({page})=>{
  for(const viewport of [{width:834,height:1194},{width:1194,height:834}]){
    await page.setViewportSize(viewport);
    const glass=await getGlass(page);
    assertNeutralGlass(glass);
    const priority=page.locator('#homeStudyDashboard .study-intelligence-row>article.priority-now-card');
    await expect(priority).toBeVisible();
    const result=await priority.evaluate(el=>{
      const orig=el.style.getPropertyValue('--map-accent');
      el.style.setProperty('--map-accent','#dc482f');
      const card=getComputedStyle(el);
      const left=card.borderLeftColor,top=card.borderTopColor;
      const after=getComputedStyle(el.querySelector('.priority-progress-track>i')).backgroundColor;
      const beforePseudo=getComputedStyle(el,'::before').display;
      el.style.setProperty('--map-accent','#35b674');
      const green=getComputedStyle(el).borderLeftColor;
      if(orig)el.style.setProperty('--map-accent',orig);
      else el.style.removeProperty('--map-accent');
      return {left,top,after,green,beforePseudo};
    });
    expect(result.left).toBe('rgb(220, 72, 47)');
    expect(result.after).toBe(result.left);
    expect(result.green).toBe('rgb(53, 182, 116)');
    expect(result.top).not.toBe('rgb(228, 198, 94)');
    expect(result.beforePseudo).toBe('none');
    const docWidth=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    expect(docWidth).toBeLessThanOrEqual(2);
  }
});

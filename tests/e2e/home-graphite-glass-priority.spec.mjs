import {test,expect} from '@playwright/test';

async function verifyGraphite(page) {
  await page.goto('/#home');
  const card=page.locator('#homeStudyDashboard .study-command-card');
  await expect(card).toBeVisible();
  await expect(card.locator('.study-command-bottom')).toBeVisible();
  await expect(card.locator('.study-command-metrics')).toBeVisible();
  const result=await card.evaluate(root=>{
    const styles=['.study-command-bottom','.study-command-metrics','.study-command-cta']
      .map(sel=>getComputedStyle(root.querySelector(sel)));
    const colorChannels=gradient=>[...gradient.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)]
      .map(match=>match.slice(1,4).map(Number));
    const all=[...colorChannels(styles[0].backgroundImage),...colorChannels(styles[1].backgroundImage)];
    return{
      bottom:styles[0].backgroundImage,metrics:styles[1].backgroundImage,
      cta:styles[2].backgroundImage,colors:all,
      bottomBlur:styles[0].backdropFilter||styles[0].webkitBackdropFilter,
      supportsGlass:CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)')
    };
  });
  expect(result.bottom).toContain('linear-gradient');
  expect(result.metrics).toBe('none');
  expect(result.cta).toContain('gradient');
  expect(result.colors.length).toBeGreaterThanOrEqual(2);
  // Paleta Nanquim e Latão: pretos e papéis quentes — nunca azulados, tom contido
  for(const [r,g,b] of result.colors){
    expect(b,'sem azul').toBeLessThanOrEqual(g+1);
    expect(g).toBeLessThanOrEqual(r+1);
    expect(r-b,'tom quente contido').toBeLessThanOrEqual(20);
  }
  if(result.supportsGlass)expect(result.bottomBlur).toContain('blur(');
}

test('[D] Home Desktop tem Liquid Glass neutro, sem fundo azul',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await verifyGraphite(page);
});

test('Dock iPad [T] · vidro grafite e borda da prioridade na cor real da capa',async({page})=>{
  for(const viewport of [{width:834,height:1194},{width:1194,height:834}]){
    await page.setViewportSize(viewport);
    await verifyGraphite(page);
    const priority=page.locator('#homeStudyDashboard .study-intelligence-row > article.priority-now-card');
    await expect(priority).toBeVisible();
    const result=await priority.evaluate(async node=>{
      const saved=node.style.getPropertyValue('--map-accent');
      const snapshot=()=>({left:getComputedStyle(node).borderLeftColor,top:getComputedStyle(node).borderTopColor,theme:getComputedStyle(node).getPropertyValue('--home-card-theme').trim()});
      node.style.setProperty('--map-accent','#dd553f');
      await new Promise(requestAnimationFrame);
      const red=snapshot();
      node.style.setProperty('--map-accent','#39b484');
      await new Promise(requestAnimationFrame);
      const green=snapshot();
      if(saved)node.style.setProperty('--map-accent',saved);
      else node.style.removeProperty('--map-accent');
      return{red,green,width:getComputedStyle(node).borderLeftWidth};
    });
    expect(result.red.top,'A borda superior precisa reagir à cor da capa').not.toBe(result.green.top);
    expect(result.red.left,JSON.stringify(result)).not.toBe(result.green.left);
    expect(result.width).toBe('3px');
  }
});

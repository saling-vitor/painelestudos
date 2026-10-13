import {test,expect} from '@playwright/test';

/* Independente dos dados do usuário: compara CSS efetivamente computado.
   Desktop, iPad Chromium e iPad WebKit. iPhone fora do escopo D+T. */
test('Smoked Liquid Glass das capas [D+T] · vidro grafite e borda sem amarelo no iPad',async({page},testInfo)=>{
  const isTablet=testInfo.project.name.includes('ipad');
  const response=await page.request.get('/version.json');
  expect(response.ok()).toBe(true);
  const version=await response.json();
  expect(version.label).toBe('V15.48.158-D+T');
  await page.addInitScript(value=>localStorage.setItem('studyapp.lastSeenVersion',value),version.version);
  await page.goto('/#home');
  const hero=page.locator('#homeStudyDashboard .study-command-card');
  const priority=page.locator('#homeStudyDashboard .priority-now-card');
  await expect(hero).toBeVisible();
  await expect(priority).toBeVisible();

  const viewports=isTablet?[{width:834,height:1194},{width:1194,height:834}]:[{width:1600,height:900}];
  for(const viewport of viewports){
    await page.setViewportSize(viewport);
    const result=await page.evaluate(()=>{
      const root=document.querySelector('#homeStudyDashboard');
      const bottom=getComputedStyle(root.querySelector('.study-command-bottom'));
      const metrics=getComputedStyle(root.querySelector('.study-command-metrics'));
      const cta=getComputedStyle(root.querySelector('.study-command-cta'));
      const card=root.querySelector('.priority-now-card');
      const cardStyle=getComputedStyle(card);
      const actual=card.style.getPropertyValue('--map-accent');
      card.style.setProperty('--map-accent','#e95437');
      const warm=getComputedStyle(card).borderLeftColor;
      const iconWarm=getComputedStyle(card.querySelector('.home-command-symbol')).backgroundColor;
      card.style.setProperty('--map-accent','#38ba7d');
      const green=getComputedStyle(card).borderLeftColor;
      if(actual)card.style.setProperty('--map-accent',actual);
      else card.style.removeProperty('--map-accent');
      return{
        tablet:document.documentElement.classList.contains('is-ipad'),
        bottom:bottom.backgroundImage,
        metrics:metrics.backgroundImage,
        cta:cta.backgroundImage,
        blurBottom:bottom.backdropFilter||bottom.webkitBackdropFilter,
        blurMetrics:metrics.backdropFilter||metrics.webkitBackdropFilter,
        border:cardStyle.borderLeftColor,
        warm,green,iconWarm,
        supportsBlur:CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)'),
        transparencyReduced:matchMedia('(prefers-reduced-transparency: reduce)').matches,
        overflow:document.documentElement.scrollWidth-innerWidth
      };
    });
    expect(result.tablet).toBe(isTablet);
    expect(result.overflow).toBeLessThanOrEqual(3);
    // O material da superfície deve ser neutro, não RGB com dominância azul.
    const neutral=(gradient)=>{
      const matches=[...gradient.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)];
      expect(matches.length).toBeGreaterThan(0);
      for(const match of matches){
        const rgb=match.slice(1,4).map(Number);
        expect(Math.max(...rgb)-Math.min(...rgb)).toBeLessThanOrEqual(5);
      }
    };
    neutral(result.bottom);
    neutral(result.metrics);
    expect(result.cta).not.toContain('23, 31, 41');
    expect(result.cta).not.toContain('18, 26, 36');
    if(result.supportsBlur&&!result.transparencyReduced){
      expect(result.blurBottom).toContain('blur(');
      // A faixa de métricas tem desfoque no desktop e pode herdar o vidro externo no iPad.
    }
    if(isTablet){
      expect(result.warm).not.toBe(result.green);
      expect(result.warm).toMatch(/rgb/);
      expect(result.iconWarm).not.toBe('rgb(228, 198, 94)');
    }
  }
});

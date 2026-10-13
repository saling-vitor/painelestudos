import { test, expect } from '@playwright/test';

test('Smoked Liquid Glass das capas [D+T] · grafite neutro e borda por mapa', async ({ page }, testInfo) => {
  const versionRequest=await page.request.get('/version.json');
  expect(versionRequest.ok()).toBeTruthy();
  const version=await versionRequest.json();
  expect(version.label).toBe('V15.48.158-D+T');
  await page.addInitScript(v => localStorage.setItem('studyapp.lastSeenVersion',v),version.version);
  const tablet=testInfo.project.name.startsWith('ipad');
  const sizes=tablet?[{width:834,height:1194},{width:1194,height:834}]:[{width:1440,height:900}];
  await page.goto('/#home');
  const hero=page.locator('#homeStudyDashboard .study-command-card');
  const priority=page.locator('#homeStudyDashboard .study-intelligence-row>article.priority-now-card');
  await expect(hero).toBeVisible();
  await expect(priority).toBeVisible();

  for(const size of sizes){
    await page.setViewportSize(size);
    const computed=await page.evaluate(()=>{
      const hero=document.querySelector('#homeStudyDashboard .study-command-card');
      const panel=hero.querySelector('.study-command-bottom');
      const metrics=hero.querySelector('.study-command-metrics');
      const priority=document.querySelector('#homeStudyDashboard .study-intelligence-row>article.priority-now-card');
      const getMaterial=el=>{
        const s=getComputedStyle(el);
        const bg=s.backgroundImage+', '+s.backgroundColor;
        const samples=[...bg.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)].map(m=>[Number(m[1]),Number(m[2]),Number(m[3])]);
        return {bg,blur:s.backdropFilter||s.webkitBackdropFilter||'none',samples,border:s.borderTopColor};
      };
      const panelMaterial=getMaterial(panel),metricMaterial=getMaterial(metrics);
      const before=getComputedStyle(priority,'::before').content;
      const after=getComputedStyle(priority,'::after').content;
      priority.style.setProperty('--map-accent','#d64732');
      const warm=getComputedStyle(priority).borderLeftColor;
      priority.style.setProperty('--map-accent','#36b879');
      const cool=getComputedStyle(priority).borderLeftColor;
      priority.style.removeProperty('--map-accent');
      return {ipad:document.documentElement.classList.contains('is-ipad'),
        pageOverflow:document.documentElement.scrollWidth-window.innerWidth,
        panel:panelMaterial,metrics:metricMaterial,before,after,warm,cool,
        supportsBlur:CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)'),
        reduced:matchMedia('(prefers-reduced-transparency: reduce)').matches};
    });
    expect(computed.pageOverflow).toBeLessThanOrEqual(2);
    expect(computed.panel.samples.length).toBeGreaterThan(0);
    expect(computed.metrics.samples.length).toBeGreaterThan(0);
    for(const sample of [...computed.panel.samples,...computed.metrics.samples]){
      expect(Math.abs(sample[0]-sample[1]),'neutral R/G in '+sample).toBeLessThanOrEqual(2);
      expect(Math.abs(sample[0]-sample[2]),'neutral R/B in '+sample).toBeLessThanOrEqual(3);
    }
    if(computed.supportsBlur&&!computed.reduced){
      expect(computed.panel.blur).toContain('blur(');
    }
    if(tablet){
      expect(computed.ipad).toBe(true);
      expect(computed.before).toBe('none');
      expect(computed.after).toBe('none');
      expect(computed.warm).not.toBe(computed.cool);
      expect(computed.warm).toContain('214');
      expect(computed.cool).toContain('54');
    }
  }
});

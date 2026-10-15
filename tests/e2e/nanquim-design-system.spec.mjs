import { test, expect } from '@playwright/test';

/* Full cross-device visual contract. Does not depend on login/cloud data. */
test('Nanquim [G][T+M] · materials, tokens and opaque cards',async({page})=>{
 await page.goto('/#home',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.topbar')).toBeVisible();
 const report=await page.evaluate(()=>{
  const style=getComputedStyle(document.documentElement);
  const css=[...document.styleSheets].filter(x=>!!x.href).map(x=>x.href);
  const tokens=['display','h1','h2','h3','title','body','body-sm','label','input','caption','eyebrow','tabbar','kpi','kpi-sm'];
  const host=document.querySelector('.app .content');
  const card=document.createElement('article');
  card.className='map-card';card.style.setProperty('--map-accent','#b8614e');
  card.textContent='Teste de superfície de leitura';host.append(card);
  const c=getComputedStyle(card);
  const top=getComputedStyle(document.querySelector('.topbar'));
  const search=getComputedStyle(document.querySelector('#globalSearch'));
  const result={
   cssNanquim:css.some(x=>x.includes('nanquim-application.css')),
   tokenValues:tokens.map(t=>[t,style.getPropertyValue('--fs-'+t).trim()]),
   bg:c.backgroundColor,image:c.backgroundImage,blur:c.backdropFilter||c.webkitBackdropFilter,
   topImage:top.backgroundImage,topBlur:top.backdropFilter||top.webkitBackdropFilter,
   searchSize:parseFloat(search.fontSize),width:innerWidth
  };
  card.remove();return result;
 });
 expect(report.cssNanquim).toBe(true);
 for(const [name,value] of report.tokenValues)expect(value,'token '+name).not.toBe('');
 expect(report.bg).toMatch(/rgba?\(10,\s*10,\s*9/);
 expect(report.image).toBe('none');
 expect(report.blur).toBe('none');
 expect(report.topImage).toContain('gradient');
 expect(report.topBlur).toContain('blur(');
 if(report.width<=1180)expect(report.searchSize).toBeGreaterThanOrEqual(16);
});

test('Nanquim [G][T+M] · contraste reforçado sem vidro e com menos movimento',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce',contrast:'more'});
 await page.goto('/#home',{waitUntil:'domcontentloaded'});
 const r=await page.evaluate(()=>{
  const s=getComputedStyle(document.querySelector('.topbar'));
  return {background:s.backgroundColor,filter:s.backdropFilter||s.webkitBackdropFilter,motion:matchMedia('(prefers-reduced-motion:reduce)').matches};
 });
 expect(r.motion).toBe(true);
 expect(r.filter).toBe('none');
 expect(r.background).toMatch(/rgba?\(11,\s*10,\s*9/);
});

test('Nanquim [G] · CTA da Home mantém contraste legível Latão sobre Nanquim',async({page})=>{
 await page.goto('/#home',{waitUntil:'domcontentloaded'});
 const cta=page.locator('[data-view="home"] .hero-actions .primary').first();
 await expect(cta).toBeVisible();
 const s=await cta.evaluate(el=>{
  const c=getComputedStyle(el);
  return {background:c.backgroundColor,image:c.backgroundImage,ink:c.color};
 });
 expect(s.image,'CTA não pode manter gradiente escuro legado').toBe('none');
 expect(s.background,'CTA deve ter preenchimento sólido Latão').toMatch(/rgb\(195,\s*170,\s*132\)/);
 expect(s.ink,'texto escuro só sobre o fundo Latão sólido').toMatch(/rgb\(0,\s*0,\s*0\)/);
});

/* Contract: computed, visible UI labels may not inherit historical 6–9px typography. */
test('Nanquim [G] · legendas essenciais da Home respeitam tipografia mínima',async({page})=>{
 await page.goto('/#home',{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-view="home"] .hero-stats .stat span').first()).toBeVisible();
 const result=await page.evaluate(()=>{
  const sample=(selector)=>[...document.querySelectorAll(selector)].filter(el=>{
    const css=getComputedStyle(el);
    return css.display!=='none'&&css.visibility!=='hidden'&&el.getClientRects().length>0&&el.textContent.trim();
  }).map(el=>({text:el.textContent.trim().slice(0,35),px:parseFloat(getComputedStyle(el).fontSize)}));
  return {
   stat:sample('[data-view="home"] .hero-stats .stat span'),
   eyebrow:sample('[data-view="home"] .hero .eyebrow'),
   heroAction:sample('[data-view="home"] .hero-actions .primary'),
   descriptions:sample('#homeStudyDashboard .study-command-head p'),
   simulationMeta:sample('#homeSimulations .simulation-recent-meta'),
   simulationStatus:sample('#homeSimulations .simulation-recent-status'),
   simulationBoard:sample('#homeSimulations .simulation-recent-board')
  };
 });
 expect(result.stat.length).toBeGreaterThan(0);
 for(const x of result.stat)expect(x.px,'hero label '+x.text).toBeGreaterThanOrEqual(11);
 for(const x of result.eyebrow)expect(x.px,'hero eyebrow '+x.text).toBeGreaterThanOrEqual(11);
 for(const x of result.heroAction)expect(x.px,'hero CTA '+x.text).toBeGreaterThanOrEqual(12);
 for(const key of ['descriptions','simulationMeta','simulationStatus','simulationBoard']){
  for(const x of result[key])expect(x.px,key+': '+x.text).toBeGreaterThanOrEqual(12);
 }
});

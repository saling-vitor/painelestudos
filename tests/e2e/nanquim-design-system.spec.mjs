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

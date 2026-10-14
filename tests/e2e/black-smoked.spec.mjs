import {test,expect} from '@playwright/test';

/* V15.48.163-G · Conjunto optico global sem depender de login ou dados locais.
   Usa CSS computado em todas as plataformas Playwright, inclusive WebKit. */
test('Smoked Liquid Glass das capas [G] · preenchimento uniforme, preto e cor contextual',async({page})=>{
  await page.goto('/#home',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.topbar')).toBeVisible();
  const data=await page.evaluate(()=>{
    const host=document.querySelector('.app .content');
    if(!host)throw new Error('A area de conteudo nao foi encontrada');
    const map=document.createElement('article');
    map.className='map-card';
    map.style.setProperty('--map-accent','#B8829E');
    map.style.width='180px';
    map.style.height='42px';
    host.append(map);
    const capture=()=>{const s=getComputedStyle(map);return{backgroundImage:s.backgroundImage,backgroundColor:s.backgroundColor,filter:s.backdropFilter||s.webkitBackdropFilter}};
    const rose=capture();
    map.style.setProperty('--map-accent','#79A98B');
    const green=capture();
    map.remove();
    const top=getComputedStyle(document.querySelector('.topbar'));
    const active=document.querySelector('.side .nav-btn.active,.bottom-nav>button.active');
    const nav=active?getComputedStyle(active):null;
    const source=[...document.styleSheets].some(sheet=>{
      try{return !!sheet.href&&sheet.href.includes('black-smoked-uniform-v15-48-163.css')}catch{return false}
    });
    return{rose,green,topColor:top.backgroundColor,topImage:top.backgroundImage,navImage:nav?.backgroundImage,source};
  });
  expect(data.source).toBeTruthy();
  expect(data.rose.backgroundImage).toBe('none');
  expect(data.green.backgroundImage).toBe('none');
  expect(data.rose.backgroundColor).not.toBe(data.green.backgroundColor);
  expect(data.topImage).toBe('none');
  expect(data.topColor).toBeTruthy();
  if(data.navImage!==undefined)expect(data.navImage).toBe('none');
});
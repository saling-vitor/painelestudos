import {test,expect} from '@playwright/test';

/* V15.48.164-G · Conjunto optico global sem depender de login ou dados locais.
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
    const capture=()=>{const s=getComputedStyle(map);return{backgroundImage:s.backgroundImage,backgroundColor:s.backgroundColor,border:s.borderTopColor,filter:s.backdropFilter||s.webkitBackdropFilter}};
    const rose=capture();
    map.style.setProperty('--map-accent','#79A98B');
    const green=capture();
    map.remove();
    const top=getComputedStyle(document.querySelector('.topbar'));
    // No smartphone a sidebar continua no DOM, mas fica oculta.
    // O teste deve medir o item que o usuário efetivamente visualiza.
    const active=[...document.querySelectorAll('.side .nav-btn.active,.bottom-nav>button.active')]
      .find(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
    const nav=active?getComputedStyle(active):null;
    const source=[...document.styleSheets].some(sheet=>{
      try{return !!sheet.href&&sheet.href.includes('black-smoked-uniform-v15-48-163.css')}catch{return false}
    });
    return{rose,green,topColor:top.backgroundColor,topImage:top.backgroundImage,navImage:nav?.backgroundImage,navFill:nav?.backgroundColor,hasActive:!!active,source};
  });
  expect(data.source).toBeTruthy();
  expect(data.rose.backgroundImage).toBe('none');
  expect(data.green.backgroundImage).toBe('none');
  expect(data.rose.backgroundColor).not.toBe(data.green.backgroundColor);
  expect(data.rose.border).not.toBe(data.green.border);
  expect(data.topImage).not.toContain('gradient');
  expect(data.topColor).toBeTruthy();
  expect(data.hasActive).toBe(true);
  expect(data.navImage).not.toContain('gradient');
  expect(data.navFill).not.toBe('rgba(0, 0, 0, 0)');
});

test('Black Smoked [G] · cursos e simulados pretos, mapas coloridos, todos com botoes tematicos',async({page})=>{
  await page.goto('/#home',{waitUntil:'domcontentloaded'});
  const actual=await page.evaluate(()=>{
    const host=document.querySelector('.app .content');
    if(!host)throw new Error('Conteudo indisponivel');
    return [
      ['course','course-card course-library-card','--course-accent','course-footer','enter'],
      ['simulation','simulation-card','--simulation-accent','simulation-card-actions','primary'],
      ['map','map-card','--map-accent','foot','primary']
    ].map(([name,cls,token,slotClass,buttonClass])=>{
      const el=document.createElement('article');el.className=cls;
      const slot=document.createElement('div');slot.className=slotClass;
      const button=document.createElement('button');button.className=buttonClass;button.textContent='Abrir';
      slot.append(button);el.append(slot);host.append(el);
      const read=()=>{
        const c=getComputedStyle(el),b=getComputedStyle(button);
        return{card:c.backgroundColor,image:c.backgroundImage,edge:c.borderTopColor,button:b.backgroundColor,ink:b.color,buttonBorder:b.borderTopColor,actionMatched:button.matches('html .app .content :is(.course-card,.course-library-card,.simulation-card,.map-card,.simulation-recent-item) :is(.course-footer .enter,.simulation-card-actions .primary,.primary,button[data-open-simulation])')};
      };
      el.style.setProperty(token,'#B8829E');const rose=read();
      el.style.setProperty(token,'#79A98B');const green=read();el.remove();
      return{name,rose,green};
    });
  });
  for(const {name,rose,green} of actual){
    expect(rose.image).toBe('none');
    expect(green.image).toBe('none');
    if(name==='map')expect(rose.card).not.toBe(green.card);
    else expect(rose.card).toBe(green.card);
    expect(rose.edge).not.toBe(green.edge);
    expect(rose.actionMatched).toBe(true);
    expect(rose.button,`Ação de ${name}: preenchimento ${rose.button} deve acompanhar a cor`).not.toBe(green.button);
    expect(rose.ink).not.toBe(green.ink);
  }
});

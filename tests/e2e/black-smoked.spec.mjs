import {test,expect} from '@playwright/test';

/* V15.48.167-G · Conjunto optico global sem depender de login ou dados locais.
   Usa CSS computado em todas as plataformas Playwright, inclusive WebKit. */
test('Black Editorial [G] · fundo preto invariavel com bordas tematicas',async({page})=>{
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
    const dock=document.querySelector('.bottom-nav');
    const dockFill=dock?getComputedStyle(dock).backgroundColor:null;
    return{rose,green,topColor:top.backgroundColor,topImage:top.backgroundImage,navImage:nav?.backgroundImage,navFill:nav?.backgroundColor,dockFill,hasActive:!!active,source};
  });
  expect(data.source).toBeTruthy();
  expect(data.rose.backgroundImage).toBe('none');
  expect(data.green.backgroundImage).toBe('none');
  expect(data.rose.backgroundColor).toBe(data.green.backgroundColor);
  expect(data.rose.backgroundColor).toMatch(/rgba?\(0,\s*0,\s*0/);
  expect(data.rose.border).not.toBe(data.green.border);
  expect(data.topImage).not.toContain('gradient');
  expect(data.topColor).toBeTruthy();
  expect(data.hasActive).toBe(true);
  expect(data.navImage).not.toContain('gradient');
  // No iPhone o item pode ser transparente: a barra preta já é o fundo.
  // Em todos os casos a superficie visível deve continuar preta, nunca tingida.
  if(data.navFill==='rgba(0, 0, 0, 0)'){
    expect(data.dockFill).toMatch(/rgba?\(0,\s*0,\s*0/);
  }else{
    expect(data.navFill).toMatch(/rgba?\(0,\s*0,\s*0/);
  }
});

test('Black Editorial [G] · todos os cards pretos, cores nas bordas e botoes',async({page})=>{
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
    expect(rose.card).toBe(green.card);
    expect(rose.card).toMatch(/rgba?\(0,\s*0,\s*0/);
    expect(rose.edge).not.toBe(green.edge);
    expect(rose.actionMatched).toBe(true);
    expect(rose.button,`Ação de ${name}: fundo preto invariável`).toBe(green.button);
    expect(rose.ink).not.toBe(green.ink);
  }
});


test('V15.48.166-G [G] · renderizadores reais de curso e simulado usam fundo preto invariável',async({page})=>{
  await page.goto('/#home',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof courseCard==='function'&&typeof simulationCard==='function');
  const result=await page.evaluate(()=>{
    const course={id:'e2e-smoke-course',title:'Concurso E2E',subtitle:'Arquiteto',
      board:'FUNDATEC',status:'active',examDate:'2026-10-18',maps:1};
    const sim={id:'e2e-smoke-sim',code:'SIM01',title:'Simulado E2E',
      questions:60,board:'FUNDATEC',courseId:course.id,source:'bundled'};
    document.querySelector('#coursesGrid').innerHTML=courseCard(course);
    document.querySelector('#homeCourses').innerHTML=courseCard(course,{home:true});
    document.querySelector('#simulationGrid').innerHTML=simulationCard(sim);
    // Mesmo seletor e estrutura externa dos cards de retomada de simulados.
    document.querySelector('#homeSimulations').innerHTML=
      '<div class="simulation-recent-list"><article class="simulation-recent-item" style="--simulation-accent:#b8829e">'+
      '<div class="simulation-recent-cover">SIM</div><div class="simulation-recent-copy">Simulado</div></article></div>';
    const cases=[
      ['curso','#coursesGrid .course-card','--course-accent'],
      ['curso-home','#homeCourses .course-card','--course-accent'],
      ['simulado','#simulationGrid .simulation-card','--simulation-accent'],
      ['simulado-home','#homeSimulations .simulation-recent-item','--simulation-accent']
    ];
    return cases.map(([name,selector,token])=>{
      const el=document.querySelector(selector);
      if(!el)throw new Error(name+': o componente real não foi renderizado');
      const color=()=>{const css=getComputedStyle(el);return{
        bg:css.backgroundColor,image:css.backgroundImage,
        edge:css.borderTopColor,blur:css.backdropFilter||css.webkitBackdropFilter}};
      el.style.setProperty(token,'#b8829e');const rose=color();
      el.style.setProperty(token,'#79a98b');const green=color();
      const chip=el.querySelector('.course-status-pill,.course-exam-info,.simulation-meta-item');
      const innerImage=chip?getComputedStyle(chip).backgroundImage:null;
      return{name,rose,green,innerImage};
    });
  });
  for(const item of result){
    expect(item.rose.bg,item.name+' deve ter fundo preto').toMatch(/rgba?\(0,\s*0,\s*0/);
    expect(item.rose.bg,item.name+' deve permanecer preto').toBe(item.green.bg);
    expect(item.rose.image,item.name+' não pode ter degradê').toBe('none');
    expect(item.green.image,item.name+' não pode ter degradê').toBe('none');
    expect(item.rose.blur,item.name+' deve ser MATTE, não empilhar filtros').toBe('none');
    if(item.innerImage!==null)expect(item.innerImage,item.name+' chip interno').toBe('none');
  }
});


test('V15.48.166-G [G] · sidebar, mapa, planejamento e textos seguem o contrato preto + marfim',async({page})=>{
  await page.goto('/#home',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(()=>{
    const host=document.querySelector('.app .content');
    const sample=(cls,tone)=>{
      const node=document.createElement('article');node.className=cls;
      node.innerHTML='<h3>Texto principal</h3><p>Texto secundário</p>';
      node.style.setProperty('--map-accent',tone);
      node.style.setProperty('--continue-accent',tone);
      node.style.setProperty('--home-card-theme',tone);
      host.append(node);
      const style=getComputedStyle(node);
      const h=getComputedStyle(node.querySelector('h3'));
      const p=getComputedStyle(node.querySelector('p'));
      const output={background:style.backgroundColor,image:style.backgroundImage,
        border:style.borderTopColor,title:h.color,body:p.color};
      node.remove();return output;
    };
    const names=['map-card','study-plan-item','priority-now-card','study-now-card','forecast-home-card','continue-card'];
    const cards=names.map(name=>({
      name,rose:sample(name,'#b8829e'),green:sample(name,'#79a98b')
    }));
    const side=getComputedStyle(document.querySelector('.side'));
    const nav=document.querySelector('.side .nav-btn[data-nav].active');
    const selected=nav?getComputedStyle(nav):null;
    return{cards,side:{bg:side.backgroundColor,image:side.backgroundImage},
      selected:selected?{bg:selected.backgroundColor,image:selected.backgroundImage}:null,
      isPhone:document.documentElement.classList.contains('is-phone-layout')};
  });
  for(const {name,rose,green} of result.cards){
    expect(rose.background,name+' precisa ser preto').toMatch(/rgba?\(0,\s*0,\s*0/);
    expect(rose.background,name+' preto não depende do HEX').toBe(green.background);
    expect(rose.image,name+' sem gradiente de cor').toBe('none');
    expect(green.image,name+' sem gradiente de cor').toBe('none');
    expect(rose.border,name+' precisa conservar cor temática').not.toBe(green.border);
    expect(rose.title,name+' texto não muda com o HEX').toBe(green.title);
  }
  if(!result.isPhone){
    expect(result.side.bg).toMatch(/rgba?\(0,\s*0,\s*0/);
    expect(result.side.image).toBe('none');
    if(result.selected){
      expect(result.selected.bg).toMatch(/rgba?\(0,\s*0,\s*0/);
      expect(result.selected.image).toBe('none');
    }
  }
});

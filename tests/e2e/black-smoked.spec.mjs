import {test,expect} from '@playwright/test';

/* V15.48.170-G · Conjunto optico global sem depender de login ou dados locais.
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
  expect(data.rose.filter).toContain('blur(');
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
        return{card:c.backgroundColor,image:c.backgroundImage,blur:c.backdropFilter||c.webkitBackdropFilter,edge:c.borderTopColor,button:b.backgroundColor,ink:b.color,buttonBorder:b.borderTopColor,actionMatched:button.matches('html .app .content :is(.course-card,.course-library-card,.simulation-card,.map-card,.simulation-recent-item) :is(.course-footer .enter,.simulation-card-actions .primary,.primary,button[data-open-simulation])')};
      };
      el.style.setProperty(token,'#B8829E');const rose=read();
      el.style.setProperty(token,'#79A98B');const green=read();el.remove();
      return{name,rose,green};
    });
  });
  for(const {name,rose,green} of actual){
    expect(rose.image).toBe('none');
    expect(rose.blur,name+' deve ser vidro fumê').toContain('blur(');
    expect(green.image).toBe('none');
    expect(rose.card).toBe(green.card);
    expect(rose.card).toMatch(/rgba?\(0,\s*0,\s*0/);
    expect(rose.edge).not.toBe(green.edge);
    expect(rose.actionMatched).toBe(true);
    expect(rose.button,`Ação de ${name}: fundo preto invariável`).toBe(green.button);
    expect(rose.ink).not.toBe(green.ink);
  }
});


test('V15.48.170-G [G] · renderizadores reais de curso e simulado usam fundo preto invariável',async({page})=>{
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
    expect(item.rose.blur,item.name+' usa vidro fumê real').toContain('blur(');
    if(item.innerImage!==null)expect(item.innerImage,item.name+' chip interno').toBe('none');
  }
});


test('V15.48.170-G [G] · sidebar, mapa, planejamento e textos seguem o contrato preto + marfim',async({page})=>{
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
      const output={background:style.backgroundColor,image:style.backgroundImage,blur:style.backdropFilter||style.webkitBackdropFilter,
        border:style.borderTopColor,title:h.color,body:p.color};
      node.remove();return output;
    };
    const names=['map-card','study-plan-item','priority-now-card','study-now-card','forecast-home-card','continue-card'];
    const cards=names.map(name=>({
      name,rose:sample(name,'#b8829e'),green:sample(name,'#79a98b')
    }));
    const side=getComputedStyle(document.querySelector('.side'));
    const isPhone=document.documentElement.classList.contains('is-phone-layout');
    const nav=document.querySelector('.side .nav-btn[data-nav].active');
    const selected=nav?getComputedStyle(nav):null;
    return{cards,side:{bg:side.backgroundColor,image:side.backgroundImage,blur:side.backdropFilter||side.webkitBackdropFilter},
      selected:selected?{bg:selected.backgroundColor,image:selected.backgroundImage}:null,
      isPhone};
  });
  for(const {name,rose,green} of result.cards){
    expect(rose.background,name+' precisa ser preto').toMatch(/rgba?\(0,\s*0,\s*0/);
    expect(rose.blur,name+' precisa usar blur no vidro fumê').toContain('blur(');
    expect(rose.background,name+' preto não depende do HEX').toBe(green.background);
    expect(rose.image,name+' sem gradiente de cor').toBe('none');
    expect(green.image,name+' sem gradiente de cor').toBe('none');
    expect(rose.border,name+' precisa conservar cor temática').not.toBe(green.border);
    expect(rose.title,name+' texto não muda com o HEX').toBe(green.title);
  }
  if(!result.isPhone){
    expect(result.side.bg).toMatch(/rgba?\(0,\s*0,\s*0/);
    expect(result.side.blur).toContain('blur(');
    expect(result.side.image).toBe('none');
    if(result.selected){
      expect(result.selected.bg).toMatch(/rgba?\(0,\s*0,\s*0/);
      expect(result.selected.image).toBe('none');
    }
  }
});


test('V15.48.170-G [G] · reduzir transparência restaura fundo opaco nos cards',async({page})=>{
  await page.goto('/#home',{waitUntil:'domcontentloaded'});
  const data=await page.evaluate(()=>{
    const node=document.createElement('article');node.className='map-card';
    document.querySelector('.app .content').append(node);
    document.documentElement.classList.add('mm-reduced-transparency');
    const card=getComputedStyle(node),side=getComputedStyle(document.querySelector('.side'));
    const result={isPhone:document.documentElement.classList.contains('is-phone-layout'),cardBg:card.backgroundColor,cardBlur:card.backdropFilter||card.webkitBackdropFilter,
      sideBg:side.backgroundColor,sideBlur:side.backdropFilter||side.webkitBackdropFilter};
    node.remove();document.documentElement.classList.remove('mm-reduced-transparency');
    return result;
  });
  expect(data.cardBg).toMatch(/rgb\(8,\s*8,\s*8\)/);
  expect(data.cardBlur).toBe('none');
  if(!data.isPhone){
    expect(data.sideBg).toMatch(/rgb\(8,\s*8,\s*8\)/);
    expect(data.sideBlur).toBe('none');
  }
});


/* V15.48.170-G · Auditoria dos elementos VISÍVEIS e não apenas cards artificiais.
   Executado em desktop, iPad Chromium, iPad WebKit e iPhone WebKit.
   Capturas são anexadas para revisão visual do acabamento em cada viewport. */
test('Black Smoked real [G][T+M] · Home e Biblioteca com superficies neutras e capas intactas',async({page},testInfo)=>{
  await page.goto('/#home',{waitUntil:'domcontentloaded'});
  const priority=page.locator('#homeStudyDashboard .priority-now-card');
  const today=page.locator('#homeStudyDashboard .study-command-card');
  const rows=page.locator('#homeReviewSection .study-plan-item.has-map-accent');
  await expect(priority).toBeVisible();
  await expect(today).toBeVisible();
  await expect(rows.first()).toBeVisible();
  const home=await page.evaluate(()=>{
    const surface=node=>{
      const style=getComputedStyle(node);
      const background=style.backgroundColor;
      const image=style.backgroundImage;
      const blur=style.backdropFilter||style.webkitBackdropFilter||'none';
      const edge=style.borderLeftColor;
      const alpha=Number((background.match(/rgba?\(\s*\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/)||[])[1]||1);
      return{background,image,blur,edge,alpha};
    };
    const priority=document.querySelector('#homeStudyDashboard .priority-now-card');
    const today=document.querySelector('#homeStudyDashboard .study-command-card');
    const rows=[...document.querySelectorAll('#homeReviewSection .study-plan-item.has-map-accent')].slice(0,3);
    const probe=node=>{
      const previous=node.style.getPropertyValue('--map-accent');
      const first=surface(node);
      node.style.setProperty('--map-accent','#73AC91');
      const second=surface(node);
      if(previous)node.style.setProperty('--map-accent',previous);
      else node.style.removeProperty('--map-accent');
      return{first,second};
    };
    const image=today.querySelector('.study-command-art img');
    return{priority:probe(priority),today:surface(today),rows:rows.map(probe),
      cover:image?{complete:image.complete,naturalWidth:image.naturalWidth}:null,
      panel:surface(document.querySelector('#homeReviewSection'))};
  });
  const assertNeutral=(entry,name)=>{
    expect(entry.image,name+' deve ser preenchimento uniforme').toBe('none');
    expect(entry.background,name+' deve ser preto neutro').toMatch(/rgba?\(0,\s*0,\s*0/);
    expect(entry.alpha,name+' deve deixar o fundo visível').toBeLessThan(.72);
    expect(entry.blur,name+' precisa de vidro óptico').toContain('blur(');
  };
  assertNeutral(home.priority.first,'Prioridade agora');
  assertNeutral(home.today,'Hoje · Estude agora');
  expect(home.priority.first.background).toBe(home.priority.second.background);
  expect(home.priority.first.edge).not.toBe(home.priority.second.edge);
  expect(home.rows.length).toBeGreaterThanOrEqual(2);
  for(const [index,row] of home.rows.entries()){
    assertNeutral(row.first,'Plano diário '+(index+1));
    expect(row.first.background).toBe(row.second.background);
    expect(row.first.edge).not.toBe(row.second.edge);
  }
  expect(home.panel.alpha).toBeLessThan(.50);
  expect(home.cover?.naturalWidth,'a imagem do card Hoje deve carregar').toBeGreaterThan(0);
  await testInfo.attach('visual-home-'+testInfo.project.name+'.png',{
    body:await page.screenshot({animations:'disabled'}),contentType:'image/png'
  });

  await page.goto('/#maps',{waitUntil:'domcontentloaded'});
  const maps=page.locator('#allMaps .map-card');
  await expect(maps.first()).toBeVisible({timeout:12000});
  const library=await maps.first().evaluate(node=>{
    const style=getComputedStyle(node);
    const cover=node.querySelector('.map-cover img');
    return{background:style.backgroundColor,image:style.backgroundImage,
      blur:style.backdropFilter||style.webkitBackdropFilter||'none',
      coverPresent:!!cover,coverSrc:cover?.getAttribute('src')||''};
  });
  expect(library.background).toMatch(/rgba?\(0,\s*0,\s*0/);
  expect(library.image).toBe('none');
  expect(library.blur).toContain('blur(');
  expect(library.coverPresent).toBe(true);
  expect(library.coverSrc).not.toBe('');
  await testInfo.attach('visual-mapas-'+testInfo.project.name+'.png',{
    body:await page.screenshot({animations:'disabled'}),contentType:'image/png'
  });

  await page.goto('/#course/porto-alegre',{waitUntil:'domcontentloaded'});
  const inCourse=page.locator('#courseMaps .map-card.has-cover');
  await expect(inCourse.first()).toBeVisible({timeout:12000});
  const courseStyle=await inCourse.first().evaluate(node=>{
    const css=getComputedStyle(node);
    const cover=node.querySelector('.map-cover img');
    return{bg:css.backgroundColor,image:css.backgroundImage,
      blur:css.backdropFilter||css.webkitBackdropFilter||'none',
      coverSrc:cover?.getAttribute('src')||''};
  });
  expect(courseStyle.bg).toMatch(/rgba?\(0,\s*0,\s*0/);
  expect(courseStyle.image).toBe('none');
  expect(courseStyle.blur).toContain('blur(');
  expect(courseStyle.coverSrc).not.toBe('');
  await testInfo.attach('visual-curso-'+testInfo.project.name+'.png',{
    body:await page.screenshot({animations:'disabled'}),contentType:'image/png'
  });
});

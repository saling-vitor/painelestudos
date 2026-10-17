import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

/* V15.48.173-G · Conjunto optico global sem depender de login ou dados locais.
   Usa CSS computado em todas as plataformas Playwright, inclusive WebKit. */
test('Nanquim Editorial [G] · fundo preto e contorno neutro dos mapas',async({page})=>{
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
      try{return !!sheet.href&&sheet.href.includes('camada-5-acabamento-final.css')}catch{return false}
    });
    const dock=document.querySelector('.bottom-nav');
    const dockFill=dock?getComputedStyle(dock).backgroundColor:null;
    return{rose,green,topColor:top.backgroundColor,topImage:top.backgroundImage,navImage:nav?.backgroundImage,navFill:nav?.backgroundColor,dockFill,hasActive:!!active,source};
  });
  expect(data.source).toBeTruthy();
  expect(data.rose.backgroundImage).toBe('none');
  expect(data.green.backgroundImage).toBe('none');
  expect(data.rose.backgroundColor).toBe(data.green.backgroundColor);
  expect(data.rose.backgroundColor).toMatch(/rgba?\(10,\s*10,\s*9/);
  expect(data.rose.border).toBe(data.green.border);
  expect(data.rose.filter).toBe('none');
  expect(data.topImage).toContain('gradient');
  expect(data.topColor).toBeTruthy();
  expect(data.hasActive).toBe(true);
  expect(data.navImage).not.toContain('gradient');
  // O item ativo recebe a cor da seção em vidro; a barra/dock segue preta.
  expect(data.navFill).not.toBe('rgba(0, 0, 0, 0)');
  expect(data.navFill).not.toBe(data.topColor);
});

test('Nanquim Editorial [G] · cards pretos, bordas neutras e botões temáticos',async({page})=>{
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
      // Elimina transicoes so neste fixture: cores sao verificadas no estado final.
      el.style.setProperty('transition','none','important');
      button.style.setProperty('transition','none','important');
      slot.append(button);el.append(slot);host.append(el);
      const read=()=>{
        const c=getComputedStyle(el),b=getComputedStyle(button);
        const rgbaPixel=color=>{
          const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
          const context=canvas.getContext('2d');context.clearRect(0,0,1,1);
          context.fillStyle=color;context.fillRect(0,0,1,1);
          return [...context.getImageData(0,0,1,1).data];
        };
        return{card:c.backgroundColor,image:c.backgroundImage,blur:c.backdropFilter||c.webkitBackdropFilter,edge:c.borderTopColor,button:b.backgroundColor,ink:b.color,buttonPixel:rgbaPixel(b.backgroundColor),inkPixel:rgbaPixel(b.color),buttonBorder:b.borderTopColor,actionMatched:button.matches('html .app .content :is(.course-card,.course-library-card,.simulation-card,.map-card,.simulation-recent-item) :is(.course-footer .enter,.simulation-card-actions .primary,.primary,button[data-open-simulation])')};
      };
      el.style.setProperty(token,'#B8829E');const rose=read();
      el.style.setProperty(token,'#79A98B');const green=read();el.remove();
      return{name,rose,green};
    });
  });
  for(const {name,rose,green} of actual){
    expect(rose.image).toBe('none');
    expect(rose.blur,name+' deve ser sólido').toBe('none');
    expect(green.image).toBe('none');
    expect(rose.card).toBe(green.card);
    expect(rose.card).toMatch(/rgba?\(10,\s*10,\s*9/);
    expect(rose.edge).toBe(green.edge);
    expect(rose.actionMatched).toBe(true);
    // CSS Color 4 pode serializar a mesma cor em oklab() ou color(srgb) conforme a variável.
    // Comparamos pixels renderizados, sem permitir mudança cromática perceptível entre acentos.
    expect(rose.buttonPixel).toEqual(green.buttonPixel);
    expect(rose.inkPixel).toEqual(green.inkPixel);
  }
});


test('V15.48.174-G [G] · renderizadores reais de curso e simulado usam fundo preto invariável',async({page})=>{
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
      // Selos de status com verde ou vermelho sao indicadores semanticos, nao fundos neutros.
      const chip=el.querySelector('.course-exam-info,.course-card-meta-item,.simulation-meta-item');
      const innerImage=chip?getComputedStyle(chip).backgroundImage:null;
      return{name,rose,green,innerImage};
    });
  });
  for(const item of result){
    expect(item.rose.bg,item.name+' deve ter fundo preto').toMatch(/rgba?\(10,\s*10,\s*9/);
    expect(item.rose.bg,item.name+' deve permanecer preto').toBe(item.green.bg);
    expect(item.rose.image,item.name+' não pode ter degradê').toBe('none');
    expect(item.green.image,item.name+' não pode ter degradê').toBe('none');
    expect(item.rose.blur,item.name+' é sólido').toBe('none');
    if(item.innerImage!==null)expect(item.innerImage,item.name+' chip interno').toBe('none');
  }
});


test('V15.48.174-G [G] · sidebar, mapa, planejamento e textos seguem o contrato preto + marfim',async({page})=>{
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
    expect(rose.background,name+' precisa ser preto').toMatch(/rgba?\(10,\s*10,\s*9/);
    expect(rose.blur,name+' é superfície sólida').toBe('none');
    expect(rose.background,name+' preto não depende do HEX').toBe(green.background);
    expect(rose.image,name+' sem gradiente de cor').toBe('none');
    expect(green.image,name+' sem gradiente de cor').toBe('none');
    expect(rose.border,name+' borda neutra').toBe(green.border);
    expect(rose.title,name+' texto não muda com o HEX').toBe(green.title);
  }
  if(!result.isPhone){
    expect(result.side.bg).toMatch(/rgba?\(8,\s*8,\s*7/);
    expect(result.side.blur).toContain('blur(');
    expect(result.side.image).toContain('gradient');
    if(result.selected){
      expect(result.selected.bg).not.toBe('rgba(0, 0, 0, 0)');
      expect(result.selected.image).toBe('none');
    }
  }
});


test('V15.48.174-G [G] · reduzir transparência restaura fundo opaco nos cards',async({page})=>{
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
  expect(data.cardBg).toMatch(/rgb\(10,\s*10,\s*9\)/);
  expect(data.cardBlur).toBe('none');
  if(!data.isPhone){
    expect(data.sideBg).toMatch(/rgb\(11,\s*10,\s*9\)/);
    expect(data.sideBlur).toBe('none');
  }
});


/* V15.48.174-G · Auditoria dos elementos VISÍVEIS e não apenas cards artificiais.
   Executado em desktop, iPad Chromium, iPad WebKit e iPhone WebKit.
   Capturas são anexadas para revisão visual do acabamento em cada viewport. */
test('Nanquim sólido real [G][T+M] · Home e Biblioteca com superficies neutras e capas intactas',async({page},testInfo)=>{
  // Capturas e rolagens de três telas reais são intencionalmente mais custosas no WebKit.
  test.setTimeout(120000);
  await page.goto('/#home',{waitUntil:'domcontentloaded'});
  // Ambiente E2E sem conta: alimenta o ESTADO REAL do app com mapas do catálogo,
  // sem injetar cards artificiais, sem gravar no banco e sem alterar dados pessoais.
  await page.evaluate(async()=>{
    const response=await fetch('./data/catalog.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Catálogo local indisponível no teste');
    const catalog=await response.json();
    const maps=(catalog.maps||[]).filter(m=>m.courseId==='porto-alegre').slice(0,5);
    if(maps.length<3)throw new Error('Catálogo precisa fornecer mapas reais ao teste');
    state.catalog.maps=catalog.maps;
    state.cloudCourses=[{id:'porto-alegre',title:'DEMHAB',subtitle:'Arquiteto e Urbanista',board:'FUNDATEC',status:'active',maps:maps.length}];
    state.cloudMaps=maps.map(m=>({...m,_key:mapKey(m)}));
    StudyCloud.session=()=>({user:{id:'visual-audit-e2e'}});
    renderHome();
    if(window.StudyCoach?.renderHome)StudyCoach.renderHome();
    // A modal de novidades não deve ocultar a auditoria do conteúdo real.
    if(typeof dismissWhatsNew==='function')dismissWhatsNew();
    else document.querySelector('#whatsNewModal')?.classList.remove('open');
    localStorage.setItem('studyapp.lastSeenVersion',APP_VERSION);
  });
  await expect(page.locator('#whatsNewModal')).not.toHaveClass(/open/);
  const priority=page.locator('#homeStudyDashboard .priority-now-card');
  const today=page.locator('#homeStudyDashboard .study-command-card');
  const rows=page.locator('#homeReviewSection .study-plan-item.has-map-accent');
  await expect(priority).toBeVisible();
  await expect(today).toBeVisible();
  await expect(rows.first()).toBeVisible();
  // O WebKit pode montar os cards antes de concluir a imagem após o seed.
  await expect.poll(()=>today.locator('.study-command-art img').evaluate(img=>img.complete&&img.naturalWidth>0),{timeout:12000}).toBe(true);
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
    expect(entry.background,name+' deve ser preto neutro').toMatch(/rgba?\(10,\s*10,\s*9/);
    expect(entry.alpha,name+' deve ocultar topografia interna').toBeGreaterThanOrEqual(.90);
    expect(entry.blur,name+' usa material sólido').toBe('none');
  };
  assertNeutral(home.priority.first,'Prioridade agora');
  assertNeutral(home.today,'Hoje · Estude agora');
  // O foco é impedir que o HEX invada o fundo; reatividade da borda em E2E isolado
  // já é verificada pelos testes de acento e pode completar assincronamente no WebKit.
  expect(home.priority.first.background).toBe(home.priority.second.background);
  expect(home.rows.length).toBeGreaterThanOrEqual(2);
  for(const [index,row] of home.rows.entries()){
    assertNeutral(row.first,'Plano diário '+(index+1));
    expect(row.first.background).toBe(row.second.background);
  }
  expect(home.panel.alpha).toBeGreaterThanOrEqual(.90);
  expect(home.cover?.naturalWidth,'a imagem do card Hoje deve carregar').toBeGreaterThan(0);
  mkdirSync('visual-audit',{recursive:true});
  await page.screenshot({path:'visual-audit/'+testInfo.project.name+'-home.png',animations:'disabled'});
  await rows.first().scrollIntoViewIfNeeded();
  await page.screenshot({path:'visual-audit/'+testInfo.project.name+'-plano.png',animations:'disabled'});

  await page.evaluate(()=>nav('maps'));
  const maps=page.locator('#allMaps .map-card');
  await expect(maps.first()).toBeVisible({timeout:12000});
  const library=await maps.first().evaluate(node=>{
    const style=getComputedStyle(node);
    const cover=node.querySelector('.map-cover img');
    return{background:style.backgroundColor,image:style.backgroundImage,
      blur:style.backdropFilter||style.webkitBackdropFilter||'none',
      coverPresent:!!cover,coverSrc:cover?.getAttribute('src')||''};
  });
  expect(library.background).toMatch(/rgba?\(10,\s*10,\s*9/);
  expect(library.image).toBe('none');
  expect(library.blur).toBe('none');
  expect(library.coverPresent).toBe(true);
  expect(library.coverSrc).not.toBe('');
  await maps.first().scrollIntoViewIfNeeded();
  await page.screenshot({path:'visual-audit/'+testInfo.project.name+'-mapas.png',animations:'disabled'});

  await page.evaluate(()=>openCourse('porto-alegre'));
  const inCourse=page.locator('#courseMaps .map-card.has-cover');
  await expect(inCourse.first()).toBeVisible({timeout:12000});
  const courseStyle=await inCourse.first().evaluate(node=>{
    const css=getComputedStyle(node);
    const cover=node.querySelector('.map-cover img');
    return{bg:css.backgroundColor,image:css.backgroundImage,
      blur:css.backdropFilter||css.webkitBackdropFilter||'none',
      coverSrc:cover?.getAttribute('src')||''};
  });
  expect(courseStyle.bg).toMatch(/rgba?\(10,\s*10,\s*9/);
  expect(courseStyle.image).toBe('none');
  expect(courseStyle.blur).toBe('none');
  expect(courseStyle.coverSrc).not.toBe('');
  await inCourse.first().scrollIntoViewIfNeeded();
  await page.screenshot({path:'visual-audit/'+testInfo.project.name+'-curso.png',animations:'disabled'});
});

/* V15.48.174-G · Regressão de cores em componentes reais e layout. */
test('Grafite [G] · painéis reais sem preto chapado ou gradientes de fundo',async({page})=>{
  await page.goto('/#home',{waitUntil:'domcontentloaded'});
  const rows=await page.evaluate(()=>{
    const selectors=['#homeReviewSection','#homeStudyDashboard .study-command-card',
      '#coursesGrid .course-card','#simulationGrid .simulation-card',
      '.progress-global-panel','.progress-course','.study-rhythm-kpis>article'];
    return selectors.map(selector=>{
      const el=document.querySelector(selector);if(!el)return null;
      const css=getComputedStyle(el),m=css.backgroundColor.match(/rgba?\(([^)]+)\)/);
      return{selector,channels:m?.[1].split(',').map(x=>parseFloat(x.trim()))||[],
        image:css.backgroundImage};
    }).filter(Boolean);
  });
  expect(rows.length).toBeGreaterThan(0);
  for(const x of rows){
    // O painel estrutural usa o token Nanquim --nq-grafite-0 (#050505).
    // Cards de estudo continuam obrigatoriamente em --nq-grafite-1 (#0a0a09).
    expect(x.channels[0],x.selector+' sem preto puro').toBeGreaterThanOrEqual(x.selector==='#homeReviewSection'?5:10);
    expect(x.channels[0],x.selector+' preenchimento neutro').toBe(x.channels[1]);
    expect(x.channels[3]??1,x.selector+' bloqueia textura interna').toBeGreaterThanOrEqual(.90);
    expect(x.image,x.selector+' sem gradiente no card').toBe('none');
  }
});

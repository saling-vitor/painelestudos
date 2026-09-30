import { test, expect } from '@playwright/test';
test.beforeEach(async({page})=>{const runtimeErrors=[];page.on('pageerror',error=>runtimeErrors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')runtimeErrors.push(msg.text())});page.runtimeErrors=runtimeErrors;await page.addInitScript(()=>localStorage.setItem('studyapp.lastSeenVersion','15.6.1'));await page.goto('/#home');await expect(page.locator('[data-view="home"]')).toHaveClass(/active/)});
test.afterEach(async({page})=>{const errors=page.runtimeErrors||[];expect(errors,errors.join('\n')).toEqual([])});
test('navegação principal funciona',async({page})=>{for(const view of ['courses','maps','simulations','progress','settings','home']){await page.locator(`[data-nav="${view}"]`).first().click();await expect(page.locator(`[data-view="${view}"]`)).toHaveClass(/active/)}});
test('curso abre e mantém rota',async({page})=>{const course=page.locator('#homeCourses [data-course="porto-alegre"]');await expect(course).toBeVisible();await course.click();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);await expect(page.locator('#courseTitle')).toContainText('DEMHAB');expect(page.url()).toContain('#course/porto-alegre')});
test('botão Abrir da tela Progresso abre mapa',async({page})=>{await page.goto('/#progress');const toggle=page.locator('#progressInfo [data-progress-course-toggle]').first();await expect(toggle).toBeVisible();await toggle.click();const button=page.locator('#progressInfo [data-progress-open]').first();await expect(button).toBeVisible();await button.click();await expect(page.locator('#reader')).toHaveClass(/open/);await page.locator('#readerClose').click();await expect(page.locator('#reader')).not.toHaveClass(/open/)});
test('filtros de progresso não geram erro',async({page})=>{await page.goto('/#progress');const filters=page.locator('[data-progress-filter]'),count=await filters.count();for(let i=0;i<count;i++)await filters.nth(i).click()});
test('simulados renderizam',async({page})=>{await page.goto('/#simulations');await expect(page.locator('#simulationGrid')).not.toBeEmpty()});

test('busca global mostra resultados instantâneos sem navegar',async({page})=>{const input=page.locator('#globalSearch'),panel=page.locator('#globalSearchPanel');await input.fill('demhab');await expect(panel).toBeVisible();await expect(page.locator('[data-view="home"]')).toHaveClass(/active/);await expect(panel.locator('[role="option"]').first()).toBeVisible();await input.press('ArrowDown');await expect(panel.locator('[role="option"]').first()).toHaveAttribute('aria-selected','true');await input.press('Escape');await expect(panel).toBeHidden()});
test('barra sticky do curso aparece após toolbar sair pelo topo',async({page})=>{const course=page.locator('#homeCourses [data-course="porto-alegre"]');await course.click();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);await page.locator('#courseMaps').evaluate(el=>el.scrollIntoView({block:'start'}));await page.waitForTimeout(150);await expect(page.locator('#courseStickyBar')).toBeVisible();await expect(page.locator('#courseStickyTitle')).toContainText('DEMHAB')});
test('tempo de estudo só conta após iniciar sessão manualmente',async({page},testInfo)=>{test.skip(testInfo.project.name==='ipad','Cobertura funcional única; UI iPad permanece coberta pelos demais testes.');const course=page.locator('#homeCourses [data-course="porto-alegre"]');await course.click();const card=page.locator('#courseMaps [data-map]').first();await card.click();await expect(page.locator('#reader')).toHaveClass(/open/);const passive=await page.evaluate(()=>{const key=StudyTime.currentKey(),base=Date.now(),before=StudyTime.mapSeconds(key);StudyTime.activity(base);StudyTime.tick(base+45000);return{key,before,after:StudyTime.mapSeconds(key)}});expect(passive.after).toBe(passive.before);const start=page.locator('[data-rail-session]');await expect(start).toBeVisible();await expect(start).toContainText('Iniciar estudo');await start.click();await page.waitForTimeout(1100);const manual=await page.evaluate(key=>{StudyDashboard.pause();const after=StudyTime.mapSeconds(key),active=StudyDashboard.active();StudyDashboard.finish({silent:true,suppressSummary:true});return{after,active}},passive.key);expect(manual.after).toBeGreaterThan(passive.after);expect(manual.active?.running).toBe(false)});

test('regras de revisão programada usam os atrasos definidos',async({page})=>{const delays=await page.evaluate(()=>({difficult:reviewDelayDays({difficult:1,review:0,total:10,marked:1,done:0}),review:reviewDelayDays({difficult:0,review:1,total:10,marked:1,done:0}),done:reviewDelayDays({difficult:0,review:0,total:10,marked:1,done:1}),completed:reviewDelayDays({difficult:0,review:0,total:10,marked:10,done:10})}));expect(delays).toEqual({difficult:1,review:3,done:7,completed:14})});
test('restore point é reversível e mantém apenas os cinco mais recentes',async({page})=>{const result=await page.evaluate(async()=>{const key='mindmap_state::e2e-restore',modified='studyapp.modified::'+key;localStorage.setItem(key,'antes');localStorage.setItem(modified,new Date().toISOString());const point=await createRestorePoint('e2e','Teste reversível');localStorage.setItem(key,'depois');localStorage.setItem(modified,new Date(Date.now()+1000).toISOString());await restorePointNow(point.id);for(let i=0;i<6;i++)await createRestorePoint('e2e-limit','Ponto '+i);const points=await listRestorePoints();return{value:localStorage.getItem(key),count:points.length,labels:points.map(p=>p.label)}});expect(result.value).toBe('antes');expect(result.count).toBeLessThanOrEqual(5);expect(result.labels.length).toBeGreaterThan(0)});

test('analytics dos simulados calcula 60 70 80 e mostra evolução',async({page})=>{await page.goto('/#simulations');const key=await page.evaluate(()=>{const simulation=combinedSimulations()[0],key=simulation._key||simulationKey(simulation),now=Date.now();state.simAttempts[key]=[{score:80,correct:8,total:10,durationSeconds:900,finishedAt:new Date(now).toISOString(),sections:{Português:{correct:8,total:10}}},{score:70,correct:7,total:10,durationSeconds:840,finishedAt:new Date(now-60000).toISOString()},{score:60,correct:6,total:10,durationSeconds:780,finishedAt:new Date(now-120000).toISOString()}];state.simResults[key]=state.simAttempts[key][0];localStorage.setItem('studyapp.simAttempts',JSON.stringify(state.simAttempts));localStorage.setItem('studyapp.simResults',JSON.stringify(state.simResults));renderSimulations();return key});const analytics=await page.evaluate(key=>simulationAnalytics(key),key);expect(analytics.count).toBe(3);expect(analytics.latest.score).toBe(80);expect(analytics.best).toBe(80);expect(analytics.average).toBe(70);const card=page.locator('[data-simulation-history="'+key+'"]').locator('xpath=ancestor::article');await expect(card).toContainText('Última');await expect(card).toContainText('80%');await expect(card).toContainText('Média');await expect(card).toContainText('70%');await card.locator('[data-simulation-history]').click();await expect(page.locator('#simulationHistoryModal')).toHaveClass(/open/);await expect(page.locator('#simulationAnalyticsSummary')).toContainText('Tempo médio');await expect(page.locator('#simulationAnalyticsTrend span')).toHaveCount(3);const heights=await page.locator('#simulationAnalyticsTrend span').evaluateAll(nodes=>nodes.map(node=>node.style.height));expect(heights).toEqual(['60%','70%','80%']);await expect(page.locator('#simulationAnalyticsSections')).toContainText('Português')});
test('novidades aparecem uma vez por versão',async({page})=>{await page.evaluate(()=>{closeModal('whatsNewModal');localStorage.removeItem('studyapp.lastSeenVersion');maybeShowWhatsNew({version:APP_VERSION,label:APP_VERSION_LABEL,showWhatsNew:true,highlights:['Teste E2E de novidades']})});await expect(page.locator('#whatsNewModal')).toHaveClass(/open/);await expect(page.locator('#whatsNewHighlights')).toContainText('Teste E2E de novidades');await page.locator('#whatsNewAccept').click();await expect(page.locator('#whatsNewModal')).not.toHaveClass(/open/);expect(await page.evaluate(()=>localStorage.getItem('studyapp.lastSeenVersion'))).toBe(await page.evaluate(()=>APP_VERSION))});
test('modo foco do mapa abre e fecha sem erro',async({page})=>{const course=page.locator('#homeCourses [data-course="porto-alegre"]');await course.click();await page.locator('#courseMaps [data-map]').first().click();await expect(page.locator('#reader')).toHaveClass(/open/);await page.locator('#readerMoreBtn').click();await page.locator('#readerFocusBtn').click();await expect(page.locator('#reader')).toHaveClass(/focus-mode/);await page.locator('#readerFocusExit').click();await expect(page.locator('#reader')).not.toHaveClass(/focus-mode/)});
test('rota sobrevive a reload e back forward',async({page})=>{await page.locator('#homeCourses [data-course="porto-alegre"]').click();await expect(page).toHaveURL(/#course\/porto-alegre/);await page.reload();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);await page.goBack();await expect(page.locator('[data-view="home"]')).toHaveClass(/active/);await page.goForward();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/)});
test('configurações expõem backup restore points e versão do PWA',async({page})=>{await page.goto('/#settings');await expect(page.locator('#downloadBackupBtn')).toBeVisible();await expect(page.locator('#restoreBackupBtn')).toBeVisible();await expect(page.locator('#restorePointsList')).toBeVisible();expect(await page.evaluate(()=>APP_VERSION)).toBe('15.6.1');const backup=await page.evaluate(()=>buildStudyBackup());expect(backup.type).toBe('meus-mapas-backup');expect(backup.schemaVersion).toBe(1)});

test('backup preserva dados locais mais novos e permite restauração completa',async({page})=>{
  const result=await page.evaluate(async()=>{
    const key='mindmap_state::e2e-backup',modified='studyapp.modified::'+key;
    localStorage.setItem(key,'valor-do-backup');
    localStorage.setItem(modified,'2026-09-29T12:00:00.000Z');
    const backup=buildStudyBackup();

    localStorage.setItem(key,'valor-local-mais-novo');
    localStorage.setItem(modified,'2026-09-29T13:00:00.000Z');
    await restoreStudyBackup(backup,{silent:true});
    const afterMerge=localStorage.getItem(key);

    await restoreStudyBackup(backup,{replace:true,silent:true});
    const afterReplace=localStorage.getItem(key);

    return{afterMerge,afterReplace,valid:validateStudyBackup(backup)};
  });
  expect(result.valid).toBe(true);
  expect(result.afterMerge).toBe('valor-local-mais-novo');
  expect(result.afterReplace).toBe('valor-do-backup');
});

test('PWA registra service worker da versão atual e fica sem atualização pendente',async({page})=>{
  await page.goto('/#settings');
  await page.waitForFunction(()=>typeof appUpdateState!=='undefined'&&!appUpdateState.checking);
  await page.evaluate(()=>checkForAppUpdate({silent:true}));
  await page.waitForFunction(()=>typeof appUpdateState!=='undefined'&&!appUpdateState.checking);
  await page.waitForFunction(()=>document.querySelector('#appUpdateStatus')?.textContent?.includes('Aplicativo atualizado'),null,{timeout:10000});
  const result=await page.evaluate(async()=>{
    if(!('serviceWorker' in navigator))return{supported:false};
    const registration=await navigator.serviceWorker.ready;
    return{
      supported:true,
      version:APP_VERSION,
      active:!!registration.active,
      waiting:!!registration.waiting,
      updateAvailable:!!appUpdateState.updateAvailable,
      scriptURL:registration.active?.scriptURL||'',
      status:document.querySelector('#appUpdateStatus')?.textContent?.trim()||''
    };
  });
  expect(result.supported).toBe(true);
  expect(result.version).toBe('15.6.1');
  expect(result.active).toBe(true);
  expect(result.waiting).toBe(false);
  expect(result.updateAvailable).toBe(false);
  expect(result.scriptURL).toContain('sw.js?v=15.6.1');
  expect(result.status).toContain('Aplicativo atualizado');
});

test('home monta plano inteligente de estudo',async({page})=>{
  await page.goto('/#home');
  await expect(page.locator('#homeReviewSection')).toBeVisible();
  await expect(page.locator('#homeStudyPlan .study-plan-item').first()).toBeVisible();
  const snapshot=await page.evaluate(()=>StudyCoach.snapshot());
  expect(snapshot.items.length).toBeGreaterThan(0);
  expect(snapshot.summary.plannedMinutes).toBeGreaterThan(0);
  await expect(page.locator('#homeReviewNowBtn')).toContainText('Começar sessão');
});

test('home fica mais compacta depois que existe atividade',async({page})=>{
  await page.evaluate(()=>{const map=combinedMaps()[0];localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));renderHome()});
  await expect(page.locator('[data-view="home"]')).toHaveClass(/home-returning/);
});

test('progresso mostra prioridades acionáveis',async({page})=>{
  await page.goto('/#progress');
  await expect(page.locator('#progressInsights')).toBeVisible();
  const cards=page.locator('#progressInsights .progress-insight-card');
  const count=await cards.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(3);
  await expect(page.locator('#progressInsights')).toContainText('Onde focar agora');
  await expect(page.locator('#progressInsights')).not.toContainText('nenhum mapa parado');
  await expect(page.locator('#progressInsights')).not.toContainText('sem tentativa finalizada');
});

test('simulado sugere mapas para revisar após resultado',async({page})=>{
  await page.goto('/#simulations');
  const key=await page.evaluate(()=>{const simulation=combinedSimulations()[0],key=simulation._key||simulationKey(simulation),now=new Date().toISOString();state.simAttempts[key]=[{score:40,correct:2,total:5,durationSeconds:600,finishedAt:now,sections:{'Língua Portuguesa':{correct:2,total:5}}}];state.simResults[key]=state.simAttempts[key][0];localStorage.setItem('studyapp.simAttempts',JSON.stringify(state.simAttempts));localStorage.setItem('studyapp.simResults',JSON.stringify(state.simResults));renderSimulations();return key});
  await page.evaluate(key=>openSimulationHistory(key),key);
  await expect(page.locator('#simulationStudyRecommendations')).toBeVisible();
  await expect(page.locator('#simulationStudyRecommendations [data-sim-study-map]').first()).toBeVisible();
  await page.locator('#simulationStudyRecommendations [data-sim-study-map]').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
});

test('busca indexa conteúdo interno dos tópicos e abre no tópico',async({page})=>{
  const pick=await page.evaluate(()=>{for(const item of state.searchIndex.items||[]){if(!item.content||item.content.length<80)continue;const base=normalizeSearchText([item.title,item.keywords].join(' '));const candidates=String(item.content).match(/[A-Za-zÀ-ÿ]{8,}/g)||[];const word=candidates.find(value=>!base.includes(normalizeSearchText(value)));if(word)return{word,mapKey:item.mapKey,topicId:item.topicId}}return null});
  expect(pick).not.toBeNull();
  const count=await page.evaluate(word=>globalSearchResults(word).topics.length,pick.word);
  expect(count).toBeGreaterThan(0);
  await page.evaluate(({mapKey,topicId})=>openMap(mapKey,{topicId}),pick);
  await expect(page.locator('#readerFrame')).toHaveAttribute('src',/topic=/);
  const frame=page.frameLocator('#readerFrame');
  await expect(frame.locator('html')).toHaveAttribute('data-reader-enhanced','1',{timeout:10000});
});

test('linguagem visual retangular remove pills dos controles',async({page})=>{
  await page.goto('/#course/porto-alegre');
  await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);
  const radii=await page.evaluate(()=>{
    const radius=selector=>getComputedStyle(document.querySelector(selector)).borderRadius;
    return{
      situation:radius('.course-study-filter'),
      category:radius('.category-btn'),
      search:radius('.course-search-box'),
      primary:radius('.course-primary-actions .secondary'),
      mapCard:radius('.map-card'),
      progressTrack:radius('.progress-track')
    };
  });
  expect(radii.situation).toBe('5px');
  expect(radii.category).toBe('5px');
  expect(radii.search).toBe('9px');
  expect(radii.primary).toBe('7px');
  expect(radii.mapCard).toBe('12px');
  expect(radii.progressTrack).toBe('999px');
});

test('capas personalizadas usam cache local antes da rede',async({page})=>{
  const result=await page.evaluate(async()=>{
    const map=combinedMaps()[0],key=map._key||mapKey(map),path='e2e/covers/capa-'+Date.now()+'.webp';
    const savedSession=StudyCloud.session,savedRead=StudyCloud.readCachedBlob,savedDownload=StudyCloud.downloadBlobCached;
    const savedOverrides=state.coverOverrides,savedOwner=state.coverOwner;
    let cacheReads=0,networkReads=0;
    try{
      StudyCloud.session=()=>({user:{id:'e2e-cover'}});
      StudyCloud.readCachedBlob=async()=>{cacheReads++;return new Blob(['cover'],{type:'image/webp'})};
      StudyCloud.downloadBlobCached=async()=>{networkReads++;return null};
      state.coverOwner='e2e-cover';
      state.coverOverrides={[key]:{path,updatedAt:new Date().toISOString()}};
      const changed=await hydrateCustomCovers({cacheOnly:true,refresh:false});
      const src=mapCover(map),html=mapCard(map);
      return{cacheReads,networkReads,changed,blob:src.startsWith('blob:'),eager:html.includes('loading="eager"')};
    }finally{
      revokeCoverObjectUrl(key);
      state.coverOverrides=savedOverrides;
      state.coverOwner=savedOwner;
      StudyCloud.session=savedSession;
      StudyCloud.readCachedBlob=savedRead;
      StudyCloud.downloadBlobCached=savedDownload;
    }
  });
  expect(result.cacheReads).toBe(1);
  expect(result.networkReads).toBe(0);
  expect(result.changed).toBe(true);
  expect(result.blob).toBe(true);
  expect(result.eager).toBe(true);
});

test('categorias de conteúdo suportam editais variados',async({page})=>{
  const result=await page.evaluate(()=>{
    const synthetic=[
      {category:'Urbanismo e Habitação'},
      {category:'Informática'},
      {category:'Raciocínio Lógico e Matemática'},
      {category:'Categoria Especial do Edital'},
      {category:'Português'},
      {category:'Outros'}
    ];
    const importSelect=document.querySelector('#importCategory');
    populateMapCategorySelect(importSelect,'Informática');
    return{
      catalog:[...MAP_CATEGORY_CATALOG],
      ordered:mapCategoriesFor(synthetic),
      importValues:[...importSelect.options].map(option=>option.value),
      selected:importSelect.value,
      custom:mapCategoryOptions('Categoria Nova').includes('Categoria Nova')
    };
  });
  expect(result.catalog).toContain('Raciocínio Lógico e Matemática');
  expect(result.catalog).toContain('Informática');
  expect(result.catalog).toContain('Conhecimentos Gerais e Atualidades');
  expect(result.catalog).toContain('Projeto, Representação e BIM');
  expect(result.catalog).toContain('Obras, Gestão e Orçamento');
  expect(result.catalog).toContain('Instalações e Sistemas Prediais');
  expect(result.catalog).toContain('Estruturas e Materiais');
  expect(result.catalog).toContain('Meio Ambiente e Sustentabilidade');
  expect(result.ordered.slice(0,3)).toEqual(['Português','Raciocínio Lógico e Matemática','Informática']);
  expect(result.ordered.at(-1)).toBe('Outros');
  expect(result.importValues).toContain('Patrimônio e Restauro');
  expect(result.selected).toBe('Informática');
  expect(result.custom).toBe(true);
});

test('curso atual continua mostrando apenas categorias realmente usadas',async({page})=>{
  await page.goto('/#course/porto-alegre');
  const labels=await page.locator('#categoryRow [data-cat]').allTextContents();
  expect(labels).toEqual(['Todos','Legislação e Administração','Português','Arquitetura e Tecnologia','Urbanismo e Habitação']);
  expect(labels).not.toContain('Informática');
});

test('filtro do curso não exibe bloco escuro lateral',async({page})=>{
  await page.goto('/#course/porto-alegre');
  await expect(page.locator('.course-study-filter-wrap')).toBeVisible();
  const pseudo=await page.locator('.course-study-filter-wrap').evaluate(el=>{
    const style=getComputedStyle(el,'::after');
    return{content:style.content,display:style.display,backgroundImage:style.backgroundImage};
  });
  expect(['none','normal','']).toContain(pseudo.content.replaceAll('"',''));
  expect(pseudo.display).toBe('none');
  expect(pseudo.backgroundImage).toBe('none');
});

test('card de simulado usa hierarquia visual mais limpa',async({page})=>{
  await page.goto('/#simulations');
  const card=page.locator('.simulation-card').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.simulation-meta-item')).toHaveCount(3);
  await expect(card.locator('.simulation-source')).toBeVisible();
  const styles=await card.evaluate(el=>{
    const footer=el.querySelector('.simulation-card-footer');
    const meta=el.querySelector('.simulation-meta-item');
    const title=el.querySelector('h3');
    const source=el.querySelector('.simulation-source');
    const pseudo=getComputedStyle(source,'::before');
    return{
      footerBorder:getComputedStyle(footer).borderTopWidth,
      footerPadding:getComputedStyle(footer).paddingTop,
      metaRadius:getComputedStyle(meta).borderRadius,
      titleMargin:getComputedStyle(title).marginTop,
      sourceDot:pseudo.width
    };
  });
  expect(styles.footerBorder).toBe('0px');
  expect(styles.footerPadding).toBe('0px');
  expect(styles.metaRadius).toBe('5px');
  expect(styles.titleMargin).toBe('14px');
  expect(styles.sourceDot).toBe('5px');
});

test('cards da biblioteca de cursos usam nova hierarquia',async({page})=>{
  await page.goto('/#courses');
  const card=page.locator('#coursesGrid .course-card').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.course-icon')).toHaveCount(0);
  await expect(card.locator('.course-card-code')).toBeVisible();
  await expect(card.locator('.course-card-role')).toBeVisible();
  await expect(card.locator('.course-card-institution')).toBeVisible();
  await expect(card.locator('.course-progress-head')).toContainText('concluído');
  await expect(card.locator('.progress-state.pending')).toContainText('PEND');
  await expect(card.locator('.course-exam-info')).toContainText('Prova');
  await expect(card.locator('.course-exam-info small')).toContainText('out');
  await expect(card.locator('.course-edital-btn')).toContainText('Ver edital');
  const styles=await page.locator('#coursesGrid').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns,gap:getComputedStyle(el).gap}));
  expect(styles.columns).not.toBe('none');
  expect(styles.gap).toBe('14px');
});

test('rodapé dos concursos usa somente atividade e ação de entrada',async({page})=>{
  await page.goto('/#courses');
  const card=page.locator('#coursesGrid .course-card').first();
  await expect(card.locator('.course-footer')).toBeVisible();
  await expect(card.locator('.course-last-activity-card')).toContainText(/atividade|Ainda sem atividade/);
  await expect(card.locator('.course-footer .enter')).toContainText('Entrar');
});

test('configurações usa novo layout compacto',async({page})=>{
  await page.goto('/#settings');
  await expect(page.locator('.settings-layout-v3')).toBeVisible();
  await expect(page.locator('.simulations-shortcut')).toHaveCount(0);
  await expect(page.locator('.settings-full-panel')).toBeVisible();
  await expect(page.locator('.settings-diagnostic-disclosure')).toContainText('Diagnóstico e dispositivos');
  await page.locator('.settings-diagnostic-disclosure').evaluate(el=>el.open=true);
  await expect(page.locator('#cloudHealthBtn')).toBeVisible();
  await expect(page.locator('#deviceProbeCreate')).toBeVisible();
  const layout=await page.locator('.settings-layout-v3').evaluate(el=>({display:getComputedStyle(el).display,columns:getComputedStyle(el).gridTemplateColumns,width:innerWidth}));
  expect(layout.display).toBe('grid');
  if(layout.width>1180)expect(layout.columns.split(' ').length).toBeGreaterThanOrEqual(2);
  else expect(layout.columns).not.toBe('none');
});

test('pontos de restauração mostram três itens antes de expandir',async({page})=>{
  await page.goto('/#settings');
  await page.evaluate(async()=>{
    for(let i=0;i<5;i++)await createRestorePoint('e2e-settings','Ponto visual '+i);
    restorePointsExpanded=false;
    await renderRestorePoints();
  });
  await expect(page.locator('#restorePointsList .restore-point-item')).toHaveCount(3);
  await expect(page.locator('[data-toggle-restore-points]')).toContainText('Ver todos');
  await page.locator('[data-toggle-restore-points]').click();
  await expect(page.locator('#restorePointsList .restore-point-item')).toHaveCount(5);
  await expect(page.locator('[data-toggle-restore-points]')).toContainText('Mostrar menos');
});

test('atualizações e diagnóstico ficam compactos',async({page})=>{
  await page.goto('/#settings');
  await expect(page.locator('.app-update-summary')).toContainText('V15.6.1');
  await expect(page.locator('#appDiagnosticGrid')).toBeVisible();
  const columns=await page.locator('#appDiagnosticGrid').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  expect(columns).not.toBe('none');
  await expect(page.locator('.settings-backup-head')).toBeVisible();
});

test('home consolidada prioriza o estudo diário',async({page})=>{
  await page.goto('/#home');
  await page.evaluate(()=>{const map=combinedMaps()[0];localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));renderHome()});
  await expect(page.locator('[data-view="home"]')).toHaveClass(/home-returning/);
  await expect(page.locator('#homeReviewSection')).toBeVisible();
  await expect(page.locator('#homeReviewSection #homeStudyPlan .study-plan-item').first()).toBeVisible();
  await expect(page.locator('[data-view="home"] .section').filter({hasText:'Retomar onde parei'})).toBeVisible();
  const values=await page.evaluate(()=>{
    const hero=document.querySelector('[data-view="home"] .hero');
    const plan=document.querySelector('#homeReviewSection');
    const item=document.querySelector('#homeStudyPlan .study-plan-item');
    return{
      width:innerWidth,
      heroHeight:hero.getBoundingClientRect().height,
      planBorder:getComputedStyle(plan).borderTopWidth,
      itemBackground:getComputedStyle(item).backgroundColor
    };
  });
  if(values.width>=900){expect(values.heroHeight).toBeGreaterThanOrEqual(280);expect(values.heroHeight).toBeLessThanOrEqual(345);}
  expect(values.planBorder).toBe('1px');
});

test('simulados recentes usam títulos legíveis e estado',async({page})=>{
  await page.goto('/#home');
  const first=page.locator('#homeSimulations .simulation-recent-item').first();
  await expect(first).toBeVisible();
  const title=(await first.locator('.simulation-recent-copy b').textContent())||'';
  const meta=(await first.locator('.simulation-recent-copy span').textContent())||'';
  expect(title).toMatch(/Simulado/i);
  expect(title).not.toContain('_');
  expect(meta).toMatch(/questões/);
  expect(meta).toMatch(/Não iniciado|Em andamento|Última nota|Concluído/i);
});

test('cursos da home ocupam a largura em grade responsiva',async({page})=>{
  await page.goto('/#home');
  const count=await page.locator('#homeCourses .home-course-card').count();
  expect(count).toBeGreaterThan(0);
  const layout=await page.locator('#homeCourses').evaluate(el=>({width:innerWidth,columns:getComputedStyle(el).gridTemplateColumns}));
  if(layout.width>980&&count>=2)expect(layout.columns.trim().split(/\s+/).length).toBe(2);
  else expect(layout.columns).not.toBe('none');
});

test('autofill tardio de e-mail é removido continuamente da busca',async({page})=>{
  await page.goto('/#home');
  const input=page.locator('#globalSearch');
  await input.evaluate(el=>{el.value='usuario.teste@gmail.com'});
  await page.waitForTimeout(1500);
  await expect(input).toHaveValue('');
  await expect(input).toHaveAttribute('autocomplete','new-password');
});

test('progresso usa cursos recolhíveis e lista compacta',async({page})=>{
  await page.goto('/#progress');
  const course=page.locator('#progressInfo .progress-course').first();
  await expect(course).toHaveClass(/is-collapsed/);
  await expect(course.locator('.progress-map-row')).toHaveCount(0);
  await course.locator('[data-progress-course-toggle]').click();
  await expect(course).toHaveClass(/is-expanded/);
  const visible=await course.locator('.progress-map-row').count();
  expect(visible).toBeGreaterThan(0);
  expect(visible).toBeLessThanOrEqual(6);
  const more=course.locator('[data-progress-show-all]');
  if(await more.count()){
    await expect(more).toContainText('Mostrar todos');
    await more.click();
    expect(await course.locator('.progress-map-row').count()).toBeGreaterThan(6);
    await expect(course.locator('[data-progress-show-all]')).toContainText('Mostrar menos');
  }
});

test('mapas não iniciados não repetem barras e estados zerados',async({page})=>{
  await page.goto('/#progress');
  const course=page.locator('#progressInfo .progress-course').first();
  await course.locator('[data-progress-course-toggle]').click();
  const row=course.locator('.progress-map-unstarted').first();
  await expect(row).toBeVisible();
  await expect(row).toContainText(/Não iniciado|Aberto/);
  await expect(row.locator('.progress-map-bar')).toHaveCount(0);
  await expect(row.locator('.progress-map-states')).toHaveCount(0);
});

test('progresso integra filtros e ordenação no painel geral',async({page})=>{
  await page.goto('/#progress');
  const panel=page.locator('#progressGlobalPanel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('#progressFilters')).toBeVisible();
  await expect(panel.locator('#progressSort')).toBeVisible();
  await expect(page.locator('.progress-filter-shell')).toHaveCount(0);
  await panel.locator('#progressSort').selectOption('alpha');
  const stored=await page.evaluate(()=>localStorage.getItem('studyapp.progressSort'));
  expect(stored).toBe('alpha');
});

test('indicadores de progresso formam uma faixa compacta no desktop',async({page})=>{
  await page.goto('/#progress');
  await expect(page.locator('#progressMetrics .metric')).toHaveCount(6);
  const layout=await page.locator('#progressMetrics').evaluate(el=>({width:innerWidth,columns:getComputedStyle(el).gridTemplateColumns,height:el.getBoundingClientRect().height}));
  if(layout.width>=1180){
    expect(layout.columns.trim().split(/\s+/).length).toBe(6);
    expect(layout.height).toBeLessThan(100);
  }
});

test('hero da home usa a nova arte oficial sem cobrir a ilustração',async({page})=>{
  await page.goto('/#home');
  await page.evaluate(()=>{const map=combinedMaps()[0];localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));renderHome()});
  const hero=page.locator('[data-view="home"] .hero');
  await expect(hero).toBeVisible();
  const layout=await hero.evaluate(el=>{
    const style=getComputedStyle(el);
    const stats=el.querySelector('.hero-stats').getBoundingClientRect();
    const copy=el.querySelector('.hero-copy').getBoundingClientRect();
    const box=el.getBoundingClientRect();
    return{
      bg:style.backgroundImage,
      height:box.height,
      statsRight:stats.right-box.left,
      copyRight:copy.right-box.left,
      heroWidth:box.width,bgSize:style.backgroundSize
    };
  });
  expect(layout.bg).toContain('home-hero-panel-hq.webp');
  if(await page.evaluate(()=>innerWidth>=900)){
    expect(layout.height).toBeGreaterThanOrEqual(280);
    expect(layout.height).toBeLessThanOrEqual(345);
    expect(layout.statsRight).toBeLessThan(layout.heroWidth*.58);
    expect(layout.copyRight).toBeLessThan(layout.heroWidth*.60);expect(layout.bgSize).toBe('cover');
  }
});

test('hero HQ mantém arquivo com qualidade suficiente',async({page})=>{
  await page.goto('/#home');
  const result=await page.evaluate(async()=>{
    const response=await fetch('./assets/home-hero-panel-hq.webp?v=15.6.1',{cache:'no-store'});
    const blob=await response.blob();
    const img=new Image();
    const loaded=new Promise((resolve,reject)=>{img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});img.onerror=reject});
    img.src=URL.createObjectURL(blob);
    const dimensions=await loaded;
    URL.revokeObjectURL(img.src);
    return{ok:response.ok,size:blob.size,type:blob.type,...dimensions};
  });
  expect(result.ok).toBe(true);
  expect(result.size).toBeGreaterThan(300000);
  expect(result.width).toBeGreaterThanOrEqual(1500);
  expect(result.height).toBeGreaterThanOrEqual(640);
  expect(result.type).toContain('image/webp');
});


test('iPad paisagem usa densidade otimizada da home e do leitor',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação específica do layout iPad.');
  await page.setViewportSize({width:1194,height:834});
  await page.goto('/#home');
  await page.evaluate(()=>{
    const map=combinedMaps()[0];
    localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));
    renderHome();
  });
  const home=await page.evaluate(()=>{
    const hero=document.querySelector('[data-view="home"] .hero');
    const stats=document.querySelector('#homeStats');
    const topbar=document.querySelector('.topbar');
    const style=getComputedStyle(hero);
    return{
      isIpad:document.documentElement.classList.contains('is-ipad'),
      heroHeight:hero.getBoundingClientRect().height,
      statCount:stats.children.length,
      statColumns:getComputedStyle(stats).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
      topbarHeight:topbar.getBoundingClientRect().height,
      searchHeight:document.querySelector('.search').getBoundingClientRect().height,
      syncHeight:document.querySelector('#syncTop').getBoundingClientRect().height,
      backgroundSize:style.backgroundSize
    };
  });
  expect.soft(home.isIpad,'classe is-ipad deve estar ativa').toBe(true);
  expect.soft(home.heroHeight,'hero deve permanecer compacto no iPad landscape').toBeLessThanOrEqual(280);
  expect.soft(home.statCount,'home deve renderizar cinco indicadores').toBe(5);
  expect.soft(home.statColumns,'cinco indicadores devem permanecer em uma linha').toBe(5);
  expect.soft(home.searchHeight,'busca deve permanecer compacta').toBeLessThanOrEqual(40);
  expect.soft(home.syncHeight,'Sincronizar deve preservar alvo touch de 44px').toBeGreaterThanOrEqual(44);
  expect.soft(home.topbarHeight,'topbar deve caber em até 58px sem reduzir o alvo touch').toBeLessThanOrEqual(58);
  expect.soft(home.backgroundSize,'hero deve preservar enquadramento full-cover').toBe('cover');

  await page.locator('#homeCourses [data-course="porto-alegre"]').click();
  const card=page.locator('#courseMaps .map-card.has-cover').first();
  await expect(card).toBeVisible();
  const controls=await card.evaluate(el=>({
    favorite:el.querySelector('.fav')?.getBoundingClientRect().width||0,
    menu:el.querySelector('.map-admin-btn')?.getBoundingClientRect().width||0
  }));
  expect.soft(controls.favorite,'favorito visual deve ficar compacto').toBeLessThanOrEqual(31);
  expect.soft(controls.menu,'menu visual deve ficar compacto').toBeLessThanOrEqual(31);

  await card.click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  const reader=await page.evaluate(()=>({
    barHeight:document.querySelector('.readerbar').getBoundingClientRect().height,
    titleSize:parseFloat(getComputedStyle(document.querySelector('#readerTitle')).fontSize),
    moreWidth:document.querySelector('#readerMoreBtn').getBoundingClientRect().width
  }));
  expect.soft(reader.barHeight,'readerbar deve permanecer compacta').toBeLessThanOrEqual(54);
  expect.soft(reader.titleSize,'título do leitor deve continuar legível').toBeGreaterThanOrEqual(13);
  expect.soft(reader.moreWidth,'botão Mais deve ser visualmente compacto').toBeLessThanOrEqual(36);
});


test('iPad mostra Calendário na barra inferior e não mostra Estudar ocioso',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação específica do app no iPad.');
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/#home');
  const calendar=page.locator('.bottom-nav [data-nav="agenda"]');
  await expect(calendar).toBeVisible();
  await expect(calendar).toContainText('Calendário');
  await expect(page.locator('.bottom-nav [data-nav]')).toHaveCount(7);
  await expect(page.locator('#studyTimerFloat')).toBeHidden();
  await expect(page.locator('#studyTimerFloat')).not.toContainText('Estudar');
  await calendar.click();
  await expect(page.locator('[data-view="agenda"]')).toHaveClass(/active/);
  await expect(calendar).toHaveClass(/active/);
});

test('iPad nunca recebe o Menu exclusivo de smartphone',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva de tablet.');
  for(const size of [{width:820,height:1180},{width:640,height:900}]){
    await page.setViewportSize(size);
    await page.goto('/#settings');
    await page.waitForTimeout(80);
    await expect(page.locator('#mobileMenuBtn')).toHaveCount(0);
    await expect(page.locator('#mobileMenuLayer')).toHaveCount(0);
    await expect(page.locator('.bottom-nav .mobile-menu-trigger')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveClass(/is-phone-layout/);
  }
});

test('agenda de estudos renderiza calendário e troca de modos',async({page})=>{
  await page.goto('/#agenda');
  await expect(page.locator('[data-view="agenda"]')).toHaveClass(/active/);
  await expect(page.locator('#agendaCalendarGrid')).toBeVisible();
  await expect(page.locator('.agenda-day')).toHaveCount(42);
  await page.locator('[data-agenda-mode="week"]').click();
  await expect(page.locator('.agenda-week-card')).toHaveCount(7);
  await page.locator('[data-agenda-mode="today"]').click();
  await expect(page.locator('.agenda-today-card')).toBeVisible();
});

test('agenda permite remover eventos manuais com confirmação',async({page})=>{
  await page.goto('/#agenda');
  const id=await page.evaluate(()=>{const d=new Date(),pad=n=>String(n).padStart(2,'0'),date=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),row=StudyDashboard.addAgenda({date,title:'Evento E2E removível',kind:'study',minutes:25});StudyDashboard.renderAgenda();return row.id});
  const remove=page.locator('[data-agenda-delete="'+id+'"]');
  await expect(remove).toBeVisible();
  await expect(remove).toContainText('Remover');
  await remove.click();
  await expect(page.locator('#confirmModal')).toHaveClass(/open/);
  await expect(page.locator('#confirmText')).toContainText('Evento E2E removível');
  await page.locator('#confirmAccept').click();
  await expect(page.locator('[data-agenda-delete="'+id+'"]')).toHaveCount(0);
  expect(await page.evaluate(id=>!!StudyDashboard.exportData().agenda.find(item=>item.id===id)?.deleted,id)).toBe(true);
});

test('agenda permite remover sessões concluídas e desconta o tempo efetivo',async({page})=>{
  await page.goto('/#agenda');
  const setup=await page.evaluate(()=>{const map=combinedMaps()[0],key=map._key||mapKey(map),id='session-e2e-remove-'+Date.now(),startedAt=new Date().toISOString(),before=StudyTime.today();StudyTime.add(key,5,new Date(startedAt));const data=StudyDashboard.exportData();data.sessions.push({id,mapKey:key,courseId:map.courseId||'',label:'Pomodoro E2E removível',agendaId:'',mode:'pomodoro',plannedSeconds:1500,durationSeconds:5,startedAt,endedAt:startedAt,createdAt:startedAt,updatedAt:startedAt,startProgress:null});StudyDashboard.importData(data,{merge:false,silent:true});StudyDashboard.renderAgenda();return{id,key,before,afterAdd:StudyTime.today()}});
  expect(setup.afterAdd-setup.before).toBeGreaterThanOrEqual(5);
  const remove=page.locator('[data-session-delete="'+setup.id+'"]');
  await expect(remove).toBeVisible();
  await expect(remove).toContainText('Remover');
  await remove.click();
  await expect(page.locator('#confirmModal')).toHaveClass(/open/);
  await expect(page.locator('#confirmText')).toContainText('Pomodoro E2E removível');
  await page.locator('#confirmAccept').click();
  await expect(page.locator('[data-session-delete="'+setup.id+'"]')).toHaveCount(0);
  const result=await page.evaluate(({id,key})=>({deleted:!!StudyDashboard.exportData().sessions.find(item=>item.id===id)?.deleted,today:StudyTime.today(),map:StudyTime.mapSeconds(key)}),setup);
  expect(result.deleted).toBe(true);
  expect(result.today).toBe(setup.before);
});

test('timer flutuante inicia pausa retoma e finaliza sessão',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Cobertura funcional única do timer.');
  const result=await page.evaluate(async()=>{
    const map=combinedMaps()[0];
    StudyDashboard.start({map,mode:'free',label:'Teste E2E'});
    await new Promise(resolve=>setTimeout(resolve,1100));
    StudyDashboard.pause();
    const paused=StudyDashboard.elapsed();
    StudyDashboard.resume();
    await new Promise(resolve=>setTimeout(resolve,1100));
    StudyDashboard.finish({silent:true});
    const data=StudyDashboard.exportData();
    return{paused,active:StudyDashboard.active(),last:data.sessions[data.sessions.length-1]};
  });
  expect(result.paused).toBeGreaterThanOrEqual(1);
  expect(result.active).toBeNull();
  expect(result.last.durationSeconds).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#studyTimerFloat')).toHaveClass(/is-idle/);
  await expect(page.locator('#studyTimerFloat')).toBeHidden();
  await expect(page.locator('#studyTimerFloat')).not.toContainText('Estudar');
});

test('metas e analytics da central de estudo ficam disponíveis',async({page})=>{
  await page.goto('/#settings');
  await expect(page.locator('#studySettingsPanel')).toBeVisible();
  const form=page.locator('#studyGoalsForm');
  await form.locator('[name="dailyMinutes"]').fill('90');
  await form.locator('[name="weeklyMinutes"]').fill('480');
  await form.locator('button[type="submit"]').click();
  const goals=await page.evaluate(()=>StudyDashboard.goals());
  expect(goals.dailyMinutes).toBe(90);
  expect(goals.weeklyMinutes).toBe(480);
  await page.goto('/#progress');
  await expect(page.locator('#studyAnalyticsPanel')).toBeVisible();
  await expect(page.locator('.study-heatmap i')).toHaveCount(84);
});

test('captura rápida de dúvida salva a anotação do mapa',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Cobertura funcional única da captura rápida.');
  await page.goto('/#home');
  await page.locator('#homeCourses [data-course="porto-alegre"]').click();
  await page.locator('#courseMaps [data-map]').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  await page.locator('#readerDoubtQuick').click();
  await page.locator('#studyDoubtText').fill('Dúvida de teste automatizado');
  await page.locator('[data-doubt-save]').click();
  const count=await page.evaluate(()=>StudyDashboard.exportData().doubts.filter(item=>!item.deleted).length);
  expect(count).toBeGreaterThan(0);
});

test('rota agenda sobrevive a recarregamento',async({page})=>{
  await page.goto('/#agenda');
  await page.reload();
  await expect(page.locator('[data-view="agenda"]')).toHaveClass(/active/);
  expect(page.url()).toContain('#agenda');
});


test('motor de prioridade e matriz do edital ficam disponíveis',async({page})=>{
  await page.goto('/#home');
  const priority=await page.evaluate(()=>StudyPlanner.priorityRows().slice(0,3).map(row=>({key:row.key,score:row.score,reasons:row.reasons})));
  expect(priority.length).toBeGreaterThan(0);
  expect(priority[0].score).toBeGreaterThanOrEqual(0);
  await page.goto('/#matrix');
  await expect(page.locator('[data-view="matrix"]')).toHaveClass(/active/);
  await expect(page.locator('#matrixSummary')).toBeVisible();
  await expect(page.locator('.matrix-map')).toHaveCount(14);
});

test('command palette oferece ações rápidas mesmo sem texto',async({page})=>{
  await page.goto('/#home');
  await page.locator('#globalSearch').focus();
  await expect(page.locator('#globalSearchPanel')).toBeVisible();
  await expect(page.locator('#globalSearchPanel')).toContainText('Matriz do edital');
  await expect(page.locator('#globalSearchPanel')).toContainText('Caderno de erros');
});

test('tenho 30 minutos gera sequência automática',async({page})=>{
  await page.goto('/#home');
  await page.locator('[data-time-now="30"]').click();
  await expect(page.locator('#studyTimePlanModal')).toBeVisible();
  await expect(page.locator('#studyTimePlanModal .planner-sequence article').first()).toBeVisible();
});

test('agenda recorrente cria série semanal e replaneja atraso',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Cobertura funcional única de recorrência/replanejamento.');
  await page.goto('/#agenda');
  const form=page.locator('#agendaQuickForm');
  await form.locator('[name="date"]').fill('2026-10-01');
  await form.locator('[name="title"]').fill('Sessão recorrente E2E');
  await form.locator('[name="minutes"]').fill('30');
  await form.locator('[name="recurrence"]').selectOption('weekly');
  await form.locator('button[type="submit"]').click();
  const recurring=await page.evaluate(()=>StudyDashboard.exportData().agenda.filter(item=>item.title==='Sessão recorrente E2E'&&!item.deleted).length);
  expect(recurring).toBe(8);
  await page.evaluate(()=>StudyDashboard.addAgenda({date:'2026-09-29',title:'Atraso E2E',kind:'study',minutes:20}));
  const moved=await page.evaluate(()=>StudyPlanner.replanWeek('balanced').moved);
  expect(moved).toBeGreaterThanOrEqual(1);
});

test('caderno de erros recebe detalhes do simulado',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Cobertura funcional única do caderno de erros.');
  await page.goto('/#simulations');
  const saved=await page.evaluate(()=>{
    const sim=combinedSimulations()[0];
    state.simulationReaderKey=sim._key||simulationKey(sim);
    recordSimulationResult({score:80,correct:48,wrong:12,blank:0,total:60,finishedAt:new Date().toISOString(),sections:{'Conhecimentos Específicos':{correct:30,total:40}},mistakes:[{number:41,section:'Conhecimentos Específicos',topic:'Acessibilidade',stem:'Questão de acessibilidade para teste',userAnswer:'A',answer:'C',difficulty:'Média'}]});
    return StudyPlanner.errorGroups();
  });
  expect(saved.length).toBeGreaterThan(0);
  await page.goto('/#errors');
  await expect(page.locator('[data-view="errors"]')).toHaveClass(/active/);
  await expect(page.locator('#errorNotebookList')).toContainText('Acessibilidade');
});

test('revisão espaçada por tópico adapta o intervalo',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Cobertura funcional única da revisão por tópico.');
  await page.goto('/#home');
  const result=await page.evaluate(()=>{
    const map=combinedMaps()[0],key=mapStateStorageKey(map),stateData=readMapState(map),topic=state.searchIndex.items.find(item=>item.mapKey===(map._key||mapKey(map)))?.topicId||'topic-e2e';
    stateData.topicStates={...(stateData.topicStates||{}),[topic]:'difficult'};
    localStorage.setItem(key,JSON.stringify(stateData));
    localStorage.setItem('studyapp.modified::'+key,new Date(Date.now()-3*86400000).toISOString());
    const row=StudyPlanner.topicReviews().find(item=>item.mapKey===(map._key||mapKey(map))&&String(item.topicId)===String(topic));
    const first=StudyPlanner.rateTopic(row.id,'wrong');
    const second=StudyPlanner.rateTopic(row.id,'easy');
    return{first:first.intervalDays,second:second.intervalDays,state:readMapState(map).topicStates[topic]};
  });
  expect(result.first).toBe(1);
  expect(result.second).toBeGreaterThanOrEqual(15);
  expect(result.state).toBe('done');
});

test('finalizar sessão abre resumo inteligente',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Cobertura funcional única do resumo de sessão.');
  await page.goto('/#home');
  await page.evaluate(async()=>{
    const map=combinedMaps()[0];
    StudyDashboard.start({map,mode:'free',label:'Resumo E2E'});
    await new Promise(resolve=>setTimeout(resolve,1050));
    StudyDashboard.finish({silent:true});
  });
  await expect(page.locator('#sessionSummaryModal')).toBeVisible();
  await expect(page.locator('#sessionSummaryModal')).toContainText('Sessão concluída');
});

test('resumo semanal e previsão usam dados do progresso',async({page})=>{
  await page.goto('/#progress');
  const data=await page.evaluate(()=>({week:StudyPlanner.weeklySnapshot(),forecast:StudyPlanner.forecast('porto-alegre',120)}));
  expect(data.week.weekKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(data.forecast.total).toBeGreaterThan(0);
  expect(data.forecast.dailyMinutes).toBe(120);
  await page.locator('[data-weekly-review]').click();
  await expect(page.locator('#weeklyReviewModal')).toBeVisible();
});


test('Home usa CTA Começar agora no card de prioridade',async({page})=>{
  await page.goto('/#home');
  const cta=page.locator('[data-priority-open]').first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveText('Começar agora');
  await expect(page.locator('.priority-now-card')).not.toContainText(/^Estudar$/);
});

test('Agenda prioriza modos e recolhe ações secundárias no menu',async({page})=>{
  await page.goto('/#agenda');
  await expect(page.locator('.study-agenda-modes')).toBeVisible();
  await expect(page.locator('.study-agenda-modes button')).toHaveCount(3);
  const menu=page.locator('.agenda-more');
  await expect(menu).toBeVisible();
  await expect(menu).not.toHaveAttribute('open');
  await menu.locator('summary').click();
  await expect(menu).toHaveAttribute('open','');
  await expect(menu.locator('[data-agenda-replan]')).toBeVisible();
  await expect(menu.locator('[data-agenda-export]')).toBeVisible();
});

test('Progresso mostra quatro decisões e mantém prioridades recolhidas',async({page})=>{
  await page.goto('/#progress');
  const actions=page.locator('#studyIntelligencePanel .intelligence-primary-actions>article');
  await expect(actions).toHaveCount(4);
  const details=page.locator('#studyIntelligencePanel .priority-details');
  await expect(details).toBeVisible();
  await expect(details).not.toHaveAttribute('open');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open','');
  await expect(details.locator('.priority-engine-grid>article')).toHaveCount(3);
});

test('iPad retrato paisagem e Split View permanecem sem overflow',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação específica do polimento responsivo no iPad.');
  const scenarios=[
    {width:820,height:1180,route:'#home'},
    {width:1194,height:834,route:'#agenda'},
    {width:640,height:900,route:'#progress'}
  ];
  for(const scenario of scenarios){
    await page.setViewportSize({width:scenario.width,height:scenario.height});
    await page.goto('/'+scenario.route);
    await page.waitForTimeout(100);
    const layout=await page.evaluate(()=>({
      width:innerWidth,
      scrollWidth:document.documentElement.scrollWidth,
      isIpad:document.documentElement.classList.contains('is-ipad')
    }));
    expect.soft(layout.isIpad).toBe(true);
    expect.soft(layout.scrollWidth,'layout não deve criar overflow horizontal').toBeLessThanOrEqual(layout.width+2);
    if(scenario.width<=820){
      await expect(page.locator('.bottom-nav')).toBeVisible();
    }else{
      await expect(page.locator('.side')).toBeVisible();
      await expect(page.locator('.bottom-nav')).toBeHidden();
    }
  }
});


test('smartphone 430 390 e 360 mantém layout mobile-first sem overflow',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação de smartphone executada no Chromium desktop com viewport móvel.');
  for(const width of [430,390,360]){
    await page.setViewportSize({width,height:844});
    await page.goto('/#home');
    await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
    await page.waitForTimeout(80);
    const layout=await page.evaluate(()=>({
      width:innerWidth,
      scrollWidth:document.documentElement.scrollWidth,
      heroHeight:document.querySelector('[data-view="home"] .hero')?.getBoundingClientRect().height||0,
      visibleNav:[...document.querySelectorAll('.bottom-nav button')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.dataset.nav||el.dataset.mobileMenu||'')
    }));
    expect.soft(layout.scrollWidth,'sem overflow horizontal em '+width+'px').toBeLessThanOrEqual(width+2);
    expect.soft(layout.heroHeight,'hero compacto em '+width+'px').toBeLessThanOrEqual(320);
    expect.soft(layout.visibleNav,'bottom-nav com cinco itens em '+width+'px').toEqual(['home','courses','maps','progress','menu']);
  }
});

test('smartphone topbar compacta e recolhe durante a rolagem',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:700});
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  const syncVisual=await page.locator('#syncTop').evaluate(el=>({icons:el.querySelectorAll('.ui-icon').length,pseudo:getComputedStyle(el,'::before').content}));
  expect(syncVisual.icons).toBe(1);
  expect(['none','normal','""']).toContain(syncVisual.pseudo);
  await page.evaluate(()=>window.scrollTo(0,700));
  await page.waitForTimeout(120);
  await expect(page.locator('html')).toHaveClass(/mobile-topbar-hidden/);
  await page.evaluate(()=>window.scrollTo(0,80));
  await page.waitForTimeout(120);
  await expect(page.locator('html')).not.toHaveClass(/mobile-topbar-hidden/);
});

test('smartphone simplifica curso e revela detalhes sob demanda',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#courses');
  const card=page.locator('#coursesGrid .course-card').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.mobile-course-details')).toBeVisible();
  await expect(card.locator('.course-card-role')).toBeHidden();
  await expect(card.locator('.course-progress-mini')).toBeVisible();
  await expect(card.locator('.course-footer .enter')).toBeVisible();
  await card.locator('.mobile-course-details').click();
  await expect(card).toHaveClass(/mobile-details-open/);
  await expect(card.locator('.course-card-role')).toBeVisible();
});

test('smartphone compacta cards de mapas e preserva alvos touch',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#course/porto-alegre');
  const card=page.locator('#courseMaps .map-card.has-cover').first();
  await expect(card).toBeVisible();
  const size=await card.evaluate(el=>({
    height:el.getBoundingClientRect().height,
    cover:el.querySelector('.map-cover')?.getBoundingClientRect().height||0,
    fav:el.querySelector('.fav')?.getBoundingClientRect().width||0,
    menu:el.querySelector('.map-admin-btn')?.getBoundingClientRect().width||0,
    metaDisplay:getComputedStyle(el.querySelector('.meta')).display
  }));
  expect.soft(size.height).toBeLessThanOrEqual(235);
  expect.soft(size.cover).toBeLessThanOrEqual(90);
  expect.soft(size.fav).toBeGreaterThanOrEqual(44);
  expect.soft(size.menu).toBeGreaterThanOrEqual(44);
  expect.soft(size.metaDisplay).toBe('none');
});

test('smartphone reorganiza Progresso em quatro blocos expansíveis',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#progress');
  await page.waitForTimeout(100);
  const groups=page.locator('[data-view="progress"] .mobile-progress-group');
  await expect(groups).toHaveCount(4);
  await expect(page.locator('[data-mobile-progress-group="summary"]')).toHaveAttribute('open','');
  await expect(page.locator('[data-mobile-progress-group="priority"]')).toHaveAttribute('open','');
  await expect(page.locator('[data-mobile-progress-group="performance"]')).not.toHaveAttribute('open');
  await expect(page.locator('[data-mobile-progress-group="subjects"]')).not.toHaveAttribute('open');
  await page.locator('[data-mobile-progress-group="performance"]>summary').click();
  await expect(page.locator('#studyAnalyticsPanel')).toBeVisible();
});

test('smartphone Agenda abre em Hoje sem calendário redundante e mantém Semana e Mês',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#agenda');
  await expect(page.locator('[data-agenda-mode="today"]')).toHaveClass(/active/);
  await expect(page.locator('[data-view="agenda"]')).toHaveAttribute('data-mobile-agenda-mode','today');
  await expect(page.locator('.study-agenda-calendar')).toBeHidden();
  await expect(page.locator('#agendaDayDetail')).toBeVisible();
  await expect(page.locator('.study-agenda-day-head .kicker')).toHaveText('Hoje');
  await expect(page.locator('#mobileAgendaPlanToggle')).toBeVisible();
  await expect(page.locator('#agendaQuickForm')).toBeHidden();
  const naturalDate=await page.locator('.study-agenda-day-head h3').innerText();
  expect(naturalDate).not.toMatch(/\sDe\s/);
  await page.locator('#mobileAgendaPlanToggle').click();
  await expect(page.locator('#agendaQuickForm')).toBeVisible();
  await page.locator('[data-agenda-mode="week"]').click();
  await expect(page.locator('.study-agenda-calendar')).toBeVisible();
  await expect(page.locator('.agenda-week-card')).toHaveCount(7);
  const weekOverflow=await page.locator('.agenda-week-grid').evaluate(el=>getComputedStyle(el).overflowX);
  expect(['auto','scroll']).toContain(weekOverflow);
  await page.locator('[data-agenda-mode="month"]').click();
  await expect(page.locator('.agenda-day')).toHaveCount(42);
});

test('smartphone Menu abre Agenda Simulados e Configurações em bottom sheet',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  const trigger=page.locator('#mobileMenuBtn');
  await expect(trigger).toBeVisible();
  await expect(trigger).toContainText('Menu');
  await trigger.click();
  const layer=page.locator('#mobileMenuLayer');
  await expect(layer).toBeVisible();
  await expect(layer.locator('[data-mobile-sheet-nav="agenda"]')).toContainText('Agenda');
  await expect(layer.locator('[data-mobile-sheet-nav="simulations"]')).toContainText('Simulados');
  await expect(layer.locator('[data-mobile-sheet-nav="settings"]')).toContainText('Configurações');
  await layer.locator('[data-mobile-sheet-nav="agenda"]').click();
  await expect(page.locator('[data-view="agenda"]')).toHaveClass(/active/);
  await expect(layer).toBeHidden();
});

test('smartphone Menu permanece responsivo após navegação repetida',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  const targets=['agenda','simulations','settings','agenda','simulations','settings'];
  for(const target of targets){
    const trigger=page.locator('#mobileMenuBtn');
    await expect(trigger).toBeVisible();
    await trigger.click();
    const layer=page.locator('#mobileMenuLayer');
    await expect(layer).toBeVisible();
    await layer.locator('[data-mobile-sheet-nav="'+target+'"]').click();
    await expect(page.locator('[data-view="'+target+'"]')).toHaveClass(/active/);
    await expect(layer).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/mobile-menu-open/);
    const overflow=await page.evaluate(()=>document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  }
  await page.locator('.bottom-nav [data-nav="home"]').click();
  await expect(page.locator('[data-view="home"]')).toHaveClass(/active/);
  await expect(page.locator('#mobileMenuBtn')).toBeVisible();
});

test('smartphone Configurações usa accordion exclusivo sem títulos duplicados',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#settings');
  await page.waitForTimeout(120);
  const study=page.locator('#studySettingsPanel');
  const sync=page.locator('.sync-panel');
  const admin=page.locator('.admin-panel');
  await expect(study.locator(':scope > .mobile-settings-toggle')).toBeVisible();
  await expect(study).not.toHaveClass(/mobile-settings-collapsed/);
  await expect(sync).toHaveClass(/mobile-settings-collapsed/);
  await expect(admin).toHaveClass(/mobile-settings-collapsed/);
  await expect(study.locator(':scope > .panel-kicker')).toBeHidden();
  const adminToggle=admin.locator(':scope > .mobile-settings-toggle');
  const h=await adminToggle.evaluate(el=>el.getBoundingClientRect().height);
  expect(h).toBeGreaterThanOrEqual(44);
  await adminToggle.click();
  await expect(admin).not.toHaveClass(/mobile-settings-collapsed/);
  await expect(study).toHaveClass(/mobile-settings-collapsed/);
  const openCount=await page.locator('.mobile-settings-panel:not(.mobile-settings-collapsed)').count();
  expect(openCount).toBe(1);
});

test('smartphone leitor entra em modo imersivo e devolve a navegação ao fechar',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#course/porto-alegre');
  await page.locator('#courseMaps .map-card').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  await expect(page.locator('html')).toHaveClass(/mobile-reader-open/);
  await expect(page.locator('.bottom-nav')).toBeHidden();
  await expect(page.locator('.topbar-wrap')).toBeHidden();
  await page.locator('#readerClose').click();
  await expect(page.locator('html')).not.toHaveClass(/mobile-reader-open/);
  await expect(page.locator('.bottom-nav')).toBeVisible();
});

test('smartphone troca estados de carregamento por skeleton',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  const skeleton=await page.evaluate(()=>{
    const el=document.createElement('div');
    el.className='empty boot-loading';
    el.textContent='Carregando teste…';
    document.querySelector('[data-view="home"]').appendChild(el);
    MobileUX.refresh();
    const style=getComputedStyle(el,'::before');
    return{className:el.className,backgroundImage:style.backgroundImage,minHeight:getComputedStyle(el).minHeight};
  });
  expect(skeleton.className).toContain('mobile-skeleton');
  expect(skeleton.backgroundImage).toContain('linear-gradient');
});


test('iPhone real UX2 compacta Home e transforma simulados em carrossel',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  await page.waitForTimeout(100);
  const data=await page.evaluate(()=>({
    hero:document.querySelector('[data-view="home"] .hero').getBoundingClientRect().height,
    metricVisible:[...document.querySelectorAll('.study-command-metrics>button')].filter(el=>getComputedStyle(el).display!=='none').length,
    simDisplay:getComputedStyle(document.querySelector('.simulation-recent-list')).display,
    simOverflow:getComputedStyle(document.querySelector('.simulation-recent-list')).overflowX,
    navHeight:document.querySelector('.bottom-nav').getBoundingClientRect().height
  }));
  expect(data.hero).toBeLessThanOrEqual(270);
  expect(data.metricVisible).toBe(2);
  expect(data.simDisplay).toBe('flex');
  expect(['auto','scroll']).toContain(data.simOverflow);
  expect(data.navHeight).toBeLessThanOrEqual(60);
  await page.locator('.mobile-study-plan-toggle').click();
  const expanded=await page.locator('.study-command-metrics>button').evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=='none').length);
  expect(expanded).toBeGreaterThanOrEqual(4);
});

test('iPhone real UX2 compacta curso e mostra mapa no primeiro viewport',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#course/porto-alegre');
  await page.waitForTimeout(120);
  const hero=page.locator('[data-view="course"] .course-hero');
  await expect(hero.locator('.mobile-course-actions')).toBeVisible();
  await expect(page.locator('#courseDesc')).toBeHidden();
  await expect(page.locator('.course-study-filter-wrap')).toBeHidden();
  const position=await page.locator('#courseMaps .map-card').first().evaluate(el=>el.getBoundingClientRect().top);
  expect(position).toBeLessThan(844);
  await hero.locator('[data-mobile-course-details]').click();
  await expect(hero).toHaveClass(/mobile-course-expanded/);
  await expect(page.locator('#courseDesc')).toBeVisible();
});

test('iPhone real UX2 leitor usa barra única e move Salvar para Mais',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#course/porto-alegre');
  await page.locator('#courseMaps .map-card').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  await expect(page.locator('#mobileReaderSkeleton')).toHaveCount(1);
  const reader=await page.evaluate(()=>({
    bar:document.querySelector('.readerbar').getBoundingClientRect().height,
    saveDisplay:getComputedStyle(document.querySelector('#readerSave')).display,
    doubtDisplay:getComputedStyle(document.querySelector('#readerDoubtQuick')).display,
    railHeight:document.querySelector('.study-reader-rail')?.getBoundingClientRect().height||0
  }));
  expect(reader.bar).toBeLessThanOrEqual(54);
  expect(reader.saveDisplay).toBe('none');
  expect(reader.doubtDisplay).toBe('none');
  expect(reader.railHeight).toBeLessThanOrEqual(62);
  await expect(page.locator('#mobileReaderRailToggle')).toBeVisible();
  await page.locator('#mobileReaderRailToggle').click();
  await expect(page.locator('#reader')).toHaveClass(/mobile-reader-rail-collapsed/);
  await page.locator('#mobileReaderRailToggle').click();
  await expect(page.locator('#reader')).not.toHaveClass(/mobile-reader-rail-collapsed/);
  await page.locator('#readerMoreBtn').click();
  await expect(page.locator('#mobileReaderSave')).toBeVisible();
});

test('iPhone real UX2 mantém somente quatro KPIs no resumo de Progresso',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#progress');
  await page.waitForTimeout(120);
  const visible=await page.locator('#progressMetrics .metric').evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=='none').length);
  expect(visible).toBe(4);
  const insightLayout=await page.locator('.progress-insights-grid').evaluate(el=>({display:getComputedStyle(el).display,overflow:getComputedStyle(el).overflowX}));
  expect(insightLayout.display).toBe('flex');
  expect(['auto','scroll']).toContain(insightLayout.overflow);
  await expect(page.locator('[data-mobile-progress-group="priority"]>summary')).toBeVisible();
});


test('smartphone compacta também os cards de simulados',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#simulations');
  const card=page.locator('#simulationGrid .simulation-card').first();
  await expect(card).toBeVisible();
  const box=await card.evaluate(el=>({height:el.getBoundingClientRect().height,cover:el.querySelector('.simulation-cover')?.getBoundingClientRect().height||0}));
  expect.soft(box.height).toBeLessThanOrEqual(340);
  expect.soft(box.cover).toBeLessThanOrEqual(112);
});

test('agenda de revisão invalida é regenerada sem atraso absurdo',async({page})=>{
  await page.goto('/#home');
  const result=await page.evaluate(()=>{
    const map=combinedMaps()[0],key=map._key||mapKey(map),schedule=readReviewSchedule();
    schedule[key]={dueAt:'0000-01-01T00:00:00.000Z',reason:'legacy',lastReviewedAt:'',sourceModifiedAt:''};
    writeReviewSchedule(schedule);
    const invalid=reviewScheduleDueTimestamp('0000-01-01T00:00:00.000Z');
    const validFuture=reviewScheduleDueTimestamp(new Date(Date.now()+7*86400000).toISOString());
    const rows=window.StudyPlanner?.priorityRows?.()||[];
    const huge=rows.flatMap(row=>row.reasons||[]).some(reason=>/revisão atrasada \d{4,}d/i.test(reason));
    return{invalid,validFuture,huge,stored:readReviewSchedule()[key]?.dueAt||''};
  });
  expect(result.invalid).toBe(0);
  expect(result.validFuture).toBeGreaterThan(Date.now());
  expect(result.huge).toBe(false);
  expect(result.stored).not.toContain('0000-01-01');
});

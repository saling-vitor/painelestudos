import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const E2E_CATALOG=JSON.parse(fs.readFileSync(new URL('../../data/catalog.json',import.meta.url),'utf8'));
const E2E_RELEASE=JSON.parse(fs.readFileSync(new URL('../../version.json',import.meta.url),'utf8'));
const E2E_APP_VERSION=String(E2E_RELEASE.version||'');
const E2E_APP_VERSION_LABEL=String(E2E_RELEASE.label||('V'+E2E_APP_VERSION));
const E2E_CLOUD_MAP_ROWS=(E2E_CATALOG.maps||[]).map((m,i)=>({
  id:m.id||('e2e-map-'+i),
  user_id:'e2e-user',
  course_id:m.courseId,
  code:m.code,
  title:m.title,
  short_title:m.shortTitle||'',
  version:m.version||'',
  board:m.board||'',
  contest:m.contest||'',
  topics:Number(m.topics||0),
  branches:Number(m.branches||0),
  category:m.category||'Outros',
  accent:m.accent||'auto',
  filename:m.filename||'',
  storage_path:'e2e-user/'+String(m.courseId||'curso')+'/'+String(m.filename||m.code||m.id||('map-'+i)),
  storage_id:m.storageId||'',
  created_at:'2026-09-01T00:00:00.000Z',
  updated_at:'2026-10-01T00:00:00.000Z'
}));
const E2E_CLOUD_MAP_CACHE=E2E_CLOUD_MAP_ROWS.map(m=>({
  id:m.id,courseId:m.course_id,code:m.code,title:m.title,shortTitle:m.short_title,version:m.version,board:m.board,contest:m.contest,
  topics:m.topics,branches:m.branches,category:m.category,accent:m.accent,source:'cloud',storage_path:m.storage_path,filename:m.filename,storageId:m.storage_id
}));
test.beforeEach(async({page})=>{const runtimeErrors=[];page.on('pageerror',error=>runtimeErrors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')runtimeErrors.push(msg.text())});page.runtimeErrors=runtimeErrors;await page.route('https://hapyzjfhbobtaellaejv.supabase.co/**',async route=>{const url=route.request().url();if(url.includes('/auth/v1/user'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'e2e-user',email:'e2e@example.com'})});if(url.includes('/rest/v1/courses'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'porto-alegre',user_id:'e2e-user',title:'DEMHAB Porto Alegre',subtitle:'CP 01 · Arquiteto',city:'Porto Alegre/RS',institution:'Departamento Municipal de Habitação · DEMHAB',board:'FUNDATEC',exam_date:'2026-10-18',status:'active',created_at:'2026-09-01T00:00:00.000Z'}])});if(url.includes('/rest/v1/maps'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(E2E_CLOUD_MAP_ROWS)});return route.fulfill({status:200,contentType:'application/json',body:'[]'})});await page.addInitScript(({maps,version})=>{localStorage.setItem('studyapp.lastSeenVersion',version);if(localStorage.getItem('studyapp.e2eLoggedOut')==='1'){localStorage.removeItem('studyapp.auth');return}const user={id:'e2e-user',email:'e2e@example.com'},session={access_token:'e2e-token',refresh_token:'',expires_at:4102444800,user};localStorage.setItem('studyapp.auth',JSON.stringify(session));localStorage.setItem('studyapp.cloudCatalog::e2e-user',JSON.stringify({courses:[{id:'porto-alegre',title:'DEMHAB Porto Alegre',subtitle:'CP 01 · Arquiteto',city:'Porto Alegre/RS',institution:'Departamento Municipal de Habitação · DEMHAB',board:'FUNDATEC',examDate:'2026-10-18',status:'active',source:'cloud',maps:maps.length}],maps,docs:[],simulations:[],user,savedAt:new Date().toISOString()}))},{maps:E2E_CLOUD_MAP_CACHE,version:E2E_APP_VERSION});await page.goto('/#home');await expect(page.locator('[data-view="home"]')).toHaveClass(/active/);await page.waitForFunction(()=>typeof combinedCourses==='function'&&combinedCourses().length>0);await page.waitForFunction(()=>typeof initialCloudSyncDone==='undefined'||initialCloudSyncDone===true);await page.waitForFunction(()=>typeof state==='undefined'||state.cloudLoading===false)});
test.afterEach(async({page},testInfo)=>{const errors=(page.runtimeErrors||[]).filter(message=>!(testInfo.project.name==='iphone-webkit'&&/version\.json.*access control checks/i.test(message)));expect(errors,errors.join('\n')).toEqual([])});

test('etapa 0 [G] mantém a template sem cursos quando não há conta',async({page})=>{await page.evaluate(()=>{localStorage.setItem('studyapp.e2eLoggedOut','1');localStorage.setItem('studyapp.localCourses',JSON.stringify([{id:'legado-local',title:'Curso local legado'}]));localStorage.removeItem('studyapp.auth')});await page.reload();await page.goto('/#courses');await expect(page.locator('#coursesGrid .course-card')).toHaveCount(0);await expect(page.locator('#coursesGrid')).toContainText('Entre na sua conta para carregar seus concursos.');await page.waitForTimeout(250);const result=await page.evaluate(()=>({courses:combinedCourses().length,maps:combinedMaps().length,search:globalSearchResults('demhab'),legacy:localStorage.getItem('studyapp.localCourses'),cache:localStorage.getItem('studyapp.cloudCatalog::e2e-user')}));expect(result.courses).toBe(0);expect(result.maps).toBe(0);expect(result.search.courses).toHaveLength(0);expect(result.search.maps).toHaveLength(0);expect(result.search.topics).toHaveLength(0);expect(result.legacy).toContain('legado-local');expect(result.cache).toContain('porto-alegre')});

test('etapa 0 [G] logout oculta a biblioteca sem apagar o cache da conta',async({page})=>{expect(await page.evaluate(()=>combinedCourses().length)).toBeGreaterThan(0);const before=await page.evaluate(()=>localStorage.getItem('studyapp.cloudCatalog::e2e-user'));expect(before).toContain('porto-alegre');await page.evaluate(()=>logout());await expect.poll(()=>page.evaluate(()=>combinedCourses().length)).toBe(0);expect(await page.evaluate(()=>combinedMaps().length)).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('studyapp.cloudCatalog::e2e-user'))).toContain('porto-alegre')});
test('etapa 0 [G] curso não herda mapas empacotados quando a nuvem não possui mapas',async({page})=>{
  const result=await page.evaluate(()=>{const saved=state.cloudMaps;state.cloudMaps=[];const count=combinedMaps().length;state.cloudMaps=saved;return count});
  expect(result).toBe(0);
});
test('importação detecta categoria individual pelo HTML',async({page})=>{
  const categories=await page.evaluate(()=>{
    const make=(code,title,body)=>parseMap('<!doctype html><html><head><meta name="study-short-code" content="'+code+'"><meta name="study-display-title" content="'+title+'"></head><body><main><section class="ramo"><h2 class="ramo-title">'+body+'</h2><article class="topic-card"></article></section></main></body></html>',new File(['x'],code+'.html',{type:'text/html'})).category;
    return{port:make('PORT','Língua Portuguesa','Sintaxe, crase e concordância'),uti:make('UTI','Urbanismo, Topografia e Infraestrutura','Mobilidade urbana e drenagem')};
  });
  expect(categories).toEqual({port:'Português',uti:'Infraestrutura e Mobilidade Urbana'});
});
test('navegação principal funciona',async({page},testInfo)=>{
  for(const view of ['courses','maps','simulations','progress','settings','home']){
    const direct=page.locator(`[data-nav="${view}"]:visible`).first();
    if(await direct.count())await direct.click();
    else if(testInfo.project.name==='ipad'&&view==='simulations'){
      await page.locator('[data-nav="settings"]:visible').first().click();
      await expect(page.locator('#tabletMoreShortcuts')).toBeVisible();
      await page.locator('#tabletMoreShortcuts [data-tablet-more-nav="simulations"]').click();
    }else{
      await page.evaluate(target=>nav(target),view);
    }
    await expect(page.locator(`[data-view="${view}"]`)).toHaveClass(/active/);
  }
});
test('curso abre e mantém rota',async({page})=>{const course=page.locator('#homeCourses [data-course="porto-alegre"]');await expect(course).toBeVisible();await course.click();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);await expect(page.locator('#courseTitle')).toContainText('DEMHAB');expect(page.url()).toContain('#course/porto-alegre')});
test('linha da tela Progresso abre mapa',async({page})=>{
  await page.goto('/#progress');
  const toggle=page.locator('#progressInfo [data-progress-course-toggle]').first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  const row=page.locator('#progressInfo [data-progress-row-open]').first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  await page.locator('#readerClose').click();
  await expect(page.locator('#reader')).not.toHaveClass(/open/);
});
test('filtros de progresso não geram erro',async({page})=>{await page.goto('/#progress');const filters=page.locator('[data-progress-filter]'),count=await filters.count();for(let i=0;i<count;i++)await filters.nth(i).click()});
test('simulados renderizam',async({page})=>{await page.goto('/#simulations');await expect(page.locator('#simulationGrid')).not.toBeEmpty()});

test('busca global mostra resultados instantâneos sem navegar',async({page})=>{const input=page.locator('#globalSearch'),panel=page.locator('#globalSearchPanel');await input.fill('demhab');await expect(panel).toBeVisible();await expect(page.locator('[data-view="home"]')).toHaveClass(/active/);await expect(panel.locator('[role="option"]').first()).toBeVisible();await input.press('ArrowDown');await expect(panel.locator('[role="option"]').first()).toHaveAttribute('aria-selected','true');await input.press('Escape');await expect(panel).toBeHidden()});
test('[G] V15.45 aplica ambiente topográfico raster contínuo sem transformar conteúdo em vidro',async({page})=>{
  await expect(page.locator('link[href*="topographic-environment-v15-43.css"]')).toHaveCount(1);
  await expect(page.locator('link[href*="design-system-v15-42.css"]')).toHaveCount(1);
  const visual=await page.evaluate(()=>{
    const bodyBefore=getComputedStyle(document.body,'::before');
    const map=document.querySelector('.map-card');
    const mapStyle=map?getComputedStyle(map):null;
    const side=document.querySelector('.side');
    const sideStyle=side?getComputedStyle(side):null;
    return{
      topoImage:bodyBefore.backgroundImage,
      topoOpacity:parseFloat(bodyBefore.opacity)||0,
      topoRepeat:bodyBefore.backgroundRepeat,
      topoFilter:bodyBefore.filter,
      mapBackdrop:mapStyle?(mapStyle.backdropFilter||mapStyle.webkitBackdropFilter||'none'):'none',
      sideBackdrop:sideStyle?(sideStyle.backdropFilter||sideStyle.webkitBackdropFilter||'none'):'none'
    };
  });
  expect(visual.topoImage).toContain('topographic-lines-v15-48-1.svg');
  expect(visual.topoRepeat).toBe('no-repeat');
  expect(visual.topoFilter).toBe('none');
  expect(visual.topoOpacity).toBeGreaterThan(0);
  expect(visual.mapBackdrop).toBe('none');
  if(await page.locator('.side').isVisible())expect(visual.sideBackdrop).not.toBe('none');
});

test('[G] Liquid Glass segue camada funcional e evita glass-on-glass',async({page},testInfo)=>{
  await expect(page.locator('link[href*="liquid-glass-surfaces-v15-40.css"]')).toHaveCount(1);

  const glass=async locator=>locator.evaluate(el=>{
    const s=getComputedStyle(el);
    const standard=s.backdropFilter||'';
    const prefixed=s.webkitBackdropFilter||'';
    const backdrop=standard&&standard!=='none'?standard:(prefixed||standard||'none');
    return{
      backdrop,
      background:s.backgroundImage,
      backgroundColor:s.backgroundColor,
      filled:(s.backgroundImage!=='none'&&!/^none$/i.test(s.backgroundImage))||!['rgba(0, 0, 0, 0)','transparent'].includes(s.backgroundColor),
      border:parseFloat(s.borderTopWidth)||0,
      borderLeft:parseFloat(s.borderLeftWidth)||0,
      gap:parseFloat(s.gap)||0
    };
  });

  const input=page.locator('#globalSearch');
  const searchPanel=page.locator('#globalSearchPanel');
  await input.fill('demhab');
  await expect(searchPanel).toBeVisible();
  const searchGlass=await glass(searchPanel);
  expect(searchGlass.backdrop).not.toBe('none');
  expect(searchGlass.filled).toBe(true);
  expect(searchGlass.border).toBeGreaterThan(0);
  await input.press('Escape');

  const dock=page.locator('.bottom-nav');
  if(await dock.isVisible()){
    const dockGlass=await glass(dock);
    expect(dockGlass.backdrop).not.toBe('none');
    expect(dockGlass.filled).toBe(true);
    const activeDock=page.locator('.bottom-nav>button.active').first();
    const activeLens=await glass(activeDock);
    expect(activeLens.backdrop).toBe('none');
    expect(activeLens.filled).toBe(true);
  }else{
    const side=page.locator('.side');
    const activeNav=page.locator('.side .nav-btn.active').first();
    await expect(activeNav).toBeVisible();
    const sideGlass=await glass(side);
    const navLens=await glass(activeNav);
    expect(sideGlass.backdrop).not.toBe('none');
    expect(sideGlass.filled).toBe(true);
    // V15.42: sidebar é o material; item ativo é apenas uma lente interna.
    expect(navLens.backdrop).toBe('none');
    expect(navLens.filled).toBe(true);
  }

  if(testInfo.project.name==='desktop-chromium'){
    await page.goto('/#course/porto-alegre');

    const actionGroup=page.locator('.course-primary-actions');
    await expect(actionGroup).toBeVisible();
    const groupGlass=await glass(actionGroup);
    expect(groupGlass.backdrop).not.toBe('none');
    expect(groupGlass.filled).toBe(true);
    expect(groupGlass.border).toBeGreaterThan(0);
    expect(groupGlass.gap).toBe(0);

    const editalLens=await glass(page.locator('#openEdital'));
    const simulationsLens=await glass(page.locator('#courseSimulationsBtn'));
    const moreLens=await glass(page.locator('#courseMoreBtn'));
    expect(editalLens.backdrop).toBe('none');
    expect(simulationsLens.backdrop).toBe('none');
    expect(moreLens.backdrop).toBe('none');
    expect(simulationsLens.borderLeft).toBeGreaterThan(0);
    const moreWrapBorder=await page.locator('.course-more-wrap').evaluate(el=>parseFloat(getComputedStyle(el).borderLeftWidth)||0);
    expect(moreWrapBorder).toBeGreaterThan(0);

    await page.locator('#courseMoreBtn').click();
    const courseMenu=page.locator('#courseMoreMenu');
    await expect(courseMenu).toBeVisible();
    const menuGlass=await glass(courseMenu);
    expect(menuGlass.backdrop).not.toBe('none');
    expect(menuGlass.filled).toBe(true);
    await page.locator('#courseMoreBtn').click();

    const mapMenuButton=page.locator('#courseMaps .map-admin-btn').first();
    if(await mapMenuButton.count()){
      await mapMenuButton.click();
      const mapMenu=page.locator('#courseMaps .map-actions-menu:not([hidden])').first();
      await expect(mapMenu).toBeVisible();
      const mapMenuGlass=await glass(mapMenu);
      expect(mapMenuGlass.backdrop).not.toBe('none');
      expect(mapMenuGlass.filled).toBe(true);
    }

    const activeStudyFilter=page.locator('.course-study-filter.active').first();
    if(await activeStudyFilter.count()){
      const filterGlass=await glass(activeStudyFilter);
      // PASSO 2: filtro ativo é lente interna, sem novo backdrop-filter.
      expect(filterGlass.backdrop).toBe('none');
    }

    await page.goto('/#simulations');
    const customSimSelect=page.locator('.simulation-toolbar .ui-select-trigger').first();
    const simSelect=(await customSimSelect.count())?customSimSelect:page.locator('#simulationCourseFilter');
    await expect(simSelect).toBeVisible();
    const selectGlass=await glass(simSelect);
    // PASSO 2: trigger/select interno usa fill; o popover é que recebe Dense Glass.
    expect(selectGlass.backdrop).toBe('none');
    if(await customSimSelect.count()){
      await customSimSelect.click();
      const selectPopover=page.locator('.ui-select-popover').first();
      await expect(selectPopover).toBeVisible();
      const popoverGlass=await glass(selectPopover);
      expect(popoverGlass.backdrop).not.toBe('none');
      expect(popoverGlass.filled).toBe(true);
      await page.keyboard.press('Escape');
    }
  }

  await page.goto('/#settings');
  await page.evaluate(()=>document.getElementById('confirmModal')?.classList.add('open'));
  const modal=page.locator('#confirmModal .modal-card');
  await expect(modal).toBeVisible();
  const modalGlass=await glass(modal);
  expect(modalGlass.backdrop).not.toBe('none');
  expect(modalGlass.filled).toBe(true);
  await page.evaluate(()=>document.getElementById('confirmModal')?.classList.remove('open'));
});

test('barra sticky do curso aparece após toolbar sair pelo topo',async({page})=>{const course=page.locator('#homeCourses [data-course="porto-alegre"]');await course.click();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);await page.locator('#courseMaps').evaluate(el=>el.scrollIntoView({block:'start'}));await page.waitForTimeout(150);await expect(page.locator('#courseStickyBar')).toBeVisible();await expect(page.locator('#courseStickyTitle')).toContainText('DEMHAB')});
test('tempo de estudo só conta após iniciar sessão manualmente',async({page},testInfo)=>{test.skip(testInfo.project.name==='ipad','Cobertura funcional única; UI iPad permanece coberta pelos demais testes.');const course=page.locator('#homeCourses [data-course="porto-alegre"]');await course.click();const card=page.locator('#courseMaps [data-map]').first();await card.click();await expect(page.locator('#reader')).toHaveClass(/open/);const passive=await page.evaluate(()=>{const key=StudyTime.currentKey(),base=Date.now(),before=StudyTime.mapSeconds(key);StudyTime.activity(base);StudyTime.tick(base+45000);return{key,before,after:StudyTime.mapSeconds(key)}});expect(passive.after).toBe(passive.before);const start=page.locator('[data-rail-session]');await expect(start).toBeVisible();await expect(start).toContainText('Iniciar estudo');await start.click();await page.waitForTimeout(1100);const manual=await page.evaluate(key=>{StudyDashboard.pause();const after=StudyTime.mapSeconds(key),active=StudyDashboard.active();StudyDashboard.finish({silent:true,suppressSummary:true});return{after,active}},passive.key);expect(manual.after).toBeGreaterThan(passive.after);expect(manual.active?.running).toBe(false)});

test('regras de revisão programada usam os atrasos definidos',async({page})=>{const delays=await page.evaluate(()=>({difficult:reviewDelayDays({difficult:1,review:0,total:10,marked:1,done:0}),review:reviewDelayDays({difficult:0,review:1,total:10,marked:1,done:0}),done:reviewDelayDays({difficult:0,review:0,total:10,marked:1,done:1}),completed:reviewDelayDays({difficult:0,review:0,total:10,marked:10,done:10})}));expect(delays).toEqual({difficult:1,review:3,done:7,completed:14})});
test('restore point é reversível e mantém apenas os dez mais recentes',async({page})=>{const result=await page.evaluate(async()=>{const key='mindmap_state::e2e-restore',modified='studyapp.modified::'+key;localStorage.setItem(key,'antes');localStorage.setItem(modified,new Date().toISOString());const point=await createRestorePoint('e2e','Teste reversível');localStorage.setItem(key,'depois');localStorage.setItem(modified,new Date(Date.now()+1000).toISOString());await restorePointNow(point.id);for(let i=0;i<12;i++)await createRestorePoint('e2e-limit','Ponto '+i);const points=await listRestorePoints();return{value:localStorage.getItem(key),count:points.length,labels:points.map(p=>p.label)}});expect(result.value).toBe('antes');expect(result.count).toBeLessThanOrEqual(10);expect(result.labels.length).toBeGreaterThan(0)});

test('analytics dos simulados calcula 60 70 80 e mostra evolução',async({page})=>{await page.goto('/#simulations');const key=await page.evaluate(()=>{const simulation=combinedSimulations()[0],key=simulation._key||simulationKey(simulation),now=Date.now();state.simAttempts[key]=[{score:80,correct:8,total:10,durationSeconds:900,finishedAt:new Date(now).toISOString(),sections:{Português:{correct:8,total:10}}},{score:70,correct:7,total:10,durationSeconds:840,finishedAt:new Date(now-60000).toISOString()},{score:60,correct:6,total:10,durationSeconds:780,finishedAt:new Date(now-120000).toISOString()}];state.simResults[key]=state.simAttempts[key][0];localStorage.setItem('studyapp.simAttempts',JSON.stringify(state.simAttempts));localStorage.setItem('studyapp.simResults',JSON.stringify(state.simResults));renderSimulations();return key});const analytics=await page.evaluate(key=>simulationAnalytics(key),key);expect(analytics.count).toBe(3);expect(analytics.latest.score).toBe(80);expect(analytics.best).toBe(80);expect(analytics.average).toBe(70);const card=page.locator('[data-simulation-history="'+key+'"]').locator('xpath=ancestor::article');await expect(card).toContainText('Última');await expect(card).toContainText('80%');await expect(card).toContainText('Média');await expect(card).toContainText('70%');await card.locator('[data-simulation-history]').click();await expect(page.locator('#simulationHistoryModal')).toHaveClass(/open/);await expect(page.locator('#simulationAnalyticsSummary')).toContainText('Tempo médio');await expect(page.locator('#simulationAnalyticsTrend span')).toHaveCount(3);const heights=await page.locator('#simulationAnalyticsTrend span').evaluateAll(nodes=>nodes.map(node=>node.style.height));expect(heights).toEqual(['60%','70%','80%']);await expect(page.locator('#simulationAnalyticsSections')).toContainText('Português')});
test('novidades aparecem uma vez por versão',async({page})=>{await page.evaluate(()=>{closeModal('whatsNewModal');localStorage.removeItem('studyapp.lastSeenVersion');maybeShowWhatsNew({version:APP_VERSION,label:APP_VERSION_LABEL,showWhatsNew:true,highlights:['Teste E2E de novidades']})});await expect(page.locator('#whatsNewModal')).toHaveClass(/open/);await expect(page.locator('#whatsNewHighlights')).toContainText('Teste E2E de novidades');await page.locator('#whatsNewAccept').click();await expect(page.locator('#whatsNewModal')).not.toHaveClass(/open/);expect(await page.evaluate(()=>localStorage.getItem('studyapp.lastSeenVersion'))).toBe(await page.evaluate(()=>APP_VERSION))});
test('modo foco do mapa abre e fecha sem erro',async({page})=>{const course=page.locator('#homeCourses [data-course="porto-alegre"]');await course.click();await page.locator('#courseMaps [data-map]').first().click();await expect(page.locator('#reader')).toHaveClass(/open/);await page.locator('#readerMoreBtn').click();await page.locator('#readerFocusBtn').click();await expect(page.locator('#reader')).toHaveClass(/focus-mode/);await page.locator('#readerFocusExit').click();await expect(page.locator('#reader')).not.toHaveClass(/focus-mode/)});
test('rota sobrevive a reload e back forward',async({page})=>{await page.locator('#homeCourses [data-course="porto-alegre"]').click();await expect(page).toHaveURL(/#course\/porto-alegre/);await page.reload();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);await page.goBack();await expect(page.locator('[data-view="home"]')).toHaveClass(/active/);await page.goForward();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/)});
test('configurações expõem backup restore points e versão do PWA',async({page},testInfo)=>{await page.goto('/#settings');if(testInfo.project.name==='iphone-webkit'){const panel=page.locator('.settings-area-backup');if(await panel.evaluate(el=>el.classList.contains('mobile-settings-collapsed')))await panel.locator(':scope > .mobile-settings-toggle').click()}await expect(page.locator('#downloadBackupBtn')).toBeVisible();await expect(page.locator('#restoreBackupBtn')).toBeVisible();await expect(page.locator('#restorePointsList')).toBeVisible();expect(await page.evaluate(()=>APP_VERSION)).toBe(E2E_APP_VERSION);const backup=await page.evaluate(()=>buildStudyBackup());expect(backup.type).toBe('meus-mapas-backup');expect(backup.schemaVersion).toBe(1)});

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

test('sincronização preserva capas mais novas entre dispositivos e respeita preferência global mais recente',async({page})=>{
  const result=await page.evaluate(()=>{
    const localTs=Date.parse('2026-10-01T12:00:00.000Z'),cloudTs=Date.parse('2026-10-01T13:00:00.000Z');
    const local={
      favorites:['local-fav'],
      mapLayout:'list',
      coverOverrides:{
        'curso::cf88':{path:'local-cf88.webp',updatedAt:'2026-10-01T15:00:00.000Z'},
        'curso::demhab':{path:'',updatedAt:'2026-10-01T16:00:00.000Z'}
      },
      mapActivity:{'curso::cf88':'2026-10-01T15:30:00.000Z'}
    };
    const cloud={
      favorites:['cloud-fav'],
      mapLayout:'grid',
      coverOverrides:{
        'curso::cf88':{path:'cloud-cf88-antiga.webp',updatedAt:'2026-10-01T14:00:00.000Z'},
        'curso::demhab':{path:'cloud-demhab-antiga.webp',updatedAt:'2026-10-01T14:30:00.000Z'},
        'curso::epf':{path:'cloud-epf.webp',updatedAt:'2026-10-01T17:00:00.000Z'}
      },
      mapActivity:{'curso::cf88':'2026-10-01T14:00:00.000Z','curso::epf':'2026-10-01T17:00:00.000Z'}
    };
    const merged=mergePreferencePayloads(local,cloud,localTs,cloudTs);
    const previous=state.coverOverrides;
    state.coverOverrides=merged.coverOverrides;
    const offline=offlinePrivateEntries().map(item=>item.path);
    state.coverOverrides=previous;
    return{
      favorites:merged.favorites,
      mapLayout:merged.mapLayout,
      cf88:merged.coverOverrides['curso::cf88'],
      demhab:merged.coverOverrides['curso::demhab'],
      epf:merged.coverOverrides['curso::epf'],
      cf88Activity:merged.mapActivity['curso::cf88'],
      epfActivity:merged.mapActivity['curso::epf'],
      offline
    };
  });
  expect(result.favorites).toEqual(['cloud-fav']);
  expect(result.mapLayout).toBe('grid');
  expect(result.cf88.path).toBe('local-cf88.webp');
  expect(result.demhab.path).toBe('');
  expect(result.epf.path).toBe('cloud-epf.webp');
  expect(result.cf88Activity).toBe('2026-10-01T15:30:00.000Z');
  expect(result.epfActivity).toBe('2026-10-01T17:00:00.000Z');
  expect(result.offline).toContain('local-cf88.webp');
  expect(result.offline).toContain('cloud-epf.webp');
});

test('sincronização de capas usa updatedAt por mapa e não ressuscita capa restaurada',async({page})=>{
  const result=await page.evaluate(()=>{
    const local={
      'curso::a':{path:'nova-a.webp',updatedAt:'2026-10-01T18:00:00.000Z'},
      'curso::b':{path:'',updatedAt:'2026-10-01T19:00:00.000Z'}
    };
    const cloud={
      'curso::a':{path:'antiga-a.webp',updatedAt:'2026-10-01T17:00:00.000Z'},
      'curso::b':{path:'antiga-b.webp',updatedAt:'2026-10-01T18:30:00.000Z'},
      'curso::c':{path:'c.webp',updatedAt:'2026-10-01T20:00:00.000Z'}
    };
    return mergeCoverOverrides(local,cloud,Date.parse('2026-10-01T21:00:00.000Z'),Date.parse('2026-10-01T22:00:00.000Z'),false);
  });
  expect(result['curso::a'].path).toBe('nova-a.webp');
  expect(result['curso::b'].path).toBe('');
  expect(result['curso::c'].path).toBe('c.webp');
});

test('PWA detecta worker mais novo que o bundle aberto',async({page})=>{await page.goto('/#settings');const result=await page.evaluate(()=>({same:serviceWorkerIsNewerThanBundle({scriptURL:location.origin+location.pathname+'sw.js?v='+APP_VERSION}),newer:serviceWorkerIsNewerThanBundle({scriptURL:location.origin+location.pathname+'sw.js?v=99.0.0'}),older:serviceWorkerIsNewerThanBundle({scriptURL:location.origin+location.pathname+'sw.js?v=1.0.0'}),parsed:serviceWorkerAppVersion({scriptURL:location.origin+location.pathname+'sw.js?v=99.0.0'})}));expect(result.same).toBe(false);expect(result.newer).toBe(true);expect(result.older).toBe(false);expect(result.parsed).toBe('99.0.0')});
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
  expect(result.version).toBe(E2E_APP_VERSION);
  expect(result.active).toBe(true);
  expect(result.waiting).toBe(false);
  expect(result.updateAvailable).toBe(false);
  expect(result.scriptURL).toContain('sw.js?v='+E2E_APP_VERSION);
  expect(result.status).toContain('Aplicativo atualizado');
})
test('home monta plano inteligente de estudo',async({page})=>{
  await page.goto('/#home');
  await expect(page.locator('#homeReviewSection')).toBeVisible();
  await expect(page.locator('#homeStudyPlan .study-plan-item').first()).toBeVisible();
  const snapshot=await page.evaluate(()=>StudyCoach.snapshot());
  expect(snapshot.items.length).toBeGreaterThan(0);
  expect(snapshot.summary.plannedMinutes).toBeGreaterThan(0);
  await expect(page.locator('#homeReviewNowBtn')).toContainText('Começar');
});

test('V15.36.36 [D] Home equilibra Retomar e Simulados recentes',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Validação exclusiva do desktop.');
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/#home');
  await page.evaluate(()=>{const map=combinedMaps()[0];localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));renderHome()});
  const resume=page.locator('.home-continue-section .continue-card');
  const simulations=page.locator('.home-simulations-section .simulation-recent-item');
  await expect(resume).toBeVisible();
  await expect(simulations.first()).toBeVisible();
  const visibleSimCount=await simulations.evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=='none').length);
  expect(visibleSimCount).toBe(Math.min(2,await simulations.count()));
  const data=await page.evaluate(()=>{
    const home=document.querySelector('[data-view="home"]'),resumeSection=document.querySelector('.home-continue-section'),simSection=document.querySelector('.home-simulations-section');
    const resume=document.querySelector('.home-continue-section .continue-card'),sim=document.querySelector('.home-simulations-section .simulation-recent-item:not([style*="display: none"])')||document.querySelector('.home-simulations-section .simulation-recent-item');
    const courses=document.querySelector('.home-courses-section');
    const hr=home.getBoundingClientRect(),rr=resumeSection.getBoundingClientRect(),sr=simSection.getBoundingClientRect(),cr=resume.getBoundingClientRect(),xr=sim.getBoundingClientRect(),br=courses.getBoundingClientRect();
    return{
      resumeShare:rr.width/(rr.width+sr.width),
      rowAligned:Math.abs(rr.top-sr.top),
      cardHeightDiff:Math.abs(cr.height-xr.height),
      resumeHeight:cr.height,
      simHeight:xr.height,
      coursesGap:br.top-Math.max(cr.bottom,xr.bottom),
      overflow:document.documentElement.scrollWidth-innerWidth
    };
  });
  expect(data.resumeShare).toBeGreaterThan(.54);
  expect(data.resumeShare).toBeLessThan(.62);
  expect(data.rowAligned).toBeLessThanOrEqual(2);
  expect(data.cardHeightDiff).toBeLessThanOrEqual(2);
  expect(data.resumeHeight).toBeLessThanOrEqual(156);
  expect(data.simHeight).toBeLessThanOrEqual(156);
  expect(data.coursesGap).toBeLessThan(52);
  expect(data.overflow).toBeLessThanOrEqual(2);
});

test('V15.37.0 [G] automação calcula saúde e gera agenda inteligente sem duplicar',async({page})=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>window.StudyAutomation&&window.StudyPlanner&&window.StudyDashboard);
  const result=await page.evaluate(()=>{
    const before=StudyDashboard.exportData();
    before.agenda=(before.agenda||[]).filter(row=>row.automationSource!=='smart-plan');
    StudyDashboard.importData(before,{merge:false,silent:true});
    const course=combinedCourses().find(c=>c.status!=='archived')||combinedCourses()[0];
    const health=StudyAutomation.courseHealth(course);
    const first=StudyAutomation.syncAgenda({force:true});
    const afterFirst=StudyDashboard.exportData().agenda.filter(row=>!row.deleted&&row.automationSource==='smart-plan');
    const second=StudyAutomation.syncAgenda({force:true});
    const afterSecond=StudyDashboard.exportData().agenda.filter(row=>!row.deleted&&row.automationSource==='smart-plan');
    return{
      settings:StudyAutomation.settings(),
      health:{status:health.status,required:health.requiredTopicsPerDay,actual:health.actualTopicsPerDay,remaining:health.remainingTopics},
      first,second,
      firstCount:afterFirst.length,
      secondCount:afterSecond.length,
      unique:new Set(afterSecond.map(row=>row.id)).size,
      maxPerDay:Object.values(afterSecond.reduce((acc,row)=>{acc[row.date]=(acc[row.date]||0)+1;return acc},{})).reduce((m,n)=>Math.max(m,n),0)
    };
  });
  expect(result.settings.autoAgenda).toBe(true);
  expect(result.settings.autoReplan).toBe(true);
  expect(result.settings.simRecovery).toBe(true);
  expect(['healthy','attention','risk','finished','neutral','archived']).toContain(result.health.status);
  expect(result.health.required).toBeGreaterThanOrEqual(0);
  expect(result.health.actual).toBeGreaterThanOrEqual(0);
  expect(result.firstCount).toBeGreaterThan(0);
  expect(result.secondCount).toBe(result.firstCount);
  expect(result.unique).toBe(result.secondCount);
  expect(result.maxPerDay).toBeLessThanOrEqual(3);
});

test('V15.37.0 [G] automação aparece em Cursos, curso e Configurações',async({page})=>{
  await page.goto('/#courses');
  await page.waitForFunction(()=>window.StudyAutomation);
  await expect(page.locator('#courseAutomationOverview')).toBeVisible();
  await expect(page.locator('#coursesGrid .course-health-badge').first()).toBeVisible();
  const firstCourse=page.locator('#coursesGrid [data-course]').first();
  await firstCourse.click();
  await expect(page.locator('#courseAutomationPanel')).toBeVisible();
  await expect(page.locator('#courseAutomationPanel')).toContainText(/Ritmo necessário|Previsão|Revisões/);
  await page.goto('/#settings');
  await expect(page.locator('#studyAutomationPanel')).toBeVisible();
  await expect(page.locator('#studyAutomationPanel [data-automation-setting]')).toHaveCount(5);
  await expect(page.locator('#studyAutomationPanel')).toContainText('Saúde do estudo');
});

test('V15.37.0 [G] importador consegue inferir curso e diagnóstico detecta inconsistências sem quebrar',async({page})=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>window.StudyAutomation);
  const result=await page.evaluate(()=>{
    const course=combinedCourses().find(c=>c.status!=='archived')||combinedCourses()[0];
    const map=combinedMaps().find(m=>m.courseId===course.id)||combinedMaps()[0];
    const match=StudyAutomation.inferCourse([{declaredCode:map.code,code:map.code,title:map.title,shortTitle:map.shortTitle,board:course.board,contest:course.title}]);
    const diagnostic=StudyAutomation.diagnostics();
    return{courseId:course.id,matchId:match?.course?.id||'',score:match?.score||0,total:diagnostic.total,warnings:diagnostic.warnings,healthy:diagnostic.healthy};
  });
  expect(result.matchId).toBe(result.courseId);
  expect(result.score).toBeGreaterThanOrEqual(6);
  expect(result.total).toBeGreaterThanOrEqual(0);
  expect(result.warnings).toBeGreaterThanOrEqual(0);
  expect(typeof result.healthy).toBe('boolean');
});

test('V15.37.0 [G] recuperação pós-simulado cria revisão direcionada quando há fraqueza',async({page})=>{
  await page.goto('/#simulations');
  await page.waitForFunction(()=>window.StudyAutomation&&typeof combinedSimulations==='function'&&combinedSimulations().length>0);
  const result=await page.evaluate(()=>{
    const sim=combinedSimulations()[0],key=sim._key||simulationKey(sim);
    const beforeAgenda=StudyDashboard.exportData().agenda.filter(row=>!row.deleted&&row.automationSource==='simulation-recovery').length;
    const beforeReviews=Object.keys(StudyPlanner.exportData().topicReviews||{}).length;
    const output=StudyAutomation.recoverSimulation(key,{score:35,wrong:5,total:10,finishedAt:'2026-10-04T12:00:00.000Z',sections:{'Acessibilidade e Segurança':{correct:0,total:3}},mistakes:[{section:'Acessibilidade e Segurança',topic:'Acessibilidade',number:1}]});
    const afterAgenda=StudyDashboard.exportData().agenda.filter(row=>!row.deleted&&row.automationSource==='simulation-recovery').length;
    const afterReviews=Object.keys(StudyPlanner.exportData().topicReviews||{}).length;
    return{output,beforeAgenda,afterAgenda,beforeReviews,afterReviews};
  });
  expect(result.output.topics+result.output.maps).toBeGreaterThan(0);
  expect(result.afterAgenda>=result.beforeAgenda||result.afterReviews>result.beforeReviews).toBe(true);
});

test('V15.38.0 [G] automação oferece modos, histórico e desfazer',async({page},testInfo)=>{
  await page.goto('/#settings');
  await page.waitForFunction(()=>window.StudyAutomation&&window.SettingsControlCenter);
  if(testInfo.project.name==='iphone-webkit'){
    const panel=page.locator('.settings-area-automation');
    if(await panel.evaluate(el=>el.classList.contains('mobile-settings-collapsed')))await panel.locator(':scope > .mobile-settings-toggle').click();
  }
  const mode=page.locator('[data-automation-mode]');
  await expect(mode).toBeVisible();
  if(testInfo.project.name==='iphone-webkit'){
    await mode.evaluate(el=>{el.value='intensive';el.dispatchEvent(new Event('change',{bubbles:true}))});
  }else{
    await mode.selectOption('intensive');
  }
  await expect.poll(async()=>page.evaluate(()=>StudyAutomation.settings().mode)).toBe('intensive');
  const result=await page.evaluate(()=>{
    const data=StudyDashboard.exportData();
    data.agenda=(data.agenda||[]).filter(row=>row.automationSource!=='smart-plan');
    StudyDashboard.importData(data,{merge:false,silent:true});
    const sync=StudyAutomation.syncAgenda({force:true});
    const after=StudyDashboard.exportData().agenda.filter(row=>!row.deleted&&row.automationSource==='smart-plan').length;
    return{sync,after,history:StudyAutomation.history().length,canUndo:StudyAutomation.canUndo()};
  });
  expect(result.after).toBeGreaterThan(0);
  expect(result.history).toBeGreaterThan(0);
  expect(result.canUndo).toBe(true);
  const undone=await page.evaluate(()=>{const ok=StudyAutomation.undo();return{ok,count:StudyDashboard.exportData().agenda.filter(row=>!row.deleted&&row.automationSource==='smart-plan').length}});
  expect(undone.ok).toBe(true);
  expect(undone.count).toBe(0);
});

test('V15.38.0 [G] aparência e metas eliminam redundância e mostram recomendação',async({page},testInfo)=>{
  await page.goto('/#settings');
  const openPhonePanel=async selector=>{
    if(testInfo.project.name!=='iphone-webkit')return;
    const panel=page.locator(selector);
    if(await panel.evaluate(el=>el.classList.contains('mobile-settings-collapsed')))await panel.locator(':scope > .mobile-settings-toggle').click();
    await expect(panel).not.toHaveClass(/mobile-settings-collapsed/);
  };
  await openPhonePanel('.settings-area-study');
  await expect(page.locator('.study-goal-recommendation')).toBeVisible();
  await expect(page.locator('.study-goal-recommendation')).toContainText('Carga recomendada');
  await openPhonePanel('.settings-area-appearance');
  await expect(page.locator('.settings-redundant-preview')).toBeHidden();
  await expect(page.locator('[data-app-icon-mode="auto"] small')).toContainText(/Segue o sistema/);
  await openPhonePanel('.settings-area-admin');
  await expect(page.locator('.settings-admin-summary')).toBeVisible();
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
  await expect(page.locator('#progressInsights .progress-insight-card.is-primary')).toHaveCount(1);
  await expect(page.locator('#progressInsights .progress-insights-head>span')).toHaveText(/^\d+h \d{2}min nesta semana$/);
});

test('V15.36.35 [T] próximas ações equilibram paisagem e empilham no retrato',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva do iPad.');
  await page.setViewportSize({width:1180,height:820});
  await page.goto('/#progress');
  await expect(page.locator('#progressInsights')).toBeVisible();
  const cards=page.locator('#progressInsights .progress-insight-card');
  const count=await cards.count();
  expect(count).toBeGreaterThan(0);
  const landscape=await cards.evaluateAll(nodes=>nodes.slice(0,3).map(node=>{const r=node.getBoundingClientRect(),thumb=node.querySelector('.progress-insight-thumb')?.getBoundingClientRect(),button=node.querySelector('.secondary')?.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,width:r.width,height:r.height,thumbWidth:thumb?.width||0,buttonHeight:button?.height||0}}));
  for(const row of landscape){expect(row.thumbWidth).toBeGreaterThanOrEqual(88);expect(row.buttonHeight).toBeGreaterThanOrEqual(44)}
  if(landscape.length>=2){expect(Math.abs(landscape[0].top-landscape[1].top)).toBeLessThanOrEqual(2);expect(Math.abs(landscape[0].width-landscape[1].width)).toBeLessThanOrEqual(3);expect(Math.abs(landscape[0].height-landscape[1].height)).toBeLessThanOrEqual(3)}
  if(landscape.length>=3){expect(Math.abs(landscape[2].left-landscape[0].left)).toBeLessThanOrEqual(2);expect(Math.abs(landscape[2].right-landscape[1].right)).toBeLessThanOrEqual(2);expect(landscape[2].height).toBeLessThanOrEqual(landscape[0].height)}

  await page.setViewportSize({width:820,height:1180});
  await page.waitForTimeout(80);
  const portrait=await cards.evaluateAll(nodes=>nodes.slice(0,3).map(node=>{const r=node.getBoundingClientRect(),button=node.querySelector('.secondary')?.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height,buttonHeight:button?.height||0}}));
  for(let i=1;i<portrait.length;i++){expect(Math.abs(portrait[i].left-portrait[0].left)).toBeLessThanOrEqual(2);expect(Math.abs(portrait[i].width-portrait[0].width)).toBeLessThanOrEqual(2);expect(portrait[i].top).toBeGreaterThan(portrait[i-1].top)}
  for(const row of portrait)expect(row.buttonHeight).toBeGreaterThanOrEqual(44);
});

test('progresso mostra somente atenção útil e consolida o ritmo',async({page})=>{
  await page.goto('/#progress');
  await expect(page.locator('#studyIntelligencePanel')).toBeVisible();
  await expect(page.locator('#studyIntelligencePanel')).toContainText('O que merece sua atenção');
  await expect(page.locator('.intelligence-action-forecast')).toBeVisible();
  await expect(page.locator('.intelligence-action-week')).toBeVisible();
  const attention=await page.locator('#studyIntelligencePanel').evaluate(el=>({
    review:el.querySelectorAll('.intelligence-action-review').length,
    errors:el.querySelectorAll('.intelligence-action-errors').length,
    clear:el.querySelectorAll('.progress-intelligence-status.is-clear').length,
    actionCount:el.querySelectorAll('.intelligence-primary-actions>article').length
  }));
  expect(attention.actionCount).toBeGreaterThanOrEqual(2);
  expect(attention.actionCount).toBeLessThanOrEqual(4);
  if(attention.review===0&&attention.errors===0)expect(attention.clear).toBe(1);
  await expect(page.locator('.study-rhythm-shell')).toBeVisible();
  await expect(page.locator('.study-heatmap-primary')).toBeVisible();
  await expect(page.locator('.study-rhythm-kpis>article')).toHaveCount(4);
  await expect(page.locator('#studyDoubtInbox')).toBeVisible();
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
    const radius=selector=>parseFloat(getComputedStyle(document.querySelector(selector)).borderRadius)||0;
    return{
      situation:radius('.course-study-filter'),
      category:radius('.category-btn'),
      primary:radius('.course-primary-actions .secondary'),
      mapCard:radius('.map-card'),
      progressTrack:radius('.progress-track')
    };
  });
  for(const control of ['situation','category','primary'])expect(radii[control],control+' não deve voltar ao formato pill').toBeLessThanOrEqual(10);
  await expect(page.locator('.course-search-box')).toBeHidden();
  await expect(page.locator('#globalSearch')).toBeVisible();
  expect(radii.mapCard).toBeLessThanOrEqual(18);
  expect(radii.progressTrack).toBeGreaterThanOrEqual(100);
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

test('filtro do curso não exibe bloco escuro lateral',async({page},testInfo)=>{
  if(testInfo.project.name!=='ipad')await page.setViewportSize({width:1280,height:800});
  await page.goto('/#course/porto-alegre');
  await expect(page.locator('html')).not.toHaveClass(/is-phone-layout/);
  const filter=page.locator('.course-study-filter-wrap');
  await expect(filter).toHaveCount(1);
  if(testInfo.project.name!=='ipad')await expect(filter).toBeVisible();
  const pseudo=await filter.evaluate(el=>{
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
  expect(['0px','']).toContain(styles.footerBorder);
  expect(['0px','']).toContain(styles.footerPadding);
  expect(styles.metaRadius).toBe('5px');
  expect(styles.titleMargin).toBe('10px');
  expect(styles.sourceDot).toBe('5px');
});

test('cards da biblioteca de cursos usam nova hierarquia',async({page},testInfo)=>{
  await page.goto('/#courses');
  const card=page.locator('#coursesGrid .course-card').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.course-icon')).toHaveCount(0);
  await expect(card.locator('.course-card-code')).toBeVisible();
  await expect(card.locator('.course-card-role')).toBeVisible();
  await expect(card.locator('.course-card-institution')).toBeHidden();
  await expect(card.locator('.course-progress-head')).toContainText('concluído');
  await expect(card.locator('.progress-state.pending')).toHaveCount(0);
  await expect(card.locator('.course-progress-empty')).toContainText('Ainda sem progresso registrado.');
  await expect(card.locator('.course-exam-info')).toContainText('Prova');
  await expect(card.locator('.course-exam-info small')).toContainText('out');
  await expect(card.locator('.course-edital-btn')).toContainText('Ver edital');
  const styles=await page.locator('#coursesGrid').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns,gap:getComputedStyle(el).gap}));
  expect(styles.columns).not.toBe('none');
  expect(styles.gap).toBe(testInfo.project.name==='ipad'?'12px':'14px');
});

test('Etapa 2 aplica acabamento premium aos cards de cursos em desktop e iPad',async({page},testInfo)=>{
  await page.goto('/#courses');
  const card=page.locator('#coursesGrid .course-card.course-library-card').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.course-status-pill')).toBeVisible();
  await expect(card.locator('.course-board-chip')).toBeVisible();
  await expect(card.locator('.course-map-count-chip')).toBeVisible();
  await expect(card.locator('.progress-state.pending')).toHaveCount(0);
  await expect(card.locator('.course-progress-empty')).toContainText('Ainda sem progresso registrado.');
  const styles=await card.evaluate(el=>{
    const meta=el.querySelector('.course-card-meta-item');
    const board=el.querySelector('.course-board-chip');
    const exam=el.querySelector('.course-exam-info');
    const track=el.querySelector('.course-progress-mini .progress-track');
    const empty=el.querySelector('.course-progress-empty');
    const enter=el.querySelector('.enter');
    const status=el.querySelector('.course-status-pill');
    const footer=el.querySelector('.course-footer');
    return{
      cardRadius:getComputedStyle(el).borderRadius,
      metaRadius:getComputedStyle(meta).borderRadius,
      boardColor:getComputedStyle(board).color,
      examColor:getComputedStyle(exam.querySelector('b')).color,
      trackHeight:getComputedStyle(track).height,
      emptyDisplay:getComputedStyle(empty).display,
      footerBorder:getComputedStyle(footer).borderTopWidth,
      enterHeight:getComputedStyle(enter).minHeight,
      statusRadius:getComputedStyle(status).borderRadius
    };
  });
  expect(styles.cardRadius).toBe('16px');
  expect(styles.metaRadius).toBe('0px');
  expect(styles.trackHeight).toBe('4px');
  expect(styles.emptyDisplay).toBe('none');
  expect(['0px','']).toContain(styles.footerBorder);
  expect(styles.statusRadius).toBe('8px');
  expect(styles.enterHeight).toBe(testInfo.project.name==='ipad'?'44px':'34px');
  expect(styles.boardColor).not.toBe(styles.examColor);
});

test('cards de curso mantêm controles dentro da capa e enquadramento equilibrado em Desktop e iPad',async({page},testInfo)=>{
  test.skip(!['desktop-chromium','ipad'].includes(testInfo.project.name),'Validação específica de Desktop e iPad.');
  await page.setViewportSize(testInfo.project.name==='ipad'?{width:1194,height:834}:{width:1440,height:900});
  await page.goto('/#courses');
  const card=page.locator('#coursesGrid .course-card.course-library-card').first();
  await expect(card).toBeVisible();
  const visual=await card.evaluate(el=>{
    const cover=el.querySelector('.course-card-cover'),status=el.querySelector('.course-status-pill'),edit=el.querySelector('.course-card-edit');
    const card=el.getBoundingClientRect(),c=cover.getBoundingClientRect(),s=status.getBoundingClientRect(),e=edit.getBoundingClientRect();
    return{
      ratio:c.width/c.height,
      topInset:c.top-card.top,
      leftInset:c.left-card.left,
      rightInset:card.right-c.right,
      statusInside:s.left>=c.left+8&&s.top>=c.top+8&&s.right<=c.right-8&&s.bottom<=c.bottom-8,
      editInside:e.left>=c.left+8&&e.top>=c.top+8&&e.right<=c.right-8&&e.bottom<=c.bottom-8,
      controlsOverlap:!(s.right<=e.left||e.right<=s.left||s.bottom<=e.top||e.bottom<=s.top)
    };
  });
  expect(visual.ratio).toBeGreaterThanOrEqual(1.74);
  expect(visual.ratio).toBeLessThanOrEqual(1.82);
  expect(Math.abs(visual.topInset)).toBeLessThanOrEqual(2);
  expect(Math.abs(visual.leftInset)).toBeLessThanOrEqual(2);
  expect(Math.abs(visual.rightInset)).toBeLessThanOrEqual(2);
  expect(visual.statusInside).toBe(true);
  expect(visual.editInside).toBe(true);
  expect(visual.controlsOverlap).toBe(false);
});


test('[T] Home mantém capas 16:9 e controles dentro da capa em retrato e paisagem',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva do iPad.');
  const scenarios=[
    {name:'retrato',width:820,height:1180},
    {name:'paisagem',width:1194,height:834}
  ];
  for(const scenario of scenarios){
    await page.setViewportSize({width:scenario.width,height:scenario.height});
    await page.goto('/#home');
    const card=page.locator('#homeCourses .home-course-card.course-library-card').first();
    await expect(card).toBeVisible();
    const visual=await card.evaluate(el=>{
      const cover=el.querySelector('.course-card-cover');
      const status=el.querySelector('.course-status-pill');
      const edit=el.querySelector('.course-card-edit');
      const c=cover.getBoundingClientRect(),s=status.getBoundingClientRect(),e=edit?.getBoundingClientRect();
      const card=el.getBoundingClientRect();
      const grid=document.querySelector('#homeCourses');
      const role=el.querySelector('.course-card-role');
      const board=el.querySelector('.course-board-chip');
      const maps=el.querySelector('.course-map-count-chip');
      const activity=el.querySelector('.course-last-activity-card');
      const exam=el.querySelector('.course-exam-info');
      const title=el.querySelector('h3');
      const progress=el.querySelector('.course-progress-mini');
      const enter=el.querySelector('.enter');
      const total=el.querySelector('.course-progress-total');
      const unit=el.querySelector('.course-progress-unit');
      const track=el.querySelector('.progress-track');
      const er=enter?.getBoundingClientRect(),pr=progress?.getBoundingClientRect(),tr=track?.getBoundingClientRect();
      return{
        ratio:c.width/c.height,
        topInset:c.top-card.top,
        maxSideInset:Math.max(c.left-card.left,card.right-c.right),
        cardOverflow:getComputedStyle(el).overflow,
        horizontalOverflow:el.scrollWidth-el.clientWidth,
        columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
        roleDisplay:role?getComputedStyle(role).display:'none',
        boardDisplay:board?getComputedStyle(board).display:'none',
        mapsDisplay:maps?getComputedStyle(maps).display:'none',
        activityDisplay:activity?getComputedStyle(activity).display:'none',
        examVisible:!!exam&&getComputedStyle(exam).display!=='none',
        titleVisible:!!title&&getComputedStyle(title).display!=='none',
        progressVisible:!!progress&&getComputedStyle(progress).display!=='none',
        progressInside:!!pr&&pr.left>=card.left+12&&pr.right<=card.right-12,
        trackInside:!!tr&&tr.left>=card.left+12&&tr.right<=card.right-12,
        countText:el.querySelector('.course-progress-count')?.textContent?.trim()||'',
        unitDisplay:unit?getComputedStyle(unit).display:'none',
        enterVisible:!!enter&&getComputedStyle(enter).display!=='none',
        enterInside:!!er&&er.left>=card.left+12&&er.right<=card.right-12&&er.bottom<=card.bottom-8,
        statusInside:s.left>=c.left+8&&s.top>=c.top+8&&s.right<=c.right-8&&s.bottom<=c.bottom-8,
        editInside:!e||(e.left>=c.left+8&&e.top>=c.top+8&&e.right<=c.right-8&&e.bottom<=c.bottom-8),
        controlsOverlap:!!e&&!(s.right<=e.left||e.right<=s.left||s.bottom<=e.top||e.bottom<=s.top)
      };
    });
    expect.soft(visual.ratio,scenario.name+' usa proporção 16:9').toBeGreaterThanOrEqual(1.74);
    expect.soft(visual.ratio,scenario.name+' usa proporção 16:9').toBeLessThanOrEqual(1.82);
    expect.soft(Math.abs(visual.topInset),scenario.name+' capa encosta no topo do card').toBeLessThanOrEqual(2);
    expect.soft(Math.abs(visual.maxSideInset),scenario.name+' capa encosta nas laterais do card').toBeLessThanOrEqual(2);
    expect.soft(visual.cardOverflow,scenario.name+' card recorta a capa nos cantos').toBe('hidden');
    expect.soft(visual.columns,scenario.name+' mantém dois cursos por linha').toBe(2);
    expect.soft(visual.roleDisplay,scenario.name+' remove cargo da Home').toBe('none');
    expect.soft(visual.boardDisplay,scenario.name+' remove banca da Home').toBe('none');
    expect.soft(visual.mapsDisplay,scenario.name+' remove quantidade de mapas da Home').toBe('none');
    expect.soft(visual.activityDisplay,scenario.name+' remove última atividade da Home').toBe('none');
    expect.soft(visual.examVisible,scenario.name+' mantém data da prova').toBe(true);
    expect.soft(visual.titleVisible,scenario.name+' mantém nome do concurso').toBe(true);
    expect.soft(visual.progressVisible,scenario.name+' mantém progresso').toBe(true);
    expect.soft(visual.horizontalOverflow,scenario.name+' card não cria overflow horizontal').toBeLessThanOrEqual(1);
    expect.soft(visual.progressInside,scenario.name+' bloco de progresso fica dentro do card').toBe(true);
    expect.soft(visual.trackInside,scenario.name+' barra de progresso respeita as margens').toBe(true);
    expect.soft(visual.countText,scenario.name+' total compacto usa somente contagem').toMatch(/^\d+\s*\/\s*\d+$/);
    expect.soft(visual.unitDisplay,scenario.name+' unidade tópicos fica oculta na Home').toBe('none');
    expect.soft(visual.enterVisible,scenario.name+' mantém botão Entrar').toBe(true);
    expect.soft(visual.enterInside,scenario.name+' botão Entrar fica totalmente dentro do card').toBe(true);
    expect.soft(visual.statusInside,scenario.name+' selo ATIVO fica dentro da capa').toBe(true);
    expect.soft(visual.editInside,scenario.name+' botão de configuração fica dentro da capa').toBe(true);
    expect.soft(visual.controlsOverlap,scenario.name+' controles não se sobrepõem').toBe(false);
    const noExam=page.locator('#homeCourses .home-course-card.course-library-card').filter({hasNot:page.locator('.course-exam-info')}).first();
    if(await noExam.count()){
      const noExamMeta=await noExam.locator('.course-card-meta').evaluate(el=>getComputedStyle(el).display);
      expect.soft(noExamMeta,scenario.name+' curso sem prova não reserva faixa vazia').toBe('none');
    }
  }
});


test('[D] Home remove sombra superior da capa sem alterar sua geometria',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Validação exclusiva de Desktop.');
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/#home');
  const cover=page.locator('#homeCourses .home-course-card.course-library-card>.course-card-cover').first();
  await expect(cover).toBeVisible();
  const visual=await cover.evaluate(el=>({
    boxShadow:getComputedStyle(el).boxShadow,
    overlay:getComputedStyle(el,'::after').backgroundImage
  }));
  expect(['none','']).toContain(visual.boxShadow);
  expect(visual.overlay).toContain('linear-gradient');
});

test('Etapa 3 [D+T] refina cabeçalho, sidebar e sincronização sem afetar o smartphone',async({page},testInfo)=>{
  test.skip(!['desktop-chromium','ipad'].includes(testInfo.project.name),'Validação específica de desktop e iPad.');
  await page.setViewportSize(testInfo.project.name==='ipad'?{width:1194,height:834}:{width:1440,height:900});
  await page.goto('/#courses');
  await expect(page.locator('html')).not.toHaveClass(/is-phone-layout/);
  await expect(page.locator('#coursesCount')).toBeVisible();
  await expect(page.locator('#coursesCount')).toContainText(/concurso/);
  await expect(page.locator('.side')).toBeVisible();
  const visual=await page.evaluate(()=>{
    const sync=document.querySelector('#syncTop'),icon=sync.querySelector('.ui-icon'),active=document.querySelector('.side .nav-btn.active'),count=document.querySelector('#coursesCount'),search=document.querySelector('.search'),newCourse=document.querySelector('#newCourseBtn2'),topbar=document.querySelector('.topbar');
    sync.dataset.syncState='synced';
    const synced={text:getComputedStyle(sync).color,icon:getComputedStyle(icon).color,bg:getComputedStyle(sync).backgroundColor};
    sync.dataset.syncState='syncing';
    const syncing={animation:getComputedStyle(icon).animationName};
    const activeBefore=getComputedStyle(active,'::before');
    const topbarStyle=getComputedStyle(topbar),searchStyle=getComputedStyle(search),syncStyle=getComputedStyle(sync);
    return{
      synced,
      syncing,
      activeBackground:getComputedStyle(active).backgroundImage,
      activeMarkerWidth:activeBefore.width,
      countDisplay:getComputedStyle(count).display,
      searchHeight:search.getBoundingClientRect().height,
      syncHeight:sync.getBoundingClientRect().height,
      newCourseHeight:newCourse.getBoundingClientRect().height,
      topbarHeight:topbar.getBoundingClientRect().height,
      topbarBackdrop:topbarStyle.backdropFilter||topbarStyle.webkitBackdropFilter||'none',
      searchBackdrop:searchStyle.backdropFilter||searchStyle.webkitBackdropFilter||'none',
      syncBackdrop:syncStyle.backdropFilter||syncStyle.webkitBackdropFilter||'none',
      topbarBackground:topbarStyle.backgroundImage,
      searchBackground:searchStyle.backgroundImage,
      syncBackground:syncStyle.backgroundImage
    };
  });
  expect(visual.synced.icon).not.toBe(visual.synced.text);
  expect(visual.synced.bg).not.toMatch(/114,\s*201,\s*149/);
  expect(visual.syncing.animation).toContain('cloudSyncStatusPulse');
  expect(visual.activeBackground).not.toBe('none');
  expect(parseFloat(visual.activeMarkerWidth)).toBeGreaterThanOrEqual(1);
  expect(['flex','inline-flex']).toContain(visual.countDisplay);
  expect(visual.topbarBackdrop).not.toBe('none');
  // Apple HIG: a topbar é o único material; controles internos usam fill/vibrancy.
  expect(visual.searchBackdrop).toBe('none');
  expect(visual.syncBackdrop).toBe('none');
  expect(visual.topbarBackground).toContain('gradient');
  expect(visual.searchBackground).toContain('gradient');
  expect(visual.syncBackground).toContain('gradient');
  expect(visual.searchHeight).toBeLessThanOrEqual(40);
  if(testInfo.project.name==='ipad'){
    expect(Math.round(visual.syncHeight)).toBeGreaterThanOrEqual(44);
    expect(Math.round(visual.newCourseHeight)).toBeGreaterThanOrEqual(44);
    expect(visual.topbarHeight).toBeLessThanOrEqual(58);
  }else{
    expect(visual.syncHeight).toBeLessThanOrEqual(40);
    expect(visual.newCourseHeight).toBeLessThanOrEqual(40);
  }
});

test('rodapé dos concursos usa somente atividade e ação de entrada',async({page})=>{
  await page.goto('/#courses');
  const card=page.locator('#coursesGrid .course-card').first();
  await expect(card.locator('.course-footer')).toBeVisible();
  await expect(card.locator('.course-last-activity-card')).toContainText(/atividade|Ainda sem atividade/);
  await expect(card.locator('.course-footer .enter')).toContainText('Entrar');
});

test('V15.38.1 [D] configurações usa centro de controle sem colunas estreitas',async({page},testInfo)=>{
  await page.goto('/#settings');
  await expect(page.locator('#settingsControlSummary')).toBeVisible();
  const layout=page.locator('.settings-layout-v3.settings-control-grid');
  await expect(layout).toBeVisible();
  await expect(layout.locator(':scope > .settings-area-sync')).toHaveCount(1);
  await expect(layout.locator(':scope > .settings-area-update')).toHaveCount(1);
  await expect(layout.locator(':scope > .settings-area-automation')).toHaveCount(1);
  await expect(layout.locator(':scope > .settings-area-admin')).toHaveCount(1);
  await expect(layout.locator(':scope > .settings-area-study')).toHaveCount(1);
  await expect(layout.locator(':scope > .settings-area-appearance')).toHaveCount(1);
  await expect(layout.locator(':scope > .settings-area-backup')).toHaveCount(1);
  await expect(layout.locator(':scope > .settings-area-diagnostic')).toHaveCount(1);
  await expect(page.locator('.settings-diagnostic-disclosure')).toContainText('Dispositivos e testes');
  const metrics=await layout.evaluate(el=>{
    const box=el.getBoundingClientRect(),sync=el.querySelector('.settings-area-sync')?.getBoundingClientRect(),update=el.querySelector('.settings-area-update')?.getBoundingClientRect();
    return{width:innerWidth,layoutWidth:box.width,columns:getComputedStyle(el).gridTemplateColumns,scrollWidth:document.documentElement.scrollWidth,syncWidth:sync?.width||0,updateWidth:update?.width||0,syncTop:sync?.top||0,updateTop:update?.top||0};
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width+2);
  if(testInfo.project.name==='desktop-chromium'){
    expect(metrics.columns.trim().split(/\s+/).length).toBe(2);
    expect(metrics.layoutWidth).toBeGreaterThan(metrics.width*.68);
    expect(metrics.syncWidth).toBeGreaterThan(metrics.layoutWidth*.58);
    expect(metrics.updateWidth).toBeGreaterThan(metrics.layoutWidth*.25);
    expect(Math.abs(metrics.syncTop-metrics.updateTop)).toBeLessThanOrEqual(2);
  }
  if(testInfo.project.name==='iphone-webkit'){
    await expect(page.locator('.mobile-settings-toggle').first()).toBeVisible();
    await expect(page.locator('.settings-area-automation')).toHaveClass(/mobile-settings-collapsed/);
  }
});

test('V15.38.0 [G] pontos de restauração mantêm dez e mostram três antes de expandir',async({page},testInfo)=>{
  await page.goto('/#settings');
  if(testInfo.project.name==='iphone-webkit'){
    const panel=page.locator('.settings-area-backup');
    if(await panel.evaluate(el=>el.classList.contains('mobile-settings-collapsed')))await panel.locator(':scope > .mobile-settings-toggle').click();
  }
  const stored=await page.evaluate(async()=>{
    for(let i=0;i<12;i++)await createRestorePoint('e2e-settings','Ponto visual '+i);
    restorePointsExpanded=false;
    await renderRestorePoints();
    return (await listRestorePoints()).length;
  });
  expect(stored).toBe(10);
  if(testInfo.project.name==='iphone-webkit'){
    const panel=page.locator('.settings-area-backup');
    if(await panel.evaluate(el=>el.classList.contains('mobile-settings-collapsed')))await panel.locator(':scope > .mobile-settings-toggle').click();
    await expect(panel).not.toHaveClass(/mobile-settings-collapsed/);
  }
  await expect(page.locator('#restorePointsList .restore-point-item')).toHaveCount(3);
  await expect(page.locator('[data-toggle-restore-points]')).toBeVisible();
  await expect(page.locator('[data-toggle-restore-points]')).toContainText('Ver todos');
  await page.locator('[data-toggle-restore-points]').click();
  await expect(page.locator('#restorePointsList .restore-point-item')).toHaveCount(10);
  await expect(page.locator('[data-toggle-restore-points]')).toContainText('Mostrar menos');
});

test('V15.38.0 [G] saúde técnica fica separada dos dispositivos e do diagnóstico de estudo',async({page},testInfo)=>{
  await page.goto('/#settings');
  const openPhonePanel=async selector=>{
    if(testInfo.project.name!=='iphone-webkit')return;
    const panel=page.locator(selector);
    if(await panel.evaluate(el=>el.classList.contains('mobile-settings-collapsed')))await panel.locator(':scope > .mobile-settings-toggle').click();
    await expect(panel).not.toHaveClass(/mobile-settings-collapsed/);
  };
  await openPhonePanel('.settings-area-update');
  await expect(page.locator('.app-update-summary')).toContainText(E2E_APP_VERSION_LABEL);
  await openPhonePanel('.settings-area-diagnostic');
  await expect(page.locator('#appDiagnosticPanel.settings-area-diagnostic')).toBeVisible();
  await expect(page.locator('#appDiagnosticPanel')).toContainText('Saúde técnica');
  await expect(page.locator('.settings-device-summary')).toBeVisible();
  await openPhonePanel('.settings-area-sync');
  const details=page.locator('.settings-diagnostic-disclosure');
  await expect(details).toContainText('Dispositivos e testes');
  await details.evaluate(el=>el.open=true);
  await expect(page.locator('#cloudHealthBtn')).toBeVisible();
  await expect(page.locator('#deviceProbeCreate')).toBeVisible();
  await openPhonePanel('.settings-area-automation');
  await expect(page.locator('#studyAutomationPanel')).toContainText('Saúde do estudo');
  await openPhonePanel('.settings-area-backup');
  await expect(page.locator('.settings-backup-retention')).toBeVisible();
});

test('V15.38.0 [G] Por que este mapa explica a prioridade sem tooltip curto',async({page},testInfo)=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>window.StudyPlanner&&typeof StudyPlanner.priorityExplanationRows==='function'&&typeof combinedMaps==='function'&&combinedMaps().length>0);
  const why=page.locator('[data-priority-why]');
  await expect(why).toBeVisible();
  await expect(why).toHaveText('Por que este mapa?');
  await why.click();
  const modal=page.locator('#priorityWhyModal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Por que este mapa agora?');
  const reasons=modal.locator('.priority-why-reasons article');
  expect(await reasons.count()).toBeGreaterThanOrEqual(2);
  const geometry=await modal.locator('.priority-why-card').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight}});
  expect(geometry.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width+1);
  expect(geometry.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height+1);
  if(testInfo.project.name==='iphone-webkit')expect(geometry.bottom).toBeGreaterThan(geometry.height*.7);
  await modal.locator('[data-priority-why-close]').click();
  await expect(modal).toBeHidden();
});

test('home consolidada prioriza o estudo diário',async({page})=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>typeof combinedMaps==='function'&&combinedMaps().length>0);
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

test('[G] Retomar replica a identidade cromática do mapa em todas as telas',async({page},testInfo)=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>typeof combinedMaps==='function'&&combinedMaps().length>0);
  const selected=await page.evaluate(()=>{
    const map=combinedMaps().find(item=>typeof mapAccentKey==='function'&&mapAccentKey(item))||combinedMaps()[0];
    localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));
    renderHome();
    return{code:String(map.code||''),category:String(map.category||'Estudo')};
  });
  const card=page.locator('#continueBox .continue-card');
  await expect(card).toBeVisible();
  await expect(card.locator('.continue-map-code')).toHaveText(selected.code);
  await expect(card.locator('.continue-map-category')).toHaveText(selected.category);
  if(testInfo.project.name==='iphone-webkit')await expect(card.locator('.continue-thumb')).toBeHidden();
  else await expect(card.locator('.continue-thumb img')).toBeVisible();
  const visual=await card.evaluate(el=>{
    const mapAccent=getComputedStyle(el).getPropertyValue('--map-accent').trim();
    const probe=document.createElement('span');
    probe.style.color=mapAccent;probe.style.position='fixed';probe.style.left='-9999px';document.body.append(probe);
    const accentColor=getComputedStyle(probe).color;probe.remove();
    const generic=document.createElement('button');
    generic.className='primary';generic.textContent='x';generic.style.position='fixed';generic.style.left='-9999px';document.body.append(generic);
    const genericStyle=getComputedStyle(generic),genericColor=genericStyle.color,genericBorder=genericStyle.borderTopColor;generic.remove();
    const button=el.querySelector(':scope > .primary'),buttonStyle=getComputedStyle(button),rect=el.getBoundingClientRect();
    return{
      accentColor,
      codeColor:getComputedStyle(el.querySelector('.continue-map-code')).color,
      categoryColor:getComputedStyle(el.querySelector('.continue-map-category')).color,
      progressColor:getComputedStyle(el.querySelector('.continue-progress span')).backgroundColor,
      buttonColor:buttonStyle.color,
      buttonBorder:buttonStyle.borderTopColor,
      genericColor,genericBorder,
      buttonHeight:button.getBoundingClientRect().height,
      insideViewport:rect.left>=-1&&rect.right<=innerWidth+1,
      viewportWidth:innerWidth,
      scrollWidth:document.documentElement.scrollWidth
    };
  });
  expect(visual.codeColor).toBe(visual.accentColor);
  expect(visual.categoryColor).toBe(visual.accentColor);
  expect(visual.progressColor).toBe(visual.accentColor);
  expect(visual.buttonColor).not.toBe(visual.genericColor);
  expect(visual.buttonBorder).not.toBe(visual.genericBorder);
  expect(visual.buttonHeight).toBeGreaterThanOrEqual(39.9);
  expect(visual.insideViewport).toBe(true);
  expect(visual.scrollWidth).toBeLessThanOrEqual(visual.viewportWidth+2);
});

test('simulados recentes usam títulos legíveis e estado',async({page})=>{
  await page.goto('/#home');
  const first=page.locator('#homeSimulations .simulation-recent-item').first();
  await expect(first).toBeVisible();
  const title=(await first.locator('.simulation-recent-title-row b').textContent())||'';
  const board=(await first.locator('.simulation-recent-board').textContent())||'';
  const meta=(await first.locator('.simulation-recent-meta').textContent())||'';
  const status=(await first.locator('.simulation-recent-status').textContent())||'';
  const action=(await first.locator('.simulation-recent-action').textContent())||'';
  expect(title).toMatch(/Simulado/i);
  expect(title).not.toContain('_');
  expect(board).toMatch(/FUNDATEC|AOCP|FEPESE|OBJETIVA|LEGALLE/i);
  expect(meta).toMatch(/questões/);
  expect(status).toMatch(/Não iniciado|Em andamento|Concluído/i);
  expect(action).toMatch(/Começar|Continuar|Rever/i);
});

test('[G] Simulados vinculados herdam o accent do curso sem alterar o badge da banca',async({page})=>{
  await page.goto('/#home');
  const card=page.locator('#homeSimulations .simulation-recent-item').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.simulation-recent-board')).toBeVisible();

  // O sync da Home pode substituir o nó do card no WebKit enquanto a capa/accent
  // é resolvida. Valida sempre o nó atual e conectado para não ler computed style
  // vazio de um elemento que acabou de ser destacado do DOM.
  await expect.poll(async()=>{
    const current=page.locator('#homeSimulations .simulation-recent-item').first();
    if(!await current.count())return false;
    return current.evaluate(el=>el.isConnected&&(!el.dataset.simulationCourseCover||!!el.dataset.simulationCourseAccentSrc));
  },{timeout:5000}).toBe(true);

  await expect.poll(async()=>{
    const current=page.locator('#homeSimulations .simulation-recent-item').first();
    if(!await current.count())return '';
    return current.evaluate(el=>{
      if(!el.isConnected)return '';
      const style=getComputedStyle(el);
      return [style.borderLeftColor,style.boxShadow].filter(v=>v&&v!=='none').join('|');
    });
  },{timeout:5000}).not.toBe('');

  const visual=await page.locator('#homeSimulations .simulation-recent-item').first().evaluate(el=>{
    const style=getComputedStyle(el),board=el.querySelector('.simulation-recent-board');
    return{
      linked:el.isConnected&&!!el.dataset.simulationCourseCover,
      inlineAccent:el.style.getPropertyValue('--simulation-accent').trim(),
      inlineGeneric:el.style.getPropertyValue('--accent').trim(),
      edgeVisual:[style.borderLeftColor,style.boxShadow].filter(v=>v&&v!=='none').join('|'),
      boardColor:board?getComputedStyle(board).color:''
    };
  });
  expect(visual.linked).toBe(true);
  expect(visual.inlineAccent).not.toBe('');
  expect(visual.inlineGeneric).toBe(visual.inlineAccent);
  expect(visual.edgeVisual).not.toBe('');
  expect(visual.boardColor).not.toBe('');
});
test('cursos da home ocupam a largura em grade responsiva',async({page})=>{
  await page.goto('/#home');
  const count=await page.locator('#homeCourses .home-course-card').count();
  expect(count).toBeGreaterThan(0);
  const layout=await page.locator('#homeCourses').evaluate(el=>({width:innerWidth,isIpad:document.documentElement.classList.contains('is-ipad'),columns:getComputedStyle(el).gridTemplateColumns}));
  const columnCount=layout.columns.trim().split(/\s+/).filter(Boolean).length;
  if(layout.isIpad&&layout.width>700&&count>=2)expect(columnCount).toBe(2);
  else if(!layout.isIpad&&layout.width>1180&&count>=3)expect(columnCount).toBe(3);
  else expect(layout.columns).not.toBe('none');
});

test('home refinada usa composição compacta e hierarquia coerente no desktop',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Validação exclusiva de desktop.');
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/#home');
  await page.waitForFunction(()=>typeof combinedMaps==='function'&&combinedMaps().length>0);
  await page.evaluate(()=>{const map=combinedMaps()[0];localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));renderHome();StudyCoach.renderHome?.();StudyPlanner.renderHome?.()});
  await expect(page.locator('.home-continue-section')).toBeVisible();
  await expect(page.locator('.home-simulations-section')).toBeVisible();
  await expect(page.locator('#continueBox .continue-thumb img')).toBeVisible();
  await expect(page.locator('.priority-now-card .priority-now-main h3')).not.toHaveText('');
  await expect(page.locator('.priority-now-card .priority-reason-chip').first()).toBeVisible();
  await expect(page.locator('.forecast-home-card h3')).toContainText(/tópicos restantes/);
  await expect(page.locator('.forecast-home-card')).toContainText('Planejamento até');
  const layout=await page.evaluate(()=>{
    const home=document.querySelector('[data-view="home"]'),resume=document.querySelector('.home-continue-section'),sims=document.querySelector('.home-simulations-section'),command=document.querySelector('.study-command-card'),intel=document.querySelector('.study-intelligence-row'),course=document.querySelector('#homeCourses .home-course-card');
    const hr=home.getBoundingClientRect(),rr=resume.getBoundingClientRect(),sr=sims.getBoundingClientRect();
    return{
      display:getComputedStyle(home).display,
      sameRow:Math.abs(rr.top-sr.top)<2,
      resumeBeforeSims:rr.left<sr.left,
      inside:rr.left>=hr.left&&sr.right<=hr.right+1,
      commandHeight:command?.getBoundingClientRect().height||0,
      intelligenceHeight:intel?.getBoundingClientRect().height||0,
      courseHeight:course?.getBoundingClientRect().height||0,
      resumeShare:rr.width/hr.width,
      simulationItemHeight:document.querySelector('#homeSimulations .simulation-recent-item')?.getBoundingClientRect().height||0
    };
  });
  expect(layout.display).toBe('grid');
  expect(layout.sameRow).toBe(true);
  expect(layout.resumeBeforeSims).toBe(true);
  expect(layout.inside).toBe(true);
  expect(layout.commandHeight).toBeLessThan(180);
  expect(layout.intelligenceHeight).toBeLessThan(150);
  expect(layout.resumeShare).toBeGreaterThan(.54);
  expect(layout.resumeShare).toBeLessThan(.62);
  expect(layout.simulationItemHeight).toBeGreaterThanOrEqual(148);
  expect(layout.simulationItemHeight).toBeLessThanOrEqual(156);
  expect(layout.courseHeight).toBeGreaterThanOrEqual(235);
  expect(layout.courseHeight).toBeLessThanOrEqual(620);
});

test('V15.38.1 [D] refinamento de Progresso, Simulados e Configurações mantém densidade e hierarquia',async({page},testInfo)=>{
  if(testInfo.project.name==='desktop-chromium'){
    await page.setViewportSize({width:1600,height:900});
    await page.goto('/#progress');
    const metricHeight=await page.locator('#progressMetrics .metric').first().evaluate(el=>el.getBoundingClientRect().height);
    expect(metricHeight).toBeLessThanOrEqual(78);
    const course=page.locator('#progressInfo .progress-course.is-collapsed').first();
    await expect(course).toBeVisible();
    const courseHeight=await course.evaluate(el=>el.getBoundingClientRect().height);
    expect(courseHeight).toBeLessThan(125);
    const rhythm=page.locator('.study-rhythm-shell');
    await expect(rhythm).toBeVisible();
    await expect.poll(()=>rhythm.evaluate(el=>{const value=getComputedStyle(el).gridTemplateColumns.trim();return value&&value!=='none'?value.split(/\s+/).filter(Boolean).length:0})).toBe(2);
    await expect(page.locator('.study-heatmap-primary')).toBeVisible();
    await expect(page.locator('.study-rhythm-kpis>article')).toHaveCount(4);

    await page.goto('/#simulations');
    const sim=page.locator('#simulationGrid .simulation-card.has-cover').first();
    await expect(sim).toBeVisible();
    const simData=await sim.evaluate(el=>{
      const card=el.getBoundingClientRect(),cover=el.querySelector('.simulation-cover').getBoundingClientRect();
      return{height:card.height,cover:cover.height,coverWidth:cover.width,codeSize:parseFloat(getComputedStyle(el.querySelector('.simulation-code')).fontSize)||0,statusTop:el.querySelector('.simulation-study-status').getBoundingClientRect().top,codeTop:el.querySelector('.simulation-code').getBoundingClientRect().top};
    });
    expect(simData.coverWidth/simData.cover).toBeGreaterThanOrEqual(1.95);
    expect(simData.coverWidth/simData.cover).toBeLessThanOrEqual(2.05);
    expect(simData.height).toBeLessThan(500);
    expect(simData.codeSize).toBeLessThanOrEqual(8);
    expect(Math.abs(simData.statusTop-simData.codeTop)).toBeLessThan(10);

    await page.goto('/#settings');
    const layout=await page.locator('.settings-layout-v3').evaluate(el=>{
      const box=el.getBoundingClientRect(),sync=el.querySelector('.settings-area-sync')?.getBoundingClientRect(),update=el.querySelector('.settings-area-update')?.getBoundingClientRect();
      return{cols:getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,width:box.width,syncWidth:sync?.width||0,updateWidth:update?.width||0};
    });
    expect(layout.cols).toBe(2);
    expect(layout.syncWidth).toBeGreaterThan(layout.width*.58);
    expect(layout.updateWidth).toBeGreaterThan(layout.width*.25);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1602);
    await expect(page.locator('.study-goal-human').first()).toContainText(/h/);
    await expect(page.locator('.study-settings-toggle')).toHaveCount(0);
    await expect(page.locator('#studyGoalsForm input[name="autoFocus"]')).toHaveCount(0);
  }
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
  await expect(page.locator('.progress-filter-shell')).toHaveCount(0);
  await expect(panel.locator('#progressSort')).toHaveCount(0);
  const trigger=panel.locator('#progressSortTrigger');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator('#progressSortSheet')).toBeVisible();
  await page.locator('#progressSortSheet [data-progress-sort-option="alpha"]').click();
  await expect(page.locator('#progressSortSheet')).toBeHidden();
  await expect(panel.locator('#progressSortLabel')).toHaveText('A–Z');
  const stored=await page.evaluate(()=>localStorage.getItem('studyapp.progressSort'));
  expect(stored).toBe('alpha');
});

test('indicadores de progresso formam uma faixa de quatro KPIs',async({page})=>{
  await page.goto('/#progress');
  await expect(page.locator('#progressMetrics .metric')).toHaveCount(4);
  await expect(page.locator('#progressMetrics')).toContainText('Progresso geral');
  await expect(page.locator('#progressMetrics')).toContainText('Tópicos estudados');
  await expect(page.locator('#progressMetrics')).toContainText('Revisões');
  await expect(page.locator('#progressMetrics')).toContainText('Tempo esta semana');
  const layout=await page.locator('#progressMetrics').evaluate(el=>({width:innerWidth,columns:getComputedStyle(el).gridTemplateColumns,height:el.getBoundingClientRect().height}));
  if(layout.width>=1180){
    expect(layout.columns.trim().split(/\s+/).length).toBe(4);
    expect(layout.height).toBeLessThan(100);
  }
});
test('estrutura visual preserva respiro, clipping de capas e topbar limpa',async({page})=>{
  await page.goto('/#progress');
  await expect(page.locator('#studyAnalyticsPanel')).toBeVisible();
  await expect(page.locator('#progressInfo .progress-global-panel')).toBeVisible();
  await expect(page.locator('#progressInfo .progress-course-stack')).toBeVisible();
  const spacing=await page.evaluate(()=>({
    rhythm:parseFloat(getComputedStyle(document.querySelector('#studyAnalyticsPanel')).marginTop)||0,
    progress:parseFloat(getComputedStyle(document.querySelector('#progressInfo')).marginTop)||0,
    courses:parseFloat(getComputedStyle(document.querySelector('#progressInfo .progress-course-stack')).marginTop)||0
  }));
  expect(spacing.rhythm).toBeGreaterThanOrEqual(14);
  expect(spacing.rhythm).toBeLessThanOrEqual(20);
  expect(spacing.progress).toBeGreaterThanOrEqual(14);
  expect(spacing.progress).toBeLessThanOrEqual(20);
  expect(spacing.courses).toBeGreaterThanOrEqual(7);
  expect(spacing.courses).toBeLessThanOrEqual(12);

  const topbar=await page.locator('.topbar-wrap').evaluate(el=>{
    const style=getComputedStyle(el);
    return{backgroundImage:style.backgroundImage,backdrop:style.backdropFilter||style.webkitBackdropFilter||'none',boxShadow:style.boxShadow};
  });
  expect(topbar.backgroundImage).toBe('none');
  expect(['none','']).toContain(topbar.backdrop);
  expect(topbar.boxShadow).toBe('none');

  await page.goto('/#course/porto-alegre');
  const card=page.locator('#courseMaps .map-card.has-cover').first();
  await expect(card).toBeVisible();
  const clipping=await card.evaluate(el=>{
    const cover=el.querySelector('.map-cover'),img=cover?.querySelector('img'),cardStyle=getComputedStyle(el),coverStyle=getComputedStyle(cover),imageStyle=getComputedStyle(img),cardBox=el.getBoundingClientRect(),coverBox=cover.getBoundingClientRect();
    return{
      cardOverflow:cardStyle.overflow,
      isolation:cardStyle.isolation,
      coverOverflow:coverStyle.overflow,
      radius:parseFloat(coverStyle.borderTopLeftRadius)||0,
      objectFit:imageStyle.objectFit,
      insideLeft:coverBox.left>=cardBox.left-1,
      insideRight:coverBox.right<=cardBox.right+1,
      insideTop:coverBox.top>=cardBox.top-1
    };
  });
  expect(['clip','hidden']).toContain(clipping.cardOverflow);
  expect(['clip','hidden']).toContain(clipping.coverOverflow);
  expect(clipping.isolation).toBe('isolate');
  expect(clipping.radius).toBeGreaterThan(0);
  expect(clipping.objectFit).toBe('cover');
  expect(clipping.insideLeft&&clipping.insideRight&&clipping.insideTop).toBe(true);
});

test('sistema glass mantém cards e controles na mesma família visual',async({page})=>{
  await page.goto('/#progress');
  await expect(page.locator('#progressMetrics .metric').first()).toBeVisible();
  await expect(page.locator('#studyAnalyticsPanel .panel').first()).toBeVisible();
  const glass=await page.evaluate(()=>{
    const metric=getComputedStyle(document.querySelector('#progressMetrics .metric'));
    const panel=getComputedStyle(document.querySelector('#studyAnalyticsPanel .panel'));
    const secondary=getComputedStyle(document.querySelector('#studyAnalyticsPanel .secondary'));
    const primary=getComputedStyle(document.querySelector('.primary'));
    return{
      metricBg:metric.backgroundImage,
      panelBg:panel.backgroundImage,
      metricRadius:parseFloat(metric.borderTopLeftRadius)||0,
      panelRadius:parseFloat(panel.borderTopLeftRadius)||0,
      secondaryRadius:parseFloat(secondary.borderTopLeftRadius)||0,
      primaryRadius:parseFloat(primary.borderTopLeftRadius)||0,
      panelShadow:panel.boxShadow
    };
  });
  expect(glass.metricBg).toContain('linear-gradient');
  expect(glass.panelBg).toContain('linear-gradient');
  expect(glass.metricRadius).toBeGreaterThanOrEqual(9);
  expect(glass.panelRadius).toBeGreaterThanOrEqual(10);
  expect(Math.abs(glass.secondaryRadius-glass.primaryRadius)).toBeLessThanOrEqual(1);
  expect(glass.panelShadow).not.toBe('none');
});

test('glass de botões fica restrito aos controles sobre capas',async({page})=>{
  await page.goto('/#courses');
  const coverControl=page.locator('#coursesGrid .course-card-edit').first();
  const normalAction=page.locator('#newCourseBtn2');
  await expect(coverControl).toBeVisible();
  await expect(normalAction).toBeVisible();

  const courseStyles=await page.evaluate(()=>{
    const styleOf=selector=>{
      const style=getComputedStyle(document.querySelector(selector));
      return{
        backdrop:style.backdropFilter||style.webkitBackdropFilter||'none',
        backgroundImage:style.backgroundImage,
        borderColor:style.borderTopColor,
        borderWidth:parseFloat(style.borderTopWidth)||0,
        shadow:style.boxShadow,
        transform:style.transform
      };
    };
    return{
      cover:styleOf('#coursesGrid .course-card-edit'),
      normal:styleOf('#newCourseBtn2')
    };
  });
  expect(courseStyles.cover.backdrop).not.toBe('none');
  expect(courseStyles.cover.borderWidth).toBeGreaterThanOrEqual(1);
  expect(courseStyles.cover.shadow).not.toBe('none');
  expect(courseStyles.cover.transform).toBe('none');
  expect(courseStyles.normal.backdrop).toBe('none');

  await page.goto('/#maps');
  const mapCoverControl=page.locator('.map-card.has-cover>.map-admin-btn').first();
  const filterButton=page.locator('#allMapsFilterBtn');
  await expect(mapCoverControl).toBeVisible();
  await expect(filterButton).toBeVisible();
  const mapStyles=await page.evaluate(()=>{
    const styleOf=selector=>{
      const style=getComputedStyle(document.querySelector(selector));
      return{
        backdrop:style.backdropFilter||style.webkitBackdropFilter||'none',
        backgroundImage:style.backgroundImage,
        borderColor:style.borderTopColor,
        borderWidth:parseFloat(style.borderTopWidth)||0,
        shadow:style.boxShadow
      };
    };
    return{
      cover:styleOf('.map-card.has-cover>.map-admin-btn'),
      filter:styleOf('#allMapsFilterBtn')
    };
  });
  expect(mapStyles.cover.backdrop).not.toBe('none');
  expect(mapStyles.cover.borderWidth).toBeGreaterThanOrEqual(1);
  expect(mapStyles.cover.shadow).not.toBe('none');
  expect(mapStyles.filter.backdrop).toBe('none');

  // O botão ••• de curso deve usar o mesmo material visual-base do ••• dos mapas.
  expect(courseStyles.cover.backgroundImage).toBe(mapStyles.cover.backgroundImage);
  expect(courseStyles.cover.backdrop).toBe(mapStyles.cover.backdrop);
  expect(courseStyles.cover.shadow).toBe(mapStyles.cover.shadow);
  expect(courseStyles.cover.borderColor).toBe(mapStyles.cover.borderColor);
});

test('controles sobre capas usam o tamanho compacto uniforme de 38px',async({page},testInfo)=>{
  const measure=async selector=>{
    const el=page.locator(selector).first();
    await expect(el).toBeVisible();
    return el.evaluate(node=>{
      const rect=node.getBoundingClientRect(),icon=node.querySelector('.ui-icon'),iconRect=icon?.getBoundingClientRect();
      return{
        width:rect.width,
        height:rect.height,
        left:rect.left,
        right:rect.right,
        top:rect.top,
        iconWidth:iconRect?.width||0,
        iconHeight:iconRect?.height||0
      };
    });
  };

  await page.goto('/#courses');
  const course=await measure('#coursesGrid .course-card.course-library-card>.course-cover-controls .course-card-edit');

  await page.goto('/#maps');
  const menu=await measure('.map-card.has-cover>.map-admin-btn');
  const favorite=await measure('.map-card.has-cover>.fav');

  await page.goto('/#simulations');
  const simulation=await measure('.simulation-card.has-cover .simulation-card-menu-btn');

  for(const [name,size] of Object.entries({course,menu,favorite,simulation})){
    expect.soft(Math.abs(size.width-38),name+' largura').toBeLessThanOrEqual(.5);
    expect.soft(Math.abs(size.height-38),name+' altura').toBeLessThanOrEqual(.5);
  }
  expect.soft(Math.abs(menu.width-favorite.width),'mapa: ••• e favorito com mesma largura').toBeLessThanOrEqual(.5);
  expect.soft(Math.abs(menu.height-favorite.height),'mapa: ••• e favorito com mesma altura').toBeLessThanOrEqual(.5);

  if(testInfo.project.name==='ipad'){
    const visualGap=favorite.left-menu.right;
    expect.soft(Math.abs(menu.top-favorite.top),'iPad: ••• e favorito alinhados no topo').toBeLessThanOrEqual(.5);
    expect.soft(Math.abs(visualGap-6),'iPad: gap visual entre ••• e favorito').toBeLessThanOrEqual(.5);
    expect.soft(Math.abs(menu.iconWidth-favorite.iconWidth),'iPad: ícones com mesma largura').toBeLessThanOrEqual(.5);
    expect.soft(Math.abs(menu.iconHeight-favorite.iconHeight),'iPad: ícones com mesma altura').toBeLessThanOrEqual(.5);
    expect.soft(Math.abs(menu.iconWidth-16),'iPad: ícone ••• em 16px').toBeLessThanOrEqual(.5);
    expect.soft(Math.abs(favorite.iconWidth-16),'iPad: estrela em 16px').toBeLessThanOrEqual(.5);
  }
});

test('ícones das capas usam preenchimento e contorno preto em camadas separadas',async({page})=>{
  const assertStack=async selector=>{
    const control=page.locator(selector).first();
    await expect(control).toBeVisible();
    await expect(control.locator('.cover-icon-stack')).toHaveCount(1);
    await expect(control.locator('.cover-icon-fill')).toHaveCount(1);
    await expect(control.locator('.cover-icon-stroke')).toHaveCount(1);
    return control.evaluate(el=>{
      const stack=el.querySelector('.cover-icon-stack');
      const fill=el.querySelector('.cover-icon-fill');
      const stroke=el.querySelector('.cover-icon-stroke');
      const sr=stack.getBoundingClientRect(),fr=fill.getBoundingClientRect(),rr=stroke.getBoundingClientRect();
      return{
        stackWidth:sr.width,stackHeight:sr.height,
        fillWidth:fr.width,fillHeight:fr.height,
        strokeWidth:rr.width,strokeHeight:rr.height,
        fillColor:getComputedStyle(fill).backgroundColor,
        strokeColor:getComputedStyle(stroke).backgroundColor,
        strokeFilter:getComputedStyle(stroke).filter||getComputedStyle(stroke).webkitFilter||'none'
      };
    });
  };

  await page.goto('/#courses');
  const course=await assertStack('#coursesGrid .course-card-edit');

  await page.goto('/#maps');
  const menu=await assertStack('.map-card.has-cover>.map-admin-btn');
  const favorite=await assertStack('.map-card.has-cover>.fav');

  await page.goto('/#simulations');
  const simulation=await assertStack('.simulation-card.has-cover .simulation-card-menu-btn');

  for(const [name,icon] of Object.entries({course,menu,favorite,simulation})){
    expect.soft(Math.abs(icon.stackWidth-16),name+' wrapper 16px').toBeLessThanOrEqual(.5);
    expect.soft(Math.abs(icon.fillWidth-16),name+' preenchimento 16px').toBeLessThanOrEqual(.5);
    expect.soft(Math.abs(icon.strokeWidth-16),name+' base do contorno 16px').toBeLessThanOrEqual(.5);
    expect.soft(icon.strokeFilter,name+' contorno usa filtro expansor').not.toBe('none');
    const strokeRgb=(icon.strokeColor.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
    expect.soft(Math.max(...strokeRgb),name+' contorno permanece preto').toBeLessThanOrEqual(20);
  }
});

test('favorito ativo destaca somente a estrela em amarelo',async({page})=>{
  await page.goto('/#maps');
  const fav=page.locator('.map-card.has-cover>.fav').first();
  await expect(fav).toBeVisible();

  if((await fav.getAttribute('aria-pressed'))==='true')await fav.click();
  await expect(fav).toHaveAttribute('aria-pressed','false');
  const off=await fav.locator('.cover-icon-fill').evaluate(el=>getComputedStyle(el).color);

  await fav.click();
  await expect(fav).toHaveAttribute('aria-pressed','true');
  await expect(fav).toHaveClass(/\bon\b/);
  const active=await fav.evaluate(el=>{
    const icon=el.querySelector('.cover-icon-fill');
    const rgb=(getComputedStyle(icon).color.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
    return{
      iconColor:getComputedStyle(icon).color,
      buttonBackdrop:getComputedStyle(el).backdropFilter||getComputedStyle(el).webkitBackdropFilter||'none',
      rgb
    };
  });
  expect(active.iconColor).not.toBe(off);
  expect(active.rgb[0]).toBeGreaterThan(220);
  expect(active.rgb[1]).toBeGreaterThan(170);
  expect(active.rgb[2]).toBeLessThan(120);
  expect(active.buttonBackdrop).not.toBe('none');

  const canHover=await page.evaluate(()=>matchMedia('(hover:hover) and (pointer:fine)').matches);
  if(canHover){
    await fav.hover();
    const hoverRgb=await fav.locator('.cover-icon-fill').evaluate(el=>(getComputedStyle(el).color.match(/[\d.]+/g)||[]).slice(0,3).map(Number));
    expect(hoverRgb[0]).toBeGreaterThan(220);
    expect(hoverRgb[1]).toBeGreaterThan(170);
    expect(hoverRgb[2]).toBeLessThan(120);
  }
});

test('hierarquia tipográfica diferencia página, seção e dados sem desperdício',async({page})=>{
  await page.goto('/#progress');
  const head=page.locator('[data-view="progress"]>.section-head h2');
  await expect(head).toBeVisible();
  await expect(page.locator('#progressInfo .progress-global-head h3')).toBeVisible();
  await expect(page.locator('#progressMetrics .metric').first()).toBeVisible();
  const type=await page.evaluate(()=>{
    const px=selector=>parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)||0;
    const section=document.querySelector('[data-view="progress"]>.section-head');
    return{
      page: px('[data-view="progress"]>.section-head h2'),
      sub: px('#progressInfo .progress-global-head h3'),
      metric: px('#progressMetrics .metric b'),
      label: px('#progressMetrics .metric span'),
      sectionHeight: section?.getBoundingClientRect().height||0,
      sectionOverflow: section ? section.scrollWidth-section.clientWidth : 0
    };
  });
  expect(type.page).toBeGreaterThan(type.sub);
  expect(type.metric).toBeGreaterThan(type.sub);
  expect(type.label).toBeLessThan(type.sub);
  expect(type.sectionHeight).toBeLessThan(90);
  expect(type.sectionOverflow).toBeLessThanOrEqual(1);
});


test('acabamento final mantém foco, alinhamento e transições consistentes',async({page})=>{
  await page.goto('/#home');
  await page.evaluate(()=>document.activeElement?.blur());
  let focus=null;
  for(let i=0;i<8;i++){
    await page.keyboard.press('Tab');
    focus=await page.evaluate(()=>{
      const el=document.activeElement,style=el?getComputedStyle(el):null;
      return{
        tag:el?.tagName||'',
        visible:!!el&&!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length),
        outlineStyle:style?.outlineStyle||'none',
        outlineWidth:parseFloat(style?.outlineWidth)||0,
        outlineColor:style?.outlineColor||''
      };
    });
    if(focus.visible&&focus.outlineStyle!=='none'&&focus.outlineWidth>=1)break;
  }
  expect(['BUTTON','A','INPUT','SELECT','TEXTAREA']).toContain(focus.tag);
  expect(focus.outlineStyle).not.toBe('none');
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(1);

  const primary=page.locator('button.primary:visible').first();
  await expect(primary).toBeVisible();
  const control=await primary.evaluate(el=>{
    const style=getComputedStyle(el);
    return{display:style.display,alignItems:style.alignItems,justifyContent:style.justifyContent,transition:style.transitionDuration};
  });
  expect(['flex','inline-flex']).toContain(control.display);
  expect(control.alignItems).toBe('center');
  expect(control.justifyContent).toBe('center');
  expect(control.transition).not.toBe('0s');

  await page.goto('/#courses');
  const card=page.locator('#coursesGrid .course-card').first();
  await expect(card).toBeVisible();
  const cardStyle=await card.evaluate(el=>({transition:getComputedStyle(el).transitionDuration,shadow:getComputedStyle(el).boxShadow}));
  expect(cardStyle.transition).not.toBe('0s');
  expect(cardStyle.shadow).not.toBe('none');
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
    const response=await fetch('./assets/home-hero-panel-hq.webp',{cache:'no-store'});
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
      statCount:[...stats.children].filter(el=>getComputedStyle(el).display!=='none').length,
      statColumns:getComputedStyle(stats).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
      topbarHeight:topbar.getBoundingClientRect().height,
      searchHeight:document.querySelector('.search').getBoundingClientRect().height,
      syncHeight:document.querySelector('#syncTop').getBoundingClientRect().height,
      backgroundSize:style.backgroundSize
    };
  });
  expect.soft(home.isIpad,'classe is-ipad deve estar ativa').toBe(true);
  expect.soft(home.heroHeight,'hero deve permanecer compacto no iPad landscape').toBeLessThanOrEqual(280);
  expect.soft(home.statCount,'home deve mostrar quatro indicadores no iPad').toBe(4);
  expect.soft(home.statColumns,'indicadores do iPad devem formar grade 2x2').toBe(2);
  expect.soft(home.searchHeight,'busca deve permanecer compacta').toBeLessThanOrEqual(40);
  expect.soft(Math.round(home.syncHeight),'Sincronizar deve preservar alvo touch de 44px').toBeGreaterThanOrEqual(44);
  expect.soft(home.topbarHeight,'topbar deve caber em até 58px sem reduzir o alvo touch').toBeLessThanOrEqual(58);
  expect.soft(home.backgroundSize,'hero deve preservar enquadramento full-cover').toBe('cover');

  await page.locator('#homeCourses [data-course="porto-alegre"]').click();
  const card=page.locator('#courseMaps .map-card.has-cover').first();
  await expect(card).toBeVisible();
  const controls=await card.evaluate(el=>({
    favorite:el.querySelector('.fav')?.getBoundingClientRect().width||0,
    menu:el.querySelector('.map-admin-btn')?.getBoundingClientRect().width||0
  }));
  expect.soft(controls.favorite,'favorito visual deve ficar compacto').toBeLessThanOrEqual(44);
  expect.soft(controls.menu,'menu visual deve ficar compacto').toBeLessThanOrEqual(44);

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



test('A Home responsiva mantém Retomar e Simulados lado a lado no iPad',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação específica da Home responsiva no iPad.');
  for(const scenario of [
    {name:'landscape',width:1194,height:834,maxHeroHeight:270,intelligenceColumns:3},
    {name:'portrait',width:820,height:1180,maxHeroHeight:315,intelligenceColumns:2}
  ]){
    await page.setViewportSize({width:scenario.width,height:scenario.height});
    await page.goto('/#home');
    await page.waitForFunction(()=>typeof combinedMaps==='function'&&combinedMaps().length>0);
    await page.evaluate(()=>{const map=combinedMaps()[0];localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));renderHome();StudyCoach.renderHome?.();StudyPlanner.renderHome?.()});
    await expect(page.locator('.home-continue-section')).toBeVisible();
    await expect(page.locator('.home-simulations-section')).toBeVisible();
    await expect(page.locator('#homeSimulations .simulation-recent-item')).toHaveCount(3);
    const data=await page.evaluate(()=>{
      const home=document.querySelector('[data-view="home"]');
      const sims=document.querySelector('.simulation-recent-list');
      const intel=document.querySelector('.study-intelligence-row');
      const courses=document.querySelector('#homeCourses');
      const hero=document.querySelector('[data-view="home"] .hero');
      const resume=document.querySelector('.home-continue-section');
      const simSection=document.querySelector('.home-simulations-section');
      const third=document.querySelector('#homeSimulations .simulation-recent-item:nth-child(3)');
      const action=document.querySelector('#continueBox .continue-card>.primary');
      const hr=home.getBoundingClientRect(),rr=resume.getBoundingClientRect(),sr=simSection.getBoundingClientRect();
      const cols=el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
      return{
        width:innerWidth,
        scrollWidth:document.documentElement.scrollWidth,
        heroHeight:hero.getBoundingClientRect().height,
        sameRow:Math.abs(rr.top-sr.top)<2,
        resumeShare:rr.width/hr.width,
        simShare:sr.width/hr.width,
        simDisplay:getComputedStyle(sims).display,
        simColumns:getComputedStyle(sims).display==='grid'?cols(sims):0,
        intelligenceColumns:cols(intel),
        courseColumns:cols(courses),
        thirdDisplay:getComputedStyle(third).display,
        continueActionHeight:action?.getBoundingClientRect().height||0
      };
    });
    expect.soft(data.scrollWidth,scenario.name+' sem overflow horizontal').toBeLessThanOrEqual(data.width+2);
    expect.soft(data.heroHeight,scenario.name+' hero compacto').toBeLessThanOrEqual(scenario.maxHeroHeight);
    expect.soft(data.sameRow,scenario.name+' Retomar e Simulados ficam na mesma linha').toBe(true);
    expect.soft(data.resumeShare,scenario.name+' Retomar ocupa uma coluna útil').toBeGreaterThan(.40);
    expect.soft(data.resumeShare,scenario.name+' Retomar não domina a linha').toBeLessThan(.58);
    expect.soft(data.simShare,scenario.name+' Simulados ocupa uma coluna útil').toBeGreaterThan(.38);
    expect.soft(data.simShare,scenario.name+' Simulados não domina a linha').toBeLessThan(.56);
    expect.soft(data.thirdDisplay,scenario.name+' terceiro simulado permanece visível').not.toBe('none');
    expect.soft(Math.round(data.continueActionHeight),scenario.name+' ação Retomar preserva alvo touch').toBeGreaterThanOrEqual(44);
    expect.soft(data.courseColumns,scenario.name+' cursos').toBe(2);
    expect.soft(data.intelligenceColumns,scenario.name+' inteligência').toBe(scenario.intelligenceColumns);
    expect.soft(data.simDisplay,scenario.name+' simulados em lista compacta').toBe('grid');
    expect.soft(data.simColumns,scenario.name+' simulados usam uma coluna dentro da faixa').toBe(1);
  }
});
test('B Biblioteca e treino adapta Desktop e iPad sem overflow',async({page},testInfo)=>{
  test.skip(!['desktop-chromium','ipad'].includes(testInfo.project.name),'Validação de Desktop e iPad.');
  const scenarios=testInfo.project.name==='desktop-chromium'
    ?[{name:'desktop',width:1600,height:900,courses:3,maps:3,simulations:3,simulationToolbar:2,courseToolbar:1}]
    :[
      {name:'ipad landscape',width:1194,height:834,courses:3,maps:3,simulations:3,simulationToolbar:2,courseToolbar:1},
      {name:'ipad portrait',width:820,height:1180,courses:2,maps:2,simulations:2,simulationToolbar:2,courseToolbar:1},
      {name:'ipad split',width:640,height:900,courses:1,maps:1,simulations:1,simulationToolbar:1,courseToolbar:1}
    ];
  const columns=async locator=>locator.evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length);
  const assertNoOverflow=async label=>{
    const size=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    expect.soft(size.scrollWidth,label+' sem overflow horizontal').toBeLessThanOrEqual(size.width+2);
  };
  for(const scenario of scenarios){
    await page.setViewportSize({width:scenario.width,height:scenario.height});

    await page.goto('/#courses');
    await expect(page.locator('#coursesGrid .course-card').first()).toBeVisible();
    expect.soft(await columns(page.locator('#coursesGrid')),scenario.name+' Meus Cursos').toBe(scenario.courses);
    if(testInfo.project.name==='ipad'){
      const target=await page.locator('#coursesGrid .course-card .enter').first().evaluate(el=>el.getBoundingClientRect().height);
      expect.soft(Math.round(target),scenario.name+' Entrar touch').toBeGreaterThanOrEqual(44);
    }
    await assertNoOverflow(scenario.name+' Meus Cursos');

    await page.goto('/#course/porto-alegre');
    await expect(page.locator('#courseMaps .map-card').first()).toBeVisible();
    const courseToolbarDisplay=await page.locator('.course-toolbar').evaluate(el=>getComputedStyle(el).display);
    expect.soft(courseToolbarDisplay,scenario.name+' toolbar do curso').toBe('flex');
    expect.soft(await columns(page.locator('#courseMaps')),scenario.name+' mapas do curso').toBe(scenario.maps);
    await expect(page.locator('.course-search-box')).toBeHidden();
    await expect(page.locator('#globalSearch')).toBeVisible();
    await assertNoOverflow(scenario.name+' Curso');

    await page.goto('/#maps');
    await expect(page.locator('#allMaps .map-card').first()).toBeVisible();
    expect.soft(await columns(page.locator('#allMaps')),scenario.name+' Todos os Mapas').toBe(scenario.maps);
    await assertNoOverflow(scenario.name+' Todos os Mapas');

    await page.goto('/#simulations');
    await expect(page.locator('#simulationGrid .simulation-card').first()).toBeVisible();
    expect.soft(await columns(page.locator('#simulationGrid')),scenario.name+' Simulados').toBe(scenario.simulations);
    expect.soft(await columns(page.locator('.simulation-toolbar')),scenario.name+' toolbar Simulados').toBe(scenario.simulationToolbar);
    await expect(page.locator('.simulation-search')).toBeHidden();
    await expect(page.locator('#globalSearch')).toBeVisible();
    await assertNoOverflow(scenario.name+' Simulados');
  }
});

test('C Ferramentas adapta Progresso Agenda Configurações e modais no iPad',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva de tablet.');
  const scenarios=[
    {name:'landscape',width:1194,height:834,insights:2,rhythm:2,agenda:2,agendaSide:null,settings:2},
    {name:'portrait',width:820,height:1180,insights:1,rhythm:1,agenda:1,agendaSide:2,settings:1},
    {name:'split',width:640,height:900,insights:1,rhythm:1,agenda:1,agendaSide:1,settings:1}
  ];
  const columns=async locator=>locator.evaluate(el=>{
    const value=getComputedStyle(el).gridTemplateColumns.trim();
    return value&&value!=='none'?value.split(/\s+/).filter(Boolean).length:0;
  });
  const noOverflow=async label=>{
    const data=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    expect.soft(data.scrollWidth,label+' sem overflow').toBeLessThanOrEqual(data.width+2);
  };

  for(const s of scenarios){
    await page.setViewportSize({width:s.width,height:s.height});

    await page.goto('/#progress');
    await expect(page.locator('#progressMetrics .metric').first()).toBeVisible();
    await expect(page.locator('.progress-insights-grid')).toBeVisible();
    await expect(page.locator('.study-rhythm-shell')).toBeVisible();
    await expect(page.locator('#progressMetrics .metric'),s.name+' mantém quatro KPIs').toHaveCount(4);
    const metricRows=await page.locator('#progressMetrics .metric').evaluateAll(nodes=>{
      const tops=nodes.map(el=>Math.round(el.getBoundingClientRect().top));
      return [...new Set(tops)].length;
    });
    expect.soft(metricRows,s.name+' mantém os quatro KPIs em no máximo duas linhas').toBeLessThanOrEqual(2);
    expect.soft(await columns(page.locator('.progress-insights-grid')),s.name+' próximas ações').toBe(s.insights);
    expect.soft(await columns(page.locator('.study-rhythm-shell')),s.name+' ritmo').toBe(s.rhythm);
    const progressTouch=await page.locator('[data-progress-course-toggle]').first().evaluate(el=>el.getBoundingClientRect().height);
    expect.soft(Math.round(progressTouch),s.name+' ação de progresso touch').toBeGreaterThanOrEqual(44);
    await noOverflow(s.name+' Progresso');

    await page.goto('/#agenda');
    await expect(page.locator('.study-agenda-layout')).toBeVisible();
    expect.soft(await columns(page.locator('.study-agenda-layout')),s.name+' Agenda').toBe(s.agenda);
    if(s.agendaSide!==null)expect.soft(await columns(page.locator('.study-agenda-side')),s.name+' painel lateral Agenda').toBe(s.agendaSide);
    const agendaTouch=await page.locator('.study-agenda-modes button').first().evaluate(el=>el.getBoundingClientRect().height);
    expect.soft(Math.round(agendaTouch),s.name+' modo Agenda touch').toBeGreaterThanOrEqual(44);
    await noOverflow(s.name+' Agenda');

    await page.goto('/#settings');
    await expect(page.locator('.settings-layout-v3')).toBeVisible();
    expect.soft(await columns(page.locator('.settings-layout-v3')),s.name+' Configurações').toBe(s.settings);
    const settingsTouch=await page.locator('#checkAppUpdateBtn').evaluate(el=>el.getBoundingClientRect().height);
    expect.soft(Math.round(settingsTouch),s.name+' Configurações touch').toBeGreaterThanOrEqual(44);
    if(s.settings===1){
      const order=await page.evaluate(()=>{
        const primary=document.querySelector('.settings-column-primary');
        const secondary=document.querySelector('.settings-column-secondary');
        return{primary:parseInt(getComputedStyle(primary).order)||0,secondary:parseInt(getComputedStyle(secondary).order)||0};
      });
      expect.soft(order.primary,s.name+' conta priorizada').toBeLessThan(order.secondary);
    }

    await page.evaluate(()=>document.getElementById('confirmModal')?.classList.add('open'));
    await expect(page.locator('#confirmModal')).toHaveClass(/open/);
    const modal=await page.locator('#confirmModal .modal-card').evaluate(el=>{
      const box=el.getBoundingClientRect(),close=el.querySelector('.close')?.getBoundingClientRect();
      return{left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height,close:close?.height||0};
    });
    expect.soft(modal.left,s.name+' modal esquerda').toBeGreaterThanOrEqual(0);
    expect.soft(modal.right,s.name+' modal direita').toBeLessThanOrEqual(s.width);
    expect.soft(modal.top,s.name+' modal topo').toBeGreaterThanOrEqual(0);
    expect.soft(modal.bottom,s.name+' modal base').toBeLessThanOrEqual(s.height);
    expect.soft(Math.round(modal.close),s.name+' fechar modal touch').toBeGreaterThanOrEqual(44);
    await page.evaluate(()=>document.getElementById('confirmModal')?.classList.remove('open'));
    await noOverflow(s.name+' Configurações');
  }
});

test('[T] Reader mantém topbar em uma linha e iniciar estudo não ativa foco',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva do Reader no iPad.');
  for(const scenario of [{name:'retrato',width:820,height:1180},{name:'paisagem',width:1194,height:834}]){
    await page.setViewportSize({width:scenario.width,height:scenario.height});
    await page.goto('/#course/porto-alegre');
    const card=page.locator('#courseMaps [data-map]').first();
    await expect(card).toBeVisible();
    await card.click();
    const reader=page.locator('#reader'),bar=page.locator('#reader .readerbar');
    await expect(reader).toHaveClass(/open/);
    const geometry=await bar.evaluate(el=>{
      const barBox=el.getBoundingClientRect();
      const visible=[...el.children].filter(node=>getComputedStyle(node).display!=='none'&&!node.hidden);
      const more=el.querySelector('#readerMoreBtn')?.getBoundingClientRect();
      return{
        height:barBox.height,
        allInside:visible.every(node=>{const r=node.getBoundingClientRect();return r.top>=barBox.top-1&&r.bottom<=barBox.bottom+1}),
        moreInside:!!more&&more.top>=barBox.top-1&&more.bottom<=barBox.bottom+1,
        titleMinWidth:getComputedStyle(el.querySelector('.title')).minWidth
      };
    });
    expect.soft(geometry.height,scenario.name+' topbar compacta').toBeLessThanOrEqual(60);
    expect.soft(geometry.allInside,scenario.name+' todos os controles ficam na mesma linha').toBe(true);
    expect.soft(geometry.moreInside,scenario.name+' botão Mais não cai para segunda linha').toBe(true);
    expect.soft(geometry.titleMinWidth,scenario.name+' título pode encolher').toBe('0px');

    await page.evaluate(()=>{
      const key='studyapp.studyDashboard.v1';
      const raw=JSON.parse(localStorage.getItem(key)||'{}');
      raw.goals={...(raw.goals||{}),autoFocus:true};
      localStorage.setItem(key,JSON.stringify(raw));
    });
    const handle=page.locator('#ipadReaderRailHandle');
    if(await handle.count()&&await reader.evaluate(el=>el.classList.contains('ipad-reader-rail-collapsed')))await handle.click();
    const start=page.locator('[data-rail-session]');
    await expect(start).toBeVisible();
    await expect(start).toContainText('Iniciar estudo');
    await start.click();
    await expect(reader).not.toHaveClass(/focus-mode/);
    expect(await page.evaluate(()=>StudyDashboard.active()?.running===true)).toBe(true);
    expect(await page.evaluate(()=>StudyDashboard.goals().autoFocus)).toBe(false);
    await page.evaluate(()=>StudyDashboard.finish({silent:true,suppressSummary:true}));
    await page.locator('#readerClose').click();
  }
});

test('iPad usa dock lateral recolhível no leitor',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação específica do dock lateral do iPad.');
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/#course/porto-alegre');
  const card=page.locator('#courseMaps [data-map]').first();
  await expect(card).toBeVisible();
  await card.click();
  const reader=page.locator('#reader'),handle=page.locator('#ipadReaderRailHandle'),quick=page.locator('#readerDoubtQuick');
  await expect(reader).toHaveClass(/open/);
  await expect(reader).toHaveClass(/ipad-reader-rail-collapsed/);
  await expect(handle).toBeVisible();
  await expect(handle).toHaveAttribute('aria-expanded','false');
  await expect(quick).toBeHidden();
  await handle.click();
  await expect(reader).not.toHaveClass(/ipad-reader-rail-collapsed/);
  await expect(handle).toHaveAttribute('aria-expanded','true');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('studyapp.ipadReaderDock.v1')||'{}').collapsed)).toBe(false);
  await handle.click();
  await expect(reader).toHaveClass(/ipad-reader-rail-collapsed/);
  await expect(handle).toHaveAttribute('aria-expanded','false');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('studyapp.ipadReaderDock.v1')||'{}').collapsed)).toBe(true);
});

test('iPad vertical restaura sete destinos diretos no dock',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação específica do app no iPad vertical.');
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/#home');
  await expect(page.locator('.side')).toBeHidden();
  await expect(page.locator('.bottom-nav')).toBeVisible();
  const visibleNav=await page.locator('.bottom-nav>button').evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=='none').map(el=>el.dataset.nav||el.id));
  expect(visibleNav).toEqual(['home','courses','maps','simulations','agenda','progress','settings']);
  await expect(page.locator('.bottom-nav [data-nav="simulations"]')).toBeVisible();
  await expect(page.locator('.bottom-nav [data-nav="agenda"]')).toBeVisible();
  await expect(page.locator('.bottom-nav [data-nav="agenda"] .bottom-nav-label')).toHaveText('Calendário');
  await expect(page.locator('.bottom-nav [data-nav="settings"]')).toContainText('Mais');
  await expect(page.locator('#tabletMoreShortcuts')).toHaveCount(0);
  await page.locator('.bottom-nav [data-nav="simulations"]').click();
  await expect(page.locator('[data-view="simulations"]')).toHaveClass(/active/);
  await page.locator('.bottom-nav [data-nav="agenda"]').click();
  await expect(page.locator('[data-view="agenda"]')).toHaveClass(/active/);
});
test('iPad nunca recebe o Menu exclusivo de smartphone',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva de tablet.');
  for(const size of [{width:820,height:1180},{width:640,height:900},{width:430,height:760}]){
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

test('Agenda distingue Dia do comando Hoje e reduz modo semanal vazio',async({page})=>{
  await page.goto('/#agenda');
  await expect(page.locator('[data-agenda-mode="today"]')).toHaveText('Dia');
  await expect(page.locator('[data-agenda-today]')).toHaveText('Hoje');
  await page.locator('[data-agenda-mode="week"]').click();
  await expect(page.locator('[data-view="agenda"]')).toHaveAttribute('data-agenda-display-mode','week');
  const h=await page.locator('.study-agenda-calendar').evaluate(el=>el.getBoundingClientRect().height);
  expect(h).toBeLessThan(520);
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
  await page.waitForFunction(()=>typeof state==='undefined'||state.cloudLoading===false);
  const form=page.locator('#studyGoalsForm');
  await form.locator('[name="dailyMinutes"]').fill('1h 30min');
  await form.locator('[name="weeklyMinutes"]').fill('8h');
  await form.locator('button[type="submit"]').click();
  const goals=await page.evaluate(()=>StudyDashboard.goals());
  expect(goals.dailyMinutes).toBe(90);
  expect(goals.weeklyMinutes).toBe(480);
  await page.goto('/#progress');
  await expect(page.locator('#studyAnalyticsPanel')).toBeVisible();
  await expect(page.locator('.study-heatmap i')).toHaveCount(84);
});

test('configurações permitem zerar tempo sem apagar sessão ou progresso',async({page})=>{
  await page.goto('/#settings');
  const setup=await page.evaluate(()=>{const map=combinedMaps()[0],key=map._key||mapKey(map),now=new Date().toISOString(),data=StudyDashboard.exportData(),id='time-reset-e2e-'+Date.now();StudyTime.add(key,120,new Date(now));data.sessions.push({id,mapKey:key,courseId:map.courseId||'',label:'Sessão preservada',agendaId:'',mode:'free',plannedSeconds:0,durationSeconds:120,startedAt:now,endedAt:now,createdAt:now,updatedAt:now,startProgress:null});StudyDashboard.importData(data,{merge:false,silent:true});renderSettings();return{id,key,before:StudyTime.today(),revision:StudyTime.read().revision}});
  expect(setup.before).toBeGreaterThanOrEqual(120);
  const manage=page.locator('.study-time-manage');
  await expect(manage).toBeVisible();
  await manage.locator('summary').click();
  await expect(manage).toHaveAttribute('open','');
  const reset=page.locator('[data-study-time-reset="today"]');
  await expect(reset).toBeVisible();
  await reset.click();
  await expect(page.locator('#confirmModal')).toHaveClass(/open/);
  await expect(page.locator('#confirmText')).toContainText('Sessões e progresso dos mapas não serão apagados');
  await page.locator('#confirmAccept').click();
  const result=await page.evaluate(({id,key})=>({today:StudyTime.today(),map:StudyTime.mapSeconds(key),revision:StudyTime.read().revision,session:StudyDashboard.exportData().sessions.find(row=>row.id===id)}),setup);
  expect(result.today).toBe(0);
  expect(result.map).toBe(0);
  expect(result.revision).toBeGreaterThan(setup.revision);
  expect(result.session?.deleted).not.toBe(true);
});

test('limpeza inicial remove tempo legado órfão e vence cópia antiga da nuvem',async({page})=>{
  const result=await page.evaluate(()=>{const key='legacy-e2e',today=StudyTime.todayKey(),legacy={version:1,devices:{old:{days:{[today]:780},maps:{[key]:780}}}};localStorage.setItem('studyapp.studyTime',JSON.stringify(legacy));localStorage.removeItem('studyapp.studyTime.manualBaseline.v1');const data=StudyDashboard.exportData();data.sessions=[];StudyDashboard.importData(data,{merge:false,silent:true});const migrated=StudyTime.migrateLegacy();const local=StudyTime.read(),merged=studyTimeMergeData(local,legacy);return{migrated,today:StudyTime.today(),all:StudyTime.all(),revision:local.revision,mergedRevision:merged.revision,mergedDevices:Object.keys(merged.devices||{}).length}});
  expect(result.migrated).toBe(true);
  expect(result.today).toBe(0);
  expect(result.all).toBe(0);
  expect(result.revision).toBeGreaterThan(0);
  expect(result.mergedRevision).toBe(result.revision);
  expect(result.mergedDevices).toBe(0);
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
  await expect(page.locator('[data-matrix-back]')).toBeVisible();
  await page.locator('[data-matrix-back]').click();
  await expect(page.locator('[data-view="progress"]')).toHaveClass(/active/);
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


test('Home usa CTA Começar no card de prioridade',async({page})=>{
  await page.goto('/#home');
  const cta=page.locator('[data-priority-open]').first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveText(/^Começar · \d+ min$/);
  await expect(page.locator('.priority-now-card')).toContainText('Prioridade agora');
  await expect(page.locator('.priority-now-card .priority-reason-chip').first()).toBeVisible();
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

test('Progresso adapta as decisões e mantém prioridades recolhidas',async({page})=>{
  await page.goto('/#progress');
  const panel=page.locator('#studyIntelligencePanel');
  const actions=panel.locator('.intelligence-primary-actions>article');
  const count=await actions.count();
  expect(count).toBeGreaterThanOrEqual(2);
  expect(count).toBeLessThanOrEqual(4);
  await expect(panel.locator('.intelligence-action-forecast')).toBeVisible();
  await expect(panel.locator('.intelligence-action-week')).toBeVisible();
  const pending=await panel.locator('.intelligence-action-review,.intelligence-action-errors').count();
  if(pending===0)await expect(panel.locator('.progress-intelligence-status.is-clear')).toContainText('Tudo sob controle');
  const details=panel.locator('.priority-details');
  await expect(details).toBeVisible();
  await expect(details).not.toHaveAttribute('open');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open','');
  const priorities=await details.locator('.priority-engine-grid>article').count();
  expect(priorities).toBeGreaterThan(0);
  expect(priorities).toBeLessThanOrEqual(3);
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
    if(scenario.height>scenario.width){
      await expect(page.locator('.side')).toBeHidden();
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
  const size=await card.evaluate(el=>{
    const cover=el.querySelector('.map-cover'),fav=el.querySelector('.fav'),menu=el.querySelector('.map-admin-btn'),progress=el.querySelector('.map-progress-mini'),foot=el.querySelector('.foot');
    return{
      height:el.getBoundingClientRect().height,
      cover:cover?.getBoundingClientRect().height||0,
      fav:fav?.getBoundingClientRect().width||0,
      menu:menu?.getBoundingClientRect().width||0,
      metaDisplay:getComputedStyle(el.querySelector('.meta')).display,
      progressBorder:parseFloat(getComputedStyle(progress).borderTopWidth)||0,
      progressBackground:getComputedStyle(progress).backgroundImage,
      footBorder:parseFloat(getComputedStyle(foot).borderTopWidth)||0,
      favBefore:getComputedStyle(fav,'::before').content
    };
  });
  expect.soft(size.height).toBeGreaterThanOrEqual(240);
  expect.soft(size.height).toBeLessThanOrEqual(300);
  expect.soft(size.cover).toBeGreaterThanOrEqual(105);
  expect.soft(size.cover).toBeLessThanOrEqual(115);
  expect.soft(size.fav).toBeGreaterThanOrEqual(36);
  expect.soft(size.fav).toBeLessThanOrEqual(40);
  expect.soft(size.menu).toBeGreaterThanOrEqual(36);
  expect.soft(size.menu).toBeLessThanOrEqual(40);
  expect.soft(size.metaDisplay).toBe('none');
  expect.soft(size.progressBorder).toBe(0);
  expect.soft(size.progressBackground).toBe('none');
  expect.soft(size.footBorder).toBe(0);
  expect.soft(size.favBefore).not.toBe('none');
});

test('smartphone reorganiza Progresso na ordem de decisão',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#progress');
  await page.waitForTimeout(100);
  const groups=page.locator('[data-view="progress"] .mobile-progress-group');
  await expect(groups).toHaveCount(5);
  const order=await groups.evaluateAll(nodes=>nodes.map(node=>node.dataset.mobileProgressGroup));
  expect(order).toEqual(['summary','attention','rhythm','subjects','notes']);
  await expect(page.locator('[data-mobile-progress-group="summary"]')).toHaveAttribute('open','');
  await expect(page.locator('[data-mobile-progress-group="attention"]')).toHaveAttribute('open','');
  await expect(page.locator('[data-mobile-progress-group="rhythm"]')).toHaveAttribute('open','');
  await expect(page.locator('[data-mobile-progress-group="subjects"]')).not.toHaveAttribute('open');
  await expect(page.locator('[data-mobile-progress-group="notes"]')).not.toHaveAttribute('open');
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

test('smartphone Mais abre Agenda Simulados e Configurações em bottom sheet',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  const trigger=page.locator('#mobileMenuBtn');
  await expect(trigger).toBeVisible();
  await expect(trigger).toContainText('Mais');
  await trigger.click();
  const layer=page.locator('#mobileMenuLayer');
  await expect(layer).toBeVisible();
  await expect(layer.locator('#mobileMenuTitle')).toHaveText('Mais');
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


test('iPhone real UX2 compacta Home e mostra simulados em lista vertical',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  await expect(page.locator('.simulation-recent-list')).toBeVisible();
  await expect(page.locator('.mobile-study-plan-toggle')).toBeVisible();
  const data=await page.evaluate(()=>({
    hero:document.querySelector('[data-view="home"] .hero').getBoundingClientRect().height,
    metricVisible:[...document.querySelectorAll('.study-command-metrics>button')].filter(el=>getComputedStyle(el).display!=='none').length,
    simDisplay:getComputedStyle(document.querySelector('.simulation-recent-list')).display,
    simOverflow:getComputedStyle(document.querySelector('.simulation-recent-list')).overflowX,
    simWidth:document.querySelector('.simulation-recent-list').getBoundingClientRect().width,
    firstSimWidth:document.querySelector('.simulation-recent-item')?.getBoundingClientRect().width||0,
    navHeight:document.querySelector('.bottom-nav').getBoundingClientRect().height
  }));
  expect(data.hero).toBeLessThanOrEqual(270);
  expect(data.metricVisible).toBe(2);
  expect(data.simDisplay).toBe('grid');
  expect(['visible','clip']).toContain(data.simOverflow);
  expect(Math.abs(data.firstSimWidth-data.simWidth)).toBeLessThanOrEqual(2);
  expect(data.navHeight).toBeLessThanOrEqual(60);
  await page.locator('.mobile-study-plan-toggle').click();
  await expect.poll(()=>page.locator('.study-command-metrics>button').evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=='none').length),{timeout:2500}).toBeGreaterThanOrEqual(4);
});

test('A Home responsiva preserva a composição aprovada no iPhone',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='iphone-webkit','Validação específica do iPhone WebKit.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  await expect(page.locator('#homeSimulations .simulation-recent-item')).toHaveCount(3);
  const data=await page.evaluate(()=>{
    const sims=document.querySelector('.simulation-recent-list');
    const action=document.querySelector('#homeSimulations .simulation-recent-action');
    const courses=document.querySelector('#homeCourses');
    return{
      width:innerWidth,
      scrollWidth:document.documentElement.scrollWidth,
      heroHeight:document.querySelector('[data-view="home"] .hero').getBoundingClientRect().height,
      simDisplay:getComputedStyle(sims).display,
      simOverflow:getComputedStyle(sims).overflowX,
      thirdDisplay:getComputedStyle(document.querySelector('#homeSimulations .simulation-recent-item:nth-child(3)')).display,
      actionHeight:action?.getBoundingClientRect().height||0,
      courseColumns:getComputedStyle(courses).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
    };
  });
  expect(data.scrollWidth).toBeLessThanOrEqual(data.width+2);
  expect(data.heroHeight).toBeLessThanOrEqual(270);
  expect(data.simDisplay).toBe('grid');
  expect(['visible','clip']).toContain(data.simOverflow);
  expect(data.thirdDisplay).not.toBe('none');
  expect(data.actionHeight).toBeGreaterThanOrEqual(70);
  expect(data.courseColumns).toBe(1);
});

test('revisão de vídeo remove IDs técnicos e mantém controles essenciais',async({page})=>{
  await page.goto('/#course/porto-alegre');
  await expect(page.locator('#layoutGrid')).toBeHidden();
  await expect(page.locator('#layoutList')).toBeHidden();

  await page.goto('/#simulations');
  const code=page.locator('#simulationGrid .simulation-code').first();
  await expect(code).toBeVisible();
  const label=(await code.innerText()).trim();
  expect(label.length).toBeLessThanOrEqual(12);
  expect(label).not.toMatch(/::|_[A-Z0-9]{3,}_/);

  await page.goto('/#progress');
  const mapLabels=await page.locator('.study-rhythm-distribution .study-ranking-row>span').allInnerTexts().catch(()=>[]);
  for(const text of mapLabels)expect(text).not.toMatch(/^[a-z0-9-]+::/);

  await page.goto('/#settings');
  await expect(page.locator('#studyGoalsForm [name="dailyMinutes"]+small')).toHaveText('h');
  await expect(page.locator('#studyGoalsForm [name="weeklyMinutes"]+small')).toHaveText('h');
  await expect(page.locator('#studyGoalsForm [name="pomodoroWork"]+small')).toHaveText('min');
  await expect(page.locator('#studyGoalsForm [name="pomodoroBreak"]+small')).toHaveText('min');
});

test('B Biblioteca e treino preserva o mobile-first no iPhone',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='iphone-webkit','Validação específica do iPhone WebKit.');
  await page.setViewportSize({width:390,height:844});
  const columns=async locator=>locator.evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length);
  const assertPhone=async label=>{
    await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
    const size=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    expect.soft(size.scrollWidth,label+' sem overflow horizontal').toBeLessThanOrEqual(size.width+2);
  };

  await page.goto('/#courses');
  await expect(page.locator('#coursesGrid .course-card').first()).toBeVisible();
  expect(await columns(page.locator('#coursesGrid'))).toBe(1);
  await expect(page.locator('#coursesGrid .mobile-course-details').first()).toBeVisible();
  await assertPhone('Meus Cursos');

  await page.goto('/#course/porto-alegre');
  await expect(page.locator('#courseMaps .map-card').first()).toBeVisible();
  expect(await columns(page.locator('#courseMaps'))).toBe(1);
  await expect(page.locator('.mobile-course-actions')).toBeVisible();
  await assertPhone('Curso');

  await page.goto('/#maps');
  await expect(page.locator('#allMaps .map-card').first()).toBeVisible();
  expect(await columns(page.locator('#allMaps'))).toBe(1);
  await assertPhone('Todos os Mapas');

  await page.goto('/#simulations');
  await expect(page.locator('#simulationGrid .simulation-card').first()).toBeVisible();
  expect(await columns(page.locator('#simulationGrid'))).toBe(1);
  expect(await columns(page.locator('.simulation-toolbar'))).toBe(2);
  const action=await page.locator('#importSimulationBtn').evaluate(el=>el.getBoundingClientRect().height);
  expect(action).toBeGreaterThanOrEqual(40);
  await assertPhone('Simulados');
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
  await expect(page.locator('html')).toHaveClass(/mobile-reader-open/);
  await page.waitForFunction(()=>document.querySelector('.readerbar')?.getBoundingClientRect().height<=54);
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

test('C Ferramentas preserva Progresso Agenda Configurações e modais no iPhone',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='iphone-webkit','Validação exclusiva do iPhone WebKit.');
  await page.setViewportSize({width:390,height:844});
  const columns=async locator=>locator.evaluate(el=>{
    const value=getComputedStyle(el).gridTemplateColumns.trim();
    return value&&value!=='none'?value.split(/\s+/).filter(Boolean).length:0;
  });
  const noOverflow=async label=>{
    const data=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    expect.soft(data.scrollWidth,label+' sem overflow').toBeLessThanOrEqual(data.width+2);
  };

  await page.goto('/#progress');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  expect(await columns(page.locator('#progressMetrics'))).toBe(2);
  const visibleMetrics=await page.locator('#progressMetrics .metric').evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=='none').length);
  expect(visibleMetrics).toBe(4);
  await noOverflow('Progresso iPhone');

  await page.goto('/#agenda');
  await expect(page.locator('[data-view="agenda"]')).toHaveAttribute('data-mobile-agenda-mode','today');
  expect(await columns(page.locator('.study-agenda-layout'))).toBe(1);
  await noOverflow('Agenda iPhone');

  await page.goto('/#settings');
  const openPanels=await page.locator('.mobile-settings-panel:not(.mobile-settings-collapsed)').count();
  expect(openPanels).toBe(1);
  await page.evaluate(()=>document.getElementById('confirmModal')?.classList.add('open'));
  const modal=await page.locator('#confirmModal .modal-card').evaluate(el=>{
    const box=el.getBoundingClientRect(),close=el.querySelector('.close')?.getBoundingClientRect();
    return{left:box.left,right:box.right,top:box.top,bottom:box.bottom,close:close?.height||0};
  });
  expect(modal.left).toBeGreaterThanOrEqual(0);
  expect(modal.right).toBeLessThanOrEqual(390);
  expect(modal.top).toBeGreaterThanOrEqual(0);
  expect(modal.bottom).toBeLessThanOrEqual(844);
  expect(modal.close).toBeGreaterThanOrEqual(44);
  await noOverflow('Configurações iPhone');
});

test('iPhone real UX2 mantém somente quatro KPIs no resumo de Progresso',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#progress');
  await page.waitForTimeout(120);
  const visible=await page.locator('#progressMetrics .metric').evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=='none').length);
  expect(visible).toBe(4);
  const insightLayout=await page.locator('.progress-insights-grid').evaluate(el=>({
    display:getComputedStyle(el).display,
    width:el.getBoundingClientRect().width,
    scrollWidth:el.scrollWidth,
    cards:[...el.querySelectorAll('.progress-insight-card')].map(card=>{const box=card.getBoundingClientRect();return{width:box.width,left:box.left,right:box.right}})
  }));
  expect(insightLayout.display).toBe('grid');
  expect(insightLayout.scrollWidth).toBeLessThanOrEqual(insightLayout.width+2);
  expect(insightLayout.cards.length).toBeGreaterThan(0);
  expect(insightLayout.cards.every(card=>card.width<=insightLayout.width+2&&card.left>=0&&card.right<=390+1)).toBe(true);
  await expect(page.locator('[data-mobile-progress-group="attention"]>summary')).toBeVisible();
});


test('smartphone compacta também os cards de simulados',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#simulations');
  const card=page.locator('#simulationGrid .simulation-card').first();
  await expect(card).toBeVisible();
  const box=await card.evaluate(el=>{
    const cover=el.querySelector('.simulation-cover:not([hidden])'),meta=el.querySelector('.simulation-meta-item'),footer=el.querySelector('.simulation-card-footer');
    return{
      height:el.getBoundingClientRect().height,
      cover:cover?.getBoundingClientRect().height||0,
      metaBorder:meta?parseFloat(getComputedStyle(meta).borderTopWidth)||0:0,
      footerBorder:footer?parseFloat(getComputedStyle(footer).borderTopWidth)||0:0
    };
  });
  expect.soft(box.height).toBeLessThanOrEqual(370);
  if(box.cover){
    expect.soft(box.cover).toBeGreaterThanOrEqual(112);
    expect.soft(box.cover).toBeLessThanOrEqual(120);
  }
  expect.soft(box.metaBorder).toBe(0);
  expect.soft(box.footerBorder).toBe(0);
});

test('iPhone real mantém topbar sem faixa e capas presas aos cantos',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#course/porto-alegre');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  const topbar=await page.locator('.topbar-wrap').evaluate(el=>{
    const style=getComputedStyle(el);
    return{backgroundImage:style.backgroundImage,backdrop:style.backdropFilter||style.webkitBackdropFilter||'none',boxShadow:style.boxShadow};
  });
  expect(topbar.backgroundImage).toBe('none');
  expect(['none','']).toContain(topbar.backdrop);
  expect(topbar.boxShadow).toBe('none');

  const mapCard=page.locator('#courseMaps .map-card.has-cover').first();
  await expect(mapCard).toBeVisible();
  const mapClip=await mapCard.evaluate(el=>{
    const cover=el.querySelector('.map-cover'),cardStyle=getComputedStyle(el),coverStyle=getComputedStyle(cover),cardBox=el.getBoundingClientRect(),coverBox=cover.getBoundingClientRect();
    return{
      cardOverflow:cardStyle.overflow,
      coverOverflow:coverStyle.overflow,
      coverRadius:parseFloat(coverStyle.borderTopLeftRadius)||0,
      left:coverBox.left>=cardBox.left-1,
      right:coverBox.right<=cardBox.right+1,
      top:coverBox.top>=cardBox.top-1
    };
  });
  expect(['clip','hidden']).toContain(mapClip.cardOverflow);
  expect(['clip','hidden']).toContain(mapClip.coverOverflow);
  expect(mapClip.coverRadius).toBeGreaterThan(0);
  expect(mapClip.left&&mapClip.right&&mapClip.top).toBe(true);

  await page.goto('/#simulations');
  const simCard=page.locator('#simulationGrid .simulation-card').filter({has:page.locator('.simulation-cover:not([hidden])')}).first();
  await expect(simCard).toBeVisible();
  const simClip=await simCard.evaluate(el=>{
    const cover=el.querySelector('.simulation-cover:not([hidden])'),cardStyle=getComputedStyle(el),coverStyle=getComputedStyle(cover);
    return{cardOverflow:cardStyle.overflow,coverOverflow:coverStyle.overflow,coverRadius:parseFloat(coverStyle.borderTopLeftRadius)||0};
  });
  expect(['clip','hidden']).toContain(simClip.cardOverflow);
  expect(['clip','hidden']).toContain(simClip.coverOverflow);
  expect(simClip.coverRadius).toBeGreaterThan(0);
});


test('iPhone real usa glass leve sem blur pesado nos cards',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#progress');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  const style=await page.locator('#progressMetrics .metric').first().evaluate(el=>{
    const computed=getComputedStyle(el);
    return{
      backdrop:computed.backdropFilter||computed.webkitBackdropFilter||'none',
      background:computed.backgroundImage,
      backgroundColor:computed.backgroundColor,
      shadow:computed.boxShadow
    };
  });
  expect(['none','']).toContain(style.backdrop);
  expect(style.background.includes('linear-gradient')||!['transparent','rgba(0, 0, 0, 0)'].includes(style.backgroundColor)).toBe(true);
  expect(style.shadow).not.toBe('none');
});

test('iPhone real mantém hierarquia tipográfica compacta',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#progress');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  const type=await page.evaluate(()=>{
    const px=selector=>parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)||0;
    return{
      page:px('[data-view="progress"]>.section-head h2'),
      sub:px('#progressInfo .progress-global-head h3'),
      metric:px('#progressMetrics .metric b'),
      label:px('#progressMetrics .metric span')
    };
  });
  expect(type.page).toBeGreaterThanOrEqual(16);
  expect(type.page).toBeGreaterThan(type.sub);
  expect(type.metric).toBeGreaterThan(type.label);
  expect(type.label).toBeLessThanOrEqual(9);
});


test('iPhone real mantém feedback tátil e navegação alinhada',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  const nav=page.locator('.bottom-nav button.active');
  await expect(nav).toBeVisible();
  const style=await nav.evaluate(el=>{
    const computed=getComputedStyle(el),icon=el.querySelector('.ui-icon');
    return{
      display:computed.display,
      shadow:computed.boxShadow,
      transition:computed.transitionDuration,
      iconMarginLeft:icon?getComputedStyle(icon).marginLeft:''
    };
  });
  expect(style.display).toBe('grid');
  expect(style.shadow).not.toBe('none');
  expect(style.transition).not.toBe('0s');

  await page.goto('/#course/porto-alegre');
  const map=page.locator('#courseMaps .map-card').first();
  await expect(map).toBeVisible();
  await page.waitForTimeout(220);
  const transform=await map.evaluate(el=>getComputedStyle(el).transform);
  expect(['none','matrix(1, 0, 0, 1, 0, 0)']).toContain(transform);
});

test('agenda de revisão invalida é regenerada sem atraso absurdo',async({page})=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>typeof combinedMaps==='function'&&combinedMaps().length>0);
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


test('smartphone etapa 1 desencaixota curso sem perder respiro',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#course/porto-alegre');
  await page.waitForFunction(()=>document.querySelectorAll('#courseMaps .map-card').length>0);
  const data=await page.evaluate(()=>{
    const content=document.querySelector('.content');
    const hero=document.querySelector('[data-view="course"] .course-hero');
    const summary=document.querySelector('[data-view="course"] .course-progress-summary');
    const metric=[...document.querySelectorAll('[data-view="course"] .course-status-metric')].find(el=>getComputedStyle(el).display!=='none');
    const action=document.querySelector('[data-view="course"] .mobile-course-actions button');
    const sticky=document.querySelector('[data-view="course"] .course-sticky-bar');
    const cs=getComputedStyle(content),hs=getComputedStyle(hero),ss=getComputedStyle(summary),ms=getComputedStyle(metric),as=getComputedStyle(action),sts=getComputedStyle(sticky);
    return{
      phone:document.documentElement.classList.contains('is-phone-layout'),
      paddingLeft:parseFloat(cs.paddingLeft),
      paddingRight:parseFloat(cs.paddingRight),
      heroBorder:parseFloat(hs.borderTopWidth),
      heroShadow:hs.boxShadow,
      heroBackground:hs.backgroundImage,
      summaryBorder:parseFloat(ss.borderTopWidth),
      summaryShadow:ss.boxShadow,
      metricBorderTop:parseFloat(ms.borderTopWidth),
      actionBorder:parseFloat(as.borderTopWidth),
      stickyBorder:parseFloat(sts.borderTopWidth),
      stickyBackdrop:sts.backdropFilter||sts.webkitBackdropFilter||'none'
    };
  });
  expect(data.phone).toBe(true);
  expect(data.paddingLeft).toBeGreaterThanOrEqual(12);
  expect(data.paddingLeft).toBeLessThanOrEqual(14.5);
  expect(data.paddingRight).toBeGreaterThanOrEqual(12);
  expect(data.heroBorder).toBe(0);
  expect(data.heroShadow).toBe('none');
  expect(data.heroBackground).toBe('none');
  expect(data.summaryBorder).toBe(0);
  expect(data.summaryShadow).toBe('none');
  expect(data.metricBorderTop).toBe(0);
  expect(data.actionBorder).toBe(0);
  expect(data.stickyBorder).toBe(0);
  expect(['none','']).toContain(data.stickyBackdrop);
  const firstMapTop=await page.locator('#courseMaps .map-card').first().evaluate(el=>el.getBoundingClientRect().top);
  expect(firstMapTop).toBeLessThan(844);
});

test('iPad preserva estrutura do curso fora da etapa 1 de smartphone',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva de tablet.');
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/#course/porto-alegre');
  await page.waitForFunction(()=>document.querySelectorAll('#courseMaps .map-card').length>0);
  const data=await page.locator('[data-view="course"] .course-hero').evaluate(el=>{
    const style=getComputedStyle(el);
    return{
      phone:document.documentElement.classList.contains('is-phone-layout'),
      border:parseFloat(style.borderTopWidth),
      background:style.backgroundImage
    };
  });
  expect(data.phone).toBe(false);
  expect(data.border).toBeGreaterThan(0);
  expect(data.background).not.toBe('none');
});


test('smartphone etapa 2 usa cards editoriais com capa independente',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});

  await page.goto('/#courses');
  const course=page.locator('#coursesGrid .course-card.course-library-card').first();
  await expect(course).toBeVisible();
  const courseStyle=await course.evaluate(el=>{
    const meta=el.querySelector('.course-card-meta-item'),exam=el.querySelector('.course-exam-info'),footer=el.querySelector('.course-footer'),progress=el.querySelector('.course-progress-mini'),cover=el.querySelector('.course-card-cover'),edit=el.querySelector('.course-card-edit');
    const cardRect=el.getBoundingClientRect(),coverRect=cover?.getBoundingClientRect();
    return{
      height:cardRect.height,
      border:parseFloat(getComputedStyle(el).borderTopWidth)||0,
      metaBorder:meta?parseFloat(getComputedStyle(meta).borderTopWidth)||0:0,
      examBorder:exam?parseFloat(getComputedStyle(exam).borderTopWidth)||0:0,
      footerBorder:footer?parseFloat(getComputedStyle(footer).borderTopWidth)||0:0,
      progressStates:progress?.querySelector('.progress-states')?getComputedStyle(progress.querySelector('.progress-states')).display:'none',
      coverHeight:coverRect?.height||0,
      coverWidth:coverRect?.width||0,
      cardWidth:cardRect.width,
      editPosition:edit?getComputedStyle(edit).position:'none'
    };
  });
  expect(courseStyle.height).toBeGreaterThanOrEqual(300);
  expect(courseStyle.height).toBeLessThanOrEqual(520);
  expect(courseStyle.coverHeight).toBeGreaterThanOrEqual(140);
  expect(courseStyle.coverHeight).toBeLessThanOrEqual(200);
  expect(Math.abs(courseStyle.coverWidth-courseStyle.cardWidth)).toBeLessThanOrEqual(2);
  expect(['static','none']).toContain(courseStyle.editPosition);
  expect(courseStyle.border).toBeGreaterThan(0);
  expect(courseStyle.metaBorder).toBe(0);
  expect(courseStyle.examBorder).toBe(1);
  expect(courseStyle.footerBorder).toBe(0);
  expect(courseStyle.progressStates).toBe('none');

  await page.goto('/#course/porto-alegre');
  const maps=page.locator('#courseMaps .map-card.has-cover');
  await expect(maps.first()).toBeVisible();
  const gap=await page.locator('#courseMaps').evaluate(el=>parseFloat(getComputedStyle(el).rowGap)||parseFloat(getComputedStyle(el).gap)||0);
  expect(gap).toBeGreaterThanOrEqual(10);
});

test('iPad preserva cards fora da etapa 2 de smartphone',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva de tablet.');
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/#course/porto-alegre');
  await page.waitForFunction(()=>document.querySelectorAll('#courseMaps .map-card.has-cover').length>0);
  const data=await page.locator('#courseMaps .map-card.has-cover').first().evaluate(el=>{
    const fav=el.querySelector('.fav'),cover=el.querySelector('.map-cover');
    return{
      phone:document.documentElement.classList.contains('is-phone-layout'),
      favWidth:fav?.getBoundingClientRect().width||0,
      coverHeight:cover?.getBoundingClientRect().height||0
    };
  });
  expect(data.phone).toBe(false);
  expect(data.favWidth).toBeLessThanOrEqual(44);
  expect(data.coverHeight).toBeGreaterThan(120);
});


test('iPhone etapa 3 prioriza busca e menu sem alterar a navegação',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  const input=page.locator('#globalSearch');
  const before=await input.evaluate(el=>el.closest('.global-search-shell').getBoundingClientRect().width);
  await input.focus();
  await expect(page.locator('html')).toHaveClass(/mobile-search-active/);
  await page.waitForTimeout(140);
  const focused=await input.evaluate(el=>el.closest('.global-search-shell').getBoundingClientRect().width);
  expect(focused).toBeGreaterThanOrEqual(before);
  await expect(page.locator('#syncTop')).toHaveAttribute('data-sync-state',/idle|offline|synced|error|syncing/);

  const menu=page.locator('#mobileMenuBtn');
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.locator('#mobileMenuLayer')).toBeVisible();
  await expect(page.locator('.mobile-menu-label')).toHaveCount(2);
  await expect(page.locator('#mobileMenuCloud')).toBeVisible();
  await page.locator('[data-mobile-sheet-nav="settings"]').click();
  await expect(page.locator('[data-view="settings"]')).toHaveClass(/active/);
  await expect(menu).toHaveClass(/active/);
});

test('iPhone etapa 3 integra contagem e Novo concurso no cabeçalho de cursos',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#courses');
  await expect(page.locator('#mobileCoursesCount')).toBeVisible();
  await expect(page.locator('#mobileCoursesCount')).toContainText(/concurso/);
  await expect(page.locator('#coursesCount')).toBeHidden();
  const button=page.locator('#newCourseBtn2');
  await expect(button).toBeVisible();
  const size=await button.evaluate(el=>({height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width}));
  expect(Math.round(size.height)).toBeGreaterThanOrEqual(44);
  expect(Math.round(size.width)).toBeGreaterThanOrEqual(44);
});


test('iPhone etapa 4 unifica o sistema visual geral',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='ipad','Validação específica de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  await expect(page.locator('.study-command-card')).toBeVisible();

  const visual=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement);
    const body=getComputedStyle(document.body);
    const card=getComputedStyle(document.querySelector('.study-command-card'));
    const primary=getComputedStyle(document.querySelector('[data-view="home"] .hero-actions .primary'));
    return{
      surface:root.getPropertyValue('--phone-surface').trim(),
      radius:root.getPropertyValue('--phone-radius-panel').trim(),
      bodyBackground:body.backgroundImage,
      cardRadius:card.borderRadius,
      cardShadow:card.boxShadow,
      cardBackdrop:card.backdropFilter||card.webkitBackdropFilter||'none',
      primaryBackground:primary.backgroundImage,
      primaryShadow:primary.boxShadow
    };
  });

  expect(visual.surface).not.toBe('');
  expect(visual.radius).toBe('14px');
  expect(visual.bodyBackground).toContain('radial-gradient');
  expect(parseFloat(visual.cardRadius)).toBeGreaterThanOrEqual(13);
  expect(visual.cardShadow).not.toBe('none');
  expect(['none','']).toContain(visual.cardBackdrop);
  expect(visual.primaryBackground).toContain('linear-gradient');
  expect(visual.primaryShadow).toBe('none');
});

test('iPad não recebe tokens visuais exclusivos da etapa 4 do smartphone',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva de tablet.');
  await page.setViewportSize({width:430,height:760});
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/is-ipad/);
  await expect(page.locator('html')).not.toHaveClass(/is-phone-layout/);
  const token=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--phone-surface').trim());
  expect(token).toBe('');
});


test('etapa 1 [D] Meus Cursos usa três colunas no desktop amplo',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Validação exclusiva de desktop.');
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/#courses');
  await page.evaluate(()=>{
    if(state.cloudCourses.length===1){
      const first=state.cloudCourses[0];
      state.cloudCourses=[first,{...first,id:'e2e-second-course',title:'SEGUNDO CONCURSO',subtitle:'CP 02 · Arquiteto'}];
      renderCoursesPage();
    }
  });
  const cards=page.locator('#coursesGrid .course-card.course-library-card');
  await expect(cards).toHaveCount(2);
  const data=await page.evaluate(()=>{
    const grid=document.querySelector('#coursesGrid'),all=[...grid.querySelectorAll('.course-card.course-library-card')],card=all[0],title=card?.querySelector('h3');
    const gs=getComputedStyle(grid),ts=getComputedStyle(title);
    return{
      columns:gs.gridTemplateColumns.split(' ').filter(Boolean).length,
      height:card.getBoundingClientRect().height,
      width:card.getBoundingClientRect().width,
      viewportHeight:innerHeight,
      titleOverflow:ts.overflow,
      titleLines:ts.webkitLineClamp||'',
      accents:all.map(el=>getComputedStyle(el).getPropertyValue('--course-accent').trim())
    };
  });
  expect(data.columns).toBe(3);
  expect(data.height).toBeGreaterThanOrEqual(300);
  expect(data.height).toBeLessThan(data.viewportHeight*.8);
  expect(data.width).toBeGreaterThan(350);
  expect(data.width).toBeLessThan(550);
  expect(data.titleOverflow).toBe('hidden');
  expect(String(data.titleLines)).toBe('2');
  expect(data.accents.every(Boolean)).toBe(true);
});

test('etapa 1 [D] Meus Cursos mantém três colunas no notebook',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Validação exclusiva de desktop.');
  await page.setViewportSize({width:1280,height:800});
  await page.goto('/#courses');
  await page.evaluate(()=>{
    if(state.cloudCourses.length===1){
      const first=state.cloudCourses[0];
      state.cloudCourses=[first,{...first,id:'e2e-second-course',title:'SEGUNDO CONCURSO',subtitle:'CP 02 · Arquiteto'}];
      renderCoursesPage();
    }
  });
  const grid=page.locator('#coursesGrid');
  await expect(grid.locator('.course-card.course-library-card')).toHaveCount(2);
  const columns=await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
  expect(columns).toBe(3);
});

test('etapa 2 [T] compacta Home e curso no iPad em retrato e paisagem',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva da etapa 2 de tablet.');
  for(const scenario of [
    {name:'paisagem',width:1194,height:834,metricColumns:4,toolbarColumns:1},
    {name:'retrato',width:820,height:1180,metricColumns:2,toolbarColumns:1}
  ]){
    await page.setViewportSize({width:scenario.width,height:scenario.height});
    await page.goto('/#home');
    await page.waitForFunction(()=>typeof combinedMaps==='function'&&combinedMaps().length>0);
    await page.evaluate(()=>{
      const map=combinedMaps().find(item=>item.courseId==='porto-alegre')||combinedMaps()[0];
      localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));
      renderHome();
    });
    const home=await page.evaluate(()=>{
      const stats=document.querySelector('#homeStats'),hero=document.querySelector('[data-view="home"] .hero');
      const visible=[...stats.children].filter(el=>getComputedStyle(el).display!=='none');
      const maps=document.querySelector('#homeStats .stat-maps'),sub=maps?.querySelector('.stat-sub');
      const heroRect=hero.getBoundingClientRect();
      return{
        visibleStats:visible.length,
        columns:getComputedStyle(stats).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
        coursesHidden:getComputedStyle(document.querySelector('#homeStats .stat-courses')).display==='none',
        subVisible:!!sub&&getComputedStyle(sub).display!=='none',
        subText:sub?.textContent||'',
        statsInside:visible.every(el=>{const r=el.getBoundingClientRect();return r.left>=heroRect.left-1&&r.right<=heroRect.right+1}),
        scrollWidth:document.documentElement.scrollWidth,
        width:innerWidth
      };
    });
    expect.soft(home.visibleStats,scenario.name+' mostra quatro métricas').toBe(4);
    expect.soft(home.columns,scenario.name+' métricas em 2x2').toBe(2);
    expect.soft(home.coursesHidden,scenario.name+' remove card Concursos isolado').toBe(true);
    expect.soft(home.subVisible,scenario.name+' incorpora cursos em Mapas').toBe(true);
    expect.soft(home.subText,scenario.name+' preserva informação de cursos').toContain('curso');
    expect.soft(home.statsInside,scenario.name+' métricas ficam dentro do hero').toBe(true);
    expect.soft(home.scrollWidth,scenario.name+' Home sem overflow horizontal').toBeLessThanOrEqual(home.width+2);

    await page.goto('/#course/porto-alegre');
    await page.waitForFunction(()=>document.querySelectorAll('#courseMaps .map-card').length>0);
    const course=await page.evaluate(()=>{
      const hero=document.querySelector('[data-view="course"] .course-hero');
      const title=document.querySelector('#courseTitle'),summary=document.querySelector('#courseProgressSummary');
      const toolbar=document.querySelector('.course-toolbar'),metrics=document.querySelector('.course-status-metrics');
      const situation=document.querySelector('#courseStudyFilters'),categories=document.querySelector('#categoryRow');
      const continueCard=document.querySelector('#courseContinue'),continueBtn=continueCard?.querySelector('[data-course-continue]');
      const layoutActions=document.querySelector('[data-view="course"] .section-head[style] .actions');
      const cols=el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
      const tr=title.getBoundingClientRect(),sr=summary.getBoundingClientRect(),hr=hero.getBoundingClientRect();
      const cr=continueCard&&!continueCard.hidden?continueCard.getBoundingClientRect():null;
      const br=continueBtn?continueBtn.getBoundingClientRect():null;
      return{
        metricCount:metrics.children.length,
        metricColumns:cols(metrics),
        toolbarColumns:cols(toolbar),
        situationOverflow:getComputedStyle(situation).overflowX,
        categoriesOverflow:getComputedStyle(categories).overflowX,
        situationTouch:Math.min(...[...situation.querySelectorAll('button')].map(el=>el.getBoundingClientRect().height)),
        categoryTouch:Math.min(...[...categories.querySelectorAll('button')].map(el=>el.getBoundingClientRect().height)),
        titleBeforeSummary:tr.bottom<=sr.top+1,
        titleInside:tr.left>=hr.left-1&&tr.right<=hr.right+1,
        continueVisible:!!cr,
        continueAccent:continueCard?getComputedStyle(continueCard).getPropertyValue('--map-accent').trim():'',
        continueButtonInside:!cr||!br||(br.left>=cr.left-1&&br.right<=cr.right+1&&br.top>=cr.top-1&&br.bottom<=cr.bottom+1),
        continueButtonHeight:br?.height||0,
        layoutActionsVisible:layoutActions?getComputedStyle(layoutActions).display!=='none':false,
        scrollWidth:document.documentElement.scrollWidth,
        width:innerWidth
      };
    });
    expect.soft(course.metricCount,scenario.name+' preserva quatro métricas do curso').toBe(4);
    expect.soft(course.metricColumns,scenario.name+' organiza métricas conforme orientação').toBe(scenario.metricColumns);
    expect.soft(course.toolbarColumns,scenario.name+' organiza busca e ações conforme orientação').toBe(scenario.toolbarColumns);
    expect.soft(['auto','scroll'],scenario.name+' situação rolável').toContain(course.situationOverflow);
    expect.soft(['auto','scroll'],scenario.name+' conteúdo rolável').toContain(course.categoriesOverflow);
    expect.soft(Math.round(course.situationTouch),scenario.name+' filtros de situação mantêm touch').toBeGreaterThanOrEqual(44);
    expect.soft(Math.round(course.categoryTouch),scenario.name+' filtros de conteúdo mantêm touch').toBeGreaterThanOrEqual(44);
    expect.soft(course.titleBeforeSummary,scenario.name+' título não sobrepõe métricas').toBe(true);
    expect.soft(course.titleInside,scenario.name+' título permanece dentro do hero').toBe(true);
    expect.soft(course.continueVisible,scenario.name+' Retomar disponível').toBe(true);
    expect.soft(course.continueAccent,scenario.name+' Retomar herda accent do mapa').not.toBe('');
    expect.soft(course.continueButtonInside,scenario.name+' CTA Retomar fica dentro do card').toBe(true);
    expect.soft(Math.round(course.continueButtonHeight),scenario.name+' CTA Retomar mantém touch').toBeGreaterThanOrEqual(44);
    expect.soft(course.layoutActionsVisible,scenario.name+' seletor grade/lista permanece removido').toBe(false);
    expect.soft(course.scrollWidth,scenario.name+' Curso sem overflow horizontal').toBeLessThanOrEqual(course.width+2);
  }
});

test('etapa 1 [T] Meus Cursos usa duas colunas no iPad e mantém densidade confortável',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Validação exclusiva de tablet.');
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/#courses');
  await expect(page.locator('html')).toHaveClass(/is-ipad/);
  const card=page.locator('#coursesGrid .course-card.course-library-card').first();
  await expect(card).toBeVisible();
  const data=await page.evaluate(()=>{
    const grid=document.querySelector('#coursesGrid'),card=document.querySelector('#coursesGrid .course-card.course-library-card');
    return{
      columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
      height:card.getBoundingClientRect().height,
      width:card.getBoundingClientRect().width,
      viewportHeight:innerHeight
    };
  });
  expect(data.columns).toBe(2);
  expect(data.height).toBeGreaterThanOrEqual(300);
  expect(data.height).toBeLessThan(data.viewportHeight*.7);
  expect(data.width).toBeGreaterThan(300);
});

test('etapa 1 [M] preserva Meus Cursos em uma coluna no iPhone',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='iphone-webkit','Validação exclusiva de smartphone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#courses');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  const card=page.locator('#coursesGrid .course-card.course-library-card').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.course-card-cover img')).toBeVisible();
  await expect(card.locator('h3')).toBeVisible();
  await expect(card.locator('.course-card-meta')).toBeVisible();
  await expect(card.locator('.course-progress-mini')).toBeVisible();
  await expect(card.locator('.course-footer')).toBeVisible();
  const data=await page.evaluate(()=>{
    const grid=document.querySelector('#coursesGrid'),card=document.querySelector('#coursesGrid .course-card.course-library-card'),rect=card.getBoundingClientRect();
    return{
      columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
      height:rect.height,
      left:rect.left,
      right:rect.right,
      scrollWidth:card.scrollWidth,
      clientWidth:card.clientWidth,
      viewportWidth:innerWidth,
      documentScrollWidth:document.documentElement.scrollWidth
    };
  });
  expect(data.columns).toBe(1);
  expect(data.height).toBeGreaterThan(0);
  expect(data.left).toBeGreaterThanOrEqual(-1);
  expect(data.right).toBeLessThanOrEqual(data.viewportWidth+1);
  expect(data.scrollWidth).toBeLessThanOrEqual(data.clientWidth+1);
  expect(data.documentScrollWidth).toBeLessThanOrEqual(data.viewportWidth+2);
});


test('etapa 6 [G] padroniza estados vazios com mascotes oficiais',async({page},testInfo)=>{
  await page.goto('/#courses');
  await page.evaluate(()=>{state.cloudCourses=[];state.cloudMaps=[];renderCoursesPage()});
  const coursesEmpty=page.locator('#coursesGrid .empty-state');
  await expect(coursesEmpty).toBeVisible();
  await expect(coursesEmpty.locator('.empty-state-graphic')).toHaveAttribute('src',/mascote-livros-feliz-v15-22-0\.png/);
  await expect(coursesEmpty.locator('h3')).toContainText(/Nenhum concurso|biblioteca/i);

  await page.evaluate(()=>{state.cloudCourses=[];state.cloudMaps=[];nav('maps');renderAllMaps()});
  const mapsEmpty=page.locator('#allMaps .empty-state');
  await expect(mapsEmpty).toBeVisible();
  await expect(mapsEmpty.locator('.empty-state-graphic')).toHaveAttribute('src',/mascote-pensando-v15-22-0\.png/);

  await page.evaluate(()=>{state.simulationCatalog={simulations:[]};state.cloudSimulations=[];nav('simulations');renderSimulations()});
  const simulationEmpty=page.locator('#simulationGrid .empty-state');
  await expect(simulationEmpty).toBeVisible();
  await expect(simulationEmpty.locator('.empty-state-graphic')).toHaveAttribute('src',/mascote-notebook-v15-22-0\.png/);

  const geometry=await simulationEmpty.evaluate(el=>{const img=el.querySelector('.empty-state-graphic'),style=getComputedStyle(el);return{width:el.getBoundingClientRect().width,imgWidth:img.getBoundingClientRect().width,before:getComputedStyle(el,'::before').content,display:style.display}});
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.imgWidth).toBeGreaterThan(40);
  expect(geometry.before==='none'||geometry.before==='normal'||geometry.before==='""').toBe(true);
  expect(geometry.display).toBe('grid');

  await page.evaluate(()=>{
    nav('home');
    const box=document.querySelector('#continueBox');
    box.innerHTML=emptyStateHtml({title:'Pronto para começar?',text:'Abra um mapa pela primeira vez.',mascot:'continue',compact:true,className:'compact-geometry-probe'});
  });
  const compactProbe=page.locator('#continueBox .compact-geometry-probe');
  await expect(compactProbe).toBeVisible();
  const compactGeometry=await compactProbe.evaluate(el=>{
    const img=el.querySelector('.empty-state-graphic'),copy=el.querySelector('.empty-state-copy'),ir=img.getBoundingClientRect(),cr=copy.getBoundingClientRect();
    return{imgRight:ir.right,copyLeft:cr.left,imgWidth:ir.width};
  });
  expect(compactGeometry.imgWidth).toBeGreaterThan(40);
  expect(compactGeometry.imgRight).toBeLessThanOrEqual(compactGeometry.copyLeft+.5);

  await page.evaluate(()=>{
    nav('settings');
    const root=document.querySelector('#restorePointsList');
    root.innerHTML=emptyStateHtml({title:'Nenhum ponto de restauração ainda',text:'Eles serão criados automaticamente antes de ações destrutivas.',mascot:'continue',compact:true,className:'restore-points-empty-state'});
  });
  if(testInfo.project.name==='iphone-webkit'){
    const backupPanel=page.locator('[data-view="settings"] .backup-panel');
    const toggle=backupPanel.locator(':scope > .mobile-settings-toggle');
    await expect(toggle).toBeVisible();
    if(await backupPanel.evaluate(el=>el.classList.contains('mobile-settings-collapsed')))await toggle.click();
  }
  const restoreEmpty=page.locator('#restorePointsList .restore-points-empty-state');
  await expect(restoreEmpty).toBeVisible();
  await expect(restoreEmpty.locator('.empty-state-graphic')).toHaveAttribute('src',/mascote-leitura-v15-22-0\.png/);

  await page.evaluate(()=>{nav('maps');state.globalQuery='__sem_resultado_estado_vazio__';renderAllMaps()});
  const searchEmpty=page.locator('#allMaps .empty-state');
  await expect(searchEmpty).toBeVisible();
  await expect(searchEmpty.locator('.empty-state-graphic')).toHaveAttribute('src',/mascote-pensando-v15-22-0\.png/);
});


test('etapa 1 [G] identidade dos mapas propaga accent e tags nos blocos mobile',async({page},testInfo)=>{
  await page.goto('/#course/porto-alegre');
  await page.waitForFunction(()=>document.querySelectorAll('#courseMaps .map-card').length>0);
  const card=page.locator('#courseMaps .map-card').first();
  const identity=await card.evaluate(el=>{
    const key=el.dataset.map,map=mapById(key),style=getComputedStyle(el),chip=el.querySelector('.map-category-chip'),track=el.querySelector('.progress-track span');
    return{
      key,
      code:map?.code||'',
      accent:map?mapAccentValue(map):'',
      cssAccent:style.getPropertyValue('--map-accent').trim(),
      hasChip:!!chip,
      chipColor:chip?getComputedStyle(chip).color:'',
      trackColor:track?getComputedStyle(track).backgroundColor:''
    };
  });
  expect(identity.accent).not.toBe('');
  expect(identity.cssAccent).toBe(identity.accent);
  expect(identity.hasChip).toBe(true);
  expect(identity.chipColor).not.toBe('');
  expect(identity.trackColor).not.toBe('');

  await page.goto('/#home');
  const input=page.locator('#globalSearch');
  await input.fill(identity.code);
  const mapOption=page.locator('#globalSearchPanel [data-global-search-kind="map"]').first();
  await expect(mapOption).toBeVisible();
  expect(await mapOption.evaluate(el=>getComputedStyle(el).getPropertyValue('--map-accent').trim())).toBe(identity.accent);

  await page.evaluate(key=>{
    localStorage.setItem('studyapp.lastMap',key);
    renderHome();
  },identity.key);
  const resume=page.locator('#continueBox .continue-card');
  await expect(resume).toBeVisible();
  if(testInfo.project.name==='iphone-webkit'){
    await expect(resume.locator('.continue-thumb')).toBeHidden();
    await expect(resume.locator('.continue-map-code')).toBeVisible();
  }else{
    await expect(resume.locator('.continue-thumb img')).toBeVisible();
  }
  expect(await resume.evaluate(el=>getComputedStyle(el).getPropertyValue('--map-accent').trim())).toBe(identity.accent);

  const planAccent=page.locator('#homeStudyPlan .study-plan-item.has-map-accent').first();
  await expect(planAccent).toBeVisible();
  expect(await planAccent.evaluate(el=>getComputedStyle(el).getPropertyValue('--map-accent').trim())).not.toBe('');

  await page.goto('/#progress');
  await page.waitForFunction(()=>document.querySelectorAll('#progressInsights .progress-insight-card').length>0);
  const mapFocus=page.locator('#progressInsights .progress-insight-focus, #progressInsights .progress-insight-resume, #progressInsights .progress-insight-start').first();
  await expect(mapFocus).toBeVisible();
  if(testInfo.project.name==='iphone-webkit'){
    await expect(mapFocus.locator('.progress-insight-thumb img')).toBeHidden();
    await expect(mapFocus.locator('.progress-insight-thumb>span')).toBeVisible();
  }else{
    await expect(mapFocus.locator('.progress-insight-thumb img')).toBeVisible();
  }
  const focusData=await mapFocus.evaluate(el=>({
    accent:getComputedStyle(el).getPropertyValue('--map-accent').trim(),
    button:!!el.querySelector('button'),
    title:!!el.querySelector('.progress-insight-title b')
  }));
  expect(focusData.accent).not.toBe('');
  expect(focusData.button).toBe(true);
  expect(focusData.title).toBe(true);

  if(testInfo.project.name==='iphone-webkit'){
    const box=await mapFocus.evaluate(el=>{const r=el.getBoundingClientRect();return{height:r.height,left:r.left,right:r.right,vw:innerWidth}});
    expect(box.height).toBeLessThanOrEqual(170);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(box.vw+1);
  }
});


test('[G] Etapa 3 Todos os Mapas ordena filtra agrupa e mantém visualização fixa em cards',async({page},testInfo)=>{
  await page.goto('/#maps');
  await page.waitForFunction(()=>document.querySelectorAll('#allMaps .map-card').length>2);
  const baseCount=await page.locator('#allMaps .map-card').count();
  await expect(page.locator('#allMapsCount')).toContainText(String(baseCount));
  await expect(page.locator('[data-allmaps-layout]')).toHaveCount(0);

  const isPhone=testInfo.project.name==='iphone-webkit';
  if(isPhone){
    await expect(page.locator('.maps-mobile-controls')).toBeVisible();
    await page.locator('#allMapsMobileSort').click();
    await expect(page.locator('#allMapsFilterPanel')).toBeVisible();
    await page.locator('#allMapsSortOptions [data-allmaps-sort-option="za"]').click();
  }else{
    await expect(page.locator('.maps-toolbar')).toBeVisible();
    await page.locator('#allMapsSort').selectOption('za');
  }

  const titles=await page.locator('#allMaps .map-card h3').evaluateAll(nodes=>nodes.map(node=>node.textContent.trim()));
  const expected=[...titles].sort((a,b)=>b.localeCompare(a,'pt-BR',{sensitivity:'base',numeric:true}));
  expect(titles).toEqual(expected);

  if(isPhone)await page.locator('#allMapsMobileFilter').click();
  else await page.locator('#allMapsFilterBtn').click();
  await expect(page.locator('#allMapsFilterPanel')).toBeVisible();

  const category=await page.locator('#allMapsCategory option').evaluateAll(options=>options.map(o=>o.value).find(Boolean)||'');
  expect(category).not.toBe('');
  await page.locator('#allMapsCategory').selectOption(category);
  await expect(page.locator('#allMapsActiveFilters')).toBeVisible();
  const categoryChip=page.locator('#allMapsActiveFilters [data-allmaps-clear="category"]');
  await expect(categoryChip).toContainText(category);
  expect(await categoryChip.evaluate(el=>getComputedStyle(el).getPropertyValue('--chip-accent').trim())).not.toBe('');

  const filtered=await page.locator('#allMaps .map-card').count();
  expect(filtered).toBeGreaterThan(0);
  const categoryOk=await page.locator('#allMaps .map-card').evaluateAll(cards=>cards.every(card=>mapById(card.dataset.map)?.category===state.allMapsCategory));
  expect(categoryOk).toBe(true);

  if(isPhone){
    await page.locator('#allMapsGroupSheet').selectOption('category');
    await page.locator('#allMapsFilterDone').click();
  }else{
    await page.locator('#allMapsFilterPanel').press('Escape');
    await page.locator('#allMapsGroup').selectOption('category');
  }
  await expect(page.locator('#allMaps .maps-group-section')).toHaveCount(1);

  await page.evaluate(()=>{state.mapLayout='list';renderAllMaps({skipOfflineRefresh:true})});
  await expect(page.locator('#allMapsWrap')).not.toHaveClass(/map-list/);
  await expect(page.locator('[data-allmaps-layout]')).toHaveCount(0);
  const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,sort:state.allMapsSort}));
  expect(layout.sort).toBe('za');
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width+2);

  const footBorder=await page.locator('#allMaps .map-card .foot').first().evaluate(el=>parseFloat(getComputedStyle(el).borderTopWidth)||0);
  expect(footBorder).toBe(0);
});

test('[G] Etapa 3 Todos os Mapas persiste ordenação, limpa filtros e ignora layout legado',async({page},testInfo)=>{
  await page.addInitScript(()=>localStorage.setItem('studyapp.mapLayout','list'));
  await page.goto('/#maps');
  await page.waitForFunction(()=>document.querySelectorAll('#allMaps .map-card').length>2);
  const isPhone=testInfo.project.name==='iphone-webkit';
  await expect(page.locator('[data-allmaps-layout]')).toHaveCount(0);
  await expect(page.locator('#allMapsWrap')).not.toHaveClass(/map-list/);

  if(isPhone){
    await page.locator('#allMapsMobileSort').click();
    await page.locator('#allMapsSortOptions [data-allmaps-sort-option="topics-desc"]').click();
    await page.locator('#allMapsMobileFilter').click();
  }else{
    await page.locator('#allMapsSort').selectOption('topics-desc');
    await page.locator('#allMapsFilterBtn').click();
  }

  const category=await page.locator('#allMapsCategory option').evaluateAll(options=>options.map(o=>o.value).find(Boolean)||'');
  await page.locator('#allMapsCategory').selectOption(category);
  await page.locator('#allMapsFavorites').check();
  await page.locator('#allMapsFilterDone').click();

  await page.locator('[data-nav="courses"]:visible').first().click();
  await expect(page.locator('[data-view="courses"]')).toHaveClass(/active/);
  await page.locator('[data-nav="maps"]:visible').first().click();
  await expect(page.locator('[data-view="maps"]')).toHaveClass(/active/);

  const reset=await page.evaluate(()=>({
    query:state.allMapsQuery,
    category:state.allMapsCategory,
    course:state.allMapsCourse,
    status:state.allMapsStatus,
    favorites:state.allMapsFavorites,
    offline:state.allMapsOffline,
    group:state.allMapsGroup,
    sort:state.allMapsSort
  }));
  expect(reset).toEqual({query:'',category:'',course:'',status:'',favorites:false,offline:false,group:'',sort:'topics-desc'});
  await expect(page.locator('#allMapsWrap')).not.toHaveClass(/map-list/);

  await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll('#allMaps .map-card').length>2);
  const persisted=await page.evaluate(()=>({sort:state.allMapsSort,layout:state.mapLayout,storedSort:localStorage.getItem('studyapp.allMapsSort'),storedLayout:localStorage.getItem('studyapp.mapLayout')}));
  expect(persisted).toEqual({sort:'topics-desc',layout:'list',storedSort:'topics-desc',storedLayout:'list'});
  await expect(page.locator('#allMapsWrap')).not.toHaveClass(/map-list/);
  await expect(page.locator('[data-allmaps-layout]')).toHaveCount(0);

  const firstKey=await page.locator('#allMaps .map-card').first().getAttribute('data-map');
  await page.evaluate(key=>{
    state.allMapsOfflineReady={[key]:true};
    state.allMapsOfflineCheckedAt=Date.now();
    state.allMapsOffline=true;
    renderAllMaps({skipOfflineRefresh:true});
  },firstKey);
  await expect(page.locator('#allMaps .map-card')).toHaveCount(1);
  await expect(page.locator('#allMapsActiveFilters [data-allmaps-clear="offline"]')).toBeVisible();
});

test('V15.32 [D] biblioteca do curso mantém composição compacta e três colunas',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Validação exclusiva de desktop.');
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/#course/porto-alegre');
  await page.waitForFunction(()=>document.querySelectorAll('#courseMaps .map-card').length>2);
  const data=await page.evaluate(()=>{
    const toolbar=document.querySelector('.course-toolbar'),search=document.querySelector('.course-search-box'),actions=document.querySelector('.course-primary-actions');
    const categories=document.querySelector('#categoryRow'),maps=document.querySelector('#courseMaps');
    const heading=document.querySelector('[data-view="course"] .section-head[style]'),headingCopy=heading?.firstElementChild,layout=heading?.querySelector('.actions');
    const card=maps.querySelector('.map-card.has-cover'),cover=card?.querySelector('.map-cover'),foot=card?.querySelector('.foot');
    const ar=actions.getBoundingClientRect(),cr=card.getBoundingClientRect(),vr=cover.getBoundingClientRect(),fr=foot.getBoundingClientRect();
    return{
      toolbarColumns:getComputedStyle(toolbar).display==='grid'?getComputedStyle(toolbar).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length:1,
      searchHidden:getComputedStyle(search).display==='none',
      categoriesWrap:getComputedStyle(categories).flexWrap,
      mapColumns:getComputedStyle(maps).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
      layoutHidden:!layout||getComputedStyle(layout).display==='none'||layout.getBoundingClientRect().width===0,
      coverRatio:vr.width/vr.height,
      footerInside:fr.left>=cr.left-1&&fr.right<=cr.right+1&&fr.bottom<=cr.bottom+1,
      footerBorderTop:parseFloat(getComputedStyle(foot).borderTopWidth)||0,
      scrollWidth:document.documentElement.scrollWidth,
      viewportWidth:innerWidth
    };
  });
  expect(data.toolbarColumns).toBe(1);
  expect(data.searchHidden).toBe(true);
  expect(data.categoriesWrap).toBe('nowrap');
  expect(data.mapColumns).toBe(3);
  expect(data.layoutHidden).toBe(true);
  expect(data.coverRatio).toBeGreaterThan(1.74);
  expect(data.coverRatio).toBeLessThan(1.82);
  expect(data.footerInside).toBe(true);
  expect(data.footerBorderTop).toBe(0);
  expect(data.scrollWidth).toBeLessThanOrEqual(data.viewportWidth+2);
});

test('V15.32 [G] accent respeita prioridade mapa categoria curso e neutro',async({page})=>{
  const result=await page.evaluate(()=>{
    const course=state.cloudCourses.find(item=>item.id==='porto-alegre'),before=course?.accent;
    if(course)course.accent='teal';
    const explicit=mapAccentKey({courseId:'porto-alegre',category:'Acessibilidade e Segurança',accent:'red'});
    const category=mapAccentKey({courseId:'porto-alegre',category:'Acessibilidade e Segurança',accent:''});
    const courseFallback=mapAccentKey({courseId:'porto-alegre',category:'',accent:''});
    const neutral=mapAccentKey({courseId:'__sem_curso__',category:'',accent:''});
    if(course){if(before===undefined)delete course.accent;else course.accent=before}
    return{explicit,category,courseFallback,neutral};
  });
  expect(result).toEqual({explicit:'red',category:'blue',courseFallback:'teal',neutral:''});
});



test('[G] refinamento visual mantém foco discreto, menus harmonizados e modal rolável',async({page},testInfo)=>{
  await expect(page.locator('link[href*="ui-chrome-refine-v01.css"]')).toHaveCount(1);
  const search=page.locator('#globalSearch');
  await expect(search).toBeVisible();
  await search.focus();
  const searchFocus=await search.evaluate(el=>{
    const style=getComputedStyle(el),box=el.getBoundingClientRect();
    return{outline:parseFloat(style.outlineWidth)||0,shadow:style.boxShadow,width:box.width,height:box.height};
  });
  expect(searchFocus.outline).toBeLessThanOrEqual(1);
  expect(searchFocus.shadow).not.toContain('0px 0px 0px 3px');
  expect(searchFocus.width).toBeGreaterThan(0);
  expect(searchFocus.height).toBeGreaterThan(0);

  if(testInfo.project.name==='desktop-chromium'){
    await page.goto('/#progress');
    await expect(page.locator('#progressSort')).toHaveCount(0);
    const trigger=page.locator('#progressSortTrigger');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator('#progressSortSheet')).toBeVisible();
    await expect(page.locator('#progressSortSheet [data-progress-sort-option]')).toHaveCount(5);
    await expect(trigger).toHaveAttribute('aria-expanded','true');
    await page.locator('#progressSortSheet [data-progress-sort-option="alpha"]').click();
    await expect(page.locator('#progressSortLabel')).toHaveText('A–Z');
  }

  await page.evaluate(()=>document.getElementById('mapManageModal')?.classList.add('open'));
  const modal=page.locator('#mapManageModal .modal-card');
  await expect(modal).toBeVisible();
  const geometry=await modal.evaluate(el=>({width:el.getBoundingClientRect().width,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}));
  expect(geometry.width).toBeGreaterThan(280);
  if(geometry.scrollHeight>geometry.clientHeight){
    const moved=await modal.evaluate(el=>{const before=el.scrollTop;el.scrollTop=Math.min(140,el.scrollHeight-el.clientHeight);return el.scrollTop>before});
    expect(moved).toBe(true);
  }
  const viewport=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width+2);
});

test('[G] V15.36 atualização forçada preserva dados do usuário',async({page})=>{
  await page.goto('/#settings');
  await expect(page.locator('#forceAppRefreshBtn')).toHaveCount(1);
  const source=await page.evaluate(()=>forceAppRefresh.toString());
  expect(source).toContain("study-pwa-");
  expect(source).toContain("unregister");
  expect(source).not.toContain("localStorage.clear");
  expect(source).not.toContain("indexedDB.deleteDatabase");
});


test('[G] Configurações permite escolher ícone Claro, Escuro ou Automático',async({page},testInfo)=>{
  await page.goto('/#settings');
  if(testInfo.project.name==='iphone-webkit')await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  const panel=page.locator('#appAppearancePanel');
  await expect(panel).toBeVisible();
  const choices=panel.locator('[data-app-icon-mode]');
  await expect(choices).toHaveCount(3);
  const ensurePanelOpen=async()=>{
    const mobileToggle=panel.locator('.mobile-settings-toggle');
    if(testInfo.project.name==='iphone-webkit'){
      await expect(mobileToggle).toHaveCount(1);
    }
    if(await mobileToggle.count()&&await panel.evaluate(el=>el.classList.contains('mobile-settings-collapsed'))){
      await mobileToggle.click();
      await expect(panel).not.toHaveClass(/mobile-settings-collapsed/);
    }
    if(testInfo.project.name==='iphone-webkit'){
      await expect(panel.locator('[data-app-icon-mode="light"]')).toBeVisible();
    }
  };
  await ensurePanelOpen();

  const chooseMode=async(mode)=>{
    const choice=panel.locator('[data-app-icon-mode="'+mode+'"]');
    if(testInfo.project.name==='iphone-webkit')await page.evaluate(value=>window.AppIconSettings?.choose?.(value),mode);
    else await choice.click();
    return choice;
  };
  const light=await chooseMode('light');
  await expect(light).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>localStorage.getItem('studyapp.appIconMode'))).toBe('light');
  await expect(page.locator('#appIconPreview')).toHaveAttribute('src',/app-icon-light-rounded-192/);
  expect(await page.locator('#appIconExplicitFavicon').getAttribute('media')).toBe('all');
  await expect(page.locator('#appAppleTouchIcon')).toHaveAttribute('href',/app-icon-light-rounded-192/);
  await expect(page.locator('#appManifest')).toHaveAttribute('href','manifest-light-v15.36.2.webmanifest');

  await ensurePanelOpen();
  const dark=await chooseMode('dark');
  await expect(dark).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>localStorage.getItem('studyapp.appIconMode'))).toBe('dark');
  await expect(page.locator('#appIconPreview')).toHaveAttribute('src',/app-icon-dark-rounded-192/);
  await expect(page.locator('#appAppleTouchIcon')).toHaveAttribute('href',/app-icon-dark-rounded-180/);
  await expect(page.locator('#appManifest')).toHaveAttribute('href','manifest-v15.23.6.webmanifest');

  await ensurePanelOpen();
  const automatic=await chooseMode('auto');
  await expect(automatic).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>localStorage.getItem('studyapp.appIconMode'))).toBe('auto');
  expect(await page.locator('#appIconExplicitFavicon').getAttribute('media')).toBe('not all');
  await expect(page.locator('#appIconCurrent')).toContainText('Automático');

  const layout=await panel.evaluate(el=>({right:el.getBoundingClientRect().right,width:innerWidth,grid:getComputedStyle(el.querySelector('.app-icon-choice-grid')).gridTemplateColumns}));
  expect(layout.right).toBeLessThanOrEqual(layout.width+1);
  expect(layout.grid).not.toBe('none');
});

test('[M] smartphone Mapas usa busca superior e mantém controles acessíveis',async({page})=>{
  await page.goto('/#maps');
  await page.waitForFunction(()=>document.querySelectorAll('#allMaps .map-card').length>2);

  const globalSearch=page.locator('#globalSearch');
  await expect(globalSearch).toBeVisible();
  await expect(globalSearch).toHaveAttribute('placeholder','Buscar mapas…');
  await expect(page.locator('#allMapsSearch')).toBeHidden();
  expect(await page.locator('#allMapsSearch').isDisabled()).toBe(true);
  await expect(page.locator('.maps-library-view .maps-toolbar')).toBeHidden();

  const title=await page.locator('#allMaps .map-card h3').first().innerText();
  await globalSearch.fill(title);
  await expect(page.locator('#allMaps .map-card')).toHaveCount(1);
  await globalSearch.fill('');

  const sort=page.locator('#allMapsMobileSort'),filter=page.locator('#allMapsMobileFilter');
  await expect(sort).toBeVisible();
  await expect(filter).toBeVisible();
  await sort.click();
  const panel=page.locator('#allMapsFilterPanel');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-mode','sort');
  await expect(page.locator('#allMapsSortOptions .maps-sort-option')).toHaveCount(8);
  await page.locator('#allMapsSortOptions [data-allmaps-sort-option="za"]').click();
  await expect(panel).toBeHidden();
  await expect(page.locator('#allMapsMobileSortLabel')).toHaveText('Z–A');

  await filter.click();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-mode','filter');
  const box=await panel.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y+box.height).toBeLessThanOrEqual(845);

  await expect(page.locator('.maps-mobile-controls .maps-layout-actions')).toHaveCount(0);
  const rowGeometry=await page.locator('.maps-mobile-controls').evaluate(el=>{
    const row=el.getBoundingClientRect();
    const sort=el.querySelector('#allMapsMobileSort').getBoundingClientRect();
    const filter=el.querySelector('#allMapsMobileFilter').getBoundingClientRect();
    return{sortTop:sort.top,filterTop:filter.top,left:row.left,right:row.right,width:innerWidth,height:row.height,sortWidth:sort.width,filterWidth:filter.width};
  });
  expect(Math.abs(rowGeometry.sortTop-rowGeometry.filterTop)).toBeLessThan(2);
  expect(rowGeometry.left).toBeGreaterThanOrEqual(0);
  expect(rowGeometry.right).toBeLessThanOrEqual(rowGeometry.width+1);
  expect(rowGeometry.sortWidth).toBeGreaterThan(0);
  expect(rowGeometry.filterWidth).toBeGreaterThan(0);
  expect(rowGeometry.height).toBeLessThan(52);

  await page.locator('#allMapsFilterDone').click();
  await expect(panel).toBeHidden();
});


test('[D+T] Progresso usa linhas compactas acionáveis sem miniaturas',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='iphone-webkit','Validação exclusiva de Desktop e iPad.');
  await page.goto('/#progress');
  const course=page.locator('#progressInfo .progress-course').first();
  await expect(course).toBeVisible();
  if(await course.evaluate(el=>el.classList.contains('is-collapsed')))await course.locator('[data-progress-course-toggle]').click();
  const row=course.locator('.progress-map-row').first();
  await expect(row).toBeVisible();
  await expect(row.locator('.compact-code')).toBeVisible();
  await expect(row.locator('.progress-map-trailing')).toBeVisible();
  await expect(row.locator('.progress-map-thumb')).toHaveCount(0);
  await expect(row.locator('.progress-open')).toHaveCount(0);
  const layout=await row.evaluate(el=>{
    const tag=el.querySelector('.compact-code');
    const title=el.querySelector('.progress-map-copy>b');
    const trailing=el.querySelector('.progress-map-trailing');
    return{
      role:el.getAttribute('role'),
      tabIndex:el.tabIndex,
      tagWidth:tag?.getBoundingClientRect().width||0,
      titleWidth:title?.getBoundingClientRect().width||0,
      trailingWidth:trailing?.getBoundingClientRect().width||0,
      rowHeight:el.getBoundingClientRect().height
    };
  });
  expect(layout.role).toBe('button');
  expect(layout.tabIndex).toBe(0);
  expect(layout.tagWidth).toBeGreaterThanOrEqual(48);
  expect(layout.tagWidth).toBeLessThanOrEqual(56);
  expect(layout.titleWidth).toBeGreaterThan(layout.tagWidth);
  expect(layout.trailingWidth).toBeGreaterThan(20);
  expect(layout.rowHeight).toBeLessThan(90);
});
test('[M] smartphone Progresso usa linhas compactas acionáveis',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='iphone-webkit','Validação visual exclusiva do smartphone.');
  await page.goto('/#progress');
  await expect(page.locator('html')).toHaveClass(/is-phone-layout/);
  const subjects=page.locator('[data-mobile-progress-group="subjects"]');
  await expect(subjects).toBeVisible();
  if(!(await subjects.evaluate(el=>el.open)))await subjects.locator(':scope > summary').click();
  const course=page.locator('#progressInfo .progress-course').first();
  await expect(course).toBeVisible();
  if(await course.evaluate(el=>el.classList.contains('is-collapsed')))await course.locator('[data-progress-course-toggle]').click();
  const rows=course.locator('.progress-map-row');
  const count=await rows.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(3);

  const row=rows.first();
  await expect(row.locator('.compact-code')).toBeVisible();
  await expect(row.locator('.progress-map-thumb')).toHaveCount(0);
  await expect(row.locator('.progress-open')).toHaveCount(0);
  await expect(row.locator('.progress-map-trailing')).toBeVisible();
  const layout=await row.evaluate(el=>{
    const tag=el.querySelector('.compact-code');
    const title=el.querySelector('.progress-map-copy>b');
    const filter=document.querySelector('.progress-filter');
    const view=document.querySelector('[data-view="progress"]');
    return{
      rowHeight:el.getBoundingClientRect().height,
      tagWidth:tag?.getBoundingClientRect().width||0,
      lineClamp:getComputedStyle(title).webkitLineClamp,
      filterHeight:filter?.getBoundingClientRect().height||0,
      progressPaddingBottom:parseFloat(getComputedStyle(view).paddingBottom)||0,
      role:el.getAttribute('role'),
      tabIndex:el.tabIndex
    };
  });
  expect(layout.rowHeight).toBeLessThan(90);
  expect(layout.tagWidth).toBeGreaterThanOrEqual(46);
  expect(layout.tagWidth).toBeLessThanOrEqual(54);
  expect(layout.lineClamp).toBe('2');
  expect(layout.filterHeight).toBeLessThanOrEqual(42);
  expect(layout.progressPaddingBottom).toBeGreaterThanOrEqual(100);
  expect(layout.role).toBe('button');
  expect(layout.tabIndex).toBe(0);

  await expect(page.locator('#progressSortTrigger')).toBeVisible();
  await page.locator('#progressSortTrigger').click();
  await expect(page.locator('#progressSortSheet')).toBeVisible();
  const sheetBox=await page.locator('#progressSortSheet').boundingBox();
  expect(sheetBox.y).toBeGreaterThanOrEqual(0);
  expect(sheetBox.y+sheetBox.height).toBeLessThanOrEqual(845);
  await page.locator('#progressSortClose').click();
  await expect(page.locator('#progressSortSheet')).toBeHidden();
});
test('[M] Home compacta Prioridade, Ritmo e Plano do dia em linhas acionáveis',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='iphone-webkit','Validação exclusiva do iPhone.');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  await page.waitForFunction(()=>typeof combinedMaps==='function'&&combinedMaps().length>0);
  await expect(page.locator('#homeStudyPlan .study-plan-item').first()).toBeVisible();
  const data=await page.evaluate(()=>{
    const plan=[...document.querySelectorAll('#homeStudyPlan .study-plan-item')];
    const intel=[...document.querySelectorAll('.study-intelligence-row>article')];
    const first=plan[0],action=first?.querySelector('button');
    const fr=first?.getBoundingClientRect(),ar=action?.getBoundingClientRect();
    return{
      planMax:Math.max(0,...plan.map(el=>el.getBoundingClientRect().height)),
      intelMax:Math.max(0,...intel.map(el=>el.getBoundingClientRect().height)),
      actionCovers:!!fr&&!!ar&&Math.abs(fr.width-ar.width)<=2&&Math.abs(fr.height-ar.height)<=2,
      roleVisible:[...document.querySelectorAll('#homeCourses .course-card-role')].some(el=>getComputedStyle(el).display!=='none'),
      activityVisible:[...document.querySelectorAll('#homeCourses .course-last-activity-card')].some(el=>getComputedStyle(el).display!=='none'),
      scrollWidth:document.documentElement.scrollWidth,
      width:innerWidth
    };
  });
  expect(data.planMax).toBeLessThanOrEqual(72);
  expect(data.intelMax).toBeLessThanOrEqual(150);
  expect(data.actionCovers).toBe(true);
  expect(data.roleVisible).toBe(false);
  expect(data.activityVisible).toBe(false);
  expect(data.scrollWidth).toBeLessThanOrEqual(data.width+2);
});

test('[M] Home e Progresso usam tags compactas em vez de capas nos blocos densos',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='iphone-webkit','Validação exclusiva do iPhone.');

  await page.setViewportSize({width:390,height:844});
  await page.goto('/#home');
  await page.waitForFunction(()=>typeof combinedMaps==='function'&&combinedMaps().length>0);
  await page.evaluate(()=>{
    const map=combinedMaps()[0];
    localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));
    renderHome();
    if(typeof renderHomeSimulations==='function')renderHomeSimulations();
  });
  await expect(page.locator('#continueBox .continue-card')).toBeVisible();
  await expect(page.locator('#homeSimulations .simulation-recent-item').first()).toBeVisible();

  await expect(page.locator('#continueBox .continue-thumb')).toBeHidden();
  await expect(page.locator('#continueBox .continue-map-code')).toBeVisible();
  const homeData=await page.evaluate(()=>{
    const card=document.querySelector('#continueBox .continue-card');
    const action=card?.querySelector(':scope>.primary');
    const sims=document.querySelector('.simulation-recent-list');
    const items=[...document.querySelectorAll('#homeSimulations .simulation-recent-item')];
    return{
      continueHeight:card?.getBoundingClientRect().height||0,
      continueActionWidth:action?.getBoundingClientRect().width||0,
      continueWidth:card?.getBoundingClientRect().width||0,
      simDisplay:sims?getComputedStyle(sims).display:'',
      simOverflow:sims?getComputedStyle(sims).overflowX:'',
      simCount:items.length,
      simMaxHeight:Math.max(0,...items.map(el=>el.getBoundingClientRect().height)),
      documentScrollWidth:document.documentElement.scrollWidth,
      width:innerWidth
    };
  });
  expect(homeData.continueHeight).toBeLessThan(155);
  expect(Math.abs(homeData.continueActionWidth-homeData.continueWidth)).toBeLessThanOrEqual(2);
  expect(homeData.simDisplay).toBe('grid');
  expect(['visible','clip']).toContain(homeData.simOverflow);
  expect(homeData.simCount).toBeLessThanOrEqual(3);
  expect(homeData.simMaxHeight).toBeLessThan(110);
  expect(homeData.documentScrollWidth).toBeLessThanOrEqual(homeData.width+2);

  await page.goto('/#progress');
  const summary=page.locator('[data-mobile-progress-group="summary"]');
  await expect(summary).toBeVisible();
  if(!(await summary.evaluate(el=>el.open)))await summary.locator(':scope>summary').click();

  const insight=page.locator('#progressInsights .progress-insight-card.is-primary');
  await expect(insight).toBeVisible();
  await expect(insight.locator('.progress-insight-thumb img')).toBeHidden();
  await expect(insight.locator('.progress-insight-thumb>span')).toBeVisible();

  const progressData=await page.evaluate(()=>{
    const metrics=[...document.querySelectorAll('#progressMetrics .metric')];
    const visibleMetrics=metrics.filter(el=>getComputedStyle(el).display!=='none');
    const card=document.querySelector('#progressInsights .progress-insight-card.is-primary');
    const action=card?.querySelector(':scope>.secondary');
    return{
      metricCount:visibleMetrics.length,
      metricMaxHeight:Math.max(0,...visibleMetrics.map(el=>el.getBoundingClientRect().height)),
      insightHeight:card?.getBoundingClientRect().height||0,
      insightWidth:card?.getBoundingClientRect().width||0,
      actionWidth:action?.getBoundingClientRect().width||0,
      actionHeight:action?.getBoundingClientRect().height||0,
      thumbWidth:card?.querySelector('.progress-insight-thumb')?.getBoundingClientRect().width||0
    };
  });
  expect(progressData.metricCount).toBe(4);
  expect(progressData.metricMaxHeight).toBeLessThanOrEqual(72);
  expect(progressData.insightHeight).toBeLessThanOrEqual(96);
  expect(progressData.thumbWidth).toBeLessThanOrEqual(82);
  expect(progressData.actionWidth).toBeLessThan(progressData.insightWidth);
  expect(progressData.actionHeight).toBeGreaterThanOrEqual(40);
});


test('[D] Retomar onde parei preserva capa completa e conteúdo dentro do card',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Validação exclusiva do desktop.');
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/#home');
  await page.waitForFunction(()=>typeof combinedMaps==='function'&&combinedMaps().length>0);
  await page.evaluate(()=>{
    const map=combinedMaps()[0];
    localStorage.setItem('studyapp.lastMap',map._key||mapKey(map));
    renderHome();
  });
  const card=page.locator('#continueBox .continue-card');
  await expect(card).toBeVisible();
  const data=await card.evaluate(el=>{
    const thumb=el.querySelector('.continue-thumb');
    const img=thumb?.querySelector('img');
    const content=el.querySelector('.continue-content');
    const action=el.querySelector(':scope>.primary');
    const states=el.querySelector('.continue-states');
    const cardBox=el.getBoundingClientRect();
    const thumbBox=thumb?.getBoundingClientRect();
    const contentBox=content?.getBoundingClientRect();
    const actionBox=action?.getBoundingClientRect();
    const statesBox=states?.getBoundingClientRect();
    return{
      cardHeight:cardBox.height,
      cardWidth:cardBox.width,
      thumbWidth:thumbBox?.width||0,
      thumbHeight:thumbBox?.height||0,
      objectFit:img?getComputedStyle(img).objectFit:'',
      contentInside:!!contentBox&&contentBox.left>=cardBox.left-1&&contentBox.right<=cardBox.right+1&&contentBox.bottom<=cardBox.bottom+1,
      actionInside:!!actionBox&&actionBox.left>=cardBox.left-1&&actionBox.right<=cardBox.right+1&&actionBox.bottom<=cardBox.bottom+1,
      statesInside:!statesBox||(statesBox.left>=cardBox.left-1&&statesBox.right<=cardBox.right+1&&statesBox.bottom<=cardBox.bottom+1),
      overflowX:document.documentElement.scrollWidth-innerWidth
    };
  });
  expect(data.cardHeight).toBeGreaterThanOrEqual(150);
  expect(data.thumbHeight).toBeGreaterThanOrEqual(110);
  expect(data.thumbWidth/data.thumbHeight).toBeGreaterThan(1.72);
  expect(data.thumbWidth/data.thumbHeight).toBeLessThan(1.83);
  expect(data.objectFit).toBe('contain');
  expect(data.contentInside).toBe(true);
  expect(data.actionInside).toBe(true);
  expect(data.statesInside).toBe(true);
  expect(data.overflowX).toBeLessThanOrEqual(2);
});


/* PASSO 2 · Black Editorial + Liquid Glass refinado */
test('V15.48 [G] Black Editorial neutro aplica tokens e evita glass-on-glass',async({page},testInfo)=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('app-booting'));
  const data=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement);
    const topbar=document.querySelector('.topbar');
    const search=document.querySelector('.topbar .search');
    const sync=document.querySelector('#syncTop');
    const activeSide=document.querySelector('.side .nav-btn.active');
    const activeDock=document.querySelector('.bottom-nav>button.active');
    const readFilter=el=>el?(getComputedStyle(el).backdropFilter||getComputedStyle(el).webkitBackdropFilter||'none'):'missing';
    return{
      bg:root.getPropertyValue('--mm-bg').trim().toUpperCase(),
      bgDeep:root.getPropertyValue('--mm-bg-deep').trim().toUpperCase(),
      surface1:root.getPropertyValue('--mm-surface-1').trim().toUpperCase(),
      regular:root.getPropertyValue('--mm-glass-regular-bg').trim(),
      dense:root.getPropertyValue('--mm-glass-dense-bg').trim(),
      clear:root.getPropertyValue('--mm-glass-clear-bg').trim(),
      topbarFilter:readFilter(topbar),
      searchFilter:readFilter(search),
      syncFilter:readFilter(sync),
      sideActiveFilter:readFilter(activeSide),
      dockActiveFilter:readFilter(activeDock)
    };
  });
  expect(data.bg).toBe('#040404');
  expect(data.bgDeep).toBe('#020202');
  expect(data.surface1).toBe('#0B0B0B');
  expect(data.regular).toBe('rgba(9,9,9,.60)');
  expect(data.dense).toBe('rgba(8,8,8,.82)');
  expect(data.clear).toBe('rgba(12,12,12,.24)');
  expect(data.searchFilter).toBe('none');
  expect(data.syncFilter).toBe('none');
  if(testInfo.project.name!=='iphone-webkit')expect(data.sideActiveFilter).toBe('none');
  if(data.dockActiveFilter!=='missing')expect(data.dockActiveFilter).toBe('none');
  expect(data.topbarFilter).not.toBe('none');
});

test('V15.42 [G] PASSO 2 · breakpoints e overflow permanecem íntegros',async({page},testInfo)=>{
  const project=testInfo.project.name;
  const cases=project==='desktop-chromium'
    ?[{width:1920,height:1080},{width:1440,height:900},{width:1280,height:720},{width:1000,height:760}]
    :project==='ipad'
      ?[{width:1024,height:834},{width:900,height:1000},{width:820,height:1180}]
      :[{width:390,height:844}];

  for(const viewport of cases){
    await page.setViewportSize(viewport);
    await page.goto('/#home');
    await page.waitForFunction(()=>!document.documentElement.classList.contains('app-booting'));
    const state=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      side:document.querySelector('.side')?getComputedStyle(document.querySelector('.side')).display:'none',
      dock:document.querySelector('.bottom-nav')?getComputedStyle(document.querySelector('.bottom-nav')).display:'none',
      dockVisibleItems:[...document.querySelectorAll('.bottom-nav>button')].filter(el=>getComputedStyle(el).display!=='none').length
    }));
    expect(state.overflow).toBeLessThanOrEqual(2);
    if(project==='ipad'&&viewport.width>=900){
      expect(state.side).not.toBe('none');
      expect(state.dock).toBe('none');
    }
    if(project==='ipad'&&viewport.width<900){
      expect(state.side).toBe('none');
      expect(state.dock).not.toBe('none');
    }
    if(project==='iphone-webkit'){
      expect(state.dock).not.toBe('none');
      expect(state.dockVisibleItems).toBe(5);
    }
  }
});

test('V15.42 [G] PASSO 2 · conteúdo é matte e fallbacks de acessibilidade existem',async({page})=>{
  await page.goto('/#maps');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('app-booting'));
  const data=await page.evaluate(()=>{
    const card=document.querySelector('.map-card');
    const cardStyle=card?getComputedStyle(card):null;
    const sheet=[...document.styleSheets].find(s=>String(s.href||'').includes('black-editorial-liquid-glass-v2.css'));
    let css='';
    try{css=[...(sheet?.cssRules||[])].map(rule=>rule.cssText).join('\n')}catch{}
    const filter=cardStyle?(cardStyle.backdropFilter||cardStyle.webkitBackdropFilter||'none'):'missing';
    return{
      cardFilter:filter,
      reducedTransparency:css.includes('prefers-reduced-transparency'),
      moreContrast:css.includes('prefers-contrast'),
      reducedMotion:css.includes('prefers-reduced-motion'),
      forcedColors:css.includes('forced-colors'),
      hasFocusRule:css.includes(':focus-visible')
    };
  });
  if(data.cardFilter!=='missing')expect(data.cardFilter).toBe('none');
  expect(data.reducedTransparency).toBe(true);
  expect(data.moreContrast).toBe(true);
  expect(data.reducedMotion).toBe(true);
  expect(data.forcedColors).toBe(true);
  expect(data.hasFocusRule).toBe(true);
});


/* PASSO 3 · Dynamic Liquid Glass V2 · Optical Interaction */
test('V15.44 [G] PASSO 3 · runtime óptico, Inter e orçamento de glass estão ativos',async({page},testInfo)=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>window.MMDynamicGlass&&typeof window.MMDynamicGlass.snapshot==='function');
  await expect(page.locator('link[href*="dynamic-liquid-glass-v2.css"]')).toHaveCount(1);
  await expect(page.locator('script[src*="dynamic-liquid-glass-v2.js"]')).toHaveCount(1);

  const data=await page.evaluate(()=>{
    const snap=MMDynamicGlass.snapshot();
    const topbar=document.querySelector('.topbar');
    const search=document.querySelector('.topbar .search');
    const card=document.querySelector('.course-card,.map-card,.simulation-card');
    const filter=el=>el?(getComputedStyle(el).backdropFilter||getComputedStyle(el).webkitBackdropFilter||'none'):'missing';
    return{
      ...snap,
      font:getComputedStyle(document.body).fontFamily,
      topbarFilter:filter(topbar),
      searchFilter:filter(search),
      cardFilter:filter(card),
      flags:[...document.documentElement.classList].filter(x=>x.startsWith('mm-'))
    };
  });

  expect(data.font).toContain('Inter');
  expect(data.opticalSurfaces).toBeGreaterThan(0);
  expect(data.opticalSurfaces).toBeLessThan(120);
  expect(data.topbarFilter).not.toBe('none');
  expect(data.searchFilter).toBe('none');
  if(data.cardFilter!=='missing')expect(data.cardFilter).toBe('none');
  expect(data.flags).toContain('mm-optics-supported');
  if(testInfo.project.name==='desktop-chromium')expect(data.flags).toContain('mm-pointer-fine');
  if(testInfo.project.name==='iphone-webkit')expect(data.flags).toContain('mm-touch');
});

test('V15.48.1 [G] seleção do dock é estática e mantém navegação acessível',async({page})=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>window.MMDynamicGlass);
  const side=page.locator('.side');
  const useSide=await side.isVisible();
  const host=useSide?side:page.locator('.bottom-nav');
  await expect(host).toBeVisible();
  const target=useSide?host.locator('.nav-btn[data-nav="maps"]'):host.locator(':scope > button[data-nav="maps"]');
  if(!useSide)await expect(host.locator(':scope > .mm-active-lens')).toHaveCount(0);
  await target.click();
  await expect(page.locator('[data-view="maps"]')).toHaveClass(/active/);
  await expect(target).toHaveClass(/active/);
  if(!useSide){
    const glass=await target.evaluate(el=>({background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color}));
    expect(glass.background).not.toBe('none');
    expect(glass.color).not.toBe('');
  }
});

test('V15.44 [G] PASSO 3 · busca e popover mantêm geometria conectada sem glass-on-glass',async({page})=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>window.MMDynamicGlass);
  const input=page.locator('#globalSearch');
  const shell=page.locator('.global-search-shell');
  const panel=page.locator('#globalSearchPanel');

  await input.fill('demhab');
  await expect(panel).toBeVisible();
  await expect(shell).toHaveClass(/mm-search-open/);
  await expect(panel).toHaveAttribute('data-mm-open','true');

  const optics=await page.evaluate(()=>{
    const inputShell=document.querySelector('.topbar .search');
    const panel=document.querySelector('#globalSearchPanel');
    const filter=el=>getComputedStyle(el).backdropFilter||getComputedStyle(el).webkitBackdropFilter||'none';
    return{
      searchFilter:filter(inputShell),
      panelFilter:filter(panel),
      sourceX:getComputedStyle(panel).getPropertyValue('--mm-source-x').trim(),
      sourceY:getComputedStyle(panel).getPropertyValue('--mm-source-y').trim()
    };
  });
  expect(optics.searchFilter).toBe('none');
  expect(optics.panelFilter).not.toBe('none');
  expect(optics.sourceX).not.toBe('');
  expect(optics.sourceY).not.toBe('');
  await input.press('Escape');
  await expect(panel).toBeHidden();
});

test('V15.44 [G] PASSO 3 · Reduce Motion e Reduce Transparency preservam estado final',async({page})=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>window.MMDynamicGlass);
  await page.evaluate(()=>document.documentElement.classList.add('mm-reduced-motion'));
  const motion=await page.locator('.mm-active-lens').first().evaluate(el=>({
    transition:getComputedStyle(el).transitionDuration,
    animation:getComputedStyle(el).animationName
  }));
  expect(['0s','0s, 0s, 0s, 0s, 0s']).toContain(motion.transition);
  expect(['none','']).toContain(motion.animation);

  await page.evaluate(()=>document.documentElement.classList.add('mm-reduced-transparency'));
  const transparency=await page.locator('.topbar').evaluate(el=>({
    filter:getComputedStyle(el).backdropFilter||getComputedStyle(el).webkitBackdropFilter||'none',
    background:getComputedStyle(el).backgroundColor
  }));
  expect(transparency.filter).toBe('none');
  expect(transparency.background).not.toBe('rgba(0, 0, 0, 0)');
});

test('V15.44 [G] PASSO 3 · pointer tracking é coalescido e touch não depende de hover',async({page},testInfo)=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>window.MMDynamicGlass);
  const before=await page.evaluate(()=>MMDynamicGlass.snapshot());

  if(testInfo.project.name==='desktop-chromium'){
    const box=await page.locator('.topbar').boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box.x+box.width*.25,box.y+box.height*.5);
    await page.mouse.move(box.x+box.width*.75,box.y+box.height*.5);
    await page.waitForTimeout(40);
    const after=await page.evaluate(()=>MMDynamicGlass.snapshot());
    expect(after.pointerFrames).toBeGreaterThan(before.pointerFrames);
    expect(after.pointerRectReads-before.pointerRectReads).toBeLessThanOrEqual(2);
  }else{
    await page.locator('.bottom-nav [data-nav="maps"]:visible').first().tap();
    await page.waitForTimeout(40);
    const after=await page.evaluate(()=>MMDynamicGlass.snapshot());
    expect(after.pointerFrames).toBe(before.pointerFrames);
  }
});

test('V15.44 [G] PASSO 3 · 1280 desktop e iPad por largura não geram overflow',async({page},testInfo)=>{
  const cases=testInfo.project.name==='desktop-chromium'
    ?[{width:1280,height:720}]
    :testInfo.project.name==='ipad'
      ?[{width:1024,height:834},{width:900,height:1000},{width:820,height:1180}]
      :[{width:390,height:844}];

  for(const viewport of cases){
    await page.setViewportSize(viewport);
    await page.goto('/#home');
    await page.waitForFunction(()=>window.MMDynamicGlass);
    const state=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      side:getComputedStyle(document.querySelector('.side')).display,
      dock:getComputedStyle(document.querySelector('.bottom-nav')).display,
      dockItems:[...document.querySelectorAll('.bottom-nav>button')].filter(el=>getComputedStyle(el).display!=='none').length
    }));
    expect(state.overflow).toBeLessThanOrEqual(2);
    if(testInfo.project.name==='ipad'&&viewport.width>=900){
      expect(state.side).not.toBe('none');
      expect(state.dock).toBe('none');
    }
    if(testInfo.project.name==='ipad'&&viewport.width<900){
      expect(state.side).toBe('none');
      expect(state.dock).not.toBe('none');
    }
    if(testInfo.project.name==='iphone-webkit'){
      expect(state.dock).not.toBe('none');
      expect(state.dockItems).toBe(5);
    }
  }
});


/* PASSO 4 · Topographic Raster Environment */
test('V15.48.1 [G] PASSO 4 · SVG topográfico é contínuo, responsivo e sem mosaico',async({page},testInfo)=>{
  const project=testInfo.project.name;
  const cases=project==='desktop-chromium'
    ?[
      {width:1920,height:1080,opacity:.40},
      {width:2560,height:1440,opacity:.40}
    ]
    :project==='ipad'
      ?[
        {width:1024,height:834,opacity:.44},
        {width:820,height:1180,opacity:.44}
      ]
      :[
        {width:390,height:844,opacity:.48}
      ];

  for(const viewport of cases){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.goto('/#home');
    await page.waitForFunction(()=>!document.documentElement.classList.contains('app-booting'));

    const state=await page.evaluate(()=>{
      const root=getComputedStyle(document.documentElement);
      const topo=getComputedStyle(document.body,'::before');
      return{
        token:parseFloat(root.getPropertyValue('--mm-topo-opacity'))||0,
        image:topo.backgroundImage,
        repeat:topo.backgroundRepeat,
        position:topo.backgroundPosition,
        size:topo.backgroundSize,
        filter:topo.filter,
        overflow:document.documentElement.scrollWidth-innerWidth
      };
    });

    expect(Math.abs(state.token-viewport.opacity)).toBeLessThan(.005);
    expect(state.image).toContain('topographic-lines-v15-48-1.svg');
    expect(state.repeat).toBe('no-repeat');
    expect(state.filter).toBe('none');
    expect(state.overflow).toBeLessThanOrEqual(2);
    if(project==='iphone-webkit'){
      expect(state.position).toMatch(/center.*top|50% 0%/);
      expect(state.size).not.toBe('auto');
    }else{
      expect(state.size).toContain('cover');
    }
  }
});

test('V15.45 [G] PASSO 4 · topografia permanece global e conteúdo matte não recebe a textura',async({page})=>{
  for(const route of ['home','courses','maps','simulations','progress','agenda','settings']){
    await page.goto('/#'+route);
    await page.waitForFunction(()=>!document.documentElement.classList.contains('app-booting'));
    const state=await page.evaluate(()=>{
      const topo=getComputedStyle(document.body,'::before');
      const permanent=document.querySelector('.course-card,.map-card,.simulation-card,.progress-insight-card,.panel');
      const permanentImage=permanent?getComputedStyle(permanent).backgroundImage:'none';
      return{
        topoImage:topo.backgroundImage,
        topoRepeat:topo.backgroundRepeat,
        permanentImage,
        overflow:document.documentElement.scrollWidth-innerWidth
      };
    });
    expect(state.topoImage).toContain('topographic-lines-v15-48-1.svg');
    expect(state.topoRepeat).toBe('no-repeat');
    expect(state.permanentImage).not.toContain('topographic-lines-v15-48-1.svg');
    expect(state.overflow).toBeLessThanOrEqual(2);
  }
});

test('V15.45 [G] PASSO 4 · leitor continua limpo e restaura o ambiente ao fechar',async({page})=>{
  await page.goto('/#course/porto-alegre');
  await page.waitForFunction(()=>document.querySelectorAll('#courseMaps .map-card').length>0);
  const before=await page.evaluate(()=>parseFloat(getComputedStyle(document.body,'::before').opacity)||0);
  expect(before).toBeGreaterThan(0);

  const card=page.locator('#courseMaps .map-card').first();
  await card.click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  const openOpacity=await page.evaluate(()=>parseFloat(getComputedStyle(document.body,'::before').opacity)||0);
  expect(openOpacity).toBe(0);

  await page.locator('#readerClose').click();
  await expect(page.locator('#reader')).not.toHaveClass(/open/);
  const restored=await page.evaluate(()=>parseFloat(getComputedStyle(document.body,'::before').opacity)||0);
  expect(restored).toBeGreaterThan(0);
});

test('V15.45 [G] PASSO 4 · Liquid Glass preserva material existente sobre o novo raster',async({page})=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>window.MMDynamicGlass&&typeof window.MMDynamicGlass.snapshot==='function');
  const data=await page.evaluate(()=>{
    const topo=getComputedStyle(document.body,'::before');
    const topbar=document.querySelector('.topbar');
    const side=document.querySelector('.side');
    const filter=el=>el?(getComputedStyle(el).backdropFilter||getComputedStyle(el).webkitBackdropFilter||'none'):'missing';
    return{
      topo:topo.backgroundImage,
      topbarFilter:filter(topbar),
      sideFilter:filter(side),
      dynamic:window.MMDynamicGlass.snapshot()
    };
  });
  expect(data.topo).toContain('topographic-lines-v15-48-1.svg');
  expect(data.topbarFilter).not.toBe('none');
  if(await page.locator('.side').isVisible())expect(data.sideFilter).not.toBe('none');
  expect(data.dynamic.opticalSurfaces).toBeGreaterThan(0);
});


test('[G] consolidação Black Editorial mantém topografia, sidebar, popovers e ordenação canônicos',async({page},testInfo)=>{
  const topoOpacity=await page.evaluate(()=>parseFloat(getComputedStyle(document.body,'::before').opacity)||0);
  if(testInfo.project.name==='iphone-webkit')expect(topoOpacity).toBeGreaterThanOrEqual(.45);
  else if(testInfo.project.name==='ipad')expect(topoOpacity).toBeGreaterThanOrEqual(.41);
  else expect(topoOpacity).toBeGreaterThanOrEqual(.37);

  if(testInfo.project.name==='desktop-chromium'){
    const side=page.locator('.side');
    await expect(side).toBeVisible();
    const sidebarState=await page.evaluate(()=>({
      bottomPosition:getComputedStyle(document.querySelector('.side-bottom')).position,
      bottomOffset:parseFloat(getComputedStyle(document.querySelector('.side-bottom')).bottom)||0,
      specular:document.querySelector('.side').classList.contains('mm-specular')
    }));
    expect(sidebarState.bottomPosition).toBe('absolute');
    expect(sidebarState.bottomOffset).toBeGreaterThan(0);
    expect(sidebarState.specular).toBe(false);

    const inactive=page.locator('.side .nav-btn[data-nav="courses"]');
    await inactive.hover();
    const hover=await inactive.evaluate(el=>({background:getComputedStyle(el).backgroundImage,backgroundColor:getComputedStyle(el).backgroundColor}));
    expect(hover.background).toBe('none');
    // V2: hover recebe leve tonalidade sem virar outra superfície glass.
    expect(hover.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  }

  await page.goto('/#course/porto-alegre');
  await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);
  const courseMore=page.locator('#courseMoreBtn');
  if(await courseMore.isVisible()){
    await courseMore.click();
    const menu=page.locator('#courseMoreMenu');
    await expect(menu).toBeVisible();
    expect(await menu.evaluate(el=>el.parentElement===document.body)).toBe(true);
    await page.locator('#importBtn2').click();
    await expect(page.locator('#importModal')).toHaveClass(/open/);
    await page.locator('#importCancel').click();
  }

  await page.goto('/#progress');
  await expect(page.locator('#progressSort')).toHaveCount(0);
  if(testInfo.project.name==='iphone-webkit'){
    const subjects=page.locator('[data-mobile-progress-group="subjects"]');
    await expect(subjects).toBeVisible();
    if(!(await subjects.evaluate(el=>el.open)))await subjects.locator(':scope > summary').click();
  }
  const sortTrigger=page.locator('#progressSortTrigger');
  await expect(sortTrigger).toBeVisible();
  await sortTrigger.click();
  await expect(page.locator('#progressSortSheet')).toBeVisible();
  await page.locator('[data-progress-sort-option="alpha"]').click();
  await expect(page.locator('#progressSortLabel')).toHaveText('A–Z');

  const merge=await page.evaluate(()=>{
    const local={coverOverrides:{'course::porto-alegre':{path:'local.webp',updatedAt:'2026-10-07T10:00:00.000Z'}}};
    const cloud={coverOverrides:{'course::porto-alegre':{path:'cloud.webp',updatedAt:'2026-10-07T11:00:00.000Z'}}};
    return mergePreferencePayloads(local,cloud,Date.parse('2026-10-07T12:00:00.000Z'),Date.parse('2026-10-07T09:00:00.000Z')).coverOverrides['course::porto-alegre'];
  });
  expect(merge.path).toBe('cloud.webp');
});


test('V15.48 mantém modais fora da shell em Black Editorial neutro',async({page})=>{
  await page.goto('/#courses');
  await page.evaluate(()=>openModal('courseManageModal'));
  const modal=page.locator('#courseManageModal');
  await expect(modal).toHaveClass(/open/);
  const visual=await page.evaluate(()=>{
    const modal=document.querySelector('#courseManageModal');
    const card=modal.querySelector('.modal-card');
    const input=document.querySelector('#manageCourseTitle');
    const before=getComputedStyle(input);
    const result={
      modalInsideApp:Boolean(modal.closest('.app')),
      inputBackground:before.backgroundColor,
      inputBackgroundImage:before.backgroundImage,
      cardBackground: getComputedStyle(card).backgroundColor,
      cardBackgroundImage:getComputedStyle(card).backgroundImage
    };
    input.focus();
    const focused=getComputedStyle(input);
    result.focusBorder=focused.borderTopColor;
    result.focusBackground=focused.backgroundColor;
    return result;
  });
  expect(visual.modalInsideApp).toBe(false);
  expect(visual.inputBackground).toBe('rgb(10, 10, 10)');
  expect(visual.inputBackgroundImage).toBe('none');
  expect(visual.focusBackground).toBe('rgb(10, 10, 10)');
  const focusRgb=(visual.focusBorder.match(/\d+/g)||[]).slice(0,3).map(Number);
  expect(focusRgb.length).toBe(3);
  expect(focusRgb[2]).toBeLessThanOrEqual(Math.max(focusRgb[0],focusRgb[1])+4);
  expect(visual.cardBackgroundImage).toContain('linear-gradient');
  expect(visual.cardBackgroundImage).not.toContain('rgb(8, 11, 15)');
});


/* LISTA MESTRA V2 — navegação por identidade e superfícies flutuantes. */
test('V15.48.2 [G] sete seções possuem identidades cromáticas distintas',async({page},testInfo)=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('app-booting'));
  const data=await page.evaluate(()=>{
    const colors={};
    for(const id of ['home','courses','maps','simulations','progress','agenda','settings']){
      const button=document.querySelector('.side .nav-btn[data-nav="'+id+'"]');
      colors[id]=button&&getComputedStyle(button).getPropertyValue('--nav-accent').trim();
    }
    return colors;
  });
  for(const [name,color] of Object.entries(data)){
    expect(color,name).toMatch(/^#[a-fA-F0-9]{6}$/);
  }
  expect(new Set(Object.values(data)).size).toBe(7);
  const tabletOrPhone=testInfo.project.name!=='desktop-chromium';
  if(tabletOrPhone){
    const result=await page.evaluate(()=>{
      const btn=document.querySelector('.bottom-nav button[data-nav="home"]');
      return {accent:getComputedStyle(btn).getPropertyValue('--nav-accent').trim(),
        icon:getComputedStyle(btn.querySelector('.ui-icon')).color};
    });
    expect(result.accent).toBe(data.home);
    expect(result.icon).not.toBe('');
  }
});

test('V15.48.2 [T+M] vidro de dock e topbar é translúcido, sem tarja',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='desktop-chromium');
  await page.goto('/#home');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('app-booting'));
  const visual=await page.evaluate(()=>{
    const root=document.documentElement;
    const dock=document.querySelector('.bottom-nav');
    const topbar=document.querySelector('.topbar');
    const wrap=document.querySelector('.topbar-wrap');
    const d=getComputedStyle(dock),t=getComputedStyle(topbar),w=getComputedStyle(wrap);
    const edge=dock.querySelector(':scope > .mm-scroll-edge');
    return {
      reduced:root.classList.contains('mm-reduced-transparency'),
      dockBackground:d.backgroundColor,
      dockFilter:d.backdropFilter||d.webkitBackdropFilter,
      topbarBackground:t.backgroundColor,
      topbarFilter:t.backdropFilter||t.webkitBackdropFilter,
      wrapBackground:w.backgroundColor,
      edgeVisible:edge&&getComputedStyle(edge).display!=='none',
      dockRadius:parseFloat(d.borderTopLeftRadius)
    };
  });
  expect(visual.edgeVisible).toBeFalsy();
  expect(visual.dockRadius).toBeGreaterThanOrEqual(12);
  expect(visual.wrapBackground).toBe('rgba(0, 0, 0, 0)');
  if(!visual.reduced){
    const alpha=color=>Number((color.match(/rgba?\([^)]+\)/)||[''])[0].split(',').at(-1).replace(')','').trim());
    expect(alpha(visual.dockBackground)).toBeLessThan(.5);
    expect(alpha(visual.topbarBackground)).toBeLessThan(.5);
    expect(visual.dockFilter).toContain('blur(');
    expect(visual.topbarFilter).toContain('blur(');
  }
});


test('V15.48.3 [G] somente menu ativo tem cor; inativos brancos em Desktop/iPad/iPhone',async({page},testInfo)=>{
  await page.goto('/#home');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('app-booting'));
  const prefix=testInfo.project.name==='desktop-chromium'?'.side .nav-btn':'.bottom-nav>button';
  const menu=id=>page.locator(prefix+'[data-nav="'+id+'"]');
  const icon=id=>menu(id).locator(':scope > .ui-icon');
  const label=id=>menu(id).locator(':scope > :is(.txt,.bottom-nav-label)');
  await expect(menu('home')).toHaveClass(/active/);
  await expect(icon('home')).not.toHaveCSS('color','rgb(244, 244, 244)');
  await expect(icon('courses')).toHaveCSS('color','rgb(244, 244, 244)');
  await expect(label('courses')).toHaveCSS('color','rgb(244, 244, 244)');
  await expect(icon('maps')).toHaveCSS('color','rgb(244, 244, 244)');
  if(testInfo.project.name==='desktop-chromium'){
    await menu('courses').hover();
    await expect(icon('courses')).toHaveCSS('color','rgb(244, 244, 244)');
    await expect(label('courses')).toHaveCSS('color','rgb(244, 244, 244)');
  }
  await menu('maps').click();
  await expect(menu('maps')).toHaveClass(/active/);
  await expect(icon('maps')).not.toHaveCSS('color','rgb(244, 244, 244)');
  await expect(label('maps')).not.toHaveCSS('color','rgb(244, 244, 244)');
  await expect(icon('home')).toHaveCSS('color','rgb(244, 244, 244)');
  await expect(label('home')).toHaveCSS('color','rgb(244, 244, 244)');
  if(testInfo.project.name==='iphone-webkit'){
    const more=page.locator('#mobileMenuBtn');
    await expect(more).toBeVisible();
    await expect(more.locator(':scope > .ui-icon')).toHaveCSS('color','rgb(244, 244, 244)');
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded','true');
    await expect(more.locator(':scope > .ui-icon')).not.toHaveCSS('color','rgb(244, 244, 244)');
    const option=page.locator('.mobile-menu-option[data-mobile-sheet-nav="agenda"]');
    await expect(option.locator('.ui-icon')).toHaveCSS('color','rgb(244, 244, 244)');
    await expect(option.locator('b')).toHaveCSS('color','rgb(244, 244, 244)');
  }
});


test('V15.48.6 [T] conteúdo atravessa o dock flutuante sem tarja inferior',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='ipad','Comportamento específico do iPad em retrato');
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/#courses');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('app-booting'));
  const state=await page.evaluate(async()=>{
    const nav=document.querySelector('.bottom-nav');
    const content=document.querySelector('.content');
    const probe=document.createElement('div');
    probe.setAttribute('data-dock-scroll-probe','');
    probe.style.cssText='height:80px;background:#f5b33f;position:relative;margin-top:900px;';
    const trailing=document.createElement('div');
    trailing.style.cssText='height:1400px;background:transparent;pointer-events:none';
    content.append(probe,trailing);
    const d=nav.getBoundingClientRect();
    document.documentElement.style.scrollBehavior='auto';
    window.scrollTo(0,probe.getBoundingClientRect().top+scrollY-d.top+15);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const n=nav.getBoundingClientRect(),p=probe.getBoundingClientRect();
    const cs=getComputedStyle(nav);
    const lowerPoint=document.elementFromPoint(innerWidth/2,Math.min(innerHeight-2,n.bottom+4));
    const overlap=p.top<n.bottom&&p.bottom>n.top;
    const value={overlap,navFixed:cs.position==='fixed',navRadius:parseFloat(cs.borderTopLeftRadius),glass:cs.backdropFilter||cs.webkitBackdropFilter,
      navColor:cs.backgroundColor,lowerIsNav:lowerPoint===nav||nav.contains(lowerPoint),
      pageOverflow:document.documentElement.scrollWidth-innerWidth};
    probe.remove();trailing.remove();return value;
  });
  expect(state.navFixed).toBe(true);
  expect(state.overlap).toBe(true);
  expect(state.navRadius).toBeGreaterThanOrEqual(16);
  expect(state.glass).toContain('blur(');
  expect(state.lowerIsNav).toBe(false);
  expect(state.pageOverflow).toBeLessThanOrEqual(2);
});

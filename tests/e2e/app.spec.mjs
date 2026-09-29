import { test, expect } from '@playwright/test';
test.beforeEach(async({page})=>{const runtimeErrors=[];page.on('pageerror',error=>runtimeErrors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')runtimeErrors.push(msg.text())});page.runtimeErrors=runtimeErrors;await page.addInitScript(()=>localStorage.setItem('studyapp.lastSeenVersion','14.4.0'));await page.goto('/#home');await expect(page.locator('[data-view="home"]')).toHaveClass(/active/)});
test.afterEach(async({page})=>{const errors=page.runtimeErrors||[];expect(errors,errors.join('\n')).toEqual([])});
test('navegação principal funciona',async({page})=>{for(const view of ['courses','maps','simulations','progress','settings','home']){await page.locator(`[data-nav="${view}"]`).first().click();await expect(page.locator(`[data-view="${view}"]`)).toHaveClass(/active/)}});
test('curso abre e mantém rota',async({page})=>{const course=page.locator('#homeCourses [data-course="porto-alegre"]');await expect(course).toBeVisible();await course.click();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);await expect(page.locator('#courseTitle')).toContainText('DEMHAB');expect(page.url()).toContain('#course/porto-alegre')});
test('botão Abrir da tela Progresso abre mapa',async({page})=>{await page.goto('/#progress');const button=page.locator('#progressInfo [data-progress-open]').first();await expect(button).toBeVisible();await button.click();await expect(page.locator('#reader')).toHaveClass(/open/);await page.locator('#readerClose').click();await expect(page.locator('#reader')).not.toHaveClass(/open/)});
test('filtros de progresso não geram erro',async({page})=>{await page.goto('/#progress');const filters=page.locator('[data-progress-filter]'),count=await filters.count();for(let i=0;i<count;i++)await filters.nth(i).click()});
test('simulados renderizam',async({page})=>{await page.goto('/#simulations');await expect(page.locator('#simulationGrid')).not.toBeEmpty()});

test('busca global mostra resultados instantâneos sem navegar',async({page})=>{const input=page.locator('#globalSearch'),panel=page.locator('#globalSearchPanel');await input.fill('demhab');await expect(panel).toBeVisible();await expect(page.locator('[data-view="home"]')).toHaveClass(/active/);await expect(panel.locator('[role="option"]').first()).toBeVisible();await input.press('ArrowDown');await expect(panel.locator('[role="option"]').first()).toHaveAttribute('aria-selected','true');await input.press('Escape');await expect(panel).toBeHidden()});
test('barra sticky do curso aparece após toolbar sair pelo topo',async({page})=>{const course=page.locator('#homeCourses [data-course="porto-alegre"]');await course.click();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);await page.locator('#courseMaps').evaluate(el=>el.scrollIntoView({block:'start'}));await page.waitForTimeout(150);await expect(page.locator('#courseStickyBar')).toBeVisible();await expect(page.locator('#courseStickyTitle')).toContainText('DEMHAB')});
test('tempo de estudo conta atividade, pausa por inatividade e retoma',async({page},testInfo)=>{test.skip(testInfo.project.name==='ipad','Cobertura funcional única; UI iPad permanece coberta pelos demais testes.');const course=page.locator('#homeCourses [data-course="porto-alegre"]');await course.click();const card=page.locator('#courseMaps [data-map]').first();await card.click();await expect(page.locator('#reader')).toHaveClass(/open/);const result=await page.evaluate(()=>{const key=StudyTime.currentKey(),base=Date.now(),before=StudyTime.mapSeconds(key);StudyTime.activity(base);StudyTime.tick(base+45000);const afterActive=StudyTime.mapSeconds(key);StudyTime.tick(base+120000);const afterIdleLimit=StudyTime.mapSeconds(key);StudyTime.tick(base+150000);const afterStopped=StudyTime.mapSeconds(key);StudyTime.activity(base+150000);StudyTime.tick(base+165000);const afterResume=StudyTime.mapSeconds(key);return{before,afterActive,afterIdleLimit,afterStopped,afterResume}});expect(result.afterActive-result.before).toBeGreaterThanOrEqual(44);expect(result.afterStopped).toBe(result.afterIdleLimit);expect(result.afterResume).toBeGreaterThan(result.afterStopped)});

test('regras de revisão programada usam os atrasos definidos',async({page})=>{const delays=await page.evaluate(()=>({difficult:reviewDelayDays({difficult:1,review:0,total:10,marked:1,done:0}),review:reviewDelayDays({difficult:0,review:1,total:10,marked:1,done:0}),done:reviewDelayDays({difficult:0,review:0,total:10,marked:1,done:1}),completed:reviewDelayDays({difficult:0,review:0,total:10,marked:10,done:10})}));expect(delays).toEqual({difficult:1,review:3,done:7,completed:14})});
test('restore point é reversível e mantém apenas os cinco mais recentes',async({page})=>{const result=await page.evaluate(async()=>{const key='mindmap_state::e2e-restore',modified='studyapp.modified::'+key;localStorage.setItem(key,'antes');localStorage.setItem(modified,new Date().toISOString());const point=await createRestorePoint('e2e','Teste reversível');localStorage.setItem(key,'depois');localStorage.setItem(modified,new Date(Date.now()+1000).toISOString());await restorePointNow(point.id);for(let i=0;i<6;i++)await createRestorePoint('e2e-limit','Ponto '+i);const points=await listRestorePoints();return{value:localStorage.getItem(key),count:points.length,labels:points.map(p=>p.label)}});expect(result.value).toBe('antes');expect(result.count).toBeLessThanOrEqual(5);expect(result.labels.length).toBeGreaterThan(0)});

test('analytics dos simulados calcula 60 70 80 e mostra evolução',async({page})=>{await page.goto('/#simulations');const key=await page.evaluate(()=>{const simulation=combinedSimulations()[0],key=simulation._key||simulationKey(simulation),now=Date.now();state.simAttempts[key]=[{score:80,correct:8,total:10,durationSeconds:900,finishedAt:new Date(now).toISOString(),sections:{Português:{correct:8,total:10}}},{score:70,correct:7,total:10,durationSeconds:840,finishedAt:new Date(now-60000).toISOString()},{score:60,correct:6,total:10,durationSeconds:780,finishedAt:new Date(now-120000).toISOString()}];state.simResults[key]=state.simAttempts[key][0];localStorage.setItem('studyapp.simAttempts',JSON.stringify(state.simAttempts));localStorage.setItem('studyapp.simResults',JSON.stringify(state.simResults));renderSimulations();return key});const analytics=await page.evaluate(key=>simulationAnalytics(key),key);expect(analytics.count).toBe(3);expect(analytics.latest.score).toBe(80);expect(analytics.best).toBe(80);expect(analytics.average).toBe(70);const card=page.locator('[data-simulation-history="'+key+'"]').locator('xpath=ancestor::article');await expect(card).toContainText('Última');await expect(card).toContainText('80%');await expect(card).toContainText('Média');await expect(card).toContainText('70%');await card.locator('[data-simulation-history]').click();await expect(page.locator('#simulationHistoryModal')).toHaveClass(/open/);await expect(page.locator('#simulationAnalyticsSummary')).toContainText('Tempo médio');await expect(page.locator('#simulationAnalyticsTrend span')).toHaveCount(3);const heights=await page.locator('#simulationAnalyticsTrend span').evaluateAll(nodes=>nodes.map(node=>node.style.height));expect(heights).toEqual(['60%','70%','80%']);await expect(page.locator('#simulationAnalyticsSections')).toContainText('Português')});
test('novidades aparecem uma vez por versão',async({page})=>{await page.evaluate(()=>{localStorage.removeItem('studyapp.lastSeenVersion');maybeShowWhatsNew({version:'14.4.0',label:'V14.4.0',showWhatsNew:true,highlights:['Analytics dos simulados','Revisões com data','Tempo de estudo','Busca instantânea']})});await expect(page.locator('#whatsNewModal')).toHaveClass(/open/);await expect(page.locator('#whatsNewHighlights')).toContainText('Analytics dos simulados');await page.locator('#whatsNewAccept').click();await expect(page.locator('#whatsNewModal')).not.toHaveClass(/open/);expect(await page.evaluate(()=>localStorage.getItem('studyapp.lastSeenVersion'))).toBe('14.4.0')});
test('modo foco do mapa abre e fecha sem erro',async({page})=>{const course=page.locator('#homeCourses [data-course="porto-alegre"]');await course.click();await page.locator('#courseMaps [data-map]').first().click();await expect(page.locator('#reader')).toHaveClass(/open/);await page.locator('#readerMoreBtn').click();await page.locator('#readerFocusBtn').click();await expect(page.locator('#reader')).toHaveClass(/focus-mode/);await page.locator('#readerFocusExit').click();await expect(page.locator('#reader')).not.toHaveClass(/focus-mode/)});
test('rota sobrevive a reload e back forward',async({page})=>{await page.locator('#homeCourses [data-course="porto-alegre"]').click();await expect(page).toHaveURL(/#course\/porto-alegre/);await page.reload();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);await page.goBack();await expect(page.locator('[data-view="home"]')).toHaveClass(/active/);await page.goForward();await expect(page.locator('[data-view="course"]')).toHaveClass(/active/)});
test('configurações expõem backup restore points e versão do PWA',async({page})=>{await page.goto('/#settings');await expect(page.locator('#downloadBackupBtn')).toBeVisible();await expect(page.locator('#restoreBackupBtn')).toBeVisible();await expect(page.locator('#restorePointsList')).toBeVisible();expect(await page.evaluate(()=>APP_VERSION)).toBe('14.4.0');const backup=await page.evaluate(()=>buildStudyBackup());expect(backup.type).toBe('meus-mapas-backup');expect(backup.schemaVersion).toBe(1)});

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
  const result=await page.evaluate(async()=>{
    if(!('serviceWorker' in navigator))return{supported:false};
    const registration=await navigator.serviceWorker.ready;
    await checkForAppUpdate({silent:true});
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
  expect(result.version).toBe('14.4.0');
  expect(result.active).toBe(true);
  expect(result.waiting).toBe(false);
  expect(result.updateAvailable).toBe(false);
  expect(result.scriptURL).toContain('sw.js?v=14.4.0');
  expect(result.status).toContain('Aplicativo atualizado');
});

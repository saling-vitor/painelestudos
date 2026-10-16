import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
// Os testes funcionais simulam um usuário que JÁ confirmou as novidades.
// A confirmação é gravada ANTES do boot; assim a busca assíncrona do
// version.json não abre uma janela sobre controles que estamos testando.
// A funcionalidade real do modal é coberta separadamente logo abaixo.
async function enter(page,view){
  const response=await page.request.get('/version.json');
  expect(response.ok()).toBeTruthy();
  const release=await response.json();
  await page.addInitScript(version=>{
    try{localStorage.setItem('studyapp.lastSeenVersion',version)}catch{}
  },release.version);
  await page.goto('/#'+view);
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  await expect(page.locator('#whatsNewModal')).not.toHaveClass(/open/);
}

test('Novidades [G] · exibe uma vez e respeita confirmação real do usuário',async({page})=>{
  const response=await page.request.get('/version.json');
  expect(response.ok()).toBeTruthy();
  const release=await response.json();
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  if(!release.showWhatsNew)return;
  const modal=page.locator('#whatsNewModal');
  await expect(modal).toHaveClass(/open/,{timeout:15000});
  await expect(page.locator('#whatsNewVersion')).toContainText(release.label);
  await page.locator('#whatsNewAccept').click();
  await expect(modal).not.toHaveClass(/open/);
  expect(await page.evaluate(()=>localStorage.getItem('studyapp.lastSeenVersion'))).toBe(release.version);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  await expect(modal).not.toHaveClass(/open/);
});

test('Novidades [G][T+M] · consulta independente do registro do Service Worker',async({page})=>{
  const response=await page.request.get('/version.json');
  expect(response.ok()).toBeTruthy();
  const release=await response.json();
  test.skip(!release.showWhatsNew,'Versão sem janela de novidades');
  // Interrompe deliberadamente o registro do SW: informações desta versão
  // ainda precisam ser consultadas e apresentadas ao usuário.
  await page.route('**/sw.js*',route=>route.abort());
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  await expect(page.locator('#whatsNewModal')).toHaveClass(/open/,{timeout:15000});
  await expect(page.locator('#whatsNewVersion')).toContainText(release.label);
  await page.locator('#whatsNewAccept').click();
  await expect(page.locator('#whatsNewModal')).not.toHaveClass(/open/);
  expect(await page.evaluate(()=>localStorage.getItem('studyapp.lastSeenVersion'))).toBe(release.version);
});

/* Contrato E2E das sete pranchas, executável sem dados de demonstração. */
test('Simulados [G] · mensagens exigem iframe esperado e origem do portal',async({page})=>{
  await enter(page,'simulations');
  const results=await page.evaluate(()=>{
    const frame=document.querySelector('#simulationFrame');
    const key='e2e-simulation-message-origin';
    const previous=state.simulationReaderKey;
    state.simulationReaderKey=key;
    const data={type:'MEUS_MAPAS_SIM_RESULT',payload:{
      score:100,correct:1,wrong:0,blank:0,total:1,finishedAt:new Date().toISOString()
    }};
    const post=(origin,source)=>window.dispatchEvent(new MessageEvent('message',{origin,source,data}));
    post('https://external.invalid',frame.contentWindow);
    const foreignRejected=!Object.hasOwn(state.simResults,key);
    post(location.origin,window);
    const wrongFrameRejected=!Object.hasOwn(state.simResults,key);
    post(location.origin,frame.contentWindow);
    const trustedAccepted=state.simResults[key]?.correct===1;
    delete state.simResults[key];
    delete state.simAttempts[key];
    localStorage.setItem('studyapp.simResults',JSON.stringify(state.simResults));
    localStorage.setItem('studyapp.simAttempts',JSON.stringify(state.simAttempts));
    state.simulationReaderKey=previous;
    return{foreignRejected,wrongFrameRejected,trustedAccepted};
  });
  expect(results).toEqual({foreignRejected:true,wrongFrameRejected:true,trustedAccepted:true});
});


test('Leitor V211 [G] · mesmo HTML aceita namespaces isolados e rejeita mapa sem metadado',async({page})=>{
  // Bootstrap mínimo equivalente à construção de ns/stateKey do V134 real:
  // o documento converte CF88_V01 em cf88-v01 antes de gravar localStorage.
  const source='<!doctype html><html lang="pt-BR"><head><meta name="mindmap-storage-id" content="CF88_V01"><title>Mapa E2E</title></head><body class="mindmap-app"><main id="mapa-e2e">HTML compartilhado</main><script>const ns=document.querySelector("meta").content.toLowerCase().replace(/[^a-z0-9]+/g,"-");window.MINDMAP_V134={stateKey:"mindmap_state::"+ns,notesKey:"mindmap_notes::"+ns};</script></body></html>';
  // Simula a ponte autenticada APENAS neste ensaio: verifica o nome exato
  // das chaves solicitado ao backend, sem acesso às contas do usuário.
  await page.route('**/assets/js/cloud-core.js*',route=>route.fulfill({
    status:200,contentType:'application/javascript',
    body:`window.StudyCloud={
      configured:()=>true,session:()=>({user:{id:'reader-e2e'}}),
      restoreStorageKey:async key=>{
        const saved=JSON.parse(sessionStorage.getItem('reader-e2e-cloud-keys')||'[]');
        saved.push(key);sessionStorage.setItem('reader-e2e-cloud-keys',JSON.stringify(saved));
        return false;
      },
      syncStorageKey:async()=>true,reconcileAll:async()=>true
    };`
  }));
  await page.route('**/reader-namespace-e2e.html',route=>route.fulfill({
    status:200,contentType:'text/html; charset=utf-8',body:source
  }));
  const url=storageId=>'/reader.html?mode=local&href='+encodeURIComponent('/reader-namespace-e2e.html')+
    (storageId?'&storage-id='+encodeURIComponent(storageId):'');
  await page.goto(url(''));
  await expect(page.locator('#mapa-e2e')).toHaveText('HTML compartilhado');
  const original=await page.evaluate(()=>({
    keys:JSON.parse(sessionStorage.getItem('reader-e2e-cloud-keys')||'[]'),
    stateKey:window.MINDMAP_V134?.stateKey,
    notesKey:window.MINDMAP_V134?.notesKey
  }));
  expect(original.stateKey).toBe('mindmap_state::cf88-v01');
  expect(original.notesKey).toBe('mindmap_notes::cf88-v01');
  expect(original.keys).toContain(original.stateKey);
  expect(original.keys).toContain(original.notesKey);
  await page.goto(url('concurso-origem-v01'));
  await expect(page.locator('#mapa-e2e')).toHaveText('HTML compartilhado');
  await expect(page.locator('meta[name="mindmap-storage-id"]')).toHaveAttribute('content','concurso-origem-v01');
  await page.evaluate(()=>localStorage.setItem('mindmap_state::concurso-origem-v01','{"done":1}'));

  await page.goto(url('concurso-destino-v01'));
  await expect(page.locator('#mapa-e2e')).toHaveText('HTML compartilhado');
  await expect(page.locator('meta[name="mindmap-storage-id"]')).toHaveAttribute('content','concurso-destino-v01');
  const persisted=await page.evaluate(()=>({
    original:localStorage.getItem('mindmap_state::concurso-origem-v01'),
    copied:localStorage.getItem('mindmap_state::concurso-destino-v01')
  }));
  expect(persisted).toEqual({original:'{"done":1}',copied:null});

  await page.route('**/reader-no-namespace-e2e.html',route=>route.fulfill({
    status:200,contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html><body><main>Sem metadado</main></body></html>'
  }));
  await page.goto('/reader.html?mode=local&href='+encodeURIComponent('/reader-no-namespace-e2e.html')+
    '&storage-id=destino-sem-namespace');
  await expect(page.locator('.loading-card')).toContainText('HTML do mapa não declara namespace de progresso');
});

test('Leitor real V134 [G][T+M] · CF88 empacotada mantém namespace, conteúdo e toolbar',async({page})=>{
  test.setTimeout(90000);
  const href='cursos/porto-alegre/mapas/CF88_Constituicao_Federal_Estudo_V02.html';
  const url='/reader.html?mode=local&href='+encodeURIComponent(href)+
    '&storage-id=study-cf88-fundatec-arquiteto-poa';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.mindmap-app')).toBeVisible({timeout:45000});
  const info=await expect.poll(()=>page.evaluate(()=>({
    key:window.MINDMAP_V134?.stateKey||'',
    notes:window.MINDMAP_V134?.notesKey||'',
    title:document.title||'',
    hasToolbar:!!document.querySelector('.toolbar'),
    hasDoc:!!document.querySelector('main')
  })),{timeout:45000});
  await info.toMatchObject({
    key:'mindmap_state::study-cf88-fundatec-arquiteto-poa',
    notes:'mindmap_notes::study-cf88-fundatec-arquiteto-poa',
    hasToolbar:true,hasDoc:true
  });
});

test('Sete pranchas [G][T+M] · navegação e carimbos usam estado real',async({page})=>{
  await enter(page,'home');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  const sections=[
    ['home','editorialHome'],
    ['courses','editorialCourses'],
    ['maps','editorialMaps'],
    ['simulations','editorialSimulations'],
    ['progress','editorialProgress'],
    ['agenda','editorialAgenda'],
    ['settings','editorialSettings']
  ];
  for(const [view,id] of sections){
    await page.evaluate(v=>nav(v),view);
    await expect(page.locator('[data-view="'+view+'"]')).toHaveClass(/active/);
    await expect(page.locator('#'+id+' .pr-stamp')).toHaveCount(1);
    await expect(page.locator('#'+id+' .pr-stamp')).toBeVisible();
    if(view==='home'){
      const geometry=await page.locator('#editorialHome').evaluate(el=>({
        width:el.getBoundingClientRect().width,
        parent:el.parentElement.getBoundingClientRect().width
      }));
      expect(geometry.width,'A prancha do Início deve ocupar as duas colunas do grid antigo').toBeGreaterThan(geometry.parent*.82);
      await expect(page.locator('#homeStudyDashboard .study-command-art img')).toHaveAttribute('loading','eager');
    }
    // O painel de novidades pode abrir ao visitar Configurações. Fechá-lo
    // pelo botão real antes da captura, sem falsificar estilos nem estados.
    const news=page.locator('#whatsNewModal');
    if(await news.isVisible()){
      await page.locator('#whatsNewAccept').click();
      await expect(news).not.toHaveClass(/open/);
    }
    mkdirSync('visual-audit',{recursive:true});
    await page.screenshot({path:'visual-audit/prancha-'+test.info().project.name+'-'+view+'.png',animations:'disabled'});
  }
});
test('Home [G][T+M] · Todos automático substitui banner e cursos legados',async({page})=>{
  await enter(page,'home');
  const auto=await page.locator('#editorialHome [data-pr-home="todos"]').getAttribute('aria-pressed');
  // Sem prova cadastrada, "Todos" é a vista automática, sem seleção manual.
  if(auto==='true'){
    await expect(page.locator('[data-view="home"]')).toHaveAttribute('data-pr-manual-home','false');
    await expect(page.locator('[data-view="home"] > .hero')).toBeHidden();
    await expect(page.locator('[data-view="home"] > .home-courses-section')).toBeHidden();
    await expect(page.locator('#editorialHome .pr-stamp')).toBeVisible();
  }
});

test('Cinco telas da Home [G][T+M] · seleção não cria sessão paralela',async({page})=>{
  await enter(page,'home');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  const buttons=page.locator('#editorialHome [data-pr-home]');
  await expect(buttons).toHaveCount(5);
  if(test.info().project.name==='iphone-webkit'){
    const placement=await buttons.evaluateAll(elements=>elements.map(element=>{
      const button=element.getBoundingClientRect();
      const holder=element.closest('.pr-switch').getBoundingClientRect();
      return{left:button.left>=holder.left-1,right:button.right<=holder.right+1,
        viewportRight:button.right<=innerWidth+1};
    }));
    expect(placement,'As 5 telas do Início devem ficar visíveis no smartphone, sem recorte').toEqual(
      Array.from({length:5},()=>({left:true,right:true,viewportRight:true}))
    );
  }
  for(const key of ['todos','revisoes','sessao','pos','hoje']){
    const button=page.locator('#editorialHome [data-pr-home="'+key+'"]');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-view="home"]')).toHaveAttribute('data-editorial-mode',key);
    mkdirSync('visual-audit',{recursive:true});
    await page.screenshot({path:'visual-audit/home-'+test.info().project.name+'-'+key+'.png',animations:'disabled'});
  }
  const consistency=await page.evaluate(()=>({
    total:MeusMapasPranchas.snapshot().ms.length,
    visibleText:document.querySelector('#editorialHome')?.textContent||'',
    timer:document.querySelectorAll('#studyTimerFloat').length
  }));
  expect(consistency.visibleText).toContain('Planejamento de hoje');
  expect(consistency.timer).toBeLessThanOrEqual(1);
});
test('Biblioteca [G][T+M] · visualizações mantêm filtros existentes',async({page})=>{
  await enter(page,'maps');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  await expect(page.locator('#editorialMaps')).toBeVisible();
  for(const kind of ['lista','agrupado','grade']){
    const btn=page.locator('#editorialMaps [data-pr-library="'+kind+'"]');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-view="maps"]')).toHaveAttribute('data-pr-library-layout',kind);
  }
  await expect(page.locator('#allMaps')).toBeAttached();
});
test('Progresso [G][T+M] · observação sem histórico inventado',async({page})=>{
  await enter(page,'progress');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  await expect(page.locator('[data-view="progress"]')).toHaveClass(/active/);
  await expect(page.locator('#editorialProgress')).toBeVisible();
  const report=await page.evaluate(()=>{
    const rows=StudyDashboard.progressHistory();
    return {rows,total:MeusMapasPranchas.snapshot().ms.length,hasView:!!document.querySelector('#editorialProgress')};
  });
  expect(report.hasView).toBe(true);
  if(report.total===0)expect(report.rows.length).toBe(0);
  else {
    const scoped=await page.evaluate(()=>{
      const c=combinedCourses()[0],last=StudyDashboard.progressHistory().at(-1);
      return !c||!last?null:{byCourse:last.byCourse?.[c.id],mapTotal:combinedMaps().filter(m=>m.courseId===c.id).reduce((sum,m)=>sum+mapProgress(m).total,0)};
    });
    if(scoped?.byCourse)expect(scoped.byCourse.total).toBe(scoped.mapTotal);
    expect(report.rows.every(x=>x.marked>=0&&x.total>=x.marked)).toBe(true);
  }
});


test('Agenda [G][T+M] · horário persistente e compatibilidade dos itens antigos',async({page})=>{
  await enter(page,'agenda');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  await expect(page.locator('#editorialAgenda')).toBeVisible();
  const detail=await page.evaluate(()=>{
    const today=new Date(),date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
    const item=StudyDashboard.addAgenda({date,title:'Sessão com horário E2E',minutes:35,start:'08:35'});
    const saved=StudyDashboard.exportData().agenda.find(x=>x.id===item.id);
    const root=document.getElementById('agendaQuickForm');
    return {start:saved?.start,hasField:!!root?.querySelector('[name="start"]')};
  });
  expect(detail.start).toBe('08:35');
  expect(detail.hasField).toBe(true);
  const label=page.locator('#agendaDayDetail');
  await expect(label).toContainText('08:35');
  await expect(label).toContainText('Sessão com horário E2E');
});


test('Agenda [G][T+M] · conflitos são somente sugeridos até confirmação',async({page})=>{
  await enter(page,'agenda');
  await expect(page.locator('#editorialAgenda')).toBeVisible();
  const ids=await page.evaluate(()=>{
    const today=new Date(),date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
    const a=StudyDashboard.addAgenda({date,title:'Conflito A E2E',minutes:60,start:'19:00'});
    const b=StudyDashboard.addAgenda({date,title:'Conflito B E2E',minutes:30,start:'19:30'});
    MeusMapasPranchas.refresh();
    return[a.id,b.id];
  });
  await expect(page.locator('#editorialAgenda .pr-collision')).toHaveCount(2);
  const initial=await page.evaluate(ids=>ids.map(id=>StudyDashboard.exportData().agenda.find(r=>r.id===id)?.start),ids);
  expect(initial).toEqual(['19:00','19:30']);
  const proposal=page.locator('#editorialAgenda [data-pr-action="move-agenda"]').first();
  await proposal.click();
  await expect(page.locator('#confirmModal')).toBeVisible();
  await page.locator('#confirmAccept').click();
  await expect.poll(()=>page.evaluate(ids=>ids.map(id=>StudyDashboard.exportData().agenda.find(r=>r.id===id)?.start),ids)).not.toEqual(initial);
});
test('Simulados [G][T+M] · relatório interpreta tentativas reais do estado',async({page})=>{
  await enter(page,'simulations');
  await expect(page.locator('#editorialSimulations')).toBeVisible();
  const exists=await page.evaluate(()=>{
    const s=combinedSimulations()[0];if(!s)return false;
    const key=simulationKey(s);
    const result={score:75,correct:45,wrong:10,blank:5,total:60,finishedAt:'2026-10-15T12:00:00.000Z',sections:{'Projeto Arquitetônico':{correct:8,total:10}},mistakes:[{number:6,topic:'Normas',stem:'Item de teste sem dados reais de produção',answer:'B'}],questionResults:Array.from({length:60},(_,i)=>({number:i+1,status:i<45?'correct':i<55?'wrong':'blank',userAnswer:i<55?'A':'',answer:i<45?'A':'B',section:'Projeto Arquitetônico'}))};
    state.simResults[key]=result;state.simAttempts[key]=[result];MeusMapasPranchas.refresh();return true;
  });
  if(!exists){await expect(page.locator('#editorialSimulations')).toContainText('Nenhum simulado');return}
  await page.locator('#editorialSimulations [data-pr-sim="resultado"]').click();
  await expect(page.locator('#editorialSimulations .pr-sim-report')).toHaveCount(1);
  await expect(page.locator('#editorialSimulations .pr-sim-report')).toContainText('Projeto Arquitetônico');
  await expect(page.locator('#editorialSimulations .pr-sim-report')).toContainText('45');
  await expect(page.locator('#editorialSimulations .pr-sim-benchmark')).toContainText('Não informado');
  await expect(page.locator('#editorialSimulations .pr-answer-q')).toHaveCount(60);
  await page.locator('#editorialSimulations .pr-answer-q[data-pr-answer-question="46"]').click();
  await expect(page.locator('#editorialSimulations .pr-answer-detail')).toContainText('Questão 46 · errada');
  await page.locator('#editorialSimulations [data-pr-action="review-errors"]').first().click();
  await expect(page.locator('#editorialSimulations details.pr-sim-errors').first()).toHaveAttribute('open','');
  await expect(page.locator('#editorialSimulations details.pr-sim-errors').first()).toContainText('Normas');
});
test('Mapas [G][T+M] · vínculo compartilha HTML mas isola progresso por concurso',async({page})=>{
  await enter(page,'maps');
  await expect(page.locator('#editorialMaps')).toBeVisible();
  // Fixture local e isolada: nenhuma chamada de escrita ao Supabase real.
  // Diferentemente da cobertura anterior, este teste NÃO passa sem executar o vínculo.
  const data=await page.evaluate(async()=>{
    const from='e2e-curso-origem',to='e2e-curso-destino',owner='e2e-user',
      source={id:'mapa-e2e-origem',courseId:from,code:'MAPA-E2E',title:'Mapa de teste',
        storage_path:owner+'/'+from+'/mapa-e2e.html',storageId:'estudo-origem-e2e',hasBundled:false},
      original={session:StudyCloud.session,configured:StudyCloud.configured,me:StudyCloud.me,
        insert:StudyCloud.insert,rows:StudyCloud.rows,upload:StudyCloud.upload,loadCloud},
      courses=state.cloudCourses,maps=state.cloudMaps;
    state.cloudCourses=[{id:from,title:'Curso de origem E2E',status:'active'},{id:to,title:'Curso de destino E2E',status:'active'}];
    state.cloudMaps=[source];
    let inserted=null,uploads=0;
    StudyCloud.session=()=>({user:{id:owner}});
    StudyCloud.configured=()=>true;
    StudyCloud.me=async()=>({id:owner});
    StudyCloud.rows=async()=>[];
    StudyCloud.upload=async()=>{uploads++;throw Error('upload duplicado proibido')};
    StudyCloud.insert=async(table,row)=>{if(table!=='maps')throw Error('Tabela incorreta');inserted=row;return[{id:'linked-row-e2e',...row}]};
    loadCloud=async()=>{};
    try{
      await linkMapToCourse(mapKey(source),to);
      return {samePath:source.storage_path===inserted.storage_path,
        independentId:source.storageId!==inserted.storage_id,
        differentCourse:source.courseId!==inserted.course_id,
        uploads,readerParam:readerHref({...source,storageId:inserted.storage_id}).includes('storage-id='),
        configuredSource:readMapContentSources()[mapKey({courseId:to,code:source.code})]};
    }finally{
      Object.assign(StudyCloud,{session:original.session,configured:original.configured,me:original.me,
        insert:original.insert,rows:original.rows,upload:original.upload});
      loadCloud=original.loadCloud;state.cloudCourses=courses;state.cloudMaps=maps;
    }
  });
  expect(data).toEqual({samePath:true,independentId:true,differentCourse:true,
    uploads:0,readerParam:true,configuredSource:'cloud'});
});

test('Home [G][T+M] · sessão usa cronômetro original e um único estado',async({page})=>{
  await enter(page,'home');
  await expect(page.locator('#editorialHome')).toBeVisible();
  const before=await page.evaluate(()=>{
    StudyDashboard.start({mode:'free',label:'Cronômetro E2E',minutes:15});
    MeusMapasPranchas.refresh();
    return document.querySelectorAll('#studyTimerFloat').length;
  });
  await page.locator('#editorialHome [data-pr-home="sessao"]').click();
  await expect(page.locator('#editorialHome [data-pr-clock]')).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
  expect(before).toBeLessThanOrEqual(1);
  await expect(page.locator('#editorialHome')).toContainText('Cronômetro de estudo');
});
test('Home [G][T+M] · marcação pós-prova persiste sem arquivar concurso',async({page})=>{
  await enter(page,'home');
  await expect(page.locator('#editorialHome')).toBeVisible();
  const course=await page.evaluate(()=>{
    const current=state.cloudCourses[0];if(!current)return null;
    current.examDate='2026-10-14';current.exam_date='2026-10-14';
    MeusMapasPranchas.refresh();return current.id;
  });
  if(!course)return;
  await page.locator('#editorialHome [data-pr-home="pos"]').click();
  const mark=page.locator('#editorialHome [data-pr-action="exam-status"][data-pr-id="'+course+'"]');
  await expect(mark).toBeVisible();
  await mark.click();
  await expect(page.locator('#confirmModal')).toBeVisible();
  await page.locator('#confirmAccept').click();
  await expect.poll(()=>page.evaluate(id=>readExamStatuses()[id]?.completed,course)).toBe(true);
  const saved=await page.evaluate(id=>({status:localPreferences().examStatuses[id],archived:courseById(id)?.status==='archived'}),course);
  expect(saved.status.completed).toBe(true);
  expect(saved.archived).toBe(false);
});


test('Home [G][T+M] · atalho para revisões não permanece inerte',async({page})=>{
  await enter(page,'home');
  await expect(page.locator('#editorialHome')).toBeVisible();
  await page.locator('#editorialHome [data-pr-home="hoje"]').click();
  await page.locator('#editorialHome [data-pr-action="home"][data-pr-id="revisoes"]').click();
  await expect(page.locator('#editorialHome [data-pr-home="revisoes"]')).toHaveAttribute('aria-pressed','true');
});


test('Agenda [G][T+M] · Dia/Semana/Mês contam eventos reais e sinalizam datas de prova',async({page})=>{
  await enter(page,'agenda');
  await expect(page.locator('#editorialAgenda')).toBeVisible();
  await expect(page.locator('#editorialAgenda [data-pr-agenda-mode]')).toHaveCount(3);
  await page.locator('#editorialAgenda [data-pr-agenda-mode="semana"]').click();
  await expect(page.locator('#editorialAgenda .pr-agenda-week-day')).toHaveCount(7);
  await page.locator('#editorialAgenda [data-pr-agenda-mode="mes"]').click();
  await expect(page.locator('#editorialAgenda .pr-month-date')).toHaveCount(42);
  const day=await page.locator('#editorialAgenda .pr-month-date').filter({hasText:'15'}).first().getAttribute('data-pr-agenda-pick');
  if(day){await page.locator('#editorialAgenda [data-pr-agenda-pick="'+day+'"]').first().click();
    await expect(page.locator('#editorialAgenda .pr-agenda-datebar')).toBeVisible();}
  await page.locator('#editorialAgenda [data-pr-agenda-mode="dia"]').click();
  await expect(page.locator('#editorialAgenda .pr-hour-row')).toHaveCount(16);
});
test('Home [G][T+M] · abrir plano não inicia sessão paralela',async({page})=>{
  await enter(page,'home');
  const report=await page.evaluate(()=>{
    let n=0;
    const old=StudyDashboard.start,original=StudyPlanner.showTimePlan;
    StudyDashboard.start=()=>{n++;return null};
    StudyPlanner.showTimePlan=()=>undefined;
    const button=document.querySelector('#editorialHome [data-pr-action="study"]');
    if(button)button.click();
    StudyDashboard.start=old;StudyPlanner.showTimePlan=original;
    return{n,hasButton:!!button};
  });
  if(report.hasButton)expect(report.n).toBe(0);
});


test('Agenda [G][T+M] · evento antigo sem horário não ganha 19h fictícias',async({page})=>{
  await enter(page,'agenda');
  await expect(page.locator('#editorialAgenda')).toBeVisible();
  await page.evaluate(()=>{
    const today=new Date(),date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
    StudyDashboard.importData({agenda:[{id:'legacy-sem-horario-e2e',date,title:'Evento histórico E2E sem horário',kind:'study',minutes:22}]},{merge:true});
    renderStudyAgenda();MeusMapasPranchas.refresh();
  });
  const row=page.locator('#agendaDayDetail .agenda-entry').filter({hasText:'Evento histórico E2E sem horário'});
  await expect(row).toContainText('Sem horário');
  await expect(page.locator('#editorialAgenda')).toContainText('Sem horário registrado');
  expect(await page.locator('#editorialAgenda .pr-collision').filter({hasText:'Evento histórico E2E sem horário'}).count()).toBe(0);
});


test('Home [G][D+T+M] · a sessão automática não bloqueia escolha manual',async({page})=>{
  await enter(page,'home');
  await expect(page.locator('#editorialHome')).toBeVisible();
  await page.evaluate(()=>{
    StudyDashboard.start({mode:'free',label:'Troca de contexto E2E',minutes:15});
    MeusMapasPranchas.refresh();
  });
  await expect(page.locator('#editorialHome [data-pr-home="sessao"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('#editorialHome [data-pr-home="todos"]').click();
  await expect(page.locator('#editorialHome [data-pr-home="todos"]')).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>MeusMapasPranchas.refresh());
  await expect(page.locator('[data-view="home"]')).toHaveAttribute('data-editorial-mode','todos');
  await page.evaluate(()=>StudyDashboard.finish());
  // Ao terminar a sessão, o foco volta ao contexto correto: pós-prova quando
  // existe prova de ontem pendente; caso contrário Hoje ou Todos.
  const expected=await page.evaluate(()=>{
    const data=MeusMapasPranchas.snapshot(),today=new Date(),
      yesterday=new Date(today.getFullYear(),today.getMonth(),today.getDate()-1),
      key=d=>d&&[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    return data.rank.some(x=>key(x.date)===key(yesterday)&&!readExamStatuses()[x.course.id]?.completed)?'pos':
      data.rank.some(x=>x.date)?'hoje':'todos';
  });
  await expect(page.locator('#editorialHome [data-pr-home="'+expected+'"]')).toHaveAttribute('aria-pressed','true');
});

test('Home [G][D+T+M] · régua do dia não inventa horários',async({page})=>{
  await enter(page,'home');
  // A prova de ontem pode abrir Pós-prova automaticamente; selecionar Hoje
  // é uma ação legítima e não modifica a agenda nem a sessão.
  await page.locator('#editorialHome [data-pr-home="hoje"]').click();
  await expect(page.locator('#editorialHome [data-pr-home="hoje"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#editorialHome')).toContainText('Régua do dia');
  const lines=page.locator('#editorialHome .pr-day-tick');
  await expect(lines).toHaveCount(7);
  await page.evaluate(()=>{
    const today=new Date(),date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
    StudyDashboard.addAgenda({date,title:'Sem horário no plano do dia E2E',minutes:25});
    MeusMapasPranchas.refresh();
  });
  await expect(page.locator('#editorialHome')).toContainText('Sem horário no plano do dia E2E');
  await expect(page.locator('#editorialHome')).toContainText('Sem horário registrado');
});

test('Cursos [G][T+M] · alternar Capas e Lista sem duplicar a grade original',async({page})=>{
  await enter(page,'courses');
  const root=page.locator('#editorialCourses'),grid=page.locator('#coursesGrid');
  await expect(root).toBeVisible();
  await expect(root.locator('[data-pr-courses-layout]')).toHaveCount(2);
  await root.locator('[data-pr-courses-layout="lista"]').click();
  await expect(page.locator('[data-view="courses"]')).toHaveAttribute('data-pr-courses-layout','lista');
  await expect(grid).toBeHidden();
  await expect(root.locator('.pr-card')).toContainText('Concursos por prioridade');
  await root.locator('[data-pr-courses-layout="capas"]').click();
  await expect(page.locator('[data-view="courses"]')).toHaveAttribute('data-pr-courses-layout','capas');
  await expect(grid).toBeVisible();
});

test('Configurações [G] · versão da nuvem segue versão global, sem V12.1 legado',async({page})=>{
  await enter(page,'settings');
  const report=await page.evaluate(()=>{
    const previous=localStorage.getItem('studyapp.config.override');
    const config={...window.STUDY_APP_CONFIG};
    saveConfig();
    const stored=JSON.parse(localStorage.getItem('studyapp.config.override')||'{}');
    if(previous===null)localStorage.removeItem('studyapp.config.override');
    else localStorage.setItem('studyapp.config.override',previous);
    window.STUDY_APP_CONFIG=config;
    return{expected:APP_VERSION_LABEL,stored:stored.appVersion};
  });
  expect(report.stored).toBe(report.expected);
});

test('Backup [G] · novos estados entram na exportação sem quebrar formato anterior',async({page})=>{
  await enter(page,'settings');
  const report=await page.evaluate(()=>{
    const backup=buildStudyBackup(),data=backup.data||{},pref=data.preferences||{};
    return {valid:validateStudyBackup(backup),schema:backup.schemaVersion,
      exam:Object.hasOwn(data,'examStatuses'),goal:Object.hasOwn(data,'simulationOverrides'),
      review:Object.hasOwn(data,'reviewSchedule'),dashboard:Object.hasOwn(data,'studyDashboard'),
      courseLayout:Object.hasOwn(pref,'prCoursesLayout'),sort:Object.hasOwn(pref,'allMapsSort')};
  });
  expect(report).toEqual({valid:true,schema:1,exam:true,goal:true,review:true,dashboard:true,courseLayout:true,sort:true});
});

test('Backup [G] · mesclagem e substituição ignoram chaves fora dos namespaces de mapas',async({page})=>{
  await enter(page,'settings');
  const report=await page.evaluate(async()=>{
    const sensitive='studyapp.config.override',original='{"safe":"preserved-e2e"}';
    localStorage.setItem(sensitive,original);
    const data={
      mapStates:{'studyapp.config.override':'{"safe":"overwritten"}','mindmap_state::safe-backup-e2e':'{"progress":5}'},
      mapNotes:{'studyapp.lastMap':'forged-map','mindmap_notes::safe-backup-e2e':'{"text":"valid"}'},
      modified:{'studyapp.config.override':'2026-10-15T10:00:00.000Z','mindmap_state::safe-backup-e2e':'2026-10-15T10:00:00.000Z'}
    };
    const backup={type:'meus-mapas-backup',schemaVersion:1,data};
    await restoreStudyBackup(backup,{silent:true});
    const merged={
      configUnchanged:localStorage.getItem(sensitive)===original,
      lastMapNotForged:localStorage.getItem('studyapp.lastMap')!=='forged-map',
      mapRestored:localStorage.getItem('mindmap_state::safe-backup-e2e')==='{"progress":5}',
      notesRestored:localStorage.getItem('mindmap_notes::safe-backup-e2e')==='{"text":"valid"}',
      maliciousTimestampIgnored:localStorage.getItem('studyapp.modified::studyapp.config.override')===null
    };
    await restoreStudyBackup(backup,{replace:true,silent:true});
    const replaced={
      configUnchanged:localStorage.getItem(sensitive)===original,
      lastMapNotForged:localStorage.getItem('studyapp.lastMap')!=='forged-map',
      mapRestored:localStorage.getItem('mindmap_state::safe-backup-e2e')==='{"progress":5}',
      notesRestored:localStorage.getItem('mindmap_notes::safe-backup-e2e')==='{"text":"valid"}',
      maliciousTimestampIgnored:localStorage.getItem('studyapp.modified::studyapp.config.override')===null
    };
    return{merged,replaced};
  });
  const accepted={configUnchanged:true,lastMapNotForged:true,mapRestored:true,notesRestored:true,maliciousTimestampIgnored:true};
  expect(report.merged).toEqual(accepted);
  expect(report.replaced).toEqual(accepted);
});

test('Agenda [M] · abre em Dia e usa ícones Lucide PNG na navegação',async({page},info)=>{
  test.skip(info.project.name!=='iphone-webkit','Validação do padrão inicial de smartphone.');
  await enter(page,'agenda');
  await expect(page.locator('#editorialAgenda [data-pr-agenda-mode="dia"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#editorialAgenda [data-pr-agenda-day="-1"] .ui-icon')).toHaveCount(1);
  await expect(page.locator('#editorialAgenda [data-pr-agenda-day="+1"] .ui-icon')).toHaveCount(1);
});

test('Sete pranchas [G][T+M] · carimbos principais usam métricas reais do modelo',async({page})=>{
  await enter(page,'home');
  for(const [view,id] of [
    ['courses','editorialCourses'],['maps','editorialMaps'],
    ['simulations','editorialSimulations'],['progress','editorialProgress'],
    ['agenda','editorialAgenda'],['settings','editorialSettings']
  ]){
    await page.evaluate(v=>nav(v),view);
    await expect(page.locator('#'+id+' .pr-stamp h2')).toBeVisible();
    const val=await page.locator('#'+id+' .pr-stamp h2').innerText();
    expect(val.trim().length).toBeGreaterThan(0);
  }
});

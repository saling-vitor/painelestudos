import {test,expect} from '@playwright/test';
/* Contrato E2E das sete pranchas, executável sem dados de demonstração. */
test('Sete pranchas [G][T+M] · navegação e carimbos usam estado real',async({page})=>{
  await page.goto('/#home');
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
  }
});
test('Cinco telas da Home [G][T+M] · seleção não cria sessão paralela',async({page})=>{
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  const buttons=page.locator('#editorialHome [data-pr-home]');
  await expect(buttons).toHaveCount(5);
  for(const key of ['todos','revisoes','sessao','pos','hoje']){
    const button=page.locator('#editorialHome [data-pr-home="'+key+'"]');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-view="home"]')).toHaveAttribute('data-editorial-mode',key);
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
  await page.goto('/#maps');
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
  await page.goto('/#progress');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  await expect(page.locator('[data-view="progress"]')).toHaveClass(/active/);
  await expect(page.locator('#editorialProgress')).toBeVisible();
  const report=await page.evaluate(()=>{
    const rows=StudyDashboard.progressHistory();
    return {rows,total:MeusMapasPranchas.snapshot().ms.length,hasView:!!document.querySelector('#editorialProgress')};
  });
  expect(report.hasView).toBe(true);
  if(report.total===0)expect(report.rows.length).toBe(0);
  else expect(report.rows.every(x=>x.marked>=0&&x.total>=x.marked)).toBe(true);
});


test('Agenda [G][T+M] · horário persistente e compatibilidade dos itens antigos',async({page})=>{
  await page.goto('/#agenda');
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
  await page.goto('/#agenda');
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
  await page.goto('/#simulations');
  await expect(page.locator('#editorialSimulations')).toBeVisible();
  const exists=await page.evaluate(()=>{
    const s=combinedSimulations()[0];if(!s)return false;
    const key=simulationKey(s);
    const result={score:75,correct:45,wrong:10,blank:5,total:60,finishedAt:'2026-10-15T12:00:00.000Z',sections:{'Projeto Arquitetônico':{correct:8,total:10}},mistakes:[{number:6,topic:'Normas',stem:'Item de teste sem dados reais de produção',answer:'B'}]};
    state.simResults[key]=result;state.simAttempts[key]=[result];MeusMapasPranchas.refresh();return true;
  });
  if(!exists){await expect(page.locator('#editorialSimulations')).toContainText('Nenhum simulado');return}
  await page.locator('#editorialSimulations [data-pr-sim="resultado"]').click();
  await expect(page.locator('#editorialSimulations .pr-sim-report')).toHaveCount(1);
  await expect(page.locator('#editorialSimulations .pr-sim-report')).toContainText('Projeto Arquitetônico');
  await expect(page.locator('#editorialSimulations .pr-sim-report')).toContainText('45');
  await expect(page.locator('#editorialSimulations .pr-sim-benchmark')).toContainText('Não informado');
});
test('Mapas [G][T+M] · vínculo mantém HTML e isola namespace por concurso',async({page})=>{
  await page.goto('/#maps');
  await expect(page.locator('#editorialMaps')).toBeVisible();
  const data=await page.evaluate(async()=>{
    const source=combinedMaps().find(x=>x.storage_path);if(!source)return null;
    const to='teste-vinculo-e2e',originalInsert=StudyCloud.insert,originalRows=StudyCloud.rows,originalLoad=loadCloud,originalMe=StudyCloud.me;
    state.cloudCourses.push({id:to,title:'Concurso de teste de vínculo',status:'active'});
    let inserted=null,uploads=0;
    const oldUpload=StudyCloud.upload;
    StudyCloud.me=async()=>({id:'e2e-user'});
    StudyCloud.rows=async()=>[];
    StudyCloud.upload=async()=>{uploads++;throw Error('upload duplicado proibido')};
    StudyCloud.insert=async(table,row)=>{inserted=row;return[{id:'linked-row-e2e',...row}]};
    loadCloud=async()=>{};
    try{await linkMapToCourse(mapKey(source),to)}finally{
      StudyCloud.insert=originalInsert;StudyCloud.rows=originalRows;StudyCloud.upload=oldUpload;StudyCloud.me=originalMe;loadCloud=originalLoad;
    }
    return{samePath:source.storage_path===inserted?.storage_path,otherId:source.storageId!==inserted?.storage_id,
      differentCourse:source.courseId!==inserted?.course_id,uploads,readerParam:readerHref({...source,storageId:inserted.storage_id}).includes('storage-id=')};
  });
  if(!data)return;
  expect(data).toEqual({samePath:true,otherId:true,differentCourse:true,uploads:0,readerParam:true});
});

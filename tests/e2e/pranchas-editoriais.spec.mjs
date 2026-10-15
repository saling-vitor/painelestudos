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
  const report=await page.evaluate(()=>{
    const key='studyapp.pranchaProgress.v1::'+(StudyCloud.session()?.user?.id||'offline');
    const rows=JSON.parse(localStorage.getItem(key)||'[]');
    return {rows,total:MeusMapasPranchas.snapshot().ms.length,hasView:!!document.querySelector('#editorialProgress')};
  });
  expect(report.hasView).toBe(true);
  if(report.total===0)expect(report.rows.length).toBe(0);
  else expect(report.rows.every(x=>x.marked>=0&&x.total>=x.marked)).toBe(true);
});


test('Agenda [G][T+M] · horário persistente e compatibilidade dos itens antigos',async({page})=>{
  await page.goto('/#agenda');
  await expect(page.locator('html')).toHaveClass(/app-ready/);
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

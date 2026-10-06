import { test, expect } from '@playwright/test';

test('[G] edital preenche dados principais do novo concurso sem criar automaticamente',async({page})=>{
  await page.goto('/#courses');
  const result=await page.evaluate(()=>window.__coursePdfAutofillTest.infer([
    'COMPANHIA CATARINENSE DE ÁGUAS E SANEAMENTO (CASAN)',
    'CONCURSO PÚBLICO - EDITAL 001/2026',
    'INSTITUTO AOCP',
    'Florianópolis/SC',
    'CARGO CP 01 - ARQUITETO E URBANISTA',
    'CRONOGRAMA',
    'Aplicação da Prova Objetiva 22/11/2026',
    'Divulgação do gabarito 23/11/2026'
  ].join('\n')));
  expect(result.title.value).toBe('CASAN Florianópolis');
  expect(result.subtitle.value).toBe('CP 01 · Arquiteto e Urbanista');
  expect(result.board.value).toBe('Instituto AOCP');
  expect(result.city.value).toBe('Florianópolis/SC');
  expect(result.examDate.value).toBe('2026-11-22');
  expect(result.institution.value).toContain('CASAN');

  await page.locator('#newCourseBtn2').click();
  await expect(page.locator('#courseModal')).toHaveClass(/open/);
  await expect(page.locator('#coursePdfAutofill')).toBeHidden();
  await expect(page.locator('#courseSave')).toHaveText('Criar concurso');
});

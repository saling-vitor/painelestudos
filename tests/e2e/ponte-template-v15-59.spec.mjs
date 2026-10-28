import { test, expect } from '@playwright/test';
import { setupPrancha, seedProgress, go, noRuntimeErrors } from './helpers/prancha-mock.mjs';

/* V15.59 · ponte com a Template V211 G27: o mapa aberto no leitor pede o contexto do curso (HELLO → CONTEXT)
   e manda o resumo do estudo (SUMMARY), que alimenta os erros por armadilha do Progresso. */
test.use({ storageState: { cookies: [], origins: [] } });
test.afterEach(async ({ page }, info) => { expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]); });

const DEMHAB = { id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01 · Arquiteto', board: 'FUNDATEC', examOffset: 20 };

test('Ponte [G] · leitor responde ao mapa G27 com o contexto do curso e guarda o resumo', async ({ page }) => {
  await setupPrancha(page, { courses: [DEMHAB] });
  await page.evaluate(() => window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'));
  await seedProgress(page, { LIU: [10, 0, 0] });
  const key = await page.evaluate(() => combinedMaps().find((m) => m.code === 'LIU')._key);
  await page.evaluate((k) => openMap(k), key);
  await page.waitForFunction(() => document.getElementById('readerFrame')?.contentDocument?.readyState === 'complete');
  const f = await (await page.$('#readerFrame')).contentFrame();
  const ctx = await f.evaluate(() => new Promise((res) => {
    addEventListener('message', (e) => { if (e.data?.type === 'MEUS_MAPAS_CONTEXT') res(e.data); });
    parent.postMessage({ type: 'MEUS_MAPAS_MAP_HELLO', schema: 'meus-mapas/map-summary/v1', storageId: 'study-liu', templateRelease: 'V24.77.81-G' }, location.origin);
  }));
  expect(ctx.schema).toBe('meus-mapas/context/v1');
  expect(ctx.storageId).toBe('study-liu');
  expect(ctx.curso).toMatchObject({ sigla: expect.any(String), banca: 'FUNDATEC', cargo: 'Arquiteto', fase: 'before' });
  expect(ctx.curso.provaISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(ctx.disciplina).toMatchObject({ nome: 'Conhecimentos Específicos', peso: 2, minimo: 40 });
  expect(ctx.disciplina.pontosPorTopico).toBeGreaterThan(0);
  expect(ctx.alcance).toBe('portatil');
  /* resumo: armadilhas por tópico + Raio-X, sem texto pessoal */
  await f.evaluate(() => parent.postMessage({ type: 'MEUS_MAPAS_MAP_SUMMARY', schema: 'meus-mapas/map-summary/v1', storageId: 'study-liu', templateRelease: 'V24.77.81-G', kind: 'full', identity: { code: 'LIU', cutoff: '2026-09-30', scope: 'portatil', editalItems: ['ESP-23'] },
    topics: { t1: { state: 'done', mastery: 40, answered: 6, correct: 2, guesses: 1, traps: { 'prazo-ou-numero': 3, 'Exceção': 1 }, markers: ['num'], nota: 'não deve ser guardada' } },
    rxErrors: [{ topicId: 't1', trap: 'literalidade', origin: 'TEC', when: '2026-10-27' }], vespera: { items: 4, seen: 1, minutes: 9 } }, location.origin));
  await expect.poll(() => page.evaluate((k) => window.Prancha.bridge.summary(combinedMaps().find((m) => m._key === k))?.topics?.t1?.traps, key)).toEqual({ 'prazo-ou-numero': 3, 'excecao-ou-inversao': 1 });
  const saved = await page.evaluate((k) => localStorage.getItem('studyapp.mapSummary::' + k), key);
  expect(saved).not.toContain('não deve ser guardada');
  await page.evaluate(() => closeReader());
  await go(page, 'progress');
  const arm = page.locator('.pr[data-prancha="progress"] .pr-card').filter({ hasText: 'Erros por armadilha' });
  await expect(arm).toContainText('Prazo ou número');
  await expect(arm).toContainText('5 erros classificados');
});

test('Ponte [G] · mensagem de fora do leitor é ignorada', async ({ page }) => {
  await setupPrancha(page, { courses: [DEMHAB] });
  const got = await page.evaluate(() => new Promise((res) => {
    let n = 0; addEventListener('message', (e) => { if (e.data?.type === 'MEUS_MAPAS_CONTEXT') n++; });
    postMessage({ type: 'MEUS_MAPAS_MAP_HELLO', schema: 'meus-mapas/map-summary/v1', storageId: 'x' }, location.origin);
    setTimeout(() => res(n), 400);
  }));
  expect(got).toBe(0);
});

test('Ponte [G] · planejamento do kit REV07 define disciplina e alcance de cada mapa pela sigla', async ({ page }) => {
  await setupPrancha(page, { courses: [DEMHAB] });
  const r = await page.evaluate(() => window.Prancha.editais.importKit('porto-alegre', {
    schema: 'meus-mapas/app-edital/v1', serieId: 'DEMHAB-2026', banca: 'FUNDATEC', fonte: 'Edital 01/2026, item 7',
    prova: [{ id: 'lp', nome: 'Língua Portuguesa', questoes: 10, peso: 1, minimo: 4, categorias: ['Português'] }, { id: 'esp', nome: 'Específicos', questoes: 40, peso: 2, minimo: 40, padrao: true }],
    fases: [{ id: 'prova', data: '2026-12-06', status: 'CONFERIDA' }],
    programa: [{ id: 'ESP-1', item: 'Redação oficial', disciplina: 'esp', mapas: ['LP'] }],
    mapas: [{ sigla: 'LP', disciplinas: ['esp'], alcance: 'portatil' }, { sigla: 'NAOEXISTE', disciplinas: ['xx'], alcance: 'local' }]
  }));
  expect(r).toMatchObject({ disciplinas: 2, itens: 1, mapas: 1, alcances: 1 });
  const got = await page.evaluate(() => { const m = combinedMaps().find((x) => x.code === 'LP'); return [window.Prancha.editais.disciplinaDoMapa(m).id, window.Prancha.editais.alcance(m)]; });
  expect(got).toEqual(['esp', 'portatil']);
});

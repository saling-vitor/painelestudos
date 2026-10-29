import { test, expect } from '@playwright/test';
import { setupPrancha, seedProgress, go, screen, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';

/* V15.57 · Fase pós-prova: fechamento no curso (gabarito, recursos, aguardando convocação), próximo marco,
   entre concursos, simulado em pontos da banca, marcos e .ics na agenda e auditoria do acervo. */
test.use({ storageState: { cookies: [], origins: [] } });

test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]);
});

const DEMHAB = { id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01 · Arquiteto', board: 'FUNDATEC' };
const day = (page, n) => page.evaluate((n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }, n);

test('Pós-prova [G] · fechamento no curso: gabarito, recursos ligados ao mapa e aguardando convocação', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: -2 }] });
  await page.evaluate(() => window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'));
  await page.evaluate(() => openCourse('porto-alegre'));
  const c = page.locator('.pr[data-prancha="course"]');
  const f = c.locator('form[data-ponderado]');
  await f.locator('input[name="d_lp"]').fill('9');
  await f.locator('input[name="d_leg"]').fill('3');
  await f.locator('input[name="d_esp"]').fill('23');
  await f.getByRole('button', { name: 'Registrar' }).click();
  await expect(c).toContainText('58 de 100 pontos');
  await expect(c).toContainText('eliminado em Legislação');
  /* recurso ligado ao mapa da fundamentação */
  await c.locator('summary').filter({ hasText: 'Marcar questão para recurso' }).click();
  const rf = c.locator('form[data-pr-submit="recurso-add"]');
  await rf.locator('input[name="questao"]').fill('17');
  const liu = await page.evaluate(() => combinedMaps().find((m) => m.code === 'EFPA')._key);
  await rf.locator('select[name="mapKey"]').selectOption(liu);
  await rf.locator('input[name="motivo"]').fill('gabarito ignora a disponibilidade remunerada');
  await rf.getByRole('button', { name: 'Marcar' }).click();
  await expect(c).toContainText('Q17');
  await expect(c).toContainText('gabarito ignora a disponibilidade remunerada');
  await c.locator('select[data-pr-change="recurso-status"]').selectOption('enviado');
  await expect(c).toContainText('1 questão · 1 enviada');
  await c.getByRole('button', { name: 'Aguardando convocação' }).click();
  await expect(c).toContainText('Marcado em');
  /* prova passada: o curso fica em Encerrados (recolhido), identificado como aguardando convocação */
  await go(page, 'courses');
  const cs = page.locator('.pr[data-prancha="courses"]');
  await cs.getByRole('button', { name: 'Mostrar' }).click();
  await expect(cs.locator('.pr-chip', { hasText: 'aguardando convocação' })).toHaveCount(1);
});

test('Pós-prova [G] · Início mostra o próximo marco e avisa prazo de recurso', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: -2 }] });
  const r = await day(page, 3), g = await day(page, -1);
  await page.evaluate(([r, g]) => window.Prancha.editais.set('porto-alegre', { fases: { gabarito: { date: g }, recursos: { date: r } } }), [r, g]);
  await go(page, 'home');
  await screen(page, 'pos');
  const home = page.locator('.pr[data-prancha="home"]');
  await expect(home).toContainText('Próximo marco · ');
  await expect(home).toContainText('Recursos é um prazo.');
  await expect(home.locator('.pr-card').filter({ has: page.locator('.pr-k', { hasText: /^Próximo marco/ }) }).locator('.pr-pct')).toContainText('3');
});

test('Pós-prova [G] · entre concursos: Início cuida dos mapas portáteis', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: -40 }] });
  await seedProgress(page);
  await go(page, 'home');
  const home = page.locator('.pr[data-prancha="home"]');
  await expect(home).toHaveAttribute('data-screen', 'entre');
  await expect(home).toContainText('tópicos portáteis guardados em 11 mapas');
  await expect(home).toContainText('Ritmo de manutenção: 40min por dia.');
  await expect(home.locator('.pr-card').filter({ has: page.locator('.pr-k', { hasText: /^Guardados$/ }) })).toContainText('LOPA');
  await page.evaluate(() => window.Prancha.prefs.set('metaEntre', 25));
  await page.evaluate(() => window.Prancha.schedule('home'));
  await expect(home).toContainText('Ritmo de manutenção: 25min por dia.');
});

test('Pós-prova [G] · simulado em pontos da banca: mesma porcentagem, resultado oposto', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: 10 }] });
  await page.evaluate(() => {
    window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC');
    const s = combinedSimulations()[0], k = s._key;
    const a = { score: 58, correct: 35, wrong: 25, blank: 0, total: 60, durationSeconds: 11000, finishedAt: new Date().toISOString(), sections: { 'LÍNGUA PORTUGUESA': { correct: 9, total: 10 }, 'LEGISLAÇÃO': { correct: 3, total: 10 }, 'CONHECIMENTOS ESPECÍFICOS': { correct: 23, total: 40 } }, mistakes: [] };
    state.simAttempts[k] = [a]; state.simResults[k] = a;
  });
  await go(page, 'simulations');
  const sims = page.locator('.pr[data-prancha="simulations"]');
  await expect(sims.locator('.pr-cell').filter({ hasText: 'Melhor nota' })).toContainText('58 pts');
  await sims.locator('.pr-tab[data-arg="res"]').click();
  await expect(sims.locator('.pr-carimbo .pr-pct')).toContainText('58');
  await expect(sims.locator('.pr-carimbo')).toContainText('pts');
  await expect(sims.locator('.pr-cell').filter({ hasText: 'Eliminatório' })).toContainText('eliminado');
  await expect(sims.locator('.pr-verdict').first()).toContainText('eliminado em Legislação');
  await expect(sims.locator('.pr-gab .ln')).toHaveCount(4);
});

test('Pós-prova [G] · agenda importa .ics como marcos da régua', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: -2 }] });
  /* marco dentro da semana atual em qualquer dia em que o teste rodar (antes: hoje + 4, que no fim da semana caía na seguinte) */
  const d = (await day(page, 0)).replaceAll('-', '');
  await go(page, 'agenda');
  const ag = page.locator('.pr[data-prancha="agenda"]');
  const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:' + d, 'SUMMARY:DEMHAB · Prazo de recursos do gabarito', 'END:VEVENT', 'BEGIN:VEVENT', 'DTSTART:' + d + 'T120000Z', 'SUMMARY:Aniversário', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  await ag.locator('input[data-pr-ics]').setInputFiles({ name: 'concursos.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics) });
  const card = ag.locator('.pr-card').filter({ has: page.locator('.pr-k', { hasText: /^Importar \.ics$/ }) });
  await expect(card).toContainText('2 eventos no arquivo');
  await expect(card.locator('input[name="on0"]')).toBeChecked();
  await expect(card.locator('input[name="on1"]')).not.toBeChecked();
  await card.getByRole('button', { name: 'Importar marcados' }).click();
  const f = await page.evaluate(() => window.Prancha.editais.get('porto-alegre').fases.recursos);
  expect(f.date.replaceAll('-', '')).toBe(d);
  await ag.locator('.pr-tab[data-arg="semana"]').click();
  await expect(ag.locator('.pr-marco').first()).toContainText('DEMHAB · Recursos');
});

test('Pós-prova [G] · Configurações: auditoria do acervo aponta mapas sem marcadores', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: 10 }] });
  await page.waitForFunction(() => Array.isArray(state.searchIndex?.maps) && state.searchIndex.maps.length > 0);
  await go(page, 'settings');
  const host = page.locator('.pr[data-prancha="settings"] [data-pr-host="acervo"]');
  await expect(host).toContainText('14 de 14 mapas verificados');
  await expect(host).toContainText('DEMHAB, PDGV, IERA sem nenhum data-markers');
  await expect(host).toContainText('1.843 variantes de questão em 14 mapas');
  await expect(host).toContainText('sem estrutura da prova');
  await expect(page.locator('.pr[data-prancha="settings"] .pr-folha')).toHaveCount(9);
});

test('Pós-prova [M] · fechamento no curso sem rolagem lateral', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: -2 }] });
  await page.evaluate(() => window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'));
  await page.evaluate(() => openCourse('porto-alegre'));
  await expect(page.locator('.pr[data-prancha="course"] form[data-ponderado]')).toBeVisible();
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

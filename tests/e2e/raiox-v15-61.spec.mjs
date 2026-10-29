import { test, expect } from '@playwright/test';
import { setupPrancha, go, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';

/* V15.61 · Raio-X por edital: cada banca monta a prova de um jeito (AOCP sem mínimo por área; FUNDATEC Ijuí com
   pontos fracionados e mínimo em acertos; títulos fora da objetiva) e a estrutura de outra banca é sinalizada. */
test.use({ storageState: { cookies: [], origins: [] } });
test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]);
});

const CASAN = { id: 'porto-alegre', title: 'CASAN', subtitle: '406 · Arquiteto e Urbanista', board: 'Instituto AOCP' };
const IJUI = {
  schema: 'meus-mapas/app-edital/v1', banca: 'FUNDATEC', fonte: 'Edital Ijuí 01/2026, Anexo III', minimoGeral: 60, titulos: 20,
  prova: [
    { id: 'atu-lp', nome: 'Atualidades / Língua Portuguesa', questoes: 20, peso: 0.51, minimo: 1, minimoEm: 'acertos' },
    { id: 'leg-mun', nome: 'Legislação Municipal', questoes: 15, peso: 1, minimo: 1, minimoEm: 'acertos' },
    { id: 'inf-mat', nome: 'Informática / Matemática', questoes: 13, peso: 1.1, minimo: 1, minimoEm: 'acertos' },
    { id: 'leg-esp', nome: 'Legislação e Conhecimentos Específicos', questoes: 27, peso: 1.5, minimo: 13, minimoEm: 'acertos', padrao: true }
  ]
};

test('Raio-X [G] · estrutura FUNDATEC num curso AOCP é sinalizada e o padrão AOCP tem 5 áreas', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...CASAN, examOffset: 24 }] });
  await page.evaluate(() => { window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'); openCourse('porto-alegre'); });
  const rx = page.locator('.pr[data-prancha="course"] .pr-raiox-card');
  await expect(rx).toContainText('Esta estrutura veio de FUNDATEC');
  await page.evaluate(() => { window.Prancha.editais.aplicarPadrao('porto-alegre', 'AOCP'); window.Prancha.schedule('course'); });
  await expect(rx).not.toContainText('Esta estrutura veio de');
  await expect(rx).toContainText('5 disciplinas · 50 questões · 50 pontos · mínimo geral 25 · + 10 de títulos');
  await expect(rx.locator('.pr-dsc')).toHaveCount(5);
  await expect(rx.locator('.pr-regra')).toContainText('não há');
  await expect(rx.locator('.pr-regra')).toContainText('60');
  const r = await page.evaluate(() => window.Prancha.editais.pontuar('porto-alegre', { lp: 2, rlm: 0, atu: 0, leg: 0, esp: 23 }));
  expect([r.pontos, r.aprovado]).toEqual([25, true]);
});

test('Raio-X [G] · Ijuí: pontos fracionados, mínimo em acertos e títulos pelo .json do edital', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...CASAN, board: 'FUNDATEC', title: 'Ijuí', examOffset: 50 }] });
  const r = await page.evaluate((kit) => {
    const E = window.Prancha.editais;
    E.importKit('porto-alegre', JSON.stringify(kit));
    const ok = E.pontuar('porto-alegre', { 'atu-lp': 10, 'leg-mun': 10, 'inf-mat': 8, 'leg-esp': 27 });
    const cai = E.pontuar('porto-alegre', { 'atu-lp': 20, 'leg-mun': 15, 'inf-mat': 13, 'leg-esp': 12 });
    return { max: E.pontosMax(E.prova('porto-alegre')), tit: E.titulos('porto-alegre'), ok: [ok.pontos, ok.aprovado], cai: [cai.pontos, cai.aprovado, cai.falhas.map((x) => x.id)] };
  }, IJUI);
  expect(r.max).toBeCloseTo(80, 5);
  expect(r.tit).toBe(20);
  expect(r.ok).toEqual([64.4, true]);
  /* gabaritou as outras três e fez 12 em Específicos: eliminado pelos 13 acertos mínimos */
  expect(r.cai).toEqual([57.5, false, ['leg-esp']]);
  await page.evaluate(() => openCourse('porto-alegre'));
  const rx = page.locator('.pr[data-prancha="course"] .pr-raiox-card');
  await expect(rx).toContainText('4 disciplinas · 75 questões · 80 pontos · mínimo geral 60 · + 20 de títulos');
  await expect(rx.locator('.pr-dsc').nth(3)).toContainText('13 ac.');
  await expect(rx.locator('.pr-dsc').nth(0)).toContainText('0,51');
  /* formulário aceita 0,51 e salva o mínimo em acertos */
  await rx.locator('summary', { hasText: 'Editar estrutura da prova' }).click();
  await expect(rx.locator('select[name="minimoEm3"]')).toHaveValue('acertos');
  await rx.locator('input[name="nome4"]').fill('Redação');
  await rx.locator('input[name="questoes4"]').fill('1');
  await rx.locator('input[name="peso4"]').fill('0.55');
  await rx.getByRole('button', { name: 'Salvar estrutura' }).click();
  await expect(rx.locator('.pr-dsc')).toHaveCount(5);
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

test('Raio-X [G] · cartão com 5 disciplinas cabe no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupPrancha(page, { courses: [{ ...CASAN, examOffset: 24 }] });
  await page.evaluate(() => { window.Prancha.editais.aplicarPadrao('porto-alegre', 'AOCP'); openCourse('porto-alegre'); });
  await expect(page.locator('.pr-raiox-card .pr-dsc')).toHaveCount(5);
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

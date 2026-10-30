import { test, expect } from '@playwright/test';
import { setupPrancha, seedProgress, go, screen, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';

/* V15.56 · Fundação do edital: estrutura da prova por curso, padrões por banca, régua de fases,
   gabarito no formato da banca e mapas portáteis que continuam na biblioteca. */
test.use({ storageState: { cookies: [], origins: [] } });

test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]);
});

const DEMHAB = { id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01 · Arquiteto', board: 'FUNDATEC' };

test('Edital [G] · nota no formato da banca: peso e mínimo por disciplina', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: 10 }] });
  const r = await page.evaluate(() => {
    const E = window.Prancha.editais;
    E.aplicarPadrao('porto-alegre', 'FUNDATEC');
    const a = E.pontuar('porto-alegre', { lp: 6, leg: 6, esp: 24 });
    const b = E.pontuar('porto-alegre', { lp: 10, leg: 10, esp: 16 });
    const map = combinedMaps().find((m) => m.code === 'LIU'), lp = combinedMaps().find((m) => m.code === 'LP'), cf = combinedMaps().find((m) => m.code === 'CF88');
    return { a: [a.pontos, a.corretas, a.aprovado], b: [b.pontos, b.corretas, b.aprovado, b.falhas.map((x) => x.id)], max: a.max, disc: [E.disciplinaDoMapa(map).id, E.disciplinaDoMapa(lp).id, E.disciplinaDoMapa(cf).id] };
  });
  expect(r.max).toBe(100);
  expect(r.a).toEqual([60, 36, true]);
  /* mesmos 36 acertos, outra divisão: 52 pontos e eliminação em Específicos */
  expect(r.b).toEqual([52, 36, false, ['esp']]);
  expect(r.disc).toEqual(['esp', 'lp', 'leg']);
});

test('Edital [G] · curso: raio-x da prova a partir do padrão da banca e régua do edital', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: 10 }] });
  await page.evaluate(() => openCourse('porto-alegre'));
  const c = page.locator('.pr[data-prancha="course"]');
  await expect(c.locator('.pr-regua li')).toHaveCount(7);
  await expect(c.locator('.pr-raiox-card')).toContainText('Estrutura ainda não informada');
  await c.getByRole('button', { name: 'Usar estrutura FUNDATEC' }).click();
  const rx = c.locator('.pr-raiox-card');
  await expect(rx).toContainText('60 questões · 100 pontos · mínimo geral 50');
  await expect(rx.locator('.pr-dsc')).toHaveCount(3);
  await expect(rx.locator('.pr-dsc').nth(2)).toContainText(/40\s*q/);
  await expect(rx.locator('.pr-dsc').nth(2)).toContainText('LIU');
  await expect(rx.locator('.pr-dsc').nth(1)).toContainText('CF88');
  /* cronograma: a fase com data mais recente até hoje vira a atual */
  const reg = c.locator('.pr-regua-card');
  await reg.locator('summary').click();
  const d = await page.evaluate(() => { const x = new Date(); x.setDate(x.getDate() - 20); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); });
  await reg.locator('input[name="homologacao"]').fill(d);
  await reg.getByRole('button', { name: 'Salvar cronograma' }).click();
  await expect(c.locator('.pr-regua li.atual')).toContainText('Homologação');
  await expect(c.locator('.pr-regua li.atual')).toContainText('agora');
  /* alcance do mapa no painel do lote */
  const sel = c.locator('.pr-pick select[data-pr-change="set-alcance"]');
  const key = await sel.getAttribute('data-key');
  await sel.selectOption('misto');
  await expect.poll(() => page.evaluate((k) => window.Prancha.editais.alcance(mapById(k)), key)).toBe('misto');
});

test('Edital [G] · pós-prova: gabarito por disciplina com peso e mínimos', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: -1 }] });
  await page.evaluate(() => window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'));
  await go(page, 'home');
  await screen(page, 'pos');
  const home = page.locator('.pr[data-prancha="home"]');
  const form = home.locator('form[data-ponderado]');
  await expect(form.locator('input')).toHaveCount(3);
  await form.locator('input[name="d_lp"]').fill('6');
  await form.locator('input[name="d_leg"]').fill('6');
  await form.locator('input[name="d_esp"]').fill('24');
  await form.getByRole('button', { name: 'Registrar' }).click();
  await expect(home).toContainText('Gabarito no formato da banca');
  await expect(home).toContainText('60 de 100 pontos');
  await expect(home).toContainText('Aprovado no total e em todas as disciplinas');
  await expect(home.locator('.pr-carimbo')).toContainText('60 pts');
  const saved = await page.evaluate(() => window.Prancha.courses.closure('porto-alegre').gabarito);
  expect(saved.pontos).toBe(60);
  expect(saved.correct).toBe(36);
  expect(saved.porDisciplina.esp.pontos).toBe(48);
});

test('Edital [G] · biblioteca mantém os portáteis do concurso encerrado e filtra por alcance', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: -1 }] });
  await seedProgress(page);
  await go(page, 'maps');
  const maps = page.locator('.pr[data-prancha="maps"]');
  await expect(maps).toContainText('11 de 11 mapas');
  await expect(maps).toContainText('3 mapas locais de concursos encerrados ocultos');
  await maps.locator('[data-pr-act="fa"][data-arg="misto"]').click();
  await expect(maps).toContainText('1 de 11 mapas');
  await expect(maps).toContainText('Integridade');
  await maps.locator('[data-pr-act="fa"][data-arg="todos"]').click();
  /* a escolha do usuário vale mais que o catálogo */
  await page.evaluate(() => { const m = combinedMaps().find((x) => x.code === 'LOPA'); window.Prancha.editais.setAlcance(m._key, 'portatil'); window.Prancha.schedule('maps'); });
  await expect(maps).toContainText('12 de 12 mapas');
  /* o plano de estudo continua sem os mapas do concurso encerrado */
  const live = await page.evaluate(() => window.Prancha.data.maps().length);
  expect(live).toBe(0);
});

test('Edital [G] · Configurações: folha 08 com padrões por banca', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: 10 }] });
  await go(page, 'settings');
  const host = page.locator('.pr[data-prancha="settings"] [data-pr-host="editais"]');
  await expect(host).toContainText('FUNDATEC');
  await expect(host).toContainText('100 pontos · mínimo geral 50');
  await host.getByRole('button', { name: '+ Nova banca' }).click();
  await host.locator('input[name="banca"]').fill('aocp');
  await host.locator('input[name="nome0"]').fill('Conhecimentos Básicos');
  await host.locator('input[name="questoes0"]').fill('30');
  await host.locator('input[name="minimo0"]').fill('10');
  await host.getByRole('button', { name: 'Salvar padrão' }).click();
  await expect(host).toContainText('AOCP');
  const p = await page.evaluate(() => window.Prancha.editais.padroes().AOCP);
  expect(p.prova[0]).toMatchObject({ nome: 'Conhecimentos Básicos', questoes: 30, minimo: 10, padrao: true });
});

test('Edital [M] · régua e raio-x sem rolagem lateral no celular', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...DEMHAB, examOffset: 10 }] });
  await page.evaluate(() => window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'));
  await page.evaluate(() => openCourse('porto-alegre'));
  await expect(page.locator('.pr[data-prancha="course"] .pr-dsc')).toHaveCount(3);
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

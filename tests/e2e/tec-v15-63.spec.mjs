import { test, expect } from '@playwright/test';
import { setupPrancha, go, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';

/* V15.63 · planilha de desempenho do TEC Concursos → nota projetada, pontos fracos e evolução */
test.use({ storageState: { cookies: [], origins: [] } });
const CASAN = { id: 'casan', title: 'CASAN', subtitle: 'Arquiteto e Urbanista', board: 'Instituto AOCP', examOffset: 24 };
async function casan(page) {
  await setupPrancha(page, { courses: [CASAN] });
  await page.evaluate(async () => {
    const pages = await (await fetch('tests/fixtures/edital-casan-paginas.json')).json();
    window.Prancha.editais.importKit('casan', JSON.stringify(window.MeusMapasEditalReader.lerEdital(pages, { cargo: 'Arquiteto' })));
  });
  await go(page, 'progress');
}
/* a prancha pode redesenhar entre achar o campo de arquivo e entregar o arquivo (sincronização): repete até o cartão mudar */
async function importar(c, file, texto) {
  await expect.poll(async () => { if (!(await c.textContent()).includes(texto)) await c.locator('[data-pr-tec]').setInputFiles(file); await c.page().waitForTimeout(400); return (await c.textContent()).includes(texto); }, { timeout: 20000, intervals: [500, 1000, 2000] }).toBe(true);
}
const card = (page) => page.locator('[data-prancha="progress"] .pr-card', { hasText: /Nota pelo TEC|Desempenho no TEC/ });

test('TEC [G] · leitor: .xlsx com textos compartilhados e .csv com hierarquia', async ({ page }) => {
  await setupPrancha(page, { courses: [CASAN] });
  const r = await page.evaluate(async () => {
    const T = window.MeusMapasTec;
    const buf = await (await fetch('tests/fixtures/tec-desempenho-1.xlsx')).arrayBuffer();
    const x = await T.lerArquivo(new File([buf], 'tec.xlsx'));
    const csv = T.parseRows(T.csvRows('Hierarquia;índice;Questões Resolvidas;Acertos (%);Quantidade de acertos\n;Português;10;50;5\n01;Sintaxe;6;33;2\n01.01;Crase;4;25;1\n;Sem Classificação;2;50;1\n;Informática;8;75;6\n'));
    return { q: x.total.q, mats: x.materias.length, arq: x.materias[0].n, arqSubs: x.materias[0].s.length, csv: csv.materias.map((m) => [m.n, m.q, m.a, m.s.map((s) => s.h).join(',')]) };
  });
  expect(r.q).toBe(1570);
  expect(r.mats).toBe(8);
  expect(r.arq).toBe('Arquitetura');
  expect(r.arqSubs).toBeGreaterThan(40);
  expect(r.csv).toEqual([['Português', 10, 5, '01,01.01,sc'], ['Informática', 8, 6, '']]);
});

test('TEC [G] · importar planilha mostra nota no formato da banca, pontos fracos e evolução', async ({ page }) => {
  await casan(page);
  const c = card(page);
  await expect(c).toContainText('Importe a planilha do TEC');
  await importar(c, 'tests/fixtures/tec-desempenho-1.xlsx', 'Nota pelo TEC');
  await expect(c).toContainText('1.570 questões');
  await expect(c.locator('.pr-nt')).toHaveCount(5);
  await expect(c.locator('.pr-tec-fr .pr-li').first()).toBeVisible();
  const lig = await page.evaluate(() => { const R = window.Prancha.tec.resumo('casan'); const g = (n) => R.lig.get(window.Prancha.tec.key(n))?.id || null; return { arq: g('Arquitetura'), lp: g('Língua Portuguesa (Português)'), inf: g('Informática'), rl: g('Raciocínio Lógico'), da: g('Direito Administrativo (Doutrina e Leis Federais)'), max: R.res.max }; });
  expect(lig).toEqual({ arq: 'conhecimentos-especificos', lp: 'lingua-portuguesa', inf: null, rl: 'raciocinio-logico-matematico', da: 'legislacao', max: 50 });
  /* segunda leitura: evolução e leitura anterior compactada */
  await importar(c, 'tests/fixtures/tec-desempenho-2.xlsx', 'Desde a leitura anterior');
  await expect(c).toContainText('+315 questões');
  const st = await page.evaluate(() => { const L = window.Prancha.tec.list(); return [L.length, L[1].materias.every((m) => m.s.every((x) => !x.h.includes('.')))]; });
  expect(st).toEqual([2, true]);
  /* ligação manual: Informática entra em Conhecimentos Específicos */
  await c.locator('summary', { hasText: 'Matérias do TEC' }).click();
  const i = await c.locator('input[name^="k"]').evaluateAll((els) => els.find((e) => e.value === 'informatica').name.slice(1));
  await c.locator('select[name="d' + i + '"]').selectOption('conhecimentos-especificos');
  await c.getByRole('button', { name: 'Salvar ligações' }).click();
  await expect.poll(() => page.evaluate(() => window.Prancha.editais.get('casan').tecMap?.informatica)).toBe('conhecimentos-especificos');
  await expect(c).toContainText('ligado por você');
  noRuntimeErrors(page);
});

test('TEC [M] · celular: cartão do TEC cabe na tela', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await casan(page);
  await importar(card(page), 'tests/fixtures/tec-desempenho-1.xlsx', 'Nota pelo TEC');
  await noHorizontalOverflow(page);
});

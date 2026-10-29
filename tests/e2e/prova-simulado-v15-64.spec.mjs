import { test, expect } from '@playwright/test';
import { setupPrancha, go, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';
import fs from 'fs';

/* V15.64 · simulado montado a partir do caderno oficial (PDF) e do gabarito.
   O caderno e o gabarito de teste são sintéticos (tests/fixtures/prova-sintetica/gerar.py), com o layout de duas colunas do AOCP. */
test.use({ storageState: { cookies: [], origins: [] } });
const CASAN = { id: 'casan', title: 'CASAN', subtitle: 'Arquiteto e Urbanista', board: 'Instituto AOCP', examOffset: 24 };
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
async function arquivo(card, sel, file, texto) {
  await expect.poll(async () => { if (!(await card.textContent()).includes(texto)) await card.locator(sel).setInputFiles(file); await card.page().waitForTimeout(500); return (await card.textContent()).includes(texto); }, { timeout: 25000, intervals: [800, 1500, 2500] }).toBe(true);
}
async function preparar(page) {
  /* o pdf.js do app vem da CDN; no teste, o mesmo arquivo sai do node_modules */
  await page.route(PDFJS + '**', (route) => { const f = route.request().url().slice(PDFJS.length); route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('node_modules/pdfjs-dist/build/' + f) }); });
  await setupPrancha(page, { courses: [CASAN] });
  await page.evaluate(async () => {
    const pages = await (await fetch('tests/fixtures/edital-casan-paginas.json')).json();
    window.Prancha.editais.importKit('casan', JSON.stringify(window.MeusMapasEditalReader.lerEdital(pages, { cargo: 'Arquiteto' })));
    state.simulationCourseFilter = 'casan';
  });
  await go(page, 'simulations');
}

test('Prova [G] · leitor de caderno e gabarito: seções, texto de apoio, figura e escolha do bloco', async ({ page }) => {
  await preparar(page);
  const r = await page.evaluate(async () => {
    const lib = await loadCoursePdfJs();
    const ler = async (u) => { const doc = await lib.getDocument({ data: new Uint8Array(await (await fetch(u)).arrayBuffer()) }).promise; const out = []; for (let i = 1; i <= doc.numPages; i++) { const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }); out.push({ w: vp.width, h: vp.height, lines: MeusMapasEditalLayout.layoutLines((await pg.getTextContent()).items) }); } return out; };
    const R = window.MeusMapasProvaReader, L = R.lerProva(await ler('tests/fixtures/prova-sintetica/prova-sintetica.pdf')), G = R.lerGabarito(await ler('tests/fixtures/prova-sintetica/gabarito-sintetico.pdf'));
    return { meta: L.meta, secoes: L.secoes.map((s) => [s.titulo, s.questoes.map((q) => q.n).join(','), s.intro?.titulo || '']), q2: L.secoes[0].questoes[1].alternativas, fig: L.secoes.flatMap((s) => s.questoes).filter((q) => q.figura).map((q) => q.n), blocos: G.map((b) => b.titulo), bloco: R.escolherBloco(G, L.meta, L.questoes), resp: Object.values(G[1].respostas).join('') };
  });
  expect(r.meta.banca).toBe('Instituto AOCP');
  expect(r.meta.cargo).toBe('ARQUITETO');
  expect(r.secoes).toEqual([['Língua Portuguesa', '1,2,3', 'A cidade inventada'], ['Conhecimentos Específicos', '4,5,6,7,8', '']]);
  expect(r.q2).toEqual(['verbo.', 'adjetivo.', 'substantivo.', 'advérbio.', 'preposição.']);
  expect(r.fig).toContain(4);
  expect(r.blocos).toEqual(['TÉCNICO EM EDIFICAÇÕES - PROVA 1', 'ARQUITETO - PROVA 1']);
  expect(r.bloco).toBe(1);
  expect(r.resp).toBe('BCDCCBAB');
});

test('Prova [G] · Simulados: caderno + gabarito viram simulado interativo com figura e pesos da prova', async ({ page }) => {
  await preparar(page);
  const root = page.locator('[data-prancha="simulations"]');
  await root.getByRole('button', { name: 'Simulado de uma prova (PDF)' }).click();
  const card = root.locator('.pr-card', { hasText: 'Simulado a partir da prova' });
  await arquivo(card, '[data-pr-prova="prova"]', 'tests/fixtures/prova-sintetica/prova-sintetica.pdf', '8 questões');
  await expect(card).toContainText('conta como Língua Portuguesa');
  await expect(card.getByRole('button', { name: 'Criar simulado interativo' })).toBeDisabled();
  await arquivo(card, '[data-pr-prova="gab"]', 'tests/fixtures/prova-sintetica/gabarito-sintetico.pdf', 'Qual gabarito do arquivo');
  await expect(card.locator('select')).toHaveValue('1');
  await expect(card).toContainText('8 de 8 questões com resposta');
  /* gabarito digitado substitui o do PDF; X = anulada fica de fora */
  await card.locator('textarea').fill('BCDCCBAX');
  await card.locator('textarea').blur();
  await expect(card).toContainText('1 anulada');
  await card.getByRole('button', { name: 'Criar simulado interativo' }).click();
  await expect(page.locator('#simulationImportModal')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#simulationImportPreview')).toContainText('PROVA_INSTITUTO_AOCP');
  const r = await page.evaluate(() => { const u = window.Prancha.provaSim.ultimo, s = u.exam.sections; return { total: u.total, anuladas: u.anuladas, figuras: u.figuras, secs: s.map((x) => [x.title, x.weight, x.questions.length]), img: (s[1].questions[0].image || '').slice(0, 23), ans: s.flatMap((x) => x.questions.map((q) => q.answer)).join('') }; });
  expect(r.total).toBe(7);
  expect(r.anuladas).toEqual([8]);
  expect(r.figuras).toBeGreaterThanOrEqual(1);
  expect(r.secs).toEqual([['LÍNGUA PORTUGUESA', 1, 3], ['CONHECIMENTOS ESPECÍFICOS', 1, 4]]);
  expect(r.img).toBe('data:image/jpeg;base64,');
  expect(r.ans).toBe('BCDCCBA');
  /* o HTML gerado roda no motor V08: questões, figura e resultado no contrato do app */
  const html = await page.evaluate(async () => await window.Prancha.provaSim.ultimo.file.text());
  const sim = await page.context().newPage();
  await sim.setContent(html);
  await expect(sim.locator('article.question')).toHaveCount(7);
  await expect(sim.locator('img.qimage')).toHaveCount(r.figuras);
  await expect(sim.locator('article.question').first()).toContainText('as praças surgem');
  await sim.close();
  noRuntimeErrors(page);
});

test('Prova [M] · celular: painel do simulado da prova cabe na tela', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparar(page);
  const root = page.locator('[data-prancha="simulations"]');
  await root.getByRole('button', { name: 'Simulado de uma prova (PDF)' }).click();
  const card = root.locator('.pr-card', { hasText: 'Simulado a partir da prova' });
  await arquivo(card, '[data-pr-prova="prova"]', 'tests/fixtures/prova-sintetica/prova-sintetica.pdf', '8 questões');
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

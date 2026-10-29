import { test, expect } from '@playwright/test';
import { setupPrancha, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';

/* V15.62 · Raio-X lido do PDF do edital e regras de várias bancas: blocos com mínimo (FGV/TJSC), certo/errado com
   desconto (Cebraspe), escala 0–10 com média ponderada (FCC), não zerar (FGV), nota final ponderada (FEPESE).
   As fixtures são páginas reais (já em linhas/células) dos editais de Ijuí (FUNDATEC) e do TJSC (FGV). */
test.use({ storageState: { cookies: [], origins: [] } });
test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]);
});
const C = { id: 'porto-alegre', title: 'Ijuí', subtitle: 'Arquiteto', board: 'FUNDATEC' };

test('Raio-X [G] · regras de bancas: blocos, certo/errado, escala FCC, não zerar e nota final ponderada', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...C, examOffset: 30 }] });
  const r = await page.evaluate(() => {
    const E = window.Prancha.editais, id = 'porto-alegre', out = {};
    /* Cebraspe ANSA: P1 30 itens (mín. 6), P2 70 itens (mín. 21), conjunto mín. 30, errada desconta 1 */
    E.set(id, { prova: [{ id: 'p1', nome: 'Conhecimentos básicos', grupo: 'P1', questoes: 30, peso: 1 }, { id: 'p2', nome: 'Conhecimentos específicos', grupo: 'P2', questoes: 70, peso: 1, padrao: true }], grupos: [{ nome: 'P1', minimo: 6 }, { nome: 'P2', minimo: 21 }], minimoGeral: 30, formato: 'certo-errado', penalidade: 1, etapas: [] });
    const a = E.pontuar(id, { p1: 20, p2: 40 }, { erros: { p1: 10, p2: 30 } });
    out.ce = [a.pontos, a.geralOk, a.aprovado, a.falhas.map((f) => f.id)];
    const b = E.pontuar(id, { p1: 20, p2: 45 }, { erros: { p1: 2, p2: 5 } });
    out.ce2 = [b.pontos, b.aprovado];
    /* FCC TRT-8: Gerais peso 1, Específicos peso 2, cada um de 0 a 10, mínimo 6 na média */
    E.set(id, { prova: [{ id: 'cg', nome: 'Conhecimentos Gerais', grupo: 'Gerais', questoes: 20, peso: 1 }, { id: 'ce', nome: 'Conhecimentos Específicos', grupo: 'Específicos', questoes: 40, peso: 1, padrao: true }], grupos: [{ nome: 'Gerais', peso: 1 }, { nome: 'Específicos', peso: 2 }], escala: 'media10', minimoGeral: 6, formato: 'multipla', penalidade: 0, etapas: [{ tipo: 'estudo-caso', max: 10, minimo: 6 }] });
    const f = E.pontuar(id, { cg: 14, ce: 26 }, { etapas: { 'estudo-caso': 5 } });
    out.fcc = [f.pontos, f.max, f.geralOk, f.aprovado, f.falhas.map((x) => x.id)];
    /* FGV AMAZUL: 30 acertos no total e não zerar nenhuma disciplina */
    E.set(id, { prova: [{ id: 'lp', nome: 'Língua Portuguesa', questoes: 10 }, { id: 'ing', nome: 'Língua Inglesa', questoes: 5 }, { id: 'esp', nome: 'Específica', questoes: 45, padrao: true }], grupos: [], escala: 'soma', minimoGeral: 30, minimoGeralEm: 'acertos', naoZerar: true, etapas: [] });
    const z = E.pontuar(id, { lp: 8, ing: 0, esp: 30 });
    out.zerar = [z.corretas, z.geralOk, z.aprovado, z.falhas.map((x) => x.zerou)];
    /* FEPESE: objetiva de 0 a 10, NF = 0,8 × objetiva + 0,2 × títulos */
    E.set(id, { prova: [{ id: 'lp', nome: 'Língua Portuguesa', questoes: 10, peso: 0.2 }, { id: 'esp', nome: 'Conhecimentos Específicos', questoes: 40, peso: 0.2, padrao: true }], naoZerar: false, minimoGeral: 6, minimoGeralEm: 'pontos', notaFinal: 'ponderada', pesoObjetiva: 0.8, etapas: [{ tipo: 'titulos', max: 10, peso: 0.2, carater: 'C' }] });
    const n = E.pontuar(id, { lp: 8, esp: 32 }, { etapas: { titulos: 5 } });
    out.nf = [n.pontos, n.notaFinal.valor, n.notaFinal.max, E.formulaNotaFinal(E.regras(id))];
    /* Legalle: mínimo geral em % do total */
    E.set(id, { prova: [{ id: 'lp', nome: 'Língua Portuguesa', questoes: 10, peso: 3, minimo: 5, minimoEm: 'acertos' }, { id: 'esp', nome: 'Conhecimentos Específicos', questoes: 15, peso: 3, minimo: 8, minimoEm: 'acertos', padrao: true }], minimoGeral: 50, minimoGeralEm: 'pct', notaFinal: 'soma', pesoObjetiva: null, etapas: [] });
    out.pct = [E.minimoGeral(id), E.pontuar(id, { lp: 5, esp: 8 }).aprovado, E.pontuar(id, { lp: 4, esp: 15 }).aprovado];
    return out;
  });
  /* 20 − 10 = 10 em P1 (passa), 40 − 30 = 10 em P2 (abaixo de 21) e 20 no conjunto (abaixo de 30) */
  expect(r.ce).toEqual([20, false, false, ['g:p2']]);
  expect(r.ce2).toEqual([58, true]);
  /* (7,0 × 1 + 6,5 × 2) ÷ 3 = 6,67; estudo de caso 5 < 6 elimina */
  expect(r.fcc).toEqual([6.67, 10, true, false, ['e:estudo-caso']]);
  expect(r.zerar).toEqual([38, true, false, [true]]);
  expect(r.nf).toEqual([8, 7.4, 10, 'Nota final = 0,8 × Objetiva + 0,2 × Títulos']);
  expect(r.pct).toEqual([37.5, true, false]);
});

test('Raio-X [G] · leitor do edital: quadro FUNDATEC de Ijuí e módulos do TJSC a partir das páginas do PDF', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...C, examOffset: 30 }] });
  const r = await page.evaluate(async () => {
    const R = window.MeusMapasEditalReader, get = async (n) => (await fetch('tests/fixtures/edital-' + n + '-paginas.json')).json();
    const ij = R.lerEdital(await get('ijui'), { cargo: 'Arquiteto' }), tj = R.lerEdital(await get('tjsc'), { cargo: 'Arquiteto' });
    return {
      ij: ij.prova.map((d) => [d.nome, d.questoes, d.peso, d.minimo, d.minimoEm]), ijMg: [ij.minimoGeral, ij.minimoGeralEm], ijTit: ij.etapas.map((x) => [x.tipo, x.max]), ijFases: ij.fases.map((f) => f.id + ':' + f.data), ijCat: ij.prova.map((d) => d.categorias.join('/')), resumo: R.resumo(ij),
      tj: tj.prova.length, tjQ: tj.prova.reduce((s, d) => s + d.questoes, 0), tjG: tj.grupos.filter((g) => g.minimo).map((g) => [g.nome, g.minimo, g.minimoEm]), tjMg: [tj.minimoGeral, tj.minimoGeralEm], tjArq: tj.prova.some((d) => /Projeto Arquitetônico/.test(d.nome))
    };
  });
  expect(r.ij).toEqual([['Atualidades / Língua Portuguesa', 20, 0.51, 1, 'acertos'], ['Legislação Municipal', 15, 1, 1, 'acertos'], ['Informática / Matemática', 13, 1.1, 1, 'acertos'], ['Legislação e Conhecimentos Específicos', 27, 1.5, 13, 'acertos']]);
  expect(r.ijMg).toEqual([60, 'pontos']);
  expect(r.ijTit).toEqual([['titulos', 20]]);
  expect(r.ijFases).toContain('prova:2026-12-19');
  expect(r.ijFases).toContain('inscricoes:2026-10-23');
  expect(r.ijCat).toEqual(['Português', 'Legislação e Administração', 'Informática/Raciocínio lógico', '']);
  expect(r.resumo).toBe('4 disciplinas · 75 questões · 80 pontos · mínimo 60 pts · títulos 20');
  expect([r.tj, r.tjQ, r.tjArq]).toEqual([11, 80, true]);
  expect(r.tjG).toEqual([['Módulo de Conhecimentos Específicos', 30, 'acertos']]);
  expect(r.tjMg).toEqual([48, 'acertos']);
});

test('Raio-X [G] · “Ler o PDF do edital” mostra a conferência e monta o Raio-X com o cronograma', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...C, examOffset: 30 }] });
  /* o pdf.js vem da CDN no app; aqui o leitor recebe as páginas já extraídas do edital real */
  await page.evaluate(async () => {
    const pages = await (await fetch('tests/fixtures/edital-ijui-paginas.json')).json();
    window.lerEditalDoArquivo = async () => window.MeusMapasEditalReader.lerEdital(pages, { cargo: 'Arquiteto' });
    openCourse('porto-alegre');
  });
  const rx = page.locator('.pr[data-prancha="course"] .pr-raiox-card');
  await expect(rx).toContainText('Estrutura ainda não informada');
  /* sem edital salvo no curso, o app pede o arquivo; com edital salvo, lê direto */
  page.on('filechooser', (fc) => fc.setFiles({ name: 'edital.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }));
  await rx.getByRole('button', { name: 'Ler o PDF do edital' }).first().click();
  const panel = rx.locator('.pr-leitura');
  await expect(panel).toContainText('4 disciplinas · 75 questões · 80 pontos · mínimo 60 pts · títulos 20');
  await expect(panel.locator('tbody tr')).toHaveCount(4);
  await expect(panel).toContainText('Cronograma:');
  await panel.getByRole('button', { name: 'Aplicar ao Raio-X' }).click();
  await expect(rx).toContainText('4 disciplinas · 75 questões · 80 pontos · mínimo geral 60 · + 20 de títulos');
  await expect(rx.locator('.pr-dsc').nth(3)).toContainText('13 ac.');
  await expect(rx).toContainText('Lido do PDF do edital');
  const f = await page.evaluate(() => window.Prancha.editais.get('porto-alegre').fases);
  expect(f.prova.date).toBe('2026-12-19');
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

test('Raio-X [G] · cartão mostra blocos, etapas e fórmula; formulário salva bloco e etapa', async ({ page }) => {
  await setupPrancha(page, { courses: [{ ...C, board: 'FGV', title: 'TJSC', examOffset: 30 }] });
  await page.evaluate(async () => {
    const pages = await (await fetch('tests/fixtures/edital-tjsc-paginas.json')).json();
    const plan = window.MeusMapasEditalReader.lerEdital(pages, { cargo: 'Arquiteto' });
    plan.etapas = [{ tipo: 'discursiva', max: 20, minimo: 10, carater: 'EC', nota: 'corrige até 10× as vagas' }];
    window.Prancha.editais.importKit('porto-alegre', JSON.stringify(plan));
    openCourse('porto-alegre');
  });
  const rx = page.locator('.pr[data-prancha="course"] .pr-raiox-card');
  await expect(rx.locator('.pr-blocos')).toContainText('Módulo de Conhecimentos Específicos');
  await expect(rx.locator('.pr-blocos')).toContainText('mín. 30 ac.');
  await expect(rx.locator('.pr-etapas')).toContainText('Prova discursiva');
  await expect(rx.locator('.pr-nf')).toHaveText('Nota final = Objetiva + Prova discursiva');
  await expect(rx.locator('.pr-regra')).toContainText('48 ac.');
  await rx.locator('summary', { hasText: 'Editar estrutura da prova' }).click();
  await expect(rx.locator('input[name="grupo0"]')).toHaveValue('Módulo de Conhecimentos Gerais');
  await rx.locator('select[name="formato"]').selectOption('certo-errado');
  await rx.locator('input[name="penalidade"]').fill('1');
  await rx.getByRole('button', { name: 'Salvar estrutura' }).click();
  await expect(rx.locator('.pr-regra')).toContainText('certo/errado · errada desconta 1 certa');
  const e = await page.evaluate(() => { const x = window.Prancha.editais.get('porto-alegre'); return [x.grupos.length, x.etapas.length, x.formato, x.penalidade]; });
  expect(e).toEqual([2, 1, 'certo-errado', 1]);
});

test('Raio-X [G] · celular: leitura e blocos cabem na tela', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupPrancha(page, { courses: [{ ...C, examOffset: 30 }] });
  await page.evaluate(async () => {
    const pages = await (await fetch('tests/fixtures/edital-tjsc-paginas.json')).json();
    window.Prancha.editais.importKit('porto-alegre', JSON.stringify(window.MeusMapasEditalReader.lerEdital(pages, { cargo: 'Arquiteto' })));
    openCourse('porto-alegre');
  });
  await expect(page.locator('.pr-raiox-card .pr-dsc')).toHaveCount(11);
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

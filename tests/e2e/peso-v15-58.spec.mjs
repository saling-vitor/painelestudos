import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { setupPrancha, seedProgress, go, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';

/* V15.58 · peso do edital no plano e ponte com o Template: peso × esforço no curso, nota projetada,
   cobertura × domínio, erros por armadilha, planejamento do kit (matriz pelo programa), CSV para o Notion
   e o interruptor do peso nas Configurações. */
test.use({ storageState: { cookies: [], origins: [] } });

test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]);
});

const DEMHAB = { id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01 · Arquiteto', board: 'FUNDATEC', examOffset: 20 };

/* estado do Reader como o Template V211 grava: domínio por tópico, questões respondidas e padrões de erro */
async function seedMastery(page, plan) {
  await page.evaluate((plan) => {
    for (const m of combinedMaps()) {
      const p = plan[m.code]; if (!p) continue;
      const k = mapStateStorageKey(m), st = JSON.parse(localStorage.getItem(k) || '{}');
      st.reviewMeta = {}; st.quizMeta = {};
      for (let i = 0; i < p.topicos; i++) { st.reviewMeta['t' + i] = { mastery: p.dominio }; st.quizMeta['t' + i] = { attempts: 2, correct: Math.round((p.dominio / 100) * 2), wrong: 2 - Math.round((p.dominio / 100) * 2), guessed: 0 }; }
      st.v135 = { errorPatterns: p.erros || {} };
      localStorage.setItem(k, JSON.stringify(st));
    }
  }, plan);
}

test('Peso [G] · curso mostra Peso × Esforço e as prioridades citam o peso da disciplina', async ({ page }) => {
  await setupPrancha(page, { courses: [DEMHAB] });
  await page.evaluate(() => window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'));
  await seedProgress(page);
  await page.evaluate(() => openCourse('porto-alegre'));
  const c = page.locator('.pr[data-prancha="course"]');
  await expect(c.locator('.pr-card').filter({ hasText: 'Peso × Esforço' })).toBeVisible();
  const pe = await page.evaluate(() => window.Prancha.editais.pesoEsforco('porto-alegre'));
  expect(pe.totPontos).toBe(100);
  expect(pe.rows.find((r) => r.id === 'lp').topicos).toBe(32);
  expect(pe.razao).toBeGreaterThan(1);
  const rows = await page.evaluate(() => window.Prancha.plan.priorities(3, 'porto-alegre').map((r) => !!r.peso));
  expect(rows.every(Boolean)).toBe(true);
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

test('Peso [G] · Progresso projeta a nota e separa domínio de cobertura', async ({ page }) => {
  await setupPrancha(page, { courses: [DEMHAB] });
  await page.evaluate(() => window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'));
  await seedProgress(page, { DEMHAB: [20, 0, 0], CF88: [44, 0, 0], LP: [20, 0, 0] });
  await seedMastery(page, { DEMHAB: { topicos: 10, dominio: 30, erros: { 'excecao': 4, 'prazo ou numero': 2 } }, CF88: { topicos: 10, dominio: 90 } });
  await go(page, 'progress');
  const p = page.locator('.pr[data-prancha="progress"]');
  const nota = p.locator('.pr-card').filter({ hasText: 'Nota projetada' });
  await expect(nota).toContainText('/ 100 pts');
  await expect(nota.locator('.pr-nt')).toHaveCount(3);
  const quad = p.locator('.pr-card').filter({ hasText: 'Cobertura × domínio' });
  await expect(quad.locator('.pr-q.o')).toContainText('DEMHAB');
  await expect(quad.locator('.pr-q.ok')).toContainText('CF88');
  await expect(quad.locator('.pr-q.l')).toContainText('LP');
  const arm = p.locator('.pr-card').filter({ hasText: 'Erros por armadilha' });
  await expect(arm).toContainText('Exceção');
  await expect(arm).toContainText('6 erros classificados');
  /* domínio baixo entra no motivo da prioridade */
  const why = await page.evaluate(() => window.Prancha.plan.priorities(20, 'porto-alegre').find((r) => r.map.code === 'DEMHAB')?.reasons || []);
  expect(why.some((x) => /domínio 30%/.test(x))).toBe(true);
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

test('Peso [G] · planejamento do kit vira matriz pelo programa; formato errado é recusado', async ({ page }) => {
  await setupPrancha(page, { courses: [DEMHAB] });
  await seedProgress(page, { LIU: [24, 0, 0] });
  const bad = await page.evaluate(() => { try { window.Prancha.editais.importKit('porto-alegre', '{"schema":"outro"}'); return 'aceitou'; } catch (e) { return e.message; } });
  expect(bad).toContain('meus-mapas/app-edital/v1');
  const r = await page.evaluate(() => window.Prancha.editais.importKit('porto-alegre', {
    schema: 'meus-mapas/app-edital/v1', banca: 'fundatec', minimoGeral: 50, fonte: 'Edital 01/2026',
    prova: [{ id: 'lp', nome: 'Língua Portuguesa', questoes: 10, peso: 1, minimo: 4, categorias: ['Português'] }, { id: 'esp', nome: 'Específicos', questoes: 40, peso: 2, minimo: 40, padrao: true }],
    fases: [{ id: 'recursos', data: '2026-12-01' }, { id: 'nada', data: '2026-12-02' }],
    programa: [{ item: 'Estatuto da Cidade: instrumentos', disciplina: 'Específicos', mapas: ['LIU'] }, { item: 'Acessibilidade NBR 9050', disciplina: 'Específicos', mapas: [] }]
  }));
  expect(r).toMatchObject({ disciplinas: 2, itens: 2, fases: 1 });
  await go(page, 'progress');
  const mx = page.locator('.pr[data-prancha="progress"] .pr-card').filter({ hasText: 'Matriz pelo programa' });
  await expect(mx).toContainText('2 itens do edital · 1 sem mapa');
  await expect(mx.locator('.pr-li').first()).toContainText('100%');
  await expect(mx.locator('.pr-li.x')).toContainText('Acessibilidade NBR 9050');
});

test('Peso [G] · Configurações desliga o peso e exporta CSV para o Notion', async ({ page }) => {
  await setupPrancha(page, { courses: [DEMHAB] });
  await page.evaluate(() => window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'));
  await go(page, 'settings');
  const s = page.locator('.pr[data-prancha="settings"]');
  const sw = s.locator('[data-pr-act="plano-peso"]');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(s.locator('[data-pr-act="plano-peso"]')).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => window.Prancha.prefs.get('planoPeso'))).toBe(false);
  const dl = page.waitForEvent('download');
  await s.getByRole('button', { name: 'Mapas.csv' }).click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe('Mapas_MeusMapas.csv');
  const txt = fs.readFileSync(await file.path(), 'utf8');
  expect(txt).toContain('Mapa,Código,Curso,Categoria');
  expect(txt).toContain('DEMHAB');
});

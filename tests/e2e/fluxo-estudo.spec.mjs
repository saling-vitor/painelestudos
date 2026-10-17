// V15.52 · fluxo de estudo: retomar no tópico, revisão guiada, índice de seções, estado da nuvem e config restrita.
import { test, expect } from '@playwright/test';
import { setupPrancha, seedProgress, go, screen } from './helpers/prancha-mock.mjs';

/* as suítes antigas rodam na interface clássica; esta exercita as pranchas */
test.use({ storageState: { cookies: [], origins: [] } });

test('Retomar [G] · o tópico informado pelo leitor aparece na Home e abre direto nele', async ({ page }) => {
  await setupPrancha(page);
  const key = await page.evaluate(() => { const m = combinedMaps()[0]; const k = m._key || mapKey(m); localStorage.setItem('studyapp.lastMap', k); state.readerMapKey = k; return k; });
  /* o leitor envia a mensagem de dentro do iframe; mensagens de outras janelas são ignoradas */
  await page.evaluate(() => window.postMessage({ source: 'meus-mapas-reader', type: 'topic', topicId: 'falso', title: 'Não deve gravar' }, location.origin));
  await page.evaluate(() => document.getElementById('readerFrame').contentWindow.eval("parent.postMessage({source:'meus-mapas-reader',type:'topic',topicId:'t-retomar',title:'Tópico de teste'},'*')"));
  await expect.poll(() => page.evaluate((k) => StudyFlow.resume.get(k)?.topicId, key)).toBe('t-retomar');
  await page.evaluate(() => { state.readerMapKey = ''; });
  await go(page, 'home');
  const card = page.locator('[data-prancha="home"] .pr-retomar');
  await expect(card).toContainText('Tópico de teste');
  const btn = card.getByRole('button', { name: 'Continuar no tópico' });
  await expect(btn).toHaveAttribute('data-topic', 't-retomar');
  await btn.click();
  await expect.poll(() => page.evaluate(() => document.getElementById('readerFrame').src)).toContain('topic=t-retomar');
});

test('Revisão guiada [G] · avalia um tópico, segue para o próximo e encerra', async ({ page }) => {
  await setupPrancha(page);
  await seedProgress(page, { DEMHAB: [0, 2, 1] });
  const due = await page.evaluate(() => {
    const d = StudyPlanner.exportData(), past = new Date(Date.now() - 86400000).toISOString();
    StudyPlanner.topicReviews().forEach((r) => { d.topicReviews[r.id] = { mapKey: r.mapKey, courseId: r.courseId, topicId: r.topicId, title: r.title, rating: 'hard', repetitions: 1, intervalDays: 3, dueAt: past, updatedAt: past }; });
    StudyPlanner.importData(d, { mergeData: false, silent: true });
    return StudyPlanner.dueTopics().length;
  });
  expect(due).toBeGreaterThanOrEqual(2);
  await go(page, 'home');
  await screen(page, 'rev');
  await page.locator('[data-prancha="home"]').getByRole('button', { name: /Revisão guiada no leitor/ }).click();
  const bar = page.locator('#guidedReviewBar');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('1 de ' + due);
  await bar.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(bar).toContainText('2 de ' + due);
  await expect.poll(() => page.evaluate(() => StudyPlanner.dueTopics().length)).toBe(due - 1);
  await bar.getByRole('button', { name: /Encerrar/ }).click();
  await expect(bar).toBeHidden();
  expect(await page.evaluate(() => StudyFlow.guided.session())).toBeNull();
});

test('Índice de seções [M] · aparece no celular e leva até a seção', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupPrancha(page);
  await seedProgress(page);
  await go(page, 'progress');
  const nav = page.locator('[data-prancha="progress"] .pr-secnav');
  await expect(nav).toBeVisible();
  expect(await nav.locator('a').count()).toBeGreaterThanOrEqual(4);
  await nav.locator('a').nth(3).click();
  await page.waitForTimeout(700);
  const top = await page.evaluate(() => { const a = document.querySelectorAll('[data-prancha="progress"] .pr-secnav a')[3]; return document.getElementById(a.dataset.arg).getBoundingClientRect().top; });
  expect(top).toBeLessThan(260);
  await expect(page.locator('[data-prancha="progress"] .pr-secnav')).toHaveClass(/is-stuck/);
});

test('Índice de seções [D] · fica oculto no desktop, Configurações mantém o índice', async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) <= 700, 'o índice das pranchas é do celular');
  await setupPrancha(page);
  await go(page, 'progress');
  await expect(page.locator('[data-prancha="progress"] .pr-secnav')).toBeHidden();
  await go(page, 'settings');
  await expect(page.locator('[data-prancha="settings"] .pr-toc')).toBeVisible();
});

test('Configurações [G] · mostram o estado da nuvem e o uso do aparelho', async ({ page }) => {
  await setupPrancha(page);
  await go(page, 'settings');
  const car = page.locator('[data-prancha="settings"] .pr-carimbo');
  await expect(car).toContainText('Supabase');
  await expect(car).toContainText('no ar');
  await expect(car).toContainText('Neste aparelho');
});

test('Config [G] · substituição local aceita só chaves conhecidas e JSON inválido não quebra', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('cfg')) { sessionStorage.setItem('cfg', '1'); localStorage.setItem('studyapp.config.override', JSON.stringify({ supabaseUrl: 'https://exemplo.invalido', bucket: 'outro-bucket', extra: 'x' })); } });
  await setupPrancha(page);
  const cfg = await page.evaluate(() => window.STUDY_APP_CONFIG);
  expect(cfg.supabaseUrl).toBe('https://hapyzjfhbobtaellaejv.supabase.co');
  expect(cfg.bucket).toBe('outro-bucket');
  expect(cfg.extra).toBeUndefined();
  await page.evaluate(() => localStorage.setItem('studyapp.config.override', '{inválido'));
  await page.reload();
  await page.waitForFunction(() => window.STUDY_APP_CONFIG && typeof Prancha !== 'undefined');
  expect(await page.evaluate(() => window.STUDY_APP_CONFIG.supabaseUrl)).toBe('https://hapyzjfhbobtaellaejv.supabase.co');
  await page.evaluate(() => localStorage.removeItem('studyapp.config.override'));
});

test('Índice de busca [G] · não segura a abertura e chega depois', async ({ page }) => {
  await setupPrancha(page);
  await page.waitForFunction(() => window.studySearchIndexReady && state.searchIndexPending === false);
  expect(await page.evaluate(() => state.searchIndex.items.length)).toBeGreaterThan(100);
});

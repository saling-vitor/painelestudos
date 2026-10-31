// V15.67.2 · mede geometria do card realmente visível; confere a biblioteca clássica mesmo oculta pela Prancha.
import { test, expect } from '@playwright/test';
import { setupPrancha } from './helpers/prancha-mock.mjs';

test.use({ storageState: { cookies: [], origins: [] } });

test('Desktop [D] · capa deixa respiro real antes de sigla, estado e versão', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'O ajuste é específico do desktop.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupPrancha(page);
  await page.evaluate(() => {
    state.mapLayout = 'grid';
    localStorage.setItem('studyapp.mapLayout', 'grid');
    openCourse(combinedCourses()[0].id);
  });

  // O curso usa os cards clássicos exibidos ao usuário (sem .pr-on).
  const card = page.locator('#courseMaps .map-card.has-cover').first();
  await expect(card, 'Mapa do curso com capa precisa estar visível').toBeVisible();
  const geometry = () => card.evaluate(el => {
    const cover = el.querySelector(':scope > .map-cover');
    const row = el.querySelector(':scope > .map-card-status-row');
    if (!cover || !row) return null;
    return {
      gap: row.getBoundingClientRect().top - cover.getBoundingClientRect().bottom,
      margin: parseFloat(getComputedStyle(cover).marginBottom) || 0,
      isList: !!el.closest('.map-list')
    };
  });
  await expect.poll(async () => (await geometry())?.gap ?? -1, {
    message: 'Distância visível entre capa e etiquetas no curso'
  }).toBeGreaterThanOrEqual(16);
  const measured = await geometry();
  expect(measured.margin).toBeGreaterThanOrEqual(18);
  expect(measured.isList).toBe(false);

  // Em Todos os Mapas a Prancha substitui visualmente os cards legados.
  // Conferir a regra CSS nesse DOM oculto sem medir seu bounding box zerado.
  await page.evaluate(() => nav('maps'));
  const libraryCover = page.locator('#allMaps .map-card.has-cover > .map-cover').first();
  await expect(libraryCover).toHaveCount(1);
  const libraryMargin = await libraryCover.evaluate(el => parseFloat(getComputedStyle(el).marginBottom) || 0);
  expect(libraryMargin, 'Regra de espaçamento da biblioteca clássica').toBeGreaterThanOrEqual(18);
});

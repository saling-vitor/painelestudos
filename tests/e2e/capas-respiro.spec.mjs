// V15.67.2 · verificação geométrica real do respiro entre capa e etiquetas.
import { test, expect } from '@playwright/test';
import { setupPrancha } from './helpers/prancha-mock.mjs';

test.use({ storageState: { cookies: [], origins: [] } });

test('Desktop [D] · capas dos mapas deixam ao menos 16 px antes das etiquetas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'O ajuste é específico do desktop.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupPrancha(page);
  // Garantir modo Capas independentemente de preferências de testes anteriores.
  await page.evaluate(() => { state.mapLayout = 'grid'; localStorage.setItem('studyapp.mapLayout', 'grid'); nav('maps'); });
  for (const [target, selector] of [
    ['Todos os Mapas', '#allMaps'],
    ['Mapas do Curso', '#courseMaps']
  ]) {
    if (target === 'Mapas do Curso') await page.evaluate(() => openCourse(combinedCourses()[0].id));
    const card = page.locator(selector + ' .map-card.has-cover').first();
    await expect(card, target + ' deve apresentar um mapa com capa').toBeVisible();
    const measure = () => card.evaluate(el => {
      const cover = el.querySelector(':scope > .map-cover');
      const status = el.querySelector(':scope > .map-card-status-row');
      if (!cover || !status) return -1;
      return status.getBoundingClientRect().top - cover.getBoundingClientRect().bottom;
    });
    await expect.poll(measure, { message: target + ': distância real entre capa e etiquetas' }).toBeGreaterThanOrEqual(16);
  }
});

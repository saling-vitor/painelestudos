// V15.67.2 · teste geométrico do espaçamento real nas capas (interface clássica).
import { test, expect } from '@playwright/test';
import { setupPrancha } from './helpers/prancha-mock.mjs';

test.use({ storageState: { cookies: [], origins: [] } });

test('Desktop [D] · capa tem respiro de 18 px até as etiquetas nos mapas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'O ajuste é específico do desktop.');
  await page.setViewportSize({ width: 1440, height: 900 });
  // A Prancha mantém os componentes antigos no DOM mas ocultos.
  // O pedido visual é sobre os cards clássicos: ativar a interface clássica ANTES do boot.
  await page.addInitScript(() => localStorage.setItem('studyapp.prancha.off', '1'));
  await setupPrancha(page);
  await expect(page.locator('html')).toHaveClass(/pr-disabled/);
  await page.evaluate(() => {
    state.mapLayout = 'grid';
    localStorage.setItem('studyapp.mapLayout', 'grid');
  });

  for (const [name, open, selector] of [
    ['Meus Cursos', () => 'course', '#courseMaps'],
    ['Todos os Mapas', () => 'maps', '#allMaps']
  ]) {
    if (open() === 'course') await page.evaluate(() => openCourse(combinedCourses()[0].id));
    else await page.evaluate(() => nav('maps'));
    const card = page.locator(selector + ' .map-card.has-cover').first();
    await expect(card, name + ': card com imagem visível').toBeVisible();
    const result = await card.evaluate(el => {
      const cover = el.querySelector(':scope > .map-cover');
      const badges = el.querySelector(':scope > .map-card-status-row');
      if (!cover || !badges) return null;
      return {
        gap: badges.getBoundingClientRect().top - cover.getBoundingClientRect().bottom,
        marginBottom: parseFloat(getComputedStyle(cover).marginBottom) || 0,
        isList: Boolean(el.closest('.map-list'))
      };
    });
    expect(result, name + ': capa e linha de metadados presentes').not.toBeNull();
    expect(result.isList, name + ': modo Capas').toBe(false);
    expect(result.marginBottom, name + ': margem física sob a capa').toBeGreaterThanOrEqual(18);
    expect(result.gap, name + ': espaço visível entre capa e etiquetas').toBeGreaterThanOrEqual(16);
  }
});

import { test, expect } from '@playwright/test';
import { setupPrancha, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';

/* Prancha V4: novo layout sem trocar os modelos de dados e as ações já existentes. */
test.use({ storageState: { cookies: [], origins: [] } });
test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]);
});

test('Cursos V4 · resumo, ferramentas e biblioteca antecedem o edital completo', async ({ page }) => {
  await setupPrancha(page);
  await page.evaluate(() => openCourse('porto-alegre'));
  const curso = page.locator('.pr[data-prancha="course"]');
  await expect(curso.locator('.pr-course-nav-item')).toHaveCount(4);
  await expect(curso.locator('.pr-course-milestone')).toHaveCount(3);
  await expect(curso.locator('.pr-course-brief')).toHaveCount(3);
  await expect(curso.locator('.pr-course-tool')).toHaveCount(6);
  await expect(curso.locator('.pr-regua li')).toHaveCount(7);
  await expect(curso.locator('.pr-raiox-card')).toBeAttached();
  await expect(curso.locator('.pr-tile')).toHaveCount(14);
  const ordem = await curso.evaluate((el) =>
    ['overview', 'estudo', 'biblioteca', 'edital'].map((s) =>
      [...el.children].findIndex((c) => c.dataset?.prSection === s)));
  expect(ordem.every((n) => n >= 0)).toBe(true);
  expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  await curso.locator('.pr-course-nav-item[data-arg="biblioteca"]').click();
  await expect(curso.locator('[data-pr-section="biblioteca"] .pr-tbl')).toBeVisible();
  await curso.locator('.pr-course-tool[data-arg="raiox"]').click();
  await expect(curso.locator('.pr-raiox-card')).toBeVisible();
  await curso.locator('.pr-chipf[data-arg="completed"]').click();
  await expect(curso.locator('.pr-tbl tbody tr')).toHaveCount(0);
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

test('Cursos V4 · próximo marco administrativo segue a data, não a ordem das fases', async ({ page }) => {
  await setupPrancha(page);
  const result = await page.evaluate(() => {
    const iso = (n) => {
      const d = new Date(); d.setDate(d.getDate() + n);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    const E = window.Prancha.editais;
    E.set('porto-alegre', { fases: { gabarito: { date: iso(30) }, resultado: { date: iso(5) }, homologacao: { date: iso(-2) } } });
    const c = courseById('porto-alegre');
    const proximo = E.proximoMarco(c);
    openCourse('porto-alegre');
    return { id: proximo?.id, date: proximo?.date?.getTime() };
  });
  expect(result.id).toBe('resultado');
  await expect(page.locator('.pr[data-prancha="course"] .pr-course-milestone').nth(1)).toContainText('Resultado final');
});

test('Cursos V4 · visão geral e filtros cabem no mobile sem perder ações', async ({ page }) => {
  await setupPrancha(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => openCourse('porto-alegre'));
  const curso = page.locator('.pr[data-prancha="course"]');
  await expect(curso.locator('.pr-course-brief')).toHaveCount(3);
  await expect(curso.locator('.pr-course-tools-list')).toBeVisible();
  await expect(curso.locator('.pr-course-filter-row')).toHaveCount(2);
  await curso.locator('.pr-course-nav-item[data-arg="estudo"]').click();
  await expect(curso.locator('.pr-tile').first()).toBeVisible();
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

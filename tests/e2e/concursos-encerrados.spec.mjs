import { test, expect } from '@playwright/test';
import { setupPrancha, seedProgress, go, screen, noRuntimeErrors } from './helpers/prancha-mock.mjs';

/* V15.54 · concursos encerrados (arquivados ou com prova já realizada) saem das telas de estudo */
test.use({ storageState: { cookies: [], origins: [] } });

test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]);
});

const NEXT = { id: 'cangucu', title: 'Canguçu Arquiteto', subtitle: 'Arquiteto', board: 'Objetiva', examOffset: 13 };
const nextMaps = [
  { code: 'INFR', title: 'Informática, Redes e Nuvem', topics: 20, category: 'Informática' },
  { code: 'ESCG', title: 'Estatuto dos Servidores de Canguçu', topics: 30, category: 'Legislação e Administração' },
  { code: 'LOCG', title: 'Lei Orgânica de Canguçu', topics: 25, category: 'Legislação e Administração' }
].map((m, i) => ({ id: 'cg-' + i, user_id: 'e2e-user', course_id: 'cangucu', code: m.code, title: m.title, short_title: '', version: 'V01', board: 'Objetiva', contest: 'Arquiteto', topics: m.topics, branches: 4, category: m.category, accent: 'auto', filename: m.code + '.html', storage_path: 'e2e-user/cangucu/' + m.code + '.html', storage_id: 'study-' + m.code.toLowerCase(), created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-10T00:00:00.000Z' }));

test('Encerrados [G] · prova realizada some do Início, das revisões e da biblioteca', async ({ page }) => {
  await setupPrancha(page, { courses: [{ id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01 · Arquiteto', board: 'FUNDATEC', examOffset: -1 }, NEXT], extraMaps: nextMaps });
  await seedProgress(page);
  const scope = await page.evaluate(() => ({ all: combinedMaps().length, live: studyScopeMaps().length, courses: studyScopeCourses().map((c) => c.id) }));
  expect(scope.live).toBe(3);
  expect(scope.all).toBeGreaterThan(scope.live);
  expect(scope.courses).toEqual(['cangucu']);

  await go(page, 'home');
  const home = page.locator('.pr[data-prancha="home"]');
  await screen(page, 'hoje');
  await expect(home.locator('.pr-carimbo .pr-k').first()).toContainText('Objetiva');
  await expect(home).not.toContainText('DEMHAB');
  await expect(home).not.toContainText('Política Habitacional');
  /* a fila de revisão só traz o que está em estudo */
  const reviewKeys = await page.evaluate(() => window.Prancha.reviews.queue().map((r) => r.map.courseId));
  expect(reviewKeys.every((id) => id === 'cangucu')).toBe(true);
  const prios = await page.evaluate(() => window.Prancha.plan.priorities(10).map((r) => r.map.courseId));
  expect(prios.every((id) => id === 'cangucu')).toBe(true);

  await go(page, 'maps');
  const maps = page.locator('.pr[data-prancha="maps"]');
  /* V15.56: só os 3 mapas LOCAIS do concurso encerrado saem da biblioteca (LOPA, EFPA, DEMHAB);
     os portáteis e o misto continuam, porque servem no próximo edital */
  await expect(maps).toContainText('14 de 14 mapas');
  await expect(maps).toContainText('3 mapas locais de concursos encerrados ocultos');
  await expect(maps).toContainText('Constituição Federal');
  await expect(maps).not.toContainText('Política Habitacional');
  await maps.getByRole('button', { name: 'Mostrar encerrados' }).click();
  await expect(maps).toContainText('Política Habitacional');

  await go(page, 'courses');
  const courses = page.locator('.pr[data-prancha="courses"]');
  await expect(courses).toContainText('Encerrados');
});

test('Encerrados [G] · curso arquivado também sai do estudo; nova data traz de volta', async ({ page }) => {
  await setupPrancha(page, { courses: [{ id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01', board: 'FUNDATEC', examOffset: 20, status: 'archived' }, NEXT], extraMaps: nextMaps });
  expect(await page.evaluate(() => studyScopeMaps().length)).toBe(3);
  const back = await page.evaluate(() => StudyScope.courseRetired({ id: 'x', examDate: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10) }));
  expect(back).toBe(false);
  const today = await page.evaluate(() => { const d = new Date(); return StudyScope.courseRetired({ id: 'y', examDate: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }); });
  expect(today, 'o dia da prova ainda conta como ativo').toBe(false);
});

// V15.55.2 · a sincronização com a nuvem redesenha a tela ativa. Antes, cada redesenho refazia a animação de
// entrada dos cards (opacidade .65→1) e recriava as <img> das capas: a grade "piscava" a cada envio.
import { test, expect } from '@playwright/test';
import { setupPrancha } from './helpers/prancha-mock.mjs';

const COURSE = [{ id: 'porto-alegre', title: 'MONTE NEGRO', subtitle: 'Arquiteto', board: 'FUNDATEC', examOffset: 40 }];

async function watchAnimations(page) {
  await page.evaluate(() => { window.__anims = []; document.addEventListener('animationstart', (e) => window.__anims.push(e.animationName), true); });
}
const takeAnimations = (page) => page.evaluate(() => { const a = window.__anims; window.__anims = []; return a; });

test('Sincronização [G] · cards animam só ao abrir a tela; sincronizar não pisca nem recria capas', async ({ page }) => {
  await setupPrancha(page, { courses: COURSE });
  await watchAnimations(page);
  await page.evaluate(() => openCourse('porto-alegre'));
  await expect(page.locator('.view.active .map-card').first()).toBeVisible();
  // a entrada da tela anima; em máquina lenta a v12-view-in pode começar com atraso, então espera por ela
  await expect.poll(() => page.evaluate(() => window.__anims.includes('v12-view-in')), { timeout: 15000 }).toBe(true);
  await expect(page.locator('.view.is-entering')).toHaveCount(0, { timeout: 6000 });
  await page.waitForFunction(() => state.cloudLoading === false);
  await takeAnimations(page);
  // marca só as capas já carregadas e confere que esses mesmos nós continuam na tela
  const marked = await page.evaluate(() => { const imgs = [...document.querySelectorAll('.view.active img')].filter((i) => i.complete && i.naturalWidth); imgs.forEach((i) => { i.__keep = true; }); return imgs.length; });
  expect(marked).toBeGreaterThan(0);
  await page.evaluate(() => syncNow(true));
  await page.waitForFunction(() => state.cloudLoading === false);
  await page.evaluate(() => refreshActiveView());
  await page.waitForTimeout(400);
  const anims = await takeAnimations(page);
  expect(anims.filter((n) => n === 'map-card-enter' || n === 'v12-view-in')).toEqual([]);
  const kept = await page.evaluate(() => [...document.querySelectorAll('.view.active img')].filter((i) => i.__keep).length);
  expect(kept).toBe(marked);
});

test('Sincronização [G] · contador de alterações usa plural correto', async ({ page }) => {
  await setupPrancha(page, { courses: COURSE });
  await page.waitForFunction(() => state.cloudLoading === false);
  const texts = await page.evaluate(() => {
    const original = StudyCloud.pendingCount;
    const out = [];
    for (const n of [1, 3]) { StudyCloud.pendingCount = () => n; updateCloudUI(); out.push(document.body.textContent); }
    StudyCloud.pendingCount = original; updateCloudUI();
    return out.join('\n');
  });
  expect(texts).not.toMatch(/alteraçãoões|alteraçãoes/);
  expect(texts).toMatch(/3 alterações/);
});

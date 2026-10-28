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
  await expect.poll(() => page.evaluate(() => window.__anims.filter((n) => n === 'map-card-enter').length)).toBeGreaterThan(0);
  await expect(page.locator('.view.is-entering')).toHaveCount(0, { timeout: 4000 });
  await takeAnimations(page);
  await page.evaluate(() => document.querySelectorAll('.view.active img').forEach((img) => { img.__keep = true; }));
  const loaded = await page.evaluate(() => [...document.querySelectorAll('.view.active img')].filter((i) => i.complete && i.naturalWidth).length);
  await page.evaluate(() => syncNow(true));
  await page.waitForFunction(() => state.cloudLoading === false);
  await page.evaluate(() => refreshActiveView());
  await page.waitForTimeout(400);
  const anims = await takeAnimations(page);
  expect(anims.filter((n) => n === 'map-card-enter' || n === 'v12-view-in')).toEqual([]);
  const kept = await page.evaluate(() => [...document.querySelectorAll('.view.active img')].filter((i) => i.__keep && i.complete && i.naturalWidth).length);
  expect(kept).toBe(loaded);
});

test('Sincronização [G] · contador de alterações usa plural correto', async ({ page }) => {
  await setupPrancha(page, { courses: COURSE });
  await page.waitForFunction(() => state.cloudLoading === false);
  const texts = await page.evaluate(() => {
    const original = StudyCloud.pendingCount;
    const out = [];
    for (const n of [1, 3]) { StudyCloud.pendingCount = () => n; updateCloudUI(); out.push(document.body.innerText); }
    StudyCloud.pendingCount = original; updateCloudUI();
    return out.join('\n');
  });
  expect(texts).not.toMatch(/alteraçãoões|alteraçãoes/);
  expect(texts).toMatch(/3 alterações/);
});

// Acessibilidade da interface ATUAL (pranchas) com axe-core, WCAG 2.1 AA, nas sete áreas em Desktop, iPad e celular.
// Falhas críticas e sérias bloqueiam o deploy (roda no projeto auditoria-plataformas).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupPrancha, seedProgress, go } from './helpers/prancha-mock.mjs';

const VIEWS = ['home', 'courses', 'maps', 'simulations', 'progress', 'agenda', 'settings'];
const DEVICES = [
  { id: 'D-1440', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { id: 'T-820', viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  { id: 'M-390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
];

for (const device of DEVICES) {
  test(`Acessibilidade [G] ${device.id} · pranchas sem falhas críticas ou sérias do axe`, async ({ browser, baseURL }) => {
    test.setTimeout(180000);
    const { id, ...opts } = device;
    const ctx = await browser.newContext({ ...opts, baseURL, serviceWorkers: 'block', reducedMotion: 'reduce', storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await setupPrancha(page);
    await seedProgress(page);
    const found = [];
    for (const view of VIEWS) {
      await go(page, view);
      await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }));
      await page.waitForTimeout(300);
      const result = await new AxeBuilder({ page }).include('.view.active').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      for (const v of result.violations.filter((x) => ['critical', 'serious'].includes(x.impact))) {
        found.push(`${view} · ${v.id} (${v.impact}) · ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      }
    }
    await ctx.close();
    expect(found, 'violações axe críticas/sérias em ' + id).toEqual([]);
  });
}

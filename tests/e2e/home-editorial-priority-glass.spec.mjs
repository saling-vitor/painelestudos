import { test, expect } from '@playwright/test';

test('[G] Home editorial: capa discreta e prioridade com vidro fumê', async ({ page }) => {
  const versionResponse = await page.request.get('/version.json');
  expect(versionResponse.ok()).toBeTruthy();
  const { version } = await versionResponse.json();
  await page.addInitScript(value => localStorage.setItem('studyapp.lastSeenVersion', value), version);
  await page.goto('/#home');

  const hero = page.locator('#homeStudyDashboard .study-command-card');
  await expect(hero).toBeAttached();
  const art = hero.locator('.study-command-art img');
  await expect(art).toBeAttached();
  const visual = await art.evaluate(el => {
    const style = getComputedStyle(el);
    const decoration = getComputedStyle(el.parentElement, '::after');
    return { filter: style.filter, curtain: decoration.backgroundImage };
  });
  const mobile = await page.evaluate(() => document.documentElement.classList.contains('is-phone-layout') || innerWidth <= 700);
  expect(visual.filter).toContain(mobile ? 'brightness(0.55)' : 'brightness(0.65)');
  expect(visual.curtain).toContain('linear-gradient');

  const tile = page.locator('#homeStudyDashboard [data-priority-why]');
  let createdFixture = false;
  if (await tile.count() && await tile.first().isVisible()) {
    await tile.first().click();
    await expect(page.locator('#priorityWhyModal .priority-why-card')).toBeVisible();
    await expect(page.locator('#priorityWhyModal #priorityWhyTitle')).toContainText('Por que este mapa agora?');
    await expect(page.locator('#priorityWhyModal [data-priority-why-open]')).toBeVisible();
  } else {
    createdFixture = true;
    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.id = 'priorityWhyModal';
      modal.className = 'priority-why-modal';
      modal.style.setProperty('--priority-theme', '#759aaf');
      modal.innerHTML = '<div class="priority-why-card" role="dialog" aria-modal="true"><div class="priority-why-head"><span class="kicker">Prioridade do momento</span><h2>Por que este mapa agora?</h2></div><div class="priority-why-intro">Prioridade explicada</div><div class="priority-why-reasons"><article><span>1</span><div><b>Revisão</b><p>Conteúdo real</p></div></article></div></div>';
      document.body.appendChild(modal);
    });
  }

  const glass = await page.locator('#priorityWhyModal .priority-why-card').evaluate(el => {
    const style = getComputedStyle(el);
    const overlay = getComputedStyle(el.parentElement);
    const solid = getComputedStyle(el.querySelector('.priority-why-reasons article'));
    return {
      backdrop: style.backdropFilter || style.webkitBackdropFilter || 'none',
      background: style.backgroundImage,
      radius: style.borderRadius,
      matte: solid.backgroundColor,
      overlay: overlay.backgroundColor,
      supportsGlass: CSS.supports('backdrop-filter','blur(1px)') || CSS.supports('-webkit-backdrop-filter','blur(1px)'),
      reduced: matchMedia('(prefers-reduced-transparency: reduce)').matches
    };
  });
  expect(glass.background).toBe('none');
  expect(glass.overlay).toBeTruthy();
  expect(glass.matte).not.toBe('rgba(0, 0, 0, 0)');
  if (glass.supportsGlass && !glass.reduced) expect(glass.backdrop).toContain('blur(26px)');
  if (createdFixture) await page.locator('#priorityWhyModal').evaluate(el => el.remove());
  else await page.locator('#priorityWhyModal [data-priority-why-close]').click();
});

import { test, expect } from '@playwright/test';

// LG-01–LG-05: no account or persisted user data needed.
// The fixture shares the same classes and ancestor selectors as production cards.
test('[G] [T+M] Clear Glass das capas: material, hover, toque, favorito e modo lista', async ({ page }) => {
  await page.goto('/#home');
  await expect(page.locator('#homeCourses')).toBeAttached();

  await page.evaluate(() => {
    document.querySelector('#glassAuditFixture')?.remove();
    const fixture = document.createElement('div');
    fixture.id = 'glassAuditFixture';
    fixture.style.cssText = 'position:fixed;top:115px;left:12px;width:calc(100vw - 24px);max-width:540px;display:flex;flex-wrap:wrap;gap:12px;z-index:2147483000;pointer-events:auto';
    fixture.innerHTML = `
      <article class="course-card course-library-card" style="position:relative;width:120px;height:110px;min-height:110px;background:#333">
        <div class="course-card-cover" style="position:absolute;inset:0;background:linear-gradient(135deg,#464646,#1d1d1d)"></div>
        <div class="course-cover-controls"><button class="course-card-edit" type="button" aria-label="Mais ações do curso"><span class="ui-icon icon-more"></span></button></div>
      </article>
      <article class="map-card has-cover" style="position:relative;width:120px;height:110px;min-height:110px;background:#333">
        <button class="map-admin-btn" type="button" aria-label="Mais ações do mapa"><span class="ui-icon icon-more"></span></button>
        <button class="fav on" type="button" aria-label="Favorito"><span class="ui-icon icon-star"></span></button>
      </article>
      <article class="simulation-card has-cover" style="position:relative;width:120px;height:110px;min-height:110px;background:#333">
        <button class="simulation-card-menu-btn" type="button" aria-label="Mais ações do simulado"><span class="ui-icon icon-more"></span></button>
      </article>
      <div class="map-list"><article class="map-card has-cover" style="position:relative;width:120px;height:110px">
        <button class="map-admin-btn" type="button" aria-label="Ações em lista"><span class="ui-icon icon-more"></span></button>
      </article></div>`;
    document.querySelector('#homeCourses').appendChild(fixture);
  });

  const style = async (locator) => locator.evaluate(el => {
    const s = getComputedStyle(el);
    const rgb = s.backgroundColor.match(/rgba?\(([^)]+)\)/);
    const channels = rgb ? rgb[1].split(',').map(n => Number.parseFloat(n.trim())) : [];
    return {
      alpha: channels.length === 4 ? channels[3] : channels.length === 3 ? 1 : 0,
      backgroundImage: s.backgroundImage,
      backdrop: s.backdropFilter || s.webkitBackdropFilter || 'none',
      border: s.borderTopColor,
      outline: s.outlineStyle,
      color: s.color
    };
  });

  const controls = [
    page.locator('#glassAuditFixture .course-card-edit'),
    page.locator('#glassAuditFixture .map-card:not(.map-list .map-card) > .map-admin-btn'),
    page.locator('#glassAuditFixture .simulation-card-menu-btn')
  ];
  const pointerFine = await page.evaluate(() => matchMedia('(hover:hover) and (pointer:fine)').matches);
  const backdropSupported = await page.evaluate(() => CSS.supports('backdrop-filter','blur(1px)') || CSS.supports('-webkit-backdrop-filter','blur(1px)'));

  for (const control of controls) {
    await expect(control).toBeVisible();
    const base = await style(control);
    expect(base.alpha, 'Botão sobre capa não deve ter placa opaca').toBeLessThan(0.40);
    if (backdropSupported) expect(base.backdrop).not.toBe('none');
    if (pointerFine) {
      await control.hover();
      const hovered = await style(control);
      expect(hovered.alpha, 'Hover escuro/opaco é uma regressão do LG-01').toBeLessThan(0.28);
      expect(hovered.backgroundImage).toContain('radial-gradient');
      if (backdropSupported) expect(hovered.backdrop).not.toBe('none');
    } else {
      await control.tap();
      const touched = await style(control);
      expect(touched.alpha, 'Toque não pode fixar uma placa opaca').toBeLessThan(0.40);
    }
  }

  const favorite = page.locator('#glassAuditFixture .map-card > .fav.on > .ui-icon');
  await expect(favorite).toBeAttached();
  expect((await style(favorite)).color).toMatch(/242,\s*201,\s*76/);

  const listMenu = page.locator('#glassAuditFixture .map-list .map-admin-btn');
  const listStyle = await style(listMenu);
  expect(listStyle.alpha, 'Menu em lista deve continuar sem vidro').toBe(0);
  expect(listStyle.backdrop).toBe('none');

  await page.locator('#glassAuditFixture').evaluate(el => el.remove());
});

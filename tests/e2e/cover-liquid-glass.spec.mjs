import { test, expect } from '@playwright/test';

// LG-01–LG-05: smoked glass imóvel no hover; sem conta ou dados persistidos.
// The fixture shares the same classes and ancestor selectors as production cards.
test('[G] Smoked Liquid Glass das capas: repouso igual a hover, toque, favorito e lista', async ({ page }) => {
  // The real app may display the "what's new" modal over the fixture.
  // Mark the current test build as acknowledged before app boot: no forced clicks
  // and no permanent change to the production modal behavior.
  const versionResponse = await page.request.get('/version.json');
  expect(versionResponse.ok()).toBeTruthy();
  const release = await versionResponse.json();
  await page.addInitScript(version => {
    localStorage.setItem('studyapp.lastSeenVersion', version);
  }, release.version);
  await page.goto('/#home');
  await expect(page.locator('#homeCourses')).toBeAttached();
  await expect(page.locator('#whatsNewModal')).not.toHaveClass(/open/);

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
      rgb: channels.slice(0,3),
      backgroundImage: s.backgroundImage,
      backgroundColor: s.backgroundColor,
      boxShadow: s.boxShadow,
      transitionDuration: s.transitionDuration,
      backdrop: s.backdropFilter || s.webkitBackdropFilter || 'none',
      border: s.borderTopColor,
      outline: s.outlineStyle,
      color: s.color,
      transform: s.transform
    };
  });

  const controls = [
    page.locator('#glassAuditFixture .course-card-edit'),
    page.locator('#glassAuditFixture .map-card:not(.map-list .map-card) > .map-admin-btn'),
    page.locator('#glassAuditFixture .simulation-card-menu-btn'),
    page.locator('#glassAuditFixture .map-card:not(.map-list .map-card) > .fav')
  ];
  const pointerFine = await page.evaluate(() => matchMedia('(hover:hover) and (pointer:fine)').matches);
  const defaultTransparency = await page.evaluate(() => !matchMedia('(prefers-reduced-transparency: reduce)').matches);
  expect(defaultTransparency, 'Fixture testa acabamento padrão; acessibilidade usa outra regra').toBe(true);
  const backdropSupported = await page.evaluate(() => CSS.supports('backdrop-filter','blur(1px)') || CSS.supports('-webkit-backdrop-filter','blur(1px)'));

  for (const control of controls) {
    await expect(control).toBeVisible();
    const base = await style(control);
    expect(base.alpha, 'Vidro fumê deve ter densidade suficiente').toBeGreaterThanOrEqual(backdropSupported ? 0.85 : 0.92);
    expect(base.alpha, 'Vidro grafite mantém translucidez').toBeLessThanOrEqual(backdropSupported ? 0.91 : 0.99);
    expect(base.rgb[0], 'Placa não pode continuar quase preta sobre capas pretas').toBeGreaterThanOrEqual(42);
    expect(base.rgb[0], 'Placa não pode tornar-se leitosa').toBeLessThanOrEqual(58);
    expect(Math.abs(base.rgb[0]-base.rgb[1]), 'Cor neutra sem tonalidade azul').toBeLessThanOrEqual(2);
    expect(base.backgroundImage).toContain('radial-gradient');
    expect(base.transform).toBe('none');
    expect(base.transitionDuration.split(',').every(n => Number.parseFloat(n) === 0),
      'Botão não deve animar material/posição').toBe(true);
    if (backdropSupported) expect(base.backdrop).not.toBe('none');
    if (pointerFine) {
      await control.hover();
      const hovered = await style(control);
      for (const property of ['alpha','backgroundColor','backgroundImage','boxShadow','backdrop','border','color','transform']) {
        expect(hovered[property], `O hover não pode mudar ${property}`).toBe(base[property]);
      }
    } else {
      await control.tap();
      const touched = await style(control);
      for (const property of ['alpha','backgroundColor','backgroundImage','boxShadow','backdrop','border','transform']) {
        expect(touched[property], `O toque não pode mudar ${property}`).toBe(base[property]);
      }
    }
    await control.focus();
    const keyboard = await control.evaluate(el => ({
      focused: document.activeElement === el,
      focusVisible: el.matches(':focus-visible'),
      outline: getComputedStyle(el).outlineStyle
    }));
    expect(keyboard.focused, 'Controle mantém foco por teclado').toBe(true);
    if (keyboard.focusVisible) expect(keyboard.outline).not.toBe('none');
  }

  const favorite = page.locator('#glassAuditFixture .map-card > .fav.on > .ui-icon');
  await expect(favorite).toBeAttached();
  expect((await style(favorite)).color).toMatch(/242,\s*201,\s*76/);

  const listMenu = page.locator('#glassAuditFixture .map-list .map-admin-btn');
  const listStyle = await style(listMenu);
  expect(listStyle.alpha, 'Menu em lista deve continuar sem vidro').toBe(0);
  expect(listStyle.backdrop).toBe('none');
  // JS enhancement must respect MATTE / GLASS even after grid->list transitions.
  await expect(listMenu).not.toHaveClass(/mm-glass-micro/);

  await page.locator('#glassAuditFixture').evaluate(el => el.remove());
});

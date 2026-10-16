// Conceitos Nanquim e Latão aplicados ao app inteiro: fontes, escala, paleta, pigmentos e Vidro Nanquim.
// Mede o que o navegador realmente aplica (estilos computados), não só o CSS declarado.
import { test, expect } from '@playwright/test';
import { setupPrancha, seedProgress, go } from './helpers/prancha-mock.mjs';

test.use({ storageState: { cookies: [], origins: [] } });

const FAMILIES = ['Archivo', 'IBM Plex Mono', 'Anton'];
const NAV_PIGMENT = { home: '#c3aa84', courses: '#c08a6e', maps: '#a3ad8a', simulations: '#b98a8a', progress: '#a294b4', agenda: '#8fa1b3', settings: '#a8a29a' };

async function typography(page) {
  return page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
    const families = new Set(), small = [], lower = [], inputs = [];
    const coarse = innerWidth <= 1180;
    const seen = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const txt = w.currentNode.textContent.trim(); const e = w.currentNode.parentElement;
      if (!txt || !e || seen.has(e) || !vis(e)) continue; seen.add(e);
      if (e.closest('iframe, svg')) continue;
      const s = getComputedStyle(e), fs = parseFloat(s.fontSize);
      families.add(s.fontFamily.split(',')[0].replace(/["']/g, '').trim());
      const upper = s.textTransform === 'uppercase' || txt === txt.toUpperCase();
      if (fs < 10.99) small.push(e.className + ' ' + fs + ' ' + txt.slice(0, 20));
      else if (fs < 11.99 && !upper && /[a-zà-ú]{3}/.test(txt)) lower.push(e.className + ' ' + fs + ' ' + txt.slice(0, 20));
    }
    document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea').forEach((e) => { if (vis(e) && coarse && parseFloat(getComputedStyle(e).fontSize) < 15.99) inputs.push(e.name || e.id || e.className); });
    return { families: [...families], small, lower, inputs };
  });
}

test('Conceitos [G] · só Archivo, IBM Plex Mono e Anton, sem texto abaixo do piso, campos com 16px no toque', async ({ page }) => {
  test.setTimeout(150000);
  const fontRequests = [];
  page.on('request', (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) fontRequests.push(r.url()); });
  await setupPrancha(page);
  await seedProgress(page);
  for (const v of ['home', 'courses', 'maps', 'simulations', 'progress', 'agenda', 'settings']) {
    await go(page, v);
    await page.waitForTimeout(400);
    const t = await typography(page);
    expect(t.families.filter((f) => !FAMILIES.includes(f)), 'famílias em ' + v).toEqual([]);
    expect(t.small, 'texto abaixo de 11px em ' + v).toEqual([]);
    expect(t.lower, 'texto minúsculo abaixo de 12px em ' + v).toEqual([]);
    expect(t.inputs, 'campos abaixo de 16px no toque em ' + v).toEqual([]);
  }
  await go(page, 'courses');
  await page.locator('.pr[data-prancha="courses"] [data-pr-act="open-course"]').first().click();
  await page.locator('.pr[data-prancha="course"] [data-pr-act="open-map"]').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  const r = await typography(page);
  expect(r.families.filter((f) => !FAMILIES.includes(f)), 'famílias no leitor').toEqual([]);
  expect(r.small, 'texto abaixo de 11px no leitor').toEqual([]);
  expect(fontRequests, 'nenhuma fonte da rede').toEqual([]);
  expect(await page.evaluate(() => document.fonts.check('16px "Archivo"') && document.fonts.check('12px "IBM Plex Mono"'))).toBe(true);
});

test('Conceitos [G] · pigmento do menu só no item ativo e na cor da seção; cor do card vem da categoria', async ({ page }) => {
  test.setTimeout(120000);
  await setupPrancha(page);
  const hex = (rgb) => '#' + rgb.match(/\d+/g).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  for (const [view, pigment] of Object.entries(NAV_PIGMENT)) {
    await go(page, view);
    const active = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.side .nav-btn.active, .bottom-nav>button.active, .bottom-nav>.mobile-menu-trigger.active')].find((x) => x.getBoundingClientRect().width > 0);
      if (!b) return null;
      const label = b.querySelector('.txt, .bottom-nav-label') || b;
      return { nav: b.dataset.nav || 'mais', color: getComputedStyle(label).color };
    });
    expect(active, 'item ativo visível em ' + view).not.toBeNull();
    // no celular ("Mais") e no iPad (atalhos em Configurações) a seção pode morar dentro de outro botão:
    // vale o pigmento do botão que acende; no desktop, o da própria seção
    if (active.nav === view) expect(hex(active.color), 'pigmento do menu em ' + view).toBe(pigment);
    else expect(hex(active.color), 'pigmento do botão que agrupa ' + view).toBe(NAV_PIGMENT[active.nav] || NAV_PIGMENT.settings);
    if (test.info().project.name === 'desktop-chromium') expect(active.nav).toBe(view);
  }
  const pig = await page.evaluate(() => ({
    obras: categoryPigment('Obras, Gestão e Orçamento'), infra: categoryPigment('Infraestrutura e Mobilidade Urbana'), acess: categoryPigment('Acessibilidade e Segurança'),
    leg: categoryPigment('Legislação e Administração'), port: categoryPigment('Português'), outros: categoryPigment('Outros'),
    card: (() => { const m = combinedMaps()[0]; return { accent: mapAccentValue(m), cat: categoryPigment(m.category) }; })(),
    prancha: Prancha.categoryPigment('Urbanismo e Habitação')
  }));
  expect(pig).toMatchObject({ obras: '#c08a6e', infra: '#cfa35e', acess: '#a294b4', leg: '#c3aa84', port: '#b98a8a', outros: '#a8a29a', prancha: '#a3ad8a' });
  expect(pig.card.accent).toBe(pig.card.cat);
});

test('Conceitos [G] · vidro só no que flutua, conteúdo sólido, saída opaca com mais contraste', async ({ page }) => {
  test.setTimeout(120000);
  await setupPrancha(page);
  await seedProgress(page);
  await go(page, 'home');
  const mat = () => page.evaluate(() => {
    const f = (sel) => { const e = [...document.querySelectorAll(sel)].find((x) => x.getBoundingClientRect().width > 0); if (!e) return null; const s = getComputedStyle(e); return { filter: s.backdropFilter || s.webkitBackdropFilter || 'none', bg: s.backgroundColor }; };
    return { topbar: f('.topbar'), bar: f('.pr-bar'), card: f('.pr-card'), cell: f('.pr-cell') };
  });
  const glass = await mat();
  expect(glass.topbar.filter).toContain('blur(22px)');
  expect(glass.bar.filter).toContain('blur(22px)');
  expect(glass.card.filter).toBe('none');
  await go(page, 'courses');
  await page.locator('.pr[data-prancha="courses"] [data-pr-act="open-course"]').first().click();
  await page.locator('.pr[data-prancha="course"] [data-pr-act="open-map"]').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  const reader = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#reader .readerbar')); return { filter: s.backdropFilter || s.webkitBackdropFilter, bg: s.backgroundColor }; });
  expect(reader.filter).toContain('blur(22px)');
  expect(reader.bg).toBe('rgba(5, 5, 5, 0.58)');
  await page.emulateMedia({ contrast: 'more' });
  const opaque = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#reader .readerbar')); return { filter: s.backdropFilter || s.webkitBackdropFilter || 'none', bg: s.backgroundColor }; });
  expect(opaque.filter).toBe('none');
  expect(opaque.bg).toBe('rgb(11, 10, 9)');
});

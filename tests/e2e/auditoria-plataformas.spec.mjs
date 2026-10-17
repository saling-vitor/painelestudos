// Auditoria multiplataforma da interface ATUAL (pranchas) e da clássica: Desktop [D], iPad [T] e celular [M].
// Mede, por tela e viewport: erros de JS, respostas 4xx/5xx, rolagem lateral, alvos de toque < 44px (T/M),
// texto visível < 11px e, opcionalmente (AUDIT_OUT), captura screenshots e um hash do estilo computado de
// cada elemento (inclusive ::before/::after) para provar paridade visual antes/depois da limpeza de CSS.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);
const CATALOG = JSON.parse(fs.readFileSync(new URL('data/catalog.json', ROOT), 'utf8'));
const RELEASE = JSON.parse(fs.readFileSync(new URL('version.json', ROOT), 'utf8'));
const OUT = process.env.AUDIT_OUT || '';
const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:4173';
const BASE_DAY = '2026-10-16';
const FIXED_NOW = new Date(BASE_DAY + 'T13:00:00.000Z');
const dayIso = (offset) => { const d = new Date(FIXED_NOW); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
const VIEWS = ['home', 'courses', 'maps', 'simulations', 'progress', 'agenda', 'settings'];

const VIEWPORTS = [
  { id: 'D-1280x720', w: 1280, h: 720, k: 'D' }, { id: 'D-1366x768', w: 1366, h: 768, k: 'D' },
  { id: 'D-1440x900', w: 1440, h: 900, k: 'D' }, { id: 'D-1920x1080', w: 1920, h: 1080, k: 'D' },
  { id: 'T-810x1080', w: 810, h: 1080, k: 'T' }, { id: 'T-820x1180', w: 820, h: 1180, k: 'T' },
  { id: 'T-834x1194', w: 834, h: 1194, k: 'T' }, { id: 'T-1024x1366', w: 1024, h: 1366, k: 'T' },
  { id: 'T-1180x820', w: 1180, h: 820, k: 'T' }, { id: 'T-1194x834', w: 1194, h: 834, k: 'T' },
  { id: 'M-320x568', w: 320, h: 568, k: 'M' }, { id: 'M-360x740', w: 360, h: 740, k: 'M' },
  { id: 'M-375x667', w: 375, h: 667, k: 'M' }, { id: 'M-390x844', w: 390, h: 844, k: 'M' },
  { id: 'M-414x896', w: 414, h: 896, k: 'M' }, { id: 'M-430x932', w: 430, h: 932, k: 'M' }
];
const UA = {
  T: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  M: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
};
const SNAP_VIEWPORTS = (process.env.AUDIT_SNAP || 'D-1440x900,T-820x1180,T-1180x820,M-390x844,M-360x740').split(',');

function cloudRows(courseId, empty) {
  if (empty) return [];
  return (CATALOG.maps || []).map((m, i) => ({ id: m.id || 'e2e-map-' + i, user_id: 'e2e-user', course_id: courseId, code: m.code, title: m.title, short_title: m.shortTitle || '', version: m.version || '', board: m.board || '', contest: m.contest || '', topics: Number(m.topics || 0), branches: Number(m.branches || 0), category: m.category || 'Outros', accent: m.accent || 'auto', filename: m.filename || '', storage_path: 'e2e-user/' + courseId + '/' + String(m.filename || m.code), storage_id: m.storageId || '', created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z' }));
}

async function setup(page, { classic = false, empty = false } = {}) {
  const errors = [], bad = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && u.startsWith('http://127.0.0.1')) bad.push(r.status() + ' ' + u.replace(/^http:\/\/127\.0\.0\.1:\d+/, '')); });
  page.audit = { errors, bad };
  await page.clock.setFixedTime(FIXED_NOW);
  const courses = empty ? [] : [{ id: 'porto-alegre', user_id: 'e2e-user', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01 · Arquiteto', city: 'Porto Alegre/RS', institution: '', board: 'FUNDATEC', exam_date: dayIso(3), status: 'active', created_at: '2026-09-01T00:00:00.000Z' }];
  const rows = cloudRows('porto-alegre', empty);
  await page.route('https://hapyzjfhbobtaellaejv.supabase.co/**', async (route) => {
    const r = route.request(), u = r.url(), cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range,content-type' };
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (u.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ id: 'e2e-user', email: 'e2e@example.com' }) });
    if (u.includes('/rest/v1/courses')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(courses) });
    if (u.includes('/rest/v1/maps')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows) });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' });
  });
  const cache = rows.map((m) => ({ id: m.id, courseId: m.course_id, code: m.code, title: m.title, shortTitle: m.short_title, version: m.version, board: m.board, contest: m.contest, topics: m.topics, branches: m.branches, category: m.category, accent: m.accent, source: 'cloud', storage_path: m.storage_path, filename: m.filename, storageId: m.storage_id }));
  await page.addInitScript(({ maps, version, courses, classic, empty }) => {
    if (sessionStorage.getItem('audit.init')) return;
    sessionStorage.setItem('audit.init', '1');
    localStorage.setItem('studyapp.lastSeenVersion', version);
    if (classic) localStorage.setItem('studyapp.prancha.off', '1'); else localStorage.removeItem('studyapp.prancha.off');
    const user = { id: 'e2e-user', email: 'e2e@example.com' };
    localStorage.setItem('studyapp.auth', JSON.stringify({ access_token: 'e2e-token', refresh_token: '', expires_at: 4102444800, user }));
    localStorage.setItem('studyapp.cloudCatalog::e2e-user', JSON.stringify({ courses: courses.map((c) => ({ ...c, examDate: c.exam_date, source: 'cloud' })), maps, docs: [], simulations: [], user, savedAt: '2026-10-16T12:00:00.000Z' }));
  }, { maps: cache, version: String(RELEASE.version), courses, classic, empty });
  await page.goto('/#home');
  if (!empty) await page.waitForFunction(() => typeof combinedCourses === 'function' && combinedCourses().length > 0);
  await page.waitForFunction(() => typeof initialCloudSyncDone === 'undefined' || initialCloudSyncDone === true);
  await page.waitForFunction(() => typeof Prancha !== 'undefined' && (Prancha.__installed === true || Prancha.enabled?.() === false));
  if (!empty) await page.evaluate(() => {
    const plan = { DEMHAB: [27, 1, 0], PDGV: [33, 0, 0], CF88: [44, 0, 0], EFPA: [1, 0, 0], DCAS: [18, 1, 1] };
    for (const m of combinedMaps()) { const p = plan[m.code]; if (!p) continue; const ts = {}; let i = 0;
      for (let j = 0; j < p[0]; j++, i++) ts['t' + i] = 'done'; for (let j = 0; j < p[1]; j++, i++) ts['t' + i] = 'review'; for (let j = 0; j < p[2]; j++, i++) ts['t' + i] = 'difficult';
      const k = mapStateStorageKey(m); localStorage.setItem(k, JSON.stringify({ topicStates: ts })); localStorage.setItem('studyapp.modified::' + k, '2026-10-15T12:00:00.000Z'); }
  });
}

async function settle(page) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0); document.querySelectorAll('.view.active, .main, main').forEach((e) => { try { e.scrollTop = 0; } catch {} });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    document.getAnimations().forEach((a) => { try { a.finish(); } catch {} });
    await document.fonts.ready;
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }));
}

async function metrics(page, kind) {
  return page.evaluate((kind) => {
    const W = document.documentElement.clientWidth;
    const visible = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
    const overflowDoc = document.documentElement.scrollWidth - W;
    const smallTargets = []; const tinyText = [];
    if (kind !== 'D') document.querySelectorAll('button, a[href], [role="button"], input:not([type=hidden]), select, [data-nav], [data-pr-act]').forEach((e) => {
      if (!visible(e) || e.closest('#reader:not(.open)')) return; const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight * 3) return;
      if (Math.min(r.width, r.height) < 44 && Math.max(r.width, r.height) < 44) smallTargets.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = walker.nextNode())) { const t = n.nodeValue.trim(); if (!t) continue; const e = n.parentElement; if (!e || !visible(e)) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 11) tinyText.push(fs + 'px "' + t.slice(0, 24) + '"'); }
    return { overflowDoc, smallTargets: [...new Set(smallTargets)], tinyText: [...new Set(tinyText)].slice(0, 30) };
  }, kind);
}

async function styleSnapshot(page) {
  return page.evaluate(() => {
    const h = (str) => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
    const PROPS = [...getComputedStyle(document.documentElement)].filter((p) => !p.startsWith('--'));
    const ORIGIN = location.origin; const ser = (cs) => { let s = ''; for (const p of PROPS) s += cs.getPropertyValue(p).split(ORIGIN).join('') + ';'; return s; };
    const pseudo = (e, w) => { const cs = getComputedStyle(e, w); const c = cs.getPropertyValue('content'); return c === 'none' || c === 'normal' ? c : ser(cs); };
    const out = {}; const pathOf = (e) => { const parts = []; while (e && e !== document.documentElement) { const p = e.parentElement; parts.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ':' + (p ? [...p.children].indexOf(e) : 0)); e = p; } return parts.join('>'); };
    const rootVars = (() => { const cs = getComputedStyle(document.documentElement); return [...cs].filter((p) => p.startsWith('--')).sort().map((p) => p + ':' + cs.getPropertyValue(p)).join(';'); })();
    out.__rootVars = h(rootVars);
    for (const e of document.querySelectorAll('*')) {
      if (e.closest('script,style,head,svg defs')) continue;
      const r = e.getBoundingClientRect();
      out[pathOf(e)] = h(ser(getComputedStyle(e)) + '|B|' + pseudo(e, '::before') + '|A|' + pseudo(e, '::after') + '|R|' + [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10)).join(','));
    }
    return out;
  });
}

function save(rel, data) { if (!OUT) return; const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data)); }

for (const vp of VIEWPORTS) {
  for (const mode of ['prancha', 'classica']) {
    if (mode === 'classica' && !SNAP_VIEWPORTS.includes(vp.id)) continue;
    test(`Auditoria [${vp.k}] ${vp.id} · ${mode} · sete áreas sem erro, 404 ou rolagem lateral`, async ({ browser }) => {
      test.setTimeout(240000);
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, screen: { width: vp.w, height: vp.h }, deviceScaleFactor: vp.k === 'D' ? 1 : 2, isMobile: vp.k !== 'D', hasTouch: vp.k !== 'D', userAgent: UA[vp.k], serviceWorkers: 'block', reducedMotion: 'reduce', baseURL: BASE, storageState: { cookies: [], origins: [] } });
      const page = await ctx.newPage();
      await setup(page, { classic: mode === 'classica' });
      const report = {};
      for (const view of VIEWS) {
        await page.evaluate((v) => nav(v), view);
        if (mode === 'prancha') await expect(page.locator('.view[data-view="' + view + '"].pr-on > .pr[data-prancha="' + view + '"]')).toBeVisible();
        else await expect(page.locator('.view[data-view="' + view + '"]')).toHaveClass(/active/);
        await settle(page);
        report[view] = await metrics(page, vp.k);
        if (OUT && SNAP_VIEWPORTS.includes(vp.id)) save(`styles/${mode}/${vp.id}/${view}.json`, await styleSnapshot(page));
        if (OUT) save(`shots/${mode}/${vp.id}/${view}.png`, await page.screenshot({ fullPage: SNAP_VIEWPORTS.includes(vp.id) }));
      }
      // Leitor: abre o primeiro mapa pelo fluxo real e mede o Reader.
      await page.evaluate(() => nav('maps'));
      await settle(page);
      const opener = mode === 'prancha' ? page.locator('.pr[data-prancha="maps"] [data-pr-act="open-map"]').first() : page.locator('#allMaps [data-map], #mapLibrary [data-map], [data-view="maps"] [data-map]').first();
      if (await opener.count()) {
        await opener.click();
        await expect(page.locator('#reader')).toHaveClass(/open/);
        await page.waitForTimeout(1200);
        await settle(page);
        report.reader = await metrics(page, vp.k);
        if (OUT && SNAP_VIEWPORTS.includes(vp.id)) save(`styles/${mode}/${vp.id}/reader.json`, await styleSnapshot(page));
        if (OUT) save(`shots/${mode}/${vp.id}/reader.png`, await page.screenshot());
        await page.locator('#readerClose').click();
        await expect(page.locator('#reader')).not.toHaveClass(/open/);
      } else report.reader = { skipped: 'sem botão de abrir mapa' };
      report.errors = page.audit.errors; report.bad = page.audit.bad;
      save(`metrics/${mode}/${vp.id}.json`, report);
      await ctx.close();
      expect(page.audit.errors, 'erros de JavaScript').toEqual([]);
      expect(page.audit.bad, 'respostas 4xx/5xx locais').toEqual([]);
      for (const view of VIEWS) expect(report[view].overflowDoc, 'rolagem lateral em ' + view).toBeLessThanOrEqual(1);
    });
  }
}

test('Auditoria [G] · estados vazios reais nas sete áreas (sem cursos e sem mapas)', async ({ browser }) => {
  test.setTimeout(180000);
  for (const vp of VIEWPORTS.filter((v) => SNAP_VIEWPORTS.includes(v.id))) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.k !== 'D', hasTouch: vp.k !== 'D', userAgent: UA[vp.k], serviceWorkers: 'block', reducedMotion: 'reduce', baseURL: BASE, storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await setup(page, { empty: true });
    const report = {};
    for (const view of VIEWS) {
      await page.evaluate((v) => nav(v), view);
      await expect(page.locator('.view[data-view="' + view + '"]')).toHaveClass(/active/);
      await settle(page);
      report[view] = await metrics(page, vp.k);
      if (OUT) save(`shots/vazio/${vp.id}/${view}.png`, await page.screenshot());
    }
    report.errors = page.audit.errors; report.bad = page.audit.bad;
    save(`metrics/vazio/${vp.id}.json`, report);
    await ctx.close();
    expect(page.audit.errors, 'erros de JavaScript em ' + vp.id).toEqual([]);
    for (const view of VIEWS) expect(report[view].overflowDoc, 'rolagem lateral vazia em ' + view + ' ' + vp.id).toBeLessThanOrEqual(1);
  }
});

test('Auditoria [G] · títulos importados com HTML não executam código em nenhuma área (XSS)', async ({ browser }) => {
  test.setTimeout(180000);
  for (const classic of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', baseURL: BASE, storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.route('**/data/catalog.json*', async (route) => {
      const res = await route.fetch(); const data = await res.json();
      data.maps = (data.maps || []).map((m, i) => i === 0 ? { ...m, title: '<img src=x onerror="window.__xss=1">' + m.title, shortTitle: '<svg onload="window.__xss=2">' } : m);
      return route.fulfill({ response: res, body: JSON.stringify(data), contentType: 'application/json' });
    });
    await setup(page, { classic });
    await page.evaluate(() => { const m = combinedMaps()[0]; if (m) { m.title = '<img src=x onerror="window.__xss=3">' + m.title; m.shortTitle = '<svg onload="window.__xss=4">'; } });
    for (const view of VIEWS) { await page.evaluate((v) => nav(v), view); await page.waitForTimeout(200); }
    await page.locator('#globalSearch:visible').first().fill('img').catch(() => {});
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__xss), 'nenhum handler injetado executou (' + (classic ? 'clássica' : 'pranchas') + ')').toBeUndefined();
    await ctx.close();
  }
});

test('Auditoria [G] · PWA offline real: instala, desliga a rede, recarrega, navega e abre mapa no leitor', async ({ browser }) => {
  test.setTimeout(240000);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: BASE, storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await setup(page, {});
  await page.waitForFunction(() => navigator.serviceWorker?.controller || false, null, { timeout: 60000 }).catch(() => {});
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60000 });
  await page.evaluate(() => navigator.serviceWorker.controller.postMessage({ type: 'WARM_CACHE' }));
  // aguarda o aquecimento: página offline, leitor e primeiro mapa empacotado no cache
  await page.waitForFunction(async () => { const keys = await caches.keys(); if (!keys.length) return false; const c = await caches.open(keys.find((k) => k.startsWith('study-pwa-'))); const all = (await c.keys()).map((r) => r.url); return all.some((u) => u.includes('reader.html')) && all.some((u) => /cursos\/.*\/mapas\/.*\.html/.test(u)) && all.some((u) => u.includes('prancha.css')); }, null, { timeout: 120000, polling: 1000 });
  const failures = [];
  ctx.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) failures.push(r.status() + ' ' + r.url().replace(BASE, '')); });
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.Prancha?.__installed === true, null, { timeout: 30000 });
  for (const view of VIEWS) { await page.evaluate((v) => nav(v), view); await expect(page.locator('.view[data-view="' + view + '"]')).toHaveClass(/active/); }
  await page.evaluate(() => nav('maps'));
  await page.locator('.pr[data-prancha="maps"] [data-pr-act="open-map"]').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  const frame = page.frameLocator('#readerFrame');
  await expect(frame.locator('body.mindmap-app')).toBeAttached({ timeout: 30000 });
  if (OUT) save('shots/offline/reader-offline.png', await page.screenshot());
  save('metrics/offline.json', { failures, errors: page.audit.errors });
  await ctx.setOffline(false);
  await ctx.close();
  expect(failures.filter((f) => !/version\.json|supabase/.test(f)), 'recursos indisponíveis offline').toEqual([]);
});

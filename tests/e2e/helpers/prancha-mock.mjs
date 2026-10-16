// Ambiente de teste das pranchas: mesma nuvem simulada dos testes principais,
// com cursos configuráveis e progresso semeado de forma explícita (só em teste).
import fs from 'node:fs';
import { expect } from '@playwright/test';

const CATALOG = JSON.parse(fs.readFileSync(new URL('../../../data/catalog.json', import.meta.url), 'utf8'));
const RELEASE = JSON.parse(fs.readFileSync(new URL('../../../version.json', import.meta.url), 'utf8'));
const dayIso = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };

export function mapRows(courseId = 'porto-alegre') {
  return (CATALOG.maps || []).map((m, i) => ({
    id: m.id || 'e2e-map-' + i, user_id: 'e2e-user', course_id: courseId, code: m.code, title: m.title, short_title: m.shortTitle || '', version: m.version || '',
    board: m.board || '', contest: m.contest || '', topics: Number(m.topics || 0), branches: Number(m.branches || 0), category: m.category || 'Outros', accent: m.accent || 'auto',
    filename: m.filename || '', storage_path: 'e2e-user/' + courseId + '/' + String(m.filename || m.code), storage_id: m.storageId || '', created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z'
  }));
}

/* courses: [{id,title,subtitle,board,examOffset (dias a partir de hoje) | null, status}] */
export async function setupPrancha(page, { courses = [{ id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01 · Arquiteto', board: 'FUNDATEC', examOffset: 3 }], extraMaps = [] } = {}) {
  const runtimeErrors = [];
  page.on('pageerror', (e) => runtimeErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') runtimeErrors.push(m.text()); });
  page.runtimeErrors = runtimeErrors;
  const cloudCourses = courses.map((c) => ({ id: c.id, user_id: 'e2e-user', title: c.title, subtitle: c.subtitle || '', city: 'Porto Alegre/RS', institution: c.institution || '', board: c.board || '', exam_date: c.examOffset === null || c.examOffset === undefined ? null : dayIso(c.examOffset), status: c.status || 'active', created_at: c.createdAt || '2026-09-01T00:00:00.000Z' }));
  const rows = [...mapRows(courses[0].id), ...extraMaps];
  await page.route('https://hapyzjfhbobtaellaejv.supabase.co/**', async (route) => {
    const r = route.request(), u = r.url(), cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range,content-type' };
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (u.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ id: 'e2e-user', email: 'e2e@example.com' }) });
    if (u.includes('/rest/v1/courses')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(cloudCourses) });
    if (u.includes('/rest/v1/maps')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(rows) });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' });
  });
  const cache = rows.map((m) => ({ id: m.id, courseId: m.course_id, code: m.code, title: m.title, shortTitle: m.short_title, version: m.version, board: m.board, contest: m.contest, topics: m.topics, branches: m.branches, category: m.category, accent: m.accent, source: 'cloud', storage_path: m.storage_path, filename: m.filename, storageId: m.storage_id }));
  await page.addInitScript(({ maps, version, courses }) => {
    if (sessionStorage.getItem('e2e.init')) return;
    sessionStorage.setItem('e2e.init', '1');
    localStorage.setItem('studyapp.lastSeenVersion', version);
    const user = { id: 'e2e-user', email: 'e2e@example.com' };
    localStorage.setItem('studyapp.auth', JSON.stringify({ access_token: 'e2e-token', refresh_token: '', expires_at: 4102444800, user }));
    localStorage.setItem('studyapp.cloudCatalog::e2e-user', JSON.stringify({ courses: courses.map((c) => ({ ...c, examDate: c.exam_date, source: 'cloud' })), maps, docs: [], simulations: [], user, savedAt: new Date().toISOString() }));
  }, { maps: cache, version: String(RELEASE.version), courses: cloudCourses });
  await page.goto('/#home');
  await page.waitForFunction(() => typeof combinedCourses === 'function' && combinedCourses().length > 0);
  await page.waitForFunction(() => typeof initialCloudSyncDone === 'undefined' || initialCloudSyncDone === true);
  await page.waitForFunction(() => window.Prancha?.__installed === true);
}

/* progresso semeado: {CODE:[ok,rev,dif]} */
export async function seedProgress(page, plan = { DEMHAB: [27, 1, 0], PDGV: [33, 0, 0], CF88: [44, 0, 0], EFPA: [1, 0, 0], DCAS: [18, 1, 1] }) {
  await page.evaluate((plan) => {
    for (const m of combinedMaps()) {
      const p = plan[m.code]; if (!p) continue;
      const ts = {}; let i = 0;
      for (let j = 0; j < p[0]; j++, i++) ts['t' + i] = 'done';
      for (let j = 0; j < p[1]; j++, i++) ts['t' + i] = 'review';
      for (let j = 0; j < p[2]; j++, i++) ts['t' + i] = 'difficult';
      const k = mapStateStorageKey(m);
      localStorage.setItem(k, JSON.stringify({ topicStates: ts }));
      localStorage.setItem('studyapp.modified::' + k, new Date(Date.now() - 86400000).toISOString());
    }
  }, plan);
}

export async function go(page, view) {
  await page.evaluate((v) => nav(v), view);
  await expect(page.locator('.view[data-view="' + view + '"].pr-on > .pr[data-prancha="' + view + '"]')).toBeVisible();
}
export async function screen(page, id) {
  await page.locator('[data-prancha="home"] .pr-tab[data-arg="' + id + '"]').click();
  await expect(page.locator('[data-prancha="home"]')).toHaveAttribute('data-screen', id);
}
export function noRuntimeErrors(page, project) {
  const safari = /webkit/.test(project || '');
  return (page.runtimeErrors || []).filter((m) => !(safari && (/^Context is stopped$/i.test(m) || /supabase\.co|version\.json|access control/i.test(m))));
}
export async function noHorizontalOverflow(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, root = document.querySelector('.view.active > .pr');
    if (!root) return ['sem prancha'];
    const bad = [];
    root.querySelectorAll('*').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width <= 0 || r.right <= W + 1) return;
      let p = e.parentElement;
      while (p && p !== root) { if (getComputedStyle(p).overflowX !== 'visible') return; p = p.parentElement; }
      bad.push(e.tagName + '.' + String(e.className).slice(0, 40) + ' → ' + Math.round(r.right));
    });
    return bad.slice(0, 10);
  });
}

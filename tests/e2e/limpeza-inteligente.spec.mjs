import { test, expect } from '@playwright/test';
import { setupPrancha, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';

test.use({ storageState: { cookies: [], origins: [] } });
test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name)).toEqual([]);
});

function storageName(ns, kind = 'state') { return 'mindmap_' + kind + '::' + ns; }
async function seedRemoved(page, { active = false } = {}) {
  await page.evaluate(({ active }) => {
    const map = { courseId: 'curso-excluido', code: 'OLDMAP', storageId: 'cleanup-unit-very-unique' };
    state.cloudLoading = false;
    state.cloudSyncError = false;
    if (active) state.cloudMaps.push({ ...map, id: 'active-unit-map' });
    const ns = 'cleanup-unit-very-unique';
    localStorage.setItem('mindmap_state::' + ns, JSON.stringify({ topicStates: { '1': 'done' } }));
    localStorage.setItem('mindmap_notes::' + ns, JSON.stringify({ '1': 'anotacao importante' }));
    localStorage.setItem('studyapp.modified::mindmap_state::' + ns, new Date().toISOString());
    localStorage.setItem('mindmap_state::old-unknown-origin', JSON.stringify({ keep: 'untracked' }));
    localStorage.removeItem('studyapp.preferences.pending');
    StudyCloud.pendingCount = () => 0;
    window.preferencesPending = () => false;
    StudyCleanup.recordRemoved([map], ['e2e-user/deleted-content.html'], 'mapa');
  }, { active });
}
test('Limpeza [G] · análise prévia é somente leitura; dados desconhecidos preservados', async ({ page }) => {
  await setupPrancha(page);
  await seedRemoved(page);
  await page.evaluate(() => nav('settings'));
  const root = page.locator('.pr[data-prancha="settings"]');
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('Central de Limpeza Inteligente');
  await root.locator('[data-pr-act="cleanup-analyze"]').click();
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('Análise concluída');
  await expect(root.locator('[data-pr-act="cleanup-permanent"]')).toBeEnabled();
  const result = await page.evaluate(() => ({
    state: localStorage.getItem('mindmap_state::cleanup-unit-very-unique'),
    unknown: localStorage.getItem('mindmap_state::old-unknown-origin')
  }));
  expect(result.state).toContain('done');
  expect(result.unknown).toContain('untracked');
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

test('Limpeza [G] · exige confirmação e escreve lápides; não apaga namespace desconhecido', async ({ page }) => {
  await setupPrancha(page);
  const remote = new Map();
  await page.route('https://hapyzjfhbobtaellaejv.supabase.co/rest/v1/study_snapshots**', async route => {
    const req = route.request(), url = new URL(req.url());
    if (req.method() === 'POST') {
      const data = req.postDataJSON();
      remote.set(data.storage_key, data);
      return route.fulfill({ status: 201, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' }, body: JSON.stringify([data]) });
    }
    const key = (url.searchParams.get('storage_key') || '').replace(/^eq\./, '');
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' }, body: JSON.stringify(remote.has(key) ? [remote.get(key)] : []) });
  });
  await seedRemoved(page);
  await page.evaluate(() => nav('settings'));
  const root = page.locator('.pr[data-prancha="settings"]');
  await root.locator('[data-pr-act="cleanup-analyze"]').click();
  await expect(root.locator('[data-pr-act="cleanup-permanent"]')).toBeEnabled();
  await root.locator('[data-pr-act="cleanup-permanent"]').click();
  await expect(page.locator('#confirmModal.open')).toBeVisible();
  expect(remote.size).toBe(0);
  await page.locator('#confirmAccept').click();
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('Limpeza concluída');
  expect([...remote.values()].filter(x => x.payload?.__studyCleanupDeleted).length).toBe(2);
  const local = await page.evaluate(() => ({
    oldState: localStorage.getItem('mindmap_state::cleanup-unit-very-unique'),
    unknown: localStorage.getItem('mindmap_state::old-unknown-origin')
  }));
  // A ausência da chave eliminada só pode ser aferida após confirmar o POST.
  expect(local.oldState).toBeNull();
  expect(local.unknown).toContain('untracked');
});

test('Limpeza [G] · preserva registro quando mesmo storageId ainda pertence a mapa ativo', async ({ page }) => {
  await setupPrancha(page);
  await seedRemoved(page, { active: true });
  await page.evaluate(() => nav('settings'));
  const root = page.locator('.pr[data-prancha="settings"]');
  await root.locator('[data-pr-act="cleanup-analyze"]').click();
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('Análise concluída');
  await expect(root.locator('[data-pr-act="cleanup-permanent"]')).toBeDisabled();
  expect((await page.evaluate(() => localStorage.getItem('mindmap_state::cleanup-unit-very-unique')))).toContain('done');
});

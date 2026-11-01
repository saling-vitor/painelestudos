import { test, expect } from '@playwright/test';
import { setupPrancha, noRuntimeErrors, noHorizontalOverflow } from './helpers/prancha-mock.mjs';

test.use({ storageState: { cookies: [], origins: [] } });
test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name)).toEqual([]);
});

async function historicalSeed(page) {
  const remote = new Map([
    ['mindmap_state::old-cloud-orphan', { storage_key:'mindmap_state::old-cloud-orphan', payload:{topicStates:{a:'done'}} }]
  ]);
  await page.route('https://hapyzjfhbobtaellaejv.supabase.co/rest/v1/study_snapshots**', async route => {
    const req=route.request(), u=new URL(req.url()), cors={'access-control-allow-origin':'*','access-control-expose-headers':'*'};
    if(req.method()==='POST') {
      const data=req.postDataJSON();
      remote.set(data.storage_key,data);
      return route.fulfill({status:201,contentType:'application/json',headers:cors,body:JSON.stringify([data])});
    }
    const key=(u.searchParams.get('storage_key') || '').replace(/^eq\./,'');
    return route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(key?(remote.has(key)?[remote.get(key)]:[]):[...remote.values()])});
  });
  await page.evaluate(() => {
    state.cloudLoading=false; state.cloudSyncError=false;
    StudyCloud.pendingCount=()=>0; window.preferencesPending=()=>false;
    localStorage.setItem('mindmap_notes::old-local-only',JSON.stringify({note:'do aparelho'}));
    localStorage.setItem('mindmap_state::old-cloud-orphan',JSON.stringify({topicStates:{a:'done'}}));
    const m=combinedMaps().find(x=>x.storageId);
    if(m) localStorage.setItem(mapStateStorageKey(m),JSON.stringify({topicStates:{protected:'done'}}));
  });
  await page.evaluate(() => nav('settings'));
  return {root:page.locator('.pr[data-prancha="settings"]'),remote};
}

test('Histórico · identifica exclusões anteriores, sem tocar em mapas ativos', async ({ page }) => {
  await setupPrancha(page);
  const {root,remote}=await historicalSeed(page);
  await root.locator('[data-pr-act="cleanup-history-analyze"]').click();
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('Análise histórica concluída');
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('1 registro(s) na nuvem');
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('1 neste aparelho');
  expect(remote.get('mindmap_state::old-cloud-orphan').payload.topicStates.a).toBe('done');
  expect(await page.evaluate(() => localStorage.getItem('mindmap_notes::old-local-only'))).toContain('do aparelho');
  expect(await noHorizontalOverflow(page)).toEqual([]);
});

test('Histórico · confirmação necessária para lápide na nuvem e preservação do conteúdo ativo', async ({ page }) => {
  await setupPrancha(page);
  const {root,remote}=await historicalSeed(page);
  await root.locator('[data-pr-act="cleanup-history-analyze"]').click();
  await expect(root.locator('[data-pr-act="cleanup-history-cloud"]')).toBeEnabled();
  await root.locator('[data-pr-act="cleanup-history-cloud"]').click();
  await expect(page.locator('#confirmModal.open')).toBeVisible();
  expect(remote.get('mindmap_state::old-cloud-orphan').payload.topicStates).toBeDefined();
  await page.locator('#confirmAccept').click();
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('Limpeza concluída');
  expect(remote.get('mindmap_state::old-cloud-orphan').payload.__studyCleanupDeleted).toBe(true);
  const check=await page.evaluate(()=>({
    historic:localStorage.getItem('mindmap_state::old-cloud-orphan'),
    local:localStorage.getItem('mindmap_notes::old-local-only'),
    active:(()=>{const m=combinedMaps().find(x=>x.storageId);return m?localStorage.getItem(mapStateStorageKey(m)):null})()
  }));
  expect(check.historic).toBeNull();
  expect(check.local).toContain('do aparelho');
  expect(check.active).toContain('protected');
});

test('Histórico · limpeza local afeta apenas o dispositivo e exige confirmação', async ({ page }) => {
  await setupPrancha(page);
  const {root,remote}=await historicalSeed(page);
  await root.locator('[data-pr-act="cleanup-history-analyze"]').click();
  await root.locator('[data-pr-act="cleanup-history-local"]').click();
  await expect(page.locator('#confirmModal.open')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('mindmap_notes::old-local-only'))).not.toBeNull();
  await page.locator('#confirmAccept').click();
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('Limpeza concluída');
  expect(await page.evaluate(()=>localStorage.getItem('mindmap_notes::old-local-only'))).toBeNull();
  expect(remote.get('mindmap_state::old-cloud-orphan').payload.topicStates).toBeDefined();
});

test('Cache por aparelho · remove somente CacheStorage do app, mantendo caches de outros nomes', async ({ page }) => {
  await setupPrancha(page);
  await page.evaluate(async () => {
    const own=await caches.open('study-pwa-e2e-legacy');
    await own.put(new Request(location.origin+'/test-cleanup-own'),new Response('owned'));
    const other=await caches.open('unrelated-e2e-cache');
    await other.put(new Request(location.origin+'/test-cleanup-other'),new Response('leave'));
  });
  await page.evaluate(()=>nav('settings'));
  const root=page.locator('.pr[data-prancha="settings"]');
  await root.locator('[data-pr-act="cleanup-device-scan"]').click();
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('Cache deste aparelho analisado');
  await expect(root.locator('[data-pr-act="cleanup-device-clear"]')).toBeEnabled();
  await root.locator('[data-pr-act="cleanup-device-clear"]').click();
  await expect(page.locator('#confirmModal.open')).toBeVisible();
  const before=await page.evaluate(()=>caches.keys());
  expect(before).toContain('study-pwa-e2e-legacy');
  await page.locator('#confirmAccept').click();
  await expect(root.locator('[data-pr-host="limpeza"]')).toContainText('Limpeza concluída');
  const after=await page.evaluate(()=>caches.keys());
  expect(after).not.toContain('study-pwa-e2e-legacy');
  expect(after).toContain('unrelated-e2e-cache');
});

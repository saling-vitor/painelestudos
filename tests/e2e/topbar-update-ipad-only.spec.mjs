import { test, expect } from '@playwright/test';

// Atualização da topbar: somente iPad REAL em retrato. Os outros atalhos permanecem.
test('[G] botão atualizar da busca é exclusivo do iPad vertical', async ({ page }, testInfo) => {
  await page.goto('/#home');
  const top = page.locator('#mmUpdTop');
  const sync = page.locator('#syncTop');

  await expect(top).toHaveCount(1);
  await expect(sync).toBeVisible();

  const project = testInfo.project.name;
  if (project.startsWith('ipad')) {
    await expect(page.locator('html')).toHaveClass(/is-ipad/);
    await page.setViewportSize({ width: 834, height: 1194 });
    await expect(top).toBeVisible();
    await expect(sync).toBeVisible();

    await page.setViewportSize({ width: 1194, height: 834 });
    await expect(top).toBeHidden();
    await expect(sync).toBeVisible();

    await page.setViewportSize({ width: 820, height: 1180 });
    await expect(top).toBeVisible();
  } else if (project === 'desktop-chromium') {
    await expect(page.locator('html')).not.toHaveClass(/is-ipad/);
    await expect(top).toBeHidden();
    // Era o erro: notebook/desktop estreito em retrato recebia o botão do iPad.
    await page.setViewportSize({ width: 900, height: 1100 });
    await expect(top).toBeHidden();
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(top).toBeHidden();
    await expect(sync).toBeVisible();
  } else {
    await expect(page.locator('html')).not.toHaveClass(/is-ipad/);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(top).toBeHidden();
    await expect(sync).toBeVisible();
  }

  // O botão de atualização da barra lateral permanece disponível.
  await expect(page.locator('#mmUpdBtn')).toHaveCount(1);
});

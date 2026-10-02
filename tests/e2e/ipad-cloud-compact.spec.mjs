import { test, expect } from '@playwright/test';

test('[T] iPad paisagem usa indicador compacto de nuvem na dock lateral', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad', 'Validação exclusiva do iPad.');

  await page.setViewportSize({ width: 1194, height: 834 });
  await page.goto('/#home');
  await expect(page.locator('html')).toHaveClass(/is-ipad/);

  const result = await page.evaluate(() => {
    const bottom = document.querySelector('.side-bottom');
    const card = document.querySelector('.cloud-card');
    const icon = document.querySelector('.ipad-cloud-icon');
    const label = document.querySelector('.cloud-label');
    const meta = document.querySelector('.cloud-side-meta');
    const rect = card.getBoundingClientRect();
    return {
      bottomDisplay: getComputedStyle(bottom).display,
      width: rect.width,
      height: rect.height,
      iconDisplay: getComputedStyle(icon).display,
      labelWidth: label.getBoundingClientRect().width,
      metaWidth: meta.getBoundingClientRect().width
    };
  });

  expect(result.bottomDisplay).toBe('flex');
  expect(Math.round(result.width)).toBe(44);
  expect(Math.round(result.height)).toBe(44);
  expect(result.iconDisplay).not.toBe('none');
  expect(result.labelWidth).toBeLessThanOrEqual(1);
  expect(result.metaWidth).toBeLessThanOrEqual(1);
});

test('[D+M] refinamento da nuvem do iPad não altera outros layouts', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'ipad', 'Cobertura do iPad fica no teste dedicado.');

  await page.goto('/#home');
  const iconDisplay = await page.locator('.ipad-cloud-icon').evaluate(el => getComputedStyle(el).display);
  expect(iconDisplay).toBe('none');
});

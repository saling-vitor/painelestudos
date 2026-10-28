import { test, expect } from '@playwright/test';
import { setupPrancha, mapRows, noRuntimeErrors } from './helpers/prancha-mock.mjs';

/* Regressao da Planta do Edital: a medida continua proporcional,
   mas siglas e indicadores jamais podem ser cortados pelo cartao. */
test.use({ storageState: { cookies: [], origins: [] } });

test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]);
});

test('Planta [G] · lotes proporcionais com siglas e indicadores visiveis', async ({ page }) => {
  test.setTimeout(120000); // 4 larguras × 2 medidas: no iPhone WebKit do CI passa de 30 s
  const base = mapRows('porto-alegre')[0];
  const extraMaps = [
    ['CARMONT', 6], ['ARQPROJ', 9], ['INTPUBL', 16], ['CONSFED', 40]
  ].map(([code, topics]) => ({
    ...base,
    id: 'e2e-planta-' + code.toLowerCase(),
    code,
    title: 'Mapa de teste ' + code,
    topics,
    filename: code + '.html',
    storage_path: 'e2e-user/porto-alegre/' + code + '.html'
  }));

  await setupPrancha(page, { extraMaps });
  await page.evaluate(() => window.Prancha.editais.aplicarPadrao('porto-alegre', 'FUNDATEC'));
  await page.evaluate(() => openCourse('porto-alegre'));
  const course = page.locator('.pr[data-prancha="course"]');
  const total = mapRows().length + extraMaps.length;
  await expect(course.locator('.pr-tile')).toHaveCount(total);

  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ['t', 'p']) {
      const switcher = course.locator('.pr-seg[aria-label="Medida da planta"] button[data-arg="' + mode + '"]');
      await switcher.click();
      await expect(switcher).toHaveAttribute('aria-pressed', 'true');

      const audit = await course.locator('.pr-tiles').evaluate((container, measure) => {
        const errors = [];
        const weights = {};
        const tiles = [...container.querySelectorAll('.pr-tile')];
        for (const tile of tiles) {
          const code = tile.querySelector('.sig')?.textContent?.trim() || '?';
          const box = tile.getBoundingClientRect();
          const weight = Number(tile.style.getPropertyValue('--w'));
          const grow = Number(getComputedStyle(tile).flexGrow);
          weights[code] = weight;
          if (!Number.isFinite(weight) || weight <= 0 || Math.abs(grow - weight) > .01) {
            errors.push(code + ': flex-grow deixou de usar o peso do lote');
          }
          for (const cls of ['sig', 'pc', 'tp']) {
            const el = tile.querySelector('.' + cls);
            if (!el || !el.textContent.trim()) {
              errors.push(code + ': falta ' + cls);
              continue;
            }
            const r = el.getBoundingClientRect();
            if (r.top < box.top - 1 || r.bottom > box.bottom + 1 ||
                r.left < box.left - 1 || r.right > box.right + 1) {
              errors.push(code + ': ' + cls + ' fora da area visivel');
            }
            // Anton pode ter scrollHeight maior que clientHeight mesmo sem corte.
            // Validamos a area visivel pelas coordenadas do texto e do lote acima.
          }
          if (measure === 't' && !new RegExp('^[0-9]+/[0-9]+$').test(tile.querySelector('.tp')?.textContent?.trim() || '')) {
            errors.push(code + ': contagem de topicos ausente');
          }
          if (!tile.getAttribute('data-pr-act') || !tile.getAttribute('data-arg')) {
            errors.push(code + ': interacao do lote ausente');
          }
        }
        return { errors, weights, count: tiles.length };
      }, mode);

      expect(audit.errors, 'viewport ' + width + ', medida ' + mode).toEqual([]);
      expect(audit.count).toBe(total);
      if (mode === 't') {
        expect(audit.weights.CARMONT).toBe(6);
        expect(audit.weights.ARQPROJ).toBe(9);
        expect(audit.weights.INTPUBL).toBe(16);
        expect(audit.weights.CONSFED).toBe(40);
      }
    }
  }
});

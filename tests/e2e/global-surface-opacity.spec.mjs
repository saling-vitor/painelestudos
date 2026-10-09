import { test, expect } from '@playwright/test';

/* Regression test: transparent progress surfaces must be opaque on
   desktop, iPad, iPad WebKit and iPhone. No user data is required. */
test('Superfícies opacas [G] [T+M] · Ritmo, planejamento, Agenda e Progresso', async ({ page }) => {
  await page.goto('/#home');
  const result = await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:960px;pointer-events:none;';
    host.innerHTML = `
      <section data-view="progress">
        <div class="progress-insights"><div class="progress-insights-grid">
          <article class="progress-insight-card is-primary"><span>Mapa</span></article>
        </div></div>
        <div class="intelligence-primary-actions"><article>Atenção</article></div>
        <div class="study-rhythm-kpis"><article>Semana</article></div>
        <details class="study-rhythm-details"><summary>Distribuição</summary>
          <div class="study-rhythm-distribution"><div>Mapas</div></div>
        </details>
        <div class="study-doubt-inbox is-empty">Sem dúvidas</div>
      </section>
      <section data-view="home">
        <div class="study-command-card">Planejamento em dia</div>
        <div class="study-command-metrics"><button>Curso</button></div>
      </section>
      <section data-view="agenda"><div class="study-agenda-modes">Dia Semana Mês</div></section>
    `;
    document.body.appendChild(host);
    const targets = {
      focus: '.progress-insight-card',
      attention: '.intelligence-primary-actions > article',
      metrics: '.study-rhythm-kpis > article',
      distribution: '.study-rhythm-distribution > div',
      doubts: '.study-doubt-inbox.is-empty',
      planning: '.study-command-card',
      agenda: '.study-agenda-modes'
    };
    const opacity = {};
    for (const [name, selector] of Object.entries(targets)) {
      const value = getComputedStyle(host.querySelector(selector)).backgroundColor;
      const channels = value.match(/^rgba?\(([^)]+)\)$/);
      if (!channels) throw new Error('Cor de fundo inesperada em '+name+': '+value);
      const parts = channels[1].split(',').map(x => Number.parseFloat(x.trim()));
      opacity[name] = parts.length === 4 ? parts[3] : 1;
    }
    host.remove();
    return opacity;
  });
  for (const [surface, opacity] of Object.entries(result)) {
    expect(opacity, surface+' não pode revelar a topografia').toBeGreaterThanOrEqual(0.92);
  }
});

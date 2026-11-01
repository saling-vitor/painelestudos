import { test, expect } from '@playwright/test';

/*
 * Regressão do defeito visto no iPad: HTML importado dentro de reader.html,
 * não somente mapa independente. A fixture é sintética: nenhum dado do
 * usuário, identificador real, nome do concurso ou progresso é incluído.
 */
const example = `<!doctype html>
<html class="no-js" lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="study-short-code" content="IPAD-QA">
<meta name="mindmap-storage-id" content="ipad-layout-synthetic">
<style id="mm-nanquim-reader-theme">
*{box-sizing:border-box}
html,body{margin:0;background:#050505;color:#ece6da}
body{font-family:system-ui}
header,.toolbar-dock,main{padding:0 18px;max-width:100%}
.hero{margin:12px 0 18px;padding:18px;border:1px solid #444;border-radius:16px;overflow:hidden}
.hero-copy{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
.hero-title{font-size:clamp(25px,4.3vw,48px);font-weight:800;line-height:1.12;margin:0;overflow-wrap:anywhere}
.reader-meta{display:flex;gap:6px}
.toolbar{height:52px;display:grid;grid-template-columns:minmax(280px,1fr) auto auto auto auto;gap:9px;align-items:center;border:1px solid #555;border-radius:14px;padding:6px}
.search-wrap{display:flex;align-items:center;min-width:0}
#search{width:100%;height:40px;min-width:0;background:#111;color:white}
.tool-group,.tool-group.actions{display:flex;gap:6px}
.tool-btn,.study-mode-indicator{height:40px;min-width:42px;background:#171717;color:white}
.view-switch.study-only{display:flex}
.search-toggle{display:none}
.mm35-content-divider{display:flex;justify-content:center;width:100%;max-width:100%;overflow:visible}
.mm37-content-strip{display:flex;align-items:center;gap:8px;white-space:nowrap;font:700 15px monospace;letter-spacing:.18em}
.mm37-content-strip>.mm37-rule{display:block;width:65px;height:1px;flex:0 0 65px;background:#999}
.notice.study-overview{width:calc(100% + 38px);max-width:none;margin-right:-38px;box-sizing:border-box}
@media (min-width:700px) and (max-width:1400px){
 html.tablet-toolbar-ui body.mindmap-app>.toolbar-dock>.toolbar{
 display:grid!important;grid-template-columns:minmax(280px,1fr) auto auto auto auto auto!important;
 grid-template-rows:40px!important;gap:6px!important
 }
 html.tablet-toolbar-ui body.mindmap-app>.toolbar-dock>.toolbar>.tool-group.actions{
 grid-column:6!important;grid-row:2!important;width:260px!important;justify-self:end!important;margin-top:30px!important
 }
}
</style>
<style id="mm-ipad-context-v1110">html.mm-ipad-adaptive body.mindmap-app>.toolbar-dock>.toolbar{display:grid!important;grid-template-columns:minmax(280px,1fr) auto auto auto!important}</style>
<style id="mm-ipad-toolbar-row-v4">html.mm-ipad-adaptive body.mindmap-app>.toolbar-dock>.toolbar{height:54px!important;max-height:54px!important;flex-flow:row nowrap!important}.mm-legacy-breakage{position:absolute;left:1700px}</style>
</head>
<body class="mindmap-app">
<script id="mm-ipad-context-v1110-js">document.documentElement.classList.add('mm-ipad-adaptive')</script>
<header><section class="hero reader-header"><div class="hero-copy">
<h1 class="hero-title">Título de demonstração comprido para testar quebra e largura disponível do iPad no leitor do aplicativo</h1>
<div class="reader-meta" hidden><span hidden></span><span hidden></span><span hidden></span></div>
</div></section></header>
<div class="toolbar-dock"><div class="toolbar" role="toolbar">
<button id="searchToggle" class="tool-btn search-toggle">Busca</button>
<div class="search-wrap"><input id="search" placeholder="Buscar artigo, prazo, conceito…"><span class="search-nav"><span id="searchCount">0 ocorrências</span><button id="searchPrev">↑</button><button id="searchNext">↓</button></span></div>
<div class="tool-group"><button id="expandBtn">Expandir</button><button id="collapseBtn">Recolher</button></div>
<div class="view-switch study-only"><button class="study-mode-indicator">Estudo</button></div>
<div class="tool-group actions"><button class="tool-btn" id="highBtn">☆<span class="label-long">Destaques</span></button><button class="tool-btn" id="reviewBtn">◎<span class="label-long">Revisão</span></button><button class="tool-btn" id="v133HubBtn">▤<span class="label-long">Caderno</span></button><button class="tool-btn" id="clearBtn">☰<span class="label-long">Mais</span></button></div>
</div></div>
<main style="min-height:1700px">
<div class="mm35-content-divider"><span aria-hidden="true" class="mm37-content-strip"><span class="mm37-rule"></span><span>CONSTITUIÇÃO ESTADUAL DE SC — MEIO AMBIENTE E SANEAMENTO · LEITURA / REVISÃO / QUESTÕES</span><span class="mm37-rule"></span></span></div>
<div class="notice study-overview"><strong>VISÃO DE ESTUDO</strong><span>6 ramos · 22 tópicos · revisão e progresso integrados.</span></div>
<h2>Tópicos de teste</h2><p>Texto de validação sem conteúdo de concurso.</p></main>
<script>document.documentElement.classList.add('tablet-toolbar-ui','mm49-ipad-natural-flow','mm-ipad-adaptive');</script>
</body></html>`;

test('Mapa importado: iframe real mantém título e TODOS os controles dentro do iPad [T+M]', async ({ page }) => {
  await page.route('**/__ipad_reader_qa.html', route => route.fulfill({
    status: 200, contentType:'text/html; charset=utf-8', body:example
  }));
  await page.goto('/offline.html', {waitUntil:'domcontentloaded'});
  for (const width of [744, 820, 834, 1024, 1366]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}#readerQaFrame{display:block;width:100%;height:100%;max-width:100%;min-width:0;border:0}</style></head><body><iframe id="readerQaFrame" name="readerQaFrame" src="/reader.html?mode=local&href=__ipad_reader_qa.html&map=IPAD-QA"></iframe></body></html>');
    const reader = page.frameLocator('#readerQaFrame');
    await expect(reader.locator('body.mindmap-app .toolbar')).toBeVisible({timeout:15000});
    const result = await reader.locator('body').evaluate(() => {
      const toolbar=document.querySelector('.toolbar').getBoundingClientRect();
      const title=document.querySelector('.hero-title').getBoundingClientRect();
      const nav=[...document.querySelectorAll('#search,#searchCount,#searchPrev,#searchNext,.view-switch.study-only,.tool-group:not(.actions) button,#highBtn,#reviewBtn,#v133HubBtn,#clearBtn')];
      const out=nav.filter(e=>{
        const r=e.getBoundingClientRect();
        return e.getClientRects().length &&
          (r.right>toolbar.right+2 || r.left<toolbar.left-2 ||
           r.top<toolbar.top-2 || r.bottom>toolbar.bottom+2)
      }).map(e=>({id:e.id||e.className,box:e.getBoundingClientRect().toJSON()}));
      return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,
        toolbarHeight:toolbar.height,titleRight:title.right, toolbarRight:toolbar.right,out,
        bodyWidth:document.body.scrollWidth,
        strip:document.querySelector('.mm37-content-strip').getBoundingClientRect().toJSON(),
        overview:document.querySelector('.notice.study-overview').getBoundingClientRect().toJSON(),
        addon:!!document.getElementById('mm-ipad-toolbar-row-v4'),
        canonicalCount:document.querySelectorAll('#mm-ipad-toolbar-row-v4').length,
        universal:document.querySelectorAll('#mm-reader-fluid-global').length,
        universalEnabled:document.documentElement.classList.contains('mm-reader-fluid'),
        staleRule:!!document.querySelector('#mm-ipad-toolbar-row-v4')?.textContent.includes('.mm-legacy-breakage')};
    });
    const outer=await page.locator('#readerQaFrame').evaluate(e=>({right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}));
    expect(result.addon,JSON.stringify(result)).toBe(true);
    expect(result.canonicalCount,JSON.stringify(result)).toBe(1);
    expect(result.universal,JSON.stringify(result)).toBe(1);
    expect(result.universalEnabled,JSON.stringify(result)).toBe(true);
    expect(result.staleRule,JSON.stringify(result)).toBe(false);
    expect(result.documentWidth,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
    expect(result.bodyWidth,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
    expect(result.strip.left,JSON.stringify(result)).toBeGreaterThanOrEqual(-2);
    expect(result.strip.right,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
    expect(result.overview.right,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
    expect(result.titleRight,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
    expect(result.toolbarRight,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
    expect(result.out,JSON.stringify(result)).toEqual([]);
    expect(result.toolbarHeight,JSON.stringify(result)).toBeLessThanOrEqual(180);
    expect(outer.width).toBeLessThanOrEqual(width+2);
    expect(outer.right).toBeLessThanOrEqual(width+2);
    // O leitor modifica a toolbar ao rolar: repetir a verificação nesse estado.
    await reader.locator('body').evaluate(()=>scrollTo(0,650));
    await page.waitForTimeout(200);
    const after=await reader.locator('body').evaluate(()=>{
      const a=document.querySelector('.toolbar').getBoundingClientRect();
      return [...document.querySelectorAll('.tool-group button')]
        .filter(e=>e.getClientRects().length)
        .every(e=>{const r=e.getBoundingClientRect();return r.right<=a.right+2&&r.bottom<=a.bottom+2&&r.top>=a.top-2;});
    });
    expect(after,'botões não podem escapar ao rolar').toBe(true);
  }
});

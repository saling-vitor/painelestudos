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
<style>
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
@media (min-width:700px) and (max-width:1400px){
 html.tablet-toolbar-ui body.mindmap-app>.toolbar-dock>.toolbar{
 display:grid!important;grid-template-columns:minmax(280px,1fr) auto auto auto auto auto!important;
 grid-template-rows:40px!important;gap:6px!important
 }
 html.tablet-toolbar-ui body.mindmap-app>.toolbar-dock>.toolbar>.tool-group.actions{
 grid-column:6!important;grid-row:2!important;width:260px!important;justify-self:end!important;margin-top:30px!important
 }
}
</style></head>
<body class="mindmap-app">
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
<main><h2>Tópicos de teste</h2><p>Texto de validação sem conteúdo de concurso.</p></main>
<script>document.documentElement.classList.add('tablet-toolbar-ui','mm49-ipad-natural-flow','mm-ipad-adaptive');</script>
</body></html>`;

test('ANAREG importado: reader.html mantém título e barra dentro da tela iPad [T+M]', async ({ page }) => {
  await page.route('**/__ipad_reader_qa.html', route => route.fulfill({
    status: 200, contentType:'text/html; charset=utf-8', body:example
  }));
  for (const width of [744, 820, 834, 1024, 1366]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('/reader.html?mode=local&href=__ipad_reader_qa.html&map=IPAD-QA', {waitUntil:'domcontentloaded'});
    await expect(page.locator('body.mindmap-app .toolbar')).toBeVisible({timeout:12000});
    const result = await page.evaluate(() => {
      const toolbar=document.querySelector('.toolbar').getBoundingClientRect();
      const title=document.querySelector('.hero-title').getBoundingClientRect();
      const nav=[...document.querySelectorAll('#search,#searchCount,#searchPrev,#searchNext,.view-switch.study-only,#highBtn,#reviewBtn,#v133HubBtn,#clearBtn')];
      const out=nav.filter(e=>{
        const r=e.getBoundingClientRect();
        return e.getClientRects().length&&
          (r.right>toolbar.right+2||r.left<toolbar.left-2||
           r.top<toolbar.top-2||r.bottom>toolbar.bottom+2)
      }).map(e=>({id:e.id||e.className,box:e.getBoundingClientRect().toJSON()}));
      return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,
        toolbarHeight:toolbar.height,titleRight:title.right, toolbarRight:toolbar.right,out,
        addon:!!document.getElementById('mm-ipad-toolbar-row-v4')};
    });
    expect(result.addon,JSON.stringify(result)).toBe(true);
    expect(result.documentWidth,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
    expect(result.titleRight,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
    expect(result.toolbarRight,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
    expect(result.out,JSON.stringify(result)).toEqual([]);
    expect(result.toolbarHeight,JSON.stringify(result)).toBeLessThanOrEqual(60);
  }
});

import { test, expect } from '@playwright/test';

/* Applies to all HTML maps, not a single course or sigla. Fixtures exercise
   legacy generic HTML, future/other template markup and the V211 shell. */
const fixtures={
  legacy:`<!doctype html><html lang="pt-BR"><head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>*{box-sizing:content-box}html,body{margin:0;background:#050505;color:white}
  body{font-family:system-ui}
  header{width:1300px;padding:18px}
  h1{white-space:nowrap!important;font-size:27px}
  .legacy-content-divider{max-width:none;width:100%;padding:6px}
  .legacy-content-strip{display:flex;gap:8px;white-space:nowrap;min-width:1100px}
  .legacy-content-strip .legacy-rule{width:140px;flex:0 0 140px;height:1px;background:white}
  .study-summary{width:calc(100% + 75px);max-width:none;margin-left:15px;background:#222;padding:14px}
  pre{width:1600px;overflow:visible;white-space:pre}
  </style></head><body class="my-old-study-map">
  <header><h1>Mapa antigo de estudo com identificação extremamente comprida para verificar quebra de linha em qualquer banca e concurso</h1></header>
  <main><div class="legacy-content-divider">
  <div class="legacy-content-strip"><span class="legacy-rule"></span><span>MAPA ANTIGO · TEORIA COMPLETA · REVISÃO · QUESTÕES · REFERÊNCIAS OFICIAIS</span><span class="legacy-rule"></span></div></div>
  <section class="study-summary"><strong>Resumo do estudo</strong> 100% do conteúdo preservado</section>
  <pre>Codigo_com_uma_linha_extremamente_longa_sem_espacos_que_deve_rolar_no_proprio_bloco_e_nao_empurrar_a_pagina_para_fora_da_tela_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</pre>
  </main></body></html>`,
  modern:`<!doctype html><html lang="pt-BR"><head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>html,body{margin:0;color:#eee;background:#000}body.mindmap-app{padding:14px}
  .reader-header-shell{min-width:1150px}
  .hero-title{font-size:32px;white-space:nowrap!important}
  .toolbar-dock{max-width:none}.toolbar{height:54px;display:grid;grid-template-columns:minmax(600px,1fr) auto;gap:9px}
  .search-wrap{min-width:700px}.tool-group.actions{width:350px;grid-column:3;position:relative}
  .mm35-content-divider{min-width:1300px}
  .mm37-content-strip{display:flex;gap:8px;white-space:nowrap}
  .mm37-content-strip>.mm37-rule{min-width:120px;height:1px;background:white}
  .notice.study-overview{width:calc(100% + 50px);margin-left:20px}
  </style></head><body class="mindmap-app">
  <header class="reader-header-shell"><section class="hero reader-header"><div class="hero-copy">
  <h1 class="hero-title">Mapa novo de estudo para qualquer concurso, disciplina ou versão de template</h1>
  </div></section></header>
  <div class="toolbar-dock"><div class="toolbar"><div class="search-wrap"><input id="search" aria-label="Busca" /></div>
  <div class="tool-group actions"><button id="highBtn">Destaques</button><button id="reviewBtn">Revisão</button></div></div></div>
  <main><div class="mm35-content-divider"><span class="mm37-content-strip"><span class="mm37-rule"></span><span>LEITURA E REVISÃO DO MAPA INTEGRAL</span><span class="mm37-rule"></span></span></div>
  <div class="notice study-overview">Resumo de estudo contínuo.</div>
  </main></body></html>`
};

test('Leitor universal mantém todos os mapas dentro da largura útil [T+M]', async ({ page })=>{
  await page.route('**/__map_global_fixture.html*', route=>{
    const mode=new URL(route.request().url()).searchParams.get('fixture');
    return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:fixtures[mode]||fixtures.legacy});
  });
  await page.goto('/offline.html',{waitUntil:'domcontentloaded'});
  for(const fixture of ['legacy','modern']){
    for(const width of [390,600,744,820,1024,1366]){
      await page.setViewportSize({width,height:1050});
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%}iframe{width:100%;height:100%;border:0;display:block;min-width:0}</style></head><body><iframe id="map" src="/reader.html?mode=local&href=__map_global_fixture.html%3Ffixture%3D${fixture}&map=QA"></iframe></body></html>`);
      const f=page.frameLocator('#map');
      await expect(f.locator('html.mm-reader-fluid'),fixture+' '+width).toHaveCount(1,{timeout:15000});
      const result=await f.locator('body').evaluate(()=>{
        const box=selector=>{
          const e=document.querySelector(selector);const r=e?.getBoundingClientRect();
          return r?{left:r.left,right:r.right,width:r.width}:null;
        };
        const selectors=['header','main','h1','.legacy-content-strip','.mm37-content-strip','.study-summary','.study-overview','.toolbar','.search-wrap','.tool-group.actions'];
        return {width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,
          globalStyles:document.querySelectorAll('#mm-reader-fluid-global').length,
          boxes:Object.fromEntries(selectors.map(s=>[s,box(s)])),
          codeScrollable:!!document.querySelector('pre')&&getComputedStyle(document.querySelector('pre')).overflowX==='auto'&&document.querySelector('pre').getBoundingClientRect().right<=innerWidth+2};
      });
      expect(result.globalStyles,JSON.stringify(result)).toBe(1);
      expect(result.scroll,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
      expect(result.body,JSON.stringify(result)).toBeLessThanOrEqual(width+2);
      for(const [sel,r] of Object.entries(result.boxes)){
        if(!r)continue;
        expect(r.left,fixture+' '+width+' '+sel).toBeGreaterThanOrEqual(-2);
        expect(r.right,fixture+' '+width+' '+sel).toBeLessThanOrEqual(width+2);
      }
      if(fixture==='legacy')expect(result.codeScrollable).toBe(true);
    }
  }
});

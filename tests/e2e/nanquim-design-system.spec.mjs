import { test, expect } from '@playwright/test';

/* Contrato visual canônico V15.48.174-G.
   Testes intencionalmente independentes de login e dados privados. */
test('Nanquim e Latão [G] mantém tokens e tipografia responsiva',async({page})=>{
  await page.goto('/#home');
  await expect(page.locator('link[href*="design-system-nanquim-v15-48-174.css"]')).toHaveCount(1);
  const data=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement);
    const search=document.querySelector('#globalSearch');
    return {
      nanquim:root.getPropertyValue('--nq-nanquim').trim(),
      grafite:root.getPropertyValue('--nq-grafite-1').trim(),
      latao:root.getPropertyValue('--nq-latao').trim(),
      fonte:root.getPropertyValue('--nq-sans').trim(),
      body:root.getPropertyValue('--fs-body').trim(),
      input:root.getPropertyValue('--fs-input').trim(),
      searchSize:parseFloat(getComputedStyle(search).fontSize),
      width:innerWidth,
      cssReady:!![...document.styleSheets].find(s=>s.href?.includes('design-system-nanquim-v15-48-174.css'))
    };
  });
  expect(data.cssReady).toBe(true);
  expect(data.nanquim).toBe('#000000');
  expect(data.grafite).toBe('#0a0a09');
  expect(data.latao).toBe('#c3aa84');
  expect(data.fonte).toContain('Inter');
  if(data.width<=1180)expect(data.searchSize).toBeGreaterThanOrEqual(16);
  else expect(data.searchSize).toBeGreaterThanOrEqual(15);
});

test('Vidro Nanquim [G] apenas flutuantes têm blur e controles internos são foscos',async({page})=>{
  await page.goto('/#home');
  const data=await page.evaluate(()=>{
    const bar=document.querySelector('.topbar'),field=document.querySelector('.topbar .search');
    const root=getComputedStyle(document.documentElement);
    const a=getComputedStyle(bar),b=getComputedStyle(field);
    return {
      barBlur:a.backdropFilter||a.webkitBackdropFilter||'none',
      fieldBlur:b.backdropFilter||b.webkitBackdropFilter||'none',
      pane:root.getPropertyValue('--lg-painel-fundo').trim(),
      micro:root.getPropertyValue('--lg-micro-fundo').trim(),
      readable:root.getPropertyValue('--nq-papel').trim()
    };
  });
  expect(data.pane).toContain('rgba(8,8,7,.74)');
  expect(data.micro).toBe('rgba(0,0,0,.80)');
  expect(data.readable).toBe('#ece6da');
  expect(data.fieldBlur).toBe('none');
  if(await page.evaluate(()=>CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)'))){
    expect(data.barBlur).toContain('blur(');
  }
});

test('Leitor e mapas [G] recebem tema sem reescrever conteúdo',async({page})=>{
  await page.goto('/#home');
  const source=await page.evaluate(async()=>await (await fetch('./reader.html')).text());
  expect(source).toContain('mm-nanquim-reader-theme');
  expect(source).toContain('mmNanquimReaderStyle');
  expect(source).toContain('font-size:16px!important');
  expect(source).toContain('toolbar-dock');
});

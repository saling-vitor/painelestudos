import {test,expect} from '@playwright/test';
test('[G] Interface Lucide — somente PNG transparente, geometria e cores CSS',async({page,request})=>{
  await page.goto('/');
  await expect(page.locator('link[href*="lucide-png-v15-48-172.css"]')).toHaveCount(1);
  for(const name of ['home','courses','maps','simulations','progress','calendar','settings']){
    const icon=page.locator('.ui-icon.icon-'+name).first();
    await expect(icon).toHaveCount(1);
    const result=await icon.evaluate(el=>{
      const cs=getComputedStyle(el);
      return {mask:cs.webkitMaskImage||cs.maskImage,maskSize:cs.webkitMaskSize||cs.maskSize,w:parseFloat(cs.width),h:parseFloat(cs.height)};
    });
    expect(result.mask,'máscara PNG '+name).toContain('/assets/ui-icons/lucide/'+name+'.png');
    expect(result.mask,'não usar SVG embutido').not.toContain('svg+xml');
    expect(result.w,'largura '+name).toBeGreaterThanOrEqual(14);
    expect(result.h,'altura '+name).toBeGreaterThanOrEqual(14);
    expect(result.maskSize,'PNG preserva geometria no CSS sem distorção '+name).toContain('contain');
    const response=await request.get('/assets/ui-icons/lucide/'+name+'.png');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('image/png');
  }
  const css=await request.get('/assets/css/lucide-png-v15-48-172.css');
  expect(css.ok()).toBeTruthy();
  const cssText=await css.text();
  expect(cssText).toContain('--solid-cloud-check');
  expect(cssText).not.toContain('data:image/svg+xml');
  const sw=await request.get('/sw.js');
  expect((await sw.text())).toContain('lucide-png-v15-48-172.css');
});
test('[G] Capas padrão — imagens originais, sem substituir opções personalizadas',async({page,request})=>{
  await page.goto('/');
  const covers=['padrao-simulado.png','padrao-novo-curso.png','padrao-novo-mapa.png'];
  for(const cover of covers){
    const path='/assets/capas/padroes/'+cover;
    const response=await request.get(path);
    expect(response.ok(),'capa '+cover).toBeTruthy();
    expect(response.headers()['content-type']).toContain('image/png');
    const dims=await page.evaluate(async imagePath=>new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});
      image.onerror=()=>reject(new Error('Capa não carregou: '+imagePath));
      image.src=imagePath;
    }),path);
    expect(dims).toEqual({width:1672,height:941});
  }
  const model=await page.evaluate(()=>({
    course:DEFAULT_COURSE_COVER,
    map:DEFAULT_IMPORTED_MAP_COVER,
    standard:simulationCover({board:'FUNDATEC',coverKey:'padrao'}),
    existingAuto:simulationCover({board:'FUNDATEC',coverKey:'auto'}),
    customKey:SIMULATION_COVER_OPTIONS.some(o=>o.key==='padrao')
  }));
  expect(model.course).toContain('/padrao-novo-curso.png');
  expect(model.map).toContain('/padrao-novo-mapa.png');
  expect(model.standard).toContain('/padrao-simulado.png');
  expect(model.existingAuto).toContain('/simulation-fundatec.webp');
  expect(model.customKey).toBeTruthy();
});

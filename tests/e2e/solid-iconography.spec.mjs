import {test,expect} from '@playwright/test';
test('[G] [T+M] iconografia sólida — navegação, estados e cache responsivo',async({page,request})=>{
  await page.goto('/');
  await expect(page.locator('link[href*="solid-lucide-v15-48-159.css"]')).toHaveCount(1);
  for(const name of ['home','courses','maps','simulations','progress','calendar','settings']){
    const icon=page.locator('.ui-icon.icon-'+name).first();
    await expect(icon).toHaveCount(1);
    const value=await icon.evaluate(el=>getComputedStyle(el).webkitMaskImage||getComputedStyle(el).maskImage);
    expect(value,'SVG sólido integrado: '+name).toContain('data:image/svg+xml');
    const size=await icon.evaluate(el=>({w:parseFloat(getComputedStyle(el).width),h:parseFloat(getComputedStyle(el).height)}));
    expect(size.w,'largura '+name).toBeGreaterThan(10);
    expect(size.h,'altura '+name).toBeGreaterThan(10);
  }
  const style=await request.get('/assets/css/solid-lucide-v15-48-159.css');
  expect(style.ok()).toBeTruthy();
  expect(await style.text()).toContain('solid-cloud-check');
  const sw=await request.get('/sw.js');expect((await sw.text())).toContain('solid-lucide-v15-48-159.css');
});

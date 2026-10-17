import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',
  reporter:'line',
  timeout:30000,
  expect:{timeout:5000},
  use:{baseURL:'http://127.0.0.1:4173',
    // As suítes anteriores às pranchas exercitam a interface clássica (studyapp.prancha.off),
    // que continua disponível em Configurações. A interface em pranchas é coberta por prancha.spec.mjs,
    // que limpa este estado.
    storageState:{cookies:[],origins:[{origin:'http://127.0.0.1:4173',localStorage:[{name:'studyapp.prancha.off',value:'1'}]}]},
    trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure'},
  webServer:{command:'python3 -m http.server 4173 --bind 127.0.0.1',port:4173,reuseExistingServer:false},
  projects:[
    // V15.51: auditoria multiplataforma da interface ATUAL (pranchas) e da clássica — 16 viewports D/T/M,
    // estados vazios, XSS e PWA offline. Roda só neste projeto (as demais suítes a ignoram).
    {name:'auditoria-plataformas',testMatch:/(auditoria-plataformas|acessibilidade-pranchas)\.spec\.mjs/,timeout:240000,use:{...devices['Desktop Chrome']}},
    {name:'desktop-chromium',testIgnore:/auditoria-plataformas|acessibilidade-pranchas/,grepInvert:/\[(?:T|M)\]/i,retries:1,use:{...devices['Desktop Chrome']}},
    {name:'ipad',testIgnore:/auditoria-plataformas|acessibilidade-pranchas/,grepInvert:/\[(?:D|M)\]/i,use:{...devices['iPad Pro 11'],browserName:'chromium'}},
    {
      name:'ipad-webkit',
      testIgnore:/auditoria-plataformas|acessibilidade-pranchas/,
      grep:/\[T\+M\]|Dock iPad \[T\]|Smoked Liquid Glass das capas/i,
      use:{...devices['iPad Pro 11'],browserName:'webkit',serviceWorkers:'block'}
    },
    {
      name:'iphone-webkit',
      testIgnore:/auditoria-plataformas|acessibilidade-pranchas/,
      grep:/(?:\[G\]|\[M\]|\[T\+M\]|smartphone|iPhone real|agenda de revisão)/i,
      retries:1,
      use:{
        browserName:'webkit',
        viewport:{width:390,height:844},
        screen:{width:390,height:844},
        deviceScaleFactor:3,
        isMobile:true,
        hasTouch:true,
        serviceWorkers:'block',
        userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
      }
    }
  ]
});

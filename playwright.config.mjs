import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',
  reporter:'line',
  timeout:30000,
  expect:{timeout:5000},
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure'},
  webServer:{command:'python3 -m http.server 4173 --bind 127.0.0.1',port:4173,reuseExistingServer:false},
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'ipad',use:{...devices['iPad Pro 11'],browserName:'chromium'}},
    {
      name:'iphone-webkit',
      grep:/(smartphone|iPhone real|agenda de revisão)/i,
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

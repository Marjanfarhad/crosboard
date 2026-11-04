import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./live-checks',
 timeout:60000,
 retries:1,
 workers:1,
 reporter:'github',
 use:{trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'desktop',use:{...devices['Desktop Chrome']}},
  {name:'mobile',use:{...devices['Pixel 5']}}
 ],
 outputDir:'live-check-results'
});

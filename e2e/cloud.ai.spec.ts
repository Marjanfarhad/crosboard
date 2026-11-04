import {test,expect} from '@playwright/test';
test.skip(process.env.VITE_COMMAND_CLOUD_SYNC!=='true','AI UI tested only in cloud mode with mocked provider responses');
async function openAnalyst(page:import('@playwright/test').Page){
 await page.route('**/api/account',route=>route.fulfill({json:{userId:'ai-ui-test'}}));
 await page.route('**/api/workspace',route=>route.fulfill({json:{revision:1,data:{products:[{id:'p',name:'Desk'}],videos:[{id:'v1',title:'One',views:2000,commission:20},{id:'v2',title:'Two',views:1000,commission:2}]}}}));
 await page.route('**/api/ai/status',route=>route.fulfill({json:{enabled:true,model:'gpt-5.4-mini',remaining:9,limit:10}}));
 await page.goto('/');await expect(page.getByText('Command · authenticated cloud workspace',{exact:true})).toBeVisible();const menu=page.getByRole('button',{name:'Open menu',exact:true});if(await menu.isVisible())await menu.click();await page.getByRole('button',{name:'Analyst',exact:true}).click();
}
test('AI generation is opt-in, account-bound and displays a confirmed live result (mock provider)',async({page})=>{
 let calls=0;
 await page.route('**/api/next-recommendation',async route=>{calls++;expect(route.request().headers()['x-command-account']).toBe('ai-ui-test');expect(route.request().postDataJSON()).toEqual({});await route.fulfill({json:{live:true,model:'gpt-5.4-mini',remaining:8,result:{summary:'Change one hook.',evidence:'Two logged results.',hook:'Watch this.',experiment:'Hold the product constant.',caution:'Small sample; no guaranteed sales.',confidence:'low'}}});});
 await openAnalyst(page);await expect(page.getByRole('button',{name:'Generate AI recommendation'})).toBeEnabled();expect(calls).toBe(0);
 await page.getByRole('button',{name:'Generate AI recommendation'}).click();await expect(page.getByRole('article',{name:'Live AI result'})).toContainText('Change one hook.');expect(calls).toBe(1);await expect(page.getByText(/8 of 10 shared trial/)).toBeVisible();
});
test('provider failure is visible and never replaced with a fake success (mock provider)',async({page})=>{
 let calls=0;await page.route('**/api/next-recommendation',route=>{calls++;return route.fulfill({status:503,json:{error:'OpenAI quota or billing limit reached. Check the API account.'}});});
 await openAnalyst(page);await page.getByRole('button',{name:'Generate AI recommendation'}).click();await expect(page.getByRole('alert')).toContainText('OpenAI quota or billing limit reached');await expect(page.getByRole('article',{name:'Live AI result'})).toHaveCount(0);expect(calls).toBe(1);
});

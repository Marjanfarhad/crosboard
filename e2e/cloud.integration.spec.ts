import {test,expect,type Page} from '@playwright/test';
test.skip(process.env.VITE_COMMAND_CLOUD_SYNC!=='true','Cloud mode is tested in its dedicated workflow');
async function nav(page:Page,label:string){const menu=page.getByRole('button',{name:'Open menu',exact:true});if(await menu.isVisible())await menu.click();await page.getByRole('button',{name:label,exact:true}).click();}
test('cloud controls save products/videos/notes/reminders and export after reload (mock API)',async({page})=>{
 let revision=0;let data:Record<string,unknown>={products:[],videos:[],notes:[],reminders:[],preserve:{value:true}};
 await page.route('**/api/account',route=>route.fulfill({json:{userId:'browser-test-account'}}));
 await page.route('**/api/workspace',async route=>{
  if(route.request().method()==='GET'){await route.fulfill({json:{revision,data}});return;}
  const body=route.request().postDataJSON();expect(route.request().headers()['x-command-account']).toBe('browser-test-account');expect(body.revision).toBe(revision);data=body.data;revision++;await route.fulfill({json:{revision}});
 });
 await page.goto('/');await expect(page.getByText('Command · authenticated cloud workspace')).toBeVisible();
 await page.getByRole('button',{name:'Add a product',exact:true}).click();
 await page.getByLabel('Product title',{exact:true}).fill('Desk organizer');await page.getByLabel('Price (USD)').fill('10');
 await page.getByRole('button',{name:'Add to stack',exact:true}).click();await expect(page.getByRole('heading',{name:'Desk organizer'})).toBeVisible();
 await page.getByRole('button',{name:'More options for Desk organizer'}).click();await page.getByLabel('Product title',{exact:true}).fill('Desk');await page.getByRole('button',{name:'Save product changes'}).click();await expect(page.getByRole('heading',{name:'Desk',exact:true})).toBeVisible();
 await nav(page,'Studio');await page.getByLabel('Video title',{exact:true}).fill('Desk demonstration');await page.getByLabel('Product',{exact:true}).selectOption('Desk');await page.getByLabel('views',{exact:true}).fill('2000');await page.getByLabel('commission',{exact:true}).fill('20');await page.getByRole('button',{name:'Save video to cloud'}).click();
 await expect(page.getByText('Desk demonstration',{exact:true})).toBeVisible();await expect(page.getByText(/RPM \$10.00/)).toBeVisible();
 await nav(page,'Creative');await page.getByLabel('Title',{exact:true}).fill('Next hook');await page.getByLabel('Script or notes').fill('A real product demonstration');await page.getByRole('button',{name:'Save idea'}).click();await expect(page.getByText('Next hook',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit idea'}).click();await page.getByLabel('Title',{exact:true}).fill('Updated hook');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByText('Updated hook',{exact:true})).toBeVisible();
 await nav(page,'Reminders');await page.getByLabel('Title',{exact:true}).fill('Check metrics');await page.getByRole('button',{name:'Set 24-hour reminder'}).click();await expect(page.getByText('Check metrics',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Mark logged'}).click();await expect(page.getByText('Marked as logged')).toBeVisible();
 await page.reload();await expect(page.getByText('Command · authenticated cloud workspace')).toBeVisible();await nav(page,'Data');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export video CSV'}).click();expect((await download).suggestedFilename()).toBe('command-videos.csv');
 await expect(page.getByRole('button',{name:/clear|delete|remove/i})).toHaveCount(0);
 expect(data.preserve).toEqual({value:true});expect(data.videos).toHaveLength(1);expect(data.notes).toHaveLength(1);expect(data.reminders).toHaveLength(1);
 await nav(page,'Video Log');await expect(page.getByText('Desk demonstration',{exact:true})).toBeVisible();
});
test('conflict retains the product form and stops further saves (mock API)',async({page})=>{
 await page.route('**/api/account',route=>route.fulfill({json:{userId:'conflict-test'}}));
 await page.route('**/api/workspace',route=>route.request().method()==='GET'?route.fulfill({json:{revision:1,data:{products:[],videos:[]}}}):route.fulfill({status:409,json:{error:'Conflict'}}));
 await page.goto('/');await page.getByRole('button',{name:'Add a product',exact:true}).click();await page.getByLabel('Product title',{exact:true}).fill('Unsaved product');await page.getByRole('button',{name:'Add to stack'}).click();
 await expect(page.getByLabel('Product title',{exact:true})).toHaveValue('Unsaved product');await expect(page.getByRole('button',{name:'Add to stack'})).toBeDisabled();await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Workspace changed or account switched. Reload before editing.');
});

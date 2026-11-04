import {test,expect} from '@playwright/test';
test('official URL reaches real Access login and protects account data',async({page,context})=>{
 await page.goto('https://marjanfarhad.github.io/crosboard/',{waitUntil:'domcontentloaded'});
 await page.waitForURL(url=>url.hostname.endsWith('.cloudflareaccess.com'),{timeout:45000});
 await page.waitForLoadState('domcontentloaded');
 console.log('Public login title:',await page.title());
 console.log('Public login text:',(await page.locator('body').innerText()).slice(0,1800));
 await expect(page.getByText('Log in to Command secure staging',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Cloudflare',exact:true}).or(page.getByRole('button',{name:'Cloudflare',exact:true}))).toBeVisible({timeout:15000});
 await expect(page.locator('body')).not.toContainText('{"error":"Authentication required"}');
 await page.screenshot({path:'live-check-results/access-login-'+test.info().project.name+'.png',fullPage:true});
 for(const path of ['/api/account','/api/workspace']){
  const response=await context.request.get('https://command-app-secure-staging.caring-philodendron.workers.dev'+path,{maxRedirects:0});
  expect([301,302,303,307,308,401,403]).toContain(response.status());
  if(response.status()<400)expect(new URL(response.headers()['location']).hostname.endsWith('.cloudflareaccess.com')).toBeTruthy();
 }
 console.log('PASS: real official site opens Access Cloudflare sign-in; anonymous API data is protected. No email/code submitted.');
});

import {test, expect} from '@playwright/test';
const empty = {settings:null, profile:null, artworks:[], collections:[]};
const endpoint = 'https://htq7wor5.api.sanity.io/**';
async function sample(page: import('@playwright/test').Page) {
  await page.route(endpoint, route => route.fulfill({json: {result:empty}}));
}
test('empty dataset: English home, gallery, keyboard navigation, and focus return', async ({page}) => {
  const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await sample(page);await page.goto('/');
  await expect(page.locator('#home-artwork')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('.hero-figure img')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.getByRole('link',{name:'Explore portfolio'}).click();
  await expect(page.locator('.artwork-grid figure')).toHaveCount(4);
  const first=page.locator('[data-artwork]').first();await first.click();
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('#lightbox-title')).toHaveText('An Open Window');
  await page.keyboard.press('ArrowRight');await expect(page.locator('#lightbox-title')).toHaveText('Quiet Arrangement');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(first).toBeFocused();
  await page.goto('/cv/');await expect(page.locator('#cv-content')).toContainText('CV coming soon');await page.getByRole('link',{name:'Artist Statement',exact:true}).click();await expect(page.locator('#statement-content')).toContainText('This space will become');await page.goto('/about/');await expect(page.locator('#about-content')).toHaveAttribute('aria-busy','false');await expect(page.locator('#contact-links')).toHaveCount(0);await expect(page.getByRole('link',{name:'Contact',exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'Get in touch'})).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('published content: ordering, descriptions, details, and safe rendering', async ({page}) => {
  const art={_id:'real',title:'A published painting',year:'2026',medium:'Oil on canvas',dimensions:'20 × 30',description:'A quiet afternoon.',image:{alt:'Blue painting',asset:{url:'/art/window.svg'}},additionalImages:[{alt:'Painting detail',asset:{url:'/art/light.svg'}}]};
  await page.route(endpoint,async route=>{
    const url=new URL(route.request().url());expect(url.searchParams.get('perspective')).toBe('published');expect(route.request().headers()['authorization']).toBeUndefined();
    await route.fulfill({json:{result:{profile:{name:'Jane Artist',introduction:'<img src=x onerror=alert(1)>',cv:[{category:'exhibition',year:'2026',title:'A real exhibition'}],statement:[{_type:'block',children:[{text:'A published artist statement.'}]}]},settings:{heroArtwork:art,email:'artist@example.com',collections:[{_id:'b',title:'Second first',artworks:[art]},{_id:'a',title:'First second',artworks:[]}]},artworks:[art],collections:[]}}});
  });
  await page.goto('/works/');await expect(page.locator('.wordmark')).toHaveText('Jane Artist');
  await expect(page.locator('.collection-heading h2')).toHaveText(['Second first','First second']);await expect(page.locator('.placeholder-note')).toHaveCount(0);
  await page.locator('[data-artwork]').click();await expect(page.locator('#lightbox-details')).toContainText('Oil on canvas');await expect(page.locator('#lightbox-details')).toContainText('20 × 30 in');await page.getByRole('button',{name:'Detail 1',exact:true}).click();await expect(page.locator('#lightbox-image')).toHaveAttribute('alt','Painting detail');
  await page.goto('/about/');await expect(page.locator('.about-copy h2')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('.about-copy h2 img')).toHaveCount(0);await page.getByRole('link',{name:'CV',exact:true}).click();await expect(page.locator('#cv-content')).toContainText('A real exhibition');await page.getByRole('link',{name:'Artist Statement',exact:true}).click();await expect(page.locator('#statement-content')).toContainText('A published artist statement.');
});
test('network failure is visible and retry recovers',async ({page})=>{
  await page.route(endpoint,r=>r.fulfill({status:503,body:'Service unavailable'}));await page.goto('/');await expect(page.getByRole('status')).toContainText('temporarily unavailable');
  await sample(page);await page.getByRole('button',{name:'Try again'}).click();await expect(page.getByRole('status')).not.toBeVisible();await expect(page.locator('.hero-figure')).toBeVisible();
});
test('mobile menu, artwork dialog, and layout work on a narrow screen',async ({page})=>{
  await page.setViewportSize({width:390,height:844});await sample(page);await page.goto('/');await page.getByRole('button',{name:'Menu'}).click();await expect(page.getByRole('navigation')).toBeVisible();await page.getByRole('link',{name:'Portfolio',exact:false}).first().click();await expect(page.getByRole('navigation')).not.toBeVisible();await page.locator('[data-artwork]').first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Close artwork'}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'/tmp/hong-mobile.png',fullPage:true});
});
test('desktop visual check',async ({page})=>{await page.setViewportSize({width:1440,height:1000});await sample(page);await page.goto('/');await expect(page.locator('.hero-figure img')).toBeVisible();await page.screenshot({path:'/tmp/hong-home.png',fullPage:true});await page.goto('/works/');await expect(page.locator('.artwork-grid figure')).toHaveCount(4);await page.screenshot({path:'/tmp/hong-works.png',fullPage:true});});

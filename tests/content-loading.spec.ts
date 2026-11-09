import {test,expect} from '@playwright/test'
const art={_id:'real',title:'Published painting',year:'2025',medium:'Oil on panel',image:{alt:'Real painting',asset:{url:'/art/window.svg'}}}
const content={settings:{heroArtwork:art,collections:[{_id:'real-series',title:'Published series',artworks:[art]}]},profile:{name:'Hong Yang',introduction:'Published biography',statement:[{_type:'block',children:[{text:'Published statement'}]}],cv:[{category:'education',year:'2020',title:'Published education'}]},artworks:[art],collections:[]}
for(const width of [390,1440])test(`slow content never flashes the sample template at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 let release:(()=>void)|undefined
 await page.route('https://htq7wor5.api.sanity.io/**',async route=>{await new Promise<void>(resolve=>{release=resolve});await route.fulfill({json:{result:content}})})
 const visited:[string,string][]=[['/','Home'],['/works/','Paintings'],['/cv/','CV'],['/artist-statement/','Artist Statement'],['/about/','About']]
 for(const [index,[path,label]] of visited.entries()){
   release=undefined
   if(index===0)await page.goto('/',{waitUntil:'domcontentloaded'})
   else{if(width===390)await page.getByRole('button',{name:'Menu',exact:false}).click();await page.getByRole('navigation').getByRole('link',{name:label,exact:true}).click()}
   await expect(page).toHaveURL(new RegExp(path==='/'?'/$':path+'$'))
   await expect(page.locator('.content-loading')).toHaveText('Loading…')
   await expect(page.locator('.hero-figure,.collection-section,.about-layout,.statement-page,.cv')).toHaveCount(0)
   await expect(page.locator('body')).not.toContainText('An Open Window')
   await expect(page.locator('body')).not.toContainText('This space will become')
   expect(release).toBeDefined();release!()
   await expect(page.locator('.content-loading')).toHaveCount(0)
   await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
 }
})

test('failed content loading does not display the sample artworks or biography',async({page})=>{
 await page.route('https://htq7wor5.api.sanity.io/**',route=>route.fulfill({status:503,body:'Unavailable'}))
 await page.goto('/about/')
 await expect(page.getByRole('status')).toContainText('temporarily unavailable')
 await expect(page.locator('.content-loading,.about-image,.about-copy')).toHaveCount(0)
 await expect(page.locator('body')).not.toContainText('sample collection')
})

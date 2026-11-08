import {test, expect} from '@playwright/test'
import {resolvePreview, type RawDocument} from '../shared/previewContent'
const endpoint='https://htq7wor5.api.sanity.io/**'
const work={_id:'work',title:'Published painting',image:{alt:'Painting',asset:{url:'/art/window.svg'}},dimensions:'24 × 36'}
const collection={_id:'collection',title:'New Series',description:'A real collection introduction.',showDescription:true,artworks:[work]}
const content={settings:{homeImage:{alt:'Homepage image',asset:{url:'/art/light.svg'}},homeCaption:'A new homepage',homeText:'An editable line.\nAnother line.',portfolioLinkLabel:'View paintings',collections:[]},profile:{name:'Hong Yang',introduction:'Updated biography',cv:[{category:'other',year:'2000',title:'Legacy CV'}],statement:[{_type:'block',children:[{text:'Legacy statement'}]}]},portfolio:{collections:[collection]},cvPage:{entries:[{category:'exhibition',year:'2026',title:'New exhibition'}]},statementPage:{body:[{_type:'block',children:[{text:'New artist statement',marks:['strong']}]}]},artworks:[work],collections:[collection]}

test('editor fields control Home, Portfolio, CV, Artist Statement, and About independently',async ({page})=>{
  await page.route(endpoint,r=>r.fulfill({json:{result:content}}))
  await page.goto('/')
  await expect(page.locator('.hero-figure figcaption')).toContainText('A new homepage')
  await expect(page.locator('#home-text')).toHaveText('An editable line.\nAnother line.')
  await expect(page.getByRole('link',{name:'View paintings'})).toBeVisible()
  await page.getByRole('link',{name:'Portfolio',exact:true}).click()
  await expect(page.locator('.collection-heading h2')).toHaveText('New Series')
  await expect(page.locator('.collection-heading')).toContainText('A real collection introduction.')
  await expect(page.locator('.artwork-dimensions')).toHaveText('24 × 36 in')
  await page.getByRole('link',{name:'CV',exact:true}).click()
  await expect(page.locator('#cv-content')).toContainText('New exhibition')
  await expect(page.locator('#cv-content')).not.toContainText('Legacy CV')
  await page.getByRole('link',{name:'Artist Statement',exact:true}).click()
  await expect(page.locator('#statement-content strong')).toHaveText('New artist statement')
  await expect(page.locator('#statement-content')).not.toContainText('Legacy statement')
  await page.getByRole('link',{name:'About',exact:true}).click()
  await expect(page.locator('.about-copy')).toContainText('Updated biography')
  await expect(page.locator('.about-copy')).not.toContainText('New artist statement')
})

test('publishing empty new pages clears old content rather than restoring it',async ({page})=>{
  await page.route(endpoint,r=>r.fulfill({json:{result:{...content,portfolio:{collections:[]},cvPage:{entries:[]},statementPage:{body:[]}}}}))
  await page.goto('/works/');await expect(page.locator('.collection-section')).toHaveCount(0)
  await page.goto('/cv/');await expect(page.locator('#cv-content')).toHaveText('CV coming soon.')
  await page.goto('/artist-statement/');await expect(page.locator('#statement-content')).toHaveText('Artist statement coming soon.')
})

test('draft resolver overlays unsaved values and resolves uploaded image and artwork references',()=>{
  const docs: RawDocument[]=[
    {_id:'image-1',_type:'sanity.imageAsset',url:'https://cdn.sanity.io/images/htq7wor5/production/image-1.jpg'},
    {_id:'art',_type:'artwork',title:'Saved work',image:{asset:{_ref:'image-1'},alt:'Image'}},
    {_id:'series',_type:'collection',title:'A series',artworks:[{_ref:'art'}]},
    {_id:'siteSettings',_type:'siteSettings',heroArtwork:{_ref:'art'}},
    {_id:'portfolioSettings',_type:'portfolioSettings',collections:[{_ref:'series'}]},
  ]
  const preview=resolvePreview(docs,{...docs[1],_id:'drafts.art',title:'Unsaved work'})
  expect(preview.settings?.heroArtwork?.title).toBe('Unsaved work')
  expect(preview.settings?.heroArtwork?.image?.asset?.url).toContain('cdn.sanity.io')
  expect(preview.portfolio?.collections?.[0].artworks[0].title).toBe('Unsaved work')
  expect(docs[1].title).toBe('Saved work')
})

async function previewParent(page: import('@playwright/test').Page, origin: string) {
  await page.context().grantPermissions(['local-network-access'], {origin})
  await page.route(`${origin}/preview-host`,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><script>addEventListener('message',event=>{if(event.data.type==='portfolio:ready')event.source.postMessage({type:'portfolio:preview',channel:'test-channel',content:${JSON.stringify(content)}},'http://127.0.0.1:4322')});</script><iframe title="Preview" src="http://127.0.0.1:4322/?studioPreview=1&previewChannel=test-channel"></iframe>`}))
  await page.goto(`${origin}/preview-host`)
}
test('authenticated Studio preview bridge renders unsaved content without API requests',async ({page})=>{
  let calls=0;await page.route(endpoint,r=>{calls++;return r.abort()})
  await previewParent(page,'http://localhost:3333')
  const frame=page.frameLocator('iframe')
  await expect(frame.locator('#content-status')).toHaveText('Draft preview — not published.')
  await expect(frame.locator('#home-text')).toHaveText('An editable line.\nAnother line.')
  expect(calls).toBe(0)
})
test('an untrusted parent cannot inject draft preview content',async ({page})=>{
  await previewParent(page,'http://localhost:4444')
  const frame=page.frameLocator('iframe')
  await expect(frame.locator('#content-status')).toHaveText('Draft preview — waiting for the editor.')
  await expect(frame.locator('#home-text')).not.toContainText('An editable line.')
})
test('a standalone preview URL still reads only published content',async ({page})=>{
  await page.route(endpoint,r=>{expect(new URL(r.request().url()).searchParams.get('perspective')).toBe('published');return r.fulfill({json:{result:content}})})
  await page.goto('/?studioPreview=1&previewChannel=anything')
  await expect(page.locator('#home-text')).toHaveText('An editable line.\nAnother line.')
  await expect(page.locator('#content-status')).toBeHidden()
})

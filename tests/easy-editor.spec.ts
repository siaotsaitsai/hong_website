import {test,expect} from '@playwright/test'
import {homeDocument,homeForm,validateHome,snapshotFromDocuments} from '../studio/easy/homeGateway'
import {resolvePreview} from '../shared/previewContent'

test.beforeEach(async ({page})=>{await page.route('https://cdn.sanity.io/**',route=>route.fulfill({path:'web/public/art/window.svg',contentType:'image/svg+xml'}))})

test('Home changes preserve unrelated settings and explicit artwork/image modes',()=>{
 const published={_id:'siteSettings',_type:'siteSettings',_rev:'old',siteTitle:'Title',collections:[{_ref:'kept'}],description:'Keep metadata',heroArtwork:{_ref:'old-work'}}
 const form={...homeForm(published),mode:'image' as const,image:{asset:{_ref:'asset'}},imageDescription:'A painting',text:'A new welcome'}
 const doc=homeDocument(form,published)
 expect(doc.collections).toEqual([{_ref:'kept'}]);expect(doc.description).toBe('Keep metadata');expect(doc._rev).toBeUndefined();expect(doc.heroArtwork).toBeUndefined();expect(doc.homeImage).toMatchObject({alt:'A painting'})
 expect(validateHome({...form,imageDescription:''},snapshotFromDocuments([published]))).toContain('describe')
 expect(validateHome({...form,mode:'artwork',artworkId:'draft-only'},snapshotFromDocuments([published]))).toContain('Publish the selected artwork')
 const preview=resolvePreview([{_id:'drafts.siteSettings',_type:'siteSettings',homeText:'Draft'},{_id:'siteSettings',_type:'siteSettings',homeText:'Published'}])
 expect(preview.settings?.homeText).toBe('Draft')
})

test('Home editor keeps typing private, saves separately, and requires a publish confirmation',async ({page})=>{
 await page.goto('http://127.0.0.1:3333/tests/easy/')
 await expect(page.getByRole('heading',{name:'Make it yours.'})).toBeVisible()
 await page.getByRole('textbox',{name:'Your words'}).fill('My updated homepage')
 await expect(page.getByText('Unsaved changes',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>Reflect.get(window,'editorTest').publishes)).toBe(0)
 await page.getByRole('button',{name:'Save draft',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('public website has not changed')
 expect(await page.evaluate(()=>Reflect.get(window,'editorTest').publishes)).toBe(0)
 await page.getByRole('button',{name:'Publish',exact:true}).click()
 await expect(page.getByRole('button',{name:'Yes, publish homepage'})).toBeVisible()
 await page.getByRole('button',{name:'Keep editing'}).click()
 expect(await page.evaluate(()=>Reflect.get(window,'editorTest').publishes)).toBe(0)
 await page.getByRole('button',{name:'Publish',exact:true}).click()
 await page.getByRole('button',{name:'Yes, publish homepage'}).click()
 await expect(page.getByRole('status')).toContainText('Published. Your homepage is updated.')
 expect(await page.evaluate(()=>Reflect.get(window,'editorTest').publishes)).toBe(1)
 await expect(page.frameLocator('iframe').locator('#content-status')).toHaveText('Draft preview — not published.')
 await page.setViewportSize({width:1440,height:1000})
 await page.screenshot({path:'/tmp/hong-easy-editor.png',fullPage:true})
})
test('Home editor uploads an image, requires an image description, and keeps draft input on conflicts',async ({page})=>{
 await page.goto('http://127.0.0.1:3333/tests/easy/?failSave=1')
 await page.getByRole('textbox',{name:'Your words'}).fill('Keep my edits')
 await page.getByRole('radio',{name:'Upload an image',exact:true}).check()
 await page.getByLabel('Upload homepage image').setInputFiles({name:'painting.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')})
 await expect(page.getByRole('img',{name:'Current homepage image'})).toBeVisible()
 await page.getByRole('button',{name:'Publish',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('Please describe the image')
 await page.getByRole('textbox',{name:'Image description'}).fill('A colorful painting')
 await page.getByRole('button',{name:'Save draft',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('Someone else changed this page')
 await expect(page.getByRole('textbox',{name:'Your words'})).toHaveValue('Keep my edits')
 expect(await page.evaluate(()=>Reflect.get(window,'editorTest').publishes)).toBe(0)
})
test('Home editor fits a phone screen',async ({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('http://127.0.0.1:3333/tests/easy/')
 await expect(page.getByRole('textbox',{name:'Your words'})).toHaveValue('Published welcome')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

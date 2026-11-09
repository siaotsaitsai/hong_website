import {test,expect} from '@playwright/test'
import {applyPortfolioAction} from '../shared/portfolioActions'
import type {DocumentModel} from '../studio/easy/pageGateway'
const image={mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')}

test('artwork actions preserve documents, validate visible placements, and leave original order intact',()=>{
 const model:DocumentModel={portfolioSettings:{_id:'portfolioSettings',_type:'portfolioSettings',collections:[{_ref:'series'}]},series:{_id:'series',_type:'collection',artworks:[{_ref:'a',_key:'a'},{_ref:'b',_key:'b'}]},hidden:{_id:'hidden',_type:'collection',artworks:[{_ref:'a'}]},a:{_id:'a',_type:'artwork',title:'A'},b:{_id:'b',_type:'artwork',title:'B'}}
 const moved=applyPortfolioAction(model,{action:'move-artwork',collection:'series',id:'a',index:0,targetIndex:1})
 expect(moved.series.artworks).toEqual([{_ref:'b',_key:'b'},{_ref:'a',_key:'a'}]);expect(model.series.artworks).toEqual([{_ref:'a',_key:'a'},{_ref:'b',_key:'b'}])
 const removed=applyPortfolioAction(moved,{action:'remove-artwork',collection:'series',id:'a',index:1})
 expect(removed.series.artworks).toEqual([{_ref:'b',_key:'b'}]);expect(removed.a).toBe(model.a)
 expect(()=>applyPortfolioAction(model,{action:'remove-artwork',collection:'hidden',id:'a',index:0})).toThrow()
 expect(()=>applyPortfolioAction(model,{action:'remove-artwork',collection:'series',id:'b',index:0})).toThrow()
 expect(()=>applyPortfolioAction(model,{action:'move-artwork',collection:'series',id:'a',index:0,targetIndex:8})).toThrow()
})

test('the actual webpage supports move buttons, drag ordering, cancellation and removal before publishing',async({page})=>{
 await page.route('https://cdn.sanity.io/**',route=>route.fulfill({path:'web/public/art/window.svg',contentType:'image/svg+xml'}))
 await page.setViewportSize({width:1440,height:2400})
 await page.goto('http://127.0.0.1:3333/tests/easy/?section=portfolio&visual=1')
 const frame=page.frameLocator('iframe')
 await page.getByRole('button',{name:'Add collection',exact:true}).click()
 await expect(frame.getByRole('button',{name:'Add artwork',exact:true})).toBeVisible()
 const chooser=page.waitForEvent('filechooser');await frame.getByRole('button',{name:'Add artwork',exact:true}).click();await(await chooser).setFiles(['A','B','C'].map(name=>({...image,name:name+'.png'})))
 const titles=frame.getByRole('textbox',{name:'Artwork title',exact:true});await expect(titles).toHaveText(['A','B','C'])
 await frame.getByRole('button',{name:'Move up: C',exact:true}).click();await expect(titles).toHaveText(['A','C','B']);await expect(frame.locator('#on-page-action-status')).toContainText('Artwork updated')
 await frame.getByRole('button',{name:'Drag A to reorder',exact:true}).dragTo(frame.locator('figure[data-edit-work-id]').last())
 await expect(titles).toHaveText(['C','B','A'])
 await frame.getByRole('button',{name:'Remove artwork: B',exact:true}).click();await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('button',{name:'Keep artwork',exact:true}).click();await expect(titles).toHaveText(['C','B','A'])
 await frame.getByRole('button',{name:'Remove artwork: B',exact:true}).click();await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('alertdialog').getByRole('button',{name:'Remove artwork',exact:true}).click();await expect(titles).toHaveText(['C','A'])
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved')
 await expect(frame.getByRole('button',{name:'Move up: C',exact:true})).toBeDisabled();await expect(frame.getByRole('button',{name:'Move down: A',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Publish',exact:true}).click();await page.getByRole('button',{name:'Yes, publish Paintings',exact:true}).click();await expect(page.getByRole('status')).toContainText('Paintings published');await expect(titles).toHaveText(['C','A'])
 await page.getByRole('button',{name:'Use forms',exact:true}).click();await expect(page.getByRole('option',{name:'B',exact:true})).toHaveCount(1)
})


test('old or unresponsive editor controllers produce a visible reload instruction instead of dead controls',async({page})=>{
 await page.addInitScript(()=>{window.addEventListener('message',event=>{if(Reflect.get(window,'testIgnoreActions')&&event.data?.type==='portfolio:action')event.stopImmediatePropagation();if(Reflect.get(window,'testLegacyController')&&event.data?.type==='portfolio:preview')delete event.data.capabilities})})
 await page.route('https://cdn.sanity.io/**',route=>route.fulfill({path:'web/public/art/window.svg',contentType:'image/svg+xml'}))
 await page.goto('http://127.0.0.1:3333/tests/easy/?section=portfolio&visual=1')
 const frame=page.frameLocator('iframe')
 await page.getByRole('button',{name:'Add collection',exact:true}).click()
 await expect(frame.getByRole('button',{name:'Add artwork',exact:true})).toBeVisible()
 const chooser=page.waitForEvent('filechooser');await frame.getByRole('button',{name:'Add artwork',exact:true}).click();await(await chooser).setFiles(['A','B'].map(name=>({...image,name:name+'.png'})))
 await expect(frame.getByRole('textbox',{name:'Artwork title',exact:true})).toHaveText(['A','B'])
 // Emulate an older controller that ignores the new action message.
 await page.evaluate(()=>Reflect.set(window,'testIgnoreActions',true))
 await frame.getByRole('button',{name:'Move down: A',exact:true}).click()
 await expect(frame.locator('#on-page-action-status')).toContainText('did not respond',{timeout:8000})
 await expect(frame.getByRole('textbox',{name:'Artwork title',exact:true})).toHaveText(['A','B'])
 const child=page.frames().find(frame=>frame.url().startsWith('http://127.0.0.1:4322'))!
 await child.evaluate(()=>Reflect.set(window,'testLegacyController',true))
 await page.getByRole('button',{name:'Use forms',exact:true}).click();await page.getByRole('button',{name:'Edit on page',exact:true}).click()
 await expect(frame.locator('#on-page-action-status')).toContainText('Editor update required')
 await expect(frame.locator('.on-page-artwork-actions')).toHaveCount(0)
})

test('moving and dragging keep focused text edits without losing the button gesture',async({page})=>{
 await page.setViewportSize({width:1440,height:2400})
 await page.route('https://cdn.sanity.io/**',route=>route.fulfill({path:'web/public/art/window.svg',contentType:'image/svg+xml'}))
 await page.goto('http://127.0.0.1:3333/tests/easy/?section=portfolio&visual=1')
 const frame=page.frameLocator('iframe')
 await page.getByRole('button',{name:'Add collection',exact:true}).click()
 await expect(frame.getByRole('button',{name:'Add artwork',exact:true})).toBeVisible()
 const chooser=page.waitForEvent('filechooser');await frame.getByRole('button',{name:'Add artwork',exact:true}).click();await(await chooser).setFiles(['A','B'].map(name=>({...image,name:name+'.png'})))
 const titles=frame.getByRole('textbox',{name:'Artwork title',exact:true});await expect(titles).toHaveText(['A','B'])
 await titles.first().fill('A revised')
 await frame.getByRole('button',{name:'Move down: A',exact:true}).click({delay:150})
 await expect(titles).toHaveText(['B','A revised'])
 await titles.first().fill('B revised')
 await frame.getByRole('button',{name:'Drag B to reorder',exact:true}).dragTo(frame.locator('figure[data-edit-work-id]').last())
 await expect(titles).toHaveText(['A revised','B revised'])
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved')
})

test('touch controls reorder and remove artworks without browser-native dialogs',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})
 const page=await context.newPage()
 try{
   await page.route('https://cdn.sanity.io/**',route=>route.fulfill({path:'web/public/art/window.svg',contentType:'image/svg+xml'}))
   await page.goto('http://127.0.0.1:3333/tests/easy/?section=portfolio&visual=1')
   const frame=page.frameLocator('iframe')
   await page.getByRole('button',{name:'Add collection',exact:true}).tap()
   await expect(frame.getByRole('button',{name:'Add artwork',exact:true})).toBeVisible()
   const chooser=page.waitForEvent('filechooser');await frame.getByRole('button',{name:'Add artwork',exact:true}).tap();await(await chooser).setFiles(['A','B'].map(name=>({...image,name:name+'.png'})))
   const titles=frame.getByRole('textbox',{name:'Artwork title',exact:true});await expect(titles).toHaveText(['A','B'])
   await titles.first().fill('A revised')
   await frame.getByRole('button',{name:'Move down: A',exact:true}).tap();await expect(titles).toHaveText(['B','A revised'])
   await frame.getByRole('button',{name:'Remove artwork: A revised',exact:true}).tap()
   await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('alertdialog').getByRole('button',{name:'Remove artwork',exact:true}).tap();await expect(titles).toHaveText(['B'])
 }finally{await context.close()}
})

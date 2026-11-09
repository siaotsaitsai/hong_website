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
 await frame.getByRole('button',{name:'Move up: C',exact:true}).click();await expect(titles).toHaveText(['A','C','B'])
 await frame.getByRole('button',{name:'Drag A to reorder',exact:true}).dragTo(frame.locator('figure[data-edit-work-id]').last())
 await expect(titles).toHaveText(['C','B','A'])
 {const waiting=page.waitForEvent('dialog');const click=frame.getByRole('button',{name:'Remove artwork: B',exact:true}).click();await(await waiting).dismiss();await click;}await expect(titles).toHaveText(['C','B','A'])
 {const waiting=page.waitForEvent('dialog');const click=frame.getByRole('button',{name:'Remove artwork: B',exact:true}).click();await(await waiting).accept();await click;}await expect(titles).toHaveText(['C','A'])
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved')
 await expect(frame.getByRole('button',{name:'Move up: C',exact:true})).toBeDisabled();await expect(frame.getByRole('button',{name:'Move down: A',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Publish',exact:true}).click();await page.getByRole('button',{name:'Yes, publish Portfolio',exact:true}).click();await expect(page.getByRole('status')).toContainText('Portfolio published');await expect(titles).toHaveText(['C','A'])
 await page.getByRole('button',{name:'Use forms',exact:true}).click();await expect(page.getByRole('option',{name:'B',exact:true})).toHaveCount(1)
})

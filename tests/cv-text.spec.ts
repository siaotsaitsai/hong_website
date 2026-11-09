import {test,expect} from '@playwright/test'
import {cvEntriesToText} from '../shared/cvText'
import {pageSnapshot,validatePage} from '../studio/easy/pageGateway'
import {applyInlineEdits} from '../shared/inlineEdits'

test('CV text conversion preserves entry order and text, and accepts an intentionally empty text CV',()=>{
 const entries=[{category:'education',year:'2020',title:'Art School'},{category:'exhibition',year:'2026',title:'A show'}]
 expect(cvEntriesToText(entries).map(block=>block.children?.[0].text)).toEqual(['Education','2020 — Art School','Exhibition','2026 — A show'])
 const snapshot=pageSnapshot('cv',[{_id:'cvPage',_type:'cvPage',entries}])
 const model=applyInlineEdits(snapshot.model,[{id:'cvPage',field:'body',value:[]}],'cv')
 expect(model.cvPage.entries).toEqual(entries);expect(validatePage({...snapshot,model})).toBe(null)
})

test('CV has the same rich-text controls as Statement and supports preview, draft, inline edits, and empty publication',async({page})=>{
 await page.goto('http://127.0.0.1:3333/tests/easy/?section=cv')
 const editor=page.getByRole('textbox',{name:'CV text',exact:true})
 await expect(editor).toBeVisible();await editor.fill('2026 — An exhibition in New York')
 await editor.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range)})
 await page.getByRole('button',{name:'Bold',exact:true}).click()
 const frame=page.frameLocator('iframe')
 await expect(frame.locator('#cv-content strong')).toHaveText('2026 — An exhibition in New York')
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved')
 await page.getByRole('button',{name:'Edit on page',exact:true}).click()
 const inline=frame.getByRole('textbox',{name:'CV text',exact:true});await inline.fill('Revised CV')
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved')
 await expect(inline).toHaveText('Revised CV')
 await inline.fill('')
 await page.getByRole('button',{name:'Publish',exact:true}).click();await page.getByRole('button',{name:'Yes, publish CV',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('CV published')
 await expect(frame.locator('#cv-content')).not.toContainText('Revised CV')
 await expect(frame.getByRole('button',{name:'Add experience',exact:true})).toHaveCount(0)
})

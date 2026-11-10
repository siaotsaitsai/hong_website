import {test,expect} from '@playwright/test'
import {instagramHref,emailHref} from '../shared/aboutContacts'

test('contact targets accept Instagram handles and prevent unrelated or injected destinations',()=>{
 expect(instagramHref('@yang_hong90')).toBe('https://www.instagram.com/yang_hong90/')
 expect(instagramHref('https://instagram.com/yang_hong90/?igsh=tracking')).toBe('https://www.instagram.com/yang_hong90/')
 for(const input of ['javascript:alert(1)','https://instagram.com.evil.test/name','https://evil.test/name','https://www.instagram.com/a/b/'])expect(instagramHref(input)).toBeNull()
 expect(emailHref('artist@example.com')).toBe('mailto:artist@example.com')
 expect(emailHref('artist+studio@example.com')).toBe('mailto:artist%2Bstudio@example.com')
 expect(emailHref('artist@example.com\r\nBcc:other@example.com')).toBeNull()
})

test('About displays Instagram and mail links with explicit icon sizes, without adding a Contact page',async({page})=>{
 await page.route('https://htq7wor5.api.sanity.io/**',route=>route.fulfill({json:{result:{settings:null,profile:{name:'Hong Yang',introduction:'An artist biography.',instagram:'@yang_hong90',email:'artist@example.com'},artworks:[],collections:[]}}}))
 await page.goto('/about/')
 const contacts=page.locator('.about-contacts')
 await expect(contacts.getByRole('link',{name:'Instagram',exact:true})).toHaveAttribute('href','https://www.instagram.com/yang_hong90/')
 await expect(contacts.getByRole('link',{name:'Instagram',exact:true})).toHaveAttribute('rel','noopener noreferrer')
 await expect(contacts.getByRole('link',{name:'Email',exact:true})).toHaveAttribute('href','mailto:artist@example.com')
 expect(await contacts.locator('svg').evaluateAll(icons=>icons.every(icon=>icon.getAttribute('width')==='16'&&icon.getAttribute('height')==='16'))).toBe(true)
 await expect(page.getByRole('navigation').getByRole('link',{name:'Contact',exact:true})).toHaveCount(0)
})

test('About contacts are editable with live preview and remain independently publishable',async({page})=>{
 await page.goto('http://127.0.0.1:3333/tests/easy/?section=about')
 await page.getByRole('textbox',{name:'Instagram profile',exact:true}).fill('https://www.instagram.com/new_artist/')
 await page.getByRole('textbox',{name:'Contact email',exact:true}).fill('new@example.com')
 const frame=page.frameLocator('iframe')
 await expect(frame.getByRole('link',{name:'Instagram',exact:true})).toHaveAttribute('href','https://www.instagram.com/new_artist/')
 await expect(frame.getByRole('link',{name:'Email',exact:true})).toHaveAttribute('href','mailto:new@example.com')
 await page.getByRole('button',{name:'Publish',exact:true}).click();await page.getByRole('button',{name:'Yes, publish About',exact:true}).click();await expect(page.getByRole('status')).toContainText('About published')
 await page.getByRole('textbox',{name:'Instagram profile',exact:true}).fill('');await page.getByRole('textbox',{name:'Contact email',exact:true}).fill('')
 await expect(frame.locator('.about-contacts')).toHaveCount(0)
})

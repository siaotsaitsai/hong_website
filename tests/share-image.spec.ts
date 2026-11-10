import {test,expect} from '@playwright/test'
import {selectShareImage} from '../web/src/lib/server/shareImage'

test('share images use the actual homepage image, preserve proportions and return a social-compatible JPEG',()=>{
 const asset={url:'https://cdn.sanity.io/images/htq7wor5/production/home-3000x3800.jpg',metadata:{dimensions:{width:3000,height:3800}}}
 const selected=selectShareImage({home:{homeCaption:'My painting',homeImage:{asset},heroArtwork:{image:{asset:{url:'https://cdn.sanity.io/images/htq7wor5/production/other.jpg'}}}}},'htq7wor5','production')!
 expect(selected.alt).toBe('My painting');expect(selected.width).toBe(1200);expect(selected.height).toBe(1520)
 expect(new URL(selected.url).searchParams.get('fm')).toBe('jpg');expect(selected.url).toContain('/home-3000x3800.jpg')
 expect(selectShareImage({fallback:{image:{asset:{url:'https://example.org/unrelated.jpg'}}}},'htq7wor5','production')).toBeNull()
})

test('link crawlers can read a share image and empty description without JavaScript or Sanity requests',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false})
 try{
   const page=await context.newPage();await page.route('https://htq7wor5.api.sanity.io/**',route=>route.abort())
   await page.goto('http://127.0.0.1:4322/?utm_source=ig&fbclid=example')
   await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',/^https:\/\/hongyang\.art\/social\/homepage-[a-f0-9]+\.jpg$/)
   await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content','image/jpeg')
   await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content','')
   await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content','https://hongyang.art/')
   await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content','Hong Yang')
   const thumbnail=page.locator('body > .share-thumbnail img')
   await expect(thumbnail).toHaveAttribute('src',/^\/social\/homepage-[a-f0-9]+-thumbnail\.jpg$/)
   await expect(page.locator('link[rel="image_src"]')).toHaveAttribute('href',/^https:\/\/hongyang\.art\/social\/.+-thumbnail\.jpg$/)
   const response=await page.request.get((await thumbnail.getAttribute('src'))!)
   expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('image/jpeg')
   const bytes=await response.body();expect(bytes[0]).toBe(0xff);expect(bytes[1]).toBe(0xd8)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{await context.close()}
})

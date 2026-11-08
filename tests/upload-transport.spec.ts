import {test,expect} from '@playwright/test'

test('browser image replacement uses the authenticated Studio bridge instead of bypassing it through XHR',async({page})=>{
 await page.goto('http://127.0.0.1:3333/tests/easy/')
 await page.route('https://htq7wor5.api.sanity.io/**',route=>route.abort())
 const result=await page.evaluate(async()=>{
   const sdkPath='/node_modules/@sanity/client/src/index.ts'
   const {createClient}=await import(sdkPath)
   const helperPath='/studio/easy/uploadImage.ts'
   const {uploadImage}=await import(helperPath)
   const calls:{url:string;method:string;filename:string;type:string;body:string}[]=[]
   const client=createClient({projectId:'htq7wor5',dataset:'production',apiVersion:'2025-02-19',useCdn:false,maxRetries:0,requestHandler:async(options:any)=>{
     calls.push({url:options.url,method:options.method,filename:options.query.filename,type:options.headers['Content-Type'],body:await options.body.text()})
     return {document:{_id:'image-replacement',url:'https://cdn.sanity.io/replacement.png'}}
   }})
   const file=new File(['replacement bytes'],'New painting.png',{type:'image/png'})
   let oldError=''
   try{await client.assets.upload('image',file)}catch(error){oldError=String(error)}
   const bypassed=calls.length===0
   const asset=await uploadImage(client,file)
   return {oldError,bypassed,calls,asset}
 })
 expect(result.oldError).toContain('XHR upload network error')
 expect(result.bypassed).toBe(true)
 expect(result.calls).toEqual([expect.objectContaining({method:'POST',filename:'New painting.png',type:'image/png',body:'replacement bytes'})])
 expect(result.calls[0].url).toContain('/assets/images/production')
 expect(result.asset.reference).toBe('image-replacement')
})

test('both editor gateways send replacement image bytes and preserve API permission errors',async({page})=>{
 await page.goto('http://127.0.0.1:3333/tests/easy/')
 const requests:{name:string|null;body:string|null;contentType:string|undefined}[]=[]
 await page.route('https://htq7wor5.api.sanity.io/**',async route=>{
   const request=route.request();const name=new URL(request.url()).searchParams.get('filename')
   requests.push({name,body:request.postData(),contentType:request.headers()['content-type']})
   await route.fulfill(name==='denied.png'?{status:403,json:{error:{type:'insufficientPermissions',description:'Image upload denied'}}}:{json:{document:{_id:'image-replaced',url:'https://cdn.sanity.io/replaced.png'}}})
 })
 const result=await page.evaluate(async()=>{
   const sdkPath='/node_modules/@sanity/client/src/index.ts';const {createClient}=await import(sdkPath)
   const pagePath='/studio/easy/pageGateway.ts';const {createPageGateway}=await import(pagePath)
   const homePath='/studio/easy/homeGateway.ts';const {createHomeGateway}=await import(homePath)
   const client=createClient({projectId:'htq7wor5',dataset:'production',apiVersion:'2025-02-19',useCdn:false,maxRetries:0})
   const pages=createPageGateway(client),home=createHomeGateway(client)
   const first=await pages.upload(new File(['page replacement'],'page.png',{type:'image/png'}))
   const second=await home.upload(new File(['home replacement'],'home.png',{type:'image/png'}))
   let status=0
   try{await pages.upload(new File(['denied replacement'],'denied.png',{type:'image/png'}))}catch(error:any){status=error.statusCode}
   return {first,second,status}
 })
 expect(result.first.reference).toBe('image-replaced');expect(result.second.reference).toBe('image-replaced');expect(result.status).toBe(403)
 expect(requests).toEqual([
   {name:'page.png',body:'page replacement',contentType:'image/png'},
   {name:'home.png',body:'home replacement',contentType:'image/png'},
   {name:'denied.png',body:'denied replacement',contentType:'image/png'},
 ])
})

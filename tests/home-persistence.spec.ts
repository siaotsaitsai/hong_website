import {test,expect} from '@playwright/test'
import {createServer} from 'node:http'
import {createClient} from '@sanity/client'
import {createHomeGateway} from '../studio/easy/homeGateway'
import type {RawDocument} from '../shared/previewContent'

test('real Sanity client transport saves drafts separately and publishes atomically with revision checks',async()=>{
 const documents=new Map<string,RawDocument>([['siteSettings',{_id:'siteSettings',_type:'siteSettings',_rev:'published-1',siteTitle:'Hong Yang',homeText:'Old public text',description:'Preserved metadata'}]])
 let revision=0
 const server=createServer(async(req,res)=>{
   res.setHeader('Content-Type','application/json')
   if(req.method==='GET'){res.end(JSON.stringify({result:[...documents.values()]}));return}
   const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk))
   const body=JSON.parse(Buffer.concat(chunks).toString())
   const staged=new Map([...documents].map(([id,doc])=>[id,structuredClone(doc)]))
   const results:unknown[]=[]
   try{
     for(const mutation of body.mutations){
       let changed:RawDocument|undefined
       if(mutation.create){changed=mutation.create;if(staged.has(changed!._id))throw new Error('Conflict')}
       if(mutation.createOrReplace)changed=mutation.createOrReplace
       if(mutation.patch){const patch=mutation.patch;const prior=staged.get(patch.id);if(!prior||patch.ifRevisionID&&patch.ifRevisionID!==prior._rev)throw new Error('Conflict');changed={...prior,...patch.set};for(const key of patch.unset||[])delete changed![key]}
       if(mutation.delete){staged.delete(mutation.delete.id);results.push({id:mutation.delete.id});continue}
       if(changed){changed={...changed,_rev:`r-${++revision}`};staged.set(changed._id,changed);results.push({id:changed._id,document:changed})}
     }
     documents.clear();for(const [id,doc] of staged)documents.set(id,doc)
     res.end(JSON.stringify({transactionId:'test-transaction',results}))
   }catch{res.statusCode=409;res.end(JSON.stringify({error:{type:'mutationError',description:'Revision conflict'}}))}
 })
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
   const address=server.address() as {port:number}
   const client=createClient({projectId:'htq7wor5',dataset:'production',apiVersion:'2025-02-19',useCdn:false,useProjectHostname:false,apiHost:`http://127.0.0.1:${address.port}`,token:'test-only',maxRetries:0})
   const gateway=createHomeGateway(client)
   const initial=await gateway.load()
   const form={...initial.form,text:'New draft text'}
   const saved=await gateway.save(form,initial)
   expect(documents.get('siteSettings')?.homeText).toBe('Old public text')
   expect(saved.draft?.homeText).toBe('New draft text')
   documents.set('drafts.siteSettings',{...documents.get('drafts.siteSettings')!,_rev:'another-editor'})
   await expect(gateway.save({...form,text:'Do not overwrite'},saved)).rejects.toMatchObject({statusCode:409})
   const refreshed=await gateway.load()
   const ready=await gateway.save(refreshed.form,refreshed)
   documents.set('siteSettings',{...documents.get('siteSettings')!,_rev:'new-public-revision'})
   await expect(gateway.publish(ready.form,ready)).rejects.toMatchObject({statusCode:409})
   expect(documents.get('siteSettings')?.homeText).toBe('Old public text')
   expect(documents.has('drafts.siteSettings')).toBe(true)
   const latest=await gateway.load()
   const published=await gateway.publish(latest.form,latest)
   expect(published.draft).toBeUndefined()
   expect(published.published?.homeText).toBe('New draft text')
   expect(published.published?.description).toBe('Preserved metadata')
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
})

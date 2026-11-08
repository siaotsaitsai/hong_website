import {createServer} from 'node:http'
import {createClient} from '@sanity/client'
import type {RawDocument} from '../../shared/previewContent'
export async function sanityServer(initial:RawDocument[]){
 const documents=new Map(initial.map(doc=>[doc._id,structuredClone(doc)]));let rev=0
 const server=createServer(async(req,res)=>{
   res.setHeader('Content-Type','application/json')
   if(req.method==='GET'){res.end(JSON.stringify({result:[...documents.values()].filter(doc=>!doc._id.startsWith('versions.'))}));return}
   const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk))
   const body=JSON.parse(Buffer.concat(chunks).toString());const staged=new Map([...documents].map(([id,doc])=>[id,structuredClone(doc)]));const results:unknown[]=[]
   function checkReferences(value:unknown){if(Array.isArray(value)){value.forEach(checkReferences);return}if(value&&typeof value==='object'){const object=value as Record<string,unknown>;if(typeof object._ref==='string'&&!object._weak&&!staged.has(object._ref))throw new Error('Missing strong reference');Object.values(object).forEach(checkReferences)}}
   try{
     for(const mutation of body.mutations){
       let changed:RawDocument|undefined
       if(mutation.create){changed=mutation.create;if(staged.has(changed!._id))throw new Error('Conflict')}
       if(mutation.createOrReplace)changed=mutation.createOrReplace
       if(mutation.patch){const patch=mutation.patch;const prior=staged.get(patch.id);if(!prior||patch.ifRevisionID&&patch.ifRevisionID!==prior._rev)throw new Error('Conflict');if(Object.keys(patch.set||{}).some(key=>key.startsWith('_')))throw new Error('Immutable attribute');changed={...prior,...patch.set};for(const key of patch.unset||[])delete changed![key]}
       if(mutation.delete){staged.delete(mutation.delete.id);results.push({id:mutation.delete.id});continue}
       if(changed){changed={...changed,_rev:`revision-${++rev}`};staged.set(changed._id,changed);results.push({id:changed._id,document:changed})}
     }
     for(const doc of staged.values())checkReferences(doc)
     documents.clear();for(const [id,doc] of staged)documents.set(id,doc)
     res.end(JSON.stringify({transactionId:'fixture-transaction',results}))
   }catch(error){res.statusCode=409;res.end(JSON.stringify({error:{type:'mutationError',description:error instanceof Error?error.message:'Conflict'}}))}
 })
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
 const port=(server.address() as {port:number}).port
 return {documents,client:createClient({projectId:'htq7wor5',dataset:'production',apiVersion:'2025-02-19',useCdn:false,useProjectHostname:false,apiHost:`http://127.0.0.1:${port}`,token:'test-only',maxRetries:0}),close:()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
}

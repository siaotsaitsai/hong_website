import {uploadImage} from './uploadImage'
import type {SanityClient} from 'sanity'
import type {RawDocument} from '../../shared/previewContent'
import {contentTypes} from './homeGateway'

export type PageName='home'|'portfolio'|'cv'|'statement'|'about'
export type DocumentModel=Record<string,RawDocument>
export type PageSnapshot={page:PageName;documents:RawDocument[];model:DocumentModel}
export interface PageGateway {
 load(page:PageName):Promise<PageSnapshot>
 upload(file:File):Promise<{reference:string;url:string}>
 save(model:DocumentModel,snapshot:PageSnapshot):Promise<PageSnapshot>
 publish(snapshot:PageSnapshot):Promise<PageSnapshot>
}
export const rootIds:Record<PageName,string>={home:'siteSettings',portfolio:'portfolioSettings',cv:'cvPage',statement:'statementPage',about:'artistProfile'}
export const canonical=(id:string)=>id.replace(/^drafts\./,'')
export const fields=(doc:RawDocument)=>Object.fromEntries(Object.entries(doc).filter(([key,value])=>!key.startsWith('_')&&value!==undefined))
export const references=(value:unknown):string[]=>Array.isArray(value)?value.map(item=>String(item?._ref||'')).filter(Boolean).map(canonical):[]
export const reference=(id:string)=>({_key:crypto.randomUUID(),_type:'reference',_ref:canonical(id)})
export function effective(documents:RawDocument[]):DocumentModel {
 const result:DocumentModel={}
 for(const doc of documents){if(doc._type==='sanity.imageAsset')continue;const id=canonical(doc._id);if(!result[id]||doc._id.startsWith('drafts.'))result[id]=doc}
 return Object.fromEntries(Object.entries(result).map(([id,doc])=>[id,{...doc,_id:id}]))
}
export function pageSnapshot(page:PageName,documents:RawDocument[]):PageSnapshot {
 const model=effective(documents)
 const root=rootIds[page]
 if(!model[root]){
   if(page==='home')model[root]={_id:root,_type:root,siteTitle:'Hong Yang',homeCaption:'',portfolioLinkLabel:'Explore portfolio'}
   if(page==='portfolio')model[root]={_id:root,_type:root,collections:model.siteSettings?.collections??Object.values(model).filter(doc=>doc._type==='collection').sort((a,b)=>String(a.title).localeCompare(String(b.title))).map(doc=>reference(doc._id))}
   if(page==='cv')model[root]={_id:root,_type:root,entries:model.artistProfile?.cv??[]}
   if(page==='statement')model[root]={_id:root,_type:root,body:model.artistProfile?.statement??[]}
   if(page==='about')model[root]={_id:root,_type:'artistProfile',name:'Hong Yang',introduction:''}
 }
 return {page,documents,model}
}
function mapReferences(value:unknown,transform:(ref:Record<string,unknown>)=>Record<string,unknown>):unknown {
 if(Array.isArray(value))return value.map(item=>mapReferences(item,transform))
 if(value&&typeof value==='object'){
   const object=value as Record<string,unknown>
   if(typeof object._ref==='string')return transform({...object,_ref:canonical(object._ref)})
   return Object.fromEntries(Object.entries(object).map(([key,item])=>[key,mapReferences(item,transform)]))
 }
 return value
}
export function portfolioTargets(model:DocumentModel):string[] {
 const ids=new Set(['portfolioSettings'])
 for(const collectionId of references(model.portfolioSettings?.collections)){
   ids.add(collectionId)
   for(const workId of references(model[collectionId]?.artworks))ids.add(workId)
 }
 return [...ids]
}
export function validatePage(snapshot:PageSnapshot):string|null {
 const {page,model}=snapshot
 if(page==='portfolio')for(const id of portfolioTargets(model)){
   const doc=model[id]
   if(!doc)return 'A selected collection or artwork is missing. Remove its reference or reload the saved version.'
   if(doc._type==='collection'&&!String(doc.title||'').trim())return 'Give every visible collection a title before publishing.'
   if(doc._type==='artwork'){
     if(!String(doc.title||'').trim())return 'Give every visible artwork a title before publishing.'
     if(!(doc.image as {asset?:{_ref?:string}})?.asset?._ref)return `Upload a main image for “${String(doc.title)}” before publishing.`
   }
 }
 if(page==='home'&&!String(model.siteSettings?.siteTitle||'').trim())return 'Enter a website title before publishing.'
 if(page==='about'&&!String(model.artistProfile?.name||'').trim())return 'Enter the artist name before publishing.'
 if(page==='cv')for(const entry of (model.cvPage.entries || []) as {category?:string;title?:string}[])if(!entry.category||!entry.title?.trim())return 'Choose a category and enter a title for each CV entry.'
 return null
}
function prepare(doc:RawDocument):RawDocument {
 const result={...fields(doc),_id:canonical(doc._id),_type:doc._type} as RawDocument
 if(['artwork','collection'].includes(doc._type)&&!(doc.slug as {current?:string})?.current){const title=String(doc.title||doc._type).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);result.slug={_type:'slug',current:`${title||doc._type}-${canonical(doc._id).slice(-8)}`}}
 for(const key of ['image','portrait','homeImage'] as const){const image=result[key] as Record<string,unknown>|undefined;if(image)result[key]={...image,alt:image.alt||String(doc.title||doc.name||'Artwork by Hong Yang')}}
 if(Array.isArray(result.additionalImages))result.additionalImages=result.additionalImages.map((image:Record<string,unknown>)=>({...image,alt:image.alt||String(doc.title||'Artwork detail')}))
 return result
}
export function createPageGateway(client:SanityClient):PageGateway {
 const api=client.withConfig({apiVersion:'2025-02-19',useCdn:false,perspective:'raw'})
 const load=async(page:PageName)=>pageSnapshot(page,await api.fetch<RawDocument[]>('*[_type in $types && !(_id in path("versions.**"))]',{types:contentTypes}))
 return {
   load,
   async upload(file){return uploadImage(api,file)},
   async save(model,snapshot){
     const originals=effective(snapshot.documents)
     const ids=snapshot.page==='portfolio'?Object.keys(model).filter(id=>['portfolioSettings','collection','artwork'].includes(model[id]._type)):[rootIds[snapshot.page]]
     let tx=api.transaction();let count=0
     for(const id of ids){
       if(originals[id]&&JSON.stringify(fields(model[id]))===JSON.stringify(fields(originals[id])))continue
       const prepared=prepare(model[id])
       const weakened=mapReferences(prepared,ref=>snapshot.documents.some(doc=>doc._id===ref._ref)?ref:{...ref,_weak:true}) as RawDocument
       const draft=snapshot.documents.find(doc=>doc._id===`drafts.${id}`)
       if(draft){const unset=Object.keys(fields(draft)).filter(key=>!(key in weakened));tx=tx.patch(draft._id,p=>{let patch=p.ifRevisionId(String(draft._rev)).set(fields(weakened));if(unset.length)patch=patch.unset(unset);return patch})}
       else tx=tx.create({...weakened,_id:`drafts.${id}`})
       count++
     }
     const written=count?await tx.commit<RawDocument>({returnDocuments:true,returnFirst:false}):[]
     const idsWritten=new Set(written.map(doc=>doc._id))
     return pageSnapshot(snapshot.page,[...snapshot.documents.filter(doc=>!idsWritten.has(doc._id)),...written])
   },
   async publish(snapshot){
     const problem=validatePage(snapshot);if(problem)throw new Error(problem)
     const targets=snapshot.page==='portfolio'?portfolioTargets(snapshot.model):[rootIds[snapshot.page]]
     let tx=api.transaction();let count=0
     for(const id of targets){
       const draft=snapshot.documents.find(doc=>doc._id===`drafts.${id}`);if(!draft)continue
       const published=snapshot.documents.find(doc=>doc._id===id)
       const prepared=prepare(draft)
       const strengthened=mapReferences(prepared,ref=>{const result={...ref};delete result._weak;delete result._strengthenOnPublish;return result}) as RawDocument
       const key=({siteSettings:'siteTitle',portfolioSettings:'collections',cvPage:'entries',statementPage:'body',artistProfile:'name'} as Record<string,string>)[draft._type] || 'title'
       tx=tx.patch(draft._id,p=>p.ifRevisionId(String(draft._rev)).set({[key]:draft[key]??[]}))
       if(published)tx=tx.patch(id,p=>p.ifRevisionId(String(published._rev)).set({[key]:published[key]??[]})).createOrReplace({...strengthened,_id:id})
       else tx=tx.create({...strengthened,_id:id})
       tx=tx.delete(draft._id);count++
     }
     if(count)await tx.commit()
     try{return await load(snapshot.page)}catch{throw new Error('Published successfully, but the editor could not reload. Refresh this page before making more changes.')}
   },
 }
}

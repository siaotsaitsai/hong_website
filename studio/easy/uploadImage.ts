import type {SanityClient} from 'sanity'

/** Keep uploads on Studio's authenticated request pipeline (including its host bridge).
 * The client's browser assets.upload shortcut uses XHR and bypasses requestHandler.
 */
export async function uploadImage(client:SanityClient,file:File){
 const dataset=client.config().dataset
 if(!dataset)throw new Error('The image upload dataset is not configured.')
 const result=await client.request<{document:{_id:string;url:string}}>({
   method:'POST',url:`/assets/images/${encodeURIComponent(dataset)}`,
   query:{filename:file.name},headers:{'Content-Type':file.type||'application/octet-stream'},
   body:file,timeout:0,
 })
 return {reference:result.document._id,url:result.document.url}
}

type Asset={url?:string;metadata?:{dimensions?:{width?:number;height?:number}}}
type Painting={title?:string;image?:{asset?:Asset}}
type ShareData={home?:{homeCaption?:string;homeImage?:{asset?:Asset};heroArtwork?:Painting};fallback?:Painting}
export type ShareImage={url:string;alt:string;width?:number;height?:number}

export function selectShareImage(data:ShareData,project:string,dataset:string):ShareImage|null {
 const asset=data.home?.homeImage?.asset||data.home?.heroArtwork?.image?.asset||data.fallback?.image?.asset
 if(!asset?.url)return null
 const url=new URL(asset.url)
 if(url.protocol!=='https:'||url.hostname!=='cdn.sanity.io'||!url.pathname.startsWith(`/images/${project}/${dataset}/`))return null
 url.searchParams.set('fm','jpg');url.searchParams.set('w','1200');url.searchParams.set('fit','max');url.searchParams.set('q','85')
 const dimensions=asset.metadata?.dimensions
 const width=dimensions?.width&&dimensions.width>0?Math.min(dimensions.width,1200):undefined
 const height=width&&dimensions?.height&&dimensions?.width?Math.round(dimensions.height*width/dimensions.width):undefined
 return {url:url.href,alt:data.home?.homeCaption||data.home?.heroArtwork?.title||data.fallback?.title||'Painting by Hong Yang',width,height}
}

let cached:Promise<ShareImage|null>|undefined
export function getShareImage():Promise<ShareImage|null>{
 return cached??=(async()=>{
   const project=import.meta.env.PUBLIC_SANITY_PROJECT_ID||'htq7wor5',dataset=import.meta.env.PUBLIC_SANITY_DATASET||'production'
   const asset='{asset->{url,metadata{dimensions{width,height}}}}'
   const query=`{"home":*[_id=="siteSettings"][0]{homeCaption,homeImage${asset},heroArtwork->{title,image${asset}}},"fallback":*[_type=="artwork" && defined(image.asset)]|order(year desc,title asc)[0]{title,image${asset}}}`
   const url=new URL(`https://${project}.api.sanity.io/v2025-02-19/data/query/${dataset}`)
   url.searchParams.set('query',query);url.searchParams.set('perspective','published')
   try{
     const response=await fetch(url,{signal:AbortSignal.timeout(15000)})
     if(!response.ok)throw new Error(`Sanity returned ${response.status}`)
     const payload=await response.json()
     const image=selectShareImage(payload.result||{},project,dataset)
     if(image)console.info('Share image metadata prepared from published artwork')
     return image
   }catch(error){console.warn('Share image unavailable at build time:',error instanceof Error?error.message:String(error));return null}
 })()
}

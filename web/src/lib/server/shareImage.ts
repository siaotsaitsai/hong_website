import {mkdir,writeFile,chmod} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import {websiteUrl} from '../../../../shared/websiteUrl'
type Asset={url?:string;metadata?:{dimensions?:{width?:number;height?:number}}}
type Painting={title?:string;image?:{asset?:Asset}}
type ShareData={home?:{homeCaption?:string;homeImage?:{asset?:Asset};heroArtwork?:Painting};fallback?:Painting}
export type ShareImage={url:string;alt:string;width?:number;height?:number;thumbnailUrl?:string}

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
     if(!image)return null
     const thumbnail=new URL(image.url);thumbnail.searchParams.set('w','400');thumbnail.searchParams.set('h','400');thumbnail.searchParams.set('fit','fill');thumbnail.searchParams.set('bg','ffffff');thumbnail.searchParams.set('q','75')
     const images=await Promise.all([image.url,thumbnail.href].map(async url=>{
       const response=await fetch(url,{signal:AbortSignal.timeout(20000)})
       if(!response.ok||!response.headers.get('content-type')?.startsWith('image/jpeg'))throw new Error('Could not download a JPEG share image')
       const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>8*1024*1024||bytes[0]!==0xff||bytes[1]!==0xd8)throw new Error('Invalid share image response')
       return bytes
     }))
     const version=createHash('sha256').update(images[0]).update(images[1]).digest('hex').slice(0,12)
     const names=[`homepage-${version}.jpg`,`homepage-${version}-thumbnail.jpg`]
     const directory=resolve(process.cwd(),'web',import.meta.env.DEV?'public':'dist','social')
     await mkdir(directory,{recursive:true});await Promise.all(images.map(async(bytes,index)=>{const path=resolve(directory,names[index]);await writeFile(path,bytes);await chmod(path,0o644)}))
     const base=import.meta.env.BASE_URL.replace(/\/?$/,'/')
     console.info('Share images prepared on the website origin')
     return {...image,url:new URL(`${base}social/${names[0]}`,websiteUrl).href,thumbnailUrl:new URL(`${base}social/${names[1]}`,websiteUrl).href}
   }catch(error){throw new Error(`Could not prepare social share images: ${error instanceof Error?error.message:String(error)}`)}
 })()
}

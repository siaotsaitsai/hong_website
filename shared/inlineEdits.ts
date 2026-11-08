import {portfolioTargets,type DocumentModel,type PageName} from '../studio/easy/pageGateway'
import {cleanPortableText,type TextBlock} from './portableText'
export type InlineEdit={id:string;field:string;value:string|TextBlock[];key?:string}
export function applyInlineEdits(model:DocumentModel,value:unknown,page:PageName='portfolio'):DocumentModel {
 if(!Array.isArray(value)||value.length>100)throw new Error('Invalid page edit request.')
 const visible=new Set(portfolioTargets(model));let next=model
 for(const item of value){
   if(!item||typeof item.id!=='string'||typeof item.field!=='string')throw new Error('Invalid page edit.')
   const doc=next[item.id];if(!doc)throw new Error('This item is not available.')
   let fields:string[]=[]
   if(page==='portfolio'&&visible.has(item.id))fields=doc._type==='artwork'?['title','dimensions','year']:doc._type==='collection'?['title']:[]
   if(page==='home'&&item.id==='siteSettings'&&doc._type==='siteSettings')fields=['homeCaption','portfolioLinkLabel']
   if(page==='about'&&item.id==='artistProfile'&&doc._type==='artistProfile')fields=['name','introduction']
   if(page==='statement'&&item.id==='statementPage'&&doc._type==='statementPage')fields=['body']
   if(page==='cv'&&item.id==='cvPage'&&doc._type==='cvPage')fields=['cv.category','cv.year','cv.title']
   if(!fields.includes(item.field))throw new Error('This field cannot be edited from this page.')
   if(next===model)next={...model}
   if(item.field==='body'){next[item.id]={...next[item.id],body:cleanPortableText(item.value)};continue}
   if(typeof item.value!=='string')throw new Error('Invalid text edit.')
   const max=item.field==='introduction'?10000:item.field==='cv.title'?1000:item.field==='dimensions'?100:item.field==='year'||item.field==='cv.year'?40:200
   if(item.value.length>max)throw new Error(`Please keep this text under ${max} characters.`)
   if(item.field.startsWith('cv.')){
     if(typeof item.key!=='string'||!Array.isArray(doc.entries))throw new Error('This CV entry is not available.')
     const index=doc.entries.findIndex((entry,i)=>String(entry._key??i)===item.key);if(index<0)throw new Error('This CV entry no longer exists.')
     const field=item.field.slice(3);const text=field==='category'?item.value.toLowerCase().trim():item.value
     if(field==='category'&&!['exhibition','education','residency','other'].includes(text))throw new Error('Choose exhibition, education, residency, or other.')
     next[item.id]={...next[item.id],entries:doc.entries.map((entry,i)=>i===index?{...entry,[field]:text}:entry)}
   }else next[item.id]={...next[item.id],[item.field]:item.field==='portfolioLinkLabel'?(item.value.trim()||'Explore portfolio'):item.value}
 }
 return next
}

import {portfolioTargets,type DocumentModel} from '../studio/easy/pageGateway'
export type InlineEdit={id:string;field:'title'|'dimensions'|'year';value:string}
export function applyInlineEdits(model:DocumentModel,value:unknown):DocumentModel {
 if(!Array.isArray(value)||value.length>100)throw new Error('Invalid page edit request.')
 const visible=new Set(portfolioTargets(model));let next=model
 for(const item of value){
   if(!item||typeof item.id!=='string'||typeof item.value!=='string'||typeof item.field!=='string')throw new Error('Invalid page edit.')
   const doc=model[item.id]
   const fields=doc?._type==='artwork'?['title','dimensions','year']:doc?._type==='collection'?['title']:[]
   if(!visible.has(item.id)||!fields.includes(item.field))throw new Error('This item cannot be edited from the page.')
   const max=item.field==='title'?200:item.field==='dimensions'?100:40
   if(item.value.length>max)throw new Error(`Please keep ${item.field} under ${max} characters.`)
   if(next===model)next={...model}
   next[item.id]={...next[item.id],[item.field]:item.value}
 }
 return next
}

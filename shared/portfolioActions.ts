import {canonical,references,type DocumentModel} from '../studio/easy/pageGateway'
export function applyPortfolioAction(model:DocumentModel,request:{action?:unknown;collection?:unknown;id?:unknown;index?:unknown;targetIndex?:unknown}):DocumentModel {
 const {action,collection,id,index,targetIndex}=request
 if(!['remove-artwork','up-artwork','down-artwork','move-artwork'].includes(String(action)))throw new Error('Unknown artwork action.')
 if(typeof collection!=='string'||typeof id!=='string'||!references(model.portfolioSettings?.collections).includes(collection))throw new Error('This collection is not visible.')
 const entries=model[collection]?.artworks
 if(!Array.isArray(entries)||typeof index!=='number'||!Number.isInteger(index)||index<0||index>=entries.length||canonical(String(entries[index]?._ref))!==id)throw new Error('The artwork order changed. Please try again.')
 const next=[...entries]
 if(action==='remove-artwork')next.splice(index,1)
 else{
   const target=action==='up-artwork'?index-1:action==='down-artwork'?index+1:targetIndex
   if(typeof target!=='number'||!Number.isInteger(target)||target<0||target>=entries.length)throw new Error('This position is not available.')
   next.splice(target,0,...next.splice(index,1))
 }
 return {...model,[collection]:{...model[collection],artworks:next}}
}

import type {TextBlock} from './portableText'
export function cvEntriesToText(entries:unknown):TextBlock[]{
 if(!Array.isArray(entries))return []
 const blocks:TextBlock[]=[];let category=''
 const add=(text:string,style='normal')=>blocks.push({_key:`cv-text-${blocks.length}`,_type:'block',style,markDefs:[],children:[{_key:'text',_type:'span',text,marks:[]}]})
 for(const entry of entries){
   const next=String(entry.category||'')
   if(next&&next!==category){add(next.charAt(0).toUpperCase()+next.slice(1),'h2');category=next}
   add([entry.year,entry.title].filter(Boolean).join(' — '))
 }
 return blocks
}

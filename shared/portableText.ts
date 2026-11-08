export type TextSpan={_key?:string;_type?:string;text?:string;marks?:string[]}
export type TextBlock={_key?:string;_type:string;style?:string;children?:TextSpan[];markDefs?:unknown[]}
export function cleanPortableText(value:unknown):TextBlock[]{
 if(!Array.isArray(value)||value.length>1000)throw new Error('Invalid statement content.')
 let total=0
 return value.map(block=>{
   if(!block||block._type!=='block'||!Array.isArray(block.children)||block.children.length>1000)throw new Error('Invalid statement paragraph.')
   return {_key:typeof block._key==='string'?block._key.slice(0,80):crypto.randomUUID(),_type:'block',style:block.style==='h2'?'h2':'normal',markDefs:[],children:block.children.map((span:Record<string,unknown>)=>{
     if(!span||typeof span.text!=='string')throw new Error('Invalid statement text.')
     total+=span.text.length;if(total>100000)throw new Error('The statement is too long.')
     return {_key:typeof span._key==='string'?span._key.slice(0,80):crypto.randomUUID(),_type:'span',text:span.text,marks:Array.isArray(span.marks)?span.marks.filter((mark:unknown)=>mark==='strong'||mark==='em'):[]}
   })}
 })
}
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function richTextHtml(blocks:TextBlock[]) {return blocks.filter(b=>b._type==='block').map(block=>{const tag=block.style==='h2'?'h2':'p';return `<${tag}>${(block.children||[]).map(span=>{let value=escape(span.text||'');if(span.marks?.includes('strong'))value=`<strong>${value}</strong>`;if(span.marks?.includes('em'))value=`<em>${value}</em>`;return value}).join('')||'<br>'}</${tag}>`}).join('')}
export function readRichText(root:HTMLElement):TextBlock[]{
 const blocks:TextBlock[]=[]
 function spans(node:Node,marks:string[]=[]):TextSpan[]{
   if(node.nodeType===Node.TEXT_NODE)return [{_key:crypto.randomUUID(),_type:'span',text:node.textContent||'',marks}]
   if(!(node instanceof HTMLElement))return []
   if(node.tagName==='BR')return [{_key:crypto.randomUUID(),_type:'span',text:'\n',marks}]
   const next=[...marks];if(['STRONG','B'].includes(node.tagName))next.push('strong');if(['EM','I'].includes(node.tagName))next.push('em')
   return Array.from(node.childNodes).flatMap(child=>spans(child,[...new Set(next)]))
 }
 for(const node of Array.from(root.childNodes)){const children=spans(node);if(children.length)blocks.push({_key:crypto.randomUUID(),_type:'block',style:node instanceof HTMLElement&&node.tagName==='H2'?'h2':'normal',children,markDefs:[]})}
 return blocks
}
export function formatRichSelection(root:HTMLElement,tag:'strong'|'em'|'h2'|'p'):boolean{
 const selection=window.getSelection();if(!selection?.rangeCount)return false
 const range=selection.getRangeAt(0);if(!root.contains(range.commonAncestorContainer))return false
 if(tag==='h2'||tag==='p'){
   let node:Node=range.startContainer;while(node.parentNode&&node.parentNode!==root)node=node.parentNode
   if(node===root)node=root.childNodes[range.startOffset]||root.firstChild||document.createTextNode('')
   const next=document.createElement(tag)
   if(node instanceof HTMLElement&&['P','H2','DIV'].includes(node.tagName)){next.replaceChildren(...Array.from(node.childNodes));node.replaceWith(next)}
   else{if(node.parentNode===root)root.insertBefore(next,node);else root.append(next);next.append(node)}
   const caret=document.createRange();caret.selectNodeContents(next);caret.collapse(false);selection.removeAllRanges();selection.addRange(caret)
 }else{
   if(range.collapsed)return false
   const top=(node:Node)=>{let element=node instanceof HTMLElement?node:node.parentElement;while(element&&element.parentElement!==root)element=element.parentElement;return element}
   if(top(range.startContainer)!==top(range.endContainer))return false
   const wrap=document.createElement(tag);wrap.append(range.extractContents());range.insertNode(wrap);range.selectNodeContents(wrap);selection.removeAllRanges();selection.addRange(range)
 }
 return true
}

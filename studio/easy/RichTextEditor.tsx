import {useEffect,useRef,useState} from 'react'
type Span={_key?:string;_type?:string;text?:string;marks?:string[]}
export type TextBlock={_key?:string;_type:string;style?:string;children?:Span[];markDefs?:unknown[]}
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
function html(blocks:TextBlock[]) {return blocks.filter(b=>b._type==='block').map(block=>{const tag=block.style==='h2'?'h2':'p';return `<${tag}>${(block.children||[]).map(span=>{let value=escape(span.text||'');if(span.marks?.includes('strong'))value=`<strong>${value}</strong>`;if(span.marks?.includes('em'))value=`<em>${value}</em>`;return value}).join('')||'<br>'}</${tag}>`}).join('')}
function read(root:HTMLElement):TextBlock[] {
 const blocks:TextBlock[]=[]
 function spans(node:Node,marks:string[]=[]):Span[]{
   if(node.nodeType===Node.TEXT_NODE)return [{_key:crypto.randomUUID(),_type:'span',text:node.textContent||'',marks}]
   if(!(node instanceof HTMLElement))return []
   if(node.tagName==='BR')return [{_key:crypto.randomUUID(),_type:'span',text:'\n',marks}]
   const next=[...marks];if(['STRONG','B'].includes(node.tagName))next.push('strong');if(['EM','I'].includes(node.tagName))next.push('em')
   return Array.from(node.childNodes).flatMap(child=>spans(child,[...new Set(next)]))
 }
 for(const node of Array.from(root.childNodes)){const children=spans(node);if(!children.length)continue;blocks.push({_key:crypto.randomUUID(),_type:'block',style:node instanceof HTMLElement&&node.tagName==='H2'?'h2':'normal',children,markDefs:[]})}
 return blocks
}
export function RichTextEditor({value,onChange,identity,disabled=false,label='Artist statement'}:{value:TextBlock[];onChange:(blocks:TextBlock[])=>void;identity:string;disabled?:boolean;label?:string}) {
 const editor=useRef<HTMLDivElement>(null)
 const [hint,setHint]=useState('Select text, then choose Bold or Italic. Enter starts a new paragraph.')
 useEffect(()=>{if(editor.current)editor.current.innerHTML=html(value)},[identity]) // Keep the caret stable while typing.
 const changed=()=>{if(editor.current)onChange(read(editor.current))}
 function format(tag:'strong'|'em'|'h2'|'p'){
   const selection=window.getSelection();if(!editor.current||!selection?.rangeCount)return
   const range=selection.getRangeAt(0);if(!editor.current.contains(range.commonAncestorContainer)){setHint('Click in the text first, then choose a format.');return}
   if(tag==='h2'||tag==='p'){
     let node:Node=range.startContainer
     while(node.parentNode&&node.parentNode!==editor.current)node=node.parentNode
     if(node===editor.current)node=editor.current.childNodes[range.startOffset]||editor.current.firstChild||document.createTextNode('')
     const next=document.createElement(tag)
     if(node instanceof HTMLElement&&['P','H2','DIV'].includes(node.tagName)){next.replaceChildren(...Array.from(node.childNodes));node.replaceWith(next)}
     else{if(node.parentNode===editor.current)editor.current.insertBefore(next,node);else editor.current.append(next);next.append(node)}
     const caret=document.createRange();caret.selectNodeContents(next);caret.collapse(false);selection.removeAllRanges();selection.addRange(caret)
   }else{
     if(range.collapsed){setHint('Select the words you want to format.');return}
     const blockOf=(node:Node)=>{let element=node instanceof HTMLElement?node:node.parentElement;while(element&&element.parentElement!==editor.current)element=element.parentElement;return element};
     if(blockOf(range.startContainer)!==blockOf(range.endContainer)){setHint('Select words within one paragraph to format them.');return}
     const wrap=document.createElement(tag);wrap.append(range.extractContents());range.insertNode(wrap);range.selectNodeContents(wrap);selection.removeAllRanges();selection.addRange(range)
   }
   changed()
 }
 return <div className="easy-rich"><div className="easy-rich-toolbar">{(['strong','em','h2','p'] as const).map((tag,i)=><button type="button" disabled={disabled} key={tag} onMouseDown={event=>event.preventDefault()} onClick={()=>format(tag)}>{['Bold','Italic','Heading','Paragraph'][i]}</button>)}</div><div ref={editor} role="textbox" aria-label={label} aria-multiline="true" contentEditable={!disabled} suppressContentEditableWarning onInput={changed} onPaste={event=>{event.preventDefault();const text=event.clipboardData.getData('text/plain');const selection=window.getSelection();if(selection?.rangeCount&&editor.current?.contains(selection.getRangeAt(0).commonAncestorContainer)){const range=selection.getRangeAt(0);range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);changed()}}}/><small>{hint}</small></div>
}

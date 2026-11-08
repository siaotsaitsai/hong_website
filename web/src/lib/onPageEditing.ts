export type PageEdit={id:string;field:string;value:string}
export function createOnPageEditing(){
 let enabled=false;let busy=false;let origin='';let channel=''
 let active:{element:HTMLElement;id:string;field:string;initial:string;display:string;modified:boolean}|null=null
 const pending=new Map<string,PageEdit>()
 const post=(type:string,extra:Record<string,unknown>={})=>{if(origin)window.parent.postMessage({type,channel,...extra},origin)}
 function capture(){if(!active||!active.modified)return;const value=(active.element.innerText||'').replace(/[\r\n]+/g,' ').trim();const key=`${active.id}\0${active.field}`;if(value===active.initial)pending.delete(key);else pending.set(key,{id:active.id,field:active.field,value})}
 function commit(){
   capture();const edits=[...pending.values()];pending.clear()
   if(active){const previous=active;active=null;previous.element.blur();if(!edits.length)previous.element.textContent=previous.display}
   if(edits.length)post('portfolio:edit',{edits})
   post('portfolio:pending',{pending:false});return edits
 }
 function pick(id:string,field:'image'|'newWorks'){
   if(busy)return
   const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,image/gif';input.multiple=field==='newWorks';input.hidden=true
   input.addEventListener('change',()=>{if(input.files?.length)post('portfolio:upload',{id,field,files:Array.from(input.files)});input.remove()},{once:true});document.body.append(input);input.click()
   input.addEventListener('cancel',()=>input.remove(),{once:true})
 }
 window.addEventListener('beforeunload',event=>{if(pending.size){event.preventDefault();event.returnValue=''}})
 document.addEventListener('focusin',event=>{
   if(!enabled||busy)return
   const element=(event.target as Element).closest<HTMLElement>('[data-edit-id][data-edit-field]');if(!element)return
   active={element,id:element.dataset.editId!,field:element.dataset.editField!,initial:element.dataset.editValue||'',display:element.textContent||'',modified:false}
   if(element.textContent!==active.initial)element.textContent=active.initial
 },true)
 document.addEventListener('input',event=>{if(active&&event.target===active.element){active.modified=true;capture();post('portfolio:pending',{pending:pending.size>0})}},true)
 document.addEventListener('focusout',event=>{if(active&&event.target===active.element)commit()},true)
 document.addEventListener('keydown',event=>{
   if(!active)return
   if(event.key==='Enter'){event.preventDefault();commit()}
   if(event.key==='Escape'){event.preventDefault();const previous=active;pending.delete(`${previous.id}\0${previous.field}`);active=null;previous.element.textContent=previous.display;previous.element.blur();post('portfolio:pending',{pending:pending.size>0})}
 })
 document.addEventListener('paste',event=>{
   if(!active||event.target!==active.element)return
   event.preventDefault();const selection=window.getSelection();if(!selection?.rangeCount)return
   const range=selection.getRangeAt(0);if(!active.element.contains(range.commonAncestorContainer))return
   range.deleteContents();const text=document.createTextNode(event.clipboardData?.getData('text/plain')||'');range.insertNode(text);range.setStartAfter(text);range.collapse(true);selection.removeAllRanges();selection.addRange(range);active.modified=true;capture();post('portfolio:pending',{pending:pending.size>0})
 })
 document.addEventListener('click',event=>{
   if(!enabled)return
   const target=event.target as Element
   const image=target.closest<HTMLElement>('[data-edit-image-id]')
   if(image){event.preventDefault();event.stopImmediatePropagation();commit();pick(image.dataset.editImageId!,'image');return}
   const add=target.closest<HTMLElement>('[data-add-work]')
   if(add){event.preventDefault();event.stopImmediatePropagation();commit();pick(add.dataset.addWork!,'newWorks');return}
   const link=target.closest<HTMLAnchorElement>('a[href]')
   if(!link||link.origin!==location.origin||link.getAttribute('href')?.startsWith('#'))return
   const base=import.meta.env.BASE_URL.replace(/\/?$/,'/')
   const route=link.pathname.slice(base.length).replace(/\/$/,'')
   const page=({works:'portfolio',cv:'cv','artist-statement':'statement',about:'about','':'home'} as Record<string,string>)[route]
   if(page){event.preventDefault();event.stopImmediatePropagation();commit();post('portfolio:navigate',{page})}
 },true)
 return {
   configure(next:{enabled:boolean;busy:boolean;origin:string;channel:string}){enabled=next.enabled;busy=next.busy;origin=next.origin;channel=next.channel},
   isActive(){return !!active},
   flush:commit,
   decorate(){
     document.body.toggleAttribute('data-on-page-edit',enabled)
     if(!enabled)return
     document.querySelectorAll<HTMLElement>('[data-edit-id][data-edit-field]').forEach(element=>{
       element.contentEditable=busy?'false':'plaintext-only';element.setAttribute('role','textbox');element.setAttribute('tabindex',busy?'-1':'0');element.setAttribute('aria-label',element.dataset.editLabel||element.dataset.editField!);element.title='Click to edit. Enter to finish; Esc to cancel.'
     })
     document.querySelectorAll<HTMLElement>('[data-edit-image-id]').forEach(element=>{element.setAttribute('aria-label',`Change image for ${element.querySelector('img')?.alt||'this artwork'}`);element.title='Click to change this image';const label=element.querySelector('.artwork-open');if(label)label.textContent=busy?'Please wait…':'Change image'})
     document.querySelectorAll<HTMLElement>('[data-edit-collection-id]').forEach(section=>{const button=document.createElement('button');button.type='button';button.className='on-page-add-work';button.dataset.addWork=section.dataset.editCollectionId;button.textContent='Add artwork';button.disabled=busy;section.append(button)})
   },
 }
}

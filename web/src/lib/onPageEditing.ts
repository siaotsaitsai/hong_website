import {readRichText,formatRichSelection} from '../../../shared/portableText'
export type PageEdit={id:string;field:string;value:unknown;key?:string}
export function createOnPageEditing(){
 let enabled=false,busy=false,hostBusy=false,actionsEnabled=false,origin='',channel='',actionNotice=''
 const actionRequests=new Map<string,ReturnType<typeof setTimeout>>()
 let dragged:{collection:string;id:string;index:number}|null=null
 let dragY=0,dragFrame=0
 function scrollDuringDrag(){dragFrame=0;if(!dragged||busy)return;const direction=dragY<60?-1:dragY>innerHeight-60?1:0;if(direction)window.scrollBy(0,direction*14);dragFrame=requestAnimationFrame(scrollDuringDrag)}
 document.addEventListener('dragover',event=>{if(enabled&&!busy&&dragged){dragY=event.clientY;if(!dragFrame)dragFrame=requestAnimationFrame(scrollDuringDrag)}})
 function stopDragging(){dragged=null;cancelAnimationFrame(dragFrame);dragFrame=0;document.querySelectorAll('[data-drag-over]').forEach(el=>el.removeAttribute('data-drag-over'))}
 document.addEventListener('dragend',stopDragging)
 document.addEventListener('drop',stopDragging)
 let active:{element:HTMLElement;id:string;field:string;key?:string;initial:string;display:string;html:string;modified:boolean;rich:boolean;multiline:boolean}|null=null
 const pending=new Map<string,PageEdit>()
 const post=(type:string,extra:Record<string,unknown>={})=>{if(origin)window.parent.postMessage({type,channel,...extra},origin)}
 function showActionNotice(message:string){
   actionNotice=message;const works=document.querySelector('#works-content');if(!enabled||!works)return
   let status=works.querySelector<HTMLElement>('#on-page-action-status');if(!status){status=document.createElement('p');status.id='on-page-action-status';status.className='on-page-action-status';status.setAttribute('role','status');works.prepend(status)}status.textContent=message;status.hidden=!message
 }
 function updateActionBusy(){busy=hostBusy||actionRequests.size>0;document.querySelectorAll<HTMLButtonElement>('.on-page-artwork-actions button').forEach(button=>{button.disabled=busy||button.dataset.atBoundary==='true'})}
 function requestAction(request:Record<string,unknown>){
   if(busy)return
   if(!actionsEnabled){showActionNotice('Editor update required. Reload the editor tab to enable artwork controls.');return}
   const requestId=crypto.randomUUID()
   const timer=setTimeout(()=>{actionRequests.delete(requestId);updateActionBusy();showActionNotice('The editor did not respond. Reload the editor tab and try again. No changes were confirmed.')},5000)
   actionRequests.set(requestId,timer);updateActionBusy();showActionNotice('Updating artwork…');post('portfolio:action',{...request,requestId})
 }
 window.addEventListener('message',event=>{
   if(event.source!==window.parent||event.origin!==origin||event.data?.channel!==channel||event.data.type!=='portfolio:action-result')return
   const data=event.data,timer=actionRequests.get(data.requestId);if(timer===undefined)return
   clearTimeout(timer);if(data.pending)return
   actionRequests.delete(data.requestId);updateActionBusy();showActionNotice(data.ok?(data.cancelled?'Removal cancelled.':'Artwork updated. Save a draft or publish when ready.'):(typeof data.error==='string'?data.error:'Could not update this artwork. Please reload the editor.'))
 })
 function actionPayload(element:HTMLElement){return {action:element.dataset.editAction,key:element.dataset.editKey,collection:element.dataset.editWorkCollection,id:element.dataset.editWorkId,index:Number(element.dataset.editWorkIndex)}}
 function performAction(request:ReturnType<typeof actionPayload>){if(busy)return;commit();if(request.collection)requestAction(request);else post('portfolio:action',request)}
 let pressedAction:{pointerId:number;request:ReturnType<typeof actionPayload>;x:number;y:number}|null=null
 document.addEventListener('pointerdown',event=>{
   const element=(event.target as Element).closest<HTMLElement>('[data-edit-action]');if(!enabled||busy||!element||element.matches(':disabled')||event.button!==0)return
   // Keep the current text field focused until the gesture completes. A blur
   // would otherwise re-render and remove the button before its click fires.
   event.preventDefault();event.stopImmediatePropagation();pressedAction={pointerId:event.pointerId,request:actionPayload(element),x:event.clientX,y:event.clientY};element.setPointerCapture(event.pointerId)
 },true)
 document.addEventListener('pointerup',event=>{
   if(!pressedAction||event.pointerId!==pressedAction.pointerId)return
   const pressed=pressedAction;pressedAction=null;event.preventDefault();event.stopImmediatePropagation()
   if(enabled&&Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)<12)performAction(pressed.request)
 },true)
 document.addEventListener('pointercancel',()=>{pressedAction=null},true)
 const editKey=(id:string,field:string,key?:string)=>`${id}\0${field}\0${key||''}`
 function capture(){
   if(!active||!active.modified)return
   const value=active.rich?readRichText(active.element):active.multiline?(active.element.innerText||'').trim():(active.element.innerText||'').replace(/[\r\n]+/g,' ').trim()
   const key=editKey(active.id,active.field,active.key)
   if(!active.rich&&value===active.initial)pending.delete(key);else pending.set(key,{id:active.id,field:active.field,key:active.key,value})
 }
 function commit(){
   capture();const edits=[...pending.values()];pending.clear()
   if(active){const previous=active;active=null;previous.element.blur();if(!edits.length){if(previous.rich)previous.element.innerHTML=previous.html;else previous.element.textContent=previous.display}}
   if(edits.length)post('portfolio:edit',{edits})
   post('portfolio:pending',{pending:false});return edits
 }
 function pick(id:string,field:string){
   if(busy||!['image','newWorks','portrait','homeImage'].includes(field))return
   const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,image/gif';input.multiple=field==='newWorks';input.hidden=true
   input.addEventListener('change',()=>{if(input.files?.length)post('portfolio:upload',{id,field,files:Array.from(input.files)});input.remove()},{once:true});document.body.append(input);input.click();input.addEventListener('cancel',()=>input.remove(),{once:true})
 }
 window.addEventListener('beforeunload',event=>{if(pending.size){event.preventDefault();event.returnValue=''}})
 document.addEventListener('focusin',event=>{
   if(!enabled||busy)return
   const element=(event.target as Element).closest<HTMLElement>('[data-edit-id][data-edit-field]');if(!element||element.dataset.editSelect)return
   active={element,id:element.dataset.editId!,field:element.dataset.editField!,key:element.dataset.editKey,initial:element.dataset.editValue||'',display:element.textContent||'',html:element.innerHTML,modified:false,rich:!!element.dataset.editRich,multiline:!!element.dataset.editMultiline}
   if(active.rich){try{if(!JSON.parse(active.initial||'[]').length)element.innerHTML='<p><br></p>'}catch{}}
   else if(element.textContent!==active.initial)element.textContent=active.initial
 },true)
 document.addEventListener('input',event=>{if(active&&event.target===active.element){active.modified=true;capture();post('portfolio:pending',{pending:pending.size>0})}},true)
 document.addEventListener('focusout',event=>{if(active&&event.target===active.element)commit()},true)
 document.addEventListener('keydown',event=>{
   if(enabled&&!active&&['Enter',' '].includes(event.key)){const target=(event.target as Element).closest<HTMLElement>('[data-edit-image-id]');if(target&&target.tagName!=='BUTTON'){event.preventDefault();target.click();return}}
   if(!active)return
   if(event.key==='Enter'&&(!active.multiline||event.ctrlKey||event.metaKey)){event.preventDefault();commit()}
   if(event.key==='Escape'){event.preventDefault();const previous=active;pending.delete(editKey(previous.id,previous.field,previous.key));active=null;if(previous.rich)previous.element.innerHTML=previous.html;else previous.element.textContent=previous.display;previous.element.blur();post('portfolio:pending',{pending:pending.size>0})}
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
   const action=target.closest<HTMLElement>('[data-edit-action]')
   if(action){event.preventDefault();event.stopImmediatePropagation();if(event.detail===0)performAction(actionPayload(action));return}
   const image=target.closest<HTMLElement>('[data-edit-image-id]')
   if(image){event.preventDefault();event.stopImmediatePropagation();commit();pick(image.dataset.editImageId!,image.dataset.editImageField||'image');return}
   const add=target.closest<HTMLElement>('[data-add-work]')
   if(add){event.preventDefault();event.stopImmediatePropagation();commit();pick(add.dataset.addWork!,'newWorks');return}
   if(target.closest('[data-edit-id][data-edit-field]')){if(target.closest('a'))event.preventDefault();return}
   const link=target.closest<HTMLAnchorElement>('a[href]')
   if(!link||link.origin!==location.origin||link.getAttribute('href')?.startsWith('#'))return
   const base=import.meta.env.BASE_URL.replace(/\/?$/,'/');const route=link.pathname.slice(base.length).replace(/\/$/,'')
   const page=({works:'portfolio',cv:'cv','artist-statement':'statement',about:'about','':'home'} as Record<string,string>)[route]
   if(page){event.preventDefault();event.stopImmediatePropagation();commit();post('portfolio:navigate',{page})}
 },true)
 function uploadButton(container:Element,id:string,field:string,label:string){const button=document.createElement('button');button.type='button';button.className='on-page-add-work';button.dataset.editImageId=id;button.dataset.editImageField=field;button.textContent=label;button.disabled=busy;container.prepend(button)}
 return {
   configure(next:{enabled:boolean;busy:boolean;origin:string;channel:string;capabilities?:unknown}){enabled=next.enabled;hostBusy=next.busy;busy=hostBusy||actionRequests.size>0;origin=next.origin;channel=next.channel;actionsEnabled=Array.isArray(next.capabilities)&&next.capabilities.includes('portfolio-actions-v1')},
   isActive(){return !!active},flush:commit,
   decorate(){
     document.body.toggleAttribute('data-on-page-edit',enabled);if(!enabled)return
     if(document.body.dataset.page==='works')showActionNotice(actionsEnabled?actionNotice:'Editor update required. Reload the editor tab to enable artwork controls.')
     if(document.body.dataset.page==='home'&&!document.querySelector('#home-artwork [data-edit-image-id]'))uploadButton(document.querySelector('#home-artwork')!,'siteSettings','homeImage','Choose homepage image')
     if(document.body.dataset.page==='about'&&!document.querySelector('#about-content [data-edit-image-id]'))uploadButton(document.querySelector('#about-content .about-layout')!,'artistProfile','portrait','Upload portrait')
     document.querySelectorAll<HTMLElement>('[data-edit-id][data-edit-field]').forEach(element=>{
       if(element.dataset.editSelect){
         const select=document.createElement('select');select.setAttribute('aria-label',element.dataset.editLabel||'Category');select.disabled=busy
         for(const value of ['exhibition','education','residency','other']){const option=document.createElement('option');option.value=value;option.textContent=value.charAt(0).toUpperCase()+value.slice(1);select.append(option)}select.value=element.dataset.editValue||''
         select.addEventListener('change',()=>post('portfolio:edit',{edits:[{id:element.dataset.editId,field:element.dataset.editField,key:element.dataset.editKey,value:select.value}]}));element.replaceChildren(select);return
       }
       element.contentEditable=busy?'false':element.dataset.editRich?'true':'plaintext-only';element.setAttribute('role','textbox');element.setAttribute('tabindex',busy?'-1':'0');element.setAttribute('aria-label',element.dataset.editLabel||element.dataset.editField!);element.setAttribute('aria-multiline',String(!!element.dataset.editMultiline));element.title=element.dataset.editMultiline?'Click to edit. Click elsewhere to finish; Esc cancels.':'Click to edit. Enter to finish; Esc cancels.'
       if(element.dataset.editRich){const toolbar=document.createElement('div');toolbar.className='on-page-rich-toolbar';(['strong','em','h2','p'] as const).forEach((tag,i)=>{const button=document.createElement('button');button.type='button';button.textContent=['Bold','Italic','Heading','Paragraph'][i];button.disabled=busy;button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',()=>{if(formatRichSelection(element,tag)&&active){active.modified=true;capture();post('portfolio:pending',{pending:true})}});toolbar.append(button)});element.before(toolbar)}
     })
     document.querySelectorAll<HTMLElement>('[data-edit-image-id]').forEach(element=>{if(element.tagName!=='BUTTON'){element.setAttribute('role','button');element.tabIndex=busy?-1:0}element.setAttribute('aria-label',element.tagName==='BUTTON'&&!element.querySelector('img')?element.textContent||'Choose image':`Change image for ${element.querySelector('img')?.alt||'this artwork'}`);element.title='Click to change this image';const label=element.querySelector('.artwork-open');if(label)label.textContent=busy?'Please wait…':'Change image'})
     document.querySelectorAll<HTMLElement>('[data-edit-collection-id]').forEach(section=>{
       const collection=section.dataset.editCollectionId!
       const figures=Array.from(section.querySelectorAll<HTMLElement>('.artwork-grid figure[data-edit-work-id]'))
       if(actionsEnabled)figures.forEach((figure,index)=>{
         const id=figure.dataset.editWorkId!,title=figure.querySelector('[data-edit-field="title"]')?.textContent||'artwork'
         const controls=document.createElement('div');controls.className='on-page-artwork-actions'
         const handle=document.createElement('button');handle.type='button';handle.textContent='↕ Drag';handle.setAttribute('aria-label',`Drag ${title} to reorder`);handle.draggable=false;handle.disabled=busy;handle.className='on-page-drag-handle'
         let dragPointer:number|null=null,startX=0,startY=0,moved=false,dropIndex:number|null=null
         handle.addEventListener('pointerdown',event=>{if(busy||event.button!==0)return;event.preventDefault();event.stopPropagation();dragPointer=event.pointerId;startX=event.clientX;startY=event.clientY;moved=false;dropIndex=null;handle.setPointerCapture(event.pointerId);dragged={collection,id,index}})
         handle.addEventListener('pointermove',event=>{
           if(event.pointerId!==dragPointer||!dragged)return
           if(Math.hypot(event.clientX-startX,event.clientY-startY)>8)moved=true
           if(!moved)return
           dragY=event.clientY;if(!dragFrame)dragFrame=requestAnimationFrame(scrollDuringDrag)
           const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('figure[data-edit-work-id]')
           document.querySelectorAll('[data-drag-over]').forEach(el=>el.removeAttribute('data-drag-over'))
           dropIndex=target?.dataset.editWorkCollection===collection?Number(target.dataset.editWorkIndex):null
           if(dropIndex!==null&&dropIndex!==index)target?.setAttribute('data-drag-over','')
         })
         handle.addEventListener('pointerup',event=>{if(event.pointerId!==dragPointer)return;event.preventDefault();const target=dropIndex;dragPointer=null;stopDragging();if(moved&&target!==null&&target!==index&&!busy){commit();requestAction({action:'move-artwork',collection,id,index,targetIndex:target})}})
         handle.addEventListener('pointercancel',()=>{dragPointer=null;stopDragging()})
         controls.append(handle)
         for(const [action,label,disabled] of [['up-artwork','Move up',index===0],['down-artwork','Move down',index===figures.length-1],['remove-artwork','Remove artwork',false]] as const){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',`${label}: ${title}`);Object.assign(button.dataset,{editAction:action,editWorkCollection:collection,editWorkId:id,editWorkIndex:String(index)});button.dataset.atBoundary=String(disabled);button.disabled=busy||disabled;controls.append(button)}
         figure.append(controls);figure.querySelectorAll('img').forEach(img=>{img.draggable=false})
         figure.addEventListener('dragover',event=>{if(!busy&&dragged?.collection===collection){event.preventDefault();figure.setAttribute('data-drag-over','')}})
         figure.addEventListener('dragleave',event=>{if(!figure.contains(event.relatedTarget as Node|null))figure.removeAttribute('data-drag-over')})
         figure.addEventListener('drop',event=>{event.preventDefault();figure.removeAttribute('data-drag-over');if(!busy&&dragged?.collection===collection&&dragged.index!==index)requestAction({action:'move-artwork',...dragged,targetIndex:index});dragged=null})
       })
       const button=document.createElement('button');button.type='button';button.className='on-page-add-work';button.dataset.addWork=collection;button.textContent='Add artwork';button.disabled=busy;section.append(button)
     })
     if(document.body.dataset.page==='cv'&&!document.querySelector('#cv-content [data-edit-rich]')){
       const rows=Array.from(document.querySelectorAll<HTMLElement>('[data-cv-key]'))
       rows.forEach((row,i)=>{const controls=document.createElement('div');controls.className='on-page-cv-actions';for(const [action,label,disabled] of [['up-cv','Move up',i===0],['down-cv','Move down',i===rows.length-1],['remove-cv','Remove entry',false]] as const){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.editAction=action;button.dataset.editKey=row.dataset.cvKey;button.disabled=busy||disabled;controls.append(button)}row.append(controls)})
       const button=document.createElement('button');button.type='button';button.className='on-page-add-work';button.textContent='Add experience';button.dataset.editAction='add-cv';button.disabled=busy;document.querySelector('#cv-content')!.append(button)
     }
   },
 }
}

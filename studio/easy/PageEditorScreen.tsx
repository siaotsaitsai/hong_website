import {applyPortfolioAction} from '../../shared/portfolioActions'
import {cvEntriesToText} from '../../shared/cvText'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {applyInlineEdits} from '../../shared/inlineEdits'
import {resolvePreview,type RawDocument} from '../../shared/previewContent'
import {EditorNav,editorPages,type EditorPage} from './EditorNav'
import {RichTextEditor,type TextBlock} from './RichTextEditor'
import {reference,references,rootIds,validatePage,type DocumentModel,type PageGateway,type PageName,type PageSnapshot} from './pageGateway'
import './editor.css'
const website='https://siaotsaitsai.github.io/hong_website/'
const studio='https://hong-portfolio-htq7wor5.sanity.studio'
const routes:Record<PageName,string>={home:'',portfolio:'works/',cv:'cv/',statement:'artist-statement/',about:'about/'}
const list=<T,>(value:unknown):T[]=>Array.isArray(value)?value:[]
const move=<T,>(items:T[],from:number,to:number):T[]=>{if(from<0||to<0||to>=items.length)return items;const next=[...items];next.splice(to,0,next.splice(from,1)[0]);return next}
function message(error:unknown){const status=(error as {statusCode?:number})?.statusCode;return status===409?'Another editor changed this content. Reload the saved version before trying again. Your current edits are still here.':status===401||status===403?'Your account cannot make this change. Check the project invitation and editing permissions.':error instanceof Error?error.message:'Could not complete the action. Your edits are still here.'}
export function PageEditorScreen({page,gateway,onNavigate,userName='Artist',previewBase=website,initialVisual=page!=='cv'}:{page:PageName;gateway:PageGateway;onNavigate:(page:EditorPage)=>void;userName?:string;previewBase?:string;initialVisual?:boolean}){
 const [visual,setVisual]=useState(initialVisual)
 const [inlinePending,setInlinePending]=useState(false)
 const modelRef=useRef<DocumentModel>({})
 const flushRequests=useRef(new Map<string,{resolve:(model:DocumentModel)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>())
 const [snapshot,setSnapshot]=useState<PageSnapshot|null>(null)
 const [model,setModel]=useState<DocumentModel>({})
 const [savedModel,setSavedModel]=useState('')
 const [busy,setBusy]=useState('Loading')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [confirmation,setConfirmation]=useState(false)
 const [removal,setRemoval]=useState<(Parameters<typeof applyPortfolioAction>[1]&{requestId?:string})|null>(null)
 const [expanded,setExpanded]=useState<string|null>(null)
 const [focus,setFocus]=useState<string|null>(null)
 const [mobile,setMobile]=useState(false)
 const [connected,setConnected]=useState(false)
 const frame=useRef<HTMLIFrameElement>(null)
 const dragged=useRef<{kind:string;parent:string;index:number}|null>(null)
 const channel=useMemo(()=>crypto.randomUUID(),[])
 const root=rootIds[page]
 const dirty=!!snapshot&&(JSON.stringify(model)!==savedModel||inlinePending)
 const title=editorPages.find(([key])=>key===page)![1]
 const preview=useMemo(()=>{const url=new URL(routes[page],previewBase);url.searchParams.set('studioPreview','1');url.searchParams.set('previewChannel',channel);return url},[page,previewBase,channel])
 const content=useMemo(()=>snapshot?resolvePreview([...snapshot.documents,...Object.values(model).map(doc=>({...doc,_id:`drafts.${doc._id}`}))],focus&&model[focus]?{...model[focus],_id:`drafts.${focus}`}:undefined):null,[snapshot,model,focus])
 const send=useCallback(()=>{if(content)frame.current?.contentWindow?.postMessage({type:'portfolio:preview',channel,content,mode:visual?'edit':'preview',busy:!!busy,capabilities:['portfolio-actions-v1']},preview.origin)},[content,channel,preview.origin,visual,busy])
 const replyAction=useCallback((requestId:unknown,result:Record<string,unknown>)=>{if(typeof requestId==='string')frame.current?.contentWindow?.postMessage({type:'portfolio:action-result',channel,requestId,...result},preview.origin)},[channel,preview.origin])
 const apply=useCallback((next:PageSnapshot)=>{setSnapshot(next);setModel(next.model);setSavedModel(JSON.stringify(next.model));setConfirmation(false);setInlinePending(false);modelRef.current=next.model},[])
 const load=useCallback(async()=>{setBusy('Loading');setError('');try{apply(await gateway.load(page))}catch(err){setError(message(err))}finally{setBusy('')}},[gateway,page,apply])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{const handler=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[dirty])
 useEffect(()=>{
   const handler=(event:MessageEvent)=>{
     if(event.origin!==preview.origin||event.source!==frame.current?.contentWindow||event.data?.channel!==channel)return
     const data=event.data
     if(data.type==='portfolio:ready')send()
     if(data.type==='portfolio:rendered')setConnected(true)
     if(!visual)return
     try{
       if(data.type==='portfolio:pending')setInlinePending(data.pending===true)
       if(data.type==='portfolio:edit'){const next=applyInlineEdits(modelRef.current,data.edits,page);modelRef.current=next;setModel(next);setInlinePending(false);setConfirmation(false);setNotice('')}
       if(data.type==='portfolio:flushed'){
         const request=flushRequests.current.get(data.requestId);if(!request)return
         const next=applyInlineEdits(modelRef.current,data.edits,page);modelRef.current=next;setModel(next);setInlinePending(false);clearTimeout(request.timer);flushRequests.current.delete(data.requestId);request.resolve(next)
       }
       if(data.type==='portfolio:upload'&&!busy){
         const current=modelRef.current;const visible=references(current[root]?.collections)
         const workIds=visible.flatMap(id=>references(current[id]?.artworks))
         if(!Array.isArray(data.files)||!data.files.length||data.files.some((file:unknown)=>!(file instanceof File)))return
         if(data.field==='image'&&page==='portfolio'&&workIds.includes(data.id))void upload(data.files,data.id,'image')
         if(data.field==='newWorks'&&page==='portfolio'&&visible.includes(data.id))void upload(data.files,data.id,'newWorks')
         if(data.field==='portrait'&&page==='about'&&data.id==='artistProfile')void upload(data.files,data.id,'portrait')
         if(data.field==='homeImage'&&page==='home'&&data.id==='siteSettings')void upload(data.files,data.id,'homeImage')
       }
       if(data.type==='portfolio:action'&&page==='portfolio'&&!busy){
         const next=applyPortfolioAction(modelRef.current,data)
         if(data.action==='remove-artwork'){setRemoval(data);replyAction(data.requestId,{pending:true})}
         else{updateModel(()=>next);changed();setError('');setNotice('Artwork order updated. Save a draft or publish when ready.');replyAction(data.requestId,{ok:true})}
       }
       if(data.type==='portfolio:action'&&page==='cv'&&!busy){
         const entries=list<Record<string,unknown>>(modelRef.current[root].entries)
         if(data.action==='add-cv')change(root,{entries:[...entries,{_key:crypto.randomUUID(),_type:'cvEntry',category:'exhibition',year:'',title:'New experience'}]})
         else{const index=entries.findIndex((entry,i)=>String(entry._key??i)===data.key);if(index>=0){if(data.action==='remove-cv')change(root,{entries:entries.filter((_,i)=>i!==index)});if(data.action==='up-cv')change(root,{entries:move(entries,index,index-1)});if(data.action==='down-cv')change(root,{entries:move(entries,index,index+1)})}}
       }
       if(data.type==='portfolio:navigate'&&editorPages.some(([id])=>id===data.page))navigate(data.page)
     }catch(err){setError(message(err));if(data.type==='portfolio:action')replyAction(data.requestId,{ok:false,error:message(err)});const request=flushRequests.current.get(data.requestId);if(request){clearTimeout(request.timer);flushRequests.current.delete(data.requestId);request.reject(err instanceof Error?err:new Error(message(err)))}}
   }
   window.addEventListener('message',handler);send();return()=>window.removeEventListener('message',handler)
 },[send,channel,preview.origin,visual,page,busy,dirty,replyAction])
 function finishRemoval(remove:boolean){
   if(!removal)return
   try{if(remove){updateModel(current=>applyPortfolioAction(current,removal));changed();setError('');setNotice('Artwork removed from this collection. Save a draft or publish when ready.')}replyAction(removal.requestId,{ok:true,cancelled:!remove})}
   catch(err){setError(message(err));replyAction(removal.requestId,{ok:false,error:message(err)})}
   setRemoval(null);frame.current?.focus()
 }
 function flushInline():Promise<DocumentModel>{
   if(!visual)return Promise.resolve(modelRef.current)
   if(!connected)return Promise.reject(new Error('Wait for the page to connect, or choose Use forms.'))
   return new Promise((resolve,reject)=>{const requestId=crypto.randomUUID();const timer=setTimeout(()=>{flushRequests.current.delete(requestId);reject(new Error('The page editor did not respond. Try again or choose Use forms.'))},4000);flushRequests.current.set(requestId,{resolve,reject,timer});frame.current?.contentWindow?.postMessage({type:'portfolio:flush',channel,requestId},preview.origin)})
 }
 async function toggleVisual(){try{if(visual&&connected)await flushInline();setFocus(null);setVisual(value=>!value);setError('')}catch(err){setError(message(err))}}
 async function askToPublish(){try{const current=await flushInline();if(snapshot){const problem=validatePage({...snapshot,model:current});if(problem){setError(problem);return}}setError('');setConfirmation(true)}catch(err){setError(message(err))}}

 function updateModel(update:(current:DocumentModel)=>DocumentModel){const next=update(modelRef.current);modelRef.current=next;setModel(next)}
 const changed=()=>{setNotice('');setConfirmation(false)}
 function change(id:string,values:Record<string,unknown>){updateModel(current=>{const next={...current[id],...values};for(const key of Object.keys(next))if(next[key]===undefined)delete next[key];return {...current,[id]:next}});changed()}
 function navigate(next:EditorPage){if(next===page)return;const unsaved=inlinePending||JSON.stringify(modelRef.current)!==savedModel;if(!busy&&(!unsaved||window.confirm('Leave this page without saving your changes?')))onNavigate(next)}
 function reorder(id:string,key:string,from:number,to:number){change(id,{[key]:move(list(model[id]?.[key]),from,to)})}
 function sortControls(kind:string,parent:string,index:number,total:number,label:string,key:string){return <div className="easy-sort"><button type="button" draggable aria-label={`Drag ${label}`} onDragStart={event=>{dragged.current={kind,parent,index};event.dataTransfer.setData('text/plain',label)}}>↕</button><button type="button" aria-label={`Move ${label} up`} disabled={index===0} onClick={()=>reorder(parent,key,index,index-1)}>↑</button><button type="button" aria-label={`Move ${label} down`} disabled={index===total-1} onClick={()=>reorder(parent,key,index,index+1)}>↓</button></div>}
 function drop(kind:string,parent:string,index:number,key:string){const from=dragged.current;if(from?.kind===kind&&from.parent===parent)reorder(parent,key,from.index,index);dragged.current=null}
 function imageUrl(value:unknown){const asset=(value as {asset?:{_ref?:string}})?.asset?._ref;return String(snapshot?.documents.find(doc=>doc._id===asset)?.url||'')}
 function addCollection(id?:string){
   const nextId=id||`collection-${crypto.randomUUID()}`
   updateModel(current=>({...current,...(!id?{[nextId]:{_id:nextId,_type:'collection',title:'New collection',description:'',showDescription:false,artworks:[]}}:{}),[root]:{...current[root],collections:[...list(current[root].collections),reference(nextId)]}}));changed();setFocus(null)
 }
 function addWork(collectionId:string,id?:string){
   const nextId=id||`artwork-${crypto.randomUUID()}`
   updateModel(current=>({...current,...(!id?{[nextId]:{_id:nextId,_type:'artwork',title:'Untitled work',year:'',medium:'Oil on canvas',dimensions:'',description:''}}:{}),[collectionId]:{...current[collectionId],artworks:[...list(current[collectionId].artworks),reference(nextId)]}}));changed();setExpanded(nextId);setFocus(nextId)
 }
 async function upload(files:FileList|File[]|null,id:string,key:'image'|'portrait'|'homeImage'|'additionalImages'|'newWorks'){
   if(!files?.length)return
   const selected=Array.from(files)
   if(selected.some(file=>!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>20*1024*1024)){setError('Choose JPG, PNG, WebP, or GIF files smaller than 20 MB each.');return}
   setBusy('Uploading');setError('');setNotice('')
   let completed=0
   try{for(const file of selected){
     setBusy(`Uploading ${completed+1} of ${selected.length}`)
     const asset=await gateway.upload(file)
     setSnapshot(current=>current?{...current,documents:[...current.documents,{_id:asset.reference,_type:'sanity.imageAsset',url:asset.url}]}:current)
     const image={_key:crypto.randomUUID(),_type:'image',asset:{_type:'reference',_ref:asset.reference}}
     if(key==='newWorks'){
       const workId=`artwork-${crypto.randomUUID()}`
       const name=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')
       updateModel(current=>({...current,[workId]:{_id:workId,_type:'artwork',title:name||'Untitled work',year:'',medium:'Oil on canvas',dimensions:'',description:'',image:{...image,alt:name||'Artwork by Hong Yang'}},[id]:{...current[id],artworks:[...list(current[id].artworks),reference(workId)]}}))
     }else if(key==='additionalImages')updateModel(current=>({...current,[id]:{...current[id],additionalImages:[...list(current[id].additionalImages),image]}}))
     else updateModel(current=>({...current,[id]:{...current[id],[key]:image}}))
     completed++;changed()
   }setNotice(`${completed===1?'Image':'Images'} uploaded. Save a draft or publish when ready.`)}catch(err){setError(`${completed?`${completed} image(s) uploaded before the error. `:''}${message(err)}`)}finally{setBusy('')}
 }
 async function save(publish=false){
   if(!snapshot)return
   let current:DocumentModel
   try{current=await flushInline()}catch(err){setError(message(err));return}
   if(publish){const problem=validatePage({...snapshot,model:current});if(problem){setError(problem);setConfirmation(false);return}}
   setBusy(publish?'Publishing':'Saving draft');setError('')
   try{const saved=await gateway.save(current,snapshot);apply(saved);if(publish){const published=await gateway.publish(saved);apply(published)}setNotice(publish?`${title} published. Refresh the website to see the update.`:'Draft saved. Your public website has not changed.')}catch(err){setError(message(err));setConfirmation(false)}finally{setBusy('')}
 }
 function field(id:string,key:string,label:string,multiline=false){return <label className="easy-field">{label}{multiline?<textarea rows={4} value={String(model[id]?.[key]||'')} onChange={event=>change(id,{[key]:event.target.value})}/>:<input value={String(model[id]?.[key]||'')} onChange={event=>change(id,{[key]:event.target.value})}/>}</label>}
 function uploadControl(id:string,key:'image'|'portrait'|'homeImage'|'additionalImages'|'newWorks',label:string,multiple=false){return <label className="easy-file-button">{label}<input aria-label={label} disabled={!!busy} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={multiple} onChange={event=>{void upload(event.target.files,id,key);event.target.value=''}}/></label>}
 function artworkCard(id:string,index:number,collectionId:string,total:number){
   const doc=model[id]
   if(!doc)return <p key={id}>Missing artwork. <button type="button" onClick={()=>change(collectionId,{artworks:list<{_ref:string}>(model[collectionId].artworks).filter(ref=>ref._ref!==id)})}>Remove missing reference</button></p>
   const src=imageUrl(doc.image)
   return <article className="easy-work-card" key={id} aria-label={`Artwork: ${String(doc.title)}`} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();event.stopPropagation();drop('artwork',collectionId,index,'artworks')}}>
     <div className="easy-work-photo">{src?<img src={src} alt={String(doc.title)}/>:<span>Upload a main image</span>}</div>
     <div className="easy-card-heading"><strong>{String(doc.title||'Untitled work')}</strong>{sortControls('artwork',collectionId,index,total,String(doc.title||'work'),'artworks')}</div>
     {field(id,'dimensions','Dimensions (inches by default)')}
     <button type="button" className="easy-text-button" onClick={()=>{setExpanded(expanded===id?null:id);setFocus(id)}}>{expanded===id?'Close details':'Edit details'}</button>
     {expanded===id&&<div className="easy-work-fields">
       {uploadControl(id,'image',src?'Replace main image':'Upload main image')}
       {field(id,'title','Artwork title')}{field(id,'year','Year')}{field(id,'medium','Medium')}{field(id,'description','Artwork description',true)}
       <div className="easy-detail-photos">{list<Record<string,unknown>>(doc.additionalImages).map((image,i)=><div key={String(image._key||i)}><img src={imageUrl(image)} alt="Artwork detail"/><button type="button" aria-label={`Remove detail image ${i+1}`} onClick={()=>change(id,{additionalImages:list(doc.additionalImages).filter((_,j)=>j!==i)})}>Remove</button></div>)}</div>
       {uploadControl(id,'additionalImages','Add detail images',true)}
     </div>}
     <button type="button" className="easy-text-button easy-remove" onClick={()=>{change(collectionId,{artworks:list<{_ref:string}>(model[collectionId].artworks).filter(ref=>ref._ref!==id)});setFocus(null);setNotice('Removed from this collection. The original artwork is kept.')}}>Remove from collection</button>
   </article>
 }
 const visible=references(model[root]?.collections)
 const hiddenCollections=Object.values(model).filter(doc=>doc._type==='collection'&&!visible.includes(doc._id))
 return <div className={`easy-editor ${visual?'easy-visual-editor':''}`}>
   <header className="easy-header"><a className="easy-brand" href={website} target="_blank" rel="noopener noreferrer">Hong Yang</a><span>YOUR WEBSITE EDITOR</span><a href={new URL(routes[page],website).href} target="_blank" rel="noopener noreferrer">View website</a></header>
   <EditorNav active={page} onNavigate={navigate} mobile/>
   <div className="easy-shell"><aside className="easy-sidebar"><span className="easy-kicker">EDIT YOUR WEBSITE</span><EditorNav active={page} onNavigate={navigate}/><a href={`${studio}/structure`} target="_blank" rel="noopener noreferrer">Advanced tools</a><small>Signed in as {userName}</small></aside>
     <main className="easy-main">
       <div className="easy-heading"><div><span className="easy-kicker">YOUR WEBSITE</span><h1>{title}</h1><p>{page==='portfolio'?'Arrange collections, upload work, and tell the story behind each piece.':'Edit here. Preview on the right. Publish when you are ready.'}</p></div>{<div className="easy-visual-toolbar"><button type="button" disabled={!!busy} onClick={()=>void toggleVisual()}>{visual?'Use forms':'Edit on page'}</button>{visual&&<>{page==='portfolio'&&<button type="button" disabled={!!busy||!snapshot} onClick={()=>addCollection()}>Add collection</button>}<button type="button" onClick={()=>setMobile(!mobile)}>{mobile?'Desktop view':'Mobile view'}</button></>}</div>}<span className={`easy-status ${dirty?'is-dirty':''}`}>{busy||(dirty?'Unsaved changes':snapshot?.documents.some(doc=>doc._id===`drafts.${root}`)?'Draft saved':'Up to date')}</span></div>
       {error&&<div role="alert" className="easy-alert">{error}<button type="button" disabled={!!busy} onClick={()=>{if(!dirty||window.confirm('Reload the saved version? Your unsaved edits will be lost.'))void load()}}>Reload saved version</button></div>}
       {notice&&<p role="status" className="easy-notice">{notice}</p>}
       {!snapshot?<p className="easy-loading">{busy?'Loading your content…':'Could not load this page. Please try Reload saved version.'}</p>:<div className={`easy-columns ${page==='portfolio'?'easy-portfolio-columns':''}`}><section className="easy-form" aria-label={`${title} content`}><fieldset disabled={!!busy}>
         {page==='home'&&<>{field(root,'homeCaption','Caption')}<div className="easy-portrait">{imageUrl(model[root].homeImage)&&<img src={imageUrl(model[root].homeImage)} alt="Homepage image"/>}{uploadControl(root,'homeImage','Upload homepage image')}{!!model[root].homeImage&&<button type="button" onClick={()=>change(root,{homeImage:undefined,heroArtwork:undefined})}>Remove homepage image</button>}</div>{field(root,'portfolioLinkLabel','Portfolio button text')}</>}
         {page==='portfolio'&&<>
           <div className="easy-toolbar"><button type="button" onClick={()=>addCollection()}>Add collection</button>{hiddenCollections.length>0&&<label>Add existing collection<select aria-label="Add existing collection" value="" onChange={event=>{if(event.target.value)addCollection(event.target.value)}}><option value="">Choose a collection</option>{hiddenCollections.map(doc=><option key={doc._id} value={doc._id}>{String(doc.title)}</option>)}</select></label>}</div>
           <p className="easy-help">Drag handles or use the arrows to sort. Publishing updates the visible collections and their artworks together.</p>
           {!visible.length&&<p className="easy-empty">No collections yet. Add your first collection to get started.</p>}
           {visible.map((id,i)=>{const doc=model[id];if(!doc)return <p key={id}>Missing collection <button type="button" onClick={()=>change(root,{collections:list<{_ref:string}>(model[root].collections).filter(ref=>ref._ref!==id)})}>Remove reference</button></p>;const works=references(doc.artworks);return <section key={id} className="easy-collection" aria-label={`Collection: ${String(doc.title)}`} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();drop('collection',root,i,'collections')}}>
             <div className="easy-card-heading"><h2>{String(doc.title||'New collection')}</h2>{sortControls('collection',root,i,visible.length,String(doc.title||'collection'),'collections')}</div>
             {field(id,'title','Collection title')}{field(id,'description','Collection introduction',true)}<label className="easy-checkbox"><input type="checkbox" checked={!!doc.showDescription} onChange={event=>change(id,{showDescription:event.target.checked})}/> Show introduction on website</label>
             <div className="easy-work-grid">{works.map((work,j)=>artworkCard(work,j,id,works.length))}</div>
             <div className="easy-toolbar"><button type="button" onClick={()=>addWork(id)}>Add artwork</button>{uploadControl(id,'newWorks','Upload artworks',true)}<label>Use existing artwork<select aria-label={`Add existing artwork to ${String(doc.title)}`} value="" onChange={event=>{if(event.target.value)addWork(id,event.target.value)}}><option value="">Choose a work</option>{Object.values(model).filter(work=>work._type==='artwork'&&!works.includes(work._id)).map(work=><option key={work._id} value={work._id}>{String(work.title)}</option>)}</select></label></div>
             <button type="button" className="easy-text-button easy-remove" onClick={()=>{change(root,{collections:list<{_ref:string}>(model[root].collections).filter(ref=>ref._ref!==id)});setFocus(null)}}>Remove collection from portfolio</button>
           </section>})}
         </>}
         {page==='cv'&&<><RichTextEditor label="CV text" disabled={!!busy} value={Array.isArray(model[root].body)?list<TextBlock>(model[root].body):cvEntriesToText(model[root].entries)} identity={savedModel+(Array.isArray(model[root].body)?'':JSON.stringify(model[root].entries))} onChange={body=>change(root,{body})}/><details><summary>Previous structured entries</summary><p className="easy-help">These entries are kept for reference. Once you edit the text above, the website displays that text instead.</p>{list<Record<string,unknown>>(model[root].entries).map((entry,i,entries)=><section key={String(entry._key||i)} className="easy-cv-entry" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();drop('cv',root,i,'entries')}}><div className="easy-card-heading"><h2>Experience {i+1}</h2>{sortControls('cv',root,i,entries.length,`experience ${i+1}`,'entries')}</div><label className="easy-field">Category<select value={String(entry.category||'')} onChange={event=>change(root,{entries:entries.map((row,j)=>j===i?{...row,category:event.target.value}:row)})}><option value="">Choose a category</option>{['exhibition','education','residency','other'].map(category=><option key={category} value={category}>{category.charAt(0).toUpperCase()+category.slice(1)}</option>)}</select></label><label className="easy-field">Year<input value={String(entry.year||'')} onChange={event=>change(root,{entries:entries.map((row,j)=>j===i?{...row,year:event.target.value}:row)})}/></label><label className="easy-field">Title and location<input value={String(entry.title||'')} onChange={event=>change(root,{entries:entries.map((row,j)=>j===i?{...row,title:event.target.value}:row)})}/></label><button type="button" className="easy-text-button easy-remove" onClick={()=>change(root,{entries:entries.filter((_,j)=>j!==i)})}>Remove experience</button></section>)}<button type="button" onClick={()=>change(root,{entries:[...list(model[root].entries),{_key:crypto.randomUUID(),_type:'cvEntry',category:'exhibition',year:'',title:''}]})}>Add experience</button></details></>}
         {page==='statement'&&<RichTextEditor disabled={!!busy} value={list<TextBlock>(model[root].body)} identity={savedModel} onChange={body=>change(root,{body})}/>}
         {page==='about'&&<>{field(root,'name','Artist name')}<div className="easy-portrait">{imageUrl(model[root].portrait)&&<img src={imageUrl(model[root].portrait)} alt="Artist portrait"/>}{uploadControl(root,'portrait',model[root].portrait?'Replace portrait':'Upload portrait')}{!!model[root].portrait&&<button type="button" className="easy-text-button" onClick={()=>change(root,{portrait:undefined})}>Remove portrait</button>}</div>{field(root,'introduction','Biography',true)}</>}
       </fieldset></section><section className="easy-preview" aria-label={`${title} preview`}><div className="easy-preview-toolbar"><div><strong>Live preview</strong><small>{connected?'Draft preview — not published.':'Connecting preview…'}</small></div><div>{focus&&<button type="button" onClick={()=>setFocus(null)}>Whole portfolio</button>}<button type="button" aria-pressed={mobile} onClick={()=>setMobile(!mobile)}>{mobile?'Desktop':'Mobile'}</button></div></div><div className="easy-preview-stage"><iframe ref={frame} title={`Live ${title} preview`} src={preview.href} onLoad={send} style={{width:mobile?'390px':'100%',maxWidth:'100%',pointerEvents:busy?'none':'auto'}}/></div></section></div>}
       <div className="easy-actions"><p>{confirmation?`Publish ${title}? ${page==='portfolio'?'Visible collections and their artworks will go live together.':'Visitors will see these changes.'}`:'Save a draft to come back later. Changes are not public until you publish.'}</p><div>{confirmation?<><button type="button" disabled={!!busy} onClick={()=>setConfirmation(false)}>Keep editing</button><button type="button" className="easy-primary" disabled={!!busy} onClick={()=>void save(true)}>Yes, publish {title}</button></>:<><button type="button" disabled={!snapshot||!!busy} onClick={()=>void save()}>Save draft</button><button type="button" className="easy-primary" disabled={!snapshot||!!busy} onClick={()=>void askToPublish()}>Publish</button></>}</div></div>
     </main>
   </div>
   {removal&&<div className="easy-dialog-backdrop"><section role="alertdialog" aria-modal="true" aria-labelledby="remove-artwork-title" aria-describedby="remove-artwork-note" className="easy-confirm-dialog" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();finishRemoval(false)}if(event.key==='Tab'){event.preventDefault();const buttons=Array.from(event.currentTarget.querySelectorAll('button'));buttons[(buttons.indexOf(document.activeElement as HTMLButtonElement)+1)%buttons.length]?.focus()}}}><h2 id="remove-artwork-title">Remove artwork?</h2><p id="remove-artwork-note">Remove this artwork from this collection? The original file stays stored. Publish to update the website.</p><div><button type="button" autoFocus onClick={()=>finishRemoval(false)}>Keep artwork</button><button type="button" onClick={()=>finishRemoval(true)}>Remove artwork</button></div></section></div>}
 </div>
}

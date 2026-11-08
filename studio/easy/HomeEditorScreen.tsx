import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {resolvePreview,type RawDocument} from '../../shared/previewContent'
import {createHomeGateway,homeDocument,validateHome,type HomeForm,type HomeGateway,type HomeSnapshot} from './homeGateway'
import './editor.css'

function Arrow(){return <svg aria-hidden="true" width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 13 13 3M3 3h10v10" stroke="currentColor" strokeWidth="1.2"/></svg>}

const website='https://siaotsaitsai.github.io/hong_website/'
const studio='https://hong-portfolio-htq7wor5.sanity.studio'
function errorMessage(error: unknown) {
  const status=(error as {statusCode?:number})?.statusCode
  if(status===409) return 'Someone else changed this page. Reload the saved version before trying again. Your current edits are still here.'
  if(status===401||status===403) return 'Your account cannot make this change. Check your project invitation and editing permissions.'
  return error instanceof Error ? error.message : 'Something went wrong. Your edits are still here. Please try again.'
}
export function HomeEditorScreen({gateway,userName='Artist',previewUrl=website}: {gateway:HomeGateway;userName?:string;previewUrl?:string}) {
  const [snapshot,setSnapshot]=useState<HomeSnapshot|null>(null)
  const [form,setForm]=useState<HomeForm|null>(null)
  const [savedForm,setSavedForm]=useState('')
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [mobile,setMobile]=useState(false)
  const [connected,setConnected]=useState(false)
  const [confirmPublish,setConfirmPublish]=useState(false)
  const [imageUrl,setImageUrl]=useState('')
  const frame=useRef<HTMLIFrameElement>(null)
  const fileInput=useRef<HTMLInputElement>(null)
  const channel=useMemo(()=>crypto.randomUUID(),[])
  const preview=useMemo(()=>{const url=new URL(previewUrl);url.searchParams.set('studioPreview','1');url.searchParams.set('previewChannel',channel);return url},[previewUrl,channel])
  const dirty=!!form && JSON.stringify(form)!==savedForm
  const content=useMemo(()=>snapshot&&form ? resolvePreview(snapshot.documents,homeDocument(form,snapshot.draft || snapshot.published)) : null,[snapshot,form])
  const send=useCallback(()=>{if(content) frame.current?.contentWindow?.postMessage({type:'portfolio:preview',channel,content},preview.origin)},[content,channel,preview.origin])
  const update=(values:Partial<HomeForm>)=>{setForm(current=>current?{...current,...values}:current);setNotice('');setConfirmPublish(false)}
  const apply=useCallback((next:HomeSnapshot)=>{
    setSnapshot(next);setForm(next.form);setSavedForm(JSON.stringify(next.form));setConfirmPublish(false)
    const ref=(next.form.image?.asset as {_ref?:string})?._ref
    setImageUrl(String(next.documents.find(doc=>doc._id===ref)?.url || ''))
  },[])
  const load=useCallback(async()=>{setBusy('Loading');setError('');try{apply(await gateway.load())}catch(err){setError(errorMessage(err))}finally{setBusy('')}},[gateway,apply])
  useEffect(()=>{void load()},[load])
  useEffect(()=>{const listener=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',listener);return()=>window.removeEventListener('beforeunload',listener)},[dirty])
  useEffect(()=>{
    const listener=(event:MessageEvent)=>{if(event.origin!==preview.origin||event.source!==frame.current?.contentWindow||event.data?.channel!==channel)return;if(event.data.type==='portfolio:ready')send();if(event.data.type==='portfolio:rendered')setConnected(true)}
    window.addEventListener('message',listener);send();return()=>window.removeEventListener('message',listener)
  },[channel,preview.origin,send])
  async function upload(file?:File) {
    if(!file)return
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){setError('Please choose a JPG, PNG, WebP, or GIF image.');return}
    if(file.size>20*1024*1024){setError('Please choose an image smaller than 20 MB.');return}
    setBusy('Uploading image');setError('')
    try{const asset=await gateway.upload(file);setImageUrl(asset.url);update({mode:'image',image:{_type:'image',asset:{_type:'reference',_ref:asset.reference}}});setSnapshot(current=>current?{...current,documents:[...current.documents,{_id:asset.reference,_type:'sanity.imageAsset',url:asset.url}]}:current);setNotice('Image uploaded. Save your draft or publish when ready.')}catch(err){setError(errorMessage(err))}finally{setBusy('');if(fileInput.current)fileInput.current.value=''}
  }
  async function save(publish=false) {
    if(!form||!snapshot)return
    if(publish){const problem=validateHome(form,snapshot);if(problem){setError(problem);setConfirmPublish(false);return}}
    setBusy(publish?'Publishing':'Saving draft');setError('')
    try{const saved=await gateway.save(form,snapshot);apply(saved);const next=publish?await gateway.publish(saved.form,saved):saved;apply(next);setNotice(publish?'Published. Your homepage is updated. Refresh the website to see it.':'Draft saved. Your public website has not changed.')}catch(err){setError(errorMessage(err));setConfirmPublish(false)}finally{setBusy('')}
  }
  const works=(snapshot?.documents || []).filter(doc=>doc._type==='artwork'&&!doc._id.startsWith('drafts.'))
  return <div className="easy-editor">
    <header className="easy-header"><a href={website} target="_blank" rel="noopener noreferrer" className="easy-brand">Hong Yang</a><span>YOUR WEBSITE EDITOR</span><a href={website} target="_blank" rel="noopener noreferrer">View website <Arrow/></a></header>
    <div className="easy-shell">
      <aside className="easy-sidebar"><span className="easy-kicker">EDIT YOUR WEBSITE</span><strong>Home</strong><p>Change a picture.<br/>Tell your story.</p><a href={`${studio}/structure`} target="_blank" rel="noopener noreferrer">Other pages & advanced tools <Arrow/></a><small>Signed in as {userName}</small></aside>
      <main className="easy-main">
        <div className="easy-heading"><div><span className="easy-kicker">HOME</span><h1>Make it yours.</h1><p>Your changes stay private until you publish.</p></div><span className={`easy-status ${dirty?'is-dirty':''}`}>{busy || (dirty?'Unsaved changes':snapshot?.draft?'Draft saved':'Up to date')}</span></div>
        {error&&<div className="easy-alert" role="alert">{error}<button type="button" disabled={!!busy} onClick={()=>{if(!dirty||window.confirm('Reload the saved version? Unsaved edits on this screen will be lost.'))void load()}}>Reload saved version</button></div>}
        {notice&&<p className="easy-notice" role="status">{notice}</p>}
        {!form ? <p className="easy-loading">{busy?'Loading your homepage…':'Your homepage could not be loaded. Use Reload saved version to try again.'}</p> : <div className="easy-columns">
          <section className="easy-form" aria-label="Homepage content"><fieldset disabled={!!busy}><legend>Homepage image</legend>
            <div className="easy-choice"><label><input type="radio" name="imageMode" checked={form.mode==='image'} onChange={()=>update({mode:'image'})}/> Upload an image</label><label><input type="radio" name="imageMode" checked={form.mode==='artwork'} onChange={()=>update({mode:'artwork'})}/> Choose a portfolio work</label></div>
            {form.mode==='image'?<><div className="easy-upload">{imageUrl&&form.image?<img src={imageUrl} alt="Current homepage image"/>:<div className="easy-upload-empty">A new point of view.</div>}<input ref={fileInput} aria-label="Upload homepage image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event=>void upload(event.target.files?.[0])}/><button type="button" onClick={()=>fileInput.current?.click()}>{form.image?'Replace image':'Choose an image'}</button><small>JPG, PNG, WebP or GIF · up to 20 MB</small>{form.image&&<button type="button" className="easy-text-button" onClick={()=>{update({image:undefined});setImageUrl('')}}>Remove image</button>}</div></>:<label className="easy-field">Published artwork<select value={form.artworkId} onChange={event=>update({artworkId:event.target.value})}><option value="">Choose an artwork</option>{works.map(work=><option key={work._id} value={work._id}>{String(work.title || 'Untitled work')}</option>)}</select><small>{works.length?'Only published works appear here.':'No published artworks yet. Upload a homepage image instead.'}</small></label>}
            <label className="easy-field">Caption <span>optional</span><input value={form.caption} onChange={event=>update({caption:event.target.value})} placeholder="A title for this image"/></label>
            <label className="easy-field">Portfolio button text<input value={form.linkLabel} onChange={event=>update({linkLabel:event.target.value})} placeholder="Explore portfolio"/></label>
          </fieldset></section>
          <section className="easy-preview" aria-label="Homepage preview"><div className="easy-preview-toolbar"><div><strong>Live preview</strong><small>{connected?'This is your draft, not the published page.':'Connecting preview…'}</small></div><button type="button" aria-pressed={mobile} onClick={()=>setMobile(!mobile)}>{mobile?'Desktop':'Mobile'}</button></div><div className="easy-preview-stage"><iframe ref={frame} title="Live homepage preview" src={preview.href} onLoad={send} style={{width:mobile?'390px':'100%',maxWidth:'100%'}}/></div></section>
        </div>}
        <div className="easy-actions"><p>{confirmPublish?'Ready? This will replace the homepage visitors see.':'Save a draft to come back later. Publish only when you are happy.'}</p><div>{confirmPublish?<><button type="button" disabled={!!busy} onClick={()=>setConfirmPublish(false)}>Keep editing</button><button type="button" className="easy-primary" disabled={!!busy} onClick={()=>void save(true)}>Yes, publish homepage</button></>:<><button type="button" disabled={!form||!!busy} onClick={()=>void save()}>Save draft</button><button type="button" className="easy-primary" disabled={!form||!!busy} onClick={()=>{if(form&&snapshot){const problem=validateHome(form,snapshot);if(problem){setError(problem);return}}setError('');setConfirmPublish(true)}}>Publish</button></>}</div></div>
      </main>
    </div>
  </div>
}

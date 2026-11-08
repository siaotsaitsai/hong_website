import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useClient} from 'sanity'
import type {UserViewComponent} from 'sanity/structure'
import {resolvePreview, type RawDocument} from '../shared/previewContent'
import type {Content} from '../web/src/lib/content'

const website = new URL('https://siaotsaitsai.github.io/hong_website/')
const routes: Record<string,string> = {siteSettings:'', portfolioSettings:'works/', artwork:'works/', collection:'works/', cvPage:'cv/', statementPage:'artist-statement/', artistProfile:'about/'}
const pages = [['','Home'],['works/','Portfolio'],['cv/','CV'],['artist-statement/','Artist Statement'],['about/','About']]
const types = ['siteSettings','portfolioSettings','artwork','collection','artistProfile','cvPage','statementPage','sanity.imageAsset']

export const WebsitePreview: UserViewComponent = ({document: editorDocument, schemaType}) => {
  const client = useClient({apiVersion:'2025-02-19'})
  const frame = useRef<HTMLIFrameElement>(null)
  const channel = useMemo(() => crypto.randomUUID(), [])
  const [route,setRoute] = useState(routes[schemaType.name] || '')
  useEffect(() => setRoute(routes[schemaType.name] || ''),[schemaType.name])
  const [mobile,setMobile] = useState(false)
  const [content,setContent] = useState<Content | null>(null)
  const [error,setError] = useState('')
  const [refresh,setRefresh] = useState(0)
  const [connected,setConnected] = useState(false)
  const [ready,setReady] = useState(false)
  const displayed = editorDocument.displayed
  const src = new URL(route,website)
  src.searchParams.set('studioPreview','1')
  src.searchParams.set('previewChannel',channel)
  const send = useCallback(() => {
    if (content) frame.current?.contentWindow?.postMessage({type:'portfolio:preview',channel,content},website.origin)
  },[content,channel])
  useEffect(() => {
    let active=true
    const timer=setTimeout(() => {
      client.withConfig({useCdn:false,perspective:'drafts'}).fetch<RawDocument[]>('*[_type in $types]',{types}).then(documents => {
        if (active) {setContent(resolvePreview(documents,displayed));setError('')}
      }).catch(() => {if(active) setError('Could not load preview content. Check that your account can read drafts, then try again.')})
    },400)
    return () => {active=false;clearTimeout(timer)}
  },[client,displayed,refresh])
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== website.origin || event.source !== frame.current?.contentWindow || event.data?.channel !== channel) return
      if(event.data.type==='portfolio:ready') {setReady(true);send()}
      if(event.data.type==='portfolio:rendered') setConnected(true)
    }
    window.addEventListener('message',receive)
    return () => window.removeEventListener('message',receive)
  },[send,channel])
  useEffect(() => {if(ready) send()},[send,ready])
  useEffect(() => {setConnected(false);setReady(false)},[route])
  return <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#eee',fontFamily:'inherit'}}>
    <div style={{padding:16,background:'white',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
      <label>Page <select aria-label="Preview page" value={route} onChange={event=>setRoute(event.target.value)}>{pages.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <button type="button" onClick={()=>setMobile(!mobile)}>{mobile?'Desktop width':'Mobile width'}</button>
      <button type="button" onClick={()=>setRefresh(value=>value+1)}>Refresh content</button>
      <a href={new URL(route,website).href} target="_blank" rel="noopener noreferrer">Open published website ↗</a>
      <small style={{width:'100%',lineHeight:1.6}}>Draft preview — changes here are not public. Click Publish in Edit when ready. Portfolio items can also be created directly from their reference fields.</small>
      <small role="status">{error || (connected?'Preview is up to date.':'Connecting preview… If it stays blank, refresh this tab after the website deployment completes.')}</small>
    </div>
    <iframe ref={frame} title="Website draft preview" src={src.href} onLoad={()=>{setConnected(false);send()}} style={{border:0,width:mobile?390:'100%',maxWidth:'100%',flex:1,margin:'0 auto',background:'white'}} />
  </div>
}

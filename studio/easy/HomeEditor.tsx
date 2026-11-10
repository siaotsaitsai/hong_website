import {websiteUrl} from '../../shared/websiteUrl'
import {useMemo,useState} from 'react'
import {useClient,useCurrentUser,useWorkspace} from 'sanity'
import {useRouter} from 'sanity/router'
import type {LayoutProps} from 'sanity'
import {PageEditorScreen} from './PageEditorScreen'
import {createPageGateway} from './pageGateway'
import {editorPages,type EditorPage} from './EditorNav'
import {canAccessEditor} from './editorAccess'

export function HomeEditor() {
  const client=useClient({apiVersion:'2025-02-19'})
  const user=useCurrentUser()
  const pages=useMemo(()=>createPageGateway(client),[client])
  const [page,setPage]=useState<EditorPage>(()=>{const value=new URLSearchParams(location.search).get('editorPage');return editorPages.find(([id])=>id===value)?.[0]||'home'})
  const navigate=(next:EditorPage)=>{setPage(next);const url=new URL(location.href);url.searchParams.set('editorPage',next);history.replaceState(history.state,'',url)}
  return <PageEditorScreen key={page} page={page} gateway={pages} userName={user?.name || 'Artist'} onNavigate={navigate}/>
}
export function EditorLayout(props: LayoutProps) {
  const user=useCurrentUser()
  const workspace=useWorkspace()
  useRouter() // Re-render when the tool changes through Studio navigation.
  if(!canAccessEditor(user?.id))return <div style={{padding:50,fontFamily:'Arial,sans-serif',background:'white',color:'#272b28'}}><h1>Private website editor</h1><p>This editor is available only to the two approved owner accounts.</p>{workspace.auth.logout&&<button type="button" onClick={()=>{void workspace.auth.logout!().then(()=>location.reload())}}>Sign out and use another account</button>}<p><a href={websiteUrl}>Return to website</a></p></div>
  return typeof window!=='undefined' && /\/edit\/?$/.test(window.location.pathname) ? <HomeEditor/> : props.renderDefault(props)
}

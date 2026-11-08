import {useMemo,useState} from 'react'
import {useClient,useCurrentUser} from 'sanity'
import {useRouter} from 'sanity/router'
import type {LayoutProps} from 'sanity'
import {createHomeGateway} from './homeGateway'
import {HomeEditorScreen} from './HomeEditorScreen'
import {PageEditorScreen} from './PageEditorScreen'
import {createPageGateway} from './pageGateway'
import type {EditorPage} from './EditorNav'

export function HomeEditor() {
  const client=useClient({apiVersion:'2025-02-19'})
  const user=useCurrentUser()
  const gateway=useMemo(()=>createHomeGateway(client),[client])
  const pages=useMemo(()=>createPageGateway(client),[client])
  const [page,setPage]=useState<EditorPage>('home')
  return page==='home'?<HomeEditorScreen gateway={gateway} userName={user?.name || 'Artist'} onNavigate={setPage}/>:<PageEditorScreen key={page} page={page} gateway={pages} userName={user?.name || 'Artist'} onNavigate={setPage}/>
}
export function EditorLayout(props: LayoutProps) {
  useRouter() // Re-render when the tool changes through Studio navigation.
  return typeof window!=='undefined' && /\/edit\/?$/.test(window.location.pathname) ? <HomeEditor/> : props.renderDefault(props)
}

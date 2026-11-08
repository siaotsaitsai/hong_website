import {useMemo} from 'react'
import {useClient,useCurrentUser} from 'sanity'
import type {LayoutProps} from 'sanity'
import {createHomeGateway} from './homeGateway'
import {HomeEditorScreen} from './HomeEditorScreen'

export function HomeEditor() {
  const client=useClient({apiVersion:'2025-02-19'})
  const user=useCurrentUser()
  const gateway=useMemo(()=>createHomeGateway(client),[client])
  return <HomeEditorScreen gateway={gateway} userName={user?.name || 'Artist'}/>
}
export function EditorLayout(props: LayoutProps) {
  return typeof window!=='undefined' && /^\/edit(?:\/|$)/.test(window.location.pathname) ? <HomeEditor/> : props.renderDefault(props)
}

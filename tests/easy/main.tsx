import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import {HomeEditorScreen} from '../../studio/easy/HomeEditorScreen'
import {snapshotFromDocuments,homeDocument,type HomeGateway,type HomeSnapshot} from '../../studio/easy/homeGateway'
import {PageEditorScreen} from '../../studio/easy/PageEditorScreen'
import {pageSnapshot,portfolioTargets,type PageGateway} from '../../studio/easy/pageGateway'
import type {EditorPage} from '../../studio/easy/EditorNav'
import type {RawDocument} from '../../shared/previewContent'

const published:RawDocument={_id:'siteSettings',_type:'siteSettings',_rev:'published-1',siteTitle:'Hong Yang',homeText:'Published welcome',homeCaption:'Published caption',heroArtwork:{_ref:'test-work'},portfolioLinkLabel:'Explore portfolio',description:'Keep this metadata'}
let docs:RawDocument[]=[published,{_id:'test-work',_type:'artwork',title:'A quiet afternoon',image:{alt:'A quiet painting',asset:{_ref:'test-asset'}},dimensions:'24 × 36 in'},{_id:'test-asset',_type:'sanity.imageAsset',url:'https://cdn.sanity.io/images/htq7wor5/production/test-asset.jpg'}]
const counters={saves:0,publishes:0,uploads:0}
Object.assign(window,{editorTest:counters})
const gateway:HomeGateway={
 async load(){return snapshotFromDocuments(docs)},
 async upload(){counters.uploads++;return {reference:'test-asset',url:'https://cdn.sanity.io/images/htq7wor5/production/test-asset.jpg'}},
 async save(form,snapshot){counters.saves++;if(new URLSearchParams(location.search).has('failSave'))throw Object.assign(new Error('Simulated conflict'),{statusCode:409});const draft={...homeDocument(form,snapshot.draft||snapshot.published),_rev:'draft-'+counters.saves};docs=[...docs.filter(doc=>doc._id!==draft._id),draft];return {...snapshotFromDocuments(docs),documents:[...docs,...snapshot.documents.filter(doc=>doc._type==='sanity.imageAsset')] }},
 async publish(_form,snapshot:HomeSnapshot){counters.publishes++;docs=[...docs.filter(doc=>doc._id!=='siteSettings'&&doc._id!=='drafts.siteSettings'),{...snapshot.draft!,_id:'siteSettings',_rev:'published-2'}];return snapshotFromDocuments(docs)},
}
const pages:PageGateway={
 async load(page){return pageSnapshot(page,docs)},
 upload:gateway.upload,
 async save(model,snapshot){counters.saves++;if(new URLSearchParams(location.search).has('failSave'))throw Object.assign(new Error('Simulated conflict'),{statusCode:409});const types=snapshot.page==='portfolio'?['portfolioSettings','collection','artwork']:[snapshot.model[({home:'siteSettings',cv:'cvPage',statement:'statementPage',about:'artistProfile'} as Record<string,string>)[snapshot.page]]._type];for(const doc of Object.values(model).filter(doc=>types.includes(doc._type))){const draft={...doc,_id:'drafts.'+doc._id,_rev:'draft-'+counters.saves};docs=[...docs.filter(row=>row._id!==draft._id),draft]}return pageSnapshot(snapshot.page,docs)},
 async publish(snapshot){counters.publishes++;const targets=snapshot.page==='portfolio'?portfolioTargets(snapshot.model):[({home:'siteSettings',cv:'cvPage',statement:'statementPage',about:'artistProfile'} as Record<string,string>)[snapshot.page]];for(const id of targets){const draft=docs.find(doc=>doc._id==='drafts.'+id);if(draft)docs=[...docs.filter(doc=>doc._id!==id&&doc._id!==draft._id),{...draft,_id:id,_rev:'published-'+counters.publishes}]}return pageSnapshot(snapshot.page,docs)},
}
function TestApp(){const [page,setPage]=useState<EditorPage>((new URLSearchParams(location.search).get('section') as EditorPage)||'home');return page==='home'&&!new URLSearchParams(location.search).has('visual')?<HomeEditorScreen gateway={gateway} userName="Test artist" previewUrl="http://127.0.0.1:4322/" onNavigate={setPage}/>:<PageEditorScreen key={page} page={page} initialVisual={new URLSearchParams(location.search).has('visual')} gateway={pages} userName="Test artist" onNavigate={setPage} previewBase="http://127.0.0.1:4322/"/>}
createRoot(document.getElementById('root')!).render(<TestApp/>)

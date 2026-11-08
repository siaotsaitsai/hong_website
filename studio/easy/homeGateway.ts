import type {SanityClient} from 'sanity'
import type {RawDocument} from '../../shared/previewContent'

export type HomeForm = {mode: 'image' | 'artwork'; image?: Record<string,unknown>; imageDescription: string; artworkId: string; caption: string; text: string; linkLabel: string}
export type HomeSnapshot = {documents: RawDocument[]; draft?: RawDocument; published?: RawDocument; form: HomeForm}
export interface HomeGateway {
  load(): Promise<HomeSnapshot>
  upload(file: File): Promise<{reference: string; url: string}>
  save(form: HomeForm, snapshot: HomeSnapshot): Promise<HomeSnapshot>
  publish(form: HomeForm, snapshot: HomeSnapshot): Promise<HomeSnapshot>
}
export const contentTypes=['siteSettings','portfolioSettings','artwork','collection','artistProfile','cvPage','statementPage','sanity.imageAsset']
const fields=(doc?: RawDocument) => Object.fromEntries(Object.entries(doc || {}).filter(([key])=>!key.startsWith('_')))
export function homeForm(doc?: RawDocument): HomeForm {
  const image=doc?.homeImage as Record<string,unknown>|undefined
  return {mode:image?'image':doc?.heroArtwork?'artwork':'image',image,imageDescription:String(image?.alt || ''),artworkId:String((doc?.heroArtwork as {_ref?:string})?._ref || ''),caption:String(doc?.homeCaption || ''),text:String(doc?.homeText || ''),linkLabel:String(doc?.portfolioLinkLabel ?? 'Explore portfolio')}
}
export function homeDocument(form: HomeForm, base?: RawDocument): RawDocument {
  const doc: RawDocument={...fields(base),_id:'drafts.siteSettings',_type:'siteSettings',siteTitle:base?.siteTitle || 'Hong Yang',homeCaption:form.caption,homeText:form.text,portfolioLinkLabel:form.linkLabel.trim() || 'Explore portfolio'}
  delete doc.homeImage;delete doc.heroArtwork
  if(form.mode==='image' && form.image) doc.homeImage={...form.image,alt:form.imageDescription.trim() || form.caption.trim() || 'Artwork by Hong Yang'}
  if(form.mode==='artwork' && form.artworkId) doc.heroArtwork={_type:'reference',_ref:form.artworkId}
  return doc
}
export function validateHome(form: HomeForm, snapshot: HomeSnapshot): string | null {
  if(form.mode==='artwork' && !form.artworkId) return 'Choose a published artwork or switch to Upload an image.'
  if(form.mode==='artwork' && !snapshot.documents.some(doc=>doc._id===form.artworkId && doc._type==='artwork')) return 'Publish the selected artwork in the advanced editor first, or upload an image.'
  return null
}
export function snapshotFromDocuments(documents: RawDocument[]): HomeSnapshot {
  const draft=documents.find(doc=>doc._id==='drafts.siteSettings')
  const published=documents.find(doc=>doc._id==='siteSettings')
  return {documents,draft,published,form:homeForm(draft || published)}
}
export function createHomeGateway(client: SanityClient): HomeGateway {
  const api=client.withConfig({apiVersion:'2025-02-19',perspective:'raw',useCdn:false})
  const load=async()=>snapshotFromDocuments(await api.fetch<RawDocument[]>('*[_type in $types && !(_id in path("versions.**"))]',{types:contentTypes}))
  async function save(form: HomeForm,snapshot: HomeSnapshot): Promise<HomeSnapshot> {
    const doc=homeDocument(form,snapshot.draft || snapshot.published)
    let saved: RawDocument
    if(snapshot.draft) {
      const patch=api.patch('drafts.siteSettings').ifRevisionId(String(snapshot.draft._rev)).set(fields(doc))
      const unset=['homeImage','heroArtwork'].filter(name=>!(name in doc))
      if(unset.length) patch.unset(unset)
      saved=await patch.commit() as RawDocument
    } else {
      // Create, rather than replace: another editor's new draft must produce a conflict.
      saved=await api.create(doc) as RawDocument
    }
    const documents=[...snapshot.documents.filter(doc=>doc._id!=='drafts.siteSettings'),saved]
    return {...snapshot,documents,draft:saved,form:homeForm(saved)}
  }
  return {
    load,
    async upload(file) {const asset=await api.assets.upload('image',file,{filename:file.name});return {reference:asset._id,url:asset.url}},
    save,
    async publish(form,snapshot) {
      const problem=validateHome(form,snapshot);if(problem) throw new Error(problem)
      const draft=snapshot.draft
      if(!draft) throw new Error('Save the draft before publishing.')
      const published={...fields(draft),_id:'siteSettings',_type:'siteSettings'}
      let tx=api.transaction().patch('drafts.siteSettings',p=>p.ifRevisionId(String(draft._rev)).set({siteTitle:draft.siteTitle}))
      // Check both revisions atomically, so publishing cannot overwrite another member.
      if(snapshot.published) tx=tx.patch('siteSettings',p=>p.ifRevisionId(String(snapshot.published!._rev)).set({siteTitle:draft.siteTitle})).createOrReplace(published)
      else tx=tx.create(published)
      await tx.delete('drafts.siteSettings').commit()
      return load()
    },
  }
}

import type {Artwork, Collection, Content, Image, Profile} from '../web/src/lib/content'
export type RawDocument = Record<string, unknown> & {_id: string; _type: string}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const text = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined
const canonical = (id: string) => id.replace(/^drafts\./, '')

// Resolve authenticated editor documents in memory. Nothing here writes to Sanity.
export function resolvePreview(documents: RawDocument[], displayed?: Partial<RawDocument>): Content {
  const docs = new Map<string, RawDocument>()
  for (const doc of documents) {
    const previous=docs.get(canonical(doc._id))
    if(!previous?._id.startsWith('drafts.') || doc._id.startsWith('drafts.')) docs.set(canonical(doc._id),doc)
  }
  if (displayed?._id && displayed._type) docs.set(canonical(displayed._id), displayed as RawDocument)
  const dereference = (value: unknown) => docs.get(canonical(String(object(value)._ref || '')))
  function image(value: unknown): Image | undefined {
    const data = object(value)
    const asset = dereference(data.asset) || object(data.asset)
    const url = text(asset.url)
    return url ? {alt: text(data.alt), asset: {url}} : undefined
  }
  function artwork(doc?: RawDocument): Artwork | undefined {
    if (!doc || doc._type !== 'artwork') return undefined
    return {_id: canonical(doc._id), title: text(doc.title) || 'Untitled work', year: text(doc.year), medium: text(doc.medium), dimensions: text(doc.dimensions), description: text(doc.description), image: image(doc.image), additionalImages: list(doc.additionalImages).map(image).filter((img): img is Image => !!img)}
  }
  function collection(doc?: RawDocument): Collection | undefined {
    if (!doc || doc._type !== 'collection') return undefined
    return {_id: canonical(doc._id), title: text(doc.title) || 'Untitled collection', description: text(doc.description), showDescription: doc.showDescription === true, artworks: list(doc.artworks).map(ref => artwork(dereference(ref))).filter((art): art is Artwork => !!art)}
  }
  const refs = (value: unknown) => list(value).map(ref => collection(dereference(ref))).filter((col): col is Collection => !!col)
  const settings = docs.get('siteSettings')
  const profile = docs.get('artistProfile')
  const portfolio = docs.get('portfolioSettings')
  const cv = docs.get('cvPage')
  const statement = docs.get('statementPage')
  const content: Content = {
    settings: settings ? {siteTitle: text(settings.siteTitle), description: text(settings.description), heroArtwork: artwork(dereference(settings.heroArtwork)), homeImage: image(settings.homeImage), homeCaption: text(settings.homeCaption), homeText: text(settings.homeText), portfolioLinkLabel: text(settings.portfolioLinkLabel), collections: settings.collections === undefined ? undefined : refs(settings.collections)} : null,
    profile: profile ? {name: text(profile.name), introduction: text(profile.introduction), portrait: image(profile.portrait), statement: list(profile.statement) as Profile['statement'], cv: list(profile.cv) as Profile['cv']} : null,
    portfolio: portfolio ? {collections: refs(portfolio.collections)} : null,
    cvPage: cv ? {entries: list(cv.entries) as NonNullable<Profile['cv']>} : null,
    statementPage: statement ? {body: list(statement.body) as NonNullable<Profile['statement']>} : null,
    artworks: [...docs.values()].filter(doc => doc._type === 'artwork').sort((a,b) => String(b.year || '').localeCompare(String(a.year || '')) || String(a.title || '').localeCompare(String(b.title || ''))).map(doc => artwork(doc)!),
    collections: [...docs.values()].filter(doc => doc._type === 'collection').sort((a,b) => String(a.title || '').localeCompare(String(b.title || ''))).map(doc => collection(doc)!),
  }
  // Individual item previews show the item even before it has been added to a collection.
  if (displayed?._type === 'artwork') {
    const work = artwork(docs.get(canonical(displayed._id || '')))
    content.portfolio = {collections: work ? [{_id:'preview-item',title:'Artwork preview',artworks:[work]}] : []}
  }
  if (displayed?._type === 'collection') {
    const selected = collection(docs.get(canonical(displayed._id || '')))
    content.portfolio = {collections: selected ? [selected] : []}
  }
  return content
}

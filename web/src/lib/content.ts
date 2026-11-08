export type Image = {alt?: string; asset?: {url: string}};
export type Artwork = {_id: string; title: string; year?: string; medium?: string; dimensions?: string; description?: string; image?: Image; additionalImages?: Image[]};
export type Collection = {_id: string; title: string; description?: string; artworks: Artwork[]};
export type Profile = {name?: string; introduction?: string; portrait?: Image; statement?: {_type: string; style?: string; children?: {text: string; marks?: string[]}[]}[]; cv?: {category: string; year?: string; title: string}[]};
export type Content = {settings: {siteTitle?: string; description?: string; heroArtwork?: Artwork; collections?: Collection[]; email?: string; instagram?: string} | null; profile: Profile | null; artworks: Artwork[]; collections: Collection[]};
export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const art = (id: string, title: string, file: string): Artwork => ({_id: id, title, year: '2026', medium: 'Sample composition', dimensions: 'Placeholder artwork', image: {alt: `${title}, an abstract composition of colored shapes`, asset: {url: `${base}art/${file}.svg`}}, description: 'A sample composition for the portfolio layout.'});
const samples = [art('sample-1', 'An Open Window', 'window'), art('sample-2', 'Quiet Arrangement', 'still-life'), art('sample-3', 'Where the Light Falls', 'light'), art('sample-4', 'A Place Remembered', 'landscape')];
export const placeholder: Content = {settings: {heroArtwork: samples[0]}, profile: {name: 'Hong Yang', introduction: 'Working between observation and imagination, I explore the quiet relationships between color, place, and memory.', statement: [{_type: 'block', children: [{text: 'This space will become a collection of paintings, studies, and the thoughts that accompany them. A place to look closely, to notice small things, and to follow a work as it unfolds.'}]}]}, artworks: samples, collections: [{_id: 'sample-color', title: 'Notes on Color', description: 'A sample collection of shapes, spaces, and everyday observations.', artworks: samples.slice(0, 2)}, {_id: 'sample-place', title: 'A Sense of Place', description: 'Studies in light and remembered landscapes.', artworks: samples.slice(2)}]};
const imageProjection = '{alt,asset->{url}}';
const artworkProjection = `{_id,title,year,medium,dimensions,description,image${imageProjection},additionalImages[]${imageProjection}}`;
const collectionProjection = `{_id,title,description,artworks[]->${artworkProjection}}`;
export const query = `{"settings":*[_type=="siteSettings" && _id=="siteSettings"][0]{siteTitle,description,email,instagram,heroArtwork->${artworkProjection},collections[]->${collectionProjection}},"profile":*[_type=="artistProfile" && _id=="artistProfile"][0]{name,introduction,portrait${imageProjection},statement,cv},"artworks":*[_type=="artwork"]|order(year desc,title asc)${artworkProjection},"collections":*[_type=="collection"]|order(title asc)${collectionProjection}}`;
export async function loadContent(): Promise<Content> {
  const project = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'htq7wor5';
  const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';
  const url = new URL(`https://${project}.api.sanity.io/v2025-02-19/data/query/${dataset}`);
  url.searchParams.set('query', query);
  url.searchParams.set('perspective', 'published');
  const response = await fetch(url, {signal: AbortSignal.timeout(10000), credentials: 'omit', cache: 'no-store'});
  if (!response.ok) throw new Error(`Content request failed (${response.status})`);
  const payload = await response.json();
  if (!payload.result || !Array.isArray(payload.result.artworks) || !Array.isArray(payload.result.collections)) throw new Error('Invalid content response');
  return payload.result;
}
export function isEmpty(content: Content) {return !content.profile && !content.settings && !content.artworks.length && !content.collections.length;}
export function escapeHtml(value: unknown): string {return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function imageUrl(image?: Image, width = 1200): string {
  const value = image?.asset?.url || '';
  if (value.startsWith(`${base}art/`) && /^[a-z-]+\.svg$/.test(value.slice(`${base}art/`.length))) return value;
  try {const url = new URL(value); if (url.protocol !== 'https:' || url.hostname !== 'cdn.sanity.io') return ''; url.searchParams.set('w', String(width));url.searchParams.set('fit','max');url.searchParams.set('auto','format');return url.href;} catch {return '';}
}

import {escapeHtml as e, imageUrl, formatDimensions, isEmpty, loadContent, placeholder, type Artwork, type Content, type Image} from './content';
const menu = document.querySelector<HTMLButtonElement>('.menu-toggle')!;
const nav = document.querySelector<HTMLElement>('#navigation')!;
function closeMenu() {menu.setAttribute('aria-expanded', 'false');nav.classList.remove('open');}
menu.addEventListener('click', () => {const open = menu.getAttribute('aria-expanded') !== 'true';menu.setAttribute('aria-expanded', String(open));nav.classList.toggle('open',open);});
nav.addEventListener('click', ev => {if ((ev.target as Element).closest('a')) closeMenu();});
document.addEventListener('keydown', ev => {if (ev.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {closeMenu();menu.focus();}});
const dialog = document.querySelector<HTMLDialogElement>('#artwork-dialog')!;
const largeImage = document.querySelector<HTMLImageElement>('#lightbox-image')!;
let gallery: Artwork[] = [];let current = 0;let detailIndex = 0;
function picture(image: Image | undefined, lazy = true) {const src = imageUrl(image);return src ? `<img src="${e(src)}" alt="${e(image?.alt || 'Artwork')}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"/>` : '<div class="missing-image">Image coming soon</div>';}
function artworkButton(work: Artwork, lazy = true) {const index = gallery.push(work)-1;return `<button class="artwork-button" data-artwork="${index}" aria-label="View ${e(work.title)}">${picture(work.image,lazy)}<span class="artwork-open" aria-hidden="true"><svg class="arrow" aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="M3 13 13 3M3 3h10v10" stroke="currentColor" stroke-width="1.2"/></svg></span></button>`;}
function setText(selector: string, text: string) {document.querySelector(selector)!.textContent=text;}
function showArtwork(index: number, imageIndex = 0) {
  current = (index + gallery.length) % gallery.length;detailIndex = imageIndex;
  const art = gallery[current];const images = [art.image,...(art.additionalImages || [])].filter(Boolean) as Image[];
  const image = images[detailIndex] || art.image;
  document.querySelector('#image-error')!.setAttribute('hidden','');
  largeImage.src=imageUrl(image,2400);largeImage.alt=image?.alt || art.title;
  setText('#lightbox-title',art.title);setText('#lightbox-details',[art.year,art.medium,formatDimensions(art.dimensions)].filter(Boolean).join(' · '));setText('#lightbox-description',art.description || '');
  setText('#lightbox-count',`${current+1} / ${gallery.length}${images.length > 1 ? ` · Image ${detailIndex+1} of ${images.length}` : ''}`);
  document.querySelector('#detail-controls')?.remove();
  if (images.length > 1) {const controls=document.createElement('div');controls.id='detail-controls';controls.className='detail-controls';images.forEach((_,i)=>{const button=document.createElement('button');button.textContent=i===0?'Main image':`Detail ${i}`;button.setAttribute('aria-pressed',String(i===detailIndex));button.onclick=()=>showArtwork(current,i);controls.append(button);});document.querySelector('.lightbox-bottom')!.append(controls);}
}
largeImage.addEventListener('error',()=>document.querySelector('#image-error')!.removeAttribute('hidden'));
document.addEventListener('click', ev => {const button=(ev.target as Element).closest<HTMLElement>('[data-artwork]');if (!button) return;showArtwork(Number(button.dataset.artwork));dialog.showModal();document.body.classList.add('modal-open');});
const close = () => dialog.close();
document.querySelector('#lightbox-close')!.addEventListener('click',close);
dialog.addEventListener('click',ev=>{if(ev.target===dialog) close();});
dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
document.querySelector('#lightbox-prev')!.addEventListener('click',()=>showArtwork(current-1));
document.querySelector('#lightbox-next')!.addEventListener('click',()=>showArtwork(current+1));
dialog.addEventListener('keydown',ev=>{if(ev.key==='ArrowLeft'){ev.preventDefault();showArtwork(current-1);}if(ev.key==='ArrowRight'){ev.preventDefault();showArtwork(current+1);}});
function render(content: Content, sample: boolean) {
  gallery=[];
  const settings=content.settings;const profile=content.profile;
  const name=profile?.name || 'Hong Yang';document.querySelectorAll('[data-artist-name]').forEach(el=>{el.textContent=name;if(el.classList.contains('wordmark'))el.setAttribute('aria-label',`${name}, home`);});
  const pageTitles: Record<string,string> = {works:'Portfolio', cv:'CV', statement:'Artist Statement', about:'About'};
  document.title=`${document.body.dataset.page==='home' ? (settings?.siteTitle || 'Home') : (pageTitles[document.body.dataset.page || ''] || 'Home')} — ${name}`;
  if(settings?.description) document.querySelector('meta[name="description"]')?.setAttribute('content',settings.description);
  let collections=content.portfolio ? (content.portfolio.collections || []) : (settings?.collections ?? content.collections);
  collections=collections.filter(Boolean).map(col=>({...col,artworks:(col.artworks || []).filter(Boolean)}));
  if (!collections.length && content.artworks.length && !settings?.collections && !content.portfolio) collections=[{_id:'all',title:'Collected Works',artworks:content.artworks}];
  const seriesNav=document.querySelector('#series-nav')!;seriesNav.innerHTML=document.body.dataset.page==='works' ? collections.map((col,i)=>`<a href="#series-${i}">${e(col.title)}</a>`).join('') : '';
  const home=document.querySelector('#home-artwork');
  if(home) {const homeWork=settings?.homeImage?.asset?.url ? {_id:'homepage-image',title:settings.homeCaption || '',image:settings.homeImage,description:settings.homeText} : (settings?.heroArtwork || content.artworks[0]);const featured=homeWork && settings?.homeCaption ? {...homeWork,title:settings.homeCaption} : homeWork;home.innerHTML=featured ? `<figure class="hero-figure">${artworkButton(featured,false)}<figcaption><span>${e(featured.title)} <span class="muted">${e(featured.year)}</span></span>${!sample && featured.medium ? `<span class="muted">${e(featured.medium)}</span>` : ''}</figcaption></figure>` : '<p class="empty-state">New work is on its way.</p>';}
  const works=document.querySelector('#works-content');
  if(works) works.innerHTML=collections.length ? collections.map((col,i)=>`<section class="collection-section" id="series-${i}"><div class="collection-heading"><h2>${e(col.title)}</h2>${!sample && col.showDescription && col.description ? `<p>${e(col.description)}</p>` : ''}</div><div class="artwork-grid">${col.artworks.map(art=>`<figure>${artworkButton(art)}<figcaption><span>${e(art.title)}</span>${art.year ? `<span class="muted">${e(art.year)}</span>` : ''}<span class="muted artwork-dimensions">${e(formatDimensions(art.dimensions) || 'Dimensions to be added')}</span></figcaption></figure>`).join('') || '<p>No works in this series yet.</p>'}</div></section>`).join('') : '<p class="empty-state">New work is on its way. Please visit again soon.</p>';
  const about=document.querySelector('#about-content');
  const statement=(content.statementPage ? (content.statementPage.body || []) : (profile?.statement || [])).filter(block=>block._type==='block').map(block=>{const tag=block.style==='h2'?'h2':'p';return `<${tag}>${(block.children || []).map(child=>{let text=e(child.text);if(child.marks?.includes('strong')) text=`<strong>${text}</strong>`;if(child.marks?.includes('em'))text=`<em>${text}</em>`;return text;}).join('')}</${tag}>`;}).join('');
  if(about) {about.innerHTML=`<div class="about-layout"><div class="about-image">${profile?.portrait ? picture(profile.portrait,false) : `<img src="${e(imageUrl(placeholder.artworks[1].image))}" alt="Sample abstract still life in warm colors"/>`}</div><div class="about-copy"><span class="eyebrow">${e(name)}</span><h2>${e(profile?.introduction || 'An ongoing practice in painting and observation.')}</h2></div></div>`; }
  const statementPage=document.querySelector('#statement-content');
  if(statementPage) statementPage.innerHTML=`<div class="statement statement-page">${statement || '<p>Artist statement coming soon.</p>'}</div>`;
  const cvPage=document.querySelector('#cv-content');
  const cvEntries=content.cvPage ? (content.cvPage.entries || []) : (profile?.cv || []);
  if(cvPage) cvPage.innerHTML=cvEntries.length ? `<section class="cv">${cvEntries.map(item=>`<div><span class="eyebrow">${e(item.category)}</span><span>${e(item.year)}</span><p>${e(item.title)}</p></div>`).join('')}</section>` : '<p class="empty-state">CV coming soon.</p>';
  const homeText=document.querySelector<HTMLElement>('#home-text');
  if(homeText) {homeText.textContent=settings?.homeText || '';homeText.hidden=!settings?.homeText;}
  const linkLabel=document.querySelector('#portfolio-link-label');if(linkLabel) linkLabel.textContent=settings?.portfolioLinkLabel ?? 'Explore portfolio';
  document.querySelectorAll('[aria-busy]').forEach(el=>el.setAttribute('aria-busy','false'));
}
const params=new URLSearchParams(location.search);
const previewChannel=params.get('previewChannel');
const previewOrigins=new Set(['https://hong-portfolio-htq7wor5.sanity.studio','https://www.sanity.io','http://localhost:3333','http://127.0.0.1:3333']);
if(params.get('studioPreview')==='1' && previewChannel && window.parent!==window) {
  const status=document.querySelector<HTMLElement>('#content-status')!;
  status.hidden=false;status.textContent='Draft preview — waiting for the editor.';
  window.addEventListener('message',(event:MessageEvent)=>{
    if(event.source!==window.parent || !previewOrigins.has(event.origin) || event.data?.type!=='portfolio:preview' || event.data?.channel!==previewChannel) return;
    const content=event.data.content as Content;
    if(!content || !Array.isArray(content.artworks) || !Array.isArray(content.collections)) return;
    render(isEmpty(content)?placeholder:content,isEmpty(content));status.textContent='Draft preview — not published.';
    window.parent.postMessage({type:'portfolio:rendered',channel:previewChannel},event.origin);
  });
  // A ready notification contains no content or credentials.
  window.parent.postMessage({type:'portfolio:ready',channel:previewChannel},'*');
  document.addEventListener('click',event=>{
    const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if(!link || link.origin!==location.origin || link.getAttribute('href')?.startsWith('#')) return;
    const url=new URL(link.href);url.searchParams.set('studioPreview','1');url.searchParams.set('previewChannel',previewChannel);link.href=url.href;
  },true);
} else {
  render(placeholder,true);
  loadContent().then(content=>{render(isEmpty(content)?placeholder:content,isEmpty(content));}).catch(()=>{
    const status=document.querySelector<HTMLElement>('#content-status')!;status.hidden=false;status.innerHTML='The latest work is temporarily unavailable. You are viewing a sample collection. <button type="button">Try again</button>';status.querySelector('button')!.onclick=()=>location.reload();
  });
}

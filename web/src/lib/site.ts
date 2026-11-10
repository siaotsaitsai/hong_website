import {aboutContacts,instagramHref,emailHref} from '../../../shared/aboutContacts';
import {paintingsLinkLabel} from '../../../shared/navigationLabels';
import {artworkMedium} from '../../../shared/artworkMedium';
import {richTextHtml} from '../../../shared/portableText';
import {escapeHtml as e, imageUrl, formatDimensions, isEmpty, loadContent, placeholder, type Artwork, type Content, type Image} from './content';
import {createOnPageEditing} from './onPageEditing';
const onPageEditor=createOnPageEditing();
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
function artworkButton(work: Artwork, lazy = true, editId=work._id, editField='image') {const index = gallery.push(work)-1;return `<button class="artwork-button" data-edit-image-id="${e(editId)}" data-edit-image-field="${e(editField)}" data-artwork="${index}" aria-label="View ${e(work.title)}">${picture(work.image,lazy)}<span class="artwork-open" aria-hidden="true"><svg width="11" height="11" class="arrow" aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="M3 13 13 3M3 3h10v10" stroke="currentColor" stroke-width="1.2"/></svg></span></button>`;}
function setText(selector: string, text: string) {document.querySelector(selector)!.textContent=text;}
function showArtwork(index: number, imageIndex = 0) {
  current = (index + gallery.length) % gallery.length;detailIndex = imageIndex;
  const art = gallery[current];const images = [art.image,...(art.additionalImages || [])].filter(Boolean) as Image[];
  const image = images[detailIndex] || art.image;
  document.querySelector('#image-error')!.setAttribute('hidden','');
  largeImage.src=imageUrl(image,2400);largeImage.alt=image?.alt || art.title;
  setText('#lightbox-title',art.title);setText('#lightbox-details',[art.year,artworkMedium(art.medium),formatDimensions(art.dimensions)].filter(Boolean).join(' · '));setText('#lightbox-description',art.description || '');
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
  const pageTitles: Record<string,string> = {works:'Paintings', cv:'CV', statement:'Artist Statement', about:'About'};
  document.title=`${document.body.dataset.page==='home' ? (settings?.siteTitle || 'Home') : (pageTitles[document.body.dataset.page || ''] || 'Home')} — ${name}`;
  // Keep link-preview descriptions empty, including when legacy CMS copy exists.
  document.querySelector('meta[name="description"]')?.setAttribute('content','');
  let collections=content.portfolio ? (content.portfolio.collections || []) : (settings?.collections ?? content.collections);
  collections=collections.filter(Boolean).map(col=>({...col,artworks:(col.artworks || []).filter(Boolean)}));
  if (!collections.length && content.artworks.length && !settings?.collections && !content.portfolio) collections=[{_id:'all',title:'Collected Works',artworks:content.artworks}];
  const seriesNav=document.querySelector('#series-nav')!;seriesNav.innerHTML=document.body.dataset.page==='works' ? collections.map((col,i)=>`<a href="#series-${i}">${e(col.title)}</a>`).join('') : '';
  const home=document.querySelector('#home-artwork');
  if(home) {const homeWork=settings?.homeImage?.asset?.url ? {_id:'homepage-image',title:settings.homeCaption || '',image:settings.homeImage,description:settings.homeText} : (settings?.heroArtwork || content.artworks[0]);const featured=homeWork && settings?.homeCaption ? {...homeWork,title:settings.homeCaption} : homeWork;home.innerHTML=featured ? `<figure class="hero-figure">${artworkButton(featured,false,'siteSettings','homeImage')}<figcaption><span><span data-edit-id="siteSettings" data-edit-field="homeCaption" data-edit-value="${e(settings?.homeCaption)}" data-edit-label="Homepage caption" data-edit-placeholder="Click to add a caption">${e(featured.title)}</span> <span class="muted">${e(featured.year)}</span></span>${!sample && featured.medium ? `<span class="muted">${e(featured.medium)}</span>` : ''}</figcaption></figure>` : '<p class="empty-state">New work is on its way.</p>';}
  const works=document.querySelector('#works-content');
  if(works) works.innerHTML=collections.length ? collections.map((col,i)=>`<section class="collection-section" data-edit-collection-id="${e(col._id)}" id="series-${i}"><div class="collection-heading"><h2 data-edit-id="${e(col._id)}" data-edit-field="title" data-edit-value="${e(col.title)}" data-edit-label="Collection title">${e(col.title)}</h2>${!sample && col.showDescription && col.description ? `<p>${e(col.description)}</p>` : ''}</div><div class="artwork-grid">${col.artworks.map((art,workIndex)=>`<figure data-edit-work-id="${e(art._id)}" data-edit-work-index="${workIndex}" data-edit-work-collection="${e(col._id)}">${artworkButton(art)}<figcaption><span data-edit-id="${e(art._id)}" data-edit-field="title" data-edit-value="${e(art.title)}" data-edit-label="Artwork title">${e(art.title)}</span><span class="muted artwork-year" data-edit-id="${e(art._id)}" data-edit-field="year" data-edit-value="${e(art.year)}" data-edit-label="Artwork year" data-edit-placeholder="Click to add year">${e(art.year || 'Year to be added')}</span><span class="muted artwork-medium" data-edit-id="${e(art._id)}" data-edit-field="medium" data-edit-value="${e(artworkMedium(art.medium))}" data-edit-label="Artwork medium" data-edit-placeholder="Click to add medium">${e(artworkMedium(art.medium))}</span><span class="muted artwork-dimensions" data-edit-id="${e(art._id)}" data-edit-field="dimensions" data-edit-value="${e(art.dimensions)}" data-edit-label="Artwork dimensions (inches by default)">${e(formatDimensions(art.dimensions) || 'Dimensions to be added')}</span></figcaption></figure>`).join('') || '<p>No works in this series yet.</p>'}</div></section>`).join('') : '<p class="empty-state">New work is on its way. Please visit again soon.</p>';
  const about=document.querySelector('#about-content');
  const statementBlocks=content.statementPage ? (content.statementPage.body || []) : (profile?.statement || []);
  const statement=statementBlocks.filter(block=>block._type==='block').map(block=>{const tag=block.style==='h2'?'h2':'p';return `<${tag}>${(block.children || []).map(child=>{let text=e(child.text);if(child.marks?.includes('strong')) text=`<strong>${text}</strong>`;if(child.marks?.includes('em'))text=`<em>${text}</em>`;return text;}).join('')}</${tag}>`;}).join('');
  const contacts=aboutContacts(profile,settings),instagram=instagramHref(contacts.instagram),email=emailHref(contacts.email);
  const aboutContactButtons=instagram||email?`<div class="about-contacts" aria-label="Contact Hong Yang">${instagram?`<a href="${e(instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".75" fill="currentColor"/></svg></a>`:''}${email?`<a href="${e(email)}" aria-label="Email" title="Email"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg></a>`:''}</div>`:'';
  if(about) {about.innerHTML=`<div class="about-layout ${!profile?.portrait && !sample ? 'about-text-only' : ''}">${profile?.portrait || sample ? `<div class="about-image" data-edit-image-id="artistProfile" data-edit-image-field="portrait">${profile?.portrait ? picture(profile.portrait,false) : `<img src="${e(imageUrl(placeholder.artworks[1].image))}" alt="Sample abstract still life in warm colors"/>`}</div>` : ''}<div class="about-copy"><p data-edit-id="artistProfile" data-edit-field="introduction" data-edit-value="${e(profile?.introduction)}" data-edit-multiline="true" data-edit-label="Biography">${e(profile?.introduction || 'An ongoing practice in painting and observation.')}</p>${aboutContactButtons}</div></div>`; }
  const statementPage=document.querySelector('#statement-content');
  if(statementPage) statementPage.innerHTML=`<div class="statement statement-page" data-edit-id="statementPage" data-edit-field="body" data-edit-rich="true" data-edit-multiline="true" data-edit-value="${e(JSON.stringify(statementBlocks))}" data-edit-label="Artist statement">${statement || '<p>Artist statement coming soon.</p>'}</div>`;
  const cvPage=document.querySelector('#cv-content');
  const cvEntries=content.cvPage ? (content.cvPage.entries || []) : (profile?.cv || []);
  if(cvPage) cvPage.innerHTML=Array.isArray(content.cvPage?.body)?`<div class="statement cv-text" data-edit-id="cvPage" data-edit-field="body" data-edit-rich="true" data-edit-multiline="true" data-edit-value="${e(JSON.stringify(content.cvPage.body))}" data-edit-label="CV text">${richTextHtml(content.cvPage.body)||'<p></p>'}</div>`:cvEntries.length ? `<section class="cv">${cvEntries.map((item,i)=>`<div data-cv-key="${e(item._key??i)}"><span class="eyebrow" data-edit-id="cvPage" data-edit-field="cv.category" data-edit-key="${e(item._key??i)}" data-edit-select="true" data-edit-value="${e(item.category)}" data-edit-label="CV category">${e(item.category)}</span><span data-edit-id="cvPage" data-edit-field="cv.year" data-edit-key="${e(item._key??i)}" data-edit-value="${e(item.year)}" data-edit-label="CV year" data-edit-placeholder="Year">${e(item.year)}</span><p data-edit-id="cvPage" data-edit-field="cv.title" data-edit-key="${e(item._key??i)}" data-edit-value="${e(item.title)}" data-edit-label="CV title and location">${e(item.title)}</p></div>`).join('')}</section>` : '<p class="empty-state">CV coming soon.</p>';
  const homeText=document.querySelector<HTMLElement>('#home-text');
  if(homeText) {homeText.textContent=settings?.homeText || '';homeText.hidden=!settings?.homeText;}
  const linkLabel=document.querySelector('#portfolio-link-label');if(linkLabel){linkLabel.textContent=paintingsLinkLabel(settings?.portfolioLinkLabel);Object.assign((linkLabel as HTMLElement).dataset,{editId:'siteSettings',editField:'portfolioLinkLabel',editValue:paintingsLinkLabel(settings?.portfolioLinkLabel),editLabel:'Paintings button text'});}
  document.querySelectorAll('[aria-busy]').forEach(el=>el.setAttribute('aria-busy','false'));
}
const params=new URLSearchParams(location.search);
const previewChannel=params.get('previewChannel');
const previewOrigins=new Set(['https://hong-portfolio-htq7wor5.sanity.studio','https://www.sanity.io','http://localhost:3333','http://127.0.0.1:3333']);
if(params.get('studioPreview')==='1' && previewChannel && window.parent!==window) {
  const status=document.querySelector<HTMLElement>('#content-status')!;
  status.hidden=false;status.textContent='Draft preview — waiting for the editor.';
  window.addEventListener('message',(event:MessageEvent)=>{
    if(event.source!==window.parent || !previewOrigins.has(event.origin) || event.data?.channel!==previewChannel) return;
    if(event.data.type==='portfolio:flush') {const edits=onPageEditor.flush();window.parent.postMessage({type:'portfolio:flushed',channel:previewChannel,requestId:event.data.requestId,edits},event.origin);return;}
    if(event.data.type!=='portfolio:preview')return;
    onPageEditor.configure({enabled:event.data.mode==='edit',busy:!!event.data.busy,origin:event.origin,channel:previewChannel,capabilities:event.data.capabilities});
    const content=event.data.content as Content;
    if(!content || !Array.isArray(content.artworks) || !Array.isArray(content.collections)) return;
    if(!onPageEditor.isActive()){const scroll=window.scrollY;render(isEmpty(content)?placeholder:content,isEmpty(content));onPageEditor.decorate();window.scrollTo(0,scroll);}
    status.textContent=event.data.mode==='edit'?'Edit mode — click images or text to make changes. Changes are drafts.':'Draft preview — not published.';
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
  const pendingSections=Array.from(document.querySelectorAll<HTMLElement>('[aria-busy="true"]'));
  pendingSections.forEach(section=>{section.innerHTML='<p class="content-loading">Loading…</p>';});
  loadContent().then(content=>{render(isEmpty(content)?placeholder:content,isEmpty(content));}).catch(()=>{
    pendingSections.forEach(section=>{section.replaceChildren();section.setAttribute('aria-busy','false');});
    const status=document.querySelector<HTMLElement>('#content-status')!;status.hidden=false;status.innerHTML='The latest work is temporarily unavailable. <button type="button">Try again</button>';status.querySelector('button')!.onclick=()=>location.reload();
  });
}

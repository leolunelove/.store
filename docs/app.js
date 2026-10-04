import { PRODUCTS, FEATURED_PRODUCTS } from './catalog.js?v=17';
import { amountInPennies, fileOptions, filterProducts, liveSupportLink, printGuide, shareArtwork, adjacentArtwork } from './store-utils.js?v=16';
import { createTracker } from './analytics.js?v=12';
const $ = selector => document.querySelector(selector);
const apiBaseUrl = String(window.LEO_LUNE_CONFIG?.apiBaseUrl || '').replace(/\/$/, '');
const supportPaymentLink = liveSupportLink(window.LEO_LUNE_CONFIG?.supportPaymentLink);
const contactDialog = $('#contact-dialog'), contactForm = $('#contact-form');
const contactEndpoint = String(window.LEO_LUNE_CONFIG?.contactEndpoint || '');
let contactId = '', contactPayload = '';
document.querySelectorAll('[data-ask-leo]').forEach(button=>button.addEventListener('click',()=>{
  $('#contact-artwork').value = dialog.open && selectedProduct ? selectedProduct.title : 'General enquiry';
  $('#contact-status').textContent = contactEndpoint ? '' : 'The form is being connected. For now, copy my email below.';
  $('#send-contact').disabled = !contactEndpoint;
  contactDialog.showModal();
}));
$('#close-contact').addEventListener('click',()=>contactDialog.close());
$('#copy-email').addEventListener('click',async()=>{
  try { await navigator.clipboard.writeText($('#contact-email').value); $('#contact-status').textContent='Email copied.'; }
  catch { $('#contact-email').select(); $('#contact-status').textContent='Select and copy my email.'; }
});
contactForm.addEventListener('submit',async event=>{
  event.preventDefault(); if (!contactEndpoint || !contactForm.reportValidity()) return;
  const data=Object.fromEntries(new FormData(contactForm));
  const payload=JSON.stringify(data);
  if (payload!==contactPayload) { contactId=crypto.randomUUID(); contactPayload=payload; }
  $('#send-contact').disabled=true; $('#contact-status').textContent='Sending…';
  try {
    const response=await fetch(contactEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestId:contactId}),signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(response.status===429?'Too many attempts. Give it a minute, then try again.':'Could not send. Try again, or copy my email below.');
    if ((await response.json()).sent !== true) throw new Error('Could not confirm sending. Retry safely, or copy my email below.');
    $('#contact-status').textContent="Sent. I'll reply to your email.";
    contactForm.elements.message.value=''; contactId=''; contactPayload='';
  } catch(error) { $('#contact-status').textContent=error.name==='TimeoutError'?'Sending timed out. Retry safely, or copy my email below.':error.message; }
  finally { $('#send-contact').disabled=false; }
});
const rootUrl = new URL('./', document.baseURI);
const dialog = $('#purchase-dialog'), viewer = $('#art-viewer'), form = $('#purchase-form');
const directEntry = Boolean(document.body.dataset.artwork);
const track = createTracker(window.LEO_LUNE_CONFIG?.analyticsEndpoint);
let browsingProducts = FEATURED_PRODUCTS;
let lastViewedId = null;
function currentCollection() { return filterProducts(FEATURED_PRODUCTS, { category, query: $('#search').value, sort: $('#sort').value }); }
let selectedProduct = null, selectedAmount = 0, category = 'all';
let toastTimer, checkoutAbort, checkoutIntent = '', requestId = '', opener;
$('#year').textContent = new Date().getFullYear();
$('#catalog-count').textContent = `${PRODUCTS.length} PIECES`;
document.querySelectorAll('[data-count]').forEach(el => {
  el.textContent = String(PRODUCTS.filter(p=>el.dataset.count === 'all' || p.category === el.dataset.count).length).padStart(2, '0');
});
if (!apiBaseUrl) {
  $('#amount-fieldset').hidden = true;
  $('#support-copy').textContent = supportPaymentLink ? "Free. Pay what it's worth to you." : 'Free to download.';
}
if (supportPaymentLink && !apiBaseUrl) {
  $('#support-link').href = supportPaymentLink;
  $('#support-link').hidden = false;
  $('#hero-support').href = supportPaymentLink;
  $('#hero-support').hidden = false;
}
$('#stripe-support-note').hidden = !supportPaymentLink || Boolean(apiBaseUrl);
function saveBrowseState() {
  if (directEntry) return;
  try { sessionStorage.setItem('leo-browse', JSON.stringify({category,query:$('#search').value,sort:$('#sort').value,twoColumns:$('#art-grid').classList.contains('two-columns'),scroll:window.scrollY})); } catch {}
}
let browseState;
try { browseState=JSON.parse(sessionStorage.getItem('leo-browse') || 'null'); } catch {}
if (browseState && typeof browseState === 'object' && (directEntry || new URLSearchParams(location.search).has('resume'))) {
  category=['all','type','photo'].includes(browseState.category)?browseState.category:'all';
  $('#search').value=typeof browseState.query==='string'?browseState.query.slice(0,200):'';
  $('#sort').value=browseState.sort==='title'?'title':'curated';
  $('#art-grid').classList.toggle('two-columns',browseState.twoColumns===true);
  document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===category);b.setAttribute('aria-pressed',String(b.dataset.filter===category));});
  document.querySelectorAll('[data-columns]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.columns===(browseState.twoColumns?'2':'3'))));
  const collection=currentCollection();
  if (collection.some(p=>p.id===document.body.dataset.artwork)) browsingProducts=collection;
}
const returnUrl=new URL('?resume=1',rootUrl);
$('.back-to-work').href=returnUrl;
window.addEventListener('pagehide',saveBrowseState);
$('#support-link').addEventListener('click',()=>track('support_click',selectedProduct?.id));
$('#hero-support').addEventListener('click',()=>track('support_click'));
function showToast(message) {
  clearTimeout(toastTimer);
  // Dialogs occupy the browser's top layer; keep feedback above their backdrop.
  (viewer.open ? viewer : dialog.open ? dialog : document.body).append($('#toast'));
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(()=>$('#toast').classList.remove('visible'), 6000);
}
function renderCollection() {
  const visible = currentCollection();
  const label = {all:'All work', type:'Type-led', photo:'Photo-led'}[category];
  $('#collection-heading').innerHTML = `${label} <span>${String(visible.length).padStart(2,'0')}</span>`;
  $('#empty-state').hidden = visible.length > 0;
  $('#empty-message').textContent = 'No matches. Try another filter.';
  const query = $('#search').value.trim();
  $('#search-feedback').textContent = query ? `${visible.length} ${visible.length === 1 ? 'piece' : 'pieces'} for “${query}” in ${label.toLowerCase()}.` : '';
  $('#clear-search').hidden = !query;
  if (query && !visible.length) $('#empty-message').textContent = `Nothing for “${query}” in ${label.toLowerCase()}. Clear the search or try another word.`;
  $('#art-grid').innerHTML = visible.map((p, index) => `
    <article class="art-card">
      <a class="art-open" href="${p.page}" data-product="${p.id}" aria-label="View ${p.title}">
        <span class="art-stage"><span class="edition" aria-hidden="true">${p.number}</span><span class="image-status" role="status">Loading preview…</span><img src="${p.previewMedium}" srcset="${p.previewSmall} 320w, ${p.previewMedium} 640w, ${p.preview} 960w" sizes="(max-width:650px) 44vw, 32vw" alt="${p.title}, digital artwork" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async" width="${p.width}" height="${p.height}"></span>
        <span class="art-meta"><span><strong>${p.title}</strong></span><span class="price"><strong>Free download <span aria-hidden="true">↙</span></strong></span></span>
      </a><button class="retry-preview" data-retry="${p.id}" hidden>Retry preview</button>
    </article>`).join('');
  document.querySelectorAll('.art-stage img').forEach(img=>{
    const stage=img.closest('.art-stage'), retry=img.closest('.art-card').querySelector('[data-retry]');
    const update=()=>{const okay=img.naturalWidth>0;stage.classList.toggle('image-error',!okay);stage.querySelector('.image-status').hidden=okay;stage.querySelector('.image-status').textContent=okay?'':'Preview unavailable';retry.hidden=okay;};
    img.addEventListener('load',update);img.addEventListener('error',update);if(img.complete)update();
  });
}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  category = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b=>{ b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  renderCollection();
}));
$('#search').addEventListener('input', renderCollection);
$('#clear-search').addEventListener('click',()=>{ $('#search').value=''; renderCollection(); $('#search').focus(); });
$('#sort').addEventListener('change', renderCollection);
$('#reset-filters').addEventListener('click',()=>{ $('#search').value = ''; $('[data-filter="all"]').click(); });
document.querySelectorAll('[data-columns]').forEach(button=>button.addEventListener('click',()=>{
  $('#art-grid').classList.toggle('two-columns', button.dataset.columns === '2');
  document.querySelectorAll('[data-columns]').forEach(b=>b.setAttribute('aria-pressed', String(b === button)));
}));
$('#art-grid').addEventListener('click', event=>{
  const retry=event.target.closest('[data-retry]');
  if(retry){const img=retry.closest('.art-card').querySelector('img');retry.hidden=true;img.closest('.art-stage').classList.remove('image-error');img.closest('.art-stage').querySelector('.image-status').textContent='Loading preview…';img.removeAttribute('srcset');img.src=new URL(PRODUCTS.find(p=>p.id===retry.dataset.retry).preview,rootUrl).href+'?retry='+Date.now();return;}
  const link = event.target.closest('[data-product]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault(); saveBrowseState(); browsingProducts = currentCollection(); opener = link.dataset.product; openArtwork(link.dataset.product, true);
});
function pageUrl(product) { return new URL(product.page, rootUrl); }
function selectedFile() { return fileOptions(selectedProduct).find(f=>f.id === $('#file-format').value) || fileOptions(selectedProduct)[0]; }
function openArtwork(id, updateHistory = false) {
  const product = PRODUCTS.find(p=>p.id === id);
  if (!product) return;
  checkoutAbort?.abort(); selectedProduct = product;
  if (lastViewedId !== id) { track('artwork_view', id); lastViewedId = id; }
  $('#artwork-position').textContent = `${browsingProducts.findIndex(p=>p.id === id) + 1} / ${browsingProducts.length}`;
  const next=adjacentArtwork(browsingProducts,id,1);
  $('#artwork-next').textContent=next?`${next.title} →`:'Next →';
  $('#share-url').hidden=true;
  for (const selector of ['#artwork-previous','#artwork-next','#viewer-previous','#viewer-next']) $(selector).disabled = browsingProducts.length < 2;
  $('#download-followup').hidden = true;
  $('#keep-browsing').hidden = true;
  $('#dialog-title').textContent = product.title;
  $('#detail-image-status').hidden=false;$('#detail-image-status').textContent='Loading preview…';$('#open-viewer').classList.remove('image-error');
  $('#dialog-image').src = new URL(product.preview, rootUrl);
  $('#dialog-image').srcset = `${product.previewSmall} 320w, ${product.previewMedium} 640w, ${product.preview} 960w`;
  $('#dialog-image').sizes = '(max-width:650px) 90vw, 50vw';
  $('#dialog-image').alt = product.title;
  if ($('#dialog-image').complete) updateDetailPreview();
  $('#dialog-note').textContent = `Original PNG · ${product.width} × ${product.height} px · 3:4`;
  $('#print-size').textContent = printGuide(product);
  $('#print-note').textContent = product.printFile ? 'A larger print master is included. Pick it from the file menu.' : printGuide(product);
  $('#artwork-permalink').href = pageUrl(product);
  $('#file-format').innerHTML = fileOptions(product).map(f=>`<option value="${f.id}">${f.label}</option>`).join('');
  $('#file-choice').hidden = fileOptions(product).length < 2;
  $('#checkout-button').disabled = false; form.reset(); chooseAmount('0');
  if (updateHistory && location.pathname !== pageUrl(product).pathname) history.pushState({artOverlay:true}, '', pageUrl(product));
  document.title = `${product.title} — Leo Lune`;
  if (!dialog.open) directEntry ? dialog.show() : dialog.showModal();
}
function closeArtwork(updateHistory = true) {
  if (directEntry) { location.assign(returnUrl.href); return; }
  checkoutAbort?.abort();
  if (viewer.open) viewer.close();
  if (dialog.open) dialog.close();
  document.title = 'Leo Lune — Store';
  if (updateHistory) {
    if (history.state?.artOverlay) history.back();
    else history.replaceState({}, '', rootUrl);
  }
  document.querySelector(`[data-product="${opener}"]`)?.focus({preventScroll:true});
}
$('#close-artwork').addEventListener('click',()=>closeArtwork());
dialog.addEventListener('cancel',event=>{ event.preventDefault(); closeArtwork(); });
dialog.addEventListener('click',event=>{
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeArtwork();
});
function routeFromLocation() {
  const id = decodeURIComponent(location.pathname.split('/').pop()).replace(/\.html$/, '');
  if (PRODUCTS.some(p=>p.id === id)) openArtwork(id);
  else if (dialog.open) closeArtwork(false);
}
window.addEventListener('popstate', routeFromLocation);
$('#share-artwork').addEventListener('click',async()=>{
  const result=await shareArtwork({title:`${selectedProduct.title} — Leo Lune`,url:pageUrl(selectedProduct).href},navigator);
  if(result==='shared'||result==='cancelled')return;
  try { await navigator.clipboard.writeText(pageUrl(selectedProduct).href); showToast('Link copied. Send it to someone.'); }
  catch { $('#share-url').value=pageUrl(selectedProduct).href;$('#share-url').hidden=false;$('#share-url').select();showToast('Select and copy this link.'); }
});
$('#keep-browsing').addEventListener('click',()=>closeArtwork());
function loadViewer() {
  $('#viewer-title').textContent = selectedProduct.title;
  $('#viewer-position').textContent = `${browsingProducts.indexOf(selectedProduct) + 1} / ${browsingProducts.length}`;
  $('#viewer-status').hidden = false; $('#viewer-status').textContent = 'Loading original…';
  $('#viewer-image').alt = selectedProduct.title; $('#viewer-image').src = new URL(selectedProduct.image, rootUrl);
  $('#viewer-canvas').classList.remove('zoomed'); $('#viewer-zoom').setAttribute('aria-pressed', 'false'); $('#viewer-zoom').textContent = 'Zoom in';
}
$('#viewer-image').addEventListener('load',()=>$('#viewer-status').hidden = true);
$('#viewer-image').addEventListener('error',()=>$('#viewer-status').textContent = 'Could not load the original. Close and try again.');
const detailPreview=$('#dialog-image');
function updateDetailPreview(){const okay=detailPreview.naturalWidth>0;$('#detail-image-status').hidden=okay;$('#detail-image-status').textContent=okay?'':'Preview unavailable · tap to retry';$('#open-viewer').classList.toggle('image-error',!okay);$('#open-viewer').setAttribute('aria-label',okay?'View artwork full screen':'Retry artwork preview');}
detailPreview.addEventListener('load',updateDetailPreview);detailPreview.addEventListener('error',updateDetailPreview);
$('#open-viewer').addEventListener('click',()=>{if($('#open-viewer').classList.contains('image-error')){$('#detail-image-status').textContent='Loading preview…';detailPreview.src=new URL(selectedProduct.preview,rootUrl).href+'?retry='+Date.now();return;}loadViewer(); viewer.showModal(); });
$('#close-viewer').addEventListener('click',()=>viewer.close());
$('#viewer-zoom').addEventListener('click',()=>{
  const zoomed = $('#viewer-canvas').classList.toggle('zoomed');
  $('#viewer-zoom').setAttribute('aria-pressed', String(zoomed)); $('#viewer-zoom').textContent = zoomed ? 'Fit to screen' : 'Zoom in';
});
function moveViewer(delta) {
  const next = adjacentArtwork(browsingProducts, selectedProduct.id, delta);
  if (!next || browsingProducts.length < 2) return;
  if (directEntry && !viewer.open) { location.assign(pageUrl(next).href); return; }
  openArtwork(next.id); history.replaceState(history.state, '', pageUrl(selectedProduct));
  if (viewer.open) loadViewer();
}
$('#artwork-previous').addEventListener('click',()=>moveViewer(-1));
$('#artwork-next').addEventListener('click',()=>moveViewer(1));
$('#viewer-previous').addEventListener('click',()=>moveViewer(-1));
$('#viewer-next').addEventListener('click',()=>moveViewer(1));
viewer.addEventListener('keydown',event=>{
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveViewer(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); moveViewer(1); }
});
let swipeStart = null;
$('#viewer-canvas').addEventListener('touchstart',event=>{
  swipeStart = event.touches.length === 1 && !$('#viewer-canvas').classList.contains('zoomed') ? {x:event.touches[0].clientX,y:event.touches[0].clientY,time:Date.now()} : null;
},{passive:true});
$('#viewer-canvas').addEventListener('touchcancel',()=>{ swipeStart=null; },{passive:true});
$('#viewer-canvas').addEventListener('touchend',event=>{
  const start=swipeStart; swipeStart=null;
  if (!start || event.touches.length || event.changedTouches.length!==1 || $('#viewer-canvas').classList.contains('zoomed')) return;
  const dx=event.changedTouches[0].clientX-start.x, dy=event.changedTouches[0].clientY-start.y;
  if (Math.abs(dx)>=70 && Math.abs(dx)>Math.abs(dy)*2 && Date.now()-start.time<800) moveViewer(dx<0?1:-1);
},{passive:true});
function chooseAmount(value) {
  selectedAmount = value === 'custom' ? null : Number(value);
  $('.custom-amount').hidden = value !== 'custom'; $('#custom-amount').required = value === 'custom'; $('#form-status').textContent = '';
  document.querySelectorAll('[data-amount]').forEach(b=>{ b.classList.toggle('selected', b.dataset.amount === value); b.setAttribute('aria-pressed', String(b.dataset.amount === value)); });
  updateButton(); if (value === 'custom') $('#custom-amount').focus();
}
function amount() { return selectedAmount ?? amountInPennies($('#custom-amount').value); }
function updateButton() {
  const pennies = amount();
  $('#checkout-button').textContent = pennies === 0 ? 'Download PNG' : pennies === null ? 'Enter an amount' : `Pay £${(pennies/100).toFixed(pennies % 100 ? 2 : 0)} & download`;
  $('#checkout-note').textContent = pennies === 0 ? '' : 'Secure checkout with Stripe.';
}
document.querySelectorAll('[data-amount]').forEach(b=>b.addEventListener('click',()=>chooseAmount(b.dataset.amount)));
$('#custom-amount').addEventListener('input',updateButton);
function triggerDownload(file) {
  const link = document.createElement('a'); link.href = new URL(file.path, rootUrl);
  link.download = file.file || decodeURIComponent(file.path.split('/').pop()); document.body.append(link); link.click(); link.remove();
}
form.addEventListener('submit',async event=>{
  event.preventDefault(); const pennies = amount(); $('#form-status').textContent = '';
  if (pennies === 0) {
    track('download_click',selectedProduct.id);
    triggerDownload(selectedFile());
    const recovery=$('#download-again'), file=selectedFile();
    recovery.href=new URL(file.path,rootUrl); recovery.download=file.file || decodeURIComponent(file.path.split('/').pop());
    $('#download-followup').hidden = false;
    $('#keep-browsing').hidden = false;
    $('#checkout-button').textContent = 'Download again';
    $('#checkout-note').textContent = 'Not seeing it? Check Downloads, or try again.';
    $('#download-followup').focus({preventScroll:true});
    return;
  }
  if (!Number.isSafeInteger(pennies) || pennies < 100 || pennies > 50000) { $('#form-status').textContent = 'Choose Free, or enter £1–£500.'; return; }
  if (!apiBaseUrl) { $('#form-status').textContent = 'Payments are not connected yet. Choose Free to download.'; return; }
  const intent = `${selectedProduct.id}:${selectedFile().id}:${pennies}`;
  if (intent !== checkoutIntent) { checkoutIntent = intent; requestId = crypto.randomUUID(); }
  checkoutAbort = new AbortController(); const request = checkoutAbort;
  const timeout = setTimeout(()=>request.abort(),15000);
  $('#checkout-button').disabled = true; $('#checkout-button').textContent = 'Opening checkout…';
  try {
    const response = await fetch(`${apiBaseUrl}/api/create-checkout-session`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({productId:selectedProduct.id, format:selectedFile().id, amount:pennies, requestId}), signal:request.signal});
    const data = await response.json();
    if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not be started.');
    const target = new URL(data.url);
    if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') throw new Error('Unexpected checkout destination.');
    if (dialog.open && checkoutAbort === request) location.assign(target.href);
  } catch(error) {
    if (dialog.open && checkoutAbort === request) $('#form-status').textContent = error.name === 'AbortError' ? 'Checkout took too long. Try again, or download free.' : error.message;
  } finally {
    clearTimeout(timeout); if (checkoutAbort === request) { $('#checkout-button').disabled = false; updateButton(); }
  }
});
async function handleCheckoutReturn() {
  const params = new URLSearchParams(location.search);
  if (params.get('checkout') === 'cancelled') { showToast('Checkout cancelled. Nothing was charged.'); history.replaceState(history.state,'',location.pathname); return; }
  const session = params.get('session_id');
  if (params.get('checkout') !== 'success' || !session || !apiBaseUrl) return;
  showToast('Confirming your payment…');
  try {
    const response = await fetch(`${apiBaseUrl}/api/verify-session?session_id=${encodeURIComponent(session)}`, {signal:AbortSignal.timeout(15000)});
    const data = await response.json();
    if (!response.ok || !data.paid) throw new Error(data.error || 'Payment could not be confirmed. Refresh to retry.');
    const product = PRODUCTS.find(p=>p.id === data.productId);
    if (!product) throw new Error('Artwork could not be found.');
    openArtwork(product.id);
    const file = fileOptions(product).find(f=>f.id === data.format);
    if (!file) throw new Error('File could not be found.');
    triggerDownload(file); showToast('Thanks for the support. If the download did not start, tap Download PNG.'); history.replaceState({},'',pageUrl(product));
  } catch(error) { showToast(error.message || 'Could not confirm payment. Refresh to retry.'); }
}
renderCollection(); routeFromLocation(); handleCheckoutReturn();
if(detailPreview.complete&&detailPreview.getAttribute('src'))updateDetailPreview();
if(!directEntry&&new URLSearchParams(location.search).has('resume')&&Number.isFinite(browseState?.scroll))requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,browseState.scroll),behavior:'instant'}));

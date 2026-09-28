import { PRODUCTS, FEATURED_PRODUCTS } from './catalog.js?v=8';
import { amountInPennies, fileOptions, filterProducts } from './store-utils.js?v=8';
const $ = selector => document.querySelector(selector);
const apiBaseUrl = String(window.LEO_LUNE_CONFIG?.apiBaseUrl || '').replace(/\/$/, '');
const rootUrl = new URL('./', document.baseURI);
const dialog = $('#purchase-dialog'), viewer = $('#art-viewer'), form = $('#purchase-form');
let selectedProduct = null, selectedAmount = 0, category = 'all', savedOnly = false;
let toastTimer, checkoutAbort, checkoutIntent = '', requestId = '', opener;
let saved;
try {
  const values = JSON.parse(localStorage.getItem('leo-lune-saved') || '[]');
  saved = new Set(Array.isArray(values) ? values.filter(v => typeof v === 'string') : []);
} catch { saved = new Set(); }
$('#year').textContent = new Date().getFullYear();
$('#catalog-count').textContent = `${PRODUCTS.length} PIECES`;
document.querySelectorAll('[data-count]').forEach(el => {
  el.textContent = String(PRODUCTS.filter(p=>el.dataset.count === 'all' || p.category === el.dataset.count).length).padStart(2, '0');
});
if (!apiBaseUrl) {
  $('#amount-fieldset').hidden = true;
  $('#support-copy').textContent = 'Optional support is coming soon. Downloads stay free.';
}
function showToast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(()=>$('#toast').classList.remove('visible'), 6000);
}
function renderCollection() {
  const visible = filterProducts(FEATURED_PRODUCTS, { category, query: $('#search').value, savedOnly, saved, sort: $('#sort').value });
  const label = savedOnly ? 'Saved work' : {all:'All work', type:'Type-led', photo:'Photo-led'}[category];
  $('#collection-heading').innerHTML = `${label} <span>${String(visible.length).padStart(2,'0')}</span>`;
  $('#saved-count').textContent = String(PRODUCTS.filter(p=>saved.has(`${p.id}-digital`)).length).padStart(2,'0');
  $('#saved-toggle').setAttribute('aria-pressed', String(savedOnly));
  $('#empty-state').hidden = visible.length > 0;
  $('#empty-message').textContent = savedOnly ? 'No matches in your saved work. Hit + on a piece to save it.' : 'No matches. Try another filter.';
  $('#art-grid').innerHTML = visible.map((p, index) => `
    <article class="art-card">
      <button class="save-art" data-save="${p.id}-digital" aria-label="${saved.has(`${p.id}-digital`) ? 'Unsave' : 'Save'} ${p.title}" aria-pressed="${saved.has(`${p.id}-digital`)}">${saved.has(`${p.id}-digital`) ? '−' : '+'}</button>
      <a class="art-open" href="${p.page}" data-product="${p.id}" aria-label="View ${p.title}">
        <span class="art-stage"><span class="edition">${p.number} / digital</span><img src="${p.preview}" srcset="${p.previewSmall} 320w, ${p.preview} 640w" sizes="(max-width:650px) 44vw, 32vw" alt="${p.title}, digital artwork" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async" width="${p.width}" height="${p.height}"><span class="art-type">DIGITAL DOWNLOAD</span></span>
        <span class="art-meta"><span><strong>${p.title}</strong><small>${p.width} × ${p.height} px · PNG</small></span><span class="price"><strong>Free download <span aria-hidden="true">↙</span></strong><small>${apiBaseUrl ? 'Pay what you want' : 'No sign-up'}</small></span></span>
      </a>
    </article>`).join('');
}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  category = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b=>{ b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  renderCollection();
}));
$('#search').addEventListener('input', renderCollection);
$('#sort').addEventListener('change', renderCollection);
$('#saved-toggle').addEventListener('click',()=>{ savedOnly = !savedOnly; renderCollection(); });
$('#reset-filters').addEventListener('click',()=>{ $('#search').value = ''; savedOnly = false; $('[data-filter="all"]').click(); });
document.querySelectorAll('[data-columns]').forEach(button=>button.addEventListener('click',()=>{
  $('#art-grid').classList.toggle('two-columns', button.dataset.columns === '2');
  document.querySelectorAll('[data-columns]').forEach(b=>b.setAttribute('aria-pressed', String(b === button)));
}));
$('#art-grid').addEventListener('click', event=>{
  const save = event.target.closest('[data-save]');
  if (save) {
    const key = save.dataset.save;
    saved.has(key) ? saved.delete(key) : saved.add(key);
    try { localStorage.setItem('leo-lune-saved', JSON.stringify([...saved])); } catch {}
    renderCollection();
    document.querySelector(`[data-save="${key}"]`)?.focus({preventScroll:true});
    return;
  }
  const link = event.target.closest('[data-product]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault(); opener = link.dataset.product; openArtwork(link.dataset.product, true);
});
function pageUrl(product) { return new URL(product.page, rootUrl); }
function selectedFile() { return fileOptions(selectedProduct).find(f=>f.id === $('#file-format').value) || fileOptions(selectedProduct)[0]; }
function openArtwork(id, updateHistory = false) {
  const product = PRODUCTS.find(p=>p.id === id);
  if (!product) return;
  checkoutAbort?.abort(); selectedProduct = product;
  $('#dialog-title').textContent = product.title;
  $('#dialog-image').src = new URL(product.preview, rootUrl); $('#dialog-image').alt = product.title;
  $('#dialog-note').textContent = `Original PNG · ${product.width} × ${product.height} px · 3:4`;
  $('#print-note').textContent = product.printFile ? 'A larger print master is included. Pick it from the file menu.' : `This is the ${product.width} × ${product.height} original, not a large-format print file.`;
  $('#artwork-permalink').href = pageUrl(product);
  $('#file-format').innerHTML = fileOptions(product).map(f=>`<option value="${f.id}">${f.label}</option>`).join('');
  $('#file-choice').hidden = fileOptions(product).length < 2;
  $('#checkout-button').disabled = false; form.reset(); chooseAmount('0');
  if (updateHistory && location.pathname !== pageUrl(product).pathname) history.pushState({artOverlay:true}, '', pageUrl(product));
  document.title = `${product.title} — Leo Lune`;
  if (!dialog.open) dialog.showModal();
}
function closeArtwork(updateHistory = true) {
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
  try { await navigator.clipboard.writeText(pageUrl(selectedProduct).href); showToast('Link copied. Send it to someone.'); }
  catch { showToast('Use the artwork link beside this button to copy or share the URL.'); }
});
function loadViewer() {
  $('#viewer-title').textContent = selectedProduct.title;
  $('#viewer-position').textContent = `${FEATURED_PRODUCTS.indexOf(selectedProduct) + 1} / ${PRODUCTS.length}`;
  $('#viewer-status').hidden = false; $('#viewer-status').textContent = 'Loading original…';
  $('#viewer-image').alt = selectedProduct.title; $('#viewer-image').src = new URL(selectedProduct.image, rootUrl);
  $('#viewer-canvas').classList.remove('zoomed'); $('#viewer-zoom').setAttribute('aria-pressed', 'false'); $('#viewer-zoom').textContent = 'Zoom in';
}
$('#viewer-image').addEventListener('load',()=>$('#viewer-status').hidden = true);
$('#viewer-image').addEventListener('error',()=>$('#viewer-status').textContent = 'Could not load the original. Close and try again.');
$('#open-viewer').addEventListener('click',()=>{ loadViewer(); viewer.showModal(); });
$('#close-viewer').addEventListener('click',()=>viewer.close());
$('#viewer-zoom').addEventListener('click',()=>{
  const zoomed = $('#viewer-canvas').classList.toggle('zoomed');
  $('#viewer-zoom').setAttribute('aria-pressed', String(zoomed)); $('#viewer-zoom').textContent = zoomed ? 'Fit to screen' : 'Zoom in';
});
function moveViewer(delta) {
  const index = (FEATURED_PRODUCTS.indexOf(selectedProduct) + delta + PRODUCTS.length) % PRODUCTS.length;
  openArtwork(FEATURED_PRODUCTS[index].id); history.replaceState(history.state, '', pageUrl(selectedProduct)); loadViewer();
}
$('#viewer-previous').addEventListener('click',()=>moveViewer(-1));
$('#viewer-next').addEventListener('click',()=>moveViewer(1));
viewer.addEventListener('keydown',event=>{
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveViewer(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); moveViewer(1); }
});
function chooseAmount(value) {
  selectedAmount = value === 'custom' ? null : Number(value);
  $('.custom-amount').hidden = value !== 'custom'; $('#custom-amount').required = value === 'custom'; $('#form-status').textContent = '';
  document.querySelectorAll('[data-amount]').forEach(b=>{ b.classList.toggle('selected', b.dataset.amount === value); b.setAttribute('aria-pressed', String(b.dataset.amount === value)); });
  updateButton(); if (value === 'custom') $('#custom-amount').focus();
}
function amount() { return selectedAmount ?? amountInPennies($('#custom-amount').value); }
function updateButton() {
  const pennies = amount();
  $('#checkout-button').textContent = pennies === 0 ? 'Download for free' : pennies === null ? 'Enter an amount' : `Pay £${(pennies/100).toFixed(pennies % 100 ? 2 : 0)} & download`;
  $('#checkout-note').textContent = pennies === 0 ? 'Original file. No sign-up.' : 'Secure checkout with Stripe.';
}
document.querySelectorAll('[data-amount]').forEach(b=>b.addEventListener('click',()=>chooseAmount(b.dataset.amount)));
$('#custom-amount').addEventListener('input',updateButton);
function triggerDownload(file) {
  const link = document.createElement('a'); link.href = new URL(file.path, rootUrl);
  link.download = file.file || decodeURIComponent(file.path.split('/').pop()); document.body.append(link); link.click(); link.remove();
}
form.addEventListener('submit',async event=>{
  event.preventDefault(); const pennies = amount(); $('#form-status').textContent = '';
  if (pennies === 0) { triggerDownload(selectedFile()); showToast('Downloading. Enjoy it.'); return; }
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
    triggerDownload(file); showToast('Thanks for the support. If the download did not start, tap Download for free.'); history.replaceState({},'',pageUrl(product));
  } catch(error) { showToast(error.message || 'Could not confirm payment. Refresh to retry.'); }
}
renderCollection(); routeFromLocation(); handleCheckoutReturn();

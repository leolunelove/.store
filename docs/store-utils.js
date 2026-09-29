export function liveSupportLink(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname === 'buy.stripe.com' && !url.username && !url.password && !url.port && /^\/[A-Za-z0-9]+$/.test(url.pathname) ? url.href : '';
  } catch { return ''; }
}
export function printGuide(product) {
  const cm = pixels => (pixels / 300 * 2.54).toFixed(1);
  return `For a small print: about ${cm(product.width)} × ${cm(product.height)} cm at 300 ppi. Larger prints will look softer. This isn't a large-poster file.`;
}
export async function shareArtwork(data, browserNavigator) {
  if (!browserNavigator.share) return 'unavailable';
  try { await browserNavigator.share(data); return 'shared'; }
  catch (error) { return error.name === 'AbortError' ? 'cancelled' : 'failed'; }
}
export function amountInPennies(raw) {
  const text = String(raw).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? amount : null;
}
export function fileOptions(product) {
  const files = [{ id: 'original', label: 'Original PNG', path: product.image, file: product.file, width: product.width, height: product.height }];
  if (product.printFile) files.push({ id: 'print', label: 'Print master', ...product.printFile });
  return files;
}
export function filterProducts(products, { category = 'all', query = '', savedOnly = false, saved = new Set(), sort = 'curated' } = {}) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visible = products.filter(p => (category === 'all' || p.category === category) && (!savedOnly || saved.has(`${p.id}-digital`)) && terms.every(term => `${p.title} ${(p.tags || []).join(' ')}`.toLowerCase().includes(term)));
  return sort === 'title' ? visible.sort((a,b)=>a.title.localeCompare(b.title)) : visible;
}
export function adjacentArtwork(products, id, delta) {
  if (!products.length) return null;
  const index = products.findIndex(p=>p.id === id);
  if (index < 0) return null;
  return products[(index + delta + products.length) % products.length];
}

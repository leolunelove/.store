export function liveSupportLink(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname === 'buy.stripe.com' && !url.username && !url.password && !url.port && /^\/[A-Za-z0-9]+$/.test(url.pathname) ? url.href : '';
  } catch { return ''; }
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
  const visible = products.filter(p => (category === 'all' || p.category === category) && (!savedOnly || saved.has(`${p.id}-digital`)) && p.title.toLowerCase().includes(query.trim().toLowerCase()));
  return sort === 'title' ? visible.sort((a,b)=>a.title.localeCompare(b.title)) : visible;
}

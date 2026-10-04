import { readFile, writeFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PRODUCTS, FEATURED_PRODUCTS } from '../docs/catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const docs = path.join(root, 'docs');
const origin = 'https://leolune.store/';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const template = await readFile(path.join(root, 'scripts/store-template.html'), 'utf8');
let originalBytes = 0, previewBytes = 0;
for (const product of PRODUCTS) {
  const original = path.join(docs, 'downloads', product.file);
  originalBytes += (await stat(original)).size;
  for (const [width, file] of [[320, product.previewSmall], [960, product.preview]]) {
    const target = path.join(docs, file);
    // Mechanical thumbnail export; original artwork files are never modified.
    if (process.argv.includes('--previews')) execFileSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '78', '--resampleWidth', String(width), original, '--out', target], {stdio:'pipe'});
    previewBytes += (await stat(target)).size;
  }
}
function page(product) {
  const title = product ? `${product.title} — Leo Lune` : 'Leo Lune — Store';
  const description = product ? `${product.title} by Leo Lune. Free original PNG download, ${product.width} × ${product.height} px. No sign-up.` : "Stuff I've made. Free artwork downloads by Leo Lune. Download it. Print it. Put it up.";
  const url = origin + (product?.page || '');
  const image = origin + `share-${product?.id || 'store'}.png`;
  const meta = `<title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website"><meta property="og:site_name" content="Leo Lune">
  <meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${url}"><meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${escape(product?.title || FEATURED_PRODUCTS[0].title)} by Leo Lune">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${image}">
  <meta name="referrer" content="strict-origin-when-cross-origin">`;
  const fallback = `<noscript><section class="noscript-art"><h2>${product ? escape(product.title) : 'Download artwork'}</h2><p>Original PNGs for personal use. Free, with no sign-up.</p>${(product ? [product] : FEATURED_PRODUCTS).map(p => `<a href="${escape(p.image)}" download="${escape(p.file)}"><img src="${p.previewSmall}" alt="${escape(p.title)}" width="160" height="213">Download ${escape(p.title)}</a>`).join('')}</section></noscript>`;
  let html = template.replace('<!-- PAGE_META -->', meta).replace('<!-- NO_SCRIPT -->', fallback);
  if (product) {
    html = html.replace('<body>', `<body class="artwork-page" data-artwork="${product.id}">`).replace('href="#work"', 'href="#dialog-title"');
    const dialog = html.match(/  <dialog class="purchase-dialog"[\s\S]*?<\/dialog>/)[0];
    const detail = dialog.replace('id="purchase-dialog"', 'id="purchase-dialog" open')
      .replace('<h2 id="dialog-title"></h2>', `<h1 id="dialog-title">${escape(product.title)}</h1>`)
      .replace('<img id="dialog-image" alt=""', `<img id="dialog-image" src="${product.preview}" alt="${escape(product.title)}"`);
    html = html.replace(dialog, '').replace('<!-- NO_SCRIPT_UNUSED -->', '').replace('</main>', `${detail}\n    </main>`);
  }
  return html;
}
await writeFile(path.join(docs, 'index.html'), page());
for (const product of PRODUCTS) await writeFile(path.join(docs, product.page), page(product));
await writeFile(path.join(docs, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['', ...PRODUCTS.map(p=>p.page)].map(p=>`<url><loc>${origin}${p}</loc></url>`).join('')}</urlset>\n`);
await writeFile(path.join(docs, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}sitemap.xml\n`);
await writeFile(path.join(docs, '.nojekyll'), '');
console.log(JSON.stringify({pages:PRODUCTS.length + 1, originalBytes, previewBytes, previewReduction:Math.round((1-previewBytes/originalBytes)*100)+'%'}));

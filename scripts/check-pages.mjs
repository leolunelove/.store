import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PRODUCTS} from '../docs/catalog.js';
const docs=fileURLToPath(new URL('../docs/',import.meta.url));
const problems=[];
async function exists(relative,source){
  const target=path.resolve(docs,relative);
  if(!target.startsWith(docs)){problems.push(`${source}: path escapes public directory`);return;}
  try {if(!(await stat(target)).isFile()) problems.push(`${source}: not a file: ${relative}`);}
  catch {problems.push(`${source}: missing ${relative}`);}
}
for(const product of PRODUCTS){
  for(const file of [product.page,product.previewSmall,product.previewMedium,product.preview,decodeURIComponent(product.image)]) await exists(file,product.id);
  const original=await readFile(path.join(docs,decodeURIComponent(product.image)));
  if(original.subarray(1,4).toString()!=='PNG'||original.readUInt32BE(16)!==product.width||original.readUInt32BE(20)!==product.height) problems.push(`${product.id}: original PNG dimensions do not match catalogue`);
  const html=await readFile(path.join(docs,product.page),'utf8');
  if(!html.includes(`href="https://leolune.store/${product.page}"`)) problems.push(`${product.id}: missing canonical URL`);
}
for(const name of await readdir(docs)){
  if(!/\.(html|css|js)$/.test(name))continue;
  const source=await readFile(path.join(docs,name),'utf8');
  if(/(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}|re_[A-Za-z0-9]{24,}/.test(source))problems.push(`${name}: possible private credential in public files`);
  const refs=name.endsWith('.html')?[...source.matchAll(/(?:src|href)="([^"{}$]+)"/g)].map(m=>m[1]):name.endsWith('.css')?[...source.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(m=>m[1]):[];
  for(const ref of refs){
    if(!ref||ref.startsWith('#')||ref==='./'||/^(?:https?:|mailto:|data:)/.test(ref))continue;
    const local=decodeURIComponent(ref.split(/[?#]/)[0]);
    if(local)await exists(local,name);
  }
}
if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}
else console.log(`Checked ${PRODUCTS.length} artworks, downloads, previews, local links and public-file credentials.`);

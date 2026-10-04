import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PRODUCTS} from '../docs/catalog.js';
const docs=fileURLToPath(new URL('../docs/',import.meta.url));
const problems=[];
function jpegSize(bytes){
  if(bytes.readUInt16BE(0)!==0xffd8)return null;
  let offset=2;
  while(offset+4<bytes.length){
    if(bytes[offset++]!==0xff)return null;
    while(bytes[offset]===0xff)offset++;
    const marker=bytes[offset++];
    if(marker===0xda||marker===0xd9)return null;
    const length=bytes.readUInt16BE(offset);
    if(length<2||offset+length>bytes.length)return null;
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {height:bytes.readUInt16BE(offset+3),width:bytes.readUInt16BE(offset+5)};
    offset+=length;
  }
  return null;
}
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
  for(const [file,width] of [[product.previewSmall,320],[product.previewMedium,640],[product.preview,960]]){
    const dimensions=jpegSize(await readFile(path.join(docs,file)));
    if(!dimensions||dimensions.width!==width||Math.abs(dimensions.height-width*product.height/product.width)>1)problems.push(`${product.id}: invalid preview dimensions: ${file}`);
  }
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

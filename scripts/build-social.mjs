import {readFile,writeFile} from 'node:fs/promises';
import {PRODUCTS,FEATURED_PRODUCTS} from '../docs/catalog.js';
const {default:sharp}=await import(process.env.SHARP_MODULE || 'sharp');
const docs=new URL('../docs/',import.meta.url);
const logo=(await readFile(new URL('leo-mark.png',docs))).toString('base64');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
for(const p of [...PRODUCTS,{...FEATURED_PRODUCTS[0],id:'store',title:"Stuff I've made."}]){
 const art=(await readFile(new URL(p.preview,docs))).toString('base64');
 const lines=[];let line='';for(const word of p.title.split(' ')){if((line+' '+word).trim().length>19){lines.push(line);line='';}line+=(line?' ':'')+word;}lines.push(line);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#111111"/><image href="data:image/png;base64,${logo}" x="60" y="48" width="150" height="74"/><text x="60" y="175" font-family="Arial" font-size="16" fill="#aaa">ARTWORK / LEO LUNE</text>${lines.map((l,i)=>`<text x="60" y="${255+i*65}" font-family="Arial" font-size="54" fill="#eee">${escape(l)}</text>`).join('')}<text x="60" y="530" font-family="Arial" font-size="22" fill="#bbb">Free downloads. Chip in if you want.</text><text x="60" y="570" font-family="Arial" font-size="18" fill="#888">leolune.store</text><image href="data:image/jpeg;base64,${art}" x="750" y="45" width="405" height="540"/></svg>`;
 await sharp(Buffer.from(svg)).png().toFile(new URL(`share-${p.id}.png`,docs).pathname);
}
const icon=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" rx="36" fill="#111"/><image href="data:image/png;base64,${logo}" x="15" y="35" width="150" height="110"/></svg>`);
await sharp(icon).resize(32).png().toFile(new URL('favicon.png',docs).pathname);
await sharp(icon).png().toFile(new URL('apple-touch-icon.png',docs).pathname);

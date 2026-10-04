import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PRODUCTS} from '../docs/catalog.js';
import {filterProducts,adjacentArtwork} from '../docs/store-utils.js';
import {createTracker} from '../docs/analytics.js';
test('download comes before secondary tools and browsing, with one share control',async()=>{
 const html=await readFile(new URL('../scripts/store-template.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('id="purchase-form"')<html.indexOf('class="artwork-tools"'));
 assert.ok(html.indexOf('class="artwork-tools"')<html.indexOf('class="artwork-navigation"'));
 assert.equal((html.match(/id="share-artwork"/g)||[]).length,1);
 assert.ok(!html.includes('id="native-share"'));assert.ok(html.includes('Download PNG'));
});
test('connected header keeps square lower corners',async()=>{
 const css=await readFile(new URL('../docs/experience.css',import.meta.url),'utf8');
 assert.match(css,/border-radius:32px 32px 0 0/);assert.match(css,/border-radius:24px 24px 0 0/);
});
test('subject search and navigation follow the filtered set',()=>{
 const set=filterProducts(PRODUCTS,{query:'BLUE hands'});
 assert.deepEqual(set.map(p=>p.id),['sensory','fingertips']);
 assert.equal(adjacentArtwork(set,'fingertips',1).id,'sensory');
 assert.equal(adjacentArtwork(set,'sensory',-1).id,'fingertips');
 assert.equal(adjacentArtwork([],'sensory',1),null);
});
test('tracking is disabled by default and respects privacy signals',()=>{
 const calls=[];const env={navigator:{},fetch:(...args)=>calls.push(args)};
 createTracker('',env)('artwork_view','smile');assert.equal(calls.length,0);
 createTracker('https://metrics.example/events',env)('download_click','smile');
 assert.deepEqual(JSON.parse(calls[0][1].body),{event:'download_click',artwork:'smile'});
 assert.equal(calls[0][1].credentials,'omit');assert.equal(calls[0][1].referrerPolicy,'no-referrer');
 env.navigator.globalPrivacyControl=true;createTracker('https://metrics.example/events',env)('support_click');assert.equal(calls.length,1);
});
test('direct pages and sharing cards are generated for every artwork',async()=>{
 for(const p of PRODUCTS){
  const html=await readFile(new URL(`../docs/${p.page}`,import.meta.url),'utf8');
  assert.ok(html.includes(`data-artwork="${p.id}"`));assert.ok(html.includes('id="purchase-dialog" open'));assert.ok(html.includes('<h1 id="dialog-title">'));
  const png=await readFile(new URL(`../docs/share-${p.id}.png`,import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 }
});

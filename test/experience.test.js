import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {PRODUCTS,FEATURED_PRODUCTS,FEATURED_IDS} from '../docs/catalog.js';
import {amountInPennies,fileOptions,filterProducts,liveSupportLink,printGuide,shareArtwork} from '../docs/store-utils.js';
import {getProduct,parseAmount,isAllowedPaidAmount,verifiedPurchase} from '../server/store.js';
import createCheckout from '../api/create-checkout-session.js';
import verifySession from '../api/verify-session.js';

test('print guidance uses native pixels without promising poster quality',()=>{
  assert.match(printGuide({width:1080,height:1440}),/9.1 × 12.2 cm at 300 ppi/);
  assert.match(printGuide({width:1080,height:1440}),/Larger prints will look softer/);
});
test('native sharing handles support, cancellation and failure without copying on cancel',async()=>{
  const data={title:'Fingertips — Leo Lune',url:'https://leolune.store/fingertips.html'};
  assert.equal(await shareArtwork(data,{}),'unavailable');
  assert.equal(await shareArtwork(data,{share:async received=>assert.deepEqual(received,data)}),'shared');
  assert.equal(await shareArtwork(data,{share:async()=>{throw Object.assign(new Error(),{name:'AbortError'});}}),'cancelled');
  assert.equal(await shareArtwork(data,{share:async()=>{throw new Error('no');}}),'failed');
});
test('all generated pages include optional support and download follow-up controls',async()=>{
  for(const page of ['index.html',...PRODUCTS.map(p=>p.page)]) {
    const html=await readFile(new URL(`../docs/${page}`,import.meta.url),'utf8');
    for(const id of ['hero-support','share-artwork','download-followup','keep-browsing']) assert.ok(html.includes(`id="${id}"`));
    for (const id of ['print-size','download-again','clear-search','search-feedback']) assert.ok(html.includes(`id="${id}"`));
    assert.ok(html.includes('app.js?v=19'));
  }
});
test('support checkout permits only live HTTPS Stripe payment links',()=>{
  assert.equal(liveSupportLink('https://buy.stripe.com/eVqbJ13ZcbcH57H2weco000'),'https://buy.stripe.com/eVqbJ13ZcbcH57H2weco000');
  for (const url of [undefined,'','javascript:alert(1)','https://evil.example/link','https://buy.stripe.com.evil.example/link','http://buy.stripe.com/link','https://buy.stripe.com/test_example','https://secret@buy.stripe.com/link']) assert.equal(liveSupportLink(url),'');
});
test('featured row is deliberate and all artwork is retained',()=>{
  assert.deepEqual(FEATURED_PRODUCTS.slice(0,3).map(p=>p.id), FEATURED_IDS);
  assert.equal(new Set(FEATURED_PRODUCTS.map(p=>p.id)).size,12);
});
test('category and search filters compose without mutating catalogue',()=>{
  assert.equal(filterProducts(PRODUCTS,{category:'photo'}).length,5);
  assert.equal(filterProducts(PRODUCTS,{category:'type'}).length,7);
  assert.deepEqual(filterProducts(PRODUCTS,{query:' smile '}).map(p=>p.id),['smile']);
  assert.equal(filterProducts(PRODUCTS,{query:'not here'}).length,0);
  filterProducts(FEATURED_PRODUCTS,{sort:'title'});
  assert.equal(FEATURED_PRODUCTS[0].id,'fingertips');
});
test('currency parser rejects empty, negative, scientific and excess precision amounts',()=>{
  for (const v of ['', ' ', '-1', '1e3', 'NaN','1.001','Infinity']) assert.equal(amountInPennies(v),null);
  assert.equal(amountInPennies('1.25'),125); assert.equal(amountInPennies('500'),50000);
  assert.equal(amountInPennies('0'),0);
  for (const v of [true,null,[],{},'1e3',NaN]) assert.equal(parseAmount(v),null);
  for (const v of [null,'500',NaN,99,50001]) assert.equal(isAllowedPaidAmount(v),false);
});
test('no nonexistent print files are advertised',()=>{
  for (const p of PRODUCTS) { assert.equal(fileOptions(p).length,1); assert.equal(fileOptions(p)[0].path,p.image); }
  assert.equal(getProduct('__proto__'),null);
});
test('every direct page has its own static title, canonical and sharing metadata',async()=>{
  for (const p of PRODUCTS) {
    const html=await readFile(new URL(`../docs/${p.page}`,import.meta.url),'utf8');
    assert.ok(html.includes(`<link rel="canonical" href="https://leolune.store/${p.page}">`));
    assert.ok(html.includes(`content="https://leolune.store/share-${p.id}.png"`));
    assert.ok(html.includes('twitter:card'));
    assert.ok(html.includes('aria-label="Close full-screen view"'));
    assert.ok((await stat(new URL(`../docs/${p.preview}`,import.meta.url))).size < 900000);
    assert.ok((await stat(new URL(`../docs/downloads/${p.file}`,import.meta.url))).size > 0);
  }
});
const paid = () => ({mode:'payment',status:'complete',payment_status:'paid',currency:'gbp',amount_total:500,metadata:{store:'leo-lune',productId:'smile',format:'original',amount:'500'}});
test('only matching paid store sessions can verify',()=>{
  assert.deepEqual(verifiedPurchase(paid()),{paid:true,productId:'smile',format:'original'});
  for(const changes of [{payment_status:'unpaid'},{status:'open'},{currency:'usd'},{amount_total:999},{mode:'subscription'},{metadata:{...paid().metadata,store:'other'}},{metadata:{...paid().metadata,format:'print'}}]) assert.equal(verifiedPurchase({...paid(),...changes}),null);
});
function response() {return {headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(c){this.statusCode=c;return this;},json(v){this.body=v;return this;},end(){return this;}};}
const request=changes=>({method:'POST',headers:{origin:'https://leolune.store','content-type':'application/json'},body:{productId:'smile',amount:500,format:'original',requestId:'11111111-1111-4111-8111-111111111111'},...changes});
test('checkout endpoints validate inputs and keep keys on the server',async(t)=>{
  const old={...process.env};
  process.env.SITE_URL='https://leolune.store'; process.env.STRIPE_SECRET_KEY='test-only-placeholder'; process.env.PAYMENTS_ENABLED='true';
  const originalFetch=globalThis.fetch;
  let calls=[];
  globalThis.fetch=async(url,options)=>{ calls.push({url,options}); return {ok:true,json:async()=>({url:'https://checkout.stripe.com/c/pay/example'})}; };
  try {
    await t.test('valid checkout has server-selected GBP product and retry key',async()=>{
      const res=response(); await createCheckout(request(),res); assert.equal(res.statusCode,200);
      const payload=new URLSearchParams(calls.at(-1).options.body);
      assert.equal(payload.get('line_items[0][price_data][currency]'),'gbp');
      assert.equal(payload.get('line_items[0][price_data][product_data][name]'),'Smile — digital download');
      assert.equal(payload.get('success_url'),'https://leolune.store/smile.html?checkout=success&session_id={CHECKOUT_SESSION_ID}');
      assert.equal(calls.at(-1).options.headers['Idempotency-Key'],'leo-lune-11111111-1111-4111-8111-111111111111');
      assert.deepEqual(Object.keys(res.body),['url']);
    });
    for(const [name,change,code] of [
      ['foreign origin',{headers:{origin:'https://other.example'}},403],
      ['wrong method',{method:'GET'},405],
      ['unknown product',{body:{...request().body,productId:'__proto__'}},400],
      ['free amount bypasses payments',{body:{...request().body,amount:0}},400],
      ['fractional pennies',{body:{...request().body,amount:1.1}},400],
      ['unavailable print',{body:{...request().body,format:'print'}},400],
      ['bad retry key',{body:{...request().body,requestId:'invalid'}},400]
    ]) await t.test(name,async()=>{const before=calls.length,res=response();await createCheckout(request(change),res);assert.equal(res.statusCode,code);assert.equal(calls.length,before);});
    await t.test('CORS preflight',async()=>{const res=response();await createCheckout(request({method:'OPTIONS'}),res);assert.equal(res.statusCode,204);});
    await t.test('disabled payments do not contact Stripe',async()=>{process.env.PAYMENTS_ENABLED='false';const before=calls.length,res=response();await createCheckout(request(),res);assert.equal(res.statusCode,503);assert.equal(calls.length,before);process.env.PAYMENTS_ENABLED='true';});
    await t.test('verification returns only allowlisted product and file',async()=>{globalThis.fetch=async()=>({ok:true,json:async()=>paid()});const res=response();await verifySession(request({method:'GET',query:{session_id:'cs_test_abc123'}}),res);assert.equal(res.statusCode,200);assert.deepEqual(res.body,{paid:true,productId:'smile',format:'original'});});
    await t.test('invalid session ID never contacts Stripe',async()=>{globalThis.fetch=async()=>{throw new Error('must not call');};const res=response();await verifySession(request({method:'GET',query:{session_id:'../../secret'}}),res);assert.equal(res.statusCode,400);});
    await t.test('Stripe errors are sanitized',async()=>{globalThis.fetch=async()=>{throw new Error('sensitive upstream content');};const res=response();await createCheckout(request(),res);assert.equal(res.statusCode,502);assert.ok(!JSON.stringify(res.body).includes('sensitive'));});
  } finally {globalThis.fetch=originalFetch;for(const key of ['SITE_URL','STRIPE_SECRET_KEY','PAYMENTS_ENABLED']) old[key]===undefined?delete process.env[key]:process.env[key]=old[key];}
});

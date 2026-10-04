import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {validateEnquiry} from '../worker/contact.js';
const data={email:'visitor@example.com',message:'Can I ask about a print?',artwork:'Fingertips',requestId:'11111111-1111-4111-8111-111111111111'};
test('receiver rejects JSON null without crashing',async()=>{
  const request=new Request('https://receiver.example/contact',{method:'POST',headers:{Origin:'https://leolune.store','Content-Type':'application/json'},body:'null'});
  assert.equal((await worker.fetch(request,{RESEND_API_KEY:'placeholder',CONTACT_RATE_LIMIT:{limit:async()=>({success:true})}})).status,400);
});
test('enquiries reject invalid addresses, oversized messages and retry IDs',()=>{
  assert.deepEqual(validateEnquiry(data),data);
  for (const change of [{email:'invalid'},{email:'a@example.com\nBcc: bad@example.com'},{message:'short'},{message:'x'.repeat(3001)},{requestId:'bad'},{artwork:''}]) assert.equal(validateEnquiry({...data,...change}),null);
});
test('receiver fails closed until configured and rejects foreign origins',async()=>{
  const req=(origin)=>new Request('https://receiver.example/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
  assert.equal((await worker.fetch(req('https://evil.example'),{})).status,403);
  assert.equal((await worker.fetch(req('https://leolune.store'),{})).status,503);
});
test('receiver uses a fixed recipient, visitor reply-to and retry idempotency',async()=>{
  const original=globalThis.fetch;let options;
  globalThis.fetch=async(url,opts)=>{options=opts;return new Response('{}',{status:200});};
  try {
    const request=new Request('https://receiver.example/contact',{method:'POST',headers:{Origin:'https://leolune.store','Content-Type':'application/json'},body:JSON.stringify(data)});
    const response=await worker.fetch(request,{RESEND_API_KEY:'test-placeholder',CONTACT_RATE_LIMIT:{limit:async()=>({success:true})}});
    assert.equal(response.status,200);
    const email=JSON.parse(options.body);assert.deepEqual(email.to,['leolunedesign@gmail.com']);assert.equal(email.reply_to,data.email);assert.equal(options.headers['Idempotency-Key'],`leo-enquiry-${data.requestId}`);
  } finally {globalThis.fetch=original;}
});

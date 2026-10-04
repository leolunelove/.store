// Separate contact receiver: no payment keys or private data in GitHub Pages.
const ORIGIN = 'https://leolune.store';
export function validateEnquiry(data) {
  if (!data || typeof data !== 'object') return null;
  const email=typeof data.email==='string'?data.email.trim():'';
  const message=typeof data.message==='string'?data.message.trim():'';
  const artwork=typeof data.artwork==='string'?data.artwork.trim():'';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || /[\r\n]/.test(email)) return null;
  if (message.length<10 || message.length>3000 || !artwork || artwork.length>120) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.requestId||'')) return null;
  return {email,message,artwork,requestId:data.requestId};
}
export default {
  async fetch(request, env) {
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    const reply=(status,error)=>Response.json(error?{error}:{sent:true},{status,headers});
    if (request.headers.get('Origin')!==ORIGIN) return reply(403,'Not allowed.');
    headers['Access-Control-Allow-Origin']=ORIGIN;
    headers['Access-Control-Allow-Methods']='POST, OPTIONS';
    headers['Access-Control-Allow-Headers']='Content-Type';
    if (new URL(request.url).pathname!=='/contact') return reply(404,'Not found.');
    if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
    if (request.method!=='POST') return reply(405,'Use POST.');
    if (!env.RESEND_API_KEY || !env.CONTACT_RATE_LIMIT) return reply(503,'Not connected yet.');
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply(415,'Use JSON.');
    const text=await request.text();
    if (text.length>6000) return reply(413,'Message too large.');
    let data; try { data=JSON.parse(text); } catch { return reply(400,'Invalid message.'); }
    if (data.website) return reply(400,'Invalid message.');
    const enquiry=validateEnquiry(data); if (!enquiry) return reply(400,'Check your email and message.');
    const {success}=await env.CONTACT_RATE_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});
    if (!success) return reply(429,'Try again in a minute.');
    try {
      const sent=await fetch('https://api.resend.com/emails',{
        method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`leo-enquiry-${enquiry.requestId}`},
        body:JSON.stringify({from:'Leo Lune Store <store@leolune.fun>',to:['leolunedesign@gmail.com'],reply_to:enquiry.email,subject:'New enquiry — Leo Lune Store',text:`Artwork: ${enquiry.artwork}\nReply to: ${enquiry.email}\n\n${enquiry.message}`}),
        signal:AbortSignal.timeout(10000)
      });
      if (!sent.ok) return reply(502,'Could not send. Retry safely.');
      return reply(200);
    } catch { return reply(502,'Could not send. Retry safely.'); }
  }
};

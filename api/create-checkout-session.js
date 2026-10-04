import { beginRequest, getProduct, getSiteUrl, parseAmount, isAllowedPaidAmount } from '../server/store.js';
import { stripeRequest } from '../server/stripe.js';
export default async function handler(req,res) {
  if (!beginRequest(req,res,'POST')) return;
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json') || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({error:'A JSON request is required'});
  if (Number(req.headers['content-length'] || 0) > 8192) return res.status(413).json({error:'Request too large'});
  const {productId, format='original', requestId} = req.body;
  const product = getProduct(productId), amount = parseAmount(req.body.amount);
  if (!product || !product.files.some(f=>f.id === format)) return res.status(400).json({error:'Unknown artwork or file'});
  if (!isAllowedPaidAmount(amount)) return res.status(400).json({error:'Choose an amount from £1 to £500'});
  if (typeof requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)) return res.status(400).json({error:'Invalid checkout request'});
  const pageUrl = `${getSiteUrl()}/${product.page}`;
  const body = new URLSearchParams({
    mode:'payment', 'payment_method_types[0]':'card',
    'line_items[0][quantity]':'1', 'line_items[0][price_data][currency]':'gbp',
    'line_items[0][price_data][unit_amount]':String(amount), 'line_items[0][price_data][product_data][name]':product.name,
    'metadata[store]':'leo-lune','metadata[productId]':productId,'metadata[format]':format,'metadata[amount]':String(amount),
    success_url:`${pageUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${pageUrl}?checkout=cancelled`
  });
  try {
    const session = await stripeRequest('checkout/sessions',{body,requestId});
    if (typeof session.url !== 'string' || new URL(session.url).origin !== 'https://checkout.stripe.com') throw new Error('Missing checkout URL');
    return res.status(200).json({url:session.url});
  } catch { return res.status(502).json({error:'Checkout could not be started. Please try again.'}); }
}

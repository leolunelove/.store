import { PRODUCTS as catalogue } from '../docs/catalog.js';
import { fileOptions } from '../docs/store-utils.js';
export const PRODUCTS = Object.freeze(Object.fromEntries(catalogue.map(p=>[p.id, {
  name: `${p.title} — digital download`, page:p.page, files:fileOptions(p)
}])));
export const MIN_PAID_AMOUNT = 100, MAX_PAID_AMOUNT = 50000;
export function getProduct(id) { return typeof id === 'string' && Object.hasOwn(PRODUCTS,id) ? PRODUCTS[id] : null; }
export function parseAmount(value) {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}
export function isAllowedPaidAmount(amount) { return Number.isSafeInteger(amount) && amount >= MIN_PAID_AMOUNT && amount <= MAX_PAID_AMOUNT; }
export function getSiteUrl() {
  if (!process.env.SITE_URL) throw new Error('SITE_URL is required');
  const url = new URL(process.env.SITE_URL);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid SITE_URL');
  return url.href.replace(/\/$/,'');
}
export function beginRequest(req, res, method) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('Vary','Origin');
  let siteUrl;
  try { siteUrl = getSiteUrl(); } catch { res.status(503).json({error:'Payments are not configured yet.'}); return false; }
  const origin = new URL(siteUrl).origin;
  if (req.headers.origin && req.headers.origin !== origin) { res.status(403).json({error:'Origin not allowed'}); return false; }
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Methods',`${method}, OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  if (req.method !== method) { res.setHeader('Allow',`${method}, OPTIONS`); res.status(405).json({error:'Method not allowed'}); return false; }
  if (!process.env.STRIPE_SECRET_KEY || process.env.PAYMENTS_ENABLED !== 'true') { res.status(503).json({error:'Payments are not connected yet. You can still download free.'}); return false; }
  return true;
}
export function verifiedPurchase(session) {
  const product = getProduct(session.metadata?.productId);
  const format = session.metadata?.format;
  const file = product?.files.find(f=>f.id === format);
  if (!product || !file || session.metadata?.store !== 'leo-lune' || session.mode !== 'payment' || session.status !== 'complete' || session.payment_status !== 'paid' || session.currency !== 'gbp' || !isAllowedPaidAmount(session.amount_total) || session.amount_total !== parseAmount(session.metadata?.amount)) return null;
  return {paid:true,productId:session.metadata.productId,format};
}

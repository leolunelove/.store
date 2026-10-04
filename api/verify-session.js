import {beginRequest,verifiedPurchase} from '../server/store.js';
import {stripeRequest} from '../server/stripe.js';
export default async function handler(req,res) {
  if (!beginRequest(req,res,'GET')) return;
  const sessionId = req.query?.session_id;
  if (typeof sessionId !== 'string' || !/^cs_(test_|live_)[A-Za-z0-9]{1,240}$/.test(sessionId)) return res.status(400).json({error:'Invalid checkout session'});
  try {
    const result = verifiedPurchase(await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}`));
    if (!result) return res.status(403).json({error:'Payment has not been confirmed. You can still download free.'});
    return res.status(200).json(result);
  } catch { return res.status(502).json({error:'Payment could not be verified. Refresh to try again.'}); }
}

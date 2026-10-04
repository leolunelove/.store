// Stripe calls run only on the server. No secret key reaches GitHub Pages.
export async function stripeRequest(path, {body, requestId} = {}) {
  const headers = {Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`};
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (requestId) headers['Idempotency-Key'] = `leo-lune-${requestId}`;
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method:body ? 'POST':'GET', headers, body:body?.toString(), signal:AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Stripe request failed');
  return response.json();
}

# Leo Lune store

The live storefront is **https://leolune.store**, hosted by GitHub Pages from `main /docs`.
Optional support uses a live Stripe Payment Link in `docs/config.js`: customer-chosen GBP amounts (£1–£500, £5 suggested). Downloads remain unconditional and free; Stripe hosts checkout and payment records. Only a public payment URL is shipped to GitHub Pages, never API keys.
The alternative Vercel payment backend is **not connected** and is not production-complete. Add and verify a signed, idempotent webhook handler before enabling any automated paid fulfillment. Returning from the Payment Link does not prove payment and triggers no paid fulfillment.

## What is included

- Twelve original 1080×1440 PNG files, preserved unchanged in `docs/downloads/`.
- Responsive 320px, 640px and 960px JPEG previews; the browser selects an appropriate size. Original files load only for full-size viewing or downloads. Originals are not upscaled.
- Individual artwork HTML pages with canonical URLs, Open Graph/Twitter metadata, a sitemap and a no-JavaScript download fallback.
- Full-screen original viewer, zoom, keyboard navigation and meaningful category filters. No bookmarking or shareable filter URLs.
- Free-first downloads with a separate optional “Support the work” link. The custom API remains disabled.
- A server-controlled Stripe Checkout flow with strict product/file validation, GBP amount bounds, retry idempotency and payment verification.

## Edit artwork and regenerate pages

`docs/catalog.js` is the source for titles, categories, original files and the featured opening row (`FEATURED_IDS`).
Change the reusable page markup in `scripts/store-template.html`; don't edit generated `docs/index.html` or the individual artwork HTML pages directly.

```sh
npm run build:pages
npm test
```

`npm run check:pages` also checks all artwork files, preview paths, PNG dimensions, local page links and accidental private keys in public files. The Pages workflow runs this validation before deploying; enable **GitHub Actions** as the repository Pages source. Failed checks stop publication. Mobile layout is checked with a browser viewport; a physical-phone payment-wallet check is still a separate manual check.

On macOS, export the lightweight previews from unchanged originals:

```sh
npm run build:previews
```

The preview command uses macOS `sips`. Normal page generation only needs Node.js 20+; previews are checked in so the Vercel build also works on Linux.

The featured row is Fingertips, I'm Half Crazy and Who Made You King. Change `FEATURED_IDS` to rotate it. Counts, ordering and navigation update from the catalogue.

## Larger print files

Higher-resolution masters have not been supplied. The current files are not advertised as large-format print exports and are never upscaled.
When a real print master is available, add `printFile` to that product with `{ path, file, width, height }` (relative to `docs/`). The file menu and server allowlist pick it up automatically. Rebuild, test and deploy both frontend and backend after catalogue changes.

## Local preview

```sh
python3 -m http.server 4173 --directory docs
```

Open `http://localhost:4173/`. For local API testing, `npm install` then `npm run dev`, set server environment variables and point `docs/config.js` at that local API origin temporarily. Never commit private environment files.

## Connect Stripe on Vercel

1. Import **leolunelove/.store** into Vercel. Use framework **Other**. `vercel.json` supplies the build command, static output directory and Node function settings.
2. Set environment variables directly in Vercel's private project settings:
   - `STRIPE_SECRET_KEY`: a Stripe **test** secret key first. Never put it in `docs/` or chat.
   - `SITE_URL`: `https://leolune.store`
   - `PAYMENTS_ENABLED`: `true` for the test deployment after the key is configured; `false` disables payment requests immediately after redeploy.
3. Deploy the API. Set `apiBaseUrl` in `docs/config.js` to that Vercel origin, with no trailing slash, then publish the Pages change.
4. Complete test-mode payment, cancellation, refresh/retry and free-download checks. Verify the charged amount and matching product in Stripe. No real payment has been tested in this project yet.
5. Only after test-mode checks and Stripe account activation, replace the private key with a live key and redeploy. Verify Apple Pay on an eligible device; don't promise it on every browser.

Hosted Stripe Checkout keeps card entry outside the store. Card payment methods can include Apple Pay on supported devices when enabled for the Stripe account. No Stripe secret or publishable key is required in the frontend.

## Security and operations

## Ask Leo contact receiver

The on-site enquiry dialog includes a copyable email address. `contactEndpoint` remains empty until the Worker is deployed and email delivery tested; the form never reports a false success.

Deploy `worker/contact.js` with `wrangler.jsonc` to Cloudflare Workers. Set `RESEND_API_KEY` as a private Worker secret, restricted to sending from the verified `leolune.fun` domain. No secret is committed. The recipient is fixed to Leo's contact address; visitors become Reply-To, not From. The receiver validates input, restricts the website origin, checks a honeypot and limits each IP to three requests per minute. Retries reuse a Resend idempotency key. Personal message bodies are not logged. There is no marketing subscription or visitor auto-reply.

After a real delivery check, set `docs/config.js` `contactEndpoint` to `https://<worker-host>/contact` and publish Pages. This contact backend is separate from the unconnected payment API.

## Payment security

- API origins, product IDs, formats and amounts are validated server-side. Support amounts are whole pennies from £1 to £500.
- Checkout Session creation uses Stripe idempotency keys for retries. Success-page URLs alone never establish payment.
- Verification checks session completion, paid status, currency, expected amount, store marker, product and file against the server catalogue.
- API responses are not cached and do not expose Stripe secrets or customer details. Errors returned to the browser are generic.
- Every artwork is intentionally free; payment verification is not a paywall. Don't reuse this design for paid-only files without protected file delivery and webhook-backed fulfilment.
- Before a broad paid launch, configure abuse/rate limits at the hosting layer, confirm account/payment settings, and review the usage note with the artist.

## References

- [Stripe hosted Checkout](https://docs.stripe.com/payments/checkout/how-checkout-works)
- [Create a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create)
- [Stripe Apple Pay](https://docs.stripe.com/apple-pay)

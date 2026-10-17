<p align="center">
  <img src="docs/apple-touch-icon.png" width="80" height="80" alt="Leo Lune mark">
</p>

<h1 align="center">Leo Lune Store</h1>

<p align="center">Download it. Print it. Put it up.</p>

<p align="center">
  <a href="https://leolune.store/">Open the store</a> ·
  <a href="https://www.leolune.com/">Portfolio</a> ·
  <a href="#run-locally">Development & deployment</a>
</p>

## Find something you like

- **Browse the work.** Twelve artworks, with a curated opening six. Search by title, colour or subject, filter photo-led and type-led pieces, and choose a grid that suits you.
- **Take a closer look.** Open any artwork for the full-size view, zoom in, or move between pieces with the keyboard and touch controls.
- **Download it.** Get the original PNG straight away. Each artwork shows its dimensions, actual file size and a guide to small-print sizing.
- **Pay what it's worth to you.** Downloads are free. The separate **Support the work** link opens Stripe, where you choose an amount.
- **Keep looking.** Three selected related pieces sit on each artwork page. Returning to the gallery keeps your search and filters.
- **Send it on.** Every artwork has its own link and sharing preview.

## Get started

1. [Open the store](https://leolune.store/) and choose a piece.
2. Select **Download PNG** to save the original file.
3. Choose **Support the work** if you want to chip in. Payment is optional and separate from the download.
4. Print it for personal use, or keep browsing for something else.

## The artwork

The current collection contains twelve original **1080 × 1440 px PNGs**. Downloads preserve the supplied files unchanged. The gallery uses smaller JPEG previews so browsing doesn't load every original.

These files suit screens and small personal prints. Higher-resolution print masters haven't been supplied; the store doesn't upscale the originals or advertise them as large-format print files.

The opening six are **Fingertips**, **I'm Half Crazy**, **Who Made You King**, **Smile**, **XTCY** and **High and Lows**.

## Run locally

Use Node.js 20 or later. GitHub Actions uses Node.js 22.

```sh
git clone https://github.com/leolunelove/.store.git
cd .store
npm run build:pages
python3 -m http.server 4173 --directory docs
```

Open [localhost:4173](http://localhost:4173/). The static storefront build needs no package installation or API keys.

Run `npm run check:pages` before publishing. It regenerates the pages, runs the tests, and checks artwork dimensions, preview files, local links and accidental private keys in public files. Browser checks cover responsive layouts; payment wallets still need checking on a compatible physical device.

## Edit the collection

Edit [docs/catalog.js](docs/catalog.js) for artwork titles, files, categories, search tags, the featured order (`FEATURED_IDS`) and related pieces (`RELATED_IDS`). Edit [scripts/store-template.html](scripts/store-template.html) for shared page markup.

```sh
npm run build:pages
npm run check:pages
```

The build generates the gallery, individual artwork pages, sitemap and file-size metadata. Make changes in the catalogue and template rather than editing generated HTML directly.

On macOS, run `npm run build:previews` to regenerate the 320, 640 and 960 px JPEG previews using `sips`. Previews are checked into the repository, so normal builds also work on Linux. Run `npm install` before `npm run build:social` when regenerating social sharing images.

When a genuine print master is available, add its `printFile` entry to the catalogue with `{ path, file, width, height }`, relative to `docs/`, then rebuild and check the pages. If using the optional payment API, deploy its updated catalogue too.

## Repository guide

| Path | Purpose |
| --- | --- |
| [docs/](docs/) | Published storefront, styles, browser code and generated artwork pages |
| [docs/catalog.js](docs/catalog.js) | Artwork catalogue, featured order and related selections |
| [docs/downloads/](docs/downloads/) | Unchanged original PNG downloads |
| [docs/config.js](docs/config.js) | Public support link and optional service endpoints |
| [scripts/](scripts/) | Page generation, image previews, sharing images and publication checks |
| [test/](test/) | Storefront, catalogue, payment and contact checks |
| [api/](api/) & [server/](server/) | Optional server-side Checkout implementation; not connected to the live store |
| [worker/](worker/) | Optional Ask Leo email receiver; not connected to the live store |
| [.github/workflows/](.github/workflows/) | Checks and GitHub Pages publishing |

GitHub Pages hosts [leolune.store](https://leolune.store/). The **Check and publish store** workflow builds and validates `docs/`, then publishes it when changes reach `main`. Failed checks stop deployment. Set the repository's Pages source to **GitHub Actions**; [docs/CNAME](docs/CNAME) supplies the custom domain.

## Built with

HTML, CSS and JavaScript, with Node.js scripts generating the static pages. Artwork pages include canonical URLs, social sharing metadata and a download fallback for browsers without JavaScript.

Optional support uses a public Stripe Payment Link. Stripe hosts checkout and payment records; no Stripe API keys are needed in the frontend. Downloads remain available whether or not someone pays.

Ask Leo currently provides a copyable email address. Sending through the form stays disabled until its private email service is configured and delivery has been tested.

<details>
<summary>Optional services and setup notes</summary>

### Payment API

The Vercel Checkout backend is included for further development but is **not connected** to the live store. It validates products, files, GBP amounts and payment status server-side, and uses idempotency keys for checkout retries. Before enabling automated paid fulfilment, add and verify a signed, idempotent webhook handler and protected delivery for any paid-only files. A payment return URL is not proof of payment.

To develop it, run `npm install` and `npm run dev`. For a Vercel deployment, import this repository with framework **Other**; [vercel.json](vercel.json) defines the build and function settings. Configure `STRIPE_SECRET_KEY`, `SITE_URL` and `PAYMENTS_ENABLED` in private hosting settings. Start with a test key and leave payments disabled until configuration is ready.

Point `apiBaseUrl` in [docs/config.js](docs/config.js) at the deployed API origin only after configuration. Test payment, cancellation, retries and free downloads before changing to live credentials. Verify Apple Pay on an eligible device. Never commit private keys or environment files.

### Contact receiver

[worker/contact.js](worker/contact.js) and [wrangler.jsonc](wrangler.jsonc) provide an optional Cloudflare Worker receiver. Configure `RESEND_API_KEY` as a private Worker secret for the verified sending domain. The receiver fixes the recipient, validates messages, restricts the website origin, checks a honeypot and rate-limits requests. Visitor email addresses become Reply-To; message bodies aren't logged.

Keep `contactEndpoint` empty until a real delivery check succeeds. Then set it to the Worker's `/contact` URL and publish the configuration. This service is independent of the payment API.

</details>

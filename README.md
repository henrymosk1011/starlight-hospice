# Starlight Hospice website

Static, multi page website for [Starlight Hospice](https://www.starlighthospice.org), a family owned hospice in Burbank, CA.

Built to WCAG 2.2 Level AA. Designed by [TENELEVENMEDIA](https://www.tenelevenmedia.com).

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `about.html` | About |
| `services.html` | Services |
| `admissions.html` | Admissions and costs |
| `contact.html` | Contact |
| `accessibility.html` | Accessibility statement |
| `404.html` | Page not found, also redirects old Webflow addresses |

Shared files: `styles.css`, `main.js`, `logo.png`, `hero.webp` (with `hero.jpg` fallback).

The contact page embeds a Google map of the office (a plain iframe, no API key). To change what it shows, edit the `q=` search in the iframe `src` in `contact.html`.

The contact form posts to `/api/contact`, a small Cloudflare Worker in `worker/` that emails the office through Resend. See [Contact form](#contact-form).

No build step and no framework.

## Hosting

GitHub Pages publishes `main` to https://www.starlighthospice.org. Every push to `main` goes live in about a minute.

- `CNAME` sets the custom domain. GitHub redirects `starlighthospice.org` to `www`.
- `_config.yml` keeps `CLAUDE.md`, `README.md`, `tests/`, `worker/` and the npm files off the public site.
- `404.html` uses root relative paths (`/styles.css`), because GitHub Pages serves it at whatever address was missing. Its script sends the old Webflow addresses (`/services/palliative-care` and the rest) to the matching page or section.
- `robots.txt` and `sitemap.xml` point search engines at the six pages. Each page has a canonical link and link preview tags.

DNS is on Cloudflare (the domain is registered at GoDaddy, with its nameservers pointed at Cloudflare). Leave the Google Workspace MX and TXT records alone. The site records are proxied (orange cloud), which the contact form route needs:

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `henrymosk1011.github.io` |

## Contact form

The form in `contact.html` posts to `https://www.starlighthospice.org/api/contact`. A Cloudflare Worker named `starlighthospice-contact` answers that one address (route `www.starlighthospice.org/api/contact*`); everything else still comes from GitHub Pages. The Worker checks the message again, then sends it to info@starlighthospice.org through [Resend](https://resend.com) from website@starlighthospice.org, with Reply To set to the visitor's email when they give one. Nothing is stored by the Worker.

- Code: `worker/contact.js`. Settings: `worker/wrangler.jsonc` (recipient, sender, allowed origin, and a rate limit of 5 messages a minute per visitor).
- Spam protection: the Worker only accepts posts from the website, a hidden field catches bots, and posts sent within 1.5 seconds of the page loading are asked to send again.
- The Resend key is a Worker secret, a sending only key limited to starlighthospice.org. To replace it: `cd worker`, then `npx wrangler secret put RESEND_API_KEY`.
- To deploy a change: `cd worker`, then `npx wrangler deploy`.
- Without JavaScript the browser posts the form directly and the Worker answers with a short confirmation page.
- Resend DNS records on Cloudflare (DNS only, gray cloud): TXT `resend._domainkey`, MX and TXT `send`, CNAME `rsend`.
- Sent messages and delivery status: Resend dashboard, Emails. Worker errors: Cloudflare dashboard, Workers, `starlighthospice-contact`, Logs.

Resend does not sign a HIPAA Business Associate Agreement, so the form asks visitors not to include medical details. Keep that note on the form.

## Preview locally

```bash
npm run serve
```

The contact form only sends on the live site; locally it shows the could not be sent message.

## Accessibility tests

```bash
npm install
pip install playwright pillow
python -m playwright install chromium
npm run test:a11y
```

Runs an axe-core scan, hero photo contrast measurement, a full keyboard focus walk, reflow, text spacing and zoom checks, and WAVE's alert and contrast rules (calibrated against the WAVE extension, so pages keep an AIM score of 10). See `tests/a11y.py`.

## Before launch

- Confirm the home page stats (150+, 15, 12) with the client.
- Check that the map on the live contact page shows the Starlight Hospice listing. The embed searches Google for the name and address.
- Manual screen reader pass (VoiceOver and NVDA).

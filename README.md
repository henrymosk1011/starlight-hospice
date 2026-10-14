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

No build step and no framework.

## Hosting

GitHub Pages publishes `main` to https://www.starlighthospice.org. Every push to `main` goes live in about a minute.

- `CNAME` sets the custom domain. GitHub redirects `starlighthospice.org` to `www`.
- `_config.yml` keeps `CLAUDE.md`, `README.md`, `tests/` and the npm files off the public site.
- `404.html` uses root relative paths (`/styles.css`), because GitHub Pages serves it at whatever address was missing. Its script sends the old Webflow addresses (`/services/palliative-care` and the rest) to the matching page or section.
- `robots.txt` and `sitemap.xml` point search engines at the six pages. Each page has a canonical link and link preview tags.

DNS at GoDaddy (leave the MX and TXT records for email alone):

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `henrymosk1011.github.io` |

## Preview locally

```bash
npm run serve
```

## Accessibility tests

```bash
npm install
pip install playwright pillow
python -m playwright install chromium
npm run test:a11y
```

Runs an axe-core scan, hero photo contrast measurement, a full keyboard focus walk, reflow, text spacing and zoom checks, and WAVE's alert and contrast rules (calibrated against the WAVE extension, so pages keep an AIM score of 10). See `tests/a11y.py`.

## Before launch

- Contact form: add `data-endpoint="https://..."` to the form in `contact.html` (for example a Formspree URL). Until then it tells visitors to call.
- Confirm the home page stats (150+, 15, 12) with the client.
- Check that the map on the live contact page shows the Starlight Hospice listing. The embed searches Google for the name and address.
- Manual screen reader pass (VoiceOver and NVDA).

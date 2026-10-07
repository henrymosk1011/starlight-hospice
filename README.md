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

Shared files: `styles.css`, `main.js`, `logo.png`, `hero.webp` (with `hero.jpg` fallback).

The contact page embeds a Google map of the office (a plain iframe, no API key). To change what it shows, edit the `q=` search in the iframe `src` in `contact.html`.

No build step and no framework. Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

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

Runs an axe-core scan, hero photo contrast measurement, a full keyboard focus walk, and reflow, text spacing and zoom checks. See `tests/a11y.py`.

## Before launch

- Contact form: add `data-endpoint="https://..."` to the form in `contact.html` (for example a Formspree URL). Until then it tells visitors to call.
- Confirm the home page stats (150+, 15, 12) with the client.
- Check that the map on the live contact page shows the Starlight Hospice listing. The embed searches Google for the name and address.
- Manual screen reader pass (VoiceOver and NVDA).

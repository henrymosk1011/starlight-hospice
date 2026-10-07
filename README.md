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

The contact page also loads `map.js`, an interactive map of the office and the Los Angeles County service area. It uses [Leaflet](https://leafletjs.com) 1.9.4, kept in `vendor/leaflet/` (BSD 2 clause license), and only loads it when the map scrolls near the screen. Map tiles come from [OpenStreetMap](https://www.openstreetmap.org/copyright), which is fine for a small site under their [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). If traffic grows, switch the tile URL in `map.js` to a commercial provider. The pin position is set by `data-lat` and `data-lng` on `#office-map` in `contact.html`.

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
- Check the map pin on the live contact page. It sits at the corner of E Olive Ave and San Fernando Blvd; nudge `data-lat` and `data-lng` if it needs to move.
- Manual screen reader pass (VoiceOver and NVDA).

# Starlight Hospice website

Static site: six HTML pages sharing `styles.css` and `main.js`. No framework, no build step.

## Hard rules

- Accessibility is the top priority. Target WCAG 2.2 AA. Run `python3 tests/a11y.py` after any change and keep every check at zero issues.
- No em dashes, en dashes, or double hyphens anywhere: copy, alt text, code comments. Use commas, colons, or rewrite.
- Credit line stays: "Designed by TENELEVENMEDIA" linking to https://www.tenelevenmedia.com.
- Use the exact `logo.png`; never redraw or approximate the logo.

## Brand

- Navy `#283891`, deep night `#0b1030`, gold `#feca34`
- Font: Varela (Google Fonts) for everything
- Phone `(323) 282-7679`, email `info@starlighthospice.org`, office 224 E Olive Ave, Suite 213, Burbank, CA 91502

## Structure

- Header, menu, footer, and back to top button are duplicated in all six pages. Change all six together.
- Every page: dark `.hero` (sticky) then `.sheet` (white content that slides over it) then sticky `.site-footer`.
- Home hero uses `hero.webp` with `hero.jpg` fallback, mirrored with `scaleX(-1)` so she faces the headline.

## Motion and accessibility conventions

- Reveal on scroll: add `data-reveal` (variants: left, right, zoom, blur, tilt, clip). Content must be visible without JS; the script only hides items that start below the fold.
- `data-stagger` on a list staggers its children. `data-split` splits a heading into masked words.
- Split headings, `.statement`, and `.fill-text` keep a `.visually-hidden` plain copy and hide the animated pieces with `aria-hidden`, so screen readers hear one clean sentence. Keep that pattern for any new animated text.
- Every animation must stop under `prefers-reduced-motion` and under `html.reduce-motion` (set by the Reduce motion switch, `role="switch"`, in the menu and footer). Nothing may auto play longer than 5 seconds.
- `main.js` keeps focused elements from hiding behind the hero, footer curtain, header, or the pinned services rail. Test any layout change with the keyboard walk (`tests/a11y.py kb`).
- The services rail unpins, and step cards unstack, automatically when content would not fit (large text or text spacing). Do not remove those safeguards.
- Text over the photo must measure at least 4.5:1 (`tests/a11y.py contrast`).
- Keep every page at WAVE AIM 10/10 (zero errors, contrast errors, and alerts). WAVE's rules, as measured: text at 14.4px or smaller is "very small", so the smallest text uses the 15px `small` token in `styles.css`; two links in a row to the same URL are "redundant" even with content between them, and same page `#` links do not separate them; a short `<p>` at 20px or larger is a "possible heading", so decorative big type goes in a `div`; text with `color: transparent` fails contrast unless a background image clips it. `tests/a11y.py wave` checks all of this.
- The contact map is a Google Maps iframe with a `title`. A page gets no `focusin` and matches no `:focus` when focus moves into a frame, so `main.js` handles frames on window blur: it reveals the frame, keeps it clear of the header, and adds `.frame-focus` for a visible keyboard ring. Keep that working for any new iframe.

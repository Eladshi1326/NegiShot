# AccessibilityWidget — Technical Reference & Integration Guide for AI Assistants

This document fully describes `AccessibilityWidget.jsx` (a React component) so an AI assistant can **install it, configure it, explain it, debug it, or extend it**. Written in English for precision; the UI is Hebrew/RTL. Implements the user-facing tools of the Israeli standard **SI 5568** (WCAG 2.0/2.1 AA). Single self-contained file, **zero dependencies** beyond React.

---

## 0. FIRST: questions to ask the user before integrating

If you (the AI) are asked to add this widget to a site, **do not assume styling**. Ask the user first (use sensible defaults if they don't care):

1. **Position** — corner? `bottom-right` (default), `bottom-left`, `top-right`, `top-left`.
2. **Color** — brand/accent color (e.g. `#2b50e0`).
3. **Size** — button diameter in px (default `58`).
4. **Shape** — `circle` (default) or `rounded` square.
5. **Icon** — built-in accessibility icon, or a custom image (`iconSrc`)?
6. **Brand label** — bottom text (default `נגישות`) or hide it (`hideBranding`).
7. **Defaults on** — any setting ON by default for all visitors? → `initialSettings`.

Then render with matching props (§3). Confirm the framework (React/Next.js/Vite/CRA) and where the global layout/App file is, so the widget mounts once, app-wide.

---

## 1. Summary

- **File:** `AccessibilityWidget.jsx` — one default-exported React function component.
- **Renders:** a fixed floating button (FAB). Clicking opens a panel of controls. Two confirmation **popups (modals)** overlay the panel: one for **hide** and one for **reset**.
- **Effects:** applied globally by toggling CSS classes on `<html>`, plus `html.style.filter` (grayscale/sepia/invert), plus a **DOM-walk that resizes every text element** for font scaling (works on px-based sites too).
- **Persistence:** user settings → `localStorage['a11y-widget-settings-v3']`; "hide" choice → cookie.
- **Layout:** the panel is **absolutely positioned relative to the button**, so opening/closing never moves the button. The button is pinned to its corner at a fixed px size, immune to text scaling.
- **SSR-safe:** all DOM/`window` access is inside effects/handlers; `'use client'` included.
- **RTL:** the panel sets `dir="rtl"`; labels are Hebrew.

---

## 2. Installation

1. Copy `AccessibilityWidget.jsx` into the project (e.g. `src/components/`).
2. Import in the top-level layout/App: `import AccessibilityWidget from './components/AccessibilityWidget';`
3. Render **once**, near the end of the returned JSX: `<AccessibilityWidget />`.
4. Next.js App Router: file starts with `'use client'`; place `<AccessibilityWidget />` in `app/layout` inside `<body>`. CRA/Vite: place in `App`.
5. **Render one instance only** (fixed element IDs).

### Standalone script (any site, incl. non-React) — `embed.jsx` → `dist/accessibility-widget.js`
For non-React sites, or one-line drop-in + auto-update, use the bundled script (React is bundled inside):
```html
<script src="https://cdn.jsdelivr.net/gh/Eladshi1326/NegiShot@latest/dist/accessibility-widget.js"
        data-a11y-widget data-position="bottom-right" data-color="#2b50e0" defer></script>
```
- `embed.jsx` reads config, priority low→high: script tag `data-*` → `window.A11yWidgetConfig` → `AccessibilityWidget.init(options)`. It creates a `#a11y-widget-host` div, renders the component into it, and auto-inits on load unless `data-auto="false"`.
- Global API: `window.AccessibilityWidget.{ init, update, unmount, getConfig }` — `update(opts)` re-renders with new props at runtime.
- `data-*` keys map to every prop: `data-position`, `data-color`, `data-icon-color`, `data-size`, `data-shape`, `data-icon-src`, `data-offset`, `data-z-index`, `data-brand-label`, `data-hide-branding`, `data-button-label`, `data-initial` (JSON).
- Build: `npm run build` → `build.mjs` → esbuild IIFE, minified, `NODE_ENV=production`, React bundled → `dist/accessibility-widget.js` (~224KB / ~70KB gzip).
- Auto-update: host on GitHub, serve via jsDelivr; push → CDN serves new file (`@latest` cache ~7d; use a version tag or purge URL for instant). Full details in `README-הפצה.md`.
- **For React projects prefer the import method above** (avoids loading a second React instance).

---

## 3. Props

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `position` | `'bottom-right'\|'bottom-left'\|'top-right'\|'top-left'` | `'bottom-right'` | Corner + panel anchor. |
| `color` | CSS color | `'#2b50e0'` | Accent (button, header, active tiles, focus). Written to `--a11y-accent`. |
| `iconColor` | CSS color | `'#ffffff'` | Icon color on the button. |
| `size` | number px | `58` | Button diameter; icon scales with it. |
| `shape` | `'circle'\|'rounded'` | `'circle'` | Button shape. |
| `iconSrc` | URL string | `null` | Custom button image. |
| `icon` | React node | `null` | Custom icon node (overrides `iconSrc`). |
| `offset` | number px | `20` | Distance from edges. |
| `zIndex` | number | `2147483000` | Stacking; mask bands use `zIndex-1`. |
| `brandLabel` | string | `'נגישות'` | Footer label. |
| `hideBranding` | boolean | `false` | Hide footer label. |
| `buttonLabel` | string | `'פתיחת תפריט נגישות'` | Button `aria-label` when closed. |
| `initialSettings` | object | `null` | Per-site default settings; also the target of "reset". |

### Examples
```jsx
<AccessibilityWidget />
<AccessibilityWidget position="bottom-left" color="#e11d48" />
<AccessibilityWidget size={72} shape="rounded" color="#0ea5e9" iconColor="#fff" />
<AccessibilityWidget iconSrc="/logo-a11y.png" brandLabel="האתר שלי" />
<AccessibilityWidget initialSettings={{ highlightLinks: true, fontSize: 1 }} hideBranding />
```

---

## 4. Settings data model

State object `settings`, initialized to `baseSettings = { ...DEFAULTS, ...(initialSettings||{}) }`:

```js
const DEFAULTS = {
  fontSize: 0,        // level 0–4  -> FONT_FACTORS = [1, 1.15, 1.3, 1.45, 1.6]
  lineHeight: 0,      // level 0–3  -> 1.6 / 1.9 / 2.3
  letterSpacing: 0,   // level 0–3  -> .06 / .12 / .2 em
  wordSpacing: 0,     // level 0–3  -> .18 / .36 / .6 em
  textAlign: 0,       // 0–4 cyclic: none / right / center / left / justify
  readableFont: false,
  highlightLinks: false,
  contrast: 0,        // 0–3 cyclic: off / dark / light / invert  (CONTRAST_NAMES)
  grayscale: 0,       // 0–2 cyclic: off / grayscale / sepia      (GRAY_NAMES)
  hideImages: false, stopAnimations: false, bigCursor: false, focusHighlight: false, readingMask: false,
};
```

> **Note:** `contrast` and `grayscale` are now **numeric cycles** (were booleans in earlier versions). STORAGE_KEY bumped to `...v3` to avoid stale boolean values.

**Persistence:** `useEffect([settings, baseSettings])` writes JSON to `localStorage`; if `settings` deep-equals `baseSettings`, the key is removed. On mount, saved settings merge over `baseSettings`.

**Transient:** `open`, `view` (`'main' | 'hide' | 'reset' | 'structure'`), `speaking`, `hidden`, `headings`, `maskY`.

---

## 5. How effects apply

**Main effect** `useEffect([settings, baseSettings])`: adds `a11y-active` (scrollbar-gutter); sets level classes `a11y-lh/ls/ws-{n}` and `a11y-align-{dir}`; toggles boolean classes; sets `html.style.filter` from grayscale (`grayscale(100%)`/`sepia(100%)`) + contrast invert (`invert(1) hue-rotate(180deg)`); toggles `a11y-contrast-dark`/`a11y-contrast-light`; lazy-loads dyslexia font; persists.

**Font effect** `useEffect([settings.fontSize])`: calls `applyFontScale(FONT_FACTORS[level])` or `clearFontScale()`. `applyFontScale` walks `document.body` elements (excluding the widget), stores each element's original computed font-size in `data-a11y-fs`, and sets `font-size = original*factor !important` inline — so **all text scales, including px-based sites**. `clearFontScale` removes the inline sizes and attributes. (Kept separate so other toggles don't trigger a DOM walk.)

**Scoping:** global rules exclude the widget via `EX = ':not(#a11y-widget-root):not(#a11y-widget-root *)'`. (Filters on `<html>` — grayscale/sepia/invert — also affect the widget, which is acceptable/consistent.)

**Layout:** container `position:fixed` at the corner sized to the button; panel `position:absolute` (`bottom|top:size+12`, `right|left:0`, `maxHeight: min(640px, calc(100vh - (offset+size+28)px))`). Button never shifts when the panel opens.

---

## 6. Feature reference

**Leveled (bars indicator, cyclic, wrap to 0)** — handler `cycle(key,max)`:
| key | label | max | mechanism |
|---|---|---|---|
| `fontSize` | גודל טקסט | 4 | DOM-walk inline `font-size` (`FONT_FACTORS`). Scales all text incl. px. |
| `lineHeight` | גובה שורה | 3 | class `a11y-lh-{n}`. |
| `letterSpacing` | מרווח אותיות | 3 | class `a11y-ls-{n}` (letter-spacing only). |
| `wordSpacing` | מרווח מילים | 3 | class `a11y-ws-{n}` (word-spacing). |

**Cyclic (text sub-label, `names` array)**:
| key | label | modes |
|---|---|---|
| `textAlign` | יישור טקסט | none/right/center/left/justify → `a11y-align-*`. |
| `contrast` | ניגודיות | off / **dark** (`a11y-contrast-dark`) / **light** (`a11y-contrast-light`) / **invert** (`html.style.filter: invert(1) hue-rotate(180deg)`). |
| `grayscale` | גווני צבע | off / **grayscale** / **sepia** (`html.style.filter`). |

**Toggles** — handler `toggle(key)`: `readableFont` (a11y-readable-font; lazy-loads OpenDyslexic; note: that font looks larger by design, it does NOT change the size setting), `highlightLinks`, `hideImages`, `stopAnimations`, `bigCursor`, `focusHighlight`, `readingMask` (see §8).

**Action:** `pageStructure` → opens the structure view (§8).

**TTS:** `speak()` reads `(main||body).innerText || textContent`, `lang='he-IL'`, via `speechSynthesis`.

---

## 7. Header controls & popups

Header has three buttons:
- **Reset (↺)** → sets `view='reset'` → a **confirmation popup** ("לאפס את כל הגדרות הנגישות?" → "כן, אפס הכול" / "ביטול"). Confirm calls `doReset()` (→ `baseSettings`).
- **Eye (hide)** → sets `view='hide'` → a **popup** asking duration: 8h / 24h / permanent / cancel → `hideFor(sec)` sets cookie `a11yWidgetHidden`, hides widget (component returns `null`). Restore via **Alt+Shift+A** (`clearHideCookie()` + `setHidden(false)`), works even while hidden.
- **Close (✕)** → closes the panel.

Popups are `.a11y-modal-overlay` absolutely covering the panel (`role="dialog" aria-modal="true"`), visually separate from the menu. Esc backs out one level (popup/sub-view → main → close).

---

## 8. Special features

**Reading mask** (`readingMask`): `mousemove` updates `maskY`; two `position:fixed` `.a11y-mask-band` divs (`rgba(0,0,0,.6)`, `pointer-events:none`, `zIndex-1`) leave a ~140px clear strip, and the strip edges have a **bright yellow border** (`3px solid #ffd400`) for clarity.

**Page structure** (`pageStructure`): `openStructure()` collects `h1–h6` (excluding widget; text via `innerText||textContent`), assigns missing ids, stores `{id,text,level}`. The list shows each item with an **`H{level}` SEO tag chip** (`.a11y-h-tag`) next to the text, indented by hierarchy; clicking → `gotoHeading(id)`: smooth-scrolls (centered), focuses, marks the heading with a **yellow highlight frame** (`.a11y-jump-highlight` — outline + ring) that **auto-clears after 15 seconds** via `setTimeout` (tracked in `jumpRef`, cleared/replaced on a new jump and on unmount). The **panel stays open** after a jump so the user can navigate to more headings.

**Big cursor** (`bigCursor`): large black arrow cursor for everything; a large black **hand/pointer** cursor for clickables (`a, button, [role=button], input[type=button/submit/reset], label, select, summary`). Both are inline SVG data-URIs (`CUR_ARROW`, `CUR_HAND`).

---

## 9. Event listeners (cleaned up)

`keydown`/Esc (Esc backs out sub-views, else closes) + `mousedown`/click-outside (when `open`); `mousemove` (when `readingMask` && !`hidden`); global `keydown` Alt+Shift+A; unmount cleanup removes classes, clears `html.style.filter`, calls `clearFontScale()`, cancels speech.

---

## 10. Functions

`cycle`, `toggle`, `doReset` (→ `baseSettings`), `speak`/`stopSpeak`, `hideFor`, `openStructure`/`gotoHeading`, module helpers `setLevelClass`/`setAlignClass`/`ensureReadableFont`/`applyFontScale`/`clearFontScale`, cookie helpers, `personSvg(px)`.

---

## 11. Constraints & gotchas

- **Font scaling walks the DOM** (querySelectorAll('*') under body) and sets inline `font-size` on each element — robust across px/rem. While a size level is active, a debounced `MutationObserver` on `document.body` re-applies the scale to newly added nodes, so the size **persists across SPA route changes and dynamically loaded content**. Other features are class-based on `<html>`, so they already apply to new content automatically. All settings persist across full page loads via `localStorage`.
- `html.style.filter` (grayscale/sepia/invert) also affects the widget; invert inverts the whole page including the widget (consistent "invert colors" behavior).
- High contrast (dark/light) force-colors with `!important`; CSS background-images get covered. `<img>` content stays visible.
- TTS needs a Hebrew OS/browser voice.
- Permanent hide is recoverable via Alt+Shift+A or clearing the `a11yWidgetHidden` cookie.
- Render a single instance (fixed element ids).
- **Mobile**: on screens ≤480px the panel opens as a near-full-width **bottom sheet** (`@media` overrides the inline absolute position with `!important`), header buttons are enlarged, and the reading mask follows `touchmove` as well as `mousemove`.
- jsdom lacks `innerText`; code uses `innerText||textContent`.

---

## 12. How to extend

**Toggle:** add `key:false` to `DEFAULTS`; `classList.toggle('a11y-x', settings.key)` in the main effect; CSS `html.a11y-x <selector>${EX}{…!important}`; tile in `SECTIONS` (`type:'toggle'`) + `TILE_ICON` + `ICONS`; add to cleanup list.
**Leveled:** `type:'level', max:N`; `setLevelClass(html,'a11y-prefix',level,N)` + per-level CSS.
**Cyclic:** `type:'cycle', max:N, names:[...]`; handle in the main effect (classes and/or `html.style.filter`).
**Section:** push `{ title, tiles:[…] }` to `SECTIONS`.

---

## 13. Standards mapping (SI 5568 / WCAG 2.1 AA)

Resize text (1.4.4), contrast tooling (1.4.3/1.4.6), text/word spacing (1.4.12), pause/stop motion (2.2.2), focus visible (2.4.7), keyboard operable (2.1.1 — Tab/Enter/Esc, `aria-pressed`/`aria-expanded`/`role="dialog"`/`aria-modal`), link identification (1.4.1 reinforcement), reading aids (mask, TTS, dyslexia font, page structure). A conformant site **also** needs a published accessibility statement and semantic HTML.

---

## 14. Maintenance note

After **any** change to the component, update **both** guides: this AI guide and the human installation guide (`מדריך-התקנה.docx`). Keep the props table, examples, feature list, and DEFAULTS in sync with the code.

## 15. Changelog (latest)
- Font size now scales **all** page text (DOM-walk), not just rem-based.
- Added **word spacing** control.
- **Contrast** now cycles: dark / light / invert. **Grayscale** now cycles: grayscale / sepia.
- Hide and Reset now open **confirmation popups** separate from the menu.
- Reading mask has a **yellow border**; big cursor shows a **hand** over clickables; page structure lists **H1/H2…** SEO tags.
- Cleaner icons for readable-font and hide-images.
- Page structure: clicking a heading scrolls to it (centered) and highlights it with a yellow frame that clears after 15 seconds.
- Mobile: panel opens as a bottom sheet on small screens; reading mask follows touch.
- Font size persists across page navigation (SPA) and dynamically loaded content via a MutationObserver; all settings persist via localStorage.

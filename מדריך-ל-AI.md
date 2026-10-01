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
6. **Footer credit** — the panel's bottom bar is a fixed credit link "נגישות בקלות" (→ `https://nrgisutbekalot.netlify.app/`). Keep it (default) or hide it (`hideBranding` / `data-hide-branding="true"`). `brandLabel` is **deprecated and ignored**.
7. **Defaults on** — any setting ON by default for all visitors? → `initialSettings`.
8. **Accessibility statement** — URL of the site's accessibility statement page? → `statementUrl` (adds a link at the top of the panel, and visiting that page restores a hidden widget).

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
For non-React sites, or drop-in + auto-update, use the bundled script (React is bundled inside). **Recommended embed = the daily "loader"** (paste once, before `</body>`, wrapped in the START/END comments):
```html
<!-- ACCESSIBILITY WIDGET - START -->
<script>
(function () {
  window.A11yWidgetConfig = { position: 'bottom-right', color: '#2b50e0' };
  var v = new Date().toISOString().slice(0, 10); // changes daily → browser re-fetches daily
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/Eladshi1326/NegiShot@main/dist/accessibility-widget.js?v=' + v;
  s.setAttribute('data-a11y-widget', '');
  document.body.appendChild(s);
})();
</script>
<!-- ACCESSIBILITY WIDGET - END -->
```
- **Why the loader:** jsDelivr serves floating refs (`@main`) with `Cache-Control: max-age=604800` (browsers keep the file **7 days**) and `s-maxage=43200` (CDN 12h). Purging clears only the CDN, not visitors' browsers. The `?v=<date>` makes the URL change daily, so every returning visitor gets updates within ~1 day. For ~1h freshness use `slice(0, 13)`.
- The plain one-line tag still works (`<script src=".../accessibility-widget.js" data-a11y-widget data-position=… data-color=… defer></script>`), but returning visitors may see an old version for up to 7 days.
- **Double-load guard:** `embed.jsx` sets `window.__a11yWidgetLoaded`; if the page contains both an old tag and the loader, only the first one runs. Still, replace old blocks instead of adding a second.
- `embed.jsx` finds its own script via `document.currentScript` → `script[data-a11y-widget]` → any script whose src contains `accessibility-widget`. Config priority low→high: script tag `data-*` → `window.A11yWidgetConfig` → `AccessibilityWidget.init(options)`. It creates a `#a11y-widget-host` div, renders the component into it, and auto-inits unless `data-auto="false"`.
- Global API: `window.AccessibilityWidget.{ init, update, unmount, getConfig, show, hide }` — `update(opts)` re-renders with new props at runtime. `show()` clears the hide cookie and shows the button again; `hide()` hides it for the current page view only (no cookie); `hide(seconds)` hides it and persists the `a11yWidgetHidden` cookie for that many seconds (same as the menu's hide options).
- Config keys (as `A11yWidgetConfig` props or `data-*`): `position`, `color`, `iconColor`/`data-icon-color`, `size`, `shape`, `iconSrc`/`data-icon-src`, `offset`, `zIndex`/`data-z-index`, `hideBranding`/`data-hide-branding`, `buttonLabel`/`data-button-label`, `initialSettings`/`data-initial` (JSON), `statementUrl`/`data-statement-url`, `statementLabel`/`data-statement-label`. (`brandLabel`/`data-brand-label` is deprecated and ignored.)
- Build: `npm run build` → `build.mjs` → esbuild IIFE, minified, `NODE_ENV=production`, React bundled → `dist/accessibility-widget.js` (~181KB).
- Publish: `העלאה-לגיט.bat` pushes to GitHub and purges the jsDelivr CDN. Full details in `README-הפצה.md`.
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
| `brandLabel` | string | `'נגישות'` | **Deprecated — ignored** (kept only so old configs don't break). |
| `hideBranding` | boolean | `false` | Hide the footer credit bar "נגישות בקלות". |
| `buttonLabel` | string | `'פתיחת תפריט נגישות'` | Button `aria-label` when closed. |
| `initialSettings` | object | `null` | Per-site default settings; also the target of "reset". |
| `statementUrl` | URL string | `null` | Accessibility statement page. When set: a full-width link at the top of the panel body (above the cards, in every view), and loading that page clears the hide cookie (so "go to the statement page" is a documented way to bring the button back). When not set, nothing changes. |
| `statementLabel` | string | `'הצהרת נגישות'` | Text of the statement link. |

### Examples
```jsx
<AccessibilityWidget />
<AccessibilityWidget position="bottom-left" color="#e11d48" />
<AccessibilityWidget size={72} shape="rounded" color="#0ea5e9" iconColor="#fff" />
<AccessibilityWidget iconSrc="/logo-a11y.png" />
<AccessibilityWidget initialSettings={{ highlightLinks: true, fontSize: 1 }} hideBranding />
<AccessibilityWidget statementUrl="/accessibility.html" />
```
Named exports (React users): `showWidget()` and `hideWidget(seconds?)` — same behavior as the embed's `AccessibilityWidget.show()/hide()`. They work by clearing/setting the cookie and dispatching the window events `a11y-widget:show` / `a11y-widget:hide`, which the component listens to even while hidden.

---

## 4. Settings data model

State object `settings`, initialized to `baseSettings = { ...DEFAULTS, ...(initialSettings||{}) }`:

```js
const DEFAULTS = {
  fontSize: 0,        // level 0–4  -> FONT_FACTORS = [1, 1.25, 1.5, 1.75, 2]  (labels "פי 1.25" … "פי 2")
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

**Font size (zoom):** handled in the main effect via `setLevelClass(html,'a11y-zoom',fontSize,4)`. CSS rules `html.a11y-zoom-{n} body > *:not(#a11y-widget-host):not(#a11y-widget-root)…{ zoom: 1.25/1.5/1.75/2 }` scale the page content. Because it is a **class on `<html>`** (not inline styles on elements), it is **React-proof and persists across page navigation / re-renders**, and applies to dynamically added content automatically. `zoom` scales px/rem/em alike. The widget is excluded, so it keeps its own size. (The old per-element `applyFontScale`/`clearFontScale` helpers remain in the file but are no longer the scaling mechanism.)

**Scoping:** global rules exclude the widget via `EX = ':not(#a11y-widget-root):not(#a11y-widget-root *)'`. Because the mount div `#a11y-widget-host` is *not* excluded and `line-height`/`letter-spacing`/`word-spacing` are **inherited**, `#a11y-widget-root` resets them (`line-height:normal; letter-spacing:normal; word-spacing:normal; font-size:16px`) so text-spacing tools never distort the panel. (Filters on `<html>` — grayscale/sepia/invert — also affect the widget, which is acceptable/consistent.)

**Layout:** container `position:fixed` at the corner sized to the button; panel `position:absolute` (`bottom|top:size+12`, `right|left:0`, `maxHeight: min(640px, calc(100vh - (offset+size+28)px))`). Button never shifts when the panel opens.

---

## 6. Feature reference

**Leveled (cyclic, wrap to 0)** — handler `cycle(key,max)`. Each tile always shows a one-line value sub-label (fixed tile height, no bars): level 0 → "רגיל"; `fontSize` → "פי 1.25/1.5/1.75/2" (`FONT_LABELS`); others → "רמה N".
| key | label | max | mechanism |
|---|---|---|---|
| `fontSize` | גודל טקסט | 4 | class `a11y-zoom-{n}` → CSS `zoom` on page content (1.25–2). React-proof, persists across pages; scales px/rem alike. |
| `lineHeight` | גובה שורה | 3 | class `a11y-lh-{n}`. |
| `letterSpacing` | מרווח אותיות | 3 | class `a11y-ls-{n}` (letter-spacing only). |
| `wordSpacing` | מרווח מילים | 3 | class `a11y-ws-{n}` (word-spacing). |

**Cyclic (text sub-label, `names` array)**:
| key | label | modes |
|---|---|---|
| `textAlign` | יישור טקסט | none/right/center/left/justify → `a11y-align-*`. |
| `contrast` | ניגודיות | off / **dark** (`a11y-contrast-dark`) / **light** (`a11y-contrast-light`) / **invert** (`html.style.filter: invert(1) hue-rotate(180deg)`). |
| `grayscale` | גווני צבע | off / **grayscale** / **sepia** (`html.style.filter`). |

**Toggles** — handler `toggle(key)`: `readableFont` (a11y-readable-font; lazy-loads OpenDyslexic from fonts.cdnfonts.com as before. OpenDyslexic has **no Hebrew glyphs**, so the font stack is `'OpenDyslexic', Arial, 'Arial Hebrew', 'Segoe UI', 'Noto Sans Hebrew', Tahoma, 'Liberation Sans', Arimo, system-ui, sans-serif`: Latin uses OpenDyslexic, Hebrew falls back per glyph to a clear local sans font, no extra network. On `:lang(he)` content it also adds mild spacing: `letter-spacing:.05em; word-spacing:.14em; font-style:normal`. The rule sits before the spacing rules and uses `:where(:lang(he))`, so a letter/word spacing level the user picked still wins. Note: that font looks larger by design, it does NOT change the size setting), `highlightLinks`, `hideImages`, `stopAnimations`, `bigCursor`, `focusHighlight`, `readingMask` (see §8).

**Action:** `pageStructure` → opens the structure view (§8).

**TTS:** `speak()` reads the page text via `collectText(document)`: `main` if present, else the rendered children of `body` (skipping the widget, `script/style/noscript/template` and non-rendered elements); then appends the text of every **visible same-origin iframe** inside that target, recursively (nested frames too). Cross-origin frames are skipped safely (try/catch), hidden frames (`display:none`, `visibility:hidden`, `aria-hidden="true"` ancestor, zero size) are skipped. Text is collected at click time, so frames added or navigated later are included automatically. `lang='he-IL'`, via `speechSynthesis`, max 32000 chars.

---

## 7. Header controls & popups

Header has three buttons:
- **Reset (↺)** → sets `view='reset'` → a **confirmation popup** ("לאפס את כל הגדרות הנגישות?" → "כן, אפס הכול" / "ביטול"). Confirm calls `doReset()` (→ `baseSettings`).
- **Eye (hide)** → sets `view='hide'` → a **popup** asking duration: 8 שעות / 24 שעות / לצמיתות / ביטול → `hideFor(sec)` sets cookie `a11yWidgetHidden` (path=/, max-age; "permanent" asks for 10 years, Chrome caps cookies at 400 days), hides widget (component returns `null`). The popup note tells the user how to restore: with `statementUrl` "go to the site's accessibility statement page or press Alt+Shift+A", without it "press Alt+Shift+A or clear the site data in the browser". Restore paths: **Alt+Shift+A**; `AccessibilityWidget.show()` / `showWidget()`; URL parameter **`?a11y-widget=show`** (or `#a11y-widget=show`) on any page with the widget; loading the `statementUrl` page. All of them clear the cookie, and all work while hidden.
- **Close (✕)** → closes the panel.

Popups are `.a11y-modal-overlay` absolutely covering the panel (`role="dialog" aria-modal="true"`), visually separate from the menu. Opening a popup moves focus to its first button and traps Tab inside it; closing it (button or Esc) returns focus to the header button that opened it. Esc backs out one level (popup/sub-view → main → close). Entering the page structure view focuses its title; "חזרה" returns focus to the "מבנה עמוד" tile.

**Footer credit bar:** the whole bottom bar is one link `<a class="a11y-foot">נגישות בקלות</a>` → `https://nrgisutbekalot.netlify.app/` (new tab), `position:sticky; bottom:0` so it is always visible, styled with the accent gradient + white text (like the header). Hidden by `hideBranding`.

**"חזרה" button** (page-structure view, `.a11y-menu-cancel`) uses the same accent gradient + white text so it reads as a button.

---

## 8. Special features

**Reading mask** (`readingMask`): `mousemove` updates `maskY`; two `position:fixed` `.a11y-mask-band` divs (`rgba(0,0,0,.6)`, `pointer-events:none`, `zIndex-1`) leave a ~140px clear strip, and the strip edges have a **bright yellow border** (`3px solid #ffd400`) for clarity.

**Page structure** (`pageStructure`): `openStructure()` calls `collectHeadings(document)`, which walks `h1–h6` **and iframes** in document order: rendered headings with text (excluding the widget) are listed, and every visible same-origin iframe is entered recursively at its position (cross-origin frames skipped with try/catch, hidden frames skipped as for TTS). Collected at open time, so frames added/navigated later are included. Elements are kept in a ref (`headingEls`, no ids are written into the page); state holds `{i,text,level,framed}`. Activating an item scrolls the chain of parent frames into view, then the heading, focuses it inside its own frame, and injects the small highlight style (`#a11y-widget-jump-style`) into that frame's document if needed. The list shows each item with an **`H{level}` SEO tag chip** (`.a11y-h-tag`) next to the text, indented by hierarchy; clicking → `gotoHeading(id)`: smooth-scrolls (centered), focuses, marks the heading with a **yellow highlight frame** (`.a11y-jump-highlight` — outline + ring) that **auto-clears after 15 seconds** via `setTimeout` (tracked in `jumpRef`, cleared/replaced on a new jump and on unmount). The **panel stays open** after a jump so the user can navigate to more headings.

**Touch devices:** under `@media (pointer: coarse)` the tiles `bigCursor`, `readingMask`, `focusHighlight` get class `a11y-no-touch` and are hidden (no mouse cursor / hover / Tab navigation on phones). Driven by `TOUCH_HIDE`.

**Drag-to-hide (touch only):** while dragging the button with a finger (`pointerType === 'touch'`), a small semi-transparent X drop zone (`.a11y-drop`, 48px, `bottom:14px`, centered) fades in only when the finger nears the bottom-center; it turns red when over it. Releasing there snaps the button back to its previous position, hides the button, and opens a **standalone** hide prompt (`hidePrompt` state, `.a11y-modal-overlay.a11y-standalone`, full-screen, independent of the panel) with 8h / 24h / permanent / "ביטול" (accent-colored). The prompt moves focus inside, traps Tab, closes on Esc, and returns focus to the button.

**Big cursor** (`bigCursor`): large black arrow cursor for everything; a large black **hand/pointer** cursor for clickables (`a, button, [role=button], input[type=button/submit/reset], label, select, summary`). Both are inline SVG data-URIs (`CUR_ARROW`, `CUR_HAND`).

---

## 9. Event listeners (cleaned up)

`keydown`/Esc (Esc backs out sub-views, else closes) + `mousedown`/click-outside (when `open`); `mousemove` (when `readingMask` && !`hidden`); global `keydown` Alt+Shift+A; unmount cleanup removes classes, clears `html.style.filter`, calls `clearFontScale()`, cancels speech.

---

## 10. Functions

`cycle`, `toggle`, `doReset` (→ `baseSettings`), `speak`/`stopSpeak`, `hideFor`, `openStructure`/`gotoHeading`, module helpers `setLevelClass`/`setAlignClass`/`ensureReadableFont`/`applyFontScale`/`clearFontScale`, cookie helpers, `personSvg(px)`.

---

## 11. Constraints & gotchas

- **Font size uses CSS `zoom`** via a class on `<html>` (`a11y-zoom-{n}`), so it persists across SPA navigation and React re-renders and applies to new content automatically (no per-element inline styles → React can't clobber it). `zoom` scales the whole content block (text + images), like page zoom. The widget is excluded (`body > *:not(#a11y-widget-host):not(#a11y-widget-root)`). All settings persist via `localStorage`.
- **Stop animations** uses `animation: none !important; transition: none !important` on all elements — this stops **CSS** animations/transitions. **JS-library animations** (Framer Motion, GSAP, React Spring, etc.) animate via inline styles/`requestAnimationFrame` and are NOT stopped by CSS; stopping those requires the host site to honor `prefers-reduced-motion`.
- `html.style.filter` (grayscale/sepia/invert) also affects the widget; invert inverts the whole page including the widget (consistent "invert colors" behavior).
- High contrast (dark/light) force-colors with `!important`; CSS background-images get covered. `<img>` content stays visible.
- TTS needs a Hebrew OS/browser voice.
- Permanent hide is recoverable via Alt+Shift+A or clearing the `a11yWidgetHidden` cookie.
- Render a single instance (fixed element ids).
- **Mobile**: on screens ≤480px the panel opens as a near-full-width **bottom sheet** (`@media` overrides the inline absolute position with `!important`), with `max-height: 82dvh` (dynamic viewport height — fits the *visible* screen so the top is never cut off; `82vh` fallback) and compact paddings/tiles. Header buttons are enlarged; the reading mask follows `touchmove` as well as `mousemove`.
- **Draggable button**: the FAB is draggable via Pointer Events (mouse + touch; `touch-action:none`). Drag handlers (`onDragPointerDown/Move/Up`) track movement; past a 6px threshold it becomes a drag and updates `pos {top,left}` (clamped to the viewport), suppressing the click so it won't open. The position persists in `localStorage` key `a11y-widget-pos`. When a custom `pos` is set, the panel's open direction (up/down, left/right) is recomputed from the button's location relative to the viewport center (on mobile the bottom-sheet `@media` takes over regardless).
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
- **Accessibility statement link**: `statementUrl` / `statementLabel` (`data-statement-url` / `data-statement-label`). Link at the top of the panel; visiting that page restores a hidden widget.
- **Contrast**: the brand color is no longer drawn raw. `accentShades(color)` derives three shades, darkening only as much as needed: `--a11y-acc-bg` (background under white text: header, footer, pressed tiles, primary/back buttons, H tags; ≥4.5:1 incl. the lighter gradient top and the hover brightness), `--a11y-acc-ic` (icons on the light tile circles, ≥3:1), `--a11y-acc-tx` (text on white, ≥4.5:1). They are set as CSS variables on `#a11y-widget-root`; `--a11y-accent` on `<html>` is still the raw color. Any CSS color works (hex, rgb, names, `var()` resolved by the browser). Gray helper texts darkened to `#5f6488`, header icon hover overlay `.30`→`.26`, drag label backdrop `.62`→`.72`. With the default `#2b50e0` the brand shade is unchanged.
- **Focus ring**: one two-tone ring for all widget buttons and links (FAB, header, tiles, popups, structure list, statement link): `outline: 3px solid #0b0b14; outline-offset: 2px; box-shadow: 0 0 0 7px #fff` (white / dark / white bands, visible on any background). The sticky footer uses an inset version.
- **Readable font** now useful on Hebrew pages (see §6).
- **Hide**: restore via `AccessibilityWidget.show()`, `?a11y-widget=show`, or the statement page; popup explains how. Buttons read "8 שעות" / "24 שעות" (no dash).
- **Frames**: page structure and read aloud include visible same-origin iframes (recursive).
- Popups get focus management; structure view focus management; toggle's `aria-controls` only while the panel exists; level tiles' aria-label uses a comma instead of an en dash.
- Readable font no longer overrides a letter spacing level the user picked (rule order fix).
- Font size now scales **all** page text (DOM-walk), not just rem-based.
- Added **word spacing** control.
- **Contrast** now cycles: dark / light / invert. **Grayscale** now cycles: grayscale / sepia.
- Hide and Reset now open **confirmation popups** separate from the menu.
- Reading mask has a **yellow border**; big cursor shows a **hand** over clickables; page structure lists **H1/H2…** SEO tags.
- Cleaner icons for readable-font and hide-images.
- Page structure: clicking a heading scrolls to it (centered) and highlights it with a yellow frame that clears after 15 seconds.
- Mobile: panel opens as a bottom sheet on small screens; reading mask follows touch.
- Font size persists across page navigation (SPA) and dynamically loaded content via a MutationObserver; all settings persist via localStorage.
- Font size **switched from per-element DOM-walk to CSS `zoom`** (class on `<html>`) — fixes persistence across pages on React sites (React no longer clobbers it).
- Stop animations strengthened to `animation/transition: none` (stops CSS animations); JS-library animations need `prefers-reduced-motion`.
- Mobile panel now sized with `dvh` (fits the visible screen, no top cutoff) and made more compact.
- The button is now **draggable** on touch & mouse; its position persists (`a11y-widget-pos`).
- Drag: fixed needing to tap twice after a drag (the click right after a drag is suppressed; `draggedRef` resets on each new `pointerdown`). On a **mobile↔desktop viewport switch** the button snaps back to its default corner and clears the saved position (resize/orientationchange listener crossing the 480px breakpoint); the loaded position is clamped into the viewport so it's never off-screen.
- **Embed URL uses `@main`** (tracks the branch), NOT `@latest` — on jsDelivr `@latest` points to the latest **tag/release**, not your commits, so it never updated.
- **Caching corrected:** jsDelivr floating refs are cached 12h at the CDN but **7 days in visitors' browsers**; purge only clears the CDN. Recommended embed is now the **daily loader** (`?v=<date>`), so returning visitors update within ~1 day.
- `embed.jsx` double-load guard (`window.__a11yWidgetLoaded`).
- Font steps changed to **×1.25 / 1.5 / 1.75 / 2**; leveled tiles show a fixed value line ("רגיל" / "פי 1.5" / "רמה 2") instead of bars, so tiles never grow.
- Text-spacing tools no longer leak into the panel (root resets inherited spacing).
- Touch devices hide big cursor / reading mask / focus frame.
- Footer is a full-width sticky credit link "נגישות בקלות" in the accent color; `brandLabel` deprecated.
- "חזרה" button styled as an accent button.
- Drag-to-hide gesture on touch + standalone, keyboard-accessible hide prompt.

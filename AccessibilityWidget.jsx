'use client';

/**
 * AccessibilityWidget – כפתור נגישות לאתר (React, עברית / RTL)
 * ============================================================
 * קומפוננטה אחת, ללא תלויות חיצוניות. כלי נגישות בהתאם לת"י 5568
 * (מבוסס WCAG 2.0/2.1 AA).
 *
 * שימוש בסיסי:
 *   import AccessibilityWidget from './AccessibilityWidget';
 *   <AccessibilityWidget />               // פעם אחת באפליקציה
 *
 * Props (כולם אופציונליים):
 *   position        : 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'  (ברירת מחדל 'bottom-right')
 *   color           : צבע הכפתור וההדגשות (כל ערך CSS).        ברירת מחדל '#2b50e0'
 *   iconColor       : צבע האייקון על הכפתור.                    ברירת מחדל '#ffffff'
 *   size            : גודל הכפתור בפיקסלים.                     ברירת מחדל 58
 *   shape           : 'circle' | 'rounded' – צורת הכפתור.       ברירת מחדל 'circle'
 *   iconSrc         : כתובת תמונה לאייקון מותאם (PNG/SVG/...).  ברירת מחדל null
 *   icon            : אלמנט React מותאם לאייקון (מתקדם).        ברירת מחדל null
 *   offset          : מרחק מקצה המסך בפיקסלים.                  ברירת מחדל 20
 *   zIndex          : שכבת תצוגה (צף מעל הכל).                  ברירת מחדל 2147483000
 *   brandLabel      : תווית קטנה בתחתית הפאנל.                  ברירת מחדל 'נגישות'
 *   hideBranding    : הסתרת שורת התווית בתחתית.                 ברירת מחדל false
 *   buttonLabel     : טקסט נגיש (aria-label) לכפתור.            ברירת מחדל 'פתיחת תפריט נגישות'
 *   initialSettings : אובייקט הגדרות התחלתיות (ברירת מחדל לאתר). ברירת מחדל null
 *
 * דוגמאות:
 *   <AccessibilityWidget />
 *   <AccessibilityWidget position="bottom-left" color="#e11d48" />
 *   <AccessibilityWidget size={72} shape="rounded" color="#0ea5e9" />
 *   <AccessibilityWidget iconSrc="/logo-a11y.png" brandLabel="האתר שלי" />
 *   <AccessibilityWidget initialSettings={{ highlightLinks: true }} hideBranding />
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'a11y-widget-settings-v3';
const HIDE_COOKIE = 'a11yWidgetHidden';

// מקדמי הגדלת טקסט (אינדקס 0 = רגיל)
const FONT_FACTORS = [1, 1.15, 1.3, 1.45, 1.6];
const ALIGN_NAMES = ['ברירת מחדל', 'לימין', 'למרכז', 'לשמאל', 'מוצדק'];
const CONTRAST_NAMES = ['', 'כהה', 'בהיר', 'היפוך'];
const GRAY_NAMES = ['', 'אפור', 'ספיה'];
const MASK_HALF = 70; // חצי גובה חלון הקריאה בפיקסלים

const DEFAULTS = {
  fontSize: 0,        // 0–4
  lineHeight: 0,      // 0–3
  letterSpacing: 0,   // 0–3
  wordSpacing: 0,     // 0–3
  textAlign: 0,       // 0–4 (מחזורי)
  readableFont: false,
  highlightLinks: false,
  contrast: 0,        // 0–3: off / כהה / בהיר / היפוך
  grayscale: 0,       // 0–2: off / אפור / ספיה
  hideImages: false,
  stopAnimations: false,
  bigCursor: false,
  focusHighlight: false,
  readingMask: false,
};

// ---------- עוגיית הסתרה ----------
function setHideCookie(maxAgeSec) {
  document.cookie = HIDE_COOKIE + '=1; path=/; max-age=' + maxAgeSec + '; SameSite=Lax';
}
function hasHideCookie() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.indexOf(HIDE_COOKIE + '=') === 0);
}
function clearHideCookie() {
  document.cookie = HIDE_COOKIE + '=; path=/; max-age=0; SameSite=Lax';
}

// ---------- עוזרי class ----------
function setLevelClass(html, prefix, level, max) {
  for (let i = 1; i <= max; i++) html.classList.remove(prefix + '-' + i);
  if (level > 0) html.classList.add(prefix + '-' + level);
}
function setAlignClass(html, a) {
  ['right', 'center', 'left', 'justify'].forEach((x) => html.classList.remove('a11y-align-' + x));
  const map = ['', 'right', 'center', 'left', 'justify'][a];
  if (map) html.classList.add('a11y-align-' + map);
}
function ensureReadableFont() {
  if (typeof document === 'undefined' || document.getElementById('a11y-dys-font')) return;
  const l = document.createElement('link');
  l.id = 'a11y-dys-font';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.cdnfonts.com/css/opendyslexic';
  document.head.appendChild(l);
}

// ---------- הגדלת טקסט שמשפיעה על כל הדף (גם px) ----------
function applyFontScale(factor) {
  if (typeof document === 'undefined' || !document.body) return;
  const nodes = document.body.querySelectorAll('*');
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (el.id === 'a11y-widget-root' || (el.closest && el.closest('#a11y-widget-root'))) continue;
    let base = el.getAttribute('data-a11y-fs');
    if (base === null) {
      const cs = window.getComputedStyle(el).fontSize;
      base = parseFloat(cs);
      if (!base || isNaN(base)) continue;
      el.setAttribute('data-a11y-fs', base);
    } else {
      base = parseFloat(base);
    }
    el.style.setProperty('font-size', (base * factor).toFixed(2) + 'px', 'important');
  }
}
function clearFontScale() {
  if (typeof document === 'undefined') return;
  const nodes = document.querySelectorAll('[data-a11y-fs]');
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].style.removeProperty('font-size');
    nodes[i].removeAttribute('data-a11y-fs');
  }
}

const EX = ':not(#a11y-widget-root):not(#a11y-widget-root *)';

// סמן עכבר גדול (חץ) + יד גדולה לקליקבילים
const CUR_ARROW = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M8 4 L8 32 L15 25 L19.5 35 L24 33 L19.5 23 L29 23 Z' fill='black' stroke='white' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E";
const CUR_HAND = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M16 4 c-1.7 0-3 1.3-3 3 v13 l-4-3 c-1.4-1-3.2 .1-3.2 1.8 0 .6 .2 1.1 .6 1.5 l7 8 c1 1.2 2.5 1.9 4.1 1.9 h7 c2.2 0 4-1.8 4-4 v-9 c0-1.3-1-2.4-2.4-2.4-.4 0-.8 .1-1.1 .3 -.2-1.1-1.2-1.9-2.3-1.9-.5 0-1 .2-1.4 .4 -.4-.8-1.2-1.4-2.2-1.4-.4 0-.8 .1-1.1 .3 V7 c0-1.7-1.3-3-3-3z' fill='black' stroke='white' stroke-width='1.6' stroke-linejoin='round'/%3E%3C/svg%3E";

const WIDGET_CSS = `
/* ===== אפקטים גלובליים ===== */
html.a11y-active { scrollbar-gutter: stable; }

/* גודל טקסט/תוכן – דרך zoom על תוכן הדף (לא נוגע בווידג'ט); אמין ונשמר בין עמודים */
html.a11y-zoom-1 body > *:not(#a11y-widget-host):not(#a11y-widget-root):not(script):not(style):not([data-a11y-widget-mount]) { zoom: 1.15; }
html.a11y-zoom-2 body > *:not(#a11y-widget-host):not(#a11y-widget-root):not(script):not(style):not([data-a11y-widget-mount]) { zoom: 1.30; }
html.a11y-zoom-3 body > *:not(#a11y-widget-host):not(#a11y-widget-root):not(script):not(style):not([data-a11y-widget-mount]) { zoom: 1.45; }
html.a11y-zoom-4 body > *:not(#a11y-widget-host):not(#a11y-widget-root):not(script):not(style):not([data-a11y-widget-mount]) { zoom: 1.60; }

html.a11y-lh-1 body *${EX} { line-height: 1.6 !important; }
html.a11y-lh-2 body *${EX} { line-height: 1.9 !important; }
html.a11y-lh-3 body *${EX} { line-height: 2.3 !important; }

html.a11y-ls-1 body *${EX} { letter-spacing: .06em !important; }
html.a11y-ls-2 body *${EX} { letter-spacing: .12em !important; }
html.a11y-ls-3 body *${EX} { letter-spacing: .2em !important; }

html.a11y-ws-1 body *${EX} { word-spacing: .18em !important; }
html.a11y-ws-2 body *${EX} { word-spacing: .36em !important; }
html.a11y-ws-3 body *${EX} { word-spacing: .6em !important; }

html.a11y-align-right   :is(p,li,h1,h2,h3,h4,h5,h6,blockquote,dd,dt,figcaption,td,th,label)${EX} { text-align: right !important; }
html.a11y-align-center  :is(p,li,h1,h2,h3,h4,h5,h6,blockquote,dd,dt,figcaption,td,th,label)${EX} { text-align: center !important; }
html.a11y-align-left    :is(p,li,h1,h2,h3,h4,h5,h6,blockquote,dd,dt,figcaption,td,th,label)${EX} { text-align: left !important; }
html.a11y-align-justify :is(p,li,blockquote,dd,figcaption,td)${EX} { text-align: justify !important; }

html.a11y-readable-font body *${EX} {
  font-family: 'OpenDyslexic', Tahoma, Arial, 'Segoe UI', sans-serif !important;
  letter-spacing: .03em !important;
}

html.a11y-highlight-links a:not(#a11y-widget-root a),
html.a11y-highlight-links a:not(#a11y-widget-root a) * {
  text-decoration: underline !important; text-underline-offset: 3px !important; font-weight: 700 !important;
}
html.a11y-highlight-links a:not(#a11y-widget-root a) { outline: 2px dashed currentColor !important; outline-offset: 2px !important; }

/* ניגודיות – כהה */
html.a11y-contrast-dark body, html.a11y-contrast-dark body *${EX} {
  background-color: #000 !important; color: #fff !important; border-color: #fff !important; text-shadow: none !important;
}
html.a11y-contrast-dark a:not(#a11y-widget-root a), html.a11y-contrast-dark a:not(#a11y-widget-root a) * { color: #ffff00 !important; }
html.a11y-contrast-dark :is(button,input,textarea,select):not(#a11y-widget-root *) { background-color:#000!important; color:#fff!important; border:1px solid #fff!important; }
/* ניגודיות – בהיר */
html.a11y-contrast-light body, html.a11y-contrast-light body *${EX} {
  background-color: #fff !important; color: #000 !important; border-color: #000 !important; text-shadow: none !important;
}
html.a11y-contrast-light a:not(#a11y-widget-root a), html.a11y-contrast-light a:not(#a11y-widget-root a) * { color: #0000ee !important; }
html.a11y-contrast-light :is(button,input,textarea,select):not(#a11y-widget-root *) { background-color:#fff!important; color:#000!important; border:1px solid #000!important; }

html.a11y-hide-images :is(img, picture, video, canvas):not(#a11y-widget-root *) { visibility: hidden !important; }

html.a11y-stop-animations *${EX},
html.a11y-stop-animations *${EX}::before,
html.a11y-stop-animations *${EX}::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}

html.a11y-big-cursor, html.a11y-big-cursor *${EX} { cursor: url("${CUR_ARROW}") 6 4, auto !important; }
html.a11y-big-cursor :is(a,button,[role="button"],input[type="button"],input[type="submit"],input[type="reset"],label,select,summary):not(#a11y-widget-root *),
html.a11y-big-cursor :is(a,button,[role="button"]):not(#a11y-widget-root *) * {
  cursor: url("${CUR_HAND}") 13 3, pointer !important;
}

html.a11y-focus-highlight :is(a,button,input,textarea,select,[tabindex]):focus:not(#a11y-widget-root *) {
  outline: 3px solid var(--a11y-accent, #2b50e0) !important; outline-offset: 2px !important;
}

/* ===== עיצוב הווידג'ט ===== */
#a11y-widget-root { font-size: 16px; }
#a11y-widget-root *, #a11y-widget-root *::before, #a11y-widget-root *::after { box-sizing: border-box; font-family: Arial, 'Segoe UI', Tahoma, sans-serif; }
#a11y-widget-toggle { border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,.32); cursor: pointer; padding: 0; transition: transform .15s ease, box-shadow .15s ease; touch-action: none; user-select: none; -webkit-user-select: none; }
#a11y-widget-toggle:hover { transform: scale(1.07); }
#a11y-widget-toggle:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
#a11y-widget-toggle img { display: block; }

#a11y-panel { width: 340px; max-width: calc(100vw - 28px); overflow-y: auto; background: #eceefb; border-radius: 18px; box-shadow: 0 14px 40px rgba(20,20,60,.30); border: 1px solid #d9ddf5; padding: 0 0 12px; direction: rtl; }
#a11y-panel:focus { outline: none; }

.a11y-head { position: sticky; top: 0; z-index: 2; background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(0,0,0,.12)), var(--a11y-accent, #2b50e0); color: #fff; padding: 14px 16px; border-radius: 18px 18px 0 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.a11y-head-title { display: flex; align-items: center; gap: 10px; font-size: 19px; font-weight: 800; }
.a11y-head-title .a11y-badge { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.22); display: flex; align-items: center; justify-content: center; }
.a11y-head-actions { display: flex; align-items: center; gap: 6px; }
.a11y-ico-btn { width: 34px; height: 34px; border-radius: 9px; border: none; cursor: pointer; background: rgba(255,255,255,.16); color: #fff; display: flex; align-items: center; justify-content: center; }
.a11y-ico-btn:hover { background: rgba(255,255,255,.30); }
.a11y-ico-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

.a11y-body { padding: 12px; }
.a11y-card { background: #fff; border-radius: 16px; padding: 12px 12px 14px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(20,20,60,.05); }
.a11y-card-title { font-size: 12px; font-weight: 800; color: #8a8fb0; margin: 2px 4px 10px; }
.a11y-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }

.a11y-tile { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #f3f4fb; border: 2px solid transparent; border-radius: 12px; padding: 11px 12px; min-height: 62px; cursor: pointer; text-align: right; color: #1c2030; }
.a11y-tile:hover { background: #e9ebf8; }
.a11y-tile:focus-visible { outline: 3px solid var(--a11y-accent, #2b50e0); outline-offset: 2px; }
.a11y-tile[aria-pressed="true"] { background: var(--a11y-accent, #2b50e0); color: #fff; border-color: var(--a11y-accent, #2b50e0); }
.a11y-tile-main { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; flex: 1; min-width: 0; }
.a11y-tile-label { font-size: 13.5px; font-weight: 700; line-height: 1.2; }
.a11y-tile-sub { font-size: 11px; opacity: .85; }
.a11y-tile-ic { flex: none; width: 38px; height: 38px; border-radius: 50%; background: rgba(43,80,224,.10); color: var(--a11y-accent, #2b50e0); display: flex; align-items: center; justify-content: center; }
.a11y-tile[aria-pressed="true"] .a11y-tile-ic { background: rgba(255,255,255,.25); color: #fff; }
.a11y-bars { display: flex; gap: 3px; }
.a11y-bars i { width: 7px; height: 13px; border-radius: 2px; background: rgba(0,0,0,.14); display: block; }
.a11y-bars i.on { background: var(--a11y-accent, #2b50e0); }
.a11y-tile[aria-pressed="true"] .a11y-bars i { background: rgba(255,255,255,.40); }
.a11y-tile[aria-pressed="true"] .a11y-bars i.on { background: #fff; }

.a11y-tts { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: #f3f4fb; border: 2px solid transparent; border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 800; color: #1c2030; cursor: pointer; }
.a11y-tts:hover { background: #e9ebf8; }
.a11y-tts[aria-pressed="true"] { background: var(--a11y-accent, #2b50e0); color: #fff; border-color: var(--a11y-accent, #2b50e0); }
.a11y-tts:focus-visible { outline: 3px solid var(--a11y-accent, #2b50e0); outline-offset: 2px; }

/* פופאפ מודאלי (הסתרה / אישור איפוס) */
.a11y-modal-overlay { position: absolute; inset: 0; background: rgba(20,20,50,.55); border-radius: 18px; display: flex; align-items: center; justify-content: center; z-index: 5; padding: 16px; }
.a11y-modal { background: #fff; border-radius: 16px; width: 100%; box-shadow: 0 16px 44px rgba(0,0,0,.35); padding: 16px; }
.a11y-modal-title { font-size: 16px; font-weight: 800; color: #1c2030; margin: 2px 2px 14px; text-align: center; }
.a11y-modal-btn { width: 100%; text-align: center; background: #f3f4fb; border: 2px solid transparent; border-radius: 12px; padding: 13px; margin-bottom: 9px; font-size: 14px; font-weight: 700; color: #1c2030; cursor: pointer; }
.a11y-modal-btn:hover { background: #e9ebf8; }
.a11y-modal-btn:focus-visible { outline: 3px solid var(--a11y-accent, #2b50e0); outline-offset: 2px; }
.a11y-modal-btn.primary { background: var(--a11y-accent, #2b50e0); color: #fff; }
.a11y-modal-btn.danger { color: #b42318; }
.a11y-modal-btn.cancel { background: transparent; color: #6b7090; }
.a11y-modal-note { text-align: center; font-size: 11px; color: #9aa0c0; margin-top: 6px; }

.a11y-struct-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: right; background: #f7f8fc; border: none; border-radius: 9px; padding: 10px 12px; margin-bottom: 6px; cursor: pointer; color: #1c2030; font-size: 13.5px; }
.a11y-struct-item:hover { background: #e9ebf8; }
.a11y-struct-item:focus-visible { outline: 2px solid var(--a11y-accent, #2b50e0); }
.a11y-h-tag { flex: none; font-size: 10px; font-weight: 800; color: #fff; background: var(--a11y-accent, #2b50e0); border-radius: 5px; padding: 2px 6px; min-width: 26px; text-align: center; }
.a11y-struct-empty { color: #8a8fb0; font-size: 13px; padding: 8px 4px; }
.a11y-menu-title { font-size: 15px; font-weight: 800; color: #1c2030; margin: 4px 4px 12px; }
.a11y-menu-cancel { width: 100%; text-align: center; background: transparent; border: none; color: #6b7090; font-weight: 700; padding: 12px; cursor: pointer; border-radius: 12px; }
.a11y-menu-cancel:hover { background: #eef0f8; }

.a11y-foot { text-align: center; font-size: 11px; color: #9aa0c0; padding: 2px 0 0; }
.a11y-mask-band { position: fixed; left: 0; right: 0; background: rgba(0,0,0,.6); pointer-events: none; }
.a11y-jump-highlight { outline: 3px solid #ffd400 !important; outline-offset: 3px !important; box-shadow: 0 0 0 5px rgba(255,212,0,.35) !important; border-radius: 3px !important; scroll-margin-top: 24px; scroll-margin-bottom: 24px; }

/* ===== מובייל ===== */
@media (max-width: 480px) {
  #a11y-panel {
    position: fixed !important;
    left: 8px !important; right: 8px !important;
    bottom: 8px !important; top: auto !important;
    width: auto !important; max-width: none !important;
    max-height: 82vh !important;
    max-height: 82dvh !important; /* גובה תצוגה אמיתי במובייל – לא נחתך למעלה */
  }
  .a11y-head { padding: 12px 14px; }
  .a11y-body { padding: 10px; }
  .a11y-card { padding: 10px 10px 12px; margin-bottom: 10px; }
  .a11y-card-title { margin: 2px 4px 8px; }
  .a11y-ico-btn { width: 40px; height: 40px; }
  .a11y-grid { gap: 8px; }
  .a11y-tile { min-height: 52px; padding: 9px 10px; }
}
`;

// ---------- אייקונים ----------
const svg = (children, props) =>
  React.createElement('svg', Object.assign({ viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, props), children);

const personSvg = (px) => (
  <svg viewBox="0 0 24 24" width={px} height={px} aria-hidden="true">
    <circle cx="12" cy="4" r="2.2" fill="currentColor" />
    <path d="M5 8 H19 M12 8 V14 M12 14 L8.5 21 M12 14 L15.5 21" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const ICONS = {
  person: personSvg(26),
  reset: svg(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /></>),
  eye: svg(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>),
  close: svg(<><path d="M6 6l12 12M18 6L6 18" /></>),
  text: svg(<><path d="M5 7V5h14v2M9 19h6M12 5v14" /></>),
  lineHeight: svg(<><path d="M3 5h18M3 12h18M3 19h18" /></>),
  letterSpacing: svg(<><path d="M4 5v14M20 5v14M9 12h6" /></>),
  wordSpace: svg(<><rect x="3" y="9" width="6" height="6" rx="1" /><rect x="15" y="9" width="6" height="6" rx="1" /><path d="M10.5 12h3M11.5 10.8 10.3 12l1.2 1.2M12.5 10.8 13.7 12l-1.2 1.2" /></>),
  align: svg(<><path d="M3 5h18M7 10h14M3 15h18M9 19h12" /></>),
  readable: svg(<><path d="M5 20 L12 4 L19 20" /><path d="M8 14 H16" /></>),
  link: svg(<><path d="M9 12a3 3 0 0 1 3-3h3a3 3 0 0 1 0 6h-1" /><path d="M15 12a3 3 0 0 1-3 3H9a3 3 0 0 1 0-6h1" /></>),
  contrast: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor" stroke="none" /></>),
  drop: svg(<><path d="M12 3c4 5 6 7.5 6 10a6 6 0 0 1-12 0c0-2.5 2-5 6-10Z" fill="currentColor" stroke="none" /></>),
  image: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.4" /><path d="M21 16l-5-5-4 4" /><path d="M3.5 20.5 20.5 3.5" stroke="currentColor" strokeWidth="2.4" /></>),
  motion: svg(<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M21 8v8l-5-4z" fill="currentColor" stroke="none" /><path d="M3 3l18 18" /></>),
  mask: svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><rect x="3" y="10" width="18" height="4" fill="currentColor" stroke="none" opacity="0.22" /><path d="M3 10h18M3 14h18" stroke="#caa500" /></>),
  focus: svg(<><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="2.5" /></>),
  cursor: svg(<><path d="M6 3l14 7-6 2-2 6z" fill="currentColor" stroke="none" /></>),
  structure: svg(<><rect x="3" y="4" width="7" height="7" rx="1.5" /><rect x="14" y="4" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="6" rx="1.5" /><rect x="14" y="14" width="7" height="6" rx="1.5" /></>),
  speaker: svg(<><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none" /><path d="M16 8a5 5 0 0 1 0 8" /></>),
};

const TILE_ICON = {
  fontSize: 'text', lineHeight: 'lineHeight', letterSpacing: 'letterSpacing', wordSpacing: 'wordSpace', textAlign: 'align',
  readableFont: 'readable', highlightLinks: 'link', contrast: 'contrast', grayscale: 'drop',
  hideImages: 'image', stopAnimations: 'motion', readingMask: 'mask', focusHighlight: 'focus',
  bigCursor: 'cursor', pageStructure: 'structure',
};

const SECTIONS = [
  { title: 'טקסט', tiles: [
    { key: 'fontSize', label: 'גודל טקסט', type: 'level', max: 4 },
    { key: 'lineHeight', label: 'גובה שורה', type: 'level', max: 3 },
    { key: 'letterSpacing', label: 'מרווח אותיות', type: 'level', max: 3 },
    { key: 'wordSpacing', label: 'מרווח מילים', type: 'level', max: 3 },
    { key: 'textAlign', label: 'יישור טקסט', type: 'cycle', max: 4, names: ALIGN_NAMES },
    { key: 'readableFont', label: 'גופן קריא', type: 'toggle' },
  ] },
  { title: 'ויזואלי', tiles: [
    { key: 'contrast', label: 'ניגודיות', type: 'cycle', max: 3, names: CONTRAST_NAMES },
    { key: 'grayscale', label: 'גווני צבע', type: 'cycle', max: 2, names: GRAY_NAMES },
    { key: 'hideImages', label: 'הסתר תמונות', type: 'toggle' },
    { key: 'stopAnimations', label: 'השהה אנימציות', type: 'toggle' },
  ] },
  { title: 'אוריינטציה', tiles: [
    { key: 'highlightLinks', label: 'הדגשת קישורים', type: 'toggle' },
    { key: 'readingMask', label: 'מסכת קריאה', type: 'toggle' },
    { key: 'focusHighlight', label: 'מסגרת מיקוד', type: 'toggle' },
    { key: 'bigCursor', label: 'סמן עכבר גדול', type: 'toggle' },
    { key: 'pageStructure', label: 'מבנה עמוד', type: 'action' },
  ] },
];

export default function AccessibilityWidget({
  position = 'bottom-right',
  color = '#2b50e0',
  iconColor = '#ffffff',
  size = 58,
  shape = 'circle',
  iconSrc = null,
  icon = null,
  offset = 20,
  zIndex = 2147483000,
  brandLabel = 'נגישות',
  hideBranding = false,
  buttonLabel = 'פתיחת תפריט נגישות',
  initialSettings = null,
} = {}) {
  const baseSettings = useMemo(() => ({ ...DEFAULTS, ...(initialSettings || {}) }), [initialSettings]);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('main'); // 'main' | 'hide' | 'reset' | 'structure'
  const [settings, setSettings] = useState(baseSettings);
  const [speaking, setSpeaking] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [headings, setHeadings] = useState([]);
  const [maskY, setMaskY] = useState(-1);
  const [pos, setPos] = useState(null);   // מיקום נגרר ע"י המשתמש {top,left} או null
  const posRef = useRef(null);
  const dragRef = useRef(null);
  const draggedRef = useRef(false);

  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);
  const jumpRef = useRef({ el: null, timer: null });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('a11y-widget-styles')) {
      const s = document.createElement('style');
      s.id = 'a11y-widget-styles';
      s.textContent = WIDGET_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.style.setProperty('--a11y-accent', color);
    setHidden(hasHideCookie());
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings({ ...baseSettings, ...JSON.parse(saved) });
    } catch (e) { /* */ }
    try {
      const sp = window.localStorage.getItem('a11y-widget-pos');
      if (sp) {
        const o = JSON.parse(sp);
        if (o && typeof o.top === 'number' && typeof o.left === 'number') {
          const np = { top: Math.max(4, Math.min(window.innerHeight - size - 4, o.top)), left: Math.max(4, Math.min(window.innerWidth - size - 4, o.left)) };
          posRef.current = np; setPos(np);
        }
      }
    } catch (e) { /* */ }
  }, [color]);

  // החלת הגדרות (חוץ מגודל הטקסט שמטופל בנפרד) + שמירה
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.classList.add('a11y-active');
    setLevelClass(html, 'a11y-lh', settings.lineHeight, 3);
    setLevelClass(html, 'a11y-ls', settings.letterSpacing, 3);
    setLevelClass(html, 'a11y-ws', settings.wordSpacing, 3);
    setAlignClass(html, settings.textAlign);
    setLevelClass(html, 'a11y-zoom', settings.fontSize, 4);
    html.classList.toggle('a11y-readable-font', settings.readableFont);
    html.classList.toggle('a11y-highlight-links', settings.highlightLinks);
    html.classList.toggle('a11y-contrast-dark', settings.contrast === 1);
    html.classList.toggle('a11y-contrast-light', settings.contrast === 2);
    html.classList.toggle('a11y-hide-images', settings.hideImages);
    html.classList.toggle('a11y-stop-animations', settings.stopAnimations);
    html.classList.toggle('a11y-big-cursor', settings.bigCursor);
    html.classList.toggle('a11y-focus-highlight', settings.focusHighlight);
    // פילטרים: גווני אפור/ספיה + היפוך צבעים
    const f = [];
    if (settings.grayscale === 1) f.push('grayscale(100%)');
    else if (settings.grayscale === 2) f.push('sepia(100%)');
    if (settings.contrast === 3) f.push('invert(1)', 'hue-rotate(180deg)');
    const fs = f.join(' ');
    html.style.filter = fs;
    html.style.webkitFilter = fs;
    if (settings.readableFont) ensureReadableFont();
    try {
      const isDef = Object.keys(DEFAULTS).every((k) => settings[k] === baseSettings[k]);
      if (isDef) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) { /* */ }
  }, [settings, baseSettings]);

  // גודל טקסט מטופל דרך class a11y-zoom (CSS zoom) באפקט הראשי — נשמר בין עמודים ולא נדרס ע"י React

  // Alt+Shift+A – החזרת הווידג'ט
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e) => {
      if (e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) { clearHideCookie(); setHidden(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // החזרה למיקום ברירת המחדל במעבר מובייל<->דסקטופ; ושמירה שהכפתור לא ייעלם מחוץ למסך
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let wasMobile = window.innerWidth <= 480;
    const onResize = () => {
      const isMobileNow = window.innerWidth <= 480;
      if (isMobileNow !== wasMobile) {
        wasMobile = isMobileNow;
        posRef.current = null;
        setPos(null);
        try { window.localStorage.removeItem('a11y-widget-pos'); } catch (e) { /* */ }
        return;
      }
      if (posRef.current) {
        const t = Math.max(4, Math.min(window.innerHeight - size - 4, posRef.current.top));
        const l = Math.max(4, Math.min(window.innerWidth - size - 4, posRef.current.left));
        if (t !== posRef.current.top || l !== posRef.current.left) {
          const np = { top: t, left: l };
          posRef.current = np; setPos(np);
          try { window.localStorage.setItem('a11y-widget-pos', JSON.stringify(np)); } catch (e) { /* */ }
        }
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, [size]);

  // מסכת קריאה (עכבר + מגע)
  useEffect(() => {
    if (typeof window === 'undefined' || hidden || !settings.readingMask) return;
    const onMove = (e) => {
      const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
      if (typeof y === 'number') setMaskY(y);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, [settings.readingMask, hidden]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') { if (view !== 'main') setView('main'); else { setOpen(false); if (toggleRef.current) toggleRef.current.focus(); } } };
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) { setOpen(false); setView('main'); } };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open, view]);

  useEffect(() => { if (open && panelRef.current) panelRef.current.focus(); }, [open]);

  // ---------- גרירת הכפתור (עכבר + מגע) ----------
  const onDragPointerDown = useCallback((e) => {
    if (!toggleRef.current) return;
    draggedRef.current = false;
    const r = toggleRef.current.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, top: r.top, left: r.left, moved: 0, dragging: false };
    try { toggleRef.current.setPointerCapture(e.pointerId); } catch (err) { /* */ }
  }, []);
  const onDragPointerMove = useCallback((e) => {
    const d = dragRef.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(dy));
    if (d.moved > 6) {
      d.dragging = true;
      const sz = (toggleRef.current && toggleRef.current.offsetWidth) || 58;
      const vw = window.innerWidth, vh = window.innerHeight;
      const np = {
        top: Math.max(4, Math.min(vh - sz - 4, d.top + dy)),
        left: Math.max(4, Math.min(vw - sz - 4, d.left + dx)),
      };
      posRef.current = np;
      setPos(np);
    }
  }, []);
  const onDragPointerUp = useCallback((e) => {
    const d = dragRef.current; dragRef.current = null;
    try { if (toggleRef.current) toggleRef.current.releasePointerCapture(e.pointerId); } catch (err) { /* */ }
    if (d && d.dragging) {
      draggedRef.current = true; // למנוע שהלחיצה תיפתח אחרי גרירה
      try { window.localStorage.setItem('a11y-widget-pos', JSON.stringify(posRef.current)); } catch (err) { /* */ }
    }
  }, []);

  const cycle = useCallback((key, max) => { setSettings((s) => ({ ...s, [key]: s[key] >= max ? 0 : s[key] + 1 })); }, []);
  const toggle = useCallback((key) => { setSettings((s) => ({ ...s, [key]: !s[key] })); }, []);

  const stopSpeak = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);
  const speak = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { alert('הדפדפן אינו תומך בהקראת טקסט.'); return; }
    if (speaking) { stopSpeak(); return; }
    const target = document.querySelector('main') || document.body;
    const text = ((target && (target.innerText || target.textContent)) || '').replace(/\s+/g, ' ').trim().slice(0, 32000);
    if (!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL'; u.rate = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }, [speaking, stopSpeak]);

  const doReset = useCallback(() => { setSettings(baseSettings); stopSpeak(); setView('main'); }, [stopSpeak, baseSettings]);
  const hideFor = useCallback((sec) => { setHideCookie(sec); setHidden(true); setOpen(false); setView('main'); }, []);

  const openStructure = useCallback(() => {
    const htext = (h) => (h.innerText || h.textContent || '').trim();
    const hs = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .filter((h) => !h.closest('#a11y-widget-root') && htext(h))
      .map((h, i) => { if (!h.id) h.id = 'a11y-h-' + i; return { id: h.id, text: htext(h).slice(0, 70), level: parseInt(h.tagName.charAt(1), 10) }; });
    setHeadings(hs);
    setView('structure');
  }, []);
  const gotoHeading = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.setAttribute('tabindex', '-1');
      try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) { /* */ } }
      const prev = jumpRef.current;
      if (prev.timer) clearTimeout(prev.timer);
      if (prev.el && prev.el !== el) prev.el.classList.remove('a11y-jump-highlight');
      el.classList.add('a11y-jump-highlight');
      const timer = setTimeout(() => { el.classList.remove('a11y-jump-highlight'); jumpRef.current = { el: null, timer: null }; }, 15000);
      jumpRef.current = { el: el, timer: timer };
    }
    // משאירים את הפאנל פתוח כדי לאפשר קפיצה לעוד כותרות
  }, []);

  useEffect(() => () => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.style.filter = ''; html.style.webkitFilter = '';
    ['a11y-readable-font', 'a11y-highlight-links', 'a11y-contrast-dark', 'a11y-contrast-light', 'a11y-hide-images', 'a11y-stop-animations', 'a11y-big-cursor', 'a11y-focus-highlight',
     'a11y-lh-1', 'a11y-lh-2', 'a11y-lh-3', 'a11y-ls-1', 'a11y-ls-2', 'a11y-ls-3', 'a11y-ws-1', 'a11y-ws-2', 'a11y-ws-3',
     'a11y-align-right', 'a11y-align-center', 'a11y-align-left', 'a11y-align-justify', 'a11y-zoom-1', 'a11y-zoom-2', 'a11y-zoom-3', 'a11y-zoom-4'].forEach((c) => html.classList.remove(c));
    clearFontScale();
    if (jumpRef.current.timer) clearTimeout(jumpRef.current.timer);
    if (jumpRef.current.el) jumpRef.current.el.classList.remove('a11y-jump-highlight');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  if (hidden) return null;

  const radius = shape === 'rounded' ? Math.round(size * 0.28) + 'px' : '50%';

  // מיקום: ברירת מחדל לפי prop, או מיקום שנגרר ע"י המשתמש (pos)
  let isBottom = position.indexOf('bottom') === 0;
  let isRight = position.indexOf('right') >= 0;
  let containerStyle;
  if (pos) {
    containerStyle = { position: 'fixed', top: pos.top + 'px', left: pos.left + 'px', width: size + 'px', height: size + 'px', zIndex };
    if (typeof window !== 'undefined') {
      isBottom = (pos.top + size / 2) > (window.innerHeight / 2);
      isRight = (pos.left + size / 2) > (window.innerWidth / 2);
    }
  } else {
    containerStyle = {
      position: 'fixed',
      [isBottom ? 'bottom' : 'top']: offset + 'px',
      [isRight ? 'right' : 'left']: offset + 'px',
      width: size + 'px', height: size + 'px', zIndex,
    };
  }
  const toggleStyle = { width: size + 'px', height: size + 'px', borderRadius: radius, background: color, color: iconColor };
  const panelStyle = {
    position: 'absolute',
    [isBottom ? 'bottom' : 'top']: (size + 12) + 'px',
    [isRight ? 'right' : 'left']: '0px',
    maxHeight: 'min(640px, calc(100vh - ' + (offset + size + 28) + 'px))',
  };

  let toggleIcon;
  if (icon) toggleIcon = icon;
  else if (iconSrc) toggleIcon = <img src={iconSrc} alt="" style={{ width: Math.round(size * 0.6) + 'px', height: Math.round(size * 0.6) + 'px', objectFit: 'contain' }} />;
  else toggleIcon = personSvg(Math.round(size * 0.46));

  const renderTile = (t) => {
    const val = settings[t.key];
    const names = t.names || ALIGN_NAMES;
    let pressed = false, sub = null, bars = null;
    if (t.type === 'toggle') pressed = !!val;
    else if (t.type === 'level') { pressed = val > 0; bars = (
      <span className="a11y-bars" aria-hidden="true">{Array.from({ length: t.max }).map((_, i) => <i key={i} className={i < val ? 'on' : ''} />)}</span>
    ); }
    else if (t.type === 'cycle') { pressed = val > 0; sub = <span className="a11y-tile-sub">{names[val] || ''}</span>; }

    const onClick = t.type === 'toggle' ? () => toggle(t.key)
      : t.type === 'action' ? openStructure
      : () => cycle(t.key, t.max);
    const ariaLabel = t.type === 'level' ? t.label + ' – רמה ' + val + ' מתוך ' + t.max
      : t.type === 'cycle' ? t.label + ' ' + (names[val] || 'כבוי') : t.label;

    return (
      <button key={t.key} type="button" className="a11y-tile" aria-pressed={t.type === 'action' ? undefined : pressed} aria-label={ariaLabel} onClick={onClick}>
        <span className="a11y-tile-main"><span className="a11y-tile-label">{t.label}</span>{sub}{bars}</span>
        <span className="a11y-tile-ic">{ICONS[TILE_ICON[t.key]]}</span>
      </button>
    );
  };

  return (
    <div id="a11y-widget-root" ref={rootRef} style={containerStyle}>
      {settings.readingMask && maskY >= 0 && (
        <>
          <div className="a11y-mask-band" style={{ top: 0, height: Math.max(0, maskY - MASK_HALF) + 'px', borderBottom: '3px solid #ffd400', zIndex: zIndex - 1 }} aria-hidden="true" />
          <div className="a11y-mask-band" style={{ top: (maskY + MASK_HALF) + 'px', bottom: 0, borderTop: '3px solid #ffd400', zIndex: zIndex - 1 }} aria-hidden="true" />
        </>
      )}

      <button id="a11y-widget-toggle" ref={toggleRef} type="button" style={toggleStyle}
        aria-label={open ? 'סגירת תפריט נגישות' : buttonLabel}
        aria-expanded={open} aria-haspopup="dialog" aria-controls="a11y-panel"
        onPointerDown={onDragPointerDown} onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp} onPointerCancel={onDragPointerUp}
        onClick={() => { if (draggedRef.current) { draggedRef.current = false; return; } setOpen((o) => !o); setView('main'); }}>
        {toggleIcon}
      </button>

      {open && (
        <div id="a11y-panel" ref={panelRef} style={panelStyle} role="dialog" aria-label="תפריט נגישות" dir="rtl" lang="he" tabIndex={-1}>
          <div className="a11y-head">
            <div className="a11y-head-title"><span className="a11y-badge">{ICONS.person}</span><span>נגישות</span></div>
            <div className="a11y-head-actions">
              <button type="button" className="a11y-ico-btn" aria-label="ברירת מחדל (איפוס)" title="ברירת מחדל" onClick={() => setView('reset')}>{ICONS.reset}</button>
              <button type="button" className="a11y-ico-btn" aria-label="הסתרת כפתור הנגישות" title="הסתרה" onClick={() => setView('hide')}>{ICONS.eye}</button>
              <button type="button" className="a11y-ico-btn" aria-label="סגירה" title="סגירה" onClick={() => { setOpen(false); setView('main'); if (toggleRef.current) toggleRef.current.focus(); }}>{ICONS.close}</button>
            </div>
          </div>

          <div className="a11y-body">
            {view === 'structure' ? (
              <div className="a11y-card">
                <div className="a11y-menu-title">מבנה העמוד (לפי כותרות SEO)</div>
                {headings.length === 0
                  ? <div className="a11y-struct-empty">לא נמצאו כותרות בעמוד.</div>
                  : headings.map((h) => (
                    <button key={h.id} type="button" className="a11y-struct-item" onClick={() => gotoHeading(h.id)}>
                      <span className="a11y-h-tag">H{h.level}</span>
                      <span>{h.text}</span>
                    </button>
                  ))}
                <button type="button" className="a11y-menu-cancel" onClick={() => setView('main')}>חזרה</button>
              </div>
            ) : (
              <>
                {SECTIONS.map((sec) => (
                  <div className="a11y-card" key={sec.title}>
                    <div className="a11y-card-title">{sec.title}</div>
                    <div className="a11y-grid">{sec.tiles.map(renderTile)}</div>
                  </div>
                ))}
                <div className="a11y-card">
                  <div className="a11y-card-title">הקראה</div>
                  <button type="button" className="a11y-tts" aria-pressed={speaking} onClick={speak}>
                    <span className="a11y-tile-ic" style={{ width: 30, height: 30, background: 'transparent', color: 'inherit' }}>{ICONS.speaker}</span>
                    {speaking ? 'עצירת הקראה' : 'הקראת הדף בקול'}
                  </button>
                </div>
                {!hideBranding && <div className="a11y-foot">{brandLabel} · נגישות בהתאם לת"י 5568</div>}
              </>
            )}
          </div>

          {view === 'hide' && (
            <div className="a11y-modal-overlay" role="dialog" aria-label="הסתרת כפתור הנגישות" aria-modal="true">
              <div className="a11y-modal">
                <div className="a11y-modal-title">להסתיר את כפתור הנגישות? לכמה זמן?</div>
                <button type="button" className="a11y-modal-btn" onClick={() => hideFor(8 * 3600)}>ל‑8 שעות</button>
                <button type="button" className="a11y-modal-btn" onClick={() => hideFor(24 * 3600)}>ל‑24 שעות</button>
                <button type="button" className="a11y-modal-btn danger" onClick={() => hideFor(10 * 365 * 24 * 3600)}>לצמיתות</button>
                <button type="button" className="a11y-modal-btn cancel" onClick={() => setView('main')}>ביטול</button>
                <div className="a11y-modal-note">אפשר תמיד להחזיר עם Alt+Shift+A</div>
              </div>
            </div>
          )}

          {view === 'reset' && (
            <div className="a11y-modal-overlay" role="dialog" aria-label="איפוס הגדרות" aria-modal="true">
              <div className="a11y-modal">
                <div className="a11y-modal-title">לאפס את כל הגדרות הנגישות?</div>
                <button type="button" className="a11y-modal-btn primary" onClick={doReset}>כן, אפס הכול</button>
                <button type="button" className="a11y-modal-btn cancel" onClick={() => setView('main')}>ביטול</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

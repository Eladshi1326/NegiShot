/**
 * embed.jsx – נקודת כניסה ל"מצב סקריפט" (לכל אתר, גם לא-React).
 * נבנה לקובץ יחיד dist/accessibility-widget.js (React ארוז בפנים).
 *
 * קונפיג (3 דרכים, אין חסימות):
 *   1) data-* על תגית הסקריפט:
 *      <script src=".../accessibility-widget.js"
 *              data-position="bottom-right" data-color="#2b50e0" data-size="58"
 *              data-shape="circle" data-icon-color="#fff" data-icon-src="/logo.png"
 *              data-offset="20" data-z-index="2147483000"
 *              data-brand-label="האתר שלי" data-hide-branding="false"
 *              data-button-label="פתיחת תפריט נגישות"
 *              data-initial='{"highlightLinks":true}' defer></script>
 *   2) אובייקט גלובלי לפני הסקריפט:  window.A11yWidgetConfig = { color:"#e11d48", size:64 };
 *   3) תוכניתית בזמן ריצה:           AccessibilityWidget.init({ color:"#0ea5e9" });
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import AccessibilityWidget from './AccessibilityWidget.jsx';

(function () {
  if (typeof document === 'undefined') return;

  // איתור תגית הסקריפט המטמיעה (לקריאת data-*)
  var thisScript = document.currentScript;
  if (!thisScript) {
    thisScript = document.querySelector('script[data-a11y-widget]');
    if (!thisScript) {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if ((all[i].src || '').indexOf('accessibility-widget') >= 0) { thisScript = all[i]; break; }
      }
    }
  }

  function toNum(v) { var n = parseInt(v, 10); return isNaN(n) ? undefined : n; }

  function readConfig() {
    var cfg = {};
    var ds = (thisScript && thisScript.dataset) || {};
    if (ds.position) cfg.position = ds.position;
    if (ds.color) cfg.color = ds.color;
    if (ds.iconColor) cfg.iconColor = ds.iconColor;
    if (ds.size != null) cfg.size = toNum(ds.size);
    if (ds.shape) cfg.shape = ds.shape;
    if (ds.iconSrc) cfg.iconSrc = ds.iconSrc;
    if (ds.offset != null) cfg.offset = toNum(ds.offset);
    if (ds.zIndex != null) cfg.zIndex = toNum(ds.zIndex);
    if (ds.brandLabel) cfg.brandLabel = ds.brandLabel;
    if (ds.hideBranding != null) cfg.hideBranding = String(ds.hideBranding) === 'true';
    if (ds.buttonLabel) cfg.buttonLabel = ds.buttonLabel;
    if (ds.initial) { try { cfg.initialSettings = JSON.parse(ds.initial); } catch (e) { /* */ } }
    // אובייקט גלובלי גובר על data-*
    if (window.A11yWidgetConfig && typeof window.A11yWidgetConfig === 'object') {
      for (var k in window.A11yWidgetConfig) { if (Object.prototype.hasOwnProperty.call(window.A11yWidgetConfig, k)) cfg[k] = window.A11yWidgetConfig[k]; }
    }
    return cfg;
  }

  var rootEl = null, reactRoot = null, lastCfg = {};

  function init(options) {
    var cfg = readConfig();
    if (options && typeof options === 'object') { for (var k in options) { if (Object.prototype.hasOwnProperty.call(options, k)) cfg[k] = options[k]; } }
    lastCfg = cfg;
    if (!rootEl) {
      rootEl = document.getElementById('a11y-widget-host') || document.createElement('div');
      rootEl.id = 'a11y-widget-host';
      rootEl.setAttribute('data-a11y-widget-mount', '');
      if (!rootEl.parentNode) document.body.appendChild(rootEl);
      reactRoot = createRoot(rootEl);
    }
    reactRoot.render(React.createElement(AccessibilityWidget, cfg));
    return lastCfg;
  }

  function update(options) { return init(options); }       // עדכון קונפיג בזמן ריצה
  function unmount() {
    if (reactRoot) { reactRoot.unmount(); reactRoot = null; }
    if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
    rootEl = null;
  }

  window.AccessibilityWidget = { init: init, update: update, unmount: unmount, getConfig: function () { return lastCfg; } };

  var disabled = thisScript && thisScript.dataset && String(thisScript.dataset.auto) === 'false';
  if (!disabled) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
    else init();
  }
})();

# הפצה והטמעה – כפתור הנגישות

יש **שתי דרכי הטמעה** מאותו מקור קוד:

| דרך | למי | עדכון אוטומטי? |
|---|---|---|
| **א. סקריפט אחד (CDN)** | כל אתר, גם לא‑React | ✅ כן — דוחפים לריפו והאתרים מתעדכנים |
| **ב. ייבוא React** | פרויקטי React שלך | ❌ ידני (npm/העתקה + build) |

---

## דרך א — סקריפט אחד (מומלץ להפצה)

הוסף לאתר **שורה אחת** (לפני `</body>`). אפשר לשנות הכול דרך `data-*`:

```html
<script src="https://cdn.jsdelivr.net/gh/Eladshi1326/NegiShot@main/dist/accessibility-widget.js"
        data-a11y-widget
        data-position="bottom-right"
        data-color="#2b50e0"
        data-size="58"
        data-brand-label="האתר שלי"
        defer></script>
```

ה‑URL כבר מוגדר לריפו שלך (Eladshi1326/NegiShot). הקובץ כולל את React בתוכו — לא צריך שום דבר נוסף באתר.

### כל אפשרויות הקונפיג (data-*)

| Attribute | מה | ברירת מחדל |
|---|---|---|
| `data-position` | `bottom-right` / `bottom-left` / `top-right` / `top-left` | `bottom-right` |
| `data-color` | צבע הכפתור וההדגשות | `#2b50e0` |
| `data-icon-color` | צבע האייקון | `#ffffff` |
| `data-size` | גודל הכפתור (px) | `58` |
| `data-shape` | `circle` / `rounded` | `circle` |
| `data-icon-src` | תמונה/לוגו לכפתור (URL) | — |
| `data-offset` | מרחק מהקצה (px) | `20` |
| `data-z-index` | שכבת תצוגה | `2147483000` |
| `data-brand-label` | תווית בתחתית | `נגישות` |
| `data-hide-branding` | `true` להסתרת התווית | `false` |
| `data-button-label` | טקסט נגיש לכפתור | `פתיחת תפריט נגישות` |
| `data-initial` | הגדרות התחלתיות כ‑JSON, למשל `'{"highlightLinks":true}'` | — |
| `data-auto` | `false` כדי לא להפעיל אוטומטית (תפעיל ידנית) | `true` |

### עוד שתי דרכים לקונפיג (גמיש, לא חסום)

```html
<!-- 2) אובייקט גלובלי לפני הסקריפט (גובר על data-*) -->
<script>window.A11yWidgetConfig = { color: "#e11d48", size: 64, position: "bottom-left" };</script>

<!-- 3) שליטה תוכניתית בזמן ריצה -->
<script>
  AccessibilityWidget.update({ color: "#0ea5e9" }); // עדכון חי
  AccessibilityWidget.unmount();                      // הסרה
  // AccessibilityWidget.init({...});                 // הפעלה ידנית (אם data-auto="false")
</script>
```

---

## דרך ב — ייבוא ב‑React

עבור פרויקטי React שלך (בלי React כפול, אינטגרציה נקייה):

```jsx
import AccessibilityWidget from './AccessibilityWidget';
// פעם אחת באפליקציה:
<AccessibilityWidget position="bottom-left" color="#e11d48" size={64} brandLabel="האתר שלי" />
```

---

## אירוח ועדכון אוטומטי (GitHub + jsDelivr)

1. צור ריפו **ציבורי** ב‑GitHub והעלה את התיקייה (כולל `dist/accessibility-widget.js`).
2. ה‑URL להטמעה (משתמשים ב‑`@main` שעוקב אחרי ה‑branch):
   - `https://cdn.jsdelivr.net/gh/Eladshi1326/NegiShot@main/dist/accessibility-widget.js`
   - גרסה נעולה ויציבה (אופציונלי): `https://cdn.jsdelivr.net/gh/Eladshi1326/NegiShot@v1.0.0/dist/accessibility-widget.js`
3. **עדכון אוטומטי:** דוחפים שינוי לריפו → ה‑CDN מגיש את הקובץ החדש → כל האתרים מקבלים בטעינה הבאה.

> **למה `@main` ולא `@latest`?** ב‑jsDelivr, `@latest` מצביע על ה‑**tag/release** האחרון — לא על הקומיט האחרון. כל עוד דוחפים קומיטים בלי ליצור tag, `@latest` לא מתעדכן. `@main` עוקב ישירות אחרי ה‑branch, אז כל דחיפה נספרת.
>
> **מטמון:** `@main` נשמר ב‑jsDelivr עד ~12 שעות. כדי לעדכן **מיידית** — "מנקים" מטמון (purge) דרך `https://purge.jsdelivr.net/gh/Eladshi1326/NegiShot@main/dist/accessibility-widget.js` (הקובץ `רענון-CDN.bat` עושה זאת בלחיצה, וכפתור ההעלאה עושה זאת אוטומטית אחרי הדחיפה).
>
> **אזהרה:** עדכון אוטומטי = שינוי שובר ישבור את כל האתרים בבת אחת. עבוד בזהירות ובדוק לפני שאתה דוחף.

---

## בנייה מחדש אחרי שינוי בקוד

אחרי כל שינוי ב‑`AccessibilityWidget.jsx`, בונים מחדש את הסקריפט:

```bash
npm install        # פעם אחת
npm run build      # יוצר dist/accessibility-widget.js
git add -A && git commit -m "update" && git push
```

## מבנה הריפו
```
AccessibilityWidget.jsx     ← הקומפוננטה (מקור האמת)
embed.jsx                   ← עטיפת הסקריפט (קוראת data-* / global / init)
build.mjs                   ← בנייה (esbuild)
package.json
dist/accessibility-widget.js ← הקובץ הבנוי שמוגש ל-CDN
embed-demo.html             ← תצוגת שיטת הסקריפט (עובד גם בלי אינטרנט)
```

## תצוגה מקדימה מקומית
לחיצה כפולה על `embed-demo.html` מציגה את שיטת הסקריפט פועלת (הקובץ הבנוי מקומי, כולל React — לא צריך אינטרנט).

הערה: גודל הקובץ ~224KB (≈70KB ב‑gzip), כי React ארוז בתוכו כדי שיעבוד בכל אתר.

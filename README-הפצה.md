# הפצה והטמעה – כפתור הנגישות

יש **שתי דרכי הטמעה** מאותו מקור קוד:

| דרך | למי | עדכון אוטומטי? |
|---|---|---|
| **א. סקריפט אחד (CDN)** | כל אתר, גם לא‑React | ✅ כן — דוחפים לריפו והאתרים מתעדכנים |
| **ב. ייבוא React** | פרויקטי React שלך | ❌ ידני (npm/העתקה + build) |

---

## דרך א — סקריפט אחד (מומלץ להפצה)

הוסף לאתר את ה"טוען" הבא **פעם אחת** (לפני `</body>`). הוא דואג שכל המבקרים יקבלו עדכונים **תוך יום**:

```html
<!-- ACCESSIBILITY WIDGET - START -->
<script>
(function () {
  window.A11yWidgetConfig = { position: 'bottom-right', color: '#2b50e0' };
  var v = new Date().toISOString().slice(0, 10); // משתנה כל יום
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/Eladshi1326/NegiShot@main/dist/accessibility-widget.js?v=' + v;
  s.setAttribute('data-a11y-widget', '');
  document.body.appendChild(s);
})();
</script>
<!-- ACCESSIBILITY WIDGET - END -->
```

- צבע/מיקום/גודל: משנים בתוך `A11yWidgetConfig` (למשל `size: 64`).
- אם באתר כבר יש בלוק ישן — **מחליפים** אותו, לא מוסיפים שני. (יש גם הגנה בקוד מטעינה כפולה.)
- השורה הפשוטה הישנה (`<script src=".../accessibility-widget.js" data-a11y-widget ... defer>`) עדיין עובדת, אבל מבקר חוזר עלול לראות גרסה ישנה עד **7 ימים**.

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
| `data-hide-branding` | `true` להסתרת פס "נגישות בקלות" בתחתית | `false` |
| `data-button-label` | טקסט נגיש לכפתור | `פתיחת תפריט נגישות` |
| `data-initial` | הגדרות התחלתיות כ‑JSON, למשל `'{"highlightLinks":true}'` | — |
| `data-statement-url` | כתובת דף הצהרת הנגישות. כשמוגדר: קישור בולט בראש התפריט וכניסה לדף הזה מחזירה כפתור שהוסתר | אין קישור |
| `data-statement-label` | הטקסט של הקישור להצהרה | `הצהרת נגישות` |
| `data-auto` | `false` כדי לא להפעיל אוטומטית (תפעיל ידנית) | `true` |

> כל המפתחות האלו זמינים גם בתוך `A11yWidgetConfig` בשמות camelCase (`iconColor`, `hideBranding`, `initialSettings`...). `data-brand-label` / `brandLabel` הוצאו משימוש (הפוטר תמיד "נגישות בקלות").

### עוד שתי דרכים לקונפיג (גמיש, לא חסום)

```html
<!-- 2) אובייקט גלובלי לפני הסקריפט (גובר על data-*) -->
<script>window.A11yWidgetConfig = { color: "#e11d48", size: 64, position: "bottom-left" };</script>

<!-- 3) שליטה תוכניתית בזמן ריצה -->
<script>
  AccessibilityWidget.update({ color: "#0ea5e9" }); // עדכון חי
  AccessibilityWidget.unmount();                      // הסרה
  // AccessibilityWidget.init({...});                 // הפעלה ידנית (אם data-auto="false")
  AccessibilityWidget.show();                         // החזרת כפתור שהוסתר (מוחק את עוגיית ההסתרה)
  AccessibilityWidget.hide();                         // הסתרה עד טעינת הדף הבאה
  AccessibilityWidget.hide(3600);                     // הסתרה לשעה (נשמר בעוגייה)
</script>
```

### החזרת כפתור שהמשתמש הסתיר

מי שהסתיר את הכפתור "לצמיתות" יכול להחזיר אותו בכמה דרכים:
1. כניסה לדף הצהרת הנגישות, אם הוגדר `data-statement-url` (או `statementUrl`).
2. קישור עם הפרמטר `?a11y-widget=show` לכל דף שיש בו את הכפתור, למשל בדף ההצהרה: `<a href="/?a11y-widget=show">החזרת כפתור הנגישות</a>`
3. קיצור המקלדת Alt+Shift+A.
4. מהקוד: `AccessibilityWidget.show()`.

חלון ההסתרה עצמו מסביר למשתמש איך מחזירים את הכפתור. ההסתרה נשמרת בעוגייה `a11yWidgetHidden` כמו קודם.

### מה עוד השתנה בגרסה הזאת
* ניגודיות: צבע המותג מוכהה אוטומטית רק כמה שצריך, כך שכל טקסט ואייקון בתפריט עובר את יחס הניגודיות הנדרש. בצבע ברירת המחדל לא משתנה כלום.
* טבעת מיקוד דו גונית (כהה עם הילה לבנה) שנראית על כל רקע.
* גופן קריא: בדף בעברית האותיות העבריות עוברות לגופן מערכת ברור עם ריווח מתון.
* מבנה עמוד והקראה בקול רואים גם תוכן שבתוך מסגרות (iframe) מאותו אתר.

---

## דרך ב — ייבוא ב‑React

עבור פרויקטי React שלך (בלי React כפול, אינטגרציה נקייה):

```jsx
import AccessibilityWidget from './AccessibilityWidget';
// פעם אחת באפליקציה:
<AccessibilityWidget position="bottom-left" color="#e11d48" size={64} />
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
> **מטמון:** `@main` נשמר ב‑jsDelivr עד ~12 שעות, ו**בדפדפן של כל מבקר עד 7 ימים**. ה‑purge (`https://purge.jsdelivr.net/gh/Eladshi1326/NegiShot@main/dist/accessibility-widget.js`, דרך `רענון-CDN.bat` או אוטומטית אחרי ההעלאה) מנקה רק את ה‑CDN, לא את הדפדפנים. לכן מומלץ ה"טוען" היומי למעלה — הוא משנה את הכתובת כל יום, וכך מבקרים חוזרים מתעדכנים תוך יום. לבדיקה עצמית מיידית: גלישה בסתר.
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

הערה: גודל הקובץ ~181KB, כי React ארוז בתוכו כדי שיעבוד בכל אתר.

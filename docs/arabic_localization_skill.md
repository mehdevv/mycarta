# SKILL: Arabic (AR) Language Localization for EN/FR Websites

## When to Use This Skill
Trigger this skill whenever the user wants to:
- Add Arabic (`ar`) as a language option to an existing English or French website
- Fix RTL (Right-to-Left) layout bugs for Arabic content
- Localize fonts, forms, dates, numbers, or navigation for Arabic users
- Build a bilingual (EN+AR or FR+AR) or trilingual (EN+FR+AR) site

---

## The 9 Most Common Problems (and Their Fixes)

### 1. Missing `dir="rtl"` and `lang="ar"` on the HTML element

**Problem:** Without these attributes, the browser renders Arabic text in LTR mode — text appears jumbled or reversed, punctuation lands in wrong positions, and layout doesn't flip.

**Fix:**
```html
<!-- For a fully Arabic page -->
<html lang="ar" dir="rtl">

<!-- For a multilingual page — set per route/locale -->
<html lang="en" dir="ltr">  <!-- EN/FR version -->
<html lang="ar" dir="rtl">  <!-- AR version -->
```

For SPAs (React, Vue, Next.js), toggle dynamically:
```javascript
document.documentElement.setAttribute('lang', 'ar');
document.documentElement.setAttribute('dir', 'rtl');
```

---

### 2. CSS Physical Properties Break RTL Layout

**Problem:** CSS properties like `margin-left`, `padding-right`, `text-align: left`, `border-left`, `left: 0` are hardcoded to LTR. They do NOT flip when `dir="rtl"` is set.

**Fix — use CSS Logical Properties:**
```css
/* ❌ LTR-only (breaks Arabic) */
.card {
  margin-left: 20px;
  padding-right: 16px;
  text-align: left;
  border-left: 3px solid blue;
}

/* ✅ Works for both LTR and RTL */
.card {
  margin-inline-start: 20px;  /* left in LTR, right in RTL */
  padding-inline-end: 16px;   /* right in LTR, left in RTL */
  text-align: start;          /* left in LTR, right in RTL */
  border-inline-start: 3px solid blue;
}
```

Full logical property mapping:
| Physical (avoid) | Logical (use) |
|---|---|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `left: X` | `inset-inline-start: X` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |

---

### 3. Flexbox and CSS Grid Layout Not Flipping Correctly

**Problem:** Flexbox flips automatically when `dir="rtl"` is on the `<html>` tag — but CSS Grid column order does NOT auto-reverse. Navigation menus with `<ul>/<li>` may also stay in LTR order.

**Fix for CSS Grid:**
```css
/* Explicitly set direction inside grid containers */
.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  direction: rtl; /* Force RTL column flow */
}

/* Or use a conditional class */
[lang="ar"] .product-grid {
  direction: rtl;
}
```

**Fix for navigation menus:**
```css
/* Flex navbars need row-reverse in RTL if items are still LTR */
[dir="rtl"] .nav-menu {
  flex-direction: row-reverse;
}
```

**Note:** Flexbox `gap`, `justify-content`, and `align-items` adapt automatically — no change needed for those.

---

### 4. Wrong or Missing Arabic Fonts

**Problem:** Default system fonts or Latin fonts do not support Arabic OpenType shaping. Arabic is a cursive script where each letter has up to 4 contextual forms (isolated, initial, medial, final). A wrong font renders Arabic as disconnected boxes or missing glyphs ("tofu" — white squares).

**Recommended Arabic web fonts:**
- **Noto Sans Arabic** — safest choice, comprehensive coverage, Google free
- **Cairo** — modern geometric, great for interfaces and small sizes
- **Tajawal** — clean contemporary design, built for digital UI
- **Amiri** — traditional elegant style for formal/publishing contexts

**Fix:**
```html
<!-- Add to <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;700&display=swap" rel="stylesheet">
```

```css
/* Apply Arabic font only to AR content */
[lang="ar"],
[lang="ar"] body {
  font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
}

/* Or scope by unicode range if mixing in same page */
@font-face {
  font-family: 'SiteFont';
  src: url('font-arabic.woff2');
  unicode-range: U+0600-U+06FF, U+0750-U+077F; /* Arabic block */
}
```

**Typography adjustments for Arabic:**
```css
[lang="ar"] body {
  line-height: 1.8;      /* Arabic needs 20–30% more line height than Latin */
  font-weight: 400;       /* Avoid bold — it reduces readability in Arabic */
  /* Never use italic — Arabic script does not use italic */
}
```

---

### 5. Bidirectional (Bidi) Mixed Content Broken

**Problem:** Arabic text frequently contains LTR fragments — English product names, phone numbers, URLs, prices, code snippets. The Unicode Bidi algorithm handles most cases, but inline direction switches cause numbers/punctuation to land in wrong positions.

**Fix — use `dir="auto"` or explicit inline wrappers:**
```html
<!-- Let browser auto-detect direction of inline segments -->
<p dir="auto">هذا السعر هو 100 USD فقط</p>

<!-- Or wrap LTR fragments explicitly -->
<p dir="rtl">
  اتصل بنا: <span dir="ltr">+213 555 123 456</span>
</p>

<!-- For URLs and emails always wrap LTR -->
<a href="mailto:info@site.com" dir="ltr">info@site.com</a>
```

```css
/* CSS bidi isolation for inline elements */
.phone-number,
.email,
.url,
.price {
  unicode-bidi: isolate;
  direction: ltr;
  display: inline-block;
}
```

---

### 6. Forms and Inputs Not RTL-Friendly

**Problem:** Text inputs, textareas, select boxes, placeholders, and labels default to LTR alignment. Users type Arabic but the cursor starts from the left and text appears reversed.

**Fix:**
```css
/* All inputs in AR locale */
[lang="ar"] input,
[lang="ar"] textarea,
[lang="ar"] select {
  direction: rtl;
  text-align: right;
}

/* Or use logical property */
[lang="ar"] input {
  text-align: end;
}
```

```html
<!-- Always set dir on individual inputs if the page is mixed -->
<input type="text" dir="rtl" placeholder="اكتب هنا..." lang="ar">

<!-- Labels should be to the right of inputs in AR -->
<label for="name">الاسم</label>
<input id="name" type="text" dir="rtl">
```

---

### 7. Numbers, Dates, and Currency Display Issues

**Problem:** Arabic has two numeral systems — Western Arabic (0–9, used globally) and Eastern Arabic (٠١٢٣٤٥٦٧٨٩, used in formal printed Arabic in some Arab countries). Dates and currencies also follow different regional conventions.

**Fix — use the Intl API:**
```javascript
// Format numbers for Arabic locale
const price = new Intl.NumberFormat('ar-DZ', {  // Algeria
  style: 'currency',
  currency: 'DZD'
}).format(15000);
// → "15٬000٫00 د.ج" (or Western numerals depending on locale)

// Use ar-EG for Egyptian Arabic (Eastern numerals by default)
// Use ar-SA for Saudi Arabic
// Use ar-MA for Moroccan Arabic (Maghrebi — often Western numerals)

// Format dates
const date = new Intl.DateTimeFormat('ar-DZ', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(new Date());

// Force Western (ASCII) numerals if preferred
const westernNumerals = new Intl.NumberFormat('ar', {
  numberingSystem: 'latn' // forces 0-9
}).format(1234);
```

**CSS for numeral control:**
```css
/* Use Eastern Arabic numerals for AR content */
[lang="ar"] .price,
[lang="ar"] .date {
  font-feature-settings: 'kern';
  font-variant-numeric: arabic-indic;
}
```

---

### 8. Icons, Arrows, and Directional Images Not Mirrored

**Problem:** Chevrons, arrows, back/forward buttons, breadcrumbs, sliders, and progress bars are visually directional. In Arabic, "next" means pointing LEFT, not right. Icons with LTR visual meaning confuse Arabic users.

**Fix:**
```css
/* Mirror directional icons in RTL */
[dir="rtl"] .icon-arrow-right,
[dir="rtl"] .icon-chevron,
[dir="rtl"] .icon-back,
[dir="rtl"] .breadcrumb-separator,
[dir="rtl"] .slider-track {
  transform: scaleX(-1);
}

/* CSS :dir() pseudo-class (modern browsers) */
.arrow-icon:dir(rtl) {
  transform: scaleX(-1);
}

/* Do NOT mirror: logos, checkmarks, non-directional icons */
/* Do NOT mirror: social media icons, play/pause buttons */
```

For SVG icons, prefer inline SVG and flip with CSS. For icon libraries (Font Awesome, Lucide), check if an RTL variant exists before mirroring.

---

### 9. Language Switcher and Routing Not Configured

**Problem:** Sites add a translation but don't set up proper URL structure, HTML lang attributes, or hreflang meta tags. Search engines can't index the Arabic version, and sharing links don't load the right language.

**Fix — URL structure:**
```
/en/about        → English
/fr/about        → French
/ar/about        → Arabic  ✅ (preferred)

OR

/about           → English (default)
/ar/about        → Arabic

OR subdomains:
ar.example.com   → Arabic
```

**Fix — hreflang in `<head>`:**
```html
<link rel="alternate" hreflang="en" href="https://example.com/en/about">
<link rel="alternate" hreflang="fr" href="https://example.com/fr/about">
<link rel="alternate" hreflang="ar" href="https://example.com/ar/about">
<link rel="alternate" hreflang="x-default" href="https://example.com/en/about">
```

**Language switcher component (plain HTML):**
```html
<nav class="lang-switcher" aria-label="Language selector">
  <a href="/en" hreflang="en" lang="en">English</a>
  <a href="/fr" hreflang="fr" lang="fr">Français</a>
  <a href="/ar" hreflang="ar" lang="ar" dir="rtl">العربية</a>
</nav>
```

---

## Framework-Specific Implementation

### Next.js (App Router)
```javascript
// next.config.js
module.exports = {
  i18n: {
    locales: ['en', 'fr', 'ar'],
    defaultLocale: 'en',
  }
};

// app/[locale]/layout.jsx
export default function RootLayout({ children, params }) {
  const { locale } = params;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
```

### React (without framework)
```javascript
// i18n config
import i18n from 'i18next';

i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('lang', lng);
  document.documentElement.setAttribute('dir', dir);
});
```

### Vue / Nuxt
```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  i18n: {
    locales: [
      { code: 'en', dir: 'ltr', file: 'en.json' },
      { code: 'fr', dir: 'ltr', file: 'fr.json' },
      { code: 'ar', dir: 'rtl', file: 'ar.json' },
    ],
    defaultLocale: 'en',
  }
});
```

### Tailwind CSS RTL
```javascript
// tailwind.config.js — enable RTL variant
module.exports = {
  plugins: [require('tailwindcss-rtl')],
};
```
```html
<!-- Use RTL-aware Tailwind classes -->
<div class="ms-4 ps-4 text-start border-s">  <!-- logical properties -->
  <!-- ms = margin-inline-start, ps = padding-inline-start -->
</div>
```

---

## QA Checklist Before Shipping Arabic

- [ ] `<html lang="ar" dir="rtl">` is set on all Arabic pages
- [ ] Arabic font loads correctly — no tofu (white squares) anywhere
- [ ] Line height is at least 1.8 for Arabic body text
- [ ] Layout mirrors: navigation is on the right, sidebar swaps sides
- [ ] CSS Grid has explicit `direction: rtl` where needed
- [ ] All directional icons (arrows, chevrons, breadcrumbs) are mirrored
- [ ] Forms: inputs/textareas have `dir="rtl"` and right-aligned text
- [ ] Phone numbers, emails, URLs stay `dir="ltr"` inside Arabic text
- [ ] Numbers and dates formatted with `Intl.NumberFormat` and `Intl.DateTimeFormat` for the correct Arabic locale
- [ ] Bold and italic never used for Arabic body text
- [ ] `hreflang` tags are set for all language versions
- [ ] Language switcher shows Arabic label in Arabic script: **العربية**
- [ ] Mobile tested on Android (Chrome/Samsung Internet) and iOS Safari
- [ ] Reviewed by at least one native Arabic speaker

---

## Useful Resources
- [W3C Internationalization — Arabic](https://www.w3.org/International/techniques/authoring-html)
- [CSS Logical Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
- [Google Fonts Arabic collection](https://fonts.google.com/?subset=arabic)
- [Unicode Bidirectional Algorithm](https://unicode.org/reports/tr9/)
- [Stylelint RTL plugin](https://github.com/mgagvani/stylelint-rtlcss) — lints CSS for physical properties

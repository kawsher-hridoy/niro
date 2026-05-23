# Frontend — Bangla Typography

How Niro renders Bangla correctly across browsers. Skipping this leaves
us with broken ligatures, wrong glyphs, or boxes — any of which sinks
the demo's "Bangla-first" story.

## Font choice

**Noto Sans Bengali** — broadest character coverage, decent ligature
handling, available via Google Fonts.

Alternative: **Hind Siliguri** if Noto's rendering is too uniform-feeling.

## Loading

Use Next.js `next/font/google` for self-hosting + automatic preload:

```typescript
// niro/frontend/app/layout.tsx
import { Noto_Sans_Bengali } from "next/font/google";

const bangla = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-bangla",
});

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className={bangla.variable}>
      <body className="font-bangla">{children}</body>
    </html>
  );
}
```

Tailwind config:

```typescript
// tailwind.config.ts
fontFamily: {
  bangla: ["var(--font-bangla)", "system-ui", "sans-serif"],
},
```

## Ligature settings

Bangla relies heavily on conjuncts (যুক্তাক্ষর). Force-enable OpenType
features for reliable rendering:

```css
/* niro/frontend/styles/bangla.css */
.font-bangla {
  font-feature-settings: "akhn", "blwf", "half", "pstf", "vatu", "rphf";
  font-variant-ligatures: common-ligatures contextual;
}
```

## Bangla numerals in medical values

By convention, Niro displays medical values using Bangla numerals
(২৪৫ mg/dL, not 245 mg/dL). The AI returns them this way when prompted
in Bangla.

Helper:

```typescript
// niro/frontend/lib/i18n.ts
const banglaDigits = "০১২৩৪৫৬৭৮৯";
export function toBangla(n: number | string): string {
  return String(n).replace(/[0-9]/g, d => banglaDigits[+d]);
}
```

## Test matrix

Before any demo, verify these render correctly:

| Browser | Sample text |
|---|---|
| Chrome (Android) | "রোগী একজন ৫৪ বছর বয়সী মহিলা, ডায়াবেটিস ও উচ্চ রক্তচাপ আছে।" |
| Safari (iOS) | "হিমোগ্লোবিন কম — ১০.২ g/dL (স্বাভাবিক ১২-১৬)।" |
| Firefox (desktop) | "প্রেসক্রিপশনে ৫টি ওষুধ আছে: Metformin, Glimepiride, Losartan, Atorvastatin, Sergel।" |
| Chrome (desktop) | "ডাঃ বিজয় আপনার প্রোফাইল দেখেছেন ৩ মিনিট আগে।" |

Look for: missing glyphs, broken conjuncts (e.g., ক্ত should be a single
glyph, not two stacked), wrong directionality.

## Common pitfalls

- **System fallback** to a non-Bangla font on iOS Safari shows boxes.
  Fix: ensure `display: "swap"` and the font preload header.
- **Conjuncts breaking** when the font weight changes mid-string (e.g.,
  bold). Fix: include all needed weights in the `Noto_Sans_Bengali`
  config.
- **Bangla in a `<title>` tag** sometimes shows wrong glyphs in browser
  tabs. Fix: use English in titles for now.
- **Copy/paste of Bangla from the rendered page** sometimes gives the
  wrong codepoints. Fix: ensure the source string uses NFC normalization.

## To be added during the build

- [ ] Phase A: actual `app/layout.tsx` with font setup
- [ ] Phase B: `toBangla()` helper unit tests
- [ ] Phase D: cross-browser screenshot test

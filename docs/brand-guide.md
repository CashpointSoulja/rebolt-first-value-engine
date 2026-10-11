# Rebolt brand guide — observed research

Captured **11 October 2026**, from public official pages only. This is an independent reference, not a Rebolt-approved design system. **Independent concept by Ayo Ahmed; no Rebolt affiliation.**

## 1. Source hierarchy and variants

1. [Live root](https://www.rebolt.ai/) returns HTTP **307** to [`/aviation`](https://www.rebolt.ai/aviation). The non-www root first redirects to www. Aviation is the primary visual reference for this concept.
2. [Official brand page](https://www.rebolt.ai/brand) supplies literal downloadable logo assets, naming rules and a generic blue/black/white palette. Its typography differs from aviation.
3. [Pitch Rebolt](https://www.rebolt.ai/pitch-rebolt) and [Introducing Rebolt](https://www.rebolt.ai/introducing-rebolt) retain generic platform material. They are editorial pages, **not proof of a separate current generic homepage**. See [CompanyOS variant](companyos-variant.md).

Do not mix the generic blue button treatment into the aviation amber hazard-stripe treatment without a deliberate later decision. Source CSS, exact selectors, rectangles, font declarations and hashes are stored under [research](research/source-manifest.json).

## 2. Literal logo and naming

The official naming rule is **Rebolt**, capital R, without `.ai` or `AI` appended to the company/product name. The domain remains a valid URL.

| Asset | Literal source | Local evidence |
|---|---|---|
| White wordmark | [Official SVG](https://www.rebolt.ai/landing/brand/wordmark-white.svg) | [SVG](research/assets/wordmark-white.svg) |
| Black wordmark | [Official SVG](https://www.rebolt.ai/landing/brand/wordmark-black.svg) | [SVG](research/assets/wordmark-black.svg) |
| White square icon | [Official SVG](https://www.rebolt.ai/landing/brand/logo-icon-white-squared.svg) | [SVG](research/assets/logo-icon-white-squared.svg) |
| Black rounded icon | [Official SVG](https://www.rebolt.ai/landing/brand/logo-icon-black-rounded.svg) | [SVG](research/assets/logo-icon-black-rounded.svg) |
| Stylized square icon | [Official SVG](https://www.rebolt.ai/landing/brand/rebolt-icon-squared.svg) | [SVG](research/assets/rebolt-icon-squared.svg) |
| Stylized rounded icon | [Official SVG](https://www.rebolt.ai/landing/brand/rebolt-logo-rounded.svg) | [SVG](research/assets/rebolt-logo-rounded.svg) |
| Aviation nav symbol | Inline SVG in `header a` on aviation | [Verbatim DOM extraction](research/assets/aviation-nav-symbol.svg) |

The aviation header renders its inline symbol beside uppercase **REBOLT** text; the official downloadable generic wordmark uses title case. They are not interchangeable observations. Preserve the literal assets, proportions and clear contrast. The brand page requests proper spacing but supplies no numeric clear-space rule; do not invent one as an official token.

## 3. Aviation colors — source and computed evidence

| Role | Source value | Evidence |
|---|---|---|
| CTA / focus accent | **#FFAF00** | `bg-[#FFAF00]`, computed `rgb(255,175,0)` |
| Hazard stripe / light-section ink | **#202322** | Stripe gradient and `text-[#202322]` |
| Hero base | **#090B11** | First `main > section` background; visually overlaid |
| Absolute hero backing | **#242422** | First full-size background div, underneath illustration/overlays |
| Warm radial layer | **#39362F / 50%** | Radial at `70% 20%`, transparent by `70%` |
| Hero central veil | **#242422 / 35%** | Middle stop of black-to-charcoal overlay |
| Hero lower fade | **#111110** | Bottom stop and lower-half upward fade |
| Main text | **#FFFFFF** | H1 computed `rgb(255,255,255)` |
| Form background | White at **10%** | `bg-white/10`, layered over hero with backdrop blur |
| Form placeholder | White at **60%** | `placeholder:text-white/60` |

The charcoal appearance is a **layered composition**, not a single flat swatch. Warm charcoal, aircraft outline SVGs and gradients explain why sampling a screenshot does not equal the declared hero base.

Generic official colors are separately **Blue #006AFE**, **Pitch Black #0D0E10**, **Pure White #FFFFFF**. Those are stated on the brand page, not inferred from aviation. Generic component backgrounds may differ from those brand swatches.

## 4. Fonts — an observed mismatch, not a guessed replacement

### Aviation

Computed family: `helveticaNow, "helveticaNow Fallback", "Helvetica Neue", Arial, sans-serif`.

The browser's rendered-font inspection on the H1 identifies **Helvetica Now Display Medium**, PostScript `HelveticaNowDisplay-Md`, custom font. H1 CSS requests weight **450**, while the site declares separate normal faces at 300/400/500/700/800/900 and italic faces at 400/700. Do not call it a variable font or assume an exact 450 binary.

Font definitions are in [0fwa4b9t32sfx.css](research/css/0fwa4b9t32sfx.css); exact source URLs and complete declarations are in [font-declarations.json](research/font-declarations.json). The normal 500 face's source basename is `HelveticaNowDisplayMedium-s.1_66142zt7ww-.otf`.

**License gate:** the official regular font's embedded license states that copying/distribution requires applicable rights; see the [name-table evidence](research/font-license-evidence.json). Publicly served commercial fonts are not automatically licensed for another public site. No Helvetica binaries are redistributed here. Future implementation must establish a valid webfont license, obtain permitted assets, or explicitly document an approved fallback. Official screenshots preserve the real rendered specimen without inventing a replacement.

### Generic CompanyOS / brand pages

The brand page explicitly names **Inter** as primary and **Geist Mono** as monospaced. Computed body and heading on brand/pitch use Inter; pitch's small editorial label uses Geist Mono. Shared CSS also declares **Manrope**, but a declaration alone does not make it the primary brand font. Source declared weight ranges: Inter 100–900, Geist Mono 100–900, Manrope 200–800. No font binaries are bundled; record licensing before future redistribution.

## 5. Aviation type, spacing and responsive layout

Values below are **observed**, not a complete canonical token system. Desktop viewport **1366×900**, mobile **390×844**, DPR 1. Native scrollbar consumes 15 CSS px, so content widths are 1351 and 375. Do not misreport them as 1366/390-width content.

| Element | Desktop | 390px viewport |
|---|---|---|
| H1 | 80px, weight 450, 88px line-height, −4px tracking, uppercase | 48px, 52.8px line-height, −2.4px tracking |
| H1 left inset | 80px | 24px |
| Hero input | 385.898×50px; 16/24px type; 12px vertical, 20px horizontal padding | 327×50px, same type/padding |
| CTA | 385.898×268.961px in captured flex layout | 327×112px |
| CTA label | 36px, weight 500, 36px line-height, −0.9px tracking | Same |
| CTA corners / padding | 0px / 16px | Same |
| Header | 48px high, sticky | 48px high; hamburger replaces desktop links |

Source H1 classes include `text-5xl sm:text-6xl md:text-[5rem] leading-[1.1] tracking-tighter font-[450] uppercase`. CSS breakpoints: `sm` 40rem, `md` 48rem, `lg` 64rem; confirm from stored media rules rather than naming an unobserved tablet screenshot.

Hero layout is a large left editorial block and right conversion form on desktop; it stacks on mobile. Desktop text/form flex grow factors are **1.65 / 0.85**, form minimum width **320px**, heading/content gap **24px**, and observed desktop inter-column gap **56px**. Top section has `pt-15` (60px) and `-mt-15` (−60px); the sticky header is 48px high. These values should not be rounded into an invented universal 8px system.

Below the hero: a white outcome-claim strip with charcoal type and thin dividers; then a near-black platform section with white headings and numbered workflow columns. Those outcome claims belong to Rebolt's marketing, not to this concept's performance.

## 6. Hazard CTA — exact source treatment

```css
background-color: #FFAF00;
background-image: repeating-linear-gradient(
  135deg, transparent 0px, transparent 9px,
  #202322 9px, #202322 18px
);
background-size: 100% 40%;
background-position: bottom;
background-repeat: no-repeat;
border-radius: 0;
padding: 16px;
```

These declarations describe the observed button, not a new product component. The arrow is top-right; stripes occupy the bottom **40%**. Source hover treatment is amber at **90%** opacity; focus ring is amber at **50%**. The form has an 8px vertical gap. Future workbench actions must use meaningful non-operational labels, not pretend to start real maintenance or payments.

## 7. Motion — observed versus merely available CSS

- CTA computed transition: **100ms**, `cubic-bezier(0.4,0,0.2,1)`. H1 has no entrance animation in captured computed styles. Aircraft outlines have no active CSS animation in the capture; do not invent a parallax requirement.
- Explore arrow: `subtle-bounce`, **2.4s**, ease-in-out, infinite. Keyframes: 0%/100% opacity .55 and `translateY(0)`; 50% opacity 1 and `translateY(8px)`.
- Under `prefers-reduced-motion: reduce`, the arrow's computed animation is **none**, verified via media emulation. Broader shared CSS contains other animations; they are not automatically aviation brand requirements.
- Future application motion should respect reduced motion and never obscure metric updates. Any new interaction/motion is a proposed adaptation, not an observed Rebolt behavior.

## 8. Actual visual evidence

- [Desktop hero, 1366×900](research/screenshots/aviation-desktop.png)
- [Mobile hero, 390×844](research/screenshots/aviation-mobile.png)
- [Desktop outcome/platform sections](research/screenshots/aviation-sections-desktop.png)
- [Official brand page desktop](research/screenshots/brand-desktop.png) and [mobile](research/screenshots/brand-mobile.png)
- [Generic pitch editorial desktop](research/screenshots/companyos-desktop.png) and [mobile](research/screenshots/companyos-mobile.png)
- [Self-contained visual guide](brand-visual-guide.html) and [PDF](brand-visual-guide.pdf)

No form was submitted, no authentication was attempted and no customer product UI was inspected. See [third-party notices](third-party-notices.md) for ownership and redistribution boundaries. Source links reflect a dated capture and may change.

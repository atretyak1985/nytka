# 🌸 Bloombum Design System

> The brand & UI system for **Bloombum** — a premium, same-day flower-delivery
> platform. One romantic identity expressed across two real product surfaces:
> a consumer **storefront** and an editorial **vendor dashboard**.

---

## 1. Product context

**Bloombum is a flower-delivery marketplace** that connects three audiences
through one workflow: an **admin** curates ready-made bouquet templates, a
**customer** browses & buys them, and a network of independent **vendors**
(florists) compete to fulfil each order on a *first-come-first-served* basis,
with **Uber Direct** handling the last-mile delivery and **Stripe** the
payments. To the shopper it reads as a single luxury florist; the marketplace
machinery is deliberately invisible (no "sold by", no vendor attribution on the
storefront).

### Surfaces represented in this system

| Surface | Audience | Vibe | This system covers |
|---|---|---|---|
| **Storefront** (`bloomblum_client`, Next.js) | Customers (web) | Romantic, warm, editorial-luxury | ✅ UI kit + components |
| **Vendor dashboard** (`bloomblum_vendor`, Next.js) | Florists / vendor staff | Editorial ops console, data-dense | ✅ UI kit + components |
| Admin panel (`bloomblum_admin`, Vite/React) | Internal ops | Catalog & pricing management | ▫️ shares tokens; no kit yet |
| Influencer portal (`bloomblum_influencer`) | Creators / referrals | Marketing | ▫️ not covered |
| API (`bloomblum_api`, NestJS) | — | Backend | n/a |

> The two covered surfaces share **one brand**: the Fraunces "bloombum"
> wordmark, the wine/burgundy brand colour, warm-cream paper, and blush accents.
> They diverge in **density** — the storefront is generous and soft (pill
> buttons, 20–32px cards, soft shadows); the dashboard is tight and editorial
> (6–14px radii, hairline borders, mono labels).

### Sources (for anyone with repo access)

- **Codebase:** `bloomblum/` monorepo (mounted locally), notably:
  - `bloomblum_client/` — storefront. Tokens in `src/app/globals.css`,
    `tailwind.config.ts`; primitives in `src/components/ui/`; surfaces in
    `src/features/` & `src/components/layout/`; brand assets in `public/brand/`.
  - `bloomblum_vendor/` — vendor dashboard. Editorial tokens in
    `app/globals.css`, `lib/design-tokens.ts`; primitives in `components/ui/`;
    dashboard in `components/dashboard/` + `app/(dashboard)/`.
  - `bloomblum_docs/bloombum-concept.md` — the canonical product concept.
  - `bloomblum_client/public/brand/README.md` — the wordmark spec (source of
    truth for the Fraunces SOFT wordmark system).
- No Figma file or slide deck was provided.

---

## 2. Content fundamentals — how Bloombum writes

**Voice:** warm, confident, quietly luxurious. The storefront speaks to a
gift-giver who wants to feel taken care of; it is reassuring and a little
romantic, never gimmicky or discount-y. The dashboard speaks to a working
florist; it is calm, precise, and respectful of their time.

- **Person:** storefront addresses the customer as **you** ("delivered to your
  door", "See my Bloombum picks"). Dashboard is impersonal/operational
  ("Confirm 3 new orders", "Nothing waiting on you.").
- **Casing:** **Sentence case** everywhere for headings and buttons
  ("Order flowers", not "Order Flowers"). The *only* uppercase is the
  **mono eyebrow / label** pattern (`PENDING NOW`, `REVENUE · THIS WEEK`) —
  always set in JetBrains Mono with wide tracking.
- **Tone examples (storefront):** "Premium flower delivery", "Fresh bouquets
  delivered to your door", "Same-day delivery", "Ready in 45 min". Eyebrows
  like "Bouquet" sit above product names.
- **Tone examples (dashboard):** terse status lines built from middots —
  "Friday, 12 June · Open · 6 active orders · 2 in delivery"; nudges like
  "New orders will surface here automatically." Numbers lead ("+8.2% wk",
  "−2 min", "↑ 12.4% vs last week").
- **Middot rhythm:** ` · ` is the brand's signature separator for compact
  metadata across both surfaces.
- **Anti-requirements (storefront copy):** never expose marketplace mechanics —
  no "vendor", "seller", "partner", "florist", or "sold by X". The shopper sees
  one brand.
- **Emoji:** not used in product UI. (🌸 appears only in internal docs like
  this one.) Arrows (`↑ ↓ → ↗`) and the middot are used as typographic glyphs,
  not emoji.
- **Numbers & money:** USD, `$` prefix, two decimals on storefront prices
  ($48.00); rounded whole dollars on dashboard KPIs ($1,240).

---

## 3. Visual foundations

### Colour & vibe
The palette is **warm and feminine but grown-up**. The hero colour is a deep
**wine/burgundy** (`#7A0D38`) — the accent in the wordmark, the storefront CTA,
and the dashboard's active state. It sits on **warm cream paper** (`#FAF7F2`,
storefront sometimes a blush-tinted `#FFF8FB`) with **near-black warm ink**
(`#1A1413`) for text. Accents are **blush pinks** (`#F5D8DF`, `#FCE5EB`). The
dashboard adds a quiet editorial **status set** — sage (success), amber
(prep/warning), sky (delivery/info), violet (promo). Nothing is pure black or
pure grey; neutrals are warmed toward taupe.

### Imagery
Photography is the storefront's centrepiece: **bouquets shot on soft, blush
studio backdrops** with gentle, directional light and shallow depth of field —
warm, romantic, premium, never cool or clinical. Petals scattered on the
surface are a recurring motif. A looping **hero video** of an arrangement
anchors the homepage (`hero-video.mp4`, poster `hero-poster.jpg`). Decorative
line-art flowers (`hero-flowers.svg`) sit at ~20% opacity behind hero copy.
Product imagery is square (1:1), object-fit cover, and zooms 1.05× on hover.

### Type
**Fraunces** (warm, high-contrast display serif, `opsz` 144 · `SOFT` 100) for
the wordmark, headings, product names, and the big dashboard numerals — set in
**sentence case**, tracking slightly tight (`-0.02em`). Body copy is
**Plus Jakarta Sans** on the storefront and **Inter** on the dashboard.
**JetBrains Mono** carries every uppercase label, eyebrow, badge, and data
chip. The serif/sans/mono triad is the signature.

### Backgrounds
Flat warm fills, no busy gradients. Gradients appear only as (a) the **wine CTA
wash** (`90deg, #7A0D38 → #5E0828`) and (b) subtle **blush section washes**
(white → `#FFF1F4`). The dashboard is almost entirely flat cream + hairlines.

### Borders, cards & elevation
- **Storefront cards:** white, **20px** (content) to **32px** (feature) radii,
  hairline blush border (`#EFD9E3` at ~30–40% opacity) **or** a soft warm
  shadow (`0 10px 22px rgba(26,20,19,.06)`). They **lift** on hover
  (`translateY(-2px)` + deeper shadow).
- **Dashboard cards / bento tiles:** white on cream, **14px** radius, **1px
  warm hairline** (`#E5DCCD`), **no shadow** — hover darkens the border instead.
- **Radii ladder:** chip 6 · button 8 · dashboard card 14 · frame 18 ·
  storefront card 20 · feature 32 · pill 999.

### Buttons & states
- **Primary (storefront):** wine pill, white text, soft shadow; hover deepens
  to `#5E0828` and **scales 1.05** / lifts. Focus = 2px wine ring, 3px offset.
- **Primary (dashboard):** ink or wine, **8px** radius, 32px tall, no scale —
  hover shifts background only.
- **Secondary:** blush fill on storefront / white-with-hairline on dashboard.
- **Hover convention:** storefront = lift + scale + deepen; dashboard = flat
  colour shift. **Press:** return to translateY(0) (no shrink).

### Motion
Gentle and confident. `cubic-bezier(0.22,1,0.36,1)` ease-out is the house curve.
Durations: 150ms (dashboard state), 200ms (storefront hover-lift), 300ms
(drawers), 500ms (image zoom). Entrance animations are short fades +
translateY (`fade-in`, `slide-in-up`). No bounces, no infinite decorative loops.
`prefers-reduced-motion` disables hover transforms and autoplay video.

### Transparency & blur
Sparing. The sticky storefront header uses `backdrop-blur-sm` over a translucent
surface; floating badges over photos use `bg-white/95 backdrop-blur-sm`. The
mobile sidebar scrim is `ink/40` + blur. Otherwise surfaces are opaque.

### Layout rules
Storefront content maxes at **1280px**, centered, 16–32px gutters; sticky header
(72px row + 46px nav). Dashboard is a fixed **232px** left sidebar + fluid
content on cream, organised as a **12-column bento grid** of tiles
(hero span 8, widgets span 4–6, stats span 3).

---

## 4. Iconography

Bloombum uses **two coordinated icon registers**:

1. **Line icons (UI).**
   - *Storefront* ships a small **bespoke line-icon set** drawn inline: 24×24
     viewBox, **1.7px stroke**, round caps & joins, `currentColor` (heart, bag,
     user, search, chevron, arrow). One consistent family across the header.
   - *Dashboard* uses **[Lucide](https://lucide.dev)** (`lucide-react`) at
     16–18px for nav and actions.
   - **In this system** we standardise on **Lucide via CDN** as the line-icon
     set for both kits, because it matches the bespoke storefront set almost
     exactly (same geometric, rounded, ~1.5–2px stroke language). This is a
     **substitution** for the storefront's hand-drawn glyphs — flag if you need
     the exact originals. Load:
     `<script src="https://unpkg.com/lucide@latest"></script>` then
     `lucide.createIcons()`, or use inline `<svg>` with `stroke-width="1.75"`.
2. **Illustrated icons (decorative).** The product also uses **soft illustrated
   PNG icons on blush circular backgrounds** — wine/pink line-art of a watering
   can, calendar-with-heart, address pin, etc. (`assets/icons/account/*`,
   `assets/icons/status/*`, `assets/icons/medallion.png`). These are used for
   account features, order-status steps, and trust signals — never for dense UI
   controls. Copied into `assets/icons/`; reuse the originals, don't redraw.

**Unicode glyphs as icons:** the brand intentionally uses typographic
arrows (`↑ ↓ → ↗ ←`) and the middot (`·`) as inline "icons" in mono labels and
deltas. Keep these as text, not SVG.

**Never** hand-roll flower/brand illustrations in SVG — use the copied photographic
and illustrated assets, or request new ones.

---

## 5. Index / manifest

**Root**
- `styles.css` — global entry (imports only; consumers link this one file)
- `readme.md` — this guide · `SKILL.md` — Agent-Skill entry point

**`tokens/`** — `fonts.css` (Google Fonts), `colors.css`, `typography.css`,
`spacing.css` (spacing · radii · shadows · motion · layout), `utilities.css`
(`.bb-wordmark`, `.bb-eyebrow`, `.bb-cta`, `.bb-hover-lift`, `.bb-badge`).

**`guidelines/`** — 20 foundation specimen cards (Design System tab):
Colors (brand · surfaces · ink · status · gradients), Type (display · body ·
ui-mono · scale), Spacing (scale · radii · elevation), Brand (wordmark ·
monogram · CTA & badges · imagery · iconography).

**`components/`** — reusable React primitives, each `Name.jsx` + `Name.d.ts` +
`Name.prompt.md` + a `@dsCard` HTML. Consume via
`const { … } = window.BloombumDesignSystem_0d9a7f`:
- `core/` — **Button**, **Badge**, **Input**, **Card** (storefront + dashboard surfaces)
- `commerce/` — **ProductCard** (storefront bouquet tile · *starting point*)
- `dashboard/` — **StatTile** (KPI tile with sparkline)

**`ui_kits/`** — interactive product recreations (self-contained):
- `storefront/` — consumer flower shop: Home → Catalog → Product → Cart *(starting point)*
- `dashboard/` — vendor ops console: Overview (bento) ↔ Orders *(starting point)*

**`assets/`** — `logo/` (Fraunces wordmark, 3 monograms, logo.png),
`imagery/` (hero bouquet, florist portrait, generated product crops),
`icons/` (illustrated account + order-status PNGs, medallion).

### Known substitutions (please confirm / replace)
- **Fonts** load from **Google Fonts** (Fraunces, Plus Jakarta Sans, Inter,
  JetBrains Mono) instead of the apps' self-hosted next/font binaries. Fraunces'
  custom **SOFT** axis is approximated via `font-variation-settings`. Swap in the
  licensed binaries + a `@font-face` file for pixel-fidelity and offline use.
- **Line icons** use **Lucide** (matches the source `lucide-react` + the
  storefront's bespoke 1.7px set). Swap to the exact hand-drawn glyphs if needed.
- **Product imagery** is tinted crops of one real bouquet photo — replace with
  real catalog photography.
- Legacy/interim type directions seen in the codebase (Poltawski Nowy, Sarabun,
  Cormorant Garamond) were **dropped** in favour of the current Fraunces wordmark
  system; raise a flag if any surface must keep them.

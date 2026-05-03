---
name: Tripo
description: AI-enhanced local discovery and booking for Saudi Arabia
colors:
  midnight-interior: "#050B1E"
  deep-chamber: "#081229"
  lifted-surface: "#101B36"
  oasis-spring: "#7CF7C8"
  oasis-deep: "#1EC99A"
  karam-gold: "#F7C948"
  waypoint-red: "#FF6B7A"
  desert-moon: "#B8C2D6"
  dusk-sand: "#7F8AA3"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 5vw, 2.5rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  card: "1.25rem"
  xl-card: "1.5rem"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  section: "32px"
components:
  button-mint:
    backgroundColor: "{colors.oasis-spring}"
    textColor: "{colors.midnight-interior}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    typography: "label"
  button-mint-hover:
    backgroundColor: "{colors.oasis-deep}"
    textColor: "{colors.midnight-interior}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "rgba(255,255,255,0.08)"
    textColor: "{colors.desert-moon}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  card-glass:
    backgroundColor: "rgba(255,255,255,0.08)"
    rounded: "{rounded.card}"
  card-glass-elevated:
    backgroundColor: "rgba(255,255,255,0.12)"
    rounded: "{rounded.card}"
  pill-active:
    backgroundColor: "{colors.oasis-spring}"
    textColor: "{colors.midnight-interior}"
    rounded: "{rounded.pill}"
  pill-inactive:
    backgroundColor: "rgba(255,255,255,0.08)"
    textColor: "{colors.desert-moon}"
    rounded: "{rounded.pill}"
---

# Design System: Tripo

## 1. Overview

**Creative North Star: "The Night Desert Concierge"**

Tripo is used most often in the evening. A Saudi resident settling into their sofa, phone in hand, deciding where to go this weekend or planning a group escape. The surface needs to feel like a knowledgeable local friend in a warmly-lit room — not a marketplace, not a travel agency, not a dashboard. Deep, quiet backgrounds with precise, luminous accents. The darkness amplifies desire; the city photos pop against navy the same way a destination looks better at night.

The system runs on a full palette: mint for motion and intent, gold for earned value and reputation, coral for urgency and warnings — all on a foundation of three navy depths that create spatial hierarchy without a single shadow. Glassmorphism appears only when a card genuinely floats over imagery; it is never decorative layering. Typography is a single variable-weight sans at extreme weights, achieving contrast through compression: 900 for names and CTAs, 400 for context.

This system explicitly rejects: transactional white-card grids with price-first layouts (Booking.com energy), Airbnb-clone aesthetics with rental-listing sameness, any "dark mode because cool" justification, and the neon-on-black nightlife aesthetic. Tripo is premium travel, not a nightclub app.

**Key Characteristics:**
- Navy foundation with three elevation steps (950/900/800) — no shadows at rest
- Single sans (Inter), heavy weight contrast (900/700/400), no decorative serifs
- Mint is the one action color — reserved for CTAs, active states, and confirmation
- Gold appears only in reputation contexts: ratings, Karam tier, earned rewards
- Glass surfaces are conditional: only when overlaying photography or deep backgrounds
- RTL (Arabic) and LTR (English) are equal first-class design states

## 2. Colors: The Desert Nightfall Palette

Three blues, one spring, one gold, one signal, two inks — every role distinct, nothing decorative.

### Primary
- **Oasis Spring** (`#7CF7C8`): The single action color. Used on primary CTA buttons, active navigation states, filter pills when selected, confirmation micro-interactions, and the brand's mint dot. Its rarity earns its power.
- **Oasis Deep** (`#1EC99A`): Hover and pressed state for Oasis Spring. Also used for text-links on dark surfaces where the lighter mint would feel too fluorescent.

### Secondary
- **Karam Gold** (`#F7C948`): Reserved exclusively for earned-value contexts: star ratings, Karam points, tier badges, reward confirmations. Never used as a general accent or decorative element.

### Tertiary
- **Waypoint Red** (`#FF6B7A`): Alerts, errors, and scarcity signals. One instance per screen at most.

### Neutral
- **Midnight Interior** (`#050B1E`): The deepest background layer. Page root, modal backdrops.
- **Deep Chamber** (`#081229`): Primary surface layer. Navigation shells, card backgrounds without imagery, bottom sheets.
- **Lifted Surface** (`#101B36`): Secondary elevated layer. Image placeholders, input backgrounds, the "above" state of a deep chamber card.
- **Desert Moon** (`#B8C2D6`): Secondary body text, metadata, subtitles on dark backgrounds.
- **Dusk Sand** (`#7F8AA3`): Muted and inactive states. Placeholder text, disabled labels, chevrons on unselected nav items.

### Named Rules
**The One Mint Rule.** Oasis Spring appears as a CTA, active state, or brand mark only. It is never used as a decorative background, section divider, or general accent. If a second element wants to be green, it uses Oasis Deep. Every screen has one action, one mint.

**The Gold Gating Rule.** Karam Gold is the color of reputation, not decoration. If an element doesn't represent a rating, tier, or earned achievement, it cannot use gold. This is enforced without exception.

**The Glass Gate Rule.** `backdrop-filter: blur` is permitted only when a card surface sits directly over a photograph or the Midnight Interior background. Cards on white or Lifted Surface never blur. One glass layer per scroll depth maximum.

## 3. Typography

**Body Font:** Inter (ui-sans-serif, system-ui, -apple-system fallback)

A single typeface at extreme weight contrast does more work than a serif-sans pairing at similar weights. Inter's geometric construction reads cleanly in both Arabic-adjacent Latin and as a neutral for English. The heavy end (900) feels carved; the light end (400) recedes. Nothing in between unless a specific role demands it.

### Hierarchy
- **Display** (900, clamp 28–40px, line-height 1.05, tracking -0.02em): Place names in hero cards, greeting headlines. Maximum one per screen section.
- **Headline** (800, 20px, line-height 1.2, tracking -0.015em): Section headers ("Popular Spots", "Upcoming Events"), card titles in featured slots.
- **Title** (700, 15px, line-height 1.35): Card names in horizontal scroll lists, dialog headings.
- **Body** (400, 14px, line-height 1.55): Descriptions, metadata, community text. Arabic body uses the same scale; the typeface renders correctly in both directions. Max line length 65–75ch on desktop.
- **Label** (700, 10px, line-height 1.2, tracking 0.06em, often uppercase): Navigation labels, badge text, price chips, filter pill text.

### Named Rules
**The Weight Wall Rule.** The minimum weight contrast between a headline and its supporting text is 200 (e.g., 700 + 400, or 900 + 700). Never two consecutive elements at the same weight. The eye must know immediately what to read first.

**The Scale Floor Rule.** Nothing below 9px renders in production. Labels hitting 9px only appear inside badges and pills where they sit on a colored background that provides contrast compensation. Running body text never drops below 14px.

## 4. Elevation

Tripo uses **tonal layering** as its primary depth signal, not shadows. Three navy steps (950 → 900 → 800) form the spatial vocabulary. A card on `#081229` (Deep Chamber) that uses `#101B36` (Lifted Surface) as its image placeholder background reads as above and behind without needing a drop shadow.

Two shadows exist in the system for specific purposes only:

### Shadow Vocabulary
- **Glass Depth** (`0 10px 30px -10px rgba(0,0,0,0.55)`): Applied to glass-card components that float over photography. Soft, black-shifted, long-range. Not used on non-glass surfaces.
- **Mint Glow** (`0 8px 24px -6px rgba(124,247,200,0.45)`): Applied to the primary CTA button and the center FAB exclusively. Communicates "this is the action" through luminous diffusion.

### Named Rules
**The Flat-At-Rest Rule.** Cards, list items, and containers have no shadow at rest. Tonal background contrast is the depth signal. A shadow appears only on the active CTA (mint glow) or a glass card floating over photography. Hover states may lift a card with a mild shadow, but the default state is flat.

## 5. Components

### Buttons
Rounded to a full pill (9999px). No variation in radius across button sizes.
- **Primary (Mint):** Oasis Spring background, Midnight Interior text, 900 weight label, 10px 20px padding. Mint Glow shadow. Hover: Oasis Deep background, subtle `scale(1.02)` transform. Active: `scale(0.97)`.
- **Ghost:** `rgba(255,255,255,0.08)` background, 1px `rgba(255,255,255,0.14)` border, Desert Moon text. Hover: background to `rgba(255,255,255,0.12)`. Used for secondary actions in dark contexts.
- **FAB (Center Nav):** 56px circle, Oasis Spring → Oasis Deep gradient, Midnight Interior icon, Mint Glow shadow with `animate-pulse-soft` breathing. 4px border in Deep Chamber to visually lift it off the nav bar.

### Filter Pills / Category Chips
- **Active:** Oasis Spring background, Midnight Interior text, 700 weight, full pill radius.
- **Inactive:** `rgba(255,255,255,0.08)` background, `rgba(255,255,255,0.10)` border, Desert Moon text.
- Transition between states: 150ms color crossfade, no scale change.

### Cards
Three card types — content card, glass card, and list row — used for distinct contexts.

**Content Card** (places, tours, rentals in horizontal scroll): Rounded-card (1.25rem), Deep Chamber background, `rgba(255,255,255,0.08)` border, 12px internal padding. Image area fills the top two-thirds; text content in the lower third. Rating pill absolute top-right over the image.

**Glass Card** (floating over imagery, hero overlays, map preview): `rgba(255,255,255,0.08)` background, `backdrop-filter: blur(24px)`, 1px `rgba(255,255,255,0.14)` border, Glass Depth shadow. Used only when the card sits over a photograph or the Midnight Interior background directly.

**List Row** (tours section, event rows): Full-width, Deep Chamber background, image thumbnail left-aligned (w-28), text content right. No card-style border; a subtle `rgba(255,255,255,0.08)` border when necessary. Rounded-card radius.

**The No Nesting Rule.** Glass cards never contain content cards. Content cards never contain cards. One depth signal per container.

### Inputs / Search
Pill-shaped (9999px), `rgba(255,255,255,0.08)` background with `rgba(255,255,255,0.10)` border. Placeholder text in Dusk Sand. Right-aligned action icon in Oasis Spring circle (32px). Focus state: border shifts to `rgba(124,247,200,0.50)`, no glow. The search bar is always full-width and used exclusively as a focus-tap target that opens the global search overlay.

### Navigation (Bottom Bar)
Fixed bottom, Deep Chamber at 90% opacity with `backdrop-blur-xl`. Two items left of FAB, two right. Each item: 22px icon, 10px label in 700 weight below. Active: Oasis Spring icon + text, Oasis Spring/10% background tint on the pill. Inactive: Dusk Sand. The center FAB breaks the bar plane by 8px upward with a border ring matching the nav background.

### Rating Badge (Signature Component)
Absolute-positioned over card imagery, top-right. `rgba(0,0,0,0.50)` background, `backdrop-blur-sm`. Karam Gold filled star (3.5px), white weight-700 number. This is the only context where gold appears as a foreground element on a card surface.

## 6. Do's and Don'ts

### Do:
- **Do** lead every card with the destination's photograph or imagery. Text and price follow.
- **Do** use Oasis Spring as the single CTA color across any given screen. One action, one mint.
- **Do** use the three navy depths (950/900/800) to create spatial hierarchy without adding shadows.
- **Do** show place names in Arabic and English. Never render a card with only one language if the other is available.
- **Do** use Karam Gold only for ratings, tier badges, and earned-value indicators.
- **Do** keep Inter at 900 or 700 for all heading and interactive label text. The weight contrast is the typographic voice.
- **Do** apply glass cards exclusively over photography or the deepest navy backgrounds. The blur earns its presence.
- **Do** validate that touch targets are ≥44px on all interactive elements, including rating pills and close buttons.

### Don't:
- **Don't** use price as the primary information hierarchy on any card. The place comes before the number.
- **Don't** use `background-clip: text` with a gradient. All text is a single color.
- **Don't** apply `backdrop-filter: blur` to a card sitting on a white or light-mode surface.
- **Don't** use glass cards as a general decorative treatment; they appear only when genuinely warranted by the context.
- **Don't** place Waypoint Red on more than one element per screen; diluting it strips the urgency signal.
- **Don't** use identical same-sized card grids with the same icon-heading-text structure repeated in a 2-col grid without visual differentiation.
- **Don't** design components in LTR and mirror them for RTL by adding `dir="rtl"`. Both directions are designed simultaneously.
- **Don't** let any feature push a Booking.com or Airbnb-clone information density: no table-formatted pricing, no star-grid comparison rows, no white-card transactional lists.
- **Don't** use Karam Gold decoratively outside rating and earned-value contexts.
- **Don't** apply the `pulse-soft` animation to anything other than the center FAB. One breathing element per screen is evocative; two is noise.

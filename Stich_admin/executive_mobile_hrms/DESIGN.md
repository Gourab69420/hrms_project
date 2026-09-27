---
name: Executive Mobile HRMS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#222a3e'
  on-tertiary: '#ffffff'
  tertiary-container: '#384055'
  on-tertiary-container: '#a4acc5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  title-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is engineered specifically for mobile workforce orchestration within modern small-to-medium businesses. The brand identity balances institutional authority with executive clarity: quiet confidence, zero-friction task completion, and unmistakable data legibility. Rather than relying on playful decorative motifs, the interface adopts a precision-led corporate minimalism tailored to native iOS and Android environments (React Native). 

The emotional response should evoke operational composure and absolute reliability: managers approving high-impact workflows feel decisive, and employees checking leave balances or payslips experience unambiguous trust. Visual noise is systematically eliminated in favor of structured data density, hairline boundaries, deliberate semantic status coding, and disciplined typographic rhythm.

## Colors

The palette relies on high-contrast operational neutrals with disciplined chromatic accents:

- **Primary Canvas & Surfaces**: Base screen background renders at `#F8FAFC` (Slate 50), while interactive cards, sheets, and modular containers sit on pure `#FFFFFF`.
- **Primary & Interactive Accents**: Deep Navy (`#1E3A8A`) commands primary headers, executive actions, and active navigation states. Bright Royal Blue (`#2563EB`) provides focus rings, interactive link states, and energetic interactive triggers.
- **Structural Lines & Outlines**: Clean hairline borders use `#E2E8F0` (Slate 200) to partition complex records without heavy optical weight.
- **Text Hierarchy**: Primary copy uses deep charcoal `#0F172A` (Slate 900) for maximum contrast against white cards. Secondary labels, timestamps, and supporting context use muted slate `#64748B` (Slate 500). Disabled or placeholder copy drops to `#94A3B8` (Slate 400).
- **Semantic Badges & Indicators**:
  - *Active / Approved / Present*: Emerald `#10B981` text paired with a soft `#ECFDF5` fill and `#A7F3D0` border tint.
  - *Pending / In Review / On Leave*: Amber `#D97706` (or `#F59E0B`) text anchored with `#FFFBEB` fill and `#FDE68A` border tint.
  - *Rejected / Absent / Urgent Danger*: Crimson `#EF4444` paired with `#FEF2F2` fill and `#FECACA` border tint.

## Typography

Typographic scale is strictly optimized for React Native mobile screens using `Inter` (or native iOS San Francisco / Android Roboto fallback). 

- **Display & Section Titles**: Use tight negative letter spacing (`-0.01em` to `-0.02em`) to ground executive overviews and dashboard greetings.
- **Data & Tables**: Numerical values (such as hours logged, compensation figures, and leave counts) utilize tabular figures (`fontVariant: ['tabular-nums']` in React Native) to ensure vertical column alignment across records.
- **Labels & Micro-copy**: Form headers and pill labels utilize semi-bold `label-md` and `label-sm` with slight positive tracking to improve legibility on low-resolution or small device screens.

## Layout & Spacing

The layout is built for native mobile single-column viewports with predictable touch margins and comfortable visual separation:

- **Horizontal Canvas Margins**: 16px (`1rem`) margin from screen edges on phones; scales up to 24px (`1.5rem`) on small tablets.
- **Vertical Hierarchy**: Screen sections use 16px to 24px gaps, while intra-card element groups maintain tight 8px to 12px rhythms.
- **Touch Targets**: All interactive rows, buttons, tabs, and form toggles maintain an absolute minimum touch boundary of 44×44pt to conform to iOS HIG and Android Material accessibility standards.
- **Safe Area Insets**: Top app bars account dynamically for status bars and notches (`SafeAreaView`), while bottom floating sheets and tab bars absorb device navigation bars via bottom safe-area padding.

## Elevation & Depth

Visual hierarchy uses crisp hairline borders combined with subtle ambient micro-shadows, avoiding heavy multi-tiered drops:

- **Base Cards & List Containers**: Surface `#FFFFFF` with a 1px solid border (`#E2E8F0`) and subtle diffuse shadow (`shadowColor: "#0F172A"`, `shadowOffset: { width: 0, height: 1 }`, `shadowOpacity: 0.04`, `shadowRadius: 2`, `elevation: 1`).
- **Floating Action Buttons & Bottom Sheets**: Elevated elements utilize a slightly deeper lift (`shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.08`, `shadowRadius: 12`, `elevation: 4`) with an overlaid top hairline border to reinforce separation from underlying content.
- **Modal Confirmation Dialogs**: Backdrop is dimmed with `#0F172A` at 40% opacity (`rgba(15, 23, 42, 0.4)`), applying high-contrast focus to the confirmation card.

## Shapes

The interface adopts a disciplined roundedness scale that feels clean, corporate, and structural:

- **Standard Elements (8px - 10px)**: Default cards, input fields, dropdown trigger boxes, and standard buttons utilize an 8px (`0.5rem`) or 10px radius.
- **Large Containers & Modal Sheets (12px - 16px)**: Section cards and sliding bottom sheets employ 12px to 16px corners to soften edges without sliding into juvenile styling.
- **Pills & Status Badges (9999px)**: Verification badges, category chips, and live status dots use full pill radii to visually distinguish metadata from operational cards.

## Components

### App Bar & Navigation
- **Top App Bar**: 56px height, background `#FFFFFF`, bottom border 1px `#E2E8F0`. Title is centered or leading (`title-md`), accompanied by clean monochrome back arrows, date pickers, or profile avatars.
- **Bottom Navigation Bar**: 56px fixed height + safe area. White background with top hairline border. Tab items feature 24px clean vector icons, 11px label (`label-sm`), inactive color `#64748B`, active color `#1E3A8A`.

### Buttons
- **Primary**: Background `#1E3A8A`, text `#FFFFFF` (`title-sm`), height 48px, radius 8px. Pressed state dims opacity to `0.9` or transitions to `#1E40AF`.
- **Secondary / Outline**: 1px border `#E2E8F0`, background `#FFFFFF`, text `#0F172A`. Pressed state fills with `#F8FAFC`.
- **Destructive**: Soft red background `#FEF2F2`, border 1px `#FECACA`, text `#EF4444`. Critical delete triggers switch to solid `#EF4444` with `#FFFFFF` text.

### Cards & Structured Rows
- **Section Cards**: Background `#FFFFFF`, border 1px `#E2E8F0`, radius 10px, padding 16px.
- **List Rows**: Minimal 52px height, split into left icon/avatar slot, title/sub-label stack, and right-aligned metric or status chip with an optional trailing chevron (`#94A3B8`). Items separated by 1px inset divider (`#F1F5F9`).

### Input Fields & Client Validation
- **Text Inputs**: Height 48px, background `#FFFFFF`, border 1px `#CBD5E1`, radius 8px, horizontal padding 14px. Focus state triggers border `#2563EB` and subtle outline glow.
- **Validation Messages**: In-line error text renders in `#EF4444` (`label-sm`) with a leading 14px warning icon. Input border shifts to `#EF4444`. Helper text rests in `#64748B`.

### Status Badges & Chips
- **Status Pills**: 24px height, horizontal padding 8px, full pill radius. Contains 6px solid dot and label (`label-sm` font weight 600).
  - *Active*: Green dot (`#10B981`), fill `#ECFDF5`, text `#065F46`.
  - *Pending*: Amber dot (`#F59E0B`), fill `#FFFBEB`, text `#92400E`.
  - *Rejected*: Crimson dot (`#EF4444`), fill `#FEF2F2`, text `#991B1B`.

### Modal Confirmation Sheets
- **Bottom Sheet Drawer**: Background `#FFFFFF`, top corners rounded 16px, padding 20px (accounting for safe bottom inset). Contains top drag handle (36×4px `#CBD5E1`), clear confirmation title (`headline-sm`), contextual summary, and a dual-button vertical or horizontal action stack.
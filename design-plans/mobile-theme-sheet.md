# Plan: the phone Theme sheet

Date: 2026-10-24 · Scope: `escala-tokens`, phone screen only (below `md`, 768px) · Status: **built**

Replaces the shuffle playground (`AboutInspectDemo`, plan `mobile-shuffle-playground.md`) on the
phone About screen. Desktop does not render any of it (`useIsPhone` gates the mount).

## What it is

A live preview painted by a system, and a **Theme sheet** docked at the bottom that changes it.

| Piece | File |
|---|---|
| Preview + sheet | `src/components/configurator/MobileThemeSheet.tsx` (`MobileGenerator`) |
| Pure logic (URL state, edits, contrast, CSS) | `src/lib/mobileTheme.ts` |
| Tests (Node) | `src/lib/__tests__/mobileTheme.test.ts` |
| Mount | `AboutHome` in `AboutMenu.tsx`, phone section |
| Reduced motion | `useReducedMotion` in `ThemeDock` |

## The preview: six views

An icon bar (sticky under the page header) over a sideways swipe track. Each view is one group of
the desktop bento board (`SystemCollage`), built from real `escala-ui` components painted by the
system: **Account** · **Actions** (buttons, sizes, segmented, toggle group, credits) · **Status**
(badges, presence, chips, alerts, progress) · **Forms** (OTP, switches, checkbox, radio, slider,
select) · **Cards** (profile, metric, unsaved changes) · **Navigation** (tabs, stepper, pagination).
File: `MobilePreviewViews.tsx`.

- The bar is a WAI-ARIA tablist (arrows / Home / End); the swipe drives the bar, never the reverse.
- `?view=<id>` holds the view (the first, `account`, is not written).
- The track is as tall as the view on screen. Track and panels are `relative`: Radix and the OTP
  field render hidden `absolute` inputs that otherwise escaped the scroller's clip and widened the
  page until a phone zoomed out to 25%.
- Views are `inert` pictures: no focus, no keyboard on a tap.

## The sheet

**Folded (164px):** handle · "Theme" + system name · Reset (when changed) · Customize ·
six quick brand colours (`QUICK_ACCENTS`) · Shuffle.

**Open (86% of the screen):** the same header ("Done" instead of "Customize"), then four tabs.

| Tab | Controls (all picks, no free values) | Writes |
|---|---|---|
| Color | All curated brand colours (`BRAND_SPECTRUM`) · the accent ramp 1–12 (step 9 ringed) · roles solved for contrast: Accent, Neutral, Success, Critical, Warning, **Info** | `preset.accent` |
| Type | Font: Inter · Geist · IBM Plex Sans · DM Sans · Base size 14 / 16 / 18 px (`TYPE_SCALE_MODES` compact / default / spacious) | `typography.fontFamily` + `headingFontFamily`, `sizes` + `lineHeights` |
| Shape | Radius: Sharp · Soft · Rounded · Pill (`RADIUS_ROLE_PRESETS`) · Spacing: Compact · Quiet · Airy · Bold (`SPACING_MODES`) | `radius` + `radiusRoles`, `sizes` + `stroke.sm` + `spacingRoles.inset-surface` + `padding` |
| Export | CSS (preview + Copy CSS variables) · Figma · Agent (both explain the laptop step) · Continue on my laptop (`?remix=`) | nothing |

What a tab shows as picked is read back from the tokens (`sheetChoices`), so a shuffle that lands
on a preset lights it up. The contrast badge is `evaluate()` from `color/apca.ts` (WCAG floor and
APCA must both pass); the number is the WCAG ratio, APCA is in the tooltip.

Decision (owner, 2026-10-24): **no hex field** on the phone (rule 9, "middle way"); Info **stays**
in the contrast list; no Storybook (the repo has none and tests run in Node).

## Haptics and performance

- **Haptics** (`src/lib/haptics.ts`): every press the visitor makes ticks — colour, option, tab,
  view (tap or a swipe crossing into the next view), open / fold, Shuffle, Reset, copy (success /
  warning). Android: `navigator.vibrate` with short patterns (≤ 120ms). iOS 17.4+: the system haptic
  of a hidden native `switch` toggled inside the gesture. Neither: silent. Re-picking what is
  already picked is a no-op (no repaint, no tick). The dock folding itself on scroll is silent.
- **Off switch**: the vibrate button in the open sheet's header (only where the phone can buzz),
  remembered per device in localStorage (`escala-haptics`).
- **The desktop editor no longer mounts on a phone** (`App.tsx`). It was mounted hidden behind the
  phone screen (`display: none` is not an unmount) and its About tab built a second generator.
  Latched: once a desktop has been seen it stays mounted if the window narrows.
- **Views render lazily**: the one on screen, its neighbours, and any already seen.
- `touch-manipulation` (no double-tap zoom delay) and no tap flash on the bar and the sheet; every
  button has a pressed state.

## Opening and closing

- `ThemeDock`: a framer-motion drag between two stops (164px folded, 86% open), portaled to
  `<body>`. **Not Vaul**: Vaul is a Radix Dialog underneath and always modal, so docked it set
  `pointer-events: none` on `<body>` and trapped focus — the rest of About could not be scrolled
  or tapped on a phone. A docked sheet is a region over the page, not a dialog.
- Drag from the handle and header; a flick (>400px/s) picks its direction, otherwise the nearer stop.
- Drag the sheet between the two stops, or tap: the handle (a button), Customize / Done.
- Open: a scrim covers the page; tapping it folds the sheet. `Esc` folds it too.
- The sheet docks only while the preview is on screen (IntersectionObserver). Scrolled on to the
  rest of About it slides away and folds.
- `prefers-reduced-motion`: no slide or fade; the sheet jumps between stops.

## States

| State | URL | Shown |
|---|---|---|
| Hidden | – | preview off screen |
| Folded | no `sheet` param | header + colour row |
| Open on a tab | `?sheet=color` · `type` · `shape` · `export` | header + colour row + tabs |

`?sheet=` is replaced, never pushed (Back does not replay tab taps), and keeps every other param
(`project`, `section`). A link with `?sheet=type` opens the sheet on Type and scrolls to the preview.
An unknown value opens nothing.

## Colours

Only existing tokens: chrome uses `bg-app`, `bg-surface`, `bg-elevated`, `text-fg*`, `border-line*`,
`accent-ui`, `status-success` / `status-danger`. The preview is painted by the system's own recipe
sheet (`RecipeScope`). No new hex in code: the only hex values are the curated brand list that
already exists.

## Done checklist

Blocking (accessibility):

- [x] Every control in the sheet is at least 44×44px (handle 80×44, swatches 44, tabs and choices `min-h-11`).
- [x] Swatches are `role="radio"` in a named `radiogroup`, each labelled with its colour name.
- [x] Tabs are `role="tablist"` / `tab` / `tabpanel`, with `aria-selected`, `aria-controls`, roving `tabIndex`.
- [x] Keyboard: arrows / Home / End move between tabs and inside each radio group; `Esc` folds.
- [x] The sheet has a title and a description for screen readers (`aria-labelledby`, `aria-describedby`).
- [x] A folded sheet holds no hidden focusable content (tabs mount only while open).
- [x] Opening never steals focus on page load (`onOpenAutoFocus` prevented).
- [x] Reduced motion: no slide.
- [ ] Checked with VoiceOver on a real iPhone.

Product:

- [x] Desktop renders no sheet and no generator.
- [x] Docked, the sheet never locks the page: every About section scrolls and takes taps behind it.
- [x] Scrolled past the preview, the sheet slides away (and is `inert`); no padding gap under the preview.
- [x] Each pick reaches the preview (button font and radius verified in the browser).
- [x] Tab and open state round-trip through `?sheet=`.
- [x] Export copies real variable names (rule 7), Light on `:root`, Dark on `.dark`.
- [x] `?remix=` still opens on the phone and the hand-off link still works.
- [x] `npm test`, app and test typechecks pass.
- [ ] Checked on a real phone (Safari share sheet, drag between stops).

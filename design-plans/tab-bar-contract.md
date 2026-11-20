# Contract · TabBar and TabBarItem (Figma to code)

Date: 2026-11-19 · Source: Figma `Escala Design System (Real)`, page "❖ TabBar" (2354:42): `TabBarItem` (2354:84, 5 variants) and `TabBar` (2354:124, loose
component). Read with `use_figma` (read-only) on 2026-11-19; every role below is the one the file binds. Context: "IssueBoardPage · Proposal v2 · view navigation" (2343:4187).
Built in the library before Storybook (process deviation approved by the owner; finding `STG-001` open until the story is approved).

## What it is
Bottom navigation of a mobile app: 3 to 5 top-level destinations, always visible. **It is not a tablist**: each item is a link that changes page, with the semantics of
NavItem (`State=Current` ↔ `aria-current="page"`). Views within a page remain TabMenu.

## 0 · Anatomy (Figma layer → code slot)
| Figma | Code | Note |
|---|---|---|
| root (VERTICAL, center) | `root` | the link (`<a>`; `asChild` for the router's) |
| `indicator` (pill, HORIZONTAL, hug) | `indicator` | carries the state's fill and the focus ring |
| `icon` (Phosphor instance, swap) | `icon` | |
| `Media` (SLOT) | `media` | e.g. `<Avatar size="xs" />` (24), in the icon's box |
| `badge` (exposed Badge, absolute) | `badge` | Badge `Type=number · Variant=critical · Appearance=solid · Size=xs · Shape=pill` |
| `focus-ring` (absolute rectangle) | `indicator`'s `gapRing` | 2 px, 1 px outside the indicator (50×34 over 48×32), radius `Radius/full` |
| `label` (TEXT) | `label` | |

## 1 · Properties → props
| Figma | React |
|---|---|
| `State` Default · Hover · Focused · Current · Disabled (def Default; **a single axis, no Size**) | `current` · `disabled` · `:hover` · `:focus-visible`; `forceState` fixes one in docs |
| `Label` TEXT "Home" | `children` |
| `LabelVisible` BOOLEAN true | `hideLabel` (inverse); hidden, requires `aria-label` |
| `Icon` INSTANCE_SWAP (House) · `IconVisible` true | `icon` (Phosphor ReactNode), painted if there is no `media` |
| `Media` SLOT · `MediaVisible` false | `media` (ReactNode) |
| `BadgeVisible` false | `badge` (number · string; not painted if `undefined`) |
| — | `href` / `asChild` |

TabBar: no axes; `Content` (SLOT) → `children` (3 to 5 TabBarItems, each FILL, exactly one Current); `aria-label` of the landmark.

## 2 · Geometry and roles (read from the file)
TabBarItem root: VERTICAL, center/center, gap `Spacing/gap-tight` (4), padding Y `Spacing/gap-tight`, X `Spacing/none`, min height `Size/target-min`, text `Type/caption`.
Width 80 FIXED in the set; FILL inside the TabBar.
`indicator`: HORIZONTAL center, padding X `Spacing/inset-control` (12), Y `Spacing/gap-tight`, gap `Spacing/none`, radius `Radius/full` (`radius.pill` in code); 48×32.
`icon`: `Size/icon-lg` (24) → `icon.large`. `Media`: the same box.
`badge`: absolute on the indicator, x 24 · y 0 (16×16), horizontal constraint MAX → right edge 8 from the indicator = top right of the icon. In code:
`top: 0` and `left: 50%` of the indicator (the icon's center line, which is x 24 in 48); no loose px.

| State | `indicator` fill | Icon and label ink | Focus |
|---|---|---|---|
| Default | none | `Content/secondary` | — |
| Hover | `Surface/muted` | `Content/primary` | — |
| Focused | none | `Content/secondary` | `focus-ring` `Border/ring/default`, `Stroke/focus`, OUTSIDE, 1 px outside |
| Current | `Surface/selected` | `Content/accent` | — |
| Disabled | none | `Content/disabled` | — |

No opacity in any state; no hex or px.

TabBar: HORIZONTAL, gap `Spacing/none`, padding `Spacing/gap-tight` on all four sides, fill `Surface/page`, stroke `Border/subtle` on top only, weight `Stroke/divider`, INSIDE
(the file includes it in the layout: 390×69 = 4 + 60 + 4 + 1). Width FIXED 390 in the example; in code it fills the width.

## 7 · Behavior (code)
- `<nav aria-label="…">` with a list (`<ul>`/`<li>`) of links. Natural Tab order; no roving tabindex or arrows (it is not a tablist).
- Current = `aria-current="page"`. Disabled = `aria-disabled="true"`, `tabIndex=-1`, no active `href`.
- Hidden label: the text stays in the accessible name (`aria-label` required).
- The Badge is decorative within the name: the number goes into the link's accessible name (e.g. "Inbox, 3"), which the caller gives with `aria-label` when needed.

## 8 · Motion (code, by role)
TabBarItem: `{ transitions: { indicator: FILL, icon: FILL, label: FILL } }` (`use-hover` for color and background, same as NavItem). Moving to Current uses the same transition.
No mount animation. TabBar: `motion: none`. The Figma prototype already copies it: Default→Hover `use-hover` (100 ms), click→Current `use-toggle` (360 ms).

## 9 · Usage
- **whenToUse:** top-level destinations of a mobile app, 3 to 5, always visible at the bottom.
- **whenNotToUse:** views or filters within a page → TabMenu; desktop navigation → Sidebar / NavItem.
- **related:** NavItem, TabMenu, Badge, Avatar.

## Odd (copied as is)
- The xs Badge's height is bound to a Dimension primitive (`16`), not to a role: an existing Badge finding that TabBarItem inherits.
- The TabBar's top stroke counts in the layout (69 high), so in CSS it is a normal `border-top`.

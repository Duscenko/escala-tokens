# Contract · Input (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, set `Input` (`4:12380`,
222 variants, page "❖ Input"), read with the Plugin API (read-only). **Figma rules.**

Set description: "Input — the box itself. Type Default: Size (sm · default · lg) × Value
(Placeholder · Filled) × State, with optional Icon leading (search) / Icon trailing (eye). Other
Types (Phone, Currency, Currency select, Password, URL, Upload, Tag, Shortcut, Credit card) at the
default size, every State plus one Filled. Focused is the active field, with a caret. Label and
hint are Field."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · **Invalid** · Disabled | VARIANT | `Default` | CSS (`:hover`, `:has(:focus-visible)`) + `forceState`; `aria-invalid`; `disabled` |
| `Type` default · phone · currency · currency-select · password · url · upload · tag · copy-link · credit-card · search | VARIANT | `default` | `type` (any other value = HTML type on the default layout) |
| `Value` placeholder · filled | VARIANT | `placeholder` | none: the field paints its `::placeholder` differently from a typed value |
| `Value` (TEXT, since 2026-11-19; bound to the `value` layer of the 57 `Value=filled` variants) | TEXT | "4242 4242 4242 4242" | `value` / `defaultValue`. The `Value=filled` axis only says there is a value; it is not a prop. No visual change. Note: the default value is the card number in ALL filled variants (also `Type=default`), exactly as in the file |
| `IconLeadingVisible` + `IconLeadingIcon` (MagnifyingGlass) | BOOLEAN + SWAP | true | `leading` (each Type brings its own; `null` hides it) |
| `Placeholder` | TEXT | "Jane Doe" | `placeholder` |
| `IconTrailingVisible` + `IconTrailingIcon` (Eye) | BOOLEAN + SWAP | true | `trailing` |
| `ShortcutVisible` + `Shortcut` (SLOT: Kbd ⌘ · K) | BOOLEAN + SLOT | true | `shortcut` (⌘ K by default in `search`; `null` hides it) |

## Anatomy (root = the box; the `<input>` is `text`)

Root: horizontal, centred, gap `Spacing/gap-control` (8), padding X `Spacing/inset-control`
(12), radius `Radius/action`, stroke `Stroke/control` INSIDE, height `Size/control-sm|md|lg`
(32 · 40 · 48), type `Type/placeholder`. Parts, in the file's order:

| Type | Parts | Measured (default, 260 wide) |
|---|---|---|
| default | [icon-leading] text [icon-trailing] | 12 · 40 · 228 |
| phone | addon `+01` · chevron · text | 12 · 41 · 65 |
| currency | addon `$` · text | 12 · 28 |
| currency-select | addon `USD` · chevron · divider · text | 13 · 47 · 71 · 80 |
| password | lock · text · eye | 12 · 40 · 228 |
| url | addon `https://` · divider · text | 13 · 63 · 72 |
| upload | folder · addon `Browse` · divider · text | 13 · 41 · 92 · 101 |
| tag | addon `@` · text | 12 · 32 |
| copy-link | text · divider · copy · addon `Copy` | 13 · 180 · 189 · 217 |
| credit-card | lock · text | 12 · 40 |
| search | search · text · Shortcut (Kbd ⌘ · Kbd K, gap `gap-tight`) | 12 · 40 · 204 / 228 |

- Icons `Size/icon-md` (20) in default and lg, `Size/icon-sm` (16) in sm. The caret of a select
  addon (`CaretDown`) is always `Size/icon-sm`.
- `divider`: rectangle 1 × inner height (38), `Border/subtle`, also in Disabled.
- **The Types with a divider (currency-select, url, upload, copy-link) have
  `strokesIncludedInLayout`**: their content starts at 13, not 12. It is copied
  (`spacing.inset-control+stroke.control`).
- Kbd (set `Kbd`, 1091:6): `Size=sm` in default/lg (minimum height and width `Size/icon-md`), `Size=xs`
  in sm (`Size/icon-sm`); padding X `Spacing/gap-tight`, radius `Radius/control`, fill
  `Surface/muted`, stroke `Border/subtle` `Stroke/divider` INSIDE, text `Type/caption`
  `Content/secondary`. Search Disabled hides the shortcut (measured).

## Colour by State

| State | Fill | Stroke | Halo (2px, overlaps the border) | Inks: value · addon / placeholder · icon |
|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` | — | `Content/primary` / `Content/subtle` · icon `Content/subtle` |
| Hover | `Surface/input` | `Border/control-hover` | — | same |
| Focused | `Surface/input` | `Border/focus` | `Border/ring/default` | same (+ caret) |
| Invalid | `Surface/input` | `Status/critical/border-strong` | `Status/critical/border` | same |
| Disabled | `Action/disabled/default` | **`Border/control`** | — | `Content/disabled` / `Content/disabled` (icon included) |

Disabled keeps the neutral stroke (`fieldBox()` used to repaint it: bug fixed, it also affects
Textarea/InputGroup/Select/InputTag).

## Behaviour (the file is static; code makes it real)
- phone / currency-select: the addon is a native `<select>` (options `addonOptions`).
- password: the eye is a button that shows / hides (eye ↔ eye-slash), with a name.
- upload: `Browse` (with the folder) opens the file picker; the field shows the name.
- copy-link: `Copy` (with the icon) copies the value to the clipboard.
- Each Type sets its `inputmode` and `autocomplete` (tel, decimal, url, cc-number…).

## What the file does that looks odd (copied as is)
- `State` says `Invalid` where other sets in the repo say `Error`.
- 4 Types (the divider ones) put the content 1px further in than the rest.

## Nests
`Kbd` (painted by Input's `kbd` part with the Kbd set's values; the Kbd component has not yet been
rebuilt from the file). New parts (`addon`, `divider`, `kbd`) are web + Storybook:
the plugin is frozen (`WEB_ONLY_SLOTS` in `componentRecipesPluginParity.test.ts`).

## Sizes by type and icons (2026-11-18, DEC-2026-11-18-004)
`Size` sm · default · lg exists for all 11 `Type`s. Height `size.compact` 32 · `size.control` 40 · `size.touch` 48; icon `icon.small` · `icon.medium` · `icon.medium`; text level text-md in sm and default, text-lg in lg. The caret of phone and currency-select stays at `icon.small`. Every icon inside the field uses `Content/subtle` (Disabled: `Content/disabled`) and does not darken on hover or focus; the typed value and the addons stay at `Content/primary`.

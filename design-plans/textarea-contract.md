# Contract · Textarea (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, set `Textarea` (`394:152`, 36 variants),
read with `figma-read-set.js` (read-only). This document is what the recipe, the component
and Storybook copy. **Figma rules; nothing is corrected.**

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` sm · default · lg | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · Invalid · Loading · Disabled | VARIANT | `Default` | CSS (`:hover`, `:focus-visible`) + `aria-invalid` · `loading` · `disabled`; `forceState` |
| `Value` placeholder · filled | VARIANT | `placeholder` | no prop: the empty value shows `::placeholder` |
| `Placeholder` | TEXT | `"Write a message…"` | `placeholder` |
| `Text` | TEXT | `"Tell us about the project: goals, timeline…"` | `value` / `defaultValue` |
| `ResizeGlyphVisible` | BOOLEAN | `false` | `resizeGlyph` (the glyph drags the box vertically) |

Label, help and error are provided by `Field` (it wraps the `<textarea>`: `id`, `aria-describedby`, `aria-invalid`, `disabled`).

## Geometry by size

Width 360 in the file (no variable); in code `w-full`, the story fixes 360. Stroke `Stroke/control` INSIDE
and **`strokesIncludedInLayout`**: the text starts at padding + stroke.

| Size | Height (no variable) | Padding Y · X | Text | Corner glyph | Text starts at |
|---|---|---|---|---|---|
| sm | 72 (`size.compact+size.control`) | 6 · `Spacing/gap-control` 8 | `Type/body-sm` | 14 | 9, 7 |
| default | 96 (`size.touch×2`) | `Spacing/gap-control` 8 · `Spacing/inset-control` 12 | `Type/body-md` | 16 | 13, 9 |
| lg | 128 (`size.2xl×2`) | `Spacing/inset-control` 12 · `Spacing/gap-group` 16 | `Type/body-lg` | 18 | 17, 13 |

Radius `Radius/action`. Invalid and Loading: right padding **36** (no variable) at all three sizes.
Corner glyph absolute at (width − padX − glyph, padY). Resize glyph: 8×8, 6 px from the bottom
right edge, rounded 1.5 stroke, `M 8 0 L 0 8 M 8 4 L 4 8`.

## Color by state

| State | Fill | Stroke | Halo (2px OUTSIDE) | Text · placeholder · grip | Corner |
|---|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` | — | `Content/primary` · `Content/subtle` · `Content/subtle` | — |
| Hover | `Surface/input` | `Border/control-hover` | — | same | — |
| Focused | `Surface/input` | `Border/focus` | `Border/ring/default` | same | — |
| Invalid | `Surface/input` | `Status/critical/border-strong` | `Status/critical/border` | same | icon/warning `Status/critical/content` |
| Loading | `Surface/input` | `Border/control` | — | same | Spinner `Content/secondary` |
| Disabled | `Action/disabled/default` | `Border/control` | — | `Content/disabled` (all three) | — |

## What the file does that looks odd (copied as is)
- The Loading Spinner is a 14 · 16 · 18 instance whose glyph stays fixed at 16 px at the top left
  (the inner `icon-spinner` frame is anchored MIN): at sm it overflows by 2 px, at lg it is off-center by 1 px.
- At lg, the corner glyph (18) sits 3 px from the text (fixed right padding 36).
- Heights, sm padding 6, right padding 36 and glyph sizes have no variable.

## Nests
Spinner (glyph), icon/warning (Phosphor regular).

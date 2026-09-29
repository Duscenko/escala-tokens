# Compact the Community banner to the Figma strip height

Written against: `f28328d` (working tree already has `CHROME_CONTROL_HOVER` on the same file; this plan does not revert that)

## Evidence chain

- Surface: `PluginCommunityBanner` — first child of the desktop shell in `Configurator.tsx` and of `AboutScaffold` in `AboutMenu.tsx`. User-selected node: `div.h-screen > a` (Community listing link).
- Problem: Rendered height is **45px** (`bounds_css_px` on the selected node). Figma `4258:56326` (`Link`) is **1440 × 32**. The extra 13px is `min-h-10` (2.5rem × 18px `:root` = 45px) stacked on `py-2`.
- Design evidence:
  - Figma portfolio `rNhQBrr6z7a0IpghuMGNV1` node `4258:56326`: frame height **32**; inner text 19px at y=6.5 (≈6.5px vertical inset each side).
  - `.impeccable.md` density: “Dense but not cluttered.”
  - `src/index.css` `:root { font: 18px/1.45 }` — Tailwind rem utilities inflate vs a 16px root; `min-h-10` is 45px here, not 40.
  - `text-body` is 12px (`--text-body`), matching the Figma 12px label.
- Owner: `src/components/configurator/PluginCommunityBanner.tsx`
- Scope and affected surfaces: both mounts of `PluginCommunityBanner` (desktop shell + `AboutScaffold` / `/about`). `TopNav` (`TOP_NAV_H = 52`) is out of scope.
- Uncertainty: none for the height target. Hover was already aligned to `CHROME_CONTROL_HOVER` in the working tree; leave it.

## Design decision

Drop the 45px floor and the 9px-per-side padding. Size the strip from the 12px/`text-body` line plus `py-1.5` (0.375rem × 18px ≈ 6.75px per side), which lands on Figma’s 32px frame instead of competing with the 52px `TopNav`.

## Reuse

- `text-body` (12px chrome type)
- `py-1.5` (existing spacing step; Figma inset ≈ 6.5px)
- `WORKSPACE_CHROME` / `CHROME_CONTROL_HOVER` (already on the component)
- Exemplar: Figma `4258:56326` height 32; chrome chips already use `h-8` (36px at this root) for controls — the banner is a hairline announcement, not a chip, so it must not adopt `h-8`/`min-h-10`

If a new primitive is required: none. `h-[32px]` would invent a px height the type scale already implies via `py-1.5` + `text-body`.

## Changes

1. `src/components/configurator/PluginCommunityBanner.tsx`
   - Change: on the `<a>`, remove `min-h-10` and `py-2`; add `py-1.5`. Keep `flex items-center`, `WORKSPACE_CHROME`, `CHROME_CONTROL_HOVER`, `text-body`, glyph, chevron, Community `href`.
   - Preserve: TopNav `bg-nav` / `TOP_NAV_H`; Community URL; i18n string; `border-b border-line`; hover overlay.
   - Verify: desktop banner `getBoundingClientRect().height` ≈ **32px** (plus `border-b` hairline). Not 45px. `AboutScaffold` copy matches.

## Scope

- Inherit: `Configurator.tsx` desktop shell; `AboutMenu.tsx` `AboutScaffold` (same component).
- Verify: light and dark chrome; `md:hidden` About copy still shows the same strip.
- Exclude: `TopNav` background/height; hover retune; Community URL; type size (`text-body` stays).

## Validation

- Product: announcement stays one line, whole bar is the link, does not read as a second 52px nav.
- Interface: desktop shell at ≥768px; About / `/about`; hover still `CHROME_CONTROL_HOVER`; long Spanish/French string still one line (`whitespace` unchanged).
- System: no new height token; no `h-[32px]` literal.
- Repository: open `/`, measure the desktop `a[href*="community"]` inside `div.h-screen` → height ~32px, `TopNav` still 52px.

## Stop conditions

- Stop if Figma `4258:56326` is no longer 32px tall, or if compacting clips the Figma glyph (`h-[15.75px]`) or wraps the label.

## Design documentation

- After acceptance and validation: none. Banner height is a chrome-strip measurement, not a new token.

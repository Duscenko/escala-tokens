# Alert (397:1932, «❖ Alert (✓)», 96 variants) — contract, read 2026-11-13

Nodes of the queue, identified by reading: Alert 397:1932 (96) · Toast 1117:114 (24, page «❖ Toast») · ProgressLine 410:687 (40) · ProgressCircle 411:523 (80; both on «❖ ProgressLine & ProgressCircle»).

## Props (panel order)
Description T `Description` · IconVisible true · Icon SWAP (Sparkle) · ActionsVisible false · CloseVisible true · Variant success·info·warning·default·critical·secondary (default `default`) · Appearance outline(default)·solid·soft·inverse · Layout horizontal(default)·vertical · Size sm·default(default).
Set text: message bar for app-wide notices; horizontal = full-width banner (no radius, bottom edge only); vertical = boxed message in content. Use Toast for auto-dismissing feedback, Field for validation.

## Geometry
- horizontal: row, align MIN/CENTER, gap gap-group 16, padding Y inset-control 12 · X inset-surface 20, radius none. Outline: stroke 1px BOTTOM only (INSIDE, laid out: 65 high = 64 + 1; sm 57); other appearances no stroke (64; sm 56).
- vertical: column, gap gap-group 16, padding inset-surface 20 all, radius container 16, outline stroke 1px all sides laid out (320×67 default, 63 sm = 2 + content). `content` has paddingRight Size/control-sm (32) so text clears the close; `close` is ABSOLUTE at top 12 / right 12 (x284 in 320) and is a CloseButton Size xs (24).
- content: row, gap gap-control 8; `icon` 20 (default) · 16 (sm) = Size/icon-md · icon-sm; `description` Type/body-lg (default) · Type/body-md (sm). Content hugs 25 / 21 high.
- actions (hidden by default): row gap 8, a Button secondary solid, size default → md 40 / sm → sm 32.
- close (horizontal): CloseButton shape pill, Size default (40) · sm (32); vertical: xs (24).
- Width: the horizontal sample 800, vertical 320 (specimen widths).

## Colour by Variant × Appearance (Layout / Size invariant, 4 variants each)
| Appearance | fill | stroke | icon | text | close |
|---|---|---|---|---|---|
| outline | Surface/layer-1 | severity border* | severity ink* | Content/primary | soft default (Action/secondary/default, ink Content/on-secondary) |
| solid | severity solid* | none | severity on-solid* | on-solid* | soft inverse (Surface/inverse-muted, Content/inverse) |
| soft | severity surface* | none | severity content* | severity content* (secondary: Content/primary) | ghost default (no fill, Content/secondary) |
| inverse | Surface/inverse | none | Content/inverse-secondary | Content/inverse | soft inverse |
*Severity table — default: stroke Border/accent · outline icon Content/accent · solid fill Action/primary/default, ink Content/on-action · soft fill Surface/accent, ink Content/accent. critical / success / info / warning: stroke Status/<s>/border · icon + soft text Status/<s>/content · solid fill Status/<s>/surface-solid, ink Status/<s>/on-solid · soft fill Status/<s>/surface. secondary: stroke Border/default · icon Content/secondary · solid fill Action/secondary/default, ink Content/on-secondary · soft fill Surface/layer-2, icon Content/secondary, text Content/primary.
Inverse is identical for every severity.
Odd: the Icon default is the SPARKLE for every severity (the file does not swap a severity glyph); the actions Button is the same secondary solid on every appearance (even on solid / inverse).

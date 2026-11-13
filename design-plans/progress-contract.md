# ProgressLine (410:687, 40) and ProgressCircle (411:523, 80) — contract, read 2026-11-13
Page «❖ ProgressLine & ProgressCircle (✓)». ProgressLine renames the older Progress (shadcn: label + value header, no variants); ProgressCircle is new.

## ProgressLine
Props: Size xs·sm·default·lg (default `default`) · Appearance solid(default)·gradient · Value 0(default)·25·50·75·100.
Root: row MIN/MIN, 240 wide, height 4 · 6 · 8 · 12 (unbound literals = spacing.1 · 1_5 · 2 · 3), Radius/full, fill Surface/muted. `fill` rect: same height, width = Value% of 240 (Value 0: hidden 1px), Radius/full, solid Action/primary/default; gradient LINEAR [Action/primary/default @0 → Action/primary/hover @1] across the fill's own width.

## ProgressCircle
Props: Size xs·sm·default·lg · Cap round(default)·butt · Appearance solid·gradient · Value 0·25·50·75·100.
Diameter 24 · 32 · 48 · 56 (variables 24/32/48/56 = size.xs · sm · lg · xl). `track` ELLIPSE arc 0→360° Surface/muted with innerRadius 0.667 (xs) · 0.75 (sm, default) · 0.714 (lg) → ring thickness 4 · 4 · 6 · 8. `fill` ELLIPSE arc from −90° (top) clockwise, sweep Value×360° (hidden at 0), solid Action/primary/default, gradient LINEAR default → hover (across the node). `cap-start` / `cap-end` ellipses (diameter = thickness: 4 · 4 · 6 · 8) are the round ends, hidden at 0 and 100, the end one is Action/primary/hover in gradient. Cap=butt: same colours (the caps are not drawn in code).
In code: ProgressLine is Radix's progressbar; ProgressCircle is an SVG ring (pathLength 100) with role=progressbar and aria-valuenow. Round caps are SVG `stroke-linecap: round` (a half-thickness dot past each end, as the file's cap ellipses), Value 100 draws a butt full ring.
Odd: the file has no label or percentage (the old Progress did); a label is the consumer's.

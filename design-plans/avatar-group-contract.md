# Contrato · AvatarGroup
Ver `design-plans/avatar-contract.md` (sección AvatarGroup): set `378:2507`, 14 variantes, leído en solo lectura el 2026-11-12.

## «AvatarGroup Prototype» (868:28472), read 2026-11-13 and fixed
Two examples (Light, Dark) of `RESTING · SIZES`: default circle and rounded stacks of 4 photo avatars + `+3` (Surface/inverse tile; white in Dark), then sm and xl in context. Items are 44 wide for a 40 avatar (2px `Surface/page` ring), step 36 (overlap −8). Measured in Storybook = file: widths 74 · 106 · 148 · 188 · 212 · 252 · 286, item ring cuts each avatar in both themes.
Code fix: photo-less image avatars paint an opaque gradient (`hue` / `fill`); items are `relative` so they stack in DOM order (the unpositioned item frames used to sit under the positioned avatars: the left avatar's translucent edge showed over the next ring and the +N tile).

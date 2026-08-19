# Perceptual distance (ΔE)

"How different do these two colors look?" — as one number.

## ΔE_OK (use this)

Plain Euclidean distance in OKLab:

```js
deltaEOK(a, b) = sqrt((a.L-b.L)² + (a.a-b.a)² + (a.b-b.b)²)
```

This is the metric CSS Color 4 gamut mapping is specified against, and the one
Radix uses to find the reference scale nearest to a seed color.

Calibration:

| ΔE_OK | Meaning |
|---|---|
| < 0.002 | Identical for practical purposes |
| **0.02** | **One JND** — the CSS Color 4 gamut-mapping tolerance |
| 0.05 | Clearly different, same family |
| 0.1 | Adjacent steps in a 12-step ramp, roughly |
| > 0.3 | Different colors entirely |

## ΔE2000 (know it exists)

CIEDE2000 in CIELAB, with corrections for lightness, chroma and hue weighting
plus a blue-region rotation term. More accurate for small differences and still
the standard in print and textiles, but complex and — critically — **not what
CSS or Radix use**. Reach for it only when matching an external system that
specifies it. Do not mix metrics inside one pipeline.

## Nearest-color search

Both Radix's generator and Tailwind-style transposition depend on this: given a
seed, find the closest color across a set of reference scales.

```js
const all = []
for (const [name, scale] of Object.entries(scales))
  for (const color of scale)
    all.push({ scale: name, color, distance: deltaEOK(seed, color) })

all.sort((a, b) => a.distance - b.distance)

// Keep only the first hit per scale — otherwise the top N are all the same
// scale's adjacent steps, which tells you nothing.
const closest = all.filter((c, i, arr) =>
  i === arr.findIndex(v => v.scale === c.scale))
```

### Two traps

**1. Near-identical scale families.** Radix ships six grays (gray, mauve,
slate, sage, olive, sand) that are all within ~0.01 ΔE_OK of each other. If the
closest hit is a gray, the second-closest will also be a gray, and comparing
their distances tells you nothing. Skip forward until you find a non-gray before
doing any two-candidate reasoning.

**2. Mixing the top two is not always right.** Radix's approach: treat the
distances as a 2D triangle between the source `C` and the two candidates `A`
and `B`. If neither angle at `A` nor at `B` exceeds 90°, the source sits
*between* them — mix proportionally to the projected distances, and the mix
lands closer than either candidate alone. If an angle exceeds 90°, the source
is *beyond* one of them and mixing would move away from it; use the nearest
candidate unmixed.

The desaturated-blue case is the motivating example: it sits genuinely between
`indigo` and `slate`, and mixing gives a better base than either. A saturated
red seed, by contrast, is beyond `red` in the direction away from `ruby` —
mixing would only dull it.

## What ΔE will not tell you

ΔE measures *difference*, not *legibility*. Two colors at ΔE_OK 0.4 can be
completely unreadable as text on background if the difference is mostly chroma
rather than lightness. Contrast is a separate question — see `wcag2.md` and
`apca.md`.

# Gamut mapping

## The problem

You compose a color in OKLCH and ask for a hex. If the color is outside sRGB,
almost every library clamps each RGB channel independently:

```js
r = min(1, max(0, r)); g = ...; b = ...
```

This is fast and wrong. The channel that saturated first stops moving while the
others keep going, which drags the color **off its hue** and **changes its
lightness**. Measured on a real ramp (`#ff0055`, `saturation` preset, step 10):

| | requested | clipped | gamut-mapped |
|---|---|---|---|
| hue | 15.5° | 25.5° (**+10.1°**) | 15.6° (+0.1°) |
| `L` | 0.550 | 0.611 (**+0.061**) | 0.562 (+0.012) |

An `L` error of 0.06 is comparable to a whole ramp step. That is what makes a
clipped ramp lose its monotonic feel around steps 8–10 — the steps stop being
evenly spaced because the out-of-gamut ones got pushed lighter.

## The CSS Color 4 algorithm

Hold `L` and `H` constant, binary-search `C` downward until the color is
representable. Accept the clipped result once it is within one JND (ΔE_OK 0.02)
of the reduced color — clipping a nearly-in-gamut color is harmless, and
stopping there gives a more saturated result than searching to zero error.

```
gamutMap(oklch):
  if L >= 1: return white
  if L <= 0: return black
  if inGamut(oklch): return oklch          # untouched

  JND = 0.02
  ε   = 0.0001
  min = 0
  max = oklch.C
  minInGamut = true
  current = oklch
  clipped = clip(current)

  if deltaEOK(clipped, current) < JND: return clipped

  while max - min > ε:
    C = (min + max) / 2
    current = { L: oklch.L, C, H: oklch.H }

    if minInGamut and inGamut(current):
      min = C
      continue

    clipped = clip(current)
    E = deltaEOK(clipped, current)

    if E < JND:
      if JND - E < ε: return clipped
      minInGamut = false
      min = C
    else:
      max = C

  return clipped
```

`clip()` clamps in **linear** light and converts back to OKLab for the ΔE
comparison. `inGamut()` allows ~1e-6 slack so a color exactly on the boundary
is not judged outside.

Reference: https://www.w3.org/TR/css-color-4/#css-gamut-mapping

## Properties you can assert in tests

- The result is always in sRGB.
- `C_out <= C_in`. Chroma only ever decreases.
- `H` is preserved exactly by the search; the final clip can move it by a
  fraction of a degree, bounded by the JND.
- `L` is preserved by the search; residual error after the clip and 8-bit hex
  quantisation is under 0.02.
- An in-gamut input is returned bit-identical.

Do **not** assert hue preservation to better than ~1°: 8-bit hex quantisation
alone moves a mid-lightness color by up to ~1° of hue.

## Where to put it in a ramp generator

**Inside the loop, not after it.**

If a step is solved to a contrast target by searching `L`, and you gamut-map
afterwards, the mapping can move `L` by up to a JND and drop you back below the
target. Map first, evaluate contrast on the mapped color, and let the search
converge on a value that is both in gamut and on target.

## Wide gamut

Gamut mapping is a *fallback*, not the goal. If the output medium supports it,
emit the unmapped color too:

```css
--brand-9: #e11d48;                        /* sRGB fallback */
@supports (color: color(display-p3 0 0 0)) {
  --brand-9: oklch(0.5872 0.2103 15.46);   /* full precision */
}
```

Two things to know:

- **Alpha blending differs between sRGB and P3.** An alpha value solved to
  composite exactly onto a background in sRGB will not composite to the same
  color in P3. Radix ships separate alpha scales for each — if you generate
  alpha tokens, you need both.
- P3 covers roughly 25% more volume than sRGB, mostly in greens and reds. It
  does not remove the need for mapping; it moves the boundary.

# Color spaces

## The lightness trap

Three different quantities are all called "lightness". They are not
interchangeable, and confusing them is the single most common cause of a token
system that "looks right in the editor and wrong on screen".

| Name | Space | Range | Notes |
|---|---|---|---|
| `L` (HSL) | HSL | 0–1 | Not perceptual at all. Pure yellow and pure blue both sit at `L 0.5`. Never use for ramps. |
| `L*` | CIELAB / CIELCH | 0–100 | Perceptually uniform-ish. **This is what Material 3 "tone" means**, and what IBM Carbon's scale is built on. |
| `L` (OKLab) | OKLab / OKLCH | 0–1 | Better hue uniformity than CIELAB, especially in blues. What CSS `oklch()` uses. |

**`L*` and OKLab `L` are different functions.** Approximate correspondence:

| `L*` | OKLab `L` |
|---|---|
| 0 | 0.000 |
| 10 | 0.150 |
| 20 | 0.271 |
| 30 | 0.378 |
| 40 | 0.477 |
| 50 | 0.569 |
| 60 | 0.657 |
| 70 | 0.741 |
| 80 | 0.822 |
| 90 | 0.900 |
| 95 | 0.951 |
| 100 | 1.000 |

The relationship is monotonic but not linear, so `L = tone / 100` is not a
scaling error you can correct with a multiplier — it displaces the middle of
the scale most and the ends least, which is precisely where a tonal palette's
contrast guarantees live.

To convert properly, go through XYZ:

```
L*  →  Y  →  linear sRGB  →  OKLab L
```

`Y = (L* > 8) ? ((L* + 16) / 116)³ : L* / 903.3`

## sRGB transfer function

```js
const toLinear = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
const toGamma  = v => v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
```

Note this is **not** a pure 2.2 or 2.4 power curve — it has a linear toe near
black. APCA deliberately uses a pure 2.4 curve instead (see `apca.md`); do not
substitute one for the other.

## OKLab ↔ linear sRGB (Ottosson)

```js
// linear sRGB → OKLab
l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b

l_ = cbrt(l); m_ = cbrt(m); s_ = cbrt(s)

L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_
a = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_
b = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_

// OKLab → linear sRGB
l_ = L + 0.3963377774*a + 0.2158037573*b
m_ = L - 0.1055613458*a - 0.0638541728*b
s_ = L - 0.0894841775*a - 1.2914855480*b

L3 = l_³; M3 = m_³; S3 = s_³

r =  4.0767416621*L3 - 3.3077115913*M3 + 0.2309699292*S3
g = -1.2684380046*L3 + 2.6097574011*M3 - 0.3413193965*S3
b = -0.0041960863*L3 - 0.7034186147*M3 + 1.7076147010*S3
```

Libraries round these matrices differently. chroma-js and a full-precision
implementation agree to roughly `1e-5` in `L` and `C`. Do not write tests that
assert agreement to float precision — you would be asserting the library's
rounding, not your correctness.

## OKLCH ↔ OKLab

```js
C = hypot(a, b)
H = C < 1e-7 ? 0 : (atan2(b, a) * 180 / PI + 360) % 360   // guard the pole
a = C * cos(H * PI / 180)
b = C * sin(H * PI / 180)
```

Practical chroma ceilings in sRGB, for calibration: about **0.32–0.37** for the
most saturated hues at mid lightness; a typical brand color sits at 0.15–0.25.
Anything above ~0.31 is out of gamut for most hues and will need mapping.

## HCT (Material 3)

HCT is not a standard space — it is Google's composite:

- **H** = CAM16 hue
- **C** = CAM16 chroma
- **T** = CIELAB `L*` (called "tone")

The reason it exists: CAM16 gives good hue and chroma behaviour under a defined
viewing environment, but its own lightness `J` does not produce the contrast
guarantees Material wanted. Substituting `L*` for `J` makes tone-difference a
proxy for contrast — the property the whole M3 scheme depends on.

Two consequences that matter when implementing:

1. **A tonal palette is not "hue + fixed chroma at every tone".** HCT takes the
   *maximum chroma available in gamut* at each (hue, tone), which is a jagged,
   hue-dependent envelope — high in the mid tones, collapsing to 0 at tone 0
   and 100. Approximating it with a smooth taper (a sine, a parabola) produces
   visibly different palettes and voids the contrast guarantees.
2. **You cannot implement HCT from the formulas above.** It requires the full
   CAM16 forward and inverse transforms plus a gamut-search loop. Port from
   `material-foundation/material-color-utilities` rather than reimplementing.

## Choosing a space

| Task | Space |
|---|---|
| Building a ramp, interpolating, shifting hue | **OKLCH** |
| Measuring "how different are these two colors" | **OKLab** (ΔE_OK) |
| Matching Material 3 output exactly | **HCT** |
| Matching Ant Design output exactly | **HSV** (that is what their algorithm uses) |
| Contrast | Neither — use the luminance formulas in `wcag2.md` / `apca.md` |

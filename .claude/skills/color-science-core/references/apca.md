# APCA — Advanced Perceptual Contrast Algorithm

APCA-W3, version **0.1.9**. The contrast method developed for WCAG 3 (draft).
Returns a signed `Lc` value, roughly −108…+106.

- **Positive `Lc`** — dark text on a light background (normal polarity)
- **Negative `Lc`** — light text on a dark background (reverse polarity)

Threshold against `|Lc|`; the sign tells you the polarity.

## Why it exists

WCAG 2.x contrast is a ratio of relative luminances. Two properties make it a
poor *generation* target even though it remains the legal *compliance* metric:

1. **It is symmetric.** `contrast(a, b) === contrast(b, a)`. Perception is not:
   dark-on-light and light-on-dark at the same luminance ratio do not read as
   equally legible.
2. **It systematically overrates light-on-dark** — which is what every dark
   theme is made of. Concretely: `#a0a0a0` on `#000000` scores 8.03:1 (WCAG AAA)
   and `Lc 50.9` (well below body-text grade).

APCA models spatial frequency: it accounts for the fact that thin light strokes
on a dark field bloom and lose apparent contrast.

## The algorithm (0.1.9 constants — frozen, do not tune)

```js
const MAIN_TRC = 2.4
const Rco = 0.2126729, Gco = 0.7151522, Bco = 0.0721750

const normBG = 0.56, normTXT = 0.57      // normal polarity exponents
const revTXT = 0.62, revBG  = 0.65       // reverse polarity exponents

const blkThrs = 0.022, blkClmp = 1.414   // soft clamp near black
const scaleBoW = 1.14, scaleWoB = 1.14
const loBoWoffset = 0.027, loWoBoffset = 0.027
const deltaYmin = 0.0005, loClip = 0.1
```

**Step 1 — screen luminance.** Note the pure 2.4 power curve with *no linear
toe*. This is APCA's own estimator, deliberately different from the sRGB
transfer function and from WCAG's relative luminance. Do not substitute either.

```js
Y = Rco*(r/255)**2.4 + Gco*(g/255)**2.4 + Bco*(b/255)**2.4
```

**Step 2 — soft clamp black.** Models the loss of perceived contrast in deep
shadow.

```js
Y = Y > blkThrs ? Y : Y + (blkThrs - Y)**blkClmp
```

**Step 3 — floor.** APCA does not report noise as contrast.

```js
if (abs(Ybg - Ytxt) < deltaYmin) return 0
```

**Step 4 — polarity branch.**

```js
if (Ybg > Ytxt) {                                    // dark text on light
  S = (Ybg**normBG - Ytxt**normTXT) * scaleBoW
  out = S < loClip ? 0 : S - loBoWoffset
} else {                                             // light text on dark
  S = (Ybg**revBG - Ytxt**revTXT) * scaleWoB
  out = S > -loClip ? 0 : S + loWoBoffset
}
Lc = out * 100
```

## Reference vectors

Verify any implementation against these before trusting it. Produced by
`apca-w3` 0.1.9.

| text | background | `Lc` |
|---|---|---|
| `#000000` | `#ffffff` | 106.04067321268862 |
| `#ffffff` | `#000000` | −107.88473318309848 |
| `#888888` | `#ffffff` | 63.056469930209424 |
| `#ffffff` | `#888888` | −68.54146436644962 |
| `#8888aa` | `#000000` | −40.027665265155655 |
| `#aaaaaa` | `#123456` | −50.27310100285638 |
| `#123456` | `#aaaaaa` | 50.64594345279896 |

Note rows 3 and 4: the same pair swapped gives 63.1 and −68.5. That asymmetry
is the whole point, and it is the first thing a broken port loses.

Stronger than fixed vectors: fuzz a few thousand deterministic random pairs
against the `apca-w3` npm package and assert divergence `< 1e-9`. Both compute
the same closed-form expression in float64, so anything larger means a constant
or a branch is wrong.

## Thresholds

APCA has no single "pass" number. Required `Lc` depends on font size and weight
— the full Bronze conformance table is a size × weight lookup. Distilled to the
levels a token system actually needs:

| Level | `Lc` | Meaning |
|---|---|---|
| 90 | Preferred for body text; equivalent to "very comfortable" |
| **75** | **Minimum for body text** — ~14–16px regular |
| **60** | **Minimum for large text** — ≥24px, or ≥18.66px bold |
| **45** | **Minimum for non-text UI** — borders, icons, focus rings |
| 30 | Absolute floor for any meaningful content; disabled-state territory |
| 15 | Invisibility threshold. Below this, nothing is legible |

Practical mapping to WCAG intent classes:

| Intent | WCAG 2.1 | APCA `Lc` |
|---|---|---|
| `body-text` | 4.5 | 75 |
| `large-text` | 3.0 | 60 |
| `ui-component` | 3.0 | 45 |
| `decorative` | — | — |

## Using it correctly

**Directionality.** `apcaLc(fg, bg)`. Always foreground first. Swapping the
arguments is not a sign flip — it is a different number.

**Do not average with WCAG.** They measure different things. Report both, and
treat a pair that passes one and fails the other as a finding to be decided,
not a rounding difference. In an audit, the "passes WCAG, fails APCA" bucket is
where dark-theme legibility problems hide.

**Compliance vs. quality.** WCAG 2.1 is what a legal accessibility audit will
check. APCA is what users experience. Ship WCAG as the floor; use APCA to
decide whether a token is actually good.

## Sources

- https://apcacontrast.com/
- https://github.com/Myndex/apca-w3 (reference implementation, 0.1.9)
- https://github.com/Myndex/SAPC-APCA (background and derivation)

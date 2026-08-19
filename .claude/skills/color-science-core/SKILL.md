---
name: color-science-core
description: >
  Color mathematics reference — contrast (WCAG 2.1 and APCA Lc), color space
  conversion (sRGB, CIELAB, OKLab/OKLCH, CAM16/HCT), CSS Color 4 gamut mapping,
  and perceptual distance (ΔE_OK, ΔE2000). Use when computing, validating or
  debugging any color value, contrast ratio, ramp step or accessibility
  threshold — including design token generation, palette algorithms, and
  contrast audits.
---

# Color science core

The math layer under every color-token decision. Load a reference file only
when you need it; this page is the routing table.

## Routing

| You are doing | Read |
|---|---|
| Converting between color spaces, or reasoning about lightness | `references/color-spaces.md` |
| A color came out the wrong hue after conversion; emitting out-of-gamut colors | `references/gamut-mapping.md` |
| Checking or targeting WCAG contrast; compliance reporting | `references/wcag2.md` |
| Perceptual contrast, dark-mode legibility, font-size-aware thresholds | `references/apca.md` |
| Finding the nearest color; measuring "how different are these two?" | `references/delta-e.md` |

## The five rules that prevent most color bugs

**1. OKLab `L` is not CIELAB `L*`, and neither is HSL lightness.**
`L* 40` ≈ OKLab `L 0.48`. Any code that writes `L = tone / 100` while the tone
scale is defined in `L*` (Material 3, IBM Carbon) is wrong, and wrong
non-linearly, so it will not show up as a constant offset. See
`references/color-spaces.md`.

**2. Never emit a color by clipping RGB channels.**
`chroma.oklch(l, c, h).hex()` and equivalents clamp each channel independently.
For out-of-gamut colors this changes hue *and* lightness — observed drift of
10° in hue and 0.06 in `L` on real ramps. Use CSS Color 4 gamut mapping: hold
`L` and `H`, binary-search `C` down, accept within ΔE_OK 0.02. See
`references/gamut-mapping.md`.

**3. WCAG 2.x is the compliance metric; APCA is the perception metric. Report both.**
They disagree, and the disagreement is informative. `#a0a0a0` on `#000000` is
8.03:1 (WCAG AAA) and `Lc 50.9` (not body-text grade). A pair that clears one
and fails the other is a finding, not noise.

**4. APCA is directional. WCAG is not.**
`apcaLc(text, bg) !== apcaLc(bg, text)` — the sign encodes polarity (positive =
dark text on light). Always pass the foreground first. `wcagRatio(a, b)` is
symmetric and carries no polarity information at all, which is exactly why it
overrates light-on-dark.

**5. Hue is meaningless below ~0.02 chroma.**
`atan2(b, a)` on a near-neutral color swings wildly for a 1e-5 change in `a` or
`b`, and libraries return `NaN` at exactly zero. Guard every hue read: treat
`NaN` as 0, and do not assert hue equality on low-chroma colors.

## Running the validator

`scripts/contrast.mjs` is dependency-free Node. It implements APCA-W3 0.1.9,
WCAG 2.1, OKLab conversion and CSS Color 4 gamut mapping in one file.

```bash
# Dual readout for one pair
node scripts/contrast.mjs '#6c737f' '#ffffff'

# With an intent class, for a pass/fail verdict
node scripts/contrast.mjs '#6c737f' '#ffffff' body-text

# Gamut-map an OKLCH triple to a safe sRGB hex
node scripts/contrast.mjs --gamut 0.55 0.34 350

# Audit a JSON file of {name: {fg, bg, intent}} pairs
node scripts/contrast.mjs --audit pairs.json
```

Intent classes and their thresholds:

| Intent | WCAG | APCA `Lc` | Use for |
|---|---|---|---|
| `body-text` | 4.5 | 75 | Paragraph copy, ~14–16px regular |
| `large-text` | 3.0 | 60 | ≥24px, or ≥18.66px bold |
| `ui-component` | 3.0 | 45 | Borders, icons, focus rings (WCAG 1.4.11) |
| `decorative` | — | — | Dividers, subtle fills — no requirement |
| `surface` | — | — | Backgrounds; judged by what sits on them |

Every semantic role in a token system must declare exactly one intent class.
A role without one cannot be audited, and an un-audited role is where
inaccessible text hides.

## When generating ramps, not just checking them

Solving a step *to* a contrast target beats offsetting its lightness by a
constant. A fixed `L` offset breaks the moment the page is tinted or dark; a
binary search on `L` against a target ratio self-corrects.

Two cautions when you do:

- **Quantise, then re-check.** The search runs in continuous `L` but the token
  ships as 8-bit hex. A result at 4.502 can round to 4.49. Nudge until the
  *emitted value* clears the target.
- **Gamut-map inside the loop**, not after it. Mapping afterwards can move `L`
  by up to one JND and silently drop you back below target.

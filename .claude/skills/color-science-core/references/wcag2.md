# WCAG 2.1 contrast

The compliance metric. Legally referenced by EN 301 549, Section 508, the
European Accessibility Act and most procurement requirements. It is not going
away, whatever WCAG 3 eventually says.

## Formula

**Relative luminance** (WCAG 2.x definition — note this uses the sRGB transfer
function with its linear toe, unlike APCA):

```js
const ch = v => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
Y = 0.2126*ch(r) + 0.7152*ch(g) + 0.0722*ch(b)
```

**Contrast ratio:**

```js
ratio = (Ylighter + 0.05) / (Ydarker + 0.05)
```

Range 1:1 to 21:1. Symmetric — argument order carries no meaning.

The `0.05` term models ambient screen flare. It is also why the metric
compresses badly at the dark end: for two near-black colors the `+0.05`
dominates, so the ratio barely moves however different they look.

## Thresholds

| Criterion | Level | Requirement |
|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 normal text · 3:1 large text |
| 1.4.6 Contrast (Enhanced) | AAA | 7:1 normal text · 4.5:1 large text |
| 1.4.11 Non-text Contrast | AA | 3:1 for UI components and graphical objects |

**Large text** is ≥18.66px (14pt) **bold**, or ≥24px (18pt) at any weight.

**1.4.11 is the one most token systems miss.** It covers the visual boundary of
interactive controls — input borders, checkbox outlines, focus indicators,
toggle tracks — and icons that convey information. A `border-primary` token at
1.5:1 against the page fails 1.4.11 even though nobody thinks of a border as
"text". Any border or icon role in a semantic layer needs the `ui-component`
intent class, not `decorative`.

## Exemptions

- Disabled controls and their labels
- Purely decorative imagery
- Logotypes and brand marks as such
- Text that is part of a photograph

Exempt does not mean "aim for nothing" — a disabled state still has to read as
*present*. Around `Lc 30` / 2:1 is the usual practical floor.

## Known limitations

Worth stating explicitly, because they explain most WCAG-vs-APCA disagreements:

1. **Symmetric.** Carries no polarity information, so it cannot express that
   light-on-dark reads differently from dark-on-light.
2. **Overrates light-on-dark.** The dominant failure mode for dark themes: a
   pair can clear 7:1 and still be hard to read.
3. **Compresses at the dark end.** Two near-black surfaces score ~1.1:1
   regardless of how distinguishable they actually are.
4. **Ignores font size and weight below the large-text cliff.** 14px regular
   and 23px regular have the same requirement.
5. **Ignores chroma.** A saturated blue and a gray at the same luminance score
   identically against white, though they do not read the same.

None of these are reasons to skip it. They are reasons to report APCA alongside
it.

## Targeting a ratio when generating

To solve a step to an exact ratio, binary-search `L` in OKLCH holding `C` and
`H`, in the direction away from the page:

```
lo, hi = towardDark ? (0, bgL) : (bgL, 1)
repeat ~24 times:
  mid = (lo + hi) / 2
  if ratio(oklch(mid, C, H), bg) >= target:
      best = that color
      towardDark ? lo = mid : hi = mid    # ease back toward the page
  else:
      towardDark ? hi = mid : lo = mid
```

**Then re-check the emitted value.** The search runs in continuous `L`, but the
token ships as 8-bit hex — a result at 4.502 can quantise to 4.49 and fail.
Nudge `L` in 0.01 steps until the *actual hex* clears the target.

**And gamut-map inside the loop**, not after (see `gamut-mapping.md`).

## Sources

- https://www.w3.org/TR/WCAG21/#contrast-minimum
- https://www.w3.org/TR/WCAG21/#non-text-contrast
- https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

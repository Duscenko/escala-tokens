# Foundations audit · Figma variables ↔ live Storybook · 2026-11-18

Method: every variable of the library, resolved per mode, against the computed value in Storybook (Light · Dark × Desktop · Tablet · Mobile).

| Area | Checked | Result |
|---|---|---|
| Color Primitives (ramps, alpha twins, black and white alpha) | 312 | Match |
| Color Semantics, both modes | 172 | 1 known deviation: `Content/link/default` Dark |
| Dimension Semantics, three modes | 114 | `Spacing/inset-surface` differs; `Spacing/inset-action` does not exist in code |
| Typography roles, three modes | 225 | Match where emitted; Display, heading-xl and heading-md match on the Font page |
| Motion roles | 65 | Match |
| Shadow styles | 6 steps | Match on the Shadow page |
| Social Media Brands | 45 | 9 `Border/focus` values differ |

## Waiting for the owner (not changed)
| Token | Figma | Storybook |
|---|---|---|
| `Spacing/inset-surface` | 24 · 20 · 16 | 20 · 20 · 20 |
| `Spacing/inset-action` | 16 · 16 · 12 | no role |
| `<Brand>/Border/focus` | brand at 31 % or `Border/ring/neutral` | solid black or white |

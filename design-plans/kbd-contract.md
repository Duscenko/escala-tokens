# Contract · Kbd (Figma to code)

Date: 2026-11-12 · Source: set `Kbd` (`1091:6`, 3 variants), read-only. **Figma rules.**
Description: "Keyboard key hint for shortcuts and navigation legends (⌘, K, Esc, ↑, ↓, ↵). Size follows the icon of the control it sits in: xs in menus and Input sm, sm in Input default and lg and in tooltips, default in standalone shortcut lists. Render as <kbd>, one Kbd per key."

## API
| Figma | Default | React |
|---|---|---|
| `Size` xs · sm · default | `default` | `size` |
| `Label` TEXT | `⌘` | `children` |

## Geometry and color (measured on the 3 variants)
| Size | Height = min. width | Padding X | Text | "⌘" sample |
|---|---|---|---|---|
| xs | 16 (`Size/icon-sm`) | 4 (`Spacing/gap-tight`) | `Type/caption` | 20×16 |
| sm | 20 (`Size/icon-md`) | 4 (`gap-tight`) | `Type/caption` | 20×20 |
| default | 24 (`Size/icon-lg`) | 8 (`Spacing/gap-control`) | `Type/label` | 28×24 |
Fill `Surface/muted`, stroke `Border/subtle` 1px INSIDE, radius `Radius/control` (8), ink `Content/secondary`, centered.

## Odd in the file
- Radius 8 on a 16 box: it is clipped to a pill (Figma and CSS behavior).

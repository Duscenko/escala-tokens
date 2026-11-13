# Contrato · Kbd (de Figma a código)

Fecha: 2026-11-12 · Fuente: set `Kbd` (`1091:6`, 3 variantes), leído en solo lectura. **Figma manda.**
Descripción: «Keyboard key hint for shortcuts and navigation legends (⌘, K, Esc, ↑, ↓, ↵). Size follows the icon of the control it sits in: xs in menus and Input sm, sm in Input default and lg and in tooltips, default in standalone shortcut lists. Render as <kbd>, one Kbd per key.»

## API
| Figma | Defecto | React |
|---|---|---|
| `Size` xs · sm · default | `default` | `size` |
| `Label` TEXT | `⌘` | `children` |

## Geometría y color (medido en las 3 variantes)
| Size | Alto = ancho mín. | Padding X | Texto | Muestra «⌘» |
|---|---|---|---|---|
| xs | 16 (`Size/icon-sm`) | 4 (`Spacing/gap-tight`) | `Type/caption` | 20×16 |
| sm | 20 (`Size/icon-md`) | 4 (`gap-tight`) | `Type/caption` | 20×20 |
| default | 24 (`Size/icon-lg`) | 8 (`Spacing/gap-control`) | `Type/label` | 28×24 |
Relleno `Surface/muted`, trazo `Border/subtle` 1px INSIDE, radio `Radius/control` (8), tinta `Content/secondary`, centrado.

## Lo raro del archivo
- Radio 8 en una caja de 16: se recorta a pastilla (comportamiento de Figma y de CSS).

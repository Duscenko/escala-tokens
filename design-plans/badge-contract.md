# Contrato · Badge (de Figma a código)

Fecha: 2026-11-12 · Fuente: set `Badge` (`383:176`, 525 variantes), leído en solo lectura. **Figma manda.**
Descripción: «Small non-interactive label for statuses, counts and categories. Variant is the severity…; Appearance is soft, solid, outline or ghost; Type is default, icon (icon only, needs an accessible name) or number. Icons are instance swaps.»

## API
| Figma (orden del panel) | Defecto | React |
|---|---|---|
| `Label` TEXT | `Badge` | `children` |
| `IconLeadingVisible` / `IconTrailingVisible` BOOLEAN + `IconLeadingIcon` (CheckCircle) / `IconTrailingIcon` (X) | false | `iconLeading` / `iconTrailing` (nodo o `true`) |
| `Icon` INSTANCE_SWAP (Info) · `Count` TEXT (`8`) | | `icon` · `count` |
| `Appearance` soft · solid · outline · ghost | `soft` | `appearance` |
| `Shape` rounded · pill | `rounded` | `shape` |
| `Size` xs · sm · default | `default` | `size` |
| `Type` default · icon · number · dot | `default` | `type` |
| `Variant` success · warning · info · inverse · default · secondary · critical | `default` | `variant` |

91 combinaciones Type·Variant·Appearance × 6 (Size × Shape) = 525; **dot solo existe solid + pill** (7 × 3).

## Geometría (medida)
| Size | Alto | Padding X (Type default) | Texto | Glifo |
|---|---|---|---|---|
| xs | 16 | 4 (`gap-tight`) | `Type/caption` | 10 |
| sm | 20 | 8 (`gap-control`) | `Type/label` | 12 |
| default | 24 (`Size/control-xs`) | 12 (`inset-control`) | `Type/label` | 14 |
Gap 4 (`gap-tight`); radio `Radius/control` (rounded) o `Radius/full` (pill). **icon**: cuadrado (ancho = alto), sin padding. **number**: ancho mín. = alto, padding 4, `count` en el tipo del tamaño. **dot**: círculo 6 · 8 · 10, sin contenido. **outline**: trazo 1px INSIDE que cuenta en el layout (+2 de ancho: 63 vs 61).

## Color (idéntico en todos los tamaños, formas y Types — comprobado)
| Variant | soft | solid | outline (trazo · tinta) | ghost (tinta) |
|---|---|---|---|---|
| default | `Surface/accent` · `Content/accent` | `Action/primary/default` · `Content/on-action` | `Border/accent` · `Content/accent` | `Content/accent` |
| secondary | `Action/secondary/default` · `Content/on-secondary` | `Surface/inverse` · `Content/inverse` | `Border/control` · `Content/primary` | `Content/secondary` |
| success · warning · info · critical | `Status/<s>/surface` · `content` | `surface-solid` · `on-solid` | `Status/<s>/border` · `content` | `Status/<s>/content` |
| inverse | `Surface/inverse-muted` · `Content/inverse` | `Surface/page` · `Content/primary` | `Border/inverse` · `Content/inverse` | `Content/inverse-secondary` |
Dot: el relleno de `solid` de cada Variant.

## Lo raro del archivo
- `Variant=inverse` solid pinta `Surface/page` con `Content/primary` (una chapa clara sobre fondo oscuro).
- Los iconos viven como instancias ocultas (`icon-leading`, `icon-trailing`); el booleano los muestra.
- StatusBadge (el punto de presencia) no está en el archivo: se queda como componente de código aparte.

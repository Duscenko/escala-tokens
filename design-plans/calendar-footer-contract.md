# Contrato · CalendarFooter (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Calendar (✓) (D)`, set `CalendarFooter`
(`423:963`, 2 variantes), leído en solo lectura. **Figma manda; nada se corrige.**

Descripción del set: «Bottom bar of the Calendar body: Today link (left) and Clear / Apply actions (right). Height 72 at default, 56 at sm; top divider. Built from the Button set (link, outline, default).»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`, y el `size` de los tres Button) |

Sin más propiedades en el set. Extras de código: `todayLabel` / `clearLabel` / `applyLabel` (por defecto «Today», «Clear», «Apply», los textos de las instancias) y `onToday` / `onClear` / `onApply`.

## Geometría

| Size | Raíz | Padding lateral | Botones |
|---|---|---|---|
| default | 312×72 fijo (= 7 × `Size/control` + 2 × 16; alto = 40 + 2 × 16) | 16 (variable primitiva «16» → `spacing.4`) | Button `Size=default` (40) |
| sm | 248×56 fijo (= 7 × `Size/compact` + 2 × 12; alto = 32 + 2 × 12) | 12 (primitiva «12» → `spacing.3`) | Button `Size=sm` (32) |

- Raíz HORIZONTAL SPACE_BETWEEN, centrada en vertical, sin relleno; borde SOLO arriba: `Stroke/divider` 1 px en `Border/default`, INSIDE.
- Inicio: Button `Variant=default, Appearance=link`, label «Today», sin iconos.
- Fin: frame `actions`, gap 8 (primitiva «8» → `spacing.2`): Button `Variant=secondary, Appearance=outline` «Clear» + Button `Variant=default, Appearance=solid` «Apply», sin iconos.

## Lo raro del archivo
- Ancho y alto fijos sin variable: en código, sumas de refs (celdas + padding; botón + padding), así siguen al día y al botón.
- Padding y gap atados a primitivas sueltas («16», «12», «8») en lugar de roles: se usan los pasos de spacing equivalentes.
- El color y la forma de los botones son los del Button del sistema; esta receta solo arma la barra.

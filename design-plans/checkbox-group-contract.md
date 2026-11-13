# Contrato · CheckboxGroup (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Checkbox (✓) WIP`, set `CheckboxGroup`
(`1015:10216`, 108 variantes), leído en solo lectura. **Figma manda; nada se corrige.** Componente nuevo (`part`
de Checkbox en el ledger).

Descripción: «Labelled multi-select: group label, three CheckboxItems and an optional footer (helper or error). Each
checkbox stays independent; render role="group" with aria-labelledby on the group label, and aria-describedby on the footer.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` xs · sm · default | VARIANT | `default` | `size` (cascada a las filas) |
| `Placement` left · right | VARIANT | `left` | `placement` (cascada) |
| `State` Default · Invalid · Disabled | VARIANT | `Default` | `invalid`, `disabled` (cascada; `forceState` docs) |
| `Variant` default · … · inverse | VARIANT | `default` | `variant` (cascada) |
| `GroupLabel` | TEXT | «Notifications» | `label` |
| `FooterVisible` | BOOLEAN | false | `footer` (ausente = oculto) |
| `FooterText` | TEXT | «Helper text» | `footer` |

Contenido: `children` (las filas). Sin hijos, las tres filas del archivo: Email (marcada), SMS, Push notifications (marcada).
Cada fila hereda Size · Placement · State · Variant del grupo (comprobado en las instancias).

## Geometría
Columna (ancho 280 de muestra → `spacing.32+spacing.32+spacing.6`; las filas llenan), gap `Spacing/gap-control` 8.
Alto: 117 · 105 · 96 (default · sm · xs) sin footer.

| Pieza | Tipo | Color |
|---|---|---|
| group label | `Type/label` (todas las Size) | `Content/primary`; Disabled `Content/disabled` |
| footer | `Type/body-sm` (default) · `Type/caption` (sm, xs) | `Content/secondary`; Invalid `Status/critical/content`; Disabled `Content/disabled` |

## Lo raro del archivo
- La etiqueta del grupo es `Type/label` en las tres Size (no escala con las filas).
- Ancho fijo 280 de muestra.

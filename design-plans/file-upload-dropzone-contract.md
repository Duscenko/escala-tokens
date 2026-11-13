# Contrato · FileUploadDropzone (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ FileUpload (✓)  WIP`, set
`FileUploadDropzone` (`994:472`, 15 variantes), leído en solo lectura. **Figma manda; nada se corrige.**
Es el `rename` del ledger: el `Dropzone` de código pasa a llamarse `FileUploadDropzone`.

Descripción del set: «Drop area that opens the file picker on click and accepts dragged files; the Choose
file trigger is a Button. Keyboard users reach the trigger with Tab; set aria-disabled when disabled and
aria-invalid with a visible message in the error state.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` (`data-size`) |
| `State` Default · Hover · Dragging · Invalid · Disabled | VARIANT | `Default` | `forceState` (docs); en vivo: `:hover`, arrastre, `invalid`, `disabled` |
| `Title` | TEXT | «Drag and drop files» | `title` |
| `DescriptionVisible` | BOOLEAN | true | `description={null}` lo oculta |
| `Description` | TEXT | «Max 10 MB each · PDF, ZIP or images» | `description` |
| `Icon` | INSTANCE_SWAP | `icon/CloudArrowUp` (Outline) | `icon` |
| `SeparatorVisible` | BOOLEAN | true | `separator` (solo pinta en lg) |

Extras de código: `triggerLabel` (por defecto «Choose file»; «Choose again» en Invalid, como el archivo),
`accept`, `multiple`, `onFiles`, `invalid`, `disabled`.

## Geometría (los trazos cuentan en el layout: `strokesIncludedInLayout`)

| Size | Raíz | Dirección | Padding | Gap | Icono | Título | Botón |
|---|---|---|---|---|---|---|---|
| default | 480 × 60 (ancho fijo sin variable → `spacing.32×3+spacing.24`) | fila, centrada en vertical | `Spacing/inset-control` 12 + trazo | `Spacing/gap-control` 8 | `Size/icon-md` 20 | `Type/label` | Button secondary · solid · **sm** (32) |
| sm | 400 × 42 (`spacing.32×3+spacing.4`) | fila | `Spacing/gap-control` 8 + trazo | 8 | `Size/icon-sm` 16 | `Type/body-sm` | Button secondary · solid · **xs** (24) |
| lg | 400 × 206 | columna centrada | `Spacing/inset-surface` 20 + trazo | `Spacing/gap-group` 16 | `Size/icon-lg` 24 | `Type/label`, centrado | Button secondary · solid · **default** (40) |

- Raíz: `Radius/container`, trazo `Stroke/control` INSIDE, **discontinuo 4·4**.
- Texto: columna sin gap, título + descripción `Type/helper`. En default el bloque de texto llena (FILL) y el botón queda al final; en lg el texto abraza y se centra.
- **sm no muestra descripción nunca**: la capa está oculta y NO está atada a `DescriptionVisible`.
- Separador (solo lg, `SeparatorVisible`): instancia del `Separator` del archivo (Label «OR», center, subtle):
  dos líneas `Border/subtle` de `Stroke/divider` y «OR» en `Type/label` `Content/secondary`, gap 16. El
  Separator de código aún no está reconstruido, así que el dropzone dibuja el suyo (`separator` · `rule` · `or`).

## Color por estado

| State | Relleno | Trazo | Icono | Título | Descripción | Botón |
|---|---|---|---|---|---|---|
| Default | `Surface/layer-1` | `Border/control` | `Content/secondary` | `Content/primary` | `Content/secondary` | Default |
| Hover | `Surface/layer-1` | `Border/control-hover` | idem | idem | idem | Default |
| Dragging | `Surface/accent` | `Border/accent` | `Content/accent` | `Content/accent` | `Content/accent` | Default |
| Invalid | `Status/critical/surface` | `Status/critical/border-strong` | `Status/critical/content` | idem | idem | Default, «Choose again» |
| Disabled | `Action/disabled/default` | `Border/control` | `Content/disabled` | idem | idem | Disabled |

El «OR» del separador queda `Content/secondary` en todos los estados (también Disabled).

## Lo raro del archivo
- Invalid sustituye los textos sin atarlos a las propiedades: título «Upload failed», descripción «The file
  exceeds the 25 MB limit.»; en sm el único texto visible es «The file exceeds the 25 MB limit.». Código: esos
  son los textos por defecto de Invalid cuando no llegan `title` / `description`.
- No hay estado Focused: el foco es el del botón (Tab llega al trigger).
- El trazo es discontinuo 4·4; CSS `dashed` no fija la longitud del guion (Chrome dibuja el suyo). Se acepta.
- El Separator anidado no está reconstruido en código: se dibuja dentro del dropzone con los mismos roles.
- Ancho fijo sin variable (480 / 400): pasos de spacing sumados; quien lo use puede estirarlo.

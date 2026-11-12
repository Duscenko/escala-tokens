# Contrato · FileUpload (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ FileUpload (✓)  WIP`, set
`FileUpload` (`994:1399`, 4 variantes), leído en solo lectura. **Figma manda; nada se corrige.**
Reconstruye el FileUpload anterior (trigger + `FileUploadFile`, que desaparece).

Descripción del set: «Managed file upload: a FileUploadDropzone (or a single trigger Button) above a list of
FileUploadItem rows; Size sets row density and cascades to every item. Keep the aria-live region that announces
completed, removed and failed files, and move focus to a neighbouring row when one is removed.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (contexto que heredan los `FileUploadItem`) |
| `Layout` dropzone · trigger | VARIANT | `dropzone` | `layout` |
| `Content` | SLOT | 3 filas de muestra | `children` |

Extras: `dropzone` (props del FileUploadDropzone), `triggerLabel` («Upload files»), `accept`, `multiple`,
`onFiles`, `announcement` (región `aria-live="polite"`).

## Geometría (columna 480, sin variable → `spacing.32×3+spacing.24`; gap `Spacing/gap-group` 16)

| Variante | Cabecera | Content (gap `gap-control` 8) | Total |
|---|---|---|---|
| default · dropzone | FileUploadDropzone **lg** (FILL) 480×206 | 3 × FileUploadItem default (78 · 86 · 78) | 480×480 |
| sm · dropzone | FileUploadDropzone **default** (FILL) 480×60 | 3 × FileUploadItem sm (42 · 50 · 42) | 480×226 |
| default · trigger | Button secondary · solid · default, «Upload files», icono `UploadSimple` (20) — 121×40, alineado al inicio | idem default | 480×314 |
| sm · trigger | Button secondary · solid · sm (icono 16) — 117×32 | idem sm | 480×198 |

Filas de muestra: completed «brand-guidelines.pdf», uploading «Q3-financial-report.pdf», error
«product-video.mp4» (icono `icon/File`). Las filas y el dropzone llenan el ancho (FILL), aunque sus sets midan 480 / 400.

## Lo raro del archivo
- La página está marcada WIP; los tres sets están completos (4 · 15 · 10 variantes).
- El FileUpload no pinta nada propio: solo layout. El tamaño cascada a las filas por contexto en código.
- El glifo del Button no lo dimensiona la receta del Button (no tiene slot de icono con tamaño): el FileUpload lo
  dimensiona (`triggerIcon`, `Size/icon-md` · `icon-sm`), como el archivo.
- Tablero (`SystemCollage`): la ficha usa Layout trigger · sm con una fila uploading que se llena (antes un
  botón outline + `FileUploadFile`).

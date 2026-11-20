# Contract · FileUpload (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ FileUpload (✓)  WIP`, set
`FileUpload` (`994:1399`, 4 variants), read-only read. **Figma rules; nothing is corrected.**
Rebuilds the previous FileUpload (trigger + `FileUploadFile`, which goes away).

Set description: "Managed file upload: a FileUploadDropzone (or a single trigger Button) above a list of
FileUploadItem rows; Size sets row density and cascades to every item. Keep the aria-live region that announces
completed, removed and failed files, and move focus to a neighbouring row when one is removed."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (context inherited by the `FileUploadItem`s) |
| `Layout` dropzone · trigger | VARIANT | `dropzone` | `layout` |
| `Content` | SLOT | 3 sample rows | `children` |

Extras: `dropzone` (FileUploadDropzone props), `triggerLabel` ("Upload files"), `accept`, `multiple`,
`onFiles`, `announcement` (`aria-live="polite"` region).

## Geometry (480 column, no variable → `spacing.32×3+spacing.24`; gap `Spacing/gap-group` 16)

| Variant | Header | Content (gap `gap-control` 8) | Total |
|---|---|---|---|
| default · dropzone | FileUploadDropzone **lg** (FILL) 480×206 | 3 × FileUploadItem default (78 · 86 · 78) | 480×480 |
| sm · dropzone | FileUploadDropzone **default** (FILL) 480×60 | 3 × FileUploadItem sm (42 · 50 · 42) | 480×226 |
| default · trigger | Button secondary · solid · default, "Upload files", `UploadSimple` icon (20) — 121×40, aligned to start | same as default | 480×314 |
| sm · trigger | Button secondary · solid · sm (icon 16) — 117×32 | same as sm | 480×198 |

Sample rows: completed "brand-guidelines.pdf", uploading "Q3-financial-report.pdf", error
"product-video.mp4" (`icon/File` icon). The rows and the dropzone fill the width (FILL), even though their sets measure 480 / 400.

## Odd in the file
- The page is marked WIP; the three sets are complete (4 · 15 · 10 variants).
- FileUpload paints nothing of its own: layout only. The size cascades to the rows through context in code.
- The Button's glyph is not sized by the Button recipe (it has no icon slot with a size): FileUpload
  sizes it (`triggerIcon`, `Size/icon-md` · `icon-sm`), like the file.
- Board (`SystemCollage`): the card uses Layout trigger · sm with an uploading row that fills up (previously an
  outline button + `FileUploadFile`).

# Contract · FileUploadItem (Figma to code)

Date: 2026-11-12 · Source: Figma `Escala Design System (Real)`, page `❖ FileUpload (✓)  WIP`, set
`FileUploadItem` (`994:1074`, 10 variants), read-only. **Figma rules; nothing is corrected.**
It is a `part` of FileUpload in the ledger (new component in code).

Set description: "One file row in FileUpload with format icon, name, status, size readout, progress and
row actions. Status follows the upload lifecycle (queued, uploading, paused, completed, error); every action
IconButton needs its aria-label (Pause, Resume, Remove, Retry, Change, Download)."

## API

| Figma (panel order) | Type | Default | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Status` queued · uploading · paused · completed · error | VARIANT | `queued` | `status` (`data-status`) |
| `Name` | TEXT | "Q3-financial-report.pdf" | `name` |
| `Icon` | INSTANCE_SWAP | `icon/FilePdf` (Outline) | `icon` |
| `CompletedActionsVisible` | BOOLEAN | false | `completedActions` (Change + Download, completed only) |

Code extras: `progress` (0–100; default 48 in uploading, 25 in paused), `statusText` and `meta`
(default to the file's texts), and the callbacks `onPause` · `onResume` · `onRemove` · `onRetry` ·
`onChange` · `onDownload`.

## Geometry (width 480 with no variable → `spacing.32×3+spacing.24`; strokes in the layout)

| Size | Root | Padding | Icon | Name | Actions | Height |
|---|---|---|---|---|---|---|
| default | row, icon at TOP (MIN) | `Spacing/inset-control` 12 + stroke | `Size/icon-lg` 24 | `Type/label` | IconButton secondary · ghost · **sm** (32), gap `gap-tight` | 78 · 86 with progress |
| sm | row, CENTRED | `Spacing/gap-control` 8 + stroke | `Size/icon-md` 20 | `Type/body-sm` | IconButton secondary · ghost · **xs** (24) | 42 · 50 with progress |

- Root: gap `gap-control` 8, `Radius/container`, fill `Surface/layer-1`, stroke `Border/default` 1 INSIDE
  (error: `Status/critical/border`).
- `content`: a column that fills, gap `gap-tight` 4.
  - default: `header` (name that fills + actions), `footer` (status that fills + meta), `progress`.
  - sm: a single `header`: name that fills · status · meta · actions; `progress` below.
- Status: icon `Size/icon-sm` 16 (only completed `CheckCircle`, error `WarningCircle`) + text `Type/caption`,
  gap `gap-tight`. Meta `Type/caption` `Content/secondary`.
- Progress (uploading, paused): an instance of `ProgressLine` (xs, solid): track `Surface/muted` 4 tall,
  `Radius/full`, fill `Action/primary/default`. ProgressLine is not yet rebuilt in code: the item
  draws the track and the bar (`track` · `bar`) with those roles.

## By status

| Status | Status (text · colour) | Meta | Actions | File icon | Stroke |
|---|---|---|---|---|---|
| queued | "Queued" `Content/secondary` | "2.6 MB" | X (Remove) | `Content/secondary` | `Border/default` |
| uploading | "Uploading · 48%" `Content/secondary` | "1.2 MB / 2.6 MB" | Pause, X | same | same |
| paused | "Paused" `Content/secondary` | "0.6 MB / 2.6 MB" | Play (Resume), X | same | same |
| completed | CheckCircle + "Completed" `Status/success/content` | "2.6 MB" | [Swap (Change), DownloadSimple (Download)] + Trash (Remove) | same | same |
| error | WarningCircle + "File exceeds 25 MB" `Status/critical/content` | "28.4 MB" | ArrowClockwise (Retry), X | `Status/critical/content` | `Status/critical/border` |

The action glyphs are `Content/primary` (IconButton secondary · ghost).

## Oddities in the file
- ProgressLine's bar does not scale with the instance: the variant says Value=50 and the text "48%", but the bar
  measures 120 px of a 422 track (ProgressLine's own width). Code: the bar is the `progress` % of the track.
- The status and meta texts are not tied to properties: they are the default texts of each Status.
- ProgressLine is not rebuilt in code: it is drawn inside the item with the same roles.
- Fixed width 480 with no variable: spacing steps added together.

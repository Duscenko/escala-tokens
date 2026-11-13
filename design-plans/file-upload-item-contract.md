# Contrato · FileUploadItem (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ FileUpload (✓)  WIP`, set
`FileUploadItem` (`994:1074`, 10 variantes), leído en solo lectura. **Figma manda; nada se corrige.**
Es una `part` de FileUpload en el ledger (componente nuevo en código).

Descripción del set: «One file row in FileUpload with format icon, name, status, size readout, progress and
row actions. Status follows the upload lifecycle (queued, uploading, paused, completed, error); every action
IconButton needs its aria-label (Pause, Resume, Remove, Retry, Change, Download).»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm | VARIANT | `default` | `size` (`data-size`) |
| `Status` queued · uploading · paused · completed · error | VARIANT | `queued` | `status` (`data-status`) |
| `Name` | TEXT | «Q3-financial-report.pdf» | `name` |
| `Icon` | INSTANCE_SWAP | `icon/FilePdf` (Outline) | `icon` |
| `CompletedActionsVisible` | BOOLEAN | false | `completedActions` (Change + Download, solo completed) |

Extras de código: `progress` (0–100; por defecto 48 en uploading, 25 en paused), `statusText` y `meta`
(por defecto los textos del archivo), y los callbacks `onPause` · `onResume` · `onRemove` · `onRetry` ·
`onChange` · `onDownload`.

## Geometría (ancho 480 sin variable → `spacing.32×3+spacing.24`; trazos en el layout)

| Size | Raíz | Padding | Icono | Nombre | Acciones | Alto |
|---|---|---|---|---|---|---|
| default | fila, icono ARRIBA (MIN) | `Spacing/inset-control` 12 + trazo | `Size/icon-lg` 24 | `Type/label` | IconButton secondary · ghost · **sm** (32), gap `gap-tight` | 78 · 86 con progreso |
| sm | fila, CENTRADA | `Spacing/gap-control` 8 + trazo | `Size/icon-md` 20 | `Type/body-sm` | IconButton secondary · ghost · **xs** (24) | 42 · 50 con progreso |

- Raíz: gap `gap-control` 8, `Radius/container`, relleno `Surface/layer-1`, trazo `Border/default` 1 INSIDE
  (error: `Status/critical/border`).
- `content`: columna que llena, gap `gap-tight` 4.
  - default: `header` (nombre que llena + acciones), `footer` (estado que llena + meta), `progress`.
  - sm: un solo `header`: nombre que llena · estado · meta · acciones; `progress` debajo.
- Estado: icono `Size/icon-sm` 16 (solo completed `CheckCircle`, error `WarningCircle`) + texto `Type/caption`,
  gap `gap-tight`. Meta `Type/caption` `Content/secondary`.
- Progreso (uploading, paused): instancia de `ProgressLine` (xs, solid): pista `Surface/muted` 4 de alto,
  `Radius/full`, relleno `Action/primary/default`. ProgressLine aún no está reconstruido en código: el item
  dibuja la pista y la barra (`track` · `bar`) con esos roles.

## Por estado

| Status | Estado (texto · color) | Meta | Acciones | Icono archivo | Trazo |
|---|---|---|---|---|---|
| queued | «Queued» `Content/secondary` | «2.6 MB» | X (Remove) | `Content/secondary` | `Border/default` |
| uploading | «Uploading · 48%» `Content/secondary` | «1.2 MB / 2.6 MB» | Pause, X | idem | idem |
| paused | «Paused» `Content/secondary` | «0.6 MB / 2.6 MB» | Play (Resume), X | idem | idem |
| completed | CheckCircle + «Completed» `Status/success/content` | «2.6 MB» | [Swap (Change), DownloadSimple (Download)] + Trash (Remove) | idem | idem |
| error | WarningCircle + «File exceeds 25 MB» `Status/critical/content` | «28.4 MB» | ArrowClockwise (Retry), X | `Status/critical/content` | `Status/critical/border` |

Los glifos de las acciones son `Content/primary` (IconButton secondary · ghost).

## Lo raro del archivo
- La barra de ProgressLine no escala con la instancia: la variante dice Value=50 y el texto «48%», pero la barra
  mide 120 px de una pista de 422 (el ancho propio del ProgressLine). Código: la barra es el `progress` % de la pista.
- Los textos de estado y meta no están atados a propiedades: son los textos por defecto de cada Status.
- ProgressLine no está reconstruido en código: se dibuja dentro del item con los mismos roles.
- Ancho fijo 480 sin variable: pasos de spacing sumados.

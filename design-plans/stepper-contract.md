# Contrato · Stepper, StepperItem, StepperIndicator y StepperIcon (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ Stepper (✓) WIP»: `Stepper` (994:3222, 8 variantes), `StepperItem` (994:1904, 56), `StepperIndicator` (994:850, 56),
`StepperIcon` (994:569, 28). Solo lectura. Ledger: Stepper `rebuild`, las otras tres `part`.

## API (variantes primero, luego el resto del panel)
- Stepper: `Size` default · xs · sm · lg (def default) · `Orientation` vertical · horizontal (def vertical) · `Content` (slot de StepperItem).
- StepperItem: `Size` · `Status` active · completed · error · locked (def active) · `State` Default · Disabled · `Orientation` · `Title` «Step title» · `Description` «Short description of the step» · `DescriptionVisible` true.
- StepperIndicator: `Size` · `Status` · `State` · `Orientation` · `LineVisible` true.
- StepperIcon: `Size` · `Status` · `State` · `Label` «1» · `LabelVisible` true · `IconVisible` false · `Icon` (def user).
Descripción: lista ordenada de pasos (`ol` con nombre accesible); un solo item `aria-current="step"`; los desactivados `aria-disabled`; el último item oculta su línea; completed / error anuncian «Completed» / «Error» (sr-only).

## Geometría
- Stepper vertical: VERTICAL sin gap, items STRETCH (320 de ancho en el ejemplo, 4 × 62 = 248). Horizontal: Content HORIZONTAL gap `Spacing/gap-tight` (4), items `grow 1` (880 → 217 cada uno).
- StepperItem vertical: HORIZONTAL gap `Spacing/gap-control` (8), [indicator (STRETCH), content (grow, VERTICAL gap 4, padding inferior `Spacing/gap-section` 24)]; alto 62 = 18 + 4 + 16 + 24.
  Horizontal: VERTICAL gap 8, [indicator STRETCH, content STRETCH sin padding]; alto 86 · 70 · 78 · 94 (= marcador 40 · 24 · 32 · 48 + 8 + 38).
  Título `Type/label`, descripción `Type/helper`.
- StepperIndicator: vertical VERTICAL centro gap `gap-tight` (4) [icono, línea grow]; horizontal HORIZONTAL centro gap 4. La línea es un rectángulo de `Stroke/divider` (1) de ancho (vertical) o de alto (horizontal).
- StepperIcon: círculo (`Radius/full`) `Size/control-md|xs|sm|lg` (40 · 24 · 32 · 48), centrado; etiqueta `Type/label` (default y lg) o `Type/caption` (xs y sm); icono `Size/icon-md|sm|sm|lg`. completed → Check, error → Warning (automáticos, sin etiqueta).

## Color (Size no cambia nada)
- StepperIcon: active relleno `Action/primary/default` y tinta `Content/on-action`; completed `Surface/accent` y `Content/accent`; error `Status/critical/surface-solid` y `Status/critical/on-solid`; locked `Surface/muted` y `Content/secondary`;
  Disabled (completed · error · locked) `Action/disabled/default` y `Content/disabled`.
- Línea: active y locked `Border/default`; completed `Border/accent`; error `Status/critical/border`; Disabled `Border/subtle`.
- Título: active y completed `Content/primary`; error `Status/critical/content`; locked `Content/secondary`; Disabled `Content/disabled`. Descripción `Content/secondary` (Disabled `Content/disabled`).

## Raro (se copia igual)
- El marcador de un paso locked lleva el número sobre `Surface/muted`, no un candado.
- El padding inferior de 24 del contenido vertical se mantiene también en el último item (el Stepper vertical mide 4 × 62).
- Las tres variantes con Disabled pierden el color de estado (completed y error se ven iguales).

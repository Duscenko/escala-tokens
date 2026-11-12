# Contrato · SwitchGroup (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, página `❖ Switch & SwitchGroup (✓)`, set `SwitchGroup`
(`405:2153`, 24 variantes), leído en solo lectura. **Figma manda.** Parte de Switch en el ledger.

Descripción: «Switch with label, optional description and footer helper text; Placement sets which side the switch sits on,
Invalid shows critical helper text and Loading replaces the switch with a spinner. Always associate the label with the
switch (htmlFor or aria-labelledby in code).»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Label` | TEXT | «Email notifications» | `label` |
| `Description` / `DescriptionVisible` | TEXT / BOOLEAN | «Receive a summary of activity in your inbox.» / true | `description` (ausente = oculta) |
| `Footer` / `FooterVisible` | TEXT / BOOLEAN | «Changes apply immediately.» / true | `footer` (ausente = oculto) |
| `Size` xs · sm · default | VARIANT | `default` | `size` (pasa al Switch) |
| `State` Default · Disabled · Invalid · Loading | VARIANT | `Default` | `disabled`, `invalid`, `loading` (`forceState` docs) |
| `Placement` left · right | VARIANT | `left` | `placement` |

El switch de la muestra es un Switch encendido (Checked=true, Thumb short, Default; Disabled → Disabled, Invalid → Default).

## Geometría
Fila de 360 de muestra (`spacing.32+32+24+2`), gap `Spacing/gap-group` 16 entre el switch y el texto, el switch arriba (y 0).
Columna de texto con gap 2. Alto 54 · 59 · 68 (xs · sm · default).

| Pieza | xs | sm | default |
|---|---|---|---|
| label | `Type/label` | `Type/body-md` | `Type/body-lg` |
| description | `Type/caption` | `Type/body-sm` | `Type/body-md` |
| footer | `Type/helper` | `Type/helper` | `Type/body-sm` |
| spinner (Loading) | 14×14 | 16×16 | 20×20 |

## Color
label `Content/primary`, description `Content/secondary`, footer `Content/subtle`. Disabled: los tres `Content/disabled`.
Invalid: footer `Status/critical/content` con el texto «Enable at least one channel to continue.».

## Lo raro del archivo
- El footer en `Content/subtle` mide 3:1 (axe falla en Light y Dark): se copia.
- Invalid no marca el switch (sigue Default); solo cambia el footer.
- Loading mantiene label, descripción y footer normales; solo el control cambia por un Spinner (sin leer su tinta).

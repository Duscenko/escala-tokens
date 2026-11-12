# Contrato · Accordion + AccordionItem (de Figma a código) — LECTURA (2026-11-12)

Fuente: `AccordionItem` (`451:188`, 18 variantes: Variant × State) y `Accordion` (`451:375`, 6 variantes: Variant). **Figma manda.**

## AccordionItem — API
`IconVisible` BOOLEAN true · `Icon` swap (House) · `Label` TEXT `Accordion title` · `Content` TEXT `Accordion content goes here. Add supporting detail for this section.` · `Variant` ghost-default · ghost-underline · ghost-rounded · outline-rounded · outline-sharp · filled-rounded (def. ghost-default) · `State` Closed · Open · Disabled (def. Closed).
Descripción: «trigger (optional icon, label, chevron that flips when open) and collapsible content.»

## Estructura (480 de ancho, auto-layout vertical, FILL horizontal)
`root` (V, gap 0, sin padding) → `trigger` (H MIN/CENTER, gap `Spacing/gap-group` 16, padding Y `inset-surface` 20, X 0 ó 20 según variante; alto 60) con `icon` (20, `Size/icon-md`, ink `Content/secondary`) · `label` (`Type/label`, `Content/primary`, llena) · `chevron` (frame 20, caret `CaretDown` 20 `Content/secondary`; gira abierto) → `content` (V, gap `gap-tight` 4, padding bottom 20, X 0/20; oculto en Closed y Disabled) con `content text` (`Type/body-md`, `Content/secondary`).
Medidas: ghost-default Closed 480×60 / Open 480×101 (contenido 41 = 21 de texto + 20 padding) ; ghost-rounded Open 480×122 (contenido 62 = 42 de texto a 440 de ancho + 20) .
## Variantes (todo lo demás igual)
| Variant | Radio | Relleno | Trazo | Padding X trigger / content |
|---|---|---|---|---|
| ghost-default | 0 | — | — | 0 / 0 |
| ghost-underline | 0 | — | solo inferior 1px `Border/default` INSIDE (alto +1: 61 / 102) | 0 / 0 |
| ghost-rounded | `Radius/container` (16) | Closed: —; Open: `Surface/muted` | — | 20 / 20 |
| outline-rounded | container | `Surface/page` | 1px INSIDE: Closed `Border/default`, Open `Border/strong`, Disabled `Border/subtle` (alto +2: 62 / 124; trigger 478 ancho) | 20 / 20 |
| outline-sharp | `Radius/none` | `Surface/page` | igual que outline-rounded | 20 / 20 |
| filled-rounded | container | `Surface/muted` (siempre) | — | 20 / 20 |
Disabled: icon, label y caret `Content/disabled` (el contenido sigue siendo `Content/secondary` pero oculto). Sin estados hover/foco/pressed en el archivo.

## Accordion — API y estructura
Solo `Variant` (6 valores). Pila de 3 `AccordionItem` con el mismo Variant; el primero Open, los otros Closed; items abiertos/cerrados independientes (type multiple). Gap: `Spacing/none` (0) en ghost-default y ghost-underline; `Spacing/gap-control` (8) en ghost-rounded, outline-rounded, outline-sharp, filled-rounded. Ancho 480 (FILL). Textos de muestra: «What is Escala?» / «Escala is a design system with tokens, components and docs that stay in sync between Figma and code.»; «How do design tokens sync?» / «Variables map to CSS custom properties through a token pipeline.»; «Can I customize the theme?» / «Yes. Swap variable modes for color, shape and density.» Iconos de muestra: `107:1965` en los items del Accordion.
Hover/foco: ninguno en el archivo.

## Estado
Leído; falta construir (receta ACCORDION + ACCORDION_ITEM, `accordion.tsx` — hoy Radix Accordion shadcn — catálogo, store v136, specimens, parity, story, medida).

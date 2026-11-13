# Contrato · ScrollArea y ScrollBar (de Figma a código)

Fecha: 2026-11-13 · Fuente: Figma `Escala Design System (Real)`, página «❖ ScrollArea (✓) WIP»: `ScrollArea` (977:572, 18 variantes), `ScrollBar` (976:27, 12). Solo lectura. Ledger: ScrollArea `rebuild`, ScrollBar `part`.

## API (variantes primero, luego el resto del panel)
- ScrollArea: `Size` default · sm · lg (def default) · `Orientation` vertical · horizontal · both (def vertical) · `Appearance` filled · ghost (def filled) · `FadeVisible` false · `Content` (slot).
- ScrollBar: `Size` · `Orientation` vertical · horizontal · `Appearance` filled · ghost.
Descripción: viewport desplazable con ScrollBars superpuestas y un fundido opcional al final; Size y Appearance cascan a las barras; el viewport entra en el orden de tabulación y se desplaza con flechas, PageUp / PageDown, Home / End (nombre accesible si lleva contenido principal).

## Geometría
- ScrollArea: caja que recorta (`Radius/container`), relleno `Surface/layer-1`, trazo `Border/default` 1 INSIDE (cuenta en el layout: el contenido mide 190 de 192). Muestras: vertical 192×288, horizontal 384×248, both 288×288 (las da el consumidor).
  `Content` (slot): VERTICAL, gap `Spacing/gap-control` (8), padding `Spacing/inset-control` (12) por los cuatro lados; el vertical rellena el ancho, horizontal y both son más anchos que la caja (776 · 438) y desplazan.
- ScrollBar (absoluta, a 4px del borde): vertical x = ancho − grosor − 4, y 4, alto = caja − 8 (280); horizontal x 4, y = alto − grosor − 4, ancho = caja − 8 (376). Con `both` cada barra deja 16 (4 + 8 + 4) para la otra (268). Grosor 8 · 6 · 12 (default · sm · lg), radio `Radius/full`.
  Pista filled `Surface/muted`; ghost sin pista. Thumb `Surface/muted-hover`, `Radius/full`, ocupa todo el cruce (64 de 160 en la muestra).
- Fundido: `fade-bottom` (alto 32, abajo, todo el ancho) y `fade-end` (ancho 32, a la derecha, todo el alto): degradado de transparente a `Surface/layer-1`, visibles con `FadeVisible` (en el archivo ocultos por defecto).

## Raro (se copia igual)
- El contenido de muestra lleva instancias de Separator (tone subtle) entre las líneas de la lista de tags.
- El trazo del contenedor es `Border/default` (el código anterior dibujaba `Border/subtle` con padding de 6).
- Las barras son siempre visibles (pista incluida) en lugar de aparecer al pasar el cursor.

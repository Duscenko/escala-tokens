# Contrato · SplitButton (de Figma a código)

Fecha: 2026-11-19 · Fuente: Figma `Escala Design System (Real)`, set `SplitButton` (`2391:2107`, página
«❖ SplitButton (PRO)»), leído con `figma-read-set.js` + lecturas de las instancias anidadas (solo lectura).
Este documento es lo que copian la receta, el componente y Storybook. **Figma manda; nada se corrige.**
Secciones de la página: Components `2426:940` (set + DocMatrix `2426:1314`), Prototype `2391:2109`
(Light / Dark, 1 · closed, 2 · open), Usage Guideline `2426:1371`.

## Qué es

Una acción principal unida a un menú de alternativas relacionadas. **No pinta nada propio**: es una
composición de dos componentes ya construidos.

- `group` = **ButtonGroup** (`Shape=rounded`, `Orientation=horizontal`, `Variant` y `Size` del set) con
  dos segmentos: `item-1` = **ButtonGroupItem** con etiqueta e icono inicial (acción) y `item-2` =
  ButtonGroupItem `IconOnly=true` con el caret (el disparador). El ButtonGroup pone el divisor 1px entre ambos.
- `menu` (solo `Open=true`) = **DropdownMenu** (`Size` según el set, ver tabla) con tres **DropdownMenuItem**.

El set tiene 16 variantes (2 × 4 × 2). Root: auto-layout VERTICAL, hug; el `menu` es hijo ABSOLUTO.

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Variant` `default` · `secondary` | VARIANT | `default` | `variant` |
| `Size` `default` · `xs` · `sm` · `lg` | VARIANT | `default` | `size` |
| `Open` `false` · `true` | VARIANT | `false` | `open` (controlado) · `defaultOpen` · `onOpenChange` |

El set **no tiene** propiedades TEXT, BOOLEAN ni INSTANCE_SWAP: la etiqueta («Publish»), el icono inicial
(`PaperPlaneTilt`) y el contenido del menú se editan «a través de los ButtonGroupItem expuestos» (descripción
del set). En código eso son props de contenido que **no existen en el panel de Figma**, añadidas al final:

| Contenido (instancia anidada) | Por defecto en el archivo | React |
|---|---|---|
| `item-1` → `Label` | `Publish` | `children` |
| `item-1` → `IconLeadingIcon` | `PaperPlaneTilt` | `leading` |
| `item-2` → icono | `CaretDown` (cerrado) · `CaretUp` (`Open=true`) | el componente lo cambia con `open`; `caret` / `caretOpen` para sustituirlos |
| `menu` → Content | `Publish and notify` (PaperPlaneTilt) · `Save as draft` (FileText) · `Delete draft` (Trash, `Variant=critical`) | `menu` (DropdownMenuItem[]) |
| nombre accesible del caret | «<label> more actions» | `moreLabel` (por defecto `${children} more actions`) |

No hay estados propios: Hover · Pressed · Focused · Disabled vienen de los ButtonGroupItem anidados
(`forceState` de cada segmento no se expone en el set). `Open=true` fija el caret en **Active**.

## Geometría por tamaño

Medida del set (`Variant=default`; `secondary` igual salvo la excepción de abajo).

| Size | Alto del grupo | Ancho grupo (item-1 + 1 + item-2) | Icono (item) | Menú: `Size` · filas · ancho | Menú: x · y (vs. variante) |
|---|---|---|---|---|---|
| `xs` | 24 (`Size/control-xs`) | 112 (87 + 1 + 24) | `Size/icon-sm` | `sm` · 24 · 256×98 | `−(256 − ancho)` · 32 |
| `sm` | 32 (`Size/control-sm`) | 120 (87 + 1 + 32) | `Size/icon-sm` | `sm` · 24 · 256×98 | −136 · 40 |
| `default` | 40 (`Size/control-md`) | 136 (95 + 1 + 40) | `Size/icon-md` | `default` · 32 · 256×122 | −120 · 48 |
| `lg` | 48 (`Size/control-lg`) | 148 (99 + 1 + 48) | `Size/icon-lg` | `lg` · 40 · 256×146 | −108 · 56 |

- Grupo: radio `Radius/action` (12), sin trazo, sin relleno propio, efectos `Shadow/xs`
  (`DROP_SHADOW 0 0 0 1 Elevation/shadow-ring` + `0 1 2 0 Elevation/shadow-ambient`) — es el ButtonGroup tal cual.
- Menú: **alineado al borde final** (x = ancho del grupo − 256) y **8px bajo** el grupo (y = alto + 8 =
  `Spacing/gap-control`). `xs` abre el DropdownMenu `Size=sm` (no existe `xs` en el menú). Fondo `Surface/layer-2`,
  trazo 1px `Stroke/divider` INSIDE `Border/default`, radio `Radius/overlay` (24), `Shadow/md`
  (`0 0 0 1 shadow-ring` + `0 4 6 −1 shadow-key` + `0 2 4 −2 shadow-ambient`) — es el DropdownMenu tal cual.
- Anchos de `item-1` por Inter: 95 · 87 · 87 · 99; Chrome mide fracciones distintas (±1.8px), como en ButtonGroup.

## Color por combinación y estado

Nada propio: lo pintan los ButtonGroupItem. Lectura del set:

| Variant | Segmento principal (Default) | Caret cerrado | Caret `Open=true` (Active) | Tinta |
|---|---|---|---|---|
| `default` | fill `Action/primary/default` | fill `Action/primary/default` | fill `Action/primary/pressed` · icono `CaretUp` | `Content/on-action` (etiqueta e iconos) |
| `secondary` | fill `Action/secondary/default` | fill `Action/secondary/default` | fill `Action/secondary/pressed` · icono `CaretUp` | `Content/on-secondary` |

Divisor, hover, pressed, focus: los del ButtonGroup / ButtonGroupItem (`design-plans/button-group-contract.md`).
Menú y filas: los del DropdownMenu (`design-plans/dropdown-menu-contract.md`); `Delete draft` es `Variant=critical`.

## Efectos
Ninguno propio. `Shadow/xs` sobre el grupo y `Shadow/md` sobre el menú, ambos heredados (ver arriba).

## Movimiento (la página lo documenta en el Prototype)
- Cerrado → abierto: el caret pasa a Active y el DropdownMenu abre desde un ancla fija en el borde final
  con **`popover-enter`**; las filas entran con **`use-stagger-in`**. «El medio-botón principal no escala.»
- Cierre: `popover-exit`. Todo por nombre de rol (`recipes/motion.ts`, `lib/motion.ts`); el caret cambia de
  icono (CaretDown ↔ CaretUp) sin giro propio; el relleno del segmento transiciona con `use-hover`.

## Accesibilidad (descripción del set)
Dos botones nativos. El caret se llama «<etiqueta> more actions» con `aria-haspopup="menu"` y
`aria-expanded`; flechas mueven por los elementos y dan la vuelta; Escape cierra y devuelve el foco al caret.
El par nunca colapsa: dale su propia fila en pantallas estrechas. Radix DropdownMenu aporta el comportamiento
(roles, flechas, typeahead, Escape, retorno de foco). El segmento principal no es un botón de alternancia:
no lleva `aria-pressed`.

## Lo que el archivo hace y parece raro (se copia igual, salvo lo indicado)
- **`Variant=default, Size=xs` (ambos Open) mide 113 de ancho**: lleva un `divider-3` visible y fantasma a la
  derecha del caret (x 112, 1×24, sin tercer segmento); `secondary · xs` mide 112. Es un resto de la
  instancia (los otros 14 variantes no lo tienen); **no se copia** (un divisor sin segmento detrás no es
  diseño) — el grupo xs mide 112 en las dos variantes. Informado al dueño.
- El menú `xs` usa `DropdownMenu Size=sm` (alto de filas 24, igual que `sm`).
- El caret cambia de icono con `Open` (CaretDown → CaretUp) y el segmento queda en Active (relleno `pressed`).
- La etiqueta, el icono y las filas del menú son ejemplo del archivo («Publish»…): no son propiedades del set.

## Anida
**ButtonGroup** (`Size`, `Variant`, `Shape=rounded`, `Orientation=horizontal`, Item1/Item2 visibles) con
**ButtonGroupItem** + **ButtonGroupDivider**, y **DropdownMenu** con **DropdownMenuItem** (`default` ×2,
`critical` ×1). Todos ya construidos en `escala-ui`.

## Dependencias de código
`src/components/escala-ui/split-button.tsx` (usa `button-group`, `dropdown-menu`) · receta `SplitButton`
(`src/lib/recipes/splitButton.ts`: sólo el hueco menú–grupo y el ancho del menú) · historia
`apps/storybook/stories/SplitButton.stories.tsx` · familia `Buttons/SplitButton` (`spec/storybook-families.json`).

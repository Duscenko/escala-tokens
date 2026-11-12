# Contrato · Input (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, set `Input` (`4:12380`,
114 variantes, página «❖ Input»), leído con la Plugin API (solo lectura). **Figma manda.**

Descripción del set: «Input — the box itself. Type Default: Size (sm · default · lg) × Value
(Placeholder · Filled) × State, with optional Icon leading (search) / Icon trailing (eye). Other
Types (Phone, Currency, Currency select, Password, URL, Upload, Tag, Shortcut, Credit card) at the
default size, every State plus one Filled. Focused is the active field, with a caret. Label and
hint are Field.»

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `Size` default · sm · lg | VARIANT | `default` | `size` |
| `State` Default · Hover · Focused · **Invalid** · Disabled | VARIANT | `Default` | CSS (`:hover`, `:has(:focus-visible)`) + `forceState`; `aria-invalid`; `disabled` |
| `Type` default · phone · currency · currency-select · password · url · upload · tag · copy-link · credit-card · search | VARIANT | `default` | `type` (otro valor = tipo HTML sobre el layout default) |
| `Value` placeholder · filled | VARIANT | `placeholder` | ninguno: el campo pinta su `::placeholder` distinto de un valor escrito |
| `IconLeadingVisible` + `IconLeadingIcon` (MagnifyingGlass) | BOOLEAN + SWAP | true | `leading` (cada Type trae el suyo; `null` lo oculta) |
| `Placeholder` | TEXT | «Jane Doe» | `placeholder` |
| `IconTrailingVisible` + `IconTrailingIcon` (Eye) | BOOLEAN + SWAP | true | `trailing` |
| `ShortcutVisible` + `Shortcut` (SLOT: Kbd ⌘ · K) | BOOLEAN + SLOT | true | `shortcut` (⌘ K por defecto en `search`; `null` lo oculta) |

## Anatomía (raíz = la caja; el `<input>` es `text`)

Raíz: horizontal, centrada, gap `Spacing/gap-control` (8), padding X `Spacing/inset-control`
(12), radio `Radius/action`, trazo `Stroke/control` INSIDE, alto `Size/control-sm|md|lg`
(32 · 40 · 48), tipo `Type/placeholder`. Partes, en el orden del archivo:

| Type | Partes | Medido (default, 260 de ancho) |
|---|---|---|
| default | [icon-leading] text [icon-trailing] | 12 · 40 · 228 |
| phone | addon `+01` · chevron · text | 12 · 41 · 65 |
| currency | addon `$` · text | 12 · 28 |
| currency-select | addon `USD` · chevron · divider · text | 13 · 47 · 71 · 80 |
| password | lock · text · eye | 12 · 40 · 228 |
| url | addon `https://` · divider · text | 13 · 63 · 72 |
| upload | folder · addon `Browse` · divider · text | 13 · 41 · 92 · 101 |
| tag | addon `@` · text | 12 · 32 |
| copy-link | text · divider · copy · addon `Copy` | 13 · 180 · 189 · 217 |
| credit-card | lock · text | 12 · 40 |
| search | search · text · Shortcut (Kbd ⌘ · Kbd K, gap `gap-tight`) | 12 · 40 · 204 / 228 |

- Iconos `Size/icon-md` (20) en default y lg, `Size/icon-sm` (16) en sm. El caret de un addon
  select (`CaretDown`) es `Size/icon-sm` siempre.
- `divider`: rectángulo 1 × alto interior (38), `Border/subtle`, también en Disabled.
- **Los Types con divisor (currency-select, url, upload, copy-link) tienen
  `strokesIncludedInLayout`**: su contenido empieza en 13, no en 12. Se copia
  (`spacing.inset-control+stroke.control`).
- Kbd (set `Kbd`, 1091:6): `Size=sm` en default/lg (alto y ancho mínimo `Size/icon-md`), `Size=xs`
  en sm (`Size/icon-sm`); padding X `Spacing/gap-tight`, radio `Radius/control`, fill
  `Surface/muted`, trazo `Border/subtle` `Stroke/divider` INSIDE, texto `Type/caption`
  `Content/secondary`. Search Disabled oculta el atajo (medido).

## Color por State

| State | Fill | Stroke | Halo (2px, monta el borde) | Tintas: valor · icono · addon / placeholder |
|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` | — | `Content/primary` / `Content/subtle` |
| Hover | `Surface/input` | `Border/control-hover` | — | igual |
| Focused | `Surface/input` | `Border/focus` | `Border/ring/default` | igual (+ caret) |
| Invalid | `Surface/input` | `Status/critical/border-strong` | `Status/critical/border` | igual |
| Disabled | `Action/disabled/default` | **`Border/control`** | — | `Content/disabled` / `Content/disabled` |

Disabled conserva el stroke neutro (antes `fieldBox()` lo repintaba: bug corregido, afecta también
a Textarea/InputGroup/Select/InputTag).

## Comportamiento (el archivo es estático; el código lo hace real)
- phone / currency-select: el addon es un `<select>` nativo (opciones `addonOptions`).
- password: el ojo es un botón que muestra / oculta (eye ↔ eye-slash), con nombre.
- upload: `Browse` (con la carpeta) abre el selector de archivos; el campo muestra el nombre.
- copy-link: `Copy` (con el icono) copia el valor al portapapeles.
- Cada Type pone su `inputmode` y `autocomplete` (tel, decimal, url, cc-number…).

## Lo que el archivo hace y parece raro (se copia igual)
- `State` dice `Invalid` donde otros sets del repo dicen `Error`.
- 4 Types (los del divisor) ponen el contenido 1px más adentro que el resto.

## Anida
`Kbd` (pintado por la parte `kbd` de Input con los valores del set Kbd; el componente Kbd aún no se
ha reconstruido desde el archivo). Partes nuevas (`addon`, `divider`, `kbd`) son web + Storybook:
el plugin está congelado (`WEB_ONLY_SLOTS` en `componentRecipesPluginParity.test.ts`).

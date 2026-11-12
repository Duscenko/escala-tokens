# Contrato · Input (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, set `Input` (`4:12380`,
114 variantes, página «❖ Input»), leído con la Plugin API (solo lectura) y comprobado contra
los píxeles del render. **Figma manda; nada se corrige.**

Descripción del set: «Input — the box itself. Type Default: Size (sm · default · lg) × Value
(Placeholder · Filled) × State, with optional Icon leading (search) / Icon trailing (eye).
Other Types (Phone, Currency, Currency select, Password, URL, Upload, Tag, Shortcut, Credit
card) at the default size, every State plus one Filled. Focused is the active field, with a
caret. Label and hint are Field.»

## Alcance de esta pasada

El archivo dibuja **un solo componente** con CUATRO ejes de variante: `Size` · `State` · `Type`
(11 valores: default, phone, currency, currency-select, password, url, upload, tag, copy-link,
credit-card, search) · `Value` (placeholder · filled). En código, `Type` y `Value` **no son
props de `Input`** — es la decisión de arquitectura YA vigente en el repo (`Input` es shadcn's
bare control, "the box IS the `<input>`"; iconos, addons y el badge de atajo del tipo `search`
son de `InputGroup`; label y hint son de `Field`). Esta pasada reconstruye **la caja desnuda**
(`Size` × `State`, con `Value` resuelto por el propio `<input>` nativo — un valor escrito se ve
distinto de un placeholder sin ningún prop) con exactitud de píxel y token, y dejó documentado,
no corregido, lo que falta para que `Input` + `InputGroup` reproduzcan los 11 `Type` como
ejemplos compuestos (ver «Lo que queda fuera» más abajo). El componente sigue en
`spec/figma-components.status.json` → `pending` porque el test de paridad exige los CUATRO ejes
value-for-value; esto es honesto, no un parche.

## API (la caja desnuda)

| Figma (orden del panel) | Tipo | Defecto | Opciones | React |
|---|---|---|---|---|
| `Size` | VARIANT | `default` | default · sm · lg | `size` |
| `State` | VARIANT | `Default` | Default · Hover · Focused · **Invalid** · Disabled | CSS (`:hover`, `:focus-visible`) + `forceState`; `aria-invalid` para Invalid, `disabled` |
| `Value` | VARIANT | `placeholder` | placeholder · filled | ninguno — el `<input>` real ya distingue su propio `::placeholder` de un valor escrito |

**`State` en el archivo es `Invalid`, no `Error`** — el código anterior decía `Error`; corregido
en `Input`, su recipe y el catálogo. `fieldBox()` (compartida con Textarea/InputGroup/Select,
que aún no se han auditado) acepta ambos literales para no romper esos consumidores.

## Geometría por tamaño

Raíz: horizontal, centrada, ancho completo (`w-full`), gap `Spacing/gap-control` (8), padding X
`Spacing/inset-control` (12), padding Y 0, radio `Radius/action` (12). Trazo `Stroke/control`
(1px) **INSIDE** siempre — incluso en Focused e Invalid, donde el halo es una capa APARTE (ver
abajo), nunca un trazo más grueso.

| Size | Alto | Fuente del placeholder/valor |
|---|---|---|
| sm | `Size/control-sm` (32) → `size.compact` | `Type/placeholder` |
| default | `Size/control-md` (40) → `size.control` | `Type/placeholder` |
| lg | `Size/control-lg` (48) → `size.touch` | `Type/placeholder` |

Medidas del archivo (default, «Jane Doe», con iconos — los iconos no son de `Input`): 260 × 40.
La caja desnuda sin iconos mide igual de alto; el ancho lo decide el contenedor (`w-full`).

## Color por State

Medido en Size=default, Type=default (idéntico en todos los Size y en `Type=search`, el otro
Type sin decoración de `InputGroup` — confirmado comparando las dos columnas del archivo).

| State | Fill | Stroke | Halo (fuera) | Tinta (valor · placeholder) |
|---|---|---|---|---|
| Default | `Surface/input` | `Border/control` | — | `Content/primary` · `Content/subtle` |
| Hover | `Surface/input` | `Border/control-hover` | — | igual |
| Focused | `Surface/input` | `Border/focus` | `Border/ring/default`, 2px | igual |
| Invalid | `Surface/input` | `Status/critical/border-strong` | `Status/critical/border`, 2px | igual |
| Disabled | `Action/disabled/default` | **`Border/control`** | — | `Content/disabled` · `Content/disabled` |

**Disabled NO cambia el stroke** — medido: `stroke Border/control`, el mismo neutro de Default,
solo el FILL muta. El código anterior (`fieldBox()`) ponía el stroke también en
`action.disabled.default` — **era un bug real, corregido** (afecta a todo lo que comparte
`fieldBox`: Textarea, InputGroup, InputTag, Select — no auditados hoy, pero la caja compartida
ya es correcta para los cuatro).

## Foco (Focused e Invalid)

El archivo dibuja DOS capas: la raíz mantiene su trazo de 1px INSIDE (coloreado `Border/focus` o
`Status/critical/border-strong`), y un frame `focus-ring` superpuesto del mismo tamaño que la
raíz traza 2px **OUTSIDE** en `Border/ring/default` / `Status/critical/border` — es decir, el
halo empieza exactamente en el borde exterior del trazo de 1px y se extiende 2px más allá: el
borde de 1px queda a medio camino dentro del halo. Esto es EXACTAMENTE el patrón ya documentado
en `recipeStyles.ts` (`ring`: `outline` + `outline-offset: calc(stroke-width - halo)`), que
`fieldBox()` ya usaba — no hizo falta cambiar el mecanismo, solo verificarlo contra el render.

## Caret

Focused dibuja un rectángulo `caret` (1×18, fill `Content/primary`) delante del placeholder —
es el cursor de texto del mockup, no algo que replicar: un `<input>` real ya pinta su propio
caret (`caret-color`, que hereda de `color`/`content.primary` vía el `text` del recipe).

## Lo que el archivo hace y parece raro (se copia igual)
- El `State` del archivo es un eje de 5 valores (`Invalid` en vez de `Error`) mientras el resto
  de controles de formulario del repo (Textarea, Select, InputOTP) siguen usando `Error` en su
  propio código — no auditados todavía, así que no se les cambia el nombre.
- `Value` (placeholder/filled) es un eje VISIBLE en Figma pero no necesita ningún prop: es la
  diferencia nativa entre `::placeholder` y el texto escrito.

## Lo que queda fuera de esta pasada (pendiente, documentado, no fingido)
Los 10 `Type` no-`default` (phone · currency · currency-select · password · url · upload · tag ·
copy-link · credit-card) y el badge `Shortcut` de `search` son composiciones de `Input` +
`InputGroup` con contenido fijo por tipo (prefijo `+01`, `$`, `USD` + chevron, `https://` +
divisor, `Browse` + divisor, `@`, `Copy` + icono, dos `Kbd`…). Construirlos es el trabajo de
`InputGroup` (ya existe en el catálogo, sin `pending` propio) más plantillas de ejemplo — no una
prop de `Input`. Mientras no estén, `spec/figma-components.status.json` mantiene `Input` en
`pending` con `status: "rebuild"`: el test de paridad exige los cuatro ejes del archivo
value-for-value, y hoy el código solo cubre `Size` y `State` (`Value` no necesita prop; `Type`
sigue sin construirse). Esto es la verdad del ledger, no una laguna oculta.

## Anida
Ninguno — `Input` no instancia otros componentes del catálogo (los iconos de las demos del
archivo son de `InputGroup`, que ya existe por separado).

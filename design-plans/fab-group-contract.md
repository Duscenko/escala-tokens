# Contrato · FABGroup (de Figma a código)

Fecha: 2026-11-12 · Fuente: Figma `Escala Design System (Real)`, set `FABGroup` (`346:448`,
8 variantes, página «❖ FABButton & FABGroup»), leído con la Plugin API (solo lectura).
**Figma manda; nada se corrige.**

Descripción del set: «Speed-dial: one trigger FABButton that opens up to five action items. Open
toggles the menu; Placement sets the direction items fan out (vertical, center, left, right). Give
the trigger and every icon-only item an accessible name.» ("Placement" es el nombre en prosa de la
propiedad `Layout` del panel.)

## API

| Figma (orden del panel) | Tipo | Defecto | Opciones | React |
|---|---|---|---|---|
| `Layout` | VARIANT | `stack` | stack · fan-center · fan-left · fan-right | `layout` |
| `Open` | VARIANT | `false` | false · true | estado interno (`open`/`defaultOpen`/`onOpenChange`) |

8 variantes = 4 `Layout` × 2 `Open`. El set no expone ejes para el trigger ni los items — son
instancias fijas de `FABButton` (ver abajo). No hay un eje `State` propio del grupo: cada item es
su propio `FABButton` y hereda sus estados Hover/Pressed/Focused/Disabled de la receta ya construida
(`design-plans/fab-button-contract.md`).

### El trigger (instancia fija en las 8 variantes)
`FABButton / Appearance=solid, Shape=pill, Size=lg, Variant=default` — igual en toda variante.
Lo único que cambia con `Open` es el icono (`IconLeadingIcon`, instance swap): `Plus` cuando cerrado,
`X` cuando abierto. `LabelVisible` es `false` siempre (icono solo) — el texto `Label` («Create») existe
en el componente pero nunca se muestra; en React es el nombre accesible por defecto.

### Cada item (instancia fija)
`FABButton / Appearance=soft, Shape=pill, Size=default, Variant=default` — igual en todos los layouts
y posiciones. `LabelVisible` difiere por **Layout**, medido:

| Layout | `LabelVisible` de los items | Nº de items en el archivo |
|---|---|---|
| `stack` | `true` (Edit · Photo · Share) | 3 |
| `fan-center` | `false` (icono solo) | 5 |
| `fan-left` | `false` (icono solo) | 3 |
| `fan-right` | `false` (icono solo) | 3 |

El texto de cada item (`Label`) es su acción real cuando es visible («Edit», «Photo», «Share» en
`stack`); en los tres `fan-*` el `Label` queda en «Create» (heredado, no se ve) — el nombre accesible
real en código es el `label` que el consumidor pasa por item (`aria-label`).

## Geometría

**`stack`** (Edit · Photo · Share, medido en `Layout=stack, Open=true`, 152×244): el trigger se queda
en su sitio (abajo), los items se apilan arriba de él, alineados al borde DERECHO del trigger (ancho
del trigger: x 92 → 148; cada item: x+width = 148 también). Separación vertical constante entre bordes:
12px en los tres huecos (item1→trigger, item2→item1, item3→item2) — coincide exactamente con
`Spacing/inset-control` (12), así que se usa ese rol en vez de un literal. Orden: el item más cercano
al trigger es el primero de la lista (`items[0]` = Edit).

**`fan-center` / `fan-left` / `fan-right`** (icono solo, 48×48): cada item se sitúa sobre un **arco de
radio 100px medido desde el centro del trigger** (medido en los tres: fan-center, fan-left y fan-right
dan exactamente 100px centro-a-centro en cada item, con error de redondeo de ±0.4px por el ángulo de
45°). **100px no corresponde a ningún token de Dimension Primitives ni a una suma obvia de roles — es
una decisión de composición geométrica del archivo, se copia como literal** (`--fab-group-radius: 100px`
en el componente, nunca un ref). El ángulo de cada item (medido en grados, 0°=derecha, −90°=arriba,
180°=izquierda, convención de pantalla con Y+ hacia abajo):

| Layout | nº medido | ángulos medidos | fórmula generalizada (n items, i=0..n−1) |
|---|---|---|---|
| `fan-center` | 5 | 180, −135, −90, −45, 0 | `i·(180/(n−1)) − 180` |
| `fan-left` | 3 | −90, −135, −180(=180) | `−90 − i·(90/(n−1))` |
| `fan-right` | 3 | −90, −45, 0 | `−90 + i·(90/(n−1))` |

`items[0]` es siempre el más cercano al eje vertical (arriba) en los tres `fan-*`: en `fan-center` es
el extremo IZQUIERDO (ángulo 180°), no el de arriba — medido así en el archivo (item-1 está a la
izquierda, item-3 arriba, item-5 a la derecha). Con `n=1` no hay arco que medir en el archivo; el único
item se coloca arriba (`−90°`) en los tres layouts, la posición común a los tres arcos.

El centro de cada item = centro del trigger + `radius·(cos θ, sin θ)`, con θ en la convención de
arriba. El trigger no se mueve de layout a layout — solo cambia su posición DENTRO del marco del grupo
(Figma centra el marco distinto por layout; en código el trigger es el ancla y el marco se ajusta solo).

## Color y efectos

Ninguno es propio del grupo — cada item y el trigger son instancias `FABButton` ya construidas
(receta `FAB_BUTTON`, `design-plans/fab-button-contract.md`): fill, tinta, foco, lift y highlight ya
están resueltos allí. `FABGroup` no pinta nada, solo posiciona. Abrir/cerrar no cambia el color del
trigger (sigue `Action/primary/default` en los dos estados) — solo el icono.

## Movimiento (no está en el archivo; decisión del lado de código)

El archivo solo tiene dos variantes estáticas (`Open` false/true), sin frames intermedios. La
apertura usa el rol de movimiento `use-stagger-in` / `use-stagger-out` (`lib/motion.ts`: «uno de
los hijos de una revelación escalonada») con un pequeño `transition-delay` por índice — no es un
valor del archivo, se documenta como tal.

## Lo que el archivo hace y parece raro (se copia igual)
- El trigger expone un `Label` de texto («Create») y `LabelVisible=false` en las 8 variantes: el
  texto nunca se ve, pero existe como nombre semántico del componente. En código es el valor por
  defecto del `aria-label` del trigger.
- El radio de 100px no deriva de ningún rol de Dimension Primitives/Semantics visible (ni
  `trigger.radius + item.size + item.radius` da un nombre con sentido salvo coincidencia numérica
  con `Size/control-lg`=48). Se documenta, no se "arregla".
- `fan-center` reparte 5 items en 180° empezando por la IZQUIERDA; `fan-left`/`fan-right` reparten
  3 en 90° empezando por ARRIBA. Son dos convenciones de arranque distintas para el mismo radio —
  se copian ambas.

## Anida
`FABButton` (`design-plans/fab-button-contract.md`) — se construye antes y es el único componente
que este set usa como instancia, tanto para el trigger como para cada item.

# Contrato · <Component> (de Figma a código)

Fecha: <YYYY-MM-DD> · Fuente: Figma `Escala Design System (Real)`, set `<Component>` (`<node id>`),
leído con `figma-read-set.js` (solo lectura). Este documento es lo que copian la receta, el componente
y Storybook. **Figma manda; nada se corrige.**

## API

| Figma (orden del panel) | Tipo | Defecto | React |
|---|---|---|---|
| `<Axis>` <opciones> | VARIANT | `<def>` | `<prop>` |
| `State` <opciones> | VARIANT | `Default` | CSS (`:hover`, `:active`, `:focus-visible`) + `forceState`; `loading` · `disabled` |
| `<Bool>Visible` | BOOLEAN | `<def>` | `<prop>?: ReactNode` |
| `<Text>` | TEXT | `"<def>"` | `children` |
| `<Swap>` | INSTANCE_SWAP | `<icon/Name>` | `<prop>: ReactNode` |

## Geometría por tamaño

| Size | Alto | Ancho | Padding | Gap | Radio | Icono | Texto |
|---|---|---|---|---|---|---|---|
| <size> | `<Size/…>` (px) | | `<Spacing/…>` | `<Spacing/…>` | `<Radius/…>` | `<Size/icon-…>` | `<Type/…>` |

Trazo: `<Stroke/…>` · alineación `INSIDE` (el padding CSS descuenta el borde).

## Color por combinación y estado

| Combinación | Default | Hover | Pressed | Focused (borde · halo) | Disabled |
|---|---|---|---|---|---|
| <a · b> | fill `…` · stroke `…` · ink `…` | | | `…` · `…` | |

## Efectos
<Cada efecto con su tipo, offset, radio, spread y variable, por estado.>

## Lo que el archivo hace y parece raro (se copia igual)
- <una línea por cosa>

## Anida
<Componentes del archivo que este set usa como instancia; se construyen antes.>

/**
 * Small drawings for the inspector's preset fields (Radius · Shadow · Spacing).
 *
 * A preset bundles several numbers, so a name alone ("Soft") says little. Each
 * drawing is built from the preset's OWN values — never a picture of one — so
 * the list can be read by eye: the three radius axes nested as they meet in a
 * real form, a tile lifted by the md shadow, a card at the mode's padding,
 * field height and border. `size="sm"` is the 18px mark the closed field
 * shows; `md` is the option tile in the open list.
 */
import { darkShadow } from '../../lib/colorUtils'

const INK = 'color-mix(in srgb, var(--fg) 55%, transparent)'
const INK_SOFT = 'color-mix(in srgb, var(--fg) 30%, transparent)'
const WELL = 'color-mix(in srgb, var(--fg) 6%, transparent)'
const ON = 'var(--accent-ui)'

type Size = 'sm' | 'md'

/** Boxes ⊃ a field ⊃ a selector, each at its own radius — the three axes as
 *  they actually meet: a card holding a field and a checkbox. */
export function RadiusPresetGlyph({ boxes, fields, selectors, size = 'md', selected = false }: {
  boxes: number
  fields: number
  selectors: number
  size?: Size
  selected?: boolean
}) {
  const stroke = selected ? ON : INK
  if (size === 'sm') {
    return (
      <span
        className="block h-[16px] w-[16px] border-l-[1.5px] border-t-[1.5px]"
        style={{ borderColor: stroke, borderTopLeftRadius: Math.min(boxes * 0.5, 14), background: WELL }}
      />
    )
  }
  // ~0.4 scale; the field and the checkbox are 9px tall, so 4.5 is a pill.
  const k = 0.4
  return (
    <span
      className="flex h-[30px] w-[44px] flex-col justify-center gap-[3px] border px-[5px]"
      style={{ borderColor: stroke, borderRadius: Math.min(boxes * k, 13), background: WELL }}
    >
      <span className="block h-[9px] w-full border" style={{ borderColor: INK_SOFT, borderRadius: Math.min(fields * k, 4.5) }} />
      <span className="flex items-center gap-[3px]">
        <span className="block h-[8px] w-[8px] flex-shrink-0 border" style={{ borderColor: stroke, borderRadius: Math.min(selectors * k, 4) }} />
        <span className="block h-[2px] flex-1 rounded-full" style={{ background: INK_SOFT }} />
      </span>
    </span>
  )
}

/** A surface lifted off a floor by the preset's own `md` / `xl` shadow, read
 *  on the chrome (dark chrome gets the same derived twin the export ships). */
export function ShadowPresetGlyph({ values, dark, size = 'md', selected = false }: {
  values: Record<string, string>
  dark: boolean
  size?: Size
  selected?: boolean
}) {
  const pick = (step: string) => {
    const v = values[step] ?? 'none'
    return dark ? darkShadow(v) : v
  }
  if (size === 'sm') {
    return <span className="block h-[14px] w-[14px] rounded-[4px] bg-elevated" style={{ boxShadow: pick('md') }} />
  }
  return (
    <span className="relative flex h-[30px] w-[44px] items-center justify-center rounded-[6px]" style={{ background: WELL }}>
      <span
        className="block h-[16px] w-[26px] -translate-y-[2px] rounded-[4px] bg-elevated"
        style={{ boxShadow: pick('xl'), outline: selected ? `1px solid ${ON}` : undefined }}
      />
    </span>
  )
}

/** A card at the mode's padding, holding a field at its height, drawn with its
 *  border width — the three values a Spacing mode sets, in one picture. */
export function SpacingModeGlyph({ fieldBase, insetPx, border, size = 'md', selected = false }: {
  fieldBase: number
  /** Card padding in px (the `inset-surface` step at the theme's base). */
  insetPx: number
  border: number
  size?: Size
  selected?: boolean
}) {
  const stroke = selected ? ON : INK
  if (size === 'sm') {
    return (
      <span className="flex h-[16px] w-[18px] flex-col justify-end rounded-[3px]" style={{ padding: Math.max(1, Math.round(insetPx / 8)), border: `${border}px solid ${stroke}` }}>
        <span className="block rounded-[1px] bg-fg/40" style={{ height: Math.round(fieldBase) }} />
      </span>
    )
  }
  // ~1/4 scale: a 40px field draws 10px, a 20px inset 5px.
  return (
    <span
      className="flex h-[30px] w-[44px] flex-col justify-end rounded-[5px]"
      style={{ padding: Math.round(insetPx / 4), border: `${border}px solid ${stroke}`, background: WELL }}
    >
      <span className="block rounded-[2px] bg-fg/35" style={{ height: Math.round((fieldBase * 10) / 4) }} />
    </span>
  )
}

import type { ArgTypes } from '@storybook/react-vite'
import { COMPONENT_ICONS, type ComponentIconName } from '../../../src/lib/iconLibraries'

/** The glyphs an icon slot can swap to — the component icon set the Figma file
 *  ships (`icon/<name>`), named as Figma's instance-swap menu names them
 *  (the Phosphor component: House, MagnifyingGlass…). */
export const ICON_SWAP_OPTIONS = COMPONENT_ICONS.map((i) => i.name) as ComponentIconName[]
const ICON_SWAP_LABELS = Object.fromEntries(
  COMPONENT_ICONS.map((i) => [i.name, i.slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')]),
) as Record<ComponentIconName, string>

/** An argType for an instance-swap property (`IconLeadingIcon`…). */
export function iconSwapArg(name: string): ArgTypes[string] {
  return { name, control: { type: 'select', labels: ICON_SWAP_LABELS }, options: ICON_SWAP_OPTIONS }
}

/** Icon px per Size: `icon.small` at xs / sm, `icon.medium` at default, `icon.large` at lg. */
export const ICON_PX: Record<string, number> = { xs: 16, sm: 16, default: 20, lg: 24 }

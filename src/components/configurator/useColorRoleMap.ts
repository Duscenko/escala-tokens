// The colour map's data, resolved once for the hub: the board's map and the
// rail's ramp legend both read it, so the two can never count differently.

import { useMemo } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { buildColorRoleMap, modeForAppearance, type ColorRoleMap } from '../../lib/colorRoleMap'
import type { ColorRoleId } from '../../lib/colorRoles'
import { resolveSystemRoles, type SystemRoles } from '../../lib/systemDashboard'
import { stylePreviewStore, type StylePreview } from '../../lib/stylePreviewOverlay'
import type { ThemeAppearance } from '../../lib/themeModes'

export interface ColorRoleMapData {
  /** The store the map reads — a try-on's overlay when one is on screen. */
  store: ReturnType<typeof useDesignStore.getState>
  roles: SystemRoles
  mode: string
  map: ColorRoleMap
}

/** Null while no colour is mapped: nothing is resolved for a closed map. */
export function useColorRoleMap(
  previewTheme: string,
  appearance: ThemeAppearance,
  stylePreview: StylePreview | null | undefined,
  colour: ColorRoleId | null,
): ColorRoleMapData | null {
  const baseStore = useDesignStore()
  const store = useMemo(
    () => (stylePreview ? stylePreviewStore(baseStore, stylePreview, previewTheme) : baseStore),
    [stylePreview, baseStore, previewTheme],
  )
  // Keyed on whether a map is open, not on which colour: switching colour
  // re-cuts the same resolved roles instead of resolving them again.
  const open = colour != null
  const roles = useMemo(
    () => (open ? resolveSystemRoles(store, previewTheme) : null),
    [open, store, previewTheme],
  )
  return useMemo(() => {
    if (!colour || !roles) return null
    const mode = modeForAppearance(roles, appearance)
    return { store, roles, mode, map: buildColorRoleMap(roles, colour, mode) }
  }, [colour, roles, appearance, store])
}

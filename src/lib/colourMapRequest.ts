// A one-shot request to open the Board on a colour's map (ColorRoleMapView),
// made from outside the board — System · Docs · Color's "See the colour map".
// The map's open state lives in ThemePreviewHub, which may not be mounted yet
// when the request is made, so the request is held until the hub takes it.

import type { ColorRoleId } from './colorRoles'

export const OPEN_COLOUR_MAP_EVENT = 'escala:open-colour-map'

let pending: ColorRoleId | null = null

/** Ask the board to open `colour`'s map (the hub takes it on mount, or now). */
export function requestColourMap(colour: ColorRoleId): void {
  pending = colour
  window.dispatchEvent(new CustomEvent(OPEN_COLOUR_MAP_EVENT))
}

/** The pending request, cleared once read. */
export function takeColourMapRequest(): ColorRoleId | null {
  const colour = pending
  pending = null
  return colour
}

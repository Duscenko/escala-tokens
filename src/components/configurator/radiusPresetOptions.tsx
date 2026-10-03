// The Radius preset dropdown's options — shared by the Variables rail and
// Theme preview's Radius edition, so the two read as one control. A preset is
// a bundle of the three axis picks on the standard ramp (RADIUS_ROLE_PRESETS),
// so each option shows what it gives: Boxes · Fields · Selectors in px, with
// the box corner drawn.

import { RADIUS_ROLE_PRESETS, radiusPresetPx } from '../../lib/layoutTokens'
import type { RailOption } from '../ui/RailSelect'

export function radiusPresetOptions(): RailOption<string>[] {
  return RADIUS_ROLE_PRESETS.map((p) => {
    const [boxes, fields, selectors] = radiusPresetPx(p)
    return {
      value: p.label,
      label: p.label,
      description: p.description,
      trailing: (
        <>
          <span aria-hidden className="w-3.5 h-3.5 border-t-[1.5px] border-r-[1.5px] border-current" style={{ borderTopRightRadius: `${Math.min(boxes / 2, 14)}px` }} />
          {boxes} · {fields} · {selectors}
        </>
      ),
    }
  })
}

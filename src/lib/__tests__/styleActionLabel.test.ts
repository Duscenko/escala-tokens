import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { apcaLc, labelOnSolidClears, wcagRatio } from '../color/apca'
import { resolvePreviewTokens } from '../previewTokens'
import { stylePreviewStore } from '../stylePreviewOverlay'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { setActiveThemeHint } from '../tokenGenerator'

// Every curated style's primary button must pass the owner's label rule in both
// modes (`labelOnSolidClears`: Light AA; Dark AA or perceived Lc 60). Glass's
// dark pin `{accent.9}` (#06aed4) clears it at 4.80:1, so it stays.
describe('system style primary action label', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
    setActiveThemeHint(null)
  })

  for (const preset of THEME_STYLE_PRESETS) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${preset.id} ${mode}: content.on-action passes on action.primary.default`, () => {
        const store = {
          ...stylePreviewStore(useDesignStore.getState(), { preset, appearance: mode }, mode),
          semanticArchitecture: 'categorical' as const,
        }
        const roles = resolvePreviewTokens(store, mode, mode, 'mobile').archTokens as Record<string, string>
        const ink = roles['content.on-action']
        const fill = roles['action.primary.default']
        expect(ink).toBeTruthy()
        expect(fill).toBeTruthy()
        // The owner's rule (2026-11-17): Light AA; Dark AA or perceived Lc 60.
        expect(labelOnSolidClears(ink, fill, mode), `${ink} on ${fill}: ${wcagRatio(ink, fill).toFixed(2)}:1, Lc ${apcaLc(ink, fill).toFixed(1)}`).toBe(true)
      })
    }
  }
})

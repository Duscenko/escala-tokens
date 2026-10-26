import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { evaluate } from '../color/apca'
import { resolvePreviewTokens } from '../previewTokens'
import { stylePreviewStore } from '../stylePreviewOverlay'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { setActiveThemeHint } from '../tokenGenerator'

// Every curated style's primary button must pass the project's one contrast
// check in both modes. Cupertino / Glass used to pin its dark fill to
// `{accent.9}` (#06aed4), past the `{accent.solid}` solver: no ink clears
// APCA Lc 60 on that cyan (4.80:1 but Lc 46), and the phone generator starts
// on Glass in dark, so it was the first button a phone visitor saw.
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
        const verdict = evaluate(ink, fill, 'action-label')
        expect(verdict.pass, `${ink} on ${fill}: ${verdict.wcag.toFixed(2)}:1, Lc ${verdict.apcaLc.toFixed(1)}`).toBe(true)
      })
    }
  }
})

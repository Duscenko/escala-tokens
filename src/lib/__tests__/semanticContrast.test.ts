import { describe, expect, it } from 'vitest'
import { buildArchitectureView } from '../semanticArchitectures'
import { makeDesignDefaults } from '../../store/useDesignStore'
import {
  auditCategoricalView,
  contrastStatusForToken,
  contrastStatusLabel,
} from '../semanticContrast'

describe('semanticContrast', () => {
  it('marks content.primary as passing on default categorical system', () => {
    const defaults = makeDesignDefaults()
    const view = buildArchitectureView('categorical', {
      themes: defaults.themes,
      scales: {
        gray: defaults.grayLightScale,
        grayDark: defaults.grayDarkScale,
        brand: defaults.primaryScale,
        error: defaults.errorScale,
        warning: defaults.warningScale,
        success: defaults.successScale,
        info: defaults.infoScale,
        dark: {
          gray: defaults.grayDarkScale,
          brand: defaults.primaryDarkScale,
          error: defaults.errorDarkScale,
          warning: defaults.warningDarkScale,
          success: defaults.successDarkScale,
          info: defaults.infoDarkScale,
        },
      },
      accent: defaults.primaryColor,
      pageBackground: defaults.pageBackground,
      darkBackground: defaults.darkBackground,
      themeKinds: defaults.themeKinds,
      themePalettes: {},
    }, defaults.errorColor)
    expect(view).not.toBeNull()
    const findings = auditCategoricalView(view!, 'test')
    const status = contrastStatusForToken('content.primary', findings)
    expect(status.status).toBe('pass')
    expect(status.wcag).toBeGreaterThan(4.5)
    expect(contrastStatusLabel(status)).toMatch(/^\d+\.\d:1$/)
    expect(contrastStatusLabel({ status: 'none', title: 'No contrast pair to measure', wcag: null })).toBe('—')
  })
})

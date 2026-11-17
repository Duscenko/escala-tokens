import { describe, expect, it } from 'vitest'
import { BRAND_LOGOS } from '../../components/escala-ui/brandLogos'
import { SOCIAL_BRANDS_LIST } from '../../components/escala-ui/social-login-button'

// The provider marks are the Figma file's `logo/<Brand>` components (page ® Logos), copied
// verbatim: every SocialLoginButton brand has both versions, and the mono one is painted
// only in role colours (the label's ink, Dribbble's inner lines on Content/primary).
describe('brand logos from the Figma file', () => {
  for (const brand of SOCIAL_BRANDS_LIST) {
    it(`${brand} has a colored and a mono logo`, () => {
      const logo = BRAND_LOGOS[brand.toLowerCase()]
      expect(logo, brand).toBeTruthy()
      expect(logo.colored.length).toBeGreaterThan(0)
      expect(logo.mono.length).toBeGreaterThan(0)
      for (const p of logo.mono) expect(['ink', 'primary']).toContain(p.fill)
      for (const p of [...logo.colored, ...logo.mono]) expect(Boolean(p.d) || Boolean(p.circle)).toBe(true)
    })
  }
  it('keeps the brand colours of the colored logos', () => {
    expect(BRAND_LOGOS.google.colored.map((p) => p.fill)).toEqual(['#4285F4', '#34A853', '#FBBC04', '#EA4335'])
    expect(BRAND_LOGOS.slack.colored.map((p) => p.fill)).toEqual(['#2EB67D', '#E01E5A', '#ECB22E', '#36C5F0'])
    expect(BRAND_LOGOS.facebook.colored[0].fill).toBe('#0866FF')
    expect(BRAND_LOGOS.linkedin.colored[0].fill).toBe('#0A66C2')
  })
})

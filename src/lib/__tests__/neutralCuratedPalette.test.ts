import { describe, expect, it } from 'vitest'
import chroma from 'chroma-js'
import { neutralCuratedPalette, neutralHueAnchorFromSpectrum } from '../colorUtils'

describe('neutralCuratedPalette', () => {
  it('shifts undertone when the spectrum hue moves', () => {
    const violet = neutralCuratedPalette(neutralHueAnchorFromSpectrum(280))
    const blue = neutralCuratedPalette(neutralHueAnchorFromSpectrum(230))
    const violetHue = chroma(violet[0].hex).get('hsl.h') as number
    const blueHue = chroma(blue[0].hex).get('hsl.h') as number
    expect(Math.abs(blueHue - violetHue)).toBeGreaterThan(20)
  })
})

import { describe, expect, it } from 'vitest'
import { useDesignStore } from '../../store/useDesignStore'
import { buildCSS, buildMarkdown } from '../exporters'
import { generateTokenJSON } from '../tokenGenerator'
import { buildFoundationsMd } from '../agentBundle/markdownFromJson'
import { motionPresetPatch } from '../motion'
import type { TokenJSON } from '../agentBundle/types'

describe('motion in the shipped files', () => {
  it('a fresh system ships Standard in tokens.json, CSS, README and agent context', () => {
    const json = generateTokenJSON() as unknown as TokenJSON & { motion: { preset: string; roles: Record<string, { value: string }> } }
    expect(json.motion.preset).toBe('standard')
    expect(json.motion.roles['use-hover'].value).toBe('100ms cubic-bezier(0.45, 0.05, 0.25, 0.95)')

    const css = buildCSS(useDesignStore.getState())
    const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')))
    expect(root).toContain('--motion-use-hover: var(--motion-duration-quick) var(--motion-easing-standard);')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('@keyframes motion-pop')

    expect(buildMarkdown(useDesignStore.getState())).toContain('## Motion')
    expect(buildFoundationsMd(json)).toContain('`var(--motion-use-overlay-in)`')
  })

  it('applying a preset changes what ships', () => {
    const before = useDesignStore.getState().motion
    useDesignStore.getState().setMotion(motionPresetPatch('snappy'))
    try {
      const json = generateTokenJSON() as unknown as { motion: { preset: string; durations: Record<string, string> } }
      expect(json.motion.preset).toBe('snappy')
      expect(json.motion.durations.quick).toBe('75ms')
      expect(buildCSS(useDesignStore.getState())).toContain('--motion-duration-quick: 75ms;')
    } finally {
      useDesignStore.getState().setMotion(before)
    }
  })
})

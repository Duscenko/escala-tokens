import { describe, expect, it } from 'vitest'
import { COMPONENTS } from '../componentCatalogue'
import { agentContextMarkdown, type AgentFoundationTokens } from '../agentContext'

const otp = COMPONENTS.find((c) => c.key === 'InputOTP')!

const TOKENS: AgentFoundationTokens = {
  radius: { none: '0px', sm: '8px', md: '16px', lg: '24px', full: '9999px' },
  spacing: { '1': '4px', '2': '8px', '3': '12px', '4': '16px' },
  sizes: { xs: '24px', sm: '32px', md: '40px', lg: '48px', xl: '56px', '2xl': '64px' },
  padding: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
  typography: {
    fontFamily: 'Inter',
    sizes: { 'text-md': '16px', 'text-lg': '18px', 'text-xl': '20px' },
    weights: { semibold: 600, medium: 500 },
  },
}

describe('agentContextMarkdown', () => {
  it('Input OTP carries live tokens and the Figma/CSS recipe', () => {
    const md = agentContextMarkdown(otp, '<InputOTP length={6} onComplete={verify} />', TOKENS)
    expect(md).toContain('figma_sets: Input OTP')
    expect(md).toContain('Component set name: `Input OTP`')
    expect(md).toContain('`--radius-md`')
    expect(md).toContain('`16px`')
    expect(md).toContain('`--padding-top`')
    expect(md).toContain('`var(--size-lg)`')
    expect(md).toContain('border-radius: var(--radius-md)')
    expect(md).toContain('Border/focus')
    expect(md).toContain('Border/critical')
    expect(md).toContain('Surface/input')
    expect(md).toContain('border.focus')
    expect(md).toContain('treat Size SM/MD/LG as `Size/sm`')
    expect(md).toContain('var(--color-border-critical)')
  })

  it('other components get live token tables, not the OTP spec', () => {
    const button = COMPONENTS.find((c) => c.key === 'Button')!
    const md = agentContextMarkdown(button, '<Button />', TOKENS)
    expect(md).toContain('figma_sets: Button')
    expect(md).toContain('### Variant properties')
    expect(md).toContain('`--radius-md`')
    expect(md).toContain('`--size-md`')
    expect(md).toContain('var(--size-md)')
    expect(md).not.toContain('Reconstruct the set')
    expect(md).not.toContain('Border/critical')
  })
})

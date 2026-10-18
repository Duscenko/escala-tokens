import { describe, expect, it } from 'vitest'
import { COMPONENTS, type ComponentDef } from '../componentCatalogue'
import { agentContextMarkdown, type AgentFoundationTokens } from '../agentContext'
import { COMPONENT_RECIPES } from '../componentRecipes'

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
  // Color fields — the exact PreviewTokens shape ComponentArticle passes
  // through in the real app (structurally, since `AgentFoundationTokens`
  // is a subset of `PreviewTokens`).
  brandSolid: '#7f56d9',
  onBrand: '#ffffff',
  neutralText: '#101828',
  errorColor: '#f04438',
  disabledBg: '#f5f5f5',
  disabledText: '#a4a7ae',
  successColor: '#17b26a',
  warningColor: '#f79009',
  infoColor: '#2e90fa',
}

describe('agentContextMarkdown', () => {
  it('Input OTP carries live tokens and the Figma/CSS recipe', () => {
    const md = agentContextMarkdown(otp, '<InputOTP length={6} onComplete={verify} />', TOKENS)
    expect(md).toContain('figma_sets: Input OTP')
    expect(md).toContain('Component set name: `Input OTP`')
    expect(md).toContain('`--radius-md`')
    expect(md).toContain('`--radius-lg`')
    expect(md).toContain('`16px`')
    expect(md).toContain('`--padding-top`')
    expect(md).toContain('`var(--size-md)`')
    expect(md).toContain('border-radius: var(--radius-action)')
    expect(md).toContain('var(--stroke-control)')
    expect(md).toContain('var(--stroke-focus)')
    expect(md).toContain('Border/focus')
    expect(md).toContain('Status/critical/border-strong')
    expect(md).toContain('Surface/input')
    expect(md).toContain('border.focus')
    expect(md).toContain('map onto `Size/sm`')
    expect(md).toContain('var(--color-status-critical-border-strong)')
    expect(md).not.toContain('1.5px')
  })

  it('other components get live token tables, not the OTP spec', () => {
    const button = COMPONENTS.find((c) => c.key === 'Button')!
    const md = agentContextMarkdown(button, '<Button />', TOKENS)
    expect(md).toContain('figma_sets: Button')
    expect(md).toContain('### Variant properties')
    expect(md).toContain('`--radius-md`')
    expect(md).toContain('`--size-md`')
    expect(md).toContain('var(--size-md)')
    expect(md).toContain('var(--radius-action)')
    expect(md).toContain('var(--stroke-control)')
    expect(md).not.toContain('Reconstruct the set')
    expect(md).not.toContain('Border/critical')
  })

  it('a recipe component lists its tokens by part, with the live role colour', () => {
    const button = COMPONENTS.find((c) => c.key === 'Button')!
    const md = agentContextMarkdown(button, '<Button />', { ...TOKENS, archTokens: { 'action.primary.default': '#7f56d9' } })
    expect(md).toContain('### Tokens by part (the component recipe)')
    expect(md).toContain('| root | fill | `color.action.primary.default` | `--color-action-primary-default` | `Action/primary/default` | `#7f56d9` |')
    expect(md).toContain('`color.content.on-action`')
    expect(md).toContain('`--size-control`')
    expect(md).not.toContain('### Color (scoped to this component)')
  })

  it('falls back to the full palette when a component has no scoped color map', () => {
    const notScoped: ComponentDef = { ...otp, key: 'NotInSpecimensRegistry' }
    const md = agentContextMarkdown(notScoped, '<Foo />', TOKENS)
    expect(md).toContain('### Color (`Color` collection)')
    expect(md).not.toContain('### Color (scoped to this component)')
    // A real resolved declaration from the full CSS excerpt — `--color-<key>: #……`.
    expect(md).toMatch(/--color-[\w-]+:\s*#[0-9a-fA-F]{3,8};/)
  })

  it('has no color section when no tokens are supplied (nothing live to resolve)', () => {
    const button = COMPONENTS.find((c) => c.key === 'Button')!
    const md = agentContextMarkdown(button, '<Button />')
    expect(md).not.toContain('### Color (`Color` collection)')
    expect(md).not.toContain('### Color (scoped to this component)')
  })
})

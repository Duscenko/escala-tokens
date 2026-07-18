import { type CSSProperties } from 'react'
import { resolvePx, type PreviewTokens } from '../ButtonPreview'
import { radiusOf, fontFamilyOf, weightOf, paddingOf, shadowOf, sizeOf } from '../../../lib/previewTokens'
import { InputPreview } from './InputPreview'

// A composed sign-up card: title + two inputs + a full-width primary CTA. Every
// surface, border, radius, weight and the accent fill come from the user's
// tokens, so editing Foundations updates this card live.
export function SignUpCardPreview({ tokens }: { tokens: PreviewTokens }) {
  const family = fontFamilyOf(tokens)
  const fgMuted = tokens.fgMuted || '#717680'

  // Mirrors the catalogue's ButtonSpecimen (Solid · MD): height from the Sizes
  // foundation, 18px inset, radius-md, 14px semibold — the CTA is that button.
  const cta: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: sizeOf(tokens, 'md', 40),
    background: tokens.brandSolid,
    color: tokens.onBrand,
    border: 'none',
    borderRadius: radiusOf(tokens, 'md', '8px'),
    padding: '0 18px',
    fontFamily: family,
    fontSize: resolvePx(tokens.typography?.sizes, 'text-sm', 14),
    fontWeight: weightOf(tokens, 'semibold', 600),
    cursor: 'pointer',
  }

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        background: tokens.surface,
        border: `1px solid ${tokens.borderDefault || tokens.border || '#eaecf0'}`,
        borderRadius: radiusOf(tokens, 'lg', '12px'),
        padding: paddingOf(tokens),
        boxShadow: shadowOf(tokens, 'sm', 'none'),
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: family,
      }}
    >
      <div className="flex flex-col gap-1">
        <h3
          style={{
            margin: 0,
            fontFamily: family,
            fontSize: resolvePx(tokens.typography?.sizes, 'display-xs', 24),
            fontWeight: weightOf(tokens, 'bold', 700),
            color: tokens.neutralText,
            lineHeight: 1.2,
          }}
        >
          Sign up
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: fgMuted }}>Start your 30-day free trial.</p>
      </div>

      <InputPreview tokens={tokens} label="Email" placeholder="Enter your email" type="email" />

      <div className="flex flex-col gap-1.5">
        <InputPreview tokens={tokens} label="Password" placeholder="Create a password" type="password" />
        <span style={{ fontSize: 11, color: fgMuted }}>Must be at least 8 characters.</span>
      </div>

      <button type="button" style={cta}>
        Get started
      </button>

      <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: fgMuted }}>
        Already have an account?{' '}
        <span style={{ color: tokens.brandText, fontWeight: weightOf(tokens, 'medium', 500) }}>Log in</span>
      </p>
    </div>
  )
}

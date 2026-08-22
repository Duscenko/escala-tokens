import { type CSSProperties } from 'react'
import { type PreviewTokens } from '../ButtonPreview'
import { radiusOf, paddingOf, shadowOf, sizeOf, typeStyleOf } from '../../../lib/previewTokens'
import { InputPreview } from './InputPreview'

// A composed sign-up card: title + two inputs + a full-width primary CTA. Every
// surface, border, radius, and text role come from the user's tokens, so
// editing Foundations (including Typography · Semantics) updates this card live.
export function SignUpCardPreview({ tokens }: { tokens: PreviewTokens }) {
  const fgMuted = tokens.fgMuted || '#717680'

  // Mirrors the catalogue's ButtonSpecimen (Solid · MD): height from the Sizes
  // foundation, 18px inset, radius-md — type from the `button` text role.
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
    ...typeStyleOf(tokens, 'button', { leading: false }),
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
        ...typeStyleOf(tokens, 'body-md', { leading: false }),
      }}
    >
      <div className="flex flex-col gap-1">
        <h3
          style={{
            margin: 0,
            ...typeStyleOf(tokens, 'heading-sm'),
            color: tokens.neutralText,
          }}
        >
          Sign up
        </h3>
        <p style={{ margin: 0, ...typeStyleOf(tokens, 'body-sm', { leading: true }), color: fgMuted }}>
          Start your 30-day free trial.
        </p>
      </div>

      <InputPreview tokens={tokens} label="Email" placeholder="Enter your email" type="email" />

      <div className="flex flex-col gap-1.5">
        <InputPreview tokens={tokens} label="Password" placeholder="Create a password" type="password" />
        <span style={{ ...typeStyleOf(tokens, 'helper', { leading: false }), color: fgMuted }}>
          Must be at least 8 characters.
        </span>
      </div>

      <button type="button" style={cta}>
        Get started
      </button>

      <p style={{ margin: 0, textAlign: 'center', ...typeStyleOf(tokens, 'body-sm', { leading: true }), color: fgMuted }}>
        Already have an account?{' '}
        <span style={{ color: tokens.brandText, ...typeStyleOf(tokens, 'button', { leading: false }) }}>Log in</span>
      </p>
    </div>
  )
}

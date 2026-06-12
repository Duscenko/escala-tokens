import { useState, type CSSProperties } from 'react'
import chroma from 'chroma-js'
import { resolvePx, type PreviewTokens } from '../ButtonPreview'
import { radiusOf, fontFamilyOf, weightOf } from '../../../lib/previewTokens'

// A single labelled text field, fully driven by the user's tokens (radius,
// border color, brand focus ring, type scale & weights). It's a real <input>
// so the focus ring is genuine — a nice live detail in the preview.
export interface InputPreviewProps {
  tokens: PreviewTokens
  label?: string
  placeholder?: string
  type?: string
}

export function InputPreview({ tokens, label, placeholder, type = 'text' }: InputPreviewProps) {
  const [focused, setFocused] = useState(false)
  const family = fontFamilyOf(tokens)
  const fontSize = resolvePx(tokens.typography?.sizes, 'text-sm', 14)
  const border = tokens.border || '#d0d5dd'

  const field: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: family,
    fontSize,
    color: tokens.neutralText,
    background: tokens.surface,
    border: `1px solid ${focused ? tokens.brandSolid : border}`,
    borderRadius: radiusOf(tokens, 'md', '8px'),
    padding: '9px 12px',
    outline: 'none',
    boxShadow: focused ? `0 0 0 3px ${chroma(tokens.brandSolid).alpha(0.18).css()}` : 'none',
    transition: 'box-shadow .15s, border-color .15s',
  }

  return (
    <label className="flex flex-col gap-1.5 w-full">
      {label && (
        <span style={{ fontFamily: family, fontSize: 13, fontWeight: weightOf(tokens, 'medium', 500), color: tokens.neutralText }}>
          {label}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        style={field}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </label>
  )
}

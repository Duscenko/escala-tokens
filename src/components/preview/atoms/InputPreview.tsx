import { useState, type CSSProperties } from 'react'
import { type PreviewTokens } from '../ButtonPreview'
import { radiusOf, typeStyleOf } from '../../../lib/previewTokens'

// A single labelled text field, fully driven by the user's tokens (radius,
// border color, brand focus ring, text roles). It's a real <input>
// so the focus ring is genuine — a nice live detail in the preview.
export interface InputPreviewProps {
  tokens: PreviewTokens
  label?: string
  placeholder?: string
  type?: string
}

export function InputPreview({ tokens, label, placeholder, type = 'text' }: InputPreviewProps) {
  const [focused, setFocused] = useState(false)
  const border = tokens.border || '#d0d5dd'

  // Metrics mirror the catalogue's InputSpecimen (MD): 40px control height,
  // 12px horizontal inset, `accent`26 focus glow — type comes from text roles
  // (`label` / `placeholder`) so Semantics retunes this field live.
  const field: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    height: 40,
    ...typeStyleOf(tokens, 'placeholder', { leading: false }),
    color: tokens.neutralText,
    background: tokens.surface,
    border: `1px solid ${focused ? tokens.brandSolid : border}`,
    borderRadius: radiusOf(tokens, 'md', '8px'),
    padding: '0 12px',
    outline: 'none',
    boxShadow: focused ? `0 0 0 3px ${tokens.brandSolid}26` : 'none',
    transition: 'box-shadow .15s, border-color .15s',
  }

  return (
    <label className="flex flex-col gap-1.5 w-full">
      {label && (
        <span style={{ ...typeStyleOf(tokens, 'label', { leading: false }), color: tokens.neutralText }}>
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

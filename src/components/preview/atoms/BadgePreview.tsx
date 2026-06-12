import { type CSSProperties } from 'react'
import chroma from 'chroma-js'
import { type PreviewTokens } from '../ButtonPreview'
import { radiusOf, fontFamilyOf, weightOf } from '../../../lib/previewTokens'

// Three badge emphases rendered from the user's brand color + radius: a solid
// fill, a soft tint, and an outline. Mirrors the reference's badge row.
export function BadgePreview({ tokens }: { tokens: PreviewTokens }) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: fontFamilyOf(tokens),
    fontSize: 12,
    fontWeight: weightOf(tokens, 'medium', 500),
    lineHeight: 1.4,
    padding: '2px 10px',
    borderRadius: radiusOf(tokens, 'full', '9999px'),
    whiteSpace: 'nowrap',
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span style={{ ...base, background: tokens.brandSolid, color: tokens.onBrand }}>Badge</span>
      <span style={{ ...base, background: chroma(tokens.brandSolid).alpha(0.12).css(), color: tokens.brandText }}>
        Soft
      </span>
      <span style={{ ...base, border: `1px solid ${tokens.border || '#d0d5dd'}`, color: tokens.neutralText }}>
        Outline
      </span>
    </div>
  )
}

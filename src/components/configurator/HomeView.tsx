// Home — an introductory collage of the system's own components, rendered live
// from the user's tokens (createui-style hub). Pick an accent/neutral right
// here or jump into Foundations · Color to customize properly. Everything
// about saving/connections/sharing moved to the Save hub (SaveView).

import { useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { usePreviewTokens, radiusOf, fontFamilyOf, weightOf, shadowOf, alphaOf, tintOf, paddingOf } from '../../lib/previewTokens'
import { withAlpha, NAMING_SCHEMES } from '../../lib/colorUtils'
import { useApplyAccentColor, useApplyGrayColor, useApplyPageBackground } from '../../lib/colorActions'
import {
  ColorSelect, ScaleRow, InfoDot, LinkToggle, neutralFromBrand,
  BRAND_GROUPS, NEUTRAL_GROUPS, BACKGROUND_GROUPS, type OptionGroup,
} from './colorControls'
import { ColorControls, ScaleSettingsModal } from './Step2_ColorPalette'
import { SPECIMENS, TokenIcon, type IconConcept } from './docs/specimens'
import { SignUpCardPreview } from '../preview/atoms/SignUpCardPreview'
import type { PreviewTokens } from '../preview/ButtonPreview'

interface HomeViewProps {
  /** Navigates to a foundation section, or the catalogue for 'components'. */
  onOpenFoundation: (key: string) => void
  /** Theme the collage renders in — driven by the Quick edit panel. */
  previewTheme?: string
}

// ── Small token-driven helpers (collage-only micro specimens) ────────────────

// Soft tint reads the Opacity foundation's 10 step (same rule as specimens.tsx),
// so soft fills track the user's transparency scale.
function soft(t: PreviewTokens, hex: string): string {
  return tintOf(t, hex, '10', 0.12)
}

function Switch({ t, on, label }: { t: PreviewTokens; on: boolean; label: string }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      aria-label={label}
      style={{
        width: 36, height: 20, borderRadius: 999, position: 'relative', flexShrink: 0,
        background: on ? t.brandSolid : t.neutralFill,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16,
          borderRadius: 999, background: t.surface, boxShadow: shadowOf(t, 'xs', '0 1px 2px rgba(10,13,18,0.2)'),
        }}
      />
    </span>
  )
}

function ToggleRow({ t, on, label }: { t: PreviewTokens; on: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 13, color: t.neutralText }}>{label}</span>
      <Switch t={t} on={on} label={label} />
    </div>
  )
}

function UpgradeCard({ t }: { t: PreviewTokens }) {
  const btn: CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 14px', textAlign: 'center',
    borderRadius: radiusOf(t, 'md', '8px'), fontSize: 13, fontWeight: weightOf(t, 'semibold', 600),
    cursor: 'pointer',
  }
  return (
    <div style={{ fontFamily: fontFamilyOf(t), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
      <span
        style={{
          width: 44, height: 44, borderRadius: radiusOf(t, 'lg', '12px'),
          background: soft(t, t.brandSolid), color: t.brandText,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <TokenIcon t={t} concept="zap" size={20} color={t.brandText} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: weightOf(t, 'semibold', 600), color: t.neutralText }}>Upgrade to Pro</span>
        <span style={{ fontSize: 12, color: t.fgMuted }}>Unlock advanced pro components.</span>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ ...btn, background: t.brandSolid, color: t.onBrand }}>Upgrade Now</span>
        <span style={{ ...btn, background: soft(t, t.brandSolid), color: t.brandText }}>Compare Plans</span>
      </div>
    </div>
  )
}

function AvatarStack({ t }: { t: PreviewTokens }) {
  const initials = ['MD', 'AK', 'JT', '+4']
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {initials.map((n, i) => (
        <span
          key={n}
          style={{
            width: 32, height: 32, borderRadius: 999, marginLeft: i === 0 ? 0 : -8,
            background: i === initials.length - 1 ? t.neutralText : soft(t, t.brandSolid),
            color: i === initials.length - 1 ? t.surface : t.brandText,
            border: `2px solid ${t.surface}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: weightOf(t, 'semibold', 600),
            fontFamily: fontFamilyOf(t),
          }}
        >
          {n}
        </span>
      ))}
    </div>
  )
}

// Blockquote text pattern — brand flavor colors the key words from text-brand;
// muted flavor tones everything down and lets emphasis carry the hierarchy.
function QuoteBlock({ t, muted = false }: { t: PreviewTokens; muted?: boolean }) {
  const em: CSSProperties = muted
    ? { color: t.neutralText }
    : { color: t.brandText, fontWeight: weightOf(t, 'medium', 500) }
  return (
    <blockquote
      style={{
        margin: 0, paddingLeft: 14,
        borderLeft: `3px solid ${muted ? (t.borderDefault ?? '#e9eaeb') : t.brandSolid}`,
        fontSize: 13.5, lineHeight: 1.65, color: t.fgMuted, fontFamily: fontFamilyOf(t),
      }}
    >
      Great systems live in the details — the <span style={em}>color</span>,{' '}
      <span style={em}>type</span> and <span style={em}>spacing</span> decisions that compose
      into every <span style={em}>component</span> you ship.
    </blockquote>
  )
}

function TodoItem({ t, done, children }: { t: PreviewTokens; done?: boolean; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        aria-hidden
        style={{
          width: 18, height: 18, flexShrink: 0, borderRadius: radiusOf(t, 'sm', '4px'),
          background: done ? t.brandSolid : t.surface,
          border: done ? `1px solid ${t.brandSolid}` : `1.5px solid ${t.border}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {done && <TokenIcon t={t} concept="check" size={12} color={t.onBrand} />}
      </span>
      <span
        style={{
          fontSize: 13,
          color: done ? t.fgMuted : t.neutralText,
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {children}
      </span>
    </div>
  )
}

// Translucent panel demo — a glass card floating over a gradient of the accent,
// showing how surfaces read with alpha + backdrop blur (Radix panelBackground).
function GlassPanel({ t }: { t: PreviewTokens }) {
  const glass: CSSProperties = {
    background: withAlpha(t.surface, 0.6),
    backdropFilter: 'blur(14px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
    border: `1px solid ${withAlpha(t.surface, 0.7)}`,
  }
  return (
    <div
      className="break-inside-avoid mb-4 overflow-hidden"
      style={{
        borderRadius: radiusOf(t, 'lg', '12px'),
        border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`,
        padding: paddingOf(t),
        background: `linear-gradient(135deg, ${withAlpha(t.brandSolid, 0.18)} 0%, ${withAlpha(t.brandSolid, 0.6)} 55%, ${t.brandSolid} 120%), ${t.surface}`,
        display: 'flex', flexDirection: 'column', gap: 12,
        fontFamily: fontFamilyOf(t),
      }}
    >
      <div
        style={{
          ...glass,
          borderRadius: radiusOf(t, 'md', '8px'),
          boxShadow: shadowOf(t, 'lg', '0 8px 24px rgba(10,13,18,0.12)'),
          padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 34, height: 34, borderRadius: 999, flexShrink: 0,
              background: soft(t, t.brandSolid), color: t.brandText,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <TokenIcon t={t} concept="zap" size={15} color={t.brandText} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: weightOf(t, 'semibold', 600), color: t.neutralText }}>Tokens published</span>
            <span style={{ fontSize: 12, color: t.fgMuted }}>2 min ago · synced to Figma</span>
          </div>
        </div>
        <span
          style={{
            ...glass,
            boxSizing: 'border-box', width: '100%', padding: '8px 12px', textAlign: 'center',
            borderRadius: radiusOf(t, 'md', '8px'), fontSize: 12.5,
            fontWeight: weightOf(t, 'semibold', 600), color: t.neutralText, cursor: 'pointer',
          }}
        >
          View in Figma
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['24 colors', '9 foundations'].map((label) => (
          <span
            key={label}
            style={{
              ...glass, padding: '5px 12px', borderRadius: 999,
              fontSize: 11.5, fontWeight: weightOf(t, 'medium', 500), color: t.neutralText,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// Layers panel cluster — search + submit, an info banner, and a tree list with
// a soft-brand selected row (object-browser pattern). Glyphs resolve from the
// Foundations · Icons library via TokenIcon.
function LayerRow({ t, icon, label, selected, indent }: { t: PreviewTokens; icon: IconConcept; label: string; selected?: boolean; indent?: boolean }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', paddingLeft: indent ? 32 : 10,
        borderRadius: radiusOf(t, 'sm', '4px'),
        background: selected ? soft(t, t.brandSolid) : 'transparent',
      }}
    >
      <TokenIcon t={t} concept={icon} size={15} color={selected ? t.brandText : (t.fgMuted ?? t.neutralText)} />
      <span style={{ fontSize: 13, color: t.neutralText, fontWeight: selected ? weightOf(t, 'medium', 500) : 400 }}>{label}</span>
    </div>
  )
}

function SearchRow({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span
        style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: radiusOf(t, 'md', '8px'),
          border: `1px solid ${t.border}`, background: t.surface,
        }}
      >
        <TokenIcon t={t} concept="search" size={14} color={t.fgMuted ?? t.neutralText} />
        <span style={{ fontSize: 13, color: t.placeholderText }}>Search</span>
      </span>
      <span
        style={{
          padding: '8px 16px', borderRadius: radiusOf(t, 'md', '8px'),
          background: t.brandSolid, color: t.onBrand,
          fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center',
        }}
      >
        Submit
      </span>
    </div>
  )
}

function InfoBanner({ t }: { t: PreviewTokens }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px',
        borderRadius: radiusOf(t, 'md', '8px'), background: soft(t, t.brandSolid), color: t.brandText,
      }}
    >
      <TokenIcon t={t} concept="info" size={15} color={t.brandText} />
      <span style={{ fontSize: 12.5, fontWeight: weightOf(t, 'medium', 500) }}>A new version is available.</span>
    </div>
  )
}

// Building blocks — outline pills, icon-button variants and round avatars in
// solid / soft flavors, all from the same accent. Glyphs come from the
// Foundations · Icons library via TokenIcon.
function IconButton({ t, icon, variant }: { t: PreviewTokens; icon: IconConcept; variant: 'solid' | 'soft' | 'outline' }) {
  const styles: Record<typeof variant, CSSProperties> = {
    solid: { background: t.brandSolid, color: t.onBrand },
    soft: { background: soft(t, t.brandSolid), color: t.brandText },
    outline: { background: t.surface, color: t.brandText, border: `1px solid ${t.borderDefault ?? '#e9eaeb'}` },
  }
  return (
    <span
      style={{
        width: 36, height: 36, borderRadius: radiusOf(t, 'md', '8px'), flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        ...styles[variant],
      }}
    >
      <TokenIcon t={t} concept={icon} size={15} color={variant === 'solid' ? t.onBrand : t.brandText} />
    </span>
  )
}

function Pill({ t, children, outline }: { t: PreviewTokens; children: ReactNode; outline?: boolean }) {
  return (
    <span
      style={{
        padding: '4px 12px', borderRadius: 999, fontSize: 12,
        fontWeight: weightOf(t, 'medium', 500), color: t.brandText, whiteSpace: 'nowrap',
        background: outline ? 'transparent' : soft(t, t.brandSolid),
        border: outline ? `1px solid ${withAlpha(t.brandSolid, alphaOf(t, '40', 0.45))}` : '1px solid transparent',
      }}
    >
      {children}
    </span>
  )
}

function AvatarRound({ t, flavor, children }: { t: PreviewTokens; flavor: 'solid' | 'soft'; children: ReactNode }) {
  return (
    <span
      style={{
        width: 40, height: 40, borderRadius: 999, flexShrink: 0,
        background: flavor === 'solid' ? t.brandSolid : soft(t, t.brandSolid),
        color: flavor === 'solid' ? t.onBrand : t.brandText,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: weightOf(t, 'semibold', 600),
      }}
    >
      {children}
    </span>
  )
}

function AvatarGridRow({ t, flavor }: { t: PreviewTokens; flavor: 'solid' | 'soft' }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <AvatarRound t={t} flavor={flavor}>V</AvatarRound>
      <AvatarRound t={t} flavor={flavor}>BG</AvatarRound>
      <AvatarRound t={t} flavor={flavor}>
        <TokenIcon t={t} concept="user" size={16} color={flavor === 'solid' ? t.onBrand : t.brandText} />
      </AvatarRound>
      <AvatarRound t={t} flavor={flavor}>
        <TokenIcon t={t} concept="users" size={16} color={flavor === 'solid' ? t.onBrand : t.brandText} />
      </AvatarRound>
    </div>
  )
}

// One collage tile — a token-driven surface (not app chrome), so background,
// border and padding come from the resolved tokens rather than the semantic
// utilities.
function Tile({ t, children }: { t: PreviewTokens; children: ReactNode }) {
  return (
    <div
      className="break-inside-avoid mb-4 overflow-hidden"
      style={{
        background: t.surface,
        border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`,
        borderRadius: radiusOf(t, 'lg', '12px'),
        padding: paddingOf(t),
        boxShadow: shadowOf(t, 'sm', 'none'),
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {children}
    </div>
  )
}

export default function HomeView({ onOpenFoundation, previewTheme = 'light' }: HomeViewProps) {
  const {
    projectName, setProjectName, githubRepo,
    primaryColor, primaryScale, grayBaseColor, grayLightScale,
    pageBackground,
    customColors, removeCustomColor,
    colorAlgorithm, colorNaming, contrastShift,
    setColorAlgorithm, setColorNaming, setContrastShift,
  } = useDesignStore()
  const t = usePreviewTokens(previewTheme)
  const applyAccentColor = useApplyAccentColor()
  const applyGrayColor = useApplyGrayColor()
  // Background changes must re-anchor every ramp + resync semantics — never a
  // bare setPageBackground (that leaves scales anchored to the old background).
  const applyPageBackground = useApplyPageBackground()

  // When ON, the neutral scale auto-derives from the accent. Default ON.
  const [linked, setLinked] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Saved customs surface in both dropdowns ahead of the Tested presets.
  const savedGroup: OptionGroup | null = customColors.length
    ? {
        label: 'Saved',
        options: customColors.map((c) => ({ label: c.label, hex: c.base })),
        onRemove: (hex) => {
          const match = customColors.find((c) => c.base.toLowerCase() === hex.toLowerCase())
          if (match) removeCustomColor(match.key)
        },
      }
    : null
  const brandGroups = savedGroup ? [savedGroup, ...BRAND_GROUPS] : BRAND_GROUPS
  const neutralGroups = savedGroup ? [savedGroup, ...NEUTRAL_GROUPS] : NEUTRAL_GROUPS

  const namingLabels = (NAMING_SCHEMES.find((s) => s.key === colorNaming) ?? NAMING_SCHEMES[0]).labels

  const changeAccent = (hex: string) => applyAccentColor(hex, linked, previewTheme)
  const changeNeutral = (hex: string) => applyGrayColor(hex, previewTheme)
  const toggleLink = () => {
    const next = !linked
    setLinked(next)
    if (next) applyGrayColor(neutralFromBrand(primaryColor), previewTheme)
  }

  const v = {} // default axis values for the registry specimens

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* ── Name + saved state — appears once the system is saved to GitHub ── */}
      {githubRepo && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-line bg-surface">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Name Design system"
            aria-label="Design system name"
            className="flex-1 min-w-0 bg-transparent text-lg font-semibold text-fg outline-none placeholder:text-fg-faint"
          />
          <span
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: t.brandSolid }}
          >
            Saved
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
          </span>
        </div>
      )}

      {/* ── Primitives quick bar: accent · link · neutral · background + ramps ── */}
      <section className="flex flex-col gap-5 pb-6 border-b border-line">
        <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-3 items-end">
          <ColorSelect label="Accent Color" value={primaryColor} groups={brandGroups} onChange={changeAccent} allowCustom />
          <div className="flex flex-col items-center gap-1.5 pb-1.5">
            <InfoDot tip="Auto-matches the neutral scale to your accent color." />
            <LinkToggle active={linked} onClick={toggleLink} />
          </div>
          <ColorSelect label="Neutral" value={grayBaseColor} groups={neutralGroups} onChange={changeNeutral} allowCustom />
          <ColorSelect label="Background" value={pageBackground} groups={BACKGROUND_GROUPS} onChange={applyPageBackground} allowCustom />
          <div className="relative pb-0.5">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              aria-label="Scale settings — algorithm, naming, contrast shift"
              title="Scale settings"
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
                settingsOpen ? 'bg-elevated border-line-strong text-fg' : 'border-line-strong bg-surface text-fg-muted hover:text-fg hover:border-fg-faint'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
            <ScaleSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
              <ColorControls
                algorithm={colorAlgorithm}
                naming={colorNaming}
                contrastShift={contrastShift}
                onAlgorithm={setColorAlgorithm}
                onNaming={setColorNaming}
                onShift={setContrastShift}
              />
            </ScaleSettingsModal>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <ScaleRow scale={primaryScale} labels={namingLabels} />
          <ScaleRow scale={grayLightScale} showNumbers={false} />
        </div>
      </section>

      {/* ── Collage — masonry of live, token-driven components ── */}
      <div className="flex items-center justify-end -mt-2">
        <button
          onClick={() => onOpenFoundation('components')}
          className="text-sm text-fg-muted hover:text-fg transition-colors"
        >
          Browse components →
        </button>
      </div>
      {/* Scaled down (zoom) — it's a preview: 4 columns show more of the
          system at once; tiles/type shrink together so proportions hold. */}
      <div className="columns-2 md:columns-3 xl:columns-4 gap-4" style={{ zoom: 0.7 }}>
        {/* Sign-in card (hero) */}
        <div className="break-inside-avoid mb-4">
          <SignUpCardPreview tokens={t} />
        </div>

        {/* Mail cluster: tabs + toast */}
        <Tile t={t}>
          {SPECIMENS.Tabs({ t, v })}
          {SPECIMENS.Toast({ t, v })}
        </Tile>

        {/* Layers panel: search + banner + tree list */}
        <Tile t={t}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: fontFamilyOf(t) }}>
            <SearchRow t={t} />
            <InfoBanner t={t} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <LayerRow t={t} icon="box" label="Box" selected />
              <LayerRow t={t} icon="grid" label="Grid" />
              <LayerRow t={t} icon="image" label="Image" indent />
              <LayerRow t={t} icon="image" label="Image" indent />
              <LayerRow t={t} icon="text" label="Text" indent />
            </div>
          </div>
        </Tile>

        {/* Translucent panel over the accent gradient */}
        <GlassPanel t={t} />

        {/* Team access: avatars + toggles + invite */}
        <Tile t={t}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontFamily: fontFamilyOf(t) }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: weightOf(t, 'semibold', 600), color: t.neutralText }}>Manage team access</span>
              <span style={{ fontSize: 12, color: t.fgMuted }}>Who can join and what they can do.</span>
            </div>
            <AvatarStack t={t} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: fontFamilyOf(t) }}>
            <ToggleRow t={t} on label="Can edit content" />
            <ToggleRow t={t} on label="Can invite others" />
            <ToggleRow t={t} on={false} label="Admin access" />
          </div>
        </Tile>

        {/* Form controls: input + select + checkbox */}
        <Tile t={t}>
          {SPECIMENS.Input({ t, v: { Type: 'E-Mail' } })}
          {SPECIMENS.Select({ t, v })}
          {SPECIMENS.Checkbox({ t, v })}
        </Tile>

        {/* Text patterns: heading + body + blockquotes */}
        <Tile t={t}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontSize: 18, lineHeight: 1.3, color: t.neutralText,
                fontFamily: t.typography?.headingFontFamily || fontFamilyOf(t),
                fontWeight: weightOf(t, 'bold', 700),
              }}
            >
              Design once, ship everywhere.
            </span>
            <span style={{ fontSize: 13, lineHeight: 1.6, color: t.fgMuted, fontFamily: fontFamilyOf(t) }}>
              Body text, links and quotes all resolve from your type and color tokens.
            </span>
          </div>
          <QuoteBlock t={t} />
          <QuoteBlock t={t} muted />
        </Tile>

        {/* Todo list: checked items strike through */}
        <Tile t={t}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, fontFamily: fontFamilyOf(t) }}>
            <span style={{ fontSize: 14, fontWeight: weightOf(t, 'semibold', 600), color: t.neutralText }}>Today</span>
            <span style={{ fontSize: 12, color: t.fgMuted }}>2 of 5 done</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: fontFamilyOf(t) }}>
            <TodoItem t={t}>
              Respond to comment <span style={{ color: t.brandText }}>#384</span> from Travis
            </TodoItem>
            <TodoItem t={t}>
              Invite <span style={{ color: t.brandText }}>Acme Co.</span> team to Slack
            </TodoItem>
            <TodoItem t={t}>
              Create a report <span style={{ color: t.brandText }}>requested</span> by Danilo
            </TodoItem>
            <TodoItem t={t} done>Close Q2 finances</TodoItem>
            <TodoItem t={t} done>
              Review invoice <span style={{ color: t.brandText }}>#3456</span>
            </TodoItem>
          </div>
        </Tile>

        {/* Upgrade card */}
        <Tile t={t}>
          <UpgradeCard t={t} />
        </Tile>

        {/* Status: badges + progress + breadcrumb */}
        <Tile t={t}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SPECIMENS.Badge({ t, v: { Color: 'Brand' } })}
            {SPECIMENS.Badge({ t, v: { Color: 'Success' } })}
            {SPECIMENS.Badge({ t, v: { Color: 'Error', Style: 'Outline' } })}
            {SPECIMENS.Badge({ t, v: { Color: 'Neutral' } })}
          </div>
          {SPECIMENS.Progress({ t, v })}
          {SPECIMENS.Breadcrumb({ t, v })}
        </Tile>

        {/* Building blocks: pills + icon buttons + avatar flavors */}
        <Tile t={t}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: fontFamilyOf(t) }}>
            <Pill t={t}>Token-driven</Pill>
            <Pill t={t} outline>Light &amp; dark</Pill>
            <Pill t={t} outline>Figma-ready</Pill>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <IconButton t={t} icon="star" variant="solid" />
            <IconButton t={t} icon="bookmark" variant="solid" />
            <IconButton t={t} icon="user" variant="soft" />
            <IconButton t={t} icon="heart" variant="outline" />
            <IconButton t={t} icon="share" variant="outline" />
            <Switch t={t} on={false} label="Preview switch off" />
            <Switch t={t} on label="Preview switch on" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: fontFamilyOf(t) }}>
            <AvatarGridRow t={t} flavor="solid" />
            <AvatarGridRow t={t} flavor="soft" />
          </div>
        </Tile>

        {/* Content card */}
        <div className="break-inside-avoid mb-4 [&>div]:w-full">
          {SPECIMENS.Card({ t, v })}
        </div>
      </div>
    </motion.div>
  )
}

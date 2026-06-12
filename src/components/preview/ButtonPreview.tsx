import { useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import chroma from 'chroma-js'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'plain'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonLabelType = 'icon' | 'text' | 'icon-text'
export type ButtonVisualState = 'default' | 'hover' | 'pressed' | 'focused'

/**
 * Resolved design tokens the preview consumes. Step 6 assembles this from the
 * store (applying fallbacks for empty semantic tokens) so the renderer never
 * has to know about the store shape.
 */
export interface PreviewTokens {
  surface: string // light canvas the buttons sit on (bg-primary ‖ #fff)
  brandSolid: string // accent fill (Primary)
  brandText: string // brand-coloured label (Tinted / Plain)
  onBrand: string // label on the accent fill (≈ white)
  neutralFill: string // Secondary fill
  neutralText: string // Secondary label
  errorColor: string // destructive accent
  disabledBg: string
  disabledText: string
  // Optional extras consumed by the richer preview atoms (Input, Badge, Card…).
  // Resolved in lib/previewTokens.ts; absent in older callers (ButtonDoc) → fallbacks.
  border?: string // field / card border (border-primary)
  fgMuted?: string // secondary copy (text-tertiary)
  placeholderText?: string // input placeholder (text-placeholder)
  successColor?: string
  warningColor?: string
  infoColor?: string
  radius: Record<string, string>
  spacing: Record<string, string>
  typography: { fontFamily: string; sizes: Record<string, string>; weights: Record<string, number> }
}

// ─── Static specs (shared with the doc's galleries & tables) ──────────────────

export interface ButtonVariantSpec {
  key: ButtonVariant
  label: string
  when: string
}

export const BUTTON_VARIANTS: ButtonVariantSpec[] = [
  { key: 'primary', label: 'Primary', when: 'The single most important action on a screen.' },
  { key: 'secondary', label: 'Secondary', when: 'Supporting actions sitting next to a primary.' },
  { key: 'tinted', label: 'Tinted', when: 'Medium-emphasis actions that still carry brand colour.' },
  { key: 'plain', label: 'Plain', when: 'Low-emphasis or inline actions; toolbars, list rows.' },
]

export interface ButtonSizeSpec {
  key: ButtonSize
  label: string
  height: number // px
  fontKey: string // typography.sizes key
  fontPx: number // fallback px
  paddingKey: string // spacing key
  padPx: number // fallback px
  icon: number // icon edge px
  gap: number // px between icon & label
}

export const BUTTON_SIZES: ButtonSizeSpec[] = [
  { key: 'sm', label: 'Small', height: 28, fontKey: 'sm', fontPx: 14, paddingKey: '3', padPx: 12, icon: 14, gap: 5 },
  { key: 'md', label: 'Medium', height: 34, fontKey: 'base', fontPx: 16, paddingKey: '4', padPx: 16, icon: 16, gap: 6 },
  { key: 'lg', label: 'Large', height: 50, fontKey: 'lg', fontPx: 18, paddingKey: '6', padPx: 24, icon: 20, gap: 8 },
]

// ─── Resolution helpers ───────────────────────────────────────────────────────

export function resolvePx(map: Record<string, string> | undefined, key: string, fallback: number): number {
  const raw = map?.[key]
  const n = raw ? parseFloat(raw) : NaN
  return Number.isFinite(n) ? n : fallback
}

function buttonColors(
  variant: ButtonVariant,
  destructive: boolean,
  disabled: boolean,
  state: 'default' | 'hover' | 'pressed',
  t: PreviewTokens,
): { bg: string; fg: string; ring: string } {
  const accent = destructive ? t.errorColor : t.brandSolid
  const accentText = destructive ? t.errorColor : t.brandText
  const ring = accent

  if (disabled) {
    return { bg: variant === 'plain' ? 'transparent' : t.disabledBg, fg: t.disabledText, ring }
  }

  const darken = (c: string, amt: number) => chroma(c).darken(amt).hex()
  const tint = (a: number) => chroma(accent).alpha(a).css()

  switch (variant) {
    case 'primary':
      return {
        bg: state === 'pressed' ? darken(accent, 0.6) : state === 'hover' ? darken(accent, 0.3) : accent,
        fg: t.onBrand,
        ring,
      }
    case 'secondary':
      return {
        bg:
          state === 'pressed'
            ? darken(t.neutralFill, 0.5)
            : state === 'hover'
            ? darken(t.neutralFill, 0.25)
            : t.neutralFill,
        fg: destructive ? t.errorColor : t.neutralText,
        ring,
      }
    case 'tinted':
      return {
        bg: state === 'pressed' ? tint(0.3) : state === 'hover' ? tint(0.2) : tint(0.12),
        fg: accentText,
        ring,
      }
    case 'plain':
      return {
        bg: state === 'pressed' ? tint(0.16) : state === 'hover' ? tint(0.08) : 'transparent',
        fg: accentText,
        ring,
      }
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlayIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function Spinner({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export interface ButtonPreviewProps {
  variant?: ButtonVariant
  size?: ButtonSize
  labelType?: ButtonLabelType
  destructive?: boolean
  disabled?: boolean
  loading?: boolean
  /** Force a visual state (used by the States gallery). Overrides live hover/press. */
  forceState?: ButtonVisualState
  label?: string
  tokens: PreviewTokens
}

export function ButtonPreview({
  variant = 'primary',
  size = 'md',
  labelType = 'text',
  destructive = false,
  disabled = false,
  loading = false,
  forceState,
  label = 'Button',
  tokens,
}: ButtonPreviewProps) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [focused, setFocused] = useState(false)

  const sz = BUTTON_SIZES.find((s) => s.key === size) ?? BUTTON_SIZES[1]
  const isIconOnly = labelType === 'icon'

  const state: ButtonVisualState =
    forceState ?? (pressed ? 'pressed' : hover ? 'hover' : focused ? 'focused' : 'default')
  const colorState = state === 'focused' ? 'default' : state
  const { bg, fg, ring } = buttonColors(variant, destructive, disabled, colorState, tokens)

  const fontSize = resolvePx(tokens.typography?.sizes, sz.fontKey, sz.fontPx)
  const paddingX = isIconOnly ? 0 : resolvePx(tokens.spacing, sz.paddingKey, sz.padPx)
  const radius = tokens.radius?.full || '9999px'
  const showRing = state === 'focused'

  const style: CSSProperties = {
    height: sz.height,
    width: isIconOnly ? sz.height : undefined,
    paddingLeft: paddingX,
    paddingRight: paddingX,
    background: bg,
    color: fg,
    borderRadius: radius,
    fontFamily: tokens.typography?.fontFamily || 'Inter, sans-serif',
    fontSize,
    fontWeight: tokens.typography?.weights?.semibold ?? 600,
    gap: sz.gap,
    boxShadow: showRing ? `0 0 0 2px ${tokens.surface}, 0 0 0 4px ${ring}` : undefined,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-label={isIconOnly ? label : undefined}
      className="inline-flex items-center justify-center select-none border-0 leading-none whitespace-nowrap outline-none"
      style={style}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => {
        setHover(false)
        setPressed(false)
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {loading ? (
        <>
          <Spinner size={sz.icon} color={fg} />
          {!isIconOnly && <span style={{ opacity: 0 }}>{label}</span>}
        </>
      ) : (
        <>
          {(labelType === 'icon' || labelType === 'icon-text') && <PlayIcon size={sz.icon} color={fg} />}
          {(labelType === 'text' || labelType === 'icon-text') && <span>{label}</span>}
        </>
      )}
    </motion.button>
  )
}

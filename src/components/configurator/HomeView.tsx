// Home — the system's live preview hub. A control bar (Dashboard/Marketing ·
// Light/Dark/Both · Simulate) sits over one or two device frames that render a
// full application dashboard entirely from the user's tokens, so editing any
// foundation in the right panel updates the mock live. Replaces the earlier
// masonry collage; the frames ARE the "common elements" preview.

import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { usePreviewTokens } from '../../lib/previewTokens'
import { useApplyAccentColor } from '../../lib/colorActions'
import DashboardPreview from '../preview/DashboardPreview'

interface HomeViewProps {
  /** Navigates to a foundation section, or the catalogue for 'components'. */
  onOpenFoundation: (key: string) => void
  /** Theme currently previewed elsewhere — unused by the dual frames. */
  previewTheme?: string
}

type ViewMode = 'light' | 'dark' | 'both'

// ── Control-bar glyphs ───────────────────────────────────────────────────────
const SunIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
const MoonIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
)
const BothIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="8" height="14" rx="1.5" /><rect x="13" y="5" width="8" height="14" rx="1.5" fill="currentColor" fillOpacity="0.25" /></svg>
)
const EyeIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
)

// A pill inside a bordered segmented group. Active = solid ink; disabled reads
// muted and non-interactive (Marketing ships later).
function Seg({ active, disabled, onClick, icon, children, title }: {
  active?: boolean; disabled?: boolean; onClick?: () => void; icon?: ReactNode; children: ReactNode; title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active ? 'bg-fg text-app' : disabled ? 'text-fg-faint cursor-not-allowed' : 'text-fg-muted hover:text-fg'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

export default function HomeView({ previewTheme = 'light' }: HomeViewProps) {
  const { primaryColor, primaryScale } = useDesignStore()
  const applyAccentColor = useApplyAccentColor()
  const [mode, setMode] = useState<ViewMode>('both')

  const lightTokens = usePreviewTokens('light')
  const darkTokens = usePreviewTokens('dark')

  // Seed the accent ramp on first landing so the frames resolve with color even
  // before Foundations · Color has been opened (see the note in previewTokens).
  useEffect(() => {
    if (Object.keys(primaryScale).length === 0) applyAccentColor(primaryColor, false, previewTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const showLight = mode === 'light' || mode === 'both'
  const showDark = mode === 'dark' || mode === 'both'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {/* ── Control bar: Dashboard/Marketing · Light/Dark/Both · Simulate ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Content set — Marketing lands later, so it's shown but disabled. */}
          <div className="flex items-center border border-line rounded-lg p-[3px]">
            <Seg active>Dashboard</Seg>
            <Seg disabled title="Marketing preview — coming soon">Marketing</Seg>
          </div>
          <span className="w-px h-6 bg-line" aria-hidden />
          {/* Appearance */}
          <div className="flex items-center border border-line rounded-lg p-[3px]" role="group" aria-label="Preview appearance">
            <Seg active={mode === 'light'} onClick={() => setMode('light')} icon={SunIcon}>Light</Seg>
            <Seg active={mode === 'dark'} onClick={() => setMode('dark')} icon={MoonIcon}>Dark</Seg>
            <Seg active={mode === 'both'} onClick={() => setMode('both')} icon={BothIcon}>Both</Seg>
          </div>
        </div>

        {/* Vision simulation — visual placeholder for now (built out later). */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-fg-faint uppercase tracking-wide">Simulate</span>
          <button
            disabled
            title="Vision simulation — coming soon"
            className="flex items-center justify-between gap-2 h-8 w-[180px] px-3 rounded-lg border border-line bg-surface text-fg-faint cursor-not-allowed"
          >
            <span className="flex items-center gap-2 text-xs">{EyeIcon}Normal vision</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      {/* ── Frames — token-driven dashboards, one per selected appearance ── */}
      <div className="flex gap-4 items-start">
        {showLight && <DashboardPreview tokens={lightTokens} />}
        {showDark && <DashboardPreview tokens={darkTokens} />}
      </div>
    </motion.div>
  )
}

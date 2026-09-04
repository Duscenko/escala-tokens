import { useEffect, useRef, useState } from 'react'
import { captureSnapshot, type DesignSnapshot, useDesignStore } from '../../store/useDesignStore'
import { useApplyAccentColor } from '../../lib/colorActions'
import { resetThemeToOrigin, themeHasEdits } from '../../lib/adoptPreset'
import { themeStylePreset } from '../../lib/themePresets'
import { useI18n } from '../../lib/i18n'

const UNDO_MS = 9000

/**
 * Theme-wide Reset + 9s Undo. Same control Theme Preview's canvas header and
 * Variables Preview's title row share — one action, two doors, so they cannot
 * disagree about what "reset this theme" means.
 */
export function useThemeReset(previewTheme: string, enabled = true) {
  const store = useDesignStore()
  const applyAccent = useApplyAccentColor()
  const [undo, setUndo] = useState<DesignSnapshot | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const originPreset = themeStylePreset(store.themeOrigin?.[previewTheme] ?? '')
  const target = originPreset?.label ?? 'System defaults'
  const show = enabled && (Boolean(undo) || themeHasEdits(store, previewTheme))

  useEffect(() => {
    setUndo(null)
    if (timer.current) clearTimeout(timer.current)
  }, [previewTheme])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const onClick = () => {
    if (undo) {
      useDesignStore.setState(undo)
      setUndo(null)
      if (timer.current) clearTimeout(timer.current)
      return
    }
    const snapshot = captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot)
    resetThemeToOrigin(previewTheme, applyAccent)
    setUndo(snapshot)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setUndo(null), UNDO_MS)
  }

  return { show, mode: (undo ? 'undo' : 'reset') as 'undo' | 'reset', target, onClick }
}

export function ThemeResetButton({
  mode, target, onClick,
}: {
  mode: 'reset' | 'undo'
  target: string
  onClick: () => void
}) {
  const { t } = useI18n()
  const label = mode === 'undo' ? t('Undo reset') : t('Reset theme')
  const title = mode === 'undo' ? label : `${label} — ${t(target)}`
  return (
    <div className="flex h-8 items-center rounded-lg border border-line p-0.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={title}
        title={title}
        className="flex h-7 items-center rounded-md px-2 text-caption font-normal tracking-[0.18px] text-fg-faint transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-surface hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        {label}
      </button>
    </div>
  )
}

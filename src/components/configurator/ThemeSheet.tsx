// The theme control in TopNav — one grouped pill, `[theme | ☀]`. Transversal:
// mounted on every top-nav section, because which theme you are looking at is
// a property of the whole workspace, like the light/dark appearance beside it.
//
// The house (+ the theme's avatar) IS the door to Home (the file browser): it shows the
// colour of the theme being edited and one click goes to every theme, style
// and library. It used to open a "Customize" sheet with a dropdown chevron;
// that sheet is gone — Home does its job (browse and Preview System Styles,
// create a theme), so the rail's own Home tile went with it.

import { useRef } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import type { StylePreview } from '../../lib/stylePreviewOverlay'
import { useI18n } from '../../lib/i18n'
import { CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL } from './themeWorkspaceLayout'
import { ThemeAvatar } from './ThemeLibraryRail'
import { PRESET_AVATAR_RAMPS } from './StyleOverview'
import { MoonIcon, SunIcon } from './TopNav'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

type Appearance = 'light' | 'dark'

export function ThemeAppearanceControl({
  previewTheme,
  stylePreview,
  appearance,
  onAppearanceChange,
  homeOpen,
  onOpenLibrary,
}: {
  previewTheme: string
  stylePreview: StylePreview | null
  appearance: Appearance
  onAppearanceChange: (appearance: Appearance) => void
  /** Home is the page on screen — the avatar reads as pressed. */
  homeOpen: boolean
  onOpenLibrary: () => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const triggerRef = useRef<HTMLButtonElement>(null)

  const tryOn = stylePreview
  const name = tryOn ? tryOn.preset.shortLabel : themeDisplayName(previewTheme, store.themeLabels)
  const kind = tryOn ? tryOn.appearance : (store.themeKinds[previewTheme] ?? 'light')
  const ramp = tryOn
    ? PRESET_AVATAR_RAMPS[`${tryOn.preset.id}:${tryOn.appearance}`]
    : themeBrandRamp(previewTheme, store.themeSources, store.themeKinds, store)
  const isDark = appearance === 'dark'
  const label = t('Home — editing {name}', { name })

  return (
    <div className={`flex h-8 flex-shrink-0 items-stretch overflow-hidden rounded-lg ${CHROME_CONTROL_SHELL}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onOpenLibrary}
        aria-pressed={homeOpen}
        aria-label={label}
        title={label}
        className={`flex min-w-0 items-center gap-1.5 pl-2 pr-1.5 ${homeOpen ? 'bg-fg/[0.08] text-fg' : 'text-fg-muted hover:text-fg'} ${CHROME_CONTROL_HOVER} ${FOCUS} focus-visible:ring-inset`}
      >
        {/* The house says WHERE it goes; the small avatar beside it says which
            theme you are editing, so the colour still travels with you. */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
        <ThemeAvatar size={18} ramp={ramp} appearance={kind} fallback={tryOn?.preset.accent ?? store.primaryColor} />
      </button>
      <span aria-hidden className="w-px self-stretch bg-line" />
      <button
        type="button"
        onClick={() => onAppearanceChange(isDark ? 'light' : 'dark')}
        aria-label={t(isDark ? 'Light appearance' : 'Dark appearance')}
        title={t(isDark ? 'Light appearance' : 'Dark appearance')}
        className={`grid w-8 place-items-center text-fg-muted hover:text-fg ${CHROME_CONTROL_HOVER} ${FOCUS} focus-visible:ring-inset`}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  )
}

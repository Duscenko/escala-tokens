import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { INSPECTOR_DURATION, INSPECTOR_EASE } from '../../lib/inspectorMotion'
import { CHROME_CONTROL_SHELL, SEGMENT_INACTIVE, SEGMENT_SELECTED_FILL } from './themeWorkspaceLayout'

/** What the Components section holds, smallest to largest: a component, a
 *  block made of components, a whole screen made of both. */
export type CatalogueTabKey = 'components' | 'blocks' | 'screens'

const TABS: { key: CatalogueTabKey; label: string }[] = [
  { key: 'components', label: 'Elements' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'screens', label: 'Screens' },
]

/** Elements · Blocks · Screens — the switch at the head of the Components
 *  section. The shell keeps them as three tabs (`components` / `blocks` /
 *  `screens`, so every link keeps working); this strip is the only door
 *  between them.
 *
 *  It is the workspace's own segmented control — the inspector's switch
 *  (`FoundationSwitchStrip`): the chip track, and a RAISED key for the active
 *  option (`SEGMENT_SELECTED_FILL`: white with a soft shadow in light, a lift
 *  toward the ink with an inner highlight in dark) that slides between them.
 *  An inverted white pill was tried first and read as a heavy button, not a tab
 *  (reported). Active also gains full ink and semibold, so the state never rests
 *  on the fill alone. */
export function CatalogueTabs({ active, onSelect }: {
  active: CatalogueTabKey
  onSelect: (key: CatalogueTabKey) => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const slide = reduce ? { duration: 0 } : { duration: INSPECTOR_DURATION.layerIn, ease: INSPECTOR_EASE }
  return (
    <nav aria-label={t('Components')} className={`flex h-8 items-center gap-0.5 rounded-lg p-0.5 ${CHROME_CONTROL_SHELL}`}>
      {TABS.map(({ key, label }) => {
        const on = key === active
        return (
          <button
            key={key}
            type="button"
            aria-current={on ? 'page' : undefined}
            onClick={() => { if (!on) onSelect(key) }}
            className={`relative inline-flex h-7 items-center rounded-md px-3 text-ui transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
              on ? 'font-semibold text-fg' : SEGMENT_INACTIVE
            }`}
          >
            {on && (
              <motion.span
                layoutId="catalogue-tab-key"
                aria-hidden
                className={`absolute inset-0 rounded-md ${SEGMENT_SELECTED_FILL}`}
                transition={slide}
              />
            )}
            <span className="relative">{t(label)}</span>
          </button>
        )
      })}
    </nav>
  )
}

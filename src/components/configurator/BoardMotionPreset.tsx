import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useDesignStore, captureSnapshot, type DesignSnapshot } from '../../store/useDesignStore'
import { recordEdit } from '../../lib/editHistory'
import { useI18n } from '../../lib/i18n'
import { resolveThemeFoundations } from '../../lib/themeFoundations'
import { MOTION_EASINGS, MOTION_PRESETS, MOTION_PRESET_KEYS, durationMs, matchMotionPreset, motionPresetPatch, normalizeMotionSettings, type MotionPresetKey } from '../../lib/motion'
import { HintTip } from '../ui/HintTip'
import { useCloseOnAnchorScroll } from '../ui/useCloseOnAnchorScroll'
import { MENU_CHECK, SELECT_LIST, SELECT_OPTION, SELECT_OPTION_FOCUS, SELECT_OPTION_OFF, SELECT_OPTION_ON } from './themeWorkspaceLayout'

const MENU_W = 200
const MENU_GAP = 6

/** How far the sample dot travels in its 36px track. */
const SAMPLE_TRAVEL = 18

/**
 * A preset shown, not described: a dot crossing a short track on that preset's
 * own emphasis timing (`use-emphasis-in` — the role where the five differ most:
 * Snappy is quick, Playful overshoots on its bouncy spring). A preset with no
 * travel (Calm) fades the dot in place instead, which is what it does. Holds
 * still under reduced motion.
 */
function PresetSample({ presetKey, still }: { presetKey: MotionPresetKey; still: boolean }) {
  const settings = MOTION_PRESETS[presetKey].settings
  const pick = settings.roles['use-emphasis-in']
  const ms = durationMs(pick.duration, settings)
  const easing = MOTION_EASINGS[pick.easing]
  const travels = settings.transforms.enter > 0
  const [across, setAcross] = useState(false)
  useEffect(() => {
    if (still) return
    // Each leg lands, then rests, so the arrival — where presets differ — reads.
    const id = window.setInterval(() => setAcross((a) => !a), ms + 520)
    return () => window.clearInterval(id)
  }, [ms, still])
  return (
    <span aria-hidden className="relative flex h-5 w-9 flex-shrink-0 items-center rounded-full bg-fg/[0.06]">
      <span
        className="absolute left-1 h-2.5 w-2.5 rounded-full bg-accent-ui"
        style={{
          transform: travels && across ? `translateX(${SAMPLE_TRAVEL}px)` : 'translateX(0)',
          opacity: !travels && !across ? 0.25 : 1,
          left: travels ? undefined : '50%',
          marginLeft: travels ? undefined : -5,
          transition: still ? 'none' : `transform ${ms}ms ${easing}, opacity ${ms}ms ${easing}`,
        }}
      />
    </span>
  )
}

/**
 * The brand's motion preset, on the board toolbar. With the inspector off the
 * board plays itself (`boardAutoplay`), so this is where a preset is picked
 * AND seen: choose Playful and the tiles above re-time at once. It writes the
 * same value as the inspector's Motion row (`motionPresetPatch`), as one step
 * of the edit history (⌘Z).
 */
export function BoardMotionPreset({ themeKey }: { themeKey: string }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const store = useDesignStore()
  const settings = normalizeMotionSettings(resolveThemeFoundations(store, themeKey).motion)
  const current = matchMotionPreset(settings)
  const label = current ? t(MOTION_PRESETS[current].label) : t('Custom')
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<{ bottom: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const options = useRef<(HTMLButtonElement | null)[]>([])

  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus() }
  const pick = (key: MotionPresetKey) => {
    if (key !== current) {
      const state = useDesignStore.getState()
      const before = captureSnapshot(state as unknown as DesignSnapshot)
      state.patchThemeFoundations(themeKey, { motion: motionPresetPatch(key) })
      recordEdit(before, 'Motion updated')
    }
    close()
  }

  useCloseOnAnchorScroll(open, trigger, () => close(false))
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const r = trigger.current?.getBoundingClientRect()
      if (!r) return
      const left = Math.max(MENU_GAP, Math.min(r.left, window.innerWidth - MENU_W - MENU_GAP))
      setPlace({ bottom: window.innerHeight - r.top + MENU_GAP + 4, left })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  useEffect(() => {
    if (!open) return
    options.current[Math.max(0, current ? MOTION_PRESET_KEYS.indexOf(current) : 0)]?.focus()
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (menu.current?.contains(target) || trigger.current?.contains(target)) return
      close(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
    // `current` is read once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onMenuKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const at = options.current.findIndex((el) => el === document.activeElement)
    const next = (at + (event.key === 'ArrowDown' ? 1 : -1) + MOTION_PRESET_KEYS.length) % MOTION_PRESET_KEYS.length
    options.current[next]?.focus()
  }

  const button = (
    <button
      ref={trigger}
      type="button"
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(event) => { if (event.key === 'ArrowUp' && !open) { event.preventDefault(); setOpen(true) } }}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={`${t('Motion preset')}: ${label}`}
      className={`flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-2 text-caption font-medium transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui ${
        open ? 'bg-elevated text-fg' : 'text-fg-muted hover:bg-elevated hover:text-fg'
      }`}
    >
      {/* An easing curve between its two points: "how it moves". */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        <path d="M3 12.5C8.5 12.5 7.5 3.5 13 3.5" />
        <circle cx="3" cy="12.5" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="3.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
      {label}
    </button>
  )

  return (
    <>
      {open ? button : <HintTip label={t('Motion preset')}>{button}</HintTip>}
      {open && createPortal(
        <motion.div
          ref={menu}
          role="listbox"
          aria-label={t('Motion preset')}
          onKeyDown={onMenuKey}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'fixed', width: MENU_W, left: place?.left ?? -9999, bottom: place?.bottom, visibility: place ? 'visible' : 'hidden' }}
          className={`dark z-[70] flex flex-col gap-0.5 ${SELECT_LIST}`}
        >
          {MOTION_PRESET_KEYS.map((key, i) => {
            const on = key === current
            return (
              <button
                key={key}
                ref={(el) => { options.current[i] = el }}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => pick(key)}
                aria-describedby={`motion-preset-brief-${key}`}
                className={`${SELECT_OPTION} flex items-center gap-2.5 ${SELECT_OPTION_FOCUS} ${on ? SELECT_OPTION_ON : SELECT_OPTION_OFF}`}
              >
                <PresetSample presetKey={key} still={Boolean(reduce)} />
                <span className="min-w-0 flex-1 truncate text-ui">{t(MOTION_PRESETS[key].label)}</span>
                {/* The brief stays for screen readers; on screen the sample says it. */}
                <span id={`motion-preset-brief-${key}`} className="sr-only">{t(MOTION_PRESETS[key].brief)}</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`${MENU_CHECK} ${on ? '' : 'invisible'}`}>
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              </button>
            )
          })}
        </motion.div>,
        document.body,
      )}
    </>
  )
}

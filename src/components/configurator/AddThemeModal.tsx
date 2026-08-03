import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore, RESERVED_COLOR_KEYS, type ThemePalette, type ThemeSources } from '../../store/useDesignStore'
import { resolveThemePalette, FAMILY_SLOTS, type FamilySlot } from '../../lib/themeSources'
import { generateColorScale } from '../../lib/colorUtils'
import { slugify } from '../../lib/utils'
import {
  ColorSelect, ScaleRow, InfoDot, LinkToggle, neutralFromBrand,
  BRAND_GROUPS, NEUTRAL_GROUPS, type OptionGroup,
} from './colorControls'

// Semantic-state preset swatches — mirrors the Color foundation (Step2).
const SEMANTIC_FIELDS: { key: 'error' | 'warning' | 'success' | 'info'; label: string; presets: OptionGroup[] }[] = [
  { key: 'error',   label: 'Error',   presets: [{ label: '', options: [
    { hex: '#f04438', label: 'Red 500' }, { hex: '#d92d20', label: 'Red 600' },
    { hex: '#ef4444', label: 'Tailwind Red' }, { hex: '#e11d48', label: 'Rose' }] }] },
  { key: 'warning', label: 'Warning', presets: [{ label: '', options: [
    { hex: '#f79009', label: 'Amber 500' }, { hex: '#f59e0b', label: 'Amber' },
    { hex: '#dc6803', label: 'Orange 600' }, { hex: '#f97316', label: 'Orange' }] }] },
  { key: 'success', label: 'Success', presets: [{ label: '', options: [
    { hex: '#17b26a', label: 'Green 500' }, { hex: '#079455', label: 'Green 600' },
    { hex: '#10b981', label: 'Emerald' }, { hex: '#22c55e', label: 'Green 400' }] }] },
  { key: 'info',    label: 'Info',    presets: [{ label: '', options: [
    { hex: '#2e90fa', label: 'Blue 400' }, { hex: '#3b82f6', label: 'Blue' },
    { hex: '#0ea5e9', label: 'Sky' }, { hex: '#06b6d4', label: 'Cyan' }] }] },
]

export default function AddThemeModal({
  open,
  onClose,
  editKey = null,
  seedFrom = null,
  onRenamed,
}: {
  open: boolean
  onClose: () => void
  // When set, the modal edits this existing theme instead of creating a new one.
  editKey?: string | null
  // When set (and editKey isn't), the form pre-fills from this theme's resolved
  // palette but still creates a brand-new theme on submit — a "Duplicate" flow
  // reusing the same load-a-palette logic edit mode already has.
  seedFrom?: string | null
  // Fired after a successful rename so callers can re-point their preview state.
  onRenamed?: (oldKey: string, newKey: string) => void
}) {
  const store = useDesignStore()
  const {
    themes, addTheme, renameTheme, updateTheme, customColors, addCustomColor,
    themeKinds, themeSources,
    primaryColor, grayBaseColor, errorColor, warningColor, successColor, infoColor,
    colorAlgorithm, contrastShift, pageBackground,
  } = store
  const reduce = useReducedMotion() ?? false
  const isEdit = !!editKey
  // light/dark are the export's reserved keys (semantic / semanticDark) — their
  // palette + mode are editable, but the key itself must stay stable.
  const nameLocked = editKey === 'light' || editKey === 'dark'

  const [name, setName] = useState('')
  const [kind, setKind] = useState<'light' | 'dark'>('light')
  const [brand, setBrand] = useState(primaryColor)
  const [neutral, setNeutral] = useState(grayBaseColor)
  const [linked, setLinked] = useState(true)
  const [error, setError] = useState(errorColor)
  const [warning, setWarning] = useState(warningColor)
  const [success, setSuccess] = useState(successColor)
  const [info, setInfo] = useState(infoColor)
  const [err, setErr] = useState<string | null>(null)

  // Saved custom families surface in the Brand/Neutral dropdowns under "Saved".
  const savedGroup: OptionGroup | null = customColors.length
    ? { label: 'Saved', options: customColors.map((c) => ({ label: c.label, hex: c.base })) }
    : null
  const brandGroups = savedGroup ? [savedGroup, ...BRAND_GROUPS] : BRAND_GROUPS
  const neutralGroups = savedGroup ? [savedGroup, ...NEUTRAL_GROUPS] : NEUTRAL_GROUPS

  // On open: seed from the edited (or duplicated) theme's palette (base = tone
  // 9), or fall back to the current global colors for a fresh theme. Editing
  // and duplicating both read the same source palette; only editing carries
  // the source's name/key forward (a duplicate always gets a fresh name).
  const sourceKey = editKey ?? seedFrom
  useEffect(() => {
    if (!open) return
    setErr(null); setLinked(false)
    if (sourceKey) {
      const pal = resolveThemePalette(themeSources[sourceKey], themeKinds[sourceKey] ?? 'light', store)
      const base = (s: ThemePalette[keyof ThemePalette] | undefined, fb: string) =>
        (s?.[9] as string | undefined) ?? fb
      setName(editKey ? sourceKey : '')
      setKind(themeKinds[sourceKey] ?? 'light')
      setBrand(base(pal?.brand, primaryColor)); setNeutral(base(pal?.gray, grayBaseColor))
      setError(base(pal?.error, errorColor)); setWarning(base(pal?.warning, warningColor))
      setSuccess(base(pal?.success, successColor)); setInfo(base(pal?.info, infoColor))
    } else {
      setName(''); setKind('light'); setLinked(true)
      setBrand(primaryColor); setNeutral(grayBaseColor)
      setError(errorColor); setWarning(warningColor); setSuccess(successColor); setInfo(infoColor)
    }
  }, [open, editKey, sourceKey, themeKinds, themeSources, primaryColor, grayBaseColor, errorColor, warningColor, successColor, infoColor])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Live scales (BASE = tone 9, the Radix solid step).
  const scale = (hex: string) => { try { return generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground) } catch { return {} } }
  const brandScale = useMemo(() => scale(brand), [brand, colorAlgorithm, contrastShift, pageBackground]) // eslint-disable-line react-hooks/exhaustive-deps
  const neutralScale = useMemo(() => scale(neutral), [neutral, colorAlgorithm, contrastShift, pageBackground]) // eslint-disable-line react-hooks/exhaustive-deps
  const semanticScales = {
    error: useMemo(() => scale(error), [error, colorAlgorithm, contrastShift, pageBackground]), // eslint-disable-line react-hooks/exhaustive-deps
    warning: useMemo(() => scale(warning), [warning, colorAlgorithm, contrastShift, pageBackground]), // eslint-disable-line react-hooks/exhaustive-deps
    success: useMemo(() => scale(success), [success, colorAlgorithm, contrastShift, pageBackground]), // eslint-disable-line react-hooks/exhaustive-deps
    info: useMemo(() => scale(info), [info, colorAlgorithm, contrastShift, pageBackground]), // eslint-disable-line react-hooks/exhaustive-deps
  }

  // When linked, the neutral tracks the brand hue.
  function changeBrand(hex: string) {
    setBrand(hex)
    if (linked) setNeutral(neutralFromBrand(hex))
  }
  function toggleLink() {
    const next = !linked
    setLinked(next)
    if (next) setNeutral(neutralFromBrand(brand))
  }

  function handleCreate() {
    const label = name.trim()
    const key = slugify(label)
    if (!key) { setErr('Name the theme first.'); return }
    // On edit, the key only collides if it points at a *different* theme.
    if (themes[key] && key !== editKey) { setErr(`"${key}" already exists.`); return }
    try {
      // A theme never holds colour — it REFERENCES a primitive family. So each
      // slot resolves to a family key: the matching global when the hex is the
      // system's own, an existing family when one already carries that hex, and
      // otherwise a NEW family minted here so the colour shows up in Primitives
      // where colour is edited. That's what keeps a theme connected.
      const globals: Record<FamilySlot, { key: string; hex: string }> = {
        brand:   { key: 'accent',  hex: primaryColor },
        gray:    { key: 'neutral', hex: grayBaseColor },
        error:   { key: 'error',   hex: errorColor },
        warning: { key: 'warning', hex: warningColor },
        success: { key: 'success', hex: successColor },
        info:    { key: 'info',    hex: infoColor },
      }
      const chosen: Record<FamilySlot, string> = {
        brand, gray: neutral, error, warning, success, info,
      }
      const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
      const minted: { key: string; label: string; base: string; scale: ReturnType<typeof generateColorScale> }[] = []
      const taken = new Set(customColors.map((c) => c.key))
      const refs = {} as ThemeSources
      for (const slot of FAMILY_SLOTS) {
        const hex = chosen[slot]
        const g = globals[slot]
        if (eq(hex, g.hex)) { refs[slot] = g.key; continue }
        const existing = customColors.find((c) => eq(c.base, hex)) ?? minted.find((m) => eq(m.base, hex))
        if (existing) { refs[slot] = existing.key; continue }
        const wanted = slot === 'brand' ? key : `${key}-${slot}`
        let familyKey = wanted
        let n = 2
        while (RESERVED_COLOR_KEYS.includes(familyKey) || taken.has(familyKey)) familyKey = `${wanted}-${n++}`
        taken.add(familyKey)
        minted.push({
          key: familyKey,
          label: familyKey.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
          base: hex,
          scale: generateColorScale(hex, colorAlgorithm, contrastShift, pageBackground),
        })
        refs[slot] = familyKey
      }
      minted.forEach((m) => addCustomColor({ key: m.key, label: m.label, base: m.base, scale: m.scale }))
      if (editKey) {
        if (key !== editKey) { renameTheme(editKey, key); onRenamed?.(editKey, key) }
        updateTheme(key, kind, refs)
      } else {
        addTheme(key, kind, refs)
      }
      onClose()
    } catch {
      setErr('One of the colors is invalid.')
    }
  }

  const semanticState = { error, warning, success, info }
  const setSemantic: Record<string, (h: string) => void> = {
    error: setError, warning: setWarning, success: setSuccess, info: setInfo,
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={isEdit ? 'Edit theme' : 'Add a theme'}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl border border-line bg-app shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-14 border-b border-line flex-shrink-0">
              <h2 className="text-sm font-semibold text-fg">{isEdit ? 'Edit theme' : 'Add a theme'}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-fg-faint hover:text-fg transition-colors w-6 h-6 flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-6">
              {/* Name + mode */}
              <div className="flex items-end gap-3">
                <label className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-xs text-fg-muted">
                    Theme name{nameLocked && <span className="text-fg-faint"> · locked (reserved export key)</span>}
                  </span>
                  <input
                    autoFocus={!nameLocked}
                    type="text"
                    value={name}
                    disabled={nameLocked}
                    onChange={(e) => { setName(e.target.value); setErr(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                    placeholder="e.g. Ocean"
                    className="bg-surface border border-line-strong focus:border-fg rounded-full px-4 py-2 text-sm text-fg outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </label>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-fg-muted">Mode</span>
                  <div className="flex rounded-full border border-line-strong overflow-hidden">
                    {(['light', 'dark'] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => setKind(k)}
                        className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                          kind === k ? 'bg-fg text-app' : 'bg-surface text-fg-muted hover:text-fg'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Accent scale — Brand / link / Neutral + 12-tone scales */}
              <section className="flex flex-col gap-4 pt-1">
                <h3 className="text-sm font-semibold text-fg">Accent scale</h3>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                  <ColorSelect label="Accent Color" value={brand} groups={brandGroups} onChange={changeBrand} />
                  <div className="flex flex-col items-center gap-1.5 pb-1.5">
                    <InfoDot tip="Auto-matches the neutral scale to your accent color." />
                    <LinkToggle active={linked} onClick={toggleLink} />
                  </div>
                  <ColorSelect label="Neutral" value={neutral} groups={neutralGroups} onChange={(h) => { setNeutral(h); setLinked(false) }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <ScaleRow scale={brandScale} />
                  <ScaleRow scale={neutralScale} showNumbers={false} />
                </div>
              </section>

              {/* Color semantics */}
              <section className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-fg">Color semantics</h3>
                <div className="flex flex-col gap-4">
                  {SEMANTIC_FIELDS.map((f) => (
                    <div key={f.key} className="flex items-center gap-3">
                      <span className="w-14 flex-shrink-0 text-xs font-semibold text-fg">{f.label}</span>
                      <div className="flex-1 min-w-0">
                        <ScaleRow scale={semanticScales[f.key]} showNumbers={false} />
                      </div>
                      <ColorSelect
                        variant="compact"
                        label={f.label}
                        value={semanticState[f.key]}
                        groups={f.presets}
                        onChange={setSemantic[f.key]}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {err && <p className="text-[11px] text-red-500">{err}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 h-14 border-t border-line flex-shrink-0">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-fg-muted hover:text-fg border border-line hover:border-line-strong transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-fg text-app hover:opacity-90 transition-colors"
              >
                {isEdit ? 'Save changes' : 'Create theme'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// The Theme preview quick column's semantic tokens — one collapsible group per
// Categorical category, its tokens listed underneath.
//
// A ROW IS A NAME AND A SWATCH, deliberately with NO value. The Semantics table
// prints `neutral.12` beside every token because it has the width for it and
// because comparing refs across modes is what that table is FOR. This column is
// 240px and its job is "which of these do I want to change" — the ref belongs
// to advanced editing, one click away in the table. Printing it here would cost
// the row its breathing room to restate something the drawer shows anyway.
//
// Everything resolves through `useArchitectureTokens`, the same chain the table
// uses, so the swatch here and the cell there can never be different colours.

import { useEffect, useState, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { useArchitectureTokens } from './architectureTokens'
import { ArchModeEditor, archIconFor, parseRef, CHECKER_STYLE } from './Step3_SemanticTokens'
import { TokenDetailsModal } from './colorControls'
import { PaletteIcon } from '../ui/icons'
import type { ThemeAppearance } from '../../lib/themeModes'

const GROUP_ORDER = ['surface', 'action', 'content', 'border', 'status']

/** Bare labels (`Surface`, `Action`…) match the Semantics table, but in the
 *  Theme Preview quick column they sit beside Typography · Shape rails — the
 *  prefix keeps them clearly colour roles, not another foundation. */
function quickColumnGroupLabel(label: string) {
  return `Color ${label}`
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M3 4.5 6 7.5 9 4.5" />
    </svg>
  )
}

/** The token's colour in the mode being previewed. Alpha refs ride a
 *  checkerboard — the same cue `AlphaHexCell` and the Accent-Alpha ramp use, so
 *  a translucent role can't be mistaken for the solid it composites to. */
function TokenSwatch({ css, alpha }: { css: string; alpha: boolean }) {
  return (
    <span
      className="h-5 w-5 flex-shrink-0 overflow-hidden rounded-md ring-1 ring-black/10 dark:ring-white/15"
      style={alpha ? CHECKER_STYLE : undefined}
      aria-hidden
    >
      <span className="block h-full w-full" style={{ background: css }} />
    </span>
  )
}

export default function SemanticTokenGroups({
  previewTheme,
  previewAppearance,
  /** Lets an ancestor (the Theme Preview canvas) know the drawer is open, so
   *  it can cede space instead of letting the drawer's fixed 360px panel
   *  paint over the live artefacts sitting right where it docks. */
  onEditingChange,
  /** When a colour picker drawer opens, dismiss token editing — only one
   *  contained fly-out at a time. */
  colorPickerOpen = false,
  /** Vertical gap between accordion rows — must match the edition-card stack. */
  stackGap = 'gap-3',
  /** `ThemePreviewHub`'s `relative` root — the drawer portals here so it
   *  slides from the hub's left edge, not from inside the rail scroll area. */
  containedRootRef,
  /** Jump from a ramp-grid family label to that family in Color · Primitives
   *  (family vocabulary name — `accent`, `neutral`, `error`…). */
  onOpenPrimitiveFamily,
  /** Leave the drawer for this token's row in the full Color · Semantics
   *  table (`category.token` id). */
  onOpenInVariables,
}: {
  previewTheme: string
  previewAppearance: ThemeAppearance
  onEditingChange?: (open: boolean) => void
  colorPickerOpen?: boolean
  stackGap?: string
  containedRootRef?: RefObject<HTMLElement | null>
  onOpenPrimitiveFamily?: (family: string) => void
  onOpenInVariables?: (tokenId: string) => void
}) {
  const reduce = useReducedMotion() ?? false
  const setArchitectureOverride = useDesignStore((s) => s.setArchitectureOverride)
  const {
    archView, scales, resolvedPalettes, kindOf, archModeKeys, previewedMode,
    pageBackground, darkBackground, semanticArchitecture,
  } = useArchitectureTokens(previewTheme, previewAppearance)

  // Group order for THIS column only — surface → action → content → border →
  // status, working out from the page you're painting toward the feedback that
  // sits on top of it. Deliberately not `semanticArchitectures.ts`'s own order
  // (content · action · surface · status · border): that one is the export /
  // Semantics-table order and changing it there would move every consumer.
  // Anything the projection adds that isn't listed here falls to the end.
  const categories = archView
    ? [...archView.categories].sort(
        (a, b) => (GROUP_ORDER.indexOf(a.key) + 1 || 99) - (GROUP_ORDER.indexOf(b.key) + 1 || 99),
      )
    : []
  // Categorical's modes are the two appearances of ONE theme, so the section
  // header names the appearance — the theme's own name is already on the
  // identity band two rows up.
  const modeLabel = (mode: string) => (kindOf(mode) === 'dark' ? 'Dark' : 'Light')

  // Only ONE group open at a time, seeded on the first — the column is 240px
  // and every group expanded is a tower nobody scrolls. Same call `KitsPopover`
  // makes for its kit list.
  const [openGroup, setOpenGroup] = useState<string | null>(GROUP_ORDER[0])
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    onEditingChange?.(editing !== null)
    // Unmounting (e.g. switching away from the Color foundation) while the
    // drawer is open must clear the signal too, or the canvas keeps ceding
    // space for a drawer that's no longer there.
    return () => onEditingChange?.(false)
  }, [editing, onEditingChange])

  useEffect(() => {
    if (colorPickerOpen) setEditing(null)
  }, [colorPickerOpen])

  if (!archView) return null

  const token = editing
    ? archView.categories
        .flatMap((c) => c.tokens.map((t) => ({ ...t, id: `${c.key}.${t.key}`, description: c.description })))
        .find((t) => t.id === editing)
    : null

  return (
    <>
      <div className={`flex flex-col ${stackGap}`}>
        {categories.map((category) => {
          const open = openGroup === category.key
          return (
            <section key={category.key} className="min-w-0 overflow-hidden rounded-xl bg-rail-section">
              <button
                type="button"
                onClick={() => setOpenGroup(open ? null : category.key)}
                aria-expanded={open}
                title={category.description}
                className="flex h-10 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
              >
                {/* The SAME glyph the Semantics nav uses for this group — the
                    two surfaces list the same five categories, so a different
                    mark in each would imply a different grouping. */}
                <span className="flex-shrink-0 text-fg-muted">{archIconFor(category.key)}</span>
                <span className="min-w-0 flex-1 truncate text-caption font-medium text-fg">{quickColumnGroupLabel(category.label)}</span>
                <span className="flex-shrink-0 text-micro tabular-nums text-fg-faint">{category.tokens.length}</span>
                <span className="flex-shrink-0 text-fg-faint"><Chevron open={open} /></span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <ul className="flex flex-col border-t border-line p-1">
                      {category.tokens.map((t) => {
                        const value = t.modes[previewedMode]
                        const ref = parseRef(value?.label ?? '')
                        // The row whose Token Details drawer is open reads as a
                        // raised pill — same "you are editing THIS one" cue the
                        // Semantics table's arch rows already carry (`isOpen`).
                        const isEditing = editing === `${category.key}.${t.key}`
                        return (
                          <li key={t.key}>
                            <button
                              type="button"
                              onClick={() => setEditing(`${category.key}.${t.key}`)}
                              aria-current={isEditing}
                              title={`${category.key}.${t.key} — ${value?.label ?? ''}`}
                              className={`flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
                                isEditing ? 'bg-elevated text-fg shadow-sm' : 'hover:bg-elevated'
                              }`}
                            >
                              <span className={`flex-shrink-0 ${isEditing ? 'text-accent-ui' : 'text-fg-faint'}`}><PaletteIcon size={13} /></span>
                              {/* FULLY QUALIFIED (`surface.page`), not the bare
                                  `page`: these are the names you grep for and
                                  the names the export ships, and half the
                                  groups repeat a key (`content.primary` vs
                                  `action.primary`). The group header above is
                                  context, not a namespace you can strip. */}
                              <span className={`min-w-0 flex-1 truncate font-mono text-mini ${isEditing ? 'text-fg' : 'text-fg-muted'}`}>{category.key}.{t.key}</span>
                              <TokenSwatch css={value?.css ?? 'transparent'} alpha={!!ref?.[0].endsWith('-a')} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )
        })}
      </div>

      {/* The same drawer the Semantics table opens — one "edit a token" surface,
          one ramp grid, one set of rules. Here it's `contained`: scoped to
          `ThemePreviewHub`'s box and docked flush to the quick-settings rail's
          right edge (Figma fly-out beside the column, not over it). */}
      <AnimatePresence>
        {token && (
          <TokenDetailsModal
            key="quick-token-details"
            name={token.id}
            cssVarName={token.id.replace(/\./g, '-')}
            description={token.description}
            contained
            containedRootRef={containedRootRef}
            // This column is a QUICK edit — the full row (every theme column,
            // search, the architecture nav) lives one tab away, so the drawer
            // carries the door to it.
            onOpenInTable={onOpenInVariables ? () => onOpenInVariables(token.id) : undefined}
            onReset={() => {
              for (const mode of archModeKeys) setArchitectureOverride(semanticArchitecture, token.id, mode, null)
            }}
            resetDisabled={!archModeKeys.some((m) => token.edited?.[m])}
            onClose={() => setEditing(null)}
            reduce={reduce}
            initialOpenKey={previewedMode}
            sections={archModeKeys
              .filter((mode) => parseRef(token.modes[mode]?.label ?? ''))
              .map((mode) => ({
                key: mode,
                label: modeLabel(mode),
                kind: kindOf(mode),
                content: (
                  <ArchModeEditor
                    value={token.modes[mode]}
                    scales={scales}
                    palette={resolvedPalettes[mode]}
                    kind={kindOf(mode)}
                    pageBackground={pageBackground}
                    darkBackground={darkBackground}
                    label={modeLabel(mode)}
                    onPick={(refStr) => setArchitectureOverride(semanticArchitecture, token.id, mode, refStr)}
                    onOpenFamily={onOpenPrimitiveFamily}
                  />
                ),
              }))}
          />
        )}
      </AnimatePresence>
    </>
  )
}

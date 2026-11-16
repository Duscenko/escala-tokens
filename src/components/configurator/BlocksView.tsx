// Blocks — the Figma file's composed blocks (Auth · Marketing · Navigation ·
// Overlay), drawn live with the brand on screen. Same shape as Components:
// [icon rail] [page CARD] [directory]; the directory is `BlocksRail`.
//
// The index shows every block as a card (a scaled picture of the real block).
// A block's page is a stage with the block's own controls (the story's args:
// Container, Status, Layout…), a Desktop · Tablet · Mobile frame, the real
// dialog for an Overlay block, and what its contract says: the components it
// is built from, accessibility and motion.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { usePreviewTokens } from '../../lib/previewTokens'
import { useDesignStore } from '../../store/useDesignStore'
import type { GridViewport } from '../../lib/layoutTokens'
import type { ThemeAppearance } from '../../lib/themeModes'
import { COMPONENTS, type ComponentDef } from '../../lib/componentCatalogue'
import { isPlatformComponent } from '../../lib/platformCatalogue'
import { RecipeScope } from './docs/skeleton/scope'
import { FittedSpecimen } from './docs/ComponentAvatars'
import { SectionHeading } from './docs/blocks'
import { BLOCK_GROUPS, blockDefaults, blocksIn, matchesBlock, type BlockDef } from './blocks/blockRegistry'

/** The width a wide block is laid out at before a card scales it down. */
const THUMB_LAYOUT_WIDTH = 1200
/** Frame widths per viewport: the Grid's mobile and tablet frames. */
const FRAME_WIDTH: Record<GridViewport, number | null> = { desktop: null, tablet: 768, mobile: 390 }
const VIEWPORTS: GridViewport[] = ['desktop', 'tablet', 'mobile']

export default function BlocksView({
  previewTheme = 'light', active, onSelect, onOpenComponent, search = '', onClearSearch,
}: {
  previewTheme?: string
  /** null = the index (every block as a card). */
  active: BlockDef | null
  onSelect: (b: BlockDef) => void
  /** Opens a component a block is built from. */
  onOpenComponent?: (c: ComponentDef) => void
  search?: string
  onClearSearch?: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [active])
  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto">
      <motion.div
        key={active?.id ?? 'index'}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="pb-8"
      >
        {active
          ? <BlockPage block={active} previewTheme={previewTheme} onOpenComponent={onOpenComponent} />
          : <BlocksIndex previewTheme={previewTheme} onSelect={onSelect} search={search} onClearSearch={onClearSearch} />}
      </motion.div>
    </div>
  )
}

function useAppearance(previewTheme: string): ThemeAppearance {
  const kind = useDesignStore((s) => s.themeKinds[previewTheme])
  return kind === 'dark' ? 'dark' : 'light'
}

// ── Index ────────────────────────────────────────────────────────────────────

function BlocksIndex({ previewTheme, onSelect, search, onClearSearch }: {
  previewTheme: string
  onSelect: (b: BlockDef) => void
  search: string
  onClearSearch?: () => void
}) {
  const { t } = useI18n()
  const appearance = useAppearance(previewTheme)
  const tokens = usePreviewTokens(previewTheme, appearance)
  const groups = BLOCK_GROUPS
    .map((g) => ({ g, items: blocksIn(g).filter((b) => matchesBlock(b, search)) }))
    .filter((x) => x.items.length > 0)
  const count = groups.reduce((n, x) => n + x.items.length, 0)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <h1 className="text-display font-semibold tracking-tight text-fg">{t('Blocks')}</h1>
        <p className="mt-2 max-w-2xl text-strong leading-relaxed text-fg-muted">
          {t('Ready-made screens and sections built only from Escala components and your tokens. Open one to try its options and see what it is made of.')}
        </p>
        <p className="mt-2 text-caption text-fg-faint">{count} {t(count === 1 ? 'block' : 'blocks')}</p>
      </header>
      {count === 0 ? (
        <div role="status" className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line px-6 py-10">
          <p className="text-strong text-fg">{t('No blocks match')} “{search.trim()}”.</p>
          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="h-8 rounded-lg border border-line bg-surface px-3 text-caption font-medium text-fg hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ui"
            >
              {t('Clear search')}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map(({ g, items }) => (
            <section key={g} className="flex flex-col gap-3">
              <h2 className="text-strong font-semibold text-fg">
                {t(g)} <span className="ml-1 text-caption font-normal text-fg-faint">{items.length}</span>
              </h2>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                {items.map((b) => (
                  <li key={b.id}>
                    <BlockCard block={b} appearance={appearance} surface={tokens.surface} tokens={tokens} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function BlockCard({ block, appearance, surface, tokens, onSelect }: {
  block: BlockDef
  appearance: ThemeAppearance
  surface: string
  tokens: ReturnType<typeof usePreviewTokens>
  onSelect: (b: BlockDef) => void
}) {
  const { t } = useI18n()
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-line-strong has-[>button:focus-visible]:ring-2 has-[>button:focus-visible]:ring-accent-ui/50">
      <span
        aria-hidden
        inert
        className={`relative block h-[180px] w-full overflow-hidden border-b border-line ${appearance}`}
        style={{ background: surface }}
      >
        <span className="absolute inset-3 transition-transform duration-200 ease-out group-hover:scale-[1.02]">
          <FittedSpecimen>
            <RecipeScope t={tokens}>
              <div style={{ width: block.wide ? THUMB_LAYOUT_WIDTH : undefined }}>
                {block.render(blockDefaults(block))}
              </div>
            </RecipeScope>
          </FittedSpecimen>
        </span>
      </span>
      <span aria-hidden className="flex flex-col gap-0.5 px-3.5 py-3">
        <span className="truncate text-caption text-fg-faint">{t(block.group)}</span>
        <span className="truncate text-strong font-medium text-fg">{block.name}</span>
      </span>
      <button
        type="button"
        aria-label={`${block.name}, ${t(block.group)}`}
        onClick={() => onSelect(block)}
        className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-none"
      />
    </div>
  )
}

// ── A block's page ───────────────────────────────────────────────────────────

function Segmented({ label, options, value, onChange, format = (o) => o }: {
  label: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  format?: (o: string) => string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-fg-faint">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex h-8 items-center gap-0.5 rounded-lg border border-line bg-app p-0.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={o === value}
            onClick={() => onChange(o)}
            className={`h-7 rounded-md px-2.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
              o === value ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

function BlockPage({ block, previewTheme, onOpenComponent }: {
  block: BlockDef
  previewTheme: string
  onOpenComponent?: (c: ComponentDef) => void
}) {
  const { t } = useI18n()
  const appearance = useAppearance(previewTheme)
  const [values, setValues] = useState(() => blockDefaults(block))
  const [viewport, setViewport] = useState<GridViewport>('desktop')
  const [open, setOpen] = useState(false)
  const tokens = usePreviewTokens(previewTheme, appearance, viewport)
  const frame = FRAME_WIDTH[viewport]
  const contract = block.contract
  const viewportLabel: Record<string, string> = { desktop: t('Desktop'), tablet: t('Tablet'), mobile: t('Mobile') }

  return (
    <div className="flex flex-col gap-8">
      {/* Controls: the story's own args, then the frame. */}
      <div className="flex flex-col gap-0">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-6 py-3 lg:px-8">
          {block.controls.map((c) => (
            <Segmented
              key={c.key}
              label={c.label}
              options={c.options}
              value={values[c.key] ?? c.default}
              onChange={(v) => setValues((prev) => ({ ...prev, [c.key]: v }))}
            />
          ))}
          <Segmented
            label={t('Frame')}
            options={VIEWPORTS}
            value={viewport}
            onChange={(v) => setViewport(v as GridViewport)}
            format={(o) => viewportLabel[o] ?? o}
          />
          {block.dialog && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ui"
            >
              {t('Open as dialog')}
            </button>
          )}
        </div>

        {/* The stage: the brand's page, the block at true size. A frame
            narrower than the card centres; a wider block scrolls. */}
        <div className={`overflow-x-auto ${appearance}`} style={{ background: tokens.surface }}>
          <div
            className="mx-auto flex min-h-[420px] flex-col"
            style={{ width: frame ?? '100%', maxWidth: frame ?? undefined, boxShadow: frame ? '0 0 0 1px var(--color-border-subtle, rgba(127,127,127,.25))' : undefined }}
          >
            <RecipeScope t={tokens}>
              <div
                className="flex flex-1 flex-col"
                style={block.wide ? undefined : { padding: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                {block.render(values)}
              </div>
              {block.dialog?.({ open, onOpenChange: setOpen })}
            </RecipeScope>
          </div>
        </div>
      </div>

      <div className="flex max-w-4xl flex-col gap-8 px-6 lg:px-8">
        <div className="flex flex-col gap-1.5">
          <p className="text-caption text-fg-faint">{t('Blocks')} / {t(block.group)}</p>
          <h1 className="text-heading font-semibold tracking-tight text-fg">{block.name}</h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">{t(block.description)}</p>
        </div>

        {contract && contract.nests.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading id="built-from">{t('Built from')}</SectionHeading>
            <p className="text-ui leading-relaxed text-fg-muted">
              {t('Every part of this block is an Escala component. Change the brand and the block follows.')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[...new Set(contract.nests)].map((name) => <NestChip key={name} name={name} onOpen={onOpenComponent} />)}
            </div>
          </section>
        )}

        {contract && contract.a11y.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <SectionHeading id="accessibility">{t('Accessibility')}</SectionHeading>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-ui leading-relaxed text-fg-muted">
              {contract.a11y.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </section>
        )}

        {contract && contract.motion.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <SectionHeading id="motion">{t('Motion')}</SectionHeading>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-left text-ui">
                <thead className="bg-surface/60 text-caption text-fg-faint">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('Moment')}</th>
                    <th className="px-3 py-2 font-medium">{t('Role')}</th>
                    <th className="px-3 py-2 font-medium">{t('Reduced motion')}</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.motion.map((m) => (
                    <tr key={m.moment} className="border-t border-line align-top">
                      <td className="px-3 py-2 text-fg">{m.moment}<span className="block text-caption text-fg-faint">{m.mechanism}</span></td>
                      <td className="px-3 py-2 font-mono text-caption text-fg-muted">{m.role}</td>
                      <td className="px-3 py-2 text-fg-muted">{m.reduced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {contract && (
          <section className="flex flex-col gap-2.5">
            <SectionHeading id="figma">{t('Figma')}</SectionHeading>
            <p className="text-ui text-fg-muted">
              {t('Block {name} in the Escala Figma file, {n} variants.', { name: contract.name, n: contract.variants })}
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

/** A component the block nests. Escala's own components open their page;
 *  anything else is named, not linked. */
function NestChip({ name, onOpen }: { name: string; onOpen?: (c: ComponentDef) => void }): ReactNode {
  const def = COMPONENTS.find((c) => c.key === name && isPlatformComponent(c.key))
  // The Figma set name, as the block's contract and the Storybook write it.
  const label = name
  const className = 'inline-flex h-7 items-center rounded-full border border-line px-3 text-caption font-medium'
  if (!def || !onOpen) return <span className={`${className} text-fg-muted`}>{label}</span>
  return (
    <button
      type="button"
      onClick={() => onOpen(def)}
      className={`${className} text-fg transition-colors hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
    >
      {label}
    </button>
  )
}

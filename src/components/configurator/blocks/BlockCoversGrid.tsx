// The board's Blocks package: every block as a large cover, painted in the
// system's own tokens. The same card as `ComponentCoversGrid`, so switching the
// package changes what is on the board and nothing about how it reads.

import type { PreviewTokens } from '../../preview/ButtonPreview'
import { useI18n } from '../../../lib/i18n'
import { FittedSpecimen } from '../docs/ComponentAvatars'
import { RecipeScope } from '../docs/skeleton/scope'
import { INSPECT_EXEMPT_ATTR } from '../../preview/artefacts/TokenInspector'
import { LISTED_BLOCKS, blockDefaults, type BlockDef } from './blockRegistry'

/** The width a page section is laid out at before its cover scales it down. */
const COVER_LAYOUT_WIDTH = 1200

export function BlockCoversGrid({ tokens, onOpen }: {
  tokens: PreviewTokens
  /** Opens the block's page. Omit and the name is plain text. */
  onOpen?: (block: BlockDef) => void
}) {
  const { t } = useI18n()
  const card = tokens.archTokens?.['surface.layer-1'] ?? tokens.surface
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
      {LISTED_BLOCKS.map((block) => (
        <li key={block.id} className="group relative flex h-[220px] flex-col overflow-hidden rounded-2xl" style={{ background: card }}>
          <span className="flex min-w-0 px-5 pt-4">
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(block)}
                aria-label={`${t('Open')} ${block.name}`}
                {...{ [INSPECT_EXEMPT_ATTR]: '' }}
                className="-mx-1.5 -my-0.5 flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-ui transition-colors duration-150 ease-[var(--ease-out-quint)] hover:bg-[color-mix(in_srgb,var(--cover-ink)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cover-ink)]"
                style={{ color: tokens.neutralText, ['--cover-ink' as string]: tokens.neutralText }}
              >
                <span className="truncate">{block.name}</span>
                <svg
                  width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                  className="flex-shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-150 ease-[var(--ease-out-quint)] group-hover:translate-x-0 group-hover:opacity-70 group-focus-within:translate-x-0 group-focus-within:opacity-70 motion-reduce:translate-x-0 motion-reduce:transition-none"
                >
                  <path d="M5 11 11 5M6 5h5v5" />
                </svg>
              </button>
            ) : (
              <span className="truncate text-ui" style={{ color: tokens.neutralText }}>{block.name}</span>
            )}
          </span>
          <span aria-hidden inert className="relative block min-h-0 flex-1">
            <span className="absolute inset-x-5 bottom-5 top-2">
              <FittedSpecimen>
                <RecipeScope t={tokens}>
                  <div style={{ width: block.wide ? COVER_LAYOUT_WIDTH : undefined }}>
                    {block.render(blockDefaults(block))}
                  </div>
                </RecipeScope>
              </FittedSpecimen>
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

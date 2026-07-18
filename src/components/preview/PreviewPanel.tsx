import { type ReactNode } from 'react'
import { usePreviewTokens } from '../../lib/previewTokens'
import { type PreviewTokens } from './ButtonPreview'
import { SPECIMENS } from '../configurator/docs/specimens'
import { SignUpCardPreview } from './atoms/SignUpCardPreview'
import { TextSpecimenPreview } from './atoms/TextSpecimenPreview'
import { BackgroundSpecimenPreview } from './atoms/BackgroundSpecimenPreview'
import { BorderSpecimenPreview } from './atoms/BorderSpecimenPreview'
import { ForegroundSpecimenPreview } from './atoms/ForegroundSpecimenPreview'
import { IconSpecimenPreview } from './atoms/IconSpecimenPreview'
import { OverviewChecklistPreview } from './atoms/OverviewChecklistPreview'
import { getIconLibrary } from '../../lib/iconLibraries'
import type { SemanticCategory } from '../configurator/Step3_SemanticTokens'

// Catalogue renderers reused verbatim — keys are plugin gates ('Toggle' ships
// with the display name "Switch").
const ButtonSpec = SPECIMENS.Button
const BadgeSpec = SPECIMENS.Badge
const SwitchSpec = SPECIMENS.Toggle

// When the shell focuses a semantic category, the panel becomes a specimen for it.
const FOCUS_TITLE: Record<Exclude<SemanticCategory, 'all'>, string> = {
  surface: 'Surface preview',
  action: 'Action preview',
  status: 'Status preview',
  text: 'Text preview',
  icon: 'Icon preview',
  border: 'Border preview',
}

// ── Layout helpers ──────────────────────────────────────────────────────────
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <span className="text-[10px] uppercase tracking-widest text-fg-faint px-0.5">{title}</span>
      {children}
    </section>
  )
}

// A tile painted with the user's design-system surface, so brand-on-surface
// contrast reads correctly regardless of the app chrome theme.
function Tile({ tokens, children }: { tokens: PreviewTokens; children: ReactNode }) {
  return (
    <div
      className="p-4 flex flex-wrap items-center gap-3"
      style={{ background: tokens.surface, border: `1px solid ${tokens.borderDefault || tokens.border || '#eaecf0'}`, borderRadius: 14 }}
    >
      {children}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────
export default function PreviewPanel({
  focus = null,
  previewTheme = 'light',
  iconLibraryKey = null,
  showOverview = false,
  onNavigateFoundation,
  onCollapse,
}: {
  focus?: SemanticCategory | null
  /** Theme whose tokens the atoms render in — driven by the Semantic eye toggle. */
  previewTheme?: string
  /** When set (Icons foundation), the panel previews that library's glyphs. */
  iconLibraryKey?: string | null
  /** When true (Home), the panel shows the foundations overview checklist. */
  showOverview?: boolean
  onNavigateFoundation?: (key: string) => void
  /** When set, shows a header button to collapse the panel. */
  onCollapse?: () => void
}) {
  const tokens = usePreviewTokens(previewTheme)
  const specimen = focus && focus !== 'all' ? focus : null
  const title = showOverview
    ? 'Overview'
    : iconLibraryKey
    ? `${getIconLibrary(iconLibraryKey)?.label ?? 'Icon'} preview`
    : specimen
    ? FOCUS_TITLE[specimen]
    : 'Components Preview'
  // Show which theme is on display when it isn't the default light one.
  const themeBadge = !iconLibraryKey && previewTheme && previewTheme !== 'light' ? previewTheme : null

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-app">
      {/* Header */}
      <header className="flex items-center gap-2 px-5 h-[60px] border-b border-line/60 flex-shrink-0">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {themeBadge && (
          <span className="px-1.5 py-0.5 rounded-md bg-elevated text-[10px] font-medium text-accent-ui capitalize">
            {themeBadge}
          </span>
        )}
        {onCollapse && (
          <button
            onClick={onCollapse}
            aria-label="Collapse preview"
            title="Collapse preview"
            className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-fg-faint hover:text-fg hover:bg-elevated transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M15 4v16" />
            </svg>
          </button>
        )}
      </header>

      {/* Artboard — overview · icon set · a category specimen when focused · else component grid */}
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-5 flex flex-col gap-6">
        {showOverview ? (
          <OverviewChecklistPreview onOpenFoundation={onNavigateFoundation ?? (() => {})} />
        ) : iconLibraryKey ? (
          <IconSpecimenPreview libraryKey={iconLibraryKey} />
        ) : specimen === 'text' ? (
          <TextSpecimenPreview tokens={tokens} />
        ) : specimen === 'surface' || specimen === 'action' || specimen === 'status' ? (
          <BackgroundSpecimenPreview tokens={tokens} />
        ) : specimen === 'border' ? (
          <BorderSpecimenPreview tokens={tokens} />
        ) : specimen === 'icon' ? (
          <ForegroundSpecimenPreview tokens={tokens} />
        ) : (
          <>
            {/* The exact catalogue specimens (SPECIMENS — the same renderers the
                Components playground uses), so this panel can never drift from
                what the plugin ships: same heights (Sizes foundation), radius
                token, type scale and variant axes. */}
            <Group title="Button">
              <Tile tokens={tokens}>
                <ButtonSpec t={tokens} v={{ Style: 'Solid' }} />
                <ButtonSpec t={tokens} v={{ Style: 'Soft' }} />
                <ButtonSpec t={tokens} v={{ Style: 'Outline' }} />
                <ButtonSpec t={tokens} v={{ Style: 'Ghost' }} />
              </Tile>
            </Group>

            <Group title="Badge">
              <Tile tokens={tokens}>
                <BadgeSpec t={tokens} v={{ Style: 'Solid', Color: 'Brand' }} />
                <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Success' }} />
                <BadgeSpec t={tokens} v={{ Style: 'Outline', Color: 'Neutral' }} />
              </Tile>
            </Group>

            <Group title="Switch">
              <Tile tokens={tokens}>
                <SwitchSpec t={tokens} v={{ On: 'True' }} />
                <SwitchSpec t={tokens} v={{ On: 'False' }} />
              </Tile>
            </Group>

            <Group title="Form">
              <SignUpCardPreview tokens={tokens} />
            </Group>
          </>
        )}
      </div>
    </div>
  )
}

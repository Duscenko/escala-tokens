import { type ReactNode } from 'react'
import { usePreviewTokens } from '../../lib/previewTokens'
import { ButtonPreview, type PreviewTokens } from './ButtonPreview'
import { InputPreview } from './atoms/InputPreview'
import { BadgePreview } from './atoms/BadgePreview'
import { TogglePreview } from './atoms/TogglePreview'
import { SignUpCardPreview } from './atoms/SignUpCardPreview'
import { TextSpecimenPreview } from './atoms/TextSpecimenPreview'
import { BackgroundSpecimenPreview } from './atoms/BackgroundSpecimenPreview'
import { BorderSpecimenPreview } from './atoms/BorderSpecimenPreview'
import { ForegroundSpecimenPreview } from './atoms/ForegroundSpecimenPreview'
import { IconSpecimenPreview } from './atoms/IconSpecimenPreview'
import { OverviewChecklistPreview } from './atoms/OverviewChecklistPreview'
import { getIconLibrary } from '../../lib/iconLibraries'
import type { SemanticCategory } from '../configurator/Step3_SemanticTokens'

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
      style={{ background: tokens.surface, border: `1px solid ${tokens.border || '#eaecf0'}`, borderRadius: 14 }}
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
}: {
  focus?: SemanticCategory | null
  /** Theme whose tokens the atoms render in — driven by the Semantic eye toggle. */
  previewTheme?: string
  /** When set (Icons foundation), the panel previews that library's glyphs. */
  iconLibraryKey?: string | null
  /** When true (Home), the panel shows the foundations overview checklist. */
  showOverview?: boolean
  onNavigateFoundation?: (key: string) => void
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
          <span className="px-1.5 py-0.5 rounded-md bg-elevated text-[10px] font-medium text-[#5AADFF] capitalize">
            {themeBadge}
          </span>
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
            <Group title="Buttons">
              <Tile tokens={tokens}>
                <ButtonPreview variant="primary" size="md" labelType="text" label="Get started" tokens={tokens} />
                <ButtonPreview variant="secondary" size="md" labelType="text" label="Cancel" tokens={tokens} />
                <ButtonPreview variant="tinted" size="md" labelType="text" label="Learn more" tokens={tokens} />
                <ButtonPreview variant="primary" size="md" labelType="icon" label="Play" tokens={tokens} />
              </Tile>
            </Group>

            <Group title="Badges">
              <Tile tokens={tokens}>
                <BadgePreview tokens={tokens} />
              </Tile>
            </Group>

            <Group title="Toggle">
              <Tile tokens={tokens}>
                <TogglePreview tokens={tokens} defaultOn />
                <TogglePreview tokens={tokens} defaultOn={false} />
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

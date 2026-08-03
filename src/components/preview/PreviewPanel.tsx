import { type ReactNode } from 'react'
import { usePreviewTokens } from '../../lib/previewTokens'
import { type PreviewTokens } from './ButtonPreview'
import { SPECIMENS } from '../configurator/docs/specimens'
import { SignUpCardPreview } from './atoms/SignUpCardPreview'
import { SEMANTIC_SPECIMENS, SEMANTIC_SPECIMEN_TITLE } from './atoms/SemanticSpecimens'
import { IconSpecimenPreview } from './atoms/IconSpecimenPreview'
import { FontFamilyPreview } from './atoms/FontFamilyPreview'
import { getIconLibrary } from '../../lib/iconLibraries'
import { useDesignStore } from '../../store/useDesignStore'
import type { SemanticFocus } from '../configurator/Step3_SemanticTokens'

// Catalogue renderers reused verbatim — keys are plugin gates ('Toggle' ships
// with the display name "Switch").
const ButtonSpec = SPECIMENS.Button
const BadgeSpec = SPECIMENS.Badge
const SwitchSpec = SPECIMENS.Toggle
const CheckboxSpec = SPECIMENS.Checkbox
const SliderSpec = SPECIMENS.Slider
const StatusBadgeSpec = SPECIMENS.StatusBadge
const ToastSpec = SPECIMENS.Toast
const CardSpec = SPECIMENS.Card
const ModalSpec = SPECIMENS.Modal
const InputSpec = SPECIMENS.Input
const InputGroupSpec = SPECIMENS.InputGroup
const PasswordStrengthSpec = SPECIMENS.PasswordStrength
const DropzoneSpec = SPECIMENS.Dropzone
const SelectSpec = SPECIMENS.Select
const TabMenuSpec = SPECIMENS.TabMenu
const AvatarSpec = SPECIMENS.Avatar

// When the shell focuses a semantic group, the panel becomes a specimen for it.
// Titles + renderers both come from the specimen module, so a new focus can't
// be half-wired (a title with no specimen, or the reverse).
const FOCUS_TITLE = SEMANTIC_SPECIMEN_TITLE

// When no semantic focus is active, the panel instead tailors itself to the
// active Variables foundation — same idea (a live specimen for what you're
// editing), one level up. Only foundations with a dedicated set below get a
// title here; anything else (Icons/Opacity/Shadow/Grid) keeps the generic one.
const CATEGORY_TITLE: Record<string, string> = {
  color: 'Color preview',
  typography: 'Font preview',
  radius: 'Radius preview',
  spacing: 'Spacing preview',
  sizes: 'Sizes preview',
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

// ── Color collage ──────────────────────────────────────────────────────────
// The Color foundation's specimen is ONE composite surface, not a stack of
// titled tiles. Two reasons it's built this way:
//  · Density — the old one-Group-per-component layout spent most of its height
//    on captions and tile borders, so only two or three components were ever
//    on screen at once. Colour is the foundation with the widest blast radius,
//    and you can only judge it by seeing many components repaint TOGETHER.
//  · Systemic connection — every specimen here reads the same tokens (radius,
//    sizes, type scale, semantic colours) off `t`, so moving the Radius slider
//    or the accent visibly moves buttons, inputs, the uploader and the toast in
//    lockstep. Sharing one surface is what makes that legible; separate tiles
//    read as unrelated samples.
// Keep the components token-driven catalogue SPECIMENS (never hand-rolled
// markup) so this can't drift from what the plugin ships.
function ColorCollage({ tokens, iconPrefix }: { tokens: PreviewTokens; iconPrefix: string }) {
  // Icons come from the system's OWN library, so the collage's lead button is
  // one more thing that repaints when a foundation changes.
  const icons = { prefix: iconPrefix, leading: true, trailing: true }
  return (
    <div
      className="flex flex-col gap-3.5 p-4"
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.borderDefault || tokens.border || '#eaecf0'}`,
        borderRadius: 14,
      }}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <ButtonSpec t={tokens} v={{ Style: 'Solid' }} icons={icons} />
        <ButtonSpec t={tokens} v={{ Style: 'Outline' }} />
        <ButtonSpec t={tokens} v={{ Style: 'Soft' }} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <StatusBadgeSpec t={tokens} v={{ Status: 'Online' }} />
        <StatusBadgeSpec t={tokens} v={{ Status: 'Away' }} />
        <StatusBadgeSpec t={tokens} v={{ Status: 'Busy' }} />
        <StatusBadgeSpec t={tokens} v={{ Status: 'Offline' }} />
      </div>

      <SliderSpec t={tokens} v={{}} />

      {/* One switch, not an on/off pair — each Switch specimen renders its own
          "Notifications" label, so two of them read as a duplicated row. */}
      <div className="flex flex-wrap items-center gap-4">
        <CheckboxSpec t={tokens} v={{ Checked: 'True' }} />
        <SwitchSpec t={tokens} v={{ On: 'True' }} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <BadgeSpec t={tokens} v={{ Style: 'Solid', Color: 'Brand' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Brand' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Outline', Color: 'Neutral' }} />
      </div>

      {/* Semantic states — the four status ramps, side by side, so an edit to
          any one of them is visible without leaving the Color foundation. */}
      <div className="flex flex-wrap items-center gap-2.5">
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Error' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Success' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Warning' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Info' }} />
      </div>

      <ToastSpec t={tokens} v={{ Status: 'Success' }} />
      <DropzoneSpec t={tokens} v={{}} />
      <SelectSpec t={tokens} v={{}} />
      <InputGroupSpec t={tokens} v={{}} />
      <PasswordStrengthSpec t={tokens} v={{ Strength: 'Weak' }} />

      <div className="flex items-center justify-between gap-3">
        <TabMenuSpec t={tokens} v={{}} />
        <AvatarSpec t={tokens} v={{ Size: 'MD' }} />
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────
export default function PreviewPanel({
  focus = null,
  categoryKey = null,
  previewTheme = 'light',
  iconLibraryKey = null,
  onCollapse,
}: {
  focus?: SemanticFocus | 'all' | null
  /** Active Variables foundation key (`color`|`typography`|`radius`|…) — tailors
   *  the generic fallback below to a live specimen set for that foundation. */
  categoryKey?: string | null
  /** Theme whose tokens the atoms render in — driven by the Semantic eye toggle. */
  previewTheme?: string
  /** When set (Icons foundation), the panel previews that library's glyphs. */
  iconLibraryKey?: string | null
  /** When set, shows a header button to collapse the panel. */
  onCollapse?: () => void
}) {
  const tokens = usePreviewTokens(previewTheme)
  const specimen = focus && focus !== 'all' ? focus : null
  const title = iconLibraryKey
    ? `${getIconLibrary(iconLibraryKey)?.label ?? 'Icon'} preview`
    : specimen
    ? FOCUS_TITLE[specimen]
    : (categoryKey && CATEGORY_TITLE[categoryKey]) || 'Components Preview'
  // Show which theme is on display when it isn't the default light one.
  const themeBadge = !iconLibraryKey && previewTheme && previewTheme !== 'light' ? previewTheme : null
  const collageIconPrefix = getIconLibrary(useDesignStore((s) => s.iconLibrary))?.iconifyPrefix ?? 'lucide'

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-app">
      {/* Header */}
      <header className="flex items-center gap-2 px-5 h-[52px] border-b border-line/60 flex-shrink-0">
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
        {iconLibraryKey ? (
          <IconSpecimenPreview libraryKey={iconLibraryKey} />
        ) : specimen ? (
          SEMANTIC_SPECIMENS[specimen]({ tokens })
        ) : categoryKey === 'color' ? (
          <ColorCollage tokens={tokens} iconPrefix={collageIconPrefix} />
        ) : categoryKey === 'typography' ? (
          <>
            <Group title="Button">
              <Tile tokens={tokens}>
                <ButtonSpec t={tokens} v={{ Style: 'Solid' }} />
                <ButtonSpec t={tokens} v={{ Style: 'Outline' }} />
              </Tile>
            </Group>

            <Group title="Font family">
              <FontFamilyPreview tokens={tokens} />
            </Group>
          </>
        ) : categoryKey === 'radius' ? (
          <>
            {/* Highest-visual-impact surfaces — every corner here reads the
                same `radius` token live, from a pill button to a modal. */}
            <Group title="Button">
              <Tile tokens={tokens}>
                <ButtonSpec t={tokens} v={{ Style: 'Solid' }} />
                <ButtonSpec t={tokens} v={{ Style: 'Outline' }} />
              </Tile>
            </Group>

            <Group title="Card">
              <CardSpec t={tokens} v={{}} />
            </Group>

            <Group title="Input">
              <InputSpec t={tokens} v={{}} />
            </Group>

            <Group title="Modal">
              <ModalSpec t={tokens} v={{}} />
            </Group>
          </>
        ) : categoryKey === 'spacing' || categoryKey === 'sizes' ? (
          <>
            {/* The token tables already carry the comparative bars; these add
                real components so the effect reads, not just the px value. */}
            <Group title="Button sizes">
              <Tile tokens={tokens}>
                <ButtonSpec t={tokens} v={{ Size: 'SM' }} />
                <ButtonSpec t={tokens} v={{ Size: 'MD' }} />
                <ButtonSpec t={tokens} v={{ Size: 'LG' }} />
                <ButtonSpec t={tokens} v={{ Size: 'XL' }} />
              </Tile>
            </Group>

            <Group title="Card padding">
              <CardSpec t={tokens} v={{}} />
            </Group>
          </>
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

// Changelog — moved here from the About accordion (see AboutMenu.tsx): "what
// shipped when" is documentation, not corporate/about copy, so it belongs
// under the Docs destination next to the rest of the token reference rather
// than buried in a drawer six clicks from the workspace.

import { type ReactNode } from 'react'
import { COMPONENT_KEYS } from '../../../lib/componentCatalogue'
import { DocHeader, DocTitle, type TocEntry } from './blocks'

export const CHANGELOG_KEY = '__changelog'

export function changelogToc(): TocEntry[] {
  return [{ id: 'description', label: 'Overview' }]
}

/** One shipped change — date left, summary right. Dates are release dates
 *  from the project's own history, not invented milestones. */
function Entry({ date, children }: { date: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-line/60 last:border-b-0">
      {/* nowrap + room for all 10 chars: at this root font-size an ISO date
          wrapped to "2026-07-" / "29" in a narrower column. */}
      <span className="flex-shrink-0 w-[78px] text-caption font-mono tabular-nums whitespace-nowrap text-fg-faint pt-[2px]">{date}</span>
      <span className="min-w-0 text-body leading-relaxed text-fg-muted">{children}</span>
    </div>
  )
}

export function ChangelogArticle() {
  return (
    <div className="flex flex-col gap-8">
      <DocHeader section="Docs" kind="Get started" title="Changelog" actions={null} />
      <DocTitle
        title="Changelog"
        eyebrow="Reference"
        lead="What shipped, and when — release dates from the project's own history."
      />
      <div className="flex flex-col max-w-2xl">
        <Entry date="2026-07-29">
          Escala JSON export always ships the full plugin contract. Architecture-aware semantic
          preview; dark-mode tone inversions fixed across the role catalogue.
        </Entry>
        <Entry date="2026-07-29">
          Picker Color tab, and the export flow gained system identity: name, save and GitHub
          status at the payoff step.
        </Entry>
        <Entry date="2026-07-28">
          Variables-first navigation, guided token creation, sticky category preview.
        </Entry>
        <Entry date="2026-07-27">
          Radix two-scale primitives: every family ships a light ramp and a dark twin. Editable
          semantic architectures, the guided export wizard, and the top-nav workspace.
        </Entry>
        <Entry date="2026-07-20">
          Semantic architecture picker (Flat · Categorical · Vibrancy · Tonal), Save &amp; Share
          hub, import and new-system flows.
        </Entry>
        <Entry date="2026-07-18">Color became a multi-tab hub; theme-aware brand lockup.</Entry>
        <Entry date="2026-07-16">
          Dark-appearance neutral ramps, accent-derived gradients, Variables/Styles rail split.
        </Entry>
        <Entry date="2026-07-13">Gradients foundation with a full HSV picker.</Entry>
        <Entry date="2026-07-12">
          Documentation tab; catalogue expanded to {COMPONENT_KEYS.length} components.
        </Entry>
        <Entry date="2026-07-08">Interactive component playground wired to the plugin contract.</Entry>
        <Entry date="2026-07-07">
          Export normalizes semantics so every token aliases a real primitive.
        </Entry>
        <Entry date="2026-06-14">
          Figma sync pipeline: per-system scoping and theme columns.
        </Entry>
      </div>
    </div>
  )
}

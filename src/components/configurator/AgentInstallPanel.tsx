// Installs the Design skills (the offline agent package) — the Export wizard's payoff step when
// the destination is AI assistant.
//
// Shape: a CLIENT tab row (Cursor · Claude Code · Figma Make) over numbered
// steps — each row is `[nn] [what + why] | [the command, with Copy]`. The
// numbers are the point: installing the package is a procedure, and one that
// says how many steps it has does not read as open-ended.
//
// Two rules this file exists to keep:
//  1. **Every string comes from `lib/agentInstall.ts`.** Nothing here composes a
//     command inline, so a path printed here cannot drift from the zip's
//     `skillName()` or from what the CLI parses.
//  2. **A client only gets a step it can actually run.** Figma Make consumes an
//     uploaded zip, so its steps are export + upload, not a command.

import { useState, type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import {
  offlineSkillCommand,
  agentBundleZipName,
  skillInstallPath,
  type SkillAgent,
} from '../../lib/agentInstall'
import { publishOrigin, syncProjectId } from '../../lib/figmaSync'
import { CopyButton } from './docs/blocks'
import { CLI_PUBLISHED } from '../../lib/featureFlags'

export type InstallClient = SkillAgent | 'make'

const TABS: { id: InstallClient; label: string; logo: string }[] = [
  { id: 'cursor', label: 'Cursor', logo: 'cursor' },
  { id: 'claude', label: 'Claude Code', logo: 'claudecode' },
  // Figma Make is a Figma product; it carries the Figma mark.
  { id: 'make', label: 'Figma Make', logo: 'figma' },
]

type Step = {
  title: string
  body: ReactNode
  code?: string
  /** Filename shown above a multi-line payload — omit for a shell command. */
  file?: string
}

export default function AgentInstallPanel({ initialClient = 'cursor' }: { initialClient?: InstallClient }) {
  const [tab, setTab] = useState<InstallClient>(initialClient)
  const projectName = useDesignStore((s) => s.projectName) || 'Escala'
  const steps = stepsFor(tab, publishOrigin(), syncProjectId(), projectName)

  return (
    <div className="rounded-xl border border-line bg-surface/50 overflow-hidden">
      <div className="px-4 pt-3.5 pb-1 flex flex-col gap-1">
        <span className="text-ui font-medium text-fg">Design skills</span>
        <p className="text-body text-fg-muted leading-relaxed">
          Skills that teach your agent to design and build with this system instead of guessing. Run it in the{' '}
          <strong className="font-medium text-fg">product</strong> repo: the app you are building, not Escala.
        </p>
      </div>

      <div className="flex items-center gap-0.5 px-3 pt-3 pb-3 border-b border-line overflow-x-auto">
        {TABS.map(({ id, label, logo }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-body font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'bg-elevated text-fg shadow-sm' : 'text-fg-faint hover:text-fg'
            }`}
          >
            <ClientLogo name={logo} active={tab === id} />
            {label}
          </button>
        ))}
      </div>

      <ol className="flex flex-col">
        {steps.map((step, i) => (
          <StepRow key={step.title} n={i + 1} step={step} last={i === steps.length - 1} />
        ))}
      </ol>
    </div>
  )
}

/** Where the package comes from, said once in the step. The CLI downloads
 *  it; until the CLI is on npm it is the zip Export → AI assistant saves. */
function offlineSource(projectName: string): ReactNode {
  if (CLI_PUBLISHED) return null
  return <>Unzip <Mono>{agentBundleZipName(projectName)}</Mono> from Export → AI assistant. </>
}

function stepsFor(tab: InstallClient, origin: string, slug: string, projectName: string): Step[] {
  if (tab === 'make') {
    return [
      {
        title: 'Export the zip',
        body: (
          <>
            In Export pick <Mono>AI assistant</Mono>, then check{' '}
            <Mono>Figma Make only</Mono> for the smaller package.
          </>
        ),
      },
      {
        title: 'Upload it as-is',
        body: (
          <>
            Figma Make reads an uploaded zip. This does not replace Figma variables; the Escala plugin
            still does that.
          </>
        ),
      },
    ]
  }

  return [
    {
      title: 'Install the Design skills',
      body: (
        <>
          Your token names, usage rules and the component catalogue, with no network. {offlineSource(projectName)}Lands in <Mono>{skillInstallPath(tab, projectName)}</Mono>.
        </>
      ),
      code: offlineSkillCommand(tab, slug, projectName, origin),
    },
  ]
}

/** `[nn] [title + why] | [command]`. The two-column split is what makes the
 *  command scannable — it's the thing you came for, so it gets its own column
 *  rather than sitting at the end of a paragraph. Collapses to one column
 *  below `md`, where two would leave ~130px per side. */
function StepRow({ n, step, last }: { n: number; step: Step; last: boolean }) {
  // A step with no command (Figma Make's two)
  // takes the whole row instead of keeping a 42% column and leaving 58% blank
  // beside it — the column split exists to give the COMMAND its own space, so
  // with no command there's nothing for it to do.
  const split = !!step.code
  return (
    <li className={`flex flex-col md:flex-row md:items-start gap-3 px-4 py-3.5 ${last ? '' : 'border-b border-line'}`}>
      <div className={`flex items-start gap-2.5 min-w-0 ${split ? 'md:w-[42%] flex-shrink-0' : 'flex-1'}`}>
        <span className="text-mini font-mono tabular-nums text-fg-faint pt-0.5 flex-shrink-0">
          {String(n).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <span className="block text-ui font-medium text-fg">{step.title}</span>
          <p className="text-caption text-fg-faint leading-relaxed mt-0.5">{step.body}</p>
        </div>
      </div>
      {step.code && (
        <div className="flex-1 min-w-0">
          <CommandPane code={step.code} file={step.file} />
        </div>
      )}
    </li>
  )
}

/** A command in the step's right column. A shell command renders with a `$`
 *  and no chrome bar — a one-liner does not need a filename strip above it —
 *  while a config payload gets its filename, because WHERE it goes is half the
 *  instruction. */
function CommandPane({ code, file }: { code: string; file?: string }) {
  return (
    <div className="rounded-lg border border-line bg-app overflow-hidden">
      {file && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-line bg-elevated/40">
          <span className="text-mini font-mono text-fg-faint truncate">{file}</span>
          <CopyButton text={code} />
        </div>
      )}
      <div className="flex items-start gap-2 px-3 py-2.5">
        {!file && <span className="text-caption font-mono text-fg-faint select-none flex-shrink-0">$</span>}
        <pre className="flex-1 min-w-0 text-caption font-mono text-fg leading-relaxed whitespace-pre-wrap break-all m-0">
          {code}
        </pre>
        {!file && (
          <span className="flex-shrink-0 -mt-0.5">
            <CopyButton text={code} />
          </span>
        )}
      </div>
    </div>
  )
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[0.92em] px-1 py-0.5 rounded bg-elevated/70 border border-line text-fg-muted">
      {children}
    </code>
  )
}

// ── Client logos ────────────────────────────────────────────────────────────
// Real vendor marks now (`public/ide-logos/`), a deliberate reversal of the
// earlier hand-drawn-glyphs decision — a real logo tells the four options
// apart faster than an abstraction of one.
//
// Each mark ships as two files with a hardcoded fill: `<name>-dark.svg` is
// BLACK (for light mode), `<name>-light.svg` is WHITE (for dark mode). They're
// `<img>` from `public/`, not inline SVG, so `currentColor` never touches them
// — hence the two-file swap on the `.dark` class instead. The active/inactive
// distinction is opacity only (a logo shouldn't change colour between tab
// states, just dim when it's not the one selected).
function ClientLogo({ name, active }: { name: string; active: boolean }) {
  return (
    <span className={`flex-shrink-0 ${active ? 'opacity-100' : 'opacity-55'}`}>
      <img
        src={`/ide-logos/${name}-dark.svg`}
        alt=""
        aria-hidden
        className="w-3.5 h-3.5 dark:hidden"
      />
      <img
        src={`/ide-logos/${name}-light.svg`}
        alt=""
        aria-hidden
        className="w-3.5 h-3.5 hidden dark:block"
      />
    </span>
  )
}

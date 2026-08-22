// Shared AI-context contract — one scope model, one set of microcopy, one
// markdown envelope. The Rainbow + sparkle button is chrome; this file is
// the payload and the words on it.
//
//   global    — whole system (Skill brief)
//   component — one catalogue page
//   variable  — one foundation (color, type, radius, …)

export type AIContextScope = 'global' | 'component' | 'variable'

export interface AIContextCopy {
  /** Button label at rest. */
  label: string
  /** Button label after a successful copy. */
  done: string
  /** Tooltip on the trailing “i”. */
  hint: string
  /** Success toast. */
  toast: string
  /** First paragraph inside the markdown envelope (LLM instruction). */
  instruction: string
}

export const AI_CONTEXT_COPY: Record<AIContextScope, AIContextCopy> = {
  global: {
    label: 'Copy context to Agents',
    done: 'Copied',
    hint: 'Copies the full design system as markdown for an AI agent: collections, semantic roles, typography, spacing, and the Skill brief. Paste it into Cursor or Claude.',
    toast: 'System context copied for agents',
    instruction: 'Use this markdown as the source of truth for the whole product. Prefer these token names over exploring the repo. Do not invent parallel names, hex, or px when a token exists.',
  },
  component: {
    label: 'Copy context to Agents',
    done: 'Copied',
    hint: 'Copies this page as markdown for an AI agent: Figma set, live tokens (radius, padding, size, spacing, type), semantic color bindings, and the API. Paste it into Cursor or Claude so the agent can implement the component without guessing names or px.',
    toast: 'Component context copied for agents',
    instruction: 'Use this markdown as the source of truth for implementing this component in code or Figma. Bind paints to semantic variables only. Layout comes from the Design tokens tables — do not invent px.',
  },
  variable: {
    label: 'Copy context to Agents',
    done: 'Copied',
    hint: 'Copies this foundation as markdown for an AI agent: why the tokens exist, how to use them, live names, and how they ship in CSS, JSON, and Figma. Paste it into Cursor or Claude.',
    toast: 'Variable context copied for agents',
    instruction: 'Use this markdown as the source of truth for this foundation only. Prefer these token names in CSS, JSON, and Figma. Do not hardcode px, rem, or hex when a token exists.',
  },
}

/** LLM-oriented wrapper so every scope pastes with the same front matter. */
export function withAgentEnvelope(scope: AIContextScope, title: string, body: string): string {
  const copy = AI_CONTEXT_COPY[scope]
  return [
    '---',
    `scope: ${scope}`,
    `title: ${title}`,
    'source: escala-tokens',
    'format: agent-context/v1',
    '---',
    '',
    `# Agent context — ${title}`,
    '',
    copy.instruction,
    '',
    body.trim(),
    '',
  ].join('\n')
}

export function resolveMarkdown(markdown: string | (() => string)): string {
  return typeof markdown === 'function' ? markdown() : markdown
}

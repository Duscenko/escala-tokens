/** MCP tool layer. Store-free, Blob-free — the HTTP handler injects `loadTokens`. */

import type { TokenJSON } from '../agentBundle/types.js'
import { INTENT_THRESHOLDS, type IntentClass } from '../color/apca.js'

export type { IntentClass }

const INTENT_ENUM = Object.keys(INTENT_THRESHOLDS) as IntentClass[]

export interface LoadTokens {
  (project?: string | null): Promise<TokenJSON | null>
}

export interface ToolSpec {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
    additionalProperties?: boolean
  }
}

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'get_tokens',
    description:
      'Return the published Escala TokenJSON for a project slug (same payload as GET /api/tokens?project=). project is required.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project slug (slugify of the system name).' },
      },
      required: ['project'],
      additionalProperties: false,
    },
  },
  {
    name: 'resolve_token',
    description:
      'Resolve one token to Figma name, CSS var(), and values (hex/px per theme). Accepts catalogue ids (action.primary.default), Figma slashes (Action/primary/default), primitive keys (accent-6), alpha primitives (accent-a-3, black-a-8), and foundations (radius.lg, stroke.sm, selector.md). Foundation values come from foundationsByTheme when the published payload has it — the root map is only the fallback. A semantic value may come back as 8-digit #rrggbbaa. project is required: this server reads the last published Blob, not unsaved editor state.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Role id, Figma name, primitive key, or foundation id.' },
        project: { type: 'string', description: 'Published project slug (slugify of the system name). Required.' },
      },
      required: ['token', 'project'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_components',
    description: 'List the Escala component catalogue (keys, categories, axes, Figma sets). Does not invent components.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category filter (e.g. "Button & Actions").' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_component',
    description: 'One catalogue entry: props, accessibility, Figma sets, variant axes. Key must exist in the catalogue.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Catalogue key, e.g. Button, InputOTP.' },
      },
      required: ['key'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_icons',
    description: 'Icon AI source (repo/npm) and custom icon names for a published system. project is required.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Published project slug (slugify of the system name).' },
      },
      // The handler has always thrown without it; leaving it out of `required`
      // just meant an agent trusting the schema called with no args and got an
      // error instead of icons.
      required: ['project'],
      additionalProperties: false,
    },
  },
  {
    name: 'check_contrast',
    description:
      'WCAG 2.1 ratio and APCA Lc for a foreground/background pair. Uses src/lib/color/apca.ts — do not treat a WCAG-only pass as done. APCA is directional: pass the text color first.',
    inputSchema: {
      type: 'object',
      properties: {
        foreground: { type: 'string', description: 'sRGB hex of the text/icon (first argument to APCA).' },
        background: { type: 'string', description: 'sRGB hex of the surface.' },
        intent: {
          type: 'string',
          enum: INTENT_ENUM,
          description: 'Defaults to body-text. action-label is the button/chip row (WCAG 4.5 + APCA Lc 60). A pair passes only if both WCAG and APCA clear the intent floors.',
        },
      },
      required: ['foreground', 'background'],
      additionalProperties: false,
    },
  },
]

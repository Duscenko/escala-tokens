/** MCP tool layer. Store-free, Blob-free — the HTTP handler injects `loadTokens`. */

import type { TokenJSON } from '../agentBundle'

export type IntentClass = 'body-text' | 'large-text' | 'ui-component' | 'decorative' | 'surface'

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
      additionalProperties: false,
    },
  },
  {
    name: 'resolve_token',
    description:
      'Resolve one token to Figma name, CSS var(), and values (hex per theme, or px). Accepts catalogue ids (action.primary.default), Figma slashes (Action/primary/default), or primitive keys (accent-6).',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Role id, Figma name, or primitive key.' },
        project: { type: 'string', description: 'Project slug. Required unless TokenJSON is already loaded by the server for the latest publish.' },
      },
      required: ['token'],
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
    description: 'Icon AI source (repo/npm) and custom icon names for a published system.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string' },
      },
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
          enum: ['body-text', 'large-text', 'ui-component', 'decorative', 'surface'],
          description: 'Defaults to body-text. A pair passes only if both WCAG and APCA clear the intent floors.',
        },
      },
      required: ['foreground', 'background'],
      additionalProperties: false,
    },
  },
]

// The fenced block that makes a context importable: the complete Escala JSON
// under ```json escala-tokens. Dependency-free on purpose — the Figma plugin
// bundles `agentBundle/fromJson.ts`, which uses it, and must not pull the store.
// Readers: `extractEscalaPayload` (figmaContext.ts) and its mirror in
// escala-figma-plugin/src/ui.html.

/** The fence info string. A plain ```json fence and a bare JSON paste are
 *  accepted too, so this is a label, not a contract. */
export const FIGMA_CONTEXT_FENCE = 'json escala-tokens'

export function escalaPayloadFence(json: string): string {
  return ['```' + FIGMA_CONTEXT_FENCE, json, '```'].join('\n')
}

/** The closing section every whole-system context ends with (web All
 *  foundations, the Figma page, the plugin's Copy context). */
export function escalaPayloadSection(json: string): string {
  return [
    '## Escala JSON',
    '',
    'The complete token system. Paste this whole message into the Escala plugin in Figma (context card, ⌘V → Import into this file) or into escalatokens.com (Add brand → Import agent context); an agent can read the values from it too.',
    '',
    escalaPayloadFence(json),
    '',
  ].join('\n')
}

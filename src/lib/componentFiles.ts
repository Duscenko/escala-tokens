// File names for catalogue components (escala-ui / shadcn layout). Pure and
// store-free: the agent package imports it, and that package is bundled into
// the Figma plugin. `agentContext.ts` re-exports both helpers.

/** Keys that live in a sibling's file (shadcn groups them that way). */
const FILE_OF: Record<string, string> = { Dropzone: 'file-upload', StatusBadge: 'badge' }

/** The escala-ui / shadcn file a catalogue key lives in: kebab case
 *  (`InputOTP` → `input-otp`, `ButtonGroup` → `button-group`) — the same name
 *  the registry serves (`registryItemFor`, asserted in agentContextAudit.test;
 *  the generated sources are too large to import into the app for this). */
export function componentFileName(key: string): string {
  if (FILE_OF[key]) return FILE_OF[key]
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase()
}

/** `import { X } from "@/components/ui/<file>"` for a catalogue key. */
export function componentImportLine(key: string): string {
  return `import { ${key.replace(/\s+/g, '')} } from "@/components/ui/${componentFileName(key)}"`
}

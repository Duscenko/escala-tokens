/**
 * The test project does not load `vite/client` (it would leak DOM globals into node tests), but tests render blocks
 * that import pictures (`blocks/mediaSamples.ts`). Vite and Vitest resolve such an import to its URL string; this says so.
 */
declare module '*.jpg' {
  const src: string
  export default src
}

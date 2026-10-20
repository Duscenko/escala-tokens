// Token resolution for agent-facing outputs (the shadcn registry, the offline
// skill). Store-free and Blob-free: callers hand in a published TokenJSON.
export type { TokenJSON } from '../agentBundle/types.js'
export { resolveToken, normalizeTokenId, type ResolvedToken } from './resolveToken.js'
export { listComponents, getComponent } from './components.js'
export { checkContrast, parseIntent } from './contrast.js'

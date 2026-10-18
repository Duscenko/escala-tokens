// Product surfaces that are switched off without being deleted.
//
// MCP: the hosted server answers 410 ("paused") and the offline skill +
// design.md from Export replaces it. Every user-facing mention (About,
// Pricing, Docs, Export, Login, Legal) is gated on this flag, so bringing the
// MCP back is one line here plus restoring the sitemap entry. The server,
// the protocol code (`lib/agentAccess`) and the install builders
// (`lib/agentInstall`) are untouched.
export const MCP_VISIBLE = false

/**
 * Per-browser feature flags. UI chrome, not design data: never in the store.
 *
 * `shadcnSkeleton` — Button, Input, Card and Modal render with the shadcn
 * skeleton (`components/escala-ui/`) painted from the shared recipe
 * (`lib/componentRecipes.ts`). Phase 0 of design-plans/shadcn-component-skeleton.md.
 *   on:  `?skeleton=shadcn`  (remembered in this browser)
 *   off: `?skeleton=legacy`
 */
const SKELETON_KEY = 'sd-flag-shadcn-skeleton'

function readSkeletonFlag(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const param = new URLSearchParams(window.location.search).get('skeleton')
    if (param === 'shadcn') window.localStorage.setItem(SKELETON_KEY, '1')
    if (param === 'legacy') window.localStorage.removeItem(SKELETON_KEY)
    return window.localStorage.getItem(SKELETON_KEY) === '1'
  } catch {
    return false
  }
}

/** Read once per page load: flipping it mid-session would remount every specimen. */
export const SHADCN_SKELETON: boolean = readSkeletonFlag()

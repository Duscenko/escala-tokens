// Product surfaces that are switched off without being deleted.
//
// MCP: the hosted server answers 410 ("paused") and the offline skill +
// design.md from Export replaces it. Every user-facing mention (About,
// Pricing, Docs, Export, Login, Legal) is gated on this flag, so bringing the
// MCP back is one line here plus restoring the sitemap entry. The server,
// the protocol code (`lib/agentAccess`) and the install builders
// (`lib/agentInstall`) are untouched.
export const MCP_VISIBLE = false

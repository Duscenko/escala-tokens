// Product surfaces that are switched off without being deleted.
//
// MCP: the hosted server answers 410 ("paused") and the offline skill +
// design.md from Export replaces it. Every user-facing mention (About,
// Pricing, Docs, Export, Login, Legal) is gated on this flag, so bringing the
// MCP back is one line here plus restoring the sitemap entry. The server,
// the protocol code (`lib/agentAccess`) and the install builders
// (`lib/agentInstall`) are untouched.
export const MCP_VISIBLE = false

// System Styles (Core, Neo-Brutalism, Cupertino/Glass, Material, Retro,
// Nature): curated looks a brand could start from. Hidden: new visitors were
// landing on a try-on of one, adding it and continuing, instead of making
// their own. The flow is now enter → the editor (create studio) → change →
// export. While this is false nothing seeds a try-on, Home has no System
// styles row, "How do you want to start" offers Blank · From code only, and
// the create form has no Style picker. The presets, the try-on overlay and
// `openStyleForEditing` are untouched; flip this to bring them back.
export const SYSTEM_STYLES_VISIBLE = false

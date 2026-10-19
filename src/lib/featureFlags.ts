// Product surfaces that are switched off without being deleted.
//
// MCP: the hosted server answers 410 ("paused") and the offline skill +
// design.md from Export replaces it. Every user-facing mention (About,
// Pricing, Docs, Export, Login, Legal) is gated on this flag, so bringing the
// MCP back is one line here plus restoring the sitemap entry. The server,
// the protocol code (`lib/agentAccess`) and the install builders
// (`lib/agentInstall`) are untouched.
export const MCP_VISIBLE = false

// CLI: `@escala/cli` is NOT on npm yet (`npm view @escala/cli` → 404; see
// design-plans/pricing-and-packaging.md, item 11). While this is false no
// surface may print an `npx @escala/cli …` command — every one of them would
// fail. The offline package is installed by unzipping the Export instead
// (`offlineSkillCommand`). Flip this the day the package is published.
export const CLI_PUBLISHED = false

// System Styles (Core, Neo-Brutalism, Cupertino/Glass, Material, Retro,
// Nature): curated looks a brand could start from. Hidden: new visitors were
// landing on a try-on of one, adding it and continuing, instead of making
// their own. The flow is now enter → the editor (create studio) → change →
// export. While this is false nothing seeds a try-on, Home has no System
// styles row, "How do you want to start" offers Blank · From code only, and
// the create form had no Style picker. Exception (2026-10-19): the create
// form shows a "Start from" list again — there the person is already making
// their own system, and a style only seeds the form (nothing is tried on or
// added). The presets, the try-on overlay and
// `openStyleForEditing` are untouched; flip this to bring them back.
export const SYSTEM_STYLES_VISIBLE = false

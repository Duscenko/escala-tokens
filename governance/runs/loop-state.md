# Escala loop state

Branch: `loop/2026-11-16-sync-and-auth` (base `refactor/escala-v0.11`). Prompt: `~/Downloads/escala-loop-prompt.md` (copy at the bottom of this file's resume line).

## Repo reality vs the prompt (read first)
The prompt names `packages/ui`, `tokens/`, `governance/`, `contract.json`, Code Connect files. This repo has none of them except what the loop created:
- tokens = `src/lib/layoutTokens.ts` (dimension roles), `src/lib/semanticArchitectures.ts` (colour roles), `src/lib/roleNames.ts`; store migrations in `src/store/useDesignStore.ts` (now v151)
- components = `src/components/escala-ui/*.tsx` + recipes `src/lib/recipes/*.ts` (the one styling source)
- Storybook = `apps/storybook` (`npm run storybook`, port 6006); Figma snapshot = `spec/figma-components.json` (+ `.status.json` ledger)
- `governance/` created by the loop (ledger, findings, registry, runs). No `contract.json`: the recipe + catalogue entry + Figma snapshot play that role.
Figma limits found: `figma.saveVersionHistoryAsync` is unavailable via `use_figma` (no named `pre-sync` version); the run file records a rule-based revert instead.

## Queue A
| # | Status | Note |
|---|---|---|
| A0 | done | `governance/ledger/DEC-2026-11-16-001..003` |
| A1 | done | ladder 0·4·8·12·20·24·full; container pins `dimension-20`; store v151 + test |
| A2 | done | `radius.item` role + 4th axis Items; Segmented, SidebarMenuButton on it; skill refs regenerated. escalatokens.com role catalogue comes from the same tables (verify on deploy) |
| A3 | done | Avatar, Chip, Tooltip → `radius.action` in code; Figma Avatar/AvatarGroup/Chip rebound (278 + 168 nodes) |
| A4 | done | FeaturedIcon `gradient` (recipe props `fillMid`/`fillEnd`); finding COL-003 (#13) |
| A5 | done | DropdownMenu header/content/footer inset-control, header bottom none; items on action |
| A6 | done | ComboboxPopover, ComboboxItem (lg inset-control), InputTagOption, PopoverFooter |
| A7 | done | border.default a.2, border.subtle a.1 (test carries the 3 roles the Figma inventory lacks) |
| A8 | blocked | COL-002 → issue #12 needs-decision |
| A9 | done (departure) | critical Dark tint a.3; solids stay solved (default system already = Light 09/10/11, Dark 08/07/06). "Fixed" alias candidate is a Figma-alias detail; nothing in code to change |
| A10 | done | Switch thumb + io glyph |
| A11 | todo | FeaturedIcon doc boards show `gradient` (escala-component-docs, Figma write) |

## Queue B (issues #14–#17, label figma-comment)
- 2009061666 Sidebar: fixed code + Figma (Avatar rounded 12) → reply + resolve after merge
- 2007003612 Accordion: code aligned to Figma (label heading-2xs, disabled underline); ambiguous → owner may clarify
- 2006995908 Segmented 8px: code done, Figma already 8
- 2003506441 SidebarNavigation board: blocked (needs-decision), no instruction in the comment
Resolve in Figma UI / reply `✅ Resolved …` only after merge + sync. None resolved yet.

## Queue C
| Piece | Status | Branch / PR |
|---|---|---|
| SocialLoginButton (prerequisite, rebuilt) | done | `loop/2026-11-16-social-login-button` · PR #19 |
| Auth (12 blocks) | done, awaiting-approval | `loop/2026-11-16-sync-and-auth` · PR #20 (stacked) |
| Overlay (15 sets, page `1027:146815`) | todo | next |
| HeaderNavigation (5, `1059:2`) | todo | |
| SidebarNavigation (2, `1064:2`) | todo | |
| Marketing (6, `1066:2`) | todo | |
Queue A PR: #18 (`loop/2026-11-16-a-tokens-recipes`, base `refactor/escala-v0.11`). Stack: #18 ← #19 ← #20; each next piece branches from the previous one.
Block recipe used for Auth (reuse it): read the page with `use_figma` (instances, props, texts, padding bindings), write `blocks/<page>.tsx` (shell + blocks, CSS role vars via `cssVarOf`, `liftShadow` for card elevation), `blocks/<page>.contract.json`, `__tests__/<page>Blocks.test.ts`, stories `apps/storybook/stories/blocks/<Page><Name>.stories.tsx` (tag `stage:storybook`, Playground · Containers · States · Motion), registry entries. Measure motion in Storybook with a real click (programmatic `.click()` inside the iframe did not fire React).

## Open findings / issues
#12 COL-002 · #13 COL-003 · #17 board comment · SNP-001 snapshot stale (`ahead` ledger) · CMP-005 InputTagChip radius (8→4, unverified vs Figma)

## Not yet verified
`npm run build` and `npm run build-storybook` not run; Dark screenshots of the Auth blocks not taken; Figma node for each Auth block icon not read.

## Next step
Overlay: read page `1027:146815` (15 single-variant sets: CartDrawer, ConfirmDialog, CookieConsent, DestructiveConfirm, ErrorModal, FeedbackRating, FilterDrawer, FilterModal, FormModal, QuickEditDialog, ReleaseModal, SessionTimeoutWarning, ShareModal, SuccessModal, WarningDialog), branch `loop/2026-11-16-overlay` from `loop/2026-11-16-sync-and-auth`.
Also pending: Queue A A11 (FeaturedIcon doc boards, Figma write), Queue B replies/resolution after merge+sync, Code Connect (CC-001).

Resume prompt: Continue the Escala loop: read governance/runs/loop-state.md and escala-loop-prompt.md, then resume from the next step.

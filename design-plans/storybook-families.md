# Storybook by family: one entry per Figma page, parts inside it

Status: BUILT (2026-11-16, branch `storybook-families`), all phases F0–F4. The three owner decisions at the end were
taken by default (marked **Taken**) so the work could land in one pass; each is one manifest edit + one script run to
reverse.

## What landed

- `spec/storybook-families.json`: 51 families (49 Figma pages; "ProgressLine & ProgressCircle" is two; Sheet is
  `page: null` until the inventory is regenerated), 116 sets, `noStory` for Radio · RadioCard · RadioItem.
- `scripts/storybook/apply-families.mjs` writes titles, the `part` tag and prefixed part exports, and rewrites story
  ids where the repo names them; `--check` fails when a file is out of step. 61 files written, 173 ids moved.
- `src/lib/__tests__/storybookFamilies.test.ts` (8 checks) holds manifest ↔ Figma inventory ↔ story files.
- `.storybook/main.ts`: `tags: { part: { defaultFilterSelection: 'exclude' } }`. `Form Controls` is gone.
- `ComponentDocPage` is the family page: header names the root set (or "Composed from …"), Playground, Variants,
  Properties, **Anatomy** (one card per part: live preview of its Playground in the toolbar's modes, its Figma axes
  and variant count, its catalogue description, links to each of its stories), Accessibility, Related families.
- `storyIndex.ts` reads the manifest (`STORY_FAMILIES`), no more prefix guessing. `EscalaScope`
  (`.storybook/escalaScope.tsx`) is the decorator's body, shared by every story and the Anatomy previews.
- F3: `Tooltip.stories.tsx` and `DatePicker.stories.tsx` are composed roots (DatePickerPopover's "Opens from
  DatePickerTrigger" story became DatePicker's Playground); `TableParts` is five part files.
- F4: `AllVariants` / `AllSizes` / `AllLayouts` / `AllTypes` renamed (All Combinations or the axis); the test
  forbids `All<X>` other than All Combinations.

Measured on the build: 51 component entries (was 110), 102 Documentation pages in all (was 161), 549 index entries
(was 603); 171 part stories hidden by default, 176 visible.

### The Playground, second pass (2026-11-16, reported: "the playground is often cut and needs more UX")

- **The cut was a key collision, not a layout bug.** The token mode global was named `viewport`, which is Storybook's
  own viewport tool. "Desktop" therefore also emulated a 1280×1024 screen: every story sat in a frame wider and
  taller than the canvas (cut on the right and under the addon panel), and the toolbar showed two "Desktop" buttons.
  The global is `dimensions` now; Storybook's viewport tool is free again (responsive by default).
- **A Playground is a stage** (`EscalaScope stage`): the component is centred (`margin: auto` on a flex child, so a
  wide one scrolls from its edge instead of being cut on both sides), with the window's height in the canvas and
  280 px in Documentation. Matrices (All Combinations…) and Blocks keep the page layout. Anatomy previews use a
  160 px stage.
- **Documentation opens on the Playground**: header, the description in one paragraph, a one-line caption, then the
  Playground and its Controls. "When & how to use it" moved below them. At 1440×900 the component is on the first
  screen (it used to start at y ≈ 750).
- DatePicker's root story renders the `DatePicker` component (the trigger and popover wired, built in the parallel
  bug-fix batch), with Size · Mode · Open · PlaceholderText.
- `apply-families.mjs` also rewrites every PRE-family id (`<folder>/<Set>` titles, `Form Controls/Input`, the renamed
  `All<X>` stories, TableParts and DatePickerPopover's folded story), so checks written on another branch against the
  old ids are fixed by one run.

### Rebasing other branches onto this one

Every story file's title moved, so a branch that adds or edits stories will conflict on the `title:` line. Resolve by
taking either side, then run `node scripts/storybook/apply-families.mjs` (it rewrites titles, tags and exports from
the manifest) and add any new set to `spec/storybook-families.json`; the test names what is missing.

## The problem, measured

Reported: "veo muchos componentes derivados de uno; si voy a Table veo múltiples cosas".

The Storybook mirrors the Figma file at the wrong level. The file organises components by
**page** (the family: "Calendar", "Table"). Storybook gives every **component set** on that page
its own sidebar entry, its own Documentation page and its own Playground.

| | Count |
|---|---|
| Figma component pages (families) | 49 |
| Figma component sets on them | 116 |
| Pages holding more than one set | 29 (67 extra sets) |
| Component CSF files in `apps/storybook/stories/` | 110 |
| Deployed index (`igkd6zhcn`) | 603 entries: 161 Documentation pages + 442 stories |
| Stories named `Playground` / `All Combinations` | 150 / 81 |

So "Table" is 11 sidebar entries (Figma has 14 sets), "Calendar" 6, "Sidebar" 5, "Breadcrumb",
"Combobox", "DropdownMenu", "Stepper" 4 each. Each of them opens its own Documentation page that
re-reads its parent's catalogue entry. The reader cannot tell a component they would use
(`Calendar`) from a part they would never place alone (`CalendarFooter`).

### Drift found along the way

1. **Folder split**: `Form Controls/Input` is the only entry in that folder; every other field is
   under `Forms/`. `STORY_FOLDERS` and `storySort` both list the two.
2. **No root for two families**: DatePicker (`DatePickerPopover` + `DatePickerTrigger`) and Tooltip
   (`TooltipContent` + `TooltipInfoTrigger`) have parts and no entry for the thing itself.
3. **One file for five sets**: `TableParts.stories.tsx` merges TableCaption · TableDropIndicator ·
   TableEmpty · TableLoading · TableLoadMore behind prefixed controls (`TableEmpty · title`). Every
   other set has its own playground.
4. **Missing sets**: Radio, RadioCard, RadioItem (pending in `figma-components.status.json`).
5. **Stale snapshot**: `Sheet` has a story but is not in `spec/figma-components.json`; the inventory
   predates it. Re-run the inventory before building the manifest.
6. **Part-of is guessed**: `storyIndex.catalogueEntry` finds a part's parent by name prefix. It fails
   for `RadioItem` (not a prefix of `RadioGroup`), `DatePicker*` and `Tooltip*`.

## The model: family → root · parts · siblings

Every Figma set gets ONE role inside ONE family. Family = Figma page.

- **root**: the component a designer places. Owns the family's sidebar entry, its Documentation
  page and its main Playground. `Calendar`, `Table`, `Breadcrumb`.
- **part**: anatomy. Only meaningful inside the root (`CalendarDay`, `TableCell`, `BreadcrumbItem`,
  `ModalHeader`, `SliderThumb`). Keeps its own playground (the Figma-parity check needs its controls
  1:1) but lives inside the family entry.
- **sibling**: a second component a designer places on its own that shares the page
  (`ProgressLine` / `ProgressCircle`, `FABButton` / `FABGroup`, `Switch` / `SwitchGroup`).
  Owner decision below on whether siblings get their own entry.

A family with no root set (DatePicker, Tooltip) gets a composed root story: trigger + open popover.

## Verified mechanism (spike, Storybook 10.6.4)

Two CSF files with the **same `title`** merge into one sidebar node. Tested with a temporary
`title: 'Forms/Calendar'` file holding a CalendarFooter story: the index listed it under
`forms-calendar`, beside Calendar's own stories, with its own args. Conditions:

- the part file carries `tags: ['!autodocs', 'part']`, otherwise two files try to emit
  `forms-calendar--documentation`;
- part export names must not collide with the root's (`Playground` would). Prefix them:
  `export const CalendarDayPlayground` with `name: 'CalendarDay · Playground'`.

Storybook 10 also supports `tags: { part: { defaultFilterSelection: 'exclude' } }` in `main.ts`
(present in `node_modules/storybook`), so parts can be hidden from the sidebar by default and shown
with the tag filter. Not spiked yet: confirm in the UI.

Parts stay in their own files. No 600-line family file.

## Infrastructure

### 1. One manifest: `spec/component-families.json`

```json
{
  "families": [
    { "id": "Calendar", "page": "Calendar (✓) (D)", "folder": "Forms",
      "root": "Calendar",
      "parts": ["CalendarDay", "CalendarFooter", "CalendarHeader", "CalendarMonth", "CalendarPresets"],
      "siblings": [] },
    { "id": "DatePicker", "page": "DatePicker (✓) (D)", "folder": "Forms",
      "root": null, "parts": ["DatePickerTrigger", "DatePickerPopover"], "siblings": [] }
  ]
}
```

Skeleton generated from `figma-components.json` (pages → families, status suffixes stripped);
roles and folder are hand-assigned once. It is structure, not debt, so it does not go in the status
ledger, which keeps tracking parity only.

### 2. Titles come from the manifest, never typed

`apps/storybook/stories/_family.ts`:

```ts
export const familyMeta = (set: string) => ({
  title: `${folderOf(set)}/${familyOf(set)}`,
  tags: roleOf(set) === 'part' ? ['!autodocs', 'part'] : [],
})
```

Each CSF file spreads it into its `meta`. `storyIndex.catalogueEntry` reads the manifest instead of
guessing by prefix. `STORY_FOLDERS` and `storySort` derive from the manifest's folders.

### 3. One Documentation page per family

`ComponentDocPage` becomes the family page: the root's description, Playground, controls and
examples, then an **Anatomy** section with one block per part (preview via `composeStories`,
its props table from the contract, a link to its playground). 161 Documentation pages → ~49 + blocks.

### 4. A test that holds it: `storybookFamilies.test.ts`

- every Figma set is in exactly one family with one role (a new Figma set fails until assigned);
- every set has exactly one CSF file, and its `title` equals `familyMeta(set).title`;
- every part file is tagged `part` and `!autodocs`; no two story ids collide in a family;
- every family has a root story (a set or a composed one);
- folders come only from the manifest (no `Form Controls` beside `Forms`).

### 5. Story vocabulary

Fixed names, in this order: `Playground` · `All Combinations` · `Sizes` · `States` · then
free-form examples. Parts: `<Part> · Playground`, `<Part> · All Combinations`. Measured today:
40+ distinct names, several one-offs (`Highlighted Has No Ring`, `Phone · filled · every state`).
The one-offs are fine as examples; the first four should be the same everywhere.

## Phases

- **F0** Regenerate the inventory (adds Sheet), generate the manifest skeleton, assign roles,
  land the test in report mode (lists violations, does not fail). No visual change.
- **F1** `familyMeta` in every CSF file, tags, prefixed part exports, folder fix. Mechanical, one
  PR. Sidebar goes from 110 component entries to ~49. Test switches to failing mode.
- **F2** Family Documentation page with Anatomy.
- **F3** Split `TableParts` into five files; composed roots for DatePicker and Tooltip; Radio
  parts when RadioGroup is rebuilt.
- **F4** Story vocabulary pass.

Links into Storybook change in F1 (`forms-calendarday--playground` →
`forms-calendar--calendar-day-playground`). Grep the repo, the governance findings and the Figma
contracts for `?path=/story/` before shipping; add redirects in `manager.ts` if any are external.

## Decisions for the owner

1. **Taken: merged when one composes the other, separate when not** (SwitchGroup, FABGroup, AvatarGroup, CheckboxGroup
   are parts; ProgressLine and ProgressCircle are two families). **Siblings**: own entry (ProgressLine and ProgressCircle stay two) or merged into the family?
   Proposal: merged when one composes the other (`SwitchGroup` holds `Switch`, `FABGroup` holds
   `FABButton`, `AvatarGroup` holds `Avatar`), separate when they do not (ProgressLine / ProgressCircle).
2. **Taken: hidden by default** (one tick in the sidebar's tag filter lists them). **Parts in the sidebar**: hidden by default (tag filter, reached from Documentation's Anatomy)
   or always listed under the family?
3. **Taken: the root's name** (FABButton, Switch). **Family names**: the Figma page name cleaned, except where it is two names
   ("ProgressLine & ProgressCircle", "FABButton & FABGroup"). Keep the root's name, or a family
   name (Progress)? Figma is the rule, so the page name wins unless you rename the page.

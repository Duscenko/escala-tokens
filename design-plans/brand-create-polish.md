# Brand create — polish, in order

Written 2026-10-13. The studio stays: one door, a colour draft, six steps, a live collage.
These cuts only fix what a click claims and what step 1 asks for. Do them in order.
Stop after each slice and look at the studio before starting the next.

## Slice 1 — a click does what it says

The smallest set. No layout change.

1. **Continue names the step, not a default you may have left.**
   Font already says `Use {name}`. Radius, Spacing and Shadow always say `Use default`
   (`ThemeLibraryPage`, `continueLabel`), including after the slider moved.
   Those three say `Continue`. Icons stays `Finish`. Colour stays `Continue`.

2. **Advanced edition stays shut until the studio is done.**
   The guided setup already disables "Go to advanced edition" while `setupStep != null`.
   The create studio embeds `ThemeQuickSettingsRail` without `setupStep`, and
   `onOpenAdvanced` closes the studio and opens Variables with the brand still unsaved.
   Pass the same disabled state for every edition card while `creating` is true.
   The title already exists: "Available once the brand is finished".

3. **The foundation menu does not mint.**
   On Colour, picking Font / Radius / … from `CreateStepNav` calls `submitHandle`,
   which is `mintTheme`. The menu looks like navigation.
   Until Colour has a `createdKey`, later steps stay visible and disabled.
   Continue and Skip setup remain the only writes on that step.

## Slice 2 — Colour asks for three things

What stays on step 1 of the studio (`ThemeForm`, `firstStep`): name, the accent
(hue, saturation, the six curated chips), and which themes the brand ships.

What leaves that form. Nothing new is built. Neutral, Fine-tune and the four
states already live in **Color edition** — `ThemeQuickSettingsRail`, panel
`color`. That is the inspector column of the brand, the same place Font and
Radius use, once you are on the brand (Theme → Color). Not a seventh studio
step, and not Variables.

- Neutral tint and its swatch: already the Neutral row there.
- Fine-tune (saturation, brightness, ramp contrast): already the closed
  Fine-tune disclosure there.
- The four states: already the States row there.
- "More colour options" and "Adjust colours": not moved. They are the create
  form's second copy of the same slots (accent, neutral, the four states),
  each of which already opens a picker from its chip in Color edition. They
  come off the create form only.

During the six steps, Continue on Colour goes to Font. Those controls are not
on Font. You meet them when you open that brand's Color edition — after Finish,
or by coming back to the brand and choosing Color. The board on step 1 still
paints the derived neutral and states; `slotsFromAccent` keeps following the
accent until someone sets them in Color edition.

## Slice 3 — one Light / Dark on this step

Two controls answer "light or dark" today.

- The pill beside the name (`ThemeIdentityBar`) is the appearance on the board,
  and the lead when the brand ships one theme.
- `BrandThemesPicker` is what the brand ships: Light, Dark, or Both, plus which
  one is the default.

Keep the picker. It is the question the rest of the product already stores
(`brandThemes`). The pill beside the name goes away on this step.

The default is chosen here, on this step, inside that picker — not later.

- Light only, or Dark only: that theme is the default. There is no second choice.
- Both: the theme wearing Default is the one the product opens on and the one
  listed first in Figma. Swap or drag, in that same control, changes it.
  The board follows the badge.

Same control, same choice, later in Color edition if they change their mind.
A way to glance at the other appearance belongs on the board, not as a second
answer in the form.

## Slice 4 — where you are

The step is announced three times: the canvas title (`1. New brand · Color`),
the foundation dropdown, and `Step 1 of 6` plus the bar.

Replace the dropdown with the six names in order, in the inspector, above the
form. Current step is the selected row. Future steps on Colour stay disabled
(slice 1). After the brand exists, a row is a real jump.

The canvas title keeps the screen name and the step name. The footer keeps
`Step n of 6`, Cancel / Back, Skip setup, and Continue. It does not repeat the
foundation list.

## Slice 5 — the board points at the step

`CreateBoard` always mounts the same `SystemCollage`. That stays: it is the
proof the brand holds together.

Each step adds one line under the canvas title naming the thing that step
moves (the button fill, the font, the card corner, the field, the shadow, the
icon). No second layout, no per-step specimen.

## Slice 6 — words, then the front door

Do this last. It is copy, and slices 2–3 change which strings are on screen.

- Route the Colour-step strings that are still hardcoded through `t()`:
  "More colour options", "Adjust colours", "Dark theme · accent",
  "Neutral and the four states follow the accent", and the slot summary.
  es/fr already cover the studio chrome around them.
- The start modal and the Style field both offer the same presets.
  Blank is "start from a colour". System styles stays the gallery.
  The Style dropdown does not lead the Colour step; Scratch is the default
  and a style is a choice inside the accent block, not a second front door.
- "From code" on "How do you want to start this brand?" imports a whole system.
  When the system already has a brand, that row says so (it brings in a system,
  not a brand). The action itself does not change.

## Out of scope

- A new mint path. `mintTheme` stays the only write.
- Moving Light / Dark / Both off the create step. Sync and Export read it from here.
- Phone layout.
- Rewriting the collage.

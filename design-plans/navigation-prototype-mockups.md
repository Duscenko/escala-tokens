# Navigation blocks in their prototype mockups (2026-11-17)

Source: Figma `HeaderNavigation · Prototype` (1063:2193) and `SidebarNavigation · Prototype` (1065:872).
The owner's call: a navigation block is shown where it lives — in a 1440 desktop window and an iPhone — not
alone on the canvas, where it reads far too big.

- `blocks/frames.tsx`: `DesktopWindow` (1440×900, window bar dots bound to Status/*/surface-solid),
  `PhoneFrame` (the file's `iPhone18Pro` + `iOSStatusBar` + `iOSHomeIndicator`; hardware chrome is raw by design,
  as the file says), `MockupFit` (scales a frame down to its column).
- `blocks/navigationShowcase.tsx`: what each prototype screen holds. `HeaderMockup` (Header 01 · 02 · 04 · 05),
  `SidebarMockup` (expanded / collapsed with the SidebarSimple toggle; the mobile drawer over Surface/overlay).
- Storybook: each nav block story opens on **Overview** — Desktop · Light, Desktop · Dark, Mobile (Light · Dark),
  every mockup in its own mode. Playground draws the mockup in the toolbar's modes.
- Web Blocks stage: these blocks render in the mockup; the stage's Frame (viewport) is the Layout (Mobile = phone).
  At 100 % the window fits the stage; the phone stops at 60 %.

Copied from the file while rebuilding the blocks 1:1 (measured against the prototype, ±1 px of text):
- DualSidebar content is the file's: rail Wallet…Plus, Nexus · DeFi Hub, Earn (Lending market · Staking · Swap),
  Watchlist with prices and trend badges; SidebarMenuButton gained `trend="flat"` (secondary + Minus, as XRP).
- SidebarStatCard value is Type/heading-lg (added to `BLOCK_ONLY_REFS`); its Shadow/sm and the FloatingHeader's
  Shadow/md paint without ring and spreads (non-clipping frames): `card-sm` and `floating-md` lifts.
- Every icon in these blocks is Icon/small (16 px). Brand's default logo is Cube (was Stack).
- Odd in the file, copied: AppHeader's ThemeToggleVisible is not wired to the layer, so the toggle always shows.

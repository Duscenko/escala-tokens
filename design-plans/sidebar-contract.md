# Sidebar — contract (Figma `Escala Design System (Real)`, page Sidebar 931:87050)

Read read-only on 2026-11-14. Sets: Sidebar 982:1003 · SidebarMenuButton 980:368 · SidebarGroup 982:292 ·
SidebarGroupLabel 980:390 · SidebarBrand 980:419. Refactor C1.

| Figma | React (`escala-ui/sidebar.tsx`) |
|---|---|
| Sidebar `Collapsed` · slots Content, Footer · FooterVisible | `<Sidebar collapsed>` (an `aside`, `aria-label`) · `SidebarContent` · `SidebarFooter` |
| header = SidebarBrand + SidebarTrigger (ghost IconButton sm) | `SidebarHeader` · `SidebarBrand` · `SidebarTrigger` |
| SidebarGroup `Size` · `Collapsed` · LabelVisible · Content | `<SidebarGroup size>` + `SidebarGroupLabel` + `SidebarMenu` |
| SidebarGroupLabel `Size` · Label | `<SidebarGroupLabel size>` (hidden while collapsed) |
| SidebarMenuButton `Size` · `State` · `Collapsed` · Label · IconLeading · Trailing · IconTrailing · TrendVisible | `<SidebarMenuButton size state icon trailing iconTrailing trend trendLabel>` |
| SidebarBrand `Collapsed` · Title · SubtitleVisible/Subtitle · Logo slot | `<SidebarBrand logo title subtitle>` |

Geometry (all bound to roles): Sidebar 272 / 48 wide, `Surface/layer-1`, 1px `Border/default` on the right only;
header, Content and Footer padding `gap-control`, Content gap `gap-group`, Footer gap `gap-tight` + 1px top rule.
MenuButton 24 · 32 · 40 (`Size/control-xs|sm|md`), padding Y `gap-tight`, X `gap-control` / `gap-control` / `inset-control`,
gap `gap-tight` / `gap-control` / `gap-control`, `Radius/control`, icons `Size/icon-sm|sm|md`; Hover `Surface/muted`,
Focused `Surface/muted` + 2px inside `Border/focus` + 2px `Border/ring/default` outside, Current `Surface/selected`,
Disabled ink `Content/disabled`. Collapsed = a square of the row height, no side padding. Trend = exposed Badge soft pill xs
(success up, critical down). GroupLabel: `groupLabelRecipe` (24, `Type/caption`, `Content/secondary`, text case ORIGINAL).
Brand: 32 logo, title `Type/label`, subtitle `Type/caption`.

Odd in the file, copied: SidebarGroupLabel's description says "uppercase" but the text case is ORIGINAL; the Sidebar is
a right-edge hairline, not a rounded panel (the old code had `variant` sidebar · floating · inset: dropped, Figma has no such axis).

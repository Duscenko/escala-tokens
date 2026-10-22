// The Figma plugin's walkthrough pictures (public/plugin-tour/*.webp).
//
//   npm run plugin:tour-shots      (runs after `npm run about:shots` too)
//
// They are CROPS of the About page's real captures (public/about/*.webp), not a
// second capture run: the About shots are already regenerated whenever the
// interface changes, so the tour follows them for free. Each crop is a 16:10
// window onto the part of the screen its card talks about, because a whole
// 1360px workspace shrunk into a 340px plugin card can't be read.
//
// The plugin loads them from https://www.escalatokens.com/plugin-tour/ — so a
// change here reaches the plugin only after the site is deployed.

import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'

const SRC = new URL('../public/about/', import.meta.url).pathname
const OUT = new URL('../public/plugin-tour/', import.meta.url).pathname
const OUT_W = 720            // 2× a ~360px card
const OUT_H = 450            // 16:10
const MAX_BYTES = 60 * 1024

// Crop boxes in SOURCE pixels, measured on the 2026-10 About captures. Every
// box is 16:10 so nothing is stretched. If a source capture's layout moves,
// fix the box here.
const SHOTS = [
  { name: 'welcome',   from: 'system-styles.webp', box: { left: 0,   top: 380, width: 740, height: 462 } },
  { name: 'choices',   from: 'system-styles.webp', box: { left: 782, top: 186, width: 392, height: 245 } },
  { name: 'reference', from: 'semantics.webp',     box: { left: 620, top: 60,  width: 740, height: 462 } },
  { name: 'viewports', from: 'spacing.webp',       box: { left: 410, top: 60,  width: 740, height: 462 } },
  { name: 'ship',      from: 'figma.webp',         box: { left: 0,   top: 60,  width: 1040, height: 650 } },
]

await mkdir(OUT, { recursive: true })
for (const s of SHOTS) {
  const file = OUT + s.name + '.webp'
  for (let q = 82; q >= 50; q -= 6) {
    await sharp(SRC + s.from).extract(s.box).resize(OUT_W, OUT_H).webp({ quality: q }).toFile(file)
    if ((await stat(file)).size <= MAX_BYTES) break
  }
  console.log(`[plugin-tour] ${s.name}.webp  ${Math.round((await stat(file)).size / 1024)} KB`)
}

/** Real Chrome tab geometry — ported from adamschwartz/chrome-tabs
 *  (MIT, https://github.com/adamschwartz/chrome-tabs/blob/gh-pages/svg/tab.svg),
 *  not approximated. That repo's path is a cubic bezier (a short straight
 *  "toe" at the very base before the concave sweep starts, then a separate
 *  curve into the convex top corner) — a shape two `radial-gradient` quarter
 *  circles can't reproduce exactly, which is why an earlier version of this
 *  file's silhouette kept reading as slightly off. Using their literal path
 *  is what makes it actually match.
 *
 *  The technique: `symbol#chrome-tab-geometry-left`'s 214×36 viewBox holds
 *  ONE corner (top convex + bottom concave); the right corner is the same
 *  path mirrored (`scale(-1,1)`), not a second path to keep in sync. Each
 *  half renders at 52% of the tab's width and gets clipped by its own SVG
 *  viewport — since all the curvature lives in roughly the first 17 of 214
 *  units and the rest is a straight edge, clipping anywhere past that still
 *  shows the full curve with only the flat run trimmed, which is what makes
 *  ONE fixed-geometry symbol stretch cleanly across any tab width. The 52%
 *  (not 50%) is the upstream repo's own fix for sub-pixel gaps at
 *  non-integer devicePixelRatios — kept verbatim.
 *
 *  `<ChromeTabDefs />` mounts the symbols once (near the app root);
 *  `<ChromeTabBackground />` goes inside each tab button, behind its label. */

const SYMBOL_VIEWBOX = '0 0 214 36'
const SYMBOL_PATH = 'M17 0h197v36H0v-2c4.5 0 9-3.5 9-8V8c0-4.5 3.5-8 8-8z'

/** Rendered at our tab height (44px), not the source repo's 36px — scaling
 *  both axes by the same factor (44/36) keeps every proportion identical to
 *  the original; only the absolute size changes. */
const RENDER_HEIGHT = 44
const RENDER_WIDTH = 214 * (RENDER_HEIGHT / 36)

export function ChromeTabDefs() {
  return (
    <svg aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <symbol id="chrome-tab-geometry-left" viewBox={SYMBOL_VIEWBOX}>
          <path d={SYMBOL_PATH} />
        </symbol>
        <symbol id="chrome-tab-geometry-right" viewBox={SYMBOL_VIEWBOX}>
          <use href="#chrome-tab-geometry-left" />
        </symbol>
      </defs>
    </svg>
  )
}

/** Paints the tab silhouette behind its label. Visibility/fill are driven
 *  entirely by CSS off the parent's `.color-hub-tab-active`/`:hover` state
 *  (see `.color-hub-tab-bg` in index.css) — this component only lays out
 *  the geometry, same split as the upstream repo's own CSS/SVG boundary. */
export function ChromeTabBackground() {
  return (
    <span className="color-hub-tab-bg" aria-hidden="true">
      {/* One outer `<svg>` (100% of the span) hosting both mirrored halves —
          `<g>` is only valid inside an `<svg>`, so the right half's mirror
          can't hang directly off the span the way the left half's does. */}
      <svg className="color-hub-tab-bg-outer" width="100%" height="100%">
        <svg width="52%" height="100%">
          <use href="#chrome-tab-geometry-left" width={RENDER_WIDTH} height={RENDER_HEIGHT} className="color-hub-tab-geometry" />
        </svg>
        <g transform="scale(-1, 1)">
          <svg width="52%" height="100%" x="-100%" y="0">
            <use href="#chrome-tab-geometry-right" width={RENDER_WIDTH} height={RENDER_HEIGHT} className="color-hub-tab-geometry" />
          </svg>
        </g>
      </svg>
    </span>
  )
}

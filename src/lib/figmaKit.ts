// The Escala Design System for Figma — a product sold on its own, apart from
// the generator (which stays free during the open beta, `lib/openBeta.ts`).
//
// `/figma-kit` shows a live, read-only embed of the Figma file and sends the
// buyer to a Polar checkout. One Polar product carries two benefits:
//   - a Custom benefit whose private note holds the Figma DUPLICATE link of
//     the master file (`…/design/<key>/<name>/duplicate`). Opening it copies
//     the latest version into the buyer's own Figma account — Untitled UI's
//     model. Figma has no API to invite a buyer to a file, and a .fig would
//     have to be re-exported on every update;
//   - "Escala Pro licence" (License Keys, ESCALA-…): the key the app already
//     validates (`lib/polar.ts`, `api/_licence.ts`). It grants Pro on the web
//     and in the plugin once Pro starts (December 2026) — until then
//     `OPEN_BETA` keeps everything open.
// Polar is the merchant of record and delivers both, so nothing here needs a
// server.
//
// TWO FILES, never one. The embed below is a PREVIEW file with "Prevent
// viewers from copying" on. Its key is public (it is in this page's source),
// so it must never be the file the duplicate link copies: anyone could append
// `/duplicate` to it. The master file — copying allowed, link private — lives
// only in Polar's benefit note and never appears in this repo.

export const FIGMA_KIT_PATH = '/figma-kit'

/** The PREVIEW file (copying off), as Figma's Share → Copy link gives it.
 *  Refreshed per release: duplicate the master, turn copying off, swap the
 *  key here. Never the master's key. */
export const FIGMA_KIT_FILE_URL =
  'https://www.figma.com/design/wcrw08ZVRYDuxYnCqWXoeD/Escala-Design-System--Preview-?node-id=4-17005'

/** Figma's embed host for that same file, opened on the Cover (node 4-17005 —
 *  a duplicate keeps node ids, so a refreshed preview keeps this one). */
export const FIGMA_KIT_EMBED_URL =
  'https://embed.figma.com/design/wcrw08ZVRYDuxYnCqWXoeD/Escala-Design-System--Preview-?node-id=4-17005&embed-host=share'

/** Polar checkout link "Figma kit page" (Polar → Products → Checkout links).
 *  Same product as `POLAR_CHECKOUT_URL` ("Escala Pro - launch"), its own link
 *  so the success URL lands back here instead of the licence-paste flow.
 *  Set to null to show "Coming soon" instead of a Buy button. */
export const FIGMA_KIT_CHECKOUT_URL: string | null =
  'https://buy.polar.sh/polar_cl_7wceiUXkuOHDyB3S3NGNvu8erv069EyaE8lCZ2zhWJe'

/** Price as shown on the page, in USD, taxes included. Null hides the number.
 *  Must match the Polar product — the page never states a price the checkout
 *  disagrees with. */
export const FIGMA_KIT_PRICE: number | null = 85

/** Set this as the checkout link's Success URL in Polar. */
export const FIGMA_KIT_SUCCESS_URL = `https://www.escalatokens.com${FIGMA_KIT_PATH}?purchased=1`

export function figmaKitPurchased(search: string): boolean {
  return new URLSearchParams(search).get('purchased') === '1'
}

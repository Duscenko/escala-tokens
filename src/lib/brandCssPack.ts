// `brandCss` packed: each brand's variables.css gzipped and base64-encoded, in
// `brandCssGzip`. The web publish uses it only when the plain `brandCss` would
// not fit the publish limit (ten brands of about 83 KB of CSS each); gzip takes
// those 851 KB to about 179 KB, because most of each sheet is the same text.
//
// Plain stays the default because plugins up to 0.35 read `brandCss[].css` as
// text and know nothing of this field: they skip it and build their own CSS,
// exactly as they did when the CSS was dropped. Newer plugins unpack it on
// intake (`unpackBrandCss`, in ui.html's `fetchJson`), so everything after that
// sees a plain `brandCss`.
//
// No imports: the plugin bundles this file into ui.html (EscalaRepo). Uses the
// platform's CompressionStream, which browsers, Figma and Node 18+ all have.

export interface BrandCssEntry { key: string; name: string; css: string }
export interface PackedBrandCss { key: string; name: string; gzip: string }

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).text()
}

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function packBrandCss(list: BrandCssEntry[]): Promise<PackedBrandCss[]> {
  return Promise.all(list.map(async ({ key, name, css }) => ({ key, name, gzip: toBase64(await gzip(css)) })))
}

/** The payload with `brandCssGzip` turned back into a plain `brandCss`, or the
 *  payload unchanged when it has none (or a plain `brandCss` already). An entry
 *  that does not unpack leaves the whole field out: the caller then builds its
 *  own CSS, as for an older payload — never a half-decoded sheet. */
export async function unpackBrandCss<T extends object>(json: T): Promise<T> {
  const rec = json as Record<string, unknown>
  const packed = rec.brandCssGzip
  if (!Array.isArray(packed)) return json
  const out: Record<string, unknown> = { ...rec }
  delete out.brandCssGzip
  if (Array.isArray(out.brandCss) && out.brandCss.length) return out as T
  try {
    out.brandCss = await Promise.all((packed as PackedBrandCss[]).map(async ({ key, name, gzip: b64 }) => ({
      key: String(key), name: String(name), css: await gunzip(fromBase64(String(b64))),
    })))
  } catch {
    delete out.brandCss
  }
  return out as T
}

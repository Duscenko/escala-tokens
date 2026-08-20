/** Uncompressed ZIP (store method). Enough to ship a skill folder without a
 *  compression library — Agent Skills hosts unzip the archive and read SKILL.md. */

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    c ^= data[i]!
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
  }
  return (c ^ 0xffffffff) >>> 0
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2)
  b[0] = n & 0xff
  b[1] = (n >>> 8) & 0xff
  return b
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  b[0] = n & 0xff
  b[1] = (n >>> 8) & 0xff
  b[2] = (n >>> 16) & 0xff
  b[3] = (n >>> 24) & 0xff
  return b
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export function zipStore(entries: { path: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.path)
    const data = entry.data
    const crc = crc32(data)
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ])
    locals.push(local)
    centrals.push(concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]))
    offset += local.length
  }

  const localBlob = concat(locals)
  const centralBlob = concat(centrals)
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralBlob.length),
    u32(localBlob.length),
    u16(0),
  ])
  return concat([localBlob, centralBlob, eocd])
}

/** Read an uncompressed archive written by `zipStore`. */
export function unzipStore(buf: Uint8Array): { path: string; data: Uint8Array }[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const decoder = new TextDecoder()
  const out: { path: string; data: Uint8Array }[] = []
  let i = 0
  while (i + 30 <= buf.length && view.getUint32(i, true) === 0x04034b50) {
    const nameLen = view.getUint16(i + 26, true)
    const extraLen = view.getUint16(i + 28, true)
    const size = view.getUint32(i + 22, true)
    const nameStart = i + 30
    const dataStart = nameStart + nameLen + extraLen
    out.push({
      path: decoder.decode(buf.subarray(nameStart, nameStart + nameLen)),
      data: buf.subarray(dataStart, dataStart + size),
    })
    i = dataStart + size
  }
  return out
}

// Stand-in pictures for the media blocks. The Figma file's covers, artwork and travel photos (`media/cover-alpine`,
// `media/album-waves`, `media/travel-*`) are stock content, not tokens: until they are published as assets these are
// deterministic gradients (SVG data URIs), swapped through the blocks' `cover` / `artwork` / `photo` props.
const art = (a: string, b: string, c: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><rect width="160" height="90" fill="url(#g)"/><path d="M0 70 L35 38 L58 58 L92 22 L128 60 L160 44 V90 H0Z" fill="${c}" opacity=".45"/></svg>`)}`

export const COVER_ALPINE = art('#f2c9a0', '#c98f6a', '#2f4a3a')
export const ALBUM_WAVES = art('#0f4c5c', '#2a8794', '#e9f4f2')
export const TRAVEL = {
  lisbon: art('#f4d5a8', '#d9885a', '#6f4a3a'),
  kyoto: art('#f6c9d0', '#b5586b', '#3b2d4a'),
  marrakech: art('#f3b46b', '#c8573a', '#5a2a22'),
  reykjavik: art('#cfe3ee', '#6aa0bd', '#26435a'),
} as const

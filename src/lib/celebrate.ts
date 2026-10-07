// A short confetti burst from an element — the "your theme is done" moment at
// the end of guided setup. No dependency: one fixed canvas, ~1.6s of physics,
// then it removes itself. Skipped entirely under prefers-reduced-motion (the
// toast that accompanies it still says the same thing in words).

type Piece = {
  x: number; y: number; vx: number; vy: number
  w: number; h: number; rot: number; vr: number; color: string
}

export function burstConfetti(from: Element | null, colors: string[]) {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const palette = colors.filter(Boolean)
  if (!palette.length) return

  const rect = from?.getBoundingClientRect()
  const ox = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const oy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh',
    pointerEvents: 'none', zIndex: '100',
  })
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) { canvas.remove(); return }
  ctx.scale(dpr, dpr)

  // Mostly upward and to the left — the button sits at the right edge of the
  // window, so a symmetric fan would throw half the pieces off-screen.
  const pieces: Piece[] = Array.from({ length: 140 }, () => {
    const angle = (-90 + (Math.random() * 130 - 85)) * (Math.PI / 180)
    const speed = 6 + Math.random() * 9
    return {
      x: ox, y: oy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      w: 5 + Math.random() * 5, h: 8 + Math.random() * 6,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
      color: palette[Math.floor(Math.random() * palette.length)],
    }
  })

  const DURATION = 1600
  const start = performance.now()
  const frame = (now: number) => {
    const t = now - start
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - DURATION * 0.6) / (DURATION * 0.4))
    for (const p of pieces) {
      p.vx *= 0.985
      p.vy = p.vy * 0.985 + 0.32
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1)
      ctx.restore()
    }
    if (t < DURATION) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}

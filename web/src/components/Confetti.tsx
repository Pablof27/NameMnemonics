import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#a855f7']
const DURATION = 2800

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  spin: number
  round: boolean
}

/** A burst of confetti every time `fire` changes to a new non-zero value. */
export function Confetti({ fire }: { fire: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!fire || !canvas || !ctx || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const ratio = window.devicePixelRatio || 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    ctx.scale(ratio, ratio)

    const particles: Particle[] = Array.from({ length: 160 }, () => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.25,
      y: height * 0.4,
      vx: (Math.random() - 0.5) * 18,
      vy: -Math.random() * 15 - 5,
      size: 6 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.35,
      round: Math.random() < 0.35,
    }))

    let frame = 0
    const start = performance.now()
    let last = start
    const draw = (now: number) => {
      // Scale the physics by frame time so fast displays don't speed it up.
      const step = Math.min((now - last) / 16.7, 3)
      last = now
      const elapsed = now - start
      ctx.clearRect(0, 0, width, height)
      ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION)
      for (const p of particles) {
        p.vy += 0.38 * step
        p.vx *= 0.99
        p.x += p.vx * step
        p.y += p.vy * step
        p.rotation += p.spin * step
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        if (p.round) {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }
        ctx.restore()
      }
      if (elapsed < DURATION) frame = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, width, height)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      ctx.clearRect(0, 0, width, height)
    }
  }, [fire])

  // Portalled: the animated screens use transforms, which would trap a fixed canvas inside them.
  return createPortal(<canvas ref={ref} className="confetti" aria-hidden="true" />, document.body)
}

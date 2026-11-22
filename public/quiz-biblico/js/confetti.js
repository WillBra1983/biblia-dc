/**
 * Confetes leves (sem dependências) — portado de Salvation/celebracaoConfetti.js
 */
const QuizConfetti = (() => {
  let canvas = null
  let ctx = null
  let particles = []
  let animId = null

  function ensureCanvas(zIndex = 9999) {
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.id = 'quiz-confetti-canvas'
      canvas.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:${zIndex}`
      document.body.appendChild(canvas)
      ctx = canvas.getContext('2d')
      window.addEventListener('resize', resize)
    }
    canvas.style.zIndex = String(zIndex)
    resize()
  }

  function resize() {
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  function spawn(count, opts = {}) {
    const colors = opts.colors || ['#26ccff', '#a78bfa', '#f472b6', '#fbbf24']
    const spread = opts.spread ?? 58
    const originY = opts.originY ?? 0.65
    const w = canvas.width
    const h = canvas.height
    const ox = (opts.originX ?? 0.5) * w
    const oy = originY * h

    for (let i = 0; i < count; i++) {
      const angle = ((Math.random() * spread - spread / 2) * Math.PI) / 180 - Math.PI / 2
      const speed = 4 + Math.random() * 7
      particles.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 2,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
      })
    }
  }

  function tick() {
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles = particles.filter((p) => p.life > 0)
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.18
      p.vx *= 0.99
      p.life -= p.decay
      p.rot += p.vr
      ctx.save()
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rot * Math.PI) / 180)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (particles.length) {
      animId = requestAnimationFrame(tick)
    } else {
      animId = null
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  function burst(fn) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    ensureCanvas()
    fn()
    if (!animId) animId = requestAnimationFrame(tick)
  }

  function simples(zIndex) {
    burst(() => spawn(55, { originY: 0.65, zIndex }))
  }

  function dourado(zIndex) {
    burst(() =>
      spawn(80, {
        originY: 0.55,
        spread: 70,
        colors: ['#FFD700', '#FFA500', '#FFEC8B', '#FFF8DC', '#daa520'],
      })
    )
  }

  function versiculo(zIndex) {
    burst(() => {
      spawn(55, { originY: 0.65 })
      spawn(18, {
        originY: 0.72,
        spread: 40,
        colors: ['#fef3c7', '#fde68a', '#fcd34d'],
      })
    })
  }

  function intenso(zIndex) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    ensureCanvas(zIndex)
    const end = Date.now() + 1100
    const rain = () => {
      spawn(22, { originX: 0, originY: 0.55, spread: 52 })
      spawn(22, { originX: 1, originY: 0.55, spread: 52 })
      if (Date.now() < end) requestAnimationFrame(rain)
      else if (!animId) animId = requestAnimationFrame(tick)
    }
    rain()
  }

  function disparar(tipo, opts = {}) {
    const z = opts.zIndex ?? 9999
    switch (tipo) {
      case 'dourado':
        return dourado(z)
      case 'intenso':
        return intenso(z)
      case 'versiculo':
        return versiculo(z)
      case 'simples':
        return simples(z)
      default:
        return null
    }
  }

  return { disparar }
})()

window.QuizConfetti = QuizConfetti

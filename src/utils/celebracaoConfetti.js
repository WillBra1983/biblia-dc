/**
 * Confetes com canvas-confetti — reforço visual imediato (hábito / dopamina saudável).
 * Variações: simples, dourado (Palavra + quiz), intenso (ex.: 7 dias), versículo
 * (mesmo base + destaque na UI). `zIndex` padrão 100 fica atrás do Dialog MUI
 * (~1300); use opts.zIndex maior na celebração do plano.
 *
 * Carregamento sob demanda: `canvas-confetti` é carregado por `import()` na
 * primeira chamada. Antes, ele entrava no bundle inicial e pesava ~10 kB gzip
 * só para um efeito que a maioria dos usuários não vê na primeira sessão.
 * A `Promise` é cacheada — chamadas subsequentes resolvem instantaneamente.
 */

let confettiPromise = null

function carregarConfetti() {
  if (!confettiPromise) {
    confettiPromise = import('canvas-confetti')
      .then((m) => m.default || m)
      .catch((err) => {
        confettiPromise = null
        console.warn('[celebracaoConfetti] falha ao carregar canvas-confetti:', err)
        return null
      })
  }
  return confettiPromise
}

function fazerFire(confetti, zIndex) {
  return function fire(partial) {
    try {
      confetti({
        disableForReducedMotion: true,
        zIndex,
        ...partial,
      })
    } catch {
      /* ignore */
    }
  }
}

/** Leitura normal, acerto no quiz, reengajamento */
export async function confeteSimples(zIndex = 100) {
  const confetti = await carregarConfetti()
  if (!confetti) return
  const fire = fazerFire(confetti, zIndex)
  fire({
    particleCount: 55,
    spread: 58,
    origin: { y: 0.65 },
    colors: ['#26ccff', '#a78bfa', '#f472b6', '#fbbf24'],
  })
}

/** Palavra no dia + quiz completo / medalha especial */
export async function confeteDourado(zIndex = 100) {
  const confetti = await carregarConfetti()
  if (!confetti) return
  const fire = fazerFire(confetti, zIndex)
  fire({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.55 },
    colors: ['#FFD700', '#FFA500', '#FFEC8B', '#FFF8DC', '#daa520'],
    scalar: 0.95,
  })
}

/** Sequência forte (ex.: 7 dias) — "chuva" mais densa */
export async function confeteChuvaIntensa(zIndex = 100) {
  const confetti = await carregarConfetti()
  if (!confetti) return
  const fire = fazerFire(confetti, zIndex)
  const end = Date.now() + 1100
  const tick = () => {
    fire({
      particleCount: 22,
      angle: 60,
      spread: 52,
      origin: { x: 0, y: 0.55 },
      colors: ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'],
    })
    fire({
      particleCount: 22,
      angle: 120,
      spread: 52,
      origin: { x: 1, y: 0.55 },
      colors: ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'],
    })
    if (Date.now() < end) requestAnimationFrame(tick)
  }
  tick()
}

/** Mesmo que simples visualmente; combina com Snackbar com versículo */
export async function confeteVersiculo(zIndex = 100) {
  const confetti = await carregarConfetti()
  if (!confetti) return
  await confeteSimples(zIndex)
  const fire = fazerFire(confetti, zIndex)
  fire({
    particleCount: 18,
    spread: 40,
    origin: { y: 0.72 },
    colors: ['#fef3c7', '#fde68a', '#fcd34d'],
    scalar: 0.82,
  })
}

/**
 * @param {string} tipo — 'simples' | 'dourado' | 'intenso' | 'versiculo' | 'nenhum'
 * @param {{ zIndex?: number }} [opts] — ex.: { zIndex: 10000 } para confete acima do Dialog da escada
 * @returns {Promise<void>} — fire-and-forget; callers podem ignorar.
 */
export async function dispararConfetePorTipo(tipo, opts = {}) {
  const z = opts.zIndex != null ? opts.zIndex : 100
  switch (tipo) {
    case 'dourado':
      return confeteDourado(z)
    case 'intenso':
      return confeteChuvaIntensa(z)
    case 'versiculo':
      return confeteVersiculo(z)
    case 'simples':
      return confeteSimples(z)
    default:
      return
  }
}

/**
 * Confete num canvas próprio (ex.: sobreposto à medalha no modal da escada).
 * Usa `confetti.create` — desenha por cima do conteúdo abaixo no mesmo
 * empilhamento do pai.
 */
export async function dispararConfetePorTipoNoCanvas(canvas, tipo) {
  if (!canvas || typeof canvas.getContext !== 'function') return
  const confetti = await carregarConfetti()
  if (!confetti) return

  let myConfetti
  try {
    myConfetti = confetti.create(canvas, { resize: true, useWorker: true })
    if (typeof myConfetti.reset === 'function') {
      myConfetti.reset()
    }
  } catch {
    return
  }

  const fire = (partial) => {
    try {
      myConfetti({
        disableForReducedMotion: true,
        ...partial,
      })
    } catch {
      /* ignore */
    }
  }

  switch (tipo) {
    case 'dourado':
      fire({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#FFD700', '#FFA500', '#FFEC8B', '#FFF8DC', '#daa520'],
        scalar: 0.95,
      })
      break
    case 'intenso': {
      const end = Date.now() + 1100
      const tick = () => {
        fire({
          particleCount: 22,
          angle: 60,
          spread: 52,
          origin: { x: 0, y: 0.55 },
          colors: ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'],
        })
        fire({
          particleCount: 22,
          angle: 120,
          spread: 52,
          origin: { x: 1, y: 0.55 },
          colors: ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'],
        })
        if (Date.now() < end) requestAnimationFrame(tick)
      }
      tick()
      break
    }
    case 'versiculo':
      fire({
        particleCount: 55,
        spread: 58,
        origin: { y: 0.65 },
        colors: ['#26ccff', '#a78bfa', '#f472b6', '#fbbf24'],
      })
      fire({
        particleCount: 18,
        spread: 40,
        origin: { y: 0.72 },
        colors: ['#fef3c7', '#fde68a', '#fcd34d'],
        scalar: 0.82,
      })
      break
    case 'simples':
      fire({
        particleCount: 55,
        spread: 58,
        origin: { y: 0.65 },
        colors: ['#26ccff', '#a78bfa', '#f472b6', '#fbbf24'],
      })
      break
    default:
      break
  }
}

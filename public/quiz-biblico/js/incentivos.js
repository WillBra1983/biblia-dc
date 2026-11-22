/**
 * Fila de incentivos — portado de Salvation/IncentivosListener.jsx
 * Escuta `app-incentivo` e exibe toasts + confete.
 */
const QuizIncentivos = (() => {
  const fila = []
  let aberto = false
  let toastEl = null
  let msgEl = null
  let verseEl = null

  function ensureDom() {
    if (toastEl) return
    toastEl = document.createElement('div')
    toastEl.id = 'incentivo-toast'
    toastEl.className = 'incentivo-toast hidden'
    toastEl.innerHTML = `
      <div class="incentivo-toast-inner">
        <button type="button" class="incentivo-close" aria-label="Fechar">✕</button>
        <p class="incentivo-msg"></p>
        <p class="incentivo-verse hidden"></p>
      </div>`
    document.body.appendChild(toastEl)
    msgEl = toastEl.querySelector('.incentivo-msg')
    verseEl = toastEl.querySelector('.incentivo-verse')
    toastEl.querySelector('.incentivo-close')?.addEventListener('click', fechar)
  }

  function fechar() {
    aberto = false
    toastEl?.classList.add('hidden')
    if (verseEl) {
      verseEl.textContent = ''
      verseEl.classList.add('hidden')
    }
    setTimeout(processarFila, 120)
  }

  function processarFila() {
    if (aberto) return
    const item = fila.shift()
    if (!item) return
    const msg = String(item.mensagem || '').trim()
    if (!msg) {
      processarFila()
      return
    }

    ensureDom()
    msgEl.textContent = msg
    const verso = String(item.versiculoDestaque || '').trim()
    if (verso && verseEl) {
      verseEl.textContent = `"${verso.length > 220 ? `${verso.slice(0, 217)}…` : verso}"`
      verseEl.classList.remove('hidden')
    } else if (verseEl) {
      verseEl.classList.add('hidden')
    }

    const confete = item.meta?.confete
    if (confete && confete !== 'nenhum') {
      QuizConfetti.disparar(confete, { zIndex: 10000 })
    }

    toastEl.classList.remove('hidden')
    toastEl.classList.toggle('incentivo-info', item.severidade === 'info')
    aberto = true

    const ms = verso ? 9000 : 6500
    clearTimeout(fechar._t)
    fechar._t = setTimeout(fechar, ms)
  }

  function enfileirar(detail) {
    const msg = String(detail?.mensagem || '').trim()
    if (!msg) return
    fila.push(detail)
    processarFila()
  }

  function disparar(detail) {
    window.dispatchEvent(new CustomEvent('app-incentivo', { detail }))
  }

  function dispararConquistas(conquistas) {
    if (!Array.isArray(conquistas)) return
    conquistas.forEach((c) => {
      disparar({
        mensagem: `${c.emoji} Medalha: ${c.nome} — ${c.desc}`,
        meta: { confete: c.confete || 'dourado', medalhaId: c.id },
      })
    })
  }

  function celebrarAcerto() {
    QuizConfetti.disparar('versiculo', { zIndex: 9999 })
  }

  function init() {
    ensureDom()
    window.addEventListener('app-incentivo', (e) => enfileirar(e.detail || {}))
  }

  return { init, disparar, enfileirar, dispararConquistas, celebrarAcerto }
})()

window.QuizIncentivos = QuizIncentivos

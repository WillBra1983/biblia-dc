/* Progresso do novo Quiz. Preserva o formato e os dados do Quiz anterior. */
const QuizFirebaseCloudSync = (() => {
  let active = null, timer = null, unlisten = null, applying = false, generation = 0
  const trilhaKey = 'quizBibliaV2_trilha_linear_v1'
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
  const path = uid => `users/${uid}/quizRetiro/novoQuiz`
  let dirty = false, remoteAt = 0, revision = 0
  const compatible = progress => progress?.v === 1 && Array.isArray(progress.ordem) && progress.ordem.length > 0 && progress.ordem.every(id => typeof id === 'string' && id.startsWith('q:'))
  async function write(uid) {
    if (!uid || uid !== active || !dirty) return 0
    const g = generation
    await window.BibliaQuiz.ready()
    if (g !== generation || uid !== active) return 0
    const updatedAt = Date.now()
    const version = revision
    const snapshot = { progress: read(QuizConfig.STORAGE.PROGRESS), trilhaLinear: read(trilhaKey), updatedAt }
    await window.BibliaQuiz.database().ref(path(uid)).transaction(current =>
      Number(current?.updatedAt) > updatedAt ? undefined : snapshot)
    if (g === generation && version === revision) dirty = false
    return updatedAt
  }
  function agendarFlush(options = {}) {
    if (!active || applying) return
    dirty = true
    revision++
    clearTimeout(timer)
    if (options.immediate) { void write(active).catch(() => {}); return }
    timer = setTimeout(() => { void write(active).catch(() => {}) }, 650)
  }
  function stop() {
    generation++
    clearTimeout(timer)
    unlisten?.(); unlisten = null
    window.removeEventListener('quiz-progress-changed', agendarFlush)
    active = null; dirty = false; remoteAt = 0
  }
  async function start(uid) {
    if (uid === active) return
    stop()
    if (!uid || !QuizFirebaseAuth.podePublicarRanking()) return
    active = uid
    const g = generation
    try {
      if (!await window.BibliaQuiz.ready() || g !== generation) return
      const db = window.BibliaQuiz.database()
      const snap = await db.ref(path(uid)).once('value')
      if (g !== generation) return
      if (!snap.exists()) {
        // Migra só IDs textuais compatíveis; não converte IDs numéricos do Quiz anterior.
        const legacy = (await db.ref(`users/${uid}/quizRetiro`).once('value')).val()
        if (g !== generation) return
        if (legacy?.progress && compatible({ ...legacy.progress, v: 1 })) {
          await db.ref(path(uid)).transaction(current => current || {
            progress: { ...legacy.progress, v: 1 }, trilhaLinear: legacy.trilhaLinear?.data || null,
            updatedAt: Number(legacy.progress.updatedAt) || 1,
          })
        }
      }
      if (g !== generation) return
      const target = db.ref(path(uid))
      const handler = snapshot => {
        if (g !== generation) return
        const data = snapshot.val(), at = Number(data?.updatedAt) || 0
        if (!data || at <= remoteAt) return
        remoteAt = at
        const localAt = Number(read(QuizConfig.STORAGE.PROGRESS)?.updatedAt) || 0
        if (dirty || localAt > at || window.__quizApp?.estaNoQuiz()) return
        applying = true
        try {
          if (data.progress && compatible(data.progress)) localStorage.setItem(QuizConfig.STORAGE.PROGRESS, JSON.stringify(data.progress))
          else if (!data.progress) localStorage.removeItem(QuizConfig.STORAGE.PROGRESS)
          if (data.trilhaLinear) localStorage.setItem(trilhaKey, JSON.stringify(data.trilhaLinear))
          else localStorage.removeItem(trilhaKey)
          window.__quizApp?.refreshSavedBanner()
        } finally { applying = false }
      }
      target.on('value', handler, () => {})
      unlisten = () => target.off('value', handler)
      window.addEventListener('quiz-progress-changed', agendarFlush)
    } catch (error) { console.warn('[Quiz] Sincronização indisponível:', error?.message) }
  }
  async function flushImmediate(uid = active) {
    clearTimeout(timer)
    try { return await write(uid) } catch { return 0 }
  }
  return { start, stop, agendarFlush, flushImmediate }
})()
window.QuizFirebaseCloudSync = QuizFirebaseCloudSync

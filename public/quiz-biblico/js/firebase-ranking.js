/**
 * Ranking online via Firebase RTDB — projeto Salvation (biblia-dc).
 * Quadros: quizRetiroBoards/{boardKey}/{uid}
 * Torneios: quizRetiroTorneios/{torneioId}/boards/{boardKey}/{uid}
 * Global (Salvation): quizBiblicoRanking/{uid} — melhor pontuação geral
 *
 * Publicação exige login com e-mail verificado (mesma conta do Salvation).
 */
const QuizFirebaseRanking = (() => {
  let db = null
  let ready = false
  let initPromise = null

  function isConfigured() { return window.BibliaQuiz.isConfigured(); }

  

  async function init() {
    if (!isConfigured()) return false
    if (ready) return true
    if (initPromise) return initPromise

    initPromise = (async () => {
      try {
        await window.BibliaQuiz.ready()
        db = window.BibliaQuiz.database()
        if (window.QuizFirebaseAuth) await QuizFirebaseAuth.init()
        ready = true
        return true
      } catch (err) {
        console.warn('[QuizFirebaseRanking] init:', err)
        return false
      }
    })()

    return initPromise
  }

  function uid() {
    const u = window.QuizFirebaseAuth?.getUser?.()
    return u?.uid || null
  }

  function payloadFromEntry(entry, user) {
    const displayName =
      entry.displayName ||
      (user ? QuizFirebaseAuth.displayName(user) : '') ||
      'Jogador'
    return {
      displayName: String(displayName).slice(0, 80),
      pontos: Math.max(0, Number(entry.acertos) || 0) * 10,
      acertos: Math.max(0, Number(entry.acertos) || 0),
      perguntasRespondidas: Math.max(0, Number(entry.totalPerguntas) || 0),
      totalPerguntas: Math.max(1, Number(entry.totalPerguntas) || 50),
      updatedAt: Date.now(),
      boardKey: entry.boardKey || '',
      modoScoring: entry.modoScoring || '',
      fase: Number(entry.fase) || 1,
      categoria: entry.categoria || '',
      tournamentId: entry.tournamentId || '',
      teamId: entry.teamId || '',
      teamName: entry.teamName || '',
    }
  }

  async function gravarSeMelhor(ref, novo) {
  const normalized = { ...novo, pontos: Math.max(0, Number(novo.acertos) || 0) * 10 };
  await ref.transaction(atual => !atual || normalized.pontos > Math.max(0, Number(atual.acertos) || 0) * 10 ? { ...atual, ...normalized } : undefined);
}

  function pathTorneio(codigo) {
    return `quizRetiroTorneios/${String(codigo || '').replace(/[.#$/[\]]/g, '_')}`
  }

  function stripTorneioPrefix(boardKey) {
    const parts = String(boardKey || 'geral').split(':')
    const raw = (parts[0] === 'torneio' && parts.length >= 3)
      ? parts.slice(2).join(':')
      : boardKey
    return typeof QuizCompetition !== 'undefined'
      ? QuizCompetition.boardKeySafe(raw)
      : String(raw || 'geral').replace(/[.#$/[\]]/g, '_')
  }

  async function lerTorneioMeta(codigo) {
    const ok = await init()
    if (!ok || !db || !codigo) return {}
    try {
      const snap = await db.ref(`${pathTorneio(codigo)}/meta`).once('value')
      return snap.val() || {}
    } catch {
      return {}
    }
  }

  async function salvarConfigTorneio(codigo, payload) {
    const ok = await init()
    if (!ok || !db || !codigo) return false
    if (!QuizFirebaseAuth.podePublicarRanking()) return false
    try {
      await db.ref(`${pathTorneio(codigo)}/config`).set({
        ...payload,
        updatedAt: Date.now(),
        criadoPorUid: uid(),
      })
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] salvar config torneio:', err)
      return false
    }
  }

  async function lerConfigTorneio(codigo) {
    const ok = await init()
    if (!ok || !db || !codigo) return null
    try {
      const snap = await db.ref(`${pathTorneio(codigo)}/config`).once('value')
      return snap.val() || null
    } catch (err) {
      console.warn('[QuizFirebaseRanking] ler config torneio:', err)
      return null
    }
  }

  async function registrarOrganizadorAbriuRanking(codigo) {
    const ok = await init()
    const id = uid()
    if (!ok || !db || !codigo || !id) return
    if (!QuizFirebaseAuth.podePublicarRanking()) return
    try {
      await db.ref(`${pathTorneio(codigo)}/meta`).update({
        organizadorAbriuRankingAt: Date.now(),
        organizadorUid: id,
      })
    } catch (err) {
      console.warn('[QuizFirebaseRanking] meta abrir:', err)
    }
  }

  async function liberarRankingParticipantes(codigo) {
    const ok = await init()
    const id = uid()
    if (!ok || !db || !codigo || !id) return false
    if (!QuizFirebaseAuth.podePublicarRanking()) return false
    try {
      await db.ref(`${pathTorneio(codigo)}/meta`).update({
        rankingLiberadoParticipantes: true,
        rankingLiberadoEm: Date.now(),
        liberadoPorUid: id,
      })
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] meta liberar:', err)
      return false
    }
  }

  function mapDetalhes(snap) {
    const v = snap.val()
    if (!v) return []
    return Object.entries(v)
      .map(([uidKey, data]) => ({ uid: uidKey, ...data, pontos: Math.max(0, Number(data.acertos) || 0) * 10 }))
      .filter((r) => r.finishedAt || r.pontos > 0)
      .sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos
        if (b.acertos !== a.acertos) return b.acertos - a.acertos
        return (a.tempoTotalMs || 0) - (b.tempoTotalMs || 0)
      })
  }

  function subscribeTorneioMeta(codigo, callback) {
    if (!isConfigured() || !codigo) {
      callback({})
      return () => {}
    }
    let unsub = () => {}
    void init().then((ok) => {
      if (!ok) {
        callback({})
        return
      }
      const ref = db.ref(`${pathTorneio(codigo)}/meta`)
      const handler = (snap) => callback(snap.val() || {})
      ref.on('value', handler, () => callback({}))
      unsub = () => ref.off('value', handler)
    })
    return () => unsub()
  }

  function subscribeTorneioDetalhes(codigo, callback) {
    if (!isConfigured() || !codigo) {
      callback([])
      return () => {}
    }
    let unsub = () => {}
    void init().then((ok) => {
      if (!ok) {
        callback([])
        return
      }
      const ref = db.ref(`${pathTorneio(codigo)}/detalhes`)
      const handler = (snap) => callback(mapDetalhes(snap))
      ref.on('value', handler, () => callback([]))
      unsub = () => ref.off('value', handler)
    })
    return () => unsub()
  }

  function todosTimesConcluiram(rows, times) {
    if (!times?.length || !rows?.length) return false
    const concluidos = new Set(rows.map((r) => r.teamId).filter(Boolean))
    return times.every((t) => concluidos.has(t.id))
  }

  async function sincronizarDetalheCompeticao(codigo, entry, detalhe) {
    const ok = await init()
    if (!ok || !db) return

    const user = QuizFirebaseAuth?.getUser?.()
    const id = uid()
    if (!id || !user || !codigo) return
    if (!QuizFirebaseAuth.podePublicarRanking()) return

    const novo = payloadFromEntry(entry, user)
    if (novo.pontos < 1 && !(detalhe?.respostas || []).length) return

    const boardSafe = stripTorneioPrefix(entry.boardKey)

    const payloadDetalhe = {
      displayName: novo.displayName,
      teamId: novo.teamId || '',
      teamName: novo.teamName || '',
      pontos: novo.pontos,
      acertos: novo.acertos,
      totalPerguntas: novo.totalPerguntas,
      tempoTotalMs: Math.max(0, Number(detalhe?.tempoTotalMs) || 0),
      respostas: Array.isArray(detalhe?.respostas) ? detalhe.respostas.slice(0, 80) : [],
      finishedAt: Date.now(),
      updatedAt: Date.now(),
    }

    try {
      await gravarSeMelhor(
        db.ref(`${pathTorneio(codigo)}/boards/${boardSafe}/${id}`),
        { ...novo, tournamentId: codigo }
      )
      await db.ref(`${pathTorneio(codigo)}/detalhes/${id}`).set(payloadDetalhe)
    } catch (err) {
      console.warn('[QuizFirebaseRanking] detalhe competição:', err)
    }
  }

  async function sincronizar(entry, detalheCompeticao = null) {
    const ok = await init()
    if (!ok || !db) return

    const user = QuizFirebaseAuth?.getUser?.()
    const id = uid()
    if (!id || !user) return
    if (!QuizFirebaseAuth.podePublicarRanking()) {
      console.warn('[QuizFirebaseRanking] E-mail não verificado — ranking online não publicado.')
      return
    }

    const novo = payloadFromEntry(entry, user)
    if (novo.pontos < 1) return

    const torneio =
      entry.tournamentId ||
      (typeof QuizCompetition !== 'undefined' ? QuizCompetition.codigoTorneio() : null)

    const boardSafe = torneio
      ? stripTorneioPrefix(entry.boardKey)
      : (typeof QuizCompetition !== 'undefined'
          ? QuizCompetition.boardKeySafe(entry.boardKey)
          : String(entry.boardKey || 'geral').replace(/[.#$/[\]]/g, '_'))

    const completo =
      typeof QuizRanking !== 'undefined'
        ? QuizRanking.ehCompleto(entry.categoria)
        : String(entry.categoria || 'completo').split(':')[0] === 'completo'

    try {
      if (torneio) {
        if (detalheCompeticao) {
          await sincronizarDetalheCompeticao(torneio, entry, detalheCompeticao)
        } else {
          await gravarSeMelhor(
            db.ref(`${pathTorneio(torneio)}/boards/${boardSafe}/${id}`),
            { ...novo, tournamentId: torneio }
          )
        }
      } else {
        await gravarSeMelhor(
          db.ref(`quizRetiroBoards/${boardSafe}/${id}`),
          novo
        )
        if (completo && window.BibliaQuiz.rankingOptIn()) {
          const globalRef = db.ref(`quizBiblicoRanking/${id}`)
          await gravarSeMelhor(globalRef, {
            displayName: novo.displayName,
            pontos: novo.pontos,
            acertos: novo.acertos,
            perguntasRespondidas: novo.perguntasRespondidas,
            totalPerguntas: novo.totalPerguntas,
            fase: novo.fase,
            updatedAt: novo.updatedAt,
          })
        }
      }
    } catch (err) {
      console.warn('[QuizFirebaseRanking] sync:', err)
    }
  }

  function mapRows(snap, limit = 50) {
    const v = snap.val()
    if (!v) return []
    return Object.entries(v)
      .map(([id, data]) => ({ uid: id, ...data, pontos: Math.max(0, Number(data.acertos) || 0) * 10 }))
      .filter((r) => r.pontos > 0)
      .sort((a, b) => b.pontos - a.pontos || b.acertos - a.acertos)
      .slice(0, limit)
  }

  function subscribe(callback, limit = 50) {
    return subscribeGlobal(callback, limit)
  }

  function subscribeGlobal(callback, limit = 50) {
    if (!isConfigured()) {
      callback([])
      return () => {}
    }
    let unsub = () => {}
    void init().then((ok) => {
      if (!ok) {
        callback([])
        return
      }
      const ref = db.ref('quizBiblicoRanking')
      const handler = (snap) => callback(mapRows(snap, limit))
      ref.on('value', handler)
      unsub = () => ref.off('value', handler)
    })
    return () => unsub()
  }

  function subscribeBoard(boardKey, callback, limit = 50) {
    if (!isConfigured() || !boardKey || boardKey === 'todos') {
      callback([])
      return () => {}
    }
    let unsub = () => {}
    void init().then((ok) => {
      if (!ok) {
        callback([])
        return
      }
      const safe =
        typeof QuizCompetition !== 'undefined'
          ? QuizCompetition.boardKeySafe(boardKey)
          : boardKey.replace(/[.#$/[\]]/g, '_')

      const parts = String(boardKey).split(':')
      let ref
      if (parts[0] === 'torneio' && parts.length >= 2) {
        const tor = parts[1]
        const rest = parts.slice(2).join(':')
        const restSafe =
          typeof QuizCompetition !== 'undefined'
            ? QuizCompetition.boardKeySafe(rest)
            : rest.replace(/[.#$/[\]]/g, '_')
        ref = db.ref(`quizRetiroTorneios/${tor}/boards/${restSafe}`)
      } else {
        ref = db.ref(`quizRetiroBoards/${safe}`)
      }

      const handler = (snap) => callback(mapRows(snap, limit))
      ref.on('value', handler, () => callback([]))
      unsub = () => ref.off('value', handler)
    })
    return () => unsub()
  }

  async function registrarParticipante(codigo) {
    const ok = await init()
    const id = uid()
    if (!ok || !db || !codigo || !id) return false
    if (!QuizFirebaseAuth.podePublicarRanking()) return false
    const user = QuizFirebaseAuth.getUser?.()
    try {
      await db.ref(`${pathTorneio(codigo)}/participantes/${id}`).set({
        email: user?.email || '',
        displayName: user?.displayName || '',
        entradaEm: Date.now(),
        ativo: true,
      })
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] registrar participante:', err)
      return false
    }
  }

  function subscribeParticipantes(codigo, callback) {
    let unsub = () => {}
    void init().then((ok) => {
      if (!ok || !db || !codigo) { callback([]); return }
      const ref = db.ref(`${pathTorneio(codigo)}/participantes`)
      const handler = (snap) => {
        const val = snap.val() || {}
        const lista = Object.entries(val).map(([uid, d]) => ({ uid, ...d }))
        callback(lista)
      }
      ref.on('value', handler, () => callback([]))
      unsub = () => ref.off('value', handler)
    })
    return () => unsub()
  }

  async function removerParticipante(codigo, participanteUid) {
    const ok = await init()
    if (!ok || !db || !codigo || !participanteUid) return false
    try {
      await db.ref(`${pathTorneio(codigo)}/participantes/${participanteUid}`).remove()
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] remover participante:', err)
      return false
    }
  }

  async function bloquearEntradas(codigo, bloqueado) {
    const ok = await init()
    if (!ok || !db || !codigo) return false
    if (!QuizFirebaseAuth.podePublicarRanking()) return false
    try {
      await db.ref(`${pathTorneio(codigo)}/meta`).update({
        entradasBloqueadas: Boolean(bloqueado),
        bloqueadasEm: bloqueado ? Date.now() : null,
      })
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] bloquear entradas:', err)
      return false
    }
  }

  async function solicitarReentrada(codigo) {
    const ok = await init()
    const id = uid()
    if (!ok || !db || !codigo || !id) return false
    const user = QuizFirebaseAuth.getUser?.()
    try {
      await db.ref(`${pathTorneio(codigo)}/reentradas/${id}`).set({
        email: user?.email || '',
        displayName: user?.displayName || '',
        solicitadoEm: Date.now(),
        status: 'pendente',
      })
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] solicitar reentrada:', err)
      return false
    }
  }

  async function responderReentrada(codigo, solicitanteUid, aprovado) {
    const ok = await init()
    if (!ok || !db || !codigo || !solicitanteUid) return false
    try {
      await db.ref(`${pathTorneio(codigo)}/reentradas/${solicitanteUid}`).update({
        status: aprovado ? 'aprovado' : 'negado',
        respondidoEm: Date.now(),
      })
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] responder reentrada:', err)
      return false
    }
  }

  function subscribeReentradas(codigo, callback) {
    let unsub = () => {}
    void init().then((ok) => {
      if (!ok || !db || !codigo) { callback([]); return }
      const ref = db.ref(`${pathTorneio(codigo)}/reentradas`)
      const handler = (snap) => {
        const val = snap.val() || {}
        const lista = Object.entries(val)
          .map(([uid, d]) => ({ uid, ...d }))
          .filter((r) => r.status === 'pendente')
        callback(lista)
      }
      ref.on('value', handler, () => callback([]))
      unsub = () => ref.off('value', handler)
    })
    return () => unsub()
  }

  async function verificarReentrada(codigo) {
    const ok = await init()
    const id = uid()
    if (!ok || !db || !codigo || !id) return null
    try {
      const snap = await db.ref(`${pathTorneio(codigo)}/reentradas/${id}`).once('value')
      return snap.val() || null
    } catch {
      return null
    }
  }

  async function registrarJogadorNoTime(codigo, teamId, nome) {
    const ok = await init()
    const id = uid()
    if (!ok || !db || !codigo || !teamId || !id) return false
    if (!QuizFirebaseAuth.podePublicarRanking()) return false
    const user = QuizFirebaseAuth.getUser?.()
    try {
      await db.ref(`${pathTorneio(codigo)}/jogadores/${teamId}/${id}`).set({
        email: user?.email || '',
        displayName: user?.displayName || nome || '',
        nome: String(nome || '').slice(0, 40),
        entradaEm: Date.now(),
      })
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] registrar jogador no time:', err)
      return false
    }
  }

  function subscribeJogadores(codigo, callback) {
    let unsub = () => {}
    void init().then((ok) => {
      if (!ok || !db || !codigo) { callback({}); return }
      const ref = db.ref(`${pathTorneio(codigo)}/jogadores`)
      const handler = (snap) => {
        const val = snap.val() || {}
        const result = {}
        for (const [teamId, membros] of Object.entries(val)) {
          result[teamId] = Object.entries(membros).map(([uid, d]) => ({ uid, ...d }))
        }
        callback(result)
      }
      ref.on('value', handler, () => callback({}))
      unsub = () => ref.off('value', handler)
    })
    return () => unsub()
  }

  async function removerJogadorDoTime(codigo, teamId, jogadorUid) {
    const ok = await init()
    if (!ok || !db || !codigo || !teamId || !jogadorUid) return false
    try {
      await db.ref(`${pathTorneio(codigo)}/jogadores/${teamId}/${jogadorUid}`).remove()
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] remover jogador do time:', err)
      return false
    }
  }

  async function bloquearEntradaTime(codigo, teamId, bloqueado) {
    const ok = await init()
    if (!ok || !db || !codigo || !teamId) return false
    if (!QuizFirebaseAuth.podePublicarRanking()) return false
    try {
      if (bloqueado) {
        await db.ref(`${pathTorneio(codigo)}/timesBloqueados/${teamId}`).set(true)
      } else {
        await db.ref(`${pathTorneio(codigo)}/timesBloqueados/${teamId}`).remove()
      }
      return true
    } catch (err) {
      console.warn('[QuizFirebaseRanking] bloquear time:', err)
      return false
    }
  }

  function subscribeTimesBloqueados(codigo, callback) {
    let unsub = () => {}
    void init().then((ok) => {
      if (!ok || !db || !codigo) { callback({}); return }
      const ref = db.ref(`${pathTorneio(codigo)}/timesBloqueados`)
      const handler = (snap) => callback(snap.val() || {})
      ref.on('value', handler, () => callback({}))
      unsub = () => ref.off('value', handler)
    })
    return () => unsub()
  }

  async function atualizarProgressoAoVivo(codigo, dados) {
    const ok = await init()
    const id = uid()
    if (!ok || !db || !codigo || !id) return
    try {
      await db.ref(`${pathTorneio(codigo)}/progresso/${id}`).set({
        ...dados,
        updatedAt: Date.now(),
      })
    } catch {
      /* silencioso — não bloquear o quiz */
    }
  }

  async function limparProgressoAoVivo(codigo) {
    const ok = await init()
    const id = uid()
    if (!ok || !db || !codigo || !id) return
    try {
      await db.ref(`${pathTorneio(codigo)}/progresso/${id}`).remove()
    } catch { /* ignore */ }
  }

  function subscribeProgressoAoVivo(codigo, callback) {
    let unsub = () => {}
    void init().then((ok) => {
      if (!ok || !db || !codigo) { callback([]); return }
      const ref = db.ref(`${pathTorneio(codigo)}/progresso`)
      const handler = (snap) => {
        const val = snap.val() || {}
        const lista = Object.entries(val).map(([uid, d]) => ({ uid, ...d }))
        callback(lista)
      }
      ref.on('value', handler, () => callback([]))
      unsub = () => ref.off('value', handler)
    })
    return () => unsub()
  }

  return {
    isConfigured,
    init,
    sincronizar,
    sincronizarDetalheCompeticao,
    subscribe,
    subscribeGlobal,
    subscribeBoard,
    subscribeTorneioMeta,
    subscribeTorneioDetalhes,
    lerTorneioMeta,
    registrarOrganizadorAbriuRanking,
    liberarRankingParticipantes,
    todosTimesConcluiram,
    salvarConfigTorneio,
    lerConfigTorneio,
    registrarParticipante,
    subscribeParticipantes,
    removerParticipante,
    bloquearEntradas,
    solicitarReentrada,
    responderReentrada,
    subscribeReentradas,
    verificarReentrada,
    registrarJogadorNoTime,
    subscribeJogadores,
    removerJogadorDoTime,
    bloquearEntradaTime,
    subscribeTimesBloqueados,
    atualizarProgressoAoVivo,
    limparProgressoAoVivo,
    subscribeProgressoAoVivo,
    uid,
  }
})()

window.QuizFirebaseRanking = QuizFirebaseRanking

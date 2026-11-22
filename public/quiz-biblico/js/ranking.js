/**
 * Ranking online (Firebase / Salvation) — trilha Completo e torneios.
 */
const QuizRanking = (() => {
  function ehCompleto(categoria) {
    const cat = String(categoria || 'completo').split(':')[0]
    return cat === 'completo' || cat === 'todas'
  }

  function isQuadroTorneio(boardKey) {
    return String(boardKey || '').startsWith('torneio:')
  }

  function ordenar(rows) {
    return [...rows]
      .filter((r) => r.pontos > 0)
      .sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos
        if (b.acertos !== a.acertos) return b.acertos - a.acertos
        return (b.updatedAt || 0) - (a.updatedAt || 0)
      })
  }

  function filtrarPorQuadro(rows, boardKey) {
    if (!boardKey || boardKey === 'todos') return ordenar(rows)
    return ordenar(rows.filter((r) => r.boardKey === boardKey))
  }

  function medalhaPosicaoHtml(pos) {
    const m = typeof QuizMedalhas !== 'undefined' ? QuizMedalhas.dePosicaoPodio(pos) : null
    if (m?.src) {
      return QuizMedalhas.imgHtml(m, { size: 'xs', className: 'ranking-pos-medal' })
    }
    if (pos === 1) return '🥇'
    if (pos === 2) return '🥈'
    if (pos === 3) return '🥉'
    return String(pos)
  }

  function registrarRodada(opts) {
    const {
      nome,
      pontos,
      acertos,
      totalPerguntas,
      fase,
      categoria,
      modoJogo,
      dailyDate,
      modoScoring,
      tournamentId,
      teamId,
      teamName,
    } = opts

    if (!pontos || pontos < 1) return

    const torneio =
      tournamentId ||
      (modoJogo === 'competicao' && typeof QuizCompetition !== 'undefined'
        ? QuizCompetition.codigoTorneio()
        : null)

    if (!torneio && modoJogo === 'desafio_diario') return

    const displayName = String(nome || 'Jogador').trim().slice(0, 40) || 'Jogador'
    const scoring =
      modoScoring || (typeof QuizPontuacao !== 'undefined' ? QuizPontuacao.lerModo() : 'sequencia')
    const boardKey =
      typeof QuizCompetition !== 'undefined'
        ? QuizCompetition.boardKey({
            modo: scoring,
            fase,
            categoria,
            dailyDate,
            modoJogo,
          })
        : `f${Number(fase) || 1}:${String(categoria || 'completo').replace(/:/g, '_')}:${scoring}`

    const entry = {
      displayName,
      pontos: Math.max(0, Number(pontos) || 0),
      acertos: Math.max(0, Number(acertos) || 0),
      totalPerguntas: Math.max(1, Number(totalPerguntas) || 50),
      fase: Number(fase) || 1,
      categoria: categoria || 'completo',
      modoScoring: scoring,
      modoJogo: modoJogo || 'trilha_linear',
      boardKey,
      tournamentId: torneio || null,
      teamId: teamId || null,
      teamName: teamName ? String(teamName).slice(0, 40) : null,
      updatedAt: Date.now(),
    }

    if (window.QuizFirebaseRanking?.isConfigured()) {
      void window.QuizFirebaseRanking.sincronizar(entry, opts.detalheCompeticao || null)
    }
  }

  function labelTrilha(r) {
    if (typeof QuizCompetition !== 'undefined' && r.boardKey) {
      return QuizCompetition.labelBoard(r.boardKey)
    }
    const cat = r.categoria === 'todas' ? 'completo' : r.categoria || 'completo'
    if (typeof QuizTrilhas !== 'undefined' && r.modoJogo !== 'desafio_diario') {
      const trilhaId = cat.includes(':') ? cat.split(':')[0] : cat
      const subId = cat.includes(':') ? cat.split(':').slice(1).join(':') : null
      const faseLabel =
        typeof QuizConfig !== 'undefined' ? QuizConfig.labelFase(Number(r.fase) || 1) : `Fase ${r.fase}`
      return `${faseLabel} · ${QuizTrilhas.trilhaLabel(trilhaId, subId)}`
    }
    return `Fase ${r.fase}`
  }

  function agregarPorTimes(rows) {
    const map = new Map()
    for (const r of rows) {
      if (!r.teamName) continue
      const key = r.teamId || r.teamName
      if (!map.has(key)) {
        map.set(key, { teamId: key, teamName: r.teamName, pontos: 0, jogadores: 0 })
      }
      const t = map.get(key)
      t.pontos += r.pontos || 0
      t.jogadores += 1
    }
    return [...map.values()].sort((a, b) => b.pontos - a.pontos || b.jogadores - a.jogadores)
  }

  function renderTabelaTimes(container, rows) {
    if (!container) return
    const times = agregarPorTimes(filtrarPorQuadro(rows, 'todos'))
    if (!times.length) {
      container.innerHTML = ''
      return
    }
    container.innerHTML = `
      <table class="ranking-table ranking-table-teams">
        <thead>
          <tr><th>#</th><th>Time</th><th>Pontos</th><th>Jogadores</th></tr>
        </thead>
        <tbody>
          ${times
            .map((t, i) => {
              const pos = i + 1
              const medal = medalhaPosicaoHtml(pos)
              return `<tr>
                <td class="ranking-pos-cell">${medal}</td>
                <td>${escapeHtml(t.teamName)}</td>
                <td>${t.pontos}</td>
                <td>${t.jogadores}</td>
              </tr>`
            })
            .join('')}
        </tbody>
      </table>`
  }

  function renderTabela(container, rows, highlightName, opts = {}) {
    if (!container) return
    const boardKey = opts.boardKey || 'todos'
    const lista = filtrarPorQuadro(rows, boardKey)
    if (!lista.length) {
      container.innerHTML =
        '<p class="ranking-empty">Ainda não há pontuações. Conecte-se e complete a trilha <strong>Completo</strong> para entrar!</p>'
      return
    }
    const hl = String(highlightName || '').trim().toLowerCase()
    const showTeam = Boolean(opts.showTeam)
    const showTempo = Boolean(opts.showTempo) || lista.some((r) => r.tempoTotalMs > 0)
    const hideFase = Boolean(opts.hideFase)
    const teamCol = showTeam ? '<th>Time</th>' : ''
    const tempoCol = showTempo ? '<th>Tempo</th>' : ''
    const faseCol = hideFase ? '' : '<th>Fase</th>'
    const modoLabel = opts.subtitle || 'Trilha Completo · melhor rodada por jogador'
    container.innerHTML = `
      <p class="ranking-hint">${escapeHtml(modoLabel)} · desempate: acertos, depois data.</p>
      <table class="ranking-table">
        <thead>
          <tr><th>#</th><th>Jogador</th>${teamCol}<th>Pontos</th><th>Acertos</th>${tempoCol}${faseCol}</tr>
        </thead>
        <tbody>
          ${lista
            .map((r, i) => {
              const pos = i + 1
              const medal = medalhaPosicaoHtml(pos)
              const souEu = r.displayName.toLowerCase() === hl
              const teamCell = showTeam
                ? `<td>${r.teamName ? escapeHtml(r.teamName) : '—'}</td>`
                : ''
              const tempoCell = showTempo
                ? `<td>${formatTempoMs(r.tempoTotalMs)}</td>`
                : ''
              const faseCell = hideFase
                ? ''
                : `<td>${escapeHtml(typeof QuizConfig !== 'undefined' ? QuizConfig.labelFase(Number(r.fase) || 1) : `Fase ${r.fase}`)}</td>`
              return `<tr class="${souEu ? 'ranking-me' : ''}">
                <td class="ranking-pos-cell">${medal}</td>
                <td>${escapeHtml(r.displayName)}${souEu ? ' <small>(você)</small>' : ''}</td>
                ${teamCell}
                <td>${r.pontos}</td>
                <td>${r.acertos}/${r.totalPerguntas}</td>
                ${tempoCell}
                ${faseCell}
              </tr>`
            })
            .join('')}
        </tbody>
      </table>`
  }

  function renderPodio(container, rows, boardKey = 'todos') {
    if (!container) return
    const [a, b, c] = filtrarPorQuadro(rows, boardKey)
    const medalHtml = (pos) => {
      const m =
        typeof QuizMedalhas !== 'undefined' ? QuizMedalhas.dePosicaoPodio(pos) : null
      if (m?.src) {
        return QuizMedalhas.imgHtml(m, { size: 'podium', className: 'podium-medal-img' })
      }
      const fallback = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'
      return `<span class="podium-medal">${fallback}</span>`
    }
    container.innerHTML = `
      <div class="podium">
        <div class="podium-slot second">${b ? `${medalHtml(2)}<strong>${escapeHtml(b.displayName)}</strong><br>${b.pontos} pts` : '—'}</div>
        <div class="podium-slot first">${a ? `${medalHtml(1)}<strong>${escapeHtml(a.displayName)}</strong><br>${a.pontos} pts` : '—'}</div>
        <div class="podium-slot third">${c ? `${medalHtml(3)}<strong>${escapeHtml(c.displayName)}</strong><br>${c.pontos} pts` : '—'}</div>
      </div>`
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function formatTempoMs(ms) {
    const n = Math.max(0, Number(ms) || 0)
    if (!n) return '—'
    const s = Math.floor(n / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    if (m > 0) return `${m}:${String(sec).padStart(2, '0')}`
    return `${sec}s`
  }

  function renderTorneioDetalhado(container, rows, opts = {}) {
    if (!container) return
    const lista = Array.isArray(rows) ? rows : []
    if (!lista.length) {
      container.innerHTML =
        '<p class="ranking-empty">Nenhuma rodada concluída ainda. O organizador vê atualizações em tempo real.</p>'
      return
    }

    container.innerHTML = lista
      .map((r, i) => {
        const pos = i + 1
        const medal = medalhaPosicaoHtml(pos)
        const titulo = r.teamName
          ? `${escapeHtml(r.displayName)} <small>(${escapeHtml(r.teamName)})</small>`
          : escapeHtml(r.displayName || 'Jogador')
        const respostas = Array.isArray(r.respostas) ? r.respostas : []
        const linhas = respostas
          .map((item, idx) => {
            const ok = item.acerto === true
            return `<tr>
              <td>${idx + 1}</td>
              <td>${ok ? '✓' : '✕'}</td>
              <td>${formatTempoMs(item.tempoMs)}</td>
            </tr>`
          })
          .join('')

        return `<details class="ranking-detail-card">
          <summary>
            <span class="ranking-detail-pos">${medal}</span>
            <span class="ranking-detail-name">${titulo}</span>
            <span class="ranking-detail-stats">${r.acertos}/${r.totalPerguntas} · ${r.pontos} pts · ${formatTempoMs(r.tempoTotalMs)}</span>
          </summary>
          ${
            linhas
              ? `<table class="ranking-table ranking-table-respostas">
                  <thead><tr><th>#</th><th>Resposta</th><th>Tempo</th></tr></thead>
                  <tbody>${linhas}</tbody>
                </table>`
              : '<p class="ranking-hint">Detalhes das respostas indisponíveis neste registro.</p>'
          }
        </details>`
      })
      .join('')
  }

  return {
    ehCompleto,
    registrarRodada,
    isQuadroTorneio,
    filtrarPorQuadro,
    renderTabela,
    renderTabelaTimes,
    renderPodio,
    renderTorneioDetalhado,
    formatTempoMs,
    ordenar,
    labelTrilha,
  }
})()

window.QuizRanking = QuizRanking

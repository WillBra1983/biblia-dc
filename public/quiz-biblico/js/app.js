/**
 * Quiz Bíblico — fluxo: Início → Fase → Trilha → Quiz (perguntas em sequência)
 */
class QuizApp {
    constructor() {
    this.screens = {
      start: document.getElementById('start-screen'),
      daily: document.getElementById('daily-screen'),
      trilha: document.getElementById('trilha-screen'),
      subtrilha: document.getElementById('sub-trilha-screen'),
      path: document.getElementById('path-screen'),
      quiz: document.getElementById('quiz-screen'),
      result: document.getElementById('result-screen'),
    }

    this.state = {
      modo: 'categoria',
      fase: 1,
      trilhaId: 'completo',
      trilhaSubId: null,
      categoriaId: 'completo',
      nivelIndex: 0,
      dailyDate: null,
      perguntas: [],
      optionOrders: [],
      atual: 0,
      escolha: null,
      mostrarFeedback: false,
      sequencia: 0,
      totalPontos: 0,
      respostas: [],
      pontosRodada: 0,
      acertouUltima: false,
      hintUsed: false,
    }

    this.onlineRows = []
    this.torneioRows = []
    this.torneioDetalhes = []
    this.torneioMeta = {}
    this.firebaseUnsub = null
    this.firebaseBoardUnsub = null
    this.firebaseMetaUnsub = null
    this.firebaseDetalhesUnsub = null
    this._pendingLeaveScreen = null
    this._saidaConfirmada = false
    this._scrollFeedback = false
    this._bloquearPersistencia = false
    this._authEmailMode = 'login'
    this._authPendingSuccess = null

    this.bindEvents()
    document.getElementById('btn-home-competition')?.addEventListener('click', () => { this.entrarJogoNormal(); document.getElementById('btn-competition-toggle')?.click(); })
    const count = document.getElementById('home-question-count'); if (count) count.textContent = window.questionsUnified.length;
    const phases = document.getElementById('home-phase-count'); if (phases) phases.textContent = window.questionsPhases.length;
    this.refreshSavedBanner()
    this.refreshHomeMedalhas()
    this.initCloudAuth()
    if (typeof QuizCompetition !== 'undefined') QuizCompetition.desativarAoReiniciar()
    this.initCompetitionFromUrl()
  }

  initCloudAuth() {
    if (!QuizFirebaseRanking.isConfigured()) {
      this.renderCloudAuthPanel()
      return
    }
    void QuizFirebaseAuth.init().then(() => {
      QuizFirebaseAuth.onChange((user) => {
        if (user && QuizFirebaseAuth.podePublicarRanking()) {
          QuizFirebaseCloudSync.start(user.uid)
        } else {
          QuizFirebaseCloudSync.stop()
        }
        this.renderCloudAuthPanel()
        this.refreshHomeCloudStatus()
        this.refreshSavedBanner()
        if (this._lastResult) this.salvarRanking()
      })
      this.renderCloudAuthPanel()
      this.refreshHomeCloudStatus()
    })
  }

  refreshHomeCloudStatus() {
    const el = document.getElementById('home-cloud-status')
    if (!el) return
    if (!QuizFirebaseRanking.isConfigured()) {
      el.textContent = ''
      return
    }
    const user = QuizFirebaseAuth.getUser?.()
    if (user && QuizFirebaseAuth.podePublicarRanking()) {
      el.textContent = 'Progresso sincronizado na nuvem — você pode continuar em outro aparelho.'
    } else if (user && !user.emailVerified) {
      el.textContent = 'Confirme seu e-mail na Bíblia do Discípulo Cristão para sincronizar e publicar no ranking.'
    } else {
      el.textContent = 'Sem conexão — o jogo funciona offline neste aparelho.'
    }
  }

  initCompetitionFromUrl(fromUrl) {
    if (typeof QuizCompetition === 'undefined') return
    const result = QuizCompetition.aplicarDeUrl(fromUrl)
    if (!result?.ok) return

    this.renderScoringToggle()
    if (result.precisaEntrada && !QuizCompetition.isOrganizador()) {
      this.showTeamPickerDialog(result.label)
    } else {
      this.showScreen('trilha')
    }
  }

  showTeamPickerDialog(eventLabel) {
    const times = QuizCompetition.listarTimes()
    if (!times.length) {
      this.showScreen('trilha')
      return
    }

    this._teamPickerSelected = QuizCompetition.meuTime()?.id || null
    this._teamPickerJogadores = {}
    this._teamPickerBloqueados = {}

    const title = document.getElementById('dialog-team-title')
    const desc = document.getElementById('dialog-team-desc')
    const list = document.getElementById('dialog-team-list')
    const nameWrap = document.getElementById('dialog-team-name-wrap')
    const nameInput = document.getElementById('dialog-team-player-name')
    const confirmBtn = document.getElementById('dialog-team-confirm')
    const errEl = document.getElementById('dialog-team-error')

    const individual = QuizCompetition.modoAcesso() === 'individual'
    const celularEquipe = !individual
    if (title) title.textContent = eventLabel ? `Entrar — ${eventLabel}` : 'Entrar no torneio'
    if (desc) {
      desc.textContent = individual
        ? 'Escolha seu time e informe seu nome para aparecer no ranking.'
        : 'Escolha o time deste celular. Cada equipe responde uma vez neste aparelho.'
    }
    if (nameWrap) nameWrap.classList.toggle('hidden', !individual)
    if (nameInput) nameInput.value = QuizCompetition.nomeParticipante() || QuizStorage.lerNomeJogador()
    if (confirmBtn) confirmBtn.classList.remove('hidden')
    const skipOrgBtn = document.getElementById('dialog-team-organizer-skip')
    if (skipOrgBtn) {
      skipOrgBtn.classList.toggle('hidden', !QuizCompetition.isOrganizador())
      skipOrgBtn.replaceWith(skipOrgBtn.cloneNode(true))
      document.getElementById('dialog-team-organizer-skip')?.addEventListener('click', () => {
        this._limparTeamPickerSubs()
        this.hideDialog('dialog-competition-team')
        this.renderCompetitionPanel()
        this.renderTrilhaGrid()
        this.showScreen('trilha')
      })
    }
    if (errEl) errEl.classList.add('hidden')

    const dialog = document.getElementById('dialog-competition-team')
    if (dialog && !dialog.dataset.backdropBound) {
      dialog.dataset.backdropBound = '1'
      dialog.addEventListener('click', (e) => {
        if (e.target !== dialog) return
        if (!QuizCompetition.isOrganizador()) return
        this._limparTeamPickerSubs()
        this.hideDialog('dialog-competition-team')
        this.renderCompetitionPanel()
        this.renderTrilhaGrid()
        this.showScreen('trilha')
      })
    }

    const renderList = () => {
      if (!list) return
      const myUid = QuizFirebaseRanking?.uid?.() || null
      list.innerHTML = times
        .map((t) => {
          const jogouLocal = celularEquipe && QuizCompetition.timeJaJogouNesteAparelho(t.id)
          const membros = this._teamPickerJogadores[t.id] || []
          const reservadoPorOutro = celularEquipe && membros.length > 0 && !membros.some((m) => m.uid === myUid)
          const bloqueado = Boolean(this._teamPickerBloqueados[t.id])
          const impedido = jogouLocal || reservadoPorOutro || bloqueado
          const sel = this._teamPickerSelected === t.id

          let statusTxt = ''
          if (jogouLocal) statusTxt = ' · já respondeu neste celular'
          else if (reservadoPorOutro) statusTxt = ' · já reservado por outro aparelho'
          else if (bloqueado) statusTxt = ' · entrada bloqueada'
          else if (individual && membros.length) statusTxt = ` · ${membros.length} jogador${membros.length > 1 ? 'es' : ''}`

          return `<button type="button" class="team-picker-btn ${sel ? 'selected' : ''} ${impedido ? 'disabled' : ''}" data-team-id="${t.id}" ${impedido ? 'disabled' : ''}>
            ${this.escapeHtml(t.nome)}${statusTxt}
          </button>`
        })
        .join('')
      list.querySelectorAll('.team-picker-btn:not([disabled])').forEach((btn) => {
        btn.addEventListener('click', () => {
          this._teamPickerSelected = btn.dataset.teamId
          renderList()
        })
      })
    }
    renderList()

    const codigo = QuizCompetition.codigoTorneio()
    this._limparTeamPickerSubs()
    if (codigo && QuizFirebaseRanking?.isConfigured()) {
      this._teamPickerJogadoresUnsub = QuizFirebaseRanking.subscribeJogadores(codigo, (jogadores) => {
        this._teamPickerJogadores = jogadores
        renderList()
      })
      this._teamPickerBloqueadosUnsub = QuizFirebaseRanking.subscribeTimesBloqueados(codigo, (bloq) => {
        this._teamPickerBloqueados = bloq
        renderList()
      })
    }

    confirmBtn?.replaceWith(confirmBtn.cloneNode(true))
    document.getElementById('dialog-team-confirm')?.addEventListener('click', async () => {
      const err = document.getElementById('dialog-team-error')
      const teamId = this._teamPickerSelected
      if (!teamId) {
        if (err) {
          err.textContent = 'Selecione um time.'
          err.classList.remove('hidden')
        }
        return
      }

      const membros = this._teamPickerJogadores[teamId] || []
      const myUid = QuizFirebaseRanking?.uid?.() || null
      if (celularEquipe && QuizCompetition.timeJaJogouNesteAparelho(teamId)) {
        if (err) { err.textContent = 'Este time já respondeu neste celular.'; err.classList.remove('hidden') }
        return
      }
      if (celularEquipe && membros.length > 0 && !membros.some((m) => m.uid === myUid)) {
        if (err) { err.textContent = 'Este time já foi reservado por outro aparelho.'; err.classList.remove('hidden') }
        return
      }
      if (this._teamPickerBloqueados[teamId]) {
        if (err) { err.textContent = 'Entrada neste time foi bloqueada pelo organizador.'; err.classList.remove('hidden') }
        return
      }

      let nome = ''
      if (individual) {
        nome = document.getElementById('dialog-team-player-name')?.value.trim() || ''
        if (!nome) {
          if (err) { err.textContent = 'Informe seu nome para o ranking.'; err.classList.remove('hidden') }
          return
        }
        QuizCompetition.gravarNomeParticipante(nome)
        QuizStorage.gravarNomeJogador(nome)
      } else {
        const time = times.find((t) => t.id === teamId)
        nome = time?.nome || 'Equipe'
        QuizCompetition.gravarNomeParticipante(nome)
      }

      if (codigo && QuizFirebaseRanking?.isConfigured()) {
        await QuizFirebaseRanking.registrarJogadorNoTime(codigo, teamId, nome)
      }

      QuizCompetition.selecionarTime(teamId)
      this._limparTeamPickerSubs()
      this.hideDialog('dialog-competition-team')
      this.renderCompetitionPanel()
      this.renderTrilhaGrid()
      if (QuizCompetition.podeIniciarRodada()) {
        this.iniciarCompeticaoRodada()
      } else {
        this.showScreen('trilha')
      }
    })

    this.showDialog('dialog-competition-team')
  }

  _limparTeamPickerSubs() {
    if (this._teamPickerJogadoresUnsub) { this._teamPickerJogadoresUnsub(); this._teamPickerJogadoresUnsub = null }
    if (this._teamPickerBloqueadosUnsub) { this._teamPickerBloqueadosUnsub(); this._teamPickerBloqueadosUnsub = null }
  }

  escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  garantirTimeAntesDeJogar() {
    if (typeof QuizCompetition === 'undefined' || !QuizCompetition.ativo()) return true
    if (QuizCompetition.organizadorSoOrganizando()) {
      alert(QuizCompetition.motivoNaoPodeIniciar())
      return false
    }
    if (QuizCompetition.precisaConfigurarEntrada()) {
      this.showTeamPickerDialog(QuizCompetition.labelTorneio())
      return false
    }
    return true
  }

  entrarJogoNormal() {
    if (typeof QuizCompetition !== 'undefined') QuizCompetition.desativarParaJogoNormal()
    this.state.modo = 'categoria'
    this.state.trilhaId = 'completo'
    this.state.trilhaSubId = null
    this.syncCategoriaFromTrilha()
    this.showScreen('trilha')
  }

  bindEvents() {
    document.getElementById('btn-play')?.addEventListener('click', () => this.entrarJogoNormal())
    document.getElementById('btn-daily')?.addEventListener('click', () => this.showScreen('daily'))
    document.getElementById('btn-daily-start')?.addEventListener('click', () => this.iniciarDesafioDiario())
    document.getElementById('btn-ranking')?.addEventListener('click', () => this.openRanking({ competicao: false }))
    document.getElementById('btn-achievements')?.addEventListener('click', () => this.openAchievements())

    document.querySelectorAll('.btn-back').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (this.estaNoQuiz()) {
          e.preventDefault()
          this.pedirConfirmacaoSaida(btn.dataset.back)
          return
        }
        this.showScreen(btn.dataset.back)
      })
    })

    document.getElementById('btn-quiz-exit')?.addEventListener('click', () => {
      this.pedirConfirmacaoSaida('start')
    })

    document.getElementById('confirm-btn')?.addEventListener('click', () => this.confirmar())
    document.getElementById('next-btn')?.addEventListener('click', () => this.proxima())
    document.getElementById('btn-hint')?.addEventListener('click', () => this.pedirDica())

    document.getElementById('share-whatsapp')?.addEventListener('click', () => this.compartilhar())
    document.getElementById('btn-result-menu')?.addEventListener('click', () => this.irMenu())
    document.getElementById('btn-result-path')?.addEventListener('click', () => {
      this.salvarRanking()
      if (this.state.modo === 'desafio_diario') {
        this.showScreen('start')
      } else {
        this.showScreen('trilha')
      }
    })
    document.getElementById('btn-result-ranking')?.addEventListener('click', () =>
      this.openRanking({ competicao: this.state.modo === 'competicao' })
    )

    document.getElementById('close-ranking')?.addEventListener('click', () => this.closeOverlay('ranking'))
    document.getElementById('btn-ranking-liberar')?.addEventListener('click', () => {
      void this.liberarRankingTorneioParticipantes()
    })
    document.getElementById('close-achievements')?.addEventListener('click', () => this.closeOverlay('achievements'))

    document.querySelectorAll('.ranking-tabs .tab').forEach((tab) => {
      tab.addEventListener('click', () => this.switchRankingTab(tab.dataset.tab))
    })

    document.getElementById('btn-competition-toggle')?.addEventListener('click', () => {
      const s = QuizCompetition.ler()
      if (!s.ativo) {
        QuizCompetition.gravar({ ativo: true, papelDefinido: false, organizador: false })
      } else {
        QuizCompetition.gravar({ ativo: false, organizador: false, papelDefinido: false })
      }
      this.renderTrilhaGrid()
    })
    document.getElementById('btn-competition-organize')?.addEventListener('click', () => {
      QuizCompetition.ativarComoOrganizador()
      this.renderTrilhaGrid()
    })
    document.getElementById('btn-competition-reset')?.addEventListener('click', () => {
      if (!confirm('Limpar toda a configuração desta competição?\nTimes, rodada e código serão apagados.')) return
      QuizCompetition.resetarCompletamente()
      this.renderTrilhaGrid()
    })
    document.getElementById('btn-competition-join')?.addEventListener('click', async () => {
      const input = document.getElementById('competition-join-code')
      const errEl = document.getElementById('competition-join-error')
      const codigo = (input?.value || '').trim()
      if (!codigo) { if (errEl) { errEl.textContent = 'Digite o código do torneio.'; errEl.classList.remove('hidden') } return }
      const btn = document.getElementById('btn-competition-join')
      if (btn) { btn.disabled = true; btn.textContent = 'Entrando…' }
      if (errEl) errEl.classList.add('hidden')
      try {
        const res = await QuizCompetition.entrarPorCodigo(codigo)
        if (res.ok) {
          this.renderTrilhaGrid()
          if (res.precisaEntrada) {
            this.showTeamPickerDialog(res.label || 'Torneio')
          }
        } else {
          if (errEl) { errEl.textContent = res.erro || 'Erro desconhecido.'; errEl.classList.remove('hidden') }
        }
      } catch (err) {
        if (errEl) { errEl.textContent = 'Erro de conexão. Verifique sua internet.'; errEl.classList.remove('hidden') }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Entrar' }
      }
    })
    document.getElementById('competition-tournament')?.addEventListener('change', (e) => {
      QuizCompetition.gravar({ torneioId: e.target.value })
      this.renderCompetitionPanel()
    })
    document.getElementById('competition-event-name')?.addEventListener('input', (e) => {
      QuizCompetition.gravar({ nomeEvento: e.target.value })
    })
    document.getElementById('competition-question-count')?.addEventListener('change', (e) => {
      QuizCompetition.gravar({ quantidadePerguntas: Number(e.target.value) || 20 })
      if (QuizCompetition.isOrganizador()) QuizCompetition.gerarRodadaAtual()
      this.renderCompetitionPanel()
    })
    document.querySelectorAll('input[name="comp-access"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (!e.target.checked) return
        QuizCompetition.gravar({
          modoAcesso: e.target.value === 'celular_equipe' ? 'celular_equipe' : 'individual',
        })
        this.renderCompetitionPanel()
      })
    })
    document.getElementById('btn-competition-start')?.addEventListener('click', () => {
      this.iniciarCompeticaoRodada()
    })
    document.getElementById('btn-competition-ranking')?.addEventListener('click', () => this.openRanking({ competicao: true }))
    document.getElementById('btn-competition-ranking-play')?.addEventListener('click', () => this.openRanking({ competicao: true }))
    document.getElementById('btn-competition-block-entries')?.addEventListener('click', async () => {
      const codigo = QuizCompetition.codigoTorneio()
      if (!codigo) return
      const meta = await QuizFirebaseRanking.lerTorneioMeta(codigo)
      const bloqueado = !meta.entradasBloqueadas
      const ok = await QuizFirebaseRanking.bloquearEntradas(codigo, bloqueado)
      if (ok) {
        const btn = document.getElementById('btn-competition-block-entries')
        if (btn) btn.textContent = bloqueado ? 'Desbloquear entradas' : 'Bloquear entradas'
      }
    })
    document.getElementById('btn-competition-add-team')?.addEventListener('click', () => {
      const input = document.getElementById('competition-team-input')
      if (QuizCompetition.adicionarTime(input?.value)) {
        if (input) input.value = ''
        this.renderCompetitionPanel()
      }
    })
    document.getElementById('competition-team-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-competition-add-team')?.click()
    })
    document.getElementById('btn-competition-share')?.addEventListener('click', async () => {
      if (QuizCompetition.isOrganizador()) QuizCompetition.gerarRodadaAtual()
      const texto = await QuizCompetition.compartilharTorneio()
      this.renderTrilhaGrid()
      if (window.BibliaQuiz) {
        try {
          await navigator.share({ title: 'Quiz Bíblico — Competição', text: texto })
          return
        } catch { /* cancelled or unsupported, fall through */ }
      }
      const msg = encodeURIComponent(texto)
      void window.BibliaQuiz.share({ title: 'Quiz Bíblico - Competição', text: texto }).catch(() => {});
    })
    document.getElementById('btn-competition-copy-link')?.addEventListener('click', async () => {
      if (QuizCompetition.isOrganizador()) QuizCompetition.gerarRodadaAtual()
      const texto = await QuizCompetition.compartilharTorneio()
      this.renderTrilhaGrid()
      try {
        await navigator.clipboard.writeText(texto)
        const btn = document.getElementById('btn-competition-copy-link')
        if (btn) {
          const old = btn.textContent
          btn.textContent = 'Copiado!'
          setTimeout(() => {
            btn.textContent = old
          }, 2000)
        }
      } catch {
        window.prompt('Copie a mensagem do torneio:', texto)
      }
    })

    document.getElementById('btn-info')?.addEventListener('click', () => this.showDialog('dialog-info'))
    document.getElementById('dialog-info-ok')?.addEventListener('click', () => this.hideDialog('dialog-info'))
    document.getElementById('dialog-tip-ok')?.addEventListener('click', () => this.hideDialog('dialog-tip'))
    document.getElementById('trilha-screen')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-tip[data-tip]')
      if (btn) this.showTip(btn.dataset.tip)
    })
    document.getElementById('dialog-leave-cancel')?.addEventListener('click', () => this.hideDialog('dialog-leave'))
    document.getElementById('dialog-leave-confirm')?.addEventListener('click', () => this.confirmarSaida())
    document.getElementById('dialog-leave-discard')?.addEventListener('click', () => this.descartarESair())
      document.getElementById('dialog-unlock-ok')?.addEventListener('click', () => this.hideDialog('dialog-unlock'))
      document.getElementById('dialog-medal-ok')?.addEventListener('click', () => this.hideMedalDialog())
      if (typeof QuizMedalhas !== 'undefined') QuizMedalhas.preload()

    window.addEventListener('quiz-progress-changed', () => this.refreshSavedBanner())
    window.addEventListener('popstate', () => {
      if (this.estaNoQuiz()) {
        history.pushState(null, '', location.href)
        this.pedirConfirmacaoSaida('start')
      }
    })
  }

  estaNoQuiz() {
    return Boolean(this.screens.quiz?.classList.contains('active') && this.state.perguntas?.length)
  }

  pedirConfirmacaoSaida(destino = 'start') {
    this._pendingLeaveScreen = destino
    this.atualizarDialogSaida()
    this.showDialog('dialog-leave')
  }

  atualizarDialogSaida() {
    const title = document.getElementById('dialog-leave-title')
    const msg = document.getElementById('dialog-leave-msg')
    const discardBtn = document.getElementById('dialog-leave-discard')
    const s = this.state
    if (s.modo === 'competicao') {
      const tor =
        typeof QuizCompetition !== 'undefined' ? QuizCompetition.labelTorneio() : 'Competição'
      const time = typeof QuizCompetition !== 'undefined' ? QuizCompetition.meuTime()?.nome : ''
      if (title) title.textContent = 'Sair da competição?'
      if (msg) {
        msg.textContent = `Rodada de ${tor}${time ? ` · ${time}` : ''} em andamento. Salve para continuar depois.`
      }
      discardBtn?.classList.add('hidden')
      return
    }
    discardBtn?.classList.add('hidden')
    if (title) title.textContent = 'Sair do quiz?'
    if (msg) {
      msg.textContent = 'O progresso fica salvo neste aparelho para continuar depois.'
    }
  }

  showScreen(name) {
    if (this.estaNoQuiz() && name !== 'quiz' && !this._saidaConfirmada) {
      this.pedirConfirmacaoSaida(name)
      return
    }
    this._saidaConfirmada = false
    Object.values(this.screens).forEach((el) => el?.classList.remove('active'))
    this.screens[name]?.classList.add('active')

    if (name === 'trilha') this.renderTrilhaGrid()
    if (name === 'subtrilha') this.renderSubTrilha()
    if (name === 'path') this.renderPathMap()
    if (name === 'daily') this.renderDaily()
    if (name === 'start') {
      this.refreshSavedBanner()
      this.refreshHomeMedalhas()
      this.renderCloudAuthPanel()
      this.refreshHomeCloudStatus()
    }
  }

  syncCategoriaFromTrilha() {
    const { trilhaId, trilhaSubId } = this.state
    this.state.categoriaId = trilhaSubId ? `${trilhaId}:${trilhaSubId}` : trilhaId
  }

  trilhaTitulo() {
    const { fase, trilhaId, trilhaSubId } = this.state
    const trilha = QuizTrilhas.trilhaLabel(trilhaId, trilhaSubId)
    return `${QuizConfig.labelFase(fase)} · ${trilha}`
  }

  faseDesbloqueada(id) {
    if (id <= 1) return true
    if (id === 2) return QuizStorage.fase2Desbloqueada()
    if (id === 3) return QuizStorage.fase3Desbloqueada()
    return QuizLevels.progressoDesbloqueio(id).pronto
  }

  numFases() {
    return QuizTrilhas?.numFases?.() || QuizConfig.numFases
  }

  labelPartidaSalva(saved) {
    if (saved.modo === 'competicao') {
      const tor = saved.competicaoLabel || (typeof QuizCompetition !== 'undefined' ? QuizCompetition.labelTorneio() : 'Competição')
      const time = saved.competicaoTime || (typeof QuizCompetition !== 'undefined' ? QuizCompetition.meuTime()?.nome : '')
      const total = saved.total || saved.ordem?.length || 0
      const timePart = time ? ` · ${time}` : ''
      return `🏆 Competição — ${tor}${timePart} · ${total} perg.`
    }
    if (saved.modo === 'desafio_diario') {
      const d = saved.dailyDate || QuizDaily.dateKey()
      return `Desafio Diário · ${QuizDaily.formatarDataBR(d)}`
    }
    const catId = saved.categoriaId || 'completo'
    const label =
      typeof QuizTrilhas !== 'undefined'
        ? QuizTrilhas.trilhaLabel(
            catId.includes(':') ? catId.split(':')[0] : catId,
            catId.includes(':') ? catId.split(':').slice(1).join(':') : null
          )
        : catId
    const fase = Number(saved.fase) || 1
    const nivel =
      saved.modo === 'trilha_linear'
        ? ''
        : saved.nivelIndex != null
          ? ` · Nível ${Number(saved.nivelIndex) + 1}`
          : ''
    return `${QuizConfig.labelFase(fase)} · ${label}${nivel}`
  }

  parseCategoriaId(categoriaId) {
    if (!categoriaId || categoriaId === 'todas') {
      return { trilhaId: 'completo', trilhaSubId: null }
    }
    if (!categoriaId.includes(':')) {
      return { trilhaId: categoriaId, trilhaSubId: null }
    }
    const [trilhaId, ...rest] = categoriaId.split(':')
    return { trilhaId, trilhaSubId: rest.join(':') }
  }

  refreshHomeMedalhas() {
  const el = document.getElementById('home-medalhas'); if (!el) return;
  el.textContent = QuizNivel.obterNivel().label + ' · ' + QuizAchievements.contarDesbloqueadas() + '/' + Object.keys(QuizAchievements.CATALOGO).length + ' conquistas';
}

  refreshSavedBanner() {
    const banner = document.getElementById('saved-game-banner')
    const saved = QuizStorage.carregarProgresso()
    if (!banner) return
    if (!saved) {
      banner.classList.add('hidden')
      return
    }

    const isComp = saved.modo === 'competicao'

    if (isComp && saved.competicaoUid) {
      const currentUser = typeof QuizFirebaseAuth !== 'undefined' ? QuizFirebaseAuth.getUser?.() : null
      if (!currentUser) {
        banner.classList.remove('hidden')
        banner.innerHTML = `
          <p>🏆 Competição em andamento — faça login com a conta original para continuar.</p>
          <div class="banner-actions">
            <button id="btn-discard" class="btn-danger small">Descartar</button>
          </div>`
        document.getElementById('btn-discard')?.addEventListener('click', () => {
          this._descartarCompeticaoComAviso(saved)
        })
        return
      }
      if (currentUser.uid !== saved.competicaoUid) {
        banner.classList.remove('hidden')
        banner.innerHTML = `
          <p>🏆 Há uma competição salva para outra conta. Faça login com a conta correta para acessar.</p>
          <div class="banner-actions">
            <button id="btn-discard" class="btn-danger small">Descartar</button>
          </div>`
        document.getElementById('btn-discard')?.addEventListener('click', () => {
          this._descartarCompeticaoComAviso(saved)
        })
        return
      }
    }

    banner.classList.remove('hidden')
    banner.innerHTML = `
      <p>${isComp ? '🏆 ' : ''}Partida em andamento — ${this.labelPartidaSalva(saved)}, pergunta ${saved.atual + 1} de ${saved.total}</p>
      <div class="banner-actions">
        <button id="btn-continue" class="btn-primary small">Continuar</button>
        <button id="btn-discard" class="${isComp ? 'btn-danger' : 'btn-secondary'} small">Descartar</button>
      </div>`
    document.getElementById('btn-continue')?.addEventListener('click', () => {
      if (isComp) {
        this._continuarCompeticaoComReentrada(saved)
      } else {
        this.continuarSalvo(saved)
      }
    })
    document.getElementById('btn-discard')?.addEventListener('click', () => {
      if (isComp) {
        this._descartarCompeticaoComAviso(saved)
      } else {
        this.descartarPartida(saved)
      }
    })
  }

  _temCompeticaoEmAndamento() {
    const saved = QuizStorage.carregarProgresso()
    return saved?.modo === 'competicao'
  }

  _descartarCompeticaoComAviso(saved) {
    const ok = confirm('Se o jogo for descartado você não jogará mais nesta competição.')
    if (!ok) return
    this.descartarPartida(saved)
  }

  _enviarProgressoCompeticao() {
    const s = this.state
    if (s.modo !== 'competicao') return
    const codigo = typeof QuizCompetition !== 'undefined' ? QuizCompetition.codigoTorneio() : null
    if (!codigo || !QuizFirebaseRanking?.isConfigured()) return

    const acertos = Array.isArray(s.respostas) ? s.respostas.filter((r) => r === true).length : 0
    const respondidas = Array.isArray(s.respostas) ? s.respostas.filter((r) => r !== null).length : 0
    const total = s.perguntas?.length || 0
    const meuTime = typeof QuizCompetition !== 'undefined' ? QuizCompetition.meuTime() : null

    void QuizFirebaseRanking.atualizarProgressoAoVivo(codigo, {
      teamId: meuTime?.id || '',
      teamName: meuTime?.nome || '',
      displayName: typeof QuizCompetition !== 'undefined' ? QuizCompetition.nomeParticipante() : '',
      respondidas,
      acertos,
      total,
      pontos: s.totalPontos || 0,
      concluido: respondidas >= total,
    })
  }

  _limparProgressoCompeticao() {
    const codigo = typeof QuizCompetition !== 'undefined' ? QuizCompetition.codigoTorneio() : null
    if (codigo && QuizFirebaseRanking?.isConfigured()) {
      void QuizFirebaseRanking.limparProgressoAoVivo(codigo)
    }
  }

  async _continuarCompeticaoComReentrada(saved) {
    const codigo = typeof QuizCompetition !== 'undefined' ? QuizCompetition.codigoTorneio() : null
    if (!codigo || !QuizFirebaseRanking?.isConfigured()) {
      this.continuarSalvo(saved)
      return
    }
    const meta = await QuizFirebaseRanking.lerTorneioMeta(codigo)
    if (!meta.entradasBloqueadas) {
      this.continuarSalvo(saved)
      return
    }
    const reentrada = await QuizFirebaseRanking.verificarReentrada(codigo)
    if (reentrada?.status === 'aprovado') {
      this.continuarSalvo(saved)
      return
    }
    if (reentrada?.status === 'pendente') {
      alert('Sua solicitação de reentrada já foi enviada. Aguarde o organizador aprovar.')
      return
    }
    const ok = await QuizFirebaseRanking.solicitarReentrada(codigo)
    if (ok) {
      alert('Solicitação de reentrada enviada ao organizador. Aguarde a aprovação para continuar.')
    } else {
      alert('Não foi possível solicitar reentrada. Verifique sua conexão.')
    }
  }

  descartarPartida(saved = null) {
    const prog = saved || QuizStorage.carregarProgresso()
    if (prog?.modo === 'competicao' && typeof QuizCompetition !== 'undefined') {
      QuizCompetition.desativarParaJogoNormal()
    }
    if (prog?.modo === 'trilha_linear' && typeof QuizTrilhaLinear !== 'undefined') {
      const fase = Number(prog.fase) || 1
      const cat = prog.categoriaId || 'completo'
      QuizTrilhaLinear.reiniciar(fase, cat)
    }
    this._bloquearPersistencia = true
    QuizStorage.limparProgresso()
    this.limparEstadoQuiz()
    this.state.modo = 'categoria'
    if (this.screens.quiz?.classList.contains('active')) {
      this.showScreen('start')
    }
    this._bloquearPersistencia = false
    this.refreshSavedBanner()
    this.renderScoringToggle()
    this.renderCompetitionPanel()
  }

  limparEstadoQuiz() {
    this.state.perguntas = []
    this.state.optionOrders = []
    this.state.respostas = []
    this.state.atual = 0
    this.state.escolha = null
    this.state.mostrarFeedback = false
    this.state.sequencia = 0
    this.state.totalPontos = 0
    this.state.pontosRodada = 0
    this.state.linearSessionStart = 0
  }

  garantirRespostasArray() {
    const s = this.state
    const n = s.perguntas?.length || 0
    if (!n) return
    if (!Array.isArray(s.respostas) || s.respostas.length < n) {
      const arr = new Array(n).fill(null)
      if (Array.isArray(s.respostas)) {
        for (let i = 0; i < s.respostas.length; i++) arr[i] = s.respostas[i]
      }
      s.respostas = arr
    }
  }

  continuarSalvo(saved) {
    const fase = Number(saved.fase) || 1
    if (saved.modo === 'competicao' && typeof QuizCompetition !== 'undefined') {
      QuizCompetition.gravar({ ativo: true })
    }
    if (saved.modo === 'desafio_diario') {
      const d = saved.dailyDate || QuizDaily.dateKey()
      if (QuizDaily.jaJogouHoje(d)) {
        QuizStorage.limparProgresso()
        this.refreshSavedBanner()
        alert('Você já completou o desafio diário de hoje. Volte amanhã!')
        return
      }
    }
    const perg =
      saved.modo === 'competicao'
        ? typeof QuizCompetitionQuestions !== 'undefined'
          ? QuizCompetitionQuestions.resolverPerguntas(saved.ordem)
          : []
        : saved.modo === 'desafio_diario'
          ? QuizDaily.resolveQuestions(saved.ordem, saved.dailyDate)
          : QuizStorage.perguntasFromOrdem(saved.ordem, fase)
    if (!perg.length) {
      QuizStorage.limparProgresso()
      this.refreshSavedBanner()
      return
    }
    const parsed = this.parseCategoriaId(saved.categoriaId || 'completo')
    const respostas = saved.respostas || []
    this.state = {
      ...this.state,
      modo: saved.modo || 'trilha_linear',
      fase,
      dailyDate: saved.dailyDate || null,
      trilhaId: parsed.trilhaId,
      trilhaSubId: parsed.trilhaSubId,
      categoriaId: saved.categoriaId || 'completo',
      nivelIndex: Number(saved.nivelIndex) || 0,
      perguntas: perg,
      optionOrders: saved.optionOrders || perg.map((q) => q.options.map((_, i) => i)),
      atual: saved.atual,
      escolha: saved.escolha,
      mostrarFeedback: saved.mostrarFeedback,
      sequencia: saved.sequencia,
      totalPontos: saved.totalPontos,
      respostas: respostas.length ? respostas : new Array(perg.length).fill(null),
      pontosRodada: saved.pontosRodada || 0,
      acertouUltima: saved.acertouUltima || false,
      hintUsed: false,
      linearSessionStart:
        saved.linearSessionStart != null ? saved.linearSessionStart : Number(saved.atual) || 0,
    }
    this.sincronizarPontosRodada()
    this.entrarQuiz()
  }

  renderDaily() {
    const today = QuizDaily.dateKey()
    const medal = QuizDaily.isCompletedToday(today)
    const played = QuizDaily.jaJogouHoje(today)
    const progress = QuizDaily.lerProgresso()
    const desc = document.getElementById('daily-desc')
    const stats = document.getElementById('daily-stats')
    const btn = document.getElementById('btn-daily-start')

    if (desc) {
      desc.textContent = played
        ? `Você já fez o desafio de ${QuizDaily.formatarDataBR(today)}. Uma tentativa por dia.`
        : `${QuizDaily.COUNT} perguntas para ${QuizDaily.formatarDataBR(today)} — prioriza perguntas que você ainda não respondeu.`
    }
    if (stats) {
      const hoje = progress.played?.[today]
      let statusMsg = '<p>Acerte todas para ganhar a medalha do dia.</p>'
      if (medal) {
        statusMsg = '<p class="daily-done">✅ Medalha do dia conquistada! Volte amanhã.</p>'
      } else if (played) {
        statusMsg = `<p class="daily-done">✅ Desafio de hoje concluído (${hoje?.acertos ?? '?'}/${hoje?.total ?? QuizDaily.COUNT}). Volte amanhã!</p>`
      }
      stats.innerHTML = `
        <p><strong>Medalhas:</strong> ${QuizDaily.contarMedalhas()} dia(s) perfeito(s)</p>
        <p><strong>Sequência:</strong> ${progress.streak || 0} dia(s) seguido(s)</p>
        ${statusMsg}
      `
    }
    if (btn) {
      btn.disabled = played
      btn.textContent = played ? 'Desafio de hoje concluído' : 'Começar desafio'
    }
  }

  renderScoringToggle() {
  const wrap = document.getElementById('scoring-toggle');
  if (wrap) { wrap.textContent = '10 pontos por acerto. Sem multiplicadores.'; wrap.classList.remove('hidden'); }
  const button = document.getElementById('btn-competition-toggle');
  if (button && typeof QuizCompetition !== 'undefined') { const on = QuizCompetition.ativo(); button.classList.toggle('active', on); button.setAttribute('aria-pressed', String(on)); }
}

  renderCompetitionPanel() {
    const panel = document.getElementById('competition-panel')
    const select = document.getElementById('competition-tournament')
    const qtdSelect = document.getElementById('competition-question-count')
    const roundSummary = document.getElementById('competition-round-summary')
    const desc = document.getElementById('competition-desc')
    const codeEl = document.getElementById('competition-code-display')
    const nameInput = document.getElementById('competition-event-name')
    const teamList = document.getElementById('competition-team-list')
    const myTeamEl = document.getElementById('competition-my-team')
    const orgActions = document.getElementById('competition-organizer-actions')
    const partHint = document.getElementById('competition-participant-hint')
    if (!panel || typeof QuizCompetition === 'undefined') return

    const roleChooser = document.getElementById('competition-role-chooser')
    const orgConfig = document.getElementById('competition-organizer-config')

    const s = QuizCompetition.ler()
    panel.classList.toggle('hidden', !s.ativo)

    const temPapel = Boolean(s.papelDefinido)

    if (roleChooser) roleChooser.classList.toggle('hidden', !s.ativo || temPapel)
    if (orgConfig) orgConfig.classList.toggle('hidden', !s.ativo || !s.organizador)

    if (s.ativo) QuizCompetition.garantirCodigo()
    const atual = QuizCompetition.ler()

    if (codeEl) codeEl.textContent = QuizCompetition.codigoTorneio() || '—'
    if (nameInput) nameInput.value = atual.nomeEvento || ''

    if (select && !select.options.length) {
      QuizCompetition.listarTorneios().forEach((t) => {
        const opt = document.createElement('option')
        opt.value = t.id
        opt.textContent = t.label
        select.appendChild(opt)
      })
    }
    if (select) {
      select.value = atual.torneioId || 'retiro_jovens'
      select.disabled = !s.organizador
    }
    if (nameInput) nameInput.disabled = !s.organizador

    if (qtdSelect && !qtdSelect.options.length) {
      QuizCompetition.opcoesQuantidade().forEach((n) => {
        const opt = document.createElement('option')
        opt.value = String(n)
        opt.textContent = `${n} perguntas`
        qtdSelect.appendChild(opt)
      })
    }
    if (qtdSelect) {
      qtdSelect.value = String(atual.quantidadePerguntas || 20)
      qtdSelect.disabled = !s.organizador
    }

    if (roundSummary) {
      const resumo = QuizCompetition.resumoRodada()
      roundSummary.textContent = resumo
        ? `Mix automático: ${resumo}`
        : 'A rodada será gerada ao enviar o link.'
    }

    document.querySelectorAll('input[name="comp-access"]').forEach((radio) => {
      radio.checked = radio.value === (atual.modoAcesso || 'individual')
      radio.disabled = !s.organizador
    })
    const accessField = panel.querySelector('.competition-access-mode')
    if (accessField) accessField.classList.toggle('hidden', !s.organizador)

    const tor = QuizCompetition.torneioAtual()
    if (desc) {
      if (s.organizador) {
        desc.textContent = `${tor?.desc || ''} Configure, adicione times e compartilhe o código com os participantes.`
      } else {
        desc.textContent = 'Você entrou em um torneio. Encaminhe o código para convidar outros.'
      }
    }
    if (orgActions) orgActions.classList.toggle('hidden', !s.organizador)
    if (partHint) partHint.classList.toggle('hidden', s.organizador)

    const teamAdd = panel.querySelector('.competition-team-add')
    const addBtn = document.getElementById('btn-competition-add-team')
    if (teamAdd) teamAdd.classList.toggle('hidden', !s.organizador)
    if (addBtn) addBtn.classList.toggle('hidden', !s.organizador)

    if (teamList) {
      const times = QuizCompetition.listarTimes()
      if (!times.length) {
        teamList.innerHTML = '<li class="competition-team-empty">Nenhum time ainda — adicione acima (organizador).</li>'
      } else {
        teamList.innerHTML = times
          .map(
            (t) => `<li class="competition-team-item">
              <span>${this.escapeHtml(t.nome)}</span>
              ${
                s.organizador
                  ? `<button type="button" class="btn-icon competition-team-remove" data-team-id="${t.id}" aria-label="Remover">✕</button>`
                  : ''
              }
            </li>`
          )
          .join('')
        teamList.querySelectorAll('.competition-team-remove').forEach((btn) => {
          btn.addEventListener('click', () => {
            QuizCompetition.removerTime(btn.dataset.teamId)
            this.renderCompetitionPanel()
          })
        })
      }
    }

    const meu = QuizCompetition.meuTime()
    if (myTeamEl) {
      if (meu) {
        const nome = QuizCompetition.nomeParticipante()
        myTeamEl.textContent = nome ? `Time: ${meu.nome} · ${nome}` : `Seu time: ${meu.nome}`
        myTeamEl.classList.remove('hidden')
      } else if (QuizCompetition.listarTimes().length) {
        myTeamEl.innerHTML = 'Ainda não escolheu time. <button type="button" id="btn-pick-team" class="btn-text">Escolher time</button>'
        myTeamEl.classList.remove('hidden')
        document.getElementById('btn-pick-team')?.addEventListener('click', () => {
          this.showTeamPickerDialog(QuizCompetition.labelTorneio())
        })
      } else {
        myTeamEl.classList.add('hidden')
      }
    }

    const participantesEl = document.getElementById('competition-participantes')
    const reentradasEl = document.getElementById('competition-reentradas')
    const jogadoresTimesEl = document.getElementById('competition-jogadores-times')
    const progressoVivoEl = document.getElementById('competition-progresso-vivo')
    const blockBtn = document.getElementById('btn-competition-block-entries')
    if (s.organizador && s.ativo && typeof QuizFirebaseRanking !== 'undefined' && QuizFirebaseRanking.isConfigured()) {
      const codigo = QuizCompetition.codigoTorneio()
      if (participantesEl) participantesEl.classList.remove('hidden')
      if (reentradasEl) reentradasEl.classList.remove('hidden')
      if (jogadoresTimesEl) jogadoresTimesEl.classList.remove('hidden')
      if (progressoVivoEl) progressoVivoEl.classList.remove('hidden')
      this._assinarParticipantesOrganizador(codigo)
      if (blockBtn) {
        QuizFirebaseRanking.lerTorneioMeta(codigo).then((meta) => {
          blockBtn.textContent = meta.entradasBloqueadas ? 'Desbloquear entradas' : 'Bloquear entradas'
        })
      }
    } else {
      if (participantesEl) participantesEl.classList.add('hidden')
      if (reentradasEl) reentradasEl.classList.add('hidden')
      if (jogadoresTimesEl) jogadoresTimesEl.classList.add('hidden')
      if (progressoVivoEl) progressoVivoEl.classList.add('hidden')
    }

    this.syncTrilhaCompetitionUi()
  }

  renderTrilhaColunas(fase, poolFase, locked) {
    return QuizTrilhas.COLUNAS.map((col) => {
      const btns = col.trilhas
        .map((t) => {
          const subPool = QuizTrilhas.filterTrilha(poolFase, t.id)
          const n = subPool.length
          const disabled = locked || n === 0
          let countLabel =
            t.modo === 'livros' || t.modo === 'grupos'
              ? `${n} perg. · escolher ${t.modo === 'livros' ? 'livro' : 'grupo'}`
              : `${n} perg.`
          if (!disabled && t.modo !== 'livros' && t.modo !== 'grupos' && typeof QuizTrilhaLinear !== 'undefined') {
            const r = QuizTrilhaLinear.resumo(fase, t.id, n)
            if (r.atual > 0 && !r.completed) countLabel = `${r.atual}/${n} perg.`
            else if (r.completed) {
              const medal = QuizLevels.medalhaDeEstrelas(r.bestStars || 0)
              const medalPart = medal.src
                ? ` · ${QuizMedalhas.imgHtml(medal, { size: 'xs' })} ${medal.label}`
                : ''
              countLabel = `${n} perg. · concluída${medalPart} · ↻ melhorar`
            }
          }
          return `<button type="button" class="trilha-btn ${disabled ? 'disabled' : ''}" data-fase="${fase}" data-trilha="${t.id}" ${disabled ? 'disabled' : ''}>
            ${t.label}
            <span class="trilha-btn-count">${disabled && locked ? '🔒 Bloqueada' : disabled ? 'Sem perguntas' : countLabel}</span>
          </button>`
        })
        .join('')
      return `<div class="trilha-col">
        <h3 class="trilha-col-title">${col.titulo}</h3>
        ${btns}
      </div>`
    }).join('')
  }

  syncTrilhaCompetitionUi() {
    const compOn = typeof QuizCompetition !== 'undefined' && QuizCompetition.ativo()
    const temPapel = compOn && Boolean(QuizCompetition.ler().papelDefinido)
    const playBlock = document.getElementById('competition-play-block')
    const playDesc = document.getElementById('competition-play-desc')
    const playSection = document.getElementById('trilha-play-section')
    const scoringSection = document.getElementById('trilha-scoring-section')
    const grid = document.getElementById('trilha-grid')

    if (scoringSection) scoringSection.classList.toggle('hidden', compOn)
    if (playSection) playSection.classList.toggle('hidden', compOn)
    if (grid) grid.classList.toggle('hidden', compOn)
    if (playBlock) {
      playBlock.classList.toggle('hidden', !temPapel)
      if (compOn && playDesc) {
        const qtd = QuizCompetition.ler().quantidadePerguntas || 20
        const resumo = QuizCompetition.resumoRodada()
        playDesc.textContent = `Rodada de ${qtd} perguntas com mix automático (AT, NT, Histórico e Teológicas).${resumo ? ` ${resumo}.` : ''}`
      }
    }

    const startBtn = document.getElementById('btn-competition-start')
    const hintEl = document.getElementById('competition-play-hint')
    const checklistEl = document.getElementById('competition-checklist')
    if (compOn && typeof QuizCompetition !== 'undefined') {
      const pode = QuizCompetition.podeIniciarRodada()
      if (startBtn) startBtn.disabled = !pode
      if (hintEl) {
        hintEl.textContent = pode ? '' : QuizCompetition.motivoNaoPodeIniciar()
      }
      if (checklistEl && QuizCompetition.isOrganizador()) {
        checklistEl.classList.remove('hidden')
        checklistEl.innerHTML = QuizCompetition.checklistTorneio()
          .map((item) => `<li class="${item.ok ? 'ok' : 'pending'}">${item.ok ? '✓' : '○'} ${item.label}</li>`)
          .join('')
      } else if (checklistEl) {
        checklistEl.classList.add('hidden')
        checklistEl.innerHTML = ''
      }
    } else {
      if (startBtn) startBtn.disabled = true
      if (hintEl) hintEl.textContent = ''
      if (checklistEl) {
        checklistEl.classList.add('hidden')
        checklistEl.innerHTML = ''
      }
    }
  }

  _assinarParticipantesOrganizador(codigo) {
    if (this._participantesCodigo === codigo) return
    this._participantesCodigo = codigo

    if (this._participantesUnsub) { this._participantesUnsub(); this._participantesUnsub = null }
    if (this._reentradasUnsub) { this._reentradasUnsub(); this._reentradasUnsub = null }
    if (this._jogadoresTimesUnsub) { this._jogadoresTimesUnsub(); this._jogadoresTimesUnsub = null }
    if (this._timesBloqueadosOrgUnsub) { this._timesBloqueadosOrgUnsub(); this._timesBloqueadosOrgUnsub = null }
    if (this._progressoVivoUnsub) { this._progressoVivoUnsub(); this._progressoVivoUnsub = null }

    this._participantesUnsub = QuizFirebaseRanking.subscribeParticipantes(codigo, (lista) => {
      const ul = document.getElementById('competition-participantes-list')
      if (!ul) return
      if (!lista.length) {
        ul.innerHTML = '<li>Nenhum participante ainda.</li>'
        return
      }
      ul.innerHTML = lista.map((p) =>
        `<li>
          <span>${this.escapeHtml(p.displayName || p.email || p.uid)}</span>
          <button type="button" class="btn-danger small btn-remove-participant" data-uid="${p.uid}">Remover</button>
        </li>`
      ).join('')
      ul.querySelectorAll('.btn-remove-participant').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm(`Remover ${btn.parentElement.querySelector('span')?.textContent}?`)) return
          await QuizFirebaseRanking.removerParticipante(codigo, btn.dataset.uid)
        })
      })
    })

    this._reentradasUnsub = QuizFirebaseRanking.subscribeReentradas(codigo, (lista) => {
      const container = document.getElementById('competition-reentradas')
      if (!container) return
      if (!lista.length) { container.innerHTML = ''; return }
      container.innerHTML = lista.map((r) =>
        `<div class="competition-reentrada-card">
          <span class="reentrada-info">${this.escapeHtml(r.displayName || r.email || r.uid)} quer reentrar</span>
          <span class="reentrada-actions">
            <button type="button" class="btn-primary small btn-reentrada-ok" data-uid="${r.uid}">Permitir</button>
            <button type="button" class="btn-danger small btn-reentrada-no" data-uid="${r.uid}">Negar</button>
          </span>
        </div>`
      ).join('')
      container.querySelectorAll('.btn-reentrada-ok').forEach((btn) => {
        btn.addEventListener('click', () => QuizFirebaseRanking.responderReentrada(codigo, btn.dataset.uid, true))
      })
      container.querySelectorAll('.btn-reentrada-no').forEach((btn) => {
        btn.addEventListener('click', () => QuizFirebaseRanking.responderReentrada(codigo, btn.dataset.uid, false))
      })
    })

    this._orgTimesBloqueados = {}
    this._orgJogadoresTimes = {}

    this._timesBloqueadosOrgUnsub = QuizFirebaseRanking.subscribeTimesBloqueados(codigo, (bloq) => {
      this._orgTimesBloqueados = bloq
      this._renderJogadoresPorTime(codigo)
    })

    this._jogadoresTimesUnsub = QuizFirebaseRanking.subscribeJogadores(codigo, (jogadores) => {
      this._orgJogadoresTimes = jogadores
      this._renderJogadoresPorTime(codigo)
    })

    this._progressoVivoUnsub = QuizFirebaseRanking.subscribeProgressoAoVivo(codigo, (lista) => {
      this._renderProgressoAoVivo(lista)
    })
  }

  _renderJogadoresPorTime(codigo) {
    const wrapper = document.getElementById('competition-jogadores-times')
    const content = document.getElementById('competition-jogadores-times-content')
    if (!wrapper || !content) return

    const times = typeof QuizCompetition !== 'undefined' ? QuizCompetition.listarTimes() : []
    if (!times.length) {
      wrapper.classList.add('hidden')
      return
    }
    wrapper.classList.remove('hidden')

    const jogadores = this._orgJogadoresTimes || {}
    const bloqueados = this._orgTimesBloqueados || {}

    content.innerHTML = times.map((t) => {
      const membros = jogadores[t.id] || []
      const bloq = Boolean(bloqueados[t.id])
      const btnBloqLabel = bloq ? 'Liberar entrada' : 'Bloquear entrada'
      const btnBloqClass = bloq ? 'btn-secondary' : 'btn-danger'

      const membrosHtml = membros.length
        ? `<ul class="jogadores-time-list">${membros.map((m) =>
            `<li>
              <span>${this.escapeHtml(m.nome || m.displayName || m.email || m.uid)}</span>
              <small class="jogador-email">${this.escapeHtml(m.email || '')}</small>
              <button type="button" class="btn-danger small btn-remove-jogador" data-team-id="${t.id}" data-uid="${m.uid}">✕</button>
            </li>`
          ).join('')}</ul>`
        : '<p class="jogadores-time-vazio">Nenhum jogador neste time.</p>'

      return `<div class="jogadores-time-card ${bloq ? 'bloqueado' : ''}">
        <div class="jogadores-time-header">
          <strong>${this.escapeHtml(t.nome)}</strong>
          <span class="jogadores-time-count">${membros.length} jogador${membros.length !== 1 ? 'es' : ''}</span>
          <button type="button" class="${btnBloqClass} small btn-toggle-time-block" data-team-id="${t.id}" data-blocked="${bloq ? '1' : '0'}">${btnBloqLabel}</button>
                </div>
        ${membrosHtml}
      </div>`
    }).join('')

    content.querySelectorAll('.btn-remove-jogador').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nome = btn.parentElement.querySelector('span')?.textContent || ''
        if (!confirm(`Remover ${nome} deste time?`)) return
        await QuizFirebaseRanking.removerJogadorDoTime(codigo, btn.dataset.teamId, btn.dataset.uid)
      })
    })

    content.querySelectorAll('.btn-toggle-time-block').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nowBlocked = btn.dataset.blocked === '1'
        await QuizFirebaseRanking.bloquearEntradaTime(codigo, btn.dataset.teamId, !nowBlocked)
      })
    })
  }

  _renderProgressoAoVivo(lista) {
    const wrapper = document.getElementById('competition-progresso-vivo')
    const content = document.getElementById('competition-progresso-vivo-content')
    if (!wrapper || !content) return

    if (!lista || !lista.length) {
      wrapper.classList.add('hidden')
      return
    }
    wrapper.classList.remove('hidden')

    content.innerHTML = lista.map((p) => {
      const pct = p.total > 0 ? Math.round((p.respondidas / p.total) * 100) : 0
      const label = p.teamName || p.displayName || p.uid || '?'
      const statusCls = p.concluido ? 'concluido' : 'em-andamento'
      const statusTxt = p.concluido
        ? `✅ Concluído — ${p.acertos}/${p.total} acertos, ${p.pontos || 0} pts`
        : `${p.respondidas}/${p.total} respondidas, ${p.acertos} acerto${p.acertos !== 1 ? 's' : ''}`
      return `<div class="progresso-vivo-item">
        <div class="progresso-vivo-header">
          <span class="progresso-vivo-nome">${this.escapeHtml(label)}</span>
          <span class="progresso-vivo-stats">${statusTxt}</span>
            </div>
        <div class="progresso-vivo-bar">
          <div class="progresso-vivo-bar-fill ${statusCls}" style="width:${pct}%"></div>
        </div>
      </div>`
    }).join('')
  }

  renderTrilhaGrid() {
    this.renderScoringToggle()
    this.renderCompetitionPanel()
    this.syncTrilhaCompetitionUi()

    const compOn = typeof QuizCompetition !== 'undefined' && QuizCompetition.ativo()
    const grid = document.getElementById('trilha-grid')
    if (compOn || !grid) return

    const total = this.numFases()
    grid.innerHTML = Array.from({ length: total }, (_, idx) => {
      const fase = idx + 1
      const locked = !this.faseDesbloqueada(fase)
      const poolFase = QuizTrilhas.poolForFase(fase)
      const lockHint = locked ? `<p class="trilha-fase-lock">${QuizLevels.textoRequisitoFase(fase)}</p>` : ''

      let requisiteHint = ''
      if (fase >= 2) {
        const prog = QuizLevels.progressoDesbloqueio(fase)
        if (locked) {
          requisiteHint = `<p class="trilha-fase-requisito">Necessário: ${prog.minPoints} pts na trilha Completo da Fase ${fase - 1}</p>`
        } else {
          requisiteHint = `<p class="trilha-fase-requisito desbloqueada">✓ Desbloqueada (${prog.points}/${prog.minPoints} pts na Fase ${fase - 1})</p>`
        }
      }

      let medalHint = ''
      if (!locked && typeof QuizTrilhaLinear !== 'undefined') {
        const r = QuizTrilhaLinear.resumo(fase, 'completo', poolFase.length)
        if (r.completed) {
          const medal = QuizLevels.medalhaDeEstrelas(r.bestStars || 0)
          medalHint = medal.src
            ? `<p class="trilha-fase-medal trilha-fase-medal-${medal.id}">${QuizMedalhas.imgHtml(medal, { size: 'sm' })} <span>${medal.label} · ${r.bestStars}/3 ★</span></p>`
            : `<p class="trilha-fase-medal trilha-fase-medal-none">Sem medalha ainda · ↻ repetir Completo</p>`
        }
      }

      return `<section class="trilha-fase-row ${locked ? 'is-locked' : ''}">
        <div class="trilha-fase-top">
          <span class="trilha-fase-num">${locked ? '🔒' : fase}</span>
          <button type="button" class="btn-tip" data-tip="trilhas" aria-label="Informações sobre trilhas">i</button>
        </div>
        <div class="trilha-fase-title">
          <span class="trilha-fase-name">${QuizConfig.labelFase(fase)}</span>
          ${medalHint}
          ${requisiteHint}
          ${lockHint}
        </div>
        <div class="trilha-grid trilha-grid-row">${this.renderTrilhaColunas(fase, poolFase, locked)}</div>
      </section>`
    }).join('')

    grid.querySelectorAll('.trilha-btn:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.fase = Number(btn.dataset.fase)
        this.state.trilhaId = btn.dataset.trilha
        this.state.trilhaSubId = null
        if (QuizTrilhas.precisaSubescolha(this.state.trilhaId)) {
          this.showScreen('subtrilha')
        } else {
          this.syncCategoriaFromTrilha()
          this.iniciarTrilhaLinear()
        }
      })
    })
  }

  renderSubTrilha() {
    const { fase, trilhaId } = this.state
    const meta = QuizTrilhas.findTrilha(trilhaId)
    const poolFase = QuizTrilhas.poolForFase(fase)
    const basePool = QuizTrilhas.filterTrilha(poolFase, trilhaId)

    const title = document.getElementById('sub-trilha-title')
    const desc = document.getElementById('sub-trilha-desc')
    if (title) {
      title.textContent =
        meta?.modo === 'livros'
          ? `Fase ${fase} · Escolha o livro`
          : `Fase ${fase} · Escolha o grupo`
    }
    if (desc) {
      desc.textContent =
        meta?.modo === 'livros'
          ? 'Cada livro tem progresso próprio nesta fase.'
          : 'Grupos de livros do testamento — progresso por grupo.'
    }

    const list = document.getElementById('sub-trilha-list')
    if (!list) return

    let items = []
    if (meta?.modo === 'grupos') {
      items = QuizTrilhas.gruposParaTrilha(trilhaId).map((g) => ({
        id: g.id,
        label: g.label,
        pool: QuizTrilhas.filterTrilha(poolFase, trilhaId, g.id),
      }))
    } else if (meta?.modo === 'livros') {
      items = QuizTrilhas.booksInPool(basePool).map((book) => ({
        id: book,
        label: book,
        pool: QuizTrilhas.filterTrilha(poolFase, trilhaId, book),
      }))
    }

    list.innerHTML = items
      .map((item) => {
        const n = item.pool.length
        const disabled = n === 0
        let countLabel = `${n} perg.`
        if (!disabled && typeof QuizTrilhaLinear !== 'undefined') {
          const catId = `${trilhaId}:${item.id}`
          const r = QuizTrilhaLinear.resumo(fase, catId, n)
          if (r.atual > 0 && !r.completed) countLabel = `${r.atual}/${n} perg.`
          else if (r.completed) {
            const medal = QuizLevels.medalhaDeEstrelas(r.bestStars || 0)
            const medalPart = medal.src
              ? ` · ${QuizMedalhas.imgHtml(medal, { size: 'xs' })}`
              : ''
            countLabel = `${n} perg. · concluída${medalPart} · ↻`
          }
        }
        return `<button type="button" class="category-card sub-trilha-card ${disabled ? 'disabled' : ''}" data-sub="${item.id}" ${disabled ? 'disabled' : ''}>
          <span class="cat-label">${item.label}</span>
          <span class="cat-count">${disabled ? 'Sem perguntas' : countLabel}</span>
        </button>`
      })
      .join('')

    list.querySelectorAll('.sub-trilha-card:not(.disabled)').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.trilhaSubId = btn.dataset.sub
        this.syncCategoriaFromTrilha()
        this.iniciarTrilhaLinear()
      })
    })
  }

  poolAtual() {
    const base = QuizTrilhas.poolForFase(this.state.fase)
    return QuizTrilhas.filterTrilha(base, this.state.trilhaId, this.state.trilhaSubId)
  }

  prepararOrdemFixa(perguntas) {
    const lista = [...perguntas]
    const optionOrders = lista.map((q) => {
      const opts =
        typeof QuizQuestionFormat !== 'undefined'
          ? QuizQuestionFormat.normalizeOptions(q)
          : q.options
      return QuizStorage.shuffle(opts.map((_, i) => i))
    })
    return { perguntas: lista, optionOrders }
  }

  iniciarCompeticaoRodada() {
    if (!QuizCompetition.podeIniciarRodada()) {
      alert(QuizCompetition.motivoNaoPodeIniciar())
      this.renderTrilhaGrid()
      return
    }
    if (!this.garantirTimeAntesDeJogar()) return

    const meuTime = QuizCompetition.meuTime()
    if (
      meuTime &&
      QuizCompetition.modoAcesso() === 'celular_equipe' &&
      QuizCompetition.timeJaJogouNesteAparelho(meuTime.id)
    ) {
      alert('Este time já respondeu neste celular.')
      return
    }

    const perguntas = QuizCompetition.resolverPerguntasRodada()
    if (!perguntas.length) {
      alert('Não foi possível gerar a rodada. Tente novamente.')
      return
    }

    QuizStorage.limparProgresso()
    this.refreshSavedBanner()

    const { perguntas: lista, optionOrders } = this.prepararOrdemFixa(perguntas)
    this.state = {
      ...this.state,
      modo: 'competicao',
      fase: 1,
      categoriaId: 'competicao',
      nivelIndex: 0,
      perguntas: lista,
      optionOrders,
      atual: 0,
      escolha: null,
      mostrarFeedback: false,
      sequencia: 0,
      totalPontos: 0,
      respostas: new Array(lista.length).fill(null),
      pontosRodada: 0,
      acertouUltima: false,
      hintUsed: false,
      quizInicioAt: Date.now(),
      respostaTempos: [],
      _timerPerguntaIdx: null,
    }
    this.entrarQuiz()
  }

  iniciarTrilhaLinear() {
    if (!this.garantirTimeAntesDeJogar()) return

    const pool = this.poolAtual()
    if (!pool.length) {
      alert('Sem perguntas nesta trilha.')
      return
    }

    const progresso = QuizTrilhaLinear.getProgress(this.state.fase, this.state.categoriaId)
    const querReplay = Boolean(progresso.completed && progresso.ordem?.length)
    if (querReplay) {
      const medal = QuizLevels.medalhaDeEstrelas(progresso.bestStars || 0)
      const medalTxt = medal.label !== 'Sem medalha' ? ` (melhor: ${medal.label})` : ''
      const ok = confirm(
        `Você já concluiu esta trilha${medalTxt}.\n\nRepetir para melhorar pontos?\nAs mesmas perguntas serão usadas, só mudam a ordem e as alternativas.`
      )
      if (!ok) return
    }

    const prep = QuizTrilhaLinear.preparar(this.state.fase, this.state.categoriaId, pool, {
      replay: querReplay,
    })
    if (!querReplay && (prep.esgotado || prep.completed)) {
      alert('Você já respondeu todas as perguntas desta trilha.')
      return
    }
    if (querReplay && (prep.esgotado || !prep.perguntas.length)) {
      alert('Não foi possível reiniciar esta trilha.')
      return
    }

    const saved = QuizStorage.carregarProgresso()
    if (
      !querReplay &&
      saved &&
      (saved.modo === 'trilha_linear' || saved.modo === 'categoria') &&
      Number(saved.fase) === this.state.fase &&
      saved.categoriaId === this.state.categoriaId
    ) {
      this.continuarSalvo(saved)
      return
    }

    QuizStorage.limparProgresso()
    this.refreshSavedBanner()

    const { perguntas, optionOrders } = this.prepararOrdemFixa(prep.perguntas)
    const idx = prep.currentIndex

    this.state = {
      ...this.state,
      modo: 'trilha_linear',
      nivelIndex: 0,
      perguntas,
      optionOrders,
      atual: idx,
      escolha: null,
      mostrarFeedback: false,
      sequencia: 0,
      totalPontos: 0,
      respostas: new Array(perguntas.length).fill(null),
      pontosRodada: 0,
      acertouUltima: false,
      hintUsed: false,
      linearSessionStart: idx,
      linearReplay: Boolean(querReplay),
    }

    this.entrarQuiz()
  }

  renderPathMap() {
    const pool = this.poolAtual()
    const fase = this.state.fase
    const catId = this.state.categoriaId
    const levelCount = QuizLevels.levelCount(pool)
    const summary = QuizLevels.pathSummary(fase, catId, pool)

    const title = document.getElementById('path-title')
    const desc = document.getElementById('path-desc')
    if (title) {
      title.textContent = this.trilhaTitulo()
    }
    if (desc) {
      const replayHint =
        summary.completed > 0 ? ' · Cada nível pode ser repetido 1 vez para melhorar estrelas' : ''
      desc.textContent = `${summary.completed}/${summary.levels} níveis · ${summary.stars} estrelas · ${pool.length} perguntas${replayHint}`
    }

    const map = document.getElementById('path-map')
    if (!map) return

    if (!levelCount) {
      map.innerHTML = '<p class="screen-desc">Nenhuma pergunta nesta categoria.</p>'
      return
    }

    let html = `<div class="path-summary-bar">
      <span>⭐ ${summary.stars} estrelas</span>
      <span>✅ ${summary.completed}/${summary.levels} níveis</span>
      <span>até ${QuizLevels.PER_LEVEL} perg./nível</span>
    </div>`

    for (let i = 0; i < levelCount; i++) {
      if (i > 0) {
        const prevDone = QuizLevels.getLevel(fase, catId, i - 1)?.completed
        html += `<div class="path-connector ${prevDone ? '' : 'locked-line'}"></div>`
      }
      const side = i % 2 === 0 ? 'left' : 'right'
      const unlocked = QuizLevels.nivelDesbloqueado(fase, catId, i)
      const saved = QuizLevels.getLevel(fase, catId, i)
      const done = saved?.completed
      const stars = saved?.stars || 0
      const canImprove = QuizLevels.podeRepetirNivel(fase, catId, i)
      const replayUsed = done && !canImprove && stars < 3
      const isCurrent = unlocked && !done
      const levelQs = QuizLevels.questionsForLevel(pool, i)
      const qCount = levelQs.length
      const ineditasNivel =
        typeof QuizQuestionSwap !== 'undefined' && !done
          ? QuizQuestionSwap.selecionarParaNivel(pool, i, { isReplay: false }).perguntas.length
          : qCount
      const levelName = QuizCategories.nomeNivel(fase, catId, i, pool)

      let circleContent = String(i + 1)
      if (!unlocked) circleContent = '🔒'

      let label = `${qCount} perg.`
      if (!done && ineditasNivel === 0 && typeof QuizHistory !== 'undefined') {
        label = 'Já respondidas'
      } else if (!done && ineditasNivel < qCount) {
        label = `${ineditasNivel} inéditas`
      } else if (canImprove) {
        const plays = QuizLevels.playCount(saved)
        label = plays >= QuizLevels.MAX_PLAYS ? '↻ Melhorar pontos' : '↻ Melhorar (1×)'
      } else if (replayUsed) label = 'Repetição usada'

      const podeEntrar = unlocked && (canImprove || (!done && ineditasNivel > 0))

      html += `<div class="path-row ${side}">
        <button type="button" class="path-node ${done ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${canImprove ? 'replayable' : ''} ${replayUsed ? 'replay-used' : ''} ${!unlocked ? 'locked' : ''}"
          data-level="${i}" ${!podeEntrar ? 'disabled' : ''}>
          <div class="path-node-circle">${circleContent}</div>
          <div class="path-node-title">${levelName}</div>
          <div class="path-node-stars">${done ? QuizLevels.starsHtml(stars) : unlocked ? '···' : ''}</div>
          <div class="path-node-label">${label}</div>
        </button>
      </div>`
    }

    map.innerHTML = html
    map.querySelectorAll('.path-node:not(.locked):not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => this.iniciarNivel(Number(btn.dataset.level)))
    })
  }

  iniciarNivel(nivelIndex) {
    const pool = this.poolAtual()
    const perguntasPadrao = QuizLevels.questionsForLevel(pool, nivelIndex)
    if (!perguntasPadrao.length) {
      alert('Nível sem perguntas.')
      return
    }
    if (!QuizLevels.nivelDesbloqueado(this.state.fase, this.state.categoriaId, nivelIndex)) {
      alert('Complete o nível anterior para desbloquear este.')
      return
    }
    const saved = QuizLevels.getLevel(this.state.fase, this.state.categoriaId, nivelIndex)
    if (saved?.completed && !QuizLevels.podeRepetirNivel(this.state.fase, this.state.categoriaId, nivelIndex)) {
      alert('Este nível já foi repetido. Avance para o próximo nível.')
      return
    }

    const isReplay = Boolean(saved?.completed)
    const selecao =
      typeof QuizQuestionSwap !== 'undefined'
        ? QuizQuestionSwap.selecionarParaNivel(pool, nivelIndex, {
            isReplay,
            perguntasFixas: perguntasPadrao,
          })
        : { perguntas: perguntasPadrao, esgotado: false }

    if (selecao.esgotado || !selecao.perguntas.length) {
      alert(
        'Você já respondeu todas as perguntas inéditas desta trilha. Escolha outra trilha ou avance de fase.'
      )
      return
    }

    QuizStorage.limparProgresso()
    this.refreshSavedBanner()

    const { perguntas, optionOrders } = this.prepararRodada(selecao.perguntas)

    this.state = {
      ...this.state,
      modo: 'categoria',
      nivelIndex,
      perguntas,
      optionOrders,
      atual: 0,
      escolha: null,
      mostrarFeedback: false,
      sequencia: 0,
      totalPontos: 0,
      respostas: [],
      pontosRodada: 0,
      acertouUltima: false,
      hintUsed: false,
    }

    this.entrarQuiz()
  }

  /** @deprecated use iniciarNivel via mapa */
  iniciarCategoria(categoriaId) {
    if (!categoriaId) return
    this.state.categoriaId = categoriaId
    this.showScreen('path')
  }

  prepararRodada(perguntas) {
    const lista = QuizStorage.shuffle([...perguntas])
    const optionOrders = lista.map((q) => {
      const opts =
        typeof QuizQuestionFormat !== 'undefined'
          ? QuizQuestionFormat.normalizeOptions(q)
          : q.options
      return QuizStorage.shuffle(opts.map((_, i) => i))
    })
    return { perguntas: lista, optionOrders }
  }

  iniciarDesafioDiario() {
    const dailyDate = QuizDaily.dateKey()
    if (!QuizDaily.podeJogarHoje(dailyDate)) {
      alert('Você já completou o desafio diário de hoje. Volte amanhã!')
      this.renderDaily()
      return
    }

    QuizStorage.limparProgresso()
    this.refreshSavedBanner()

    const pool = QuizDaily.getPool()
    let perguntas = QuizDaily.getTodayQuestions(dailyDate)
    if (typeof QuizQuestionSwap !== 'undefined') {
      perguntas = QuizQuestionSwap.substituirIneditas(perguntas, pool)
    }
    if (!perguntas.length) {
      alert('Não há perguntas suficientes para o desafio diário.')
      return
    }

    const optionOrders = perguntas.map((q) => {
      const opts =
        typeof QuizQuestionFormat !== 'undefined'
          ? QuizQuestionFormat.normalizeOptions(q)
          : q.options
      return QuizStorage.shuffle(opts.map((_, i) => i))
    })

    this.state = {
      ...this.state,
      modo: 'desafio_diario',
      dailyDate,
      fase: 1,
      categoriaId: 'desafio_diario',
      perguntas,
      optionOrders,
      atual: 0,
      escolha: null,
      mostrarFeedback: false,
      sequencia: 0,
      totalPontos: 0,
      respostas: [],
      pontosRodada: 0,
      acertouUltima: false,
      hintUsed: false,
    }

    this.entrarQuiz()
  }

  tituloPartida() {
    const s = this.state
    if (s.modo === 'competicao' && typeof QuizCompetition !== 'undefined') {
      const time = QuizCompetition.meuTime()?.nome
      const qtd = QuizCompetition.ler().quantidadePerguntas || s.perguntas?.length || 0
      return `${QuizCompetition.labelTorneio()} · Rodada ${qtd} perg.${time ? ` · ${time}` : ''}`
    }
    if (s.modo === 'desafio_diario') {
      return `Desafio Diário · ${QuizDaily.formatarDataBR(s.dailyDate || QuizDaily.dateKey())}`
    }
    if (s.modo === 'trilha_linear') {
      return this.trilhaTitulo()
    }
    const pool = this.poolAtual()
    const nivelNome = QuizCategories.nomeNivel(s.fase, s.categoriaId, Number(s.nivelIndex) || 0, pool)
    const nivel =
      s.categoriaId === 'completo' || s.categoriaId === 'todas'
        ? ` · ${nivelNome}`
        : ` · Nível ${(Number(s.nivelIndex) || 0) + 1}`
    return `${this.trilhaTitulo()}${nivel}`
  }

  quizTitulo() {
    return this.tituloPartida()
  }

  renderFeedbackConteudo(q) {
    const explicacao = q.explanation || ''
    const versiculo = q.biblicalText || ''
    const textoCompleto = q.biblicalTextFull || ''
    const expBlock = document.getElementById('explanation-block')
    const verseBlock = document.getElementById('verse-block')
    const expText = document.getElementById('explanation-text')
    const verseText = document.getElementById('biblical-text')
    const btnExpand = document.getElementById('btn-expand-verse')
    const fullBlock = document.getElementById('verse-full-block')
    const fullText = document.getElementById('biblical-text-full')

    document.getElementById('reference-text').textContent = q.reference || ''

    if (btnExpand) btnExpand.classList.add('hidden')
    if (fullBlock) fullBlock.classList.add('hidden')

    if (explicacao) {
      expBlock?.classList.remove('hidden')
      if (expText) expText.textContent = explicacao
      if (verseBlock) verseBlock.classList.toggle('hidden', !versiculo)
      if (verseText) verseText.textContent = versiculo
    } else if (versiculo) {
      expBlock?.classList.add('hidden')
      verseBlock?.classList.remove('hidden')
      if (verseText) verseText.textContent = versiculo
        } else {
      expBlock?.classList.add('hidden')
      verseBlock?.classList.add('hidden')
    }

    if (textoCompleto && btnExpand && fullBlock && fullText) {
      btnExpand.classList.remove('hidden')
      fullText.textContent = textoCompleto
      btnExpand.onclick = () => {
        const aberto = !fullBlock.classList.contains('hidden')
        fullBlock.classList.toggle('hidden')
        btnExpand.textContent = aberto ? 'Ver texto completo ▼' : 'Recolher ▲'
      }
    }
  }

  entrarQuiz() {
    history.pushState({ quiz: true }, '', location.href)
    this.showScreen('quiz')
    if (this.state.modo === 'competicao') {
      document.getElementById('btn-hint')?.classList.add('hidden')
    } else {
      document.getElementById('btn-hint')?.classList.remove('hidden')
    }
    this.renderQuiz()
  }

  

  persistir() {
    const s = this.state
    if (this._bloquearPersistencia || !s.perguntas.length) return
    const payload = {
      modo: s.modo,
      fase: s.fase,
      categoriaId: s.categoriaId,
      nivelIndex: s.nivelIndex,
      dailyDate: s.dailyDate,
      difficultyFilter: s.difficultyFilter,
      ordem: s.perguntas.map((q) => QuizQuestionId.id(q)),
      optionOrders: s.optionOrders,
      atual: s.atual,
      escolha: s.escolha,
      mostrarFeedback: s.mostrarFeedback,
      sequencia: s.sequencia,
      totalPontos: s.totalPontos,
      respostas: s.perguntas.map((_, i) => {
        const r = s.respostas[i]
        return r === true ? true : r === false ? false : null
      }),
      pontosRodada: s.pontosRodada,
      acertouUltima: s.acertouUltima,
      linearSessionStart: s.linearSessionStart ?? s.atual,
    }
    if (s.modo === 'competicao' && typeof QuizCompetition !== 'undefined') {
      payload.competicaoLabel = QuizCompetition.labelTorneio()
      payload.competicaoTime = QuizCompetition.meuTime()?.nome || ''
      payload.competicaoCodigo = QuizCompetition.codigoTorneio()
      const u = typeof QuizFirebaseAuth !== 'undefined' ? QuizFirebaseAuth.getUser?.() : null
      if (u?.uid) payload.competicaoUid = u.uid
    }
    QuizStorage.salvarProgresso(payload)
    if (s.modo === 'trilha_linear' && typeof QuizTrilhaLinear !== 'undefined') {
      QuizTrilhaLinear.setIndex(s.fase, s.categoriaId, s.atual)
    }
  }

  scrollParaExplicacao() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const alvo =
          document.getElementById('biblical-reference') ||
          document.getElementById('feedback') ||
          document.getElementById('next-btn')
        alvo?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    })
  }

  renderQuiz() {
    const s = this.state
    const total = s.perguntas.length
    const q = s.perguntas[s.atual]
    if (!q) return

    if (!s.mostrarFeedback && s._timerPerguntaIdx !== s.atual) {
      s.perguntaInicioAt = Date.now()
      s._timerPerguntaIdx = s.atual
    }

    document.getElementById('quiz-progress-label').textContent =
      `${this.quizTitulo()} · ${s.atual + 1} / ${total}`
    const modoPontuacao =
      typeof QuizPontuacao !== 'undefined' ? QuizPontuacao.lerModo() : 'sequencia'
    const pontosEl = document.getElementById('quiz-points-label')
    const seqEl = document.getElementById('quiz-streak-label')
    if (pontosEl) pontosEl.textContent = `Pontos: ${s.totalPontos}`
    if (seqEl) {
      if (modoPontuacao === 'sequencia') {
        seqEl.textContent = `Sequência: ${s.sequencia || 0}`
        seqEl.classList.remove('hidden')
        } else {
        seqEl.classList.add('hidden')
      }
    }
    document.getElementById('progress').style.width = `${((s.atual + (s.mostrarFeedback ? 1 : 0)) / total) * 100}%`

    document.getElementById('question-text').textContent = q.question

    const isVF = typeof QuizQuestionFormat !== 'undefined' && QuizQuestionFormat.isVerdadeiroFalso(q)
    const typeLabel = document.getElementById('question-type-label')
    if (typeLabel) {
      if (typeof QuizQuestionFormat !== 'undefined') {
        typeLabel.textContent = QuizQuestionFormat.labelTipo(q)
        typeLabel.classList.remove('hidden')
        } else {
        typeLabel.classList.add('hidden')
      }
    }

    const qOpts =
      typeof QuizQuestionFormat !== 'undefined' ? QuizQuestionFormat.normalizeOptions(q) : q.options

    const order = s.optionOrders?.[s.atual] || qOpts.map((_, i) => i)
    const displayCorrect = order.indexOf(q.correctAnswer)

    const opts = document.getElementById('options-container')
    opts.className = isVF ? 'options-container vf-options' : 'options-container'
    opts.innerHTML = ''
    order.forEach((origIdx, displayIdx) => {
      const op = qOpts[origIdx]
      const btn = document.createElement('button')
      btn.className = 'option'
      btn.textContent = op
      btn.disabled = s.mostrarFeedback
      if (s.mostrarFeedback) {
        if (displayIdx === displayCorrect) btn.classList.add('correct')
        else if (displayIdx === s.escolha) btn.classList.add('wrong')
      } else if (displayIdx === s.escolha) {
        btn.classList.add('selected')
      }
      btn.addEventListener('click', () => {
        if (s.mostrarFeedback) return
        s.escolha = displayIdx
        opts.querySelectorAll('.option').forEach((b) => b.classList.remove('selected'))
        btn.classList.add('selected')
        document.getElementById('confirm-btn').disabled = false
      })
      opts.appendChild(btn)
    })

    const feedback = document.getElementById('feedback')
    const confirm = document.getElementById('confirm-btn')
    if (s.mostrarFeedback) {
      feedback.classList.remove('hidden')
      confirm.classList.add('hidden')
      document.getElementById('feedback-text').textContent = s.acertouUltima
        ? `Correto! +${s.pontosRodada} ponto(s)${modoPontuacao === 'sequencia' && s.sequencia ? ` · sequência: ${s.sequencia}` : ''}`
        : isVF || modoPontuacao === 'fixo10'
          ? 'Incorreto'
          : 'Incorreto — sequência zerada'
      this.renderFeedbackConteudo(q)
      document.getElementById('next-btn').textContent =
        s.atual + 1 >= total ? 'Ver resultado' : 'Próxima pergunta'
            } else {
      feedback.classList.add('hidden')
      confirm.classList.remove('hidden')
      confirm.disabled = s.escolha === null
    }

    this.renderQuestionChips()
    this.persistir()

    if (s.mostrarFeedback && this._scrollFeedback) {
      this._scrollFeedback = false
      this.scrollParaExplicacao()
    }
  }

  renderQuestionChips() {
    const container = document.getElementById('question-numbers')
    const s = this.state
    if (!container) return
    if (s.modo === 'trilha_linear' && s.perguntas.length > 24) {
      container.innerHTML = ''
      container.classList.add('hidden')
      return
    }
    container.classList.remove('hidden')
    container.innerHTML = s.perguntas
      .map((_, i) => {
        let cls = 'chip'
        if (i === s.atual && !s.mostrarFeedback) cls += ' current'
        else if (s.respostas[i] === true) cls += ' ok'
        else if (s.respostas[i] === false) cls += ' fail'
        const label = s.respostas[i] === true ? '✓' : s.respostas[i] === false ? '✕' : i + 1
        return `<span class="${cls}">${label}</span>`
      })
      .join('')
  }

  confirmar() {
    const s = this.state
    const q = s.perguntas[s.atual]
    if (s.escolha === null || !q) return

    const qOpts =
      typeof QuizQuestionFormat !== 'undefined' ? QuizQuestionFormat.normalizeOptions(q) : q.options
    const order = s.optionOrders?.[s.atual] || qOpts.map((_, i) => i)
    const displayCorrect = order.indexOf(q.correctAnswer)
    const ok = s.escolha === displayCorrect
    s.acertouUltima = ok

    if (!s.respostaTempos) s.respostaTempos = []
    const tempoMs = s.perguntaInicioAt ? Math.max(0, Date.now() - s.perguntaInicioAt) : 0
    s.respostaTempos[s.atual] = {
      perguntaId: typeof QuizQuestionId !== 'undefined' ? QuizQuestionId.id(q) : String(s.atual),
      acerto: ok,
      tempoMs,
    }

    if (typeof QuizHistory !== 'undefined') {
      QuizHistory.registrar(
        [q],
        QuizHistory.contextoPartida({
          modo: s.modo,
          fase: s.fase,
          categoriaId: s.categoriaId,
          nivelIndex: s.nivelIndex,
          dailyDate: s.dailyDate,
        })
      )
    }

    if (ok) {
      this.garantirRespostasArray()
      const ptsAntes = this.pontosBaseRodada()
      s.respostas[s.atual] = true
      const ptsDepois = this.pontosBaseRodada()
      s.pontosRodada = ptsDepois - ptsAntes
      this.sincronizarPontosRodada()
      s.mostrarFeedback = true
      this._scrollFeedback = true
      QuizIncentivos.celebrarAcerto()
      this._enviarProgressoCompeticao()
      this.renderQuiz()
      return
    }

    s.pontosRodada = 0
    this.garantirRespostasArray()
    s.respostas[s.atual] = false
    this.sincronizarPontosRodada()
    s.mostrarFeedback = true
    this._scrollFeedback = true
    this._enviarProgressoCompeticao()
    this.renderQuiz()
  }

  async proxima() {
    const s = this.state
    const respondidas = QuizStorage.contarRespondidas(s.respostas)


    if (s.atual + 1 >= s.perguntas.length) {
      this.finalizar()
      return
    }

    if (s.modo === 'trilha_linear' && typeof QuizTrilhaLinear !== 'undefined') {
      QuizTrilhaLinear.setIndex(s.fase, s.categoriaId, s.atual + 1)
    }

    s.atual += 1
    s.escolha = null
    s.mostrarFeedback = false
    s.hintUsed = false
    if (s.modo !== 'competicao') {
      document.getElementById('btn-hint')?.classList.remove('hidden')
    }
    this.renderQuiz()
  }

  async pedirDica() {
    if (this.state.mostrarFeedback || this.state.hintUsed) return

    const q = this.state.perguntas[this.state.atual]
    const qOpts =
      typeof QuizQuestionFormat !== 'undefined' ? QuizQuestionFormat.normalizeOptions(q) : q.options
    const order = this.state.optionOrders?.[this.state.atual] || qOpts.map((_, i) => i)
    const maxHide = typeof QuizQuestionFormat !== 'undefined' && QuizQuestionFormat.isVerdadeiroFalso(q) ? 1 : 2
    const wrongDisplay = order
      .map((origIdx, displayIdx) => (origIdx !== q.correctAnswer ? displayIdx : null))
      .filter((i) => i !== null)
    const toHide = QuizStorage.shuffle(wrongDisplay).slice(0, maxHide)
    document.querySelectorAll('#options-container .option').forEach((btn, idx) => {
      if (toHide.includes(idx)) {
        btn.disabled = true
        btn.classList.add('hint-hidden')
      }
    })
    this.state.hintUsed = true
    document.getElementById('btn-hint')?.classList.add('hidden')
  }

  pontosBaseRodada() {
    const s = this.state
    this.garantirRespostasArray()
    if (typeof QuizPontuacao === 'undefined') return 0
    return QuizPontuacao.calcularPontosRodada(s.respostas, undefined, s.perguntas.length)
  }

  sincronizarPontosRodada() {
    const s = this.state
    const calculado = this.pontosBaseRodada()
    s.totalPontos = calculado
    if (typeof QuizPontuacao !== 'undefined') {
      s.sequencia = QuizPontuacao.calcularSequenciaAtual(
        s.respostas,
        undefined,
        s.perguntas.length
      )
    }
    return calculado
  }

  finalizar() {
    this._saidaConfirmada = true
    QuizStorage.limparProgresso()
    this.refreshSavedBanner()

    const s = this.state
    const startIdx = s.modo === 'trilha_linear' ? Number(s.linearSessionStart) || 0 : 0
    const slice = s.modo === 'trilha_linear' ? s.respostas.slice(startIdx, s.atual + 1) : s.respostas
    const total = s.modo === 'trilha_linear' ? slice.length : s.perguntas.length
    this.sincronizarPontosRodada()
    const acertos = slice.filter((r) => r === true).length
    const perfeito = acertos === total
    const stars =
      s.modo === 'desafio_diario'
        ? 0
        : QuizLevels.calcStars(acertos, total)

    if (s.modo === 'trilha_linear' && typeof QuizTrilhaLinear !== 'undefined') {
      QuizTrilhaLinear.setIndex(s.fase, s.categoriaId, s.perguntas.length)
      QuizTrilhaLinear.marcarConcluido(s.fase, s.categoriaId, {
        points: s.totalPontos,
        acertos,
        total: s.perguntas.length,
        stars,
      })
    } else if (s.modo !== 'desafio_diario') {
      QuizLevels.gravarResultadoNivel(s.fase, s.categoriaId, s.nivelIndex, {
        stars,
        points: s.totalPontos,
        acertos,
        total,
      })
    }

    if (
      s.modo !== 'desafio_diario' &&
      (s.categoriaId === 'completo' || s.categoriaId === 'todas') &&
      (s.modo === 'trilha_linear' || s.modo === 'categoria')
    ) {
      const prog =
        s.fase === 1
          ? QuizLevels.progressoDesbloqueio(2)
          : s.fase === 2
            ? QuizLevels.progressoDesbloqueio(3)
            : null

      if (s.fase === 1 && prog?.pronto) {
        const wasUnlocked = localStorage.getItem(QuizConfig.STORAGE.UNLOCK_PHASE2) === '1'
        QuizStorage.gravarMelhorFase1(acertos, prog.points)
        QuizStorage.desbloquearFase2()
        if (!wasUnlocked) {
          this.showUnlockDialog('Fase 2 desbloqueada! Novas perguntas intermediárias aguardam você.')
        }
      }

      if (s.fase === 2 && prog?.pronto) {
        const wasUnlocked = localStorage.getItem(QuizConfig.STORAGE.UNLOCK_PHASE3) === '1'
        QuizStorage.gravarMelhorFase2(acertos, prog.points)
        QuizStorage.desbloquearFase3()
        if (!wasUnlocked) {
          this.showUnlockDialog('Fase 3 desbloqueada! Perguntas avançadas aguardam você.')
        }
      }
    }

    if (s.modo === 'desafio_diario') {
      QuizDaily.marcarJogado(s.dailyDate || QuizDaily.dateKey(), {
        acertos,
        total,
        perfect: perfeito,
      })
    }

    if (typeof QuizHistory !== 'undefined') {
      QuizHistory.registrar(
        s.perguntas,
        QuizHistory.contextoPartida({
          modo: s.modo,
          fase: s.fase,
          categoriaId: s.categoriaId,
          nivelIndex: s.nivelIndex,
          dailyDate: s.dailyDate,
        })
      )
    }

    const stats = QuizStorage.atualizarStats({
      acertos,
      categoriaId: s.categoriaId,
      perfeito,
    })

    const medalhas = QuizAchievements.processarResultado({
      total,
      acertos,
      fase: s.fase,
      categoriaId: s.categoriaId,
      modo: s.modo,
      stats,
      perguntas: s.perguntas,
      dailyPerfect: s.modo === 'desafio_diario' && perfeito,
    })

    const nomeInput = document.getElementById('player-name')
    if (s.modo === 'competicao' && typeof QuizCompetition !== 'undefined') {
      nomeInput.value = QuizCompetition.nomeParticipante() || QuizStorage.lerNomeJogador()
    } else {
      const user = QuizFirebaseAuth.getUser?.()
      const nomeConta = user && QuizFirebaseAuth.podePublicarRanking() ? QuizFirebaseAuth.displayName(user) : ''
      nomeInput.value = nomeConta || QuizStorage.lerNomeJogador()
    }

    document.getElementById('result-summary').innerHTML = `
      ${
        s.modo === 'competicao'
          ? `<p class="result-stars-label">Rodada de competição concluída!</p>`
          : s.modo === 'desafio_diario'
            ? ''
            : (() => {
                const medal = QuizLevels.medalhaDeEstrelas(stars)
                const medalImg = medal.src
                  ? `<div class="result-medal-showcase">${QuizMedalhas.imgHtml(medal, { size: 'lg', className: 'quiz-medal-pop' })}</div>`
                  : ''
                const medalLine = medal.src
                  ? `<p class="result-medal result-medal-${medal.id}">Medalha ${medal.label}</p>`
                  : `<p class="result-medal result-medal-none">Sem medalha — continue praticando</p>`
                const label =
                  stars === 3
                    ? 'Excelente! 100% de acertos'
                    : stars === 2
                      ? 'Muito bom!'
                      : stars === 1
                        ? 'Bom começo — você pode melhorar'
                        : 'Trilha concluída — pratique para conquistar a medalha'
                const replayHint =
                  s.modo === 'trilha_linear'
                    ? ' · toque na trilha novamente para repetir (mesmas perguntas, nova ordem)'
                    : QuizLevels.podeRepetirNivel(s.fase, s.categoriaId, s.nivelIndex)
                      ? ' — você ainda pode repetir para melhorar'
                      : ' — repetição já utilizada'
                return `${medalImg}${medalLine}<div class="result-stars">${QuizLevels.starsHtml(stars)}</div><p class="result-stars-label">${label}${stars < 3 ? replayHint : ''}</p>`
              })()
      }
      <p><strong>Acertos:</strong> ${acertos} / ${total}</p>
      <p><strong>Pontuação:</strong> ${s.totalPontos} pontos</p>
      <p class="result-meta">${this.metaResultado()}</p>`

    if (s.modo !== 'competicao' && s.modo !== 'desafio_diario' && stars >= 1) {
      this.showMedalDialog(stars, { acertos, total })
    }

    this._lastResult = {
      acertos,
      total,
      pontos: s.totalPontos,
      stars,
      detalheCompeticao:
        s.modo === 'competicao'
          ? {
              tempoTotalMs: s.quizInicioAt
                ? Math.max(0, Date.now() - s.quizInicioAt)
                : (s.respostaTempos || []).reduce((n, r) => n + (r?.tempoMs || 0), 0),
              respostas: s.perguntas.map((pq, i) => ({
                perguntaId: typeof QuizQuestionId !== 'undefined' ? QuizQuestionId.id(pq) : String(i),
                acerto: s.respostas[i] === true,
                tempoMs: s.respostaTempos?.[i]?.tempoMs || 0,
              })),
            }
          : null,
    }

    const toast = document.getElementById('new-achievements')
    if (medalhas.length) {
      QuizIncentivos.dispararConquistas(medalhas)
      toast.classList.remove('hidden')
      toast.innerHTML = medalhas.map((m) => `<p>${m.emoji} <strong>${m.nome}</strong> — ${m.desc}</p>`).join('')
    } else {
      toast.classList.add('hidden')
    }

    this.salvarRanking()

    if (s.modo === 'competicao') {
      this._enviarProgressoCompeticao()
      this.showScreen('trilha')
      this.renderTrilhaGrid()
      this._mostrarRankingAposConclusao()
      return
    }

    this.showScreen('result')
  }

  _mostrarRankingAposConclusao() {
    const meuTime = typeof QuizCompetition !== 'undefined' ? QuizCompetition.meuTime() : null
    const r = this._lastResult || {}
    const msg = meuTime
      ? `Rodada concluída! ${meuTime.nome} — ${r.acertos || 0}/${r.total || 0} acertos, ${r.pontos || 0} pts`
      : `Rodada concluída! ${r.acertos || 0}/${r.total || 0} acertos`
    const banner = document.getElementById('competition-complete-banner')
    if (banner) {
      banner.textContent = msg
      banner.classList.remove('hidden')
    }
    setTimeout(() => {
      this.openRanking({ competicao: true })
    }, 800)
  }

  metaResultado() {
    return this.tituloPartida()
  }

  compartilhar() {
      const r = this._lastResult || { acertos: 0, total: 0, pontos: 0 };
      void window.BibliaQuiz.share({title:'Quiz Bíblico',text:'Acertei '+r.acertos+'/'+r.total+' perguntas e fiz '+r.pontos+' pontos no Quiz Bíblico.',url:window.BibliaQuiz.shareUrl}).catch(() => {});
      this.salvarRanking();
    }

  salvarRanking() {
    const isComp = this.state.modo === 'competicao' &&
      typeof QuizCompetition !== 'undefined' && QuizCompetition.ativo()
    const nomeComp = isComp ? QuizCompetition.nomeParticipante() : ''
    const user = QuizFirebaseAuth.getUser?.()
    const nomeConta =
      user && QuizFirebaseAuth.podePublicarRanking() ? QuizFirebaseAuth.displayName(user) : ''
    const nomeNormal =
      document.getElementById('player-name')?.value.trim() ||
      nomeConta ||
      QuizStorage.lerNomeJogador() ||
      'Jogador'
    const nome = isComp ? (nomeComp || nomeNormal) : nomeNormal
    if (!isComp) QuizStorage.gravarNomeJogador(nome)

    const r = this._lastResult
    if (!r) return

    QuizRanking.registrarRodada({
      nome,
      pontos: r.pontos,
      acertos: r.acertos,
      totalPerguntas: r.total,
      fase: this.state.fase,
      categoria: this.state.categoriaId,
      modoJogo: this.state.modo,
      dailyDate: this.state.dailyDate,
      modoScoring: typeof QuizPontuacao !== 'undefined' ? QuizPontuacao.lerModo() : 'sequencia',
      tournamentId: isComp ? QuizCompetition.codigoTorneio() : null,
      teamId: isComp ? (QuizCompetition.meuTime()?.id || null) : null,
      teamName: isComp ? (QuizCompetition.meuTime()?.nome || null) : null,
      detalheCompeticao: isComp ? (r.detalheCompeticao || null) : null,
    })

    if (
      this.state.modo === 'competicao' &&
      typeof QuizCompetition !== 'undefined' &&
      QuizCompetition.modoAcesso() === 'celular_equipe'
    ) {
      const t = QuizCompetition.meuTime()
      if (t) QuizCompetition.marcarTimeJogou(t.id, nome)
    }

    if (user && QuizFirebaseAuth.podePublicarRanking()) {
      void QuizFirebaseCloudSync.flushImmediate(user.uid)
    }
  }

  irMenu() {
    this.salvarRanking()
    this.showScreen('start')
  }

  

  renderCloudAuthPanel(containerId = 'home-firebase-auth-panel') {
      const panel = document.getElementById(containerId); if (!panel) return;
      const user = QuizFirebaseAuth.getUser();
      panel.innerHTML = user ? '<p>Conectado como ' + this.escapeHtml(QuizFirebaseAuth.displayName(user)) + '</p><button class="btn-secondary" id="quiz-conta">Minha conta</button>' : '<button class="btn-primary" id="quiz-conta">Entrar na minha conta</button>';
      panel.querySelector('#quiz-conta').onclick = () => window.BibliaQuiz.openProfile();
    }

  

  nomeRankingAtual() {
    const user = QuizFirebaseAuth.getUser?.()
    if (user && QuizFirebaseAuth.podePublicarRanking()) {
      return QuizFirebaseAuth.displayName(user)
    }
    return document.getElementById('player-name')?.value || QuizStorage.lerNomeJogador()
  }

  refreshRankingViews() {
    const nome = this.nomeRankingAtual()
    const compOn =
      this._rankingModoCompeticao ??
      (typeof QuizCompetition !== 'undefined' && QuizCompetition.ativo())

    if (compOn) {
      const rows = this.torneioDetalhes?.length ? this.torneioDetalhes : this.torneioRows || []
      QuizRanking.renderPodio(document.getElementById('podium-torneio'), rows, 'todos')
      QuizRanking.renderTabela(document.getElementById('ranking-table-torneio'), rows, nome, {
        boardKey: 'todos',
        showTeam: true,
        showTempo: true,
        hideFase: true,
        subtitle: 'Torneio — pontos, acertos e tempo total',
      })
      const detalhesEl = document.getElementById('ranking-detalhes-torneio')
      const isOrg = typeof QuizCompetition !== 'undefined' && QuizCompetition.isOrganizador()
      if (detalhesEl) {
        if (isOrg) {
          QuizRanking.renderTorneioDetalhado(
            detalhesEl,
            this.torneioDetalhes?.length ? this.torneioDetalhes : rows
          )
        } else {
          detalhesEl.innerHTML = ''
        }
      }
      this.atualizarRankingTorneioOrganizador()
      return
    }

    const sel = document.getElementById('ranking-board-select')
    const boardLabel = sel ? (sel.options[sel.selectedIndex]?.text || 'Geral') : 'Geral'
    QuizRanking.renderPodio(document.getElementById('podium-online'), this.onlineRows, 'todos')
    QuizRanking.renderTabela(document.getElementById('ranking-table-online'), this.onlineRows, nome, {
      boardKey: 'todos',
      subtitle: boardLabel,
    })
  }

  configurarRankingOverlay(compOn) {
    this._rankingModoCompeticao = compOn
    const header = document.querySelector('#ranking-overlay .overlay-header h2')
    if (header) header.textContent = compOn ? '🏆 Ranking do torneio' : '🏆 Ranking'

    document.querySelectorAll('.ranking-tabs .tab').forEach((tab) => {
      const t = tab.dataset.tab
      if (t === 'torneio') tab.classList.toggle('hidden', !compOn)
      if (t === 'online') tab.classList.toggle('hidden', compOn)
    })
    const boardSelector = document.querySelector('.ranking-board-selector')
    if (boardSelector) boardSelector.classList.toggle('hidden', compOn)
  }

  async verificarAcessoRankingTorneio() {
    if (!QuizFirebaseAuth.podePublicarRanking()) {
      return {
        ok: false,
        mensagem: 'Conecte-se na tela inicial (e-mail verificado) para ver o ranking do torneio.',
      }
    }
    if (QuizCompetition.isOrganizador()) {
      return { ok: true, organizador: true }
    }

    const meuTime = QuizCompetition.meuTime()
    const jaJoguei = meuTime && QuizCompetition.timeJaJogouNesteAparelho?.(meuTime.id)
    if (jaJoguei) {
      return { ok: true, organizador: false }
    }

    const meta = await QuizFirebaseRanking.lerTorneioMeta(QuizCompetition.codigoTorneio())
    if (meta.rankingLiberadoParticipantes) {
      return { ok: true, organizador: false }
    }
    return {
      ok: false,
      mensagem: 'Nenhuma rodada concluída ainda. O organizador vê atualizações em tempo real.',
    }
  }

  limparSubscriptionsRanking() {
    if (this.firebaseUnsub) {
      this.firebaseUnsub()
      this.firebaseUnsub = null
    }
    if (this.firebaseBoardUnsub) {
      this.firebaseBoardUnsub()
      this.firebaseBoardUnsub = null
    }
    if (this.firebaseMetaUnsub) {
      this.firebaseMetaUnsub()
      this.firebaseMetaUnsub = null
    }
    if (this.firebaseDetalhesUnsub) {
      this.firebaseDetalhesUnsub()
      this.firebaseDetalhesUnsub = null
    }
  }

  assinarRankingTorneio(codigo) {
    const boardKey = QuizCompetition.boardKey({ modoJogo: 'competicao' })
    this.firebaseBoardUnsub = QuizFirebaseRanking.subscribeBoard(boardKey, (rows) => {
      this.torneioRows = rows
      this.refreshRankingViews()
    })
    this.firebaseMetaUnsub = QuizFirebaseRanking.subscribeTorneioMeta(codigo, (meta) => {
      this.torneioMeta = meta || {}
      this.refreshRankingViews()
    })
    this.firebaseDetalhesUnsub = QuizFirebaseRanking.subscribeTorneioDetalhes(codigo, (rows) => {
      this.torneioDetalhes = rows
      this.refreshRankingViews()
    })
  }

  atualizarRankingTorneioOrganizador() {
    const actions = document.getElementById('ranking-torneio-organizer-actions')
    const btn = document.getElementById('btn-ranking-liberar')
    const status = document.getElementById('firebase-status-torneio')
    const org = typeof QuizCompetition !== 'undefined' && QuizCompetition.isOrganizador()
    if (actions) actions.classList.toggle('hidden', !org)
    if (!org) return

    const rows = this.torneioDetalhes?.length ? this.torneioDetalhes : this.torneioRows || []
    const todos = QuizFirebaseRanking.todosTimesConcluiram(rows, QuizCompetition.listarTimes())
    const liberado = Boolean(this.torneioMeta?.rankingLiberadoParticipantes)

    if (btn) {
      btn.disabled = !todos || liberado
      btn.textContent = liberado
        ? 'Ranking liberado para participantes'
        : 'Liberar ranking para participantes'
    }
    if (status) {
      status.textContent = liberado
        ? 'Ranking liberado — participantes podem ver os resultados.'
        : todos
          ? 'Todos os times concluíram. Você pode liberar o ranking.'
          : 'Acompanhamento ao vivo — aguardando conclusão dos times.'
    }
  }

  async liberarRankingTorneioParticipantes() {
    const codigo = QuizCompetition.codigoTorneio()
    if (!codigo) return
    const rows = this.torneioDetalhes?.length ? this.torneioDetalhes : this.torneioRows || []
    if (!QuizFirebaseRanking.todosTimesConcluiram(rows, QuizCompetition.listarTimes())) {
      alert('Aguarde todos os times concluírem a rodada antes de liberar.')
      return
    }
    const ok = await QuizFirebaseRanking.liberarRankingParticipantes(codigo)
    if (!ok) {
      alert('Não foi possível liberar o ranking. Verifique sua conexão.')
      return
    }
    this.atualizarRankingTorneioOrganizador()
  }

  openRanking(opts = {}) {
    if (this._lastResult) this.salvarRanking()
    QuizConfetti.disparar('intenso')

    const compOn =
      Boolean(opts.competicao) &&
      typeof QuizCompetition !== 'undefined' &&
      QuizCompetition.ativo()
    this.configurarRankingOverlay(compOn)
    this.switchRankingTab(compOn ? 'torneio' : 'online')

    this.limparSubscriptionsRanking()

    const status = document.getElementById(compOn ? 'firebase-status-torneio' : 'firebase-status')
    if (!QuizFirebaseRanking.isConfigured()) {
      status.textContent = 'O ranking está indisponível neste momento. Você pode continuar jogando.'
      this.onlineRows = []
      this.torneioRows = []
      this.torneioDetalhes = []
      this.refreshRankingViews()
      document.getElementById('ranking-overlay').classList.remove('hidden')
      return
    }

    void QuizFirebaseAuth.init()

    if (compOn && QuizCompetition.codigoTorneio()) {
      void (async () => {
        const acesso = await this.verificarAcessoRankingTorneio()
        if (!acesso.ok) {
          status.textContent = acesso.mensagem
          this.torneioRows = []
          this.torneioDetalhes = []
          this.torneioMeta = {}
          this.refreshRankingViews()
          document.getElementById('ranking-overlay').classList.remove('hidden')
          return
        }

        const codigo = QuizCompetition.codigoTorneio()
        if (acesso.organizador) {
          void QuizFirebaseRanking.registrarOrganizadorAbriuRanking(codigo)
        }
        this.assinarRankingTorneio(codigo)
        this.refreshRankingViews()
        document.getElementById('ranking-overlay').classList.remove('hidden')
      })()
      return
    }

    if (QuizFirebaseAuth.podePublicarRanking()) {
      status.textContent = 'Ranking online — conectado.'
    } else if (QuizFirebaseAuth.getUser?.()) {
      status.textContent = 'Conecte-se na tela inicial com e-mail verificado para publicar sua pontuação.'
    } else {
      status.textContent = 'Conecte-se na tela inicial para entrar no ranking.'
    }

    this._popularSeletorRanking()
    this._assinarRankingBoard(this._rankingBoardSelecionado || 'global')

    this.refreshRankingViews()
    document.getElementById('ranking-overlay').classList.remove('hidden')
  }

  _popularSeletorRanking() {
    const sel = document.getElementById('ranking-board-select')
    if (!sel) return

    const scoring = typeof QuizPontuacao !== 'undefined' ? QuizPontuacao.lerModo() : 'questoes'
    const opcoes = [{ value: 'global', label: 'Geral (Completo)' }]

    const totalFases = typeof QuizTrilhas !== 'undefined' ? QuizTrilhas.numFases() : (QuizConfig.numFases || 3)
    for (let f = 1; f <= totalFases; f++) {
      const cols = typeof QuizTrilhas !== 'undefined' ? QuizTrilhas.COLUNAS : []
      for (const col of cols) {
        for (const trilha of col.trilhas) {
          const catId = trilha.id
          const boardKey = `f${f}:${catId}:${scoring}`
          const faseLabel = QuizConfig.labelFase(f)
          opcoes.push({ value: boardKey, label: `${faseLabel} · ${trilha.label}` })
        }
      }
    }

    sel.innerHTML = opcoes.map((o) =>
      `<option value="${o.value}">${o.label}</option>`
    ).join('')

    sel.value = this._rankingBoardSelecionado || 'global'

    if (!sel.dataset.bound) {
      sel.dataset.bound = '1'
      sel.addEventListener('change', () => {
        this._rankingBoardSelecionado = sel.value
        this.limparSubscriptionsRanking()
        this._assinarRankingBoard(sel.value)
      })
    }
  }

  _assinarRankingBoard(boardKey) {
    this.limparSubscriptionsRanking()
    if (boardKey === 'global') {
      this.firebaseUnsub = QuizFirebaseRanking.subscribeGlobal((rows) => {
        this.onlineRows = rows
        this.refreshRankingViews()
      })
    } else {
      this.firebaseUnsub = QuizFirebaseRanking.subscribeBoard(boardKey, (rows) => {
        this.onlineRows = rows
        this.refreshRankingViews()
      })
    }
  }

  switchRankingTab(tab) {
    const compOn = this._rankingModoCompeticao ?? false
    if (compOn && tab !== 'torneio') tab = 'torneio'
    if (!compOn && tab === 'torneio') tab = 'online'

    document.querySelectorAll('.ranking-tabs .tab').forEach((t) => {
      if (t.classList.contains('hidden')) return
      t.classList.toggle('active', t.dataset.tab === tab)
    })
    document.getElementById('ranking-online-tab').classList.toggle('hidden', tab !== 'online')
    document.getElementById('ranking-online-tab').classList.toggle('active', tab === 'online')
    document.getElementById('ranking-torneio-tab').classList.toggle('hidden', tab !== 'torneio')
    document.getElementById('ranking-torneio-tab').classList.toggle('active', tab === 'torneio')
  }

  openAchievements() {
    const nivel = QuizNivel.obterNivel()
    const total = Object.keys(QuizAchievements.CATALOGO).length
    const desbloq = QuizAchievements.contarDesbloqueadas()
    const header = document.getElementById('achievements-header')
    if (header) {
      header.innerHTML = `
        <p class="ach-nivel"><strong>Nível:</strong> ${nivel.label} · ${nivel.pontos} pts perfil</p>
        <p class="ach-progresso">Medalhas: ${desbloq} / ${total}${
          nivel.proximo ? ` · faltam ${nivel.falta} pts para ${nivel.proximo.label}` : ' · nível máximo!'
        }</p>
        <div class="ach-bar"><div class="ach-bar-fill" style="width:${nivel.progressoPct}%"></div></div>`
    }

    const list = document.getElementById('achievements-list')
    const grupos = QuizAchievements.listarPorGrupo()
    list.innerHTML = Object.values(grupos)
      .filter((g) => g.items.length)
      .map(
        (g) => `<section class="ach-group">
          <h3>${g.label}</h3>
          ${g.items
            .map(
              (a) => `<div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
                <span class="ach-emoji">${a.unlocked ? a.emoji : '🔒'}</span>
                <div><strong>${a.nome}</strong><br><small>${a.desc}</small></div>
              </div>`
            )
            .join('')}
        </section>`
      )
      .join('')
    document.getElementById('achievements-overlay').classList.remove('hidden')
  }

  closeOverlay(which) {
    document.getElementById(`${which}-overlay`).classList.add('hidden')
    if (which === 'ranking') {
      this.limparSubscriptionsRanking()
    }
  }

  showTip(key) {
    const tips = {
      trilhas: {
        title: 'Trilhas e fases',
        html: `<ul class="tip-list">
          <li>Perguntas em blocos de <strong>50</strong> por fase (mais fases, menos perguntas cada).</li>
          <li>Na 1ª vez a ordem é aleatória; ao repetir, as mesmas perguntas voltam — só mudam a ordem e as alternativas.</li>
          <li>Medalhas por acertos: até 33% sem medalha; até 66% bronze; até 99% prata; 100% ouro.</li>
          <li>Complete a trilha <strong>Completo</strong> da fase anterior (perguntas e pontuação) para desbloquear a próxima.</li>
          <li>Em <strong>Novo Testamento</strong> e <strong>Antigo Testamento</strong>: modo Completo, Livros ou Grupo de Livros.</li>
          <li>O progresso fica salvo — você continua de onde parou.</li>
        </ul>`,
      },
      scoring: {
        title: 'Como os pontos funcionam',
        html: '<ul class="tip-list"><li>Cada resposta certa vale <strong>10 pontos</strong>, em todos os modos.</li><li>Erros valem zero e não retiram pontos anteriores.</li><li>Não há bônus por sequência ou velocidade.</li><li>Exemplos: 7 acertos = 70 pontos; 50 acertos = 500 pontos.</li><li>O ranking compara acertos na mesma escala, inclusive nos resultados antigos.</li></ul>',
      },
      competition: {
        title: 'Competição',
        html: `<ul class="tip-list">
          <li>Organize um torneio, cadastre times e envie o <strong>link</strong> — quem abre já entra configurado.</li>
          <li>Rodada com mix automático (AT, NT, Histórico e Teológicas).</li>
          <li>Ranking da competição aparece só dentro do modo competição.</li>
          <li>Para jogar trilhas normais, toque em <strong>Jogar</strong> na tela inicial (desliga a competição).</li>
        </ul>`,
      },
    }
    const tip = tips[key]
    if (!tip) return
    const titleEl = document.getElementById('dialog-tip-title')
    const bodyEl = document.getElementById('dialog-tip-body')
    if (titleEl) titleEl.textContent = tip.title
    if (bodyEl) bodyEl.innerHTML = tip.html
    this.showDialog('dialog-tip')
  }

  showDialog(id) {
    document.getElementById(id)?.classList.remove('hidden')
  }

  hideDialog(id) {
    document.getElementById(id)?.classList.add('hidden')
  }

  showUnlockDialog(msg) {
    document.getElementById('dialog-unlock-msg').textContent = msg
    this.showDialog('dialog-unlock')
    QuizConfetti.disparar('intenso', { zIndex: 10001 })
  }

  showMedalDialog(stars, { acertos = 0, total = 0 } = {}) {
    const medal = QuizLevels.medalhaDeEstrelas(stars)
    if (!medal?.src) return
    const img = document.getElementById('dialog-medal-img')
    const title = document.getElementById('dialog-medal-title')
    const msg = document.getElementById('dialog-medal-msg')
    if (img) {
      img.src = medal.src
      img.alt = `Medalha ${medal.label}`
    }
    if (title) title.textContent = `Medalha ${medal.label}`
    if (msg) {
      msg.textContent =
        stars === 3
          ? `Perfeito! ${acertos}/${total} acertos — ouro conquistado.`
          : stars === 2
            ? `Ótimo desempenho: ${acertos}/${total}. Continue para o ouro!`
            : `Você conquistou o bronze com ${acertos}/${total}. Pode melhorar!`
    }
    const dlg = document.getElementById('dialog-medal')
    if (dlg) {
      dlg.classList.remove('hidden')
      dlg.setAttribute('aria-hidden', 'false')
    }
    const confete = stars >= 3 ? 'intenso' : 'dourado'
    if (typeof QuizConfetti !== 'undefined') {
      QuizConfetti.disparar(confete, { zIndex: 10001 })
    }
  }

  hideMedalDialog() {
    const dlg = document.getElementById('dialog-medal')
    if (dlg) {
      dlg.classList.add('hidden')
      dlg.setAttribute('aria-hidden', 'true')
    }
  }

  confirmarSaida() {
    this.persistir()
    this.hideDialog('dialog-leave')
    this._saidaConfirmada = true
    const dest = this._pendingLeaveScreen || 'start'
    this._pendingLeaveScreen = null
    if (history.state?.quiz) {
      history.replaceState(null, '', location.href)
    }
    this.showScreen(dest)
    this.refreshSavedBanner()
  }

  descartarESair() {
    const dest = this._pendingLeaveScreen || 'start'
    this.hideDialog('dialog-leave')
    this._saidaConfirmada = true
    this._pendingLeaveScreen = null
    if (history.state?.quiz) {
      history.replaceState(null, '', location.href)
    }
    if (this.state.modo === 'competicao' && typeof QuizCompetition !== 'undefined') {
      QuizCompetition.desativarParaJogoNormal()
    } else if (this.state.modo === 'trilha_linear' && typeof QuizTrilhaLinear !== 'undefined') {
      QuizTrilhaLinear.reiniciar(this.state.fase, this.state.categoriaId)
    }
    this._bloquearPersistencia = true
    QuizStorage.limparProgresso()
    this.limparEstadoQuiz()
    this.state.modo = 'categoria'
    this._bloquearPersistencia = false
    this.refreshSavedBanner()
    this.renderScoringToggle()
    this.renderCompetitionPanel()
    this.showScreen(dest)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  QuizIncentivos.init()
  const app = new QuizApp()
  window.__quizApp = app
  if (typeof QuizNativeDeepLink !== 'undefined') QuizNativeDeepLink.init(app)
})

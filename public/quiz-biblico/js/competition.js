/**
 * Modo competição — código automático, times, rodada mista e link de convite.
 */
const QuizCompetition = (() => {
  const STORAGE_KEY = 'quizBibliaV2_competition_v3'
  const TEAM_PLAYED_KEY = 'quizBibliaV2_comp_team_played_v1'
  const URL_PARAM = 'comp'
  const QTD_OPCOES = [10, 15, 20, 25, 30, 40, 50]

  const TORNEIOS = [
    { id: 'retiro', label: 'Retiro espiritual', desc: 'Competição geral do retiro.' },
    { id: 'retiro_jovens', label: 'Retiro de jovens', desc: 'Ranking entre equipes do retiro de jovens.' },
    { id: 'escola_dominical', label: 'Escola dominical', desc: 'Classes ou grupos da escola dominical.' },
    { id: 'congresso', label: 'Congresso / evento', desc: 'Evento pontual entre igrejas ou regiões.' },
  ]

  const TORNEIO_IDS = new Set(TORNEIOS.map((t) => t.id))

  function estadoPadrao() {
    return {
      ativo: false,
      codigo: '',
      torneioId: 'retiro_jovens',
      nomeEvento: '',
      times: [],
      meuTimeId: null,
      nomeParticipante: '',
      organizador: false,
      linkCompartilhado: false,
      quantidadePerguntas: 20,
      perguntaIds: [],
      modoAcesso: 'individual',
    }
  }

  function ler() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return migrarLegado()
      const s = JSON.parse(raw)
      return {
        ...estadoPadrao(),
        ...s,
        times: Array.isArray(s.times) ? s.times : [],
        perguntaIds: Array.isArray(s.perguntaIds) ? s.perguntaIds : [],
      }
    } catch {
      return estadoPadrao()
    }
  }

  function migrarLegado() {
    for (const key of ['quizBibliaV2_competition_v2', 'quizBibliaV2_competition_v1']) {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const old = JSON.parse(raw)
        let codigo = String(old.codigo || '').trim()
        if (!codigo || TORNEIO_IDS.has(codigo)) codigo = ''
        return {
          ...estadoPadrao(),
          ativo: Boolean(old.ativo),
          codigo,
          torneioId: old.torneioId || 'retiro_jovens',
          nomeEvento: old.nomeEvento || '',
          times: Array.isArray(old.times) ? old.times : [],
          meuTimeId: old.meuTimeId || null,
          organizador: Boolean(old.organizador),
        }
      } catch {
        /* próximo */
      }
    }
    return estadoPadrao()
  }

  function gravar(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...ler(), ...data }))
    } catch {
      /* quota */
    }
  }

  function gerarCodigo() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
    return out
  }

  function codigoValido(c) {
    const s = String(c || '').trim()
    return s.length >= 4 && !TORNEIO_IDS.has(s)
  }

  function garantirCodigo() {
    const s = ler()
    if (codigoValido(s.codigo)) return s.codigo
    const codigo = gerarCodigo()
    gravar({ codigo })
    return codigo
  }

  function gerarRodadaAtual() {
    const codigo = garantirCodigo()
    const s = ler()
    const qtd = Math.max(5, Math.min(80, Number(s.quantidadePerguntas) || 20))
    const ids =
      typeof QuizCompetitionQuestions !== 'undefined'
        ? QuizCompetitionQuestions.gerarRodada(qtd, codigo)
        : []
    gravar({ quantidadePerguntas: qtd, perguntaIds: ids })
    return ids
  }

  function desativarAoReiniciar() {
    gravar({
      ativo: false,
      organizador: false,
      meuTimeId: null,
      nomeParticipante: '',
    })
  }

  /** Limpa toda a configuração da competição (volta ao zero). */
  function resetarCompletamente() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch { /* ok */ }
    return estadoPadrao()
  }

  /** Sai do modo competição e volta ao jogo normal (trilhas). */
  function desativarParaJogoNormal() {
    desativarAoReiniciar()
  }

  function getAndroidApplicationId() {
    return 'com.bibliadc.app'
  }

  /**
   * Monta intent:// link para Android — abre o app sem depender de site.
   * Apps de mensagem (WhatsApp) reconhecem como link clicável.
   */
  function androidIntentLink(deepLinkUrl) {
    if (!deepLinkUrl || typeof deepLinkUrl !== 'string') return deepLinkUrl
    try {
      const u = new URL(deepLinkUrl)
      const scheme = u.protocol.replace(/:$/, '')
      const host = u.hostname || u.host || 'open'
      let path = u.pathname || '/'
      if (!path.startsWith('/')) path = `/${path}`
      const pathAndQuery = `${path}${u.search || ''}`
      const pkg = getAndroidApplicationId()
      return `intent://${host}${pathAndQuery}#Intent;scheme=${scheme};package=${pkg};end`
    } catch {
      return deepLinkUrl
    }
  }
  function ativarComoOrganizador() {
    const codigo = gerarCodigo()
    gravar({
      ativo: true,
      organizador: true,
      papelDefinido: true,
      codigo,
      meuTimeId: null,
      nomeParticipante: '',
      linkCompartilhado: false,
    })
    if (typeof QuizPontuacao !== 'undefined') QuizPontuacao.gravarModo('fixo10')
    gerarRodadaAtual()
  }

  function ativo() {
    return Boolean(ler().ativo)
  }

  function isOrganizador() {
    return Boolean(ler().organizador)
  }

  function torneioId() {
    const s = ler()
    return s.ativo ? s.torneioId || 'retiro_jovens' : null
  }

  function torneioAtual() {
    const id = torneioId()
    if (!id) return null
    return TORNEIOS.find((t) => t.id === id) || { id, label: id, desc: '' }
  }

  function codigoTorneio() {
    const s = ler()
    if (!s.ativo) return null
    return codigoValido(s.codigo) ? s.codigo : garantirCodigo()
  }

  function labelTorneio() {
    const s = ler()
    if (s.nomeEvento) return s.nomeEvento
    return torneioAtual()?.label || 'Competição'
  }

  function listarTimes() {
    return ler().times || []
  }

  function meuTime() {
    const s = ler()
    if (!s.meuTimeId) return null
    return listarTimes().find((t) => t.id === s.meuTimeId) || null
  }

  function nomeParticipante() {
    return String(ler().nomeParticipante || '').trim().slice(0, 40)
  }

  function selecionarTime(timeId) {
    gravar({ meuTimeId: timeId || null })
  }

  function gravarNomeParticipante(nome) {
    gravar({ nomeParticipante: String(nome || '').trim().slice(0, 40) })
  }

  function modoAcesso() {
    return ler().modoAcesso === 'celular_equipe' ? 'celular_equipe' : 'individual'
  }

  function lerTimesJogados() {
    try {
      const raw = localStorage.getItem(TEAM_PLAYED_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function chaveTimeJogado(codigo, teamId) {
    return `${codigo}:${teamId}`
  }

  function timeJaJogouNesteAparelho(teamId) {
    const codigo = codigoTorneio()
    if (!codigo || !teamId) return false
    return Boolean(lerTimesJogados()[chaveTimeJogado(codigo, teamId)])
  }

  function marcarTimeJogou(teamId, nome) {
    const codigo = codigoTorneio()
    if (!codigo || !teamId) return
    const map = lerTimesJogados()
    map[chaveTimeJogado(codigo, teamId)] = {
      nome: String(nome || '').slice(0, 40),
      at: Date.now(),
    }
    localStorage.setItem(TEAM_PLAYED_KEY, JSON.stringify(map))
  }

  function precisaEscolherTime() {
    const s = ler()
    return Boolean(s.ativo && s.times.length > 0 && !s.meuTimeId)
  }

  function precisaInformarNome() {
    const s = ler()
    return Boolean(
      s.ativo && s.meuTimeId && modoAcesso() === 'individual' && !nomeParticipante()
    )
  }

  function marcarLinkCompartilhado() {
    gravar({ linkCompartilhado: true })
  }

  function linkFoiCompartilhado() {
    return Boolean(ler().linkCompartilhado)
  }

  function torneioConfigurado() {
    const s = ler()
    if (!s.ativo) return false
    if (!listarTimes().length) return false
    if (!(s.perguntaIds || []).length) return false
    if (!linkFoiCompartilhado()) return false
    return codigoValido(s.codigo || codigoTorneio())
  }

  function organizadorSoOrganizando() {
    return Boolean(isOrganizador() && ativo() && !meuTime())
  }

  function podeParticiparRodada() {
    if (!ativo()) return false
    if (organizadorSoOrganizando()) return false
    if (precisaEscolherTime()) return false
    if (precisaInformarNome()) return false
    return Boolean(meuTime())
  }

  function podeIniciarRodada() {
    if (!ativo()) return false
    if (isOrganizador()) {
      return torneioConfigurado() && podeParticiparRodada()
    }
    return podeParticiparRodada() && (ler().perguntaIds || []).length > 0
  }

  function motivoNaoPodeIniciar() {
    const s = ler()
    if (!s.ativo) return 'Ative o modo competição.'
    if (isOrganizador()) {
      if (!listarTimes().length) return 'Cadastre pelo menos um time.'
      if (!(s.perguntaIds || []).length) return 'Aguarde a geração da rodada.'
      if (!linkFoiCompartilhado()) return 'Compartilhe o torneio antes de iniciar.'
      if (organizadorSoOrganizando()) {
        return 'Como organizador, escolha time e nome para jogar — ou acompanhe o ranking ao vivo.'
      }
      if (precisaEscolherTime()) return 'Escolha seu time para iniciar a rodada.'
      if (precisaInformarNome()) return 'Informe seu nome para iniciar a rodada.'
      return ''
    }
    if (!(s.perguntaIds || []).length) return 'Configuração do torneio incompleta. Peça o código ao organizador.'
    if (precisaEscolherTime()) return 'Escolha seu time para iniciar a rodada.'
    if (precisaInformarNome()) return 'Informe seu nome para iniciar a rodada.'
    return ''
  }

  function checklistTorneio() {
    const s = ler()
    return [
      { ok: Boolean(s.torneioId), label: 'Tipo de evento selecionado' },
      { ok: listarTimes().length > 0, label: 'Pelo menos um time cadastrado' },
      { ok: (s.perguntaIds || []).length > 0, label: 'Rodada de perguntas gerada' },
      { ok: linkFoiCompartilhado(), label: 'Link enviado ou copiado' },
    ]
  }

  function precisaConfigurarEntrada() {
    if (organizadorSoOrganizando()) return false
    return precisaEscolherTime() || precisaInformarNome()
  }

  function precisaEntradaParticipante() {
    if (isOrganizador()) return false
    return precisaConfigurarEntrada()
  }

  function adicionarTime(nome) {
    const n = String(nome || '').trim().slice(0, 40)
    if (!n) return null
    const times = listarTimes()
    if (times.some((t) => t.nome.toLowerCase() === n.toLowerCase())) return null
    const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    gravar({ times: [...times, { id, nome: n }] })
    return { id, nome: n }
  }

  function removerTime(timeId) {
    const s = ler()
    gravar({
      times: listarTimes().filter((t) => t.id !== timeId),
      meuTimeId: s.meuTimeId === timeId ? null : s.meuTimeId,
    })
  }

  function resolverPerguntasRodada() {
    const s = ler()
    let ids = s.perguntaIds || []
    if (!ids.length && typeof QuizCompetitionQuestions !== 'undefined') {
      ids = gerarRodadaAtual()
    }
    return typeof QuizCompetitionQuestions !== 'undefined'
      ? QuizCompetitionQuestions.resolverPerguntas(ids)
      : []
  }

  function resumoRodada() {
    const s = ler()
    if (typeof QuizCompetitionQuestions === 'undefined') return ''
    return QuizCompetitionQuestions.resumoTipos(s.perguntaIds || [])
  }

  function boardKey({ modo, fase, categoria, dailyDate, modoJogo } = {}) {
    const tor = codigoTorneio()
    if (modoJogo === 'competicao' && tor) {
      const qtd = ler().quantidadePerguntas || 20
      const scoring =
        modo || (typeof QuizPontuacao !== 'undefined' ? QuizPontuacao.lerModo() : 'fixo10')
      return `torneio:${tor}:comp:${qtd}:${scoring}`
    }

    const scoring =
      modo || (typeof QuizPontuacao !== 'undefined' ? QuizPontuacao.lerModo() : 'fixo10')
    const cat = (categoria || 'completo').replace(/:/g, '_')

    if (modoJogo === 'desafio_diario' && dailyDate) {
      const base = `daily:${dailyDate}:${scoring}`
      return tor ? `torneio:${tor}:${base}` : base
    }

    const base = `f${Number(fase) || 1}:${cat}:${scoring}`
    return tor ? `torneio:${tor}:${base}` : base
  }

  function boardKeySafe(key) {
    return String(key || 'geral').replace(/[.#$/[\]]/g, '_').slice(0, 120)
  }

  function labelBoard(key) {
    const parts = String(key || '').split(':')
    let rest = key
    if (parts[0] === 'torneio') rest = parts.slice(2).join(':')
    const torLabel = ativo() ? `${labelTorneio()} · ` : ''

    if (rest.startsWith('comp:')) {
      const [, qtd, scoring] = rest.split(':')
      return `${torLabel}Rodada ${qtd} perg. (${scoring === 'fixo10' ? '10 pontos por acerto' : '10 pontos por acerto'})`
    }

    if (rest.startsWith('daily:')) {
      const [, date, modo] = rest.split(':')
      return `${torLabel}Desafio ${date} (${modo === 'fixo10' ? '10 pontos por acerto' : '10 pontos por acerto'})`
    }

    const m = rest.match(/^f(\d+):([^:]+):(sequencia|questoes|fixo10)$/)
    if (m) {
      const faseLabel = typeof QuizConfig !== 'undefined' ? QuizConfig.labelFase(Number(m[1])) : `Fase ${m[1]}`
      return `${torLabel}${faseLabel} (${m[3] === 'fixo10' ? '10 pontos por acerto' : '10 pontos por acerto'})`
    }
    return key
  }

  function payloadCompartilhavel() {
    garantirCodigo()
    if (!(ler().perguntaIds || []).length) gerarRodadaAtual()
    const atual = ler()
    const tor = torneioAtual()
    return {
      v: 3,
      codigo: atual.codigo,
      torneioId: atual.torneioId,
      torneioLabel: tor?.label || '',
      nomeEvento: atual.nomeEvento || '',
      pontuacao: 'fixo10',
      quantidadePerguntas: atual.quantidadePerguntas,
      perguntaIds: atual.perguntaIds,
      modoAcesso: atual.modoAcesso,
      times: atual.times.map((t) => ({ id: t.id, nome: t.nome })),
    }
  }

  function encodePayload(obj) {
    const json = JSON.stringify(obj)
    const bytes = new TextEncoder().encode(json)
    let bin = ''
    bytes.forEach((b) => {
      bin += String.fromCharCode(b)
    })
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  function decodePayload(str) {
    let s = String(str || '').replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4) s += '='
    const bin = atob(s)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  }

  function lerPublicUrl() {
    const raw =
      (typeof QuizConfig !== 'undefined' && QuizConfig.PUBLIC_APP_URL) ||
      window.QUIZ_PUBLIC_APP_URL ||
      ''
    return String(raw || '').trim().replace(/\/+$/, '')
  }

  function isLocalHostName(hostname) {
    const h = String(hostname || '').toLowerCase()
    return !h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')
  }

  function isNativeApp() {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()
  }

  function urlBase() {
    const configured = lerPublicUrl()
    if (configured) return configured

    try {
      const u = new URL(window.location.href)
      if (!isLocalHostName(u.hostname)) {
        u.search = ''
        u.hash = ''
        const out = u.toString().replace(/\/$/, '')
        return out || u.origin
      }

      if (isNativeApp() && typeof QuizNativeDeepLink !== 'undefined') {
        return `${QuizNativeDeepLink.SCHEME}://open`
      }

      u.search = ''
      u.hash = ''
      return u.toString()
    } catch {
      return isNativeApp() && typeof QuizNativeDeepLink !== 'undefined'
        ? `${QuizNativeDeepLink.SCHEME}://open`
        : ''
    }
  }

  function tipoLinkCompartilhamento() {
    if (lerPublicUrl()) return 'web'
    const base = urlBase()
    if (base.startsWith('com.') || /:\/\/open/.test(base)) return 'app'
    if (isLocalHostName(new URL(window.location.href).hostname)) return 'local'
    return 'web'
  }

  function linkConvite() {
    const url = new URL(window.BibliaQuiz.publicUrl);
    url.searchParams.set(URL_PARAM, encodePayload(payloadCompartilhavel()));
    return url.toString();
  }

  function textoLinkCompartilhamento() {
    const configured = lerPublicUrl()
    if (configured) return 'Toque no link para entrar:'
    return 'Toque no link abaixo para abrir no app Quiz Bíblico (é necessário ter o app instalado):'
  }

  function textoCompartilhamento() {
      const p = payloadCompartilhavel();
      return 'Quiz Bíblico — ' + (p.nomeEvento || p.torneioLabel || 'Competição') + '\nBíblia do Discípulo Cristão\n\nCódigo do torneio: ' + p.codigo + '\nRodada: ' + p.quantidadePerguntas + ' perguntas\n\nNo aplicativo, abra Quiz Bíblico > Competição e informe o código do torneio.\n' + window.BibliaQuiz.shareUrl;
    }

  async function compartilharTorneio() {
    const p = payloadCompartilhavel()
    const codigo = p.codigo
    if (typeof QuizFirebaseRanking !== 'undefined' && QuizFirebaseRanking.isConfigured()) {
      const ok = await QuizFirebaseRanking.salvarConfigTorneio(codigo, p)
      if (!ok) {
        console.warn('[QuizCompetition] Não foi possível salvar config no Firebase. Compartilhando apenas o código.')
      }
    }
    marcarLinkCompartilhado()
    return textoCompartilhamento()
  }

  async function entrarPorCodigo(codigoDigitado) {
    const cod = String(codigoDigitado || '').trim().toLowerCase()
    if (!codigoValido(cod)) return { ok: false, erro: 'Código inválido. Deve ter pelo menos 4 caracteres.' }

    if (typeof QuizFirebaseRanking === 'undefined' || !QuizFirebaseRanking.isConfigured()) {
      return { ok: false, erro: 'Configure sua conta (e-mail verificado) para entrar em torneios.' }
    }

    const config = await QuizFirebaseRanking.lerConfigTorneio(cod)
    if (!config) {
      return { ok: false, erro: 'Torneio não encontrado. Verifique o código e tente novamente.' }
    }

    const meta = await QuizFirebaseRanking.lerTorneioMeta(cod)
    if (meta.entradasBloqueadas) {
      return { ok: false, erro: 'O organizador bloqueou novas entradas neste torneio.' }
    }

    const ok = importarPayload(config)
    if (!ok) return { ok: false, erro: 'Erro ao importar configuração do torneio.' }

    await QuizFirebaseRanking.registrarParticipante(cod)

    return { ok: true, label: labelTorneio(), precisaEntrada: precisaEntradaParticipante() }
  }

  function importarPayload(data, opts = {}) {
    if (!data || typeof data !== 'object') return false

    let codigo = String(data.codigo || data.c || '').trim()
    if (!codigoValido(codigo)) codigo = gerarCodigo()

    const times = Array.isArray(data.times)
      ? data.times
          .map((t) => ({
            id: String(t.id || `t_${Math.random().toString(36).slice(2, 8)}`),
            nome: String(t.nome || t.name || '').trim().slice(0, 40),
          }))
          .filter((t) => t.nome)
      : []

    const perguntaIds = Array.isArray(data.perguntaIds) ? data.perguntaIds : []

    gravar({
      ativo: true,
      codigo,
      torneioId: data.torneioId || 'retiro_jovens',
      nomeEvento: String(data.nomeEvento || '').trim().slice(0, 60),
      quantidadePerguntas: Number(data.quantidadePerguntas) || 20,
      perguntaIds,
      modoAcesso: data.modoAcesso === 'celular_equipe' ? 'celular_equipe' : 'individual',
      times,
      meuTimeId: opts.manterTime ? ler().meuTimeId : null,
      nomeParticipante: opts.manterNome ? ler().nomeParticipante : '',
      organizador: Boolean(opts.organizador),
      papelDefinido: true,
    })

    if (typeof QuizPontuacao !== 'undefined') QuizPontuacao.gravarModo('fixo10')
    if (!perguntaIds.length) gerarRodadaAtual()
    return true
  }

  function importarMaterial(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json
      return importarPayload(data)
    } catch {
      return false
    }
  }

  function limparParametroUrl() {
    try {
      const u = new URL(window.location.href)
      if (!u.searchParams.has(URL_PARAM)) return
      u.searchParams.delete(URL_PARAM)
      window.history.replaceState({}, '', u.pathname + u.search + u.hash)
    } catch {
      /* ignore */
    }
  }

  function aplicarDeUrl(fromUrl) {
    try {
      const u = new URL(fromUrl || window.location.href)
      let token = u.searchParams.get(URL_PARAM)
      if (!token && u.hash.startsWith('#comp=')) token = u.hash.slice(6)
      if (!token) return { ok: false }

      const data = decodePayload(token)
      const ok = importarPayload(data)
      limparParametroUrl()
      return {
        ok,
        precisaEntrada: precisaEntradaParticipante(),
        label: labelTorneio(),
      }
    } catch (err) {
      console.warn('[QuizCompetition] link inválido:', err)
      limparParametroUrl()
      return { ok: false }
    }
  }

  function opcoesQuantidade() {
    return QTD_OPCOES
  }

  function exportarMaterial() {
    return JSON.stringify(payloadCompartilhavel(), null, 2)
  }

  function listarTorneios() {
    return TORNEIOS
  }

  return {
    STORAGE_KEY,
    URL_PARAM,
    TORNEIOS,
    ler,
    gravar,
    desativarAoReiniciar,
    desativarParaJogoNormal,
    resetarCompletamente,
    ativo,
    isOrganizador,
    ativarComoOrganizador,
    garantirCodigo,
    gerarRodadaAtual,
    torneioId,
    torneioAtual,
    codigoTorneio,
    labelTorneio,
    listarTimes,
    meuTime,
    nomeParticipante,
    selecionarTime,
    gravarNomeParticipante,
    modoAcesso,
    timeJaJogouNesteAparelho,
    marcarTimeJogou,
    precisaEscolherTime,
    precisaInformarNome,
    precisaConfigurarEntrada,
    precisaEntradaParticipante,
    torneioConfigurado,
    organizadorSoOrganizando,
    podeParticiparRodada,
    podeIniciarRodada,
    motivoNaoPodeIniciar,
    checklistTorneio,
    marcarLinkCompartilhado,
    linkFoiCompartilhado,
    adicionarTime,
    removerTime,
    resolverPerguntasRodada,
    resumoRodada,
    boardKey,
    boardKeySafe,
    labelBoard,
    listarTorneios,
    opcoesQuantidade,
    payloadCompartilhavel,
    textoCompartilhamento,
    compartilharTorneio,
    entrarPorCodigo,
    importarMaterial,
    importarPayload,
    aplicarDeUrl,
    exportarMaterial,
  }
})()

window.QuizCompetition = QuizCompetition

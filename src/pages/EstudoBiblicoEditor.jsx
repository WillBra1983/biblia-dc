import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import Add from '@mui/icons-material/Add'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { buscarCapitulo } from '../services/bibliaService'
import { livros as livrosData } from '../data/biblia'
import {
  criarEstudoBiblico,
  atualizarEstudoBiblico,
  obterEstudoBiblico,
  normalizarPerguntas,
  listarModulos
} from '../services/bibliaEstudosService'
import {
  round2,
  parseDecimalProvaInput,
  splitTotalProvaEntreQuestoes,
  formatarNotaProvaPtBr
} from '../utils/provaPontos'

const emptyPergunta = () => ({
  tipo: 'multipla_escolha',
  pergunta: '',
  respostaCerta: '',
  respostasErradas: [''],
  explicacao: '',
  pontos: 1
})

const emptyMeditacaoDia = (dia = 1) => ({
  dia: Number(dia) || 1,
  titulo: '',
  leitura: '',
  texto: '',
  reflexao: '',
  oracao: '',
  conselho_pastoral: '',
  desafio: ''
})

function normalizarMeditacaoLista(raw) {
  const src = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.values(raw)
      : []
  return src
    .map((item, idx) => ({ ...emptyMeditacaoDia(idx + 1), ...item, dia: idx + 1 }))
    .slice(0, 30)
}

function parseVersList(raw) {
  return String(raw || '')
    .split(/[;,]/)
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x > 0)
}

async function textoEstudoFromVersiculos(livroId, capitulo, versiculos) {
  const livro = livrosData.find((l) => l.id === livroId)
  if (!livro) return { textoEstudo: '', referenciaCompacta: '' }
  const rows = await buscarCapitulo(livroId, capitulo)
  const unicos = [...new Set(versiculos)].sort((a, b) => a - b)
  const versosTexto = []
  for (const n of unicos) {
    const row = rows[n - 1]
    if (!row?.texto) continue
    versosTexto.push(String(row.texto).trim())
  }

  const blocos = []
  if (unicos.length > 0) {
    let ini = unicos[0]
    let fim = unicos[0]
    for (let i = 1; i < unicos.length; i++) {
      const atual = unicos[i]
      if (atual === fim + 1) {
        fim = atual
      } else {
        blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
        ini = atual
        fim = atual
      }
    }
    blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
  }

  const refc = `${livro.abreviacao} ${capitulo}:${blocos.join(';')}`
  // Formato semelhante à listagem de versículos marcados: referência compacta + texto corrido dos versos.
  const textoEstudo = versosTexto.length > 0 ? `${refc}\n\n${versosTexto.join(' ')}` : refc
  return { textoEstudo, referenciaCompacta: refc }
}

function juntarTextoEstudo(introducao, citacoes) {
  const a = String(introducao || '').trim()
  const b = String(citacoes || '').trim()
  if (!a && !b) return ''
  if (!a) return b
  if (!b) return a
  if (a.includes(b)) return a
  return `${a}\n\n${b}`
}

export default function EstudoBiblicoEditor() {
  const { studyId } = useParams()
  const isEdit = Boolean(studyId)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, isConfigured } = useFirebaseAuth()
  const returnTo = searchParams.get('returnTo')
  const versStr = searchParams.get('versiculos')

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [tema, setTema] = useState('')
  const [textoEstudo, setTextoEstudo] = useState('')
  const [incluirQuestionario, setIncluirQuestionario] = useState(false)
  const [modoProva, setModoProva] = useState(false)
  /** Valor total da prova (ex.: 10 ou 10,5); as questões recebem a divisão automática. */
  const [valorTotalProvaInput, setValorTotalProvaInput] = useState('10')
  const [perguntas, setPerguntas] = useState([])
  const [meta, setMeta] = useState({
    livroId: 0,
    capitulo: 1,
    versiculos: [],
    referenciaCompacta: ''
  })
  const [prefillDone, setPrefillDone] = useState(false)
  const iaEstadoConsumidoRef = useRef(false)
  const [veioDeIa, setVeioDeIa] = useState(false)
  const [incluirDevocional, setIncluirDevocional] = useState(false)
  const [meditacaoDias, setMeditacaoDias] = useState([])
  const [moduleId, setModuleId] = useState('')
  const [publico, setPublico] = useState(false)
  const [modulos, setModulos] = useState([])
  const [dialogConfirmarSaida, setDialogConfirmarSaida] = useState(false)
  const acaoSaidaPendenteRef = useRef(null)
  const snapshotInicialRef = useRef('')

  const livroQ = Number(searchParams.get('livro'))
  const capQ = Number(searchParams.get('capitulo') ?? searchParams.get('cap'))
  const versQ = useMemo(() => parseVersList(versStr), [versStr])

  const valorTotalProvaParsed = useMemo(() => {
    const raw = String(valorTotalProvaInput ?? '').trim()
    if (raw === '') return null
    const v = parseDecimalProvaInput(raw)
    if (!Number.isFinite(v) || v <= 0) return null
    return round2(Math.min(100000, Math.max(0.01, v)))
  }, [valorTotalProvaInput])

  const somaPontosPerguntas = useMemo(
    () => perguntas.reduce((s, q) => s + round2(Number(q?.pontos) || 0), 0),
    [perguntas]
  )

  useEffect(() => {
    if (!modoProva || !incluirQuestionario) return
    if (valorTotalProvaParsed == null) return
    const n = perguntas.length
    if (n === 0) return
    const total = valorTotalProvaParsed
    const parts = splitTotalProvaEntreQuestoes(n, total)
    setPerguntas((prev) => {
      if (prev.length !== n) return prev
      let same = true
      for (let i = 0; i < n; i++) {
        if (round2(prev[i].pontos) !== parts[i]) {
          same = false
          break
        }
      }
      if (same) return prev
      return prev.map((q, i) => ({ ...q, pontos: parts[i] }))
    })
  }, [modoProva, incluirQuestionario, perguntas.length, valorTotalProvaParsed])

  const modulosComOrfaos = useMemo(() => {
    if (!moduleId || modulos.some((m) => m.id === moduleId)) return modulos
    return [
      ...modulos,
      { id: moduleId, nome: '(módulo já não existe — escolha outro ou “Sem módulo”)' }
    ]
  }, [modulos, moduleId])

  const snapshotAtual = useMemo(
    () =>
      JSON.stringify({
        tema,
        textoEstudo,
        incluirQuestionario,
        modoProva,
        perguntas,
        meta,
        incluirDevocional,
        meditacaoDias,
        moduleId,
        publico,
      }),
    [
      tema,
      textoEstudo,
      incluirQuestionario,
      modoProva,
      perguntas,
      meta,
      incluirDevocional,
      meditacaoDias,
      moduleId,
      publico,
    ]
  )
  const temMudancasNaoSalvas = snapshotAtual !== snapshotInicialRef.current
  const possuiConteudoNoNovo = useMemo(
    () =>
      !isEdit &&
      (
        String(tema || '').trim().length > 0 ||
        String(textoEstudo || '').trim().length > 0 ||
        perguntas.length > 0 ||
        meditacaoDias.length > 0 ||
        Number(meta?.livroId || 0) > 0 ||
        Boolean(moduleId) ||
        Boolean(publico)
      ),
    [isEdit, tema, textoEstudo, perguntas.length, meditacaoDias.length, meta?.livroId, moduleId, publico]
  )

  const tentarSairComConfirmacao = useCallback((onConfirmar) => {
    const deveConfirmar = saving ? false : (temMudancasNaoSalvas || possuiConteudoNoNovo)
    if (!deveConfirmar) {
      onConfirmar()
      return
    }
    acaoSaidaPendenteRef.current = onConfirmar
    setDialogConfirmarSaida(true)
  }, [temMudancasNaoSalvas, possuiConteudoNoNovo, saving])

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (saving) return
      if (!temMudancasNaoSalvas && !possuiConteudoNoNovo) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [temMudancasNaoSalvas, possuiConteudoNoNovo, saving])

  useEffect(() => {
    if (!user?.uid) {
      setModulos([])
      return
    }
    let cancel = false
    ;(async () => {
      try {
        const list = await listarModulos(user.uid)
        if (!cancel) setModulos(list)
      } catch {
        if (!cancel) setModulos([])
      }
    })()
    return () => {
      cancel = true
    }
  }, [user?.uid])

  useEffect(() => {
    if (!isEdit || !studyId || !user?.uid) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const s = await obterEstudoBiblico(studyId)
        if (cancel) return
        if (!s) {
          setErr('Estudo não encontrado.')
          return
        }
        if (s.authorUid !== user.uid) {
          setErr('Não tem permissão para editar este estudo.')
          return
        }
        setTema(s.tema || '')
        setTextoEstudo(juntarTextoEstudo(s.introducao, s.citacoes))
        const pq = normalizarPerguntas(s.perguntas)
        const perguntasNorm = pq.map((q) => ({
          tipo: ['multipla_escolha', 'verdadeiro_falso', 'ver_resposta'].includes(String(q?.tipo || ''))
            ? String(q.tipo)
            : 'multipla_escolha',
          pergunta: q.pergunta || '',
          respostaCerta: q.respostaCerta || '',
          respostasErradas: (q.respostasErradas || []).slice(0, 4),
          explicacao: q.explicacao || '',
          pontos: round2(Number(q?.pontos) || 1)
        }))
        const somaSalva = perguntasNorm.reduce((acc, q) => acc + round2(Number(q.pontos) || 0), 0)
        setValorTotalProvaInput(somaSalva > 0 ? formatarNotaProvaPtBr(somaSalva) : '10')
        setIncluirQuestionario(perguntasNorm.length > 0)
        setModoProva(Boolean(s.modoProva))
        setPerguntas(perguntasNorm)
        setMeta({
          livroId: Number(s.livroId) || 0,
          capitulo: Number(s.capitulo) || 1,
          versiculos: Array.isArray(s.versiculos) ? s.versiculos : [],
          referenciaCompacta: s.referenciaCompacta || ''
        })
        const meditacoesNorm = normalizarMeditacaoLista(s.meditacao)
        setIncluirDevocional(meditacoesNorm.length > 0)
        setMeditacaoDias(meditacoesNorm)
        setModuleId(s.moduleId ? String(s.moduleId) : '')
        setPublico(Boolean(s.publico === true || s.acessoPorLink === false))
        snapshotInicialRef.current = JSON.stringify({
          tema: s.tema || '',
          textoEstudo: juntarTextoEstudo(s.introducao, s.citacoes),
          incluirQuestionario: perguntasNorm.length > 0,
          modoProva: Boolean(s.modoProva),
          perguntas: perguntasNorm,
          meta: {
            livroId: Number(s.livroId) || 0,
            capitulo: Number(s.capitulo) || 1,
            versiculos: Array.isArray(s.versiculos) ? s.versiculos : [],
            referenciaCompacta: s.referenciaCompacta || ''
          },
          incluirDevocional: meditacoesNorm.length > 0,
          meditacaoDias: meditacoesNorm,
          moduleId: s.moduleId ? String(s.moduleId) : '',
          publico: Boolean(s.publico === true || s.acessoPorLink === false),
        })
      } catch (e) {
        if (!cancel) setErr(e?.message || 'Erro ao carregar.')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [isEdit, studyId, user?.uid])

  /** Pré-preenche a partir do fluxo "Estudo com IA" (navegação com `location.state`). */
  useEffect(() => {
    if (isEdit) return
    const st = location.state
    const textoIa = st?.textoIaGerado
    if (!textoIa || typeof textoIa !== 'string' || !String(textoIa).trim()) return
    if (iaEstadoConsumidoRef.current) return
    iaEstadoConsumidoRef.current = true
    setVeioDeIa(true)
    const temaIa = String(st.temaIa || '').trim()
    const metaIa = st.metaIa && typeof st.metaIa === 'object' ? st.metaIa : null
    setTextoEstudo(String(textoIa).trim())
    if (temaIa) setTema(temaIa)
    if (metaIa && Number(metaIa.livroId) > 0) {
      setMeta({
        livroId: Number(metaIa.livroId) || 0,
        capitulo: Number(metaIa.capitulo) || 1,
        versiculos: Array.isArray(metaIa.versiculos) ? metaIa.versiculos : [],
        referenciaCompacta: String(metaIa.referenciaCompacta || '')
      })
    }
    setPrefillDone(true)
    snapshotInicialRef.current = JSON.stringify({
      tema: temaIa || '',
      textoEstudo: String(textoIa).trim(),
      incluirQuestionario: false,
      perguntas: [],
      meta:
        metaIa && Number(metaIa.livroId) > 0
          ? {
              livroId: Number(metaIa.livroId) || 0,
              capitulo: Number(metaIa.capitulo) || 1,
              versiculos: Array.isArray(metaIa.versiculos) ? metaIa.versiculos : [],
              referenciaCompacta: String(metaIa.referenciaCompacta || '')
            }
          : {
              livroId: 0,
              capitulo: 1,
              versiculos: [],
              referenciaCompacta: ''
            },
      incluirDevocional: false,
      meditacaoDias: [],
      moduleId: '',
      publico: false
    })
    navigate(`${location.pathname}${location.search || ''}`, { replace: true, state: null })
  }, [isEdit, location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    if (isEdit || prefillDone) return
    // Se já consumimos o `location.state` do fluxo IA (texto completo do estudo),
    // **não** sobrescrevemos com o trecho bíblico. A ref é setada sincronamente
    // no useEffect acima, então no mesmo render evita-se a race: o "Editar e
    // salvar" passa a abrir o editor com o estudo IA, não só com o versículo.
    if (iaEstadoConsumidoRef.current) return
    if (!Number.isInteger(livroQ) || livroQ < 1 || !Number.isInteger(capQ) || capQ < 1 || versQ.length === 0)
      return
    let cancel = false
    ;(async () => {
      try {
        const { textoEstudo: textoAuto, referenciaCompacta } = await textoEstudoFromVersiculos(livroQ, capQ, versQ)
        if (cancel) return
        if (textoAuto) setTextoEstudo(textoAuto)
        setMeta({
          livroId: livroQ,
          capitulo: capQ,
          versiculos: versQ,
          referenciaCompacta
        })
        snapshotInicialRef.current = JSON.stringify({
          tema: '',
          textoEstudo: textoAuto || '',
          incluirQuestionario: false,
          perguntas: [],
          meta: {
            livroId: livroQ,
            capitulo: capQ,
            versiculos: versQ,
            referenciaCompacta
          },
          incluirDevocional: false,
          meditacaoDias: [],
          moduleId: '',
          publico: false,
        })
      } finally {
        if (!cancel) setPrefillDone(true)
      }
    })()
    return () => {
      cancel = true
    }
  }, [isEdit, prefillDone, livroQ, capQ, versQ])

  // Baseline para "novo estudo" sem prefill de versículos.
  useEffect(() => {
    if (isEdit) return
    if (prefillDone) return
    if (Number.isInteger(livroQ) && livroQ >= 1 && Number.isInteger(capQ) && capQ >= 1 && versQ.length > 0) return
    if (!snapshotInicialRef.current) snapshotInicialRef.current = snapshotAtual
  }, [isEdit, prefillDone, livroQ, capQ, versQ, snapshotAtual])

  const setCampoPergunta = useCallback((idx, campo, val) => {
    setPerguntas((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [campo]: val } : p))
    )
  }, [])

  const setErrada = useCallback((idx, ei, val) => {
    setPerguntas((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p
        const arr = [...(p.respostasErradas || [])]
        arr[ei] = val
        return { ...p, respostasErradas: arr }
      })
    )
  }, [])

  const adicionarErrada = useCallback((idx) => {
    setPerguntas((prev) =>
      prev.map((p, i) =>
        i === idx
          ? { ...p, respostasErradas: [...(p.respostasErradas || []), ''].slice(0, 4) }
          : p
      )
    )
  }, [])

  const removerErrada = useCallback((idx, ei) => {
    setPerguntas((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p
        const arr = [...(p.respostasErradas || [])]
        arr.splice(ei, 1)
        return { ...p, respostasErradas: arr }
      })
    )
  }, [])

  const setCampoMeditacao = useCallback((dia, campo, valor) => {
    setMeditacaoDias((prev) =>
      prev.map((m) => (Number(m.dia) === Number(dia) ? { ...m, [campo]: valor } : m))
    )
  }, [])

  const toggleQuestionario = useCallback((on) => {
    setIncluirQuestionario(on)
    if (!on) setModoProva(false)
    setPerguntas((prev) => {
      if (!on) return []
      return prev.length ? prev : [emptyPergunta()]
    })
  }, [])

  const toggleDevocional = useCallback((on) => {
    setIncluirDevocional(on)
    setMeditacaoDias((prev) => {
      if (!on) return []
      return prev.length ? prev : [emptyMeditacaoDia(1)]
    })
  }, [])

  const adicionarPergunta = () => setPerguntas((p) => [...p, emptyPergunta()])
  const removerPergunta = (idx) =>
    setPerguntas((p) => p.filter((_, i) => i !== idx))

  const adicionarDiaDevocional = () =>
    setMeditacaoDias((prev) => [...prev, emptyMeditacaoDia(prev.length + 1)])

  const removerDiaDevocional = (idx) =>
    setMeditacaoDias((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((d, i) => ({ ...d, dia: i + 1 }))
    )

  const validar = () => {
    if (!String(tema).trim()) return 'Indique o tema.'
    if (incluirQuestionario) {
      if (modoProva) {
        const raw = String(valorTotalProvaInput ?? '').trim()
        if (!raw) return 'Indique o valor total da avaliação (ex.: 10 ou 10,5).'
        const vt = parseDecimalProvaInput(raw)
        if (!Number.isFinite(vt) || vt <= 0) {
          return 'Valor total da avaliação inválido. Use um número positivo (vírgula ou ponto, ex.: 10,0).'
        }
      }
      const lista = perguntas
        .map((q) => ({
          tipo: String(q.tipo || 'multipla_escolha'),
          pergunta: String(q.pergunta || '').trim(),
          respostaCerta: String(q.respostaCerta || '').trim(),
          respostasErradas: (q.respostasErradas || []).map((s) => String(s || '').trim()).filter(Boolean),
          explicacao: String(q.explicacao || '').trim()
        }))
        .filter((q) => q.pergunta.length > 0)
      if (!lista.length) return 'Inclua pelo menos uma pergunta com texto.'
      for (const q of lista) {
        if (!q.respostaCerta) return 'Cada pergunta precisa de uma resposta certa.'
        if (q.tipo === 'multipla_escolha' && q.respostasErradas.length > 4) {
          return 'Cada pergunta de múltipla escolha aceita no máximo 4 respostas erradas.'
        }
      }
    }
    if (incluirDevocional) {
      if (!meditacaoDias.length) return 'Adicione pelo menos um dia de devocional.'
      for (const d of meditacaoDias) {
        const dia = Number(d.dia) || 0
        if (!String(d.titulo || '').trim()) return `Preencha o título da devocional do dia ${dia}.`
        if (!String(d.leitura || '').trim()) return `Preencha a leitura da devocional do dia ${dia}.`
        if (!String(d.texto || '').trim()) return `Preencha o texto da devocional do dia ${dia}.`
        if (!String(d.reflexao || '').trim()) return `Preencha a reflexão da devocional do dia ${dia}.`
        if (!String(d.oracao || '').trim()) return `Preencha a oração da devocional do dia ${dia}.`
      }
    }
    return null
  }

  const gravar = async () => {
    const v = validar()
    if (v) {
      setErr(v)
      return
    }
    if (!user?.uid) return
    setSaving(true)
    setErr(null)
    try {
      const authorName = user.displayName || user.email?.split('@')[0] || ''
      const authorEmail = user.email || ''
      const payload = {
        authorName,
        authorEmail,
        tema: tema.trim(),
        introducao: textoEstudo,
        citacoes: '',
        perguntas: incluirQuestionario ? perguntas : [],
        livroId: meta.livroId,
        capitulo: meta.capitulo,
        versiculos: meta.versiculos,
        referenciaCompacta: meta.referenciaCompacta,
        meditacao: incluirDevocional ? meditacaoDias : [],
        devocionalId: 0,
        moduleId: moduleId || null,
        publico,
        modoProva: incluirQuestionario ? modoProva : false
      }
      if (isEdit && studyId) {
        await atualizarEstudoBiblico(studyId, user.uid, payload)
        snapshotInicialRef.current = snapshotAtual
        navigate(`/estudos-biblicos/${studyId}`, { replace: true })
      } else {
        const id = await criarEstudoBiblico(user.uid, payload)
        snapshotInicialRef.current = snapshotAtual
        navigate(`/estudos-biblicos/${id}`, { replace: true })
      }
    } catch (e) {
      setErr(e?.message || 'Não foi possível guardar.')
    } finally {
      setSaving(false)
    }
  }

  if (!isConfigured) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
        <Alert severity="warning">Firebase não configurado.</Alert>
      </Box>
    )
  }

  if (user === undefined || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
        <Alert severity="info">Faça login para criar ou editar estudos.</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/chat')}>
          Entrar
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, pt: 2, pb: 8, maxWidth: 720, mx: 'auto' }}>
      {returnTo && (
        <IconButton
          aria-label="Voltar"
          onClick={() => tentarSairComConfirmacao(() => navigate(returnTo))}
          sx={{ mb: 0.5 }}
        >
          <NavigateBefore />
        </IconButton>
      )}
      <Typography variant="h6" gutterBottom>
        {isEdit ? 'Editar estudo compartilhado' : 'Novo estudo compartilhado'}
      </Typography>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <TextField
        label="Tema"
        value={tema}
        onChange={(e) => setTema(e.target.value)}
        fullWidth
        margin="normal"
        required
      />

      <FormControl fullWidth margin="normal">
        <InputLabel id="estudo-modulo-label">Módulo</InputLabel>
        <Select
          labelId="estudo-modulo-label"
          label="Módulo"
          value={moduleId || ''}
          onChange={(e) => setModuleId(e.target.value)}
        >
          <MenuItem value="">Sem módulo</MenuItem>
          {modulosComOrfaos.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.nome || m.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        sx={{ mt: 0.5, mb: 0 }}
        control={
          <Switch
            checked={publico}
            onChange={(e) => setPublico(e.target.checked)}
            color="primary"
          />
        }
        label="Tornar este estudo público nas pesquisas de temas"
      />
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5, mb: 1, pl: 0.5, maxWidth: 560 }}>
        Se desligado, este material só será visualizado via link.
      </Typography>

      <TextField
        label="Texto do Estudo"
        value={textoEstudo}
        onChange={(e) => setTextoEstudo(e.target.value)}
        fullWidth
        margin="normal"
        multiline
        minRows={veioDeIa || String(textoEstudo || '').length > 600 ? 18 : 6}
        maxRows={40}
        helperText={
          meta.referenciaCompacta
            ? `Referência sugerida: ${meta.referenciaCompacta}. As referências bíblicas digitadas aqui já ficam clicáveis.`
            : 'Digite o conteúdo do estudo. Referências bíblicas inseridas no texto ficam clicáveis.'
        }
      />

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
        Incluir questionário após o estudo?
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button variant={incluirQuestionario ? 'contained' : 'outlined'} onClick={() => toggleQuestionario(true)}>
          Sim
        </Button>
        <Button variant={!incluirQuestionario ? 'contained' : 'outlined'} onClick={() => toggleQuestionario(false)}>
          Não
        </Button>
      </Box>

      {incluirQuestionario && (
        <>
          <FormControlLabel
            sx={{ mb: 2, display: 'block' }}
            control={
              <Switch
                checked={modoProva}
                onChange={(e) => setModoProva(e.target.checked)}
                color="primary"
              />
            }
            label="Modo avaliação (respostas e nota só ao final; envio ao editor pelo chat)"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tipo por pergunta: Ver resposta, Múltipla escolha ou Verdadeiro/Falso. Em modo avaliação, defina apenas o{' '}
            <strong>valor total</strong> da avaliação (ex.: 10 ou 10,5); o app divide em partes iguais entre as
            questões, com soma exata em centésimos (ex.: 10 ÷ 3 → 3,33 + 3,33 + 3,34).
          </Typography>
          {modoProva ? (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                alignItems: 'flex-start',
                mb: 2,
                p: 1.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover'
              }}
            >
              <TextField
                label="Valor total da avaliação"
                size="small"
                value={valorTotalProvaInput}
                onChange={(e) => setValorTotalProvaInput(e.target.value)}
                sx={{ width: 220 }}
                placeholder="10 ou 10,5"
                helperText="Vírgula ou ponto. Os pontos de cada questão atualizam sozinhos."
              />
              <Typography variant="body2" color="text.secondary" sx={{ flex: '1 1 220px', pt: 0.5 }}>
                Soma das questões agora: <strong>{formatarNotaProvaPtBr(somaPontosPerguntas)}</strong> ·{' '}
                {perguntas.length} questão(ões)
              </Typography>
            </Box>
          ) : null}
          {perguntas.map((q, idx) => (
        <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">{idx + 1}ª pergunta</Typography>
            {perguntas.length > 0 && (
              <IconButton size="small" aria-label="Remover pergunta" onClick={() => removerPergunta(idx)}>
                <DeleteOutline />
              </IconButton>
            )}
          </Box>
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel id={`tipo-pergunta-${idx}`}>Tipo da pergunta</InputLabel>
            <Select
              labelId={`tipo-pergunta-${idx}`}
              label="Tipo da pergunta"
              value={q.tipo || 'multipla_escolha'}
              onChange={(e) => setCampoPergunta(idx, 'tipo', e.target.value)}
            >
              <MenuItem value="ver_resposta">Ver resposta</MenuItem>
              <MenuItem value="multipla_escolha">Múltipla escolha</MenuItem>
              <MenuItem value="verdadeiro_falso">Verdadeiro/Falso</MenuItem>
            </Select>
          </FormControl>
          {modoProva ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 0.5 }}>
              Pontos desta questão (automático):{' '}
              <strong>{formatarNotaProvaPtBr(Number(q.pontos) || 0)}</strong>
            </Typography>
          ) : null}
          <TextField
            label="Pergunta"
            value={q.pergunta}
            onChange={(e) => setCampoPergunta(idx, 'pergunta', e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            multiline
          />
          <TextField
            label="Resposta certa"
            value={q.respostaCerta}
            onChange={(e) => setCampoPergunta(idx, 'respostaCerta', e.target.value)}
            fullWidth
            size="small"
            margin="dense"
          />
          {(q.tipo || 'multipla_escolha') === 'verdadeiro_falso' ? (
            <FormControl fullWidth size="small" margin="dense">
              <InputLabel id={`vf-certa-${idx}`}>Resposta certa</InputLabel>
              <Select
                labelId={`vf-certa-${idx}`}
                label="Resposta certa"
                value={q.respostaCerta || 'Verdadeiro'}
                onChange={(e) => setCampoPergunta(idx, 'respostaCerta', e.target.value)}
              >
                <MenuItem value="Verdadeiro">Verdadeiro</MenuItem>
                <MenuItem value="Falso">Falso</MenuItem>
              </Select>
            </FormControl>
          ) : null}
          {(q.tipo || 'multipla_escolha') === 'multipla_escolha' ? (
            <>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Respostas erradas (opcional, até 4)
              </Typography>
              {(q.respostasErradas || []).map((err, ei) => (
                <Box key={ei} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label={`Errada ${ei + 1}`}
                    value={err || ''}
                    onChange={(e) => setErrada(idx, ei, e.target.value)}
                    fullWidth
                    size="small"
                    margin="dense"
                  />
                  <IconButton size="small" onClick={() => removerErrada(idx, ei)} aria-label="Remover errada">
                    <DeleteOutline />
                  </IconButton>
                </Box>
              ))}
              <Button
                size="small"
                onClick={() => adicionarErrada(idx)}
                disabled={(q.respostasErradas || []).length >= 4}
                sx={{ mt: 0.5 }}
              >
                Adicionar resposta errada
              </Button>
            </>
          ) : null}
          <TextField
            label="Explicação"
            value={q.explicacao}
            onChange={(e) => setCampoPergunta(idx, 'explicacao', e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            multiline
            minRows={2}
          />
        </Paper>
          ))}
          <Button startIcon={<Add />} onClick={adicionarPergunta} sx={{ mb: 2 }}>
            Incluir mais uma pergunta
          </Button>
        </>
      )}

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
        Incluir devocional ao final do estudo?
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button variant={incluirDevocional ? 'contained' : 'outlined'} onClick={() => toggleDevocional(true)}>
          Sim
        </Button>
        <Button variant={!incluirDevocional ? 'contained' : 'outlined'} onClick={() => toggleDevocional(false)}>
          Não
        </Button>
      </Box>

      {incluirDevocional && (
        <>
          {meditacaoDias.map((dia, idx) => (
            <Paper key={`med-${idx}`} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Devocional {idx + 1}
                </Typography>
                <IconButton size="small" aria-label="Remover devocional" onClick={() => removerDiaDevocional(idx)}>
                  <DeleteOutline />
                </IconButton>
              </Box>
              <TextField
                label="Título"
                value={dia.titulo}
                onChange={(e) => setCampoMeditacao(dia.dia, 'titulo', e.target.value)}
                fullWidth
                size="small"
                margin="dense"
              />
              <TextField
                label="Leitura bíblica (ex.: Jo 3:16-21)"
                value={dia.leitura}
                onChange={(e) => setCampoMeditacao(dia.dia, 'leitura', e.target.value)}
                fullWidth
                size="small"
                margin="dense"
              />
              <TextField
                label="Texto"
                value={dia.texto}
                onChange={(e) => setCampoMeditacao(dia.dia, 'texto', e.target.value)}
                fullWidth
                size="small"
                margin="dense"
                multiline
                minRows={3}
              />
              <TextField
                label="Reflexão"
                value={dia.reflexao}
                onChange={(e) => setCampoMeditacao(dia.dia, 'reflexao', e.target.value)}
                fullWidth
                size="small"
                margin="dense"
                multiline
                minRows={2}
              />
              <TextField
                label="Oração"
                value={dia.oracao}
                onChange={(e) => setCampoMeditacao(dia.dia, 'oracao', e.target.value)}
                fullWidth
                size="small"
                margin="dense"
                multiline
                minRows={2}
              />
              <TextField
                label="Conselho pastoral (opcional)"
                value={dia.conselho_pastoral}
                onChange={(e) => setCampoMeditacao(dia.dia, 'conselho_pastoral', e.target.value)}
                fullWidth
                size="small"
                margin="dense"
                multiline
                minRows={2}
              />
              <TextField
                label="Desafio (opcional)"
                value={dia.desafio}
                onChange={(e) => setCampoMeditacao(dia.dia, 'desafio', e.target.value)}
                fullWidth
                size="small"
                margin="dense"
                multiline
                minRows={2}
              />
            </Paper>
          ))}
          <Button startIcon={<Add />} onClick={adicionarDiaDevocional} sx={{ mb: 2 }}>
            Incluir mais um dia devocional
          </Button>
        </>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" disabled={saving} onClick={() => void gravar()}>
          {saving ? 'A guardar…' : 'Guardar estudo'}
        </Button>
        <Button disabled={saving} onClick={() => tentarSairComConfirmacao(() => navigate(-1))}>
          Voltar
        </Button>
      </Box>

      <Dialog open={dialogConfirmarSaida} onClose={() => setDialogConfirmarSaida(false)}>
        <DialogTitle>Sair sem guardar?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Você tem alterações não salvas neste estudo. Se sair agora, esse conteúdo pode ser perdido.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogConfirmarSaida(false)}>Continuar editando</Button>
          <Button
            color="error"
            onClick={() => {
              const fn = acaoSaidaPendenteRef.current
              acaoSaidaPendenteRef.current = null
              setDialogConfirmarSaida(false)
              if (typeof fn === 'function') fn()
            }}
          >
            Sair sem guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Button,
  Alert,
  Paper,
  Stack,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import AutoAwesome from '@mui/icons-material/AutoAwesome'
import ContentCopy from '@mui/icons-material/ContentCopy'
import EditNote from '@mui/icons-material/EditNote'
import Edit from '@mui/icons-material/Edit'
import IosShareIcon from '@mui/icons-material/IosShareOutlined'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt'
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined'
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import StarIcon from '@mui/icons-material/Star'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { sxMinViewportHeight } from '../utils/viewportHeight'
import {
  iaGeminiDisponivel,
  montarPericopeLida,
  gerarEstudoPericopeCompleto,
  formatarReferenciaCompactaPericope,
  limparVazamentoRaciocinioIa
} from '../services/bibliaPassagemEstudoIaService'
import {
  lerPericopeCurada,
  lerPericopeCandidata,
  salvarPericopeCurada,
  removerPericopeCurada,
  publicarPericopeCandidata,
  descartarPericopeCandidata,
  registrarVotoPericope,
  lerMeuVotoPericope
} from '../services/estudosCuradosService'
import { sxCorpoTextoIa } from '../utils/iaTextoStyles'
import { buscarIntervaloVersiculos } from '../services/bibliaService'
import VersiculoPopup from '../components/VersiculoPopup'
import { openNativeShareSheet } from '../utils/nativeShare'
import { useEhAdmin } from '../hooks/useEhAdmin'
import {
  lerCooldownIa,
  registrarCooldownIa,
  mensagemCooldownIa
} from '../utils/iaCooldown'
import {
  idCanonicoPericope,
  podeGerar,
  marcarGerado
} from '../utils/iaGeracaoLimites'
import { normalizarTom, TONS_IDS, TOM_PADRAO, sufixoChaveCacheTom } from '../utils/iaTonalidade'
import {
  confirmarAsync,
  copiarParaAreaTransferencia,
  mostrarSnackbar
} from '../utils/uiDialogs'

/** Ordem ao carregar conteúdo existente: preferir chave canônica. */
const ORDEM_CARGA_TONS = [TOM_PADRAO, ...TONS_IDS.filter((t) => t !== TOM_PADRAO)]

/* ------------------------------------------------------------------ *
 * Cache local (localStorage) para o estudo da perícope.
 * A chave pode incluir sufixo de tom legado (`~…`); o padrão atual não usa sufixo.
 * ------------------------------------------------------------------ */
const PREFIXO_CACHE_LOCAL = 'salvation-ia-pericope:'

function chaveCachePericope(livroId, capitulo, inicio, fim, tom) {
  return `${PREFIXO_CACHE_LOCAL}${Number(livroId) || 0}:${Number(capitulo) || 0}:${Number(inicio) || 0}:${Number(fim) || 0}${sufixoChaveCacheTom(tom)}`
}
function lerCachePericope(livroId, capitulo, inicio, fim, tom) {
  try {
    const raw = localStorage.getItem(chaveCachePericope(livroId, capitulo, inicio, fim, tom))
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p.texto !== 'string' || !p.texto.trim()) return null
    return p
  } catch (_) {
    return null
  }
}
function gravarCachePericope(livroId, capitulo, inicio, fim, payload, tom) {
  try {
    localStorage.setItem(
      chaveCachePericope(livroId, capitulo, inicio, fim, tom),
      JSON.stringify(payload)
    )
  } catch (_) { /* ignore */ }
}
function apagarCachePericope(livroId, capitulo, inicio, fim, tom) {
  try {
    localStorage.removeItem(chaveCachePericope(livroId, capitulo, inicio, fim, tom))
  } catch (_) { /* ignore */ }
}

function renderInlineMarkdown(line) {
  const partes = []
  const regex = /\*\*([^*]+)\*\*/g
  let last = 0
  let m
  let i = 0
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) partes.push(line.slice(last, m.index))
    partes.push(
      <Box key={`b-${i++}`} component="strong" sx={{ fontWeight: 700 }}>
        {m[1]}
      </Box>
    )
    last = regex.lastIndex
  }
  if (last < line.length) partes.push(line.slice(last))
  return partes.length ? partes : line
}

function renderLinhasEstudo(texto, lineHeightCss = 1.65) {
  const linhas = String(texto || '').split('\n')
  return linhas.map((line, i) => {
    const trimmed = line.trimEnd()
    if (trimmed.startsWith('## ')) {
      return (
        <Typography
          key={i}
          component="h2"
          variant="h6"
          sx={{ mt: i === 0 ? 0 : 2.5, mb: 1, fontWeight: 700, textAlign: 'left' }}
        >
          {trimmed.slice(3).trim()}
        </Typography>
      )
    }
    if (trimmed.startsWith('### ')) {
      return (
        <Typography
          key={i}
          component="h3"
          variant="subtitle1"
          sx={{ mt: 1.5, mb: 0.5, fontWeight: 700, textAlign: 'left' }}
        >
          {trimmed.slice(4).trim()}
        </Typography>
      )
    }
    if (trimmed === '') return <Box key={i} sx={{ height: 8 }} />
    return (
      <Typography
        key={i}
        variant="body1"
        sx={{
          whiteSpace: 'pre-wrap',
          lineHeight: lineHeightCss,
          ...sxCorpoTextoIa,
        }}
      >
        {renderInlineMarkdown(line)}
      </Typography>
    )
  })
}

/**
 * Página de estudo IA por perícope.
 *
 * Carrega a primeira versão disponível (oficial/candidato/cache), preferindo a
 * chave canônica. Geração usa matizes integrados no pedido à IA (sem seletor na UI).
 * Cooldown 24h por perícope + cota global. `?refresh=1` só para admin.
 */
export default function EstudoBiblicoIaPericope() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useFirebaseAuth()
  const { fontSize, fontFamily, lineHeight } = useApp()
  const { ehAdmin, carregando: adminCarregando } = useEhAdmin(user?.uid || null)

  const returnToParam = searchParams.get('returnTo') || '/'
  const livroQ = Number(searchParams.get('livro'))
  const capQ = Number(searchParams.get('capitulo') ?? searchParams.get('cap'))
  const iniQ = Number(searchParams.get('inicio'))
  const fimQ = Number(searchParams.get('fim'))
  const tituloHint = searchParams.get('titulo') || ''
  const forcarRefresh = searchParams.get('refresh') === '1'

  const paramsValidos = useMemo(
    () =>
      Number.isInteger(livroQ) && livroQ >= 1 &&
      Number.isInteger(capQ) && capQ >= 1 &&
      Number.isInteger(iniQ) && iniQ >= 1 &&
      Number.isInteger(fimQ) && fimQ >= iniQ,
    [livroQ, capQ, iniQ, fimQ]
  )

  const [fase, setFase] = useState('loading') // loading | ready | error | cooldown
  const [erroIa, setErroIa] = useState('')
  const [erroParam, setErroParam] = useState('')
  const [cooldown, setCooldown] = useState(null)
  const [textoGerado, setTextoGerado] = useState('')
  const [referencia, setReferencia] = useState('')
  const [tituloPericope, setTituloPericope] = useState('')
  const [menuShareAnchor, setMenuShareAnchor] = useState(null)
  const [origem, setOrigem] = useState('novo')
  const [meuVoto, setMeuVoto] = useState(null)
  const [salvandoAcao, setSalvandoAcao] = useState(false)
  const [dialogSaidaAberto, setDialogSaidaAberto] = useState(false)
  const [popupVersiculos, setPopupVersiculos] = useState(null)
  const [editandoAdmin, setEditandoAdmin] = useState(false)
  const [rascunhoAdmin, setRascunhoAdmin] = useState('')
  const [adminSaveErro, setAdminSaveErro] = useState('')

  const [tomCarregado, setTomCarregado] = useState(TOM_PADRAO)
  const tentativaSaidaRef = useRef(null)

  const idCanonicoPassagem = useMemo(
    () => (paramsValidos ? idCanonicoPericope(livroQ, capQ, iniQ, fimQ) : ''),
    [paramsValidos, livroQ, capQ, iniQ, fimQ]
  )

  const exigeAvaliacao = origem === 'novo' && !meuVoto && Boolean(textoGerado)

  const sxLeitura = useMemo(
    () => ({
      fontSize: `${(fontSize || 100) / 100}rem`,
      fontFamily: resolveFontFamily(fontFamily),
      lineHeight: readingLineHeightToCss(lineHeight)
    }),
    [fontSize, fontFamily, lineHeight]
  )

  const lineHeightCss = useMemo(() => readingLineHeightToCss(lineHeight), [lineHeight])

  const referenciaExibicao = useMemo(() => {
    if (!paramsValidos) return ''
    const r = String(referencia || '').trim()
    if (r) return r
    return formatarReferenciaCompactaPericope(livroQ, capQ, iniQ, fimQ) || ''
  }, [paramsValidos, referencia, livroQ, capQ, iniQ, fimQ])

  const abrirBibliotecaEstudos = useCallback(() => {
    navigate(
      `/biblioteca-estudos?returnTo=${encodeURIComponent(
        `${window.location.pathname}${window.location.search}`
      )}`
    )
  }, [navigate])

  const abrirPopupReferencia = useCallback(async () => {
    if (!paramsValidos) return
    try {
      const { versiculos } = await buscarIntervaloVersiculos(livroQ, capQ, iniQ, fimQ)
      if (versiculos?.length) setPopupVersiculos(versiculos)
    } catch (e) {
      console.error(e)
      mostrarSnackbar({ mensagem: 'Não foi possível carregar o texto da perícope.', severidade: 'error' })
    }
  }, [paramsValidos, livroQ, capQ, iniQ, fimQ])

  const queryEditor = useMemo(() => {
    const versRange = []
    for (let n = iniQ; n <= fimQ; n++) versRange.push(n)
    const q = new URLSearchParams({
      livro: String(livroQ),
      capitulo: String(capQ),
      versiculos: versRange.join(','),
      returnTo: returnToParam
    })
    return `/estudos-biblicos/novo?${q.toString()}`
  }, [livroQ, capQ, iniQ, fimQ, returnToParam])

  /** Gera o estudo da perícope (chave canônica; matizes só no prompt). */
  const gerar = useCallback(
    async () => {
      if (!paramsValidos) return
      const tomAlvo = TOM_PADRAO

      if (!iaGeminiDisponivel()) {
        setFase('error')
        setErroIa('Não foi possível preparar o estudo agora.')
        return
      }
      const cd = lerCooldownIa()
      if (cd.ativo) {
        setCooldown(cd)
        setFase('cooldown')
        return
      }
      const pg = podeGerar({ tipo: 'pericope', id: idCanonicoPassagem, admin: ehAdmin })
      if (!pg.ok) {
        setFase('error')
        setErroIa(pg.mensagem || 'Não foi possível gerar o estudo agora.')
        return
      }

      setFase('loading')
      setErroIa('')

      const pass = await montarPericopeLida(livroQ, capQ, iniQ, fimQ, tituloHint)
      if (!pass.ok) {
        setFase('error')
        setErroIa(pass.error || 'Não foi possível carregar a perícope.')
        return
      }
      setReferencia(pass.referencia)
      setTituloPericope(pass.titulo || '')

      const r = await gerarEstudoPericopeCompleto({
        referencia: pass.referencia,
        titulo: pass.titulo,
        texto: pass.texto,
        tom: tomAlvo
      })
      if (!r.ok) {
        if (r.code === 'QUOTA_EXCEEDED' || r.code === 'RATE_LIMIT' || r.code === 'OVERLOADED') {
          const novoCd = registrarCooldownIa(r.code)
          setCooldown(novoCd)
          setFase('cooldown')
          return
        }
        setFase('error')
        setErroIa('Não foi possível preparar o estudo agora.')
        return
      }
      const texto = limparVazamentoRaciocinioIa(String(r.text || ''))
      setTextoGerado(texto)
      setOrigem('novo')
      setMeuVoto(null)
      setTomCarregado(tomAlvo)
      gravarCachePericope(
        livroQ,
        capQ,
        iniQ,
        fimQ,
        { texto, titulo: pass.titulo, referencia: pass.referencia },
        tomAlvo
      )
      marcarGerado({ tipo: 'pericope', id: idCanonicoPassagem, admin: ehAdmin })
      setFase('ready')
    },
    [paramsValidos, livroQ, capQ, iniQ, fimQ, tituloHint, idCanonicoPassagem, ehAdmin]
  )

  const cargaMountIdRef = useRef(0)

  const carregarTextoDoTom = useCallback(
    async (tomBruto) => {
      const tomAlvo = normalizarTom(tomBruto)

      const curado = await lerPericopeCurada(livroQ, capQ, iniQ, fimQ, tomAlvo)
      if (curado?.texto) {
        setTextoGerado(limparVazamentoRaciocinioIa(curado.texto))
        setReferencia(curado.referencia || '')
        setTituloPericope(curado.titulo || '')
        setOrigem('oficial')
        setTomCarregado(tomAlvo)
        if (user?.uid) {
          const v = await lerMeuVotoPericope({
            livroId: livroQ, capitulo: capQ, inicio: iniQ, fim: fimQ, uid: user.uid, tom: tomAlvo
          })
          setMeuVoto(v)
        } else { setMeuVoto(null) }
        setFase('ready')
        return true
      }

      const cand = await lerPericopeCandidata(livroQ, capQ, iniQ, fimQ, tomAlvo)
      if (cand?.texto) {
        setTextoGerado(limparVazamentoRaciocinioIa(cand.texto))
        setReferencia(cand.referencia || '')
        setTituloPericope(cand.titulo || '')
        setOrigem('candidato')
        setTomCarregado(tomAlvo)
        if (user?.uid) {
          const v = await lerMeuVotoPericope({
            livroId: livroQ, capitulo: capQ, inicio: iniQ, fim: fimQ, uid: user.uid, tom: tomAlvo
          })
          setMeuVoto(v)
        } else { setMeuVoto(null) }
        setFase('ready')
        return true
      }

      const cache = lerCachePericope(livroQ, capQ, iniQ, fimQ, tomAlvo)
      if (cache?.texto) {
        setTextoGerado(limparVazamentoRaciocinioIa(cache.texto))
        setReferencia(cache.referencia || '')
        setTituloPericope(cache.titulo || '')
        setOrigem('novo')
        setTomCarregado(tomAlvo)
        if (user?.uid) {
          const v = await lerMeuVotoPericope({
            livroId: livroQ, capitulo: capQ, inicio: iniQ, fim: fimQ, uid: user.uid, tom: tomAlvo
          })
          setMeuVoto(v)
          if (v === 'positivo') setOrigem('candidato')
        } else { setMeuVoto(null) }
        setFase('ready')
        return true
      }
      return false
    },
    [livroQ, capQ, iniQ, fimQ, user?.uid]
  )

  const carregarPrimeiroTomDisponivel = useCallback(async () => {
    for (const id of ORDEM_CARGA_TONS) {
      if (await carregarTextoDoTom(id)) return true
    }
    return false
  }, [carregarTextoDoTom])

  useEffect(() => {
    if (user === null) {
      navigate('/chat')
      return
    }
    if (user === undefined) return
    if (!paramsValidos) {
      setErroParam('Parâmetros inválidos. Volte à Bíblia, selecione uma perícope e abra de novo.')
      setFase('error')
      return
    }

    const mountId = ++cargaMountIdRef.current
    setFase('loading')
    setErroParam('')
    setErroIa('')

    ;(async () => {
      const refreshEfetivo = forcarRefresh && ehAdmin
      if (refreshEfetivo) {
        for (const id of TONS_IDS) apagarCachePericope(livroQ, capQ, iniQ, fimQ, id)
        await gerar()
        return
      }

      const carregou = await carregarPrimeiroTomDisponivel()
      if (mountId !== cargaMountIdRef.current) return
      if (!carregou) await gerar()
    })()
  }, [user, navigate, paramsValidos, forcarRefresh, ehAdmin, livroQ, capQ, iniQ, fimQ, gerar, carregarPrimeiroTomDisponivel])

  const acaoComAvaliacaoPrevia = useCallback((callback) => {
    if (!exigeAvaliacao) { callback(); return }
    tentativaSaidaRef.current = callback
    setDialogSaidaAberto(true)
  }, [exigeAvaliacao])

  const copiar = useCallback(async () => {
    if (!textoGerado) return
    await copiarParaAreaTransferencia(textoGerado, {
      mensagemSucesso: 'Estudo copiado.',
      tituloFallback: 'Copie o texto do estudo'
    })
  }, [textoGerado])

  const abrirNoEditor = useCallback(() => {
    const tema = referencia
      ? `Estudo da perícope — ${referencia}${tituloPericope ? ` (${tituloPericope})` : ''}`
      : 'Estudo da perícope'
    navigate(queryEditor, {
      state: {
        textoIaGerado: textoGerado,
        temaIa: tema,
        metaIa: { livroId: livroQ, capitulo: capQ, inicio: iniQ, fim: fimQ, referenciaCompacta: referencia }
      }
    })
  }, [referencia, navigate, queryEditor, textoGerado, tituloPericope, livroQ, capQ, iniQ, fimQ])

  const compartilharNativo = useCallback(async () => {
    const titulo = referencia
      ? `Estudo compartilhado — ${referencia}${tituloPericope ? ` (${tituloPericope})` : ''}`
      : 'Estudo compartilhado'
    const txt = `${titulo}\n\n${textoGerado}`
    try {
      const opened = await openNativeShareSheet({ title: titulo, text: txt })
      if (opened) return
    } catch { /* fallback */ }
    await copiarParaAreaTransferencia(txt, {
      mensagemSucesso: 'Estudo copiado.',
      tituloFallback: 'Copie o texto do estudo'
    })
  }, [referencia, textoGerado, tituloPericope])

  const voltar = useCallback(() => {
    const indo = () => {
      try { navigate(returnToParam.startsWith('/') ? returnToParam : '/') }
      catch { navigate('/') }
    }
    acaoComAvaliacaoPrevia(indo)
  }, [navigate, returnToParam, acaoComAvaliacaoPrevia])

  /* ------------------ VOTOS ------------------ */

  const votarUtil = useCallback(async () => {
    if (!user?.uid || !textoGerado) return
    setSalvandoAcao(true)
    try {
      const tomVoto = normalizarTom(tomCarregado)
      await registrarVotoPericope({
        livroId: livroQ, capitulo: capQ, inicio: iniQ, fim: fimQ, voto: 'positivo', uid: user.uid, tom: tomVoto
      })
      if (origem === 'novo') {
        await publicarPericopeCandidata({
          livroId: livroQ,
          capitulo: capQ,
          inicio: iniQ,
          fim: fimQ,
          texto: textoGerado,
          titulo: tituloPericope || '',
          referencia,
          uidAutor: user.uid,
          tom: tomVoto
        })
        setOrigem('candidato')
      }
      setMeuVoto('positivo')
      mostrarSnackbar({ mensagem: 'Obrigado! Seu retorno foi registrado.', severidade: 'success' })
      const acao = tentativaSaidaRef.current
      tentativaSaidaRef.current = null
      setDialogSaidaAberto(false)
      if (typeof acao === 'function') acao()
    } finally { setSalvandoAcao(false) }
  }, [user?.uid, textoGerado, origem, livroQ, capQ, iniQ, fimQ, referencia, tituloPericope, tomCarregado])

  const votarNaoUtil = useCallback(async () => {
    if (!user?.uid) return
    setSalvandoAcao(true)
    try {
      const tomVoto = normalizarTom(tomCarregado)
      await registrarVotoPericope({
        livroId: livroQ, capitulo: capQ, inicio: iniQ, fim: fimQ, voto: 'negativo', uid: user.uid, tom: tomVoto
      })
      if (origem === 'novo') apagarCachePericope(livroQ, capQ, iniQ, fimQ, tomVoto)
      setMeuVoto('negativo')
      mostrarSnackbar({ mensagem: 'Obrigado pelo retorno — vamos rever este estudo.', severidade: 'success' })
      const acao = tentativaSaidaRef.current
      tentativaSaidaRef.current = null
      setDialogSaidaAberto(false)
      if (typeof acao === 'function') acao()
    } finally { setSalvandoAcao(false) }
  }, [user?.uid, origem, livroQ, capQ, iniQ, fimQ, tomCarregado])

  /* ------------------ AÇÕES ADMIN ------------------ */

  const aprovarComoOficial = useCallback(async () => {
    if (!ehAdmin || !user?.uid || !textoGerado) return
    setSalvandoAcao(true)
    try {
      const r = await salvarPericopeCurada({
        livroId: livroQ, capitulo: capQ, inicio: iniQ, fim: fimQ,
        texto: textoGerado, titulo: tituloPericope || '', referencia,
        uidAutor: user.uid,
        tom: tomCarregado
      })
      if (r.ok) {
        setOrigem('oficial')
        mostrarSnackbar({ mensagem: 'Estudo definido como oficial.', severidade: 'success' })
      } else {
        mostrarSnackbar({ mensagem: `Não foi possível salvar: ${r.error || 'erro'}`, severidade: 'error' })
      }
    } finally { setSalvandoAcao(false) }
  }, [ehAdmin, user?.uid, textoGerado, livroQ, capQ, iniQ, fimQ, referencia, tituloPericope, tomCarregado])

  const removerCuradoria = useCallback(async () => {
    if (!ehAdmin) return
    const ok = await confirmarAsync({
      titulo: 'Remover este estudo da seleção oficial?',
      mensagem: 'Outros usuários voltarão a ver uma versão preparada na hora. O texto candidato (caso exista) continua disponível.',
      textoConfirmar: 'Remover',
      textoCancelar: 'Cancelar'
    })
    if (!ok) return
    setSalvandoAcao(true)
    try {
      const r = await removerPericopeCurada(livroQ, capQ, iniQ, fimQ, tomCarregado)
      if (r.ok) {
        const carregou = await carregarTextoDoTom(tomCarregado)
        if (!carregou) {
          setTextoGerado('')
          setOrigem('novo')
          setMeuVoto(null)
        }
        mostrarSnackbar({ mensagem: 'Removido da seleção oficial.', severidade: 'info' })
      } else {
        mostrarSnackbar({ mensagem: `Não foi possível remover: ${r.error || 'erro'}`, severidade: 'error' })
      }
    } finally { setSalvandoAcao(false) }
  }, [ehAdmin, livroQ, capQ, iniQ, fimQ, tomCarregado, carregarTextoDoTom])

  const iniciarEdicaoAdmin = useCallback(() => {
    setAdminSaveErro('')
    setRascunhoAdmin(textoGerado || '')
    setEditandoAdmin(true)
  }, [textoGerado])

  const salvarEdicaoAdmin = useCallback(async () => {
    if (!ehAdmin || !user?.uid) return
    setAdminSaveErro('')
    const limpo = String(rascunhoAdmin || '').trim()
    if (!limpo) {
      setAdminSaveErro('O texto não pode ficar vazio.')
      return
    }
    setSalvandoAcao(true)
    try {
      const r = await salvarPericopeCurada({
        livroId: livroQ,
        capitulo: capQ,
        inicio: iniQ,
        fim: fimQ,
        texto: limpo,
        titulo: tituloPericope || '',
        referencia,
        uidAutor: user.uid,
        tom: tomCarregado
      })
      if (!r.ok) {
        setAdminSaveErro(r.error || 'Não foi possível salvar a edição.')
        return
      }
      setTextoGerado(limpo)
      setOrigem('oficial')
      gravarCachePericope(livroQ, capQ, iniQ, fimQ, {
        texto: limpo,
        referencia,
        titulo: tituloPericope || ''
      }, tomCarregado)
      setEditandoAdmin(false)
      setRascunhoAdmin('')
      mostrarSnackbar({ mensagem: 'Texto corrigido e publicado como oficial.', severidade: 'success' })
    } finally {
      setSalvandoAcao(false)
    }
  }, [
    ehAdmin,
    user?.uid,
    rascunhoAdmin,
    livroQ,
    capQ,
    iniQ,
    fimQ,
    tituloPericope,
    referencia,
    tomCarregado
  ])

  const descartarERegerarAdmin = useCallback(async () => {
    if (!ehAdmin || !textoGerado) return
    const ok = await confirmarAsync({
      titulo: 'Apagar este texto e regerar?',
      mensagem:
        'Remove a versão oficial e o candidato (se existirem), zera votos e gera um estudo novo pela IA.',
      textoConfirmar: 'Apagar e regerar',
      textoCancelar: 'Cancelar'
    })
    if (!ok) return
    setSalvandoAcao(true)
    try {
      if (origem === 'oficial') {
        await removerPericopeCurada(livroQ, capQ, iniQ, fimQ, tomCarregado)
      }
      const r = await descartarPericopeCandidata({
        livroId: livroQ, capitulo: capQ, inicio: iniQ, fim: fimQ, tom: tomCarregado
      })
      if (!r.ok) {
        mostrarSnackbar({ mensagem: `Não foi possível descartar: ${r.error || 'erro'}`, severidade: 'error' })
        return
      }
      apagarCachePericope(livroQ, capQ, iniQ, fimQ, tomCarregado)
      setMeuVoto(null)
      setOrigem('novo')
      setTextoGerado('')
      setEditandoAdmin(false)
      setRascunhoAdmin('')
      setFase('loading')
      await gerar()
    } finally {
      setSalvandoAcao(false)
    }
  }, [ehAdmin, textoGerado, origem, livroQ, capQ, iniQ, fimQ, tomCarregado, gerar])

  /* ------------------ SHARE OVERRIDE ------------------ */

  useEffect(() => {
    if (typeof window === 'undefined') return
    const override = async () => {
      acaoComAvaliacaoPrevia(() => {
        const alvo = document.querySelector('button[aria-label="compartilhar página"]') || document.body
        setMenuShareAnchor(alvo)
      })
      return true
    }
    window.__bibliaSharePageOverride = override
    return () => {
      if (window.__bibliaSharePageOverride === override) {
        delete window.__bibliaSharePageOverride
      }
    }
  }, [acaoComAvaliacaoPrevia])

  /* ------------------ RENDER ------------------ */

  const acoesDesabilitadas = exigeAvaliacao

  return (
    <Box sx={{ ...sxMinViewportHeight(), display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Paper elevation={0} square sx={{
        px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 1,
        borderBottom: 1, borderColor: 'divider', position: 'sticky', top: 0, zIndex: 2,
        bgcolor: 'background.paper'
      }}>
        <IconButton aria-label="Voltar" onClick={voltar} size="large" edge="start">
          <ArrowBack />
        </IconButton>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ minWidth: 0, columnGap: 0.75, rowGap: 0.25 }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ flexShrink: 0 }}>
              Estudo da perícope
            </Typography>
            {paramsValidos && referenciaExibicao ? (
              <Typography
                component="button"
                type="button"
                variant="body2"
                onClick={() => void abrirPopupReferencia()}
                aria-label="Pré-visualizar o texto desta perícope na Bíblia"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  textDecoration: 'underline',
                  border: 'none',
                  background: 'none',
                  font: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                  p: 0,
                  minWidth: 0
                }}
              >
                {referenciaExibicao}
              </Typography>
            ) : null}
          </Stack>
          {paramsValidos ? (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<LibraryBooksIcon />}
              onClick={abrirBibliotecaEstudos}
              sx={{ mt: 0.75, alignSelf: 'flex-start' }}
            >
              Bíblia comentada
            </Button>
          ) : null}
        </Box>
        {fase === 'ready' && (
          <Stack direction="row" spacing={0.25} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
            {ehAdmin && !adminCarregando && (
              <>
                <Tooltip
                  title={
                    origem === 'oficial'
                      ? 'Remover da seleção oficial'
                      : origem === 'candidato'
                        ? 'Elevar a oficial agora (atalho de admin). Ao atingir 10 votos positivos a promoção é automática.'
                        : 'Salvar como estudo oficial (atalho de admin, sem passar pela votação)'
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      aria-label={origem === 'oficial' ? 'Remover oficial' : 'Tornar oficial'}
                      onClick={() => (origem === 'oficial' ? void removerCuradoria() : void aprovarComoOficial())}
                      disabled={salvandoAcao || !textoGerado || editandoAdmin}
                      sx={{ color: origem === 'oficial' ? 'primary.main' : 'text.secondary' }}
                    >
                      <StarIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Apagar texto (oficial/candidato) e regerar pela IA">
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Apagar e regerar estudo"
                      onClick={() => void descartarERegerarAdmin()}
                      disabled={salvandoAcao || !textoGerado || editandoAdmin}
                      color="warning"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                {!editandoAdmin && (
                  <Tooltip title="Corrigir o texto aqui e publicar como oficial">
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Corrigir texto admin"
                        onClick={iniciarEdicaoAdmin}
                        disabled={salvandoAcao || !textoGerado}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </>
            )}
            <Tooltip
              title={
                acoesDesabilitadas
                  ? 'Avalie antes para usar esta opção'
                  : ehAdmin && (origem === 'oficial' || origem === 'candidato')
                    ? 'Corrigir texto aqui (admin)'
                    : 'Editar e salvar como seu estudo pessoal'
              }
            >
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<EditNote fontSize="small" />}
                  onClick={() => {
                    if (ehAdmin && (origem === 'oficial' || origem === 'candidato')) {
                      iniciarEdicaoAdmin()
                      return
                    }
                    acaoComAvaliacaoPrevia(abrirNoEditor)
                  }}
                  disabled={!textoGerado || editandoAdmin}
                >
                  {ehAdmin && (origem === 'oficial' || origem === 'candidato')
                    ? 'Corrigir texto'
                    : 'Editar e salvar'}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        )}
      </Paper>

      <Menu anchorEl={menuShareAnchor} open={Boolean(menuShareAnchor)} onClose={() => setMenuShareAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem disabled={!textoGerado} onClick={() => { setMenuShareAnchor(null); void copiar() }}>
          <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
          <ListItemText primary="Copiar texto" />
        </MenuItem>
        <MenuItem disabled={!textoGerado} onClick={() => { setMenuShareAnchor(null); void compartilharNativo() }}>
          <ListItemIcon><IosShareIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Compartilhar com…" />
        </MenuItem>
        <MenuItem onClick={() => { setMenuShareAnchor(null); abrirNoEditor() }}>
          <ListItemIcon><EditNote fontSize="small" /></ListItemIcon>
          <ListItemText primary="Editar e salvar" secondary="Salve como seu estudo para reabrir e compartilhar depois." />
        </MenuItem>
      </Menu>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2, ...sxLeitura }}>
        {fase === 'loading' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress />
            <Typography color="text.secondary" align="center">Abrindo o estudo…</Typography>
          </Box>
        )}

        {fase === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {erroParam || erroIa || 'Não foi possível preparar o estudo agora.'}
          </Alert>
        )}
        {fase === 'error' && paramsValidos && iaGeminiDisponivel() && (
          <Button variant="contained" startIcon={<AutoAwesome />} onClick={() => void gerar()}>
            Tentar de novo
          </Button>
        )}

        {fase === 'cooldown' && cooldown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning" sx={{ alignItems: 'flex-start' }}>
              <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5 }}>
                {mensagemCooldownIa(cooldown).titulo}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {mensagemCooldownIa(cooldown).detalhe} Você ainda pode abrir agora
                qualquer estudo já preparado pela comunidade na biblioteca.
              </Typography>
            </Alert>
            <Stack spacing={1}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<LibraryBooksIcon />}
                onClick={() => navigate(
                  `/biblioteca-estudos?returnTo=${encodeURIComponent(
                    `${window.location.pathname}${window.location.search}`
                  )}`
                )}
              >
                Abrir a Bíblia comentada
              </Button>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1
                }}
              >
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={voltar} sx={{ flex: 1 }}>
                  Voltar à Bíblia
                </Button>
              </Box>
            </Stack>
          </Box>
        )}

        {fase === 'ready' && textoGerado && (
          <>
            {exigeAvaliacao && (
              <Alert severity="info" icon={<HowToRegIcon />} sx={{ mb: 2, alignItems: 'center' }}>
                <Typography variant="body2" fontWeight={600}>Sua avaliação é importante.</Typography>
                <Typography variant="caption" color="text.secondary">
                  Antes de copiar, editar ou compartilhar, indique se este estudo foi útil.
                  Sua resposta ajuda a manter o que é bom e descartar o que precisa de revisão.
                </Typography>
              </Alert>
            )}

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
              {editandoAdmin ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Edição administrativa
                  </Typography>
                  <TextField
                    multiline
                    fullWidth
                    minRows={14}
                    maxRows={28}
                    value={rascunhoAdmin}
                    onChange={(e) => setRascunhoAdmin(e.target.value)}
                    disabled={salvandoAcao}
                    sx={{ mb: 1.5, ...sxLeitura }}
                  />
                  {adminSaveErro ? (
                    <Alert severity="error" sx={{ mb: 1.5 }}>
                      {adminSaveErro}
                    </Alert>
                  ) : null}
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="contained"
                      onClick={() => void salvarEdicaoAdmin()}
                      disabled={salvandoAcao}
                    >
                      {salvandoAcao ? 'Salvando…' : 'Salvar correção'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditandoAdmin(false)
                        setRascunhoAdmin('')
                        setAdminSaveErro('')
                      }}
                      disabled={salvandoAcao}
                    >
                      Cancelar
                    </Button>
                  </Stack>
                </>
              ) : (
                renderLinhasEstudo(textoGerado, lineHeightCss)
              )}
            </Paper>

            <Paper variant="outlined" sx={{
              mt: 2, p: 2,
              borderColor: exigeAvaliacao ? 'primary.main' : 'divider',
              bgcolor: exigeAvaliacao ? 'primary.50' : 'action.hover',
              ...(exigeAvaliacao && { borderWidth: 2 })
            }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                {meuVoto ? 'Obrigado pela sua avaliação.' : 'Este estudo foi útil para você?'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {meuVoto
                  ? 'Você já enviou sua avaliação deste estudo. Pode alterar tocando em uma das opções.'
                  : 'Sua resposta ajuda a destacar estudos bons e revisar os que precisam de melhoria.'}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant={meuVoto === 'positivo' ? 'contained' : 'outlined'}
                  color="primary"
                  size="medium"
                  startIcon={meuVoto === 'positivo' ? <ThumbUpAltIcon /> : <ThumbUpAltOutlinedIcon />}
                  onClick={() => void votarUtil()}
                  disabled={salvandoAcao || !user?.uid}
                >Foi útil</Button>
                <Button
                  variant={meuVoto === 'negativo' ? 'contained' : 'outlined'}
                  color="warning"
                  size="medium"
                  startIcon={meuVoto === 'negativo' ? <ThumbDownAltIcon /> : <ThumbDownAltOutlinedIcon />}
                  onClick={() => void votarNaoUtil()}
                  disabled={salvandoAcao || !user?.uid}
                >Pode melhorar</Button>
              </Stack>
            </Paper>

            <Box sx={{
              mt: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1.5, p: 2,
              border: 1, borderColor: 'divider', borderRadius: 1.5,
              bgcolor: 'action.hover',
              opacity: acoesDesabilitadas ? 0.55 : 1
            }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700}>Quer guardar este estudo?</Typography>
                <Typography variant="body2" color="text.secondary">
                  Edite o conteúdo e salve como o seu estudo. Depois de salvo,
                  você pode compartilhar com qualquer pessoa.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EditNote />}
                onClick={() => acaoComAvaliacaoPrevia(abrirNoEditor)}
                sx={{ flexShrink: 0 }}
              >Editar e salvar</Button>
            </Box>
          </>
        )}
      </Box>

      <Dialog open={dialogSaidaAberto}
        onClose={() => { tentativaSaidaRef.current = null; setDialogSaidaAberto(false) }}
        aria-labelledby="dialog-avaliacao-pendente-peri"
      >
        <DialogTitle id="dialog-avaliacao-pendente-peri">Antes de prosseguir, avalie</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Este estudo ainda não recebeu sua avaliação. Sua resposta nos ajuda a destacar os
            bons e revisar os que precisam de melhoria.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5, p: 2 }}>
          <Button onClick={() => { tentativaSaidaRef.current = null; setDialogSaidaAberto(false) }} color="inherit">
            Voltar à leitura
          </Button>
          <Button onClick={() => void votarNaoUtil()} color="warning" variant="outlined"
            startIcon={<ThumbDownAltOutlinedIcon />} disabled={salvandoAcao}>
            Pode melhorar
          </Button>
          <Button onClick={() => void votarUtil()} color="primary" variant="contained"
            startIcon={<ThumbUpAltOutlinedIcon />} disabled={salvandoAcao}>
            Foi útil
          </Button>
        </DialogActions>
      </Dialog>

      {popupVersiculos?.length ? (
        <VersiculoPopup versiculos={popupVersiculos} onClose={() => setPopupVersiculos(null)} />
      ) : null}
    </Box>
  )
}

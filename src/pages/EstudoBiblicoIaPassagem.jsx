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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import AutoAwesome from '@mui/icons-material/AutoAwesome'
import Edit from '@mui/icons-material/Edit'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
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
import EditorialContentHeader from '../components/EditorialContentHeader'
import EditorialProse from '../components/EditorialProse'
import { EDITORIAL_IMAGES } from '../utils/editorialThemes'
import {
  iaGeminiDisponivel,
  montarPassagemLida,
  gerarComentarioVersiculo,
  formatarReferenciaCompactaPassagem
} from '../services/bibliaPassagemEstudoIaService'
import {
  lerEstudoCurado,
  lerEstudoCandidato,
  lerPericopeCurada,
  lerPericopeCandidata,
  salvarEstudoCurado,
  removerEstudoCurado,
  publicarEstudoCandidato,
  descartarEstudoCandidato,
  registrarVoto,
  lerMeuVoto,
  chavePericopeCurada
} from '../services/estudosCuradosService'
import {
  lerCacheIaPassagem,
  gravarCacheIaPassagem,
  apagarCacheIaPassagem
} from '../utils/bibliaIaPassagemCache'
import {
  lerCooldownIa,
  registrarCooldownIa,
  mensagemCooldownIa
} from '../utils/iaCooldown'
import {
  idCanonicoVersiculo,
  podeGerar,
  marcarGerado
} from '../utils/iaGeracaoLimites'
import { sxCorpoTextoIa } from '../utils/iaTextoStyles'
import { buscarIntervaloVersiculos } from '../services/bibliaService'
import VersiculoPopup from '../components/VersiculoPopup'
import TextoComReferencias from '../components/TextoComReferencias'
import CompartilharMenu from '../components/CompartilharMenu'
import { useEhAdmin } from '../hooks/useEhAdmin'
import { buildAppShareLink } from '../services/bibliaEstudosService'
import { normalizarTom, TONS_IDS, TOM_PADRAO } from '../utils/iaTonalidade'
import {
  confirmarAsync,
  mostrarSnackbar
} from '../utils/uiDialogs'

/** Ordem ao carregar conteúdo existente (oficial/candidato/cache): preferir chave canônica. */
const ORDEM_CARGA_TONS = [TOM_PADRAO, ...TONS_IDS.filter((t) => t !== TOM_PADRAO)]

function parseVersList(raw) {
  return String(raw || '')
    .split(/[;,]/)
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x > 0)
}

/** Marcação simples para destacar `**negrito**` dentro de uma linha. */
function renderInlineMarkdown(line) {
  const partes = []
  const regex = /\*\*([^*]+)\*\*/g
  let last = 0
  let m
  let i = 0
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) {
      partes.push(
        <TextoComReferencias
          key={`t-${i++}`}
          texto={line.slice(last, m.index)}
          inline
          style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
        />
      )
    }
    partes.push(
      <Box key={`b-${i++}`} component="strong" sx={{ fontWeight: 700 }}>
        <TextoComReferencias
          texto={m[1]}
          inline
          style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
        />
      </Box>
    )
    last = regex.lastIndex
  }
  if (last < line.length) {
    partes.push(
      <TextoComReferencias
        key={`t-${i++}`}
        texto={line.slice(last)}
        inline
        style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
      />
    )
  }
  return partes.length ? partes : (
    <TextoComReferencias
      texto={line}
      inline
      style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
    />
  )
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
          {renderInlineMarkdown(trimmed.slice(3).trim())}
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
          {renderInlineMarkdown(trimmed.slice(4).trim())}
        </Typography>
      )
    }
    if (trimmed === '') {
      return <Box key={i} sx={{ height: 8 }} />
    }
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

function separarNotaFinal(texto) {
  const valor = String(texto || '').trimEnd()
  const correspondencia = valor.match(/(?:^|\n)\s*(?:\*\*)?Nota:(?:\*\*)?\s*([\s\S]+)$/i)
  if (!correspondencia) return { corpo: valor, nota: '' }
  return {
    corpo: valor.slice(0, correspondencia.index).trimEnd(),
    nota: correspondencia[1].trim(),
  }
}

/**
 * Página de estudo IA por versículo(s).
 *
 * Carrega a primeira versão disponível (oficial/candidato/cache), preferindo a
 * chave canônica. Geração usa matizes integrados no pedido à IA (sem seletor na UI).
 * Se não houver conteúdo salvo, gera automaticamente ao abrir (estado "Abrindo o estudo").
 */
export default function EstudoBiblicoIaPassagem() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useFirebaseAuth()
  const { fontSize, fontFamily, lineHeight } = useApp()
  const { ehAdmin, carregando: adminCarregando } = useEhAdmin(user?.uid || null)

  const returnToParam = searchParams.get('returnTo') || '/'
  const livroQ = Number(searchParams.get('livro'))
  const capQ = Number(searchParams.get('capitulo') ?? searchParams.get('cap'))
  const versQ = useMemo(() => parseVersList(searchParams.get('versiculos')), [searchParams])
  const forcarRefresh = searchParams.get('refresh') === '1'

  const paramsValidos = useMemo(
    () => Number.isInteger(livroQ) && livroQ >= 1 && Number.isInteger(capQ) && capQ >= 1 && versQ.length > 0,
    [livroQ, capQ, versQ]
  )

  /** `loading` inclui abrir a página e gerar na primeira vez, se não houver texto salvo. */
  const [fase, setFase] = useState('loading') // loading | ready | error | cooldown
  const [erroParam, setErroParam] = useState('')
  const [erroIa, setErroIa] = useState('')
  const [cooldown, setCooldown] = useState(null)
  const [textoGerado, setTextoGerado] = useState('')
  const [metaLocal, setMetaLocal] = useState(null)
  const [referencia, setReferencia] = useState('')
  const [origem, setOrigem] = useState('novo')
  const [meuVoto, setMeuVoto] = useState(null)
  const [salvandoAcao, setSalvandoAcao] = useState(false)
  const [dialogSaidaAberto, setDialogSaidaAberto] = useState(false)
  const [popupVersiculos, setPopupVersiculos] = useState(null)
  const [editandoAdmin, setEditandoAdmin] = useState(false)
  const [rascunhoAdmin, setRascunhoAdmin] = useState('')
  const [adminSaveErro, setAdminSaveErro] = useState('')

  /** Tom da chave RTDB/cache do texto exibido (votação/admin usam esta chave). */
  const [tomCarregado, setTomCarregado] = useState(TOM_PADRAO)

  /** Informação da perícope que contém os versículos selecionados. */
  const [pericopeInfo, setPericopeInfo] = useState(null)
  const tentativaSaidaRef = useRef(null)
  const cargaMountIdRef = useRef(0)

  const idCanonicoPassagem = useMemo(
    () => (paramsValidos ? idCanonicoVersiculo(livroQ, capQ, versQ) : ''),
    [paramsValidos, livroQ, capQ, versQ]
  )

  /** O conteúdo local recém-gerado pede avaliação antes de sair para outra leitura. */
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

  const textoSeparado = useMemo(() => separarNotaFinal(textoGerado), [textoGerado])

  const referenciaExibicao = useMemo(() => {
    if (!paramsValidos) return ''
    const r = String(referencia || '').trim()
    if (r) return r
    return formatarReferenciaCompactaPassagem(livroQ, capQ, versQ) || ''
  }, [paramsValidos, referencia, livroQ, capQ, versQ])

  const linkCompartilharComentario = useMemo(() => {
    if (!paramsValidos) return ''
    const q = new URLSearchParams({
      livro: String(livroQ),
      capitulo: String(capQ),
      versiculos: versQ.join(','),
    })
    return buildAppShareLink('/estudos-biblicos/ia-passagem', q.toString())
  }, [paramsValidos, livroQ, capQ, versQ])

  const abrirPopupReferencia = useCallback(async () => {
    if (!paramsValidos || !versQ.length) return
    try {
      const vMin = Math.min(...versQ)
      const vMax = Math.max(...versQ)
      const { versiculos } = await buscarIntervaloVersiculos(livroQ, capQ, vMin, vMax)
      const setV = new Set(versQ.map((n) => Number(n)))
      const filtrados = (versiculos || []).filter((v) => setV.has(Number(v.numero ?? v.versiculo)))
      if (filtrados.length) setPopupVersiculos(filtrados)
      else if (versiculos?.length) setPopupVersiculos(versiculos)
    } catch (e) {
      console.error(e)
      mostrarSnackbar({ mensagem: 'Não foi possível carregar o texto da passagem.', severidade: 'error' })
    }
  }, [paramsValidos, livroQ, capQ, versQ])

  /* ============================================================
   * GERAR — sempre chave canônica (`pastoral`); matizes só no prompt (integrado).
   * ============================================================ */
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

      const pg = podeGerar({ tipo: 'versiculo', id: idCanonicoPassagem, admin: ehAdmin })
      if (!pg.ok) {
        setFase('error')
        setErroIa(pg.mensagem || 'Não foi possível gerar o estudo agora.')
        return
      }

      setFase('loading')
      setErroIa('')

      const pass = await montarPassagemLida(livroQ, capQ, versQ)
      if (!pass.ok) {
        setFase('error')
        setErroIa(pass.error || 'Não foi possível carregar a passagem.')
        return
      }
      setMetaLocal(pass.meta)
      setReferencia(pass.referenciaCompacta)

      let estudoPericopeContexto = null
      let pericopeRefHint = ''
      if (pass.pericope) {
        setPericopeInfo({
          inicio: pass.pericope.inicio,
          fim: pass.pericope.fim,
          titulo: pass.pericope.titulo,
          referencia: pass.pericope.referencia
        })
        pericopeRefHint = pass.pericope.referencia || ''
        for (const tomCtx of ORDEM_CARGA_TONS) {
          const pc =
            (await lerPericopeCurada(livroQ, capQ, pass.pericope.inicio, pass.pericope.fim, tomCtx)) ||
            (await lerPericopeCandidata(livroQ, capQ, pass.pericope.inicio, pass.pericope.fim, tomCtx))
          if (pc?.texto) {
            estudoPericopeContexto = pc.texto
            break
          }
        }
      }

      const r = await gerarComentarioVersiculo({
        referenciaCompacta: pass.referenciaCompacta,
        textoCitacao: pass.textoCitacao,
        estudoPericopeContexto,
        textoPericopeContexto: pass.pericope?.texto || '',
        pericopeRefHint,
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

      const texto = String(r.text || '')
      setTextoGerado(texto)
      setOrigem('novo')
      setMeuVoto(null)
      setTomCarregado(tomAlvo)
      gravarCacheIaPassagem(livroQ, capQ, versQ, { texto, meta: pass.meta, tom: tomAlvo })
      marcarGerado({ tipo: 'versiculo', id: idCanonicoPassagem, admin: ehAdmin })
      setFase('ready')
    },
    [paramsValidos, livroQ, capQ, versQ, idCanonicoPassagem, ehAdmin]
  )

  /**
   * Descobre (em segundo plano) qual perícope contém os versículos atuais.
   * Útil para o atalho "Ver estudo da perícope" mesmo antes de gerar.
   */
  useEffect(() => {
    if (!paramsValidos) return
    if (pericopeInfo) return
    let cancelado = false
    ;(async () => {
      const pass = await montarPassagemLida(livroQ, capQ, versQ).catch(() => null)
      if (cancelado || !pass?.ok || !pass.pericope) return
      setPericopeInfo({
        inicio: pass.pericope.inicio,
        fim: pass.pericope.fim,
        titulo: pass.pericope.titulo,
        referencia: pass.pericope.referencia
      })
    })()
    return () => { cancelado = true }
  }, [paramsValidos, pericopeInfo, livroQ, capQ, versQ])

  /**
   * Carrega o texto disponível (sem geração). Ordem de busca:
   * oficial → candidato → cache local. Retorna `true` se conseguiu carregar.
   */
  const carregarTextoDoTom = useCallback(
    async (tomBruto) => {
      const tomAlvo = normalizarTom(tomBruto)

      const curado = await lerEstudoCurado(livroQ, capQ, versQ, tomAlvo)
      if (curado?.texto) {
        setTextoGerado(curado.texto)
        setReferencia(curado.referenciaCompacta || '')
        setMetaLocal(null)
        setOrigem('oficial')
        setTomCarregado(tomAlvo)
        if (user?.uid) {
          const v = await lerMeuVoto({ livroId: livroQ, capitulo: capQ, versArr: versQ, uid: user.uid, tom: tomAlvo })
          setMeuVoto(v)
        } else {
          setMeuVoto(null)
        }
        setFase('ready')
        return true
      }

      const cand = await lerEstudoCandidato(livroQ, capQ, versQ, tomAlvo)
      if (cand?.texto) {
        setTextoGerado(cand.texto)
        setReferencia(cand.referenciaCompacta || '')
        setMetaLocal(null)
        setOrigem('candidato')
        setTomCarregado(tomAlvo)
        if (user?.uid) {
          const v = await lerMeuVoto({ livroId: livroQ, capitulo: capQ, versArr: versQ, uid: user.uid, tom: tomAlvo })
          setMeuVoto(v)
        } else {
          setMeuVoto(null)
        }
        setFase('ready')
        return true
      }

      const cache = lerCacheIaPassagem(livroQ, capQ, versQ, tomAlvo)
      if (cache?.texto) {
        setTextoGerado(cache.texto)
        setMetaLocal(cache.meta || null)
        setReferencia(cache.meta?.referenciaCompacta || '')
        setOrigem('novo')
        setTomCarregado(tomAlvo)
        if (user?.uid) {
          const v = await lerMeuVoto({ livroId: livroQ, capitulo: capQ, versArr: versQ, uid: user.uid, tom: tomAlvo })
          setMeuVoto(v)
          if (v === 'positivo') setOrigem('candidato')
        } else {
          setMeuVoto(null)
        }
        setFase('ready')
        return true
      }

      return false
    },
    [livroQ, capQ, versQ, user?.uid]
  )

  const carregarPrimeiroTomDisponivel = useCallback(async () => {
    for (const id of ORDEM_CARGA_TONS) {
      if (await carregarTextoDoTom(id)) return true
    }
    return false
  }, [carregarTextoDoTom])

  /* ============================================================
   * CARGA INICIAL — primeira versão disponível ou tela para gerar.
   * ============================================================ */
  useEffect(() => {
    if (user === null) {
      navigate('/chat')
      return
    }
    if (user === undefined) return
    if (!paramsValidos) {
      setErroParam('Parâmetros inválidos. Volte à Bíblia, selecione versículos e abra de novo.')
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
        for (const id of TONS_IDS) apagarCacheIaPassagem(livroQ, capQ, versQ, id)
        await gerar()
        return
      }

      const carregou = await carregarPrimeiroTomDisponivel()
      if (mountId !== cargaMountIdRef.current) return
      if (!carregou) await gerar()
    })()
  }, [user, navigate, paramsValidos, forcarRefresh, ehAdmin, livroQ, capQ, versQ, gerar, carregarPrimeiroTomDisponivel])

  /* ============================================================
   * Navegação e avaliação.
   * ============================================================ */

  const acaoComAvaliacaoPrevia = useCallback(
    (callback) => {
      if (!exigeAvaliacao) {
        callback()
        return
      }
      tentativaSaidaRef.current = callback
      setDialogSaidaAberto(true)
    },
    [exigeAvaliacao]
  )

  const voltar = useCallback(() => {
    const indo = () => {
      try {
        navigate(returnToParam.startsWith('/') ? returnToParam : '/')
      } catch {
        navigate('/')
      }
    }
    acaoComAvaliacaoPrevia(indo)
  }, [navigate, returnToParam, acaoComAvaliacaoPrevia])

  /* ============================================================
   * VOTOS — usam a chave de conteúdo carregada (`tomCarregado` no estado).
   * ============================================================ */

  const votarUtil = useCallback(async () => {
    if (!user?.uid || !textoGerado) return
    setSalvandoAcao(true)
    try {
      const tomVoto = normalizarTom(tomCarregado)
      const pericopeMeta = metaLocal?.pericope || null
      const pericopeKey = pericopeMeta
        ? chavePericopeCurada(livroQ, capQ, pericopeMeta.inicio, pericopeMeta.fim)
        : null

      if (origem === 'novo') {
        const publicacao = await publicarEstudoCandidato({
          livroId: livroQ,
          capitulo: capQ,
          versArr: versQ,
          texto: textoGerado,
          referenciaCompacta: referencia,
          pericopeKey,
          uidAutor: user.uid,
          tom: tomVoto
        })
        if (!publicacao?.ok) {
          throw new Error(publicacao?.error || 'Não foi possível publicar este comentário.')
        }
        setOrigem('candidato')
      }

      const voto = await registrarVoto({
        livroId: livroQ,
        capitulo: capQ,
        versArr: versQ,
        voto: 'positivo',
        uid: user.uid,
        tom: tomVoto
      })
      if (!voto?.ok) throw new Error(voto?.error || 'Não foi possível registrar sua avaliação.')

      setMeuVoto('positivo')
      mostrarSnackbar({
        mensagem: 'Obrigado! Seu retorno foi registrado.',
        severidade: 'success'
      })

      const acaoPendente = tentativaSaidaRef.current
      tentativaSaidaRef.current = null
      setDialogSaidaAberto(false)
      if (typeof acaoPendente === 'function') acaoPendente()
    } catch (erro) {
      mostrarSnackbar({
        mensagem: erro?.message || 'Não foi possível concluir a avaliação. Tente novamente.',
        severidade: 'error'
      })
    } finally {
      setSalvandoAcao(false)
    }
  }, [user?.uid, textoGerado, origem, metaLocal, livroQ, capQ, versQ, referencia, tomCarregado])

  const votarNaoUtil = useCallback(async () => {
    if (!user?.uid) return
    setSalvandoAcao(true)
    try {
      const tomVoto = normalizarTom(tomCarregado)
      await registrarVoto({
        livroId: livroQ,
        capitulo: capQ,
        versArr: versQ,
        voto: 'negativo',
        uid: user.uid,
        tom: tomVoto
      })
      if (origem === 'novo') {
        apagarCacheIaPassagem(livroQ, capQ, versQ, tomVoto)
      }
      setMeuVoto('negativo')
      mostrarSnackbar({
        mensagem: 'Obrigado pelo retorno — vamos rever este estudo.',
        severidade: 'success'
      })

      const acaoPendente = tentativaSaidaRef.current
      tentativaSaidaRef.current = null
      setDialogSaidaAberto(false)
      if (typeof acaoPendente === 'function') acaoPendente()
    } finally {
      setSalvandoAcao(false)
    }
  }, [user?.uid, origem, livroQ, capQ, versQ, tomCarregado])

  /* ============================================================
   * AÇÕES ADMIN — usam a chave de conteúdo carregada.
   * ============================================================ */

  const aprovarComoOficial = useCallback(async () => {
    if (!ehAdmin || !user?.uid || !textoGerado) return
    setSalvandoAcao(true)
    try {
      let pericopeMeta = metaLocal?.pericope || null
      if (!pericopeMeta) {
        const pass = await montarPassagemLida(livroQ, capQ, versQ)
        if (pass.ok && pass.pericope) {
          pericopeMeta = {
            inicio: pass.pericope.inicio,
            fim: pass.pericope.fim,
            titulo: pass.pericope.titulo,
            referencia: pass.pericope.referencia
          }
        }
      }
      const pericopeKey = pericopeMeta
        ? chavePericopeCurada(livroQ, capQ, pericopeMeta.inicio, pericopeMeta.fim)
        : null
      const r = await salvarEstudoCurado({
        livroId: livroQ,
        capitulo: capQ,
        versArr: versQ,
        texto: textoGerado,
        referenciaCompacta: referencia,
        pericopeKey,
        uidAutor: user.uid,
        tom: tomCarregado
      })
      if (r.ok) {
        setOrigem('oficial')
        mostrarSnackbar({ mensagem: 'Estudo definido como oficial.', severidade: 'success' })
      } else {
        mostrarSnackbar({
          mensagem: `Não foi possível salvar: ${r.error || 'erro desconhecido'}`,
          severidade: 'error'
        })
      }
    } finally {
      setSalvandoAcao(false)
    }
  }, [ehAdmin, user?.uid, textoGerado, metaLocal, livroQ, capQ, versQ, referencia, tomCarregado])

  const removerCuradoria = useCallback(async () => {
    if (!ehAdmin) return
    const ok = await confirmarAsync({
      titulo: 'Remover este estudo da seleção oficial?',
      mensagem:
        'Outros usuários voltarão a ver uma versão preparada na hora. ' +
        'O texto candidato (caso exista) continua disponível.',
      textoConfirmar: 'Remover',
      textoCancelar: 'Cancelar'
    })
    if (!ok) return
    setSalvandoAcao(true)
    try {
      const r = await removerEstudoCurado(livroQ, capQ, versQ, tomCarregado)
      if (r.ok) {
        const carregou = await carregarTextoDoTom(tomCarregado)
        if (!carregou) {
          setTextoGerado('')
          setOrigem('novo')
          setMeuVoto(null)
        }
        mostrarSnackbar({ mensagem: 'Removido da seleção oficial.', severidade: 'info' })
      } else {
        mostrarSnackbar({
          mensagem: `Não foi possível remover: ${r.error || 'erro desconhecido'}`,
          severidade: 'error'
        })
      }
    } finally {
      setSalvandoAcao(false)
    }
  }, [ehAdmin, livroQ, capQ, versQ, tomCarregado, carregarTextoDoTom])

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
      let pericopeMeta = metaLocal?.pericope || null
      if (!pericopeMeta) {
        const pass = await montarPassagemLida(livroQ, capQ, versQ)
        if (pass.ok && pass.pericope) {
          pericopeMeta = {
            inicio: pass.pericope.inicio,
            fim: pass.pericope.fim,
            titulo: pass.pericope.titulo,
            referencia: pass.pericope.referencia
          }
        }
      }
      const pericopeKey = pericopeMeta
        ? chavePericopeCurada(livroQ, capQ, pericopeMeta.inicio, pericopeMeta.fim)
        : null
      const r = await salvarEstudoCurado({
        livroId: livroQ,
        capitulo: capQ,
        versArr: versQ,
        texto: limpo,
        referenciaCompacta: referencia,
        pericopeKey,
        uidAutor: user.uid,
        tom: tomCarregado
      })
      if (!r.ok) {
        setAdminSaveErro(r.error || 'Não foi possível salvar a edição.')
        return
      }
      setTextoGerado(limpo)
      setOrigem('oficial')
      gravarCacheIaPassagem(livroQ, capQ, versQ, {
        texto: limpo,
        meta: metaLocal,
        tom: tomCarregado
      })
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
    metaLocal,
    livroQ,
    capQ,
    versQ,
    referencia,
    tomCarregado
  ])

  /**
   * Remove oficial/candidato/cache e gera nova versão (admin).
   */
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
        await removerEstudoCurado(livroQ, capQ, versQ, tomCarregado)
      }
      const r = await descartarEstudoCandidato({
        livroId: livroQ,
        capitulo: capQ,
        versArr: versQ,
        tom: tomCarregado
      })
      if (!r.ok) {
        mostrarSnackbar({
          mensagem: `Não foi possível descartar: ${r.error || 'erro'}`,
          severidade: 'error'
        })
        return
      }
      apagarCacheIaPassagem(livroQ, capQ, versQ, tomCarregado)
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
  }, [ehAdmin, textoGerado, origem, livroQ, capQ, versQ, tomCarregado, gerar])

  /* ============================================================
   * Cabeçalho — atalhos admin.
   * ============================================================ */

  const linkEstudoPericope = useMemo(() => {
    if (!pericopeInfo) return null
    const q = new URLSearchParams({
      livro: String(livroQ),
      capitulo: String(capQ),
      inicio: String(pericopeInfo.inicio),
      fim: String(pericopeInfo.fim),
      titulo: pericopeInfo.titulo || '',
      returnTo: returnToParam
    })
    return `/estudos-biblicos/ia-pericope?${q.toString()}`
  }, [pericopeInfo, livroQ, capQ, returnToParam])

  const irParaEstudoPericope = useCallback(() => {
    if (!linkEstudoPericope) return
    acaoComAvaliacaoPrevia(() => navigate(linkEstudoPericope))
  }, [linkEstudoPericope, navigate, acaoComAvaliacaoPrevia])

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <Box
      sx={{
        ...sxMinViewportHeight(),
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <Paper
        elevation={0}
        square
        sx={{
          px: 1,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
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
              Estudo por passagem
            </Typography>
            {paramsValidos && referenciaExibicao ? (
              <Typography
                component="button"
                type="button"
                variant="body2"
                onClick={() => void abrirPopupReferencia()}
                aria-label="Pré-visualizar o texto desta passagem na Bíblia"
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
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
        </Box>
        {fase === 'ready' && (
          <Stack direction="row" spacing={0.25} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
            {(origem === 'candidato' || origem === 'oficial') && (
              <CompartilharMenu
                iconOnly
                label="Compartilhar comentário"
                tooltip="Compartilhar comentário"
                linkUrl={linkCompartilharComentario}
                linkTitle={`Bíblia comentada${referenciaExibicao ? ` — ${referenciaExibicao}` : ''}`}
                linkText={`Leia este comentário bíblico${referenciaExibicao ? ` sobre ${referenciaExibicao}` : ''}: ${linkCompartilharComentario}`}
              />
            )}
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
                      onClick={() =>
                        origem === 'oficial' ? void removerCuradoria() : void aprovarComoOficial()
                      }
                      disabled={salvandoAcao || !textoGerado || editandoAdmin}
                      sx={{
                        color: origem === 'oficial' ? 'primary.main' : 'text.secondary'
                      }}
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
          </Stack>
        )}
      </Paper>

      <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 1, sm: 2 }, py: 2, ...sxLeitura }}>
        {paramsValidos && referenciaExibicao ? (
          <EditorialContentHeader
            title={referenciaExibicao}
            subtitle="Comentário bíblico para leitura e aprofundamento"
            eyebrow="Bíblia comentada"
            image={EDITORIAL_IMAGES.bibliaComentada}
            imagePosition="center 48%"
            sx={{ mb: 2, maxWidth: 920, mx: 'auto' }}
          />
        ) : null}
        {fase === 'loading' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress />
            <Typography color="text.secondary" align="center">
              Abrindo o estudo…
            </Typography>
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
                Ver comentários disponíveis
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
              <Alert
                severity="info"
                icon={<HowToRegIcon />}
                sx={{ mb: 2, alignItems: 'center' }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Sua avaliação é importante.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Indique se este comentário foi útil. Sua resposta ajuda a manter
                  o que é bom e encaminhar para revisão o que pode melhorar.
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
                <EditorialProse
                  text={textoSeparado.corpo}
                  fontSize={fontSize}
                  textAlign="justify"
                  lineHeight={lineHeightCss}
                />
              )}
            </Paper>

            {linkEstudoPericope && (
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  bgcolor: 'background.paper'
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Quer ver o trecho inteiro?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Abrir o estudo expositivo da perícope
                    {pericopeInfo?.referencia ? ` (${pericopeInfo.referencia})` : ''}
                    {pericopeInfo?.titulo ? ` — “${pericopeInfo.titulo}”` : ''}.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<MenuBookIcon />}
                  onClick={irParaEstudoPericope}
                  sx={{ flexShrink: 0 }}
                >
                  Ver estudo da perícope
                </Button>
              </Box>
            )}

            {origem === 'novo' && meuVoto !== 'positivo' && <Paper
              variant="outlined"
              sx={{
                mt: 2,
                p: 2,
                borderColor: exigeAvaliacao ? 'primary.main' : 'divider',
                bgcolor: exigeAvaliacao ? 'primary.50' : 'action.hover',
                ...(exigeAvaliacao && {
                  borderWidth: 2,
                })
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                {meuVoto
                  ? 'Obrigado pela sua avaliação.'
                  : 'Este estudo foi útil para você?'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {meuVoto
                  ? 'Você já enviou sua avaliação deste estudo. Pode alterar tocando em uma das opções.'
                  : 'Sua resposta ajuda a destacar estudos bons e revisar os que precisam de melhoria.'}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  color="primary"
                  size="medium"
                  startIcon={<ThumbUpAltOutlinedIcon />}
                  onClick={() => void votarUtil()}
                  disabled={salvandoAcao || !user?.uid}
                >
                  Foi útil
                </Button>
                <Button
                  variant={meuVoto === 'negativo' ? 'contained' : 'outlined'}
                  color="warning"
                  size="medium"
                  startIcon={
                    meuVoto === 'negativo' ? (
                      <ThumbDownAltIcon />
                    ) : (
                      <ThumbDownAltOutlinedIcon />
                    )
                  }
                  onClick={() => void votarNaoUtil()}
                  disabled={salvandoAcao || !user?.uid}
                >
                  Pode melhorar
                </Button>
              </Stack>
            </Paper>}
          </>
        )}
      </Box>

      <Dialog
        open={dialogSaidaAberto}
        onClose={() => {
          tentativaSaidaRef.current = null
          setDialogSaidaAberto(false)
        }}
        aria-labelledby="dialog-avaliacao-pendente"
      >
        <DialogTitle id="dialog-avaliacao-pendente">Antes de prosseguir, avalie</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Este estudo ainda não recebeu sua avaliação. Sua resposta nos ajuda
            a destacar os bons e revisar os que precisam de melhoria.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5, p: 2 }}>
          <Button
            onClick={() => {
              tentativaSaidaRef.current = null
              setDialogSaidaAberto(false)
            }}
            color="inherit"
          >
            Voltar à leitura
          </Button>
          <Button
            onClick={() => void votarNaoUtil()}
            color="warning"
            variant="outlined"
            startIcon={<ThumbDownAltOutlinedIcon />}
            disabled={salvandoAcao}
          >
            Pode melhorar
          </Button>
          <Button
            onClick={() => void votarUtil()}
            color="primary"
            variant="contained"
            startIcon={<ThumbUpAltOutlinedIcon />}
            disabled={salvandoAcao}
          >
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

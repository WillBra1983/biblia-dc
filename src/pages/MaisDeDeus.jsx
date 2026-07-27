import { useState, useEffect, useCallback } from 'react'
import { 
  Container, 
  Typography, 
  Box,
  Paper,
  Divider,
  Drawer,
  List,
  ListItemText,
  IconButton,
  ListItemButton,
  Button,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import NavigateNext from '@mui/icons-material/NavigateNext'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import { useLocation, useNavigate } from 'react-router-dom'
import { pathnameParaCompartilhamento } from '../utils/shareUrl'
import { buildAppShareLink } from '../services/bibliaEstudosService'
import CompartilharMenu from '../components/CompartilharMenu'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { maisDeDeusData } from '../data/MaisDeDeusData'
import TextoComReferencias from '../components/TextoComReferencias'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { useZoomReset } from '../contexts/ZoomResetContext'
import { getGlassCardStyles } from '../utils/glassCardStyles'

function mesmoId(a, b) {
  return String(a) === String(b)
}

function encontrarAssimDizItem(itemId) {
  if (itemId == null || itemId === '') return null
  return maisDeDeusData.assimDizSenhor.find((item) => mesmoId(item.id, itemId)) || null
}

export default function MaisDeDeus() {
  const navigate = useNavigate()
  const location = useLocation()
  const { voltarParaPaginaAnterior, setBackButtonHandler, fontSize, textAlign, fontFamily, lineHeight } = useApp()
  const ff = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeight)
  const { bumpZoomReset } = useZoomReset()
  const [temaSelecionado, setTemaSelecionado] = useState(null)
  const [subtemaSelecionado, setSubtemaSelecionado] = useState(null)
  const [iniciou, setIniciou] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [etapaAtual, setEtapaAtual] = useState(0)
  const [searchTerm, setSearchTerm] = useState('');
  const [subtemasLidos, setSubtemasLidos] = useState(() => {
    const saved = localStorage.getItem('subtemasAssimDizLidos');
    return saved ? JSON.parse(saved) : [];
  });

  const etapasSalvacao = [
    { tipo: 'apresentacao', label: 'ApresentaÃ§Ã£o' },
    ...maisDeDeusData.questions.map((q, i) => ({ tipo: 'pergunta', index: i, label: `${i + 1}. ${q.question}` })),
    { tipo: 'reflexao', label: 'ReflexÃ£o' },
    { tipo: 'cremos', label: 'Cremos' }
  ].map((etapa) => {
    if (etapa.tipo === 'apresentacao') return { ...etapa, label: 'Apresenta\u00e7\u00e3o' }
    if (etapa.tipo === 'reflexao') return { ...etapa, label: 'Reflex\u00e3o' }
    return etapa
  })

  const navegarPara = useCallback((params = {}, options = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.set(key, String(value))
      }
    })
    const search = searchParams.toString()
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, options)
  }, [location.pathname, navigate])

  const abrirInicio = useCallback((options = { replace: true }) => {
    setTemaSelecionado(null)
    setSubtemaSelecionado(null)
    setIniciou(false)
    setEtapaAtual(0)
    navegarPara({}, options)
  }, [navegarPara])

  const abrirAssimDizLista = useCallback((options = {}) => {
    setTemaSelecionado('assimDizSenhor')
    setSubtemaSelecionado(null)
    setIniciou(false)
    navegarPara({ tema: 'assimDizSenhor' }, options)
  }, [navegarPara])

  const abrirAssimDizItem = useCallback((itemId, options = {}) => {
    const item = encontrarAssimDizItem(itemId)
    if (!item) {
      abrirAssimDizLista({ replace: true })
      return
    }
    setTemaSelecionado('assimDizSenhor')
    setSubtemaSelecionado(item.id)
    setIniciou(false)
    navegarPara({ tema: 'assimDizSenhor', item: item.id }, options)
  }, [abrirAssimDizLista, navegarPara])

  const abrirSalvacaoEtapa = useCallback((etapa, options = {}) => {
    const etapaSegura = Math.min(etapasSalvacao.length - 1, Math.max(0, Number(etapa) || 0))
    setTemaSelecionado('salvacao')
    setSubtemaSelecionado(null)
    setIniciou(true)
    setEtapaAtual(etapaSegura)
    navegarPara({ tema: 'salvacao', etapa: etapaSegura }, options)
  }, [etapasSalvacao.length, navegarPara])

  useEffect(() => {
    localStorage.setItem('subtemasAssimDizLidos', JSON.stringify(subtemasLidos));
  }, [subtemasLidos]);

  // Deep link: /mais-de-deus?tema=...&item=...&etapa=... (compatível com t/s/e)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tema = params.get('tema') ?? params.get('t')

    if (tema === 'assimDizSenhor') {
      setTemaSelecionado('assimDizSenhor')
      setIniciou(false)
      const subtema = params.get('item') ?? params.get('s')
      const item = encontrarAssimDizItem(subtema)
      setSubtemaSelecionado(item?.id ?? null)
      return
    }

    if (tema === 'salvacao') {
      setTemaSelecionado('salvacao')
      setSubtemaSelecionado(null)
      setIniciou(true)
      const etapa = Number(params.get('etapa') ?? params.get('e'))
      setEtapaAtual(Number.isInteger(etapa) && etapa >= 0
        ? Math.min(etapasSalvacao.length - 1, etapa)
        : 0)
      return
    }

    setTemaSelecionado(null)
    setSubtemaSelecionado(null)
    setIniciou(false)
    setEtapaAtual(0)
  }, [location.search, etapasSalvacao.length])

  /** Zoom global só na “camada” atual (ex.: lista → texto de um subtema → voltar). */
  useEffect(() => {
    bumpZoomReset()
  }, [temaSelecionado, subtemaSelecionado, bumpZoomReset])

  const voltarFluxoAtual = useCallback(() => {
    if (menuAberto) {
      setMenuAberto(false)
      return
    }
    if (subtemaSelecionado) {
      abrirAssimDizLista({ replace: true })
      return
    }
    if (temaSelecionado === 'salvacao' && iniciou && etapaAtual > 0) {
      abrirSalvacaoEtapa(etapaAtual - 1, { replace: true })
      return
    }
    if (temaSelecionado) {
      abrirInicio({ replace: true })
      return
    }
    voltarParaPaginaAnterior('/biblia')
  }, [
    abrirAssimDizLista,
    abrirInicio,
    abrirSalvacaoEtapa,
    etapaAtual,
    iniciou,
    menuAberto,
    subtemaSelecionado,
    temaSelecionado,
    voltarParaPaginaAnterior,
  ])

  useEffect(() => {
    if (!setBackButtonHandler) return undefined
    if (!menuAberto && !temaSelecionado && !subtemaSelecionado) return undefined

    setBackButtonHandler(voltarFluxoAtual)
    return () => setBackButtonHandler(null)
  }, [menuAberto, setBackButtonHandler, subtemaSelecionado, temaSelecionado, voltarFluxoAtual])

  useEffect(() => {
    if (temaSelecionado === 'assimDizSenhor' && subtemaSelecionado && !encontrarAssimDizItem(subtemaSelecionado)) {
      abrirAssimDizLista({ replace: true })
    }
  }, [abrirAssimDizLista, subtemaSelecionado, temaSelecionado])

  // Ao trocar de etapa pelas setas, iniciar no topo da página
  useEffect(() => {
    if (temaSelecionado === 'salvacao' && iniciou) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      requestAnimationFrame(() => {
        document.querySelectorAll('main.MuiBox-root').forEach((el) => {
          el.scrollTop = 0
        })
      })
    }
  }, [etapaAtual, temaSelecionado, iniciou])

  // Subtemas de Assim diz o Senhor
  const subtemasAssimDizSenhor = maisDeDeusData.assimDizSenhor.map((item, i) => ({
    id: item.id,
    titulo: item.titulo,
    referencia: item.referencia
  }))

  /**
   * Monta os metadados para compartilhar o **link** de uma reflexão (sem
   * exportar progresso). Faz sentido em "Assim diz o Senhor" porque o
   * destinatário precisa ler o texto — não tem interesse em receber as
   * marcações de leitura do remetente.
   *
   * @param {string} [itemId] — id do subtema a partilhar; sem id, partilha a
   *   página atual (ex.: lista de subtemas, com a busca aplicada).
   * @returns {{ url: string, titulo: string, texto: string }}
   */
  const buildLinkReflexao = (itemId) => {
    const params = new URLSearchParams(location.search)
    if (itemId) {
      params.set('tema', 'assimDizSenhor')
      params.set('item', itemId)
      params.delete('t'); params.delete('s'); params.delete('e')
    }
    const search = params.toString()
    const path = pathnameParaCompartilhamento(location.pathname)
    const url = buildAppShareLink(path, search ? `?${search}` : '')
    const tituloDoc = document.title || 'Bíblia DC'
    const itemAtual = itemId ? encontrarAssimDizItem(itemId) : null
    const titulo = itemAtual?.titulo
      ? `${itemAtual.titulo} — Assim diz o Senhor`
      : tituloDoc
    const texto = `Leia esta reflexão: ${titulo}\n${url}`
    return { url, titulo, texto }
  }

  // TELA INICIAL: escolha do tema principal
  if (!temaSelecionado) {
    return (
      <Box sx={{ width: '100%', minHeight: '100%', bgcolor: 'background.default', pt: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 32px)', px: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', touchAction: 'pan-y', fontFamily: ff }}>
        {/* Card principal: Salvação */}
        <Card sx={{
          ...getGlassCardStyles('linear-gradient(135deg, rgba(34, 197, 94, 0.85) 0%, rgba(20, 83, 45, 0.85) 100%)', {
            hover: true,
            shimmer: false,
            borderRadius: 2,
            performance: true,
          }),
          mb: 2,
          width: '100%',
          maxWidth: 400,
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="body1" align="center" sx={{ fontWeight: 'bold', mb: 2, fontSize: `${fontSize}%`, color: 'white' }}>
              O que precisamos saber sobre a Salvação?
            </Typography>
            <Button variant="contained" color="primary" size="medium" onClick={() => abrirSalvacaoEtapa(0)}>
              Começar
            </Button>
          </CardContent>
        </Card>
        {/* Card principal: Assim diz o Senhor */}
        <Card sx={{
          ...getGlassCardStyles('linear-gradient(135deg, rgba(37, 99, 235, 0.85) 0%, rgba(30, 64, 175, 0.85) 100%)', {
            hover: true,
            shimmer: false,
            borderRadius: 2,
            performance: true,
          }),
          mb: 2,
          width: '100%',
          maxWidth: 400,
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="body1" align="center" sx={{ fontWeight: 'bold', mb: 2, fontSize: `${fontSize}%`, color: 'white' }}>
              Assim diz o Senhor
            </Typography>
            <Button variant="contained" color="primary" size="medium" onClick={() => abrirAssimDizLista()}>
              Começar
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // SELEÇÃO DE SUBTEMA DE "ASSIM DIZ O SENHOR"
  if (temaSelecionado === 'assimDizSenhor' && !subtemaSelecionado) {
    const subtemasFiltrados = subtemasAssimDizSenhor.filter(subtema => {
      const item = maisDeDeusData.assimDizSenhor.find(i => i.id === subtema.id);
      return (
        subtema.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (subtema.referencia && subtema.referencia.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item && item.texto && item.texto.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item && item.reflexao && item.reflexao.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    return (
      <Box sx={{ width: '100%', minHeight: '100%', bgcolor: 'background.default', pt: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 32px)', px: { xs: 1, sm: 3 }, touchAction: 'pan-y' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar reflexão..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mt: 0, mb: 2 }}
        />
        <Box sx={{ mb: 2, textAlign: 'left' }}>
          <Button variant="outlined" color="primary" onClick={() => abrirInicio({ replace: true })}>
            Voltar
          </Button>
        </Box>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          {/* Compartilha o link da lista — o destinatário escolhe o que ler.
              (Antes este botão exportava as marcações como lido, o que só servia
              para “espelhar” o progresso do remetente no app do recebedor.) */}
          {(() => {
            const { url, titulo, texto } = buildLinkReflexao()
            return (
              <CompartilharMenu
                linkUrl={url}
                linkTitle={titulo}
                linkText={texto}
              />
            )
          })()}
        </Box>
        <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2 }}>
          {subtemasFiltrados.map((subtema) => (
              <Card key={subtema.id} sx={{
                ...getGlassCardStyles('linear-gradient(135deg, rgba(37, 99, 235, 0.85) 0%, rgba(30, 64, 175, 0.85) 100%)', {
                  hover: true,
                  shimmer: false,
                  borderRadius: 2,
                  performance: true,
                }),
                position: 'relative',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }} onClick={() => abrirAssimDizItem(subtema.id)}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="body1" align="center" sx={{ fontWeight: 'bold', mb: 2, fontSize: `${fontSize}%`, color: 'white' }}>
                    {subtema.titulo}
          </Typography>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.9)' }}>{subtema.referencia}</Typography>
                  <Button variant="contained" color="primary" size="medium">
            Começar
                  </Button>
                </CardContent>
                {subtemasLidos.some((lidoId) => mesmoId(lidoId, subtema.id)) && (
                  <Tooltip title="Reflexão lida">
                    <CheckCircleIcon 
                      sx={{
                        color: 'success.main',
                        fontSize: '3.5rem',
                        position: 'absolute',
                        top: '35%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        opacity: 0.25,
                        zIndex: 1
                      }} 
                    />
                  </Tooltip>
                )}
              </Card>
          ))}
        </Box>
      </Box>
    )
  }

  // EXIBIÇÃO DO SUBTEMA DE "ASSIM DIZ O SENHOR"
  if (temaSelecionado === 'assimDizSenhor' && subtemaSelecionado) {
    const item = encontrarAssimDizItem(subtemaSelecionado)
    if (!item) {
      return null
    }
    const lido = subtemasLidos.some((lidoId) => mesmoId(lidoId, item.id));
    const toggleLido = () => {
      setSubtemasLidos(prev =>
        prev.some((lidoId) => mesmoId(lidoId, item.id))
          ? prev.filter((lidoId) => !mesmoId(lidoId, item.id))
          : [...prev, item.id]
      );
    };
    return (
      <Box sx={{ width: '100%', minHeight: '100vh', '@supports (min-height: 100dvh)': { minHeight: '100dvh' }, bgcolor: 'background.default', pt: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 32px)', px: { xs: 1, sm: 3 }, touchAction: 'pan-y', fontFamily: ff }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, px: { xs: 0, sm: 2 }, flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" color="primary" onClick={() => abrirAssimDizLista({ replace: true })}>
            Voltar
          </Button>
          {/* Partilha o link desta reflexão (não exporta marcações). */}
          {(() => {
            const { url, titulo, texto } = buildLinkReflexao(item.id)
            return (
              <CompartilharMenu
                linkUrl={url}
                linkTitle={titulo}
                linkText={texto}
              />
            )
          })()}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={lido ? 'Desmarcar como lido' : 'Marcar como lido'}>
              <IconButton onClick={toggleLido} color={lido ? 'success' : 'default'}>
                <CheckCircleIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ ml: 1, color: lido ? 'success.main' : 'text.primary', fontWeight: lido ? 'bold' : 'normal' }}>
              {lido ? 'Lido' : 'Marcar como lido'}
            </Typography>
          </Box>
        </Box>
        <Paper elevation={3} sx={{ p: { xs: 1, sm: 3, md: 4 }, mb: 2, width: '100%', maxWidth: 880, mx: 'auto', boxSizing: 'border-box', fontFamily: ff }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, textAlign: textAlign || 'left' }}>{item.titulo}</Typography>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', textAlign: textAlign || 'left' }}>{item.referencia}</Typography>
          <Typography variant="body1" sx={{ fontStyle: 'italic', mb: 2, textAlign: textAlign || 'left' }}>
            <TextoComReferencias texto={item.texto} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
          </Typography>
          <Box sx={{ textAlign: textAlign || 'left' }}>
            <TextoComReferencias texto={item.reflexao} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
          </Box>
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{item.autor}</Typography>
          </Box>
        </Paper>
      </Box>
    )
  }

  // FLUXO DEVOCIONAL (SALVAÇÃO)
  const etapas = etapasSalvacao

  const etapa = etapas[etapaAtual]

  // Renderização condicional do conteúdo
  let conteudo = null
  if (etapa.tipo === 'apresentacao') {
    const p = maisDeDeusData.presentation
    conteudo = (
      <Box>
        <Button variant="outlined" color="primary" sx={{ mb: 2 }} onClick={() => abrirInicio({ replace: true })}>
          Voltar
        </Button>
        <Typography variant="h5" gutterBottom sx={{ textAlign: textAlign || 'left' }}>Apresentação</Typography>
        <Box sx={{ textAlign: textAlign || 'left' }}>
        <TextoComReferencias texto={p.text} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
        </Box>
        <Box sx={{ mt: 4, textAlign: textAlign || 'left' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Objetivo:</Typography>
          <TextoComReferencias texto={p.objective} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
        </Box>
        <Box sx={{ mt: 4, textAlign: textAlign || 'left' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Desejo:</Typography>
          <TextoComReferencias texto={p.desire} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
        </Box>
        <Box sx={{ mt: 4, textAlign: textAlign || 'left' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Oração:</Typography>
          <TextoComReferencias texto={p.prayer} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">{p.author.name}</Typography>
          <Typography variant="body2">{p.author.role}</Typography>
          <Typography variant="body2">{p.author.date}</Typography>
        </Box>
      </Box>
    )
  } else if (etapa.tipo === 'pergunta') {
    const questao = maisDeDeusData.questions[etapa.index]
    conteudo = (
      <Box>
        <Typography variant="h7" gutterBottom sx={{ textAlign: textAlign || 'left' }}>{etapa.label}</Typography>
        <Box sx={{ textAlign: textAlign || 'left' }}>
        <TextoComReferencias texto={questao.answer} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
        </Box>
        {questao.characteristics && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Características:</Typography>
            {Array.isArray(questao.characteristics) ? (
              questao.characteristics.map((characteristic, index) => (
                <TextoComReferencias key={index} texto={characteristic} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
              ))
            ) : (
              <TextoComReferencias texto={questao.characteristics} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
            )}
          </Box>
        )}
        {questao.aspects && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Aspectos:</Typography>
            {typeof questao.aspects === 'string' ? (
              <TextoComReferencias texto={questao.aspects} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
            ) : (
              Object.entries(questao.aspects).map(([key, value]) => (
                <Box key={key} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary">{key.charAt(0).toUpperCase() + key.slice(1)}:</Typography>
                  <TextoComReferencias texto={value} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
                </Box>
              ))
            )}
          </Box>
        )}
        {questao.reasons && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Razões:</Typography>
            {Array.isArray(questao.reasons) ? (
              questao.reasons.map((reason, index) => (
                <TextoComReferencias key={index} texto={reason} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
              ))
            ) : (
              <TextoComReferencias texto={questao.reasons} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
            )}
          </Box>
        )}
        {questao.trinity && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>A Trindade na Salvação:</Typography>
            {Object.entries(questao.trinity).map(([key, value]) => (
              <Box key={key} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary">{key.charAt(0).toUpperCase() + key.slice(1)}:</Typography>
                <TextoComReferencias texto={value} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
              </Box>
            ))}
          </Box>
        )}
        {questao.wrongPlaces && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Lugares Errados:</Typography>
            {Array.isArray(questao.wrongPlaces) ? (
              questao.wrongPlaces.map((place, index) => (
                <TextoComReferencias key={index} texto={place} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
              ))
            ) : (
              <TextoComReferencias texto={questao.wrongPlaces} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
            )}
          </Box>
        )}
        {questao.correctPlace && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Lugar Correto:</Typography>
            <TextoComReferencias texto={questao.correctPlace} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
          </Box>
        )}
        {questao.changes && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Mudanças:</Typography>
            {Array.isArray(questao.changes) ? (
              questao.changes.map((change, index) => (
                <TextoComReferencias key={index} texto={change} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
              ))
            ) : (
              <TextoComReferencias texto={questao.changes} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
            )}
          </Box>
        )}
        {questao.evidences && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Evidências:</Typography>
            {Array.isArray(questao.evidences) ? (
              questao.evidences.map((evidence, index) => (
                <TextoComReferencias key={index} texto={evidence} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
              ))
            ) : (
              <TextoComReferencias texto={questao.evidences} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
            )}
          </Box>
        )}
        {questao.actions && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Ações:</Typography>
            {Array.isArray(questao.actions) ? (
              questao.actions.map((action, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary">{action.title}:</Typography>
                  <TextoComReferencias texto={action.description} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
                </Box>
              ))
            ) : (
              <TextoComReferencias texto={questao.actions} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
            )}
          </Box>
        )}
        {questao.followUpQuestions && (
          <Box sx={{ mt: 2, textAlign: textAlign || 'left' }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Perguntas Adicionais:</Typography>
            {questao.followUpQuestions.map((q, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary">{q.question}</Typography>
                <TextoComReferencias texto={q.answer} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  } else if (etapa.tipo === 'reflexao') {
    conteudo = (
      <Box>
        <Typography variant="h5" gutterBottom>Perguntas para Reflexão</Typography>
        <Box>
          {maisDeDeusData.reflectionQuestions.map((q, i) => (
            <TextoComReferencias key={i} texto={q} component="div" sx={{ mb: 2 }} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
          ))}
        </Box>
      </Box>
    )
  } else if (etapa.tipo === 'cremos') {
    conteudo = (
      <Box>
        <Typography variant="h5" gutterBottom>Cremos</Typography>
        <TextoComReferencias texto={maisDeDeusData.beliefs.text} component="div" sx={{ mb: 2 }} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
        <Box>
          {maisDeDeusData.beliefs.keyPoints.map((p, i) => (
            <TextoComReferencias key={i} texto={p} component="div" sx={{ mb: 2 }} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%', fontFamily: ff }}>
      <Drawer
        anchor="left"
        open={menuAberto}
        onClose={() => setMenuAberto(false)}
        PaperProps={{
          sx: {
            width: { xs: '88vw', sm: 340 },
            maxWidth: 360,
            maxHeight: '100vh',
            '@supports (max-height: 100dvh)': { maxHeight: '100dvh' },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            pt: 'env(safe-area-inset-top, 0px)'
          }
        }}
      >
        <List sx={{ width: '100%', bgcolor: 'background.paper', position: 'relative', overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', flex: 1, minHeight: 0, '& ul': { padding: 0 } }}>
          {etapas.map((item, index) => (
            <ListItemButton
              key={index}
              selected={index === etapaAtual}
              onClick={() => {
                setMenuAberto(false)
                abrirSalvacaoEtapa(index, { replace: true })
              }}
              sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)', py: 1 }}
            >
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.9rem', lineHeight: 1.25 }}
              />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          {/* Compartilha o link de "Assim diz o Senhor" (sem exportar marcações
              de leitura — quem recebe abre e escolhe o que quer ler). */}
          {(() => {
            const search = 'tema=assimDizSenhor'
            const path = pathnameParaCompartilhamento('/mais-de-deus')
            const url = buildAppShareLink(path, `?${search}`)
            return (
              <CompartilharMenu
                linkUrl={url}
                linkTitle="Assim diz o Senhor"
                linkText={`Leia: ${url}`}
                label='Compartilhar "Assim diz o Senhor"'
                sx={{ width: '100%' }}
              />
            )
          })()}
        </Box>
      </Drawer>

      <Container maxWidth={false} disableGutters sx={{ px: { xs: 1, sm: 3 }, pt: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 32px)', mt: 0, width: '100%', minWidth: 0, touchAction: 'pan-y' }}>
        <Box sx={{ position: 'relative', width: '100%', maxWidth: 900, mx: 'auto', minHeight: 44, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 5.5, sm: 7 } }}>
          <Typography variant="h5" align="center" sx={{ fontWeight: 'bold', m: 0, fontSize: `${fontSize}%`, lineHeight: 1.25 }}>
            {maisDeDeusData.title}
          </Typography>
          <Tooltip title="Abrir etapas">
            <IconButton
              aria-label="Abrir etapas"
              onClick={() => setMenuAberto(true)}
              sx={{
                position: 'absolute',
                right: { xs: 0, sm: 4 },
                top: '50%',
                transform: 'translateY(-50%)',
                width: 44,
                height: 44,
                color: 'text.primary',
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                boxShadow: 2,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ position: 'relative', width: '100%', maxWidth: 900, mx: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', position: 'fixed', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', px: 1, zIndex: 1000 }}>
            <IconButton
              onClick={() => (etapaAtual > 0 ? abrirSalvacaoEtapa(etapaAtual - 1, { replace: true }) : undefined)}
              disabled={etapaAtual === 0}
              sx={{ bgcolor: 'background.paper', opacity: 0.9, color: 'primary.main', border: 1, borderColor: 'divider', boxShadow: 3, '&:hover': { bgcolor: 'action.hover', opacity: 1 }, '&.Mui-disabled': { opacity: 0.28 } }}
            >
              <NavigateBefore />
            </IconButton>

            <IconButton
              onClick={() => {
                if (etapaAtual < etapas.length - 1) {
                  abrirSalvacaoEtapa(etapaAtual + 1, { replace: true })
                }
              }}
              disabled={etapaAtual === etapas.length - 1}
              sx={{ bgcolor: 'background.paper', opacity: 0.9, color: 'primary.main', border: 1, borderColor: 'divider', boxShadow: 3, '&:hover': { bgcolor: 'action.hover', opacity: 1 }, '&.Mui-disabled': { opacity: 0.28 } }}
            >
              <NavigateNext />
            </IconButton>
          </Box>

          <Paper elevation={2} sx={{ p: { xs: 1, sm: 3 }, mb: 2, mt: 0, bgcolor: 'background.default', width: '100%', maxWidth: '100%', boxSizing: 'border-box', fontFamily: ff, '&:hover': { bgcolor: 'background.default' } }}>
            {conteudo}
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

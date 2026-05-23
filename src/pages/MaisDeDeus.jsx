import { useState, useEffect } from 'react'
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
  Grid,
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

export default function MaisDeDeus() {
  const navigate = useNavigate()
  const location = useLocation()
  const { voltarParaPaginaAnterior, fontSize, textAlign, fontFamily, lineHeight } = useApp()
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

  useEffect(() => {
    localStorage.setItem('subtemasAssimDizLidos', JSON.stringify(subtemasLidos));
  }, [subtemasLidos]);

  // Deep link: /mais-de-deus?tema=...&item=...&etapa=... (compatível com t/s/e)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tema = params.get('tema') ?? params.get('t')
    if (!tema) return

    if (tema === 'assimDizSenhor') {
      setTemaSelecionado('assimDizSenhor')
      setIniciou(false)
      const subtema = params.get('item') ?? params.get('s')
      if (subtema && maisDeDeusData.assimDizSenhor.some((i) => i.id === subtema)) {
        setSubtemaSelecionado(subtema)
      } else {
        setSubtemaSelecionado(null)
      }
      return
    }

    if (tema === 'salvacao') {
      setTemaSelecionado('salvacao')
      setSubtemaSelecionado(null)
      setIniciou(true)
      const etapa = Number(params.get('etapa') ?? params.get('e'))
      if (Number.isInteger(etapa) && etapa >= 0) {
        setEtapaAtual(Math.min(etapasSalvacao.length - 1, etapa))
      }
    }
  }, [location.search])

  // Mantém a URL sincronizada para compartilhamento do estudo/subtema atual.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!temaSelecionado) {
      params.delete('tema')
      params.delete('item')
      params.delete('etapa')
      params.delete('t')
      params.delete('s')
      params.delete('e')
    } else if (temaSelecionado === 'assimDizSenhor') {
      params.set('tema', 'assimDizSenhor')
      if (subtemaSelecionado) params.set('item', subtemaSelecionado)
      else params.delete('item')
      params.delete('etapa')
      params.delete('t')
      params.delete('s')
      params.delete('e')
    } else if (temaSelecionado === 'salvacao') {
      params.set('tema', 'salvacao')
      if (iniciou) params.set('etapa', String(etapaAtual))
      else params.delete('etapa')
      params.delete('item')
      params.delete('t')
      params.delete('s')
      params.delete('e')
    }

    const nextSearch = params.toString()
    const currentSearch = (location.search || '').replace(/^\?/, '')
    if (nextSearch !== currentSearch) {
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true })
    }
  }, [temaSelecionado, subtemaSelecionado, iniciou, etapaAtual, location.pathname, location.search, navigate])

  /** Zoom global só na “camada” atual (ex.: lista → texto de um subtema → voltar). */
  useEffect(() => {
    bumpZoomReset()
  }, [temaSelecionado, subtemaSelecionado, bumpZoomReset])

  // Suporte ao botão voltar do celular
  useEffect(() => {
    const handlePopState = () => {
      if (subtemaSelecionado) {
        setSubtemaSelecionado(null)
      } else if (temaSelecionado === 'salvacao' && iniciou && etapaAtual > 0) {
        setEtapaAtual(prev => Math.max(0, prev - 1))
      } else if (temaSelecionado === 'salvacao' && iniciou) {
        setIniciou(false)
        setTemaSelecionado(null)
      } else if (temaSelecionado) {
        setTemaSelecionado(null)
      } else {
        voltarParaPaginaAnterior('/biblia')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [temaSelecionado, subtemaSelecionado, iniciou, etapaAtual, voltarParaPaginaAnterior])

  // Ao trocar de etapa pelas setas, iniciar no topo da página
  useEffect(() => {
    if (temaSelecionado === 'salvacao' && iniciou) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [etapaAtual, temaSelecionado, iniciou])

  // Temas principais
  const temasPrincipais = [
    {
      id: 'salvacao',
      titulo: 'O que precisamos saber sobre a Salvação?'
    },
    {
      id: 'assimDizSenhor',
      titulo: 'Assim diz o Senhor'
    }
  ]

  // Etapas do devocional
  const etapasSalvacao = [
    { tipo: 'apresentacao', label: 'Apresentação' },
    ...maisDeDeusData.questions.map((q, i) => ({ tipo: 'pergunta', index: i, label: `${i + 1}. ${q.question}` })),
    { tipo: 'reflexao', label: 'Reflexão' },
    { tipo: 'cremos', label: 'Cremos' }
  ]

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
    const itemAtual = itemId
      ? maisDeDeusData.assimDizSenhor.find((i) => i.id === itemId)
      : null
    const titulo = itemAtual?.titulo
      ? `${itemAtual.titulo} — Assim diz o Senhor`
      : tituloDoc
    const texto = `Leia esta reflexão: ${titulo}\n${url}`
    return { url, titulo, texto }
  }

  // TELA INICIAL: escolha do tema principal
  if (!temaSelecionado) {
    return (
      <Box sx={{ width: '100%', minHeight: '100vh', '@supports (min-height: 100dvh)': { minHeight: '100dvh' }, bgcolor: 'background.default', pt: 2, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: ff }}>
        {/* Card principal: Salvação */}
        <Card sx={{
          ...getGlassCardStyles('linear-gradient(135deg, rgba(34, 197, 94, 0.85) 0%, rgba(20, 83, 45, 0.85) 100%)', {
            hover: true,
            shimmer: true,
            borderRadius: 2,
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
            <Button variant="contained" color="primary" size="medium" onClick={() => { setTemaSelecionado('salvacao'); setIniciou(true); window.history.pushState({ listaType: 'mais-de-deus-conteudo' }, ''); }}>
              Começar
            </Button>
          </CardContent>
        </Card>
        {/* Card principal: Assim diz o Senhor */}
        <Card sx={{
          ...getGlassCardStyles('linear-gradient(135deg, rgba(37, 99, 235, 0.85) 0%, rgba(30, 64, 175, 0.85) 100%)', {
            hover: true,
            shimmer: true,
            borderRadius: 2,
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
            <Button variant="contained" color="primary" size="medium" onClick={() => { setTemaSelecionado('assimDizSenhor'); window.history.pushState({ listaType: 'mais-de-deus-tema' }, ''); }}>
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
      <Box sx={{ width: '100%', minHeight: '100vh', '@supports (min-height: 100dvh)': { minHeight: '100dvh' }, bgcolor: 'background.default', pt: 2, px: 2 }}>
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
          <Button variant="outlined" color="primary" onClick={() => window.history.back()}>
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
        <Grid container spacing={2} justifyContent="center">
          {subtemasFiltrados.map((subtema) => (
            <Grid item xs={12} sm={8} md={6} key={subtema.id}>
              <Card sx={{
                ...getGlassCardStyles('linear-gradient(135deg, rgba(37, 99, 235, 0.85) 0%, rgba(30, 64, 175, 0.85) 100%)', {
                  hover: true,
                  shimmer: true,
                  borderRadius: 2,
                }),
                position: 'relative',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }} onClick={() => { setSubtemaSelecionado(subtema.id); window.history.pushState({ listaType: 'mais-de-deus-conteudo' }, ''); }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="body1" align="center" sx={{ fontWeight: 'bold', mb: 2, fontSize: `${fontSize}%`, color: 'white' }}>
                    {subtema.titulo}
          </Typography>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.9)' }}>{subtema.referencia}</Typography>
                  <Button variant="contained" color="primary" size="medium">
            Começar
                  </Button>
                </CardContent>
                {subtemasLidos.includes(subtema.id) && (
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
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  // EXIBIÇÃO DO SUBTEMA DE "ASSIM DIZ O SENHOR"
  if (temaSelecionado === 'assimDizSenhor' && subtemaSelecionado) {
    const item = maisDeDeusData.assimDizSenhor.find((i) => i.id === subtemaSelecionado)
    const lido = subtemasLidos.includes(item.id);
    const toggleLido = () => {
      setSubtemasLidos(prev =>
        prev.includes(item.id) ? prev.filter(lidoId => lidoId !== item.id) : [...prev, item.id]
      );
    };
    return (
      <Box sx={{ width: '100%', minHeight: '100vh', '@supports (min-height: 100dvh)': { minHeight: '100dvh' }, bgcolor: 'background.default', pt: 2, px: 0, fontFamily: ff }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, px: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" color="primary" onClick={() => window.history.back()}>
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
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, mb: 2, width: '100%', boxSizing: 'border-box', fontFamily: ff }}>
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
        <Button variant="outlined" color="primary" sx={{ mb: 2 }} onClick={() => window.history.back()}>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', '@supports (min-height: 100dvh)': { minHeight: '100dvh' }, fontFamily: ff }}>
      {/* Menu do MaisDeDeus - Posicionado à direita do AppBar */}
      <Box sx={{ position: 'fixed', top: 0, right: 0, zIndex: 1100, p: 1 }}>
        <IconButton color="inherit" onClick={() => setMenuAberto(true)} sx={{ color: 'white' }}>
          <MenuIcon />
        </IconButton>
      </Box>

      <Drawer
        anchor="left"
        open={menuAberto}
        onClose={() => setMenuAberto(false)}
        PaperProps={{ sx: { width: 300, mt: 2, maxHeight: 'calc(100vh)', overflowY: 'auto' } }}
      >
        <List sx={{ width: '100%', bgcolor: 'background.paper', position: 'relative', overflow: 'auto', maxHeight: '100%', '& ul': { padding: 0 } }}>
          {etapas.map((item, index) => (
            <ListItemButton
              key={index}
              selected={index === etapaAtual}
              onClick={() => {
                setEtapaAtual(index)
                setMenuAberto(false)
                if (index > etapaAtual) window.history.pushState({ listaType: 'mais-de-deus-etapa' }, '')
              }}
              sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)', py: 1 }}
            >
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.9rem', noWrap: true }}
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

      <Container maxWidth={false} disableGutters sx={{ px: 0, pt: 2, pb: 2, mt: 0, width: '100%', minWidth: 0 }}>
        <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 3, fontSize: `${fontSize}%` }}>
          {maisDeDeusData.title}
        </Typography>

        <Box sx={{ position: 'relative', width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', position: 'fixed', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', px: 1, zIndex: 1000 }}>
            <IconButton
              onClick={() => (etapaAtual > 0 ? window.history.back() : undefined)}
              disabled={etapaAtual === 0}
              sx={{ bgcolor: '#004d40', opacity: 0.6, color: 'white', '&:hover': { bgcolor: '#004d40', opacity: 0.9 }, '&.Mui-disabled': { opacity: 0.2 } }}
            >
              <NavigateBefore />
            </IconButton>

            <IconButton
              onClick={() => {
                if (etapaAtual < etapas.length - 1) {
                  window.history.pushState({ listaType: 'mais-de-deus-etapa' }, '')
                  setEtapaAtual(Math.min(etapas.length - 1, etapaAtual + 1))
                }
              }}
              disabled={etapaAtual === etapas.length - 1}
              sx={{ bgcolor: '#004d40', opacity: 0.6, color: 'white', '&:hover': { bgcolor: '#004d40', opacity: 0.9 }, '&.Mui-disabled': { opacity: 0.2 } }}
            >
              <NavigateNext />
            </IconButton>
          </Box>

          <Paper elevation={2} sx={{ p: { xs: 1, sm: 2, md: 3 }, mb: 2, mt: 0, bgcolor: 'background.default', width: '100%', maxWidth: '100%', boxSizing: 'border-box', fontFamily: ff, '&:hover': { bgcolor: 'background.default' } }}>
            {conteudo}
          </Paper>
        </Box>
      </Container>
    </Box>
  )
} 
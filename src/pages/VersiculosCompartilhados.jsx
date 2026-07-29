import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import CompartilharVersiculoImagemDialog from '../components/CompartilharVersiculoImagemDialog'
import { FUNDOS_VERSICULO, formatarCitacaoTextoVersiculo, urlFundoVersiculo, urlLogoApp } from '../utils/versiculoImagem'
import { confirmarAsync, mostrarSnackbar } from '../utils/uiDialogs'
import {
  alterarPrivacidadeCompartilhamento,
  alternarCurtida,
  assinarFeedPublico,
  assinarMeusCompartilhamentos,
  excluirCompartilhamento,
  obterCurtidasDoUsuario,
  obterCompartilhamentoPorLink,
  registrarCompartilhamentoVersiculoDoDia,
  registrarRecompartilhamento,
} from '../services/versiculosCompartilhadosService'
import { buildAppShareLink } from '../services/bibliaEstudosService'

function CartaoImagem({ item, onClick }) {
  const fundo = FUNDOS_VERSICULO.find((f) => f.id === item.fundoId) || FUNDOS_VERSICULO[0]
  const citacao = formatarCitacaoTextoVersiculo(item.texto)
  return (
    <Box
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Abrir ${item.referencia}` : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      } : undefined}
      sx={{
      position: 'relative', aspectRatio: '4 / 5', width: '100%', overflow: 'hidden', borderRadius: 1,
      bgcolor: fundo.cor || '#183b35', color: '#fff', backgroundSize: 'cover', backgroundPosition: 'center',
      backgroundImage: fundo.arquivo
        ? `linear-gradient(rgba(4,15,20,${fundo.overlay}), rgba(4,15,20,${fundo.overlay})), url("${urlFundoVersiculo(fundo)}")`
        : 'none',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center',
      px: 2, py: 1.75, boxSizing: 'border-box', cursor: onClick ? 'pointer' : 'default',
      outline: 'none',
      '&:focus-visible': onClick ? { boxShadow: '0 0 0 3px rgba(11,91,54,.45)' } : undefined,
    }}>
      <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, textAlign: 'center', opacity: 0.9 }}>
        BÍBLIA DO DISCÍPULO CRISTÃO
      </Typography>
      <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 700, lineHeight: 1.35, textAlign: 'center', textShadow: '0 2px 7px rgba(0,0,0,.6)', fontSize: citacao.length > 300 ? '0.82rem' : citacao.length > 150 ? '0.98rem' : '1.15rem', whiteSpace: 'pre-line' }}>
        {citacao}
      </Typography>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>{item.referencia}</Typography>
        <Box component="img" src={urlLogoApp()} alt="" sx={{ width: 24, height: 24, mt: 0.6, borderRadius: 0.5 }} />
      </Box>
    </Box>
  )
}

export default function VersiculosCompartilhados() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useFirebaseAuth()
  const [aba, setAba] = useState(0)
  const [publicos, setPublicos] = useState([])
  const [meus, setMeus] = useState([])
  const [curtidos, setCurtidos] = useState(new Set())
  const [carregando, setCarregando] = useState(true)
  const [compartilhar, setCompartilhar] = useState(null)
  const [itemDireto, setItemDireto] = useState(null)
  const [carregandoDireto, setCarregandoDireto] = useState(false)
  const itemId = useMemo(() => new URLSearchParams(location.search).get('item') || '', [location.search])

  useEffect(() => {
    if (!itemId) { setItemDireto(null); setCarregandoDireto(false); return }
    let ativo = true
    setCarregandoDireto(true)
    obterCompartilhamentoPorLink(itemId)
      .then((item) => { if (ativo) setItemDireto(item) })
      .catch(() => { if (ativo) setItemDireto(null) })
      .finally(() => { if (ativo) setCarregandoDireto(false) })
    return () => { ativo = false }
  }, [itemId])

  useEffect(() => {
    let ativo = true
    let unsubPublico = () => {}
    let unsubMeus = () => {}
    Promise.all([
      assinarFeedPublico((lista) => { if (ativo) { setPublicos(lista); setCarregando(false) } }, () => ativo && setCarregando(false)).then((u) => { if (ativo) unsubPublico = u; else u?.() }),
      user?.uid
        ? assinarMeusCompartilhamentos(user.uid, (lista) => ativo && setMeus(lista), () => {}).then((u) => { if (ativo) unsubMeus = u; else u?.() })
        : Promise.resolve(),
      user?.uid ? obterCurtidasDoUsuario(user.uid).then((ids) => ativo && setCurtidos(ids)).catch(() => {}) : Promise.resolve(),
    ]).catch(() => ativo && setCarregando(false))
    return () => { ativo = false; unsubPublico?.(); unsubMeus?.() }
  }, [user?.uid])

  const publicosPorId = useMemo(() => new Map(publicos.map((item) => [item.id, item])), [publicos])
  const versiculoDoDiaPublico = useMemo(() => {
    return publicos
      .filter((item) => item.tipo === 'versiculo-do-dia')
      .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
      .at(0) || null
  }, [publicos])
  const versiculosPublicosOrdenados = useMemo(() => {
    return publicos
      .filter((item) => item.tipo !== 'versiculo-do-dia')
      .sort((a, b) => {
        const pontosA = Number(a.likesCount || 0) + Number(a.sharesCount || 0)
        const pontosB = Number(b.likesCount || 0) + Number(b.sharesCount || 0)
        return pontosB - pontosA || Number(b.createdAt || 0) - Number(a.createdAt || 0)
      })
  }, [publicos])
  const lista = meus.map((item) => ({ ...item, ...(publicosPorId.get(item.id) || {}) }))
  const itemAlvoDireto = itemId
    ? publicosPorId.get(itemId) || lista.find((item) => item.id === itemId) || itemDireto
    : null

  const linkDoCompartilhamento = (item) => {
    if (item?.tipo === 'versiculo-do-dia' && item?.data) {
      return buildAppShareLink('/versiculo-do-dia', `data=${encodeURIComponent(item.data)}`)
    }
    return buildAppShareLink('/versiculos-compartilhados', `item=${encodeURIComponent(item?.id || '')}`)
  }

  const curtir = async (item) => {
    if (!user?.uid) return
    const antes = curtidos.has(item.id)
    setCurtidos((old) => { const next = new Set(old); antes ? next.delete(item.id) : next.add(item.id); return next })
    setPublicos((old) => old.map((p) => p.id === item.id ? { ...p, likesCount: Math.max(0, Number(p.likesCount || 0) + (antes ? -1 : 1)) } : p))
    try { await alternarCurtida(user.uid, item.id) } catch {
      mostrarSnackbar({ mensagem: 'Não foi possível atualizar a curtida.', severidade: 'warning' })
    }
  }

  const excluir = async (item) => {
    const ok = await confirmarAsync({
      titulo: 'Excluir compartilhamento?',
      mensagem: item.publico
        ? 'A imagem também será retirada do mural público. Esta ação não pode ser desfeita.'
        : 'A imagem será removida dos seus compartilhamentos. Esta ação não pode ser desfeita.',
      labelOk: 'Excluir',
      destrutivo: true,
    })
    if (!ok) return
    try { await excluirCompartilhamento(user.uid, item.id) }
    catch { mostrarSnackbar({ mensagem: 'Não foi possível excluir o compartilhamento.', severidade: 'error' }) }
  }

  const alterarPrivacidade = async (item) => {
    try {
      await alterarPrivacidadeCompartilhamento(user.uid, item.id, !item.publico)
      mostrarSnackbar({ mensagem: item.publico ? 'O compartilhamento agora é privado.' : 'Publicado anonimamente no mural.', severidade: 'success' })
    } catch (error) {
      mostrarSnackbar({ mensagem: error?.message || 'Não foi possível alterar a privacidade.', severidade: 'error' })
    }
  }

  const renderCartao = (item) => {
    const gostei = curtidos.has(item.id)
    return (
      <Paper key={item.id} variant="outlined" sx={{ p: 0.75, minWidth: 0, overflow: 'hidden' }}>
        <CartaoImagem
          item={item}
          onClick={item.tipo === 'versiculo-do-dia' ? () => navigate('/versiculo-do-dia') : undefined}
        />
        <Stack direction="row" alignItems="center" sx={{ minHeight: 44, mt: 0.5 }}>
          {item.publico !== false && <IconButton onClick={() => void curtir(item)} aria-label={gostei ? 'Remover curtida' : 'Curtir'} color={gostei ? 'error' : 'default'}>{gostei ? <FavoriteIcon /> : <FavoriteBorderIcon />}</IconButton>}
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{Number(item.likesCount || 0)}</Typography>
          <IconButton onClick={() => setCompartilhar(item)} aria-label="Compartilhar imagem"><IosShareOutlinedIcon /></IconButton>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{Number(item.sharesCount || 0)}</Typography>
        </Stack>
        {aba === 1 && (
          <Stack spacing={0.75} sx={{ px: 0.25, pb: 0.5 }}>
            <Chip size="small" icon={item.publico ? <PublicOutlinedIcon /> : <LockOutlinedIcon />} label={item.publico ? 'Público' : 'Privado'} />
            <Button size="small" onClick={() => void alterarPrivacidade(item)}>{item.publico ? 'Tornar privado' : 'Publicar no mural'}</Button>
            <Button size="small" startIcon={<IosShareOutlinedIcon />} onClick={() => setCompartilhar(item)}>Compartilhar</Button>
            <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => void excluir(item)}>Excluir</Button>
          </Stack>
        )}
      </Paper>
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1040, mx: 'auto', px: '8px', py: 2, boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconButton onClick={() => navigate('/')} aria-label="Voltar"><ArrowBackIcon /></IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>Versículos compartilhados</Typography>
          <Typography variant="body2" color="text.secondary">Um mural anônimo da Palavra, sem nomes ou perfis.</Typography>
        </Box>
      </Box>
      {!itemId && <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
        <Tabs value={aba} onChange={(_, valor) => setAba(valor)} variant="fullWidth" sx={{ '& .MuiTab-root': { px: 0.75, fontSize: { xs: '0.7rem', sm: '0.82rem' }, lineHeight: 1.2 } }}>
          <Tab icon={<PublicOutlinedIcon />} iconPosition="start" label="Versículos compartilhados" />
          <Tab icon={<LockOutlinedIcon />} iconPosition="start" label="Meus versículos compartilhados" />
        </Tabs>
      </Paper>}

      {itemId ? (
        carregandoDireto && !itemAlvoDireto ? (
          <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : itemAlvoDireto ? (
          <Paper component="section" variant="outlined" sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'background.paper' }}>
            <Typography component="h2" variant="h5" align="center" sx={{ fontWeight: 900, mb: 1.5 }}>
              Versículo compartilhado
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 410, mx: 'auto' }}>
              {renderCartao(itemAlvoDireto)}
            </Box>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Este compartilhamento não está mais disponível</Typography>
          </Paper>
        )
      ) : carregando ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (aba === 0 ? !versiculoDoDiaPublico && versiculosPublicosOrdenados.length === 0 : lista.length === 0) ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{aba === 0 ? 'O mural ainda está vazio' : 'Você ainda não compartilhou imagens'}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>Compartilhe um versículo como imagem pela Bíblia para vê-lo aqui.</Typography>
        </Paper>
      ) : aba === 0 ? (
        <Stack spacing={3}>
          {versiculoDoDiaPublico && (
            <Paper component="section" variant="outlined" sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'background.paper' }}>
              <Typography component="h2" variant="h5" align="center" sx={{ fontWeight: 900, mb: 1.5, color: 'primary.main' }}>
                Versículo do dia
              </Typography>
              <Box sx={{ width: '100%', maxWidth: 410, mx: 'auto' }}>
                {renderCartao(versiculoDoDiaPublico)}
              </Box>
            </Paper>
          )}

          <Paper component="section" variant="outlined" sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'background.paper' }}>
            <Typography component="h2" variant="h5" align="center" sx={{ fontWeight: 900, mb: 1.5 }}>
              Versículos compartilhados
            </Typography>
            {versiculosPublicosOrdenados.length === 0 ? (
              <Typography color="text.secondary">Ainda não há outros versículos públicos no mural.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: { xs: 1, sm: 2 } }}>
                {versiculosPublicosOrdenados.map(renderCartao)}
              </Box>
            )}
          </Paper>
        </Stack>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: { xs: 1, sm: 2 } }}>
          {lista.map(renderCartao)}
        </Box>
      )}
      <CompartilharVersiculoImagemDialog
        open={Boolean(compartilhar)}
        onClose={() => setCompartilhar(null)}
        referencia={compartilhar?.referencia || ''}
        texto={compartilhar?.texto || ''}
        url={compartilhar ? linkDoCompartilhamento(compartilhar) : window.location.href}
        registrarEnvio={false}
        fundoFixoId={compartilhar?.tipo === 'versiculo-do-dia' ? compartilhar?.fundoId : ''}
        modoDireto={compartilhar?.tipo === 'versiculo-do-dia'}
        onShared={() => {
          if (!compartilhar?.id || !user?.uid) return
          if (compartilhar.naoListado) return
          if (compartilhar.tipo === 'versiculo-do-dia' && compartilhar.data) {
            void registrarCompartilhamentoVersiculoDoDia(compartilhar.data).catch(() => {})
          } else {
            void registrarRecompartilhamento(user.uid, compartilhar.id).catch(() => {})
          }
        }}
        onActionComplete={() => {
          setCompartilhar(null)
        }}
      />
    </Box>
  )
}

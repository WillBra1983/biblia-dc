import { useEffect, useMemo, useState } from 'react'
import { Box, Button, CircularProgress, IconButton, Skeleton, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import HistoryIcon from '@mui/icons-material/History'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CompartilharVersiculoImagemDialog from '../components/CompartilharVersiculoImagemDialog'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { FUNDOS_VERSICULO, urlFundoVersiculo, urlLogoApp } from '../utils/versiculoImagem'
import { abrirVersiculoDoDia, linkPaginaVersiculoDoDia, obterComentarioDoDia, obterVersiculoDoDia, obterVersiculoDoDiaPorData } from '../services/versiculoDoDiaService'
import { registrarCompartilhamentoVersiculoDoDia } from '../services/versiculosCompartilhadosService'

function TextoComentario({ texto }) {
  return String(texto || '').split(/\n{2,}/).map((bloco, index) => {
    const limpo = bloco.replace(/^#{1,4}\s*/, '').trim()
    if (!limpo) return null
    const titulo = /^#{1,4}\s/.test(bloco)
    return (
      <Typography key={`${index}-${limpo.slice(0, 12)}`} component={titulo ? 'h2' : 'p'} sx={{
        m: 0,
        mt: index ? (titulo ? 2.6 : 1.7) : 0,
        fontFamily: 'Georgia, serif',
        fontSize: titulo ? '1.2rem' : '1.04rem',
        fontWeight: titulo ? 800 : 400,
        lineHeight: 1.72,
        textAlign: titulo ? 'left' : 'justify',
      }}>
        {limpo.replace(/\*\*/g, '')}
      </Typography>
    )
  })
}

export default function VersiculoDoDia() {
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const [searchParams] = useSearchParams()
  const dataArquivada = searchParams.get('data')
  const [item, setItem] = useState(null)
  const [comentario, setComentario] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [preparandoComentario, setPreparandoComentario] = useState(true)
  const [erro, setErro] = useState('')
  const [compartilhar, setCompartilhar] = useState(false)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        let valor
        if (dataArquivada) {
          valor = await obterVersiculoDoDiaPorData(dataArquivada)
        } else {
          // Texto, referencia e fundo chegam antes da explicacao da IA.
          valor = await obterVersiculoDoDia({ selecionarSeAusente: true })
        }
        if (!ativo || !valor) return
        setItem(valor)
        setCarregando(false)

        const pronto = dataArquivada || valor.status === 'pronto'
          ? valor
          : await abrirVersiculoDoDia()
        if (!ativo || !pronto) return
        setItem(pronto)
        const texto = await obterComentarioDoDia(pronto)
        if (ativo) setComentario(texto)
      } catch (falha) {
        if (ativo) setErro(falha?.message || 'Não foi possível preparar o versículo do dia.')
      } finally {
        if (ativo) {
          setCarregando(false)
          setPreparandoComentario(false)
        }
      }
    }
    carregar()
    return () => { ativo = false }
  }, [dataArquivada])

  const fundo = useMemo(
    () => FUNDOS_VERSICULO.find((valor) => valor.id === item?.fundoId) || FUNDOS_VERSICULO[0],
    [item?.fundoId]
  )
  const link = useMemo(() => linkPaginaVersiculoDoDia(item), [item])

  if (carregando) return (
    <Box sx={{ width: '100%', minHeight: '65vh', display: 'grid', placeItems: 'center', textAlign: 'center', px: 3 }}>
      <Box>
        <CircularProgress />
        <Typography sx={{ mt: 2, fontWeight: 700 }}>{dataArquivada ? 'Abrindo o versículo selecionado...' : 'Preparando a explicação do versículo de hoje...'}</Typography>
        {!dataArquivada && <Typography variant="body2" color="text.secondary" sx={{ mt: .7 }}>No primeiro acesso, isso pode levar alguns instantes.</Typography>}
      </Box>
    </Box>
  )
  if (!item) return (
    <Box sx={{ width: '100%', p: 3, textAlign: 'center' }}>
      <Typography sx={{ mb: 2 }}>{erro || 'Não foi possível abrir o versículo do dia.'}</Typography>
      <Button onClick={() => navigate(-1)}>Voltar</Button>
    </Box>
  )

  return (
    <Box sx={{ width: '100%', bgcolor: '#f3efe6', minHeight: '100%', p: { xs: 1, sm: 2.5 }, boxSizing: 'border-box' }}>
      <Box sx={{
        maxWidth: 820, mx: 'auto', overflow: 'hidden', borderRadius: 1,
        bgcolor: '#fffdf7', boxShadow: '0 12px 34px rgba(39,35,25,.18)',
        border: '1px solid rgba(80,70,45,.18)',
      }}>
        <Box sx={{
          minHeight: { xs: 390, sm: 460 }, p: { xs: 2, sm: 4 }, color: '#fff', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          backgroundImage: `${fundo.overlay ? `linear-gradient(rgba(4,15,20,${fundo.overlay}), rgba(4,15,20,${Math.min(fundo.overlay + .16, .8)})), ` : ''}url("${urlFundoVersiculo(fundo)}")`,
          backgroundColor: fundo.cor || '#17443a', backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <IconButton onClick={() => navigate(-1)} aria-label="Voltar" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,.28)' }}><ArrowBackIcon /></IconButton>
            <Box>
              <IconButton onClick={() => navigate('/versiculos-do-dia')} aria-label="Dias anteriores" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,.28)', mr: 1 }}><HistoryIcon /></IconButton>
              <IconButton onClick={() => setCompartilhar(true)} aria-label="Compartilhar" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,.28)' }}><IosShareOutlinedIcon /></IconButton>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'center', px: { xs: 1, sm: 5 }, textShadow: '0 2px 9px rgba(0,0,0,.72)' }}>
            <Typography component="blockquote" sx={{ m: 0, fontFamily: 'Georgia, serif', fontSize: { xs: '1.45rem', sm: '2rem' }, lineHeight: 1.48, fontWeight: 700 }}>
              “{item.texto}”
            </Typography>
            <Typography sx={{ mt: 2.5, fontWeight: 900, fontSize: '1.05rem' }}>{item.referencia}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, textShadow: '0 2px 7px rgba(0,0,0,.72)' }}>
            <Box
              component="img"
              src={urlLogoApp()}
              alt="Bíblia do Discípulo Cristão"
              sx={{ width: 30, height: 30, borderRadius: 0.75, boxShadow: '0 2px 8px rgba(0,0,0,.35)' }}
            />
            <Typography sx={{ color: '#fff', fontSize: { xs: '0.68rem', sm: '0.78rem' }, fontWeight: 900, lineHeight: 1.2, textTransform: 'uppercase' }}>
              Bíblia do Discípulo Cristão
            </Typography>
          </Box>
        </Box>
        <Box sx={{ p: { xs: 2, sm: 4.5 }, color: '#171a2b' }}>
          {comentario ? (
            <TextoComentario texto={comentario} />
          ) : preparandoComentario ? (
            <Box role="status" aria-live="polite" sx={{ py: { xs: 1, sm: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.2 }}>
                <CircularProgress size={22} thickness={4.5} />
                <Typography sx={{ fontWeight: 750 }}>Preparando a explicação...</Typography>
              </Box>
              <Skeleton variant="text" height={28} width="100%" animation="wave" />
              <Skeleton variant="text" height={28} width="96%" animation="wave" />
              <Skeleton variant="text" height={28} width="88%" animation="wave" />
            </Box>
          ) : erro ? (
            <Box sx={{ py: 1 }}>
              <Typography color="text.secondary">A imagem do versículo está disponível, mas a explicação não pôde ser carregada agora.</Typography>
              <Button onClick={() => window.location.reload()} sx={{ mt: 1 }}>Tentar novamente</Button>
            </Box>
          ) : null}
        </Box>
      </Box>
      <CompartilharVersiculoImagemDialog
        open={compartilhar}
        onClose={() => setCompartilhar(false)}
        referencia={item.referencia}
        texto={item.texto}
        url={link}
        fundoFixoId={item.fundoId}
        modoDireto
        registrarEnvio={false}
        onShared={() => {
          if (user?.uid && item.data) {
            void registrarCompartilhamentoVersiculoDoDia(item.data).catch(() => {})
          }
        }}
      />
    </Box>
  )
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useNavigate } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { carregarCampanhaProjeto, compartilharProjeto, linkConviteProjeto, mensagemConviteProjeto, resgatarLivroProjeto } from '../services/projetoCompartilhamentoService'

const META_COMPARTILHAMENTOS = 10

function TituloCompartilhamento() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const elemento = ref.current
    const ajustar = () => {
      const largura = elemento.clientWidth
      if (!largura) return
      // O espaçamento entre letras herdado não diminui junto com a fonte.
      let minimo = 0, maximo = 24
      for (let i = 0; i < 10; i++) {
        const tamanho = (minimo + maximo) / 2
        elemento.style.fontSize = `${tamanho}px`
        if (elemento.scrollWidth <= largura) minimo = tamanho
        else maximo = tamanho
      }
      elemento.style.fontSize = `${minimo}px`
    }
    ajustar()
    const observer = new ResizeObserver(ajustar)
    observer.observe(elemento)
    document.fonts?.addEventListener('loadingdone', ajustar)
    return () => {
      observer.disconnect()
      document.fonts?.removeEventListener('loadingdone', ajustar)
    }
  }, [])
  return <Box component="span" ref={ref} sx={{ display: 'block', whiteSpace: 'nowrap', letterSpacing: 0, fontSize: 'clamp(8px, 3vw, 24px)' }}>Ajude a Palavra de Deus a chegar mais longe</Box>
}

export default function CompartilharProjetoDialog({ aberto, onClose, conteudo }) {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const [campanha, setCampanha] = useState(null)
  const [erro, setErro] = useState(''), [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false), [ocupado, setOcupado] = useState(false)
  const [livroId, setLivroId] = useState(''), [tentativa, setTentativa] = useState(0)
  const [informacoes, setInformacoes] = useState(false)
  const [agradecimento, setAgradecimento] = useState('')
  useEffect(() => {
    setCampanha(null); setErro(''); setAviso(''); setLivroId(''); setInformacoes(false); setAgradecimento('')
    if (!aberto || !user?.uid) { setCarregando(false); return undefined }
    let ativo = true
    setCarregando(true)
    carregarCampanhaProjeto().then(dados => { if (ativo) setCampanha(dados) }).catch(() => { if (ativo) setErro('Não foi possível consultar seus convites. Você pode compartilhar o aplicativo e tentar novamente mais tarde.') }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [aberto, user?.uid, tentativa])
  async function compartilhar() {
    setErro(''); setAviso(''); setOcupado(true)
    try { const resultado = await compartilharProjeto(campanha?.codigo, conteudo); if (resultado !== 'cancelado') setAgradecimento(resultado === 'copiado' ? 'copiado' : 'compartilhado') }
    catch { setErro('Não foi possível compartilhar. Você pode copiar o link abaixo.') }
    finally { setOcupado(false) }
  }
  async function copiarLink() {
    setErro(''); setAviso(''); setOcupado(true)
    try { await navigator.clipboard.writeText(mensagemConviteProjeto(campanha?.codigo, conteudo)); setAgradecimento('copiado') }
    catch { setErro('Selecione e copie o link abaixo.') }
    finally { setOcupado(false) }
  }
  async function resgatar() {
    setErro(''); setOcupado(true)
    try {
      const beneficio = await resgatarLivroProjeto(livroId)
      setCampanha(await carregarCampanhaProjeto())
      setAviso(`Sua leitura está liberada até ${new Date(beneficio.acessoAte).toLocaleDateString('pt-BR')}. Boa leitura!`)
      setLivroId('')
    } catch (erro) { setErro(erro?.message || 'Não foi possível liberar a leitura. Tente novamente.') }
    finally { setOcupado(false) }
  }
  function abrirLeitura(id) { onClose(); navigate(`/biblioteca/${encodeURIComponent(id)}/ler?conviteLeitura=1`) }
  const link = linkConviteProjeto(campanha?.codigo, conteudo)
  // Servidores ainda sem a atualização não podem oferecer resgate pela meta antiga.
  const creditos = campanha?.meta === META_COMPARTILHAMENTOS ? campanha.creditos : 0
  return <><Dialog open={aberto} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="compartilhar-projeto-titulo">
    <DialogTitle id="compartilhar-projeto-titulo" sx={{ pr: 7, color: 'primary.main', fontWeight: 800 }}><TituloCompartilhamento /><IconButton aria-label="Fechar compartilhamento" onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, width: 44, height: 44 }}><CloseIcon /></IconButton></DialogTitle>
    <DialogContent dividers><Stack spacing={1.75}>
      <Typography fontWeight={700}>Já compartilhou o evangelho com alguém hoje?</Typography>
      <Typography variant="body2">Este projeto foi feito para alcançar mais pessoas com o estudo da Palavra, de forma gratuita e sem propagandas. Seu convite pode ser o começo de uma nova caminhada para alguém.</Typography>
      {erro && <Alert severity="warning" action={user && !campanha ? <Button color="inherit" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</Button> : undefined}>{erro}</Alert>}
      {aviso && <Alert severity="success">{aviso}</Alert>}
      {carregando && <Box role="status" sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}><CircularProgress size={20} /><Typography variant="body2">Preparando seu convite…</Typography></Box>}
      {conteudo?.title && <Typography variant="body2" fontWeight={700} color="primary.main">{conteudo.title}</Typography>}
      <Button variant="contained" startIcon={<ShareOutlinedIcon />} disabled={ocupado || carregando} onClick={compartilhar} sx={{ minHeight: 44, textTransform: 'none' }}>{conteudo?.botao || 'Compartilhar a Bíblia'}</Button>
      <Button startIcon={<ContentCopyIcon />} disabled={ocupado || carregando} onClick={copiarLink} sx={{ minHeight: 44, textTransform: 'none' }}>Copiar convite</Button>
      <TextField label="Link do convite" value={link} size="small" fullWidth InputProps={{ readOnly: true }} onFocus={e => e.target.select()} />
      {campanha && <Box sx={{ p: 1.75, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: .5, mb: 1 }}>
          <Typography fontWeight={700} sx={{ flex: 1 }}>Ganhe 7 dias de leitura em qualquer livro do nosso catálogo</Typography>
          <IconButton aria-label="Como funciona a recompensa de leitura" aria-haspopup="dialog" aria-expanded={informacoes} aria-controls="informacoes-recompensa-leitura" onClick={() => setInformacoes(true)} sx={{ width: 44, height: 44, flexShrink: 0, color: 'primary.main' }}><InfoOutlinedIcon /></IconButton>
        </Box>
        <Typography variant="body2">Como uma forma de recompensar nossos usuários que compartilham nosso aplicativo para que mais pessoas tenham acesso a esse riquíssimo material, estamos liberando 7 dias de leitura em um livro à sua escolha a cada 10 compartilhamentos confirmados.</Typography>
        <Typography variant="body2" sx={{ mt: 1.5 }}>{campanha.total} {campanha.total === 1 ? 'compartilhamento confirmado' : 'compartilhamentos confirmados'} · Próximo benefício: {campanha.total % META_COMPARTILHAMENTOS}/{META_COMPARTILHAMENTOS}</Typography>
        <LinearProgress variant="determinate" value={100 * (campanha.total % META_COMPARTILHAMENTOS) / META_COMPARTILHAMENTOS} sx={{ my: 1, height: 6, borderRadius: 3 }} />
        {creditos > 0 && <Stack spacing={1} sx={{ mt: 1.5 }}><Alert severity="success">Você tem {creditos} {creditos === 1 ? 'benefício disponível' : 'benefícios disponíveis'}!</Alert><TextField select label="Escolha seu livro" value={livroId} onChange={e => setLivroId(e.target.value)} size="small" fullWidth>{campanha.livros.filter(l => !campanha.beneficios.some(b => b.livroId === l.id)).map(l => <MenuItem key={l.id} value={l.id} sx={{ whiteSpace: 'normal' }}>{l.titulo}</MenuItem>)}</TextField><Button variant="outlined" disabled={!livroId || ocupado} onClick={resgatar}>Liberar sete dias de leitura</Button></Stack>}
        {campanha.beneficios.map(b => <Box key={b.livroId} sx={{ mt: 1.5 }}><Typography variant="body2" fontWeight={700}>{b.titulo}</Typography><Typography variant="caption">Disponível até {new Date(b.acessoAte).toLocaleDateString('pt-BR')}</Typography><Button size="small" onClick={() => abrirLeitura(b.livroId)} sx={{ display: 'block' }}>Abrir leitura</Button></Box>)}
      </Box>}
      {!user && <Alert severity="info">Você já pode compartilhar. Para acompanhar seus convites e participar dos benefícios de leitura, <Button size="small" onClick={() => { onClose(); navigate('/perfil') }}>entre ou crie sua conta</Button>.</Alert>}
      <Box component="blockquote" sx={{ m: 0, pl: 1.5, borderLeft: '3px solid', borderColor: 'primary.main' }}>
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>“Prega a palavra, insta, quer seja oportuno, quer não, corrige, repreende, exorta com toda a longanimidade e doutrina.”</Typography>
        <Typography component="cite" variant="caption" color="text.secondary" sx={{ fontStyle: 'normal', display: 'block', mt: .5 }}>2 Timóteo 4.2 — ARA</Typography>
      </Box>
    </Stack></DialogContent><DialogActions><Button onClick={onClose}>Fechar</Button></DialogActions>
  </Dialog>
    <Dialog id="informacoes-recompensa-leitura" open={aberto && informacoes} onClose={() => setInformacoes(false)} fullWidth maxWidth="xs" aria-labelledby="recompensa-leitura-titulo">
      <DialogTitle id="recompensa-leitura-titulo">Como funciona</DialogTitle>
      <DialogContent dividers><Stack spacing={1.5}>
        <Typography variant="body2">A cada 10 indicações confirmadas, você pode escolher um livro do catálogo disponível para leitura no aplicativo. Os sete dias começam ao escolher o livro. A leitura requer internet e não inclui download. Livros que você já possui não consomem a recompensa.</Typography>
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setInformacoes(false)}>Entendi</Button></DialogActions>
    </Dialog>
    <Dialog open={aberto && Boolean(agradecimento)} onClose={() => setAgradecimento('')} fullWidth maxWidth="xs" aria-labelledby="agradecimento-compartilhar-titulo">
      <DialogTitle id="agradecimento-compartilhar-titulo">Muito obrigado!</DialogTitle>
      <DialogContent dividers><Stack spacing={1.5}>
        {agradecimento === 'copiado' && <Typography>Convite copiado! Envie-o para quem você deseja convidar.</Typography>}
        <Typography>Sua iniciativa ajuda a Palavra de Deus a chegar mais longe e permite que mais pessoas conheçam esse riquíssimo material.</Typography>
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setAgradecimento('')}>Continuar</Button></DialogActions>
    </Dialog>
  </>
}

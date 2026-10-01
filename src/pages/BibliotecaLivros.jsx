import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import {
  Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress,
  Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel,
  Grid, IconButton, InputAdornment, Paper, Stack, Switch, TextField,
  Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AndroidIcon from '@mui/icons-material/Android'
import AppleIcon from '@mui/icons-material/Apple'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import LaunchIcon from '@mui/icons-material/Launch'
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined'
import PixIcon from '@mui/icons-material/Pix'
import SearchIcon from '@mui/icons-material/Search'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { urlCapaLivro } from '../data/livrosCatalogo'
import BibliotecaArquivoReader from '../components/BibliotecaArquivoReader'
import CompartilharLivroButton from '../components/CompartilharLivroButton'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { useEhAdmin } from '../hooks/useEhAdmin'
import {
  assinarCatalogoLivros,
  assinarAcessosBiblioteca,
  assinarConfiguracaoPixBiblioteca,
  assinarPedidosPixAdmin,
  criarPedidoPixBiblioteca,
  decidirPedidoPixBiblioteca,
  enviarArquivoLivroBiblioteca,
  enviarCapaLivroBiblioteca,
  excluirLivroBiblioteca,
  obterCatalogoLivrosLocal,
  prepararCapaLivro,
  informarPagamentoPixBiblioteca,
  obterArquivoLivroBiblioteca,
  salvarConfiguracaoPixBiblioteca,
  salvarLivroBiblioteca,
} from '../services/bibliotecaLivrosService'
import {
  excluirLivroPessoal,
  importarLivroPessoal,
  listarLivrosPessoais,
  obterLivroPessoal,
} from '../services/bibliotecaPessoalService'
import { abrirUrlExterna } from '../utils/abrirUrlExterna'

const PLATAFORMA = Capacitor.getPlatform()
const CHAVE_COMPRAS = 'biblioteca-digital-compras-v1'

function chaveCompra(livroId, modalidadeId) {
  return `${livroId}:${modalidadeId}`
}

function lerComprasConfirmadas(uid) {
  if (!uid || typeof localStorage === 'undefined') return new Set()
  try {
    const dados = JSON.parse(localStorage.getItem(`${CHAVE_COMPRAS}:${uid}`) || '[]')
    return new Set(Array.isArray(dados) ? dados.map(String) : [])
  } catch {
    return new Set()
  }
}

function salvarComprasConfirmadas(uid, compras) {
  if (!uid || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(`${CHAVE_COMPRAS}:${uid}`, JSON.stringify([...compras]))
  } catch {
    /* armazenamento local indisponível */
  }
}

function normalizarBusca(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function criarIdLivro(titulo) {
  const base = normalizarBusca(titulo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'livro'
  return `${base}-${Date.now().toString(36).slice(-6)}`
}

function opcoesLivro(livro) {
  const opcoes = []
  if (PLATAFORMA === 'web' && livro.pixAtivo && Number(livro.precoPixCentavos) > 0 && livro.arquivos?.completo) {
    opcoes.push({ id: 'pix', label: 'Pix', tipo: 'pix', icon: <PixIcon /> })
  }
  if ((PLATAFORMA === 'android' || PLATAFORMA === 'web') && livro.androidUrl) {
    opcoes.push({ id: 'android', label: 'Android', url: livro.androidUrl, icon: <AndroidIcon /> })
  }
  if ((PLATAFORMA === 'ios' || PLATAFORMA === 'web') && livro.appleUrl) {
    opcoes.push({ id: 'apple', label: 'Apple', url: livro.appleUrl, icon: <AppleIcon /> })
  }
  if (livro.amazonUrl) {
    opcoes.push({ id: 'amazon', label: 'Amazon', url: livro.amazonUrl, icon: <StorefrontOutlinedIcon /> })
  }
  return opcoes
}

function rotuloAcaoOpcao(acao, opcao) {
  if (opcao.id === 'pix') return `${acao} com Pix`
  const preposicao = opcao.id === 'android' ? 'no' : 'na'
  return `${acao} ${preposicao} ${opcao.label}`
}

function temModalidade(livro) {
  return Boolean(livro.pixAtivo || livro.androidUrl || livro.appleUrl || livro.amazonUrl)
}

function CapaLivro({ livro, onClick, grande = false }) {
  return (
    <Box component="button" type="button" onClick={onClick} aria-label={`Abrir ${livro.titulo}`} sx={{
      appearance: 'none', display: 'block', width: '100%', maxWidth: grande ? 330 : 'none', p: 0,
      border: 0, borderRadius: grande ? 2 : 1.4, overflow: 'hidden', cursor: 'pointer',
      background: '#071d27', boxShadow: grande ? '0 24px 54px rgba(0,0,0,.34)' : '0 12px 26px rgba(0,0,0,.2)',
      transition: 'transform 180ms ease, box-shadow 180ms ease',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: grande ? '0 28px 62px rgba(0,0,0,.42)' : '0 17px 34px rgba(0,0,0,.28)' },
      '&:focus-visible': { outline: '3px solid #d8ad52', outlineOffset: 3 },
    }}>
      <Box component="img" src={urlCapaLivro(livro.capa)} alt={`Capa de ${livro.titulo}, de ${livro.autor}`} loading={grande ? 'eager' : 'lazy'} sx={{ display: 'block', width: '100%', aspectRatio: '2 / 3', objectFit: 'cover' }} />
    </Box>
  )
}

function SelosModalidades({ livro, compacto = false }) {
  if (livro.publicado === false) return <Chip size="small" label="Rascunho" color="warning" variant="outlined" />
  const itens = [
    livro.androidUrl && { id: 'android', label: 'Android', icon: <AndroidIcon /> },
    livro.appleUrl && { id: 'apple', label: 'Apple', icon: <AppleIcon /> },
    livro.amazonUrl && { id: 'amazon', label: 'Amazon', icon: <StorefrontOutlinedIcon /> },
    PLATAFORMA === 'web' && livro.pixAtivo && livro.arquivos?.completo && { id: 'pix', label: 'Pix', icon: <PixIcon /> },
  ].filter(Boolean)
  if (!itens.length) return <Chip size="small" label="Rascunho" color="warning" variant="outlined" />
  return (
    <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
      {itens.map((item) => <Chip key={item.id} size="small" icon={item.icon} label={compacto ? undefined : item.label} aria-label={`Disponível em ${item.label}`} sx={{ height: 25, bgcolor: 'rgba(7,60,53,.08)', '& .MuiChip-icon': { color: '#0a6656' } }} />)}
    </Stack>
  )
}

function OpcoesDialog({ livro, comprasConfirmadas, onConfirmarCompra, onClose }) {
  const navigate = useNavigate()
  const opcoes = livro ? opcoesLivro(livro) : []
  const [ultimaOpcao, setUltimaOpcao] = useState(null)
  const [pedidoPix, setPedidoPix] = useState(null)
  const [processandoPix, setProcessandoPix] = useState(false)
  const [erroPix, setErroPix] = useState('')

  useEffect(() => { setUltimaOpcao(null); setPedidoPix(null); setErroPix('') }, [livro?.id])

  const foiComprada = (opcao) => Boolean(livro && comprasConfirmadas.has(chaveCompra(livro.id, opcao.id)))

  const abrirOpcao = async (opcao) => {
    if (opcao.id === 'pix') {
      if (foiComprada(opcao)) { onClose(); navigate(`/biblioteca/${livro.id}/ler`); return }
      setProcessandoPix(true); setErroPix('')
      try {
        const pedido = await criarPedidoPixBiblioteca(livro.id)
        if (pedido.jaPossui) { onClose(); navigate(`/biblioteca/${livro.id}/ler`); return }
        setPedidoPix(pedido)
        setUltimaOpcao(opcao)
      } catch (erro) { setErroPix(erro?.message || 'Não foi possível preparar o Pix.') }
      finally { setProcessandoPix(false) }
      return
    }
    if (!foiComprada(opcao)) setUltimaOpcao(opcao)
    void abrirUrlExterna(opcao.url)
  }

  const avisarPagamento = async () => {
    if (!pedidoPix?.pedidoId) return
    setProcessandoPix(true); setErroPix('')
    try {
      await informarPagamentoPixBiblioteca(pedidoPix.pedidoId)
      setPedidoPix((atual) => ({ ...atual, informado: true }))
    } catch (erro) { setErroPix(erro?.message || 'Não foi possível enviar o aviso.') }
    finally { setProcessandoPix(false) }
  }

  return (
    <Dialog open={Boolean(livro)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Opções do livro</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>{livro?.titulo}</Typography>
        <Stack spacing={1.2}>
          {opcoes.map((opcao) => {
            const comprada = foiComprada(opcao)
            return (
              <Button key={opcao.id} variant={comprada ? 'contained' : 'outlined'} size="large" startIcon={opcao.icon} endIcon={opcao.id === 'pix' ? undefined : <LaunchIcon />} onClick={() => abrirOpcao(opcao)} disabled={processandoPix} fullWidth>
                {rotuloAcaoOpcao(comprada ? 'Abrir' : 'Comprar', opcao)}
              </Button>
            )
          })}
          {!opcoes.length && <Alert severity="info">Nenhuma opção está disponível neste aparelho.</Alert>}
          {erroPix && <Alert severity="error">{erroPix}</Alert>}
          {pedidoPix && ultimaOpcao?.id === 'pix' && !foiComprada(ultimaOpcao) && <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography fontWeight={800}>R$ {(pedidoPix.valorCentavos / 100).toFixed(2).replace('.', ',')}</Typography>
            <Box component="img" src={pedidoPix.qrCodeDataUrl} alt="QR Code para pagamento Pix" sx={{ display: 'block', width: '100%', maxWidth: 260, mx: 'auto', my: 1.2 }} />
            <Button startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard.writeText(pedidoPix.pixCopiaCola)} fullWidth>Copiar código Pix</Button>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Pedido {pedidoPix.codigo}. Após pagar, avise para conferirmos o recebimento.</Typography>
            {pedidoPix.informado
              ? <Alert severity="success" sx={{ mt: 1.5, textAlign: 'left' }}>Aviso enviado. Assim que o pagamento for conferido, o botão mudará para “Abrir”.</Alert>
              : <Button variant="contained" color="success" size="large" startIcon={<CheckCircleOutlinedIcon />} onClick={avisarPagamento} disabled={processandoPix} fullWidth sx={{ mt: 1.5 }}>{processandoPix ? 'Enviando…' : 'Já fiz o Pix'}</Button>}
          </Paper>}
          {ultimaOpcao && ultimaOpcao.id !== 'pix' && !foiComprada(ultimaOpcao) && <>
            <Divider sx={{ my: 0.6 }} />
            <Typography variant="body2" color="text.secondary" align="center">Depois de concluir o pagamento {ultimaOpcao.id === 'android' ? 'no' : 'na'} {ultimaOpcao.label}, confirme abaixo.</Typography>
            <Button variant="contained" color="success" size="large" startIcon={<CheckCircleOutlinedIcon />} onClick={() => onConfirmarCompra(livro.id, ultimaOpcao.id)} fullWidth>Comprei</Button>
          </>}
          {ultimaOpcao && foiComprada(ultimaOpcao) && <Alert severity="success">Compra confirmada. Esta opção agora está disponível como “Abrir”.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Fechar</Button></DialogActions>
    </Dialog>
  )
}

function InformacoesDialog({ aberto, onClose }) {
  return (
    <Dialog open={aberto} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><InfoOutlinedIcon color="primary" /> Sobre a Biblioteca</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography>Nossa biblioteca apresenta recomendações de livros clássicos cristãos traduzidos diretamente das edições originais.</Typography>
          <Typography>São livros que formam uma grande seleção de obras cristãs clássicas dos maiores teólogos dos últimos séculos.</Typography>
          <Typography>Os direitos autorais de cada uma das obras são todos do produtor deste projeto <Box component="span" sx={{ fontStyle: 'italic' }}>Bíblia do Discípulo Cristão</Box>, uma vez que as traduções, revisões e a organização editorial são todas realizadas por nós, preservando o conteúdo e o caráter pastoral de cada autor.</Typography>
          <Typography>Em cada livro, você encontrará as opções de leitura ou aquisição dos materiais atualmente disponíveis.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Entendi</Button></DialogActions>
    </Dialog>
  )
}

function EditarLivroDialog({ livro, aberto, uid, onClose, onSalvar, salvando }) {
  const [form, setForm] = useState(livro || {})
  const [capaPreparada, setCapaPreparada] = useState(null)
  const [arquivosSelecionados, setArquivosSelecionados] = useState({ completo: null, amostra: null })
  const [preparandoCapa, setPreparandoCapa] = useState(false)
  const [erroEditor, setErroEditor] = useState('')

  useEffect(() => {
    if (!aberto) return undefined
    setForm({ ...(livro || {}), publicado: livro?.publicado !== false })
    setCapaPreparada(null)
    setArquivosSelecionados({ completo: null, amostra: null })
    setErroEditor('')
    return undefined
  }, [aberto, livro, uid])

  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }))

  const escolherCapa = async (event) => {
    const arquivo = event.target.files?.[0]
    event.target.value = ''
    if (!arquivo) return
    setPreparandoCapa(true)
    setErroEditor('')
    try {
      setCapaPreparada(await prepararCapaLivro(arquivo))
    } catch (erro) {
      setErroEditor(erro?.message || 'Não foi possível preparar a capa.')
    } finally {
      setPreparandoCapa(false)
    }
  }

  const escolherArquivo = (finalidade) => (event) => {
    const arquivo = event.target.files?.[0]
    event.target.value = ''
    if (!arquivo) return
    if (!/\.(pdf|epub)$/i.test(arquivo.name)) {
      setErroEditor('Escolha um arquivo PDF ou EPUB.')
      return
    }
    if (arquivo.size > 100 * 1024 * 1024) {
      setErroEditor('O arquivo deve ter no máximo 100 MB.')
      return
    }
    setErroEditor('')
    setArquivosSelecionados((atuais) => ({ ...atuais, [finalidade]: arquivo }))
  }

  const capaPreview = capaPreparada?.dataUrl || (form.capa ? urlCapaLivro(form.capa) : '')
  const podeSalvar = form.titulo?.trim() && form.autor?.trim() && capaPreview && !preparandoCapa

  return (
    <Dialog open={aberto} onClose={salvando ? undefined : onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>{livro?.id ? 'Editar livro' : 'Novo livro'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {erroEditor && <Alert severity="warning" onClose={() => setErroEditor('')}>{erroEditor}</Alert>}
          <Grid container spacing={2.2}>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2, textAlign: 'center' }}>
                {capaPreview ? <Box component="img" src={capaPreview} alt="Prévia da capa" sx={{ display: 'block', width: '100%', maxWidth: 220, mx: 'auto', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: 1 }} /> : <Box sx={{ aspectRatio: '2 / 3', display: 'grid', placeItems: 'center', color: 'text.secondary', bgcolor: 'action.hover', borderRadius: 1 }}><ImageOutlinedIcon sx={{ fontSize: 52 }} /></Box>}
                <Button component="label" startIcon={<ImageOutlinedIcon />} disabled={preparandoCapa || salvando} sx={{ mt: 1.1 }}>
                  {preparandoCapa ? 'Preparando…' : capaPreview ? 'Trocar capa' : 'Escolher capa'}
                  <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={escolherCapa} />
                </Button>
                <Typography variant="caption" color="text.secondary" display="block">PNG, JPG ou WebP. A imagem será otimizada automaticamente.</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Stack spacing={1.5}>
                <TextField label="Título" value={form.titulo || ''} onChange={alterar('titulo')} required />
                <TextField label="Autor" value={form.autor || ''} onChange={alterar('autor')} required />
                <TextField label="Descrição" value={form.descricao || ''} onChange={alterar('descricao')} multiline minRows={4} />
                <FormControlLabel control={<Switch checked={form.publicado !== false} onChange={(event) => setForm((atual) => ({ ...atual, publicado: event.target.checked }))} />} label={form.publicado !== false ? 'Publicado' : 'Rascunho — visível somente para o administrador'} />
              </Stack>
            </Grid>
          </Grid>

          <Divider />
          <Typography variant="subtitle1" fontWeight={800}>Onde o livro está disponível</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}><TextField fullWidth label="Link Android" value={form.androidUrl || ''} onChange={alterar('androidUrl')} placeholder="Deixe vazio enquanto não estiver disponível" /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Link Apple" value={form.appleUrl || ''} onChange={alterar('appleUrl')} placeholder="Deixe vazio enquanto não estiver disponível" /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Link Amazon" value={form.amazonUrl || ''} onChange={alterar('amazonUrl')} placeholder="Deixe vazio enquanto não estiver disponível" /></Grid>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                  <FormControlLabel control={<Switch checked={form.pixAtivo === true} onChange={(event) => setForm((atual) => ({ ...atual, pixAtivo: event.target.checked }))} />} label="Vender diretamente por Pix no site" />
                  <TextField label="Preço no Pix" type="number" value={form.precoPixCentavos ? (form.precoPixCentavos / 100).toFixed(2) : ''} onChange={(event) => setForm((atual) => ({ ...atual, precoPixCentavos: Math.max(0, Math.round(Number(event.target.value.replace(',', '.')) * 100) || 0) }))} inputProps={{ min: 1, step: '0.01' }} InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} disabled={!form.pixAtivo} sx={{ width: { xs: '100%', sm: 190 } }} />
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Divider />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>Arquivos para leitura</Typography>
            <Typography variant="body2" color="text.secondary">O livro fica guardado em uma única cópia privada. PDF e EPUB são aceitos, até 100 MB.</Typography>
          </Box>
          <Grid container spacing={1.5}>
            {[
              { id: 'completo', titulo: 'Livro completo', descricao: 'Somente você e as contas cuja compra foi liberada.' },
              { id: 'amostra', titulo: 'Amostra gratuita', descricao: 'Trecho separado que qualquer leitor autenticado poderá abrir.' },
            ].map((item) => {
              const atual = form.arquivos?.[item.id]
              const selecionado = arquivosSelecionados[item.id]
              return <Grid item xs={12} sm={6} key={item.id}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={800}>{item.titulo}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.descricao}</Typography>
                    {(selecionado || atual) && <Alert severity={selecionado ? 'info' : 'success'}>
                      {selecionado ? `Pronto para enviar: ${selecionado.name}` : `${String(atual.formato || '').toUpperCase()} enviado${atual.nome ? ` — ${atual.nome}` : ''}`}
                    </Alert>}
                    <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />} disabled={salvando}>
                      {atual || selecionado ? 'Substituir arquivo' : 'Escolher arquivo'}
                      <input hidden type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" onChange={escolherArquivo(item.id)} />
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            })}
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={salvando}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSalvar({ ...form, arquivosSelecionados, capaPreparada })} disabled={salvando || !podeSalvar}>{salvando ? 'Salvando…' : 'Salvar livro'}</Button>
      </DialogActions>
    </Dialog>
  )
}

function ConfiguracaoPixDialog({ aberto, configuracao, onClose, onSalvar, salvando }) {
  const [form, setForm] = useState(configuracao || {})
  useEffect(() => { if (aberto) setForm({ ativo: true, ...(configuracao || {}) }) }, [aberto, configuracao])
  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }))
  return (
    <Dialog open={aberto} onClose={salvando ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configurar recebimento por Pix</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.6}>
          <Alert severity="info">Use preferencialmente uma chave aleatória. A chave fica protegida na área administrativa e aparece apenas dentro do QR Code de pagamento.</Alert>
          <FormControlLabel control={<Switch checked={form.ativo !== false} onChange={(event) => setForm((atual) => ({ ...atual, ativo: event.target.checked }))} />} label="Aceitar pagamentos por Pix" />
          <TextField label="Chave Pix" value={form.chave || ''} onChange={alterar('chave')} required={form.ativo !== false} helperText="Pode ser chave aleatória, e-mail, telefone ou CPF." />
          <TextField label="Nome do recebedor" value={form.nome || ''} onChange={alterar('nome')} required={form.ativo !== false} inputProps={{ maxLength: 25 }} helperText="Como consta na conta bancária (até 25 caracteres)." />
          <TextField label="Cidade" value={form.cidade || ''} onChange={alterar('cidade')} required={form.ativo !== false} inputProps={{ maxLength: 15 }} />
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={salvando}>Cancelar</Button><Button variant="contained" onClick={() => onSalvar(form)} disabled={salvando || (form.ativo !== false && (!form.chave?.trim() || !form.nome?.trim() || !form.cidade?.trim()))}>{salvando ? 'Salvando…' : 'Salvar Pix'}</Button></DialogActions>
    </Dialog>
  )
}

function PedidosPixDialog({ aberto, pedidos, onClose, onDecidir, processando }) {
  const rotulos = { aguardando_pagamento: 'Aguardando pagamento', pagamento_informado: 'Pagamento informado', aprovado: 'Aprovado', recusado: 'Não localizado' }
  return (
    <Dialog open={aberto} onClose={processando ? undefined : onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>Pagamentos da Biblioteca</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.2}>
          {!pedidos.length && <Alert severity="info">Ainda não há pedidos por Pix.</Alert>}
          {pedidos.map((pedido) => (
            <Paper key={pedido.id} variant="outlined" sx={{ p: 1.6, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={800}>{pedido.livroTitulo}</Typography>
                  <Typography variant="body2" color="text.secondary">{pedido.nomeComprador || pedido.email || 'Comprador'} · R$ {(Number(pedido.valorCentavos || 0) / 100).toFixed(2).replace('.', ',')}</Typography>
                  <Typography variant="caption" color="text.secondary">{pedido.codigo} · {pedido.criadoEm ? new Date(pedido.criadoEm).toLocaleString('pt-BR') : ''}</Typography>
                </Box>
                <Chip label={rotulos[pedido.status] || pedido.status} color={pedido.status === 'pagamento_informado' ? 'warning' : pedido.status === 'aprovado' ? 'success' : 'default'} />
                {pedido.status === 'pagamento_informado' && <Stack direction="row" spacing={0.7}><Button color="error" onClick={() => onDecidir(pedido.id, false)} disabled={processando}>Não localizar</Button><Button variant="contained" color="success" onClick={() => onDecidir(pedido.id, true)} disabled={processando}>Confirmar pagamento</Button></Stack>}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={processando}>Fechar</Button></DialogActions>
    </Dialog>
  )
}

function LivroCard({ livro, comprasConfirmadas, ehAdmin, onOpcoes, onEditar, onExcluir }) {
  const navigate = useNavigate()
  const opcoes = opcoesLivro(livro)
  const comprado = opcoes.some((opcao) => comprasConfirmadas.has(chaveCompra(livro.id, opcao.id)))
  const acessoDigital = ehAdmin || comprasConfirmadas.has(chaveCompra(livro.id, 'pix'))
  return (
    <Grid item xs={6} sm={4} md={3} lg={2.4} sx={{ display: 'flex' }}>
      <Card variant="outlined" sx={{ width: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2.5, overflow: 'hidden', borderColor: 'rgba(10,81,68,.2)', bgcolor: 'background.paper', boxShadow: '0 10px 28px rgba(24,38,34,.08)', position: 'relative' }}>
        {ehAdmin && <Stack direction="row" sx={{ position: 'absolute', zIndex: 3, top: 8, right: 8, bgcolor: 'rgba(255,255,255,.94)', borderRadius: 5, boxShadow: 2 }}><Tooltip title="Editar"><IconButton size="small" onClick={() => onEditar(livro)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip><Tooltip title="Excluir"><IconButton size="small" color="error" onClick={() => onExcluir(livro)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip></Stack>}
        <Box sx={{ p: 1.15, pb: 0 }}><CapaLivro livro={livro} onClick={() => navigate(`/biblioteca/${livro.id}`)} /></Box>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 1.5, '&:last-child': { pb: 0.7 } }}>
          <SelosModalidades livro={livro} compacto />
          <Typography variant="subtitle2" sx={{ mt: 1, fontFamily: 'Lora, Georgia, serif', fontWeight: 800, lineHeight: 1.24 }}>{livro.titulo}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.45 }}>{livro.autor}</Typography>
        </CardContent>
        <CardActions sx={{ px: 1.2, pb: 1.2, pt: 0.5 }}>
          <Button size="small" onClick={() => navigate(`/biblioteca/${livro.id}`)}>Detalhes</Button>
          {opcoes.length > 0 && <Button size="small" variant="contained" startIcon={acessoDigital ? <AutoStoriesOutlinedIcon /> : comprado ? <LaunchIcon /> : <ShoppingCartOutlinedIcon />} onClick={() => acessoDigital ? navigate(`/biblioteca/${livro.id}/ler`) : onOpcoes(livro)}>{acessoDigital ? 'Ler' : comprado ? 'Abrir' : 'Comprar'}</Button>}
        </CardActions>
      </Card>
    </Grid>
  )
}

function CapaLivroPessoal({ livro }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!livro?.capa) { setUrl(''); return undefined }
    const proximaUrl = URL.createObjectURL(livro.capa)
    setUrl(proximaUrl)
    return () => URL.revokeObjectURL(proximaUrl)
  }, [livro?.capa])

  return <Box sx={{ width: '100%', aspectRatio: '2 / 3', bgcolor: '#0b302b', borderRadius: 1.4, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
    {url
      ? <Box component="img" src={url} alt={`Capa de ${livro.titulo}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : <AutoStoriesOutlinedIcon sx={{ color: '#e1bd6e', fontSize: 58 }} />}
  </Box>
}

function MeusLivrosPessoais({ livros, carregando, importando, onImportar, onExcluir }) {
  const navigate = useNavigate()
  return <Box sx={{ mb: 4 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 1.5 }}>
      <Box>
        <Typography variant="h6" fontWeight={800}>Minha Biblioteca Pessoal</Typography>
        <Typography variant="body2" color="text.secondary">Adicione livros em EPUB ou PDF para ler e abrir as referências bíblicas reconhecidas no texto. Os arquivos ficam somente neste aparelho e não são enviados para nossos servidores.</Typography>
      </Box>
      <Button component="label" variant="outlined" startIcon={importando ? <CircularProgress size={18} /> : <UploadFileOutlinedIcon />} disabled={importando} sx={{ flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        {importando ? 'Adicionando…' : 'Adicionar livro'}
        <input aria-label="Selecionar livro EPUB ou PDF" type="file" accept=".epub,.pdf,application/epub+zip,application/pdf" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={(evento) => { const arquivo = evento.target.files?.[0]; evento.target.value = ''; if (arquivo) onImportar(arquivo) }} />
      </Button>
    </Stack>
    {carregando ? <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={28} /></Box> : livros.length > 0 ? <Grid container spacing={{ xs: 1.6, sm: 2, md: 2.5 }}>
      {livros.map((livro) => <Grid item xs={6} sm={4} md={3} lg={2.4} key={livro.id} sx={{ display: 'flex' }}>
        <Card variant="outlined" sx={{ width: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2.5, overflow: 'hidden', borderColor: 'rgba(10,81,68,.2)', position: 'relative' }}>
          <Tooltip title="Remover deste aparelho"><IconButton aria-label={`Remover ${livro.titulo}`} size="small" color="error" onClick={() => onExcluir(livro)} sx={{ position: 'absolute', zIndex: 2, top: 8, right: 8, bgcolor: 'rgba(255,255,255,.94)', boxShadow: 1, '&:hover': { bgcolor: '#fff' } }}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
          <Box component="button" type="button" onClick={() => navigate(`/biblioteca/pessoal/${livro.id}`)} aria-label={`Ler ${livro.titulo}`} sx={{ appearance: 'none', border: 0, bgcolor: 'transparent', p: 1.15, pb: 0, cursor: 'pointer' }}><CapaLivroPessoal livro={livro} /></Box>
          <CardContent sx={{ flex: 1, p: 1.5, '&:last-child': { pb: 0.7 } }}>
            <Chip size="small" label="Neste aparelho" variant="outlined" sx={{ height: 25 }} />
            <Typography variant="subtitle2" sx={{ mt: 1, fontFamily: 'Lora, Georgia, serif', fontWeight: 800, lineHeight: 1.24 }}>{livro.titulo}</Typography>
            <Typography variant="caption" color="text.secondary">{livro.autor}</Typography>
          </CardContent>
          <CardActions sx={{ px: 1.2, pb: 1.2, pt: 0.5 }}><Button size="small" variant="contained" startIcon={<AutoStoriesOutlinedIcon />} onClick={() => navigate(`/biblioteca/pessoal/${livro.id}`)}>Ler</Button></CardActions>
        </Card>
      </Grid>)}
    </Grid> : <Alert severity="info">Você ainda não adicionou nenhum livro à sua biblioteca pessoal. Adicione um EPUB ou PDF.</Alert>}
  </Box>
}

function Catalogo({ livros, carregando, comprasConfirmadas, ehAdmin, onConfirmarCompra, onNovo, onEditar, onExcluir, onConfigurarPix, onVerPedidos, pedidosPendentes, livrosPessoais, carregandoPessoais, importandoPessoal, onImportarPessoal, onExcluirPessoal }) {
  const [busca, setBusca] = useState('')
  const [infoAberta, setInfoAberta] = useState(false)
  const [livroOpcoes, setLivroOpcoes] = useState(null)
  const livrosVisiveis = useMemo(() => {
    const permitidos = ehAdmin ? livros : livros.filter((livro) => livro.publicado !== false && temModalidade(livro) && opcoesLivro(livro).length > 0)
    const termo = normalizarBusca(busca.trim())
    if (!termo) return permitidos
    return permitidos.filter((livro) => normalizarBusca(`${livro.titulo} ${livro.autor}`).includes(termo))
  }, [busca, ehAdmin, livros])
  const meusLivros = ehAdmin ? [] : livrosVisiveis.filter((livro) => comprasConfirmadas.has(chaveCompra(livro.id, 'pix')))
  const acervo = ehAdmin ? livrosVisiveis : livrosVisiveis.filter((livro) => !comprasConfirmadas.has(chaveCompra(livro.id, 'pix')))
  return (
    <Box sx={{ minHeight: '100%', bgcolor: (theme) => theme.palette.mode === 'dark' ? '#071b19' : '#f6f3ec' }}>
      <Box sx={{ color: '#fff', background: 'radial-gradient(circle at 82% 18%, rgba(218,176,81,.24), transparent 31%), linear-gradient(132deg, #073c35 0%, #062b26 54%, #071c19 100%)', borderBottom: '1px solid rgba(218,176,81,.35)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 1.35, sm: 1.5 } }}>
          <Stack alignItems="center">
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.7} sx={{ color: '#e3bd68' }}>
              <AutoStoriesOutlinedIcon sx={{ fontSize: { xs: 19, md: 21 } }} />
              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: { xs: 1.05, md: 1.35 }, fontSize: { xs: '.64rem', sm: '.72rem' }, lineHeight: 1.25 }}>Biblioteca do Discípulo Cristão</Typography>
              <Tooltip title="Sobre a Biblioteca">
                <IconButton aria-label="Sobre a Biblioteca" size="small" onClick={() => setInfoAberta(true)} sx={{ color: '#f3d58d', p: 0.25 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ py: { xs: 2.8, md: 4.2 } }}>
        <MeusLivrosPessoais livros={livrosPessoais} carregando={carregandoPessoais} importando={importandoPessoal} onImportar={onImportarPessoal} onExcluir={onExcluirPessoal} />
        <Divider sx={{ mb: 3.2 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2.7 }}>
          <Box><Typography variant="h5" sx={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 800 }}>Acervo</Typography><Typography variant="body2" color="text.secondary">Escolha um título e veja as opções disponíveis para o seu aparelho.</Typography></Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar livro ou autor" size="small" inputProps={{ 'aria-label': 'Buscar livro ou autor' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ width: { xs: '100%', sm: 300 }, bgcolor: 'background.paper' }} />
            {ehAdmin && <><Button variant="outlined" startIcon={<SettingsOutlinedIcon />} onClick={onConfigurarPix} sx={{ whiteSpace: 'nowrap' }}>Configurar Pix</Button><Button variant="outlined" color={pedidosPendentes ? 'warning' : 'primary'} startIcon={<NotificationsActiveOutlinedIcon />} onClick={onVerPedidos} sx={{ whiteSpace: 'nowrap' }}>Pagamentos{pedidosPendentes ? ` (${pedidosPendentes})` : ''}</Button><Button variant="contained" startIcon={<AddIcon />} onClick={onNovo} sx={{ whiteSpace: 'nowrap' }}>Novo livro</Button></>}
          </Stack>
        </Stack>
        {carregando ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : livrosVisiveis.length ? <Stack spacing={3.5}>
          {meusLivros.length > 0 && <Box>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Meus livros</Typography>
            <Grid container spacing={{ xs: 1.6, sm: 2, md: 2.5 }}>{meusLivros.map((livro) => <LivroCard key={livro.id} livro={livro} comprasConfirmadas={comprasConfirmadas} ehAdmin={ehAdmin} onOpcoes={setLivroOpcoes} onEditar={onEditar} onExcluir={onExcluir} />)}</Grid>
          </Box>}
          {acervo.length > 0 && <Box>
            {meusLivros.length > 0 && <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Outros títulos</Typography>}
            <Grid container spacing={{ xs: 1.6, sm: 2, md: 2.5 }}>{acervo.map((livro) => <LivroCard key={livro.id} livro={livro} comprasConfirmadas={comprasConfirmadas} ehAdmin={ehAdmin} onOpcoes={setLivroOpcoes} onEditar={onEditar} onExcluir={onExcluir} />)}</Grid>
          </Box>}
        </Stack> : <Alert severity="info">{busca ? 'Nenhum livro encontrado para essa busca.' : 'Nenhum título está disponível para este aparelho no momento.'}</Alert>}
      </Container>
      <InformacoesDialog aberto={infoAberta} onClose={() => setInfoAberta(false)} />
      <OpcoesDialog livro={livroOpcoes} comprasConfirmadas={comprasConfirmadas} onConfirmarCompra={onConfirmarCompra} onClose={() => setLivroOpcoes(null)} />
    </Box>
  )
}

function LeitorLivro({ livro, uid, finalidade = 'completo' }) {
  const navigate = useNavigate()
  const [arquivo, setArquivo] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    setCarregando(true); setErro(''); setArquivo(null)
    void obterArquivoLivroBiblioteca(livro.id, finalidade)
      .then((dados) => { if (ativo) setArquivo(dados) })
      .catch((falha) => {
        if (!ativo) return
        const mensagem = String(falha?.message || '')
        setErro(mensagem.includes('not-found') || mensagem.includes('não possui') || mensagem.includes('ainda não foi enviado')
          ? 'O arquivo deste livro ainda não foi enviado.'
          : mensagem.includes('permission') || mensagem.includes('acesso')
            ? 'Seu acesso a este livro ainda não foi liberado.'
            : 'Não foi possível abrir o livro agora.')
      })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [livro.id, finalidade])

  if (carregando) return <Box sx={{ py: 12, textAlign: 'center' }}><CircularProgress /><Typography color="text.secondary" sx={{ mt: 2 }}>Abrindo o livro…</Typography></Box>
  if (erro) return <Container maxWidth="sm" sx={{ py: 6 }}><Alert severity="warning" action={<Button onClick={() => navigate(`/biblioteca/${livro.id}`)}>Voltar</Button>}>{erro}</Alert></Container>

  return (
    <Box sx={{ minHeight: '100%', bgcolor: (theme) => theme.palette.mode === 'dark' ? '#121814' : '#f3eee3' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(18,24,20,.97)' : 'rgba(255,253,248,.97)', borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(10px)' }}>
        <Container maxWidth="md" sx={{ py: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.7}>
            <Button onClick={() => navigate(`/biblioteca/${livro.id}`)} sx={{ minWidth: 0, px: 1 }}>Voltar</Button>
            <Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap fontWeight={800} sx={{ fontFamily: 'Lora, Georgia, serif' }}>{livro.titulo}</Typography><Typography variant="caption" color="text.secondary">{finalidade === 'amostra' ? 'Amostra gratuita' : 'Minha biblioteca'}</Typography></Box>
            <CompartilharLivroButton livro={livro} somenteIcone />
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 3 } }} onContextMenu={(event) => event.preventDefault()}>
        <BibliotecaArquivoReader arquivo={arquivo} storageKey={`biblioteca-progresso:${uid}:${livro.id}:${finalidade}:${arquivo?.versao || 'original'}`} livro={livro} />
      </Container>
    </Box>
  )
}

function LeitorLivroPessoal({ id, proprietario }) {
  const navigate = useNavigate()
  const [livro, setLivro] = useState(null)
  const [arquivoUrl, setArquivoUrl] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    let url = ''
    setCarregando(true); setErro(''); setLivro(null); setArquivoUrl('')
    void obterLivroPessoal(id, proprietario).then((registro) => {
      if (!ativo) return
      if (!registro?.arquivo) throw new Error('Livro não encontrado neste aparelho.')
      url = URL.createObjectURL(registro.arquivo)
      setLivro(registro)
      setArquivoUrl(url)
    }).catch((falha) => { if (ativo) setErro(falha?.message || 'Não foi possível abrir este livro.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false; if (url) URL.revokeObjectURL(url) }
  }, [id, proprietario])

  if (carregando) return <EstadoCarregandoLivro mensagem="Abrindo seu livro…" />
  if (erro || !livro || !arquivoUrl) return <Container maxWidth="sm" sx={{ py: 6 }}><Alert severity="warning" action={<Button onClick={() => navigate('/biblioteca')}>Voltar</Button>}>{erro || 'Livro não encontrado neste aparelho.'}</Alert></Container>

  return <Box sx={{ minHeight: '100%', bgcolor: (theme) => theme.palette.mode === 'dark' ? '#121814' : '#f3eee3' }}>
    <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(18,24,20,.97)' : 'rgba(255,253,248,.97)', borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(10px)' }}>
      <Container maxWidth="md" sx={{ py: 1 }}><Stack direction="row" alignItems="center" spacing={0.7}>
        <Button onClick={() => navigate('/biblioteca')} sx={{ minWidth: 0, px: 1 }}>Voltar</Button>
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap fontWeight={800} sx={{ fontFamily: 'Lora, Georgia, serif' }}>{livro.titulo}</Typography><Typography variant="caption" color="text.secondary">Livro pessoal · somente neste aparelho</Typography></Box>
      </Stack></Container>
    </Box>
    <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 3 } }}>
      <BibliotecaArquivoReader arquivo={{ url: arquivoUrl, formato: livro.formato || 'epub', versao: livro.adicionadoEm }} storageKey={`biblioteca-pessoal-progresso:${proprietario}:${livro.id}`} livro={livro} permitirCompartilhamento={false} />
    </Container>
  </Box>
}

function EstadoCarregandoLivro({ mensagem }) {
  return <Box sx={{ py: 12, textAlign: 'center' }}><CircularProgress /><Typography color="text.secondary" sx={{ mt: 2 }}>{mensagem}</Typography></Box>
}

function DetalheLivro({ livro, comprasConfirmadas, ehAdmin, onConfirmarCompra, onEditar, onExcluir }) {
  const navigate = useNavigate()
  const [opcoesAbertas, setOpcoesAbertas] = useState(false)
  const opcoes = opcoesLivro(livro)
  const comprado = opcoes.some((opcao) => comprasConfirmadas.has(chaveCompra(livro.id, opcao.id)))
  const acessoDigital = ehAdmin || comprasConfirmadas.has(chaveCompra(livro.id, 'pix'))
  return (
    <Box sx={{ minHeight: '100%', bgcolor: (theme) => theme.palette.mode === 'dark' ? '#071b19' : '#f6f3ec' }}>
      <Container maxWidth="md" sx={{ py: { xs: 2.5, md: 4.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Button onClick={() => navigate('/biblioteca')} sx={{ px: 0.5 }}>Voltar à Biblioteca</Button>{ehAdmin && <Stack direction="row"><IconButton onClick={() => onEditar(livro)}><EditOutlinedIcon /></IconButton><IconButton color="error" onClick={() => onExcluir(livro)}><DeleteOutlineIcon /></IconButton></Stack>}</Stack>
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3.5, md: 4 }, borderRadius: 3, border: 1, borderColor: 'rgba(10,81,68,.18)', overflow: 'hidden', bgcolor: 'background.paper', boxShadow: '0 18px 48px rgba(24,38,34,.09)' }}>
          <Grid container spacing={{ xs: 3, md: 4.5 }} alignItems="flex-start">
            <Grid item xs={12} sm={5} sx={{ display: 'flex', justifyContent: 'center' }}><CapaLivro livro={livro} onClick={() => opcoes.length ? setOpcoesAbertas(true) : undefined} grande /></Grid>
            <Grid item xs={12} sm={7}>
              <SelosModalidades livro={livro} />
              <Typography component="h1" sx={{ mt: 1.6, fontFamily: 'Lora, Georgia, serif', fontSize: { xs: '1.85rem', md: '2.45rem' }, lineHeight: 1.12, fontWeight: 800 }}>{livro.titulo}</Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mt: 0.8, fontWeight: 500 }}>{livro.autor}</Typography>
              <Box sx={{ width: 58, height: 3, borderRadius: 2, bgcolor: '#b98322', my: 2.2 }} />
              <Typography sx={{ lineHeight: 1.78, color: 'text.secondary' }}>{livro.descricao}</Typography>
              <Typography variant="body2" sx={{ mt: 2, fontWeight: 700 }}>Tradução, revisão e organização de Wilson Lucas Ferreira.</Typography>
              <Stack spacing={1.2} sx={{ mt: 3 }}>
                {livro.arquivos?.amostra && <Button variant="outlined" size="large" startIcon={<AutoStoriesOutlinedIcon />} onClick={() => navigate(`/biblioteca/${livro.id}/amostra`)} fullWidth>Ler amostra</Button>}
                {acessoDigital && livro.arquivos?.completo
                  ? <Button variant="contained" size="large" startIcon={<VerifiedOutlinedIcon />} onClick={() => navigate(`/biblioteca/${livro.id}/ler`)} fullWidth>Ler livro</Button>
                  : opcoes.length ? <Button variant="contained" size="large" startIcon={comprado ? <VerifiedOutlinedIcon /> : <ShoppingCartOutlinedIcon />} onClick={() => setOpcoesAbertas(true)} fullWidth>{comprado ? 'Abrir' : 'Comprar'}</Button> : ehAdmin ? <Alert severity="warning">Rascunho administrativo: cadastre Android, Apple, Amazon ou Pix para publicar.</Alert> : null}
                <CompartilharLivroButton livro={livro} fullWidth />
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
      <OpcoesDialog livro={opcoesAbertas ? livro : null} comprasConfirmadas={comprasConfirmadas} onConfirmarCompra={onConfirmarCompra} onClose={() => setOpcoesAbertas(false)} />
    </Box>
  )
}

export default function BibliotecaLivros() {
  const { livroId, livroPessoalId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const { ehAdmin } = useEhAdmin(user?.uid)
  const [livros, setLivros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [comprasConfirmadas, setComprasConfirmadas] = useState(() => lerComprasConfirmadas(user?.uid))
  const [acessosPix, setAcessosPix] = useState(new Set())
  const [acessosCarregados, setAcessosCarregados] = useState(false)
  const [configuracaoPix, setConfiguracaoPix] = useState({})
  const [pedidosPix, setPedidosPix] = useState([])
  const [configurandoPix, setConfigurandoPix] = useState(false)
  const [vendoPedidos, setVendoPedidos] = useState(false)
  const [processandoPedido, setProcessandoPedido] = useState(false)
  const [livrosPessoais, setLivrosPessoais] = useState([])
  const [carregandoPessoais, setCarregandoPessoais] = useState(true)
  const [importandoPessoal, setImportandoPessoal] = useState(false)
  const [excluindoPessoal, setExcluindoPessoal] = useState(null)
  const proprietarioPessoal = user?.uid || 'local'

  useEffect(() => {
    setComprasConfirmadas(lerComprasConfirmadas(user?.uid))
  }, [user?.uid])

  useEffect(() => {
    let ativo = true
    setCarregandoPessoais(true)
    void listarLivrosPessoais(proprietarioPessoal)
      .then((itens) => { if (ativo) setLivrosPessoais(itens) })
      .catch((falha) => { if (ativo) setErro(falha?.message || 'Não foi possível abrir seus livros deste aparelho.') })
      .finally(() => { if (ativo) setCarregandoPessoais(false) })
    return () => { ativo = false }
  }, [proprietarioPessoal])

  useEffect(() => {
    setAcessosCarregados(false)
    if (!user?.uid) { setAcessosPix(new Set()); return undefined }
    return assinarAcessosBiblioteca(user.uid, (acessos) => {
      setAcessosPix(new Set(Object.entries(acessos || {}).filter(([, acesso]) => acesso?.ativo === true).map(([id]) => chaveCompra(id, 'pix'))))
      setAcessosCarregados(true)
    }, () => { setAcessosPix(new Set()); setAcessosCarregados(true) })
  }, [user?.uid])

  useEffect(() => {
    if (!ehAdmin) { setConfiguracaoPix({}); setPedidosPix([]); return undefined }
    const cancelarConfig = assinarConfiguracaoPixBiblioteca(setConfiguracaoPix, (falha) => setErro(falha?.message || 'Não foi possível carregar a configuração do Pix.'))
    const cancelarPedidos = assinarPedidosPixAdmin(setPedidosPix, (falha) => setErro(falha?.message || 'Não foi possível carregar os pagamentos.'))
    return () => { cancelarConfig(); cancelarPedidos() }
  }, [ehAdmin])

  const comprasDisponiveis = useMemo(() => new Set([...comprasConfirmadas, ...acessosPix]), [comprasConfirmadas, acessosPix])
  const pedidosPendentes = pedidosPix.filter((pedido) => pedido.status === 'pagamento_informado').length

  function confirmarCompra(idLivro, idModalidade) {
    if (!idLivro || !idModalidade) return
    setComprasConfirmadas((atuais) => {
      const proximas = new Set(atuais)
      proximas.add(chaveCompra(idLivro, idModalidade))
      salvarComprasConfirmadas(user?.uid, proximas)
      return proximas
    })
  }

  useEffect(() => {
    // O acervo básico faz parte do aplicativo e não depende da rede. A
    // sincronização remota só pode começar depois que o Firebase confirmar a
    // sessão, pois as regras do catálogo exigem um usuário autenticado.
    if (!user?.uid) {
      setLivros(obterCatalogoLivrosLocal())
      setCarregando(false)
      return undefined
    }

    return assinarCatalogoLivros(
      (catalogo) => {
        setLivros(catalogo)
        setCarregando(false)
      },
      (falha) => {
        // O serviço já entregou o catálogo local como contingência. Não
        // interrompa a leitura com um alerta de erro por uma falha temporária.
        console.warn('[biblioteca] catálogo remoto indisponível; usando acervo local:', falha?.code || falha?.message || falha)
        setCarregando(false)
      },
    )
  }, [user?.uid])

  const livro = livroId ? livros.find((item) => item.id === livroId) : null
  const modoLeitura = Boolean(livroId && location.pathname.endsWith('/ler'))
  const modoAmostra = Boolean(livroId && location.pathname.endsWith('/amostra'))
  const acessoLeitura = Boolean(livro && (ehAdmin || acessosPix.has(chaveCompra(livro.id, 'pix'))))
  const visivelAoLeitor = livro ? livro.publicado !== false && temModalidade(livro) && opcoesLivro(livro).length > 0 : false
  const abrirSolicitado = new URLSearchParams(location.search).get('abrir') === '1'

  useEffect(() => {
    if (!abrirSolicitado || modoLeitura || modoAmostra || !livro?.arquivos?.completo) return
    if (!ehAdmin && !acessosCarregados) return
    if (acessoLeitura) navigate(`/biblioteca/${livro.id}/ler`, { replace: true })
  }, [abrirSolicitado, modoLeitura, modoAmostra, livro, ehAdmin, acessosCarregados, acessoLeitura, navigate])

  async function salvar(form) {
    setSalvando(true); setErro('')
    try {
      const { arquivosSelecionados, capaPreparada, ...dados } = form
      const id = dados.id || criarIdLivro(dados.titulo)
      if (dados.pixAtivo && !dados.arquivos?.completo && !arquivosSelecionados?.completo) {
        throw new Error('Envie o arquivo completo antes de ativar a venda por Pix.')
      }
      let capa = dados.capa || ''
      if (capaPreparada) capa = await enviarCapaLivroBiblioteca(id, capaPreparada, user?.uid)
      await salvarLivroBiblioteca({ ...dados, id, capa }, user?.uid)
      for (const finalidade of ['completo', 'amostra']) {
        if (arquivosSelecionados?.[finalidade]) {
          await enviarArquivoLivroBiblioteca(id, finalidade, arquivosSelecionados[finalidade])
        }
      }
      setEditando(null)
    }
    catch (e) { setErro(e?.message || 'Não foi possível salvar o livro.') }
    finally { setSalvando(false) }
  }

  async function importarPessoal(arquivo) {
    setImportandoPessoal(true); setErro('')
    try {
      const livroAdicionado = await importarLivroPessoal(arquivo, proprietarioPessoal)
      setLivrosPessoais((atuais) => [livroAdicionado, ...atuais])
    } catch (falha) {
      setErro(falha?.message || 'Não foi possível adicionar este livro.')
    } finally {
      setImportandoPessoal(false)
    }
  }

  async function removerPessoal() {
    if (!excluindoPessoal) return
    setImportandoPessoal(true); setErro('')
    try {
      await excluirLivroPessoal(excluindoPessoal.id, proprietarioPessoal)
      setLivrosPessoais((atuais) => atuais.filter((livroPessoal) => livroPessoal.id !== excluindoPessoal.id))
      setExcluindoPessoal(null)
    } catch (falha) {
      setErro(falha?.message || 'Não foi possível remover este livro do aparelho.')
    } finally {
      setImportandoPessoal(false)
    }
  }

  async function excluir() {
    if (!excluindo) return
    setSalvando(true); setErro('')
    try { await excluirLivroBiblioteca(excluindo.id, user?.uid); setExcluindo(null); if (livroId === excluindo.id) navigate('/biblioteca', { replace: true }) }
    catch (e) { setErro(e?.message || 'Não foi possível excluir o livro.') }
    finally { setSalvando(false) }
  }

  async function salvarPix(configuracao) {
    setSalvando(true); setErro('')
    try { await salvarConfiguracaoPixBiblioteca(configuracao); setConfigurandoPix(false) }
    catch (e) { setErro(e?.message || 'Não foi possível salvar a configuração do Pix.') }
    finally { setSalvando(false) }
  }

  async function decidirPedido(pedidoId, aprovado) {
    setProcessandoPedido(true); setErro('')
    try { await decidirPedidoPixBiblioteca(pedidoId, aprovado) }
    catch (e) { setErro(e?.message || 'Não foi possível analisar o pagamento.') }
    finally { setProcessandoPedido(false) }
  }

  let conteudo
  if (livroPessoalId) conteudo = <LeitorLivroPessoal id={livroPessoalId} proprietario={proprietarioPessoal} />
  else if (!livroId) conteudo = <Catalogo livros={livros} carregando={carregando} comprasConfirmadas={comprasDisponiveis} ehAdmin={ehAdmin} onConfirmarCompra={confirmarCompra} onNovo={() => setEditando({ titulo: '', autor: '', descricao: '', capa: '', androidUrl: '', appleUrl: '', amazonUrl: '', pixAtivo: false, precoPixCentavos: 0, publicado: false })} onEditar={setEditando} onExcluir={setExcluindo} onConfigurarPix={() => setConfigurandoPix(true)} onVerPedidos={() => setVendoPedidos(true)} pedidosPendentes={pedidosPendentes} livrosPessoais={livrosPessoais} carregandoPessoais={carregandoPessoais} importandoPessoal={importandoPessoal} onImportarPessoal={importarPessoal} onExcluirPessoal={setExcluindoPessoal} />
  else if (carregando || (modoLeitura && !ehAdmin && !acessosCarregados)) conteudo = <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>
  else if (modoAmostra && livro && (ehAdmin || (livro.publicado !== false && livro.arquivos?.amostra))) conteudo = <LeitorLivro livro={livro} uid={user?.uid} finalidade="amostra" />
  else if (modoAmostra) conteudo = <Container maxWidth="sm" sx={{ py: 5 }}><Alert severity="warning" action={<Button onClick={() => navigate(`/biblioteca/${livroId}`)}>Voltar</Button>}>Este livro ainda não possui uma amostra disponível.</Alert></Container>
  else if (modoLeitura && livro && acessoLeitura) conteudo = <LeitorLivro livro={livro} uid={user?.uid} finalidade="completo" />
  else if (modoLeitura) conteudo = <Container maxWidth="sm" sx={{ py: 5 }}><Alert severity="warning" action={<Button onClick={() => navigate(`/biblioteca/${livroId}`)}>Voltar</Button>}>A leitura deste livro ainda não está liberada para sua conta.</Alert></Container>
  else if (livro && (ehAdmin || visivelAoLeitor)) conteudo = <DetalheLivro livro={livro} comprasConfirmadas={comprasDisponiveis} ehAdmin={ehAdmin} onConfirmarCompra={confirmarCompra} onEditar={setEditando} onExcluir={setExcluindo} />
  else conteudo = <Container maxWidth="sm" sx={{ py: 5 }}><Alert severity="warning" action={<Button onClick={() => navigate('/biblioteca')}>Voltar</Button>}>Este livro não está disponível.</Alert></Container>

  return (
    <>
      {erro && <Alert severity="error" onClose={() => setErro('')} sx={{ borderRadius: 0 }}>{erro}</Alert>}
      {conteudo}
      {ehAdmin && <EditarLivroDialog livro={editando} aberto={Boolean(editando)} uid={user?.uid} onClose={() => setEditando(null)} onSalvar={salvar} salvando={salvando} />}
      {ehAdmin && <ConfiguracaoPixDialog aberto={configurandoPix} configuracao={configuracaoPix} onClose={() => setConfigurandoPix(false)} onSalvar={salvarPix} salvando={salvando} />}
      {ehAdmin && <PedidosPixDialog aberto={vendoPedidos} pedidos={pedidosPix} onClose={() => setVendoPedidos(false)} onDecidir={decidirPedido} processando={processandoPedido} />}
      <Dialog open={Boolean(excluindo)} onClose={salvando ? undefined : () => setExcluindo(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir livro?</DialogTitle>
        <DialogContent><Typography>“{excluindo?.titulo}” será removido da Biblioteca.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setExcluindo(null)} disabled={salvando}>Cancelar</Button><Button color="error" variant="contained" onClick={excluir} disabled={salvando}>{salvando ? 'Excluindo…' : 'Excluir'}</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(excluindoPessoal)} onClose={importandoPessoal ? undefined : () => setExcluindoPessoal(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remover livro deste aparelho?</DialogTitle>
        <DialogContent><Typography>“{excluindoPessoal?.titulo}” será removido somente desta biblioteca local. O arquivo original não será apagado do aparelho.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setExcluindoPessoal(null)} disabled={importandoPessoal}>Cancelar</Button><Button color="error" variant="contained" onClick={removerPessoal} disabled={importandoPessoal}>Remover</Button></DialogActions>
      </Dialog>
    </>
  )
}

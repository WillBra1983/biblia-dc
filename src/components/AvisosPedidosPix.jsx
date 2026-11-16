import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Snackbar, Stack, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Capacitor } from '@capacitor/core'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { isFirebaseConfigured } from '../config/firebase'
import { listarMeusPedidosPixBiblioteca, consultarPedidoPixBiblioteca } from '../services/bibliotecaLivrosService'

const OpcoesCompra = lazy(() => import('../pages/BibliotecaLivros').then((modulo) => ({ default: modulo.OpcoesDialog })))
const SEM_COMPRAS = new Set()
const ROTULOS = { recusado: 'Pagamento não localizado', aguardando_pagamento: 'Aguardando pagamento', pagamento_informado: 'Pagamento em conferência' }
const PedidosPixContext = createContext(null)
const chaveDispensa = conta => `biblioteca-aviso-dispensado-v1:${conta}`
function lerDispensa(conta) {
  try { return localStorage.getItem(chaveDispensa(conta)) || '' } catch { return '' }
}

export function LembretePedidosPix() {
  const contexto = useContext(PedidosPixContext)
  if (!contexto?.pedidos.length) return null
  const pendentes = contexto.pedidos.some(pedido => pedido.status !== 'pagamento_informado')
  return <Alert severity={pendentes ? 'info' : 'success'} sx={{ mb: 2.5 }} action={<Button color="inherit" onClick={contexto.abrir}>{pendentes ? 'Terminar compra' : 'Ver pedidos'}</Button>}>
    {pendentes ? 'Você tem compras para concluir.' : 'Seu pagamento está em conferência.'}
  </Alert>
}

// Presente no Layout: funciona na abertura, no menu e ao voltar ao aplicativo,
// inclusive sem permissão de push. Nenhum dado de outro perfil é reaproveitado.
export default function AvisosPedidosPix({ children } = {}) {
  const { user } = useFirebaseAuth()
  const conta = user === undefined ? null : user?.uid || 'visitante'
  const [consulta, setConsulta] = useState(null)
  const [aberto, setAberto] = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [dispensa, setDispensa] = useState(null)
  const pedidos = consulta?.conta === conta ? consulta.pedidos : []

  useEffect(() => {
    setAberto(false); setSelecionado(null); setErro(''); setCarregando(false)
    if (!conta || !isFirebaseConfigured()) return undefined
    let ativo = true
    let emCurso = false
    let listenerNativo
    const atualizar = async () => {
      if (!ativo || emCurso || document.visibilityState === 'hidden' || navigator.onLine === false) return
      emCurso = true
      try {
        const dados = await listarMeusPedidosPixBiblioteca()
        if (ativo) setConsulta({ conta, pedidos: dados.pedidos || [] })
      } catch { /* A próxima reconexão tenta novamente; não confunda falha com ausência de pedidos. */ }
      finally { emCurso = false }
    }
    void atualizar()
    const timer = setInterval(atualizar, 30000)
    window.addEventListener('focus', atualizar)
    window.addEventListener('online', atualizar)
    window.addEventListener('biblioteca-pedidos-atualizados', atualizar)
    document.addEventListener('visibilitychange', atualizar)
    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/app').then(({ App }) => App.addListener('appStateChange', ({ isActive }) => { if (isActive) void atualizar() }))
        .then((listener) => { if (ativo) listenerNativo = listener; else void listener.remove() }).catch(() => {})
    }
    return () => {
      ativo = false; clearInterval(timer)
      window.removeEventListener('focus', atualizar)
      window.removeEventListener('online', atualizar)
      window.removeEventListener('biblioteca-pedidos-atualizados', atualizar)
      document.removeEventListener('visibilitychange', atualizar)
      if (listenerNativo) void listenerNativo.remove()
    }
  }, [conta])

  const fecharCompra = () => {
    setSelecionado(null)
    dispensarAviso()
    window.dispatchEvent(new Event('biblioteca-pedidos-atualizados'))
  }
  const abrirPedido = async (pedido) => {
    setCarregando(true); setErro('')
    try {
      const dados = await consultarPedidoPixBiblioteca(pedido.pedidoId, true)
      setSelecionado({ conta, dados })
    } catch (falha) { setErro(falha?.message || 'Não foi possível abrir o pedido. Tente novamente.') }
    finally { setCarregando(false) }
  }
  const compra = selecionado?.conta === conta ? selecionado.dados : null
  const recusados = pedidos.filter((pedido) => pedido.status === 'recusado')
  const pendentes = pedidos.filter((pedido) => pedido.status === 'aguardando_pagamento')
  const aviso = recusados.length ? recusados : pendentes
  // Não inclui atualizadoEm: consultas e retomadas não devem desfazer a dispensa.
  const assinatura = JSON.stringify(aviso.map(pedido => [pedido.pedidoId, pedido.status, pedido.status === 'recusado' ? pedido.observacaoAdmin : '']).sort((a, b) => a[0].localeCompare(b[0])))
  const assinaturaDispensada = dispensa?.conta === conta ? dispensa.assinatura : lerDispensa(conta)
  function dispensarAviso() {
    setDispensa({ conta, assinatura })
    try { localStorage.setItem(chaveDispensa(conta), assinatura) } catch { /* Mantém a dispensa nesta sessão. */ }
  }
  const fecharLista = () => { if (!carregando) { setAberto(false); dispensarAviso() } }
  return <PedidosPixContext.Provider value={{ pedidos, abrir: () => setAberto(true) }}>
    {children}
    <Snackbar open={aviso.length > 0 && assinatura !== assinaturaDispensada && !aberto && !compra} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ zIndex: (theme) => theme.zIndex.modal + 1, top: 'calc(env(safe-area-inset-top, 0px) + 12px) !important' }}>
      <Alert severity={recusados.length ? 'warning' : 'info'} variant="filled" action={<Stack direction="row" alignItems="center"><Button color="inherit" size="small" onClick={() => setAberto(true)}>Ver pedido</Button><IconButton color="inherit" size="small" aria-label="Fechar aviso de compra" onClick={dispensarAviso}><CloseIcon fontSize="small" /></IconButton></Stack>} sx={{ alignItems: 'center', boxShadow: 4 }}>
        {recusados.length ? 'Pagamento não localizado' : 'Sua compra aguarda pagamento'}
        <Typography variant="body2">{aviso.length === 1 ? aviso[0].livroTitulo : `${aviso.length} pedidos na Livraria Cristã`}</Typography>
      </Alert>
    </Snackbar>
    <Dialog open={aberto && !compra} onClose={fecharLista} fullWidth maxWidth="xs">
      <DialogTitle>Minhas compras · Pix</DialogTitle>
      <DialogContent>
        {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}
        {!pedidos.length && <Typography>Não há pagamentos pendentes.</Typography>}
        <Stack spacing={2}>{pedidos.map((pedido) => <Box key={pedido.pedidoId}>
          <Typography fontWeight={700}>{pedido.livroTitulo}</Typography>
          <Typography variant="body2">{ROTULOS[pedido.status]}</Typography>
          {pedido.status === 'recusado' && <Alert severity="warning" sx={{ my: 1 }}>{pedido.observacaoAdmin || 'Não localizamos seu Pix. Se já pagou, envie o comprovante para conferência.'}</Alert>}
          <Button variant="outlined" disabled={carregando} onClick={() => abrirPedido(pedido)}>{carregando ? 'Abrindo…' : 'Ver pagamento / continuar compra'}</Button>
        </Box>)}</Stack>
        <Button onClick={fecharLista} disabled={carregando} sx={{ mt: 2 }}>Fechar</Button>
      </DialogContent>
    </Dialog>
    {compra && <Suspense fallback={<Dialog open><DialogContent><CircularProgress aria-label="Abrindo pagamento" /></DialogContent></Dialog>}>
      <OpcoesCompra key={`${conta}:${compra.pedidoId}`} livro={{ id: compra.livroId, titulo: compra.livroTitulo }} pedidoInicial={compra} comprasConfirmadas={SEM_COMPRAS} onClose={fecharCompra} />
    </Suspense>}
  </PedidosPixContext.Provider>
}

import { lazy, Suspense, useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, Snackbar, Stack, Typography } from '@mui/material'
import { Capacitor } from '@capacitor/core'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { isFirebaseConfigured } from '../config/firebase'
import { listarMeusPedidosPixBiblioteca, consultarPedidoPixBiblioteca } from '../services/bibliotecaLivrosService'

const OpcoesCompra = lazy(() => import('../pages/BibliotecaLivros').then((modulo) => ({ default: modulo.OpcoesDialog })))
const SEM_COMPRAS = new Set()
const ROTULOS = { recusado: 'Pagamento não localizado', aguardando_pagamento: 'Aguardando pagamento', pagamento_informado: 'Pagamento em conferência' }

// Presente no Layout: funciona na abertura, no menu e ao voltar ao aplicativo,
// inclusive sem permissão de push. Nenhum dado de outro perfil é reaproveitado.
export default function AvisosPedidosPix() {
  const { user } = useFirebaseAuth()
  const conta = user === undefined ? null : user?.uid || 'visitante'
  const [consulta, setConsulta] = useState(null)
  const [aberto, setAberto] = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
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
  return <>
    <Snackbar open={aviso.length > 0 && !aberto && !compra} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ zIndex: (theme) => theme.zIndex.modal + 1, top: 'calc(env(safe-area-inset-top, 0px) + 12px) !important' }}>
      <Alert severity={recusados.length ? 'warning' : 'info'} variant="filled" action={<Button color="inherit" size="small" onClick={() => setAberto(true)}>Ver pedido</Button>} sx={{ alignItems: 'center', boxShadow: 4 }}>
        {recusados.length ? 'Pagamento não localizado' : 'Sua compra aguarda pagamento'}
        <Typography variant="body2">{aviso.length === 1 ? aviso[0].livroTitulo : `${aviso.length} pedidos na Livraria Cristã`}</Typography>
      </Alert>
    </Snackbar>
    <Dialog open={aberto && !compra} onClose={() => { if (!carregando) setAberto(false) }} fullWidth maxWidth="xs">
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
        <Button onClick={() => setAberto(false)} disabled={carregando} sx={{ mt: 2 }}>Fechar</Button>
      </DialogContent>
    </Dialog>
    {compra && <Suspense fallback={<Dialog open><DialogContent><CircularProgress aria-label="Abrindo pagamento" /></DialogContent></Dialog>}>
      <OpcoesCompra key={`${conta}:${compra.pedidoId}`} livro={{ id: compra.livroId, titulo: compra.livroTitulo }} pedidoInicial={compra} comprasConfirmadas={SEM_COMPRAS} onClose={fecharCompra} />
    </Suspense>}
  </>
}

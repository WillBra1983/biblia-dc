import { useEffect, useState } from 'react'
import { Alert, Button, Snackbar } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { capturarConviteProjeto, confirmarConvitePendenteProjeto, convitePendenteProjeto } from '../services/projetoCompartilhamentoService'
import { capturarConviteInstalacao } from '../services/conviteInstalacaoService'

export default function ConvitesProjetoBootstrap() {
  const { user } = useFirebaseAuth(), location = useLocation(), navigate = useNavigate()
  const [pendente, setPendente] = useState(() => convitePendenteProjeto())
  const [fechado, setFechado] = useState(false)
  const codigo = new URLSearchParams(location.search).get('convite')
  useEffect(() => {
    let ativo = true
    const capturar = () => { void capturarConviteInstalacao().then(convite => { if (ativo && convite) setPendente(convite) }) }
    capturar()
    window.addEventListener('online', capturar)
    return () => { ativo = false; window.removeEventListener('online', capturar) }
  }, [])
  useEffect(() => {
    const atualizar = () => setPendente(convitePendenteProjeto())
    window.addEventListener('projeto-convite-pendente', atualizar)
    return () => window.removeEventListener('projeto-convite-pendente', atualizar)
  }, [])
  useEffect(() => {
    if (!codigo) return undefined
    let ativo = true
    capturarConviteProjeto(codigo).then(convite => { if (ativo) setPendente(convite) }).catch(() => {})
    return () => { ativo = false }
  }, [codigo])
  useEffect(() => {
    if (!user?.uid || !pendente) return undefined
    let ativo = true, ocupado = false
    const confirmar = async () => {
      if (ocupado || !navigator.onLine) return
      ocupado = true
      try { await confirmarConvitePendenteProjeto(); if (ativo) setPendente(null) }
      catch { /* E-mail ainda não confirmado ou rede indisponível: retoma na próxima entrada. */ }
      finally { ocupado = false }
    }
    void confirmar()
    const timer = setInterval(confirmar, 60000)
    window.addEventListener('focus', confirmar); window.addEventListener('online', confirmar)
    return () => { ativo = false; clearInterval(timer); window.removeEventListener('focus', confirmar); window.removeEventListener('online', confirmar) }
  }, [user?.uid, pendente])
  return <Snackbar open={Boolean(codigo && pendente && !user && !fechado)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Alert severity="info" onClose={() => setFechado(true)} action={<Button color="inherit" size="small" onClick={() => { setFechado(true); navigate('/perfil') }}>Criar conta</Button>}>Você recebeu um convite para estudar a Palavra conosco. Seja bem-vindo!</Alert></Snackbar>
}

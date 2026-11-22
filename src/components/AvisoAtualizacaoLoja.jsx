/**
 * Verifica versão instalada vs. versão na loja (RTDB) e mostra diálogo
 * opcional para abrir Play Store / App Store. Nunca bloqueia o uso do app.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { Capacitor } from '@capacitor/core'
import { aguardarPosSplash } from '../utils/posSplash'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '../utils/appStoreLinks'
import { listarAvisosAdminPendentes, marcarAvisoAdminEntregue, registrarAtualizacoesVistas } from '../services/avisosAdminService'
import {
  abrirLojaAtualizacao,
  avaliarAtualizacaoLoja,
  marcarAvisoVersaoDispensado,
} from '../services/appLojaVersaoService'

export default function AvisoAtualizacaoLoja() {
  const { user } = useFirebaseAuth()
  const uidRef = useRef(user?.uid)
  uidRef.current = user?.uid
  const [aviso, setAviso] = useState(null)
  const checandoRef = useRef(false)
  const vistosNestaSessao = useRef(new Set())

  const verificar = useCallback(async () => {
    if (!Capacitor.isNativePlatform?.()) return
    if (checandoRef.current) return
    checandoRef.current = true
    const uid = uidRef.current
    try {
      const r = await avaliarAtualizacaoLoja()
      let comunicados = []
      if (uid) {
        try { comunicados = (await listarAvisosAdminPendentes(uid, 20)).filter(item => item.acao === 'atualizar_app' && !vistosNestaSessao.current.has(`${uid}:${item.id}`)) } catch { /* A consulta da loja ainda pode funcionar. */ }
      }
      if (uid !== uidRef.current) return
      const ids = comunicados.map(item => item.id)
      if (r) setAviso({ ...r, uid, avisos: ids })
      else if (comunicados.length) {
        const ultimo = comunicados[comunicados.length - 1]
        const plataforma = Capacitor.getPlatform()
        setAviso({ comunicado: true, plataforma, mensagem: ultimo.mensagem, uid, avisos: ids, urlLoja: plataforma === 'ios' ? APP_STORE_URL : GOOGLE_PLAY_URL })
      }
    } catch { /* Tenta novamente ao reconectar ou retornar ao aplicativo. */
    } finally {
      checandoRef.current = false
      if (uid !== uidRef.current) window.dispatchEvent(new Event('salvation-check-update'))
    }
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform?.()) return undefined
    setAviso(null)

    let cancelado = false
    let removeListener = () => {}
    const aoEstadoAplicativo = (isActive) => {
      // Retomar o processo preserva o "Depois". As dispensas em memória
      // só desaparecem quando o aplicativo é iniciado novamente.
      if (isActive) void verificar()
    }

    const cancelarEspera = aguardarPosSplash(() => {
      void verificar()

      void import('@capacitor/app').then(({ App: CapApp }) => {
        if (cancelado) return
        CapApp.addListener('appStateChange', ({ isActive }) => {
          aoEstadoAplicativo(isActive)
        }).then((h) => {
          if (cancelado) {
            void h.remove()
            return
          }
          removeListener = () => {
            void h.remove()
          }
        }).catch(() => {})
      })
    })

    const aoRetornar = () => { if (document.visibilityState !== 'hidden') void verificar() }
    const aoMudarVisibilidade = () => aoEstadoAplicativo(document.visibilityState !== 'hidden')
    const aoComunicado = (evento) => {
      const payload = evento.detail
      if (payload?.data?.acao !== 'atualizar_app') return
      const id = payload.data.avisoId
      const uid = uidRef.current
      if (id && vistosNestaSessao.current.has(`${uid}:${id}`)) return
      const plataforma = Capacitor.getPlatform()
      setAviso({ comunicado: true, plataforma, mensagem: payload.notification?.body || '', uid, avisos: id ? [id] : [], urlLoja: plataforma === 'ios' ? APP_STORE_URL : GOOGLE_PLAY_URL })
    }
    window.addEventListener('focus', aoRetornar)
    window.addEventListener('online', aoRetornar)
    window.addEventListener('salvation-check-update', aoRetornar)
    window.addEventListener('salvation-update-announcement', aoComunicado)
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    const timer = window.setInterval(aoRetornar, 60000)

    return () => {
      cancelado = true
      cancelarEspera()
      removeListener()
      window.clearInterval(timer)
      window.removeEventListener('focus', aoRetornar)
      window.removeEventListener('online', aoRetornar)
      window.removeEventListener('salvation-check-update', aoRetornar)
      window.removeEventListener('salvation-update-announcement', aoComunicado)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [verificar, user?.uid])

  if (!aviso || aviso.uid !== user?.uid) return null

  const versaoLocal = aviso.buildInstalado
    ? `${aviso.versaoInstalada} (${aviso.buildInstalado})`
    : aviso.versaoInstalada
  const ehIos = aviso.plataforma === 'ios'
  const nomeLoja = ehIos ? 'App Store' : 'Google Play'
  const plataformaIncompativel = ehIos
    ? /\b(?:Google\s*Play|Play\s*Store|Android)\b/i
    : /\b(?:App\s*Store|Apple|iPhone|iPad|iOS)\b/i
  const mensagemPersonalizada = plataformaIncompativel.test(aviso.mensagem || '')
    ? ''
    : aviso.mensagem
  const corpoPadrao = aviso.comunicado
    ? `Confira a atualização do aplicativo na ${nomeLoja}.`
    : `Há uma versão mais recente (${aviso.versaoAtual}) disponível no ${nomeLoja}. Você está na ${versaoLocal}.`

  function registrarLeitura() {
    const ids = aviso.avisos || []
    ids.forEach(id => vistosNestaSessao.current.add(`${aviso.uid}:${id}`))
    registrarAtualizacoesVistas(aviso.uid, ids)
    ids.forEach(id => { void marcarAvisoAdminEntregue(aviso.uid, id).catch(() => {}) })
  }

  function dispensar() {
    registrarLeitura()
    marcarAvisoVersaoDispensado(aviso.chaveAviso)
    setAviso(null)
  }

  async function irParaLoja() {
    registrarLeitura()
    marcarAvisoVersaoDispensado(aviso.chaveAviso)
    setAviso(null)
    await abrirLojaAtualizacao(aviso.urlLoja, aviso.plataforma)
  }

  return (
    <Dialog open maxWidth="xs" fullWidth onClose={dispensar}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <SystemUpdateAltIcon color="primary" />
        Nova versão disponível
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: mensagemPersonalizada ? 1.5 : 0 }}>
          {mensagemPersonalizada || corpoPadrao}
        </Typography>
        {mensagemPersonalizada ? (
          <Typography variant="body2" color="text.secondary">
            {corpoPadrao}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'row', gap: 1 }}>
        <Button variant="contained" fullWidth onClick={() => void irParaLoja()}>
          Atualizar no {nomeLoja}
        </Button>
        <Button color="inherit" fullWidth onClick={dispensar}>
          Depois
        </Button>
      </DialogActions>
    </Dialog>
  )
}

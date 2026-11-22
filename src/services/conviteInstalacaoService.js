import { Capacitor, registerPlugin } from '@capacitor/core'
import { capturarConviteProjeto } from './projetoCompartilhamentoService'

const InstallReferral = registerPlugin('InstallReferral')
const CHAVE = 'projeto-convite-instalacao-v1'
let consulta = null

export function capturarConviteInstalacao() {
  if (Capacitor.getPlatform() !== 'android') return Promise.resolve(null)
  if (consulta) return consulta
  consulta = (async () => {
    try {
      let estado = JSON.parse(localStorage.getItem(CHAVE) || 'null')
      if (estado?.concluido) return null
      if (!estado?.codigo) {
        const resposta = await InstallReferral.read()
        if (resposta?.status === 'unsupported') {
          localStorage.setItem(CHAVE, JSON.stringify({ concluido: true }))
          return null
        }
        if (resposta?.status !== 'ok') return null
        const bruto = resposta.referrer
        const codigo = typeof bruto === 'string' && bruto.length <= 2048 ? new URLSearchParams(bruto).get('convite') : ''
        if (!/^[a-f0-9]{32}$/.test(codigo || '')) {
          localStorage.setItem(CHAVE, JSON.stringify({ concluido: true }))
          return null
        }
        // Preserva antes da rede: uma primeira abertura offline retoma sem
        // pedir código e sem consultar novamente a origem na Play Store.
        estado = { codigo }
        localStorage.setItem(CHAVE, JSON.stringify(estado))
      }
      if (!/^[a-f0-9]{32}$/.test(estado.codigo)) return null
      const convite = await capturarConviteProjeto(estado.codigo)
      if (convite) localStorage.setItem(CHAVE, JSON.stringify({ concluido: true }))
      return convite
    } catch { return null }
  })().finally(() => { consulta = null })
  return consulta
}

import { PENDING_CHAT_EXPORT_KEY } from '../constants/chatExportPending'
import { mostrarSnackbar } from './uiDialogs'
import {
  estaSemRede,
  marcarModoLimitadoOffline,
  rotaExigeContaOuNuvem,
} from './conteudoLocalOffline'

const MSG_SEM_REDE = 'Sem acesso. Você está sem acesso à internet.'

/**
 * Chave de sessionStorage que guarda a URL para onde o usuário deve voltar
 * automaticamente assim que concluir o login. Usada por
 * `ensureUserForFeature` (salva) e `consumePendingLoginRedirect` (lê).
 */
const PENDING_LOGIN_REDIRECT_KEY = 'salvation-pending-login-redirect'

/** Tempo máximo (ms) que uma intenção de redirecionamento fica "viva". */
const PENDING_LOGIN_REDIRECT_TTL_MS = 10 * 60 * 1000 // 10 min

/** Exige usuário autenticado; caso contrário avisa e envia para o chat. */
export function ensureUserForChatExport(user, navigate) {
  if (user === undefined) return false
  if (!user?.uid) {
    if (estaSemRede()) {
      marcarModoLimitadoOffline()
      mostrarSnackbar({
        mensagem:
          'Sem conexão. Acesso limitado ao conteúdo no aparelho. Entre na conta quando houver internet.',
        severidade: 'warning',
      })
      navigate('/')
      return false
    }
    mostrarSnackbar({
      mensagem: 'Entre na sua conta para enviar pelo chat.',
      severidade: 'info'
    })
    navigate('/chat')
    return false
  }
  if (estaSemRede()) {
    mostrarSnackbar({ mensagem: MSG_SEM_REDE, severidade: 'warning' })
    return false
  }
  return true
}

/**
 * Exige usuário autenticado para abrir uma funcionalidade que depende de
 * conta (ex.: Strong, Plano de leitura). Mostra um snackbar amigável,
 * **guarda a URL de destino** para retomar depois do login e redireciona
 * para a tela de login (`/chat`).
 *
 * @param {object|null} user      Objeto de usuário (`null`/`undefined` = não logado).
 * @param {Function}    navigate  `useNavigate()` do react-router.
 * @param {object}      [opts]
 * @param {string}      [opts.mensagem]    Mensagem custom para o snackbar.
 * @param {string}      [opts.redirectTo]  URL que o usuário pretendia abrir.
 *                                         Se omitido, usamos a URL atual
 *                                         (`pathname+search+hash`).
 *
 * @returns {boolean} `true` se a ação pode prosseguir; `false` caso o
 *                    redirect para login já tenha sido disparado.
 */
export function ensureUserForFeature(user, navigate, { mensagem, redirectTo } = {}) {
  if (user === undefined) return false

  const destino =
    redirectTo ||
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : '/')

  if (user?.uid && estaSemRede() && rotaExigeContaOuNuvem(destino)) {
    mostrarSnackbar({ mensagem: MSG_SEM_REDE, severidade: 'warning' })
    return false
  }

  if (!user?.uid) {
    if (estaSemRede()) {
      marcarModoLimitadoOffline()
      mostrarSnackbar({
        mensagem:
          'Sem conexão. Acesso limitado ao conteúdo no aparelho. Entre na conta quando houver internet.',
        severidade: 'warning',
      })
      navigate('/')
      return false
    }
    try {
      const target = destino
      // Não fazemos sentido voltar para `/chat` depois de logar dentro de
      // `/chat` — isso só causa "piscar" sem efeito.
      if (target && !target.startsWith('/chat')) {
        sessionStorage.setItem(
          PENDING_LOGIN_REDIRECT_KEY,
          JSON.stringify({ url: target, ts: Date.now() })
        )
      }
    } catch (_) {
      // sessionStorage indisponível (ex.: modo privado restrito): segue sem.
    }

    mostrarSnackbar({
      mensagem: mensagem || 'Entre na sua conta para usar este recurso.',
      severidade: 'info'
    })
    navigate('/chat')
    return false
  }
  return true
}

/**
 * Lê (e remove) a URL que o usuário pretendia abrir antes do login. Usada
 * pela tela de Chat para redirecionar de volta assim que o login for
 * concluído. Retorna `null` se não houver intenção pendente ou se a
 * intenção tiver expirado (`PENDING_LOGIN_REDIRECT_TTL_MS`).
 */
export function consumePendingLoginRedirect() {
  try {
    const raw = sessionStorage.getItem(PENDING_LOGIN_REDIRECT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PENDING_LOGIN_REDIRECT_KEY)
    const parsed = JSON.parse(raw)
    if (
      !parsed
      || typeof parsed.url !== 'string'
      || (typeof parsed.ts === 'number' && (Date.now() - parsed.ts) > PENDING_LOGIN_REDIRECT_TTL_MS)
    ) {
      return null
    }
    return parsed.url
  } catch (_) {
    return null
  }
}

/**
 * Guarda o pacote e abre o chat para o usuário escolher a conversa e tocar em "Enviar agora".
 */
export function pushPendingChatExport(navigate, { exportKind, exportPayload, previewText, suggestedPeerUid }) {
  sessionStorage.setItem(
    PENDING_CHAT_EXPORT_KEY,
    JSON.stringify({
      exportKind,
      exportPayload,
      previewText: String(previewText || ''),
      suggestedPeerUid: suggestedPeerUid ? String(suggestedPeerUid).trim() : ''
    })
  )
  navigate('/chat')
}

/**
 * Contas e-mail/senha exigem `emailVerified` antes de usar o app.
 * Login Google já vem verificado pelo provedor.
 */

/** Enquanto cadastro por link ou finalização roda, não propagar `user` ao app (evita perfil no RTDB). */
let registroEmailSenhaEmCurso = false

export function marcarRegistroEmailSenhaEmCurso(ativo) {
  registroEmailSenhaEmCurso = Boolean(ativo)
}

export function estaRegistroEmailSenhaEmCurso() {
  return registroEmailSenhaEmCurso
}

/** Espelha `auth.token.email_verified` nas regras do RTDB. */
export function contaTemEmailVerificadoNoToken(user) {
  return Boolean(user?.emailVerified)
}

export function loginFoiComGoogle(user) {
  if (!user?.providerData?.length) return false
  return user.providerData.some((p) => p?.providerId === 'google.com')
}

/** Conta criada só com e-mail/senha (sem Google vinculado). */
export function loginFoiComEmailSenha(user) {
  if (!user?.email) return false
  if (loginFoiComGoogle(user)) return false
  return user.providerData.some((p) => p?.providerId === 'password')
}

export function usuarioPrecisaVerificarEmail(user) {
  if (!user?.email || user.emailVerified) return false
  if (loginFoiComGoogle(user)) return false
  return true
}

export const MSG_CADASTRO_LINK_ENVIADO =
  'Enviamos um link para o seu e-mail. A conta só é criada quando você abrir esse link. Depois, use Entrar com o mesmo e-mail e senha.'

/** Contas antigas criadas com createUser antes da migração para link de cadastro. */
export const MSG_VERIFICACAO_CONTA_LEGADA =
  'Abra o link de confirmação no e-mail que enviamos (verifique também o spam). Depois toque em "Já confirmei".'

export const MSG_EMAIL_NAO_VERIFICADO =
  'Confirme seu e-mail antes de entrar. Abra o link que enviamos (verifique também o spam). Se não recebeu, use "Reenviar e-mail".'

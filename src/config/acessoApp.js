/**
 * Temporário: permite usar o app sem entrar com e-mail/Google.
 * Chat, sync na nuvem e admin continuam exigindo conta quando usados.
 * Voltar para `false` quando o login estiver estável.
 */
export const ACESSO_SEM_LOGIN_TEMPORARIO = true

export function loginObrigatorioParaNavegar() {
  return !ACESSO_SEM_LOGIN_TEMPORARIO
}

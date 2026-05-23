/**
 * appVersionGuard — força reset do PWA quando o bundle é atualizado.
 *
 * Problema clássico do Service Worker: depois de um deploy, parte dos clientes
 * continua executando o bundle antigo (porque o `sw.js` ou o `index.html` foram
 * servidos com cache HTTP, ou porque o usuário nunca recarregou). Resultado:
 * features novas não aparecem, prompts da IA não trocam, etc.
 *
 * Estratégia (resiliente, sem `kill switch` remoto):
 *   1. Cada `vite build` injeta `__APP_VERSION__` (timestamp em base 36).
 *   2. No boot, comparamos com `localStorage[STORAGE_KEY]`.
 *   3. Se **for a primeira visita** (sem versão guardada): salva e segue.
 *   4. Se **bateu**: nada a fazer.
 *   5. Se **diferiu** (versão antiga no storage): salva a nova, limpa todos os
 *      Cache Storage do browser, desregistra o SW e dá `location.reload(true)`
 *      uma única vez. Para evitar loops, escrevemos a nova versão **antes** do
 *      reload — então no próximo boot a comparação bate.
 *
 * Esta função é defensiva: qualquer erro (Storage cheio, SW indisponível, etc.)
 * cai num path seguro que apenas segue o boot normalmente.
 */

const STORAGE_KEY = 'salvation:app-version'
const RELOAD_FLAG = 'salvation:reload-once'

function lerVersaoAtual() {
  try {
    if (typeof __APP_VERSION__ !== 'undefined') return String(__APP_VERSION__)
  } catch {
    /* a flag pode não estar definida no dev */
  }
  return ''
}

async function limparTodosOsCaches() {
  if (typeof caches === 'undefined') return
  try {
    const nomes = await caches.keys()
    await Promise.all(nomes.map((n) => caches.delete(n).catch(() => false)))
  } catch {
    /* segue mesmo se falhar */
  }
}

async function desregistrarServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)))
  } catch {
    /* segue mesmo se falhar */
  }
}

/**
 * Executa o guard. Deve ser chamado o mais cedo possível no boot.
 * Retorna `true` se está disparando um reload (o caller deve abortar
 * inicializações pesadas) e `false` em caso normal.
 */
export async function executarAppVersionGuard() {
  if (typeof window === 'undefined') return false
  if (typeof localStorage === 'undefined') return false

  const versaoBundle = lerVersaoAtual()
  if (!versaoBundle) return false

  let versaoArmazenada = ''
  try {
    versaoArmazenada = localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return false
  }

  // Primeira visita ou mesma versão: só persiste e segue.
  if (!versaoArmazenada || versaoArmazenada === versaoBundle) {
    if (versaoArmazenada !== versaoBundle) {
      try {
        localStorage.setItem(STORAGE_KEY, versaoBundle)
      } catch {
        /* storage cheio: ignora */
      }
    }
    // Limpa flag de loop residual (sessão anterior).
    try {
      sessionStorage.removeItem(RELOAD_FLAG)
    } catch {
      /* ignore */
    }
    return false
  }

  // Anti-loop: se já tentamos recarregar nesta sessão para esta versão,
  // assume que o reload não está resolvendo e segue normalmente (evita
  // boot infinito em caso de falha no SW).
  let jaTentou = false
  try {
    jaTentou = sessionStorage.getItem(RELOAD_FLAG) === versaoBundle
  } catch {
    /* sessionStorage indisponível: segue */
  }
  if (jaTentou) {
    try {
      localStorage.setItem(STORAGE_KEY, versaoBundle)
    } catch {
      /* ignore */
    }
    return false
  }

  // Atualiza armazenamento **antes** do reload — assim o próximo boot
  // não cai aqui novamente.
  try {
    localStorage.setItem(STORAGE_KEY, versaoBundle)
    sessionStorage.setItem(RELOAD_FLAG, versaoBundle)
  } catch {
    /* ignore */
  }

  await Promise.all([limparTodosOsCaches(), desregistrarServiceWorker()])

  try {
    window.location.reload()
  } catch {
    /* ignore */
  }
  return true
}

/**
 * Limpa Cache Storage + desregistra Service Workers.
 * Útil após deploy quando um chunk antigo (lazy) já não existe no servidor.
 */
export async function forcarAtualizacaoAssetsPwa() {
  await Promise.all([limparTodosOsCaches(), desregistrarServiceWorker()])
}

/**
 * Carregamento sob demanda das famílias de leitura (`@fontsource/*`).
 *
 * Antes: `main.jsx` importava 10+ CSSs de fontes no caminho crítico — entrava no
 * bundle inicial e atrasava o primeiro paint, mesmo quando o usuário usa a
 * família "Padrão" (Roboto/system) e nunca abre o seletor.
 *
 * Agora: cada chave de `FONT_OPTIONS` (`fontFamily.js`) tem um carregador
 * `() => import(...)` próprio. Vite separa em chunks distintos, e só baixamos
 * o CSS (e portanto o WOFF2) quando o usuário realmente escolhe a fonte.
 *
 * A opção `system` mantém-se "fonte do sistema" e nunca dispara download — a
 * pilha CSS já tem Roboto/system-ui/-apple-system como fallback em
 * `resolveFontFamily(...)`.
 */

const carregadores = {
  serif: () => Promise.all([
    import('@fontsource/lora/400.css'),
    import('@fontsource/lora/700.css')
  ]),
  mono: () => import('@fontsource/roboto-mono/400.css'),
  alt: () => import('@fontsource/open-sans/400.css'),
  trebuchet: () => import('@fontsource/lato/400.css'),
  tahoma: () => import('@fontsource/montserrat/400.css'),
  comic: () => import('@fontsource/comic-neue/400.css'),
  cursive: () => import('@fontsource/dancing-script/400.css'),
  // Mantemos Roboto disponível para a opção "Padrão" porque o tema MUI usa
  // Source Sans no body, mas a pilha de leitura ainda lista Roboto antes do
  // system-ui. Só baixa quando a leitura realmente usa "system" no DOM — e
  // ainda assim como chunk separado, fora do bundle inicial.
  system: () => Promise.all([
    import('@fontsource/roboto/400.css'),
    import('@fontsource/roboto/700.css')
  ])
}

const carregadas = new Set()
const carregando = new Map()

/**
 * Garante que o CSS da família esteja carregado. Idempotente; chamadas
 * concorrentes recebem a mesma `Promise`.
 *
 * @param {string} familia chave de `FONT_OPTIONS` (ex.: 'serif', 'mono'). Para
 *  chaves desconhecidas (incluindo as nativas como 'arial'/'times') a função
 *  resolve imediatamente — essas dependem só de fontes do sistema.
 * @returns {Promise<void>}
 */
export function carregarFonteLeitura(familia) {
  const chave = String(familia || '').trim().toLowerCase()
  if (!chave) return Promise.resolve()
  if (carregadas.has(chave)) return Promise.resolve()
  if (!carregadores[chave]) {
    carregadas.add(chave)
    return Promise.resolve()
  }
  if (carregando.has(chave)) return carregando.get(chave)
  const p = carregadores[chave]()
    .then(() => {
      carregadas.add(chave)
      carregando.delete(chave)
    })
    .catch((err) => {
      carregando.delete(chave)
      console.warn('[fontLoader] falha ao carregar', chave, err)
    })
  carregando.set(chave, p)
  return p
}

/** Para testes / "qual já foi baixada". */
export function fontesCarregadas() {
  return [...carregadas]
}

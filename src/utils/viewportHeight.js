/**
 * Helpers para altura/altura mínima que respeitam a **viewport real** em
 * celulares.
 *
 * Por que existe este módulo
 * --------------------------
 * `100vh` no celular **inclui** a área coberta pela barra de endereço /
 * menu inferior do navegador. Resultado: containers que usam `height:
 * '100vh'` ficam maiores que a área realmente visível, escondendo o fim
 * da página — botões como "Marcar como lido" aparecem cortados pela
 * metade. A unidade `100dvh` (dynamic viewport height) mede só a parte
 * **realmente visível**, ajustando-se quando a chrome do navegador
 * aparece/recolhe.
 *
 * Como usar
 * ---------
 * ```jsx
 * import { sxFullViewportHeight } from '../utils/viewportHeight'
 *
 * <Box sx={{ ...sxFullViewportHeight(), display: 'flex' }} />
 * ```
 *
 * O `@supports` mantém compatibilidade com navegadores que ainda não
 * conhecem `dvh` (caem em `100vh` mesmo).
 */

/**
 * Aplica `height: 100vh` com fallback automático para `100dvh` quando
 * suportado. Recebe `maxHeight: true` para também limitar (útil em
 * páginas com `overflow: hidden` no container externo).
 *
 * @param {object} [opts]
 * @param {boolean} [opts.maxHeight=true]
 * @returns {object} sx parcial pronto para fundir com outros estilos.
 */
export function sxFullViewportHeight({ maxHeight = true } = {}) {
  return {
    height: '100vh',
    ...(maxHeight ? { maxHeight: '100vh' } : {}),
    '@supports (height: 100dvh)': {
      height: '100dvh',
      ...(maxHeight ? { maxHeight: '100dvh' } : {})
    }
  }
}

/**
 * Idem, porém para `minHeight` (usado em containers cujo conteúdo pode
 * empurrar a página além da viewport).
 *
 * @returns {object} sx parcial.
 */
export function sxMinViewportHeight() {
  return {
    minHeight: '100vh',
    '@supports (min-height: 100dvh)': {
      minHeight: '100dvh'
    }
  }
}

/**
 * Variante para containers que descontam altura de um cabeçalho/AppBar
 * conhecido (ex.: `calc(100vh - 64px)`).
 *
 * @param {string} offset Ex.: "64px", "110px".
 * @param {object} [opts]
 * @param {'min'|'normal'} [opts.kind='min']
 * @returns {object} sx parcial.
 */
export function sxViewportHeightMinusOffset(offset, { kind = 'min' } = {}) {
  const prop = kind === 'min' ? 'minHeight' : 'height'
  return {
    [prop]: `calc(100vh - ${offset})`,
    [`@supports (${prop}: calc(100dvh - ${offset}))`]: {
      [prop]: `calc(100dvh - ${offset})`
    }
  }
}

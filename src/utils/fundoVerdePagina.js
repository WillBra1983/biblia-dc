/** Fundo verde padrão do app (Discipulado, menu, plano de leitura). */
export const FUNDO_VERDE_PADRAO = '#004d40'

export const sxFundoVerdePagina = {
  bgcolor: FUNDO_VERDE_PADRAO,
  color: '#fff',
  minHeight: '100vh',
  '@supports (min-height: 100dvh)': { minHeight: '100dvh' },
  width: '100%',
  boxSizing: 'border-box',
  pt: 2,
  pb: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
}

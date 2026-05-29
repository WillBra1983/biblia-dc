import React from 'react'
import { Typography, Box } from '@mui/material'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { useVersiculoMarcado } from '../hooks/useVersiculoMarcado'

/**
 * Linha de um versículo na tela de leitura.
 *
 * Otimizações importantes:
 * - **`React.memo`**: o pai (Bíblia) tem muitos versículos numa página; sem
 *   memo, qualquer setState global re-renderiza todos. Os comparadores
 *   default do React bastam **se** as props forem estáveis.
 * - **Marcações via store único** (`useVersiculoMarcado`): substitui o
 *   `addEventListener` por versículo (centenas em Salmos 119) por um único
 *   listener global + cache do mapa de marcados.
 * - **`estaSelecionado` recebido como prop boolean** (calculado no pai com
 *   um `Set`) em vez de receber o array `versiculosSelecionados` inteiro —
 *   evita re-render de todos quando só um muda.
 * - **Handlers como callbacks estáveis** (`useCallback` no pai).
 */
const VersiculoMarcavel = React.forwardRef(function VersiculoMarcavel(
  {
    livroId,
    capitulo,
    versiculo,
    texto,
    numero,
    textoSemNumero,
    conteudoCustom,
    modoSelecao,
    modoInterlinearEscolha,
    onInterlinearVersiculoClick,
    estaSelecionado = false,
    onToggleSelecao,
    fontSize,
    fontFamily,
    textAlign,
    lineHeight: lineHeightStore,
    semEspacoEntreVersiculos,
    corApresentacao,
    negritoApresentacao,
    ...props
  },
  ref
) {
  const { marcado, corInfo } = useVersiculoMarcado(livroId, capitulo, versiculo)

  const handleClick = () => {
    if (modoInterlinearEscolha && typeof onInterlinearVersiculoClick === 'function') {
      onInterlinearVersiculoClick({ livroId, capitulo, versiculo })
      return
    }
    if (typeof onToggleSelecao === 'function') {
      onToggleSelecao({ livroId, capitulo, versiculo, texto })
    }
  }

  // Texto da Bíblia: toque em qualquer versículo alterna seleção (toggle).
  // No fluxo de Strong/interlinear, mantém o `modoInterlinearEscolha` como
  // único clique permitido. `modoSelecao` deixou de ser obrigatório porque a
  // seleção agora é dirigida pelo próprio toque.
  const clicavel = typeof onToggleSelecao === 'function' || modoInterlinearEscolha

  const bgColor = estaSelecionado
    ? 'rgba(25, 118, 210, 0.2)'
    : marcado && corInfo
      ? `${corInfo.cor}30`
      : 'transparent'

  const borderLeft = marcado && corInfo
    ? `4px solid ${corInfo.cor}`
    : '4px solid transparent'

  const resolvedFontFamily = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeightStore)
  const compacto = semEspacoEntreVersiculos === true

  return (
    <Typography
      ref={ref}
      {...props}
      onClick={handleClick}
      sx={{
        mb: compacto ? 0 : 1.5,
        lineHeight: lh,
        fontSize: `${fontSize}%`,
        fontFamily: resolvedFontFamily,
        color: corApresentacao || 'text.primary',
        '& + &': { mt: compacto ? 0 : 1 },
        textAlign: textAlign || 'left',
        fontWeight: corApresentacao ? (negritoApresentacao ? 700 : 600) : '600',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        cursor: clicavel ? 'pointer' : 'default',
        bgcolor: bgColor,
        borderLeft,
        pl: marcado ? 1.5 : 0.5,
        borderRadius: marcado ? '4px' : 0,
        WebkitFontSmoothing: 'antialiased',
        '@media (hover: hover)': clicavel
          ? {
              '&:hover': {
                bgcolor: estaSelecionado
                  ? 'rgba(25, 118, 210, 0.3)'
                  : modoInterlinearEscolha
                    ? 'rgba(255, 183, 77, 0.12)'
                    : 'rgba(0, 0, 0, 0.05)',
              },
            }
          : {},
        position: 'relative',
        ...props.sx
      }}
    >
      {marcado && corInfo && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            bgcolor: corInfo.cor,
            borderRadius: '4px 0 0 4px'
          }}
        />
      )}
      <b>{numero}</b>{conteudoCustom || textoSemNumero}
    </Typography>
  )
})

VersiculoMarcavel.displayName = 'VersiculoMarcavel'

export default React.memo(VersiculoMarcavel)

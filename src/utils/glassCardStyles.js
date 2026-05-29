/**
 * Estilos de glassmorphism com brilho e reflexo para cards
 * Efeito de vidro brilhante similar ao CalenMed
 */

/**
 * Gera estilos de card com efeito de vidro brilhante
 * @param {string} gradient - Gradiente de fundo do card
 * @param {object} options - Opções adicionais (hover, border, etc)
 * @returns {object} - Objeto de estilos para sx prop do MUI Card
 */
export function getGlassCardStyles(gradient, options = {}) {
  const {
    hover = true,
    border = false,
    shimmer = true,
    borderColor = 'rgba(255, 255, 255, 0.3)',
    borderRadius = 2,
    cursor = 'pointer',
    shimmerDelay = null, // Delay aleatório para o brilho (em segundos)
  } = options

  // Gera delay aleatório se não fornecido (entre 0 e 7 segundos)
  const randomDelay = shimmerDelay !== null 
    ? shimmerDelay 
    : (Math.random() * 7).toFixed(2)

  const baseStyles = {
    position: 'relative',
    overflow: 'hidden',
    cursor: cursor,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    background: gradient,
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: borderRadius,
    // Sombras múltiplas para efeito de vidro e profundidade
    boxShadow: `
      0 8px 32px 0 rgba(0, 0, 0, 0.37),
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      inset 0 -1px 0 rgba(255, 255, 255, 0.15),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset,
      0 2px 8px rgba(0, 0, 0, 0.2)
    `,
  }

  // Efeito de brilho animado (shimmer) com delay aleatório
  // A animação dura 7s: brilho passa em ~1s e fica pausado por ~6s
  if (shimmer) {
    baseStyles['&::before'] = {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
      animation: 'shimmer 7s infinite',
      animationDelay: `${randomDelay}s`,
      zIndex: 1,
      pointerEvents: 'none',
    }
  }

  // Efeito de reflexo brilhante estático
  baseStyles['&::after'] = {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: `
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 60%),
      radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)
    `,
    opacity: 0.7,
    zIndex: 0,
    pointerEvents: 'none',
    transition: 'opacity 0.4s ease',
  }

  // Efeito de hover com mais brilho e elevação
  if (hover) {
    // Em touch/mobile, `hover` pode "grudar" após o toque e causar overflow
    // visual (faixa branca/largura extra). Aplicamos transformação só em
    // ponteiro fino (mouse/trackpad) e desativamos transform em touch.
    baseStyles['@media (hover: hover) and (pointer: fine)'] = {
      '&:hover': {
        transform: 'translateY(-4px) scale(1.02)',
        boxShadow: `
          0 16px 64px 0 rgba(0, 0, 0, 0.5),
          inset 0 2px 0 rgba(255, 255, 255, 0.5),
          inset 0 -2px 0 rgba(255, 255, 255, 0.2),
          0 0 30px rgba(255, 255, 255, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.15) inset
        `,
        '&::after': {
          opacity: 1,
        },
        ...(shimmer && {
          '&::before': {
            animation: 'shimmer 7s infinite',
          },
        }),
      },
    }

    baseStyles['@media (hover: none), (pointer: coarse)'] = {
      '&:hover, &:active': {
        transform: 'none',
      },
    }
  }

  // Garante que o conteúdo fique acima dos efeitos de vidro
  baseStyles['& > *'] = {
    position: 'relative',
    zIndex: 2,
  }

  return baseStyles
}

/**
 * Estilos de animação shimmer para keyframes
 * Deve ser adicionado ao tema global ou no componente principal
 */
export const glassCardKeyframes = `
  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
`

/**
 * Estilos básicos de glassmorphism para conteúdo interno
 */
export const glassContentStyles = {
  position: 'relative',
  zIndex: 2,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
}

/**
 * Estilos para cards com gradiente de fundo transparente
 */
export function getGlassCardWithTransparency(baseColor, opacity = 0.8) {
  return {
    ...getGlassCardStyles(`linear-gradient(135deg, ${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, ${baseColor}${Math.round(opacity * 0.9 * 255).toString(16).padStart(2, '0')} 100%)`),
    background: `
      linear-gradient(135deg, ${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, ${baseColor}${Math.round(opacity * 0.9 * 255).toString(16).padStart(2, '0')} 100%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)
    `,
  }
}


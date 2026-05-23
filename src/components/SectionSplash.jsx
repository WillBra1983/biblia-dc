import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'

export default function SectionSplash({ 
  icon: Icon, 
  title, 
  subtitle, 
  gradient = 'linear-gradient(135deg, #004d40 0%, #00695c 100%)',
  onComplete 
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        if (onComplete) onComplete()
      }, 300)
    }, 1500) // Splash mais rápido para seções

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: visible ? 'splashFadeOut 0.3s ease 1.5s forwards' : 'none',
        '@keyframes splashFadeOut': {
          to: {
            opacity: 0,
            visibility: 'hidden',
          },
        },
      }}
    >
      <Box
        sx={{
          textAlign: 'center',
          color: 'white',
          animation: 'splashZoomIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          '@keyframes splashZoomIn': {
            from: {
              opacity: 0,
              transform: 'scale(0.7)',
            },
            to: {
              opacity: 1,
              transform: 'scale(1)',
            },
          },
        }}
      >
        <Box
          sx={{
            width: 100,
            height: 100,
            margin: '0 auto 20px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            animation: 'splashIconFloat 2s ease-in-out infinite',
            '@keyframes splashIconFloat': {
              '0%, 100%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(-8px)' },
            },
          }}
        >
          {Icon && <Icon sx={{ fontSize: 50, color: 'white' }} />}
        </Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.3)',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="h6"
            sx={{
              opacity: 0.95,
              fontWeight: 300,
              letterSpacing: 0.3,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  )
}


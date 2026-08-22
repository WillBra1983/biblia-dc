import { useEffect, useRef, useState } from 'react'
import { IconButton, Tooltip } from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import { useLocation } from 'react-router-dom'
import { pathnameParaCompartilhamento } from '../utils/shareUrl'
import { buildAppShareLink } from '../services/bibliaEstudosService'
import MenuOpcoesCompartilhar from './MenuOpcoesCompartilhar'

function getShareUrl(location) {
  const path = pathnameParaCompartilhamento(location.pathname)
  return buildAppShareLink(path, location.search || '')
}

export default function SharePageButton({ hidden = false }) {
  const location = useLocation()
  const btnRef = useRef(null)
  const [menuAnchor, setMenuAnchor] = useState(null)

  const url = getShareUrl(location)
  const title = typeof document !== 'undefined' ? document.title || 'Bíblia DC' : 'Bíblia DC'
  const text = 'Acesse este conteúdo no Bíblia DC.'

  const abrirMenu = async (anchor) => {
    try {
      const override = typeof window !== 'undefined' ? window.__bibliaSharePageOverride : null
      if (typeof override === 'function') {
        const tratou = await override()
        if (tratou !== false) return
      }
    } catch {
      // segue com menu padrão
    }

    if (/^\/estudo-strong\/[^/]+\/resumo$/.test(location.pathname)) {
      window.dispatchEvent(new Event('strong-resumo-share-request'))
      return
    }

    setMenuAnchor(anchor || btnRef.current)
  }

  useEffect(() => {
    const handler = (e) => {
      const anchor = e?.detail?.anchorEl ?? btnRef.current
      void abrirMenu(anchor)
    }
    window.addEventListener('salvation-compartilhar-pagina', handler)
    return () => window.removeEventListener('salvation-compartilhar-pagina', handler)
  }, [location.pathname, location.search])

  return (
    <>
      <Tooltip title={hidden ? '' : 'Compartilhar'} disableHoverListener={hidden}>
        <IconButton
          ref={btnRef}
          color="inherit"
          onClick={(e) => void abrirMenu(e.currentTarget)}
          aria-label="compartilhar página"
          tabIndex={hidden ? -1 : 0}
          sx={
            hidden
              ? {
                  position: 'fixed',
                  top: 56,
                  right: 16,
                  width: 1,
                  height: 1,
                  minWidth: 0,
                  p: 0,
                  opacity: 0,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: -1,
                }
              : undefined
          }
        >
          <ShareIcon />
        </IconButton>
      </Tooltip>
      <MenuOpcoesCompartilhar
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        title={title}
        text={text}
        url={url}
      />
    </>
  )
}

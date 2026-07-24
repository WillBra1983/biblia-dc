import { Box, Typography, Dialog, AppBar, Toolbar, IconButton, ButtonBase } from '@mui/material'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { obterCorLivro } from '../utils/coresBiblia'
import { useEffect, useRef } from 'react'
import { sxFullscreenFlexColumn, sxFullscreenScrollBody, sxSafeAreaTop } from '../utils/viewportHeight'

export default function LivrosCards({ livros, livroAtual, onSelectLivro, open, onClose }) {
  // Dividir livros em Antigo e Novo Testamento
  const antigoTestamento = livros.filter(l => l.id <= 39)
  const novoTestamento = livros.filter(l => l.id > 39)

  const scrollContainerRef = useRef(null)
  const livrosRefs = useRef({})

  const handleSelect = (livro) => {
    onSelectLivro(livro)
    // Não fecha o diálogo aqui - será fechado no componente pai para abrir o de capítulos
  }

  // Suporte ao botão de voltar do navegador/celular
  useEffect(() => {
    if (!open) return

    const currentState = window.history.state

    // Adiciona uma entrada ao histórico quando o dialog abre, apenas se não for do tipo livros
    if (!currentState?.dialogType || currentState.dialogType !== 'livros') {
      window.history.pushState({ dialogOpen: true, dialogType: 'livros' }, '')
    }

    // Sinaliza globalmente que há um diálogo da Bíblia aberto — o AppContext
    // usa essa flag para não exibir "Deseja realmente sair?" quando o
    // popstate é disparado para fechar este diálogo.
    window.__bibliaDialogOpen = (window.__bibliaDialogOpen || 0) + 1

    const handlePopState = () => {
      // Quando o usuário aperta voltar, fecha o dialog
      if (open) {
        onClose()
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.__bibliaDialogOpen = Math.max(0, (window.__bibliaDialogOpen || 1) - 1)
    }
  }, [open, onClose])

  // Faz scroll instantâneo até o livro atual quando o diálogo abre. Sem
  // animação ('auto'): a janela "abre direto" no livro escolhido, em vez de
  // mostrar a lista correndo desde Gênesis.
  useEffect(() => {
    if (!open || !livroAtual?.id) return

    let cancelado = false
    let tentativas = 0
    const maxTentativas = 6

    const fazerScroll = () => {
      if (cancelado) return
      tentativas += 1
      const container = scrollContainerRef.current
      const elemento = livrosRefs.current[livroAtual.id]

      if (!container || !elemento) {
        if (tentativas < maxTentativas) {
          requestAnimationFrame(fazerScroll)
        }
        return
      }

      try {
        const scrollTop = elemento.offsetTop
          - (container.offsetTop || 0)
          - (container.clientHeight / 2)
          + (elemento.offsetHeight / 2)
        container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'auto' })
      } catch (_) {
        elemento.scrollIntoView?.({ behavior: 'auto', block: 'center' })
      }
    }

    requestAnimationFrame(fazerScroll)
    return () => { cancelado = true }
  }, [open, livroAtual])

  // Helper para o estilo plano de cada livro. Reaproveitado em AT e NT.
  const sxLivroTile = (livro) => ({
    cursor: 'pointer',
    bgcolor: obterCorLivro(livro.id),
    color: '#fff',
    minHeight: 92,
    width: '100%',
    borderRadius: 1,
    border: livroAtual?.id === livro.id
      ? '2px solid rgba(255, 255, 255, 0.85)'
      : '1px solid',
    borderColor: livroAtual?.id === livro.id
      ? 'rgba(255, 255, 255, 0.95)'
      : 'rgba(255, 255, 255, 0.22)',
    boxShadow: 'none',
    transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    p: 1.5,
    gap: 0.5,
    '&:active': { opacity: 0.85 },
    '@media (hover: hover)': {
      '&:hover': {
        bgcolor: obterCorLivro(livro.id),
        borderColor: 'rgba(255, 255, 255, 0.95)',
        filter: 'brightness(1.06)',
      }
    }
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      transitionDuration={0}
      PaperProps={{
        sx: sxFullscreenFlexColumn({ bgcolor: 'background.default' }),
      }}
    >
      <AppBar position="static" elevation={1} sx={{ bgcolor: livroAtual ? obterCorLivro(livroAtual.id) : '#004d40', flexShrink: 0, ...sxSafeAreaTop() }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            sx={{ mr: 2 }}
            aria-label="voltar"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Selecione um Livro
        </Typography>
        </Toolbar>
      </AppBar>
      <Box 
        ref={scrollContainerRef}
        sx={{ 
          ...sxFullscreenScrollBody(),
          p: { xs: 2, sm: 3 },
          position: 'relative'
        }}
      >

        <Typography variant="h6" sx={{ mb: 2, mt: 3, color: 'text.secondary' }}>
          Antigo Testamento
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25, mb: 4 }}>
          {antigoTestamento.map((livro) => (
            <ButtonBase
              key={livro.id}
              ref={(el) => { if (el) livrosRefs.current[livro.id] = el }}
              onClick={() => handleSelect(livro)}
              sx={sxLivroTile(livro)}
            >
              <MenuBookIcon sx={{ fontSize: 28 }} />
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>
                {livro.nome}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.78, fontSize: '0.72rem', lineHeight: 1 }}>
                {livro.maxCapitulos} cap.
              </Typography>
            </ButtonBase>
          ))}
        </Box>

        <Typography variant="h6" sx={{ mb: 2, mt: 3, color: 'text.secondary' }}>
          Novo Testamento
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25 }}>
          {novoTestamento.map((livro) => (
            <ButtonBase
              key={livro.id}
              ref={(el) => { if (el) livrosRefs.current[livro.id] = el }}
              onClick={() => handleSelect(livro)}
              sx={sxLivroTile(livro)}
            >
              <MenuBookIcon sx={{ fontSize: 28 }} />
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>
                {livro.nome}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.78, fontSize: '0.72rem', lineHeight: 1 }}>
                {livro.maxCapitulos} cap.
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      </Box>
    </Dialog>
  )
}

import { Box, Card, CardContent, Typography, Grid, Dialog, AppBar, Toolbar, IconButton } from '@mui/material'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { obterCorLivro } from '../utils/coresBiblia'
import { useEffect, useRef } from 'react'

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

  // Helper para o estilo plano de cada card de livro. Reaproveitado em AT e NT.
  const sxCardLivro = (livro) => ({
    cursor: 'pointer',
    bgcolor: obterCorLivro(livro.id),
    color: '#fff',
    height: '100%',
    borderRadius: 2,
    border: livroAtual?.id === livro.id
      ? '2px solid rgba(255, 255, 255, 0.85)'
      : '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: 'none',
    transition: 'none',
    '&:active': { opacity: 0.85 }
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      transitionDuration={0}
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
        },
      }}
    >
      <AppBar position="static" elevation={1} sx={{ bgcolor: livroAtual ? obterCorLivro(livroAtual.id) : '#004d40' }}>
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
          p: 3, 
          overflow: 'auto', 
          height: 'calc(100% - 64px)',
          position: 'relative'
        }}
      >

        <Typography variant="h6" sx={{ mb: 2, mt: 3, color: 'text.secondary' }}>
          Antigo Testamento
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {antigoTestamento.map((livro) => (
            <Grid item xs={6} sm={4} md={3} key={livro.id}>
              <Card
                ref={(el) => { if (el) livrosRefs.current[livro.id] = el }}
                onClick={() => handleSelect(livro)}
                sx={sxCardLivro(livro)}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <MenuBookIcon sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {livro.nome}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                    {livro.maxCapitulos} cap.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h6" sx={{ mb: 2, mt: 3, color: 'text.secondary' }}>
          Novo Testamento
        </Typography>
        <Grid container spacing={2}>
          {novoTestamento.map((livro) => (
            <Grid item xs={6} sm={4} md={3} key={livro.id}>
              <Card
                ref={(el) => { if (el) livrosRefs.current[livro.id] = el }}
                onClick={() => handleSelect(livro)}
                sx={sxCardLivro(livro)}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <MenuBookIcon sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {livro.nome}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                    {livro.maxCapitulos} cap.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Dialog>
  )
}


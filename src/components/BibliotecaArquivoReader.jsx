import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import CompartilharTrechoLivroDialog from './CompartilharTrechoLivroDialog'
import { urlCapaLivro } from '../data/livrosCatalogo'

let pdfjsPromise

async function carregarPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })
  }
  return pdfjsPromise
}

function PdfReader({ url, storageKey }) {
  const canvasRef = useRef(null)
  const [documento, setDocumento] = useState(null)
  const [pagina, setPagina] = useState(() => Math.max(1, Number(localStorage.getItem(storageKey)) || 1))
  const [escala, setEscala] = useState(1.2)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    let tarefa
    setCarregando(true); setErro(''); setDocumento(null)
    void (async () => {
      const [pdfjs, resposta] = await Promise.all([carregarPdfJs(), fetch(url)])
      if (!resposta.ok) throw new Error('O arquivo não pôde ser aberto.')
      const bytes = new Uint8Array(await resposta.arrayBuffer())
      tarefa = pdfjs.getDocument({ data: bytes })
      const pdf = await tarefa.promise
      if (ativo) {
        setDocumento(pdf)
        setPagina((atual) => Math.min(pdf.numPages, atual))
      }
    })().catch((falha) => { if (ativo) setErro(falha?.message || 'Não foi possível abrir o PDF.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false; tarefa?.destroy?.() }
  }, [url])

  useEffect(() => {
    if (!documento || !canvasRef.current) return undefined
    let cancelado = false
    let renderizacao
    void documento.getPage(pagina).then((folha) => {
      if (cancelado || !canvasRef.current) return
      const viewportBase = folha.getViewport({ scale: 1 })
      const larguraDisponivel = Math.min(window.innerWidth - 24, 900)
      const escalaResponsiva = Math.min(escala, larguraDisponivel / viewportBase.width)
      const viewport = folha.getViewport({ scale: Math.max(0.5, escalaResponsiva) })
      const canvas = canvasRef.current
      const proporcao = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(viewport.width * proporcao)
      canvas.height = Math.floor(viewport.height * proporcao)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      const contexto = canvas.getContext('2d', { alpha: false })
      renderizacao = folha.render({ canvasContext: contexto, viewport, transform: proporcao === 1 ? null : [proporcao, 0, 0, proporcao, 0, 0] })
      return renderizacao.promise
    }).catch((falha) => {
      if (!cancelado && falha?.name !== 'RenderingCancelledException') setErro('Não foi possível mostrar esta página.')
    })
    localStorage.setItem(storageKey, String(pagina))
    return () => { cancelado = true; renderizacao?.cancel?.() }
  }, [documento, pagina, escala, storageKey])

  if (carregando) return <EstadoCarregando />
  if (erro) return <Alert severity="error">{erro}</Alert>
  return (
    <Stack spacing={1.5} alignItems="center">
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap">
        <Button variant="outlined" startIcon={<ArrowBackIosNewIcon />} disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
        <Typography minWidth={110} textAlign="center">{pagina} de {documento?.numPages || 0}</Typography>
        <Button variant="contained" endIcon={<ArrowForwardIosIcon />} disabled={pagina >= (documento?.numPages || 0)} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
        <Button onClick={() => setEscala((v) => Math.max(0.8, v - 0.15))}>A−</Button>
        <Button onClick={() => setEscala((v) => Math.min(2.2, v + 0.15))}>A+</Button>
      </Stack>
      <Box sx={{ width: '100%', overflow: 'auto', textAlign: 'center', bgcolor: '#777', py: 1.5, borderRadius: 1 }}>
        <canvas ref={canvasRef} style={{ display: 'inline-block', maxWidth: 'none', boxShadow: '0 5px 22px rgba(0,0,0,.32)' }} />
      </Box>
    </Stack>
  )
}

function EpubReader({ url, storageKey, onSelection }) {
  const areaRef = useRef(null)
  const livroRef = useRef(null)
  const renditionRef = useRef(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tamanho, setTamanho] = useState(105)
  const onSelectionRef = useRef(onSelection)

  useEffect(() => { onSelectionRef.current = onSelection }, [onSelection])

  useEffect(() => {
    let ativo = true
    setCarregando(true); setErro('')
    void (async () => {
      const [modulo, resposta] = await Promise.all([import('epubjs'), fetch(url)])
      if (!resposta.ok) throw new Error('O arquivo não pôde ser aberto.')
      const ePub = modulo.default || modulo
      const livro = ePub(await resposta.arrayBuffer())
      if (!ativo || !areaRef.current) { livro.destroy(); return }
      livroRef.current = livro
      const rendition = livro.renderTo(areaRef.current, { width: '100%', height: '72vh', spread: 'none', flow: 'paginated' })
      renditionRef.current = rendition
      rendition.themes.default({ body: { 'font-family': 'Georgia, serif', 'line-height': '1.7', padding: '0 4%' } })
      rendition.themes.fontSize('105%')
      rendition.on('relocated', (localizacao) => localStorage.setItem(storageKey, localizacao?.start?.cfi || ''))
      rendition.on('selected', (cfiRange, contents) => {
        const texto = contents?.range?.(cfiRange)?.toString?.() || contents?.window?.getSelection?.()?.toString?.() || ''
        const limpo = String(texto).replace(/\s+/g, ' ').trim()
        if (limpo) onSelectionRef.current?.(limpo)
      })
      await rendition.display(localStorage.getItem(storageKey) || undefined)
    })().catch((falha) => { if (ativo) setErro(falha?.message || 'Não foi possível abrir o EPUB.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => {
      ativo = false
      renditionRef.current?.destroy?.()
      livroRef.current?.destroy?.()
      renditionRef.current = null
      livroRef.current = null
    }
  }, [url, storageKey])

  useEffect(() => { renditionRef.current?.themes?.fontSize?.(`${tamanho}%`) }, [tamanho])

  return (
    <Stack spacing={1.5}>
      {erro && <Alert severity="error">{erro}</Alert>}
      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
        <Button variant="outlined" startIcon={<ArrowBackIosNewIcon />} onClick={() => renditionRef.current?.prev?.()}>Anterior</Button>
        <Button variant="contained" endIcon={<ArrowForwardIosIcon />} onClick={() => renditionRef.current?.next?.()}>Próxima</Button>
        <Button onClick={() => setTamanho((v) => Math.max(80, v - 10))}>A−</Button>
        <Button onClick={() => setTamanho((v) => Math.min(160, v + 10))}>A+</Button>
      </Stack>
      {carregando && <EstadoCarregando />}
      <Box ref={areaRef} sx={{ display: carregando ? 'none' : 'block', minHeight: '72vh', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.09)' }} />
    </Stack>
  )
}

function EstadoCarregando() {
  return <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /><Typography color="text.secondary" sx={{ mt: 2 }}>Abrindo o livro…</Typography></Box>
}

export default function BibliotecaArquivoReader({ arquivo, storageKey, livro }) {
  const [trecho, setTrecho] = useState('')
  const [compartilhando, setCompartilhando] = useState(false)
  if (!arquivo?.url) return <Alert severity="warning">O arquivo do livro não está disponível.</Alert>
  if (arquivo.formato === 'pdf') return <PdfReader url={arquivo.url} storageKey={storageKey} />

  const basePublica = String(import.meta.env?.VITE_PUBLIC_APP_URL || 'https://foundcine.com/biblia').replace(/\/$/, '')
  const urlLivro = `${basePublica}/biblioteca/${encodeURIComponent(livro?.id || '')}`
  const livroCompartilhamento = { ...livro, capaUrl: livro?.capa ? urlCapaLivro(livro.capa) : '' }

  return <>
    <EpubReader url={arquivo.url} storageKey={storageKey} onSelection={setTrecho} />
    <Paper elevation={4} sx={{ position: 'sticky', bottom: 12, zIndex: 5, maxWidth: 680, mx: 'auto', mt: 1.5, p: 1.2, borderRadius: 2 }}>
      {trecho ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <Typography variant="body2" sx={{ flex: 1 }} noWrap>“{trecho}”</Typography>
        <Button variant="contained" startIcon={<IosShareOutlinedIcon />} onClick={() => setCompartilhando(true)}>Compartilhar como imagem</Button>
      </Stack> : <Typography variant="body2" color="text.secondary" textAlign="center">Selecione um trecho do livro para compartilhá-lo como imagem.</Typography>}
    </Paper>
    <CompartilharTrechoLivroDialog open={compartilhando} onClose={() => setCompartilhando(false)} trecho={trecho} livro={livroCompartilhamento} urlLivro={urlLivro} />
  </>
}

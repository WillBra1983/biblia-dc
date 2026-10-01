import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { localizarReferenciasBiblicas } from '../utils/referenciasBiblicasEpub'
import BibliotecaReaderToolbar from './BibliotecaReaderToolbar'

let pdfjsPromise
function carregarPdfJs() {
  if (!pdfjsPromise) pdfjsPromise = Promise.all([
    import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })
  return pdfjsPromise
}

function PdfPage({ documento, numero, largura, zoom, aoReferencia, aoVisivel, aoToque, scrollRoot }) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const textoRef = useRef(null)
  const [perto, setPerto] = useState(false)
  const [altura, setAltura] = useState(largura * 1.42)
  const [links, setLinks] = useState([])
  const [erro, setErro] = useState('')
  const [semTexto, setSemTexto] = useState(false)
  useEffect(() => {
    const host = hostRef.current
    const observer = new IntersectionObserver(([entry]) => setPerto(entry.isIntersecting), { root: scrollRoot.current, rootMargin: '900px' })
    observer.observe(host)
    const visible = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) aoVisivel(numero)
    }, { root: scrollRoot.current, rootMargin: '-20% 0px -60% 0px', threshold: 0 })
    visible.observe(host)
    return () => { observer.disconnect(); visible.disconnect() }
  }, [numero, aoVisivel, scrollRoot])

  useEffect(() => {
    if (!perto || !largura) return
    let cancelado = false
    let render
    let camada
    setLinks([]); setErro('')
    void (async () => {
      const [folha, pdfjs] = await Promise.all([documento.getPage(numero), carregarPdfJs()])
      if (cancelado) return
      const base = folha.getViewport({ scale: 1 })
      const viewport = folha.getViewport({ scale: largura * zoom / base.width })
      setAltura(viewport.height)
      const canvas = canvasRef.current
      const container = textoRef.current
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(viewport.width * ratio)
      canvas.height = Math.floor(viewport.height * ratio)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      container.replaceChildren()
      container.style.setProperty('--scale-factor', viewport.scale)
      render = folha.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] })
      const content = await folha.getTextContent()
      if (cancelado) return
      camada = new pdfjs.TextLayer({ textContentSource: content, container, viewport })
      await Promise.all([render.promise, camada.render()])
      if (cancelado) return
      const partes = camada.textDivs.map((div, index) => ({ div, texto: camada.textContentItemsStr[index] || '' }))
      let texto = ''
      for (const parte of partes) { parte.inicio = texto.length; texto += parte.texto + ' ' }
      setSemTexto(!texto.trim())
      const origin = container.getBoundingClientRect()
      const areas = []
      for (const ref of localizarReferenciasBiblicas(texto)) {
        for (const parte of partes) {
          const inicio = Math.max(ref.inicio, parte.inicio) - parte.inicio
          const fim = Math.min(ref.fim, parte.inicio + parte.texto.length) - parte.inicio
          if (fim <= inicio || !parte.div.firstChild) continue
          const range = document.createRange()
          range.setStart(parte.div.firstChild, inicio)
          range.setEnd(parte.div.firstChild, fim)
          for (const rect of range.getClientRects()) areas.push({ referencia: ref.referencia, left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height })
        }
      }
      setLinks(areas)
    })().catch((e) => {
      if (!cancelado && e.name !== 'RenderingCancelledException' && e.name !== 'AbortException') setErro(`Não foi possível mostrar a página ${numero}.`)
    })
    return () => {
      cancelado = true; render?.cancel(); camada?.cancel()
      // Páginas distantes deixam de ocupar memória gráfica.
      if (canvasRef.current) { canvasRef.current.width = 0; canvasRef.current.height = 0 }
    }
  }, [documento, numero, largura, zoom, perto])

  return <Box ref={hostRef} data-pdf-page={numero} sx={{ position: 'relative', width: largura * zoom, minHeight: altura, bgcolor: 'white', mx: 'auto', boxShadow: 3 }} onClick={aoToque}>
    <canvas ref={canvasRef} style={{ display: 'block' }} />
    <Box ref={textoRef} aria-hidden="true" sx={{ position: 'absolute', inset: 0, overflow: 'hidden', lineHeight: 1, textSizeAdjust: 'none', pointerEvents: 'none', '& span, & br': { color: 'transparent', position: 'absolute', whiteSpace: 'pre', transformOrigin: '0% 0%', cursor: 'text' } }} />
    {links.map((link, index) => <Box component="button" key={index} aria-label={`Ler ${link.referencia}`} title={`Ler ${link.referencia}`} onClick={(event) => { event.stopPropagation(); aoReferencia(link.referencia) }} sx={{ position: 'absolute', left: link.left, top: link.top, width: link.width, height: Math.max(link.height, 12), border: 0, borderBottom: '1px solid #17633b', bgcolor: 'rgba(23,99,59,.10)', p: 0, cursor: 'pointer' }} />)}
    {erro && <Alert severity="error">{erro}</Alert>}
    {semTexto && <Typography variant="caption" sx={{ display: 'block', color: '#555', p: 1 }}>Página digitalizada: referências precisam de reconhecimento de texto (OCR).</Typography>}
  </Box>
}

export default function BibliotecaPdfReader({ url, storageKey, onBibleReference, onPageTap, immersive }) {
  const rootRef = useRef(null)
  const [documento, setDocumento] = useState(null)
  const [erro, setErro] = useState('')
  const [largura, setLargura] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pagina, setPagina] = useState(() => Math.max(1, Number(localStorage.getItem(storageKey)) || 1))
  const paginaRef = useRef(pagina)
  const onVisibleRef = useRef(null)
  if (!onVisibleRef.current) onVisibleRef.current = (numero) => {
    paginaRef.current = numero
    setPagina(numero)
  }
  useEffect(() => { if (documento) localStorage.setItem(storageKey, String(pagina)) }, [documento, pagina, storageKey])
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setLargura(Math.max(240, Math.min(entry.contentRect.width - 16, 1100))))
    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    let ativo = true
    let tarefa
    setDocumento(null); setErro('')
    const salva = Math.max(1, Number(localStorage.getItem(storageKey)) || 1)
    void (async () => {
      const [pdfjs, response] = await Promise.all([carregarPdfJs(), fetch(url)])
      if (!response.ok) throw new Error('O arquivo não pôde ser aberto.')
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (!ativo) return
      tarefa = pdfjs.getDocument({ data: bytes })
      const pdf = await tarefa.promise
      if (!ativo) return
      paginaRef.current = Math.min(salva, pdf.numPages)
      setPagina(paginaRef.current); setDocumento(pdf)
    })().catch((e) => { if (ativo) setErro(e.message || 'Não foi possível abrir o PDF.') })
    return () => { ativo = false; tarefa?.destroy() }
  }, [url, storageKey])
  useEffect(() => {
    if (!documento || !largura) return
    const frame = requestAnimationFrame(() => ir(paginaRef.current))
    return () => cancelAnimationFrame(frame)
  }, [documento, largura, immersive])
  const ir = (numero) => {
    const root = rootRef.current
    const page = root?.querySelector(`[data-pdf-page="${numero}"]`)
    if (page) root.scrollTo({ top: root.scrollTop + page.getBoundingClientRect().top - root.getBoundingClientRect().top })
  }
  return <Box sx={{ width: '100%' }}>
    {!immersive && <BibliotecaReaderToolbar onFullscreen={onPageTap} pageLabel={`${pagina} de ${documento?.numPages || '…'}`}>
      <Button onClick={() => ir(1)}>Início</Button>
      <Button disabled={pagina <= 1} onClick={() => ir(pagina - 1)}>Anterior</Button>
      <Button disabled={!documento || pagina >= documento.numPages} onClick={() => ir(pagina + 1)}>Próxima</Button>
      <Button onClick={() => setZoom((v) => Math.max(1, v - .2))}>A−</Button>
      <Button onClick={() => setZoom((v) => Math.min(2.5, v + .2))}>A+</Button>
    </BibliotecaReaderToolbar>}
    <Box ref={rootRef} sx={{ height: immersive ? '100dvh' : '72dvh', overflow: 'auto', overscrollBehavior: 'contain', borderRadius: immersive ? 0 : 1 }}>
    {erro ? <Alert severity="error">{erro}</Alert> : !documento ? <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box> : <Stack spacing={2} sx={{ bgcolor: '#777', py: 1, minWidth: largura * zoom }}>
      {Array.from({ length: documento.numPages }, (_, index) => <PdfPage key={index + 1} scrollRoot={rootRef} documento={documento} numero={index + 1} largura={largura} zoom={zoom} aoReferencia={onBibleReference} aoVisivel={onVisibleRef.current} aoToque={onPageTap} />)}
    </Stack>}
    </Box>
  </Box>
}

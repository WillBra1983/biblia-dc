import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { localizarReferenciasBiblicas } from '../utils/referenciasBiblicasEpub'
import { CachePaginasPdf, FilaRenderPdf, prioridadePaginaPdf } from '../utils/pdfLeituraRecursos'
import { normalizarSumarioLivro, paginaDestinoPdf } from '../utils/sumarioLivro'
import SumarioLivro from './SumarioLivro'

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

const PdfPage = memo(function PdfPage({ documento, numero, largura, zoom, aoReferencia, aoVisivel, scrollRoot, preserve, restore, recursos }) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const textoRef = useRef(null)
  const folhaRef = useRef(null)
  const [perto, setPerto] = useState(false)
  const [visivel, setVisivel] = useState(false)
  const visivelRef = useRef(false)
  const [previa, setPrevia] = useState('')
  const [bitmapLargura, setBitmapLargura] = useState(0)
  const [proporcao, setProporcao] = useState(1.42)
  const proporcaoRef = useRef(proporcao)
  proporcaoRef.current = proporcao
  const [pronto, setPronto] = useState(false)
  const [links, setLinks] = useState([])
  const [erro, setErro] = useState('')
  const [semTexto, setSemTexto] = useState(false)
  useLayoutEffect(() => { restore() }, [proporcao, restore])
  useEffect(() => {
    const host = hostRef.current
    const margem = Math.max(1600, (scrollRoot.current?.clientHeight || 600) * 4)
    const observer = new IntersectionObserver(([entry]) => setPerto(entry.isIntersecting), { root: scrollRoot.current, rootMargin: `${margem}px` })
    observer.observe(host)
    const visible = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) aoVisivel(numero)
    }, { root: scrollRoot.current, rootMargin: '-20% 0px -60% 0px', threshold: 0 })
    visible.observe(host)
    const naTela = new IntersectionObserver(([entry]) => {
      visivelRef.current = entry.isIntersecting
      setVisivel(entry.isIntersecting)
      recursos.fila.processar()
    }, { root: scrollRoot.current, rootMargin: '100px' })
    naTela.observe(host)
    return () => { observer.disconnect(); visible.disconnect(); naTela.disconnect() }
  }, [numero, aoVisivel, scrollRoot, recursos])

  useEffect(() => { setPrevia(''); setBitmapLargura(0) }, [documento])

  useEffect(() => {
    if (!perto || !largura) {
      setPronto(false)
      setLinks([])
      if (canvasRef.current) { canvasRef.current.width = 0; canvasRef.current.height = 0 }
      folhaRef.current?.cleanup()
      return
    }
    let cancelado = false
    let render
    setLinks([]); setErro('')
    const chave = `${numero}:${Math.round(largura)}`
    const mostrar = (resultado) => {
      if (cancelado || !resultado) return
      if (Math.abs(proporcaoRef.current - resultado.proporcao) > .001) {
        preserve(); setProporcao(resultado.proporcao)
      }
      const canvas = resultado.canvas
      const visivel = canvasRef.current
      visivel.width = canvas.width
      visivel.height = canvas.height
      visivel.getContext('2d', { alpha: false }).drawImage(canvas, 0, 0)
      setPrevia(resultado.previa)
      setBitmapLargura(largura)
      setPronto(true)
    }
    const salvo = recursos.cache.obter(chave)
    if (salvo) { mostrar(salvo); return () => { cancelado = true } }
    const tarefa = recursos.fila.agendar(async () => {
      if (cancelado) return null
      const folha = await documento.getPage(numero)
      folhaRef.current = folha
      if (cancelado) return
      const base = folha.getViewport({ scale: 1 })
      const viewport = folha.getViewport({ scale: largura / base.width })
      const novaProporcao = viewport.height / viewport.width
      if (Math.abs(proporcaoRef.current - novaProporcao) > .001) {
        preserve()
        setProporcao(novaProporcao)
      }
      // Nunca desenha nem cancela uma renderização sobre o canvas visível.
      const canvas = document.createElement('canvas')
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1800000 / (viewport.width * viewport.height)))
      canvas.width = Math.floor(viewport.width * ratio)
      canvas.height = Math.floor(viewport.height * ratio)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      render = folha.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] })
      await render.promise
      if (cancelado) return
      const miniatura = document.createElement('canvas')
      miniatura.width = 220
      miniatura.height = Math.max(1, Math.min(4096, Math.round(220 * novaProporcao)))
      miniatura.getContext('2d', { alpha: false }).drawImage(canvas, 0, 0, miniatura.width, miniatura.height)
      const resultado = { canvas, proporcao: novaProporcao, previa: miniatura.toDataURL('image/jpeg', .65) }
      recursos.cache.guardar(chave, resultado, canvas.width * canvas.height * 4)
      return resultado
    }, () => (visivelRef.current ? -100 : 0) + prioridadePaginaPdf(numero, recursos.pagina, recursos.direcao))
    void tarefa.promise.then(mostrar).catch((e) => {
      if (!cancelado && e.name !== 'RenderingCancelledException' && e.name !== 'AbortException') setErro(`Não foi possível mostrar a página ${numero}.`)
    })
    return () => { cancelado = true; tarefa.cancelar(); render?.cancel() }
  }, [documento, numero, largura, perto, preserve, recursos])

  // Os links só são preparados depois da imagem e apenas nas páginas na tela.
  useEffect(() => {
    if (!visivel || !pronto || bitmapLargura !== largura) { setLinks([]); return }
    let cancelado = false
    let camada
    const container = textoRef.current
    const timer = setTimeout(() => {
      void (async () => {
      const [folha, pdfjs] = await Promise.all([documento.getPage(numero), carregarPdfJs()])
      if (cancelado) return
      const base = folha.getViewport({ scale: 1 })
      const viewport = folha.getViewport({ scale: largura / base.width })
      const content = await folha.getTextContent()
      if (cancelado) return
      container.replaceChildren()
      container.style.setProperty('--scale-factor', viewport.scale)
      camada = new pdfjs.TextLayer({ textContentSource: content, container, viewport })
      await camada.render()
      await document.fonts?.ready
      if (cancelado) return
      const partes = camada.textDivs.map((div, index) => ({ div, texto: camada.textContentItemsStr[index] || '' }))
      let texto = ''
      for (const parte of partes) { parte.inicio = texto.length; texto += parte.texto + ' ' }
      setSemTexto(!texto.trim())
      const origin = container.getBoundingClientRect()
      const escalaX = origin.width / viewport.width || 1
      const escalaY = origin.height / viewport.height || 1
      const areas = []
      for (const ref of localizarReferenciasBiblicas(texto)) {
        for (const parte of partes) {
          const inicio = Math.max(ref.inicio, parte.inicio) - parte.inicio
          const fim = Math.min(ref.fim, parte.inicio + parte.texto.length) - parte.inicio
          if (fim <= inicio || !parte.div.firstChild) continue
          const range = document.createRange()
          range.setStart(parte.div.firstChild, inicio)
          range.setEnd(parte.div.firstChild, fim)
          for (const rect of range.getClientRects()) if (rect.width > 0 && rect.height > 0) areas.push({ referencia: ref.referencia, left: (rect.left - origin.left) / escalaX, top: (rect.top - origin.top) / escalaY, width: rect.width / escalaX, height: rect.height / escalaY })
        }
      }
      setLinks(areas)
      })().catch(() => { /* Uma falha nos links não impede a leitura da página. */ })
    }, 120)
    return () => {
      cancelado = true; clearTimeout(timer); camada?.cancel(); container.replaceChildren()
    }
  }, [documento, numero, largura, pronto, bitmapLargura, visivel])

  return <Box ref={hostRef} data-pdf-page={numero} sx={{ position: 'relative', width: largura * zoom, height: proporcao * largura * zoom, bgcolor: 'white', mx: 'auto', boxShadow: 3, overflow: 'hidden' }}>
    <Box sx={{ position: 'absolute', width: largura, height: proporcao * largura, transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
    {!pronto && previa && <img src={previa} alt={`Prévia da página ${numero}`} style={{ display: 'block', width: largura, height: proporcao * largura }} />}
    <canvas ref={canvasRef} style={{ display: pronto ? 'block' : 'none', width: largura, height: proporcao * largura }} />
    <Box ref={textoRef} aria-hidden="true" sx={{ position: 'absolute', inset: 0, overflow: 'clip', lineHeight: 1, textSizeAdjust: 'none', WebkitTextSizeAdjust: 'none', textAlign: 'initial', transformOrigin: '0 0', pointerEvents: 'none', '& span, & br': { color: 'transparent', position: 'absolute', whiteSpace: 'pre', transformOrigin: '0% 0%', cursor: 'text' }, '& span.markedContent': { top: 0, height: 0 } }} />
    {pronto && links.map((link, index) => <Box component="button" key={index} aria-label={`Ler ${link.referencia}`} title={`Ler ${link.referencia}`} onClick={(event) => { event.stopPropagation(); aoReferencia(link.referencia) }} onDoubleClick={(event) => event.stopPropagation()} sx={{ position: 'absolute', left: link.left, top: link.top, width: link.width, height: link.height, border: 0, borderBottom: '1px dotted #17633b', bgcolor: 'transparent', p: 0, cursor: 'pointer', '&:hover, &:focus-visible': { bgcolor: 'rgba(23,99,59,.15)', outline: '1px solid #17633b' } }} />)}
    </Box>
    {!pronto && !previa && !erro && <Typography sx={{ position: 'absolute', top: 24, left: 16, color: '#666', fontSize: 14 }}>Carregando página {numero}…</Typography>}
    {erro && <Alert severity="error">{erro}</Alert>}
    {semTexto && <Typography variant="caption" sx={{ display: 'block', color: '#555', p: 1 }}>Página digitalizada: referências precisam de reconhecimento de texto (OCR).</Typography>}
  </Box>
})

export default function BibliotecaPdfReader({ url, storageKey, onBibleReference, onPageTap, onEnd, immersive }) {
  const rootRef = useRef(null)
  const [documento, setDocumento] = useState(null)
  const recursos = useMemo(() => ({ cache: new CachePaginasPdf(), fila: new FilaRenderPdf(2), pagina: 1, direcao: 1 }), [documento])
  const recursosRef = useRef(recursos)
  recursosRef.current = recursos
  useEffect(() => () => recursos.cache.limpar(), [recursos])
  const [erro, setErro] = useState('')
  const [largura, setLargura] = useState(0)
  const larguraRef = useRef(0)
  const [zoom, setZoom] = useState(1)
  const [referenciaSelecionada, setReferenciaSelecionada] = useState('')
  const [escolherPagina, setEscolherPagina] = useState(false)
  const [sumario, setSumario] = useState([])
  const [carregandoSumario, setCarregandoSumario] = useState(false)
  const [navegandoSumario, setNavegandoSumario] = useState(false)
  const [erroSumario, setErroSumario] = useState('')
  const [paginaDigitada, setPaginaDigitada] = useState('')
  const anchorRef = useRef(null)
  const gestureRef = useRef(null)
  const lastTapRef = useRef(null)
  const suppressTapRef = useRef(0)
  const aoReferenciaRef = useRef((ref) => { if (Date.now() >= suppressTapRef.current) setReferenciaSelecionada(ref) })
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const getAnchorRef = useRef(null)
  getAnchorRef.current = (clientX, clientY) => {
    const root = rootRef.current
    if (!root) return null
    const rect = root.getBoundingClientRect()
    const x = clientX ?? rect.left + root.clientWidth / 2
    const y = clientY ?? rect.top + Math.min(root.clientHeight / 3, 160)
    const page = document.elementFromPoint(x, y)?.closest('[data-pdf-page]') || root.querySelector(`[data-pdf-page="${paginaRef.current}"]`)
    if (!page || !root.contains(page)) return null
    const bounds = page.getBoundingClientRect()
    return { numero: page.dataset.pdfPage, x: (x - bounds.left) / bounds.width, y: (y - bounds.top) / bounds.height, screenX: x - rect.left, screenY: y - rect.top }
  }
  const preserveRef = useRef(() => { anchorRef.current ||= getAnchorRef.current() })
  const restoreRef = useRef(() => {
    const anchor = anchorRef.current
    const root = rootRef.current
    const page = root?.querySelector(`[data-pdf-page="${anchor?.numero}"]`)
    if (!anchor || !page) return
    const rect = root.getBoundingClientRect()
    const bounds = page.getBoundingClientRect()
    root.scrollTo({ top: root.scrollTop + bounds.top - rect.top + bounds.height * anchor.y - anchor.screenY, left: root.scrollLeft + bounds.left - rect.left + bounds.width * anchor.x - anchor.screenX })
    anchorRef.current = null
  })
  useLayoutEffect(() => { restoreRef.current() }, [zoom, largura, immersive])
  const toggleRef = useRef(null)
  toggleRef.current = () => { preserveRef.current(); onPageTap() }
  const [pagina, setPagina] = useState(() => Math.max(1, Number(localStorage.getItem(storageKey)) || 1))
  const paginaRef = useRef(pagina)
  const onVisibleRef = useRef(null)
  if (!onVisibleRef.current) onVisibleRef.current = (numero) => {
    const recursos = recursosRef.current
    recursos.direcao = numero === paginaRef.current ? recursos.direcao : Math.sign(numero - paginaRef.current)
    recursos.pagina = numero
    paginaRef.current = numero
    setPagina(numero)
  }
  useEffect(() => { if (documento) localStorage.setItem(storageKey, String(pagina)) }, [documento, pagina, storageKey])
  useEffect(() => { if (documento && pagina === documento.numPages) onEnd?.() }, [documento, pagina, onEnd])
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const novaLargura = Math.max(240, Math.min(entry.contentRect.width - 16, 1100))
      if (Math.abs(novaLargura - larguraRef.current) < .5) return
      preserveRef.current()
      larguraRef.current = novaLargura
      setLargura(novaLargura)
    })
    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const root = rootRef.current
    const distance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
    const start = (event) => {
      if (event.touches.length === 2) {
        event.preventDefault()
        const x = (event.touches[0].clientX + event.touches[1].clientX) / 2
        const y = (event.touches[0].clientY + event.touches[1].clientY) / 2
        gestureRef.current = { pinch: true, distance: distance(event.touches), zoom: zoomRef.current, anchor: getAnchorRef.current(x, y) }
        lastTapRef.current = null
        suppressTapRef.current = Date.now() + 800
      } else if (event.touches.length === 1) {
        const touch = event.touches[0]
        gestureRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), target: event.target }
      }
    }
    const move = (event) => {
      const gesture = gestureRef.current
      if (!gesture?.pinch || event.touches.length !== 2) return
      event.preventDefault()
      anchorRef.current = gesture.anchor
      setZoom(Math.max(1, Math.min(4, gesture.zoom * distance(event.touches) / Math.max(gesture.distance, 1))))
      suppressTapRef.current = Date.now() + 800
    }
    const end = (event) => {
      const gesture = gestureRef.current
      if (!gesture || gesture.pinch) { if (!event.touches.length) gestureRef.current = null; return }
      gestureRef.current = null
      const touch = event.changedTouches[0]
      if (!touch || Date.now() < suppressTapRef.current || Date.now() - gesture.time > 300 || Math.hypot(touch.clientX - gesture.x, touch.clientY - gesture.y) > 12 || gesture.target.closest?.('button, input')) return
      const last = lastTapRef.current
      if (last && Date.now() - last.time < 320 && Math.hypot(last.x - touch.clientX, last.y - touch.clientY) < 30) {
        event.preventDefault()
        lastTapRef.current = null
        suppressTapRef.current = Date.now() + 500
        toggleRef.current()
      } else lastTapRef.current = { time: Date.now(), x: touch.clientX, y: touch.clientY }
    }
    const cancel = () => { gestureRef.current = null; lastTapRef.current = null }
    const wheel = (event) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      anchorRef.current = getAnchorRef.current(event.clientX, event.clientY)
      setZoom((current) => Math.max(1, Math.min(4, current * Math.exp(-event.deltaY * .005))))
    }
    root.addEventListener('touchstart', start, { passive: false })
    root.addEventListener('touchmove', move, { passive: false })
    root.addEventListener('touchend', end, { passive: false })
    root.addEventListener('touchcancel', cancel)
    root.addEventListener('wheel', wheel, { passive: false })
    return () => { root.removeEventListener('touchstart', start); root.removeEventListener('touchmove', move); root.removeEventListener('touchend', end); root.removeEventListener('touchcancel', cancel); root.removeEventListener('wheel', wheel) }
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
  const restauradoRef = useRef(null)
  useEffect(() => {
    let ativo = true
    setSumario([]); setErroSumario(''); setCarregandoSumario(Boolean(documento))
    if (!documento) return
    void documento.getOutline().then((itens) => {
      if (ativo) setSumario(normalizarSumarioLivro(itens, 'pdf'))
    }).catch(() => { if (ativo) setErroSumario('Não foi possível carregar o sumário deste PDF. A escolha por página continua disponível.') })
      .finally(() => { if (ativo) setCarregandoSumario(false) })
    return () => { ativo = false }
  }, [documento])
  useEffect(() => {
    if (!documento || !largura) return
    if (restauradoRef.current === documento) return
    const frame = requestAnimationFrame(() => { ir(paginaRef.current); restauradoRef.current = documento })
    return () => cancelAnimationFrame(frame)
  }, [documento, largura])
  const ir = (numero) => {
    const root = rootRef.current
    const page = root?.querySelector(`[data-pdf-page="${numero}"]`)
    if (page) root.scrollTo({ top: root.scrollTop + page.getBoundingClientRect().top - root.getBoundingClientRect().top })
  }
  return <Box sx={{ width: '100%', height: immersive ? '100dvh' : '80dvh', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'background.paper', flexShrink: 0 }}>
      <Button size="small" disabled={!documento} aria-label="Escolher página ou capítulo do PDF" onClick={() => { setPaginaDigitada(String(pagina)); setEscolherPagina(true) }}>{pagina} de {documento?.numPages || '…'}</Button>
    </Box>
    <Box ref={rootRef} onDoubleClick={(event) => { if (Date.now() < suppressTapRef.current || event.target.closest?.('button, input')) return; event.preventDefault(); toggleRef.current() }} sx={{ flex: 1, minHeight: 0, overflow: 'auto', touchAction: 'pan-x pan-y', overscrollBehavior: 'contain', borderRadius: immersive ? 0 : 1 }}>
    {erro ? <Alert severity="error">{erro}</Alert> : !documento ? <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box> : <Stack spacing={2} sx={{ bgcolor: '#777', py: 1, minWidth: largura * zoom }}>
      {Array.from({ length: documento.numPages }, (_, index) => <PdfPage key={index + 1} preserve={preserveRef.current} restore={restoreRef.current} scrollRoot={rootRef} documento={documento} numero={index + 1} largura={largura} zoom={zoom} recursos={recursos} aoReferencia={aoReferenciaRef.current} aoVisivel={onVisibleRef.current} />)}
    </Stack>}
    </Box>
    <Dialog open={escolherPagina} onClose={() => setEscolherPagina(false)} fullWidth maxWidth="sm">
      <DialogTitle>Escolher página ou capítulo</DialogTitle>
      <DialogContent><TextField label={`Página de 1 a ${documento?.numPages || 1}`} type="number" value={paginaDigitada} onChange={(event) => setPaginaDigitada(event.target.value)} inputProps={{ min: 1, max: documento?.numPages, inputMode: 'numeric' }} sx={{ mt: 1 }} />
        {erroSumario && <Alert severity="warning" sx={{ mt: 2 }}>{erroSumario}</Alert>}
        <SumarioLivro itens={sumario} carregando={carregandoSumario} navegando={navegandoSumario} onSelect={async (item) => {
          setNavegandoSumario(true); setErroSumario('')
          try { const numero = await paginaDestinoPdf(documento, item.destino); ir(numero); setEscolherPagina(false) }
          catch (falha) { setErroSumario(falha.message || 'Não foi possível abrir este capítulo.') }
          finally { setNavegandoSumario(false) }
        }} />
      </DialogContent>
      <DialogActions><Button onClick={() => setEscolherPagina(false)}>Cancelar</Button><Button disabled={!Number.isInteger(Number(paginaDigitada)) || Number(paginaDigitada) < 1 || Number(paginaDigitada) > (documento?.numPages || 0)} onClick={() => { ir(Number(paginaDigitada)); setEscolherPagina(false) }}>Ir à página</Button></DialogActions>
    </Dialog>
    <Dialog open={!!referenciaSelecionada} onClose={() => setReferenciaSelecionada('')}>
      <DialogTitle>{referenciaSelecionada}</DialogTitle>
      <DialogActions><Button onClick={() => setReferenciaSelecionada('')}>Cancelar</Button><Button onClick={() => { onBibleReference(referenciaSelecionada); setReferenciaSelecionada('') }}>Ler texto bíblico</Button></DialogActions>
    </Dialog>
  </Box>
}

import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import 'pdfjs-dist/web/pdf_viewer.css'
import { normalizarSumarioLivro, paginaDestinoPdf } from '../utils/sumarioLivro'
import { localizarReferenciasBiblicas } from '../utils/referenciasBiblicasEpub'
import SumarioLivro from './SumarioLivro'
import { origemZoomPdf, posicaoPdfValida } from '../utils/pdfViewerPosicao'

let runtime
function carregarVisualizador() {
  return runtime ||= Promise.all([
    import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(async ([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    globalThis.pdfjsLib = pdfjs
    // A distribuição do viewer utiliza globalThis.pdfjsLib inicializado pelo motor.
    const viewer = await import('pdfjs-dist/web/pdf_viewer.mjs')
    return { pdfjs, ...viewer }
  }).catch((erro) => { runtime = null; throw erro })
}

// Mesma implementação para arquivos locais, livros comprados e amostras.
// PDFViewer controla a geometria, a fila de desenho e o zoom das páginas.
export default function BibliotecaPdfViewer({ url, storageKey, onBibleReference, onPageTap, onEnd, onLimit, restricao, immersive }) {
  const containerRef = useRef(null)
  const paginasRef = useRef(null)
  const apiRef = useRef(null)
  const callbacks = useRef({})
  callbacks.current = { onBibleReference, onPageTap, onEnd, onLimit, restricao }
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('Preparando leitor PDF…')
  const [aberto, setAberto] = useState(false)
  const [digitada, setDigitada] = useState('1')
  const [sumario, setSumario] = useState([])
  const [navegando, setNavegando] = useState(false)
  const [erroDestino, setErroDestino] = useState('')

  useEffect(() => {
    let ativo = true, tarefa, pdf, viewer, bus, links, observer, resizeTimer, pinch, tap, suppress = 0
    let pronta = false, ajustando = false, localizacao = null, tamanho = null, escalaLargura = 1
    const container = containerRef.current
    setTotal(0); setErro(''); setSumario([]); setMensagem('Preparando leitor PDF…')
    const limite = () => Math.min(pdf?.numPages || 1, callbacks.current.restricao?.limite || Infinity)
    const posicionar = (local) => {
      if (!local) return
      viewer.scrollPageIntoView({ pageNumber: local.pageNumber, destArray: [null, { name: 'XYZ' }, local.left, local.top, null], allowNegativeOffset: true, ignoreDestinationZoom: true })
      // O alinhamento subpixel não deve deixar uma faixa da página anterior
      // visível e fazê-la assumir a posição atual após uma rotação.
      const page = viewer.getPageView(local.pageNumber - 1)?.div
      if (page) container.scrollTop = Math.max(container.scrollTop, page.offsetTop)
    }
    const ir = (numero) => {
      if (numero > limite()) { callbacks.current.onLimit?.(); return false }
      if (!Number.isInteger(numero) || numero < 1) return false
      viewer.scrollPageIntoView({ pageNumber: numero })
      viewer.update()
      return true
    }
    const referencias = ({ pageNumber, error }) => {
      if (!ativo || error || pageNumber > limite()) return
      const pageView = viewer.getPageView(pageNumber - 1)
      const page = pageView?.div
      const layer = page?.querySelector('.textLayer')
      if (!layer) return
      page.querySelector('.referenciasBiblicasPdf')?.remove()
      const spans = Array.from(layer.querySelectorAll('span')).filter((span) => span.firstChild?.nodeType === Node.TEXT_NODE && span.childNodes.length === 1)
      let texto = ''
      const partes = spans.map((div) => { const inicio = texto.length; texto += div.textContent + ' '; return { div, inicio } })
      const bounds = page.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const marcadores = document.createElement('div')
      marcadores.className = 'referenciasBiblicasPdf'
      for (const referencia of localizarReferenciasBiblicas(texto)) {
        for (const parte of partes) {
          const inicio = Math.max(referencia.inicio, parte.inicio) - parte.inicio
          const fim = Math.min(referencia.fim, parte.inicio + parte.div.textContent.length) - parte.inicio
          if (fim <= inicio) continue
          const range = document.createRange()
          range.setStart(parte.div.firstChild, inicio); range.setEnd(parte.div.firstChild, fim)
          for (const rect of range.getClientRects()) {
            if (!rect.width || !rect.height) continue
            const botao = document.createElement('button')
            botao.type = 'button'; botao.title = `Ler ${referencia.referencia}`; botao.setAttribute('aria-label', botao.title)
            Object.assign(botao.style, { left: `${100 * (rect.left - bounds.left) / bounds.width}%`, top: `${100 * (rect.top - bounds.top) / bounds.height}%`, width: `${100 * rect.width / bounds.width}%`, height: `${100 * rect.height / bounds.height}%` })
            botao.onclick = (event) => { event.stopPropagation(); if (Date.now() >= suppress) callbacks.current.onBibleReference?.(referencia.referencia) }
            botao.ondblclick = (event) => event.stopPropagation()
            marcadores.appendChild(botao)
          }
        }
      }
      page.appendChild(marcadores)
    }
    const distance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
    const origemZoom = (x, y) => origemZoomPdf(container, x, y)
    const start = (event) => {
      if (!pronta) return
      if (event.touches.length === 2) {
        event.preventDefault(); tap = null; suppress = Date.now() + 800
        pinch = { distance: distance(event.touches), scale: viewer.currentScale }
      } else if (event.touches.length === 1) tap = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: Date.now() }
    }
    const move = (event) => {
      if (!pinch || event.touches.length !== 2) return
      event.preventDefault(); suppress = Date.now() + 800
      const scale = pinch.scale * distance(event.touches) / Math.max(1, pinch.distance)
      viewer.updateScale({ scaleFactor: scale / viewer.currentScale, drawingDelay: 150, origin: origemZoom((event.touches[0].clientX + event.touches[1].clientX) / 2, (event.touches[0].clientY + event.touches[1].clientY) / 2) })
    }
    let ultimoTap = null
    const end = (event) => {
      if (pinch) { if (!event.touches.length) pinch = null; return }
      const touch = event.changedTouches[0], inicio = tap; tap = null
      if (!inicio || !touch || Date.now() < suppress || Date.now() - inicio.time > 300 || Math.hypot(touch.clientX - inicio.x, touch.clientY - inicio.y) > 12 || event.target.closest('button, a, input')) return
      if (ultimoTap && Date.now() - ultimoTap.time < 320 && Math.hypot(touch.clientX - ultimoTap.x, touch.clientY - ultimoTap.y) < 30) {
        event.preventDefault(); ultimoTap = null; suppress = Date.now() + 500; callbacks.current.onPageTap?.()
      } else ultimoTap = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    }
    const cancel = () => { pinch = tap = ultimoTap = null }
    const wheel = (event) => {
      if (!pronta || !event.ctrlKey) return
      event.preventDefault()
      viewer.updateScale({ scaleFactor: Math.exp(-event.deltaY * .005), drawingDelay: 150, origin: origemZoom(event.clientX, event.clientY) })
    }
    const double = (event) => {
      if (!pronta || Date.now() < suppress || event.target.closest('button, a, input')) return
      event.preventDefault(); callbacks.current.onPageTap?.()
    }
    const keyboard = (event) => {
      if (!pronta || !(event.ctrlKey || event.metaKey) || !['+', '=', '-', '0'].includes(event.key)) return
      event.preventDefault(); event.stopPropagation()
      if (event.key === '0') viewer.currentScaleValue = 'page-width'
      else viewer.updateScale({ steps: event.key === '-' ? -1 : 1, drawingDelay: 150 })
    }
    for (const [evento, handler] of [['touchstart', start], ['touchmove', move], ['touchend', end], ['touchcancel', cancel], ['wheel', wheel], ['dblclick', double], ['keydown', keyboard]]) container.addEventListener(evento, handler, { passive: false })
    void (async () => {
      const { pdfjs, PDFViewer, PDFLinkService, EventBus } = await carregarVisualizador()
      if (!ativo) return
      setMensagem('Abrindo arquivo PDF…')
      bus = new EventBus()
      links = new PDFLinkService({ eventBus: bus })
      viewer = new PDFViewer({ container, viewer: paginasRef.current, eventBus: bus, linkService: links, removePageBorders: true, maxCanvasPixels: 12000000, textLayerMode: 1, annotationMode: 1 })
      links.setViewer(viewer)
      bus.on('pagesinit', () => {
        if (!ativo) return
        viewer.currentScaleValue = 'page-width'
        escalaLargura = viewer.currentScale
        pronta = true
        tamanho = { width: container.clientWidth, height: container.clientHeight }
        let salva
        try { salva = JSON.parse(localStorage.getItem(`${storageKey}:posicao`) || 'null') } catch { /* registro antigo */ }
        const numero = Math.max(1, Math.min(limite(), Number(localStorage.getItem(storageKey)) || 1))
        if (posicaoPdfValida(salva, numero, limite())) posicionar(salva)
        else ir(numero)
        viewer.update()
      })
      bus.on('updateviewarea', ({ location }) => {
        if (!ativo || !pronta || ajustando || !tamanho || container.clientWidth !== tamanho.width || container.clientHeight !== tamanho.height) return
        if (location.pageNumber > limite()) { ir(limite()); callbacks.current.onLimit?.(); return }
        // O evento arredonda as coordenadas e pode incluir um fragmento da
        // página anterior. Use a página atual do viewer e coordenadas exatas.
        const pageNumber = viewer.currentPageNumber
        const pageView = viewer.getPageView(pageNumber - 1)
        const [left, top] = pageView.getPagePoint(container.scrollLeft - pageView.div.offsetLeft, container.scrollTop - pageView.div.offsetTop)
        localizacao = { pageNumber, left, top }
        setPagina(pageNumber)
        localStorage.setItem(storageKey, String(pageNumber))
        localStorage.setItem(`${storageKey}:posicao`, JSON.stringify(localizacao))
      })
      bus.on('pagechanging', ({ pageNumber }) => {
        if (!ativo || !pronta || ajustando) return
        if (pageNumber > limite()) { ir(limite()); callbacks.current.onLimit?.(); return }
        if (pageNumber === pdf?.numPages) callbacks.current.onEnd?.()
      })
      bus.on('textlayerrendered', referencias)
      bus.on('pagerendered', ({ error }) => { if (ativo && error) setErro('Não foi possível desenhar uma página do PDF.') })
      observer = new ResizeObserver(() => {
        if (!pronta || !tamanho || (container.clientWidth === tamanho.width && container.clientHeight === tamanho.height)) return
        ajustando = true
        const salva = localizacao && { ...localizacao }
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          if (!ativo || !container.clientWidth) return
          const fator = viewer.currentScale / escalaLargura
          viewer.currentScaleValue = 'page-width'
          escalaLargura = viewer.currentScale
          if (Math.abs(fator - 1) > .01) viewer.updateScale({ scaleFactor: fator })
          posicionar(salva)
          tamanho = { width: container.clientWidth, height: container.clientHeight }
          ajustando = false
          viewer.update()
        }, 120)
      })
      observer.observe(container)
      tarefa = pdfjs.getDocument({ url, isEvalSupported: false })
      pdf = await tarefa.promise
      if (!ativo) return
      setTotal(limite())
      apiRef.current = { viewer, pdf, ir }
      viewer.setDocument(pdf); links.setDocument(pdf)
      const outline = await pdf.getOutline().catch(() => [])
      if (ativo) setSumario(normalizarSumarioLivro(outline, 'pdf'))
    })().catch((falha) => { if (ativo) setErro(falha.message || 'Não foi possível abrir o PDF.') })
    return () => {
      ativo = false; pronta = false; apiRef.current = null
      clearTimeout(resizeTimer); observer?.disconnect()
      for (const [evento, handler] of [['touchstart', start], ['touchmove', move], ['touchend', end], ['touchcancel', cancel], ['wheel', wheel], ['dblclick', double], ['keydown', keyboard]]) container.removeEventListener(evento, handler)
      viewer?.setDocument(null); links?.setDocument(null); void tarefa?.destroy()
    }
  }, [url, storageKey])

  async function navegar(numero, destino) {
    const api = apiRef.current
    if (!api) return
    setNavegando(true); setErroDestino('')
    try {
      if (destino) numero = await paginaDestinoPdf(api.pdf, destino)
      if (!api.ir(Number(numero))) return
      setAberto(false)
    } catch (falha) { setErroDestino(falha.message || 'Não foi possível abrir esta página.') }
    finally { setNavegando(false) }
  }
  return <Box sx={{ height: immersive ? '100%' : '80dvh', minHeight: immersive ? 0 : 240, display: 'flex', flexDirection: 'column', width: '100%' }}>
    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, bgcolor: 'background.paper' }}>
      <Button disabled={!total || !!erro} aria-label="Diminuir PDF" title="Diminuir PDF" sx={{ minWidth: 44, minHeight: 44, fontSize: '1.5rem' }} onClick={() => apiRef.current?.viewer.updateScale({ steps: -1, drawingDelay: 150 })}>−</Button>
      <Button disabled={!total} aria-label="Escolher página ou capítulo do PDF" onClick={() => { setDigitada(String(pagina)); setAberto(true); setErroDestino('') }}>{pagina} de {total || '…'}</Button>
      <Button disabled={!total || !!erro} aria-label="Ampliar PDF" title="Ampliar PDF" sx={{ minWidth: 44, minHeight: 44, fontSize: '1.5rem' }} onClick={() => apiRef.current?.viewer.updateScale({ steps: 1, drawingDelay: 150 })}>+</Button>
    </Box>
    {erro && <Alert severity="error">{erro}</Alert>}
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, '& .referenciasBiblicasPdf': { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }, '& .referenciasBiblicasPdf button': { position: 'absolute', pointerEvents: 'auto', background: 'transparent', border: 0, borderBottom: '1px dotted #17633b', padding: 0, cursor: 'pointer' }, '& .referenciasBiblicasPdf button:focus-visible': { outline: '2px solid #17633b' } }}>
      <Box ref={containerRef} data-pdf-viewer="mozilla" tabIndex={0} aria-label="Leitor PDF. Use Ctrl mais ou menos para ampliar ou diminuir." sx={{ position: 'absolute', inset: 0, overflow: 'auto', overflowAnchor: 'none', touchAction: 'pan-x pan-y', overscrollBehavior: 'contain', bgcolor: '#777', ...(restricao?.limite && { [`& .page:nth-of-type(n+${restricao.limite + 1})`]: { display: 'none' } }) }}><div ref={paginasRef} className="pdfViewer" /></Box>
      {!total && !erro && <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, pointerEvents: 'none' }}><CircularProgress /><Typography sx={{ color: 'white' }}>{mensagem}</Typography></Box>}
    </Box>
    <Dialog open={aberto} onClose={() => setAberto(false)} fullWidth maxWidth="sm"><DialogTitle>Escolher página ou capítulo</DialogTitle><DialogContent>
      <TextField fullWidth label={`Página de 1 a ${restricao?.totalOriginal || total || 1}`} type="number" value={digitada} onChange={(event) => setDigitada(event.target.value)} inputProps={{ min: 1, max: restricao?.totalOriginal || total, inputMode: 'numeric' }} sx={{ mt: 1 }} helperText={restricao ? `Amostra gratuita: páginas 1 a ${restricao.limite}.` : ''} />
      {erroDestino && <Alert severity="warning" sx={{ mt: 2 }}>{erroDestino}</Alert>}
      <SumarioLivro itens={sumario} navegando={navegando} onSelect={(item) => navegar(null, item.destino)} />
    </DialogContent><DialogActions><Button onClick={() => setAberto(false)}>Cancelar</Button><Button disabled={navegando || !Number.isInteger(Number(digitada)) || Number(digitada) < 1 || Number(digitada) > (restricao?.totalOriginal || total)} onClick={() => navegar(Number(digitada))}>Ir à página</Button></DialogActions></Dialog>
  </Box>
}

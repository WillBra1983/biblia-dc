import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Paper, Stack, Typography, Select, MenuItem } from '@mui/material'
import IosShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import CompartilharTrechoLivroDialog from './CompartilharTrechoLivroDialog'
import CompartilharLivroButton from './CompartilharLivroButton'
import VersiculoPopup from './VersiculoPopup'
import BibliotecaPdfReader from './BibliotecaPdfViewer'
import BibliotecaReaderToolbar from './BibliotecaReaderToolbar'
import { useLeituraTelaCheia } from '../hooks/useLeituraTelaCheia'
import { urlCapaLivro } from '../data/livrosCatalogo'
import { linkCompartilhamentoLivro } from '../utils/livroShare'
import { carregarReferenciaBiblica, tornarReferenciasBiblicasClicaveis } from '../utils/referenciasBiblicasEpub'
import { textoSelecaoLivro } from '../utils/textoTrechoLivro'
import { posicaoAtualEpub } from '../utils/epubPosicaoResize'
import { atualizarPaginasEpub, cancelarLimpezaEpub } from '../utils/epubRolagemEstavel'
import { normalizarSumarioLivro } from '../utils/sumarioLivro'
import SumarioLivro from './SumarioLivro'
import { posicaoTrocaModoEpub, restaurarLinhaTopoEpub } from '../utils/epubTrocaModo'
import { navegarDestinoEpub } from '../utils/epubDestinoIndice'

let epubjsPromise


export async function carregarEpubJs() {
  if (!epubjsPromise) {
    epubjsPromise = Promise.all([
      import('epubjs'),
      import('epubjs/lib/managers/default/index.js'),
      import('epubjs/lib/managers/continuous/index.js'),
    ]).then(([epubModulo, managerModulo, continuousModulo]) => {
      const ePub = epubModulo.default || epubModulo
      const ManagerPadrao = managerModulo.default || managerModulo

      class ManagerSemUnload extends ManagerPadrao {
        resize(width, height, epubcfi) {
          return super.resize(width, height, posicaoAtualEpub(this, epubcfi))
        }
        addEventListeners() {
          // O React já chama destroy() ao fechar o leitor. Não registramos o
          // evento obsoleto `unload`, bloqueado pela Permissions Policy.
          const scroller = this.settings.fullsize ? window : this.container
          this._onScroll = this.onScroll.bind(this)
          scroller.addEventListener('scroll', this._onScroll)
        }
      }

      const ManagerContinuo = continuousModulo.default || continuousModulo
      class ManagerContinuoSemUnload extends ManagerContinuo {
        update(offset) {
          return atualizarPaginasEpub(this, offset)
        }
        onScroll() {
          cancelarLimpezaEpub(this)
          super.onScroll()
        }
        destroy() {
          cancelarLimpezaEpub(this)
          super.destroy()
        }
        resize(width, height, epubcfi) {
          return super.resize(width, height, posicaoAtualEpub(this, epubcfi))
        }
        addEventListeners() {
          // O modo vertical não usa snap nem o evento obsoleto unload.
          this.addScrollListeners()
        }
      }
      return { ePub, ManagerSemUnload, ManagerContinuoSemUnload }
    })
  }
  return epubjsPromise
}


function EpubReader({ url, storageKey, onSelection, onBibleReference, onPageTap, onEnd, onLimit, restricao, immersive, compacto = false }) {
  const fimRestritoRef = useRef(false)
  const areaRef = useRef(null)
  const livroRef = useRef(null)
  const renditionRef = useRef(null)
  const posicaoTrocaRef = useRef(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tamanho, setTamanho] = useState(105)
  const [modo, setModo] = useState(() => localStorage.getItem(`${storageKey}:modo`) === 'rolagem' ? 'rolagem' : 'paginas')
  const [capaUrl, setCapaUrl] = useState('')
  const [exibindoCapa, setExibindoCapa] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [escolherPagina, setEscolherPagina] = useState(false)
  const [sumario, setSumario] = useState([])
  const [carregandoSumario, setCarregandoSumario] = useState(true)
  const [navegandoSumario, setNavegandoSumario] = useState(false)
  const [erroSumario, setErroSumario] = useState('')
  const [paginaDigitada, setPaginaDigitada] = useState('')
  const [referenciaSelecionada, setReferenciaSelecionada] = useState('')
  const lastTapRef = useRef(null)
  const tamanhoRef = useRef(tamanho)
  tamanhoRef.current = tamanho
  const onSelectionRef = useRef(onSelection)
  const onBibleReferenceRef = useRef(onBibleReference)
  const onPageTapRef = useRef(onPageTap)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd
  const gestureRef = useRef(null)
  const ultimoGestoRef = useRef(0)
  const navigationRef = useRef({})
  onPageTapRef.current = onPageTap

  useEffect(() => { onSelectionRef.current = onSelection }, [onSelection])
  useEffect(() => { onBibleReferenceRef.current = onBibleReference }, [onBibleReference])

  useEffect(() => {
    let ativo = true
    let livroAtual
    let renditionAtual
    let restaurando = true
    // Capture antes de montar o novo leitor: eventos da montagem não podem
    // substituir o destino escolhido durante a troca de modo.
    const posicaoTroca = posicaoTrocaRef.current?.storageKey === storageKey ? posicaoTrocaRef.current.cfi : null
    const localizacaoSalva = posicaoTroca || localStorage.getItem(storageKey) || undefined
    posicaoTrocaRef.current = null
    setCarregando(true); setErro(''); setCapaUrl(''); setExibindoCapa(false); setTotal(0)
    setSumario([]); setCarregandoSumario(true); setErroSumario('')
    void (async () => {
      const [{ ePub, ManagerSemUnload, ManagerContinuoSemUnload }, resposta] = await Promise.all([carregarEpubJs(), fetch(url)])
      if (!resposta.ok) throw new Error('O arquivo não pôde ser aberto.')
      const livro = ePub(await resposta.arrayBuffer())
      if (!ativo || !areaRef.current) { livro.destroy(); return }
      livro.spine.hooks.serialize.register((conteudo, secao) => {
        // EPUBs produzidos por alguns editores carregam scripts auxiliares.
        // O leitor não precisa deles e os iframes são deliberadamente seguros;
        // removê-los antes da montagem evita avisos e preserva o conteúdo.
        secao.output = String(conteudo || '').replace(
          /<script\b[^>]*>[\s\S]*?<\/script\s*>|<script\b[^>]*\/\s*>/giu,
          '',
        )
      })
      livroRef.current = livro
      livroAtual = livro
      void livro.loaded.navigation.then((navigation) => {
        if (ativo) setSumario(normalizarSumarioLivro(navigation?.toc, 'epub'))
      }).catch(() => { if (ativo) setErroSumario('Não foi possível carregar o sumário deste EPUB.') })
        .finally(() => { if (ativo) setCarregandoSumario(false) })
      try {
        await livro.loaded.cover
        const urlDaCapa = await livro.coverUrl()
        if (ativo) setCapaUrl(urlDaCapa || '')
      } catch {
        if (ativo) setCapaUrl('')
      }
      if (!ativo || !areaRef.current) return
      const rendition = livro.renderTo(areaRef.current, {
        width: '100%',
        height: areaRef.current.clientHeight || '72vh',
        spread: 'none',
        ignoreClass: 'leitor-ancora-topo',
        flow: modo === 'rolagem' ? 'scrolled-doc' : 'paginated',
        manager: modo === 'rolagem' ? ManagerContinuoSemUnload : ManagerSemUnload,
      })
      renditionRef.current = rendition
      renditionAtual = rendition
      rendition.hooks.content.register((contents) => {
        tornarReferenciasBiblicasClicaveis(contents?.document, (referencia) => {
          if (compacto) setReferenciaSelecionada(referencia)
          else onBibleReferenceRef.current?.(referencia)
        })
        const doc = contents?.document
        if (!doc) return
        const distance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
        doc.addEventListener('touchstart', (event) => {
          if (compacto && event.touches.length === 2) {
            event.preventDefault()
            gestureRef.current = { pinch: true, distance: distance(event.touches), tamanho: tamanhoRef.current, novo: tamanhoRef.current }
            lastTapRef.current = null
            ultimoGestoRef.current = Date.now()
            return
          }
          if (event.touches.length !== 1) { gestureRef.current = null; return }
          const touch = event.touches[0]
          gestureRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), target: event.target }
        }, { passive: false })
        doc.addEventListener('touchmove', (event) => {
          const gesto = gestureRef.current
          if (!compacto || !gesto?.pinch || event.touches.length !== 2) return
          event.preventDefault()
          gesto.novo = Math.round(Math.max(70, Math.min(220, gesto.tamanho * distance(event.touches) / Math.max(1, gesto.distance))))
          ultimoGestoRef.current = Date.now()
        }, { passive: false })
        doc.addEventListener('touchend', (event) => {
          const start = gestureRef.current
          if (start?.pinch) {
            event.preventDefault()
            setTamanho(start.novo)
            ultimoGestoRef.current = Date.now()
            if (!event.touches.length) gestureRef.current = null
            return
          }
          gestureRef.current = null
          const touch = event.changedTouches[0]
          if (!start || !touch || event.touches.length || Date.now() - start.time > 800) return
          const dx = touch.clientX - start.x
          const dy = touch.clientY - start.y
          if (modo === 'paginas' && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5 && !doc.defaultView?.getSelection()?.toString()) {
            ultimoGestoRef.current = Date.now()
            if (dx < 0) navigationRef.current.next?.()
            else navigationRef.current.prev?.()
          } else if (compacto && Math.hypot(dx, dy) < 12 && Date.now() - start.time < 300 && !start.target?.closest?.('a, button, input') && !doc.defaultView?.getSelection()?.toString()) {
            const last = lastTapRef.current
            if (last && Date.now() - last.time < 320 && Math.hypot(last.x - touch.clientX, last.y - touch.clientY) < 30) {
              event.preventDefault()
              ultimoGestoRef.current = Date.now()
              lastTapRef.current = null
              onPageTapRef.current?.()
            } else lastTapRef.current = { time: Date.now(), x: touch.clientX, y: touch.clientY }
          }
        }, { passive: false })
        doc.addEventListener('touchcancel', () => { gestureRef.current = null }, { passive: true })
        doc.addEventListener('click', (event) => {
          if (compacto) return
          if (Date.now() - ultimoGestoRef.current < 500) return
          if (event.target?.closest?.('a, button, input, [data-biblia-referencia]') || doc.defaultView?.getSelection()?.toString()) return
          onPageTapRef.current?.()
        })
        doc.addEventListener('dblclick', (event) => {
          if (!compacto || Date.now() - ultimoGestoRef.current < 500 || event.target?.closest?.('a, button, input')) return
          event.preventDefault()
          onPageTapRef.current?.()
        })
      })
      rendition.themes.default({ body: { 'font-family': 'Georgia, serif', 'line-height': '1.7', padding: '0 4%' } })
      rendition.themes.fontSize(`${tamanhoRef.current}%`)
      rendition.on('relocated', (localizacao) => {
        if (!ativo) return
        fimRestritoRef.current = Boolean(localizacao?.atEnd)
        if (localizacao?.atEnd) onEndRef.current?.()
        if (!restaurando && localizacao?.start?.cfi) localStorage.setItem(storageKey, localizacao.start.cfi)
        const index = livro.locations.locationFromCfi(localizacao?.start?.cfi)
        if (ativo && index >= 0) setPagina(index + 1)
      })
      rendition.on('selected', (cfiRange, contents) => {
        const range = contents?.range?.(cfiRange)
        const texto = range?.toString?.() || contents?.window?.getSelection?.()?.toString?.() || ''
        const limpo = textoSelecaoLivro(range, texto)
        if (limpo) onSelectionRef.current?.(limpo)
      })
      try {
        await rendition.display(localizacaoSalva)
      } catch (falha) {
        if (!ativo) return
        if (!localizacaoSalva) throw falha
        localStorage.removeItem(storageKey)
        await rendition.display(livro.spine?.first?.()?.href || undefined)
      }
      if (!ativo) return
      // Uma falha no alinhamento fino não deve apagar a posição e reiniciar o livro.
      if (posicaoTroca) {
        try { await restaurarLinhaTopoEpub(rendition, posicaoTroca, modo) }
        catch { /* O display anterior mantém o destino original como alternativa. */ }
      }
      if (!ativo) return
      restaurando = false
      if (compacto) void livro.locations.generate(1500).then(() => {
        if (!ativo) return
        setTotal(livro.locations.length())
        const index = livro.locations.locationFromCfi(rendition.currentLocation()?.start?.cfi)
        if (index >= 0) setPagina(index + 1)
      }).catch(() => { /* Leitura permanece disponível mesmo sem índice. */ })
    })().catch((falha) => { if (ativo) setErro(falha?.message || 'Não foi possível abrir o EPUB.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => {
      ativo = false
      renditionAtual?.destroy?.()
      livroAtual?.destroy?.()
      if (renditionRef.current === renditionAtual) renditionRef.current = null
      if (livroRef.current === livroAtual) livroRef.current = null
    }
  }, [url, storageKey, compacto, modo])

  useEffect(() => {
    const rendition = renditionRef.current
    const cfi = rendition?.currentLocation?.()?.start?.cfi
    rendition?.themes?.fontSize?.(`${tamanho}%`)
    const frame = requestAnimationFrame(() => { if (cfi) void rendition?.display?.(cfi) })
    return () => cancelAnimationFrame(frame)
  }, [tamanho])

  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    let frame
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (entry.contentRect.width > 0) renditionRef.current?.resize?.(entry.contentRect.width, entry.contentRect.height)
      })
    })
    observer.observe(area)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [])

  const abrirCapa = () => {
    if (capaUrl) {
      setExibindoCapa(true)
      return
    }
    const primeiraPagina = livroRef.current?.spine?.first?.()?.href
    void renditionRef.current?.display?.(primeiraPagina || undefined)
  }

  const paginaAnterior = () => {
    if (exibindoCapa) return
    void renditionRef.current?.prev?.()
  }

  const proximaPagina = () => {
    if (restricao && fimRestritoRef.current && !exibindoCapa) { onLimit?.(); return }
    if (exibindoCapa) {
      setExibindoCapa(false)
      const primeiraPagina = livroRef.current?.spine?.first?.()?.href
      void renditionRef.current?.display?.(primeiraPagina || undefined)
      return
    }
    void renditionRef.current?.next?.()
  }
  navigationRef.current = { prev: paginaAnterior, next: proximaPagina }

  return (
    <Stack spacing={compacto ? 0 : 1.5}>
      {erro && <Alert severity="error">{erro}</Alert>}
      {compacto && <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ height: 40, flexShrink: 0 }}>
        <Button size="small" disabled={carregando} aria-label="Escolher posição ou capítulo do EPUB" title="Escolha uma posição de leitura ou um capítulo do sumário." onClick={() => { setPaginaDigitada(String(pagina)); setEscolherPagina(true) }}>{pagina} de {total || '…'}</Button>
        <Select size="small" value={modo} disabled={carregando} inputProps={{ 'aria-label': 'Modo de leitura do EPUB' }} onChange={(event) => {
          const cfi = posicaoTrocaModoEpub(renditionRef.current, localStorage.getItem(storageKey))
          posicaoTrocaRef.current = { storageKey, cfi }
          if (cfi) localStorage.setItem(storageKey, cfi)
          localStorage.setItem(`${storageKey}:modo`, event.target.value)
          setModo(event.target.value)
        }} sx={{ height: 32, fontSize: '.8rem' }}><MenuItem value="paginas">Páginas</MenuItem><MenuItem value="rolagem">Rolagem vertical</MenuItem></Select>
      </Stack>}
      {!compacto && !immersive && <BibliotecaReaderToolbar onFullscreen={onPageTap}>
        <Button onClick={abrirCapa}>Início</Button>
        <Button variant="outlined" onClick={paginaAnterior}>Anterior</Button>
        <Button variant="contained" onClick={proximaPagina}>Próxima</Button>
        <Button onClick={() => setTamanho((v) => Math.max(80, v - 10))}>A−</Button>
        <Button onClick={() => setTamanho((v) => Math.min(160, v + 10))}>A+</Button>
      </BibliotecaReaderToolbar>}
      {exibindoCapa && capaUrl && <Box onDoubleClick={(event) => { if (Date.now() - ultimoGestoRef.current < 500) return; event.preventDefault(); onPageTap?.() }} onTouchStart={(event) => { const touch = event.touches[0]; gestureRef.current = { x: touch.clientX, y: touch.clientY } }} onTouchEnd={(event) => {
        const start = gestureRef.current; gestureRef.current = null; const touch = event.changedTouches[0]
        if (!start || !touch) return
        if (start.x - touch.clientX > 55 && Math.abs(touch.clientY - start.y) < 60) { proximaPagina(); return }
        if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 12) return
        const last = lastTapRef.current
        if (last && Date.now() - last.time < 350 && Math.hypot(last.x - touch.clientX, last.y - touch.clientY) < 30) { event.preventDefault(); lastTapRef.current = null; ultimoGestoRef.current = Date.now(); onPageTap?.() }
        else lastTapRef.current = { time: Date.now(), x: touch.clientX, y: touch.clientY }
      }} sx={{ touchAction: 'manipulation', height: immersive ? '100dvh' : '72dvh', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.09)', display: 'grid', placeItems: 'center', p: { xs: 1.5, sm: 3 } }}>
        <Box component="img" src={capaUrl} alt="Capa do livro" sx={{ display: 'block', maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 0.75, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }} />
      </Box>}
      <Box sx={{ position: 'relative', display: exibindoCapa ? 'none' : 'block' }}>
        <Box ref={areaRef} sx={{ visibility: carregando ? 'hidden' : 'visible', height: immersive ? (compacto ? 'calc(100dvh - 40px)' : '100dvh') : '72svh', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.09)' }} />
        {carregando && <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><EstadoCarregando /></Box>}
      </Box>
      <Dialog open={escolherPagina} onClose={() => setEscolherPagina(false)} fullWidth maxWidth="sm">
        <DialogTitle>Escolher posição ou capítulo</DialogTitle>
        <DialogContent><Typography variant="body2" sx={{ mb: 2 }}>No EPUB, as posições são fixas, mas a quantidade de telas muda conforme o tamanho da letra.</Typography><TextField fullWidth disabled={!total} label="Posição de leitura" helperText={total ? `Escolha uma posição de 1 a ${total}.` : 'Preparando as posições de leitura…'} type="number" value={paginaDigitada} onChange={(event) => setPaginaDigitada(event.target.value)} inputProps={{ min: 1, max: total, inputMode: 'numeric' }} />
          {erroSumario && <Alert severity="warning" sx={{ mt: 2 }}>{erroSumario}</Alert>}
          <SumarioLivro itens={sumario} carregando={carregandoSumario} navegando={navegandoSumario} onSelect={async (item) => {
            setNavegandoSumario(true); setErroSumario('')
            try { setExibindoCapa(false); await navegarDestinoEpub(renditionRef.current, item.destino, modo); setEscolherPagina(false) }
            catch { setErroSumario('Não foi possível abrir este capítulo. Use a posição de leitura.') }
            finally { setNavegandoSumario(false) }
          }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setEscolherPagina(false)}>Cancelar</Button><Button disabled={!Number.isInteger(Number(paginaDigitada)) || Number(paginaDigitada) < 1 || Number(paginaDigitada) > total} onClick={() => { const cfi = livroRef.current?.locations.cfiFromLocation(Number(paginaDigitada) - 1); if (cfi) { setExibindoCapa(false); void renditionRef.current?.display(cfi) }; setEscolherPagina(false) }}>Ir</Button></DialogActions>
      </Dialog>
      <Dialog open={!!referenciaSelecionada} onClose={() => setReferenciaSelecionada('')}>
        <DialogTitle>{referenciaSelecionada}</DialogTitle><DialogActions><Button onClick={() => setReferenciaSelecionada('')}>Cancelar</Button><Button onClick={() => { onBibleReferenceRef.current?.(referenciaSelecionada); setReferenciaSelecionada('') }}>Ler texto bíblico</Button></DialogActions>
      </Dialog>
    </Stack>
  )
}

function EstadoCarregando() {
  return <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /><Typography color="text.secondary" sx={{ mt: 2 }}>Abrindo o livro…</Typography></Box>
}

export default function BibliotecaArquivoReader({ arquivo, storageKey, livro, permitirCompartilhamento = true, onEnd, onLimit }) {
  const [trecho, setTrecho] = useState('')
  const [compartilhando, setCompartilhando] = useState(false)
  const [versiculos, setVersiculos] = useState(null)
  const [erroReferencia, setErroReferencia] = useState('')
  const { telaCheia: immersive, entrarTelaCheia, sairTelaCheia } = useLeituraTelaCheia()
  const readerRef = useRef(null)
  const wasImmersiveRef = useRef(false)
  useEffect(() => {
    const saiu = wasImmersiveRef.current && !immersive
    wasImmersiveRef.current = immersive
    if (!saiu) return
    const frame = requestAnimationFrame(() => readerRef.current?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [immersive])
  useEffect(() => {
    if (!immersive) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const exit = (event) => { if (event.type === 'androidBack' || event.key === 'Escape') sairTelaCheia() }
    window.addEventListener('keydown', exit)
    window.addEventListener('androidBack', exit)
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener('keydown', exit); window.removeEventListener('androidBack', exit) }
  }, [immersive, sairTelaCheia])
  const toggleReading = () => immersive ? sairTelaCheia() : entrarTelaCheia()

  const abrirReferenciaBiblica = async (referencia) => {
    setErroReferencia('')
    try {
      const encontrados = await carregarReferenciaBiblica(referencia)
      if (!encontrados.length) throw new Error('Referência não encontrada')
      setVersiculos(encontrados)
    } catch (falha) {
      console.error('Não foi possível abrir a referência bíblica:', falha)
      setErroReferencia(`Não foi possível abrir ${referencia}.`)
    }
  }

  if (!arquivo?.url) return <Alert severity="warning">O arquivo do livro não está disponível.</Alert>

  const urlLivro = linkCompartilhamentoLivro(livro?.id)
  const livroCompartilhamento = { ...livro, capaUrl: livro?.capa ? urlCapaLivro(livro.capa) : '' }

  return <>
    {erroReferencia && <Alert severity="warning" onClose={() => setErroReferencia('')} sx={{ mb: 1 }}>{erroReferencia}</Alert>}
    <Box ref={readerRef} sx={immersive ? { position: 'fixed', inset: 0, zIndex: 1300, bgcolor: 'background.paper', overflow: 'auto', overscrollBehavior: 'contain', pt: 'env(safe-area-inset-top)', pb: 'env(safe-area-inset-bottom)' } : { scrollMarginTop: '80px' }}>
      {arquivo.formato === 'pdf'
        ? <BibliotecaPdfReader url={arquivo.url} storageKey={storageKey} onBibleReference={abrirReferenciaBiblica} onPageTap={toggleReading} onEnd={onEnd} restricao={arquivo.restricao} onLimit={() => { sairTelaCheia(); onLimit?.() }} immersive={immersive} />
        : <EpubReader compacto url={arquivo.url} storageKey={storageKey} onSelection={setTrecho} onBibleReference={abrirReferenciaBiblica} onPageTap={toggleReading} onEnd={onEnd} restricao={arquivo.restricao} onLimit={() => { sairTelaCheia(); onLimit?.() }} immersive={immersive} />}
    </Box>
    {!immersive && arquivo.formato !== 'pdf' && permitirCompartilhamento && <Paper elevation={4} sx={{ position: 'sticky', bottom: 12, zIndex: 5, maxWidth: 760, mx: 'auto', mt: 1.5, p: 1.2, borderRadius: 2 }}>
      {trecho ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <Typography variant="body2" sx={{ flex: 1 }} noWrap>“{trecho}”</Typography>
        <Button variant="contained" startIcon={<IosShareOutlinedIcon />} onClick={() => setCompartilhando(true)}>Compartilhar como imagem</Button>
        <CompartilharLivroButton livro={livro} somenteIcone />
      </Stack> : <Stack direction="row" spacing={1} alignItems="center" justifyContent="center"><Typography variant="body2" color="text.secondary">Selecione um trecho para criar uma imagem.</Typography><CompartilharLivroButton livro={livro} somenteIcone /></Stack>}
    </Paper>}
    {permitirCompartilhamento && <CompartilharTrechoLivroDialog open={compartilhando} onClose={() => setCompartilhando(false)} trecho={trecho} livro={livroCompartilhamento} urlLivro={urlLivro} />}
    <VersiculoPopup versiculos={versiculos} onClose={() => setVersiculos(null)} />
  </>
}

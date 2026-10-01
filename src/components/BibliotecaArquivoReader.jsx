import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import CompartilharTrechoLivroDialog from './CompartilharTrechoLivroDialog'
import CompartilharLivroButton from './CompartilharLivroButton'
import VersiculoPopup from './VersiculoPopup'
import BibliotecaPdfReader from './BibliotecaPdfReader'
import BibliotecaReaderToolbar from './BibliotecaReaderToolbar'
import { urlCapaLivro } from '../data/livrosCatalogo'
import { linkCompartilhamentoLivro } from '../utils/livroShare'
import { carregarReferenciaBiblica, tornarReferenciasBiblicasClicaveis } from '../utils/referenciasBiblicasEpub'

let epubjsPromise


async function carregarEpubJs() {
  if (!epubjsPromise) {
    epubjsPromise = Promise.all([
      import('epubjs'),
      import('epubjs/lib/managers/default/index.js'),
    ]).then(([epubModulo, managerModulo]) => {
      const ePub = epubModulo.default || epubModulo
      const ManagerPadrao = managerModulo.default || managerModulo

      class ManagerSemUnload extends ManagerPadrao {
        addEventListeners() {
          // O React já chama destroy() ao fechar o leitor. Não registramos o
          // evento obsoleto `unload`, bloqueado pela Permissions Policy.
          const scroller = this.settings.fullsize ? window : this.container
          this._onScroll = this.onScroll.bind(this)
          scroller.addEventListener('scroll', this._onScroll)
        }
      }

      return { ePub, ManagerSemUnload }
    })
  }
  return epubjsPromise
}


function EpubReader({ url, storageKey, onSelection, onBibleReference, onPageTap, immersive }) {
  const areaRef = useRef(null)
  const livroRef = useRef(null)
  const renditionRef = useRef(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tamanho, setTamanho] = useState(105)
  const [capaUrl, setCapaUrl] = useState('')
  const [exibindoCapa, setExibindoCapa] = useState(false)
  const onSelectionRef = useRef(onSelection)
  const onBibleReferenceRef = useRef(onBibleReference)
  const onPageTapRef = useRef(onPageTap)
  const gestureRef = useRef(null)
  const ultimoGestoRef = useRef(0)
  const navigationRef = useRef({})
  onPageTapRef.current = onPageTap

  useEffect(() => { onSelectionRef.current = onSelection }, [onSelection])
  useEffect(() => { onBibleReferenceRef.current = onBibleReference }, [onBibleReference])

  useEffect(() => {
    let ativo = true
    setCarregando(true); setErro(''); setCapaUrl(''); setExibindoCapa(false)
    void (async () => {
      const [{ ePub, ManagerSemUnload }, resposta] = await Promise.all([carregarEpubJs(), fetch(url)])
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
      try {
        await livro.loaded.cover
        const urlDaCapa = await livro.coverUrl()
        if (ativo) setCapaUrl(urlDaCapa || '')
      } catch {
        if (ativo) setCapaUrl('')
      }
      const rendition = livro.renderTo(areaRef.current, {
        width: '100%',
        height: '72vh',
        spread: 'none',
        flow: 'paginated',
        manager: ManagerSemUnload,
      })
      renditionRef.current = rendition
      rendition.hooks.content.register((contents) => {
        tornarReferenciasBiblicasClicaveis(contents?.document, (referencia) => {
          onBibleReferenceRef.current?.(referencia)
        })
        const doc = contents?.document
        if (!doc) return
        doc.addEventListener('touchstart', (event) => {
          if (event.touches.length !== 1) { gestureRef.current = null; return }
          const touch = event.touches[0]
          gestureRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), target: event.target }
        }, { passive: true })
        doc.addEventListener('touchend', (event) => {
          const start = gestureRef.current
          gestureRef.current = null
          const touch = event.changedTouches[0]
          if (!start || !touch || event.touches.length || Date.now() - start.time > 800) return
          const dx = touch.clientX - start.x
          const dy = touch.clientY - start.y
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5 && !doc.defaultView?.getSelection()?.toString()) {
            ultimoGestoRef.current = Date.now()
            if (dx < 0) navigationRef.current.next?.()
            else navigationRef.current.prev?.()
          }
        }, { passive: true })
        doc.addEventListener('touchcancel', () => { gestureRef.current = null }, { passive: true })
        doc.addEventListener('click', (event) => {
          if (Date.now() - ultimoGestoRef.current < 500) return
          if (event.target?.closest?.('a, button, input, [data-biblia-referencia]') || doc.defaultView?.getSelection()?.toString()) return
          onPageTapRef.current?.()
        })
      })
      rendition.themes.default({ body: { 'font-family': 'Georgia, serif', 'line-height': '1.7', padding: '0 4%' } })
      rendition.themes.fontSize('105%')
      rendition.on('relocated', (localizacao) => localStorage.setItem(storageKey, localizacao?.start?.cfi || ''))
      rendition.on('selected', (cfiRange, contents) => {
        const texto = contents?.range?.(cfiRange)?.toString?.() || contents?.window?.getSelection?.()?.toString?.() || ''
        const limpo = String(texto).replace(/\s+/g, ' ').trim()
        if (limpo) onSelectionRef.current?.(limpo)
      })
      const localizacaoSalva = localStorage.getItem(storageKey) || undefined
      try {
        await rendition.display(localizacaoSalva)
      } catch (falha) {
        if (!localizacaoSalva) throw falha
        localStorage.removeItem(storageKey)
        await rendition.display(livro.spine?.first?.()?.href || undefined)
      }
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
    <Stack spacing={1.5}>
      {erro && <Alert severity="error">{erro}</Alert>}
      {!immersive && <BibliotecaReaderToolbar onFullscreen={onPageTap}>
        <Button onClick={abrirCapa}>Início</Button>
        <Button variant="outlined" onClick={paginaAnterior}>Anterior</Button>
        <Button variant="contained" onClick={proximaPagina}>Próxima</Button>
        <Button onClick={() => setTamanho((v) => Math.max(80, v - 10))}>A−</Button>
        <Button onClick={() => setTamanho((v) => Math.min(160, v + 10))}>A+</Button>
      </BibliotecaReaderToolbar>}
      {carregando && <EstadoCarregando />}
      {exibindoCapa && capaUrl && <Box onClick={onPageTap} onTouchStart={(event) => { const touch = event.touches[0]; gestureRef.current = { x: touch.clientX, y: touch.clientY } }} onTouchEnd={(event) => { const start = gestureRef.current; gestureRef.current = null; const touch = event.changedTouches[0]; if (start && touch && start.x - touch.clientX > 55 && Math.abs(touch.clientY - start.y) < 60) proximaPagina() }} sx={{ height: immersive ? '100dvh' : '72dvh', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.09)', display: 'grid', placeItems: 'center', p: { xs: 1.5, sm: 3 } }}>
        <Box component="img" src={capaUrl} alt="Capa do livro" sx={{ display: 'block', maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 0.75, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }} />
      </Box>}
      <Box ref={areaRef} sx={{ display: carregando || exibindoCapa ? 'none' : 'block', height: immersive ? '100dvh' : '72dvh', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.09)' }} />
    </Stack>
  )
}

function EstadoCarregando() {
  return <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /><Typography color="text.secondary" sx={{ mt: 2 }}>Abrindo o livro…</Typography></Box>
}

export default function BibliotecaArquivoReader({ arquivo, storageKey, livro, permitirCompartilhamento = true }) {
  const [trecho, setTrecho] = useState('')
  const [compartilhando, setCompartilhando] = useState(false)
  const [versiculos, setVersiculos] = useState(null)
  const [erroReferencia, setErroReferencia] = useState('')
  const [immersive, setImmersive] = useState(false)
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
    const exit = (event) => { if (event.type === 'androidBack' || event.key === 'Escape') setImmersive(false) }
    window.addEventListener('keydown', exit)
    window.addEventListener('androidBack', exit)
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener('keydown', exit); window.removeEventListener('androidBack', exit) }
  }, [immersive])
  const toggleReading = () => setImmersive((value) => !value)

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
        ? <BibliotecaPdfReader url={arquivo.url} storageKey={storageKey} onBibleReference={abrirReferenciaBiblica} onPageTap={toggleReading} immersive={immersive} />
        : <EpubReader url={arquivo.url} storageKey={storageKey} onSelection={setTrecho} onBibleReference={abrirReferenciaBiblica} onPageTap={toggleReading} immersive={immersive} />}
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

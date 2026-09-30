import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import CompartilharTrechoLivroDialog from './CompartilharTrechoLivroDialog'
import CompartilharLivroButton from './CompartilharLivroButton'
import VersiculoPopup from './VersiculoPopup'
import { urlCapaLivro } from '../data/livrosCatalogo'
import { linkCompartilhamentoLivro } from '../utils/livroShare'
import { carregarReferenciaBiblica, extrairReferenciasBiblicas, tornarReferenciasBiblicasClicaveis } from '../utils/referenciasBiblicasEpub'

let pdfjsPromise
let epubjsPromise

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

function PdfReader({ url, storageKey, onBibleReference }) {
  const canvasRef = useRef(null)
  const [documento, setDocumento] = useState(null)
  const [pagina, setPagina] = useState(() => Math.max(1, Number(localStorage.getItem(storageKey)) || 1))
  const [escala, setEscala] = useState(1.2)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [referenciasPagina, setReferenciasPagina] = useState([])
  const [paginaTemTexto, setPaginaTemTexto] = useState(null)

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
    setReferenciasPagina([])
    setPaginaTemTexto(null)
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
      const leituraTexto = folha.getTextContent().then((conteudo) => {
        if (cancelado) return
        const texto = (conteudo?.items || []).map((item) => item?.str || '').join(' ').replace(/\s+/g, ' ').trim()
        setPaginaTemTexto(Boolean(texto))
        setReferenciasPagina(extrairReferenciasBiblicas(texto))
      })
      return Promise.all([renderizacao.promise, leituraTexto])
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
      {referenciasPagina.length > 0 && <Paper variant="outlined" sx={{ width: '100%', maxWidth: 900, p: 1.4, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.8 }}>Textos bíblicos nesta página</Typography>
        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
          {referenciasPagina.map((referencia) => <Button key={referencia} size="small" variant="outlined" onClick={() => onBibleReference?.(referencia)}>{referencia}</Button>)}
        </Stack>
      </Paper>}
      {paginaTemTexto === false && <Alert severity="info" sx={{ width: '100%', maxWidth: 900 }}>Esta página parece ser uma imagem. Para reconhecer referências nela, será necessário OCR.</Alert>}
    </Stack>
  )
}

function EpubReader({ url, storageKey, onSelection, onBibleReference }) {
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

  const abrirCapa = () => {
    localStorage.removeItem(storageKey)
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

  return (
    <Stack spacing={1.5}>
      {erro && <Alert severity="error">{erro}</Alert>}
      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
        <Button onClick={abrirCapa}>Capa</Button>
        <Button variant="outlined" startIcon={<ArrowBackIosNewIcon />} onClick={paginaAnterior}>Anterior</Button>
        <Button variant="contained" endIcon={<ArrowForwardIosIcon />} onClick={proximaPagina}>Próxima</Button>
        <Button onClick={() => setTamanho((v) => Math.max(80, v - 10))}>A−</Button>
        <Button onClick={() => setTamanho((v) => Math.min(160, v + 10))}>A+</Button>
      </Stack>
      {carregando && <EstadoCarregando />}
      {exibindoCapa && capaUrl && <Box sx={{ minHeight: '72vh', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.09)', display: 'grid', placeItems: 'center', p: { xs: 1.5, sm: 3 } }}>
        <Box component="img" src={capaUrl} alt="Capa do livro" sx={{ display: 'block', maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 0.75, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }} />
      </Box>}
      <Box ref={areaRef} sx={{ display: carregando || exibindoCapa ? 'none' : 'block', minHeight: '72vh', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.09)' }} />
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
    {arquivo.formato === 'pdf'
      ? <PdfReader url={arquivo.url} storageKey={storageKey} onBibleReference={abrirReferenciaBiblica} />
      : <EpubReader url={arquivo.url} storageKey={storageKey} onSelection={setTrecho} onBibleReference={abrirReferenciaBiblica} />}
    {arquivo.formato !== 'pdf' && permitirCompartilhamento && <Paper elevation={4} sx={{ position: 'sticky', bottom: 12, zIndex: 5, maxWidth: 760, mx: 'auto', mt: 1.5, p: 1.2, borderRadius: 2 }}>
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

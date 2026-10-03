import { useEffect, useRef, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { carregarEpubJs } from './BibliotecaArquivoReader'

// Renderiza uma página real e a reduz visualmente. Não recompõe o texto.
export default function EpubPrimeiraPaginaMiniatura({ arquivo }) {
  const hostRef = useRef(null)
  const areaRef = useRef(null)
  const [largura, setLargura] = useState(0)
  const [visivel, setVisivel] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState(false)
  useEffect(() => {
    const host = hostRef.current
    const resize = new ResizeObserver(([entry]) => setLargura(entry.contentRect.width))
    const observer = new IntersectionObserver(([entry]) => setVisivel(entry.isIntersecting), { rootMargin: '250px' })
    resize.observe(host); observer.observe(host)
    return () => { resize.disconnect(); observer.disconnect() }
  }, [])
  useEffect(() => {
    if (!visivel || !arquivo) return
    let ativo = true
    let livro
    let rendition
    setPronto(false); setErro(false)
    void (async () => {
      const { ePub, ManagerSemUnload } = await carregarEpubJs()
      const bytes = await arquivo.arrayBuffer()
      if (!ativo) return
      livro = ePub(bytes)
      livro.spine.hooks.serialize.register((conteudo, secao) => {
        secao.output = String(conteudo || '').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>|<script\b[^>]*\/\s*>/giu, '')
      })
      await livro.ready
      if (!ativo) return
      rendition = livro.renderTo(areaRef.current, { width: 420, height: 630, flow: 'paginated', spread: 'none', manager: ManagerSemUnload, allowScriptedContent: false })
      rendition.themes.default({ body: { 'font-family': 'Georgia, serif', 'line-height': '1.7', padding: '0 4%' } })
      rendition.themes.fontSize('105%')
      rendition.hooks.content.register(async (contents) => {
        await contents.document.fonts?.ready
        await Promise.all([...contents.document.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
          const timer = setTimeout(resolve, 3000)
          const done = () => { clearTimeout(timer); resolve() }
          img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true })
        })))
      })
      await rendition.display(livro.spine.first()?.href)
      if (ativo) setPronto(true)
    })().catch(() => { if (ativo) setErro(true) }).finally(() => {
      if (!ativo) { rendition?.destroy(); livro?.destroy() }
    })
    return () => { ativo = false; rendition?.destroy(); livro?.destroy() }
  }, [arquivo, visivel])
  return <Box ref={hostRef} aria-label="Primeira página do EPUB" sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: 'white', overflow: 'hidden', pointerEvents: 'none' }}>
    <Box ref={areaRef} sx={{ position: 'absolute', width: 420, height: 630, left: 0, top: 0, transform: `scale(${largura / 420})`, transformOrigin: '0 0', opacity: pronto ? 1 : 0 }} />
    {!pronto && <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', color: '#777', fontSize: 12 }}>{erro ? 'Prévia indisponível' : <CircularProgress size={20} />}</Box>}
  </Box>
}

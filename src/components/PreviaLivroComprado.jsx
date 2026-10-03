import { useEffect, useRef, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import EpubPrimeiraPaginaMiniatura from './EpubPrimeiraPaginaMiniatura'
import { obterArquivoLivroBiblioteca } from '../services/bibliotecaLivrosService'
import { primeiraPaginaPdf } from '../services/bibliotecaPessoalService'

// Apenas livros sem capa e com acesso digital liberado chegam aqui.
// A autorização do arquivo continua sendo conferida no servidor.
export default function PreviaLivroComprado({ livroId }) {
  const hostRef = useRef(null)
  const [visivel, setVisivel] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [imagem, setImagem] = useState('')
  const [erro, setErro] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisivel(true) }, { rootMargin: '100px' })
    observer.observe(hostRef.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!visivel) return
    let ativo = true
    let objectUrl
    const controller = new AbortController()
    void (async () => {
      const dados = await obterArquivoLivroBiblioteca(livroId, 'completo')
      if (!ativo) return
      const response = await fetch(dados.url, { signal: controller.signal })
      if (!response.ok) throw new Error('Arquivo indisponível')
      const blob = await response.blob()
      if (!ativo) return
      if (dados.formato === 'pdf') {
        const previa = await primeiraPaginaPdf(blob)
        if (!ativo || !previa) return
        objectUrl = URL.createObjectURL(previa)
        setImagem(objectUrl)
      } else setArquivo(blob)
    })().catch(() => { if (ativo) setErro(true) })
    return () => { ativo = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [livroId, visivel])
  return <Box ref={hostRef} sx={{ width: '100%', aspectRatio: '2 / 3', bgcolor: 'white', display: 'grid', placeItems: 'center' }}>
    {imagem ? <Box component="img" src={imagem} alt="Primeira página do livro" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      : arquivo ? <EpubPrimeiraPaginaMiniatura arquivo={arquivo} />
        : erro ? <Box sx={{ color: '#666', fontSize: 12 }}>Prévia indisponível</Box> : <CircularProgress size={20} />}
  </Box>
}

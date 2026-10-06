import { cloneElement, useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { conectarDestaques, destaquesAtivos, LIMITE_APRESENTACAO, APRESENTACAO_LUZ_TEMPOS } from '../services/destaquesMenuService'
import { assinarCatalogoLivros, assinarAcessosBiblioteca } from '../services/bibliotecaLivrosService'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import TextoDestaque from './TextoDestaque'
import EditorApresentacao from './EditorApresentacao'
import { contarApresentacao } from '../utils/apresentacaoFormatada'
import { direcaoGestoDestaque } from '../utils/gestoDestaques'
import { urlFundoVersiculo } from '../utils/versiculoImagem'

export default function DestaquesMenu({ ehAdmin, children }) {
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const [acessos, setAcessos] = useState({})
  useEffect(() => { setAcessos({}); return assinarAcessosBiblioteca(user?.uid, setAcessos, () => setAcessos({})) }, [user?.uid])
  const [itens, setItens] = useState([])
  const [rascunho, setRascunho] = useState([])
  const [livros, setLivros] = useState([])
  const [agora, setAgora] = useState(Date.now())
  const [indice, setIndice] = useState(0)
  const gesto = useRef(null)
  const ignorarCliqueAte = useRef(0)
  const [editar, setEditar] = useState(false)
  const [leituraExpandida, setLeituraExpandida] = useState(false)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    let ativo = true, parar = () => {}
    conectarDestaques().then(({ api, referencia }) => {
      if (!ativo) return
      parar = api.onValue(referencia, (snapshot) => {
        if (ativo) setItens(Object.entries(snapshot.val() || {}).map(([id, item]) => ({ ...item, id })))
      }, () => setErro('Não foi possível carregar os destaques.'))
    }).catch(() => {})
    const pararLivros = assinarCatalogoLivros(setLivros, () => {})
    return () => { ativo = false; parar(); pararLivros?.() }
  }, [])
  useEffect(() => { const timer = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(timer) }, [])
  const ativos = destaquesAtivos(itens, agora).filter((item) => item.tipo !== 'livro' || livros.some((livro) => livro.id === item.livroId && livro.publicado && !livro.excluido))
  const total = ativos.length + 1
  const posicao = indice % total
  const item = posicao ? ativos[posicao - 1] : null
  const livro = item && livros.find((valor) => valor.id === item.livroId)
  useEffect(() => {
    if (editar || leituraExpandida || total < 2) return undefined
    const timer = setInterval(() => { if (!document.hidden) setIndice((valor) => (valor + 1) % total) }, 15000)
    return () => clearInterval(timer)
  }, [editar, leituraExpandida, total, indice])
  function mudar(passo) { setIndice((posicao + passo + total) % total) }
  const podeLer = ehAdmin || acessos[item?.livroId]?.ativo === true
  const abrirLivro = () => navigate(`/biblioteca/${encodeURIComponent(item.livroId)}${podeLer ? '/ler' : ''}`)
  function alterar(id, campo, valor) { setRascunho((lista) => lista.map((entrada) => entrada.id === id ? { ...entrada, [campo]: valor } : entrada)) }
  async function salvar() {
    setSalvando(true); setErro('')
    try {
      if (rascunho.length > 30) throw new Error('Use até 30 destaques.')
      const dados = {}
      for (const entrada of rascunho) {
        if (entrada.tipo === 'livro' && contarApresentacao(entrada.texto) > LIMITE_APRESENTACAO) throw new Error(`A apresentação deve ter até ${LIMITE_APRESENTACAO} caracteres. Reduza o texto antes de salvar.`)
        if (!entrada.titulo?.trim() || (entrada.tipo === 'livro' ? !entrada.livroId : !entrada.texto?.trim())) throw new Error('Preencha o título e o conteúdo de cada destaque.')
        if (entrada.inicioEm && entrada.fimEm && entrada.fimEm <= entrada.inicioEm) throw new Error('O fim deve ser posterior ao início.')
        const { id, ...campos } = entrada
        dados[id] = campos
      }
      const { api, referencia } = await conectarDestaques()
      await api.set(referencia, dados); setEditar(false)
    } catch (falha) { setErro(falha.message || 'Não foi possível salvar.') }
    finally { setSalvando(false) }
  }
  const dataCampo = (valor) => valor ? new Date(valor - new Date(valor).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
  return <>
    <Grid item xs={12}><Box sx={{ position: 'relative', touchAction: 'pan-y' }}
      onPointerDown={(event) => { if (event.isPrimary && event.button === 0) gesto.current = { x: event.clientX, y: event.clientY, id: event.pointerId } }}
      onPointerCancel={() => { gesto.current = null }}
      onPointerUp={(event) => {
        const inicio = gesto.current
        gesto.current = null
        if (!inicio || inicio.id !== event.pointerId || total < 2) return
        const passo = direcaoGestoDestaque(inicio, { x: event.clientX, y: event.clientY })
        if (passo) { ignorarCliqueAte.current = Date.now() + 500; mudar(passo) }
      }}
      onClickCapture={(event) => { if (Date.now() < ignorarCliqueAte.current) { event.preventDefault(); event.stopPropagation() } }}>
    <Box sx={{ display: item ? 'none' : 'contents' }}>{cloneElement(children, { onExpandidoChange: setLeituraExpandida, reiniciarExpansao: indice })}</Box>
    {item && <Box sx={{ position: 'relative', p: item.tipo === 'livro' ? 0.75 : 2, borderRadius: 2, color: '#000', backgroundImage: `url("${urlFundoVersiculo({ arquivo: 'amanhecer.webp' })}")`, backgroundSize: 'cover', border: '1px solid #decda5', textShadow: '-1px -1px white, 1px 1px white, -1px 1px white, 1px -1px white' }}>
      <Typography variant="overline" fontWeight={900} sx={item.tipo === 'livro' ? { position: 'absolute', top: 12, left: 16, maxWidth: '48%', lineHeight: 1.3 } : {}}>{item.tipo === 'livro' ? 'Livro do dia' : item.tipo === 'trecho' ? 'Trecho de livro' : 'Mensagem do dia'}</Typography>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ minWidth: 0, flex: 1, ...(item.tipo === 'livro' && { pl: 1.25, pt: 4 }) }}><Typography fontWeight={800}>{item.titulo}</Typography><TextoDestaque key={item.id} texto={item.texto || livro?.descricao || ''} formatado={item.tipo === 'livro'} alinhamento={item.alinhamento} onExpandidoChange={setLeituraExpandida} reiniciarExpansao={indice} />{item.autor && <Typography variant="caption">{item.autor}</Typography>}</Box>
        {item.tipo === 'livro' && <Box sx={{ width: { xs: '46%', sm: 210 }, flexShrink: 0, textAlign: 'center' }}>
          <Button onClick={abrirLivro} aria-label={podeLer ? `Ler ${livro?.titulo}` : `Comprar ${livro?.titulo}`} sx={{ p: 0, width: '100%' }}>{livro?.capa ? <Box component="img" draggable={false} src={livro.capa} alt={`Capa de ${livro.titulo}`} sx={{ width: '100%', height: { xs: 205, sm: 220 }, objectFit: 'contain' }} /> : <Typography>{livro?.titulo}</Typography>}</Button>
          <Button variant="outlined" onClick={abrirLivro} sx={{ mt: 0.5, px: 1.5, py: 0.5, color: '#000', border: '1px solid #173e35', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,.22)', background: 'transparent', '&:hover': { background: 'transparent', borderColor: '#000' }, textShadow: '-1px -1px white, 1px 1px white, -1px 1px white, 1px -1px white', fontWeight: 800 }}>{podeLer ? 'Ler agora' : 'Compre agora'}</Button>
        </Box>}
      </Stack>
    </Box>}
    </Box></Grid>
    <Grid item xs={12}><Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt: -0.5, '& .MuiButton-root': { color: 'white' } }}>
      {total > 1 && <Stack direction="row" spacing={0.25} role="group" aria-label="Escolher destaque">{Array.from({ length: total }, (_, numero) => <Button key={numero} aria-label={`Mostrar destaque ${numero + 1}`} aria-current={posicao === numero ? 'true' : undefined} onClick={() => setIndice(numero)} sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}><Box sx={{ width: 9, height: 9, borderRadius: '50%', background: posicao === numero ? '#e4bd68' : 'transparent', border: '1px solid #e4bd68' }} /></Button>)}</Stack>}
      {ehAdmin && <Button size="small" sx={{ color: 'white' }} onClick={() => { setErro(''); setRascunho(itens.map((valor) => ({ ...valor }))); setEditar(true) }}>Editar destaques</Button>}
    </Stack></Grid>
    <Dialog open={editar} onClose={salvando ? undefined : () => setEditar(false)} fullWidth maxWidth="sm"><DialogTitle>Configurar destaques</DialogTitle><DialogContent dividers>
      <Typography variant="body2" sx={{ mb: 2 }}>O versículo permanece. Acrescente mensagens, trechos e livros. Datas vazias significam exibição sem prazo.</Typography>
      {erro && <Alert severity="error">{erro}</Alert>}
      {rascunho.map((entrada) => <Stack key={entrada.id} spacing={1.5} sx={{ py: 2, borderBottom: '1px solid #ddd' }}>
        <TextField select label="Tipo" value={entrada.tipo} onChange={(event) => alterar(entrada.id, 'tipo', event.target.value)}>{[['mensagem', 'Mensagem'], ['trecho', 'Trecho de livro'], ['livro', 'Livro do dia']].map(([valor, titulo]) => <MenuItem key={valor} value={valor}>{titulo}</MenuItem>)}</TextField>
        <TextField label="Título" value={entrada.titulo} inputProps={{ maxLength: 180 }} onChange={(event) => alterar(entrada.id, 'titulo', event.target.value)} />
        {entrada.tipo === 'livro' && <TextField select label="Livro" value={entrada.livroId || ''} onChange={(event) => alterar(entrada.id, 'livroId', event.target.value)}>{livros.filter((valor) => valor.publicado && !valor.excluido).map((valor) => <MenuItem key={valor.id} value={valor.id}>{valor.titulo}</MenuItem>)}</TextField>}
        {entrada.tipo === 'livro' ? <EditorApresentacao texto={entrada.texto || ''} alinhamento={entrada.alinhamento} limite={LIMITE_APRESENTACAO} onTexto={(valor) => alterar(entrada.id, 'texto', valor)} onAlinhamento={(valor) => alterar(entrada.id, 'alinhamento', valor)} /> : <TextField label="Texto" multiline minRows={3} value={entrada.texto || ''} inputProps={{ maxLength: 6000 }} helperText={`${6000 - (entrada.texto || '').length} caracteres restantes`} onChange={(event) => alterar(entrada.id, 'texto', event.target.value)} />}
        {entrada.tipo === 'livro' && entrada.livroId === 'luz-dos-tempos-antigos' && <Button onClick={() => alterar(entrada.id, 'texto', APRESENTACAO_LUZ_TEMPOS)}>Usar apresentação de Luz dos Tempos Antigos</Button>}
        <TextField label="Autor / origem" value={entrada.autor || ''} inputProps={{ maxLength: 180 }} onChange={(event) => alterar(entrada.id, 'autor', event.target.value)} />
        {['inicioEm', 'fimEm'].map((campo) => <TextField key={campo} type="datetime-local" label={campo === 'inicioEm' ? 'Início' : 'Fim'} InputLabelProps={{ shrink: true }} value={dataCampo(entrada[campo])} onChange={(event) => alterar(entrada.id, campo, event.target.value ? new Date(event.target.value).getTime() : 0)} />)}
        <Button color="error" onClick={() => setRascunho((lista) => lista.filter((valor) => valor.id !== entrada.id))}>Remover da lista</Button>
      </Stack>)}
      <Button disabled={rascunho.length >= 30} onClick={() => setRascunho((lista) => [...lista, { id: `destaque-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, tipo: 'mensagem', titulo: '', texto: '', autor: '', inicioEm: 0, fimEm: 0 }])}>Adicionar destaque</Button>
    </DialogContent><DialogActions><Button disabled={salvando} onClick={() => setEditar(false)}>Cancelar</Button><Button disabled={salvando} variant="contained" onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Button></DialogActions></Dialog>
  </>
}

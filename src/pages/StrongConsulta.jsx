import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardActionArea, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { pesquisarLexiconStrong } from '../services/lexiconPtBrService'
import { listarResumosStrongGerados, obterResumoStrongPublicadoPorCodigo } from '../services/strongResumoShareService'
import { lerResumoLemmaLocalStrong, salvarResumoLemmaLocalStrong, listarResumosStrongLocais,
  listarTokensStrongLocais, salvarResumoTokenLocalStrong } from '../utils/strongResumoLocalCache'
import { normalizarBuscaStrong, codigosBuscaStrong } from '../utils/strongBusca'
import { limparTokenPassagem } from '../utils/strongTokenContext'

export default function StrongConsulta() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user } = useFirebaseAuth()
  const [termo, setTermo] = useState(params.get('q') || '')
  const [idioma, setIdioma] = useState(params.get('idioma') || '')
  const [resultados, setResultados] = useState([])
  const [gerados, setGerados] = useState(listarResumosStrongLocais)
  const [proximo, setProximo] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingGerados, setLoadingGerados] = useState(false)
  const [erro, setErro] = useState('')
  const [erroGerados, setErroGerados] = useState('')
  const [consultaFeita, setConsultaFeita] = useState(false)
  const [verbete, setVerbete] = useState(null)
  const consultaId = useRef(0)
  const detalheId = useRef(0)
  const q = params.get('q') || ''
  const filtro = params.get('idioma') || ''

  useEffect(() => {
    setTermo(q); setIdioma(filtro)
    const id = ++consultaId.current
    if (!q.trim()) { setResultados([]); setConsultaFeita(false); setLoading(false); setErro(''); return }
    setLoading(true); setErro(''); setConsultaFeita(true)
    pesquisarLexiconStrong(q, filtro).then(rows => {
      if (consultaId.current === id) setResultados(rows)
    }).catch(() => {
      if (consultaId.current === id) { setResultados([]); setErro('Não foi possível consultar o dicionário. Tente novamente com internet para carregar a base disponível no aplicativo.') }
    }).finally(() => { if (consultaId.current === id) setLoading(false) })
    return () => { consultaId.current++ }
  }, [q, filtro])

  useEffect(() => {
    let ativo = true
    setGerados(listarResumosStrongLocais()); setProximo(''); setErroGerados('')
    if (!user?.uid) { setLoadingGerados(false); return }
    setLoadingGerados(true)
    listarResumosStrongGerados().then(pagina => {
      if (!ativo) return
      setGerados(atuais => juntar(atuais, pagina.itens)); setProximo(pagina.proximo)
    }).catch(() => { if (ativo) setErroGerados('Os estudos compartilhados não puderam ser carregados. Os textos guardados neste aparelho continuam disponíveis.') })
      .finally(() => { if (ativo) setLoadingGerados(false) })
    return () => { ativo = false; detalheId.current++ }
  }, [user?.uid])

  function juntar(atuais, novos) {
    return [...new Map([...atuais, ...novos].map(item => [item.code, item])).values()]
  }

  async function carregarMais() {
    if (loadingGerados || !proximo) return
    setLoadingGerados(true); setErroGerados('')
    try {
      const pagina = await listarResumosStrongGerados({ apos: proximo })
      setGerados(atuais => juntar(atuais, pagina.itens)); setProximo(pagina.proximo)
    } catch { setErroGerados('Não foi possível carregar mais estudos. Tente novamente.') }
    finally { setLoadingGerados(false) }
  }

  async function abrir(item) {
    const id = ++detalheId.current
    const local = item.resumo || lerResumoLemmaLocalStrong(item.code)
    setVerbete({ ...item, resumo: local, tokens: listarTokensStrongLocais(item.code), loading: Boolean(user?.uid), erro: '' })
    if (!user?.uid) return
    const [lemma, tokens] = await Promise.allSettled([
      local ? Promise.resolve({ resumo: local }) : obterResumoStrongPublicadoPorCodigo(item.code),
      listarResumosStrongGerados({ code: item.code, tokens: true }),
    ])
    if (id !== detalheId.current) return
    const resumo = lemma.status === 'fulfilled' ? lemma.value?.resumo || local : local
    if (resumo) salvarResumoLemmaLocalStrong(item.code, resumo)
    if (tokens.status === 'fulfilled') {
      tokens.value.itens.forEach(t => {
        if (t.cacheKey && t.resumo) salvarResumoTokenLocalStrong(t.cacheKey, t.resumo)
      })
    }
    setVerbete(atual => atual && ({ ...atual, resumo, loading: false,
      tokens: [...new Map([...atual.tokens, ...(tokens.status === 'fulfilled' ? tokens.value.itens : [])]
        .map(t => [t.cacheKey || t.id, t])).values()],
      maisTokens: tokens.status === 'fulfilled' && Boolean(tokens.value.proximo),
      erro: lemma.status === 'rejected' || tokens.status === 'rejected' ? 'Parte dos textos compartilhados não pôde ser consultada agora.' : '',
    }))
  }

  function fechar() { detalheId.current++; setVerbete(null) }
  function estudoCompleto() {
    limparTokenPassagem()
    const search = new URLSearchParams(params)
    search.set('origem', 'consulta')
    navigate(`/estudo-strong/${verbete.code}?${search}`, { state: { token: null } })
  }

  const buscaNormal = normalizarBuscaStrong(q)
  const codigos = codigosBuscaStrong(q, filtro)
  const geradosVisiveis = gerados.filter(item => (!filtro || item.code.startsWith(filtro)) &&
    (!buscaNormal || (codigos.length ? codigos.includes(item.code) : normalizarBuscaStrong(`${item.code} ${item.resumo}`).includes(buscaNormal))))
  const cartao = (item, salvo = false) => <Card key={item.code} variant="outlined" sx={{ minWidth: 0 }}>
    <CardActionArea onClick={() => abrir(item)} sx={{ p: 2, textAlign: 'left' }}>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Typography fontWeight={800}>{item.code}</Typography>
        {salvo && <Chip label="Estudo disponível" size="small" />}
      </Stack>
      {item.palavra && <Typography sx={{ fontSize: '1.35rem', overflowWrap: 'anywhere' }}>{item.palavra}</Typography>}
      {item.transliteracao && <Typography color="text.secondary">{item.transliteracao}</Typography>}
      <Typography sx={{ mt: 1, overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {item.resumo || item.descricao || 'Consultar palavra e estudo Strong'}
      </Typography>
    </CardActionArea>
  </Card>

  return <Box sx={{ p: 2, width: '100%', maxWidth: 900, mx: 'auto', boxSizing: 'border-box', minWidth: 0 }}>
    <Typography variant="h5" component="h1" fontWeight={800}>Dicionário Strong</Typography>
    <Typography sx={{ my: 1.5 }}>Pesquise palavras, nomes, transliterações e números Strong. Consulte também os estudos já disponíveis.</Typography>
    <Box component="form" onSubmit={event => { event.preventDefault(); setParams({ ...(termo.trim() ? { q: termo.trim() } : {}), ...(idioma ? { idioma } : {}) }) }}>
      <Stack spacing={1.5}>
        <TextField label="Palavra, nome ou número Strong" placeholder="Ex.: amor, Davi, logos, H1732 ou G26" value={termo} onChange={e => setTermo(e.target.value)} fullWidth />
        <Stack direction="row" spacing={1}>
          <TextField select label="Idioma" value={idioma} onChange={e => setIdioma(e.target.value)} sx={{ flex: 1, minWidth: 0 }}>
            <MenuItem value="">Todos</MenuItem><MenuItem value="H">Hebraico / aramaico</MenuItem><MenuItem value="G">Grego</MenuItem>
          </TextField>
          <Button type="submit" variant="contained" disabled={loading}>Pesquisar</Button>
        </Stack>
      </Stack>
    </Box>
    {loading && <CircularProgress aria-label="Pesquisando Strong" sx={{ my: 2 }} />}
    {erro && <Alert severity="warning" sx={{ mt: 2 }}>{erro}</Alert>}
    {consultaFeita && !loading && !erro && <>
      <Typography component="h2" variant="h6" sx={{ mt: 3, mb: 1 }}>Resultados do dicionário</Typography>
      {!resultados.length && <Typography>Nenhum verbete encontrado. Tente outra palavra ou um código com H ou G.</Typography>}
      <Stack spacing={1}>{resultados.map(item => cartao(item))}</Stack>
      {resultados.length === 40 && <Typography sx={{ mt: 1 }}>Mostrando até 40 verbetes. Refine a pesquisa para encontrar a palavra desejada.</Typography>}
    </>}
    <Typography component="h2" variant="h6" sx={{ mt: 3, mb: 1 }}>Estudos já disponíveis</Typography>
    {!user?.uid && <Typography sx={{ mb: 1 }}>Entre na sua conta para consultar também os estudos compartilhados. Os textos deste aparelho aparecem abaixo.</Typography>}
    {erroGerados && <Alert severity="info" sx={{ mb: 1 }}>{erroGerados}</Alert>}
    <Stack spacing={1}>{geradosVisiveis.map(item => cartao(item, true))}</Stack>
    {!loadingGerados && !geradosVisiveis.length && <Typography>Nenhum estudo nesta lista{q ? ' para esta pesquisa' : ''}. Use a pesquisa acima para consultar o dicionário.</Typography>}
    {loadingGerados && <CircularProgress aria-label="Carregando estudos Strong" sx={{ my: 2 }} />}
    {proximo && <Button onClick={carregarMais} disabled={loadingGerados} sx={{ mt: 1 }}>Carregar mais estudos</Button>}
    <Dialog open={Boolean(verbete)} onClose={fechar} fullWidth maxWidth="md">
      <DialogTitle>{verbete?.code} {verbete?.palavra}</DialogTitle>
      <DialogContent dividers sx={{ overflowWrap: 'anywhere' }}>
        {verbete?.loading && <CircularProgress aria-label="Consultando textos existentes" />}
        {verbete?.erro && <Alert severity="info">{verbete.erro}</Alert>}
        {verbete?.resumo ? <><Typography variant="h6" component="h2">Lemma explicado</Typography><Typography sx={{ whiteSpace: 'pre-wrap', my: 1 }}>{verbete.resumo}</Typography></> : !verbete?.loading && <>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{verbete?.descricao || 'Este verbete ainda não possui um estudo explicado disponível para consulta.'}</Typography>
          <Typography sx={{ mt: 1 }}>Ao abrir o estudo completo, o aplicativo procura o texto existente e pode gerar uma explicação se ainda não houver.</Typography>
        </>}
        {verbete?.tokens?.map(t => <Box key={t.cacheKey || t.id} sx={{ mt: 3 }}>
          <Typography variant="h6" component="h2">Token explicado · {t.refPassagem || 'Passagem bíblica'}</Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{t.resumo}</Typography>
        </Box>)}
        {verbete?.maisTokens && <Typography sx={{ mt: 2 }}>Mostrando os primeiros 40 contextos. Outros tokens podem ser consultados diretamente na passagem bíblica.</Typography>}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap' }}><Button onClick={fechar}>Fechar</Button><Button onClick={estudoCompleto}>Abrir estudo completo</Button></DialogActions>
    </Dialog>
  </Box>
}

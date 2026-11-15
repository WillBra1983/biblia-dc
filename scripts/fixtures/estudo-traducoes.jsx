import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Passagem from '../../src/pages/EstudoBiblicoIaPassagem'
import Pericope from '../../src/pages/EstudoBiblicoIaPericope'
import { definirVersaoBiblica } from '../../src/utils/bibliaVersionStore'
import { gravarCacheIaPassagem } from '../../src/utils/bibliaIaPassagemCache'

const original = 'Estudo ARA original extenso. ' + 'Conteúdo que deve permanecer integral. '.repeat(300)
const originalPericope = 'Perícope ARA original completa.'
window.registros = {
  'estudosCurados/43_3_16': { texto: original, referenciaCompacta: 'Jo 3:16' },
  'estudosCurados/43_3_16~biblia_ara': { texto: 'Cópia ARA posterior, não substituir o original.' },
  'estudosCurados/43_3_16~biblia_naa': { texto: 'Estudo NAA já existente.' },
  'estudosCurados/43_3_18~biblia_naa': { texto: 'Somente NAA existente.' },
  'pericopesCuradas/43_3_1_21': { texto: originalPericope, titulo: 'Jesus e Nicodemos', referencia: 'Jo 3:1-21' }
}
const registrosAntes = JSON.stringify(window.registros)
window.geracoes = []
window.pedidos = []
localStorage.clear()
definirVersaoBiblica('ntlh')
gravarCacheIaPassagem(43, 3, [19], { texto: 'Cache ARA antigo integral.', meta: { referenciaCompacta: 'Jo 3:19' } })
function Host() {
  const navigate = useNavigate(), location = useLocation()
  window.go = navigate
  return location.pathname === '/q' ? <Pericope /> : <Passagem />
}
createRoot(document.getElementById('app')).render(<React.StrictMode><ThemeProvider theme={createTheme()}><MemoryRouter initialEntries={['/p?livro=43&capitulo=3&versiculos=16']}><Host /></MemoryRouter></ThemeProvider></React.StrictMode>)
const results = []
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const check = (name, value) => { if (!value) throw Error(name); results.push(name) }
const btn = text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text)
const dialog = () => document.querySelector('[role="dialog"]')
async function until(name, fn) {
  await wait(100)
  for (let i = 0; i < 150 && !fn(); i++) await wait(50)
  check(name, fn())
}
async function content(text) { await until('conteúdo: ' + text.slice(0, 45), () => document.body.textContent.includes(text.trim()) && !dialog()) }
async function choice() { await until('escolha antes de gerar', () => Boolean(dialog())) }
async function go(verse, version = 'ntlh') {
  definirVersaoBiblica(version)
  window.go('/p?livro=43&capitulo=3&versiculos=' + verse)
  await wait(100)
}
async function run() {
  try {
    await choice()
    check('ARA e NAA oferecidas', Boolean(btn('Abrir estudo em ARA') && btn('Abrir estudo em NAA')))
    check('nenhuma geração antes da escolha', window.geracoes.length === 0)
    btn('Abrir estudo em ARA').click()
    await content(original)
    check('original completo, nenhuma substituição', !document.body.textContent.includes('Cópia ARA posterior'))
    check('aviso da tradução ARA', document.body.textContent.includes('Este estudo é baseado na tradução ARA.'))
    btn('Gerar em NTLH').click()
    await choice()
    check('botão gerar ainda não cobra', window.geracoes.length === 0)
    btn('Cancelar').click()
    await content(original)
    btn('Abrir estudo em NAA').click()
    await content('Estudo NAA já existente.')
    check('NAA existente não gera', window.geracoes.length === 0)
    btn('Gerar em NTLH').click()
    await choice()
    btn('Sim, gerar em NTLH').click()
    await content('Explicação na tradução NTLH')
    check('somente uma geração NTLH confirmada', window.geracoes.join(',') === 'ntlh')
    check('adaptação usa ARA original integral', window.pedidos[0].estudoBase.texto === original && window.pedidos[0].estudoBase.versaoBiblica === 'ara')
    check('texto bíblico da tradução original enviado', window.pedidos[0].textoBiblicoBase === 'Texto ara')
    btn('Abrir estudo em ARA').click()
    await content(original)
    btn('Abrir estudo em NTLH').click()
    await content('Explicação na tradução NTLH')
    check('alternar reutiliza os resultados', window.geracoes.length === 1)
    await go(16)
    await content('Explicação na tradução NTLH')
    check('reabertura usa a tradução solicitada existente', window.geracoes.length === 1)
    await go(16, 'naa')
    await content('Estudo NAA já existente.')
    await go(16, 'ara')
    await content(original)
    check('abrir ARA e NAA existentes não custa', window.geracoes.length === 1)
    await go(17)
    await content('Explicação na tradução NTLH')
    check('sem nenhum estudo gera apenas a tradução pedida', window.geracoes.join(',') === 'ntlh,ntlh')
    check('primeiro estudo conserva geração completa normal', !window.pedidos[1].estudoBase)
    await go(18)
    await choice()
    check('somente NAA oferecida quando só NAA existe', Boolean(btn('Abrir estudo em NAA')) && !btn('Abrir estudo em ARA'))
    btn('Abrir estudo em NAA').click()
    await content('Somente NAA existente.')
    check('consulta não inventa ARA', window.geracoes.length === 2)
    await go(19)
    await choice()
    btn('Abrir estudo em ARA').click()
    await content('Cache ARA antigo integral.')
    check('cache ARA sem sufixo também reutilizado', window.geracoes.length === 2)
    window.go('/q?livro=43&capitulo=3&inicio=1&fim=21')
    await choice()
    btn('Abrir estudo em ARA').click()
    await content(originalPericope)
    check('perícope antiga sem nova geração', window.geracoes.length === 2)
    btn('Gerar em NTLH').click()
    await choice()
    btn('Sim, gerar em NTLH').click()
    await content('Explicação na tradução NTLH')
    check('perícope só gera depois da confirmação', window.geracoes.length === 3)
    check('perícope adaptada a partir da original ARA', window.pedidos[2].estudoBase.texto === originalPericope && window.pedidos[2].textoBiblicoBase === 'Texto ara')
    window.falharConsulta = true
    await go(20)
    await until('erro de consulta visível', () => document.body.textContent.includes('Nenhuma geração foi iniciada'))
    check('falha de rede não gera material', window.geracoes.length === 3)
    window.falharConsulta = false
    await go(17, 'naa')
    await choice()
    btn('Sim, gerar em NAA').click()
    await content('Explicação na tradução NAA')
    check('primeiro estudo pode ter sido gerado em NTLH', window.pedidos[3].estudoBase.versaoBiblica === 'ntlh')
    await go(17, 'ara')
    await choice()
    btn('Sim, gerar em ARA').click()
    await content('Explicação na tradução ARA')
    check('terceira tradução usa a primeira, não a intermediária', window.pedidos[4].estudoBase.versaoBiblica === 'ntlh' && window.pedidos[4].estudoBase.texto === window.pedidos[3].estudoBase.texto)
    check('origem salva no cache da adaptação', JSON.parse(localStorage.getItem('salvation-ia-passagem:43:3:17~biblia_ara')).origemEstudo.versaoBiblica === 'ntlh')
    definirVersaoBiblica('ntlh')
    check('registros existentes preservados byte a byte', JSON.stringify(window.registros) === registrosAntes)
    check('tradução da leitura preservada', localStorage.getItem('biblia-versao-selecionada-v1') === 'ntlh')
  } catch (error) {
    results.push({ error: error.message, body: document.body.textContent.slice(-1800), geracoes: window.geracoes })
  }
  document.getElementById('results').textContent = JSON.stringify(results)
}
run()

import { useEffect, useRef } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { contarApresentacao, partesApresentacao } from '../utils/apresentacaoFormatada'

function serializar(campo) {
  const partes = []
  function adicionar(texto, negrito, italico) {
    const ultima = partes.at(-1)
    if (ultima && ultima.negrito === negrito && ultima.italico === italico) ultima.texto += texto
    else partes.push({ texto, negrito, italico })
  }
  function visitar(node, negrito = false, italico = false) {
    if (node.nodeType === 3) { adicionar(node.nodeValue || '', negrito, italico); return }
    if (node.nodeName === 'BR') { adicionar('\n', false, false); return }
    const peso = node.style?.fontWeight
    const n = peso === 'normal' || (peso && Number(peso) < 600) ? false : negrito || ['B', 'STRONG'].includes(node.nodeName) || peso === 'bold' || Number(peso) >= 600
    const i = node.style?.fontStyle === 'normal' ? false : italico || ['I', 'EM'].includes(node.nodeName) || node.style?.fontStyle === 'italic'
    if (['DIV', 'P'].includes(node.nodeName) && partes.length && !partes.at(-1).texto.endsWith('\n')) adicionar('\n', false, false)
    Array.from(node.childNodes || []).forEach((filho) => visitar(filho, n, i))
  }
  Array.from(campo.childNodes).forEach((node) => visitar(node))
  return partes.map(({ texto, negrito, italico }) => {
    const marca = negrito && italico ? '***' : negrito ? '**' : italico ? '*' : ''
    return texto ? `${marca}${texto}${marca}` : ''
  }).join('')
}

function preencher(campo, texto) {
  campo.replaceChildren()
  partesApresentacao(texto).forEach((parte) => {
    const node = document.createElement('span')
    node.textContent = parte.texto
    if (parte.tipo.includes('negrito')) node.style.fontWeight = '700'
    if (parte.tipo.includes('italico')) node.style.fontStyle = 'italic'
    campo.appendChild(node)
  })
}

export default function EditorApresentacao({ texto, alinhamento, limite, onTexto, onAlinhamento, label = 'Apresentação (opcional)', limiteBruto = 6000, disabled = false, minHeight = 110 }) {
  const ref = useRef(null)
  const selecao = useRef(null)
  const restantes = limite - contarApresentacao(texto)
  useEffect(() => { if (ref.current && serializar(ref.current) !== texto) preencher(ref.current, texto) }, [texto])
  function memorizar() {
    const atual = window.getSelection()
    if (atual?.rangeCount && ref.current?.contains(atual.anchorNode) && ref.current?.contains(atual.focusNode)) selecao.current = atual.getRangeAt(0).cloneRange()
  }
  function atualizar() {
    const novo = serializar(ref.current)
    if (contarApresentacao(novo) > limite || novo.length > limiteBruto) { preencher(ref.current, texto); return }
    onTexto(novo); memorizar()
  }
  function formatar(comando) {
    ref.current.focus()
    if (selecao.current && ref.current.contains(selecao.current.commonAncestorContainer)) {
      const atual = window.getSelection()
      atual.removeAllRanges(); atual.addRange(selecao.current)
    }
    document.execCommand(comando, false)
    atualizar()
  }
  return <Stack spacing={1}>
    <Stack direction="row" spacing={1}>
      <Button disabled={disabled} variant="outlined" sx={{ fontWeight: 800 }} onMouseDown={(event) => event.preventDefault()} onClick={() => formatar('bold')}>Negrito</Button>
      <Button disabled={disabled} variant="outlined" sx={{ fontStyle: 'italic' }} onMouseDown={(event) => event.preventDefault()} onClick={() => formatar('italic')}>Itálico</Button>
      <Button disabled={disabled} variant={alinhamento === 'justify' ? 'contained' : 'outlined'} aria-pressed={alinhamento === 'justify'} onClick={() => onAlinhamento(alinhamento === 'justify' ? 'left' : 'justify')}>Justificado</Button>
    </Stack>
    <Typography variant="body2">{label}</Typography>
    <Box ref={ref} contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-label={label} aria-multiline="true" aria-disabled={disabled}
      onInput={atualizar} onMouseUp={memorizar} onKeyUp={memorizar} onBlur={memorizar}
      onPaste={(event) => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); atualizar() }}
      onDrop={(event) => event.preventDefault()}
      sx={{ minHeight, maxHeight: 600, overflowY: 'auto', p: 1.5, border: '1px solid', borderColor: restantes < 0 ? 'error.main' : 'divider', borderRadius: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', textAlign: alinhamento === 'justify' ? 'justify' : 'left', '&:focus': { outline: '2px solid', outlineColor: 'primary.main' } }} />
    <Typography variant="caption" color={restantes < 0 ? 'error' : 'text.secondary'}>{Math.max(0, restantes)} caracteres restantes de {limite}. A formatação não entra na contagem.</Typography>
  </Stack>
}

// Validação estrutural e CRC do Pix Copia e Cola, sem modificar seus campos.
function crc16(valor) {
  let crc = 0xffff
  for (const byte of Buffer.from(valor, 'utf8')) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
function camposPix(valor) {
  const bytes = Buffer.from(valor, 'utf8')
  const campos = new Map()
  for (let i = 0; i < bytes.length;) {
    const cabecalho = bytes.subarray(i, i + 4).toString()
    if (!/^\d{4}$/.test(cabecalho)) throw new Error('Código Pix incompleto ou inválido.')
    const id = cabecalho.slice(0, 2)
    const tamanho = Number(cabecalho.slice(2))
    if (i + 4 + tamanho > bytes.length || campos.has(id)) throw new Error('Código Pix incompleto ou inválido.')
    campos.set(id, bytes.subarray(i + 4, i + 4 + tamanho).toString('utf8'))
    i += 4 + tamanho
  }
  return campos
}
function validarCopiaCola(valor) {
  const codigo = String(valor || '').trim()
  const campos = camposPix(codigo)
  if (campos.get('00') !== '01' || campos.get('53') !== '986' || campos.get('58') !== 'BR' || !campos.get('59') || !campos.get('60') || !codigo.endsWith('6304' + campos.get('63')) || crc16(codigo.slice(0, -4)) !== campos.get('63')?.toUpperCase()) throw new Error('Código Pix inválido. Cole novamente o código completo do banco.')
  const conta = camposPix(campos.get('26') || '')
  if (conta.get('00') !== 'br.gov.bcb.pix' || !conta.get('01')) throw new Error('Informe um Pix Copia e Cola com chave Pix.')
  return { codigo, chave: conta.get('01'), nome: campos.get('59'), cidade: campos.get('60'), valor: campos.get('54') }
}
module.exports = { crc16, validarCopiaCola }

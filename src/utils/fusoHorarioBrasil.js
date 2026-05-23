/** Datas “dia civil” em America/Sao_Paulo — gamificação e hábitos consistentes no Brasil. */

export function diaCivilAmericaSaoPaulo(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const d = parts.find((p) => p.type === 'day')?.value
    if (y && m && d) return `${y}-${m}-${d}`
  } catch {
    /* ignore */
  }
  const x = new Date(date)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const d = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function ontem(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Número de dias entre dois iso `YYYY-MM-DD` no calendário gregoriano (independente do fuso do dispositivo). */
export function diferencaDiasIso(isoEarlier, isoLater) {
  const pa = String(isoEarlier || '').split('-').map(Number)
  const pb = String(isoLater || '').split('-').map(Number)
  if (pa.length !== 3 || pb.length !== 3 || pa.some((n) => !Number.isFinite(n)) || pb.some((n) => !Number.isFinite(n))) {
    return NaN
  }
  const [y1, m1, d1] = pa
  const [y2, m2, d2] = pb
  const u1 = Date.UTC(y1, m1 - 1, d1)
  const u2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((u2 - u1) / 86400000)
}

export function subtrairDiasIso(isoDay, n) {
  const [y, m, d] = isoDay.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - n)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function adicionarDiasIso(isoDay, n) {
  const [y, m, d] = isoDay.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Segunda-feira da semana ISO da data local (componentes SP). */
export function chaveSemanaIsoSP(date = new Date()) {
  const iso = diaCivilAmericaSaoPaulo(date)
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

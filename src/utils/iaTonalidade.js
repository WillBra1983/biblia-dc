/**
 * Presets de tonalidade para os estudos gerados pela IA.
 *
 * Princípio arquitetural
 * ----------------------
 * O preset NÃO mexe no `systemInstruction` (que carrega `TEOLOGIA_BASE` + as
 * instruções estruturais da perícope/versículo). O preset entra no
 * `user-message` como um modificador pontual de pedido. Isso preserva os
 * invariantes hermenêuticos e doutrinários — e evita o problema de colisão
 * de regras quando o system prompt cresce demais.
 *
 * Quatro presets:
 *  - `pastoral`       — default; equilíbrio entre exegese, doutrina e aplicação.
 *  - `contemplativo`  — mais evocativo que explicativo; preserva silêncios.
 *  - `academico`      — mais gramatical/contextual; recua do registro devocional.
 *  - `conciso`        — máxima compressão; uma ideia por parágrafo.
 *
 * Persistência legada: `localStorage` (`salvation:ia-tom-preferido`). A geração
 * atual usa **tom integrado** (ver `addonTomIntegrado`) — sem escolha de tom
 * na interface. Chaves RTDB/cache antigas com sufixo `~tom` continuam legíveis.
 */

export const TOM_PADRAO = 'pastoral'

/**
 * Instrução única para a IA: mistura **interna** das matizes (exegético-pastoral,
 * contemplativo, acadêmico, conciso) ao longo do texto, **sem** rótulos nem
 * seções nomeadas para elas, e **sem** dedicar uma parte inteira do estudo
 * só a uma delas.
 *
 * @param {'pericope' | 'versiculo'} variante
 * @returns {string}
 */
export function addonTomIntegrado(variante = 'pericope') {
  const nucleo =
    'MODULAÇÃO INTERNA (obrigatório — não explique ao leitor que está fazendo isto; ' +
    '**não** use na resposta palavras como "tom", "pastoral", "contemplativo", "acadêmico" ou "conciso"; ' +
    '**não** crie subtítulos ou seções para nomear essas dimensões):\n' +
    'Integre ao longo de **todo** o material, **em cada parte relevante** do que você escrever, um **mosaico** natural das seguintes qualidades — conforme o texto bíblico abrir espaço (não force todas em todo parágrafo):\n' +
    '• equilíbrio entre exegese, doutrina reformada e aplicação ao coração;\n' +
    '• momentos mais evocativos ou contemplativos (deixe peso e tensão pairarem quando o trecho pedir);\n' +
    '• onde couber, precisão gramatical, contexto histórico-literário ou intertextualidade canônica (sem registro meramente devocional genérico);\n' +
    '• trechos mais comprimidos onde a redundância não ajudar.\n' +
    '**Não** reserve uma seção inteira só a uma dessas linhas; distribua-as ao longo do estudo conforme a passagem pedir.'

  if (variante === 'versiculo') {
    return (
      `${nucleo}\n` +
      'Em comentário mais curto, priorize prosa fluida: mesmo assim varie ritmo (denso / respirado / enxuto) sem rotular. ' +
      'O teto de caracteres é **máximo**, não meta: versículo simples pode exigir poucas linhas — **não** prolongue só para parecer extenso.'
    )
  }
  return nucleo
}

export const TONS_IA = [
  {
    id: 'pastoral',
    label: 'Pastoral',
    descricao: 'Equilíbrio entre exegese, doutrina reformada e aplicação ao coração.',
    addon: '' // default — não modifica o pedido (o system prompt já é pastoral)
  },
  {
    id: 'contemplativo',
    label: 'Contemplativo',
    descricao: 'Mais evocativo que explicativo; preserva silêncios e tensões abertas.',
    addon:
      'TONALIDADE DESTA RESPOSTA: contemplativa. Prefira **evocar** a explicar. ' +
      'Preserve silêncios, ambiguidades e tensões em aberto — não feche o circuito ' +
      'a todo parágrafo. Ritmo mais lento, frases mais curtas, menos conclusões fechadas. ' +
      'Deixe o peso do texto pairar sobre o leitor antes de desenvolver implicações.'
  },
  {
    id: 'academico',
    label: 'Acadêmico',
    descricao: 'Mais gramatical, histórico-literário e canônico; recuo do registro devocional.',
    addon:
      'TONALIDADE DESTA RESPOSTA: acadêmica. Aprofunde gramática, ' +
      'contexto histórico-literário, intertextualidade canônica e teologia bíblica reformada. ' +
      'Recue do registro devocional: nada de exortações diretas em segunda pessoa ' +
      '("você", "irmão"). Mantenha precisão exegética acima de calor pastoral. ' +
      'Pode citar literatura reformada (Calvino, Bavinck, Vos, Owen) quando agregar substância.'
  },
  {
    id: 'conciso',
    label: 'Conciso',
    descricao: 'Máxima compressão; uma ideia por parágrafo; sem ornamento.',
    addon:
      'TONALIDADE DESTA RESPOSTA: concisa. **Máxima compressão**. ' +
      'Uma ideia por parágrafo; sem ornamento; sem desenvolvimentos auxiliares. ' +
      'Para comentário de versículo: **teto** amplo, mas muitos trechos pedem só 700–1800 caracteres — pare quando estiver completo. ' +
      'Para perícope: encurte cada seção para o essencial; corte o que for redundante. ' +
      'O limite técnico **não** é obrigação de volume. Prefira frases curtas e diretas.'
  }
]

const STORAGE_KEY = 'salvation:ia-tom-preferido'

export function ehTomValido(id) {
  return typeof id === 'string' && TONS_IA.some((t) => t.id === id)
}

export function normalizarTom(id) {
  return ehTomValido(id) ? id : TOM_PADRAO
}

export function lerTomPreferido() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (ehTomValido(v)) return v
  } catch {
    /* localStorage indisponível */
  }
  return TOM_PADRAO
}

export function salvarTomPreferido(tom) {
  if (!ehTomValido(tom)) return false
  try {
    localStorage.setItem(STORAGE_KEY, tom)
    return true
  } catch {
    return false
  }
}

export function addonTom(tom) {
  const t = TONS_IA.find((x) => x.id === normalizarTom(tom))
  return t?.addon || ''
}

export function descricaoCurtaTom(tom) {
  const t = TONS_IA.find((x) => x.id === normalizarTom(tom))
  return t?.descricao || ''
}

export function rotuloTom(tom) {
  const t = TONS_IA.find((x) => x.id === normalizarTom(tom))
  return t?.label || ''
}

/**
 * Sufixo a aplicar nas chaves de **cache local** (localStorage) quando o
 * tom não é o padrão. `pastoral` mantém a chave antiga (sem sufixo) —
 * caches existentes seguem válidos.
 *
 * Usa `~` (e não `:`) para não colidir com o prefixo `peri:` usado em
 * chaves de votação no RTDB, mantendo a mesma convenção em todo lugar.
 */
export function sufixoChaveCacheTom(tom) {
  const t = normalizarTom(tom)
  return t === TOM_PADRAO ? '' : `~${t}`
}

/**
 * Sufixo a aplicar nas chaves do **Realtime Database** quando o tom não
 * é o padrão. Mesma convenção do cache local (`~tom`) — pastoral fica
 * sem sufixo para preservar todos os estudos já curados/candidatos.
 */
export function sufixoChaveRtdbTom(tom) {
  return sufixoChaveCacheTom(tom)
}

/**
 * Extrai o tom embutido em uma chave (cache local ou RTDB). Útil em
 * serviços e na Cloud Function. Default = pastoral quando não há sufixo.
 */
export function extrairTomDaChave(chave) {
  const idx = String(chave || '').indexOf('~')
  if (idx === -1) return { base: String(chave || ''), tom: TOM_PADRAO }
  return {
    base: String(chave).slice(0, idx),
    tom: normalizarTom(String(chave).slice(idx + 1))
  }
}

/**
 * Lista somente os IDs dos tons (na ordem de exibição).
 */
export const TONS_IDS = TONS_IA.map((t) => t.id)

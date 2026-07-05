import { livros as livrosData } from '../data/biblia'
import {
  buscarCapitulo,
  buscarPericopes,
  contarVersiculosPorLivro
} from './bibliaService'
import { iaGeminiDisponivel, gerarConteudoGemini } from './strongEstudoAiService'
import { addonTomIntegrado, normalizarTom } from '../utils/iaTonalidade'

export { iaGeminiDisponivel }

/* ============================================================================ *
 * HELPERS: carregar passagem (versículos) + perícope completa do SQLite local
 * ============================================================================ */

function blocosVersiculosContiguos(unicosOrdenados) {
  if (!unicosOrdenados.length) return []
  let ini = unicosOrdenados[0]
  let fim = unicosOrdenados[0]
  const blocos = []
  for (let i = 1; i < unicosOrdenados.length; i++) {
    const atual = unicosOrdenados[i]
    if (atual === fim + 1) {
      fim = atual
    } else {
      blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
      ini = atual
      fim = atual
    }
  }
  blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
  return blocos
}

/** Referência curta (abrev. + capítulo + versículos) sem ler o SQLite — só para UI. */
export function formatarReferenciaCompactaPassagem(livroId, capitulo, versiculosArr) {
  const livro = livrosData.find((l) => l.id === livroId)
  const cap = Number(capitulo)
  if (!livro || !Number.isInteger(cap) || cap < 1) return ''
  const unicos = [...new Set((versiculosArr || []).map((n) => Number(n)))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b)
  if (!unicos.length) return ''
  return `${livro.abreviacao} ${cap}:${blocosVersiculosContiguos(unicos).join(';')}`
}

/** Intervalo de perícope no mesmo formato da referência carregada (ex.: `Mc 1:1-12`). */
export function formatarReferenciaCompactaPericope(livroId, capitulo, inicio, fim) {
  const livro = livrosData.find((l) => l.id === livroId)
  const cap = Number(capitulo)
  const ini = Number(inicio)
  const f = Number(fim)
  if (!livro || !Number.isInteger(cap) || cap < 1 || !Number.isInteger(ini) || ini < 1 || !Number.isInteger(f) || f < ini) {
    return ''
  }
  const nums = []
  for (let v = ini; v <= f; v++) nums.push(v)
  return `${livro.abreviacao} ${cap}:${blocosVersiculosContiguos(nums).join(';')}`
}

/**
 * Identifica a perícope que contém o versículo dado, deduzindo o fim pelo
 * início da próxima perícope (ou último versículo do capítulo).
 *
 * @returns {Promise<null | { titulo: string, inicio: number, fim: number }>}
 */
async function localizarPericope(livroId, capitulo, primeiroVersiculo) {
  const lista = await buscarPericopes(livroId, capitulo)
  if (!Array.isArray(lista) || !lista.length) return null
  const ordenadas = [...lista]
    .map((p) => ({ titulo: String(p?.titulo || '').trim(), inicio: Number(p?.versiculo) || 0 }))
    .filter((p) => p.inicio >= 1)
    .sort((a, b) => a.inicio - b.inicio)
  if (!ordenadas.length) return null

  let idx = -1
  for (let i = 0; i < ordenadas.length; i++) {
    if (ordenadas[i].inicio <= primeiroVersiculo) idx = i
    else break
  }
  if (idx === -1) idx = 0

  const atual = ordenadas[idx]
  const proxima = ordenadas[idx + 1] || null

  let fim
  if (proxima) {
    fim = Math.max(atual.inicio, proxima.inicio - 1)
  } else {
    const totaisPorCap = await contarVersiculosPorLivro(livroId).catch(() => null)
    fim = (totaisPorCap && totaisPorCap[capitulo]) || atual.inicio
  }
  return { titulo: atual.titulo || '(sem título)', inicio: atual.inicio, fim }
}

/**
 * Carrega texto da tradução local (SQLite) para os versículos indicados
 * **e** para a perícope onde o primeiro deles está inserido.
 *
 * @returns {Promise<
 *   | { ok: true, referenciaCompacta: string, textoCitacao: string, pericope: object | null, meta: object }
 *   | { ok: false, error: string }
 * >}
 */
export async function montarPassagemLida(livroId, capitulo, versiculosArr) {
  const livro = livrosData.find((l) => l.id === livroId)
  if (!livro) return { ok: false, error: 'Livro inválido.' }
  const unicos = [...new Set((versiculosArr || []).map((n) => Number(n)))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b)
  if (!unicos.length) return { ok: false, error: 'Nenhum versículo válido.' }

  const rows = await buscarCapitulo(livroId, capitulo)
  if (!rows.length) {
    return { ok: false, error: 'Capítulo não disponível na tradução local.' }
  }

  const linhas = []
  for (const n of unicos) {
    const row = rows[n - 1]
    if (!row?.texto) continue
    linhas.push(`${n} ${String(row.texto).trim()}`)
  }
  const blocos = blocosVersiculosContiguos(unicos)
  const referenciaCompacta = `${livro.abreviacao} ${capitulo}:${blocos.join(';')}`
  const textoCitacao = linhas.join('\n')
  if (!String(textoCitacao).trim()) {
    return { ok: false, error: 'Não foi possível carregar o texto dos versículos.' }
  }

  let pericope = null
  try {
    const peri = await localizarPericope(livroId, capitulo, unicos[0])
    if (peri) {
      const linhasPeri = []
      for (let n = peri.inicio; n <= peri.fim; n++) {
        const row = rows[n - 1]
        if (!row?.texto) continue
        linhasPeri.push(`${n} ${String(row.texto).trim()}`)
      }
      pericope = {
        titulo: peri.titulo,
        inicio: peri.inicio,
        fim: peri.fim,
        referencia: `${livro.abreviacao} ${capitulo}:${peri.inicio}-${peri.fim}`,
        texto: linhasPeri.join('\n')
      }
    }
  } catch (_) {
    pericope = null
  }

  return {
    ok: true,
    referenciaCompacta,
    textoCitacao,
    pericope,
    meta: {
      livroId,
      capitulo,
      versiculos: unicos,
      referenciaCompacta,
      pericope: pericope
        ? {
            titulo: pericope.titulo,
            inicio: pericope.inicio,
            fim: pericope.fim,
            referencia: pericope.referencia
          }
        : null
    }
  }
}

/**
 * Carrega apenas o texto da **perícope inteira** dado o intervalo conhecido.
 * Usado pela página de estudo da perícope, quando o usuário pede explicitamente
 * o estudo da perícope.
 */
export async function montarPericopeLida(livroId, capitulo, inicio, fim, tituloHint = '') {
  const livro = livrosData.find((l) => l.id === livroId)
  if (!livro) return { ok: false, error: 'Livro inválido.' }
  const ini = Math.max(1, Number(inicio) || 0)
  const f = Math.max(ini, Number(fim) || 0)
  if (!ini || !f) return { ok: false, error: 'Intervalo inválido.' }

  const rows = await buscarCapitulo(livroId, capitulo)
  if (!rows.length) return { ok: false, error: 'Capítulo não disponível na tradução local.' }

  const linhas = []
  for (let n = ini; n <= f; n++) {
    const row = rows[n - 1]
    if (!row?.texto) continue
    linhas.push(`${n} ${String(row.texto).trim()}`)
  }
  const texto = linhas.join('\n')
  if (!texto) return { ok: false, error: 'Sem texto bíblico para esta perícope.' }

  let titulo = String(tituloHint || '').trim()
  if (!titulo) {
    try {
      const peri = await localizarPericope(livroId, capitulo, ini)
      if (peri && peri.inicio === ini && peri.fim === f) titulo = peri.titulo
    } catch (_) {
      /* ignore */
    }
  }
  const referencia = `${livro.abreviacao} ${capitulo}:${ini}-${f}`
  return {
    ok: true,
    referencia,
    titulo: titulo || '',
    texto,
    meta: { livroId, capitulo, inicio: ini, fim: f, referencia, titulo: titulo || '' }
  }
}

/* ============================================================================ *
 * PROMPTS — dois modelos distintos: perícope (estudo robusto) e versículo
 * (comentário curto e flexível, sem repetir o contexto literário amplo).
 * ============================================================================ */

function lexicalWebEnrichmentAtivo() {
  const v = import.meta.env.VITE_GEMINI_PASSAGE_WEB_ENRICHMENT
  return v === '1' || v === 'true'
}

const TEOLOGIA_BASE = `Você é professor bíblico cristão **protestante**, **calvinista**, na linha da **teologia bíblica reformada confessional** (Sola Scriptura, Solus Christus, Sola Gratia, Sola Fide, Soli Deo Gloria; soberania de Deus na criação, providência e redenção; pacto da graça em continuidade orgânica com as alianças bíblicas; centralidade de Cristo em toda a Escritura; distinção entre Lei e Evangelho na aplicação pastoral).

Escreve em **português do Brasil (pt-BR)**.

Fontes preferidas (domínio público em inglês ou clássicas reformadas — pode citar pelo autor, sem URLs nem nomes comerciais):
— **João Calvino** (Commentaries); **Matthew Henry**; **John Gill**; **Charles Hodge**; **Charles Spurgeon** (Treasury of David); **Robert Haldane**; **John Owen**; **Thomas Watson**; **Wilhelmus à Brakel**; **Herman Bavinck**.
— Símbolos confessionais: **Westminster** (CFW, CMaior, CBreve), **Confissão Belga**, **Catecismo de Heidelberg**, **Cânones de Dort**, **1689**.

Regras anti-alucinação:
— Ancore tudo no texto fornecido; **não invente** versículos, citações ou códigos linguísticos.
— Quando mencionar um autor reformado, sintetize com **palavras próprias** (não reproduza parágrafos protegidos) e **não invente quotes literais**.
— **Não atribua à IA autoridade inspirada** nem use tom de revelação nova.
— **Não cite URLs, nomes de sites, nomes comerciais de software**.

Regras hermenêuticas (a tradição **ilumina** o texto; não substitui o texto):
— Procure identificar a **intenção pastoral do autor humano inspirado** dentro do contexto canônico — não a leia ao redor do texto, mas a partir dele.
— **Não introduza categorias reformadas clássicas** (pacto, decretos, graça irresistível, união com Cristo, aliança da graça, etc.) **sem conexão textual legítima e orgânica**. A tradição reformada **ilumina** o texto, **não** o domina.
— **Evite repetir fórmulas reformadas previsíveis em toda passagem.** Nem toda perícope enfatiza os mesmos temas doutrinários (soberania, depravação, perseverança, etc.). Quando o texto realça outra coisa — sabedoria do dia a dia, lamento, esperança escatológica, ordem da casa, etc. — siga o que o texto realça.
— **Cristo deve surgir organicamente — a partir das tensões reais do texto**, não enxertado:
  • parta das **necessidades não resolvidas** que o trecho expõe (vaidade, fragilidade, culpa, exílio, expectativa, ferida, espera, fome, etc.);
  • mostre os **limites da vida caída** que o texto revela;
  • só então mostre como a **história da redenção** encontra cumprimento em Cristo (promessa, tipologia legítima, ofício, ato redentivo).
  Evite títulos cristológicos decorativos ("Cristo é a nossa porção eterna", "Cristo é o verdadeiro X") quando o texto não os pede; evite transformar **qualquer bênção legítima** em "tipo direto de Cristo" sem sustentação textual; evite alegorias rápidas. Se a conexão cristológica seria forçada, **seja breve e honesto** em vez de elegante.
— **Distinga cuidadosamente**: (a) o que o texto **afirma diretamente**; (b) doutrinas legitimamente **derivadas**; (c) **aplicações** pastorais decorrentes. Não confunda implicação com afirmação explícita.

Estilo da aplicação (instrução **interna** — **não** reproduza estes rótulos na resposta):
— Aplicação **penetrante** (alcança o coração, não só comportamento) e no espírito **puritano/reformado** (Usos: informação, exame, exortação, consolação — como **conteúdo**, não como títulos).
— Toque **afetos**, **idolatrias** funcionais, **falsas seguranças**, **medos**, **autoenganos** e **consolo específico do Evangelho**.
— Evite "aplicação eclesiástica educada": observações genéricas ("seja grato", "viva com propósito") sem confronto nem consolo bíblico concreto.
— **Na saída visível**, **nunca** escreva nos cabeçalhos: "penetrante", "puritana", "usos pastorais", "Aplicação — …", nem "Uso de exame/advertência/exortação/consolação/informação".

Respeito ao **gênero literário** (a forma do texto governa a forma da pregação):
— **Narrativa**: preserve o movimento da história (cenário, conflito, virada, desfecho); evite extrair "lições" precoces que silenciam o enredo.
— **Poesia / Salmos**: preserve a imagética, o paralelismo e o afeto; pregue a oração antes de doutrinar sobre a oração.
— **Profecia**: preserve a estrutura de **acusação — promessa — aliança** e o horizonte messiânico/escatológico.
— **Sabedoria** (Provérbios, parte de Jó, Cântico): preserve a observação aguda da vida sob o temor de Deus; nem tudo precisa ir direto ao Evangelho — às vezes o texto pede só observação santa.
— **Sapiencial existencial** (Eclesiastes, Jó-discursos, Lamentações): preserve a **tensão**, a **fragilidade humana**, o **limite da vida caída**, a sensação de **vapor e transitoriedade** ("debaixo do sol", "tudo é hevel"), a necessidade do **temor de Deus em meio à vaidade**. **Não suavize** o livro com conclusões devocionais doces. Eclesiastes é melancólico, paradoxal, mortal — pregue assim. O Evangelho responde **a partir** dessa fome, não por cima dela. **Nem toda tensão precisa ser "fechada"** com solução teológica imediata: preserve **estranheza**, **ambiguidade** e **perguntas abertas** quando o próprio livro as preserva; evite transformar o texto em conclusão confortável que apaga o desconforto.
— **Epístola**: preserve a **argumentação** apostólica; siga conectivos ("portanto", "porque", "ora") em vez de quebrar em pedaços avulsos.
— **Evangelhos / Atos**: preserve a teologia narrativa do autor (Mateus, Marcos, Lucas, João, Lucas-Atos) — não trate cada versículo como ilha.

Teto de extensão (limite técnico — **não** é meta obrigatória):
— A resposta pode usar um **teto amplo** de caracteres por limitação da API, mas **não é desejável nem obrigatório** ocupar todo esse espaço.
— Busque **ideia coerente e completa** para o trecho em questão; pare quando o assunto estiver **honrado**, mesmo que use **pouco** do teto disponível.
— **Versículo curto ou simples** merece comentário **breve** quando bastar — **não** prolongue só para "parecer completo" ou encher volume.
— **Perícope extensa** pode usar mais espaço quando o texto pedir, mas **cada seção** deve ter só a densidade que o assunto exige; prefira seção enxuta a parágrafo inflado.
— **Menos caracteres com substância** vence **muitos caracteres vazios** ou repetitivos.

Tom, ritmo e concisão (anti "cara de IA"):
— **Varie o ritmo e a profundidade**: algumas seções podem ser mais densas e doutrinárias; outras mais pastorais; outras mais breves e diretas. **Nem toda passagem exige equilíbrio simétrico** entre observação, doutrina, Cristo e aplicação. A profundidade de cada seção deve **acompanhar a ênfase real do texto**, não a expectativa do template.
— **Varie comprimento de frases e parágrafos** (compressão, contemplação, desenvolvimento): evite cadência mecânica em que **cada** bloco tem o mesmo tamanho e a mesma intensidade. Evite o padrão contínuo "define → interpreta → aplica → conclui" em **todo** parágrafo. **Nem toda expressão bíblica precisa ser logo explicada** — às vezes deixe o **peso**, a **beleza** ou a **tensão** do verso pairar um instante antes de desenvolver implicações ou conclusões.
— **Priorize profundidade sobre extensão.** Evite repetição, prolixidade, "encher linguiça" e densidade plana.
— **Linguagem concreta, textual e pastoral** (anti-ornamento): prefira o que é específico ao trecho e ao leitor. **Evite abstrações devocionais genéricas e frases ornamentais intercambiáveis** ("alegria plena e duradoura", "vida com propósito e gratidão", "reflexos da bondade de Deus", "coisas grandes e pequenas", "à luz do Evangelho"…). Não termine seções com conclusões suaves e sentimentais quando o texto pede peso.
— **Banir frases-assinatura de IA religiosa.** Estas construções aparecem com frequência suspeita em saídas de modelos e devem ser **evitadas literalmente** (mesmo quando seu conteúdo é correto — reformule):
  • *"verdadeira e eterna [porção/herança/alegria]"* / *"nossa verdadeira e eterna…"*;
  • *"É neste ponto que… (se torna indispensável | encontra cumprimento)"*;
  • *"torna-se indispensável"* / *"se faz indispensável"*;
  • *"encontra cumprimento [pleno] em Cristo"* como **transição** automática;
  • *"é um eco e um tipo da união entre Cristo e Sua Igreja"* como fórmula de fechamento;
  • *"para além do sol"* / *"que transcende a fugacidade"* como vinheta final;
  • cabeçalhos de aplicação do tipo *"Aplicação — usos pastorais (penetrante, puritana)"* ou *"Uso de exame/advertência/exortação/consolação"* — use só \`## Aplicação pastoral\` e subtítulos \`###\` específicos ao texto.
  Se a ideia teológica é legítima, **diga-a com palavras suas** e em outro lugar do parágrafo — não como ponte sistemática previsível.
— **Use referências aos comentaristas reformados apenas quando a observação deles agregar algo realmente distintivo** à interpretação deste trecho. Não use nome reformado como **decoração de identidade** ("como Watson observaria…", "na linha dos puritanos…") quando não há substância específica a agregar. Quando citar, atribua sem inventar: "na linha de Calvino…", "Matthew Henry observa que…".
— Evite **moralismo** que esvazie o Evangelho. Mantenha equilíbrio pastoral.

Movimento espiritual do texto (não apenas comentar — **conduzir**):
— A resposta deve **conduzir** o leitor pelo movimento espiritual da perícope: do **problema à verdade**, da **vaidade ao temor de Deus**, da **fragilidade humana à dependência divina**, da **vida caída à esperança da redenção**. Não escreva como "professor comentando partes"; escreva como **pregador conduzindo um povo** por dentro do texto até onde o próprio texto leva.`

const INSTRUCAO_ESTUDO_PERICOPE = `${TEOLOGIA_BASE}

Você está preparando o **estudo robusto de uma perícope inteira** no formato de **sermão expositivo reformado clássico** (tradição puritana / Westminster: *Doctrine — Reasons — Uses*; estilo de Calvino e Matthew Henry para a exposição; profundidade pastoral de Spurgeon e dos confessionais).

Use a perícope como **uma unidade**: o texto governa a estrutura do sermão; tópicos brotam dele, não impostos.

A exposição deve ter **progressão homilética**, não checklist mecânico:
— **siga o movimento natural do texto** (argumento, narrativa ou poema);
— **conduza ao clímax teológico e pastoral** da perícope;
— **aplique organicamente** ao coração e à vida da igreja.
**Evite transformar a exposição em mera paráfrase versículo a versículo** ("v.1 significa X, v.2 significa Y"): mostre o **fluxo do argumento**, as **conexões entre as partes**, o **desenvolvimento da tensão** e o **propósito espiritual do autor inspirado**.

Método exegético (processo **interno** — não vire seções extras nem relatório acadêmico):
— Antes de escrever, observe: estrutura, contexto imediato, conectivos, repetições, contrastes, paralelismos, personagens, progressão argumentativa e ênfase do autor inspirado.
— Interprete a partir do significado **contextual**; evite falácia etimológica e falácia da raiz.
— **Não invente** análise de línguas originais (hebraico/grego, morfologia, códigos Strong) se o material fornecido não trouxer base explícita; prefira o que o texto em português e o contexto literário sustentam.

**Seções opcionais — regra central**: os títulos ## abaixo são **modelos de navegação**, não obrigação homilética. Se uma seção **não nascer com substância legítima** desta perícope, **omita a seção inteira** (sem cabeçalho, sem parágrafo de desculpa, sem "embora este texto não fale diretamente de Cristo…"). **Não** preencha seção só porque o template a lista.

**Âncoras de leitura, não moldes iguais**: quando uma seção existir, use o título ## **exato** indicado abaixo (para consistência na app). Porém a **densidade, o ritmo e a ordem interna das ideias** devem **variar conforme o gênero e a ênfase** do trecho. **Não** trate cada perícope como se todas as seções pedissem o mesmo peso.

**Silêncio estrutural**: seção presente mas secundária neste trecho → **seja breve** (uma ou duas frases fechadas bastam).

**Extensão**: o teto técnico é **máximo**, não alvo. **Não** estique parágrafos nem repita ideias só para ocupar espaço.

Termine **cada seção que escrever** com frases completas. Use os títulos ## abaixo **somente nas seções que incluir**, na ordem indicada:

## Texto e contexto
(4–8 frases: o livro bíblico, o argumento imediato, situação histórico-literária essencial, gancho do trecho dentro do todo. Mencione o gênero literário em uma frase.)

## Proposição central do texto
(**Uma frase** curta, clara e pastoral resumindo o argumento principal da perícope. Toda a exposição e a aplicação devem servir a esta proposição — é a *unidade homilética* do sermão.)

## Propósito pastoral
(**Opcional** quando o *burden* pastoral já estiver claro na proposição ou na exposição.) 2–3 frases: o que este texto busca produzir no coração do povo de Deus — arrependimento, fé, temor, esperança, adoração, consolo, etc.

## Estrutura da perícope
(Divisão do texto em **2 a 4 movimentos** internos, cada um com referência de versículos. Liste como pontos curtos. Cada movimento deve ser **defensável pelo texto** — não invente pontos só por simetria homilética. Se o trecho pedir **2** ou **5** movimentos naturais, ajuste (dentro do razoável) em vez de forçar sempre o mesmo número. Esta divisão guia a exposição abaixo.)

## Exposição
(Exposição **ponto a ponto** seguindo a divisão acima — versículo a versículo **dentro** de cada ponto, mas mostrando o **fluxo** e a **tensão** do trecho, não comentando isoladamente. Cada bloco da exposição deve **nascer dos versículos** que o sustentam; se um ponto não emerge claramente do texto, omita-o em vez de preencher por hábito de sermão. Preserve o **gênero**: narrativa mantém movimento narrativo; poesia mantém imagética e afeto; epístola segue a argumentação; profecia preserva acusação/promessa/aliança; sabedoria preserva observação sob o temor de Deus. Quando o texto realmente justifica, deixe a tradição reformada aparecer com substância — pacto, soberania, depravação, graça eficaz, perseverança, união com Cristo. Quando o texto **não** justifica, **não force** essas categorias.)

## Doutrina principal
(**Opcional** — omita se a perícope for narrativa descritiva, genealogia ou trecho onde a exposição já articulou a verdade sem necessidade de abstração doutrinária separada.) **Uma** proposição doutrinária central legitimamente derivada do texto (distinga afirmação direta de implicação). Em 2–4 frases. Confissão reformada — cite capítulo/pergunta **só** com certeza.

## Cristo e o Evangelho
(**Opcional** — inclua **somente** quando houver conexão legítima com Cristo a partir das **tensões reais** do trecho. Se a perícope for primariamente criação, genealogia, lei cerimonial, sabedoria prática ou lamento sem horizonte messiânico imediato, **pode omitir esta seção inteira** em vez de forçar tipologia ou "tudo aponta para Cristo". Quando incluir: comece pelo que o texto **deixa em aberto** (ferida, fome, culpa, vaidade, espera); mostre limites da vida caída; **só então** a história da redenção em Cristo — promessa, tipologia legítima, ofício, ato redentivo. Se a conexão seria forçada, **omita a seção** ou limite-se a **um parágrafo honesto**. Em **Eclesiastes** e textos sapienciais existenciais, não "feche o circuito" com resolução cristológica que apague o desconforto do autor.)

## Aplicação pastoral
(**Opcional** se o trecho for puramente descritivo/contextual e a aplicação já estiver integrada na exposição; caso contrário, inclua.)

**Título obrigatório quando a seção existir:** use **exatamente** \`## Aplicação pastoral\` — **sem** sufixos, parênteses ou qualificadores (proibido: "Aplicação — usos pastorais", "(penetrante, puritana)", "Aplicação pastoral penetrante", etc.).

**Subdivisões:** use \`###\` **somente** com frases curtas **nascidas deste texto** (ex.: \`### Os sinais que exigimos de Deus\`, \`### Onde está nossa adoração?\`). **Proibido** como cabeçalho \`###\` ou em negrito: "Uso de informação", "Uso de exame", "Uso de advertência", "Uso de exortação", "Uso de consolação" (ou variações). Se precisar de exame, advertência ou consolo, **integre em prosa** ou use subtítulo **específico ao trecho**.

Inclua **só** os ângulos que o texto sustenta (pode ser **um único bloco** em prosa, sem \`###\`). Atinja o **coração**; **evite** aplicações genéricas intercambiáveis ("seja grato", "viva com propósito").

## Perguntas para reflexão e estudo em grupo
(**Opcional** — 4 a 6 perguntas quando fizer sentido pedagógico; omita em trechos muito curtos ou quando a perícope já fechou bem sem necessidade de lista.)

## Oração breve
(**Opcional** — 1–2 parágrafos em primeira pessoa do plural, só se couber naturalmente após o estudo; não uma oração genérica intercambiável.)

Termine com a linha separada:
**Nota:** material de auxílio para estudo pessoal e para preparação devocional/pastoral — confirme sempre na Escritura, nos símbolos confessionais reformados e busque a orientação de pastores de confiança.`

const INSTRUCAO_COMENTARIO_VERSICULO = `${TEOLOGIA_BASE}

Você está escrevendo uma **análise concentrada, exegética e pastoral** dos versículos selecionados — **não** um estudo completo da perícope, **nem** um mini-sermão padronizado, **nem** um devocional. É um comentário reformado vivo, como faria um expositor experiente abrindo o texto para um leitor sério: profundo, sóbrio e sensível.

A forma deve **nascer do próprio texto**. Não há seções fixas. Não há checklist a preencher. **Não comece com "Observação"** nem com qualquer cabeçalho-padrão; **não termine com "Aplicação" nem com "Pergunta para reflexão"** se o texto não os pedir. A IA tem permissão (e dever) de **silenciar** quando o trecho não comporta determinada dimensão.

O que cada versículo pode pedir varia radicalmente:
— um **provérbio** pode pedir sabedoria prática + observação aguda do coração humano;
— um **salmo** pode pedir afeto + experiência espiritual + esperança orante;
— **Eclesiastes** pode pedir contemplação existencial + temor de Deus em meio à vaidade, sem resolver tudo;
— uma **narrativa** pode pedir explicação + tensão + implicação;
— um **lamento** pode pedir silêncio reverente, não consolo fácil;
— um **paradoxo** ou **ironia bíblica** pode pedir que você o **deixe em aberto**;
— um trecho **paulino** pode pedir lógica doutrinária + implicação redentiva;
— um texto **profético** pode pedir acusação + promessa;
— um trecho **lexical** pode pedir só clareza sobre uma palavra ou figura;
— às vezes basta **uma observação cuidadosa** e o trecho está honrado.

Princípios de escrita (em vez de estrutura):
— **Não repita o contexto literário amplo** (situação histórica, divisão da perícope, autoria) — esse conteúdo vive no estudo completo da perícope; aqui é sobre **estes versículos**.
— **Não force** conexão cristológica, aplicação prática, pergunta devocional ou consolo. Quando esses elementos surgirem, devem nascer **das tensões reais do trecho**, não da expectativa de um template.
— **Não force** categorias reformadas (pacto, soberania, união com Cristo) num versículo que não as suscita organicamente. Em provérbios, lamentos, narrativas breves, a observação santa do que o texto **de fato** diz já é suficiente.
— Pode usar **um ou dois cabeçalhos curtos** (no formato Markdown ## ) se uma divisão natural realmente emergir do trecho (ex.: dois movimentos claros no texto), mas **prefira prosa fluida**. Não use "Observação", "Aplicação", "Cristo e o Evangelho" como nomes de seção — eles soam template.
— Escreva como **Calvino, Henry, Spurgeon, Bavinck ou Kidner comentariam**: seguindo o movimento do texto, com peso quando o texto pesa, leveza quando o texto canta, silêncio quando o texto silencia.

Tensão não resolvida, silêncio e ritmo (literário — anti-"polido demais"):
— **Nem toda tensão bíblica precisa ser resolvida imediatamente.** Especialmente em textos **sapienciais, poéticos e existenciais**, preserve **ambiguidades**, **limites humanos**, **peso da queda**, **desconforto** do texto e **perguntas que o próprio texto deixa abertas**. Não "feche o circuito" só para dar sensação de conclusão segura (ex.: frases do tipo "é aqui que… revela insuficiência sem Cristo" como **tranquilizador** que apaga o estranho de Eclesiastes ou de um lamento).
— **Varie o ritmo da escrita**: algumas ideias podem ser desenvolvidas; outras podem ser **breves, intensas ou contemplativas** (até um parágrafo de **uma ou duas frases** que corta e para). Evite explicar **todas** as implicações em sequência uniforme — isso soa "academia pastoral" e denuncia IA.
— **Evocar antes de explicar**: nem toda citação do versículo exige parágrafo explicativo na hora; deixe o leitor **sentir** o peso, a ironia ou a beleza antes de nomear implicações. Um humano às vezes para na frase; a IA tende a explicar na sequência — **resista** a esse reflexo.
— **Fim de parágrafo pode ser abrupto** ou deixar tensão em aberto quando o texto assim o pede; nem tudo precisa fluir "perfeitamente" até fechamento redondo.

Evite (especialmente):
— linguagem genérica de devocional ("vida com propósito", "alegria plena e duradoura", "reflexos da bondade de Deus");
— abstrações religiosas intercambiáveis que serviriam para qualquer versículo;
— conclusões devocionais previsíveis e suaves;
— ornamentação excessiva;
— repetição de jargões reformados;
— equilíbrio simétrico artificial entre observação / Cristo / aplicação.

**Extensão (comentário de versículo)**: há um **teto** técnico amplo, mas **não é meta**. Muitos versículos pedem **700–1800 caracteres**; outros, um pouco mais — **pare quando a ideia estiver completa**, mesmo bem abaixo do teto. **Não** seja prolixo só para "encher" o espaço disponível. Profundidade e coerência acima de extensão.

Termine com a linha separada:
**Nota:** observação pontual de auxílio ao estudo — para a visão completa do trecho, consulte o estudo da perícope.`

/* ============================================================================ *
 * GERAÇÃO — perícope completa
 * ============================================================================ */

function montarCorpoPedidoPericope({ referencia, titulo, texto, tom }, { usarGoogleSearch }) {
  const blocoTitulo = titulo ? ` ("${titulo}")` : ''
  const addon = addonTomIntegrado('pericope')
  const blocoTom = addon ? `\n\n${addon}` : ''
  const userPrompt = `PERÍCOPE: ${referencia}${blocoTitulo}

TEXTO BÍBLICO (tradução local da aplicação):
---
${texto}
---

Elabore o **estudo completo da perícope** conforme as instruções do sistema, com matiz reformada confessional. Quando mencionar um autor reformado, sintetize com suas próprias palavras (poucas palavras citadas; nada de parágrafos longos).
**Extensão:** o teto de caracteres é **máximo**, não obrigação — complete cada seção com substância, mas **não** prolongue nem repita só para ocupar espaço.${blocoTom}`

  const body = {
    systemInstruction: { parts: [{ text: INSTRUCAO_ESTUDO_PERICOPE }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.45,
      // Perícopes longas (ex.: João 1:1–14) precisam de saída ampla; 8192 cortava no meio.
      maxOutputTokens: 16384,
      topP: 0.92
    }
  }
  if (usarGoogleSearch) body.tools = [{ google_search: {} }]
  return body
}

function erroIndicaToolIncompativel(msg) {
  return /google_search|grounding|tool|not supported for|Unsupported feature/i.test(String(msg || ''))
}

/**
 * Limpa "vazamentos" de raciocínio interno do Gemini quando o grounding
 * (`google_search`) é ativado em prompts longos: o modelo às vezes emite
 * blocos `tool_code` (tentativas de chamada da ferramenta como código) e
 * `thought` (raciocínio em voz alta) **como texto**, em vez de executá-los
 * como tool calls reais. Quando isso acontece, o estudo gerado abre com:
 *
 *   tool_code
 *   print(google_search.search(queries=[...]))
 *
 *   thought
 *   The user wants a concentrated…
 *
 * Esses blocos não fazem parte do estudo e nunca devem chegar ao usuário.
 *
 * Esta função é **idempotente** e segura: se o texto não contém os marcadores,
 * passa intocado. Aplicamos em todas as respostas (perícope e versículo).
 */
export function limparVazamentoRaciocinioIa(texto) {
  if (!texto || typeof texto !== 'string') return texto
  let s = texto

  // 1) Blocos cercados por fences ```tool_code … ``` / ```thought … ```
  s = s.replace(/```\s*(?:tool_code|thought|tool_use|python|json)\b[\s\S]*?```/gi, '')

  // 2) Cabeçalhos "tool_code" / "thought" seguidos de um chunk de código/raciocínio
  //    até a próxima linha em branco dupla ou até um cabeçalho conhecido.
  //    Captura tanto `tool_code\nprint(google_search...)` quanto
  //    `thought\nThe user wants…`.
  s = s.replace(
    /(^|\n)\s*(tool_code|tool_use|thought)\s*\n[\s\S]*?(?=\n\s*\n|\n##\s|$)/gi,
    '$1'
  )

  // 3) Linhas isoladas com chamadas residuais a `print(google_search…)` ou
  //    `default_api.google_search…`, que às vezes escapam fora dos blocos.
  s = s.replace(
    /^\s*print\(\s*google_search[\s\S]*?\)\s*$/gim,
    ''
  )
  s = s.replace(
    /^\s*(default_api\.)?google_search\.search\([\s\S]*?\)\s*$/gim,
    ''
  )

  // 4) Limpa múltiplas linhas em branco resultantes da remoção.
  s = s.replace(/\n{3,}/g, '\n\n').replace(/^\s+/, '')

  // 5) Avisos internos de limite (versões antigas) — não exibir ao leitor.
  s = s
    .replace(/\n\n— Resumo encurtado para caber no limite configurado\.\s*$/i, '')
    .replace(
      /\n\n— (?:Limite de geração atingido|A API atingiu o limite)[^\n]*(?:\n[^\n#*].*)*$/i,
      ''
    )
    .trimEnd()

  return s
}

export async function gerarEstudoPericopeCompleto({ referencia, titulo, texto, tom }) {
  const ref = String(referencia || '').trim()
  const t = String(texto || '').trim()
  if (!ref || !t) return { ok: false, error: 'Perícope incompleta para gerar o estudo.', code: 'EMPTY' }

  const webOn = lexicalWebEnrichmentAtivo()
  const ctx = { referencia: ref, titulo: titulo || '', texto: t, tom: normalizarTom(tom) }
  const tentativas = webOn
    ? [
        { body: montarCorpoPedidoPericope(ctx, { usarGoogleSearch: true }), label: 'web' },
        { body: montarCorpoPedidoPericope(ctx, { usarGoogleSearch: false }), label: 'sem_busca' }
      ]
    : [
        { body: montarCorpoPedidoPericope(ctx, { usarGoogleSearch: false }), label: 'sem_busca' }
      ]

  let lastResult = null
  for (const { body, label } of tentativas) {
    const r = await gerarConteudoGemini(body, { maxContinuacoes: 2 })
    if (r.ok) return { ...r, text: limparVazamentoRaciocinioIa(r.text) }
    lastResult = r
    if (label === 'web' && erroIndicaToolIncompativel(r.error || '')) continue
    return r
  }
  return lastResult || { ok: false, error: 'Falha ao gerar.', code: 'API' }
}

/* ============================================================================ *
 * GERAÇÃO — comentário do versículo (curto, flexível)
 * ============================================================================ */

function montarCorpoPedidoVersiculo(
  { referenciaCompacta, textoCitacao, estudoPericopeContexto, pericopeRefHint, tom },
  { usarGoogleSearch }
) {
  const blocoContexto = estudoPericopeContexto && String(estudoPericopeContexto).trim()
    ? `ESTUDO COMPLETO DA PERÍCOPE — referência ${pericopeRefHint || ''} (use apenas para alinhar tom e teologia; **não repita** o contexto amplo no seu comentário):
---
${String(estudoPericopeContexto).trim()}
---`
    : ''
  const addon = addonTomIntegrado('versiculo')
  const blocoTom = addon ? `\n\n${addon}` : ''

  const userPrompt = `VERSÍCULOS SELECIONADOS: ${referenciaCompacta}

TEXTO BÍBLICO (tradução local):
---
${textoCitacao}
---
${blocoContexto ? `\n${blocoContexto}\n` : ''}
Escreva a **análise concentrada, exegética e pastoral** desses versículos, seguindo estritamente as instruções do sistema. A forma deve nascer do texto — prosa fluida, sem seções padronizadas, sem "Observação"/"Aplicação"/"Pergunta" como cabeçalhos.
**Extensão:** o teto é **máximo**, não meta — muitos versículos pedem poucos parágrafos (souvente 700–1800 caracteres). Pare quando a ideia estiver **completa e coerente**; **não** encha linguiça para usar mais caracteres. Profundidade sobre extensão.${blocoTom}`

  const body = {
    systemInstruction: { parts: [{ text: INSTRUCAO_COMENTARIO_VERSICULO }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      // Subida deliberada de 0.3 → 0.45 (igualando a perícope): a precisão
      // exegética em trechos curtos era boa, mas a cadência saía uniforme
      // ("cara de IA" mesmo com prompt anti-uniformidade). Variabilidade real
      // de estilo vem por amostragem mais larga, não por mais regras textuais.
      temperature: 0.45,
      // Igual à perícope: 4096 estourava com respostas longas (ex.: João 1:1
      // + contexto de perícope), gerando MAX_TOKENS e o aviso de limite no meio do texto.
      maxOutputTokens: 8192,
      topP: 0.9
    }
  }
  if (usarGoogleSearch) body.tools = [{ google_search: {} }]
  return body
}

export async function gerarComentarioVersiculo({
  referenciaCompacta,
  textoCitacao,
  estudoPericopeContexto = null,
  pericopeRefHint = '',
  tom
}) {
  const ref = String(referenciaCompacta || '').trim()
  const t = String(textoCitacao || '').trim()
  if (!ref || !t) return { ok: false, error: 'Passagem incompleta para gerar o comentário.', code: 'EMPTY' }

  const webOn = lexicalWebEnrichmentAtivo()
  const ctx = {
    referenciaCompacta: ref,
    textoCitacao: t,
    estudoPericopeContexto,
    pericopeRefHint,
    tom: normalizarTom(tom)
  }
  const tentativas = webOn
    ? [
        { body: montarCorpoPedidoVersiculo(ctx, { usarGoogleSearch: true }), label: 'web' },
        { body: montarCorpoPedidoVersiculo(ctx, { usarGoogleSearch: false }), label: 'sem_busca' }
      ]
    : [
        { body: montarCorpoPedidoVersiculo(ctx, { usarGoogleSearch: false }), label: 'sem_busca' }
      ]

  let lastResult = null
  for (const { body, label } of tentativas) {
    const r = await gerarConteudoGemini(body)
    if (r.ok) return { ...r, text: limparVazamentoRaciocinioIa(r.text) }
    lastResult = r
    if (label === 'web' && erroIndicaToolIncompativel(r.error || '')) continue
    return r
  }
  return lastResult || { ok: false, error: 'Falha ao gerar.', code: 'API' }
}

/* ============================================================================ *
 * EXTRAÇÃO — só por compatibilidade com chamadas antigas
 * ============================================================================ */

/** @deprecated Mantida temporariamente para compatibilidade; prefira `gerarComentarioVersiculo`. */
export const gerarEstudoReformadoPassagem = gerarComentarioVersiculo

import initSqlJs from 'sql.js';
import { normalizarNomeLivro } from '../utils/biblia'
import { obterSqliteAssetBytes } from '../utils/sqliteAssetCache'

import { versaoBiblicaPorId } from '../data/bibliaVersoes'
import { obterVersaoBiblica, definirVersaoBiblica } from '../utils/bibliaVersionStore'
import { limparBibliaSessaoCache } from '../utils/bibliaSessionCache'

function criarRuntimeBiblia(versao) {
function normalizarLinhaBiblica(linha) {
  if (linha.textoMarcado === linha.texto) delete linha.textoMarcado
  return linha
}
let db = null;
let SQL = null;

let initPromise = null;

const livroPorNomeCache = new Map()
const intervaloVersiculosCache = new Map()
const LIVRO_NOME_CACHE_MAX = 80
const INTERVALO_VERSOS_CACHE_MAX = 200
const capituloCache = new Map()
const CAPITULO_CACHE_MAX = 24
const pericopesCache = new Map()
const PERICOPES_CACHE_MAX = 80
// Deve mudar sempre que public/ara.sqlite for substituído. Evita que instalações
// existentes continuem usando indefinidamente uma cópia antiga no IndexedDB.
const ARA_SQLITE_CONTENT_REV = versao.revisao
/** Primeiro livro do NT (Mateus); ids menores são AT. */
const LIVRO_ID_NT_INICIO = 40

function clausulaSqlTestamento(testamento) {
  if (testamento === 'AT') return `AND b.id < ${LIVRO_ID_NT_INICIO}`
  if (testamento === 'NT') return `AND b.id >= ${LIVRO_ID_NT_INICIO}`
  return ''
}

function clausulaSqlLivro(livroId) {
  const id = Number(livroId)
  return Number.isFinite(id) && id > 0 ? 'AND b.id = ?' : ''
}

function escaparRegExp(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * "Palavra literal": o termo aparece como palavra inteira (bordas sem letra/número).
 * Ex.: "ira" casa em "… à ira …" / "ira,", mas não em "beira" / "cadeira".
 */
function contemPalavraLiteral(texto, termo) {
  const t = String(texto || '')
  const p = String(termo || '').trim()
  if (!p || !t) return false
  try {
    const re = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escaparRegExp(p)}(?=[^\\p{L}\\p{N}]|$)`,
      'iu'
    )
    return re.test(t)
  } catch {
    // Fallback sem Unicode property escapes (ambientes antigos)
    const re = new RegExp(
      `(^|[^A-Za-zÀ-ÿ0-9])${escaparRegExp(p)}(?=[^A-Za-zÀ-ÿ0-9]|$)`,
      'i'
    )
    return re.test(t)
  }
}

function gravarCacheLimitado(map, key, value, max) {
  if (map.size >= max) {
    map.delete(map.keys().next().value)
  }
  map.set(key, value)
}

async function initDB() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
      const configuredRev = String(import.meta.env?.VITE_SQLITE_ASSET_REV || '').trim();
      const rev = configuredRev
        ? `${ARA_SQLITE_CONTENT_REV}-${configuredRev}`
        : ARA_SQLITE_CONTENT_REV;
      const url = `${base}${versao.arquivo}${rev ? `?v=${encodeURIComponent(rev)}` : ''}`;

      SQL = await initSqlJs({
        locateFile: (file) => `${base}sql.js/${file}`
      });

      const uint8Array = await obterSqliteAssetBytes(versao.arquivo, rev, async () => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Falha ao carregar o banco de dados');
        }
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      });

      db = new SQL.Database(uint8Array);
      // As novas bases preservam a numeração explícita; ARA mantém sua ordem original.
      const possuiNumero = db.exec('PRAGMA table_info(verse)')[0]?.values.some(row => row[1] === 'verse_number');
        const textoLimpo = "REPLACE(REPLACE(REPLACE(REPLACE(text,'<J>',''),'</J>',''),'<j>',''),'</j>','')"
        db.run(possuiNumero
          ? `CREATE TEMP VIEW verse_versioned AS SELECT id,book_id,chapter,${textoLimpo} AS text,text AS textoMarcado,verse_number,verse_end FROM verse`
          : `CREATE TEMP VIEW verse_versioned AS SELECT id,book_id,chapter,${textoLimpo} AS text,text AS textoMarcado,ROW_NUMBER() OVER (PARTITION BY book_id,chapter ORDER BY id) AS verse_number,ROW_NUMBER() OVER (PARTITION BY book_id,chapter ORDER BY id) AS verse_end FROM verse`);
      return db;
    } catch (error) {
      initPromise = null;
      console.error('❌ Erro ao iniciar o banco de dados:', error);
      throw error;
    }
  })();

  return initPromise;
}

const verificarBanco = async () => {
  const db = await initDB();
  const query = `SELECT COUNT(*) as total FROM verse`;

  try {
    const stmt = db.prepare(query);
    const result = stmt.step() ? stmt.getAsObject() : { total: 0 };
    stmt.free();
    return result.total > 0;
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
    return false;
  }
};

const bibliaService = {
  async buscarCapitulo(livro, capitulo) {
    const cacheKey = `${livro}:${capitulo}`
    if (capituloCache.has(cacheKey)) {
      return capituloCache.get(cacheKey)
    }
    const db = await initDB();
    
    const query = `
        SELECT text as texto, textoMarcado, verse_number as numero, verse_end as numeroFim
      FROM verse_versioned v
      JOIN book b ON v.book_id = b.id
      WHERE b.id = ? AND v.chapter = ?
      ORDER BY v.id
    `;

    try {
      const stmt = db.prepare(query);
      stmt.bind([livro, capitulo]);
      const result = [];
      while (stmt.step()) {
        result.push(normalizarLinhaBiblica(stmt.getAsObject()));
      }
      stmt.free();
      gravarCacheLimitado(capituloCache, cacheKey, result, CAPITULO_CACHE_MAX)
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar capítulo:', error);
      return [];
    }
  },

  async buscarVersiculo(ref) {
    try {
      // Se receber um objeto de referência, usa diretamente
      if (typeof ref === 'object') {
        const resultado = await buscarIntervaloVersiculos(
          ref.livroId, 
          ref.capitulo,
          ref.versiculoInicio,
          ref.versiculoFim || ref.versiculoInicio
        )
        return resultado
      }

      // Se receber uma string, usa a mesma regex flexível do extrairReferenciaBiblica
      const regex = /\(?([1-3]?\s*[A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?\)?/
      const match = ref.match(regex)
      
      if (!match) {
        console.warn('📖 Referência inválida:', ref)
        return { versiculos: [] }
      }

      const [, livroNome, capitulo, versiculoInicio, versiculoFim] = match
      const livroCompleto = livroNome.trim()
      
      const livro = await buscarLivroPorNome(livroCompleto)
      
      if (!livro) {
        const livroSemNumero = await buscarLivroPorNome(livroNome)
        if (!livroSemNumero) return { versiculos: [] }
        return await buscarIntervaloVersiculos(
          livroSemNumero.id,
          parseInt(capitulo),
          parseInt(versiculoInicio),
          versiculoFim ? parseInt(versiculoFim) : parseInt(versiculoInicio)
        )
      }

      return await buscarIntervaloVersiculos(
        livro.id,
        parseInt(capitulo),
        parseInt(versiculoInicio),
        versiculoFim ? parseInt(versiculoFim) : parseInt(versiculoInicio)
      )

    } catch (error) {
      console.error('❌ Erro ao buscar versículo:', error)
      return { versiculos: [] }
    }
  },

  async buscarTexto(texto, tipoBusca = 'ambos', testamento = 'ambos', livroId = null, modoPalavra = 'literal') {
    const db = await initDB();
    
    const termo = String(texto || '').trim()
    if (!termo) return []

    const termoBusca = `%${termo}%`;
    const resultados = [];
    const filtroTestamento = clausulaSqlTestamento(testamento);
    const filtroLivro = clausulaSqlLivro(livroId);
    const literal = modoPalavra !== 'incompleta'

    try {
      // Busca nos versículos (se tipoBusca for 'texto' ou 'ambos')
      if (tipoBusca === 'texto' || tipoBusca === 'ambos') {
        const queryVersos = `
          SELECT 
            b.name as livro, 
            v.chapter as capitulo,
            v.text as texto,
            v.textoMarcado,
            v.verse_number as versiculo,
            b.id as livroId,
            NULL as pericope
          FROM verse_versioned v
          JOIN book b ON v.book_id = b.id
          WHERE LOWER(v.text) LIKE LOWER(?)
            ${filtroTestamento}
            ${filtroLivro}
          ORDER BY b.id, v.chapter, v.id
        `;

        const paramsVersos = [termoBusca]
        if (filtroLivro) paramsVersos.push(parseInt(livroId, 10))

        const stmt1 = db.prepare(queryVersos);
        stmt1.bind(paramsVersos);
        while (stmt1.step()) {
          const row = normalizarLinhaBiblica(stmt1.getAsObject())
          if (!literal || contemPalavraLiteral(row.texto, termo)) {
            resultados.push(row)
          }
        }
        stmt1.free();
      }

      // Busca nas perícopes (se tipoBusca for 'pericope' ou 'ambos')
      if (tipoBusca === 'pericope' || tipoBusca === 'ambos') {
        const queryPericopes = `
          SELECT 
            b.name as livro,
            p.capitulo,
            NULL as texto,
            p.versiculo as versiculo,
            b.id as livroId,
            p.titulo as pericope
          FROM pericopes p
          JOIN book b ON p.livro_id = b.id
          WHERE LOWER(p.titulo) LIKE LOWER(?)
            ${filtroTestamento}
            ${filtroLivro}
          ORDER BY b.id, p.capitulo, p.versiculo
        `;

        const paramsPericopes = [termoBusca]
        if (filtroLivro) paramsPericopes.push(parseInt(livroId, 10))

        const stmt2 = db.prepare(queryPericopes);
        stmt2.bind(paramsPericopes);
        while (stmt2.step()) {
          const row = stmt2.getAsObject()
          if (!literal || contemPalavraLiteral(row.pericope, termo)) {
            resultados.push(row)
          }
        }
        stmt2.free();
      }

      return resultados;
    } catch (error) {
      console.error('❌ Erro na busca por texto:', error);
      return [];
    }
  },

  async buscarIntervaloVersiculos(livroId, capitulo, versiculoInicio, versiculoFim) {
    const cacheKey = `${livroId}:${capitulo}:${versiculoInicio || 1}:${versiculoFim || 999}`
    if (intervaloVersiculosCache.has(cacheKey)) {
      return intervaloVersiculosCache.get(cacheKey)
    }
    try {
      const db = await initDB()
      
      // Garante que todos os parâmetros são números
      const params = [
        parseInt(livroId),
        parseInt(capitulo),
        parseInt(versiculoFim || 999),
        parseInt(versiculoInicio || 1)
      ]

      const query = `
        WITH VersiculosNumerados AS (
          SELECT 
            v.id,
            b.name as livro,
            v.chapter as capitulo,
            v.text as texto,
            v.textoMarcado,
            v.verse_number as numero,
            v.verse_end as numeroFim
          FROM verse_versioned v
          JOIN book b ON v.book_id = b.id
          WHERE v.book_id = ?
            AND v.chapter = ?
        )
        SELECT 
          livro,
          capitulo,
          numero,
          numeroFim,
          texto,
          textoMarcado
        FROM VersiculosNumerados
        WHERE numero <= ? AND numeroFim >= ?
        ORDER BY numero
      `
      
      const stmt = db.prepare(query)
      stmt.bind(params)
      
      const versiculos = []
      while (stmt.step()) {
        const versiculo = normalizarLinhaBiblica(stmt.getAsObject())
        versiculos.push({
          livro: versiculo.livro,
          capitulo: versiculo.capitulo,
          numero: versiculo.numero,
          numeroFim: versiculo.numeroFim,
          versao: versao.sigla,
          texto: versiculo.texto,
          ...(versiculo.textoMarcado ? { textoMarcado: versiculo.textoMarcado } : {})
        })
      }
      stmt.free()
      
      const payload = { versiculos }
      gravarCacheLimitado(intervaloVersiculosCache, cacheKey, payload, INTERVALO_VERSOS_CACHE_MAX)
      return payload
      
    } catch (error) {
      console.error('❌ Erro ao buscar versículos:', error)
      return { versiculos: [] }
    }
  },

  async buscarPericopes(livroId, capitulo) {
    const cacheKey = `${livroId}:${capitulo}`
    if (pericopesCache.has(cacheKey)) {
      return pericopesCache.get(cacheKey)
    }

    try {
      const db = await initDB()
      
      const query = `
        SELECT 
          p.versiculo,
          p.titulo,
          p.referencias
        FROM pericopes p
        WHERE p.livro_id = ? 
          AND p.capitulo = ?
        ORDER BY p.versiculo, p.rowid
      `
      
      const stmt = db.prepare(query)
      stmt.bind([livroId, capitulo])
      
      const pericopes = []
      while (stmt.step()) {
        const pericope = stmt.getAsObject()
        pericopes.push({
          versiculo: pericope.versiculo,
          titulo: pericope.titulo,
          referencias: pericope.referencias || null
        })
      }
      stmt.free()
      
      gravarCacheLimitado(pericopesCache, cacheKey, pericopes, PERICOPES_CACHE_MAX)
      return pericopes
      
    } catch (error) {
      console.error('❌ Erro ao buscar perícopes:', error)
      return []
    }
  },

  async contarVersiculos(livroId, capitulo) {
    // Atalho síncrono via cache (`contarVersiculosPorLivro` pré-carregou tudo).
    const cached = versiculosPorLivroCache.get(livroId)
    if (cached && cached[capitulo] != null) return cached[capitulo]

    try {
      const db = await initDB()

      const query = `
        SELECT MAX(verse_end) as total
        FROM verse_versioned v
        WHERE v.book_id = ? AND v.chapter = ?
      `

      const stmt = db.prepare(query)
      stmt.bind([livroId, capitulo])

      if (stmt.step()) {
        const result = stmt.getAsObject()
        stmt.free()
        return result.total || 0
      }

      stmt.free()
      return 0
    } catch (error) {
      console.error('❌ Erro ao contar versículos:', error)
      return 0
    }
  },
};

/**
 * Cache (mapa em memória) com a contagem de versículos por capítulo de cada
 * livro. Como a Bíblia é estática, basta carregar uma vez por livro — depois
 * a grade de versículos abre instantaneamente, sem o "flash" anterior.
 *
 * Estrutura: `Map<livroId, Record<capitulo, total>>`.
 */
const versiculosPorLivroCache = new Map()
const versiculosPorLivroPromises = new Map()

/**
 * Pré-carrega (em uma única query) a contagem de versículos para todos os
 * capítulos do livro. Idempotente: chamadas concorrentes compartilham a mesma
 * promessa, e chamadas após o resultado retornam o cache.
 */
async function contarVersiculosPorLivro(livroId) {
  if (versiculosPorLivroCache.has(livroId)) {
    return versiculosPorLivroCache.get(livroId)
  }
  if (versiculosPorLivroPromises.has(livroId)) {
    return versiculosPorLivroPromises.get(livroId)
  }

  const promise = (async () => {
    try {
      const db = await initDB()
      const numeracaoExplicita = db.exec('PRAGMA table_info(verse)')[0]?.values.some(coluna => coluna[1] === 'verse_end')
      const stmt = db.prepare(`
        SELECT chapter, ${numeracaoExplicita ? 'MAX(verse_end)' : 'COUNT(*)'} AS total
        FROM verse
        WHERE book_id = ?
        GROUP BY chapter
      `)
      stmt.bind([livroId])
      const result = {}
      while (stmt.step()) {
        const row = stmt.getAsObject()
        result[row.chapter] = row.total
      }
      stmt.free()
      versiculosPorLivroCache.set(livroId, result)
      return result
    } catch (error) {
      console.error('❌ Erro ao pré-contar versículos:', error)
      return {}
    } finally {
      versiculosPorLivroPromises.delete(livroId)
    }
  })()

  versiculosPorLivroPromises.set(livroId, promise)
  return promise
}

/**
 * Acesso síncrono ao cache. Retorna `null` se ainda não estiver carregado.
 * Útil para a UI saber se pode renderizar a grade imediatamente.
 */
function obterVersiculosPorLivroSync(livroId) {
  return versiculosPorLivroCache.get(livroId) || null
}

async function buscarLivroPorNome(nome) {
  const nomeChave = String(nome || '').trim().toLowerCase()
  if (nomeChave && livroPorNomeCache.has(nomeChave)) {
    return livroPorNomeCache.get(nomeChave)
  }
  try {
    const db = await initDB()
    const nomeNormalizado = normalizarNomeLivro(nome)

    // Query que busca o livro ignorando case e acentos
    const query = `
      SELECT 
        b.id,
        b.name as nome
      FROM book b
      WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(
        b.name,
        'á','a'),
        'é','e'),
        'í','i'),
        'ó','o')
      ) LIKE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(
        ?,
        'á','a'),
        'é','e'),
        'í','i'),
        'ó','o')
      )
      OR LOWER(b.name) LIKE LOWER(?)
      ORDER BY 
        CASE 
          WHEN LOWER(b.name) = LOWER(?) THEN 1
          ELSE 2
        END,
        LENGTH(b.name)
      LIMIT 1
    `

    const stmt = db.prepare(query)
    const termoBusca = `%${nomeNormalizado}%`
    stmt.bind([nomeNormalizado, termoBusca, nomeNormalizado])
    
    let livro = null
    if (stmt.step()) {
      livro = stmt.getAsObject()
    }
    stmt.free()

    if (!livro) return null
    const out = {
      id: livro.id,
      nome: livro.nome
    }
    if (nomeChave) {
      gravarCacheLimitado(livroPorNomeCache, nomeChave, out, LIVRO_NOME_CACHE_MAX)
    }
    return out
  } catch (error) {
    console.error('Erro ao buscar livro:', error)
    return null
  }
}

const extrairReferenciaBiblica = (texto) => {
  // Garantir que o texto está limpo antes de processar
  const textoLimpo = texto.replace(/<[^>]*>/g, '').trim()
  
  // Regex mais flexível que aceita parênteses e é mais tolerante com espaços
  const regex = /\(?([1-3]?\s*[A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?\)?/g
  
  const referencias = [];
  let match;

  while ((match = regex.exec(textoLimpo)) !== null) {
    const [textoCompleto, livro, capitulo, versiculoInicio, versiculoFim] = match;
    
    referencias.push({
      textoOriginal: textoCompleto,
      livro: livro.trim(),
      capitulo: parseInt(capitulo),
      versiculoInicio: versiculoInicio ? parseInt(versiculoInicio) : null,
      versiculoFim: versiculoFim ? parseInt(versiculoFim) : null
    });
  }

  return referencias;
};

async function buscarReferencia(referencia) {
  try {
    const db = await initDB()
    
    // Pré-processa a referência para garantir espaços após parênteses
    const referenciaProcessada = referencia.replace(/\((?=\d)/g, '( ')
    
    // Extrai as referências do texto
    const referencias = extrairReferenciaBiblica(referenciaProcessada)
    if (!referencias.length) {
      console.warn('📖 Referência inválida:', referencia)
      return null
    }

    const ref = referencias[0]

    // Busca o livro
    const livro = await buscarLivroPorNome(ref.livro)
    if (!livro) {
      console.warn('📚 Livro não encontrado:', ref.livro)
      return null
    }

    // Busca todos os versículos do capítulo
    const query = `
      SELECT 
        v.text as texto,
        v.verse_number as numero,
        v.verse_end as numeroFim,
        v.chapter as capitulo
      FROM verse_versioned v
      WHERE v.book_id = ? 
      AND v.chapter = ?
      ORDER BY v.id
    `

    const stmt = db.prepare(query)
    stmt.bind([livro.id, ref.capitulo])
    
    const todosVersiculos = []
    while (stmt.step()) {
      todosVersiculos.push(stmt.getAsObject())
    }
    stmt.free()

    if (todosVersiculos.length === 0) {
      console.warn(`⚠️ Capítulo não encontrado: ${ref.livro} ${ref.capitulo}`);
      return null;
    }

    // Se tem versículo específico, retorna apenas os solicitados
    if (ref.versiculoInicio) {
      const inicio = ref.versiculoInicio;
      const fim = ref.versiculoFim || inicio;
      return todosVersiculos.filter(v => v.numero <= fim && v.numeroFim >= inicio);
    }

    // Se não tem versículo específico, retorna o capítulo todo
    return todosVersiculos;
  } catch (error) {
    console.error('Erro ao buscar referência:', error);
    return null;
  }
}

const carregarTodosLivros = async () => {
  const db = await initDB();
  const query = `
    SELECT b.id, b.name as nome,
           MAX(v.chapter) as max_capitulos
    FROM book b
    LEFT JOIN verse v ON b.id = v.book_id
    GROUP BY b.id, b.name
    ORDER BY b.id
  `;
  try {
    const stmt = db.prepare(query);
    const result = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      result.push({
        id: row.id,
        nome: row.nome,
        abreviacao: row.nome.substring(0, 3),
        maxCapitulos: row.max_capitulos
      });
    }
    stmt.free();
    return result;
  } catch (error) {
    console.error('❌ Erro ao carregar livros:', error);
    return [];
  }
};

const { 
  buscarCapitulo,
  buscarTexto,
  buscarVersiculo,
} = bibliaService;

const buscarIntervaloVersiculos = bibliaService.buscarIntervaloVersiculos;
const buscarPericopes = bibliaService.buscarPericopes;
const contarVersiculos = bibliaService.contarVersiculos;


return { initDB, verificarBanco, contemPalavraLiteral, bibliaService, contarVersiculosPorLivro, obterVersiculosPorLivroSync, buscarLivroPorNome, extrairReferenciaBiblica, buscarReferencia, carregarTodosLivros };
}

const runtimes = new Map()
function runtime(id = obterVersaoBiblica()) {
  const versao = versaoBiblicaPorId(id)
  if (!versao) throw new Error('Versão bíblica não disponível.')
  if (!runtimes.has(id)) runtimes.set(id, criarRuntimeBiblia(versao))
  return runtimes.get(id)
}
export let db = null
export async function initDB(id = obterVersaoBiblica()) {
  const banco = await runtime(id).initDB()
  if (id === obterVersaoBiblica()) db = banco
  return banco
}
export async function alterarVersaoBiblica(id) {
  await initDB(id)
  limparBibliaSessaoCache()
  definirVersaoBiblica(id)
}
/** Atualiza apenas a cópia de exibição; preserva os registros e notas do usuário. */
export async function aplicarVersaoBiblica(item) {
  if (!item) return item
  const versao = versaoBiblicaPorId(obterVersaoBiblica())
  const versos = await runtime(versao.id).bibliaService.buscarIntervaloVersiculos(item.livroId, item.capitulo, item.versiculo, item.versiculo)
  if (!versos.versiculos.length) throw new Error('Texto indisponível nesta versão bíblica.')
  const texto = versos.versiculos.map(v => v.texto.replace(/^\s*(?:\d+|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s+/u, '')).join(' ')
  return { ...item, texto, versaoBiblica: versao.id, versao: versao.sigla }
}
export const bibliaService = Object.fromEntries([
  'buscarCapitulo','buscarVersiculo','buscarTexto','buscarIntervaloVersiculos','buscarPericopes','contarVersiculos'
].map(nome => [nome, (...args) => runtime().bibliaService[nome](...args)]))
export const { buscarCapitulo, buscarVersiculo, buscarTexto, buscarIntervaloVersiculos, buscarPericopes, contarVersiculos } = bibliaService
export const verificarBanco = (...args) => runtime().verificarBanco(...args)
export const contemPalavraLiteral = (...args) => runtime().contemPalavraLiteral(...args)
export const contarVersiculosPorLivro = (...args) => runtime().contarVersiculosPorLivro(...args)
export const obterVersiculosPorLivroSync = (...args) => runtime().obterVersiculosPorLivroSync(...args)
export const buscarLivroPorNome = (...args) => runtime().buscarLivroPorNome(...args)
export const extrairReferenciaBiblica = (...args) => runtime().extrairReferenciaBiblica(...args)
export const buscarReferencia = (...args) => runtime().buscarReferencia(...args)
export const carregarTodosLivros = (...args) => runtime().carregarTodosLivros(...args)
// Consultas paralelas não alteram a tradução global nem a sessão de leitura.
export const buscarCapituloNaVersao = (versao, ...args) => runtime(versao).bibliaService.buscarCapitulo(...args)
export const buscarPericopesNaVersao = (versao, ...args) => runtime(versao).bibliaService.buscarPericopes(...args)

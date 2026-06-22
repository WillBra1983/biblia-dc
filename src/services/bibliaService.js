import initSqlJs from 'sql.js';
import { normalizarNomeLivro } from '../utils/biblia'
import { obterSqliteAssetBytes } from '../utils/sqliteAssetCache'

let db = null;
let SQL = null;

let initPromise = null;

const livroPorNomeCache = new Map()
const intervaloVersiculosCache = new Map()
const LIVRO_NOME_CACHE_MAX = 80
const INTERVALO_VERSOS_CACHE_MAX = 200
const capituloCache = new Map()
const CAPITULO_CACHE_MAX = 24

function gravarCacheLimitado(map, key, value, max) {
  if (map.size >= max) {
    map.delete(map.keys().next().value)
  }
  map.set(key, value)
}

export async function initDB() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
      const rev = String(import.meta.env?.VITE_SQLITE_ASSET_REV || '').trim();
      const url = `${base}ara.sqlite${rev ? `?v=${encodeURIComponent(rev)}` : ''}`;

      SQL = await initSqlJs({
        locateFile: (file) => `${base}sql.js/${file}`
      });

      const uint8Array = await obterSqliteAssetBytes('ara.sqlite', rev, async () => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Falha ao carregar o banco de dados');
        }
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      });

      db = new SQL.Database(uint8Array);
      return db;
    } catch (error) {
      initPromise = null;
      console.error('❌ Erro ao iniciar o banco de dados:', error);
      throw error;
    }
  })();

  return initPromise;
}

export const verificarBanco = async () => {
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

export const bibliaService = {
  async buscarCapitulo(livro, capitulo) {
    const cacheKey = `${livro}:${capitulo}`
    if (capituloCache.has(cacheKey)) {
      return capituloCache.get(cacheKey)
    }
    const db = await initDB();
    
    const query = `
      SELECT text as texto
      FROM verse v
      JOIN book b ON v.book_id = b.id
      WHERE b.id = ? AND v.chapter = ?
      ORDER BY v.id
    `;

    try {
      const stmt = db.prepare(query);
      stmt.bind([livro, capitulo]);
      const result = [];
      while (stmt.step()) {
        result.push(stmt.getAsObject());
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

      const [, numero, livroNome, capitulo, versiculoInicio, versiculoFim] = match
      const livroCompleto = numero 
        ? `${numero} ${livroNome.trim()}`
        : livroNome.trim()
      
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

  async buscarTexto(texto, tipoBusca = 'ambos') {
    const db = await initDB();
    
    const termoBusca = `%${texto}%`;
    const resultados = [];

    try {
      // Busca nos versículos (se tipoBusca for 'texto' ou 'ambos')
      if (tipoBusca === 'texto' || tipoBusca === 'ambos') {
        const queryVersos = `
          SELECT 
            b.name as livro, 
            v.chapter as capitulo,
            v.text as texto,
            (SELECT COUNT(*) + 1 FROM verse v2 
             WHERE v2.book_id = v.book_id 
             AND v2.chapter = v.chapter 
             AND v2.id < v.id) as versiculo,
            b.id as livroId,
            NULL as pericope
          FROM verse v
          JOIN book b ON v.book_id = b.id
          WHERE LOWER(v.text) LIKE LOWER(?) 
            OR LOWER(b.name) LIKE LOWER(?)
          ORDER BY b.id, v.chapter, v.id
          LIMIT 500
        `;

        const stmt1 = db.prepare(queryVersos);
        stmt1.bind([termoBusca, termoBusca]);
        while (stmt1.step()) {
          resultados.push(stmt1.getAsObject());
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
          ORDER BY b.id, p.capitulo, p.versiculo
          LIMIT 100
        `;

        const stmt2 = db.prepare(queryPericopes);
        stmt2.bind([termoBusca]);
        while (stmt2.step()) {
          resultados.push(stmt2.getAsObject());
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
        parseInt(versiculoInicio || 1),
        parseInt(versiculoFim || 999)
      ]

      const query = `
        WITH VersiculosNumerados AS (
          SELECT 
            v.id,
            b.name as livro,
            v.chapter as capitulo,
            v.text as texto,
            ROW_NUMBER() OVER (
              PARTITION BY v.book_id, v.chapter 
              ORDER BY v.id
            ) as numero
          FROM verse v
          JOIN book b ON v.book_id = b.id
          WHERE v.book_id = ?
            AND v.chapter = ?
        )
        SELECT 
          livro,
          capitulo,
          numero,
          texto
        FROM VersiculosNumerados
        WHERE numero BETWEEN ? AND ?
        ORDER BY numero
      `
      
      const stmt = db.prepare(query)
      stmt.bind(params)
      
      const versiculos = []
      while (stmt.step()) {
        const versiculo = stmt.getAsObject()
        versiculos.push({
          livro: versiculo.livro,
          capitulo: versiculo.capitulo,
          numero: versiculo.numero,
          texto: versiculo.texto
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
        SELECT COUNT(*) as total
        FROM verse v
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
export async function contarVersiculosPorLivro(livroId) {
  if (versiculosPorLivroCache.has(livroId)) {
    return versiculosPorLivroCache.get(livroId)
  }
  if (versiculosPorLivroPromises.has(livroId)) {
    return versiculosPorLivroPromises.get(livroId)
  }

  const promise = (async () => {
    try {
      const db = await initDB()
      const stmt = db.prepare(`
        SELECT chapter, COUNT(*) AS total
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
export function obterVersiculosPorLivroSync(livroId) {
  return versiculosPorLivroCache.get(livroId) || null
}

export async function buscarLivroPorNome(nome) {
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

export const extrairReferenciaBiblica = (texto) => {
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

export async function buscarReferencia(referencia) {
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
        v.id as numero,
        v.chapter as capitulo
      FROM verse v
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
      const inicio = ref.versiculoInicio - 1;
      const fim = ref.versiculoFim ? ref.versiculoFim - 1 : inicio;
      return todosVersiculos.slice(inicio, fim + 1);
    }

    // Se não tem versículo específico, retorna o capítulo todo
    return todosVersiculos;
  } catch (error) {
    console.error('Erro ao buscar referência:', error);
    return null;
  }
}

export const carregarTodosLivros = async () => {
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

export const { 
  buscarCapitulo,
  buscarTexto,
  buscarVersiculo,
} = bibliaService;

export const buscarIntervaloVersiculos = bibliaService.buscarIntervaloVersiculos;
export const buscarPericopes = bibliaService.buscarPericopes;
export const contarVersiculos = bibliaService.contarVersiculos;

export { db }
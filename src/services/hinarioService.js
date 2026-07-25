import initSqlJs from 'sql.js'

let db = null
let SQL = null
let dbPromise = null

const getBase = () => (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'

const initDB = async () => {
  if (db) return db
  if (dbPromise) return dbPromise

  dbPromise = (async () => {
    const base = getBase().replace(/\/$/, '') || ''
    const baseSlash = base ? base + '/' : '/'
    SQL = await initSqlJs({
      locateFile: file => `${baseSlash}sql.js/${file}`
    })

    const response = await fetch(`${baseSlash}hinario.db`)
    if (!response.ok) {
      throw new Error(`Banco do hinário indisponível (${response.status})`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    db = new SQL.Database(uint8Array)
    return db
  })().catch((error) => {
    dbPromise = null
    console.error('Erro ao iniciar o banco de dados do hinário:', error)
    throw error
  })

  return dbPromise
}

export const hinarioService = {
  /** Aquece o WebAssembly e o banco sem bloquear a navegação atual. */
  async precarregar() {
    await initDB()
  },

  async buscarHino(numero) {
    const db = await initDB()
    const query = `
      SELECT numero, titulo, conteudo, referencia
      FROM hinos 
      WHERE numero = ?
    `
    const stmt = db.prepare(query)
    stmt.bind([numero])
    const result = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    return result
  },

  async buscarTodos() {
    const db = await initDB()
    const query = `
      SELECT numero, titulo
      FROM hinos
      ORDER BY numero
    `
    const stmt = db.prepare(query)
    const result = []
    while (stmt.step()) {
      result.push(stmt.getAsObject())
    }
    stmt.free()
    return result
  },

  async buscarPorTexto(texto) {
    if (!texto) return this.buscarTodos()
    
    try {
      const db = await initDB()
      const query = `
        SELECT DISTINCT numero, titulo
        FROM hinos 
        WHERE 
          numero = ? 
          OR LOWER(titulo) LIKE LOWER(?) 
          OR LOWER(conteudo) LIKE LOWER(?) 
          OR LOWER(referencia) LIKE LOWER(?)
        ORDER BY numero
      `
      const numeroHino = parseInt(texto) || 0
      const termo = `%${texto}%`
      
      const stmt = db.prepare(query)
      stmt.bind([
        numeroHino,  // busca exata por número
        termo,       // busca no título
        termo,       // busca no conteúdo
        termo        // busca na referência
      ])
      
      const result = []
      while (stmt.step()) {
        result.push(stmt.getAsObject())
      }
      stmt.free()
      return result
    } catch (error) {
      console.error('Erro ao buscar hinos:', error)
      return []
    }
  },

  async testarConexao() {
    try {
      const db = await initDB()
      const query = 'SELECT COUNT(*) as total FROM hinos'
      const result = db.exec(query)
      return Array.isArray(result) && result.length > 0 && (result[0].values?.[0]?.[0] ?? 0) > 0
    } catch (error) {
      console.error('Erro ao testar conexão com hinário:', error)
      return false
    }
  },

  async buscarPorCategoria(categoria, subcategoria) {
    try {
      const db = await initDB()
      const query = `
        SELECT numero, titulo, conteudo, referencia 
        FROM hinos 
        WHERE categoria = ? 
        AND (? IS NULL OR subcategoria = ?)
        ORDER BY numero
      `
      const stmt = db.prepare(query)
      stmt.bind([categoria, subcategoria, subcategoria])
      
      const result = []
      while (stmt.step()) {
        result.push(stmt.getAsObject())
      }
      stmt.free()
      return result
    } catch (error) {
      console.error('Erro ao buscar hinos por categoria:', error)
      return []
    }
  },

  async obterCategorias() {
    try {
      const db = await initDB()
      const query = `
        SELECT DISTINCT categoria, subcategoria 
        FROM hinos 
        ORDER BY categoria, subcategoria
      `
      const result = db.exec(query)[0]
      return result.values.reduce((cats, [cat, subcat]) => {
        if (!cats[cat]) cats[cat] = []
        if (subcat) cats[cat].push(subcat)
        return cats
      }, {})
    } catch (error) {
      console.error('Erro ao obter categorias:', error)
      return {}
    }
  }
}

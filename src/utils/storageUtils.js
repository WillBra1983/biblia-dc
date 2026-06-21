// Utilitários para gerenciamento robusto do localStorage

/**
 * Salva dados no localStorage com tratamento de erro
 */
export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error(`Erro ao salvar ${key}:`, error)
    return false
  }
}

/**
 * Carrega dados do localStorage com tratamento de erro
 */
export const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Erro ao carregar ${key}:`, error)
    return defaultValue
  }
}

/**
 * Remove dados do localStorage com tratamento de erro
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Erro ao remover ${key}:`, error)
    return false
  }
}

/**
 * Limpa todos os dados relacionados ao discipulado
 */
export const clearDiscipuladoData = () => {
  const keysToRemove = []
  
  // Encontrar todas as chaves relacionadas ao discipulado
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('discipulado_')) {
      keysToRemove.push(key)
    }
  }
  
  // Remover as chaves encontradas
  keysToRemove.forEach(key => removeFromStorage(key))
  
  return keysToRemove.length
}

/**
 * Verifica se o app está rodando em modo de desenvolvimento
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1'
}

/**
 * Verifica se o app está rodando como PWA
 */
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true
}

/**
 * Força sincronização do localStorage
 */
export const forceStorageSync = () => {
  try {
    // Força uma operação de escrita para sincronizar
    const tempKey = `temp_sync_${Date.now()}`
    localStorage.setItem(tempKey, 'sync')
    localStorage.removeItem(tempKey)
    return true
  } catch (error) {
    console.error('Erro na sincronização do storage:', error)
    return false
  }
}

/**
 * Detecta problemas de sincronização do localStorage
 */
export const detectStorageIssues = () => {
  const issues = []
  
  try {
    // Teste básico de escrita/leitura
    const testKey = 'storage_test'
    const testValue = { test: true, timestamp: Date.now() }
    
    localStorage.setItem(testKey, JSON.stringify(testValue))
    const readValue = localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    
    if (!readValue || JSON.parse(readValue).test !== true) {
      issues.push('Falha na escrita/leitura básica')
    }
    
    // Verificar se há dados corrompidos
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            JSON.parse(value) // Testa se é JSON válido
          }
        } catch (error) {
          issues.push(`Dados corrompidos na chave: ${key}`)
        }
      }
    }
    
  } catch (error) {
    issues.push(`Erro geral no localStorage: ${error.message}`)
  }
  
  return issues
}

/**
 * Corrige problemas detectados no localStorage
 */
export const fixStorageIssues = () => {
  const issues = detectStorageIssues()
  const fixes = []
  
  if (issues.length > 0) {
    console.warn('🔧 Problemas detectados no localStorage:', issues)
    
    // Remover dados corrompidos
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            JSON.parse(value) // Testa se é JSON válido
          }
        } catch (error) {
          console.log(`🗑️ Removendo dados corrompidos: ${key}`)
          localStorage.removeItem(key)
          fixes.push(`Removido: ${key}`)
        }
      }
    }
    
    // Forçar sincronização
    forceStorageSync()
  }
  
  return { issues, fixes }
}

/**
 * Backup dos dados importantes
 */
export const backupImportantData = () => {
  const importantKeys = [
    'discipulado_respostas',
    'discipulado_meditacao',
    'discipulado_concluidos',
    'devocionaisConcluidos',
    'planoLeitura',
    'ultimaLeitura',
    'fontSize',
    'darkMode'
  ]
  
  const backup = {}
  
  importantKeys.forEach(key => {
    const data = loadFromStorage(key)
    if (data !== null) {
      backup[key] = data
    }
  })
  
  return backup
}

/**
 * Restaura dados do backup
 */
export const restoreFromBackup = (backup) => {
  let restored = 0
  
  Object.entries(backup).forEach(([key, value]) => {
    if (saveToStorage(key, value)) {
      restored++
    }
  })
  
  return restored
} 
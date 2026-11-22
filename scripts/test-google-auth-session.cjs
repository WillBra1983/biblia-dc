const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const inicio = performance.now()
const efeitos = [], estados = [], timers = new Map()
let listener, removido = false, sequencia = 0
const auth = { currentUser: null, authStateReady: () => new Promise(() => {}) }
const usuario = { uid: 'usuario-teste', emailVerified: true }
const react = {
  createContext: () => ({ Provider: 'Provider' }), useCallback: fn => fn, useMemo: fn => fn(), useRef: value => ({ current: value }),
  useEffect: fn => efeitos.push(fn), useState: initial => { const indice = estados.length; estados.push(initial); return [initial, value => { estados[indice] = value }] },
}
const firebase = {
  onAuthStateChanged: (a, cb) => { listener = cb; return () => { removido = true } },
  GoogleAuthProvider: class {}, getRedirectResult: async () => null,
}
let code = transformSync(fs.readFileSync('src/contexts/FirebaseAuthContext.jsx', 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'cjs' }).code
code = code.replace(/import\((["'])([^"']+)\1\)/g, (_, q, name) => `Promise.resolve(require(${JSON.stringify(name)}))`)
const m = { exports: {} }
vm.runInNewContext(code, { module: m, exports: m.exports, console: { ...console, warn() {} },
  window: { setTimeout: (fn, ms) => { const id = ++sequencia; timers.set(id, { fn, ms }); return id }, clearTimeout: id => timers.delete(id) },
  require: name => {
    if (name === 'react') return react
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) }
    if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => false } }
    if (name === 'firebase/auth') return firebase
    if (name.includes('config/firebase')) return { getFirebaseAuth: () => auth, loadFirebaseModules: async () => {}, isFirebaseConfigured: () => true }
    if (name.includes('googleSignInWeb')) return { signInWithGoogleWeb: async () => { auth.currentUser = usuario; listener(usuario); return 'popup' } }
    if (name.includes('emailVerificationAuth')) return { estaRegistroEmailSenhaEmCurso: () => false, usuarioPrecisaVerificarEmail: () => false }
    return {}
  },
})
const flush = () => new Promise(resolve => setImmediate(resolve))
;(async () => {
  const tree = m.exports.FirebaseAuthProvider({ children: null })
  const limpar = efeitos[0]()
  await flush()
  assert.equal(typeof listener, 'function', 'Não acompanha autenticação antes da sessão inicial ficar pronta')
  const prazo = [...timers.values()].find(t => t.ms === 9000)
  assert.ok(prazo)
  prazo.fn(); await flush()
  assert.equal(estados[0], null, 'Timeout inicial não liberou entrada')
  await tree.props.value.loginWithGoogle()
  assert.equal(estados[0], usuario, 'Login Google após timeout não atualizou a interface')
  listener(null)
  assert.equal(estados[0], null, 'Logout não foi propagado')
  limpar(); assert.equal(removido, true)
  listener(usuario)
  assert.equal(estados[0], null, 'Componente desmontado ainda atualizou usuário')
  console.log(`Sessão Google: 4/4 cenários aprovados (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s. Firebase simulado; login real depende da conta do usuário.`)
})().catch(e => { console.error(e); process.exitCode = 1 })

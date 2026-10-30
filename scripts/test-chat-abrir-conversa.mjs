import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source = fs.readFileSync('src/pages/Chat.jsx', 'utf8')
assert.doesNotMatch(source, /\b(?:setPeerUidInput|peerUidInput)\b/)
const result = ts.transpileModule(source, { fileName: 'Chat.jsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext }, reportDiagnostics: true })
assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0)
const state = {}
const context = { user: { uid: 'eu' }, resolvePeerToUid: async () => 'outro', dmChatId: () => 'conversa', ensureChatMembership: async () => {}, hintRtdbPermissionDenied: () => '', peerDialogInput: '@pessoa', peerDialog: 'chat', addFavorite: async () => {}, sendFriendRequest: async () => {} }
for (const name of ['Busy', 'LastError', 'ActiveChatId', 'ActivePeerUid', 'PeerDialogInput', 'ChatListNotice', 'PeerDialog', 'PeerDialogError']) context['set' + name] = value => { state[name] = value }
const start = source.indexOf('  const openChatWithPeer =')
const end = source.indexOf('  const handleSairConta =', start)
vm.createContext(context)
vm.runInContext(source.slice(start, end) + '; globalThis.abrir = openChatWithPeer; globalThis.dialogo = openPeerDialog;', context)
await context.abrir('@pessoa')
assert.equal(state.ActiveChatId, 'conversa')
assert.equal(state.ActivePeerUid, 'outro')
assert.equal(state.LastError, null)
assert.equal(state.Busy, false)
context.dialogo('favorite')
assert.equal(state.PeerDialog, 'favorite')
assert.equal(state.PeerDialogInput, '')
const submitStart = source.indexOf('  const submitPeerDialog =')
const submitEnd = source.indexOf('  const saveProfileBasics =', submitStart)
vm.runInContext(source.slice(submitStart, submitEnd) + '; globalThis.confirmar = submitPeerDialog;', context)
await context.confirmar()
assert.equal(state.PeerDialog, null)
assert.equal(state.PeerDialogError, '')
console.log('Chat: abertura direta, diálogo e confirmação sem referências inexistentes; nenhuma mensagem enviada.')

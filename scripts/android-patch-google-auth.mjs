/**
 * @codetrix-studio/capacitor-google-auth referencia R.string.server_client_id sem incluir strings.xml.
 * Valor espelhado de capacitor.config.json → plugins.GoogleAuth.androidClientId
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pluginRes = path.join(
  root,
  'node_modules',
  '@codetrix-studio',
  'capacitor-google-auth',
  'android',
  'src',
  'main',
  'res',
  'values'
)
const stringsFile = path.join(pluginRes, 'strings.xml')
const pluginJava = path.join(
  root,
  'node_modules',
  '@codetrix-studio',
  'capacitor-google-auth',
  'android',
  'src',
  'main',
  'java',
  'com',
  'codetrixstudio',
  'capacitor',
  'GoogleAuth',
  'GoogleAuth.java'
)

const FALLBACK_CLIENT_ID =
  '419144943323-9uca774ij800th8nk7aof6ju84nlqfb8.apps.googleusercontent.com'

function lerClientIdDoCapacitorConfig() {
  try {
    const raw = fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8')
    const cfg = JSON.parse(raw)
    return (
      cfg?.plugins?.GoogleAuth?.androidClientId ||
      cfg?.plugins?.GoogleAuth?.serverClientId ||
      cfg?.plugins?.GoogleAuth?.clientId ||
      FALLBACK_CLIENT_ID
    )
  } catch {
    return FALLBACK_CLIENT_ID
  }
}

if (!fs.existsSync(pluginJava)) {
  console.warn('[android-patch-google-auth] Plugin não instalado; ignore.')
  process.exit(0)
}

const clientId = lerClientIdDoCapacitorConfig()
const xml = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="server_client_id">${clientId}</string>
</resources>
`

fs.mkdirSync(pluginRes, { recursive: true })
const prev = fs.existsSync(stringsFile) ? fs.readFileSync(stringsFile, 'utf8') : ''
if (prev !== xml) {
  fs.writeFileSync(stringsFile, xml)
  console.log('[android-patch-google-auth] Criado server_client_id no plugin.')
}

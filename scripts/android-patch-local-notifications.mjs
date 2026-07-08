/**
 * @capacitor/local-notifications 6.0.0 referencia R.drawable.ic_transparent sem incluir o recurso.
 * Adiciona drawable mínimo no módulo Android do plugin após npm install.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const drawableDir = path.join(
  root,
  'node_modules',
  '@capacitor',
  'local-notifications',
  'android',
  'src',
  'main',
  'res',
  'drawable'
)
const drawableFile = path.join(drawableDir, 'ic_transparent.xml')

const pluginJava = path.join(
  root,
  'node_modules',
  '@capacitor',
  'local-notifications',
  'android',
  'src',
  'main',
  'java',
  'com',
  'capacitorjs',
  'plugins',
  'localnotifications',
  'LocalNotificationManager.java'
)

if (!fs.existsSync(pluginJava)) {
  console.warn('[android-patch-local-notifications] Plugin não instalado; ignore.')
  process.exit(0)
}

const xml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="@android:color/transparent" />
</shape>
`

fs.mkdirSync(drawableDir, { recursive: true })
const prev = fs.existsSync(drawableFile) ? fs.readFileSync(drawableFile, 'utf8') : ''
if (prev !== xml) {
  fs.writeFileSync(drawableFile, xml)
  console.log('[android-patch-local-notifications] Criado ic_transparent.xml no plugin.')
}

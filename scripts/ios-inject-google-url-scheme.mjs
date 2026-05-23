/**
 * Lê REVERSED_CLIENT_ID de ios/App/App/GoogleService-Info.plist e adiciona
 * em Info.plist → CFBundleURLTypes (login Google nativo). Rode no Windows após
 * baixar o plist do Firebase: npm run ios:inject-google-scheme
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const plistFirebase = path.join(root, 'ios/App/App/GoogleService-Info.plist')
const plistInfo = path.join(root, 'ios/App/App/Info.plist')

function lerReversedClientId(xml) {
  const m = xml.match(
    /<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/i
  )
  return m ? m[1].trim() : null
}

function jaTemScheme(infoXml, scheme) {
  const escaped = scheme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `<key>CFBundleURLSchemes</key>\\s*<array>\\s*<string>${escaped}</string>`,
    'i'
  ).test(infoXml)
}

function injetarScheme(infoXml, scheme) {
  if (jaTemScheme(infoXml, scheme)) return infoXml

  const bloco = `
\t\t<dict>
\t\t\t<key>CFBundleURLName</key>
\t\t\t<string>com.googleusercontent.apps</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${scheme}</string>
\t\t\t</array>
\t\t</dict>`

  if (!infoXml.includes('<key>CFBundleURLTypes</key>')) {
    return infoXml.replace(
      '</dict>\n</plist>',
      `\t<key>CFBundleURLTypes</key>\n\t<array>${bloco}\n\t</array>\n</dict>\n</plist>`
    )
  }

  return infoXml.replace(
    /(<key>CFBundleURLTypes<\/key>\s*<array>)/,
    `$1${bloco}`
  )
}

if (!fs.existsSync(plistFirebase)) {
  console.error(
    'Arquivo ausente: ios/App/App/GoogleService-Info.plist\n' +
      'Crie o app iOS no Firebase (bundle com.bibliadc.app) e baixe o plist.'
  )
  process.exit(1)
}

const firebaseXml = fs.readFileSync(plistFirebase, 'utf8')
const reversed = lerReversedClientId(firebaseXml)
if (!reversed) {
  console.error('REVERSED_CLIENT_ID não encontrado no GoogleService-Info.plist')
  process.exit(1)
}

let infoXml = fs.readFileSync(plistInfo, 'utf8')
const atualizado = injetarScheme(infoXml, reversed)
if (atualizado === infoXml) {
  console.log(`Info.plist já contém o scheme: ${reversed}`)
} else {
  fs.writeFileSync(plistInfo, atualizado, 'utf8')
  console.log(`Adicionado URL scheme Google em Info.plist: ${reversed}`)
}

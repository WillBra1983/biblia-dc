/**
 * Substitui SUBSTITUA_TEAM_ID no apple-app-site-association usando APPLE_TEAM_ID do .env
 * Uso: defina APPLE_TEAM_ID=ABC123XYZ no .env e rode npm run ios:apply-team-id
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const aasaPath = path.join(root, 'public/.well-known/apple-app-site-association')
const envPath = path.join(root, '.env')

function lerTeamId() {
  const fromEnv = process.env.APPLE_TEAM_ID?.trim()
  if (fromEnv) return fromEnv
  if (!fs.existsSync(envPath)) return null
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => /^\s*APPLE_TEAM_ID\s*=/.test(l))
  if (!line) return null
  const v = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')
  return v || null
}

const teamId = lerTeamId()
if (!teamId) {
  console.error(
    'Defina APPLE_TEAM_ID no .env (Team ID em developer.apple.com → Membership).\n' +
      'Exemplo: APPLE_TEAM_ID=ABC1234DEF'
  )
  process.exit(1)
}

if (!/^[A-Z0-9]{10}$/i.test(teamId)) {
  console.warn(`Aviso: Team ID costuma ter 10 caracteres; recebido: "${teamId}"`)
}

let json = fs.readFileSync(aasaPath, 'utf8')
if (!json.includes('SUBSTITUA_TEAM_ID')) {
  if (json.includes(`${teamId}.com.bibliadc.app`)) {
    console.log('apple-app-site-association já está com este Team ID.')
    process.exit(0)
  }
  console.error('Arquivo AASA não contém SUBSTITUA_TEAM_ID e não parece precisar de atualização.')
  process.exit(1)
}

json = json.replaceAll('SUBSTITUA_TEAM_ID', teamId)
fs.writeFileSync(aasaPath, json, 'utf8')
console.log(`apple-app-site-association atualizado: ${teamId}.com.bibliadc.app`)

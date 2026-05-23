import fs from 'fs'

const audit = JSON.parse(fs.readFileSync('audit-report.json', 'utf8'))
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))

const pkgs = lock.packages || {}
const vulns = audit.vulnerabilities || {}

const severityRank = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 }

function inferScope(nodes = []) {
  let runtimeHits = 0
  let devHits = 0
  let unknownHits = 0

  for (const nodePath of nodes) {
    const meta = pkgs[nodePath]
    if (!meta) {
      unknownHits += 1
      continue
    }
    if (meta.dev === true) devHits += 1
    else runtimeHits += 1
  }

  const scope =
    runtimeHits > 0
      ? 'runtime'
      : devHits > 0 && unknownHits === 0
        ? 'dev-only'
        : 'mixed/unknown'

  return { scope, runtimeHits, devHits, unknownHits }
}

function fmtFix(fixAvailable) {
  if (fixAvailable === true) return 'yes'
  if (fixAvailable && typeof fixAvailable === 'object') {
    const name = fixAvailable.name || 'unknown'
    const version = fixAvailable.version || 'latest'
    const breaking = fixAvailable.isSemVerMajor ? ' (major)' : ''
    return `upgrade->${name}@${version}${breaking}`
  }
  return 'no'
}

const rows = Object.entries(vulns).map(([name, v]) => {
  const nodes = v.nodes || []
  const scopeInfo = inferScope(nodes)
  return {
    name,
    severity: v.severity || 'info',
    direct: Boolean(v.isDirect),
    fix: fmtFix(v.fixAvailable),
    ...scopeInfo,
  }
})

rows.sort((a, b) => {
  const sev = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
  if (sev !== 0) return sev
  if (a.scope !== b.scope) return a.scope.localeCompare(b.scope)
  return a.name.localeCompare(b.name)
})

const totals = {
  total: rows.length,
  runtime: rows.filter((r) => r.scope === 'runtime').length,
  devOnly: rows.filter((r) => r.scope === 'dev-only').length,
  mixed: rows.filter((r) => r.scope === 'mixed/unknown').length,
}

console.log(`TOTAL: ${totals.total}`)
console.log(`RUNTIME: ${totals.runtime}`)
console.log(`DEV_ONLY: ${totals.devOnly}`)
console.log(`MIXED_OR_UNKNOWN: ${totals.mixed}`)
console.log('')

for (const r of rows) {
  console.log(
    [
      r.severity.toUpperCase(),
      r.name,
      `scope=${r.scope}`,
      `direct=${r.direct}`,
      `fix=${r.fix}`,
      `nodes(runtime=${r.runtimeHits},dev=${r.devHits},unknown=${r.unknownHits})`,
    ].join(' | ')
  )
}

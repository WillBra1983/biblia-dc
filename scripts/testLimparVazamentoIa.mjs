// Smoke test para `limparVazamentoRaciocinioIa`. Rode com:
//   node scripts/testLimparVazamentoIa.mjs
//
// Esta validação fica fora do build de produção; é só checagem manual rápida
// antes/depois de mexer no regex. Cobre o caso real reportado por usuário:
// blocos `tool_code` e `thought` que o Gemini imprime como texto quando o
// grounding `google_search` falha em prompts longos.

// O módulo do app importa `import.meta.env` (Vite) e dependências do navegador;
// para isolar a função testada, recopio aqui a implementação. Se o regex mudar,
// atualize aqui também (ou refatore para um módulo isolado).
function limparVazamentoRaciocinioIa(texto) {
  if (!texto || typeof texto !== 'string') return texto
  let s = texto
  s = s.replace(/```\s*(?:tool_code|thought|tool_use|python|json)\b[\s\S]*?```/gi, '')
  s = s.replace(
    /(^|\n)\s*(tool_code|tool_use|thought)\s*\n[\s\S]*?(?=\n\s*\n|\n##\s|$)/gi,
    '$1'
  )
  s = s.replace(/^\s*print\(\s*google_search[\s\S]*?\)\s*$/gim, '')
  s = s.replace(/^\s*(default_api\.)?google_search\.search\([\s\S]*?\)\s*$/gim, '')
  s = s.replace(/\n{3,}/g, '\n\n').replace(/^\s+/, '')
  return s
}

const caso = `tool_code

print(google_search.search(queries=["Eclesiastes 9:9 comentário reformado", "João Calvino Eclesiastes 9:9"]))

thought

The user wants a concentrated, exegetical, and pastoral analysis of Ecclesiastes 9:9, from a Reformed, Calvinistic, confessional perspective. I need to focus solely on this verse.

O Pregador, em Eclesiastes 9:9, oferece um conselho que, à primeira vista, parece uma simples exortação ao prazer terreno…

Nota: observação pontual de auxílio ao estudo — para a visão completa do trecho, consulte o estudo da perícope.`

const limpo = limparVazamentoRaciocinioIa(caso)
console.log('=== ORIGINAL (chars: ' + caso.length + ') ===')
console.log(caso.slice(0, 300) + '\n...')
console.log('\n=== LIMPO (chars: ' + limpo.length + ') ===')
console.log(limpo.slice(0, 600))

const ok =
  !limpo.includes('tool_code') &&
  !limpo.includes('print(google_search') &&
  !limpo.toLowerCase().includes('thought') &&
  limpo.startsWith('O Pregador')

console.log('\n=== Resultado: ' + (ok ? 'OK' : 'FALHOU') + ' ===')
process.exit(ok ? 0 : 1)

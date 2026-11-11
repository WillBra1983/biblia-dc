import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { extrairPericopesYouVersion } from './lib/bible-pericopes.mjs'
const inicio=performance.now()
const ref={livroId:43,capitulo:3,codigo:'JHN',sigla:'NAA',versionId:1840}
const resposta=content=>({response:{code:200,data:{reference:{version_id:1840,usfm:['JHN.3']},content}}})
const conteudo='<div class="chapter" data-usfm="JHN.3"><div class="s1"><span>Nicodemos visita Jesus</span></div><div class="r">Jo 7.50–51</div><span class="verse" data-usfm="JHN.3.1">Texto</span><div class="s1">Novo título</div><div class="s2">Subtítulo</div><span class="verse" data-usfm="JHN.3.2">Outro texto</span></div>'
const extraido=extrairPericopesYouVersion(resposta(conteudo),ref)
assert.equal(extraido.pericopes.length,3)
assert.equal(extraido.pericopes[0].referencias,'Jo 7.50–51')
assert.deepEqual(extraido.pericopes.map(p=>p.versiculo),[1,2,2])
assert.ok(extraido.pericopes.every(p=>!('texto' in p)))
assert.equal(extrairPericopesYouVersion(resposta('<div class="chapter" data-usfm="JHN.3"><span class="verse" data-usfm="JHN.3.1">Texto</span></div>'),ref).pericopes.length,0)
assert.throws(()=>extrairPericopesYouVersion(resposta(conteudo),{...ref,versionId:1608}))
assert.throws(()=>extrairPericopesYouVersion(resposta(conteudo.replace('JHN.3.1','GEN.3.1')),ref))
assert.throws(()=>extrairPericopesYouVersion(resposta(conteudo+'<div class="s1">Título sem versículo</div>'),ref))
console.log(`7/7 verificações aprovadas (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s.`)

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve('artifacts/play-store')
const out = path.join(root, 'kit-publicacao')
await fs.mkdir(out, { recursive: true })
const xml = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
const slides = [
  ['01-biblia-completa.jpg', '01-biblia.png', 'Bíblia completa', 'Leitura e estudo, sem propagandas'],
  ['02-hebraico-strong.jpg', '02-strong.png', 'Palavras no original', 'Hebraico com referências Strong'],
  ['03-estudos-biblicos.jpg', '03-estudos.png', 'Compreenda a Bíblia', 'Comentários de perícopes e versículos'],
  ['04-plano-cronologico.jpg', '04-plano.png', 'Seu plano de leitura', 'Incluindo a ordem cronológica'],
]
const bg = (w,h) => `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#005345"/><stop offset="1" stop-color="#012f2b"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w}" cy="${h}" r="${w*.62}" fill="#d8af63" opacity=".055"/></svg>`
for (const [input,filename,title,subtitle] of slides) {
  const screen = await sharp(path.join(root,input)).resize({width:700}).png().toBuffer()
  const meta = await sharp(screen).metadata()
  const x=190, y=285
  const frame = Buffer.from(`<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><rect x="${x-10}" y="${y-10}" width="720" height="${meta.height+20}" rx="18" fill="#d8af63"/><text x="540" y="62" text-anchor="middle" font-family="Segoe UI,Arial" font-size="25" letter-spacing="3" fill="#e4c58e">BÍBLIA DO DISCÍPULO CRISTÃO</text><text x="540" y="144" text-anchor="middle" font-family="Segoe UI,Arial" font-size="61" font-weight="700" fill="#fff9ef">${xml(title)}</text><text x="540" y="201" text-anchor="middle" font-family="Segoe UI,Arial" font-size="31" fill="#e7e4d8">${xml(subtitle)}</text><path d="M490 238 H590" stroke="#d8af63" stroke-width="4"/></svg>`)
  await sharp(Buffer.from(bg(1080,1920))).composite([{input:frame},{input:screen,left:x,top:y}]).removeAlpha().png().toFile(path.join(out,filename))
}
const banner = Buffer.from(`<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#d8af63" stroke-width="6"><path d="M105 181 Q166 157 228 181 V312 Q166 288 105 312 Z M228 181 Q290 157 352 181 V312 Q290 288 228 312 Z"/><path d="M228 181 V312"/></g><text x="408" y="179" font-family="Segoe UI,Arial" font-size="44" font-weight="700" fill="#fff9ef">Bíblia do</text><text x="408" y="233" font-family="Segoe UI,Arial" font-size="44" font-weight="700" fill="#fff9ef">Discípulo Cristão</text><text x="408" y="290" font-family="Segoe UI,Arial" font-size="24" fill="#e4c58e">Leia. Compreenda. Aprofunde.</text><text x="408" y="333" font-family="Segoe UI,Arial" font-size="20" fill="#e7e4d8">Estudos · Strong · Planos de leitura</text></svg>`)
await sharp(Buffer.from(bg(1024,500))).composite([{input:banner}]).removeAlpha().png().toFile(path.join(out,'05-banner-google-play.png'))
const thumbs=await Promise.all(slides.map(async ([,filename],i)=>({input:await sharp(path.join(out,filename)).resize(270,480).toBuffer(),left:i*270,top:0})))
await sharp({create:{width:1080,height:480,channels:3,background:'#003f36'}}).composite(thumbs).png().toFile(path.join(out,'PREVIA-nao-enviar.png'))
const title='Bíblia DC: Leitura e Estudo'
const short='Bíblia completa com estudos, Strong e planos de leitura, sem propagandas'
if(title.length>30||short.length>80) throw new Error('Metadados acima do limite')
for(const [,filename] of slides){const m=await sharp(path.join(out,filename)).metadata();if(m.width!==1080||m.height!==1920||m.hasAlpha)throw new Error(`Formato inválido: ${filename}`)}
console.log(`Kit validado. Nome: ${title.length}/30; descrição curta: ${short.length}/80. Saída: ${out}`)

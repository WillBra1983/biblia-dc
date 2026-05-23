/**
 * Copia a coluna `referencias` do TSV (extraído do TXT paralelo) para
 * `public/pericopes_ara.backup.json`, quando o livro/capítulo/versículo e o título
 * (normalizado) coincidem com uma entrada existente.
 *
 * 1) node scripts/compare-pericopes-txt-vs-json.mjs
 * 2) node scripts/merge-pericopes-refs-from-tsv.mjs
 * 3) node scripts/rebuild-pericopes-from-ara-backup.mjs
 *
 * Uso: node scripts/merge-pericopes-refs-from-tsv.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tsvPath = path.join(root, "scripts", "pericopes-extracted-from-txt-full.tsv");
const jsonPath = path.join(root, "public", "pericopes_ara.backup.json");

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const tsvRaw = fs.readFileSync(tsvPath, "utf8");
const lines = tsvRaw.split(/\r?\n/).filter(Boolean);
const header = lines[0].split("\t");
const idxRef = header.indexOf("referencias");
const idxLivro = header.indexOf("livro");
const idxCap = header.indexOf("capitulo");
const idxVer = header.indexOf("versiculo");
const idxTit = header.indexOf("titulo_ara");
if (idxRef < 0 || idxLivro < 0) {
  console.error("TSV sem colunas esperadas. Rode compare-pericopes-txt-vs-json.mjs antes.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
let merged = 0;
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split("\t");
  const ref = (cols[idxRef] || "").trim();
  if (!ref) continue;
  const code = cols[idxLivro];
  const cap = String(parseInt(cols[idxCap], 10));
  const ver = String(parseInt(cols[idxVer], 10));
  const tituloTsv = cols[idxTit] || "";
  const nt = norm(tituloTsv);
  const rows = data[code]?.[cap];
  if (!Array.isArray(rows)) {
    skipped++;
    continue;
  }
  const row = rows.find(
    (r) => String(r.versiculo) === ver && norm(r.pericope) === nt
  );
  if (row) {
    row.referencias = ref;
    merged++;
  } else {
    skipped++;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
console.log("OK: referencias fundidas no backup JSON");
console.log("    Linhas TSV com ref aplicadas:", merged);
console.log("    Sem correspondência (ou sem ref no TSV):", skipped);

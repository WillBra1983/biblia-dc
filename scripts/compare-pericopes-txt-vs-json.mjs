/**
 * Extrai perícopes da coluna ARA (lado esquerdo) do ficheiro paralelo
 * Portugues-ARA-NVI-All-Bible.txt e compara com public/pericopes_ara.backup.json.
 *
 * Uso: node scripts/compare-pericopes-txt-vs-json.mjs
 */
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const txtPath = path.join(root, "Portugues-ARA-NVI-All-Bible.txt");
const jsonPath = path.join(root, "public", "pericopes_ara.backup.json");

/** Nome do livro em PT (como no TXT) → código USFM do backup */
const PT_BOOK_TO_CODE = new Map([
  ["Gênesis", "GEN"],
  ["Êxodo", "EXO"],
  ["Levítico", "LEV"],
  ["Números", "NUM"],
  ["Deuteronômio", "DEU"],
  ["Josué", "JOS"],
  ["Juízes", "JDG"],
  ["Rute", "RUT"],
  ["1 Samuel", "1SA"],
  ["2 Samuel", "2SA"],
  ["1 Reis", "1KI"],
  ["2 Reis", "2KI"],
  ["1 Crônicas", "1CH"],
  ["2 Crônicas", "2CH"],
  ["Esdras", "EZR"],
  ["Neemias", "NEH"],
  ["Ester", "EST"],
  ["Jó", "JOB"],
  ["Salmos", "PSA"],
  ["Provérbios", "PRO"],
  ["Eclesiastes", "ECC"],
  ["Cantares", "SNG"],
  ["Isaías", "ISA"],
  ["Jeremias", "JER"],
  ["Lamentações", "LAM"],
  ["Ezequiel", "EZK"],
  ["Daniel", "DAN"],
  ["Oséias", "HOS"],
  ["Joel", "JOL"],
  ["Amós", "AMO"],
  ["Obadias", "OBA"],
  ["Jonas", "JON"],
  ["Miquéias", "MIC"],
  ["Naum", "NAM"],
  ["Habacuque", "HAB"],
  ["Sofonias", "ZEP"],
  ["Ageu", "HAG"],
  ["Zacarias", "ZEC"],
  ["Malaquias", "MAL"],
  ["Mateus", "MAT"],
  ["Marcos", "MRK"],
  ["Lucas", "LUK"],
  ["João", "JHN"],
  ["Atos", "ACT"],
  ["Romanos", "ROM"],
  ["1 Coríntios", "1CO"],
  ["2 Coríntios", "2CO"],
  ["Gálatas", "GAL"],
  ["Efésios", "EPH"],
  ["Filipenses", "PHP"],
  ["Colossenses", "COL"],
  ["1 Tessalonicenses", "1TH"],
  ["2 Tessalonicenses", "2TH"],
  ["1 Timóteo", "1TI"],
  ["2 Timóteo", "2TI"],
  ["Tito", "TIT"],
  ["Filemom", "PHM"],
  ["Hebreus", "HEB"],
  ["Tiago", "JAS"],
  ["1 Pedro", "1PE"],
  ["2 Pedro", "2PE"],
  ["1 João", "1JN"],
  ["2 João", "2JN"],
  ["3 João", "3JN"],
  ["Judas", "JUD"],
  ["Apocalipse", "REV"],
]);

const COL_GAP = 18;

function norm(s) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Linha só com referência cruzada (ex.: Lucas 6.20-23) */
function isCrossRefOnly(left) {
  const t = left.trim();
  if (t.length > 55) return false;
  return /^(?:[1-4]\s?)?[A-Za-zÀ-ú]+\s+\d+[.:]\d/.test(t);
}

/** Primeira coluna é início de versículo ARA */
function verseNumFromLeft(left) {
  const m = left.trim().match(/^(\d{1,3})\s+/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Número do versículo a partir da linha inteira (não só da coluna esquerda após split).
 * Quando o vão largo vem logo após o número (ex.: «21» + espaços + NVI), o split
 * devolve só «21» na coluna e verseNumFromLeft falha sem espaço após o dígito.
 */
function verseNumFromLine(line) {
  const m = line.trim().match(/^(\d{1,3})\s+/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Duas colunas separadas por um vão largo. Não usar split(/\s{18,}/): a indentação
 * inicial (ex.: linha só com «Do homicídio» centrado) também tem 18+ espaços e
 * partia a linha no sítio errado.
 */
function splitColumns(line) {
  const m = line.match(new RegExp(`^\\s*(.+?)\\s{${COL_GAP},}(.+)$`));
  if (!m) return null;
  const left = m[1].trim();
  const right = m[2].trim();
  if (!left || !right) return null;
  return [left, right];
}

/**
 * Alguns subtítulos ARA vêm sozinhos na linha (sem coluna NVI no mesmo registo).
 * Ex.: «Os discípulos, a luz do mundo» — indentados, sem separador largo.
 */
function splitColumnsOrTitleLine(line) {
  const two = splitColumns(line);
  if (two) return two;
  const lead = leadingSpaces(line);
  const t = line.trim();
  /** Títulos ARA/NVI centrados nesta edição: indentação moderada (não fragmentos colados à margem com 70+ espaços). */
  const centeredIndent = lead >= 14 && lead <= 42;
  if (
    centeredIndent &&
    t.length >= 6 &&
    t.length < 95 &&
    verseNumFromLeft(t) == null &&
    /^[A-ZÀ-Ú]/.test(t) &&
    !isFooterOrNoise(t) &&
    !isCrossRefOnly(t) &&
    !/;\s*m[a-zà-ú]/.test(t)
  ) {
    return [t, ""];
  }
  return null;
}

function isFooterOrNoise(left) {
  return (
    /Almeida Revista|Sociedade Bíblica|Nova Versão Internacional|NVI©|@19|^-{3,}|Page \d+/i.test(left) ||
    /^-------------------/.test(left)
  );
}

/** Cabeçalho de capítulo “duplicado” nas duas colunas */
function parseStdChapterHeader(line) {
  const cols = splitColumns(line);
  if (!cols) return null;
  const [a, b] = cols;
  if (norm(a) !== norm(b)) return null;
  const t = a.trim();
  const m = t.match(/^((?:\d+\s+)?[^\d]+?)\s+(\d+)\s*$/);
  if (!m) return null;
  const bookPt = m[1].trim();
  const chapter = parseInt(m[2], 10);
  const code = PT_BOOK_TO_CODE.get(bookPt);
  if (!code || !Number.isFinite(chapter)) return null;
  return { code, chapter, bookPt };
}

/** Salmo N | Salmos N */
function parsePsalmChapterHeader(line) {
  const cols = splitColumns(line);
  if (!cols) return null;
  const [a, b] = cols;
  const ma = a.trim().match(/^Salmo\s+(\d+)\s*$/i);
  const mb = b.trim().match(/^Salmos\s+(\d+)\s*$/i);
  if (!ma || !mb || ma[1] !== mb[1]) return null;
  return { code: "PSA", chapter: parseInt(ma[1], 10), bookPt: "Salmos" };
}

/** Cântico N | Cantares N */
function parseSongChapterHeader(line) {
  const cols = splitColumns(line);
  if (!cols) return null;
  const [a, b] = cols;
  const ma = a.trim().match(/^Cântico\s+(\d+)\s*$/i);
  const mb = b.trim().match(/^Cantares\s+(\d+)\s*$/i);
  if (!ma || !mb || ma[1] !== mb[1]) return null;
  return { code: "SNG", chapter: parseInt(ma[1], 10), bookPt: "Cantares" };
}

function parseChapterHeader(line) {
  return (
    parseStdChapterHeader(line) ||
    parsePsalmChapterHeader(line) ||
    parseSongChapterHeader(line)
  );
}

/** Primeiros caracteres da linha bruta (indentação visual no PDF / texto paralelo) */
function leadingSpaces(line) {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

/**
 * Perícopes neste TXT aparecem como títulos indentados ("centralizados") ou,
 * no VT, por vezes com margem curta mas começando por artigo (ex.: «A criação…»).
 * Linhas de texto colunado sem indentação são quase sempre continuação de versículo
 * (genealogias, etc.), não títulos.
 */
function isTitleCandidate(line, leftRaw) {
  const left = leftRaw.trim();
  const lead = leadingSpaces(line);
  if (left.length < 6 || left.length > 130) return false;
  if (verseNumFromLeft(left) != null) return false;
  if (/^[a-zà-ú]/.test(left)) return false;
  if (isCrossRefOnly(left)) return false;
  if (isFooterOrNoise(left)) return false;

  const centered = lead >= 6;
  const articleTitle =
    lead >= 1 &&
    /^(A |O |As |Os |Da |Do |Dos |Das |Um |Uma )/.test(left);
  const properTitle =
    lead >= 1 && /^(Jesus |Paulo |Deus )/.test(left);

  if (!centered && !articleTitle && !properTitle) return false;

  return true;
}

/** Paralelos / referências cruzadas (ex.: «Marcos 9.49-50; Lucas 14.34-35»), linha após o título */
function isParalelosLine(line) {
  const t = line.trim();
  if (t.length < 6 || t.length > 220) return false;
  if (verseNumFromLine(line) != null) return false;
  if (isFooterOrNoise(t)) return false;
  return /(?:^|[;]\s*)(?:[1-4]\s+)?[A-Za-zÀ-ú][A-Za-zÀ-ú.\s]{0,45}\s+\d+\s*[.:]\s*\d/.test(
    t
  );
}

async function extractFromTxt() {
  /** @type {{code:string,chapter:number,verse:number,titulo:string,line:number,referencias?:string}[]} */
  const out = [];
  let cur = { code: null, chapter: null };

  /** @type {{titulo:string,line:number,referencias?:string}[]} */
  let pending = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(txtPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;

    const ch = parseChapterHeader(line);
    if (ch) {
      cur = { code: ch.code, chapter: ch.chapter };
      pending = [];
      continue;
    }

    if (!cur.code || cur.chapter == null) continue;

    /**
     * Linha de versículo: número + espaço + texto. Tem de ser tratada **antes** de
     * exigir duas colunas com vão largo: muitas linhas ARA/NVI têm o separador mais
     * estreito que COL_GAP, e `splitColumnsOrTitleLine` devolve null — caso contrário
     * os títulos pendentes só seriam associados ao próximo versículo que casasse no
     * split (ex.: Mt 5.13 sem gap de 18 espaços → «sal» e «luz» ambos no v. 14).
     */
    const vnFlush = verseNumFromLine(line);
    if (vnFlush != null) {
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i];
        out.push({
          code: cur.code,
          chapter: cur.chapter,
          verse: vnFlush,
          titulo: p.titulo,
          line: p.line,
          referencias: p.referencias,
        });
      }
      pending = [];
      continue;
    }

    if (isParalelosLine(line) && pending.length > 0) {
      const r = line.trim();
      const last = pending[pending.length - 1];
      last.referencias = last.referencias ? `${last.referencias}; ${r}` : r;
      continue;
    }

    const cols = splitColumnsOrTitleLine(line);
    if (!cols) continue;

    const [left] = cols;

    if (isTitleCandidate(line, left)) {
      pending.push({ titulo: left.trim(), line: lineNum });
    }
  }

  return out;
}

function buildJsonTitleSets(data) {
  /** @type {Map<string, Set<string>>} key = CODE|chapter */
  const map = new Map();
  for (const code of Object.keys(data)) {
    const chs = data[code];
    if (!chs || typeof chs !== "object") continue;
    for (const ck of Object.keys(chs)) {
      const rows = chs[ck];
      if (!Array.isArray(rows)) continue;
      const key = `${code}|${ck}`;
      if (!map.has(key)) map.set(key, new Set());
      const set = map.get(key);
      for (const row of rows) {
        const t = norm(String(row.pericope ?? ""));
        if (t) set.add(t);
      }
    }
  }
  return map;
}

function main() {
  console.log("A ler TXT (linha a linha)…");
  extractFromTxt().then((extracted) => {
    console.log("Perícopes extraídas do TXT:", extracted.length);

    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const jsonSets = buildJsonTitleSets(data);

    /** TXT → falta no JSON (mesmo capítulo, título não existe no backup) */
    const missingInJson = [];
    for (const row of extracted) {
      const key = `${row.code}|${row.chapter}`;
      const set = jsonSets.get(key);
      const nt = norm(row.titulo);
      if (!set || !set.has(nt)) {
        missingInJson.push(row);
      }
    }

    /** JSON → não encontrado no TXT (mesmo capítulo, nenhuma linha com título igual) */
    const missingInTxt = [];
    for (const [jkey, titles] of jsonSets) {
      const [code, chStr] = jkey.split("|");
      const ch = parseInt(chStr, 10);
      for (const jt of titles) {
        const found = extracted.some(
          (e) => e.code === code && e.chapter === ch && norm(e.titulo) === jt
        );
        if (!found) {
          missingInTxt.push({ code, chapter: ch, titulo: jt });
        }
      }
    }

    const byBook = new Map();
    for (const m of missingInJson) {
      if (!byBook.has(m.code)) byBook.set(m.code, []);
      byBook.get(m.code).push(m);
    }

    console.log("\n=== Temas no TXT paralelo que NÃO estão no pericopes_ara.backup.json ===");
    console.log("(mesmo livro/capítulo: título normalizado não aparece na lista JSON)\n");
    console.log("Total:", missingInJson.length);

    const sortedBooks = [...byBook.keys()].sort();
    for (const code of sortedBooks) {
      const rows = byBook.get(code);
      console.log(`\n--- ${code} (${rows.length} temas no TXT ausentes no JSON) ---`);
      let prevCh = null;
      for (const r of rows.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse || a.line - b.line)) {
        if (r.chapter !== prevCh) {
          prevCh = r.chapter;
          console.log(`  Cap. ${r.chapter}:`);
        }
        console.log(`    v${r.verse} (txt linha ${r.line}) «${r.titulo}»`);
      }
    }

    console.log("\n=== Entradas no JSON sem título idêntico encontrado no TXT ===");
    console.log("(Capítulos pouco reconhecidos ou heurística falhou no TXT)\n");
    console.log("Total:", missingInTxt.length);
    const mtSample = missingInTxt.slice(0, 40);
    for (const x of mtSample) {
      console.log(`  ${x.code} ${x.chapter}: «${x.titulo}»`);
    }
    if (missingInTxt.length > 40) console.log(`  … e mais ${missingInTxt.length - 40}`);

    const reportPath = path.join(root, "scripts", "pericopes-txt-vs-json-report.txt");
    const fullTsvPath = path.join(root, "scripts", "pericopes-extracted-from-txt-full.tsv");
    const lines = [];
    lines.push(`Gerado: ${new Date().toISOString()}`);
    lines.push(`TXT: ${txtPath}`);
    lines.push(`JSON: ${jsonPath}`);
    lines.push("");
    lines.push(
      "NOTA: «Falta no JSON» lista só títulos que o TXT tem e o backup NÃO tem.",
      "Títulos já presentes no JSON (ex.: «Do homicídio», «Do adultério», «Dos juramentos»)",
      "não aparecem aí — estão na extração completa abaixo e no ficheiro TSV.",
      ""
    );
    lines.push(`Extraídas do TXT: ${extracted.length}`);
    lines.push(`No TXT mas não no JSON: ${missingInJson.length}`);
    lines.push(`No JSON mas não encontradas no TXT: ${missingInTxt.length}`);
    lines.push("");
    lines.push("=== Extração completa: Mateus 5 (ordem do TXT) ===");
    for (const r of extracted
      .filter((e) => e.code === "MAT" && e.chapter === 5)
      .sort((a, b) => a.line - b.line)) {
      const ref = r.referencias ? `\t«${r.referencias}»` : "";
      lines.push(`v${r.verse}\tlinha ${r.line}\t${r.titulo}${ref}`);
    }
    lines.push("");
    lines.push("=== Falta no JSON ===");
    for (const r of missingInJson.sort(
      (a, b) => a.code.localeCompare(b.code) || a.chapter - b.chapter || a.verse - b.verse
    )) {
      lines.push(`${r.code}\t${r.chapter}\t${r.verse}\tlinha-${r.line}\t${r.titulo}`);
    }
    fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
    const tsvHeader = ["livro", "capitulo", "versiculo", "linha_txt", "titulo_ara", "referencias"].join("\t");
    const tsvBody = extracted
      .sort(
        (a, b) =>
          a.code.localeCompare(b.code) || a.chapter - b.chapter || a.line - b.line
      )
      .map((r) =>
        [
          r.code,
          r.chapter,
          r.verse,
          r.line,
          r.titulo.replace(/\t/g, " "),
          (r.referencias || "").replace(/\t/g, " "),
        ].join("\t")
      )
      .join("\n");
    fs.writeFileSync(fullTsvPath, `${tsvHeader}\n${tsvBody}\n`, "utf8");
    console.log(`\nRelatório completo: ${reportPath}`);
    console.log(`Extração completa (TSV): ${fullTsvPath}`);
  });
}

main();

/**
 * Adiciona a coluna `referencias` (TEXT, opcional) à tabela `pericopes` em public/ara.sqlite.
 * Guarda texto semelhante ao impresso: "Marcos 9.49-50; Lucas 14.34-35"
 *
 * Uso: node scripts/migrate-pericopes-add-referencias.mjs
 */
import initSqlJs from "sql.js";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const wasmPath = join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const wasmBinary = readFileSync(wasmPath);
const SQL = await initSqlJs({ wasmBinary });
const dbPath = join(root, "public", "ara.sqlite");
const db = new SQL.Database(readFileSync(dbPath));

const cols = db.exec("PRAGMA table_info(pericopes)");
const hasRefs = cols[0]?.values?.some((row) => row[1] === "referencias");
if (hasRefs) {
  console.log("OK: coluna referencias já existe.");
} else {
  db.run("ALTER TABLE pericopes ADD COLUMN referencias TEXT");
  console.log("OK: coluna referencias adicionada.");
}

writeFileSync(dbPath, Buffer.from(db.export()));
db.close();

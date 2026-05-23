# Qualidade: SQLite e rede (A–D)

> Este documento descreve como reduzir o impacto de download dos `.sqlite`
> (Bíblia ARA, Strong NT/OT, hinário, lexicon) na primeira abertura.

## Resumo das ações implementadas no app

- ✅ Cache em **IndexedDB** versionado (`utils/sqliteAssetCache.js`).
- ✅ Service Worker em **CacheFirst** para `*.sqlite` (`vite.config.js`).
- ✅ Strong NT/OT carregados **sob demanda** (somente ao ativar o botão Strong).
- ✅ `sql.js` com pool de inicialização (sem race condition em montagens duplas).
- ✅ Pré-aquecimento do `ara.sqlite` em paralelo ao splash (`main.jsx`).
- ✅ Code-splitting das rotas pesadas em `lazy()` (`App.jsx`) com prefetch
   inteligente quando o menu abre (`utils/routePrefetch.js`).

## C — VACUUM

Reduz fragmentação e, muitas vezes, o tamanho do ficheiro no disco.

```bash
npm run sqlite:vacuum
```

## C — Pré-compressão (gzip + brotli) para servir no nginx

Os SQLite são quase ideais para compressão (textos repetidos, espaços, esquema).
Gerar os pares `.gz`/`.br` no deploy evita custo em runtime e dá ganhos de 60–70%.

```bash
npm run sqlite:precompress
# ou tudo de uma vez
npm run sqlite:optimize
```

Configuração no nginx (dentro do `server`):

```nginx
location ~* \.(sqlite|db)$ {
    gzip_static on;       # serve foo.sqlite.gz se existir
    brotli_static on;     # serve foo.sqlite.br se existir (módulo brotli ativo)
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Accept-Ranges bytes;
}
```

Apache (`.htaccess`):

```apache
<FilesMatch "\.sqlite$">
  Header set Cache-Control "public, max-age=31536000, immutable"
  Header set Accept-Ranges bytes
</FilesMatch>
AddEncoding gzip .gz
AddEncoding br .br
```

> O **navegador descomprime automaticamente** quando vê `Content-Encoding`.
> Não há mudança no front-end.

### Versionamento

Ao publicar uma versão nova do `ara.sqlite`, defina `VITE_SQLITE_ASSET_REV`
(ou edite o nome via querystring) — isso invalida o cache no IndexedDB e no
Service Worker. Ex.:

```bash
cross-env VITE_SQLITE_ASSET_REV=2026-05 VITE_BASE_URL=/biblia/ vite build
```

## D — `sql.js-httpvfs` (carregamento por páginas)

O pacote `sql.js-httpvfs` permite consultar uma base **sem** descarregá-la
inteira: o motor pede só as páginas necessárias via HTTP Range.

### Já está integrado (modo opcional) para `stepbible_lexicon.sqlite`

O `stepbible_lexicon.sqlite` tem 62 MB; baixar inteiro só para mostrar o
detalhe de um Strong é desperdício. O `stepBibleLexiconService.js` agora
suporta os dois modos:

1. **Clássico (padrão):** baixa o ficheiro inteiro (com cache em IndexedDB
   + Service Worker). É o que continua acontecendo no APK do Android.
2. **Paginado (opt-in via env var, só PWA web):** consultas via Range.

**Como ativar (apenas no build web/PWA):**

```bash
npm install            # garante sql.js-httpvfs
npm run setup:httpvfs  # copia sqlite.worker.js para public/
cross-env VITE_USE_SQLITE_HTTPVFS=1 VITE_BASE_URL=/biblia/ vite build
```

**Requisitos do servidor (foundcine.com/biblia/):**

- `Accept-Ranges: bytes` (nginx tem por padrão).
- **NÃO** comprimir o ficheiro `.sqlite` "on the fly" para httpvfs: o Range
  precisa do byte offset bruto. Para httpvfs, sirva o `.sqlite` **sem**
  `Content-Encoding`. (A pré-compressão `.gz`/`.br` continua útil para o
  modo clássico e pode coexistir, basta que a regra do nginx aplique
  `gzip_static` apenas quando o cliente envia `Accept-Encoding: gzip` — o
  worker do httpvfs não envia.)

**Por que não no APK:** o WebView do Android nem sempre suporta Range em
assets `file://`, e o serviço já detecta `Capacitor.isNativePlatform()`
para cair no modo clássico — então o APK continua funcionando como antes,
mesmo que a flag esteja ligada.

**Por que não para `ara.sqlite` (9,7 MB):** o cache em IndexedDB já resolve a
abertura recorrente; httpvfs só ajudaria a primeira abertura, e no APK seria
desativado de qualquer forma. Documentado para referência futura, mas não
recomendado no momento.

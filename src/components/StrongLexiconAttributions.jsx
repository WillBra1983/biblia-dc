import { Box, Link, Typography } from '@mui/material'

/**
 * Menções de licença exigidas pelas fontes usadas nos builds documentados em
 * `docs/licencas-fontes-biblicas.md`, `docs/third-party-notices-template.md`, `docs/prova-nt-strong.md`
 * e pelo pacote `scripts/build_stepbible_lexicon.py` (@metaxia/scriptures-source-stepbible-lexicon).
 */
const sxRodape = {
  mt: 3,
  mb: 2,
  pt: 2,
  borderTop: '1px solid',
  borderColor: 'divider',
  fontFamily: 'ui-monospace, "Cascadia Code", "Consolas", monospace',
  fontSize: '0.65rem',
  lineHeight: 1.55,
  color: 'text.secondary',
  letterSpacing: '0.01em'
}

function BlocoAtribuicao({ titulo, children }) {
  return (
    <Box sx={{ mb: 1.15 }}>
      <Typography
        component="div"
        sx={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 700,
          color: 'text.secondary',
          mb: 0.35
        }}
      >
        {titulo}
      </Typography>
      {children}
    </Box>
  )
}

export default function StrongLexiconAttributions() {
  return (
    <Box
      component="footer"
      id="strong-fontes-creditos"
      aria-label="Atribuições de licença dos dados lexicais"
      sx={sxRodape}
    >
      <Typography
        component="div"
        sx={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          mb: 1,
          color: 'text.secondary'
        }}
      >
        Atribuição de licenças (dados lexicais)
      </Typography>
      <Typography component="p" sx={{ fontFamily: 'inherit', fontSize: 'inherit', m: 0, mb: 1.25, opacity: 0.95 }}>
        Textos abaixo atendem à atribuição exigida por licenças{' '}
        <Link
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          color="inherit"
          sx={{ textDecoration: 'underline' }}
        >
          CC BY 4.0
        </Link>{' '}
        e à documentação interna do projeto. Mantenha estes créditos acessíveis aos utilizadores, conforme cada
        licença.
      </Typography>

      <BlocoAtribuicao titulo="Open Scriptures Hebrew Bible (MorphHB) — CC BY 4.0">
        <Typography component="p" sx={{ fontFamily: 'inherit', fontSize: 'inherit', m: 0 }}>
          &quot;Original work of the Open Scriptures Hebrew Bible available at{' '}
          <Link
            href="https://github.com/openscriptures/morphhb"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            sx={{ wordBreak: 'break-all' }}
          >
            https://github.com/openscriptures/morphhb
          </Link>
          &quot;
        </Typography>
        <Typography component="p" sx={{ fontFamily: 'inherit', fontSize: 'inherit', m: 0, mt: 0.35, opacity: 0.9 }}>
          Licença:{' '}
          <Link
            href="https://raw.githubusercontent.com/openscriptures/morphhb/master/LICENSE.md"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            sx={{ wordBreak: 'break-all' }}
          >
            openscriptures/morphhb/LICENSE.md
          </Link>
        </Typography>
      </BlocoAtribuicao>

      <BlocoAtribuicao titulo="Open Scriptures Hebrew Lexicon (Strong AT, índice lexical, BDB em XML) — CC BY 4.0">
        <Typography component="p" sx={{ fontFamily: 'inherit', fontSize: 'inherit', m: 0 }}>
          Dados derivados de{' '}
          <Link
            href="https://github.com/openscriptures/HebrewLexicon"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            sx={{ wordBreak: 'break-all' }}
          >
            https://github.com/openscriptures/HebrewLexicon
          </Link>{' '}
          (ficheiros incl. HebrewStrong.xml, LexicalIndex.xml, BrownDriverBriggs.xml), licenciados em CC BY 4.0
          conforme o repositório.
        </Typography>
        <Typography component="p" sx={{ fontFamily: 'inherit', fontSize: 'inherit', m: 0, mt: 0.35, opacity: 0.9 }}>
          Informação de licença no projeto:{' '}
          <Link
            href="https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/index.html"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            sx={{ wordBreak: 'break-all' }}
          >
            HebrewLexicon/index.html
          </Link>
        </Typography>
      </BlocoAtribuicao>

      <BlocoAtribuicao titulo="STEP Bible (léxico TBESH / TBESG / TFLSJ; origem STEPBible-Data) — CC BY 4.0">
        <Typography component="p" sx={{ fontFamily: 'inherit', fontSize: 'inherit', m: 0 }}>
          &quot;Lexicon data from{' '}
          <Link href="https://www.stepbible.org/" target="_blank" rel="noopener noreferrer" color="inherit">
            STEPBible.org
          </Link>{' '}
          by Tyndale House, Cambridge. Licensed under CC BY 4.0.&quot;
        </Typography>
        <Typography component="p" sx={{ fontFamily: 'inherit', fontSize: 'inherit', m: 0, mt: 0.35, opacity: 0.9 }}>
          Dados incorporados via build a partir do pacote npm que referencia STEPBible-Data; licença:{' '}
          <Link
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
          >
            CC BY 4.0
          </Link>
          .
        </Typography>
      </BlocoAtribuicao>

      <BlocoAtribuicao titulo="Léxico Strong grego (fonte da prova NT documentada) — CC0 1.0">
        <Typography component="p" sx={{ fontFamily: 'inherit', fontSize: 'inherit', m: 0 }}>
          Entradas Strong grego: dataset{' '}
          <Link
            href="https://github.com/morphgnt/strongs-dictionary-xml"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            sx={{ wordBreak: 'break-all' }}
          >
            morphgnt/strongs-dictionary-xml
          </Link>{' '}
          — dedicado ao domínio público com{' '}
          <Link
            href="https://creativecommons.org/publicdomain/zero/1.0/"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
          >
            CC0 1.0
          </Link>{' '}
          (ver <strong>docs/prova-nt-strong.md</strong> no repositório da app).
        </Typography>
      </BlocoAtribuicao>

      <Typography component="p" sx={{ fontFamily: 'inherit', fontSize: 'inherit', m: 0, mt: 1, opacity: 0.85 }}>
        Nota: o ficheiro <strong>strongs-dictionary.xhtml</strong> do repositório{' '}
        <Link
          href="https://github.com/openscriptures/strongs"
          target="_blank"
          rel="noopener noreferrer"
          color="inherit"
        >
          openscriptures/strongs
        </Link>{' '}
        está referido na documentação interna como <strong>GPL</strong> e como não embutido neste produto; a app
        utiliza as fontes listadas acima.
      </Typography>
    </Box>
  )
}

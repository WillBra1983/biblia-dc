# Fontes de Referência para Perícopes Bíblicas

## Opções para obter um arquivo de referência confiável:

### 1. **Bible Gateway** (Recomendado)
- Site: https://www.biblegateway.com
- Possui perícopes/section headings em várias traduções
- Pode ser necessário fazer scraping manual ou usar API (se disponível)

### 2. **ESV API** (English Standard Version)
- Site: https://api.esv.org
- Possui section headings (perícopes)
- Requer registro para API key (gratuito)
- Documentação: https://api.esv.org/docs/

### 3. **Bible.com / YouVersion**
- Site: https://www.bible.com
- Possui perícopes em várias traduções
- Pode ser necessário fazer scraping

### 4. **Sociedade Bíblica do Brasil**
- Site: https://www.sbb.org.br
- Pode ter recursos de perícopes em português
- Contato direto pode fornecer arquivos de referência

### 5. **Bible Hub**
- Site: https://biblehub.com
- Possui section headings
- Pode ser acessado via scraping

## Como usar:

1. **Baixe ou obtenha um arquivo JSON de perícopes de uma fonte confiável**
2. **Salve o arquivo na raiz do projeto** (ex: `pericopes_referencia.json`)
3. **Execute o script de comparação:**
   ```powershell
   cd C:\Salvation\public
   python comparar_pericopes_com_referencia.py
   ```
4. **Quando solicitado, forneça o caminho do arquivo de referência**

## Formato esperado do arquivo de referência:

O arquivo deve estar no mesmo formato do `pericopes_ara.backup.json`:

```json
{
  "GEN": {
    "1": [
      {"versiculo": "1", "pericope": "A criação dos céus e da terra"},
      {"versiculo": "3", "pericope": "A criação da luz"}
    ]
  },
  "EXO": {
    ...
  }
}
```

## Alternativa: Criar arquivo manualmente

Se você tiver acesso a uma Bíblia impressa ou digital com perícopes corretas, você pode:
1. Criar manualmente um arquivo JSON com as perícopes corretas
2. Usar esse arquivo como referência para comparar e corrigir o JSON atual




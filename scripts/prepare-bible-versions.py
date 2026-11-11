"""Normaliza somente os textos de versões já presentes no projeto."""
import argparse, ast, collections, hashlib, html, json, pathlib, re, sqlite3, unicodedata

root=pathlib.Path(__file__).resolve().parents[1]
ara=sqlite3.connect(root/'public/ara.sqlite')
books=ara.execute('SELECT id,book_reference_id,testament_reference_id,name FROM book ORDER BY id').fetchall()
chapters=set(ara.execute('SELECT DISTINCT book_id,chapter FROM verse'))
destino=root/'public/bibles'
destino.mkdir(exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--only',choices=['naa','ntlh'])
args=parser.parse_args()
codigos='GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()

def pericopes_fonte(codigo):
    if codigo=='naa':
        arquivo=root/'data/bible-pericopes/naa.json'
        dados=json.loads(arquivo.read_text(encoding='utf-8'))
        assert dados.get('versao')=='naa' and dados.get('completo') and len(dados.get('capitulos',{}))==1189, 'Execute primeiro import-naa-pericopes.mjs até completar os 1189 capítulos'
        return [p for cap in dados['capitulos'].values() for p in cap['pericopes']]
    fonte=(root/'ntlh_bruta.txt').read_text(encoding='utf-8-sig')
    resultado=[]; pendentes=[]; vistos=set(); livro=capitulo=None; grupo_ancora=[]; versiculo_ancora=None
    for linha in fonte.splitlines():
        linha=linha.strip()
        cabecalho=re.fullmatch(r'### ([A-Z0-9]{3}) (\d+) ###',linha)
        if cabecalho:
            assert not pendentes, 'Título sem versículo antes do próximo capítulo'
            livro=codigos.index(cabecalho[1])+1; capitulo=int(cabecalho[2]); vistos.add((livro,capitulo))
            grupo_ancora=[]; versiculo_ancora=None
        elif linha.startswith('[') and linha.endswith(']'):
            titulo=linha[1:-1].strip()
            assert titulo and not titulo.startswith('Erro'), 'Título inválido'
            pendentes.append(titulo)
            grupo_ancora=[]
        else:
            versiculo=re.match(r'^(\d+)(?:[–-]\d+)?\s+',linha)
            if versiculo:
                numero=int(versiculo[1]); corpo=linha[versiculo.end():].strip()
                if pendentes:
                    grupo_ancora=[]; versiculo_ancora=numero
                    for titulo in pendentes:
                        item={'livro_id':livro,'capitulo':capitulo,'versiculo':numero,'titulo':titulo,'referencias':None,'ancora':corpo}
                        resultado.append(item); grupo_ancora.append(item)
                    pendentes=[]
                elif grupo_ancora:
                    for item in grupo_ancora: item['ancora']=(item['ancora']+' '+corpo)[:600]
    assert not pendentes and vistos==chapters, 'Fonte NTLH incompleta'
    assert len(resultado)==2692, 'Contagem dos títulos NTLH mudou; conferir a fonte'
    return resultado

def escrever(codigo,rows):
    normalizados=[]
    for book,chapter,numero,text in rows:
        if not text.strip():
            assert normalizados and normalizados[-1][0:2]==(book,chapter) and normalizados[-1][3]+1==numero, 'Agrupamento sem versículo anterior'
            b,c,v,fim,t=normalizados[-1]
            normalizados[-1]=(b,c,v,numero,t)
        else: normalizados.append((book,chapter,numero,numero,text))
    rows=normalizados
    chaves=[(b,c,v) for b,c,v,fim,t in rows]
    assert len(chaves)==len(set(chaves)), 'Referências duplicadas'
    assert set((b,c) for b,c,v,fim,t in rows)==chapters, 'Capítulos ausentes ou adicionais'
    invalidos=[(b,c,v,t[:70]) for b,c,v,fim,t in rows if not (1<=b<=66 and 1<=v<=fim<=176 and t.strip() and '\ufffd' not in t)]
    assert not invalidos, json.dumps(invalidos[:12],ensure_ascii=True)
    por_capitulo=collections.defaultdict(list)
    for b,c,v,fim,t in rows: por_capitulo[(b,c)].append((v,fim,t))
    pericopes=[]
    reposicionados=0
    normalizar=lambda texto: ''.join(c for c in unicodedata.normalize('NFC',texto).lower() if c.isalnum())
    textos_capitulo={}
    for chave,blocos in por_capitulo.items():
        unificado=''; offsets=[]
        for v,fim,t in blocos:
            normalizado=normalizar(t); offsets.append((len(unificado),len(unificado)+len(normalizado),v)); unificado+=normalizado
        textos_capitulo[chave]=(unificado,offsets)
    for p in pericopes_fonte(codigo):
        chave=(p['livro_id'],p['capitulo'])
        inicio=next((v for v,fim,t in por_capitulo[chave] if v<=p['versiculo']<=fim),None)
        ancora=normalizar(p.get('ancora',''))[:100]
        if len(ancora)>=20:
            unificado,offsets=textos_capitulo[chave]
            posicao=unificado.find(ancora)
            candidatos=[v for a,b,v in offsets if a<=posicao<b] if posicao>=0 and unificado.find(ancora,posicao+1)<0 else []
            if len(candidatos)==1 and candidatos[0]!=inicio:
                inicio=candidatos[0]; reposicionados+=1
        assert inicio is not None, f'Título fora do texto: {codigo} {chave} {p["versiculo"]}'
        assert p['titulo'].strip() and '\ufffd' not in p['titulo'], 'Título inválido'
        pericopes.append((*chave,inicio,p['titulo'],p.get('referencias')))
    pericopes.sort(key=lambda p:p[:3])
    assert pericopes, 'Base sem títulos de perícope'
    caminho=destino/f'{codigo}.sqlite'
    # Recria somente as tabelas do arquivo de saída conhecido; originais preservados.
    with sqlite3.connect(caminho) as db:
        db.executescript('DROP TABLE IF EXISTS book; DROP TABLE IF EXISTS verse; DROP TABLE IF EXISTS pericopes; CREATE TABLE book(id INTEGER PRIMARY KEY,book_reference_id INTEGER,testament_reference_id INTEGER,name TEXT); CREATE TABLE verse(id INTEGER PRIMARY KEY,book_id INTEGER,chapter INTEGER,verse_number INTEGER,verse_end INTEGER,text TEXT); CREATE UNIQUE INDEX verse_reference ON verse(book_id,chapter,verse_number); CREATE TABLE pericopes(id INTEGER PRIMARY KEY,livro_id INTEGER,capitulo INTEGER,versiculo INTEGER,titulo TEXT,referencias TEXT);')
        db.executemany('INSERT INTO book VALUES(?,?,?,?)',books)
        db.executemany('INSERT INTO verse(book_id,chapter,verse_number,verse_end,text) VALUES(?,?,?,?,?)', sorted(rows))
        db.executemany('INSERT INTO pericopes(livro_id,capitulo,versiculo,titulo,referencias) VALUES(?,?,?,?,?)',pericopes)
    return {'codigo':codigo,'blocos':len(rows),'versiculos':sum(fim-v+1 for b,c,v,fim,t in rows),'capitulos':len(chapters),'pericopes':len(pericopes),'titulos_reposicionados_por_texto':reposicionados,'revisao':hashlib.sha256(caminho.read_bytes()).hexdigest()[:12]}

naa=sqlite3.connect(root/'naa.sqlite')
rows=[]
for book,chapter,text in naa.execute('SELECT book_id,chapter,text FROM verse ORDER BY book_id,chapter,id'):
    m=re.match(r'^([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*',text)
    assert m, 'NAA sem número de versículo'
    numero=int(''.join(str(unicodedata.digit(c)) for c in m[1]))
    # Apenas remove o marcador numérico; não reescreve o texto da tradução.
    rows.append((book,chapter,numero,text[m.end():].strip()))
resultados=[]
if args.only in (None,'naa'): resultados.append(escrever('naa',rows))

raw=(root/'ntlh.txt').read_text(encoding='utf-8-sig')
pattern=re.compile(r"\((\d+),(\d+),(\d+),(\d+),(\d+),'((?:\\.|[^'\\])*)'\)",re.S)
matches=list(pattern.finditer(raw)); last=0; rows=[]
def controle(s): return re.sub(r';\s*INSERT INTO `versiculos` VALUES\s*','',s).strip(' \r\n\t,;')
for m in matches:
    assert not controle(raw[last:m.start()]), 'Conteúdo não reconhecido no arquivo NTLH'
    row=ast.literal_eval(m[0])
    text=html.unescape(re.sub(r'<[^>]+>','',row[5])).strip()
    rows.append((row[2],row[3],row[4],text))
    last=m.end()
assert not controle(raw[last:]), 'Conteúdo final não reconhecido'
if args.only in (None,'ntlh'): resultados.append(escrever('ntlh',rows))
print(json.dumps(resultados,ensure_ascii=True))

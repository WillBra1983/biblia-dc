# Pronúncia Strong (MP3)

**Entrada:** transliteração do Strong **com acentos** (`Christós`, `thélêma`) — igual à linha em itálico na UI.

- **Não** remove ó/é/ê (evita `Christos` sem som do ó).
- **Não** usa grego polítono `θέλημα` (soletra / soa como "Oelema").
- Voz: `pt-BR-FranciscaNeural` para vogais acentuadas.

```bash
pip install edge-tts
python scripts/generate_strong_pron_mp3.py --force
```

Fallback no app: `strongPronunciationSpeak.js` + `strongPronunciationAudio.js`.

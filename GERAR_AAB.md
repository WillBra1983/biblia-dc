# Como Gerar o Arquivo AAB para Google Play

## Pré-requisitos

1. **Java JDK 17** instalado
2. **Android SDK** configurado
3. **Keystore** configurado (já existe: `android/salvation.keystore`)

## Passos para Gerar o AAB

### 1. Buildar o projeto web

```bash
npm run build
```

### 2. Sincronizar com Capacitor

```bash
npx cap sync android
```

### 3. Gerar o AAB

Navegue até a pasta `android` e execute:

**Windows:**
```bash
cd android
gradlew bundleRelease
```

**Linux/Mac:**
```bash
cd android
./gradlew bundleRelease
```

### 4. Localizar o arquivo AAB

O arquivo AAB será gerado em:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Configurações Atuais

- **Application ID:** `com.bibliadc.app`
- **Version Code:** 1
- **Version Name:** 1.0
- **Min SDK:** 22
- **Target SDK:** 34
- **Keystore:** `android/salvation.keystore`
- **Key Alias:** `salvation`

## Atualizar Versão

Para atualizar a versão antes de gerar um novo AAB, edite `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2  // Incremente este número
    versionName "1.1"  // Atualize a versão
}
```

## Upload para Google Play

1. Acesse o [Google Play Console](https://play.google.com/console)
2. Selecione seu app
3. Vá em "Produção" > "Criar nova versão"
4. Faça upload do arquivo `app-release.aab`
5. Preencha as informações da versão
6. Envie para revisão

## Notas Importantes

- O AAB é o formato obrigatório para novos apps no Google Play
- O arquivo AAB é otimizado e menor que o APK
- O Google Play gera APKs otimizados para cada dispositivo automaticamente
- Mantenha o keystore seguro - você precisará dele para todas as atualizações


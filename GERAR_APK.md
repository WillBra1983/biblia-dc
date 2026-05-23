# Como Gerar APK no PowerShell

## Pré-requisitos
- Node.js instalado
- Android Studio instalado (ou apenas Android SDK)
- Java JDK 17 instalado
- Variável de ambiente ANDROID_HOME configurada (opcional, mas recomendado)

## Passos para Gerar o APK

### 1. Buildar o projeto web
```powershell
npm run build
```

### 2. Sincronizar com Capacitor (copiar o build para Android)
```powershell
npx cap sync android
```

### 3. Gerar o APK de Release
Navegue até a pasta android e execute o Gradle:

```powershell
cd android
.\gradlew.bat assembleRelease
```

OU execute diretamente da raiz do projeto:

```powershell
.\android\gradlew.bat assembleRelease
```

### 4. Localizar o APK gerado
O APK será gerado em:
```
android\app\build\outputs\apk\release\app-release.apk
```

## Comando Único (Script Completo)
Você pode executar tudo em sequência:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleRelease
cd ..
```

## Gerar APK Assinado (Release Final)
O APK gerado já estará assinado com o keystore configurado (`salvation.keystore`).

## Verificar se o APK foi gerado
```powershell
ls android\app\build\outputs\apk\release\
```

## Problemas Comuns

### Erro: "gradlew.bat não é reconhecido"
Certifique-se de estar na pasta correta ou use o caminho completo:
```powershell
.\android\gradlew.bat assembleRelease
```

### Erro: "JAVA_HOME não está definido"
Defina a variável de ambiente temporariamente no PowerShell:
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
```

### Erro: "ANDROID_HOME não está definido"
Defina a variável temporariamente:
```powershell
$env:ANDROID_HOME = "C:\Users\SeuUsuario\AppData\Local\Android\Sdk"
```

## Limpar Build Anterior (Opcional)
Se quiser garantir um build limpo:
```powershell
cd android
.\gradlew.bat clean
cd ..
```

Depois execute novamente os passos de build.


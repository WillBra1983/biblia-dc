# Debug de Notificações - Bíblia DC

## Problema
As notificações aparecem no console do computador mas não no celular.

## Soluções Implementadas

### 1. Permissões no AndroidManifest.xml
- Adicionadas permissões necessárias para notificações locais
- Incluídos receivers para o plugin de notificações

### 2. Configuração do Plugin
- Criado canal de notificação para Android 8+
- Configurado ícone específico para notificações
- Adicionadas configurações no capacitor.config.json

### 3. Melhorias no Código
- Adicionados logs detalhados para debug
- Criada função de teste de notificação
- Adicionado botão de teste na interface

## Como Testar

### 1. Build e Instalação
```bash
# Build do projeto
npm run build

# Sincronizar com Android
npx capacitor sync android

# Build do Android
npx capacitor build android

# Instalar no dispositivo
npx capacitor run android
```

### 2. Teste Imediato
1. Abra o app no celular
2. Clique no ícone de notificação (🔔) na barra superior
3. Verifique se a notificação aparece

### 3. Teste de Agendamento
1. Abra o console do navegador no celular
2. Execute: `window.testNotification()`
3. Verifique se a notificação aparece

### 4. Verificar Status
1. No console, execute: `window.checkNotificationStatus()`
2. Verifique as permissões e notificações pendentes

## Possíveis Problemas

### 1. Permissões Negadas
- Verificar se o usuário concedeu permissão para notificações
- Ir em Configurações > Apps > Bíblia DC > Notificações

### 2. Modo Economia de Bateria
- Alguns dispositivos desabilitam notificações em modo economia de bateria
- Verificar configurações de otimização de bateria

### 3. Versão do Android
- Notificações locais funcionam melhor no Android 8+
- Verificar se o dispositivo suporta as funcionalidades

### 4. Configurações do Sistema
- Verificar se as notificações estão habilitadas no sistema
- Verificar se o app não está sendo "otimizado" pelo sistema

## Logs para Debug

### Console do App
- `🚀 Inicializando notificações...`
- `🔔 Solicitando permissão para notificações...`
- `📱 Resultado da permissão: {display: "granted"}`
- `✅ Permissão concedida, agendando notificação...`
- `✅ Canal de notificação criado com sucesso`
- `✅ Notificação de devocional agendada para 6h da manhã`
- `📋 Notificações pendentes: [...]`

### Logcat do Android
```bash
adb logcat | grep -i notification
adb logcat | grep -i capacitor
```

## Próximos Passos

1. Testar no dispositivo físico
2. Verificar logs do Logcat
3. Testar diferentes horários
4. Verificar se o agendamento diário funciona
5. Testar em diferentes versões do Android

## Comandos Úteis

```bash
# Ver logs em tempo real
adb logcat

# Limpar cache do app
adb shell pm clear com.bibliadc.app

# Reinstalar app
adb uninstall com.bibliadc.app
npx capacitor run android
``` 
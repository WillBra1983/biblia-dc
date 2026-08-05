/** Informa a configuração segura usada pelo app. */
console.log('\n--- Gemini ---\n')
console.log('O app usa somente o proxy autenticado das Cloud Functions.')
console.log('Nenhuma chave Gemini deve existir em variável VITE_ ou no pacote distribuído.')
console.log('\nPara configurar ou trocar a chave do servidor:')
console.log('  npx firebase-tools functions:secrets:set GEMINI_API_KEY')
console.log('  npm run deploy:functions\n')

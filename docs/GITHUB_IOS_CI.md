# Subir o projeto no GitHub (build iOS grátis)

O workflow `.github/workflows/ios-simulator-free.yml` compila o build no simulador **sem US$ 99**.

## 1. Criar repositório no GitHub

1. [github.com/new](https://github.com/new) → nome ex.: `biblia-dc` → **Create repository**.

## 2. No PowerShell (pasta Salvation)

```powershell
cd "c:\Users\Pr Wilson Lucas\Desktop\Salvation"
git init
git add .
git commit -m "Bíblia DC: Android + iOS Capacitor"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/biblia-dc.git
git push -u origin main
```

**Nota:** `GoogleService-Info.plist` e `.env` estão no `.gitignore` (não vão para o GitHub). O build CI ainda compila o app; login Google no simulador pode precisar do plist localmente depois.

## 3. Ver o build

GitHub → **Actions** → **iOS simulador (grátis)** → deve ficar verde em ~10–20 min.

## Repositório privado

Plano grátis: ~2000 min/mês de macOS. Público: minutos macOS ilimitados para Actions.

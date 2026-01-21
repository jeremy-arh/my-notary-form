# Script PowerShell pour régénérer le package-lock.json
# Utilisez ce script si vous rencontrez des erreurs d'intégrité npm
# 
# Usage: .\scripts\regenerate-package-lock.ps1

Write-Host "🧹 Nettoyage du cache npm..." -ForegroundColor Cyan
npm cache clean --force

Write-Host "🗑️  Suppression du package-lock.json existant..." -ForegroundColor Cyan
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
    Write-Host "✅ package-lock.json supprimé" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Aucun package-lock.json trouvé" -ForegroundColor Yellow
}

Write-Host "📦 Suppression de node_modules..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Remove-Item "node_modules" -Recurse -Force
    Write-Host "✅ node_modules supprimé" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Aucun node_modules trouvé" -ForegroundColor Yellow
}

Write-Host "🔄 Réinstallation des dépendances..." -ForegroundColor Cyan
npm install --legacy-peer-deps --package-lock-only

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ package-lock.json régénéré avec succès!" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de la régénération" -ForegroundColor Red
    exit 1
}

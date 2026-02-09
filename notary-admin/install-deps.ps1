# Script pour installer les dépendances npm
Write-Host "Installation des dépendances npm..." -ForegroundColor Cyan
Write-Host "Répertoire: $(Get-Location)" -ForegroundColor Yellow

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "ERREUR: package.json introuvable!" -ForegroundColor Red
    exit 1
}

# Supprimer node_modules s'il existe
if (Test-Path "node_modules") {
    Write-Host "Suppression de node_modules existant..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules
}

# Installer les dépendances
Write-Host "Installation des dépendances avec --legacy-peer-deps..." -ForegroundColor Cyan
npm install --legacy-peer-deps

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Installation terminée avec succès!" -ForegroundColor Green
    
    # Vérifier que les packages critiques sont installés
    $criticalPackages = @("react-chartjs-2", "chart.js", "@dnd-kit/core", "@tiptap/react", "date-fns", "emoji-picker-react")
    $missingPackages = @()
    
    foreach ($package in $criticalPackages) {
        if (-not (Test-Path "node_modules\$package")) {
            $missingPackages += $package
        }
    }
    
    if ($missingPackages.Count -gt 0) {
        Write-Host "⚠️  Packages manquants: $($missingPackages -join ', ')" -ForegroundColor Yellow
        Write-Host "Réessayez l'installation..." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Tous les packages critiques sont installés!" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Erreur lors de l'installation" -ForegroundColor Red
    exit 1
}

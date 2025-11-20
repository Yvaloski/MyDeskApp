# Script PowerShell pour démarrer l'application en mode développement

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  MyDeskApp - Mode Développement" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Node.js est installé
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js n'est pas installé!" -ForegroundColor Red
    Write-Host "Veuillez installer Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js version: $(node --version)" -ForegroundColor Green

# Vérifier si le fichier .env existe
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Fichier .env non trouvé!" -ForegroundColor Yellow
    Write-Host "Création d'un fichier .env d'exemple..." -ForegroundColor Yellow
    
    $envContent = @"
# Azure Cosmos DB
COSMOS_ENDPOINT=your_cosmos_endpoint
COSMOS_KEY=your_cosmos_key
COSMOS_DATABASE_ID=myDeskAppDB
COSMOS_CONTAINER_ID=items

# Server
PORT=3000
NODE_ENV=development

# Security
COOKIE_SECRET=your_secret_key_change_this
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Fichier .env créé. Veuillez le configurer avec vos informations." -ForegroundColor Green
    Write-Host ""
}

# Vérifier si node_modules existe dans le backend
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installation des dépendances backend..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances backend" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dépendances backend installées" -ForegroundColor Green
}

# Vérifier si node_modules existe dans le client
if (-not (Test-Path "client/node_modules")) {
    Write-Host "📦 Installation des dépendances frontend..." -ForegroundColor Yellow
    Set-Location client
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances frontend" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "✅ Dépendances frontend installées" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Démarrage de l'application..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter les serveurs" -ForegroundColor Yellow
Write-Host ""

# Démarrer le backend en arrière-plan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm start
}

Write-Host "✅ Backend démarré (Job ID: $($backendJob.Id))" -ForegroundColor Green

# Attendre un peu que le backend démarre
Start-Sleep -Seconds 3

# Démarrer le frontend en arrière-plan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "$using:PWD\client"
    npm start
}

Write-Host "✅ Frontend démarré (Job ID: $($frontendJob.Id))" -ForegroundColor Green
Write-Host ""

# Fonction pour nettoyer les jobs à la sortie
function Cleanup {
    Write-Host ""
    Write-Host "🛑 Arrêt des serveurs..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
    Write-Host "✅ Serveurs arrêtés" -ForegroundColor Green
}

# Enregistrer la fonction de nettoyage
Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

# Afficher les logs en temps réel
try {
    while ($true) {
        $backendOutput = Receive-Job -Job $backendJob
        $frontendOutput = Receive-Job -Job $frontendJob
        
        if ($backendOutput) {
            Write-Host "[BACKEND] $backendOutput" -ForegroundColor Blue
        }
        
        if ($frontendOutput) {
            Write-Host "[FRONTEND] $frontendOutput" -ForegroundColor Magenta
        }
        
        # Vérifier si les jobs sont toujours en cours
        if ($backendJob.State -ne "Running" -or $frontendJob.State -ne "Running") {
            Write-Host "❌ Un des serveurs s'est arrêté" -ForegroundColor Red
            break
        }
        
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Cleanup
}

# start-dev.ps1 — Sobe backend (Spring Boot) e frontend (Vite) simultaneamente

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$FRONTEND_DIR = Join-Path $ROOT "budget-buddy\budget-buddy-main"
$MVN = "C:\Users\rbgal\.maven\maven-3.10.0-rc-1\bin\mvn.cmd"
$JAVA_HOME = "C:\Users\rbgal\AppData\Local\jdks\jdk-25.0.2"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Budget Buddy - Ambiente de Desenvolv." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend  -> http://localhost:8081" -ForegroundColor Green
Write-Host "Frontend -> http://localhost:3000  (ou porta exibida pelo Vite)" -ForegroundColor Green
Write-Host ""
Write-Host "Abrindo janelas separadas para cada servico..." -ForegroundColor Yellow
Write-Host "(Feche as janelas abertas para encerrar os servicos)" -ForegroundColor DarkGray
Write-Host ""

# Backend — nova janela PowerShell
$backendCmd = @"
`$env:JAVA_HOME = '$JAVA_HOME'
`$env:PATH = "`$env:JAVA_HOME\bin;`$env:PATH"
Set-Location '$ROOT'
Write-Host '[BACKEND] Iniciando Spring Boot em http://localhost:8081...' -ForegroundColor Green
& '$MVN' spring-boot:run
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd `
    -WindowStyle Normal

# Frontend — nova janela PowerShell
$frontendCmd = @"
Set-Location '$FRONTEND_DIR'
Write-Host '[FRONTEND] Iniciando Vite dev server...' -ForegroundColor Cyan
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd `
    -WindowStyle Normal

Write-Host "Servicos iniciados em janelas separadas." -ForegroundColor Green
Write-Host "Este terminal pode ser fechado com seguranca." -ForegroundColor DarkGray

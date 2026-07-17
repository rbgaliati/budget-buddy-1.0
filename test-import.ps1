try {
    $backup = Get-Content 'c:\Codigos\budget-buddy\budget-buddy-main\public\backup.json' -Raw | ConvertFrom-Json
    Write-Host "Importando: $($backup.stages.Count) etapas, $($backup.accounts.Count) contas, $($backup.expenses.Count) despesas, $($backup.quotations.Count) cotações..."
    
    $response = Invoke-WebRequest -Uri 'http://localhost:8081/api/import/backup' -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $backup -Depth 100) -UseBasicParsing -ErrorAction Stop
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "Status: $($result.success)"
    Write-Host "Mensagem: $($result.message)"
    if ($result.stats) {
        Write-Host "Stats: Etapas $($result.stats.stages), Contas $($result.stats.accounts), Despesas $($result.stats.expenses), Cotações $($result.stats.quotations)"
    }
} catch {
    Write-Host "Erro: $_"
}

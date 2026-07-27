# ==============================================================================
# ITManager - IIS Otomatik Canlı Güncelleme Script'i (update.ps1)
# ==============================================================================
# Bu, güncelleme mekanizmasının TEK gerçek kaynağıdır (src/modules/update/controller.js
# sadece bu script'i tetikler ve data/update-status.json'ı okuyarak ilerlemeyi gösterir).
#
# Adımlar:
#   1. Kirli çalışma dizini kontrolü (commit edilmemiş değişiklik varsa İPTAL eder)
#   2. SQLite Veritabanı Yedeği Alır (.zip formatında backups/ klasörüne)
#   3. GitHub'dan en son main'i çeker (git fetch & git reset --hard origin/main)
#   4. Backend + frontend bağımlılıklarını kurar, frontend'i build eder
#   5. Bir adım başarısız olursa: koda otomatik geri döner (rollback)
#   6. web.config'i yeniler (iisnode worker process recycle tetikler)
# ==============================================================================

$ErrorActionPreference = 'Stop'

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackupDir = Join-Path $RootDir "backups"
$FrontendDir = Join-Path $RootDir "frontend"
$WebConfigPath = Join-Path $RootDir "web.config"
$DbPath = Join-Path $RootDir "data\itmanager.db"
$DataDir = Join-Path $RootDir "data"
$StatusFile = Join-Path $DataDir "update-status.json"
$HistoryFile = Join-Path $RootDir "update-history.json"

if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Force -Path $DataDir | Out-Null }

$script:startedAt = (Get-Date).ToString("o")

function Write-StatusLog([string]$msg, [bool]$inProgress = $true, [object]$success = $null, [string]$errorMsg = $null) {
    Write-Host "[UPDATE] $msg" -ForegroundColor Cyan
    try {
        $existing = $null
        if (Test-Path $StatusFile) {
            $existing = Get-Content $StatusFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
        }
        $steps = if ($existing.steps) { [System.Collections.ArrayList]@($existing.steps) } else { [System.Collections.ArrayList]@() }
        $steps.Add(@{ time = (Get-Date).ToString("o"); msg = $msg }) | Out-Null

        $status = @{
            inProgress  = $inProgress
            lastMessage = $msg
            time        = (Get-Date).ToString("o")
            startedAt   = $script:startedAt
            error       = $errorMsg
            success     = $success
            steps       = $steps
        }
        $status | ConvertTo-Json -Depth 5 | Set-Content -Path $StatusFile -Encoding UTF8 -Force
    } catch {
        Write-Host "Status log yazılamadı: $_" -ForegroundColor Yellow
    }
}

function Add-HistoryEntry($fromCommit, $toCommit, $status, $errorMsg) {
    try {
        $history = @()
        if (Test-Path $HistoryFile) {
            $history = @(Get-Content $HistoryFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue)
        }
        $history += @{
            fromCommit  = $fromCommit
            toCommit    = $toCommit
            status      = $status
            error       = $errorMsg
            startedAt   = $script:startedAt
            completedAt = (Get-Date).ToString("o")
        }
        if ($history.Count -gt 50) { $history = $history[-50..-1] }
        $history | ConvertTo-Json -Depth 5 | Set-Content -Path $HistoryFile -Encoding UTF8 -Force
    } catch {
        Write-Host "Geçmiş kaydı yazılamadı: $_" -ForegroundColor Yellow
    }
}

$preUpdateCommit = $null

try {
    Set-Location $RootDir
    git config --global --add safe.directory $RootDir.ProviderPath 2>$null

    Write-StatusLog "Çalışma dizini temizlik kontrolü yapılıyor..."
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        throw "Sunucuda commit edilmemiş değişiklikler tespit edildi, güncelleme güvenlik nedeniyle iptal edildi. Lütfen sunucudaki değişiklikleri manuel inceleyin."
    }

    $preUpdateCommit = (git rev-parse HEAD).Trim()
    Write-StatusLog "Mevcut commit geri dönüş noktası olarak kaydedildi: $($preUpdateCommit.Substring(0,7))"

    if (Test-Path $DbPath) {
        Write-StatusLog "Veritabanı yedeği alınıyor..."
        if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null }
        $timestamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
        $backupZip = Join-Path $BackupDir "itmanager_auto_backup_$timestamp.zip"
        Compress-Archive -Path $DbPath -DestinationPath $backupZip -Force
        Write-StatusLog "Veritabanı yedeği oluşturuldu: $(Split-Path $backupZip -Leaf)"
    }

    Write-StatusLog "GitHub'dan güncel kodlar çekiliyor (git fetch & reset)..."
    git fetch origin main
    git reset --hard origin/main
    $newCommit = (git rev-parse HEAD).Trim()
    Write-StatusLog "Git: kod main branch'inin son haline güncellendi ($($newCommit.Substring(0,7)))."

    Write-StatusLog "Backend bağımlılıkları kuruluyor (npm install)..."
    npm install --production --no-audit --no-fund

    Write-StatusLog "Frontend bağımlılıkları kuruluyor ve build alınıyor..."
    Set-Location $FrontendDir
    npm install --no-audit --no-fund
    npm run build
    Set-Location $RootDir

    Add-HistoryEntry $preUpdateCommit $newCommit "success" $null

    Write-StatusLog "Güncelleme başarılı! IIS yenileniyor (web.config touch)..." -inProgress $false -success $true
    if (Test-Path $WebConfigPath) {
        (Get-Item $WebConfigPath).LastWriteTime = Get-Date
    }
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    Restart-WebAppPool -Name "ITManagerAppPool" -ErrorAction SilentlyContinue

} catch {
    $err = $_.Exception.Message
    Write-Host "HATA: $err" -ForegroundColor Red

    if ($preUpdateCommit) {
        try {
            Write-StatusLog "Otomatik geri dönüş (rollback) yapılıyor: $($preUpdateCommit.Substring(0,7))..."
            Set-Location $RootDir
            git reset --hard $preUpdateCommit
            Write-StatusLog "HATA: $err (kod eski/çalışan haline geri döndürüldü)" -inProgress $false -success $false -errorMsg $err
        } catch {
            Write-StatusLog "KRİTİK: Rollback de başarısız oldu, manuel müdahale gerekiyor: $($_.Exception.Message)" -inProgress $false -success $false -errorMsg $err
        }
    } else {
        Write-StatusLog "HATA: $err" -inProgress $false -success $false -errorMsg $err
    }

    Add-HistoryEntry $preUpdateCommit $null "failed" $err
    Write-Error "Güncelleme başarısız: $err"
}

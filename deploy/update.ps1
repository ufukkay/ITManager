# ==============================================================================
# ITManager - IIS Otomatik Canlı Güncelleme Script'i (update.ps1)
# ==============================================================================
# Bu script, ITManager uygulamasını canlı IIS ortamında güvenli ve tek adımda günceller:
#   1. SQLite Veritabanı Yedeği Alır (.zip formatında backups/ klasörüne)
#   2. Git güvenli dizin (safe.directory) tanımını yapar
#   3. GitHub'dan en son kodları çeker (git fetch & git reset --hard origin/main)
#   4. Backend bağımlılıklarını günceller (npm install)
#   5. Frontend bağımlılıklarını günceller ve üretim build'ini alır (npm run build)
#   6. web.config dosyasını yeniler (iisnode worker process recycle tetikler)
# ==============================================================================

$ErrorActionPreference = 'Stop'

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackupDir = Join-Path $RootDir "backups"
$FrontendDir = Join-Path $RootDir "frontend"
$WebConfigPath = Join-Path $RootDir "web.config"
$DbPath = Join-Path $RootDir "data\itmanager.db"
$StatusFile = Join-Path $RootDir "data\update-status.json"

function Write-StatusLog([string]$msg, [bool]$inProgress = $true, [bool]$success = $null, [string]$errorMsg = $null) {
    Write-Host "[UPDATE] $msg" -ForegroundColor Cyan
    try {
        $status = @{
            inProgress = $inProgress
            lastMessage = $msg
            time = (Get-Date).ToString("o")
            success = $success
            error = $errorMsg
        }
        if (Test-Path $StatusFile) {
            $existing = Get-Content $StatusFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($existing.steps) {
                $steps = [System.Collections.ArrayList]@($existing.steps)
            } else {
                $steps = [System.Collections.ArrayList]@()
            }
        } else {
            $steps = [System.Collections.ArrayList]@()
        }
        $steps.Add(@{ time = (Get-Date).ToString("o"); msg = $msg }) | Out-Null
        $status["steps"] = $steps
        $status | ConvertTo-Json -Depth 5 | Set-Content -Path $StatusFile -Encoding UTF8 -Force
    } catch {
        Write-Host "Status log yazılamadı: $_" -ForegroundColor Yellow
    }
}

try {
    Write-StatusLog "Güncelleme süreci başlatıldı..."
    Set-Location $RootDir

    # 1. Git safe.directory ekle
    Write-StatusLog "Git güvenlik ayarları yapılandırılıyor..."
    git config --global --add safe.directory $RootDir.ProviderPath 2>$null

    # 2. Veritabanı Yedeği
    if (Test-Path $DbPath) {
        Write-StatusLog "Veritabanı yedeği alınıyor..."
        if (-not (Test-Path $BackupDir)) {
            New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
        }
        $timestamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
        $backupZip = Join-Path $BackupDir "itmanager_auto_backup_$timestamp.zip"
        Compress-Archive -Path $DbPath -DestinationPath $backupZip -Force
        Write-StatusLog "Veritabanı yedeği oluşturuldu: $(Split-Path $backupZip -Leaf)"
    }

    # 3. Kodları GitHub'dan çek
    Write-StatusLog "GitHub'dan güncel kodlar çekiliyor (git fetch & reset)..."
    git fetch origin main
    git reset --hard origin/main

    # 4. Backend Bağımlılıkları
    Write-StatusLog "Backend bağımlılıkları kontrol ediliyor (npm install)..."
    npm install --production --no-audit --no-fund

    # 5. Frontend Build
    Write-StatusLog "Frontend derleniyor (npm run build)..."
    Set-Location $FrontendDir
    npm install --no-audit --no-fund
    npm run build
    Set-Location $RootDir

    # 6. IIS Restart Sinyali (web.config touch & AppPool Restart)
    Write-StatusLog "IIS yenileniyor (web.config touch)..."
    if (Test-Path $WebConfigPath) {
        (Get-Item $WebConfigPath).LastWriteTime = Get-Date
    }

    Import-Module WebAdministration -ErrorAction SilentlyContinue
    Restart-WebAppPool -Name "ITManagerAppPool" -ErrorAction SilentlyContinue

    Write-StatusLog "Güncelleme başarıyla tamamlandı! IIS yeniden başlatılıyor." -inProgress $false -success $true

} catch {
    $err = $_.Exception.Message
    Write-StatusLog "HATA: $err" -inProgress $false -success $false -errorMsg $err
    Write-Error "Güncelleme başarısız: $err"
}

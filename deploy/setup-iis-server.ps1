<#
.SYNOPSIS
    ITManager - Windows Server + IIS ilk kurulum script'i.

.DESCRIPTION
    Bu script HEDEF Windows Server'ın kendi üzerinde, YÜKSELTİLMİŞ (Administrator)
    bir PowerShell oturumunda çalıştırılmalıdır. Şunları yapar:
      1. winget ile Node.js LTS ve Git kurar (zaten kuruluysa atlar)
      2. IIS rolünü ve gerekli alt özelliklerini etkinleştirir
      3. IIS URL Rewrite Module'ü ve iisnode'u indirip sessizce kurar
      4. Projeyi git ile hedef klasöre çeker (veya zaten varsa günceller)
      5. Backend + frontend bağımlılıklarını kurar, frontend'i build eder
      6. .env dosyası yoksa oluşturur (rastgele SESSION_SECRET üretir)
      7. IIS'te bir Application Pool + Website oluşturur ("No Managed Code")

    ÇALIŞTIRMADAN ÖNCE: Aşağıdaki $RepoUrl, $SitePath, $SiteName, $Port
    değişkenlerini kendi ortamınıza göre gözden geçirin.

.NOTES
    - Sistem seviyesinde değişiklik yapar (Windows özelliği kurar, MSI kurar,
      IIS sitesi oluşturur). Çalıştırmadan önce script'i okuyup onaylayın.
    - Tekrar çalıştırmak güvenlidir (idempotent) - zaten kurulu/var olan
      bileşenleri atlar.
#>

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

# ── Ayarlar (ihtiyaca göre değiştirin) ──────────────────────────────
$RepoUrl   = 'https://github.com/ufukkay/ITManager.git'
$SitePath  = 'C:\inetpub\ITManager'
$SiteName  = 'ITManager'
$AppPoolName = 'ITManagerAppPool'
$Port      = 80

$UrlRewriteMsiUrl = 'https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi'
$IisNodeMsiUrl     = 'https://github.com/Azure/iisnode/releases/download/v0.2.26/iisnode-full-v0.2.26-x64.msi'

$TempDir = Join-Path $env:TEMP 'itmanager-setup'
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

function Write-Step($msg) {
    Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

# ── 1. Node.js ve Git (winget) ──────────────────────────────────────
Write-Step '1/7 - Node.js ve Git kontrol ediliyor'

function Install-WithWinget($id, $friendlyName) {
    $installed = winget list --id $id --accept-source-agreements 2>$null | Select-String $id
    if ($installed) {
        Write-Host "$friendlyName zaten kurulu, atlanıyor." -ForegroundColor DarkGray
    } else {
        Write-Host "$friendlyName kuruluyor (winget)..."
        winget install --id $id -e --source winget --accept-package-agreements --accept-source-agreements
    }
}

Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS'
Install-WithWinget 'Git.Git' 'Git'

# PATH'in bu oturumda güncellenmesi için (winget kurulumdan sonra genelde yeni terminal gerekir)
$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')

# ── 2. IIS Rolü ve alt özellikleri ──────────────────────────────────
Write-Step '2/7 - IIS rolü etkinleştiriliyor'

$isServerOS = (Get-CimInstance Win32_OperatingSystem).ProductType -ne 1

if ($isServerOS) {
    Install-WindowsFeature -Name Web-Server, Web-Common-Http, Web-Default-Doc, Web-Dir-Browsing, `
        Web-Http-Errors, Web-Static-Content, Web-Filtering, Web-Mgmt-Console -IncludeManagementTools
} else {
    Write-Host 'Windows Server tespit edilmedi (istemci OS) - IIS özellikleri Enable-WindowsOptionalFeature ile etkinleştiriliyor.' -ForegroundColor Yellow
    Enable-WindowsOptionalFeature -Online -NoRestart -FeatureName `
        IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-StaticContent, `
        IIS-DefaultDocument, IIS-HttpErrors, IIS-RequestFiltering, IIS-ManagementConsole | Out-Null
}

# ── 3. URL Rewrite Module ───────────────────────────────────────────
Write-Step '3/7 - IIS URL Rewrite Module kuruluyor'

$rewriteInstalled = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\IIS Extensions\URL Rewrite' -ErrorAction SilentlyContinue
if ($rewriteInstalled) {
    Write-Host 'URL Rewrite Module zaten kurulu, atlanıyor.' -ForegroundColor DarkGray
} else {
    $rewriteMsi = Join-Path $TempDir 'rewrite_amd64_en-US.msi'
    Write-Host 'İndiriliyor...'
    Invoke-WebRequest -Uri $UrlRewriteMsiUrl -OutFile $rewriteMsi -UseBasicParsing
    Write-Host 'Kuruluyor...'
    Start-Process msiexec.exe -ArgumentList "/i `"$rewriteMsi`" /qn /norestart" -Wait
}

# ── 4. iisnode ───────────────────────────────────────────────────────
Write-Step '4/7 - iisnode kuruluyor'

$iisnodeInstalled = Test-Path 'C:\Program Files\iisnode\iisnode.dll'
if ($iisnodeInstalled) {
    Write-Host 'iisnode zaten kurulu, atlanıyor.' -ForegroundColor DarkGray
} else {
    $iisnodeMsi = Join-Path $TempDir 'iisnode-full-v0.2.26-x64.msi'
    Write-Host 'İndiriliyor...'
    Invoke-WebRequest -Uri $IisNodeMsiUrl -OutFile $iisnodeMsi -UseBasicParsing
    Write-Host 'Kuruluyor...'
    Start-Process msiexec.exe -ArgumentList "/i `"$iisnodeMsi`" /qn /norestart" -Wait
}

# ── 5. Kodu çek / güncelle ───────────────────────────────────────────
Write-Step '5/7 - Proje kodu getiriliyor'

if (Test-Path (Join-Path $SitePath '.git')) {
    Write-Host 'Repo zaten mevcut, güncelleniyor (git pull)...'
    Push-Location $SitePath
    git pull origin main
    Pop-Location
} else {
    Write-Host "Repo klonlanıyor: $RepoUrl -> $SitePath"
    git clone $RepoUrl $SitePath
}

# ── 6. Bağımlılıklar, build, .env ────────────────────────────────────
Write-Step '6/7 - Bağımlılıklar kuruluyor ve frontend build ediliyor'

Push-Location $SitePath
npm install --production

Push-Location (Join-Path $SitePath 'frontend')
npm install
npm run build
Pop-Location

$envPath = Join-Path $SitePath '.env'
if (-not (Test-Path $envPath)) {
    Write-Host '.env dosyası oluşturuluyor (rastgele SESSION_SECRET ile)...'
    $randomSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    @"
PORT=$Port
SESSION_SECRET=$randomSecret
DATABASE_PATH=./data/itmanager.db
"@ | Set-Content -Path $envPath -Encoding UTF8
    Write-Host ".env oluşturuldu. SMTP/IMAP gibi diğer ayarları uygulama içinden (Admin panelinden) yapılandırabilirsiniz." -ForegroundColor Yellow
} else {
    Write-Host '.env zaten mevcut, dokunulmadı.' -ForegroundColor DarkGray
}
Pop-Location

# ── 7. IIS Application Pool + Website ────────────────────────────────
Write-Step '7/7 - IIS sitesi oluşturuluyor'

Import-Module WebAdministration

if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-WebAppPool -Name $AppPoolName | Out-Null
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ''
    Write-Host "Application Pool '$AppPoolName' oluşturuldu (No Managed Code)."
} else {
    Write-Host "Application Pool '$AppPoolName' zaten mevcut." -ForegroundColor DarkGray
}

if (-not (Test-Path "IIS:\Sites\$SiteName")) {
    New-Website -Name $SiteName -PhysicalPath $SitePath -ApplicationPool $AppPoolName -Port $Port -Force | Out-Null
    Write-Host "Site '$SiteName' oluşturuldu (port $Port, $SitePath)."
} else {
    Write-Host "Site '$SiteName' zaten mevcut, dokunulmadı." -ForegroundColor DarkGray
}

Write-Host "`nKurulum tamamlandı." -ForegroundColor Green
Write-Host "Tarayıcıdan test edin: http://localhost:$Port/ (veya sunucunun DNS/IP adresinden)"
Write-Host "Sorun olursa iisnode loglarına bakın: $SitePath\iisnode-logs\"
Write-Host "Varsayılan giriş: admin@itmanager.com / admin123 - GİRİŞ SONRASI HEMEN DEĞİŞTİRİN." -ForegroundColor Yellow

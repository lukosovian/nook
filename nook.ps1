# Nook: derle, bu bilgisayara kur ve/veya GitHub'a yeni sürüm olarak yayınla.
# Çift tıklanacak dosyalar: "Kur.cmd", "Yayınla.cmd", "Yayınla ve Kur.cmd"
#   .\nook.ps1 -Kur                       derler, kapatır, sessizce kurar, yeniden açar
#   .\nook.ps1 -Yayinla [-Notlar "..."]   sürümü artırır, derler, commit'ler, main'i gönderir, sürümü yükler
#   .\nook.ps1 -Yayinla -Kur              ikisi birden, tek derlemeyle

param([switch]$Kur, [switch]$Yayinla, [string]$Notlar, [string]$Surum)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
$Key = Join-Path $env:USERPROFILE ".tauri\nook.key"
if (-not (Test-Path $Key)) { throw "İmza anahtarı yok: $Key" }
$env:TAURI_SIGNING_PRIVATE_KEY = $Key
if (-not $Kur -and -not $Yayinla) { $Kur = $true }

function Say($text, $color = "Cyan") { Write-Host ""; Write-Host "== $text" -ForegroundColor $color }

# Sürüm numarası geçen dosyalar (yalnızca ilk eşleşme değişir)
$VersionFiles = @(
  @{ Path = "src-tauri\tauri.conf.json"; Pattern = '("version"\s*:\s*")[^"]+(")' },
  @{ Path = "package.json";              Pattern = '("version"\s*:\s*")[^"]+(")' },
  @{ Path = "src-tauri\Cargo.toml";      Pattern = '(?m)(^version\s*=\s*")[^"]+(")' },
  @{ Path = "src-tauri\Cargo.lock";      Pattern = '(name = "nook"\r?\nversion = ")[^"]+(")' },
  # Nook Mobil aynı sürüm numarasını taşır (telefon güncellemeyi buna bakarak bulur)
  @{ Path = "mobile\src-tauri\tauri.conf.json"; Pattern = '("version"\s*:\s*")[^"]+(")' },
  @{ Path = "mobile\package.json";              Pattern = '("version"\s*:\s*")[^"]+(")' },
  @{ Path = "mobile\src-tauri\Cargo.toml";      Pattern = '(?m)(^version\s*=\s*")[^"]+(")' },
  @{ Path = "mobile\src-tauri\Cargo.lock";      Pattern = '(name = "nook-mobile"\r?\nversion = ")[^"]+(")' }
)
$Utf8 = New-Object Text.UTF8Encoding $false
$Current = (Get-Content "$Root\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json).version
$Backup = @{}

if ($Yayinla) {
  $parts = $Current.Split(".")
  $parts[2] = [string]([int]$parts[2] + 1)
  $Suggested = $parts -join "."
  # Sürüm numarası önceden artırılmış ama henüz yayınlanmamışsa (son commit'teki sürümden farklı) aynısı önerilir
  $Committed = (git show HEAD:src-tauri/tauri.conf.json 2>$null | Out-String | ConvertFrom-Json -ErrorAction SilentlyContinue).version
  if ($Committed -and $Committed -ne $Current) { $Suggested = $Current }
  if (-not $Surum) {
    $Surum = Read-Host "Yeni sürüm (şu an $Current, Enter = $Suggested)"
    if (-not $Surum) { $Surum = $Suggested }
  }
  if ($Surum -notmatch '^\d+\.\d+\.\d+$') { throw "Sürüm 1.2.3 biçiminde olmalı: $Surum" }
  if (-not $Notlar) { $Notlar = Read-Host "Bu sürümde neler var (GitHub'daki sürüm notu ve commit mesajı)" }
  if (-not $Notlar) { throw "Sürüm notu boş olamaz" }

  Say "Sürüm $Current -> $Surum"
  foreach ($f in $VersionFiles) {
    $p = Join-Path $Root $f.Path
    $text = [IO.File]::ReadAllText($p)
    $Backup[$p] = $text
    $re = New-Object Text.RegularExpressions.Regex $f.Pattern
    if (-not $re.IsMatch($text)) { throw "Sürüm satırı bulunamadı: $($f.Path)" }
    [IO.File]::WriteAllText($p, $re.Replace($text, "`${1}$Surum`${2}", 1), $Utf8)
  }
  $Version = $Surum
} else {
  $Version = $Current
}

Say "Nook $Version derleniyor (birkaç dakika sürer)..."
$ErrorActionPreference = "Continue"
# İmza anahtarının şifresi boş; girdi boş verilince Tauri şifre sormadan geçer
cmd /c "npm run tauri build < nul"
$BuildOk = $LASTEXITCODE -eq 0
$ErrorActionPreference = "Stop"
if (-not $BuildOk) {
  # Yarım kalan sürüm artışını geri al ki tekrar denerken numara atlamasın
  foreach ($p in $Backup.Keys) { [IO.File]::WriteAllText($p, $Backup[$p], $Utf8) }
  throw "Derleme başarısız, hiçbir şey kurulmadı/gönderilmedi."
}

$Setup = "$Root\src-tauri\target\release\bundle\nsis\Nook_${Version}_x64-setup.exe"
if (-not (Test-Path $Setup)) { throw "Kurulum dosyası yok: $Setup" }

if ($Yayinla) {
  # Nook Mobil: imzalı APK, release.ps1 sürüme NookMobil.apk adıyla ekler
  Say "Nook Mobil $Version derleniyor..."
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
  $env:NDK_HOME = "$env:ANDROID_HOME\ndk\29.0.14206865"
  $ErrorActionPreference = "Continue"
  Push-Location "$Root\mobile"
  npx tauri android build --apk --target aarch64
  $MobileOk = $LASTEXITCODE -eq 0
  Pop-Location
  $ErrorActionPreference = "Stop"
  if (-not $MobileOk) {
    foreach ($p in $Backup.Keys) { [IO.File]::WriteAllText($p, $Backup[$p], $Utf8) }
    throw "Nook Mobil derlenemedi, hiçbir şey gönderilmedi."
  }
}

if ($Yayinla) {
  # Destekçiler listesi (GitHub'da yıldız verenler) depoya yazılsın, herkesin Nook'u okusun
  try { & "$Root\supporters.ps1" } catch { Write-Host "Destekçiler güncellenemedi: $_" -ForegroundColor Yellow }
  Say "Commit atılıyor"
  # Takip edilen dosyalar + uygulama klasörlerindeki yeni dosyalar (masaüstü çöpü gibi kökteki başıboş dosyalar girmez)
  git add -u
  git add -A -- src src-tauri nook.ps1 supporters.ps1 "*.cmd" mobile
  if (Test-Path "$Root\supporters.json") { git add supporters.json }
  git commit -m "${Version}: $Notlar"
  if ($LASTEXITCODE -ne 0) { throw "Commit atılamadı" }

  Say "GitHub'a gönderiliyor"
  & "$Root\release.ps1" -SkipBuild $Notlar
}

if ($Kur) {
  Say "Bu bilgisayara kuruluyor"
  Get-Process nook -ErrorAction SilentlyContinue | Stop-Process -Force
  # Kapanması bitmeden kurulum başlarsa nook.exe kilitli kalır ve kurulum 2 koduyla çıkar
  Get-Process nook -ErrorAction SilentlyContinue | Wait-Process -Timeout 15 -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
  $p = Start-Process $Setup -ArgumentList "/S" -Wait -PassThru
  if ($p.ExitCode -ne 0) {
    # Bir kez daha dene; yine olmazsa Nook kapalı kalmasın
    Start-Sleep -Seconds 3
    $p = Start-Process $Setup -ArgumentList "/S" -Wait -PassThru
  }
  if ($p.ExitCode -ne 0) {
    if (-not (Get-Process nook -ErrorAction SilentlyContinue)) { Start-Process "$env:LOCALAPPDATA\Nook\nook.exe" }
    throw "Kurulum hata verdi (çıkış kodu $($p.ExitCode))"
  }
  Start-Sleep -Seconds 1
  if (-not (Get-Process nook -ErrorAction SilentlyContinue)) { Start-Process "$env:LOCALAPPDATA\Nook\nook.exe" }
}

Say "Bitti: Nook $Version" "Green"

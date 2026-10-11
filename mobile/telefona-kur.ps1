# Nook Mobil'i derleyip eşleşmiş telefona Wi-Fi üzerinden kurar.
#   powershell -ExecutionPolicy Bypass -File mobile\telefona-kur.ps1          (derle + kur)
#   powershell -ExecutionPolicy Bypass -File mobile\telefona-kur.ps1 -NoBuild (yalnızca son APK'yı kur)
# Telefon bir kez "Kablosuz hata ayıklama → Eşleme kodu ile cihaz eşle" ile eşleşmiş olmalı (adb pair).
# Telefonun IP'si ve bağlantı noktası değişebilir; her seferinde mDNS ile yeniden bulunur.
param([switch]$NoBuild)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Sdk = "$env:LOCALAPPDATA\Android\Sdk"
$Adb = "$Sdk\platform-tools\adb.exe"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = $Sdk
$env:NDK_HOME = "$Sdk\ndk\29.0.14206865"

if (-not $NoBuild) {
  Write-Host "Nook Mobil derleniyor..." -ForegroundColor Cyan
  Push-Location $Root
  try {
    npx tauri android build --apk --target aarch64
    if ($LASTEXITCODE -ne 0) { throw "Derleme başarısız" }
  } finally { Pop-Location }
}
$Apk = "$Root\src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk"

# Gerçekten cevap veren bağlı telefon (listede eski, ölü kayıtlar da kalabiliyor; adlarında boşluk olabilir)
function Find-Phone {
  foreach ($line in (& $Adb devices) | Select-Object -Skip 1) {
    $parts = $line -split "`t"
    if ($parts.Count -ge 2 -and $parts[1].Trim() -eq "device") {
      $s = $parts[0]
      # Ölü kayıtta "shell" sonsuza kadar bekleyebiliyor: 6 sn'de cevap yoksa geç
      $out = [IO.Path]::GetTempFileName()
      $p = Start-Process $Adb -ArgumentList "-s", "`"$s`"", "shell", "echo", "ok" -NoNewWindow -PassThru -RedirectStandardOutput $out
      if (-not $p.WaitForExit(6000)) { $p.Kill(); continue }
      if ((Get-Content $out -Raw).Trim() -eq "ok") { return $s }
    }
  }
  return $null
}

$serial = Find-Phone
if (-not $serial) {
  # Telefonun bağlantı noktası her açılışta değişir; mDNS'teki bütün adresleri sırayla dene (en yenisi sonda)
  $addrs = (& $Adb mdns services) | Select-String "_adb-tls-connect\._tcp\s+(\S+)" | ForEach-Object { $_.Matches[0].Groups[1].Value }
  if (-not $addrs) { throw "Telefon bulunamadı: aynı Wi-Fi'de mi, Kablosuz hata ayıklama açık mı?" }
  [array]::Reverse($addrs)
  foreach ($addr in $addrs) {
    & $Adb connect $addr 2>$null | Out-Null
    $serial = Find-Phone
    if ($serial) { break }
  }
  if (-not $serial) { throw "Telefona bağlanılamadı: Kablosuz hata ayıklamayı kapatıp açmayı dene" }
}
Write-Host "Telefona kuruluyor ($serial)..." -ForegroundColor Cyan
# adb hatayı stderr'e yazar; "Stop" kipinde bu hemen istisna olurdu, önce sonucu okuyalım
$ErrorActionPreference = "Continue"
$out = & $Adb -s $serial install -r $Apk 2>&1 | ForEach-Object { "$_" }
$ErrorActionPreference = "Stop"
$out | Write-Host
if ($LASTEXITCODE -ne 0 -and ($out -join " ") -match "UPDATE_INCOMPATIBLE|signatures do not match") {
  # Telefondaki kurulum başka anahtarla imzalı (eski geliştirme sürümü): bir kez kaldırıp kur; eşleşme kodu yeniden okutulur
  Write-Host "Telefondaki eski kurulum farklı imzalı; kaldırılıp yeniden kuruluyor (eşleşme kodunu yeniden okutman gerekecek)" -ForegroundColor Yellow
  & $Adb -s $serial uninstall app.nook.mobile | Out-Null
  & $Adb -s $serial install $Apk
}
if ($LASTEXITCODE -ne 0) { throw "Kurulum başarısız" }
& $Adb -s $serial shell am start -n app.nook.mobile/.MainActivity | Out-Null
Write-Host "Tamam: Nook Mobil telefonda açıldı." -ForegroundColor Green

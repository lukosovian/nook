# Nook yeni surum yayinlama
#   1) src-tauri/tauri.conf.json, package.json ve src-tauri/Cargo.toml'daki "version"u artir (orn. 0.2.0 -> 0.3.0)
#   2) PowerShell'de:  .\release.ps1 "Bu surumde neler var"
# Imzali kurulum dosyasini derler, latest.json'u hazirlar ve GitHub'a yukler
# (git ile GitHub girisi kayitliysa otomatik; degilse release\vX klasorunu elle yuklersin).
# Once degisiklikleri commit'le; betik main'i de gonderir.

param([string]$Notes = "Yeni surum")

$ErrorActionPreference = "Stop"
$Repo = "lukosovian/nook"
$Key = Join-Path $env:USERPROFILE ".tauri\nook.key"
$Root = $PSScriptRoot

if (-not (Test-Path $Key)) { throw "Imza anahtari yok: $Key  (bu anahtar olmadan guncelleme yayinlanamaz)" }

$Version = (Get-Content "$Root\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json).version
$Tag = "v$Version"
Write-Host "Nook $Version derleniyor..." -ForegroundColor Cyan

$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
$env:TAURI_SIGNING_PRIVATE_KEY = $Key
Push-Location $Root
try { npm run tauri build; if ($LASTEXITCODE -ne 0) { throw "Derleme basarisiz" } } finally { Pop-Location }

$Setup = "Nook_${Version}_x64-setup.exe"
$Bundle = "$Root\src-tauri\target\release\bundle\nsis"
$Out = "$Root\release\$Tag"
New-Item -ItemType Directory -Force $Out | Out-Null
Copy-Item "$Bundle\$Setup" $Out -Force

$Manifest = [ordered]@{
  version   = $Version
  notes     = $Notes
  pub_date  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  platforms = @{
    "windows-x86_64" = @{
      signature = (Get-Content "$Bundle\$Setup.sig" -Raw).Trim()
      url       = "https://github.com/$Repo/releases/download/$Tag/$Setup"
    }
  }
}
# BOM'suz UTF-8 (Tauri'nin JSON okuyucusu BOM'u sevmez)
[IO.File]::WriteAllText("$Out\latest.json", ($Manifest | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding $false))

# Kodu gonder, sonra surumu GitHub'a yukle. git'in kayitli girisi (Git Credential Manager) kullanilir, ek arac gerekmez.
git -C $Root push origin main
$Token = ("protocol=https`nhost=github.com`n`n" | git credential fill 2>$null | Where-Object { $_ -like "password=*" }) -replace "^password=", ""
if ($Token) {
  $H = @{ Authorization = "Bearer $Token"; Accept = "application/vnd.github+json" }
  $Body = [Text.Encoding]::UTF8.GetBytes((@{ tag_name = $Tag; target_commitish = "main"; name = "Nook $Version"; body = $Notes } | ConvertTo-Json))
  $Rel = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$Repo/releases" -Headers $H -Body $Body -ContentType "application/json; charset=utf-8"
  foreach ($f in @($Setup, "latest.json")) {
    Invoke-RestMethod -Method Post -Uri "https://uploads.github.com/repos/$Repo/releases/$($Rel.id)/assets?name=$f" -Headers $H -InFile "$Out\$f" -ContentType "application/octet-stream" | Out-Null
  }
  Write-Host "Yayinlandi: $($Rel.html_url)" -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "Hazir: $Out" -ForegroundColor Green
Write-Host "Simdi https://github.com/$Repo/releases/new adresinde:"
Write-Host "  Tag: $Tag   Baslik: Nook $Version"
Write-Host "  Su iki dosyayi surukle: $Setup  ve  latest.json"
Write-Host "  'Publish release' de. Arkadasinin Nook'u 6 saat icinde (ya da Ayarlar > Denetle ile hemen) gorur."
explorer $Out

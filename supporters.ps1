# Destekciler: Nook'a GitHub'da yildiz verenleri supporters.json'a yazar (Yayinla sirasinda nook.ps1 cagirir).
# GitHub yildiz verenlerin listesini artik yalnizca giris yapmis isteklere veriyor; bu yuzden liste
# yayinlayanin bilgisayarinda (git'in kayitli girisiyle) cekilir, uygulamalar depodaki dosyayi okur.
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Repo = "lukosovian/nook"

$ErrorActionPreference = "Continue"
$CredFile = Join-Path $env:TEMP "nook-cred.txt"
[IO.File]::WriteAllText($CredFile, "protocol=https`nhost=github.com`n`n")
$Token = (cmd /c "git credential fill < `"$CredFile`"" 2>$null | Where-Object { $_ -like "password=*" }) -replace "^password=", ""
Remove-Item $CredFile -ErrorAction SilentlyContinue
$ErrorActionPreference = "Stop"
if (-not $Token) { Write-Host "Destekciler: GitHub girisi yok, liste guncellenmedi" -ForegroundColor Yellow; return }

$H = @{ Authorization = "Bearer $Token"; Accept = "application/vnd.github.star+json" }
$list = @()
for ($page = 1; $page -le 10; $page++) {
  $res = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/stargazers?per_page=100&page=$page" -Headers $H
  foreach ($s in $res) {
    $list += [ordered]@{ login = $s.user.login; avatar = "$($s.user.avatar_url)&s=64"; url = $s.user.html_url; at = $s.starred_at }
  }
  if ($res.Count -lt 100) { break }
}
$json = ConvertTo-Json -InputObject @($list) -Depth 3
[IO.File]::WriteAllText((Join-Path $Root "supporters.json"), $json, (New-Object Text.UTF8Encoding $false))
Write-Host "Destekciler: $($list.Count) kisi" -ForegroundColor Cyan

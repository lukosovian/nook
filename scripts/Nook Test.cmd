<# : Nook Test - cift tiklayarak calistir. Bilgisayari tarar, masaustune bir zip birakir.
@echo off
chcp 65001 >nul
title Nook Test
powershell -NoProfile -Command "& ([scriptblock]::Create([IO.File]::ReadAllText('%~f0', [Text.Encoding]::UTF8)))"
echo.
pause
exit /b
#>

# Nook Test: Nook'un donması / adanın görünmemesi gibi sorunlar için bilgisayarı tarar.
# Hiçbir şeyi değiştirmez, yalnızca okur. Sonuç: masaüstünde Nook-Test-<tarih>.zip

$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm'
$desk = [Environment]::GetFolderPath('Desktop')
$work = Join-Path $env:TEMP "Nook-Test-$stamp"
New-Item -ItemType Directory -Force $work | Out-Null
$lines = New-Object System.Collections.Generic.List[string]
$issues = New-Object System.Collections.Generic.List[string]

function Say([string]$t) { $lines.Add($t); Write-Host $t }
function Head([string]$t) { Say ''; Say "=== $t ==="; }
function Ok([string]$t) { Say "  [ OK ] $t" }
function Bad([string]$t) { Say "  [ !! ] $t"; $issues.Add($t) }
function Info([string]$t) { Say "         $t" }

Write-Host ''
Write-Host '  Nook Test başladı. Yaklaşık 20 saniye sürer, bir şeyi değiştirmez.' -ForegroundColor Cyan
Say "Nook Test — $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')"

# ---------------------------------------------------------------- Sistem
Head 'Sistem'
$os = Get-CimInstance Win32_OperatingSystem
$nt = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
Info "$($os.Caption) $($nt.DisplayVersion) (derleme $($nt.CurrentBuild).$($nt.UBR)), $($os.OSArchitecture)"
$up = (Get-Date) - $os.LastBootUpTime
Info ("Açık kalma süresi: {0} gün {1} sa" -f $up.Days, $up.Hours)
if ([int]$nt.CurrentBuild -lt 19041) { Bad 'Windows sürümü çok eski (Windows 10 2004 ya da üstü gerekli)' }
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
Info "İşlemci: $($cpu.Name.Trim()) ($($cpu.NumberOfLogicalProcessors) çekirdek)"
$ramGb = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
$freeGb = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
Info "Bellek: $ramGb GB, boş $freeGb GB"
if ($freeGb -lt 1) { Bad "Boş bellek çok az ($freeGb GB) — donmaların nedeni olabilir" }
$c = Get-PSDrive C
if ($c) {
    $cFree = [math]::Round($c.Free / 1GB, 1)
    Info "C: boş alan $cFree GB"
    if ($cFree -lt 3) { Bad "C: diskinde yer çok az ($cFree GB)" }
}

# ---------------------------------------------------------------- Ekran kartı ve ekranlar
Head 'Ekran kartı'
foreach ($g in Get-CimInstance Win32_VideoController) {
    $date = if ($g.DriverDate) { $g.DriverDate.ToString('dd.MM.yyyy') } else { '?' }
    Info "$($g.Name) — sürücü $($g.DriverVersion) ($date), $($g.CurrentHorizontalResolution)x$($g.CurrentVerticalResolution) $($g.CurrentRefreshRate) Hz"
    if ($g.Name -match 'Basic Display|Temel Görüntü') { Bad 'Ekran kartı sürücüsü kurulu değil (Microsoft Temel Görüntü Bağdaştırıcısı) — 3B Nook ve ada düzgün çalışmaz' }
    elseif ($g.DriverDate -and $g.DriverDate -lt (Get-Date).AddYears(-3)) { Bad "Ekran kartı sürücüsü eski ($date) — güncellemek donmaları azaltabilir" }
}

Head 'Ekranlar'
Add-Type -AssemblyName System.Windows.Forms
$screens = [System.Windows.Forms.Screen]::AllScreens
Info "Ekran sayısı: $($screens.Count)"
foreach ($s in $screens) {
    $b = $s.Bounds
    $main = if ($s.Primary) { ' (ana ekran)' } else { '' }
    Info "$($s.DeviceName): $($b.Width)x$($b.Height) konum $($b.X),$($b.Y)$main"
}
$dpi = (Get-ItemProperty 'HKCU:\Control Panel\Desktop\WindowMetrics').AppliedDPI
if ($dpi) { Info ("Ölçeklendirme: %{0}" -f [math]::Round($dpi / 96 * 100)) }

# ---------------------------------------------------------------- WebView2
Head 'WebView2 (Nook arayüzünü çizen bileşen)'
$wvKey = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
$wv = @(
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$wvKey",
    "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$wvKey",
    "HKCU:\Software\Microsoft\EdgeUpdate\Clients\$wvKey"
) | ForEach-Object { (Get-ItemProperty $_).pv } | Where-Object { $_ -and $_ -ne '0.0.0.0' } | Select-Object -First 1
if ($wv) { Ok "WebView2 kurulu: $wv" } else { Bad 'WebView2 bulunamadı — https://go.microsoft.com/fwlink/p/?LinkId=2124703 adresinden kurulmalı' }

# ---------------------------------------------------------------- Nook kurulumu
Head 'Nook kurulumu'
$exe = Join-Path $env:LOCALAPPDATA 'Nook\nook.exe'
if (Test-Path $exe) { Ok "Kurulu: $exe (sürüm $((Get-Item $exe).VersionInfo.ProductVersion))" } else { Bad "Nook beklenen yerde değil ($exe)" }
$run = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$auto = $run.PSObject.Properties | Where-Object { $_.Value -match 'nook\.exe' }
if ($auto) { Ok 'Windows açılınca başlıyor' } else { Info 'Windows açılınca başlamıyor' }

# ---------------------------------------------------------------- Çalışıyor mu, donuk mu
Head 'Nook şu an (10 saniye izleniyor)'
$procs = @(Get-Process nook)
if ($procs.Count -eq 0) {
    Bad 'Nook şu an çalışmıyor — testi Nook açıkken (ve sorun yaşanırken) yeniden çalıştırmak daha çok bilgi verir'
} else {
    $cores = [Environment]::ProcessorCount
    $web = { @(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" | Where-Object { $_.CommandLine -match 'nook' }) }
    $t0 = @{}; foreach ($p in $procs) { $t0[$p.Id] = $p.TotalProcessorTime.TotalSeconds }
    $w0 = 0; foreach ($w in (& $web)) { $w0 += ($w.KernelModeTime + $w.UserModeTime) / 1e7 }
    $hung = 0
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 1
        foreach ($p in $procs) { $p.Refresh(); if (-not $p.Responding) { $hung++ } }
    }
    foreach ($p in $procs) {
        $p.Refresh()
        $cpuPct = [math]::Round(($p.TotalProcessorTime.TotalSeconds - $t0[$p.Id]) / 10 / $cores * 100, 1)
        Info ("nook.exe #{0}: açılış {1}, bellek {2} MB, işlemci %{3}" -f $p.Id, $p.StartTime.ToString('dd.MM HH:mm'), [math]::Round($p.WorkingSet64 / 1MB), $cpuPct)
        if ($cpuPct -gt 25) { Bad "Nook işlemciyi çok kullanıyor (%$cpuPct)" }
    }
    if ($procs.Count -gt 1) { Bad "Aynı anda $($procs.Count) Nook çalışıyor" }
    if ($hung -gt 0) { Bad "Nook 10 saniyenin $hung anında 'yanıt vermiyor' durumundaydı (donuk)" } else { Ok 'Nook yanıt veriyor' }
    $ws = & $web
    $w1 = 0; $mem = 0; foreach ($w in $ws) { $w1 += ($w.KernelModeTime + $w.UserModeTime) / 1e7; $mem += $w.WorkingSetSize }
    $wPct = [math]::Round(($w1 - $w0) / 10 / $cores * 100, 1)
    Info ("Arayüz süreçleri (WebView2): {0} adet, bellek {1} MB, işlemci %{2}" -f $ws.Count, [math]::Round($mem / 1MB), $wPct)
    if ($wPct -gt 30) { Bad "Nook'un arayüzü işlemciyi çok kullanıyor (%$wPct)" }
}

# ---------------------------------------------------------------- Windows olay günlüğü
Head 'Windows çökme / donma kayıtları (son 14 gün)'
$ev = @(Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Id = 1000, 1002; StartTime = (Get-Date).AddDays(-14) } | Where-Object { $_.Message -match 'nook\.exe' })
if ($ev.Count -eq 0) { Ok 'Windows, Nook için çökme ya da donma kaydetmemiş' }
else {
    $crash = @($ev | Where-Object Id -eq 1000).Count
    $hang = @($ev | Where-Object Id -eq 1002).Count
    Bad "Windows'un kaydına göre Nook $crash kez çöktü, $hang kez dondu"
    foreach ($e in $ev | Select-Object -First 15) {
        $kind = if ($e.Id -eq 1000) { 'ÇÖKME' } else { 'DONMA' }
        $first = (($e.Message -split "`r?`n") | Where-Object { $_.Trim() } | Select-Object -First 3) -join ' / '
        Info "$($e.TimeCreated.ToString('dd.MM HH:mm')) $kind — $first"
    }
}

# ---------------------------------------------------------------- Antivirüs
Head 'Antivirüs'
$avs = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct
foreach ($a in $avs) { Info "Kurulu: $($a.displayName)" }
$det = @(Get-MpThreatDetection | Where-Object { ($_.Resources -join ' ') -match 'nook' })
if ($det.Count -gt 0) { Bad "Windows Defender Nook'la ilgili $($det.Count) tehdit kaydı tutmuş (Nook'un bir parçası engellenmiş olabilir)" }
else { Info "Defender'da Nook'la ilgili kayıt görünmüyor" }

# ---------------------------------------------------------------- Nook günlükleri
Head 'Nook günlükleri'
$logDir = Join-Path $env:LOCALAPPDATA 'Nook\logs'
$copy = Join-Path $work 'gunlukler'
New-Item -ItemType Directory -Force $copy | Out-Null
$days = @(Get-ChildItem $logDir -Filter *.log | Sort-Object LastWriteTime -Descending | Select-Object -First 4)
$old = Join-Path $env:LOCALAPPDATA 'Nook\nook.log'
if (Test-Path $old) { $days += Get-Item $old }
if ($days.Count -eq 0) { Info 'Günlük dosyası bulunamadı' }
foreach ($d in $days) { Copy-Item $d.FullName $copy; Info "Eklendi: $($d.Name)" }
$recent = $days | Where-Object { $_.Name -ne 'nook.log' } | Select-Object -First 2
foreach ($d in $recent) {
    $hits = @(Select-String -Path $d.FullName -Pattern 'ÇÖKTÜ|DONMA|HATA' -Encoding UTF8)
    if ($hits.Count -gt 0) { Bad "$($d.Name): $($hits.Count) çökme/donma/hata satırı (son: $($hits[-1].Line.Trim()))" }
}

# ---------------------------------------------------------------- Özet ve zip
Head 'Özet'
if ($issues.Count -eq 0) { Ok 'Belirgin bir sorun bulunmadı' } else { foreach ($i in $issues) { Say "  - $i" } }

$report = Join-Path $work 'rapor.txt'
[IO.File]::WriteAllLines($report, $lines, (New-Object Text.UTF8Encoding $true))
$zip = Join-Path $desk "Nook-Test-$stamp.zip"
Compress-Archive -Path (Join-Path $work '*') -DestinationPath $zip -Force
Remove-Item $work -Recurse -Force
Write-Host ''
if (Test-Path $zip) {
    Write-Host "  Bitti. Masaüstündeki şu dosyayı gönder: Nook-Test-$stamp.zip" -ForegroundColor Green
    Start-Process explorer.exe "/select,`"$zip`""
} else {
    Write-Host '  Zip oluşturulamadı; yukarıdaki yazıların ekran görüntüsünü gönder.' -ForegroundColor Yellow
}

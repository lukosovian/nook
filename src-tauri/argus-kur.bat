@echo off
setlocal enabledelayedexpansion
title ARGUS Kurulum

echo ============================================
echo   ARGUS kuruluyor...
echo ============================================
echo.

set HEDEF=%USERPROFILE%\Desktop\ARGUS

if exist "%HEDEF%" goto :already_exists

REM 1) Git bu bilgisayarda kurulu mu?
where git >nul 2>nul
if errorlevel 1 goto :no_git
goto :do_clone

:no_git
echo ARGUS'u indirmek icin once "Git" adli bir program gerekiyor, bu bilgisayarda bulunamadi.
echo.
where winget >nul 2>nul
if errorlevel 1 goto :no_winget

set /p KURULSUN=Git'i simdi otomatik kurmami ister misin? E ya da H yaz, sonra Enter'a bas:
if /i not "!KURULSUN!"=="E" goto :install_declined

echo.
echo Git kuruluyor, bu birkac dakika surebilir. Windows Kullanici Hesabi Denetimi
echo penceresi acabilir, cikarsa "Evet" de.
echo.
winget install --id Git.Git -e --source winget --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :winget_failed

echo.
echo Git kuruldu. Bu degisikligin etkili olmasi icin bu pencereyi kapatip
echo bu dosyayi BIR KEZ DAHA cift tiklaman gerekiyor - sadece bu seferlik.
pause
exit /b 0

:winget_failed
echo.
echo Otomatik kurulum basarisiz oldu. Elle kurmak icin simdi acilan sayfadan devam et,
echo kurulum bitince bu dosyayi tekrar calistir.
start "" "https://git-scm.com/download/win"
pause
exit /b 1

:install_declined
echo.
echo Tamam, bir sey kurulmadi. Git'i https://git-scm.com/download/win adresinden kurduktan
echo sonra bu dosyayi tekrar cift tikla.
pause
exit /b 1

:no_winget
echo Bu bilgisayarda otomatik kurulum araci da yok, elle kurman lazim - cok kolay.
echo   1. Simdi acilan sayfada "64-bit Git for Windows Setup" yazan linke tikla
echo   2. Inen dosyayi calistir, hepsine "Next"/"Ileri" diyerek gec (ayarlari degistirme)
echo   3. Kurulum bitince bu pencereyi kapat, bu dosyayi tekrar cift tikla
start "" "https://git-scm.com/download/win"
echo.
pause
exit /b 1

REM 2) ARGUS'u indir
:do_clone
echo ARGUS indiriliyor...
echo.
git clone https://github.com/lukosovian/argus.git "%HEDEF%"
if errorlevel 1 goto :clone_failed

echo.
echo Masaustune bir ARGUS kisayolu ekleniyor...
REM Kisayol, terminal yerine logolu acilis penceresi gosteren baslaticiyi acar (app\launcher\baslat.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%HEDEF%\app\launcher\kisayol.ps1" -Olustur >nul 2>nul

echo.
echo Indirme tamamlandi, ARGUS baslatiliyor - bu ilk seferde birkac dakika surebilir
echo (gerekli dosyalar da indiriliyor)...
echo.
if exist "%HEDEF%\ARGUS.exe" (start "" "%HEDEF%\ARGUS.exe") else start "" "%HEDEF%\ARGUS.bat"
exit /b 0

:clone_failed
echo.
echo Indirme sirasinda bir sorun oldu, yukaridaki mesaji kontrol et - genelde internet
echo baglantisi sorunudur. Duzelince bu dosyayi tekrar calistir.
pause
exit /b 1

:already_exists
echo ARGUS zaten "%HEDEF%" klasorunde kurulu gorunuyor.
echo Acmak/guncellemek icin masaustundeki ARGUS kisayoluna (ya da o klasordeki "ARGUS.bat"
echo dosyasina) cift tikla.
pause
exit /b 0

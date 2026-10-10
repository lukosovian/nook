@echo off
setlocal enabledelayedexpansion
title ARGUS Kurulum

REM Dil: Windows'un dili Turkce degilse mesajlar Ingilizce
set "ARGUS_EN="
set "ARGUS_LOC="
for /f "tokens=3" %%L in ('reg query "HKCU\Control Panel\International" /v LocaleName 2^>nul') do set "ARGUS_LOC=%%L"
if /i not "!ARGUS_LOC:~0,2!"=="tr" set "ARGUS_EN=1"
if defined ARGUS_EN title ARGUS Setup

echo ============================================
if defined ARGUS_EN (echo   Installing ARGUS...) else (echo   ARGUS kuruluyor...)
echo ============================================
echo.

set HEDEF=%USERPROFILE%\Desktop\ARGUS

if exist "%HEDEF%" goto :already_exists

REM 1) Git bu bilgisayarda kurulu mu?
where git >nul 2>nul
if errorlevel 1 goto :no_git
goto :do_clone

:no_git
if defined ARGUS_EN (echo To download ARGUS, a program called "Git" is needed first, and it wasn't found on this computer.) else (echo ARGUS'u indirmek icin once "Git" adli bir program gerekiyor, bu bilgisayarda bulunamadi.)
echo.
where winget >nul 2>nul
if errorlevel 1 goto :no_winget

if defined ARGUS_EN (
  set /p KURULSUN=Shall I install Git automatically now? Type Y or N, then press Enter: 
) else (
  set /p KURULSUN=Git'i simdi otomatik kurmami ister misin? E ya da H yaz, sonra Enter'a bas:
)
if /i not "!KURULSUN!"=="E" if /i not "!KURULSUN!"=="Y" goto :install_declined

echo.
if defined ARGUS_EN (echo Installing Git, this may take a few minutes. A Windows User Account Control) else (echo Git kuruluyor, bu birkac dakika surebilir. Windows Kullanici Hesabi Denetimi)
if defined ARGUS_EN (echo window may open; if it does, choose "Yes".) else (echo penceresi acabilir, cikarsa "Evet" de.)
echo.
winget install --id Git.Git -e --source winget --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :winget_failed

echo.
if defined ARGUS_EN (echo Git is installed. For this change to take effect, close this window, then) else (echo Git kuruldu. Bu degisikligin etkili olmasi icin bu pencereyi kapat, sonra)
if defined ARGUS_EN (echo press the "Install" button in Nook's Settings ^> Argus ONE MORE TIME - just this once.) else (echo Nook'ta Ayarlar ^> Argus ^> "Kur" dugmesine BIR KEZ DAHA bas - sadece bu seferlik.)
pause
exit /b 0

:winget_failed
echo.
if defined ARGUS_EN (echo Automatic install failed. Continue from the page that just opened to install it by hand;) else (echo Otomatik kurulum basarisiz oldu. Elle kurmak icin simdi acilan sayfadan devam et,)
if defined ARGUS_EN (echo when it's done, press the "Install" button in Nook's Settings ^> Argus again.) else (echo kurulum bitince Nook'ta Ayarlar ^> Argus ^> "Kur" dugmesine tekrar bas.)
start "" "https://git-scm.com/download/win"
pause
exit /b 1

:install_declined
echo.
if defined ARGUS_EN (echo OK, nothing was installed. After installing Git from https://git-scm.com/download/win,) else (echo Tamam, bir sey kurulmadi. Git'i https://git-scm.com/download/win adresinden kurduktan)
if defined ARGUS_EN (echo press the "Install" button in Nook's Settings ^> Argus again.) else (echo sonra Nook'ta Ayarlar ^> Argus ^> "Kur" dugmesine tekrar bas.)
pause
exit /b 1

:no_winget
if defined ARGUS_EN (echo This computer has no automatic install tool either, so install it by hand - it's easy.) else (echo Bu bilgisayarda otomatik kurulum araci da yok, elle kurman lazim - cok kolay.)
if defined ARGUS_EN (echo   1. On the page that just opened, click the "64-bit Git for Windows Setup" link) else (echo   1. Simdi acilan sayfada "64-bit Git for Windows Setup" yazan linke tikla)
if defined ARGUS_EN (echo   2. Run the downloaded file and click "Next" through all the steps ^(don't change the settings^)) else (echo   2. Inen dosyayi calistir, hepsine "Next"/"Ileri" diyerek gec ^(ayarlari degistirme^))
echo   3. Kurulum bitince bu pencereyi kapat, Nook'ta Ayarlar ^> Argus ^> "Kur" dugmesine tekrar bas
start "" "https://git-scm.com/download/win"
echo.
pause
exit /b 1

REM 2) ARGUS'u indir
:do_clone
if defined ARGUS_EN (echo Downloading ARGUS...) else (echo ARGUS indiriliyor...)
echo.
git clone https://github.com/lukosovian/argus.git "%HEDEF%"
if errorlevel 1 goto :clone_failed

echo.
if defined ARGUS_EN (echo Adding an ARGUS shortcut to your desktop...) else (echo Masaustune bir ARGUS kisayolu ekleniyor...)
REM Kisayol, terminal yerine logolu acilis penceresi gosteren baslaticiyi acar (app\launcher\baslat.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%HEDEF%\app\launcher\kisayol.ps1" -Olustur >nul 2>nul

echo.
if defined ARGUS_EN (echo Download complete, starting ARGUS - the first time this may take a few minutes) else (echo Indirme tamamlandi, ARGUS baslatiliyor - bu ilk seferde birkac dakika surebilir)
if defined ARGUS_EN (echo ^(the required files are downloaded too^)...) else (echo ^(gerekli dosyalar da indiriliyor^)...)
echo.
if exist "%HEDEF%\ARGUS.exe" (start "" "%HEDEF%\ARGUS.exe") else start "" "%HEDEF%\ARGUS.bat"
exit /b 0

:clone_failed
echo.
if defined ARGUS_EN (echo Something went wrong while downloading, check the message above - it's usually an internet) else (echo Indirme sirasinda bir sorun oldu, yukaridaki mesaji kontrol et - genelde internet)
if defined ARGUS_EN (echo connection problem. Once it's fixed, press the "Install" button in Nook's Settings ^> Argus again.) else (echo baglantisi sorunudur. Duzelince Nook'ta Ayarlar ^> Argus ^> "Kur" dugmesine tekrar bas.)
pause
exit /b 1

:already_exists
if defined ARGUS_EN (echo ARGUS already seems to be installed in the "%HEDEF%" folder.) else (echo ARGUS zaten "%HEDEF%" klasorunde kurulu gorunuyor.)
if defined ARGUS_EN (echo To open/update it, double-click the ARGUS shortcut on your desktop ^(or the "ARGUS.bat") else (echo Acmak/guncellemek icin masaustundeki ARGUS kisayoluna ^(ya da o klasordeki "ARGUS.bat")
if defined ARGUS_EN (echo file in that folder^).) else (echo dosyasina^) cift tikla.)
pause
exit /b 0

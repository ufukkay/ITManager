@echo off
:: Yonetici yetkisi kontrolu ve otomatik yukseltme
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Yonetici yetkisi gerekiyor, izin isteniyor...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title ITManager Agent Installer
echo.
echo ======================================
echo   ITManager Agent - Kurulum v1.0
echo ======================================
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\ITManager Agent"

echo Varsayilan kurulum dizini: %INSTALL_DIR%
echo.
set /p CUSTOM_DIR="Farkli bir dizin icin yol girin (bos birakirsaniz varsayilan): "

if not "%CUSTOM_DIR%"=="" set "INSTALL_DIR=%CUSTOM_DIR%"

echo.
echo Kuruluyor: %INSTALL_DIR%
echo.

:: Klasor olustur
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    if %errorlevel% neq 0 (
        echo HATA: Klasor olusturulamadi!
        pause
        exit /b 1
    )
)

:: Dosyalari kopyala
echo Dosyalar kopyalaniyor...
xcopy /E /I /Y "%~dp0app\*" "%INSTALL_DIR%\" >nul 2>&1
if %errorlevel% neq 0 (
    echo HATA: Dosyalar kopyalanamadi!
    pause
    exit /b 1
)
echo Dosyalar kopyalandi.

:: Masaustu kisayolu
echo Masaustu kisayolu olusturuluyor...
echo Set oLink = CreateObject("WScript.Shell").CreateShortcut("%USERPROFILE%\Desktop\ITManager Agent.lnk") > "%TEMP%\shortcut.vbs"
echo oLink.TargetPath = "%INSTALL_DIR%\ITManager Agent.exe" >> "%TEMP%\shortcut.vbs"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%TEMP%\shortcut.vbs"
echo oLink.Description = "ITManager Sunucu Izleme Ajani" >> "%TEMP%\shortcut.vbs"
echo oLink.Save >> "%TEMP%\shortcut.vbs"
cscript /nologo "%TEMP%\shortcut.vbs"
del "%TEMP%\shortcut.vbs"

:: Baslat menusu
echo Baslat menusu kisayolu olusturuluyor...
if not exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\ITManager" mkdir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\ITManager"
echo Set oLink = CreateObject("WScript.Shell").CreateShortcut("%APPDATA%\Microsoft\Windows\Start Menu\Programs\ITManager\ITManager Agent.lnk") > "%TEMP%\startmenu.vbs"
echo oLink.TargetPath = "%INSTALL_DIR%\ITManager Agent.exe" >> "%TEMP%\startmenu.vbs"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%TEMP%\startmenu.vbs"
echo oLink.Save >> "%TEMP%\startmenu.vbs"
cscript /nologo "%TEMP%\startmenu.vbs"
del "%TEMP%\startmenu.vbs"

:: Kontrol Paneli - Program Ekle/Kaldir kaydi
echo Kontrol Paneli'ne kaydediliyor...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ITManagerAgent" /v "DisplayName" /t REG_SZ /d "ITManager Agent" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ITManagerAgent" /v "UninstallString" /t REG_SZ /d "\"%INSTALL_DIR%\uninstall.bat\"" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ITManagerAgent" /v "Publisher" /t REG_SZ /d "ITManager" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ITManagerAgent" /v "DisplayVersion" /t REG_SZ /d "1.0.0" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ITManagerAgent" /v "InstallLocation" /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1

:: Kaldirma scripti olustur
echo @echo off > "%INSTALL_DIR%\uninstall.bat"
echo echo ITManager Agent kaldiriliyor... >> "%INSTALL_DIR%\uninstall.bat"
echo taskkill /f /im "ITManager Agent.exe" 2^>nul >> "%INSTALL_DIR%\uninstall.bat"
echo timeout /t 2 /nobreak ^>nul >> "%INSTALL_DIR%\uninstall.bat"
echo del "%USERPROFILE%\Desktop\ITManager Agent.lnk" 2^>nul >> "%INSTALL_DIR%\uninstall.bat"
echo rd /s /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\ITManager" 2^>nul >> "%INSTALL_DIR%\uninstall.bat"
echo reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ITManagerAgent" /f ^>nul 2^>nul >> "%INSTALL_DIR%\uninstall.bat"
echo rd /s /q "%INSTALL_DIR%" >> "%INSTALL_DIR%\uninstall.bat"
echo echo Kaldirma tamamlandi. >> "%INSTALL_DIR%\uninstall.bat"
echo pause >> "%INSTALL_DIR%\uninstall.bat"

echo.
echo ======================================
echo   Kurulum basariyla tamamlandi!
echo ======================================
echo.
echo Konum: %INSTALL_DIR%
echo Masaustunde "ITManager Agent" kisayolu olusturuldu.
echo Kontrol Paneli'nden kaldirabilirsiniz.
echo.

set /p START_NOW="Ajani simdi baslatmak ister misiniz? (E/H): "
if /i "%START_NOW%"=="E" (
    start "" "%INSTALL_DIR%\ITManager Agent.exe"
    echo Ajan baslatildi!
)

echo.
pause

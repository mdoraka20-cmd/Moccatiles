@echo off
setlocal
cd /d "%~dp0"
echo ===== Tiles Billing - Build and Install =====

set "CSC=%windir%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%windir%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (
  echo ERROR: .NET Framework 4 compiler not found. Enable .NET Framework 4.x in Windows Features.
  pause
  exit /b 1
)

echo Building TilesBilling.exe ...
"%CSC%" /nologo /target:winexe /optimize+ /codepage:65001 /out:TilesBilling.exe /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Core.dll Billing.cs
if errorlevel 1 (
  echo.
  echo BUILD FAILED. Please send the error text above.
  pause
  exit /b 1
)

set "DEST=%LOCALAPPDATA%\TilesBilling"
if not exist "%DEST%" mkdir "%DEST%"
copy /y TilesBilling.exe "%DEST%\TilesBilling.exe" >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; foreach($d in @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))){ $s=$w.CreateShortcut($d+'\Tiles Billing.lnk'); $s.TargetPath='%DEST%\TilesBilling.exe'; $s.WorkingDirectory='%DEST%'; $s.Save() }"

echo.
echo Installed to: %DEST%
echo Shortcut created: "Tiles Billing" (Desktop + Start Menu)
echo Data is stored on D:\TilesBillingData (or C:\TilesBillingData if no D: drive).
start "" "%DEST%\TilesBilling.exe"
pause

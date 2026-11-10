@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo   inventory billing এপ্স - VB.NET Build and Install
echo ============================================================

set "VBC=%windir%\Microsoft.NET\Framework64\v4.0.30319\vbc.exe"
if not exist "%VBC%" set "VBC=%windir%\Microsoft.NET\Framework\v4.0.30319\vbc.exe"
if not exist "%VBC%" (
  echo [ERROR] .NET Framework 4 Visual Basic Compiler (vbc.exe) not found.
  echo Please enable .NET Framework 3.5 / 4.x in Windows Features.
  pause
  exit /b 1
)

echo Compiling InventoryBilling.exe with VB.NET Compiler (vbc.exe)...
"%VBC%" /nologo /target:winexe /optimize+ /codepage:65001 /out:InventoryBilling.exe /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Core.dll Billing.vb

if errorlevel 1 (
  echo.
  echo [BUILD FAILED] Please check the compilation error above.
  pause
  exit /b 1
)

echo Compilation Successful!
set "DEST=%LOCALAPPDATA%\InventoryBilling"
if not exist "%DEST%" mkdir "%DEST%"
copy /y InventoryBilling.exe "%DEST%\InventoryBilling.exe" >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; foreach($d in @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))){ $s=$w.CreateShortcut($d+'\Inventory Billing.lnk'); $s.TargetPath='%DEST%\InventoryBilling.exe'; $s.WorkingDirectory='%DEST%'; $s.Save() }"

echo.
echo Application Installed to: %DEST%
echo Desktop & Start Menu Shortcut: "Inventory Billing"
echo Default Data Storage: D:\InventoryBillingData (or C:\InventoryBillingData)
start "" "%DEST%\InventoryBilling.exe"
pause

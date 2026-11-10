@echo off
set "DEST=%LOCALAPPDATA%\TilesBilling"
del /q "%DEST%\TilesBilling.exe" 2>nul
rmdir "%DEST%" 2>nul
del /q "%USERPROFILE%\Desktop\Tiles Billing.lnk" 2>nul
powershell -NoProfile -Command "Remove-Item ([Environment]::GetFolderPath('Programs')+'\Tiles Billing.lnk') -ErrorAction SilentlyContinue"
echo Program removed. Your data folder (TilesBillingData) was NOT deleted.
pause

@echo off
chcp 65001 >nul
title HomeMe Desktop Setup Creator
color 0A

echo =====================================================
echo           HomeMe Desktop Setup Creator
echo        مُنشئ إعداد تطبيق HomeMe لسطح المكتب
echo =====================================================
echo.

echo [1/5] التحقق من الملفات المطلوبة...
echo [1/5] Checking required files...
if not exist "dist\win-unpacked\HomeMe.exe" (
    echo ❌ ملف HomeMe.exe غير موجود
    echo ❌ HomeMe.exe not found
    echo يجب بناء التطبيق أولاً بتشغيل: npm run build
    echo Please build the application first by running: npm run build
    pause
    exit /b 1
)
echo ✅ تم العثور على جميع الملفات المطلوبة
echo ✅ All required files found

echo.
echo [2/5] إنشاء مجلد الـ Setup...
echo [2/5] Creating Setup folder...
if not exist "dist\HomeMe-Setup" mkdir "dist\HomeMe-Setup"
if not exist "dist\HomeMe-Setup\App" mkdir "dist\HomeMe-Setup\App"

echo.
echo [3/5] نسخ ملفات التطبيق...
echo [3/5] Copying application files...
robocopy "dist\win-unpacked" "dist\HomeMe-Setup\App" /E /NFL /NDL /NJH /NJS /NC /NS /NP
echo ✅ تم نسخ ملفات التطبيق
echo ✅ Application files copied

echo.
echo [4/5] إنشاء ملف التثبيت...
echo [4/5] Creating installer script...

(
echo @echo off
echo chcp 65001 ^>nul
echo title HomeMe Installation Wizard - معالج تثبيت HomeMe
echo color 0B
echo.
echo =====================================================
echo           HomeMe Installation Wizard
echo              معالج تثبيت HomeMe
echo =====================================================
echo.
echo مرحباً بك في معالج تثبيت تطبيق HomeMe لإدارة المجتمعات السكنية
echo Welcome to HomeMe Community Management Platform installer
echo.
echo هذا المعالج سيقوم بتثبيت HomeMe على جهازك
echo This wizard will install HomeMe on your computer
echo.
pause
echo.
echo [1/4] تحديد مجلد التثبيت...
echo [1/4] Selecting installation folder...
set "INSTALL_DIR=%%PROGRAMFILES%%\HomeMe"
echo المجلد المقترح: %%INSTALL_DIR%%
echo Suggested folder: %%INSTALL_DIR%%
echo.
set /p "custom_dir=اتركه فارغاً للمجلد المقترح أو أدخل مسار جديد (Leave empty for default or enter new path): "
if not "%%custom_dir%%"=="" set "INSTALL_DIR=%%custom_dir%%"
echo.
echo سيتم التثبيت في: %%INSTALL_DIR%%
echo Will install to: %%INSTALL_DIR%%
echo.
pause
echo.
echo [2/4] إنشاء مجلد التثبيت...
echo [2/4] Creating installation directory...
if not exist "%%INSTALL_DIR%%" mkdir "%%INSTALL_DIR%%"
echo ✅ تم إنشاء مجلد التثبيت
echo ✅ Installation directory created
echo.
echo [3/4] نسخ ملفات التطبيق...
echo [3/4] Copying application files...
robocopy "%%~dp0App" "%%INSTALL_DIR%%" /E /NFL /NDL /NJH /NJS /NC /NS /NP
echo ✅ تم نسخ جميع الملفات
echo ✅ All files copied successfully
echo.
echo [4/4] إنشاء اختصارات...
echo [4/4] Creating shortcuts...
echo Set oWS = WScript.CreateObject^("WScript.Shell"^) > "%%TEMP%%\shortcut.vbs"
echo sLinkFile = "%%USERPROFILE%%\Desktop\HomeMe.lnk" >> "%%TEMP%%\shortcut.vbs"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^) >> "%%TEMP%%\shortcut.vbs"
echo oLink.TargetPath = "%%INSTALL_DIR%%\HomeMe.exe" >> "%%TEMP%%\shortcut.vbs"
echo oLink.WorkingDirectory = "%%INSTALL_DIR%%" >> "%%TEMP%%\shortcut.vbs"
echo oLink.Description = "HomeMe Community Management Platform" >> "%%TEMP%%\shortcut.vbs"
echo oLink.Save >> "%%TEMP%%\shortcut.vbs"
cscript "%%TEMP%%\shortcut.vbs" ^>nul
del "%%TEMP%%\shortcut.vbs"
echo ✅ تم إنشاء اختصار سطح المكتب
echo ✅ Desktop shortcut created
echo.
echo Set oWS = WScript.CreateObject^("WScript.Shell"^) > "%%TEMP%%\shortcut2.vbs"
echo sLinkFile = "%%APPDATA%%\Microsoft\Windows\Start Menu\Programs\HomeMe.lnk" >> "%%TEMP%%\shortcut2.vbs"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^) >> "%%TEMP%%\shortcut2.vbs"
echo oLink.TargetPath = "%%INSTALL_DIR%%\HomeMe.exe" >> "%%TEMP%%\shortcut2.vbs"
echo oLink.WorkingDirectory = "%%INSTALL_DIR%%" >> "%%TEMP%%\shortcut2.vbs"
echo oLink.Description = "HomeMe Community Management Platform" >> "%%TEMP%%\shortcut2.vbs"
echo oLink.Save >> "%%TEMP%%\shortcut2.vbs"
cscript "%%TEMP%%\shortcut2.vbs" ^>nul
del "%%TEMP%%\shortcut2.vbs"
echo ✅ تم إنشاء اختصار قائمة ابدأ
echo ✅ Start menu shortcut created
echo.
echo =====================================================
echo           تم التثبيت بنجاح!
echo         Installation Completed Successfully!
echo =====================================================
echo.
echo تم تثبيت HomeMe بنجاح على جهازك
echo HomeMe has been successfully installed on your computer
echo.
echo يمكنك الآن تشغيل التطبيق من:
echo You can now run the application from:
echo • سطح المكتب (Desktop^)
echo • قائمة ابدأ (Start Menu^)
echo • أو من مجلد: %%INSTALL_DIR%%
echo.
echo معلومات تسجيل الدخول:
echo Login Information:
echo • المستخدم (Username^): admin
echo • كلمة المرور (Password^): admin123
echo.
set /p "launch=هل تريد تشغيل التطبيق الآن؟ (Do you want to launch the app now?^) [Y/N]: "
if /i "%%launch%%"=="Y" start "" "%%INSTALL_DIR%%\HomeMe.exe"
echo.
echo شكراً لاستخدام HomeMe!
echo Thank you for using HomeMe!
pause
) > "dist\HomeMe-Setup\Setup-HomeMe.bat"

echo ✅ تم إنشاء ملف التثبيت
echo ✅ Installer script created

echo.
echo [5/5] إنشاء ملف README...
echo [5/5] Creating README file...
(
echo # HomeMe Desktop Application Setup
echo.
echo ## طريقة التثبيت ^| Installation Guide
echo.
echo ### الخطوة 1: تشغيل المثبت
echo 1. شغل ملف "Setup-HomeMe.bat" كمدير ^(Run as Administrator^)
echo 2. اتبع التعليمات على الشاشة
echo.
echo ### Step 1: Run Installer
echo 1. Run "Setup-HomeMe.bat" as Administrator
echo 2. Follow the on-screen instructions
echo.
echo ### الخطوة 2: تسجيل الدخول
echo - المستخدم: admin
echo - كلمة المرور: admin123
echo.
echo ### Step 2: Login
echo - Username: admin
echo - Password: admin123
echo.
echo ## متطلبات النظام ^| System Requirements
echo - Windows 10/11 ^(64-bit^)
echo - 4 GB RAM ^(مُستحسن 8 GB^)
echo - اتصال إنترنت ^(Internet connection required^)
echo - 200 MB مساحة فارغة ^(Free disk space^)
echo.
echo ## الدعم الفني ^| Technical Support
echo 📧 support@homeme.com
echo 🌐 https://homeme.com
echo.
echo HomeMe Team © 2025
) > "dist\HomeMe-Setup\README.txt"

echo ✅ تم إنشاء ملف README
echo ✅ README file created

echo.
echo =====================================================
echo        تم إنشاء الـ Setup بنجاح!
echo       Setup Created Successfully!
echo =====================================================
echo.
echo تم إنشاء ملفات التثبيت في مجلد:
echo Installation files created in folder:
echo 📁 dist\HomeMe-Setup\
echo.
echo الملفات المُنشأة:
echo Generated files:
echo • Setup-HomeMe.bat - ملف التثبيت الرئيسي
echo • App\ - مجلد ملفات التطبيق
echo • README.txt - دليل التثبيت
echo.
echo لإنشاء ملف مضغوط، استخدم:
echo To create a ZIP file, use:
echo 📦 Compress the "HomeMe-Setup" folder
echo.
pause
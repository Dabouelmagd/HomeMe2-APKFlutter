const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createPortableApp() {
  console.log('📦 إنشاء التطبيق المحمول...');
  console.log('📦 Creating Portable Application...');
  
  const sourceDir = './dist/win-unpacked';
  const outputDir = './dist/HomeMe-Portable';
  
  // إنشاء مجلد التطبيق المحمول
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // نسخ ملفات التطبيق
  copyRecursiveSync(sourceDir, outputDir);
  
  // إنشاء ملف بدء التشغيل
  const startupScript = `@echo off
title HomeMe - Community Management Platform
echo ===================================================
echo       مرحباً بك في HomeMe
echo    Welcome to HomeMe Desktop Application
echo ===================================================
echo.
echo تأكد من اتصال الإنترنت قبل البدء
echo Please ensure internet connection before starting
echo.
pause
echo بدء تشغيل التطبيق...
echo Starting Application...
start "" "%~dp0HomeMe.exe"
`;
  
  fs.writeFileSync(path.join(outputDir, 'Start-HomeMe.bat'), startupScript);
  
  // إنشاء ملف README
  const readmeContent = `# HomeMe Desktop Application

## طريقة التشغيل | How to Run
1. تأكد من اتصال الإنترنت | Ensure internet connection
2. شغل ملف "Start-HomeMe.bat" | Run "Start-HomeMe.bat"
3. أو شغل "HomeMe.exe" مباشرة | Or run "HomeMe.exe" directly

## معلومات تسجيل الدخول | Login Information
- المستخدم | Username: admin
- كلمة المرور | Password: admin123

## اللغات المدعومة | Supported Languages
- العربية | Arabic
- English | إنجليزية  
- Français | فرنسية

## الدعم الفني | Support
📧 support@homeme.com
🌐 https://homeme.com

HomeMe Team © 2025
`;
  
  fs.writeFileSync(path.join(outputDir, 'README.txt'), readmeContent);
  
  // إنشاء ملف معلومات النظام
  const systemInfo = `HomeMe Desktop Application
Version: 1.0.0
Build Date: ${new Date().toISOString().split('T')[0]}
Platform: Windows x64
Type: Portable Application

System Requirements:
- Windows 10/11 (64-bit)
- 4 GB RAM (Recommended: 8 GB)
- Internet Connection Required
- 200 MB Free Disk Space
`;
  
  fs.writeFileSync(path.join(outputDir, 'System-Info.txt'), systemInfo);
  
  console.log('✅ تم إنشاء التطبيق المحمول في:', outputDir);
  console.log('✅ Portable application created in:', outputDir);
  
  // إنشاء ملف مضغوط
  await createZipFile(outputDir);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function createZipFile(sourceDir) {
  return new Promise((resolve, reject) => {
    console.log('🗜️ إنشاء ملف مضغوط...');
    console.log('🗜️ Creating ZIP file...');
    
    const output = fs.createWriteStream('./dist/HomeMe-Desktop-v1.0.0-Portable.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      const sizeInMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`✅ تم إنشاء الملف المضغوط: ${sizeInMB} MB`);
      console.log(`✅ ZIP file created: ${sizeInMB} MB`);
      resolve();
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    
    // إضافة جميع ملفات التطبيق
    archive.directory(sourceDir, 'HomeMe-Desktop');
    archive.finalize();
  });
}

// التحقق من وجود archiver
if (!fs.existsSync('./node_modules/archiver')) {
  console.log('📦 تثبيت archiver...');
  console.log('📦 Installing archiver...');
  require('child_process').execSync('npm install archiver', { stdio: 'inherit' });
}

createPortableApp().catch(console.error);
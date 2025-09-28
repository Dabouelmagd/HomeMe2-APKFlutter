const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 بدء عملية بناء التطبيق المكتبي لـ HomeMe...');
console.log('🚀 Starting HomeMe Desktop App Build Process...');

try {
  // التحقق من وجود الملفات المطلوبة
  const requiredFiles = [
    './src/main.js',
    './assets/icon.ico',
    './assets/icon.png'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`ملف مطلوب غير موجود: ${file} | Required file missing: ${file}`);
    }
  }
  
  console.log('✅ جميع الملفات المطلوبة موجودة');
  console.log('✅ All required files found');
  
  // تثبيت Dependencies إذا لم تكن موجودة
  if (!fs.existsSync('./node_modules')) {
    console.log('📦 تثبيت Dependencies...');
    console.log('📦 Installing Dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }
  
  // بناء التطبيق للـ Windows
  console.log('🔨 بناء التطبيق للـ Windows...');
  console.log('🔨 Building Windows Application...');
  
  execSync('npm run build:win', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('🎉 تم بناء التطبيق بنجاح!');
  console.log('🎉 Application built successfully!');
  
  // عرض معلومات الملفات الناتجة
  const distPath = './dist';
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    console.log('\n📁 الملفات الناتجة في مجلد dist:');
    console.log('📁 Generated files in dist folder:');
    
    files.forEach(file => {
      const filePath = path.join(distPath, file);
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   📄 ${file} (${sizeInMB} MB)`);
    });
    
    // البحث عن ملف .exe
    const exeFile = files.find(file => file.endsWith('.exe'));
    if (exeFile) {
      console.log(`\n🎯 ملف التثبيت جاهز: ./dist/${exeFile}`);
      console.log(`🎯 Installer ready: ./dist/${exeFile}`);
    }
  }
  
} catch (error) {
  console.error('❌ خطأ في عملية البناء:', error.message);
  console.error('❌ Build Error:', error.message);
  process.exit(1);
}
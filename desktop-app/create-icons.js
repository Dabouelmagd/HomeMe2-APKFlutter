const sharp = require('sharp');
const fs = require('fs');

// إنشاء أيقونة PNG بأحجام مختلفة
async function createIcons() {
  const svgBuffer = fs.readFileSync('./assets/icon.svg');
  
  // إنشاء أيقونة 512x512 للاستخدام العام
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('./assets/icon.png');
  
  // إنشاء أيقونة 256x256 للـ ICO
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile('./assets/icon-256.png');
  
  // إنشاء أيقونة 64x64 للـ ICO
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile('./assets/icon-64.png');
  
  // إنشاء أيقونة 32x32 للـ ICO
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile('./assets/icon-32.png');
  
  console.log('✅ تم إنشاء الأيقونات بنجاح!');
  console.log('Icons created successfully!');
}

createIcons().catch(console.error);
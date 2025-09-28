const pngToIco = require('png-to-ico');
const fs = require('fs');

async function createICO() {
  try {
    // قراءة ملفات PNG
    const pngFiles = [
      './assets/icon-256.png',
      './assets/icon-64.png',
      './assets/icon-32.png'
    ];
    
    // تحويل إلى ICO
    const buf = await pngToIco(pngFiles);
    
    // حفظ ملف ICO
    fs.writeFileSync('./assets/icon.ico', buf);
    
    console.log('✅ تم إنشاء ملف icon.ico بنجاح!');
    console.log('ICO file created successfully!');
  } catch (error) {
    console.error('خطأ في إنشاء ICO:', error);
    console.error('Error creating ICO:', error);
  }
}

createICO();
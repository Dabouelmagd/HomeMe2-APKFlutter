const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

// تعطيل تحذيرات الأمان في وضع التطوير
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// URL التطبيق - يجب تحديثه للإشارة إلى الخادم الفعلي
const APP_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-homeme-domain.com'  // استبدل بالدومين الفعلي
  : 'http://localhost:3000';

let mainWindow;

function createWindow() {
  // إنشاء النافذة الرئيسية
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: false
  });

  // تحميل التطبيق
  mainWindow.loadURL(APP_URL);

  // إظهار النافذة عند اكتمال التحميل
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // فتح DevTools في وضع التطوير فقط
    if (process.env.NODE_ENV !== 'production') {
      mainWindow.webContents.openDevTools();
    }
  });

  // التعامل مع إغلاق النافذة
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // التعامل مع الروابط الخارجية
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // منع التنقل لخارج التطبيق
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const appDomain = new URL(APP_URL);
    
    if (parsedUrl.origin !== appDomain.origin) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // التعامل مع أخطاء التحميل
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      showConnectionError();
    }
  });
}

// إظهار رسالة خطأ الاتصال
function showConnectionError() {
  const errorHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>خطأ في الاتصال - Connection Error</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .error-container {
                text-align: center;
                background: rgba(255, 255, 255, 0.1);
                padding: 3rem;
                border-radius: 20px;
                backdrop-filter: blur(10px);
                max-width: 500px;
            }
            .error-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            .error-title {
                font-size: 2rem;
                margin-bottom: 1rem;
                font-weight: bold;
            }
            .error-message {
                font-size: 1.1rem;
                margin-bottom: 2rem;
                line-height: 1.6;
            }
            .retry-btn {
                background: #4f46e5;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: background 0.3s;
            }
            .retry-btn:hover {
                background: #3730a3;
            }
        </style>
    </head>
    <body>
        <div class="error-container">
            <div class="error-icon">🌐</div>
            <h1 class="error-title">خطأ في الاتصال</h1>
            <p class="error-message">
                لا يمكن الاتصال بخادم HomeMe.<br>
                يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.
                <br><br>
                <strong>Cannot connect to HomeMe server.<br>
                Please check your internet connection and try again.</strong>
            </p>
            <button class="retry-btn" onclick="window.location.reload()">
                إعادة المحاولة - Retry
            </button>
        </div>
    </body>
    </html>
  `;
  
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
}

// إنشاء قائمة التطبيق
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'الصفحة الرئيسية - Home',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(APP_URL);
            }
          }
        },
        {
          label: 'إعادة تحميل - Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'خروج - Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'تكبير - Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
            }
          }
        },
        {
          label: 'تصغير - Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
            }
          }
        },
        {
          label: 'حجم طبيعي - Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.setZoomLevel(0);
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'حول HomeMe - About HomeMe',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'حول HomeMe - About HomeMe',
              message: 'HomeMe Desktop',
              detail: 'نظام إدارة المجتمعات السكنية\nCommunity Management Platform\nVersion 1.0.0'
            });
          }
        },
        {
          label: 'فتح الموقع - Open Website',
          click: () => {
            shell.openExternal(APP_URL);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// عند استعداد التطبيق
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// إغلاق التطبيق عند إغلاق جميع النوافذ (إلا على macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// منع فتح نوافذ متعددة
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// التأكد من تشغيل نسخة واحدة فقط
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}
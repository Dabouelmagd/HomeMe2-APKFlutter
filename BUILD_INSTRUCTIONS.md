# 🚀 HomeMe Android APK Build Instructions

## 📱 **Project Details**
- **App Name:** HomeMe
- **Package Name:** homeme.app  
- **Version:** 1.0.0
- **Target Android:** API Level 34 (Android 14+)

## 📋 **Prerequisites**

### Required Software:
1. **Android Studio** (Latest version)
   - Download: https://developer.android.com/studio
2. **Java JDK 17** (comes with Android Studio)
3. **Android SDK** (managed by Android Studio)

## 🔧 **Build Steps**

### Method 1: Android Studio (RECOMMENDED)
1. **Extract the project:**
   ```bash
   tar -xzf HomeMe-Android-Project.tar.gz
   cd android/
   ```

2. **Open in Android Studio:**
   - Launch Android Studio
   - Click "Open an Existing Project"
   - Select the `android` folder

3. **Sync Project:**
   - Android Studio will auto-sync the project
   - Wait for "Gradle Sync" to complete

4. **Build APK:**
   - Go to: **Build** → **Build Bundle(s)/APK(s)** → **Build APK(s)**
   - Wait for build to complete (2-5 minutes)

5. **Find Your APK:**
   - Location: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Android Studio will show "locate" link when build completes

### Method 2: Command Line
```bash
# Navigate to android directory
cd android/

# Make gradlew executable (Linux/Mac)
chmod +x gradlew

# Build debug APK
./gradlew assembleDebug

# APK location: app/build/outputs/apk/debug/app-debug.apk
```

## 📦 **Build Outputs**

### Debug APK (For Testing)
- **File:** `app-debug.apk`
- **Use:** Install on your device for testing
- **Installation:** `adb install app-debug.apk` or transfer to device

### Release APK (For Distribution)
```bash
# For release version (requires signing)
./gradlew assembleRelease
```

## 🔧 **Troubleshooting**

### Common Issues:

**1. Gradle Sync Failed:**
- Solution: File → Sync Project with Gradle Files

**2. SDK Not Found:**
- Solution: File → Project Structure → SDK Location → Set Android SDK path

**3. Build Tools Missing:**
- Solution: Tools → SDK Manager → Install required build tools

**4. Memory Issues:**
- Add to `gradle.properties`:
  ```
  org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=512m
  ```

## 📱 **Installation Options**

### Option 1: Direct Install
1. Enable "Developer Options" on Android device
2. Enable "USB Debugging"
3. Connect device to computer
4. Run: `adb install app-debug.apk`

### Option 2: File Transfer
1. Copy `app-debug.apk` to device
2. Enable "Install from Unknown Sources"
3. Tap APK file to install

## ⚙️ **Customization Options**

### App Icon:
- Replace files in: `android/app/src/main/res/mipmap-*/`

### App Name:
- Edit: `android/app/src/main/res/values/strings.xml`

### Permissions:
- Edit: `android/app/src/main/AndroidManifest.xml`

### Package Name:
- Modify in: `android/variables.gradle`

## 🎯 **Expected Results**

✅ **Successful APK:** ~15-25 MB file size  
✅ **Installation:** Works on Android 7.0+ devices  
✅ **Features:** Full HomeMe functionality as native app  
✅ **Performance:** Native app speed and offline capability  

## 📞 **Support**

If you encounter any issues:
1. Check Android Studio's "Build" output for specific errors
2. Ensure all SDK components are installed
3. Try "Clean Project" → "Rebuild Project" in Android Studio

---

🎉 **Happy Building!** Your HomeMe Android app is ready to compile!
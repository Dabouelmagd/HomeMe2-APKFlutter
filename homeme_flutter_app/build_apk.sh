#!/bin/bash

# HomeMe Flutter App Build Script
# This script builds the Flutter app into an APK file

echo "🏗️  Building HomeMe Flutter App APK..."
echo "========================================"

# Check if Flutter is available (install if needed)
if ! command -v flutter &> /dev/null; then
    echo "📦 Installing Flutter SDK..."
    
    # Download and install Flutter
    cd /opt
    wget -q https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.16.5-stable.tar.xz
    tar xf flutter_linux_3.16.5-stable.tar.xz
    rm flutter_linux_3.16.5-stable.tar.xz
    
    # Add Flutter to PATH
    export PATH="/opt/flutter/bin:$PATH"
    
    # Accept licenses
    flutter doctor --android-licenses
fi

# Ensure Flutter is in PATH
export PATH="/opt/flutter/bin:$PATH"

# Install Android SDK if not present
if [ ! -d "/opt/android-sdk" ]; then
    echo "📱 Installing Android SDK..."
    
    # Download Android SDK command line tools
    cd /opt
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
    unzip -q commandlinetools-linux-9477386_latest.zip
    mkdir -p android-sdk/cmdline-tools/latest
    mv cmdline-tools/* android-sdk/cmdline-tools/latest/
    rm -rf cmdline-tools commandlinetools-linux-9477386_latest.zip
    
    # Set environment variables
    export ANDROID_SDK_ROOT="/opt/android-sdk"
    export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$PATH"
    
    # Install required Android components
    yes | sdkmanager --licenses
    sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.2"
fi

# Set Android environment
export ANDROID_SDK_ROOT="/opt/android-sdk"
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"

# Navigate to Flutter project directory
cd /app/homeme_flutter_app

echo "🔧 Running Flutter doctor..."
flutter doctor

echo "📦 Getting Flutter dependencies..."
flutter pub get

echo "🏗️  Building APK..."
flutter build apk --release

# Check if build was successful
if [ -f "build/app/outputs/flutter-apk/app-release.apk" ]; then
    echo "✅ Build successful!"
    echo "📱 APK location: build/app/outputs/flutter-apk/app-release.apk"
    
    # Copy APK to a more accessible location
    cp build/app/outputs/flutter-apk/app-release.apk /app/HomeMe-Mobile-v1.0.0.apk
    
    echo "📱 APK copied to: /app/HomeMe-Mobile-v1.0.0.apk"
    
    # Show APK info
    echo ""
    echo "📊 APK Information:"
    echo "==================="
    ls -lh /app/HomeMe-Mobile-v1.0.0.apk
    
    echo ""
    echo "🎉 HomeMe Flutter App APK successfully built!"
    echo "   You can now install this APK on Android devices"
    echo ""
    
else
    echo "❌ Build failed!"
    echo "Check the error messages above for details."
    exit 1
fi
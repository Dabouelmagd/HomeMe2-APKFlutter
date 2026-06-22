import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Helper that gathers FCM token + device metadata so you can send
/// them to the backend with /register or /login.
///
/// Usage:
///   await PushService.init();              // call once, after Firebase.initializeApp()
///   final t  = await PushService.fcmToken();
///   final di = await PushService.deviceInfo();
///   ...register(deviceToken: t, deviceInfo: di);
class PushService {
  static Future<void> init() async {
    final msg = FirebaseMessaging.instance;
    // Request permissions (iOS prompts, Android 13+ prompts)
    await msg.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    // Foreground display options (iOS)
    await msg.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  static Future<String?> fcmToken() async {
    return await FirebaseMessaging.instance.getToken();
  }

  /// Subscribe to a topic (e.g. compound-wide announcements).
  static Future<void> subscribe(String topic) async {
    await FirebaseMessaging.instance.subscribeToTopic(topic);
  }

  static Future<void> unsubscribe(String topic) async {
    await FirebaseMessaging.instance.unsubscribeFromTopic(topic);
  }

  /// Returns the `device_info` payload accepted by /api/mobile/auth/* endpoints.
  static Future<Map<String, dynamic>> deviceInfo() async {
    final pkg = await PackageInfo.fromPlatform();
    final plugin = DeviceInfoPlugin();
    String platform = 'unknown';
    String? model;
    String? osVersion;

    if (Platform.isIOS) {
      platform = 'ios';
      final ios = await plugin.iosInfo;
      model = ios.utsname.machine;
      osVersion = ios.systemVersion;
    } else if (Platform.isAndroid) {
      platform = 'android';
      final a = await plugin.androidInfo;
      model = '${a.manufacturer} ${a.model}';
      osVersion = 'Android ${a.version.release} (SDK ${a.version.sdkInt})';
    }

    return {
      'platform': platform,
      'model': model,
      'os_version': osVersion,
      'app_version': pkg.version,
    };
  }
}

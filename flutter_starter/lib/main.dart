/// Minimal end-to-end example wiring the HomeMe starter into a Flutter app.
///
/// Drop this in `lib/main.dart` and adapt to your navigation framework.
import 'package:flutter/material.dart';

import 'config/api_config.dart';
import 'exceptions.dart';
import 'models/auth_response.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';
import 'services/push_service.dart';
import 'services/token_storage.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // await Firebase.initializeApp();  ← uncomment after you wire firebase_options.dart
  // await PushService.init();
  runApp(const HomeMeApp());
}

class HomeMeApp extends StatelessWidget {
  const HomeMeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HomeMe',
      theme: ThemeData(useMaterial3: true, fontFamily: 'Cairo'),
      home: const SplashGate(),
      builder: (ctx, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child ?? const SizedBox(),
      ),
    );
  }
}

/// On launch, if a token exists, validate it by calling /api/mobile/auth/me.
class SplashGate extends StatefulWidget {
  const SplashGate({super.key});

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> {
  @override
  void initState() {
    super.initState();
    _route();
  }

  Future<void> _route() async {
    final saved = await TokenStorage.instance.readToken();
    if (saved == null || saved.isEmpty) {
      _navigate(const LoginScreen());
      return;
    }
    final user = await AuthService().me();
    if (!mounted) return;
    if (user == null) {
      await TokenStorage.instance.clear();
      _navigate(const LoginScreen());
    } else {
      _navigate(HomeScreen(name: user.fullName ?? user.username ?? ''));
    }
  }

  void _navigate(Widget w) {
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => w));
  }

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final auth = await AuthService().login(MobileLoginRequest(
        username: _username.text.trim(),
        password: _password.text,
        deviceToken: await PushService.fcmToken().catchError((_) => null),
        deviceInfo: await PushService.deviceInfo().catchError((_) => null),
      ));
      if (!mounted) return;
      if (auth.twoFactorSetupRequired) {
        // → push 2FA enrolment screen with auth.setupToken
      } else if (auth.twoFactorRequired) {
        // → push 2FA challenge screen with auth.tempToken
      } else if (auth.isAuthenticated) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (_) => HomeScreen(name: auth.user!.fullName ?? ''),
        ));
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } on NetworkException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('تسجيل الدخول')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            TextField(
              controller: _username,
              decoration: const InputDecoration(labelText: 'اسم المستخدم'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'كلمة المرور'),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loading ? null : _login,
              child: _loading
                  ? const CircularProgressIndicator()
                  : const Text('دخول'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 12),
            Text('API: ${ApiConfig.baseUrl}',
                style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الرئيسية'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await AuthService().logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const LoginScreen()));
              }
            },
          )
        ],
      ),
      body: Center(child: Text('أهلاً $name 👋')),
    );
  }
}

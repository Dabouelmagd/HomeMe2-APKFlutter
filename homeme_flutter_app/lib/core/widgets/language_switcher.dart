import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/language_provider.dart';

class LanguageSwitcher extends ConsumerWidget {
  final Color? textColor;
  final Color? iconColor;

  const LanguageSwitcher({
    super.key,
    this.textColor,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocale = ref.watch(languageProvider);
    final languageNotifier = ref.read(languageProvider.notifier);

    return PopupMenuButton<Locale>(
      icon: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Colors.white.withOpacity(0.2),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              languageNotifier.getLanguageFlag(currentLocale.languageCode),
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(width: 4),
            Text(
              languageNotifier.getLanguageName(currentLocale.languageCode),
              style: TextStyle(
                color: textColor ?? Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.keyboard_arrow_down,
              color: iconColor ?? Colors.white,
              size: 16,
            ),
          ],
        ),
      ),
      onSelected: (Locale locale) {
        languageNotifier.changeLanguage(locale);
      },
      itemBuilder: (BuildContext context) {
        return languageNotifier.supportedLocales.map((Locale locale) {
          return PopupMenuItem<Locale>(
            value: locale,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  languageNotifier.getLanguageFlag(locale.languageCode),
                  style: const TextStyle(fontSize: 18),
                ),
                const SizedBox(width: 12),
                Text(
                  languageNotifier.getLanguageName(locale.languageCode),
                  style: TextStyle(
                    fontWeight: currentLocale == locale 
                        ? FontWeight.bold 
                        : FontWeight.normal,
                  ),
                ),
                if (currentLocale == locale) ...[
                  const SizedBox(width: 8),
                  Icon(
                    Icons.check,
                    color: Theme.of(context).primaryColor,
                    size: 16,
                  ),
                ],
              ],
            ),
          );
        }).toList();
      },
    );
  }
}
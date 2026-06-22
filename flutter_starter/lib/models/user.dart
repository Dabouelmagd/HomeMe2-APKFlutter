/// User model returned by /api/mobile/auth/* endpoints.
class User {
  final String id;
  final String? username;
  final String? email;
  final String? fullName;
  final String? phone;
  final String role;
  final String? compoundId;
  final String? companyId;
  final String? unitNumber;
  final bool emailVerified;
  final bool twoFactorEnabled;

  const User({
    required this.id,
    required this.role,
    this.username,
    this.email,
    this.fullName,
    this.phone,
    this.compoundId,
    this.companyId,
    this.unitNumber,
    this.emailVerified = false,
    this.twoFactorEnabled = false,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        username: json['username'] as String?,
        email: json['email'] as String?,
        fullName: json['full_name'] as String?,
        phone: json['phone'] as String?,
        role: json['role'] as String,
        compoundId: json['compound_id'] as String?,
        companyId: json['company_id'] as String?,
        unitNumber: json['unit_number'] as String?,
        emailVerified: (json['email_verified'] ?? false) as bool,
        twoFactorEnabled: (json['two_factor_enabled'] ?? false) as bool,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'email': email,
        'full_name': fullName,
        'phone': phone,
        'role': role,
        'compound_id': compoundId,
        'company_id': companyId,
        'unit_number': unitNumber,
        'email_verified': emailVerified,
        'two_factor_enabled': twoFactorEnabled,
      };

  bool get isOwner => role == 'app_owner';
  bool get isSuperAdmin => role == 'super_admin';
  bool get isCompanyAdmin => role == 'company_admin';
  bool get isCompoundAdmin => role == 'compound_admin';
  bool get isResident => role == 'resident';
  bool get isSecurity => role == 'security';
}

import 'dart:convert';

class User {
  final String id;
  final String email;
  final String fullName;
  final String role; // 'admin', 'resident', 'company_manager'
  final String? compoundId;
  final String? companyId;
  final String? phoneNumber;
  final String? profileImage;
  final bool isActive;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.compoundId,
    this.companyId,
    this.phoneNumber,
    this.profileImage,
    this.isActive = true,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? json['user_id'] ?? '',
      email: json['email'] ?? '',
      fullName: json['full_name'] ?? json['fullName'] ?? '',
      role: json['role'] ?? 'resident',
      compoundId: json['compound_id'] ?? json['compoundId'],
      companyId: json['company_id'] ?? json['companyId'],
      phoneNumber: json['phone_number'] ?? json['phoneNumber'],
      profileImage: json['profile_image'] ?? json['profileImage'],
      isActive: json['is_active'] ?? json['isActive'] ?? true,
      createdAt: DateTime.tryParse(json['created_at'] ?? json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'role': role,
      'compound_id': compoundId,
      'company_id': companyId,
      'phone_number': phoneNumber,
      'profile_image': profileImage,
      'is_active': isActive,
      'created_at': createdAt.toIso8601String(),
    };
  }

  String toJsonString() => json.encode(toJson());

  factory User.fromJsonString(String jsonString) {
    return User.fromJson(json.decode(jsonString));
  }

  User copyWith({
    String? id,
    String? email,
    String? fullName,
    String? role,
    String? compoundId,
    String? companyId,
    String? phoneNumber,
    String? profileImage,
    bool? isActive,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      role: role ?? this.role,
      compoundId: compoundId ?? this.compoundId,
      companyId: companyId ?? this.companyId,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      profileImage: profileImage ?? this.profileImage,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  bool get isAdmin => role == 'admin';
  bool get isResident => role == 'resident';
  bool get isCompanyManager => role == 'company_manager';
}
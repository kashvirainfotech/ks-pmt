class UserModel {
  final String id;
  final String employeeCode;
  final String firstName;
  final String lastName;
  final String email;
  final String? mobileNumber;
  final String? avatarUrl;
  final String primaryBranchId;
  final String? branchName;
  final String? departmentName;
  final String? designationName;
  final String roleCode;
  final String roleName;
  final bool isEmailLoginAllowed;
  final bool isOtpLoginAllowed;
  final List<String> permissions;

  UserModel({
    required this.id,
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.mobileNumber,
    this.avatarUrl,
    required this.primaryBranchId,
    this.branchName,
    this.departmentName,
    this.designationName,
    required this.roleCode,
    required this.roleName,
    this.isEmailLoginAllowed = true,
    this.isOtpLoginAllowed = true,
    this.permissions = const [],
  });

  String get fullName => '$firstName $lastName'.trim();

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      employeeCode: json['employee_code'] ?? '',
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
      email: json['email'] ?? '',
      mobileNumber: json['mobile_number'],
      avatarUrl: json['avatar_url'],
      primaryBranchId: json['primary_branch_id'] ?? '',
      branchName: json['branch_name'],
      departmentName: json['department_name'],
      designationName: json['designation_name'],
      roleCode: json['role_code'] ?? '',
      roleName: json['role_name'] ?? 'Staff',
      isEmailLoginAllowed: json['is_email_login_allowed'] ?? true,
      isOtpLoginAllowed: json['is_otp_login_allowed'] ?? true,
      permissions: (json['permissions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'employee_code': employeeCode,
      'first_name': firstName,
      'last_name': lastName,
      'email': email,
      'mobile_number': mobileNumber,
      'avatar_url': avatarUrl,
      'primary_branch_id': primaryBranchId,
      'branch_name': branchName,
      'department_name': departmentName,
      'designation_name': designationName,
      'role_code': roleCode,
      'role_name': roleName,
      'is_email_login_allowed': isEmailLoginAllowed,
      'is_otp_login_allowed': isOtpLoginAllowed,
      'permissions': permissions,
    };
  }
}

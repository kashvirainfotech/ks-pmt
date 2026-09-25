import 'dart:io';

class ApiConstants {
  // Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator
  static String get baseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:4000/api/v1';
    }
    return 'http://localhost:4000/api/v1';
  }

  // Auth Endpoints
  static const String loginPassword = '/auth/login-password';
  static const String requestOtp = '/auth/request-otp';
  static const String loginOtp = '/auth/login-otp';
  static const String refreshToken = '/auth/refresh-token';
  static const String logout = '/auth/logout';
  static const String getMe = '/auth/me';

  // Tasks & Workflows
  static const String tasks = '/tasks';
  static const String taskTypes = '/task-types';
  static const String workflowStatuses = '/task-workflows/statuses';

  // Time Logs & Attachments
  static const String timeLogs = '/time-logs';
  static const String presignedUpload = '/attachments/presigned-upload-url';
  static const String confirmUpload = '/attachments/confirm-upload';

  // Notifications
  static const String notifications = '/notifications';
  static const String pushToken = '/notifications/push-token';
  static const String unreadCount = '/notifications/unread-count';

  // Masters
  static const String branches = '/branches';
}

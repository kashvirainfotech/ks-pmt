import 'dart:io';
import '../../core/network/api_client.dart';
import '../../core/constants/api_constants.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient apiClient;

  AuthRepository(this.apiClient);

  Future<UserModel> loginWithPassword(String email, String password) async {
    final response = await apiClient.dio.post(
      ApiConstants.loginPassword,
      data: {
        'email': email,
        'password': password,
        'devicePlatform': Platform.isAndroid ? 'ANDROID' : 'IOS',
      },
    );

    final data = response.data['data'] ?? response.data;
    final accessToken = data['accessToken'];
    final refreshToken = data['refreshToken'];

    await apiClient.storage.write(key: ApiClient.keyAccessToken, value: accessToken);
    await apiClient.storage.write(key: ApiClient.keyRefreshToken, value: refreshToken);

    final user = UserModel.fromJson({...data['user'], 'permissions': data['permissions'] ?? []});
    if (user.primaryBranchId.isNotEmpty) {
      await apiClient.storage.write(key: ApiClient.keyBranchId, value: user.primaryBranchId);
    }
    return user;
  }

  Future<void> requestOtp(String mobileNumber) async {
    await apiClient.dio.post(
      ApiConstants.requestOtp,
      data: {'mobileNumber': mobileNumber},
    );
  }

  Future<UserModel> loginWithOtp(String mobileNumber, String otpCode) async {
    final response = await apiClient.dio.post(
      ApiConstants.loginOtp,
      data: {
        'mobileNumber': mobileNumber,
        'otpCode': otpCode,
        'devicePlatform': Platform.isAndroid ? 'ANDROID' : 'IOS',
      },
    );

    final data = response.data['data'] ?? response.data;
    final accessToken = data['accessToken'];
    final refreshToken = data['refreshToken'];

    await apiClient.storage.write(key: ApiClient.keyAccessToken, value: accessToken);
    await apiClient.storage.write(key: ApiClient.keyRefreshToken, value: refreshToken);

    final user = UserModel.fromJson({...data['user'], 'permissions': data['permissions'] ?? []});
    if (user.primaryBranchId.isNotEmpty) {
      await apiClient.storage.write(key: ApiClient.keyBranchId, value: user.primaryBranchId);
    }
    return user;
  }

  Future<UserModel?> getMe() async {
    try {
      final response = await apiClient.dio.get(ApiConstants.getMe);
      final data = response.data['data'] ?? response.data;
      return UserModel.fromJson({...data['user'], 'permissions': data['permissions'] ?? []});
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    final refreshToken = await apiClient.storage.read(key: ApiClient.keyRefreshToken);
    if (refreshToken != null) {
      try {
        await apiClient.dio.post(
          ApiConstants.logout,
          data: {'refreshToken': refreshToken},
        );
      } catch (_) {}
    }
    await apiClient.storage.deleteAll();
  }
}

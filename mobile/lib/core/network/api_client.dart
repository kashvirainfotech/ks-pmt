import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/api_constants.dart';

class ApiClient {
  late final Dio dio;
  final FlutterSecureStorage storage = const FlutterSecureStorage();

  static const String keyAccessToken = 'ks_access_token';
  static const String keyRefreshToken = 'ks_refresh_token';
  static const String keyBranchId = 'ks_branch_id';

  ApiClient() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Device-Platform': Platform.isAndroid ? 'ANDROID' : 'IOS',
        },
      ),
    );

    dio.interceptors.add(
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) async {
          final accessToken = await storage.read(key: keyAccessToken);
          if (accessToken != null) {
            options.headers['Authorization'] = 'Bearer $accessToken';
          }

          final branchId = await storage.read(key: keyBranchId);
          if (branchId != null) {
            options.headers['X-Branch-ID'] = branchId;
          }

          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401 &&
              !error.requestOptions.path.contains('/auth/login') &&
              !error.requestOptions.path.contains('/auth/refresh-token')) {
            // Attempt silent token refresh
            final refreshToken = await storage.read(key: keyRefreshToken);
            if (refreshToken != null) {
              try {
                final refreshDio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
                final res = await refreshDio.post(
                  ApiConstants.refreshToken,
                  data: {'refreshToken': refreshToken},
                );

                final newAccessToken = res.data['data']?['accessToken'] ?? res.data['accessToken'];
                if (newAccessToken != null) {
                  await storage.write(key: keyAccessToken, value: newAccessToken);

                  // Retry the original failed request with new access token
                  error.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
                  final retryRes = await dio.fetch(error.requestOptions);
                  return handler.resolve(retryRes);
                }
              } catch (refreshErr) {
                // Refresh failed; clear session
                await storage.deleteAll();
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }
}

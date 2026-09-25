import 'package:flutter/material.dart';
import '../data/models/user_model.dart';
import '../data/repositories/auth_repository.dart';

class AuthProvider extends ChangeNotifier {
  final AuthRepository authRepository;

  UserModel? _user;
  bool _isLoading = true;
  String? _errorMessage;

  AuthProvider(this.authRepository) {
    checkAuth();
  }

  UserModel? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> checkAuth() async {
    _isLoading = true;
    notifyListeners();
    try {
      _user = await authRepository.getMe();
    } catch (_) {
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> loginWithPassword(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _user = await authRepository.loginWithPassword(email, password);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e: any) {
      _isLoading = false;
      _errorMessage = e.response?.data?['message'] ?? 'Authentication failed';
      notifyListeners();
      return false;
    }
  }

  Future<bool> requestOtp(String mobileNumber) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      await authRepository.requestOtp(mobileNumber);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e: any) {
      _isLoading = false;
      _errorMessage = e.response?.data?['message'] ?? 'Failed to send OTP';
      notifyListeners();
      return false;
    }
  }

  Future<bool> loginWithOtp(String mobileNumber, String otpCode) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _user = await authRepository.loginWithOtp(mobileNumber, otpCode);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e: any) {
      _isLoading = false;
      _errorMessage = e.response?.data?['message'] ?? 'Invalid OTP';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await authRepository.logout();
    _user = null;
    notifyListeners();
  }
}

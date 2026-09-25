import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../presentation/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Email / Password Form
  final _emailController = TextEditingController(text: 'admin@kashvirainfotech.com');
  final _passwordController = TextEditingController(text: 'Admin@123456');

  // Mobile / OTP Form
  final _mobileController = TextEditingController(text: '+919999900000');
  final _otpController = TextEditingController();
  bool _otpSent = false;
  int _countdown = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _mobileController.dispose();
    _otpController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    setState(() {
      _countdown = 60;
      _otpSent = true;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown <= 1) {
        timer.cancel();
        setState(() => _countdown = 0);
      } else {
        setState(() => _countdown--);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 30),
              // App Brand Header
              Row(
                children: [
                  Container(
                    height: 48,
                    width: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primaryBlue, AppTheme.accentIndigo],
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryBlue.withOpacity(0.3),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.layers_rounded, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'KS-PMT',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                      ),
                      Text(
                        'Kashvira Infotech',
                        style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 36),

              const Text(
                'Welcome Back',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, letterSpacing: -0.5),
              ),
              const SizedBox(height: 6),
              const Text(
                'Sign in with your enterprise credentials to access tasks and branch services.',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 24),

              // Tab Selector
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.slate100,
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(4),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: AppTheme.primaryBlue,
                  unselectedLabelColor: AppTheme.slate700,
                  labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  tabs: const [
                    Tab(text: 'Email & Password'),
                    Tab(text: 'Mobile & OTP'),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              if (auth.errorMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.dangerRose.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppTheme.dangerRose, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          auth.errorMessage!,
                          style: const TextStyle(fontSize: 12, color: AppTheme.dangerRose),
                        ),
                      ),
                    ],
                  ),
                ),

              // Tab Views
              SizedBox(
                height: 300,
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // Tab 1: Email & Password
                    Column(
                      children: [
                        TextField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: 'Corporate Email',
                            prefixIcon: Icon(Icons.email_outlined, size: 20),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _passwordController,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'Password',
                            prefixIcon: Icon(Icons.lock_outline, size: 20),
                          ),
                        ),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: auth.isLoading
                                ? null
                                : () => auth.loginWithPassword(
                                      _emailController.text.trim(),
                                      _passwordController.text,
                                    ),
                            child: auth.isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  )
                                : const Text('Sign In'),
                          ),
                        ),
                      ],
                    ),

                    // Tab 2: Mobile & OTP
                    Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _mobileController,
                                keyboardType: TextInputType.phone,
                                decoration: const InputDecoration(
                                  labelText: 'Mobile Number',
                                  prefixIcon: Icon(Icons.phone_outlined, size: 20),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              height: 52,
                              child: OutlinedButton(
                                onPressed: (_countdown > 0 || auth.isLoading)
                                    ? null
                                    : () async {
                                        final success = await auth.requestOtp(_mobileController.text.trim());
                                        if (success) _startCountdown();
                                      },
                                child: Text(_countdown > 0 ? '${_countdown}s' : _otpSent ? 'Resend' : 'Send OTP'),
                              ),
                            ),
                          ],
                        ),
                        if (_otpSent) ...[
                          const SizedBox(height: 16),
                          TextField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                            decoration: const InputDecoration(
                              labelText: '6-Digit OTP Code',
                              prefixIcon: Icon(Icons.pin_outlined, size: 20),
                              counterText: '',
                            ),
                          ),
                        ],
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: (auth.isLoading || !_otpSent)
                                ? null
                                : () => auth.loginWithOtp(
                                      _mobileController.text.trim(),
                                      _otpController.text.trim(),
                                    ),
                            child: auth.isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  )
                                : const Text('Verify & Sign In'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),
              const Center(
                child: Text(
                  'Accounts are provisioned by your system administrator.\nPublic registration is disabled.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

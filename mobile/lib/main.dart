import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/network/api_client.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/task_repository.dart';
import 'presentation/auth_provider.dart';
import 'presentation/task_provider.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/main_navigation_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final apiClient = ApiClient();
  final authRepository = AuthRepository(apiClient);
  final taskRepository = TaskRepository(apiClient);

  runApp(
    MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: apiClient),
        Provider<AuthRepository>.value(value: authRepository),
        Provider<TaskRepository>.value(value: taskRepository),
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(authRepository),
        ),
        ChangeNotifierProxyProvider<AuthProvider, TaskProvider>(
          create: (ctx) => TaskProvider(taskRepository),
          update: (ctx, auth, previous) {
            final provider = previous ?? TaskProvider(taskRepository);
            if (auth.isAuthenticated) {
              provider.loadInitialData();
            }
            return provider;
          },
        ),
      ],
      child: const KsPmtApp(),
    ),
  );
}

class KsPmtApp extends StatelessWidget {
  const KsPmtApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KS-PMT Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (auth.isLoading) {
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }
          if (auth.isAuthenticated) {
            return const MainNavigationScreen();
          }
          return const LoginScreen();
        },
      ),
    );
  }
}

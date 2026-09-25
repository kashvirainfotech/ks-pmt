import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth_provider.dart';
import '../../data/repositories/location_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final LocationService _locationService = LocationService();
  Position? _currentPosition;
  bool _locating = false;
  String? _locationStatus;

  Future<void> _checkInLocation() async {
    setState(() {
      _locating = true;
      _locationStatus = 'Acquiring high-accuracy GPS coordinates...';
    });

    final pos = await _locationService.getCurrentPosition();
    setState(() {
      _locating = false;
      _currentPosition = pos;
      if (pos != null) {
        _locationStatus = 'GPS Location verified: (${pos.latitude.toStringAsFixed(4)}, ${pos.longitude.toStringAsFixed(4)})';
      } else {
        _locationStatus = 'Could not access location. Please check device GPS permissions.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // User Avatar & Name
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppTheme.primaryBlue,
                    child: Text(
                      user?.firstName.isNotEmpty == true ? user!.firstName[0] : 'U',
                      style: const TextStyle(fontSize: 28, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.fullName ?? 'Employee',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    user?.email ?? '',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryBlue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      user?.roleName ?? 'Staff',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Branch Details Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.slate200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Employment Information', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildProfileRow('Employee Code', user?.employeeCode ?? '—'),
                  _buildProfileRow('Primary Branch', user?.branchName ?? 'Default HQ'),
                  _buildProfileRow('Department', user?.departmentName ?? 'Engineering'),
                  _buildProfileRow('Designation', user?.designationName ?? 'Software Engineer'),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // GPS Check-in & Geofence Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.slate200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text('GPS Geofencing Check-in', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      Icon(Icons.location_on_outlined, color: AppTheme.primaryBlue, size: 20),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Record geo-verified coordinates for attendance or field task completion.',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),

                  if (_locationStatus != null)
                    Container(
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: _currentPosition != null
                            ? AppTheme.successGreen.withOpacity(0.1)
                            : AppTheme.dangerRose.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _currentPosition != null ? Icons.check_circle_outline : Icons.error_outline,
                            size: 16,
                            color: _currentPosition != null ? AppTheme.successGreen : AppTheme.dangerRose,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _locationStatus!,
                              style: TextStyle(
                                fontSize: 11,
                                color: _currentPosition != null ? AppTheme.successGreen : AppTheme.dangerRose,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _locating ? null : _checkInLocation,
                      icon: _locating
                          ? const SizedBox(
                              height: 16,
                              width: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.my_location),
                      label: Text(_locating ? 'Locating GPS...' : 'Verify Current Location'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Sign Out Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => auth.logout(),
                icon: const Icon(Icons.logout),
                label: const Text('Sign Out'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.dangerRose,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

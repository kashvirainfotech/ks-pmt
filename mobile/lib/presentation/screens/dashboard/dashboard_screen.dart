import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth_provider.dart';
import '../../task_provider.dart';
import '../tasks/task_detail_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final taskProvider = context.watch<TaskProvider>();
    final user = auth.user;

    final urgentTasks = taskProvider.tasks.where((t) => t.priority == 'URGENT' || t.priority == 'HIGH').length;
    final billableAmount = taskProvider.tasks
        .where((t) => t.isChargeable && t.chargeAmount != null)
        .fold<double>(0.0, (sum, t) => sum + (t.chargeAmount ?? 0));

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Hello, ${user?.firstName ?? 'Team Member'} 👋'),
            Text(
              user?.branchName ?? 'Operational Branch',
              style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => taskProvider.loadInitialData(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => taskProvider.loadInitialData(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Bento Grid KPI Cards
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Active Tasks',
                      value: '${taskProvider.tasks.length}',
                      subtitle: 'In sprint',
                      icon: Icons.assignment_outlined,
                      iconColor: AppTheme.primaryBlue,
                      bgColor: AppTheme.primaryBlue.withOpacity(0.08),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      title: 'High / Urgent',
                      value: '$urgentTasks',
                      subtitle: 'Needs attention',
                      icon: Icons.warning_amber_rounded,
                      iconColor: AppTheme.dangerRose,
                      bgColor: AppTheme.dangerRose.withOpacity(0.08),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Billable Value',
                      value: '₹${billableAmount.toStringAsFixed(0)}',
                      subtitle: 'Chargeable tasks',
                      icon: Icons.currency_rupee_rounded,
                      iconColor: AppTheme.successGreen,
                      bgColor: AppTheme.successGreen.withOpacity(0.08),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Department',
                      value: user?.departmentName ?? 'Eng',
                      subtitle: user?.roleName ?? 'Staff',
                      icon: Icons.business_outlined,
                      iconColor: AppTheme.accentIndigo,
                      bgColor: AppTheme.accentIndigo.withOpacity(0.08),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Recent Tasks Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Assigned Tasks',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '${taskProvider.tasks.length} total',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              if (taskProvider.isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (taskProvider.tasks.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: const [
                        Icon(Icons.task_alt, size: 48, color: Colors.grey),
                        SizedBox(height: 8),
                        Text('No active tasks assigned yet', style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: taskProvider.tasks.take(6).length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final task = taskProvider.tasks[index];
                    return InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => TaskDetailScreen(taskId: task.id),
                          ),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(14),
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
                              children: [
                                Text(
                                  task.taskCode,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryBlue,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryBlue.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    task.statusName ?? 'Open',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: AppTheme.primaryBlue,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              task.title,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.checklist, size: 14, color: Colors.grey),
                                const SizedBox(width: 4),
                                Text(
                                  '${task.completedSubtasksCount}/${task.subtasksCount} subtasks',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                                const Spacer(),
                                Text(
                                  task.priority,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: task.priority == 'URGENT'
                                        ? AppTheme.dangerRose
                                        : task.priority == 'HIGH'
                                            ? AppTheme.warningAmber
                                            : Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
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
            children: [
              Text(title, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w500)),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, size: 16, color: iconColor),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ),
    );
  }
}

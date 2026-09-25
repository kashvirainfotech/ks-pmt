import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../task_provider.dart';
import 'task_detail_screen.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final taskProvider = context.watch<TaskProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks Workspace'),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              onChanged: (val) => taskProvider.searchTasks(val),
              decoration: InputDecoration(
                hintText: 'Search tasks by code or title...',
                hintStyle: const TextStyle(fontSize: 13, color: Colors.grey),
                prefixIcon: const Icon(Icons.search, size: 20),
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.slate200),
                ),
              ),
            ),
          ),

          // Horizontal Status Chips Filter
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                ChoiceChip(
                  label: const Text('All Tasks'),
                  selected: taskProvider.selectedStatusId == null,
                  onSelected: (_) => taskProvider.filterByStatus(null),
                  labelStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: taskProvider.selectedStatusId == null ? Colors.white : AppTheme.slate700,
                  ),
                  selectedColor: AppTheme.primaryBlue,
                ),
                const SizedBox(width: 8),
                ...taskProvider.statuses.map((status) {
                  final isSelected = taskProvider.selectedStatusId == status.id;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(status.statusName),
                      selected: isSelected,
                      onSelected: (_) => taskProvider.filterByStatus(status.id),
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? Colors.white : AppTheme.slate700,
                      ),
                      selectedColor: AppTheme.primaryBlue,
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Task List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => taskProvider.fetchTasks(),
              child: taskProvider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : taskProvider.tasks.isEmpty
                      ? const Center(
                          child: Text('No tasks match your filters', style: TextStyle(color: Colors.grey)),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: taskProvider.tasks.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
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
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.primaryBlue,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      task.title,
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                    ),
                                    if (task.projectName != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        '📁 ${task.projectName}',
                                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                                      ),
                                    ],
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        const Icon(Icons.checklist, size: 14, color: Colors.grey),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${task.completedSubtasksCount}/${task.subtasksCount} subtasks',
                                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                                        ),
                                        const SizedBox(width: 14),
                                        const Icon(Icons.schedule, size: 14, color: Colors.grey),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${task.spentHours ?? 0}/${task.estimatedHours ?? 0}h',
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
            ),
          ),
        ],
      ),
    );
  }
}

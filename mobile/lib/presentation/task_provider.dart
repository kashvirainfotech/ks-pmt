import 'package:flutter/material.dart';
import '../data/models/task_model.dart';
import '../data/repositories/task_repository.dart';

class TaskProvider extends ChangeNotifier {
  final TaskRepository taskRepository;

  List<TaskModel> _tasks = [];
  List<TaskWorkflowStatusModel> _statuses = [];
  bool _isLoading = false;
  String? _selectedStatusId;
  String _searchQuery = '';

  TaskProvider(this.taskRepository);

  List<TaskModel> get tasks => _tasks;
  List<TaskWorkflowStatusModel> get statuses => _statuses;
  bool get isLoading => _isLoading;
  String? get selectedStatusId => _selectedStatusId;

  Future<void> loadInitialData() async {
    _isLoading = true;
    notifyListeners();
    try {
      _statuses = await taskRepository.getWorkflowStatuses();
      await fetchTasks();
    } catch (_) {}
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchTasks() async {
    try {
      _tasks = await taskRepository.getTasks(
        statusId: _selectedStatusId,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
      );
      notifyListeners();
    } catch (_) {}
  }

  void filterByStatus(String? statusId) {
    _selectedStatusId = statusId;
    fetchTasks();
  }

  void searchTasks(String query) {
    _searchQuery = query;
    fetchTasks();
  }

  Future<bool> updateTaskStatus(String taskId, String toStatusId) async {
    try {
      await taskRepository.updateStatus(taskId, toStatusId);
      await fetchTasks();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> toggleSubtask(String subtaskId, bool isCompleted) async {
    try {
      await taskRepository.toggleSubtask(subtaskId, !isCompleted);
      await fetchTasks();
    } catch (_) {}
  }
}

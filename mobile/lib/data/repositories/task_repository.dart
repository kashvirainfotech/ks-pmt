import '../../core/network/api_client.dart';
import '../../core/constants/api_constants.dart';
import '../models/task_model.dart';

class TaskRepository {
  final ApiClient apiClient;

  TaskRepository(this.apiClient);

  Future<List<TaskModel>> getTasks({String? branchId, String? search, String? statusId}) async {
    final Map<String, dynamic> params = {'limit': 50};
    if (branchId != null) params['branchId'] = branchId;
    if (search != null) params['search'] = search;
    if (statusId != null) params['statusId'] = statusId;

    final response = await apiClient.dio.get(
      ApiConstants.tasks,
      queryParameters: params,
    );

    final payload = response.data['data'] ?? response.data;
    final list = payload is List ? payload : (payload['tasks'] ?? []);
    return (list as List).map((e) => TaskModel.fromJson(e)).toList();
  }

  Future<TaskModel> getTaskById(String taskId) async {
    final response = await apiClient.dio.get('${ApiConstants.tasks}/$taskId');
    final data = response.data['data'] ?? response.data;
    return TaskModel.fromJson(data);
  }

  Future<void> updateStatus(String taskId, String toStatusId, {String? remarks}) async {
    await apiClient.dio.patch(
      '${ApiConstants.tasks}/$taskId/status',
      data: {
        'toStatusId': toStatusId,
        if (remarks != null) 'remarks': remarks,
      },
    );
  }

  Future<List<SubTaskModel>> getSubtasks(String taskId) async {
    final response = await apiClient.dio.get('${ApiConstants.tasks}/$taskId/subtasks');
    final list = response.data['data'] ?? response.data ?? [];
    return (list as List).map((e) => SubTaskModel.fromJson(e)).toList();
  }

  Future<void> toggleSubtask(String subtaskId, bool isCompleted) async {
    await apiClient.dio.patch(
      '${ApiConstants.tasks}/subtasks/$subtaskId/toggle',
      data: {'isCompleted': isCompleted},
    );
  }

  Future<List<TaskWorkflowStatusModel>> getAllowedNextStatuses(String taskTypeId, String currentStatusId) async {
    final response = await apiClient.dio.get(
      '/task-workflows/allowed-next-statuses',
      queryParameters: {'taskTypeId': taskTypeId, 'fromStatusId': currentStatusId},
    );
    final list = response.data['data'] ?? response.data ?? [];
    return (list as List).map((e) => TaskWorkflowStatusModel.fromJson(e)).toList();
  }

  Future<List<TaskWorkflowStatusModel>> getWorkflowStatuses() async {
    final response = await apiClient.dio.get(ApiConstants.workflowStatuses);
    final list = response.data['data'] ?? response.data ?? [];
    return (list as List).map((e) => TaskWorkflowStatusModel.fromJson(e)).toList();
  }
}

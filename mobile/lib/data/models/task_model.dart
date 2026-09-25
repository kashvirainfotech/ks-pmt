class TaskModel {
  final String id;
  final String taskCode;
  final String title;
  final String? description;
  final String branchId;
  final String? branchName;
  final String? projectName;
  final String? productName;
  final String taskTypeId;
  final String? taskTypeName;
  final String? taskTypeColor;
  final String statusId;
  final String? statusCode;
  final String? statusName;
  final String? statusColor;
  final String priority;
  final double? estimatedHours;
  final double? spentHours;
  final bool isChargeable;
  final double? chargeAmount;
  final String? plannedDueDate;
  final int subtasksCount;
  final int completedSubtasksCount;

  TaskModel({
    required this.id,
    required this.taskCode,
    required this.title,
    this.description,
    required this.branchId,
    this.branchName,
    this.projectName,
    this.productName,
    required this.taskTypeId,
    this.taskTypeName,
    this.taskTypeColor,
    required this.statusId,
    this.statusCode,
    this.statusName,
    this.statusColor,
    required this.priority,
    this.estimatedHours,
    this.spentHours,
    this.isChargeable = false,
    this.chargeAmount,
    this.plannedDueDate,
    this.subtasksCount = 0,
    this.completedSubtasksCount = 0,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] ?? '',
      taskCode: json['task_code'] ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      branchId: json['branch_id'] ?? '',
      branchName: json['branch_name'],
      projectName: json['project_name'],
      productName: json['product_name'],
      taskTypeId: json['task_type_id'] ?? '',
      taskTypeName: json['task_type_name'],
      taskTypeColor: json['task_type_color'],
      statusId: json['status_id'] ?? '',
      statusCode: json['status_code'],
      statusName: json['status_name'] ?? 'Active',
      statusColor: json['status_color'] ?? '#3b82f6',
      priority: json['priority'] ?? 'MEDIUM',
      estimatedHours: json['estimated_hours'] != null
          ? double.tryParse(json['estimated_hours'].toString())
          : null,
      spentHours: json['spent_hours'] != null
          ? double.tryParse(json['spent_hours'].toString())
          : null,
      isChargeable: json['is_chargeable'] ?? false,
      chargeAmount: json['charge_amount'] != null
          ? double.tryParse(json['charge_amount'].toString())
          : null,
      plannedDueDate: json['planned_due_date'],
      subtasksCount: json['subtasks_count'] ?? 0,
      completedSubtasksCount: json['completed_subtasks_count'] ?? 0,
    );
  }
}

class SubTaskModel {
  final String id;
  final String taskId;
  final String title;
  final bool isCompleted;

  SubTaskModel({
    required this.id,
    required this.taskId,
    required this.title,
    required this.isCompleted,
  });

  factory SubTaskModel.fromJson(Map<String, dynamic> json) {
    return SubTaskModel(
      id: json['id'] ?? '',
      taskId: json['task_id'] ?? '',
      title: json['title'] ?? '',
      isCompleted: json['is_completed'] ?? false,
    );
  }
}

class TaskWorkflowStatusModel {
  final String id;
  final String statusCode;
  final String statusName;
  final String colorCode;
  final int stageOrder;
  final bool isInitial;
  final bool isCompleted;

  TaskWorkflowStatusModel({
    required this.id,
    required this.statusCode,
    required this.statusName,
    required this.colorCode,
    required this.stageOrder,
    this.isInitial = false,
    this.isCompleted = false,
  });

  factory TaskWorkflowStatusModel.fromJson(Map<String, dynamic> json) {
    return TaskWorkflowStatusModel(
      id: json['id'] ?? '',
      statusCode: json['status_code'] ?? '',
      statusName: json['status_name'] ?? '',
      colorCode: json['color_code'] ?? '#3b82f6',
      stageOrder: json['stage_order'] ?? 0,
      isInitial: json['is_initial'] ?? false,
      isCompleted: json['is_completed'] ?? false,
    );
  }
}

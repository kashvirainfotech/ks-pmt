class TimeLogModel {
  final String id;
  final String taskId;
  final String? taskTitle;
  final String logDate;
  final int durationMinutes;
  final String? description;
  final bool isBillable;

  TimeLogModel({
    required this.id,
    required this.taskId,
    this.taskTitle,
    required this.logDate,
    required this.durationMinutes,
    this.description,
    this.isBillable = false,
  });

  factory TimeLogModel.fromJson(Map<String, dynamic> json) {
    return TimeLogModel(
      id: json['id'] ?? '',
      taskId: json['task_id'] ?? '',
      taskTitle: json['task_title'],
      logDate: json['log_date'] ?? '',
      durationMinutes: double.tryParse(json['duration_minutes']?.toString() ?? '')?.round() ?? ((double.tryParse(json['hours_spent']?.toString() ?? '') ?? 0) * 60).round(),
      description: json['description'],
      isBillable: json['is_billable'] ?? false,
    );
  }
}

class NotificationModel {
  final String id;
  final String title;
  final String body;
  final String notificationType;
  final String? entityType;
  final String? entityId;
  final bool isRead;
  final String createdAt;

  NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.notificationType,
    this.entityType,
    this.entityId,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      notificationType: json['notification_type'] ?? 'GENERAL',
      entityType: json['entity_type'],
      entityId: json['entity_id'],
      isRead: json['is_read'] ?? false,
      createdAt: json['created_at'] ?? '',
    );
  }
}

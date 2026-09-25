class NotificationModel {
  final String id;
  final String title;
  final String body;
  final bool isRead;
  final String? entityType;
  final String? entityId;

  const NotificationModel({required this.id, required this.title, required this.body,
    required this.isRead, this.entityType, this.entityId});

  factory NotificationModel.fromJson(Map<String, dynamic> json) => NotificationModel(
    id: json['id'] as String,
    title: json['title'] as String? ?? '',
    body: json['body'] as String? ?? '',
    isRead: json['is_read'] == true,
    entityType: json['entity_type'] as String?,
    entityId: json['entity_id'] as String?,
  );
}

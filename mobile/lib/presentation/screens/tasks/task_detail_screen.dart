import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../data/models/task_model.dart';
import '../../data/repositories/task_repository.dart';
import '../../data/repositories/media_repository.dart';
import '../../task_provider.dart';

class TaskDetailScreen extends StatefulWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  TaskModel? _task;
  List<SubTaskModel> _subtasks = [];
  List<TaskWorkflowStatusModel> _allowedStatuses = [];
  bool _loading = true;

  // Live Timer
  bool _timerRunning = false;
  int _elapsedSeconds = 0;
  Timer? _timer;

  // S3 Upload
  bool _isUploading = false;
  double _uploadProgress = 0.0;

  @override
  void initState() {
    super.initState();
    _loadTaskDetails();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadTaskDetails() async {
    setState(() => _loading = true);
    final taskRepo = context.read<TaskRepository>();
    try {
      final task = await taskRepo.getTaskById(widget.taskId);
      final subtasks = await taskRepo.getSubtasks(widget.taskId);
      final allowed = await taskRepo.getAllowedNextStatuses(task.taskTypeId, task.statusId);
      setState(() {
        _task = task;
        _subtasks = subtasks;
        _allowedStatuses = allowed;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _toggleTimer() {
    setState(() {
      _timerRunning = !_timerRunning;
      if (_timerRunning) {
        _timer = Timer.periodic(const Duration(seconds: 1), (_) {
          setState(() => _elapsedSeconds++);
        });
      } else {
        _timer?.cancel();
      }
    });
  }

  String _formatTimer(int seconds) {
    final m = (seconds / 60).floor().toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _handleStatusTransition(String newStatusId) async {
    final taskRepo = context.read<TaskRepository>();
    final success = await taskRepo.updateStatus(widget.taskId, newStatusId);
    if (mounted) {
      context.read<TaskProvider>().fetchTasks();
      _loadTaskDetails();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Workflow status updated')),
      );
    }
  }

  Future<void> _pickAndUploadImage(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source, imageQuality: 85);
    if (pickedFile == null) return;

    final file = File(pickedFile.path);
    final mediaRepo = MediaRepository(context.read<ApiClient>());

    setState(() {
      _isUploading = true;
      _uploadProgress = 0.0;
    });

    try {
      await mediaRepo.uploadFileToS3(
        file: file,
        entityType: 'TASK',
        entityId: widget.taskId,
        onProgress: (sent, total) {
          if (total > 0) {
            setState(() => _uploadProgress = sent / total);
          }
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('File uploaded to AWS S3 successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to upload file to S3')),
        );
      }
    } finally {
      setState(() => _isUploading = false);
    }
  }

  void _showMediaBottomSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined, color: AppTheme.primaryBlue),
                title: const Text('Take Photo with Camera'),
                onTap: () {
                  Navigator.pop(context);
                  _pickAndUploadImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: AppTheme.accentIndigo),
                title: const Text('Choose from Photo Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _pickAndUploadImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _task == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Task Detail')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final task = _task!;

    return Scaffold(
      appBar: AppBar(
        title: Text(task.taskCode, style: const TextStyle(fontFamily: 'monospace')),
        actions: [
          IconButton(
            icon: const Icon(Icons.attach_file),
            onPressed: _showMediaBottomSheet,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Upload Progress Banner
            if (_isUploading)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Uploading to AWS S3...', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        Text('${(_uploadProgress * 100).toInt()}%', style: const TextStyle(fontSize: 11)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    LinearProgressIndicator(value: _uploadProgress, color: AppTheme.primaryBlue),
                  ],
                ),
              ),

            // Title & Badges
            Text(
              task.title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    task.statusName ?? 'Open',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.slate100,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    task.taskTypeName ?? 'Task',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.slate700),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  task.priority,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Dynamic Workflow State Transition Dropdown
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.slate200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Workflow Transition',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                  ),
                  const SizedBox(height: 4),
                  DropdownButton<String>(
                    isExpanded: true,
                    underline: const SizedBox(),
                    value: task.statusId,
                    items: [
                      DropdownMenuItem(
                        value: task.statusId,
                        child: Text('${task.statusName} (Current)'),
                      ),
                      ..._allowedStatuses.map(
                        (s) => DropdownMenuItem(
                          value: s.id,
                          child: Text('→ Move to: ${s.statusName}'),
                        ),
                      ),
                    ],
                    onChanged: (val) {
                      if (val != null && val != task.statusId) {
                        _handleStatusTransition(val);
                      }
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Live Time Tracker Widget
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryBlue.withOpacity(0.06),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Live Effort Tracker',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatTimer(_elapsedSeconds),
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: _toggleTimer,
                    icon: Icon(_timerRunning ? Icons.pause : Icons.play_arrow),
                    label: Text(_timerRunning ? 'Pause' : 'Start Timer'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _timerRunning ? AppTheme.warningAmber : AppTheme.primaryBlue,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Subtasks Checklist
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Subtasks Checklist',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                Text(
                  '${_subtasks.where((s) => s.isCompleted).length}/${_subtasks.length}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (_subtasks.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('No subtasks on this task', style: TextStyle(color: Colors.grey, fontSize: 13)),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _subtasks.length,
                itemBuilder: (context, index) {
                  final st = _subtasks[index];
                  return CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      st.title,
                      style: TextStyle(
                        fontSize: 13,
                        decoration: st.isCompleted ? TextDecoration.lineThrough : null,
                        color: st.isCompleted ? Colors.grey : AppTheme.slate800,
                      ),
                    ),
                    value: st.isCompleted,
                    onChanged: (_) async {
                      final taskRepo = context.read<TaskRepository>();
                      await taskRepo.toggleSubtask(st.id, !st.isCompleted);
                      _loadTaskDetails();
                    },
                  );
                },
              ),

            const SizedBox(height: 16),
            if (task.description != null && task.description!.isNotEmpty) ...[
              const Text('Description', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text(
                task.description!,
                style: const TextStyle(fontSize: 13, color: AppTheme.slate700, height: 1.4),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

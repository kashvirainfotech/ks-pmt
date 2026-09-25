import api from './client';
import {
  User,
  Branch,
  Department,
  Designation,
  Task,
  TaskType,
  TaskWorkflowStatus,
  SubTask,
  TimeLog,
  TaskComment,
  Attachment,
  Client,
  Product,
  Project,
  Version,
  NotificationItem,
  AuditLogItem,
  PaginatedResponse,
} from '../types';

// ==========================================
// Authentication APIs
// ==========================================
export const authApi = {
  loginPassword: (data: { email: string; password: string; devicePlatform?: string }) =>
    api.post('/auth/login-password', data),

  requestOtp: (data: { mobileNumber: string }) =>
    api.post('/auth/request-otp', data),

  loginOtp: (data: { mobileNumber: string; otpCode: string; devicePlatform?: string }) =>
    api.post('/auth/login-otp', data),

  getMe: (): Promise<{ data: User }> =>
    api.get('/auth/me'),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
};

// ==========================================
// Tasks & Workflow APIs
// ==========================================
export const tasksApi = {
  getTasks: (params?: any): Promise<{ data: PaginatedResponse<Task> }> =>
    api.get('/tasks', { params }),

  getTaskById: (id: string): Promise<{ data: Task }> =>
    api.get(`/tasks/${id}`),

  createTask: (data: any): Promise<{ data: Task }> =>
    api.post('/tasks', data),

  updateTask: (id: string, data: any): Promise<{ data: Task }> =>
    api.put(`/tasks/${id}`, data),

  updateStatus: (id: string, toStatusId: string, remarks?: string) =>
    api.patch(`/tasks/${id}/status`, { toStatusId, remarks }),

  updateAssignees: (id: string, assignees: Array<{ userId: string; isPrimary?: boolean }>) =>
    api.put(`/tasks/${id}/assignees`, { assignees }),

  updateChargeable: (id: string, isChargeable: boolean, chargeAmount?: number) =>
    api.patch(`/tasks/${id}/chargeable`, { isChargeable, chargeAmount }),

  getSubtasks: (taskId: string): Promise<{ data: SubTask[] }> =>
    api.get(`/tasks/${taskId}/subtasks`),

  createSubtask: (taskId: string, data: { title: string; assignedToUserId?: string; dueDate?: string }) =>
    api.post(`/tasks/${taskId}/subtasks`, data),

  toggleSubtask: (subtaskId: string, isCompleted: boolean) =>
    api.patch(`/tasks/subtasks/${subtaskId}/toggle`, { isCompleted }),
};

// ==========================================
// Time Logs APIs
// ==========================================
export const timeLogsApi = {
  getTimeLogs: (params?: any): Promise<{ data: PaginatedResponse<TimeLog> }> =>
    api.get('/time-logs', { params }),

  logTime: (data: {
    taskId: string;
    logDate: string;
    durationMinutes: number;
    description?: string;
    isBillable?: boolean;
  }) => api.post('/time-logs', data),

  getTaskEffortSummary: (taskId: string) =>
    api.get(`/time-logs/task/${taskId}/summary`),
};

// ==========================================
// Comments APIs
// ==========================================
export const commentsApi = {
  getComments: (taskId: string): Promise<{ data: TaskComment[] }> =>
    api.get(`/comments/task/${taskId}`),

  addComment: (data: { taskId: string; commentText: string; parentCommentId?: string }) =>
    api.post('/comments', data),
};

// ==========================================
// Attachments APIs (AWS S3)
// ==========================================
export const attachmentsApi = {
  getPresignedUploadUrl: (data: {
    entityType: 'TASK' | 'PROJECT' | 'COMMENT' | 'AVATAR';
    entityId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
  }) => api.post('/attachments/presigned-upload-url', data),

  confirmUpload: (data: {
    entityType: string;
    entityId: string;
    fileName: string;
    originalName: string;
    fileSizeBytes: number;
    mimeType: string;
    s3Key: string;
  }) => api.post('/attachments/confirm-upload', data),

  getEntityAttachments: (type: string, id: string): Promise<{ data: Attachment[] }> =>
    api.get(`/attachments/entity/${type}/${id}`),

  getDownloadUrl: (id: string): Promise<{ data: { downloadUrl: string } }> =>
    api.get(`/attachments/${id}/presigned-download-url`),
};

// ==========================================
// Masters APIs
// ==========================================
export const mastersApi = {
  getBranches: (): Promise<{ data: Branch[] }> =>
    api.get('/branches'),

  createBranch: (data: any) =>
    api.post('/branches', data),

  getDepartments: (branchId?: string): Promise<{ data: Department[] }> =>
    api.get('/departments', { params: { branchId } }),

  getDesignations: (): Promise<{ data: Designation[] }> =>
    api.get('/designations'),

  getUsers: (params?: any): Promise<{ data: PaginatedResponse<User> }> =>
    api.get('/users', { params }),

  createUser: (data: any): Promise<{ data: User }> =>
    api.post('/users', data),

  getTaskTypes: (): Promise<{ data: TaskType[] }> =>
    api.get('/task-types'),

  getWorkflowStatuses: (taskTypeId?: string): Promise<{ data: TaskWorkflowStatus[] }> =>
    api.get('/task-workflows/statuses', { params: { taskTypeId } }),

  getAllowedNextStatuses: (taskTypeId: string, currentStatusId: string): Promise<{ data: TaskWorkflowStatus[] }> =>
    api.get(`/task-workflows/next-statuses/${taskTypeId}/${currentStatusId}`),
};

// ==========================================
// Business Modules: Clients, Projects, Products
// ==========================================
export const projectsApi = {
  getClients: (): Promise<{ data: Client[] }> =>
    api.get('/clients'),

  createClient: (data: any): Promise<{ data: Client }> =>
    api.post('/clients', data),

  convertProspect: (id: string) =>
    api.patch(`/clients/${id}/convert`),

  getProducts: (): Promise<{ data: Product[] }> =>
    api.get('/products'),

  getProjects: (params?: any): Promise<{ data: Project[] }> =>
    api.get('/projects', { params }),

  createProject: (data: any): Promise<{ data: Project }> =>
    api.post('/projects', data),

  getVersions: (params?: { productId?: string; projectId?: string }): Promise<{ data: Version[] }> =>
    api.get('/versions', { params }),
};

// ==========================================
// Notifications & Audit APIs
// ==========================================
export const notificationsApi = {
  getNotifications: (params?: any): Promise<{ data: { notifications: NotificationItem[]; unreadCount: number } }> =>
    api.get('/notifications', { params }),

  getUnreadCount: (): Promise<{ data: { unreadCount: number } }> =>
    api.get('/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch('/notifications/read-all'),

  registerPushToken: (data: { deviceType: 'WEB' | 'ANDROID' | 'IOS'; fcmToken: string }) =>
    api.post('/notifications/push-token', data),
};

export const auditLogsApi = {
  getAuditLogs: (params?: any): Promise<{ data: { auditLogs: AuditLogItem[]; totalCount: number } }> =>
    api.get('/audit-logs', { params }),
};

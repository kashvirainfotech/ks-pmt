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
  WorkingCalendar,
  CalendarHoliday,
  EmployeeCalendarAssignment,
  EmployeeLeaveRecord,
  Sprint,
  Milestone,
  SprintTaskScopeLedger,
  TaskDependency,
  TaskDependencyMap,
  TaskBlockerEpisode,
  BlockerRadarData,
  SavedView,
  SavedViewPreset,
  BulkUpdateItem,
  BulkUpdateTasksResponse,
} from '../types';

// ==========================================
// Authentication APIs
// ==========================================
export const authApi = {
  loginPassword: (data: {
    email: string;
    password: string;
    devicePlatform?: string;
  }) => api.post('/auth/login-password', data),

  requestOtp: (data: { mobileNumber: string }) =>
    api.post('/auth/request-otp', data),

  loginOtp: (data: {
    mobileNumber: string;
    otpCode: string;
    devicePlatform?: string;
  }) => api.post('/auth/login-otp', data),

  getMe: (): Promise<{ data: User }> => api.get('/auth/me'),

  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

// ==========================================
// Tasks & Workflow APIs
// ==========================================
export const tasksApi = {
  getTasks: (params?: any): Promise<{ data: PaginatedResponse<Task> }> =>
    api.get('/tasks', { params }),

  getTaskById: (id: string): Promise<{ data: Task }> => api.get(`/tasks/${id}`),

  createTask: (data: any): Promise<{ data: Task }> => api.post('/tasks', data),

  updateTask: (id: string, data: any): Promise<{ data: Task }> =>
    api.put(`/tasks/${id}`, data),

  reorderTasks: (items: { taskId: string; backlogOrder: number }[]) =>
    api.patch('/tasks/reorder', { items }),

  patchTask: (id: string, data: any): Promise<{ data: Task }> => api.patch(`/tasks/${id}`, data),
  updateStatus: (
    id: string,
    toStatusId: string,
    remarks?: string,
    expectedRevision?: number,
    extra?: { resolution?: string; resolutionDetails?: string },
  ) =>
    api.patch(`/tasks/${id}/status`, {
      toStatusId,
      remarks,
      expectedRevision,
      ...extra,
    }),

  updateAssignees: (
    id: string,
    assignees: Array<{ userId: string; isPrimary?: boolean }>,
  ) =>
    api.put(`/tasks/${id}/assignees`, {
      assigneeIds: assignees.map((a) => a.userId),
      primaryAssigneeId: assignees.find((a) => a.isPrimary)?.userId,
    }),

  saveAssignees: (id: string, payload: any) =>
    api.put(`/tasks/${id}/assignees`, payload),

  updateChargeable: (
    id: string,
    isChargeable: boolean,
    chargeAmount?: number,
  ) => api.put(`/tasks/${id}`, { isChargeable, chargeAmount }),

  getSubtasks: (taskId: string): Promise<{ data: SubTask[] }> =>
    api.get(`/tasks/${taskId}/subtasks`),

  createSubtask: (
    taskId: string,
    data: { title: string; assignedToUserId?: string; dueDate?: string },
  ) => api.post(`/tasks/${taskId}/subtasks`, data),

  toggleSubtask: (subtaskId: string, isCompleted: boolean) =>
    api.patch(`/tasks/subtasks/${subtaskId}/toggle`, { isCompleted }),

  bulkUpdate: (data: {
    items: BulkUpdateItem[];
    remarks?: string;
  }): Promise<{ data: BulkUpdateTasksResponse }> =>
    api.post('/tasks/bulk-update', data),

  exportTasks: (params?: any, format: 'csv' | 'json' = 'csv') =>
    api.get('/tasks/export', { params: { ...params, format } }),
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
  }) =>
    api.post('/time-logs', {
      taskId: data.taskId,
      logDate: data.logDate,
      hoursSpent: data.durationMinutes / 60,
      description: data.description || 'Work logged',
      isBillable: data.isBillable,
    }),

  getTaskEffortSummary: (taskId: string) =>
    api.get(`/time-logs/task/${taskId}`),
};

// ==========================================
// Comments APIs
// ==========================================
export const commentsApi = {
  getComments: (taskId: string): Promise<{ data: TaskComment[] }> =>
    api.get(`/comments/task/${taskId}`),

  addComment: (data: {
    taskId: string;
    commentText: string;
    parentCommentId?: string;
  }) => api.post('/comments', data),
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

  confirmUpload: (data: { attachmentId: string }) =>
    api.post('/attachments/confirm-upload', data),

  getEntityAttachments: (
    type: string,
    id: string,
  ): Promise<{ data: Attachment[] }> =>
    api.get(`/attachments/entity/${type}/${id}`),

  getDownloadUrl: (id: string): Promise<{ data: { downloadUrl: string } }> =>
    api.get(`/attachments/${id}/presigned-download-url`),
};

// ==========================================
// Masters APIs
// ==========================================
export const mastersApi = {
  getBranches: (): Promise<{ data: Branch[] }> => api.get('/branches'),

  createBranch: (data: any) => api.post('/branches', data),

  getDepartments: (branchId?: string): Promise<{ data: Department[] }> =>
    api.get('/departments', { params: { branchId } }),

  getDesignations: (): Promise<{ data: Designation[] }> =>
    api.get('/designations'),

  getUsers: (params?: any): Promise<{ data: PaginatedResponse<User> }> =>
    api.get('/users', { params }),

  createUser: (data: any): Promise<{ data: User }> => api.post('/users', data),

  getTaskTypes: (): Promise<{ data: TaskType[] }> => api.get('/task-types'),

  getWorkflowStatuses: (
    taskTypeId?: string,
  ): Promise<{ data: TaskWorkflowStatus[] }> =>
    api.get('/task-workflows/statuses', { params: { taskTypeId } }),

  getAllowedNextStatuses: (
    taskTypeId: string,
    currentStatusId: string,
  ): Promise<{ data: TaskWorkflowStatus[] }> =>
    api.get('/task-workflows/allowed-next-statuses', {
      params: { taskTypeId, fromStatusId: currentStatusId },
    }),
};

// ==========================================
// Business Modules: Clients, Projects, Products
// ==========================================
export const projectsApi = {
  getClients: (): Promise<{ data: Client[] }> => api.get('/clients'),

  createClient: (data: any): Promise<{ data: Client }> =>
    api.post('/clients', data),

  convertProspect: (id: string) => api.post(`/clients/${id}/convert-to-active`),

  getProducts: (): Promise<{ data: Product[] }> => api.get('/products'),

  getProjects: (params?: any): Promise<{ data: Project[] }> =>
    api.get('/projects', { params }),

  createProject: (data: any): Promise<{ data: Project }> =>
    api.post('/projects', data),

  getVersions: (params?: {
    productId?: string;
    projectId?: string;
  }): Promise<{ data: Version[] }> => api.get('/versions', { params }),
};

// ==========================================
// Notifications & Audit APIs
// ==========================================
export const notificationsApi = {
  getNotifications: (
    params?: any,
  ): Promise<{
    data: { notifications: NotificationItem[]; unreadCount: number };
  }> => api.get('/notifications', { params }),

  getUnreadCount: (): Promise<{ data: { unreadCount: number } }> =>
    api.get('/notifications/unread-count'),

  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.patch('/notifications/read-all'),

  registerPushToken: (data: {
    deviceType: 'WEB' | 'ANDROID' | 'IOS';
    fcmToken: string;
  }) => api.post('/notifications/push-token', data),
};

export const auditLogsApi = {
  getAuditLogs: (
    params?: any,
  ): Promise<{ data: { auditLogs: AuditLogItem[]; totalCount: number } }> =>
    api.get('/audit-logs', { params }),
};

// ==========================================
// Working Calendars, Holidays & Leaves (FND-001)
// ==========================================
export const calendarsApi = {
  getCalendars: (params?: any): Promise<{ data: WorkingCalendar[]; meta?: any }> =>
    api.get('/calendars', { params }),

  getCalendarById: (id: string): Promise<{ data: WorkingCalendar & { holidays: CalendarHoliday[] } }> =>
    api.get(`/calendars/${id}`),

  createCalendar: (data: any): Promise<{ data: WorkingCalendar }> =>
    api.post('/calendars', data),

  updateCalendar: (id: string, data: any): Promise<{ data: WorkingCalendar }> =>
    api.put(`/calendars/${id}`, data),

  deleteCalendar: (id: string) =>
    api.delete(`/calendars/${id}`),

  getHolidays: (calendarId: string, year?: number): Promise<{ data: CalendarHoliday[] }> =>
    api.get(`/calendars/${calendarId}/holidays`, { params: { year } }),

  addHoliday: (data: {
    calendarId: string;
    holidayName: string;
    holidayDate: string;
    isRecurring?: boolean;
    description?: string;
  }): Promise<{ data: CalendarHoliday }> =>
    api.post('/calendars/holidays', data),

  deleteHoliday: (holidayId: string) =>
    api.delete(`/calendars/holidays/${holidayId}`),

  assignCalendar: (data: any): Promise<{ data: EmployeeCalendarAssignment }> =>
    api.post('/calendars/assignments', data),

  getUserAssignments: (userId: string): Promise<{ data: EmployeeCalendarAssignment[] }> =>
    api.get(`/calendars/assignments/user/${userId}`),

  getEffectiveSchedule: (userId: string, date: string) =>
    api.get('/calendars/effective-schedule', { params: { userId, date } }),

  checkCapacity: (userId: string, startDate: string, endDate: string) =>
    api.get('/calendars/capacity-check', { params: { userId, startDate, endDate } }),

  getLeaves: (params?: any): Promise<{ data: EmployeeLeaveRecord[]; meta?: any }> =>
    api.get('/calendars/leaves', { params }),

  createLeave: (data: any): Promise<{ data: EmployeeLeaveRecord }> =>
    api.post('/calendars/leaves', data),

  reviewLeave: (id: string, data: { status: string; remarks?: string }) =>
    api.patch(`/calendars/leaves/${id}/review`, data),
};

// ==========================================
// Agile Sprints & Planning (PLAN-001)
// ==========================================
export const sprintsApi = {
  getSprints: (params?: any): Promise<{ data: Sprint[]; meta?: any }> =>
    api.get('/sprints', { params }),

  getSprintById: (id: string): Promise<{ data: Sprint }> =>
    api.get(`/sprints/${id}`),

  createSprint: (data: any): Promise<{ data: Sprint }> =>
    api.post('/sprints', data),

  updateSprint: (id: string, data: any): Promise<{ data: Sprint }> =>
    api.put(`/sprints/${id}`, data),

  startSprint: (id: string) =>
    api.post(`/sprints/${id}/start`, {}),

  closeSprint: (id: string, data?: { targetSprintId?: string; rolloverReason?: string }) =>
    api.post(`/sprints/${id}/close`, data || {}),

  addTasks: (id: string, data: { taskIds: string[]; scopeChangeReason?: string }) =>
    api.post(`/sprints/${id}/tasks`, data),

  removeTask: (id: string, taskId: string, data?: { scopeChangeReason?: string }) =>
    api.delete(`/sprints/${id}/tasks/${taskId}`, { data }),

  getScopeLedger: (id: string): Promise<{ data: SprintTaskScopeLedger[] }> =>
    api.get(`/sprints/${id}/scope-ledger`),

  calculateCapacity: (id: string) =>
    api.get(`/sprints/${id}/capacity`),
};

// ==========================================
// Milestones (PLAN-001)
// ==========================================
export const milestonesApi = {
  getMilestones: (params?: any): Promise<{ data: Milestone[]; meta?: any }> =>
    api.get('/milestones', { params }),

  getMilestoneById: (id: string): Promise<{ data: Milestone }> =>
    api.get(`/milestones/${id}`),

  createMilestone: (data: any): Promise<{ data: Milestone }> =>
    api.post('/milestones', data),

  updateMilestone: (id: string, data: any): Promise<{ data: Milestone }> =>
    api.put(`/milestones/${id}`, data),

  deleteMilestone: (id: string) =>
    api.delete(`/milestones/${id}`),
};

// ==========================================
// Dependencies & Relationships (PLAN-002)
// ==========================================
export const dependenciesApi = {
  create: (data: {
    sourceTaskId: string;
    targetTaskId: string;
    linkType: string;
    description?: string;
  }): Promise<{ data: TaskDependency }> => api.post('/dependencies', data),

  getDependencies: (params?: any): Promise<{ data: TaskDependency[] }> =>
    api.get('/dependencies', { params }),

  getByTaskId: (
    taskId: string,
  ): Promise<{
    data: {
      taskId: string;
      outgoing: TaskDependency[];
      incoming: TaskDependency[];
      totalCount: number;
    };
  }> => api.get(`/dependencies/task/${taskId}`),

  getDependencyMap: (taskId: string): Promise<{ data: TaskDependencyMap }> =>
    api.get(`/dependencies/map/${taskId}`),

  remove: (id: string) => api.delete(`/dependencies/${id}`),
};

// ==========================================
// Blocker Episodes & Radar (PLAN-002)
// ==========================================
export const blockersApi = {
  create: (data: {
    taskId: string;
    ownerUserId?: string;
    blockingTaskId?: string;
    reason: string;
    nextAction?: string;
    followUpDate?: string;
    expectedResolutionDate?: string;
    category?: string;
    priority?: string;
    notes?: string;
  }): Promise<{ data: TaskBlockerEpisode }> => api.post('/blockers', data),

  getRadar: (params?: any): Promise<{ data: BlockerRadarData }> =>
    api.get('/blockers/radar', { params }),

  getByTaskId: (
    taskId: string,
  ): Promise<{
    data: {
      taskId: string;
      totalEpisodesCount: number;
      activeEpisodesCount: number;
      isCurrentlyBlocked: boolean;
      totalNonOverlappingBlockedMinutes: number;
      episodes: TaskBlockerEpisode[];
    };
  }> => api.get(`/blockers/task/${taskId}`),

  resolve: (
    id: string,
    data: { status?: 'RESOLVED' | 'DISMISSED'; resolutionNotes?: string },
  ): Promise<{ data: TaskBlockerEpisode }> =>
    api.patch(`/blockers/${id}/resolve`, data),

  update: (id: string, data: any): Promise<{ data: TaskBlockerEpisode }> =>
    api.patch(`/blockers/${id}`, data),

  delete: (id: string) => api.delete(`/blockers/${id}`),
};

// ==========================================
// Saved Views & Attention Workspaces (PLAN-003)
// ==========================================
export const savedViewsApi = {
  create: (data: Partial<SavedView>): Promise<{ data: SavedView }> =>
    api.post('/saved-views', data),

  getPresets: (): Promise<{ data: SavedViewPreset[] }> =>
    api.get('/saved-views/presets'),

  getAll: (params?: any): Promise<{ data: SavedView[] }> =>
    api.get('/saved-views', { params }),

  getById: (id: string): Promise<{ data: SavedView }> =>
    api.get(`/saved-views/${id}`),

  update: (id: string, data: Partial<SavedView>): Promise<{ data: SavedView }> =>
    api.put(`/saved-views/${id}`, data),

  toggleFavorite: (id: string): Promise<{ data: SavedView }> =>
    api.patch(`/saved-views/${id}/favorite`),

  delete: (id: string) => api.delete(`/saved-views/${id}`),
};




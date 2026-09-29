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
  WeeklyTimesheet,
  WeeklyTimesheetResponse,
  TimesheetProjectPortion,
  ActiveTimer,
  DeliveryTeam,
  TeamMember,
  SoftwareComponent,
  ComponentDependency,
  ComponentDashboardResponse,
  ComponentArchitectureMapResponse,
  TaskHandoff,
  HandoffAnalyticsResponse,
  WorkflowScheme,
  WorkflowSchemeTransition,
  WorkflowValidationResult,
  ClientContact,
  ClientIntakeRequest,
  ImpactSummaryStats,
  RequirementSpecification,
  RequirementBaseline,
  RequirementAcceptanceCriterion,
  TraceabilityMatrixResponse,
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
export const clientsApi = {
  getAll: (params?: any): Promise<{ data: Client[] }> => api.get('/clients', { params }),
  getById: (id: string): Promise<{ data: Client }> => api.get(`/clients/${id}`),
  create: (data: any): Promise<{ data: Client }> => api.post('/clients', data),
  update: (id: string, data: any): Promise<{ data: Client }> => api.put(`/clients/${id}`, data),
  convertToActive: (id: string) => api.post(`/clients/${id}/convert-to-active`),
};

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

export const productsApi = {
  getProducts: (): Promise<{ data: Product[] }> => api.get('/products'),
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

// ==========================================
// Timesheets & Global Persistent Timer (TIME-001)
// ==========================================
export const timesheetsApi = {
  getWeekly: (params?: { startDate?: string; userId?: string }): Promise<{ data: WeeklyTimesheetResponse }> =>
    api.get('/timesheets/weekly', { params }),

  submitTimesheet: (id: string, data?: { remarks?: string }): Promise<{ data: WeeklyTimesheet }> =>
    api.post(`/timesheets/${id}/submit`, data),

  reviewPortion: (portionId: string, data: { status: 'APPROVED' | 'REJECTED'; remarks?: string }): Promise<{ data: any }> =>
    api.post(`/timesheets/portions/${portionId}/review`, data),

  reopenTimesheet: (id: string, data?: { reason?: string }): Promise<{ data: WeeklyTimesheet }> =>
    api.post(`/timesheets/${id}/reopen`, data),

  getActiveTimer: (): Promise<{ data: { timer: ActiveTimer | null } }> =>
    api.get('/timesheets/timer/active'),

  startTimer: (data: { taskId: string; isBillable?: boolean; notes?: string }): Promise<{ data: ActiveTimer }> =>
    api.post('/timesheets/timer/start', data),

  pauseTimer: (): Promise<{ data: ActiveTimer }> =>
    api.post('/timesheets/timer/pause'),

  resumeTimer: (): Promise<{ data: ActiveTimer }> =>
    api.post('/timesheets/timer/resume'),

  stopTimer: (data?: { description?: string; isBillable?: boolean }): Promise<{ data: { message: string; log: any } }> =>
    api.post('/timesheets/timer/stop', data),

  discardTimer: (): Promise<{ data: { message: string } }> =>
    api.delete('/timesheets/timer'),
};

// ==========================================
// Delivery Teams & Software Components (PLAN-004)
// ==========================================
export const teamsApi = {
  getAll: (params?: { projectId?: string; productId?: string }): Promise<{ data: DeliveryTeam[] }> =>
    api.get('/teams', { params }),

  getById: (id: string): Promise<{ data: DeliveryTeam & { members: TeamMember[]; projects: any[]; products: any[]; components: any[] } }> =>
    api.get(`/teams/${id}`),

  create: (data: any): Promise<{ data: DeliveryTeam }> =>
    api.post('/teams', data),

  update: (id: string, data: any): Promise<{ data: DeliveryTeam }> =>
    api.put(`/teams/${id}`, data),

  delete: (id: string) =>
    api.delete(`/teams/${id}`),

  addMember: (teamId: string, data: any): Promise<{ data: TeamMember }> =>
    api.post(`/teams/${teamId}/members`, data),

  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
};

export const componentsApi = {
  getAll: (params?: { entityType?: string; projectId?: string; productId?: string; ownerTeamId?: string; criticality?: string }): Promise<{ data: SoftwareComponent[] }> =>
    api.get('/components', { params }),

  getById: (id: string): Promise<{ data: SoftwareComponent }> =>
    api.get(`/components/${id}`),

  create: (data: any): Promise<{ data: SoftwareComponent }> =>
    api.post('/components', data),

  update: (id: string, data: any): Promise<{ data: SoftwareComponent }> =>
    api.put(`/components/${id}`, data),

  delete: (id: string) =>
    api.delete(`/components/${id}`),

  getDashboard: (id: string): Promise<{ data: ComponentDashboardResponse }> =>
    api.get(`/components/${id}/dashboard`),

  getArchitectureMap: (entityType: string, entityId: string): Promise<{ data: ComponentArchitectureMapResponse }> =>
    api.get('/components/architecture-map', { params: { entityType, entityId } }),

  addDependency: (componentId: string, data: any): Promise<{ data: ComponentDependency }> =>
    api.post(`/components/${componentId}/dependencies`, data),

  removeDependency: (depId: string) =>
    api.delete(`/components/dependencies/${depId}`),

  getTaskComponents: (taskId: string): Promise<{ data: SoftwareComponent[] }> =>
    api.get(`/components/task/${taskId}`),

  linkTaskComponents: (taskId: string, data: { componentIds: string[]; primaryComponentId?: string }): Promise<{ data: any[] }> =>
    api.put(`/components/task/${taskId}`, data),
};

// ==========================================
// FLOW-001: Task Handoffs APIs
// ==========================================
export const handoffsApi = {
  getWaitingForMe: (): Promise<{ data: TaskHandoff[] }> =>
    api.get('/handoffs/waiting-for-me'),

  getWaitingForOthers: (): Promise<{ data: TaskHandoff[] }> =>
    api.get('/handoffs/waiting-for-others'),

  getAnalytics: (teamId?: string): Promise<{ data: HandoffAnalyticsResponse }> =>
    api.get('/handoffs/analytics', { params: { teamId } }),

  getTaskHistory: (taskId: string): Promise<{ data: TaskHandoff[] }> =>
    api.get(`/handoffs/tasks/${taskId}`),

  getById: (id: string): Promise<{ data: TaskHandoff }> =>
    api.get(`/handoffs/${id}`),

  create: (data: {
    taskId: string;
    fromTeamId?: string;
    toTeamId?: string;
    toUserId?: string;
    handoffType?: string;
    requiredContext?: string;
    notes?: string;
  }): Promise<{ data: TaskHandoff }> => api.post('/handoffs', data),

  acknowledge: (id: string, data?: { notes?: string }): Promise<{ data: TaskHandoff }> =>
    api.post(`/handoffs/${id}/acknowledge`, data || {}),

  startWork: (id: string, data?: { notes?: string }): Promise<{ data: TaskHandoff }> =>
    api.post(`/handoffs/${id}/start-work`, data || {}),

  returnForRework: (
    id: string,
    data: { reason: string; notes?: string },
  ): Promise<{ data: { returnedHandoff: TaskHandoff; successorHandoff: TaskHandoff } }> =>
    api.post(`/handoffs/${id}/return`, data),

  redirect: (
    id: string,
    data: { toTeamId?: string; toUserId?: string; reason?: string; notes?: string },
  ): Promise<{ data: { redirectedHandoff: TaskHandoff; successorHandoff: TaskHandoff } }> =>
    api.post(`/handoffs/${id}/redirect`, data),

  complete: (id: string, data?: { notes?: string }): Promise<{ data: TaskHandoff }> =>
    api.post(`/handoffs/${id}/complete`, data || {}),
};

// ==========================================
// CONFIG-001: Workflow Schemes & Gate Overrides APIs
// ==========================================
export const workflowSchemesApi = {
  getSchemes: (params?: {
    scope?: string;
    projectId?: string;
    productId?: string;
    status?: string;
  }): Promise<{ data: WorkflowScheme[] }> =>
    api.get('/task-workflows/schemes', { params }),

  getSchemeById: (id: string): Promise<{ data: WorkflowScheme }> =>
    api.get(`/task-workflows/schemes/${id}`),

  createScheme: (data: {
    schemeCode: string;
    schemeName: string;
    description?: string;
    scope: string;
    projectId?: string;
    productId?: string;
    taskTypeId?: string;
  }): Promise<{ data: WorkflowScheme }> =>
    api.post('/task-workflows/schemes', data),

  updateScheme: (
    id: string,
    data: { schemeName?: string; description?: string },
  ): Promise<{ data: WorkflowScheme }> =>
    api.put(`/task-workflows/schemes/${id}`, data),

  configureTransitions: (
    id: string,
    data: {
      transitions: Array<{
        fromStatusId: string;
        toStatusId: string;
        allowedRoles?: string[];
        requiredFields?: string[];
        requiresReleaseAssociation?: boolean;
        requiresQaSignoff?: boolean;
        requiresResolution?: boolean;
        manualGateName?: string;
        transitionNotesPrompt?: string;
      }>;
    },
  ): Promise<{ data: WorkflowScheme }> =>
    api.post(`/task-workflows/schemes/${id}/transitions`, data),

  validateDraft: (id: string): Promise<{ data: WorkflowValidationResult }> =>
    api.get(`/task-workflows/schemes/${id}/validate`),

  publishScheme: (
    id: string,
    data: { activeTaskRemapping?: Record<string, string> },
  ): Promise<{ data: WorkflowScheme }> =>
    api.post(`/task-workflows/schemes/${id}/publish`, data),

  cloneScheme: (
    id: string,
    data: {
      targetScope: string;
      targetProjectId?: string;
      targetProductId?: string;
      newSchemeCode: string;
      newSchemeName: string;
    },
  ): Promise<{ data: WorkflowScheme }> =>
    api.post(`/task-workflows/schemes/${id}/clone`, data),

  getEffectiveWorkflow: (params: {
    taskTypeId: string;
    projectId?: string;
    productId?: string;
  }): Promise<{
    data: {
      scheme: WorkflowScheme | null;
      effectiveSource: 'PROJECT_OVERRIDE' | 'PRODUCT_OVERRIDE' | 'GLOBAL_DEFAULT' | 'GLOBAL_SYSTEM_FALLBACK';
    };
  }> => api.get('/task-workflows/effective', { params }),

  getAllowedNextStatuses: (params: {
    taskTypeId: string;
    fromStatusId: string;
    projectId?: string;
    productId?: string;
  }): Promise<{ data: any[] }> =>
    api.get('/task-workflows/allowed-next-statuses', { params }),
};

// ==========================================
// Customer Portal & Client Intake (CLIENT-001 & CLIENT-002)
// ==========================================
export const clientPortalApi = {
  acceptInvite: (data: { invitationToken: string; password: string; phone?: string }) =>
    api.post('/client-portal/auth/accept-invite', data),

  login: (data: { email: string; password: string }) =>
    api.post('/client-portal/auth/login', data),

  getMe: () => api.get('/client-portal/auth/me'),

  getPortalContext: () => api.get('/client-portal/context'),

  createRequest: (data: any): Promise<{ data: any; message: string; request: ClientIntakeRequest }> =>
    api.post('/client-portal/requests', data),

  getClientRequests: (params?: any): Promise<{ data: ClientIntakeRequest[]; meta: any }> =>
    api.get('/client-portal/requests', { params }),

  getClientRequestById: (id: string): Promise<{ data: ClientIntakeRequest }> =>
    api.get(`/client-portal/requests/${id}`),

  addClientMessage: (id: string, data: { message: string; attachments?: any[] }) =>
    api.post(`/client-portal/requests/${id}/messages`, data),

  getContacts: (params?: { clientId?: string; status?: string; search?: string }): Promise<{ data: ClientContact[] }> =>
    api.get('/client-portal/contacts', { params }),

  getContactById: (id: string): Promise<{ data: ClientContact }> =>
    api.get(`/client-portal/contacts/${id}`),

  inviteContact: (data: any): Promise<{ data: { contact: ClientContact; invitationToken: string; invitationLink: string } }> =>
    api.post('/client-portal/contacts/invite', data),

  updateContact: (id: string, data: any): Promise<{ data: ClientContact }> =>
    api.put(`/client-portal/contacts/${id}`, data),

  revokeContact: (id: string) =>
    api.post(`/client-portal/contacts/${id}/revoke`),

  resendInvite: (id: string) =>
    api.post(`/client-portal/contacts/${id}/resend-invite`),

  updateProjectGrants: (contactId: string, data: { grants: any[] }): Promise<{ data: ClientContact }> =>
    api.post(`/client-portal/contacts/${contactId}/projects`, data),

  getRequirements: (params?: { projectId?: string }): Promise<{ data: any[] }> =>
    api.get('/client-portal/requirements', { params }),

  getRequirementDetail: (id: string): Promise<{ data: any }> =>
    api.get(`/client-portal/requirements/${id}`),

  signoffCriterion: (criterionId: string, data: { signoffStatus: 'ACCEPTED' | 'REJECTED' | 'WAIVED'; notes?: string }) =>
    api.post(`/client-portal/requirements/criteria/${criterionId}/sign-off`, data),
};

export const clientIntakeApi = {
  getRequests: (params?: any): Promise<{ data: ClientIntakeRequest[]; meta: any }> =>
    api.get('/client-intake/requests', { params }),

  getRequestById: (id: string): Promise<{ data: ClientIntakeRequest }> =>
    api.get(`/client-intake/requests/${id}`),

  triageRequest: (id: string, data: any): Promise<{ data: ClientIntakeRequest }> =>
    api.patch(`/client-intake/requests/${id}/triage`, data),

  linkTask: (id: string, taskId: string): Promise<{ message: string; request: ClientIntakeRequest }> =>
    api.post(`/client-intake/requests/${id}/link-task`, { taskId }),

  createTaskFromRequest: (id: string, data: { projectId: string; taskTypeId?: string; title?: string; priority?: string }): Promise<{ message: string; task: any }> =>
    api.post(`/client-intake/requests/${id}/convert-to-task`, data),

  addMessage: (id: string, data: { message: string; isInternalOnly?: boolean; attachments?: any[] }) =>
    api.post(`/client-intake/requests/${id}/messages`, data),

  getImpactSummary: (): Promise<{ data: ImpactSummaryStats }> =>
    api.get('/client-intake/analytics/impact-summary'),
};

// ==========================================
// Requirements & Acceptance Traceability (CLIENT-003)
// ==========================================
export const requirementsApi = {
  create: (data: any): Promise<{ data: RequirementSpecification }> =>
    api.post('/requirements', data),

  getRequirements: (params?: any): Promise<{ data: RequirementSpecification[] }> =>
    api.get('/requirements', { params }),

  getById: (id: string): Promise<{ data: RequirementSpecification }> =>
    api.get(`/requirements/${id}`),

  update: (id: string, data: any): Promise<{ data: RequirementSpecification }> =>
    api.patch(`/requirements/${id}`, data),

  baseline: (id: string, data: { baselineName: string; notes?: string }): Promise<{ data: RequirementBaseline }> =>
    api.post(`/requirements/${id}/baseline`, data),

  proposeAmendment: (id: string): Promise<{ data: RequirementSpecification }> =>
    api.post(`/requirements/${id}/propose-amendment`),

  addCriterion: (id: string, data: any): Promise<{ data: RequirementAcceptanceCriterion }> =>
    api.post(`/requirements/${id}/criteria`, data),

  updateCriterion: (criterionId: string, data: any): Promise<{ data: RequirementAcceptanceCriterion }> =>
    api.patch(`/requirements/criteria/${criterionId}`, data),

  deleteCriterion: (criterionId: string) =>
    api.delete(`/requirements/criteria/${criterionId}`),

  linkTasks: (criterionId: string, data: { taskIds: string[]; notes?: string }) =>
    api.post(`/requirements/criteria/${criterionId}/tasks`, data),

  unlinkTask: (criterionId: string, taskId: string) =>
    api.delete(`/requirements/criteria/${criterionId}/tasks/${taskId}`),

  recordQaVerification: (criterionId: string, data: any): Promise<{ data: RequirementAcceptanceCriterion }> =>
    api.post(`/requirements/criteria/${criterionId}/qa-verify`, data),

  getTraceabilityMatrix: (params?: { projectId?: string; productId?: string }): Promise<{ data: TraceabilityMatrixResponse }> =>
    api.get('/requirements/traceability/matrix', { params }),
};








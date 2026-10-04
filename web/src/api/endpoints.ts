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
  UserNotificationSettings,
  WorkItemWatcher,
  NotificationQueueItem,
  DigestPreviewResponse,
  ChangeActivityBaseline,
  UserActivitySavedQuery,
  WhatChangedSummaryResponse,
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
  ChangeRequest,
  ChangeRequestRevision,
  UatPackage,
  UatPackageRevision,
  UatChecklistItem,
  ClientInstalledVersion,
  ClientProgressReport,
  ClientProgressReportRevision,
  RaidItem,
  ClientActionRequest,
  ProductIdea,
  ClientProductIdea,
  RoadmapBoard,
  TestSuite,
  TestCase,
  TestRun,
  TestRunItem,
  ReleaseReadinessChecklist,
  ReleaseChecklistItem,
  TraceabilityItem,
  TraceabilitySummary,
  KnowledgeDocument,
  KnowledgeDocumentRevision,
  KnowledgeDocumentLink,
  KnowledgeDocumentAttachment,
  ProjectTemplate,
  TaskTemplate,
  RecurringWorkRule,
  RecurringTaskOccurrence,
  ProductGoal,
  ProductOutcomeReview,
  ProductGoalsSummary,
  QaEnvironment,
  IssueEnvironmentObservation,
  TaskEnvironmentMatrixResponse,
  CommercialContract,
  ContractPeriod,
  ContractWorklogConsumption,
  ContractOverageRequest,
  ClientStatementResponse,
  ImportEntityType,
  ImportMode,
  DataImportBatch,
  DataImportPreviewResponse,
  DataExportQuery,
  SlaPolicy,
  SlaTrackingCycle,
  RiskAlert,
  SlaDashboardResponse,
  WipLimit,
  WipOverrideException,
  WipBoardResponse,
  OperationalAgingResponse,
  FlowTimePartitionResponse,
  CycleTimeMetricsResponse,
  CfdDataPoint,
  DwellTimeResponse,
  FlowAgingConfig,
  Skill,
  UserSkill,
  TaskRequiredSkill,
  CapacityReservation,
  CapacityWorkloadResponse,
  SkillSuggestionsResponse,
  TeamEstimationMetricsResponse,
  ProjectFinancialOverview,
  ProjectFinancialBaseline,
  ProjectFinancialRateCard,
  ProjectFinancialPeriodicMetric,
  CurrencyExchangeRate,
  CPMAnalysisResult,
  ScheduleScenario,
  ProjectHealthEvaluation,
  ProjectHealthConfig,
  WebhookSubscription,
  WebhookDelivery,
  CompanySettings,
  ConfigurationPackage,
  ConfigurationAuditLog,
  PackageDiffResult,
  DraftSuggestion,
  DraftRuleConfig,
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

  // COLLAB-003: Preferences & Quiet Hours
  getSettings: (): Promise<{ data: UserNotificationSettings }> =>
    api.get('/notifications/settings'),

  updateSettings: (data: Partial<UserNotificationSettings>): Promise<{ data: UserNotificationSettings }> =>
    api.put('/notifications/settings', data),

  // COLLAB-003: Work Item Watchers
  watch: (data: {
    entityType: string;
    entityId: string;
    clientContactId?: string;
    notifyOnStatusChange?: boolean;
    notifyOnComments?: boolean;
    notifyOnAttachments?: boolean;
    notifyOnApprovals?: boolean;
  }): Promise<{ data: WorkItemWatcher }> =>
    api.post('/notifications/watchers/watch', data),

  unwatch: (data: {
    entityType: string;
    entityId: string;
    clientContactId?: string;
  }): Promise<{ data: { success: boolean; removed: boolean } }> =>
    api.post('/notifications/watchers/unwatch', data),

  getEntityWatchers: (entityType: string, entityId: string): Promise<{ data: WorkItemWatcher[] }> =>
    api.get(`/notifications/watchers/entity/${entityType}/${entityId}`),

  getMyWatchedItems: (): Promise<{ data: WorkItemWatcher[] }> =>
    api.get('/notifications/watchers/my'),

  // COLLAB-003: Delivery Queue & Digest Dispatch
  enqueue: (data: Partial<NotificationQueueItem>): Promise<{ data: { item: NotificationQueueItem; isDuplicate: boolean } }> =>
    api.post('/notifications/queue/enqueue', data),

  dispatchQueue: (): Promise<{ data: { totalProcessed: number; delivered: number; suppressed: number; cancelledUnauthorized: number } }> =>
    api.post('/notifications/queue/dispatch'),

  getQueue: (params?: any): Promise<{ data: { items: NotificationQueueItem[]; totalCount: number; page: number; totalPages: number } }> =>
    api.get('/notifications/queue', { params }),

  previewDigest: (): Promise<{ data: DigestPreviewResponse }> =>
    api.get('/notifications/digest/preview'),
};

export const auditLogsApi = {
  getAuditLogs: (
    params?: any,
  ): Promise<{ data: { auditLogs: AuditLogItem[]; totalCount: number } }> =>
    api.get('/audit-logs', { params }),
};

// ==========================================
// COLLAB-004: "What Changed?" Activity & Baselines APIs
// ==========================================
export const activityApi = {
  getWhatChanged: (params?: any): Promise<{ data: WhatChangedSummaryResponse }> =>
    api.get('/activity/what-changed', { params }),

  getBaselines: (params?: { scopeType?: string; scopeId?: string }): Promise<{ data: ChangeActivityBaseline[] }> =>
    api.get('/activity/baselines', { params }),

  createBaseline: (data: {
    baselineCode: string;
    title: string;
    description?: string;
    scopeType: 'PROJECT' | 'PRODUCT' | 'SPRINT' | 'RELEASE';
    scopeId: string;
  }): Promise<{ data: ChangeActivityBaseline }> =>
    api.post('/activity/baselines', data),

  getSavedQueries: (): Promise<{ data: UserActivitySavedQuery[] }> =>
    api.get('/activity/saved-queries'),

  saveQuery: (data: Partial<UserActivitySavedQuery>): Promise<{ data: UserActivitySavedQuery }> =>
    api.post('/activity/saved-queries', data),

  deleteSavedQuery: (id: string): Promise<{ data: { success: boolean; deleted: boolean } }> =>
    api.delete(`/activity/saved-queries/${id}`),
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

  getChangeRequests: (params?: { projectId?: string }): Promise<{ data: ChangeRequest[] }> =>
    api.get('/client-portal/change-requests', { params }),

  getChangeRequestDetail: (id: string): Promise<{ data: ChangeRequest }> =>
    api.get(`/client-portal/change-requests/${id}`),

  submitChangeRequestDecision: (id: string, rev: number, data: { decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'; remarks?: string }) =>
    api.post(`/client-portal/change-requests/${id}/revisions/${rev}/decision`, data),

  getUatPackages: (params?: { projectId?: string }): Promise<{ data: UatPackage[] }> =>
    api.get('/client-portal/uat-packages', { params }),

  getUatPackageDetail: (id: string): Promise<{ data: UatPackage }> =>
    api.get(`/client-portal/uat-packages/${id}`),

  testChecklistItem: (itemId: string, data: { clientStatus: string; clientFeedback?: string; linkedDefectTaskId?: string }) =>
    api.patch(`/client-portal/uat-packages/checklist-items/${itemId}/test`, data),

  submitUatDecision: (id: string, rev: number, data: { decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'; remarks?: string }) =>
    api.post(`/client-portal/uat-packages/${id}/revisions/${rev}/decision`, data),

  getProgressReports: (params?: { projectId?: string }): Promise<{ data: ClientProgressReport[] }> =>
    api.get('/client-portal/progress-reports', { params }),

  getProgressReportDetail: (id: string): Promise<{ data: ClientProgressReport }> =>
    api.get(`/client-portal/progress-reports/${id}`),

  getProgressReportDigest: (id: string): Promise<{ data: { digest: string } }> =>
    api.get(`/client-portal/progress-reports/${id}/digest`),

  getActionRequests: (params?: { projectId?: string }): Promise<{ data: ClientActionRequest[] }> =>
    api.get('/client-portal/action-requests', { params }),

  getActionRequestDetail: (id: string): Promise<{ data: ClientActionRequest }> =>
    api.get(`/client-portal/action-requests/${id}`),

  respondActionRequest: (
    id: string,
    data: { responseText: string; resultingDecision: string; resultingChangeRequestId?: string },
  ): Promise<{ data: any; message: string }> =>
    api.post(`/client-portal/action-requests/${id}/respond`, data),

  getDecisions: (params?: { projectId?: string }): Promise<{ data: RaidItem[] }> =>
    api.get('/client-portal/decisions', { params }),

  // PROD-001: Product Community Ideas & Roadmap
  getProductIdeas: (params?: { productId?: string; search?: string; roadmapBucket?: string }): Promise<{ data: ClientProductIdea[] }> =>
    api.get('/client-portal/product-ideas', { params }),

  getProductIdeaDetail: (id: string): Promise<{ data: ClientProductIdea }> =>
    api.get(`/client-portal/product-ideas/${id}`),

  submitProductIdea: (data: { productId: string; title: string; customerProblem: string; expectedOutcome?: string }): Promise<{ message: string; idea: any }> =>
    api.post('/client-portal/product-ideas', data),

  toggleProductIdeaVote: (id: string): Promise<{ message: string; hasVoted: boolean; voteCount: number }> =>
    api.post(`/client-portal/product-ideas/${id}/vote`),

  toggleProductIdeaFollow: (id: string): Promise<{ message: string; isFollowing: boolean; followerCount: number }> =>
    api.post(`/client-portal/product-ideas/${id}/follow`),

  getRoadmap: (params?: { productId?: string }): Promise<{ data: RoadmapBoard }> =>
    api.get('/client-portal/roadmap', { params }),
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

// ==========================================
// Change Requests & Quotations (CLIENT-004)
// ==========================================
export const changeRequestsApi = {
  create: (data: any): Promise<{ data: ChangeRequest }> =>
    api.post('/change-requests', data),

  getAll: (params?: any): Promise<{ data: { data: ChangeRequest[]; total: number; page: number; limit: number; totalPages: number } }> =>
    api.get('/change-requests', { params }),

  getById: (id: string): Promise<{ data: ChangeRequest }> =>
    api.get(`/change-requests/${id}`),

  submitForReview: (id: string): Promise<{ data: ChangeRequest }> =>
    api.post(`/change-requests/${id}/submit-review`),

  reviewRevision: (id: string, rev: number, data: { status: string; internalReviewNotes?: string }): Promise<{ data: ChangeRequestRevision }> =>
    api.post(`/change-requests/${id}/revisions/${rev}/review`, data),

  createRevision: (id: string, data: any): Promise<{ data: ChangeRequest }> =>
    api.post(`/change-requests/${id}/revisions`, data),

  recordDecision: (id: string, rev: number, data: { decision: string; remarks?: string }): Promise<{ data: ChangeRequest }> =>
    api.post(`/change-requests/${id}/revisions/${rev}/decision`, data),

  linkTasks: (id: string, data: { taskIds: string[]; isScopeAddition?: boolean }): Promise<{ data: any }> =>
    api.post(`/change-requests/${id}/tasks`, data),

  unlinkTask: (id: string, taskId: string) =>
    api.delete(`/change-requests/${id}/tasks/${taskId}`),
};

// ==========================================
// Client UAT Packages & Milestone Sign-Off (CLIENT-005)
// ==========================================
export const uatPackagesApi = {
  create: (data: any): Promise<{ data: UatPackage }> =>
    api.post('/uat-packages', data),

  getAll: (params?: any): Promise<{ data: { data: UatPackage[]; total: number; page: number; limit: number; totalPages: number } }> =>
    api.get('/uat-packages', { params }),

  getById: (id: string): Promise<{ data: UatPackage }> =>
    api.get(`/uat-packages/${id}`),

  submitForQa: (id: string): Promise<{ data: UatPackage }> =>
    api.post(`/uat-packages/${id}/submit-qa`),

  reviewRevisionQa: (id: string, rev: number, data: { status: string; qaNotes?: string }): Promise<{ data: any }> =>
    api.post(`/uat-packages/${id}/revisions/${rev}/review-qa`, data),

  createRevision: (id: string, data: any): Promise<{ data: UatPackage }> =>
    api.post(`/uat-packages/${id}/revisions`, data),

  updateChecklistItem: (itemId: string, data: any): Promise<{ data: UatChecklistItem }> =>
    api.patch(`/uat-packages/checklist-items/${itemId}`, data),

  recordDecision: (id: string, rev: number, data: { decision: string; remarks?: string }): Promise<{ data: UatPackage }> =>
    api.post(`/uat-packages/${id}/revisions/${rev}/decision`, data),

  recordInstalledVersion: (data: any): Promise<{ data: ClientInstalledVersion }> =>
    api.post('/uat-packages/installed-versions', data),

  getInstalledVersions: (clientId: string): Promise<{ data: ClientInstalledVersion[] }> =>
    api.get(`/uat-packages/installed-versions/client/${clientId}`),
};

// ==========================================
// Client Progress Updates & Reporting (CLIENT-006)
// ==========================================
export const clientReportsApi = {
  create: (data: any): Promise<{ data: ClientProgressReport }> =>
    api.post('/client-reports', data),

  getAll: (params?: any): Promise<{ data: { data: ClientProgressReport[]; total: number; page: number; limit: number; totalPages: number } }> =>
    api.get('/client-reports', { params }),

  getById: (id: string): Promise<{ data: ClientProgressReport }> =>
    api.get(`/client-reports/${id}`),

  getDigest: (id: string): Promise<{ data: { digest: string } }> =>
    api.get(`/client-reports/${id}/digest`),

  update: (id: string, data: any): Promise<{ data: ClientProgressReport }> =>
    api.patch(`/client-reports/${id}`, data),

  submitForReview: (id: string): Promise<{ data: ClientProgressReport }> =>
    api.post(`/client-reports/${id}/submit-review`),

  publish: (id: string, data: any): Promise<{ data: ClientProgressReport }> =>
    api.post(`/client-reports/${id}/publish`, data),

  archive: (id: string): Promise<{ data: ClientProgressReport }> =>
    api.post(`/client-reports/${id}/archive`),
};

// ==========================================
// RAID Items, Decisions & Client Actions (DEL-001)
// ==========================================
export const raidApi = {
  createItem: (data: any): Promise<{ data: RaidItem }> =>
    api.post('/raid/items', data),

  getItems: (params?: any): Promise<{ data: RaidItem[] }> =>
    api.get('/raid/items', { params }),

  getItemById: (id: string): Promise<{ data: RaidItem }> =>
    api.get(`/raid/items/${id}`),

  updateItem: (id: string, data: any): Promise<{ data: RaidItem }> =>
    api.put(`/raid/items/${id}`, data),

  deleteItem: (id: string) =>
    api.delete(`/raid/items/${id}`),

  supersedeDecision: (id: string, data: any) =>
    api.post(`/raid/items/${id}/supersede`, data),

  createActionRequest: (data: any): Promise<{ data: ClientActionRequest }> =>
    api.post('/raid/action-requests', data),

  getActionRequests: (params?: any): Promise<{ data: ClientActionRequest[] }> =>
    api.get('/raid/action-requests', { params }),

  resolveActionRequest: (id: string, data: any): Promise<{ data: ClientActionRequest }> =>
    api.post(`/raid/action-requests/${id}/resolve`, data),
};

// ==========================================
// Product Discovery, Voting & Roadmaps (PROD-001)
// ==========================================
export const productIdeasApi = {
  createIdea: (data: any): Promise<{ data: ProductIdea }> =>
    api.post('/product-ideas', data),

  getIdeas: (params?: any): Promise<{ data: ProductIdea[]; meta?: any }> =>
    api.get('/product-ideas', { params }),

  getIdeaById: (id: string): Promise<{ data: ProductIdea }> =>
    api.get(`/product-ideas/${id}`),

  updateIdea: (id: string, data: any): Promise<{ data: ProductIdea }> =>
    api.patch(`/product-ideas/${id}`, data),

  scoreIdea: (id: string, data: any): Promise<{ data: ProductIdea }> =>
    api.post(`/product-ideas/${id}/score`, data),

  moderateIdea: (id: string, data: any): Promise<{ data: ProductIdea }> =>
    api.post(`/product-ideas/${id}/moderate`, data),

  updateRoadmap: (id: string, data: any): Promise<{ data: ProductIdea }> =>
    api.patch(`/product-ideas/${id}/roadmap`, data),

  mergeDuplicates: (
    sourceIdeaId: string,
    data: { canonicalIdeaId: string; mergeNotes?: string },
  ): Promise<{
    message: string;
    canonicalIdeaId: string;
    migratedVotesCount: number;
    deduplicatedVotesCount: number;
    totalCanonicalVotes: number;
  }> => api.post(`/product-ideas/${sourceIdeaId}/merge`, data),

  deleteIdea: (id: string) =>
    api.delete(`/product-ideas/${id}`),

  getRoadmapBoard: (params?: { productId?: string }): Promise<{ data: { now: ProductIdea[]; next: ProductIdea[]; later: ProductIdea[] } }> =>
    api.get('/product-ideas/roadmap/board', { params }),
};

// ==========================================
// QA & Testing Workspace APIs (QA-001)
// ==========================================
export const qaApi = {
  // Test Suites
  getSuites: (params?: any): Promise<{ data: TestSuite[] }> =>
    api.get('/qa/suites', { params }),

  getSuiteById: (id: string): Promise<{ data: TestSuite }> =>
    api.get(`/qa/suites/${id}`),

  createSuite: (data: any): Promise<{ data: TestSuite }> =>
    api.post('/qa/suites', data),

  updateSuite: (id: string, data: any): Promise<{ data: TestSuite }> =>
    api.patch(`/qa/suites/${id}`, data),

  deleteSuite: (id: string) =>
    api.delete(`/qa/suites/${id}`),

  // Test Cases
  getCases: (params?: any): Promise<{ data: { items: TestCase[]; meta: any } }> =>
    api.get('/qa/cases', { params }),

  getCaseById: (id: string): Promise<{ data: TestCase }> =>
    api.get(`/qa/cases/${id}`),

  createCase: (data: any): Promise<{ data: TestCase }> =>
    api.post('/qa/cases', data),

  updateCase: (id: string, data: any): Promise<{ data: TestCase }> =>
    api.patch(`/qa/cases/${id}`, data),

  deleteCase: (id: string) =>
    api.delete(`/qa/cases/${id}`),

  // Test Runs
  getRuns: (params?: any): Promise<{ data: TestRun[] }> =>
    api.get('/qa/runs', { params }),

  getRunById: (id: string): Promise<{ data: TestRun }> =>
    api.get(`/qa/runs/${id}`),

  createRun: (data: any): Promise<{ data: TestRun }> =>
    api.post('/qa/runs', data),

  updateRun: (id: string, data: any): Promise<{ data: TestRun }> =>
    api.patch(`/qa/runs/${id}`, data),

  // Run Execution & Defect Logging
  executeRunItem: (itemId: string, data: any): Promise<{ data: TestRunItem }> =>
    api.patch(`/qa/run-items/${itemId}/execute`, data),

  logDefectFromRunItem: (itemId: string, data: any): Promise<{ data: { defect: any; runItemId: string; message: string } }> =>
    api.post(`/qa/run-items/${itemId}/log-defect`, data),

  // Release Readiness Checklists
  getReleaseChecklists: (params?: any): Promise<{ data: ReleaseReadinessChecklist[] }> =>
    api.get('/qa/release-checklists', { params }),

  getReleaseChecklistById: (id: string): Promise<{ data: ReleaseReadinessChecklist }> =>
    api.get(`/qa/release-checklists/${id}`),

  createReleaseChecklist: (data: any): Promise<{ data: ReleaseReadinessChecklist }> =>
    api.post('/qa/release-checklists', data),

  updateChecklistItem: (checklistId: string, itemId: string, data: any): Promise<{ data: ReleaseChecklistItem }> =>
    api.patch(`/qa/release-checklists/${checklistId}/items/${itemId}`, data),

  signoffChecklist: (id: string, data: any): Promise<{ data: ReleaseReadinessChecklist }> =>
    api.post(`/qa/release-checklists/${id}/signoff`, data),

  // Traceability Matrix
  getTraceabilityMatrix: (params?: { productId?: string; projectId?: string }): Promise<{ data: { summary: TraceabilitySummary; items: TraceabilityItem[] } }> =>
    api.get('/qa/traceability', { params }),

  // QA Environments & Scoped Labels (QA-002)
  getEnvironments: (params?: any): Promise<{ data: QaEnvironment[] }> =>
    api.get('/qa/environments', { params }),

  getEnvironmentById: (id: string): Promise<{ data: QaEnvironment }> =>
    api.get(`/qa/environments/${id}`),

  createEnvironment: (data: any): Promise<{ data: QaEnvironment }> =>
    api.post('/qa/environments', data),

  updateEnvironment: (id: string, data: any): Promise<{ data: QaEnvironment }> =>
    api.patch(`/qa/environments/${id}`, data),

  deleteEnvironment: (id: string) =>
    api.delete(`/qa/environments/${id}`),

  // Issue Environment Observations & Retests (QA-002)
  getIssueObservations: (params?: any): Promise<{ data: { items: IssueEnvironmentObservation[]; total: number; page: number; limit: number; total_pages: number } }> =>
    api.get('/qa/observations', { params }),

  createIssueObservation: (data: any): Promise<{ data: IssueEnvironmentObservation }> =>
    api.post('/qa/observations', data),

  getTaskEnvironmentMatrix: (taskId: string): Promise<{ data: TaskEnvironmentMatrixResponse }> =>
    api.get(`/qa/tasks/${taskId}/environment-matrix`),
};
// ==========================================
// Knowledge Base, ADRs & Specs (COLLAB-001)
// ==========================================
export const knowledgeApi = {
  getDocuments: (params?: any): Promise<{ data: { data: KnowledgeDocument[]; total: number; page: number; limit: number; totalPages: number } }> =>
    api.get('/knowledge/documents', { params }),

  getDocumentById: (id: string): Promise<{ data: KnowledgeDocument }> =>
    api.get(`/knowledge/documents/${id}`),

  createDocument: (data: any): Promise<{ data: KnowledgeDocument }> =>
    api.post('/knowledge/documents', data),

  updateDocument: (id: string, data: any): Promise<{ data: KnowledgeDocument }> =>
    api.patch(`/knowledge/documents/${id}`, data),

  deleteDocument: (id: string): Promise<{ data: any }> =>
    api.delete(`/knowledge/documents/${id}`),

  addRevision: (documentId: string, data: any): Promise<{ data: KnowledgeDocumentRevision }> =>
    api.post(`/knowledge/documents/${documentId}/revisions`, data),

  getRevision: (documentId: string, rev: number): Promise<{ data: KnowledgeDocumentRevision }> =>
    api.get(`/knowledge/documents/${documentId}/revisions/${rev}`),

  getRevisionDiff: (documentId: string, base: number, target: number): Promise<{ data: { baseRevision: KnowledgeDocumentRevision; targetRevision: KnowledgeDocumentRevision } }> =>
    api.get(`/knowledge/documents/${documentId}/diff`, { params: { base, target } }),

  addLink: (documentId: string, data: any): Promise<{ data: KnowledgeDocumentLink }> =>
    api.post(`/knowledge/documents/${documentId}/links`, data),

  removeLink: (documentId: string, linkId: string): Promise<{ data: any }> =>
    api.delete(`/knowledge/documents/${documentId}/links/${linkId}`),

  addAttachment: (documentId: string, data: any): Promise<{ data: KnowledgeDocumentAttachment }> =>
    api.post(`/knowledge/documents/${documentId}/attachments`, data),

  deleteAttachment: (documentId: string, attachmentId: string): Promise<{ data: any }> =>
    api.delete(`/knowledge/documents/${documentId}/attachments/${attachmentId}`),
};

// ==========================================
// Templates & Recurring Work (COLLAB-002)
// ==========================================
export const templatesApi = {
  // Project Templates
  getProjectTemplates: (params?: any): Promise<{ data: { data: ProjectTemplate[]; meta: any } }> =>
    api.get('/templates/projects', { params }),

  getProjectTemplateById: (id: string): Promise<{ data: ProjectTemplate }> =>
    api.get(`/templates/projects/${id}`),

  createProjectTemplate: (data: any): Promise<{ data: ProjectTemplate }> =>
    api.post('/templates/projects', data),

  updateProjectTemplate: (id: string, data: any): Promise<{ data: ProjectTemplate }> =>
    api.patch(`/templates/projects/${id}`, data),

  deleteProjectTemplate: (id: string): Promise<{ data: any }> =>
    api.delete(`/templates/projects/${id}`),

  instantiateProject: (id: string, data: any): Promise<{ data: { project: any; milestones_created: number; tasks_created: number } }> =>
    api.post(`/templates/projects/${id}/instantiate`, data),

  // Task Templates
  getTaskTemplates: (params?: any): Promise<{ data: { data: TaskTemplate[]; meta: any } }> =>
    api.get('/templates/tasks', { params }),

  getTaskTemplateById: (id: string): Promise<{ data: TaskTemplate }> =>
    api.get(`/templates/tasks/${id}`),

  createTaskTemplate: (data: any): Promise<{ data: TaskTemplate }> =>
    api.post('/templates/tasks', data),

  updateTaskTemplate: (id: string, data: any): Promise<{ data: TaskTemplate }> =>
    api.patch(`/templates/tasks/${id}`, data),

  deleteTaskTemplate: (id: string): Promise<{ data: any }> =>
    api.delete(`/templates/tasks/${id}`),

  instantiateTask: (id: string, data: any): Promise<{ data: any }> =>
    api.post(`/templates/tasks/${id}/instantiate`, data),

  // Recurring Work Rules
  getRecurrenceRules: (params?: any): Promise<{ data: { data: RecurringWorkRule[]; meta: any } }> =>
    api.get('/templates/recurrence-rules', { params }),

  getRecurrenceRuleById: (id: string): Promise<{ data: RecurringWorkRule }> =>
    api.get(`/templates/recurrence-rules/${id}`),

  createRecurrenceRule: (data: any): Promise<{ data: RecurringWorkRule }> =>
    api.post('/templates/recurrence-rules', data),

  updateRecurrenceRule: (id: string, data: any): Promise<{ data: RecurringWorkRule }> =>
    api.patch(`/templates/recurrence-rules/${id}`, data),

  deleteRecurrenceRule: (id: string): Promise<{ data: any }> =>
    api.delete(`/templates/recurrence-rules/${id}`),

  getRuleOccurrences: (id: string): Promise<{ data: RecurringTaskOccurrence[] }> =>
    api.get(`/templates/recurrence-rules/${id}/occurrences`),

  triggerRule: (id: string, data?: { targetDate?: string }): Promise<{ data: { occurrence: RecurringTaskOccurrence; generated_task: any; next_run_date: string } }> =>
    api.post(`/templates/recurrence-rules/${id}/trigger`, data || {}),
};

// ==========================================
// Product Goals & Outcome Reviews (PROD-002)
// ==========================================
export const productGoalsApi = {
  getGoals: (params?: any): Promise<{ data: { items: ProductGoal[]; total: number; page: number; limit: number; total_pages: number } }> =>
    api.get('/product-goals', { params }),

  getGoalById: (id: string): Promise<{ data: ProductGoal }> =>
    api.get(`/product-goals/${id}`),

  createGoal: (data: any): Promise<{ data: ProductGoal }> =>
    api.post('/product-goals', data),

  updateGoal: (id: string, data: any): Promise<{ data: ProductGoal }> =>
    api.put(`/product-goals/${id}`, data),

  updateGoalProgress: (id: string, data: { current_value: number; status?: string }): Promise<{ data: ProductGoal }> =>
    api.put(`/product-goals/${id}/progress`, data),

  deleteGoal: (id: string): Promise<{ data: any }> =>
    api.delete(`/product-goals/${id}`),

  getSummary: (productId?: string): Promise<{ data: ProductGoalsSummary }> =>
    api.get('/product-goals/summary', { params: productId ? { product_id: productId } : undefined }),

  getOutcomeReviews: (params?: any): Promise<{ data: { items: ProductOutcomeReview[]; total: number; page: number; limit: number; total_pages: number } }> =>
    api.get('/product-goals/reviews', { params }),

  getOutcomeReviewById: (id: string): Promise<{ data: ProductOutcomeReview }> =>
    api.get(`/product-goals/reviews/${id}`),

  createOutcomeReview: (data: any): Promise<{ data: ProductOutcomeReview }> =>
    api.post('/product-goals/reviews', data),
};

// ==========================================
// Commercial Retainer & AMC Entitlements (COMM-001)
// ==========================================
export const commercialApi = {
  getContracts: (params?: any): Promise<{ data: CommercialContract[] }> =>
    api.get('/commercial/contracts', { params }),

  getContractById: (id: string): Promise<{ data: CommercialContract }> =>
    api.get(`/commercial/contracts/${id}`),

  createContract: (data: any): Promise<{ data: CommercialContract }> =>
    api.post('/commercial/contracts', data),

  updateContract: (id: string, data: any): Promise<{ data: CommercialContract }> =>
    api.patch(`/commercial/contracts/${id}`, data),

  createPeriod: (contractId: string, data: any): Promise<{ data: ContractPeriod }> =>
    api.post(`/commercial/contracts/${contractId}/periods`, data),

  getPeriodById: (id: string): Promise<{ data: ContractPeriod }> =>
    api.get(`/commercial/periods/${id}`),

  reconcilePeriod: (id: string): Promise<{ data: any }> =>
    api.post(`/commercial/periods/${id}/reconcile`),

  closeAndRolloverPeriod: (id: string): Promise<{ data: { closedPeriod: ContractPeriod; nextPeriod: ContractPeriod; rolloverSummary: any } }> =>
    api.post(`/commercial/periods/${id}/close-and-rollover`),

  consumeWorklog: (periodId: string, data: { timeLogId: string; hoursConsumed?: number }): Promise<{ data: ContractWorklogConsumption }> =>
    api.post(`/commercial/periods/${periodId}/consume`, data),

  removeConsumption: (consumptionId: string): Promise<{ data: any }> =>
    api.delete(`/commercial/consumptions/${consumptionId}`),

  createOverageRequest: (periodId: string, data: any): Promise<{ data: ContractOverageRequest }> =>
    api.post(`/commercial/periods/${periodId}/overage-requests`, data),

  decideOverageRequest: (id: string, data: any): Promise<{ data: ContractOverageRequest }> =>
    api.patch(`/commercial/overage-requests/${id}/decision`, data),

  getClientStatement: (contractId: string, periodId?: string): Promise<{ data: ClientStatementResponse }> =>
    api.get('/commercial/statements', { params: { contractId, periodId } }),
};

// ==========================================
// Data Exchange & Portable Imports / Exports (DATA-001)
// ==========================================
export const dataExchangeApi = {
  getTemplate: (entityType: ImportEntityType): Promise<{ data: { entityType: ImportEntityType; headers: string[]; descriptions: Record<string, string>; sampleRow: Record<string, any> } }> =>
    api.get(`/data-exchange/templates/${entityType}`),

  dryRunImport: (data: {
    entityType: ImportEntityType;
    importMode: ImportMode;
    rawCsvContent: string;
    columnMapping?: Record<string, string>;
    originalFileName?: string;
  }): Promise<{ data: DataImportPreviewResponse }> =>
    api.post('/data-exchange/dry-run', data),

  executeImport: (
    batchId: string,
    data?: { allowPartial?: boolean },
  ): Promise<{ data: DataImportBatch }> =>
    api.post(`/data-exchange/batches/${batchId}/execute`, data || {}),

  retryBatch: (batchId: string): Promise<{ data: DataImportBatch }> =>
    api.post(`/data-exchange/batches/${batchId}/retry`),

  getAllBatches: (): Promise<{ data: DataImportBatch[] }> =>
    api.get('/data-exchange/batches'),

  getBatchById: (id: string): Promise<{ data: DataImportBatch }> =>
    api.get(`/data-exchange/batches/${id}`),

  exportData: (params: DataExportQuery): Promise<{ data: { format: string; entityType: string; count: number; filename: string; csvContent?: string; data?: any[] } }> =>
    api.get('/data-exchange/export', { params }),
};

// ==========================================
// ANALYTICS-001: Contractual SLA & Risk Alerts
// ==========================================
export const slaApi = {
  // Policies
  getPolicies: (params?: { clientId?: string; projectId?: string; tier?: string }): Promise<{ data: SlaPolicy[] }> =>
    api.get('/sla/policies', { params }),

  getPolicyById: (id: string): Promise<{ data: SlaPolicy }> =>
    api.get(`/sla/policies/${id}`),

  createPolicy: (data: any): Promise<{ data: SlaPolicy }> =>
    api.post('/sla/policies', data),

  updatePolicy: (id: string, data: any): Promise<{ data: SlaPolicy }> =>
    api.put(`/sla/policies/${id}`, data),

  deletePolicy: (id: string) =>
    api.delete(`/sla/policies/${id}`),

  // Cycles
  getCycles: (params?: { taskId?: string; status?: string; projectId?: string }): Promise<{ data: SlaTrackingCycle[] }> =>
    api.get('/sla/cycles', { params }),

  getCycleById: (id: string): Promise<{ data: SlaTrackingCycle }> =>
    api.get(`/sla/cycles/${id}`),

  startCycle: (data: { taskId?: string; clientRequestId?: string; policyId?: string }): Promise<{ data: SlaTrackingCycle }> =>
    api.post('/sla/cycles', data),

  recordFirstResponse: (id: string, data: { isCustomerVisible: boolean; notes?: string }): Promise<{ data: SlaTrackingCycle }> =>
    api.post(`/sla/cycles/${id}/first-response`, data),

  recordResolution: (id: string, data: { terminalStatusCategory: string; notes?: string }): Promise<{ data: SlaTrackingCycle }> =>
    api.post(`/sla/cycles/${id}/resolution`, data),

  pauseCycle: (id: string, data: { pauseReason: string; notes?: string }): Promise<{ data: SlaTrackingCycle }> =>
    api.post(`/sla/cycles/${id}/pause`, data),

  resumeCycle: (id: string): Promise<{ data: SlaTrackingCycle }> =>
    api.post(`/sla/cycles/${id}/resume`),

  extendDeadline: (id: string, data: { addedMinutes: number; reason: string; changeRequestId?: string }): Promise<{ data: SlaTrackingCycle }> =>
    api.post(`/sla/cycles/${id}/extend`, data),

  reopenCycle: (id: string, data: { reason: string }): Promise<{ data: SlaTrackingCycle }> =>
    api.post(`/sla/cycles/${id}/reopen`, data),

  // Alerts
  evaluateAlerts: (params?: { projectId?: string; clientId?: string }): Promise<{ data: RiskAlert[] }> =>
    api.post('/sla/alerts/evaluate', {}, { params }),

  getAlerts: (params?: { status?: string; severity?: string; projectId?: string }): Promise<{ data: RiskAlert[] }> =>
    api.get('/sla/alerts', { params }),

  acknowledgeAlert: (id: string, data?: { notes?: string }): Promise<{ data: RiskAlert }> =>
    api.post(`/sla/alerts/${id}/acknowledge`, data || {}),

  resolveAlert: (id: string, data: { resolutionNotes: string }): Promise<{ data: RiskAlert }> =>
    api.post(`/sla/alerts/${id}/resolve`, data),

  dismissAlert: (id: string, data: { notes: string }): Promise<{ data: RiskAlert }> =>
    api.post(`/sla/alerts/${id}/dismiss`, data),

  // Dashboard
  getDashboard: (params?: { projectId?: string; clientId?: string }): Promise<{ data: SlaDashboardResponse }> =>
    api.get('/sla/dashboard', { params }),
};

// ==========================================
// Flow Analytics & Bottlenecks (ANALYTICS-002)
// ==========================================
export const flowAnalyticsApi = {
  // WIP Limits
  getWipLimits: (params?: { projectId?: string; teamId?: string; userId?: string; limitType?: string }): Promise<{ data: WipLimit[] }> =>
    api.get('/flow-analytics/wip-limits', { params }),

  createWipLimit: (data: any): Promise<{ data: WipLimit }> =>
    api.post('/flow-analytics/wip-limits', data),

  updateWipLimit: (id: string, data: any): Promise<{ data: WipLimit }> =>
    api.put(`/flow-analytics/wip-limits/${id}`, data),

  deleteWipLimit: (id: string) =>
    api.delete(`/flow-analytics/wip-limits/${id}`),

  checkWip: (data: { statusId?: string; userId?: string; teamId?: string; projectId?: string }) =>
    api.post('/flow-analytics/check-wip', data),

  getWipBoard: (params?: { projectId?: string; teamId?: string }): Promise<{ data: WipBoardResponse }> =>
    api.get('/flow-analytics/wip-board', { params }),

  // WIP Override Exceptions
  createOverrideException: (data: any): Promise<{ data: WipOverrideException }> =>
    api.post('/flow-analytics/wip-override-exceptions', data),

  getOverrideExceptions: (params?: { projectId?: string; taskId?: string }): Promise<{ data: WipOverrideException[] }> =>
    api.get('/flow-analytics/wip-override-exceptions', { params }),

  // Operational Aging
  getOperationalAging: (params?: any): Promise<{ data: OperationalAgingResponse }> =>
    api.get('/flow-analytics/operational-aging', { params }),

  // Flow Time Partitioning
  getFlowTimePartition: (params?: any): Promise<{ data: FlowTimePartitionResponse }> =>
    api.get('/flow-analytics/flow-time-partition', { params }),

  // Cycle Time Metrics & Percentiles
  getCycleTimeMetrics: (params?: any): Promise<{ data: CycleTimeMetricsResponse }> =>
    api.get('/flow-analytics/cycle-time-metrics', { params }),

  // Cumulative Flow Diagrams (CFD)
  getCumulativeFlow: (params?: { projectId?: string; sprintId?: string; startDate?: string; endDate?: string }): Promise<{ data: CfdDataPoint[] }> =>
    api.get('/flow-analytics/cumulative-flow', { params }),

  rebuildCfd: (data: { projectId?: string; sprintId?: string; productId?: string }) =>
    api.post('/flow-analytics/rebuild-cfd', data),

  // Dwell Time Heatmap
  getDwellTimeHeatmap: (params?: { projectId?: string; sprintId?: string }): Promise<{ data: DwellTimeResponse }> =>
    api.get('/flow-analytics/dwell-time-heatmap', { params }),

  // Aging Configurations
  getAgingConfigs: (params?: { projectId?: string }): Promise<{ data: FlowAgingConfig[] }> =>
    api.get('/flow-analytics/aging-configs', { params }),

  createAgingConfig: (data: any): Promise<{ data: FlowAgingConfig }> =>
    api.post('/flow-analytics/aging-configs', data),
};

// ==========================================
// Delivery, Workload and Capacity Insights (ANALYTICS-003)
// ==========================================
export const capacityInsightsApi = {
  // Workload Heatmap
  getWorkload: (params?: {
    startDate?: string;
    endDate?: string;
    teamId?: string;
    projectId?: string;
    branchId?: string;
    departmentId?: string;
    userId?: string;
  }): Promise<{ data: CapacityWorkloadResponse }> =>
    api.get('/capacity-insights/workload', { params }),

  // Split Effort Allocation
  splitEffort: (data: {
    taskId: string;
    assignees: Array<{ userId: string; effortSharePercentage: number }>;
  }): Promise<{ data: any }> =>
    api.post('/capacity-insights/split-effort', data),

  // Explainable Skill Suggestions
  getSkillSuggestions: (taskId: string): Promise<{ data: SkillSuggestionsResponse }> =>
    api.get(`/capacity-insights/tasks/${taskId}/skill-suggestions`),

  // Team Estimation Reliability & Metrics
  getTeamEstimationMetrics: (params?: {
    teamId?: string;
    projectId?: string;
    sprintId?: string;
  }): Promise<{ data: TeamEstimationMetricsResponse }> =>
    api.get('/capacity-insights/team-estimation-metrics', { params }),

  // Skills Catalog
  getSkills: (params?: { category?: string; search?: string }): Promise<{ data: Skill[] }> =>
    api.get('/capacity-insights/skills', { params }),

  createSkill: (data: { skill_code: string; name: string; category: string; description?: string }): Promise<{ data: Skill }> =>
    api.post('/capacity-insights/skills', data),

  // User Skills
  getUserSkills: (userId: string): Promise<{ data: UserSkill[] }> =>
    api.get(`/capacity-insights/users/${userId}/skills`),

  assignUserSkill: (userId: string, data: {
    skill_id: string;
    proficiency_level: number;
    years_of_experience?: number;
    is_certified?: boolean;
    notes?: string;
  }): Promise<{ data: UserSkill }> =>
    api.post(`/capacity-insights/users/${userId}/skills`, data),

  removeUserSkill: (userId: string, skillId: string): Promise<{ data: any }> =>
    api.delete(`/capacity-insights/users/${userId}/skills/${skillId}`),

  // Task Required Skills
  getTaskRequiredSkills: (taskId: string): Promise<{ data: TaskRequiredSkill[] }> =>
    api.get(`/capacity-insights/tasks/${taskId}/required-skills`),

  setTaskRequiredSkill: (taskId: string, data: {
    skill_id: string;
    minimum_proficiency?: number;
    is_mandatory?: boolean;
  }): Promise<{ data: TaskRequiredSkill }> =>
    api.post(`/capacity-insights/tasks/${taskId}/required-skills`, data),

  removeTaskRequiredSkill: (taskId: string, skillId: string): Promise<{ data: any }> =>
    api.delete(`/capacity-insights/tasks/${taskId}/required-skills/${skillId}`),

  // Capacity Reservations
  getReservations: (params?: {
    userId?: string;
    reservationType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: CapacityReservation[] }> =>
    api.get('/capacity-insights/reservations', { params }),

  createReservation: (data: {
    reservation_code: string;
    user_id: string;
    reservation_type: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    daily_hours?: number;
    total_reserved_hours?: number;
    is_recurring?: boolean;
    recurrence_pattern?: string;
  }): Promise<{ data: CapacityReservation }> =>
    api.post('/capacity-insights/reservations', data),

  deleteReservation: (id: string): Promise<{ data: any }> =>
    api.delete(`/capacity-insights/reservations/${id}`),
};

// ==========================================
// Project Financials, Variance & Reconciliation (ANALYTICS-004)
// ==========================================
export const financialAnalyticsApi = {
  // Overview & Reconciliation
  getOverview: (projectId: string): Promise<{ data: ProjectFinancialOverview }> =>
    api.get(`/financial-analytics/projects/${projectId}/overview`),

  // Baselines
  getBaselines: (projectId: string): Promise<{ data: ProjectFinancialBaseline[] }> =>
    api.get(`/financial-analytics/projects/${projectId}/baselines`),

  createBaseline: (data: {
    project_id: string;
    baseline_code: string;
    name: string;
    description?: string;
    baseline_date?: string;
    budgeted_hours?: number;
    budgeted_cost?: number;
    budgeted_revenue?: number;
    currency?: string;
    scope_tasks_count?: number;
    scope_story_points?: number;
    warning_threshold_pct?: number;
    critical_threshold_pct?: number;
  }): Promise<{ data: ProjectFinancialBaseline }> =>
    api.post('/financial-analytics/baselines', data),

  toggleFreezeBaseline: (id: string): Promise<{ data: ProjectFinancialBaseline }> =>
    api.patch(`/financial-analytics/baselines/${id}/toggle-freeze`),

  // Effective-Dated Rate Cards
  getRateCards: (projectId?: string): Promise<{ data: ProjectFinancialRateCard[] }> =>
    api.get('/financial-analytics/rate-cards', { params: { projectId } }),

  createRateCard: (data: {
    rate_code: string;
    project_id?: string;
    role_id?: string;
    user_id?: string;
    currency?: string;
    hourly_billing_rate: number;
    hourly_cost_rate: number;
    effective_start_date: string;
    effective_end_date?: string;
    description?: string;
  }): Promise<{ data: ProjectFinancialRateCard }> =>
    api.post('/financial-analytics/rate-cards', data),

  deleteRateCard: (id: string): Promise<{ data: any }> =>
    api.delete(`/financial-analytics/rate-cards/${id}`),

  // Periodic Metrics
  getMetrics: (projectId: string): Promise<{ data: ProjectFinancialPeriodicMetric[] }> =>
    api.get(`/financial-analytics/projects/${projectId}/metrics`),

  recordMetric: (data: any): Promise<{ data: ProjectFinancialPeriodicMetric }> =>
    api.post('/financial-analytics/metrics', data),

  // Currency Exchange Rates
  getExchangeRates: (): Promise<{ data: CurrencyExchangeRate[] }> =>
    api.get('/financial-analytics/exchange-rates'),

  createExchangeRate: (data: {
    from_currency: string;
    to_currency: string;
    exchange_rate: number;
    effective_date?: string;
    source?: string;
  }): Promise<{ data: CurrencyExchangeRate }> =>
    api.post('/financial-analytics/exchange-rates', data),
};

// ==========================================
// Advanced Scheduling & Scenarios (LATER-001)
// ==========================================
export const advancedSchedulingApi = {
  calculateCPM: (projectId: string): Promise<{ data: CPMAnalysisResult }> =>
    api.get(`/advanced-scheduling/cpm/${projectId}`),

  getScenarios: (params?: { projectId?: string; status?: string }): Promise<{ data: ScheduleScenario[] }> =>
    api.get('/advanced-scheduling/scenarios', { params }),

  getScenarioById: (id: string): Promise<{ data: ScheduleScenario }> =>
    api.get(`/advanced-scheduling/scenarios/${id}`),

  createScenario: (data: {
    projectId: string;
    scenarioCode: string;
    name: string;
    description?: string;
    scenarioType: string;
  }): Promise<{ data: ScheduleScenario }> =>
    api.post('/advanced-scheduling/scenarios', data),

  updateOverride: (scenarioId: string, overrideId: string, data: any): Promise<{ data: ScheduleScenario }> =>
    api.patch(`/advanced-scheduling/scenarios/${scenarioId}/overrides/${overrideId}`, data),

  simulateScenario: (id: string): Promise<{ data: ScheduleScenario }> =>
    api.post(`/advanced-scheduling/scenarios/${id}/simulate`),

  applyScenario: (id: string): Promise<{ data: any }> =>
    api.post(`/advanced-scheduling/scenarios/${id}/apply`),

  // Health Score Engine
  getProjectHealth: (projectId: string): Promise<{ data: ProjectHealthEvaluation }> =>
    api.get(`/advanced-scheduling/health/${projectId}`),

  getHealthHistory: (projectId: string): Promise<{ data: any[] }> =>
    api.get(`/advanced-scheduling/health/${projectId}/history`),

  getHealthConfig: (projectId?: string): Promise<{ data: ProjectHealthConfig }> =>
    api.get('/advanced-scheduling/health-config', { params: { projectId } }),

  upsertHealthConfig: (data: ProjectHealthConfig): Promise<{ data: ProjectHealthConfig }> =>
    api.put('/advanced-scheduling/health-config', data),

  recordHealthOverride: (data: {
    projectId: string;
    overrideState?: 'GREEN' | 'AMBER' | 'RED' | null;
    overrideReason: string;
  }): Promise<{ data: ProjectHealthEvaluation }> =>
    api.post('/advanced-scheduling/health-override', data),
};

// ==========================================
// API-001: Webhooks & Event Integrations
// ==========================================

export const webhooksApi = {
  getSubscriptions: (params?: { isEnabled?: boolean; eventType?: string; projectId?: string }): Promise<{ data: WebhookSubscription[] }> =>
    api.get('/webhooks/subscriptions', { params }),

  getSubscriptionById: (id: string): Promise<{ data: WebhookSubscription }> =>
    api.get(`/webhooks/subscriptions/${id}`),

  createSubscription: (data: {
    subscriptionCode: string;
    name: string;
    targetUrl: string;
    eventTypes: string[];
    scopeProjectIds?: string[];
    isEnabled?: boolean;
    maxRetries?: number;
    timeoutSeconds?: number;
    description?: string;
  }): Promise<{ data: WebhookSubscription }> =>
    api.post('/webhooks/subscriptions', data),

  updateSubscription: (
    id: string,
    data: {
      name?: string;
      targetUrl?: string;
      eventTypes?: string[];
      scopeProjectIds?: string[];
      isEnabled?: boolean;
      maxRetries?: number;
      timeoutSeconds?: number;
      description?: string;
    },
  ): Promise<{ data: WebhookSubscription }> =>
    api.patch(`/webhooks/subscriptions/${id}`, data),

  rotateSecret: (id: string): Promise<{ data: { id: string; subscription_code: string; raw_secret_key: string; masked_secret: string; secret_rotated_at: string } }> =>
    api.post(`/webhooks/subscriptions/${id}/rotate-secret`),

  deleteSubscription: (id: string): Promise<{ data: { success: boolean; id: string } }> =>
    api.delete(`/webhooks/subscriptions/${id}`),

  simulateEvent: (data: { eventType?: string; subscriptionId?: string }): Promise<{ data: { dispatched: number; eventId?: string } }> =>
    api.post('/webhooks/simulate', data),

  getDeliveries: (params?: { subscriptionId?: string; status?: string; eventType?: string; eventId?: string }): Promise<{ data: WebhookDelivery[] }> =>
    api.get('/webhooks/deliveries', { params }),

  replayDelivery: (id: string): Promise<{ data: any }> =>
    api.post(`/webhooks/deliveries/${id}/replay`),
};

// ==========================================
// ADMIN-001: Configuration Toolkit & Setup Wizard
// ==========================================

export const configToolkitApi = {
  getSettings: (): Promise<{ data: CompanySettings }> =>
    api.get('/config-toolkit/settings'),

  updateSettings: (data: Partial<CompanySettings>): Promise<{ data: CompanySettings }> =>
    api.put('/config-toolkit/settings', data),

  resetWizard: (): Promise<{ data: CompanySettings }> =>
    api.post('/config-toolkit/settings/reset-wizard'),

  getPackages: (): Promise<{ data: ConfigurationPackage[] }> =>
    api.get('/config-toolkit/packages'),

  getPackageById: (id: string): Promise<{ data: ConfigurationPackage }> =>
    api.get(`/config-toolkit/packages/${id}`),

  exportConfiguration: (data: {
    packageCode: string;
    packageName: string;
    packageType?: string;
    description?: string;
  }): Promise<{ data: ConfigurationPackage }> =>
    api.post('/config-toolkit/packages/export', data),

  dryRunPackage: (data: {
    packageId?: string;
    rawPackageData?: any;
  }): Promise<{ data: PackageDiffResult }> =>
    api.post('/config-toolkit/packages/dry-run', data),

  applyPackage: (data: {
    packageId?: string;
    rawPackageData?: any;
    conflictResolution?: 'OVERWRITE' | 'SKIP' | 'FAIL_ON_CONFLICT';
  }): Promise<{ data: { success: boolean; appliedCount: number; skippedCount: number; items: any[] } }> =>
    api.post('/config-toolkit/packages/apply', data),

  getAuditLogs: (): Promise<{ data: ConfigurationAuditLog[] }> =>
    api.get('/config-toolkit/audit-logs'),
};

export const draftingApi = {
  getDrafts: (params?: any): Promise<{ data: DraftSuggestion[] }> =>
    api.get('/drafting/suggestions', { params }),

  getDraftById: (id: string): Promise<{ data: DraftSuggestion }> =>
    api.get(`/drafting/suggestions/${id}`),

  generateDraft: (data: {
    generatorType: 'SUBTASKS' | 'ACCEPTANCE_CRITERIA' | 'RELEASE_NOTES' | 'GAP_AUDIT' | 'DUPLICATE_CHECK';
    entityId: string;
    entityType: 'TASK' | 'REQUIREMENT' | 'VERSION' | 'SPRINT' | 'PROJECT';
    audienceScope?: 'INTERNAL_ONLY' | 'CLIENT_SAFE' | 'PUBLIC_COMMUNITY';
  }): Promise<{ data: any }> =>
    api.post('/drafting/generate', data),

  reviewDraft: (
    id: string,
    data: {
      status: 'ACCEPTED' | 'MODIFIED_AND_ACCEPTED' | 'REJECTED' | 'DISCARDED';
      reviewNotes?: string;
      reviewedContent?: any;
      applyToSource?: boolean;
    },
  ): Promise<{ data: DraftSuggestion }> =>
    api.post(`/drafting/suggestions/${id}/review`, data),

  getRules: (): Promise<{ data: DraftRuleConfig[] }> =>
    api.get('/drafting/rules'),

  updateRule: (
    id: string,
    data: {
      isEnabled?: boolean;
      similarityThreshold?: number;
      ruleParameters?: Record<string, any>;
      description?: string;
    },
  ): Promise<{ data: DraftRuleConfig }> =>
    api.put(`/drafting/rules/${id}`, data),
};











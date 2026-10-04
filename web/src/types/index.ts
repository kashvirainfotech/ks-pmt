// ========================================================
// KS-PMT Frontend Type Definitions
// ========================================================

export type DevicePlatform = 'WEB' | 'ANDROID' | 'IOS';

export interface User {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number?: string;
  avatar_url?: string;
  primary_branch_id: string;
  branch_name?: string;
  department_id?: string;
  department_name?: string;
  designation_id?: string;
  designation_name?: string;
  role_id: string;
  role_code: string;
  role_name: string;
  is_email_login_allowed: boolean;
  is_otp_login_allowed: boolean;
  is_active: boolean;
  permissions?: string[];
}

export interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
  address_line1?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  geofence_radius_meters?: number;
  is_head_office: boolean;
  is_active: boolean;
}

export interface Department {
  id: string;
  department_code: string;
  department_name: string;
  branch_id?: string;
  hod_user_id?: string;
  hod_name?: string;
  is_active: boolean;
}

export interface Designation {
  id: string;
  designation_code: string;
  designation_name: string;
  level: number;
  is_active: boolean;
}

export interface TaskType {
  id: string;
  type_code: string;
  type_name: string;
  color_code?: string;
  badge_icon?: string;
  is_chargeable_default: boolean;
  is_active: boolean;
}

export interface TaskWorkflowStatus {
  id: string;
  status_code: string;
  status_name: string;
  color_code: string;
  stage_order: number;
  is_initial: boolean;
  is_completed: boolean;
  is_cancelled: boolean;
  is_terminal?: boolean;
  status_category?: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  is_primary: boolean;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role_name?: string;
}

export interface SubTask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  due_date?: string;
  order_index: number;
}

export interface Task {
  revision?: number;
  updated_at?: string;
  severity?: string;
  currency?: string;
  planned_end_date?: string;
  actual_end_date?: string;
  id: string;
  task_code: string;
  title: string;
  description?: string;
  branch_id: string;
  branch_name?: string;
  project_id?: string;
  project_name?: string;
  product_id?: string;
  product_name?: string;
  version_id?: string;
  version_name?: string;
  task_type_id: string;
  task_type_name?: string;
  task_type_color?: string;
  status_id: string;
  status_code?: string;
  status_name?: string;
  status_color?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  estimated_hours?: number;
  spent_hours?: number;
  is_chargeable: boolean;
  charge_amount?: number;
  planned_start_date?: string;
  planned_due_date?: string;
  actual_start_date?: string;
  actual_completed_date?: string;
  hierarchy_level?: 'INITIATIVE' | 'EPIC' | 'TASK' | 'SUBTASK';
  sprint_id?: string;
  sprint_code?: string;
  sprint_name?: string;
  milestone_id?: string;
  milestone_code?: string;
  milestone_name?: string;
  story_points?: number;
  t_shirt_size?: string;
  backlog_order?: number;
  is_blocked?: boolean;
  resolution?: string;
  resolution_details?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_by_name?: string;
  created_at: string;
  assignees?: TaskAssignee[];
  subtasks_count?: number;
  completed_subtasks_count?: number;
}

export interface TimeLog {
  id: string;
  task_id: string;
  task_title?: string;
  user_id: string;
  user_name?: string;
  log_date: string;
  duration_minutes: number;
  description?: string;
  is_billable: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  parent_comment_id?: string;
  comment_text: string;
  created_at: string;
  replies?: TaskComment[];
}

export interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  original_name: string;
  file_size_bytes: number;
  mime_type: string;
  s3_key: string;
  created_at: string;
  created_by_name?: string;
  download_url?: string;
}

export interface Client {
  id: string;
  client_code: string;
  company_name: string;
  contact_person?: string;
  email?: string;
  mobile?: string;
  is_prospect: boolean;
  converted_at?: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  product_code: string;
  product_name: string;
  description?: string;
  license_type: string;
  standard_license_price?: number;
  annual_amc_price?: number;
  is_active: boolean;
}

export interface Project {
  id: string;
  project_code: string;
  project_name: string;
  client_id?: string;
  client_name?: string;
  branch_id: string;
  branch_name?: string;
  project_manager_name?: string;
  billing_type: 'FIXED_PRICE' | 'TIME_AND_MATERIALS' | 'RETAINER' | 'NON_BILLABLE';
  contract_amount?: number;
  hourly_rate?: number;
  total_budget_hours?: number;
  is_active: boolean;
  start_date?: string;
  target_end_date?: string;
  active_tasks_count?: number;
  completed_tasks_count?: number;
}

export interface Version {
  id: string;
  version_code: string;
  version_name: string;
  product_id?: string;
  project_id?: string;
  release_date?: string;
  is_released: boolean;
}

export interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender_name?: string;
}

export interface UserNotificationSettings {
  id?: string;
  user_id?: string;
  client_contact_id?: string;
  email_notifications_enabled?: boolean;
  in_app_notifications_enabled?: boolean;
  push_notifications_enabled?: boolean;
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
  pushNotificationsEnabled?: boolean;
  digest_mode?: 'INSTANT' | 'DAILY' | 'WEEKLY';
  digestMode?: 'INSTANT' | 'DAILY' | 'WEEKLY';
  quiet_hours_enabled?: boolean;
  quietHoursEnabled?: boolean;
  quiet_hours_start?: string | null;
  quietHoursStart?: string | null;
  quiet_hours_end?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
  allow_urgent_during_quiet_hours?: boolean;
  allowUrgentDuringQuietHours?: boolean;
  event_preferences?: Record<string, boolean>;
  eventPreferences?: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
}

export interface WorkItemWatcher {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id?: string;
  client_contact_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  client_contact_name?: string;
  client_contact_email?: string;
  notify_on_status_change: boolean;
  notify_on_comments: boolean;
  notify_on_attachments: boolean;
  notify_on_approvals: boolean;
  created_at: string;
  item_title?: string;
  item_code?: string;
}

export interface NotificationQueueItem {
  id: string;
  deduplication_key: string;
  recipient_user_id?: string;
  recipient_contact_id?: string;
  recipient_name?: string;
  recipient_email?: string;
  delivery_channel: 'IN_APP' | 'EMAIL' | 'PUSH';
  event_category: string;
  event_title: string;
  event_summary?: string;
  entity_type?: string;
  entity_id?: string;
  entity_code?: string;
  is_urgent: boolean;
  delivery_status: 'QUEUED' | 'DIGEST_PENDING' | 'SENT' | 'FAILED' | 'CANCELLED_UNAUTHORIZED' | 'SUPPRESSED_QUIET_HOURS';
  delivery_error?: string;
  scheduled_for: string;
  delivered_at?: string;
  created_at: string;
}

export interface DigestPreviewResponse {
  totalPendingItems: number;
  categories: Record<string, NotificationQueueItem[]>;
  generatedAt: string;
}

export interface ChangeActivityBaseline {
  id: string;
  baseline_code: string;
  title: string;
  description?: string;
  scope_type: 'PROJECT' | 'PRODUCT' | 'SPRINT' | 'RELEASE';
  scope_id: string;
  baseline_timestamp: string;
  snapshot_data: any;
  is_frozen: boolean;
  is_active: boolean;
  creator_name?: string;
  created_at: string;
}

export interface UserActivitySavedQuery {
  id?: string;
  user_id?: string;
  userId?: string;
  query_name?: string;
  queryName?: string;
  time_filter_type?: string;
  timeFilterType?: string;
  baseline_id?: string;
  baselineId?: string;
  baseline_title?: string;
  scope_type?: string;
  scopeType?: string;
  scope_id?: string;
  scopeId?: string;
  is_client_safe?: boolean;
  isClientSafe?: boolean;
  category_filters?: string[];
  categoryFilters?: string[];
  created_at?: string;
}

export interface WhatChangedMetrics {
  sourceLinkedEventCount: number;
  distinctItemCount: number;
  scopeAdditionsCount: number;
  scopeRemovalsCount: number;
  statusTransitionsCount: number;
  blockerEventsCount: number;
  requirementChangesCount: number;
  documentRevisionsCount: number;
}

export interface WhatChangedSummaryResponse {
  timeWindow: {
    filterType: string;
    windowStart: string;
    windowEnd: string;
    baseline?: ChangeActivityBaseline;
    fallbackUsed?: boolean;
  };
  metrics: WhatChangedMetrics;
  missingHistory: {
    detected: boolean;
    earliestTrackedAt?: string;
    note?: string;
  };
  summaryNarrative: string;
  categories: {
    scopeAdditions: any[];
    scopeRemovals: any[];
    statusTransitions: any[];
    blockerEvents: any[];
    requirementChanges: any[];
    documentRevisions: any[];
  };
  isClientSafe: boolean;
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action_type: string;
  entity_name: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  device_platform?: string;
  location_coordinates?: string;
  remarks?: string;
  created_at: string;
}

export interface WorkingCalendar {
  id: string;
  calendar_code: string;
  calendar_name: string;
  branch_id?: string;
  branch_name?: string;
  timezone: string;
  standard_hours_per_day: number;
  working_days_mask: string;
  is_default: boolean;
  description?: string;
  is_active: boolean;
  holidays_count?: number;
  assigned_users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CalendarHoliday {
  id: string;
  calendar_id: string;
  holiday_name: string;
  holiday_date: string;
  is_recurring: boolean;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeCalendarAssignment {
  id: string;
  user_id: string;
  calendar_id: string;
  effective_from: string;
  effective_to?: string;
  custom_hours_per_day?: number;
  billable_target_hours_per_week: number;
  is_contractor: boolean;
  notes?: string;
  calendar_code?: string;
  calendar_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeLeaveRecord {
  id: string;
  user_id: string;
  employee_name?: string;
  employee_email?: string;
  employee_id?: string;
  leave_type: 'ANNUAL' | 'SICK' | 'CASUAL' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'OTHER';
  start_date: string;
  end_date: string;
  days_count: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason?: string;
  approved_by?: string;
  approver_name?: string;
  approved_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface Sprint {
  id: string;
  sprint_code: string;
  sprint_name: string;
  sprint_goal?: string;
  entity_type: 'PROJECT' | 'PRODUCT';
  project_id?: string;
  project_name?: string;
  project_code?: string;
  product_id?: string;
  product_name?: string;
  product_code?: string;
  start_date: string;
  end_date: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  committed_tasks_count: number;
  committed_story_points: number;
  committed_hours: number;
  completed_tasks_count: number;
  completed_story_points: number;
  completed_hours: number;
  total_capacity_hours: number;
  current_tasks_count?: number;
  current_story_points?: number;
  current_estimated_hours?: number;
  tasks?: Task[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  milestone_code: string;
  milestone_name: string;
  description?: string;
  entity_type: 'PROJECT' | 'PRODUCT';
  project_id?: string;
  project_name?: string;
  product_id?: string;
  product_name?: string;
  target_date?: string;
  actual_date?: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'ACHIEVED' | 'MISSED' | 'CANCELLED';
  linked_tasks_count?: number;
  tasks?: Task[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SprintTaskScopeLedger {
  id: string;
  sprint_id: string;
  task_id: string;
  task_code: string;
  task_title: string;
  story_points?: number;
  estimated_hours?: number;
  is_initial_commitment: boolean;
  added_at: string;
  added_by_first_name: string;
  added_by_last_name: string;
  removed_at?: string;
  removed_by_first_name?: string;
  removed_by_last_name?: string;
  scope_change_reason?: string;
  rollover_from_sprint_id?: string;
  rollover_from_sprint_code?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskDependency {
  id: string;
  source_task_id: string;
  target_task_id: string;
  link_type: string;
  description?: string;
  source_task_code?: string;
  source_task_title?: string;
  source_status_name?: string;
  source_status_color?: string;
  target_task_code?: string;
  target_task_title?: string;
  target_status_name?: string;
  target_status_color?: string;
  related_task_id?: string;
  related_task_code?: string;
  related_task_title?: string;
  related_task_priority?: string;
  status_name?: string;
  status_color?: string;
  is_terminal?: boolean;
  status_category?: string;
  direction?: 'OUTGOING' | 'INCOMING';
  display_label?: string;
  created_at: string;
}

export interface TaskBlockerEpisode {
  id: string;
  task_id: string;
  task_code?: string;
  task_title?: string;
  task_code_title?: string;
  owner_user_id?: string;
  owner_name?: string;
  owner_avatar?: string;
  blocking_task_id?: string;
  blocking_task_code?: string;
  blocking_task_title?: string;
  reason: string;
  next_action?: string;
  follow_up_date?: string;
  expected_resolution_date?: string;
  category: string;
  priority: string;
  notes?: string;
  started_at: string;
  resolved_at?: string;
  resolved_by_name?: string;
  resolution_notes?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  duration_minutes?: number;
  age_days?: number;
  age_hours?: number;
  is_age_breached?: boolean;
  is_follow_up_due?: boolean;
  project_id?: string;
  product_id?: string;
  sprint_id?: string;
  project_name?: string;
  product_name?: string;
  sprint_name?: string;
}

export interface BlockerRadarData {
  totalActiveBlockers: number;
  criticalCount: number;
  breachedCount: number;
  oldestAgeDays: number;
  groupedByCategory: Record<string, number>;
  groupedByPriority: Record<string, number>;
  activeBlockers: TaskBlockerEpisode[];
}

export interface TaskDependencyMap {
  rootTask: any;
  prerequisites: any[];
  downstreamImpact: any[];
  prerequisiteCount: number;
  downstreamCount: number;
  hasOverduePrerequisites: boolean;
  hasStaleBlockingFlags: boolean;
}

export interface SavedView {
  id: string;
  view_name: string;
  entity_type: string;
  scope: 'PERSONAL' | 'TEAM' | 'PROJECT' | 'GLOBAL';
  project_id?: string;
  product_id?: string;
  user_id: string;
  owner_name?: string;
  project_name?: string;
  is_default: boolean;
  is_favorite: boolean;
  icon?: string;
  color?: string;
  filters: Record<string, any>;
  columns?: any[];
  sort?: any[];
  group_by?: string;
  view_mode: 'LIST' | 'KANBAN' | 'CALENDAR' | 'TIMELINE';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SavedViewPreset {
  id: string;
  viewName: string;
  entityType: string;
  icon: string;
  color: string;
  filters: Record<string, any>;
  columns?: any[];
  sort?: any[];
  groupBy?: string;
  viewMode: 'LIST' | 'KANBAN' | 'CALENDAR' | 'TIMELINE';
  isPreset: boolean;
  description: string;
}

export interface BulkUpdateItem {
  id: string;
  expectedRevision: number;
  statusId?: string;
  priority?: string;
  assigneeIds?: string[];
  sprintId?: string | null;
  milestoneId?: string | null;
  storyPoints?: number;
  tShirtSize?: string;
  plannedDueDate?: string;
  resolution?: string;
  resolutionDetails?: string;
  isBlocked?: boolean;
}

export interface BulkUpdateTasksResponse {
  total: number;
  succeededCount: number;
  failedCount: number;
  succeeded: Array<{ id: string; taskCode?: string; title?: string }>;
  failed: Array<{ id: string; taskCode?: string; title?: string; code: string; reason: string }>;
}

export interface WeeklyTimesheet {
  id: string;
  user_id: string;
  period_start_date: string;
  period_end_date: string;
  expected_hours: number;
  total_logged_hours: number;
  total_billable_hours: number;
  total_overtime_hours: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submission_remarks?: string;
  submitted_at?: string;
  rejection_reason?: string;
  rejected_at?: string;
  rejected_by?: string;
  approved_at?: string;
  approved_by?: string;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface TimesheetProjectPortion {
  id: string;
  timesheet_id: string;
  project_id?: string;
  product_id?: string;
  project_name?: string;
  product_name?: string;
  total_hours: number;
  billable_hours: number;
  overtime_hours: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  review_remarks?: string;
}

export interface WeeklyTimesheetGridItem {
  taskId: string;
  taskCode: string;
  taskTitle: string;
  projectName: string;
  projectId?: string;
  productId?: string;
  statusName?: string;
  statusColor?: string;
  isBillable: boolean;
  dailyHours: {
    Mon: number;
    Tue: number;
    Wed: number;
    Thu: number;
    Fri: number;
    Sat: number;
    Sun: number;
  };
  totalHours: number;
  logs: any[];
}

export interface WeeklyTimesheetSummary {
  periodStart: string;
  periodEnd: string;
  expectedHours: number;
  totalLoggedHours: number;
  totalBillableHours: number;
  totalOvertimeHours: number;
  missingHours: number;
  isUnderExpected: boolean;
}

export interface WeeklyTimesheetResponse {
  timesheet: WeeklyTimesheet;
  grid: WeeklyTimesheetGridItem[];
  worklogs: any[];
  portions: TimesheetProjectPortion[];
  summary: WeeklyTimesheetSummary;
}

export interface ActiveTimer {
  id: string;
  user_id: string;
  task_id: string;
  task_code: string;
  task_title: string;
  task_priority?: string;
  project_id?: string;
  project_name?: string;
  started_at: string;
  accumulated_seconds: number;
  is_paused: boolean;
  notes?: string;
  is_billable: boolean;
  elapsedSeconds: number;
  elapsedFormatted: string;
}

// ==========================================
// Delivery Teams & Software Components (PLAN-004)
// ==========================================

export interface DeliveryTeam {
  id: string;
  team_code: string;
  team_name: string;
  description?: string;
  lead_user_id?: string;
  lead_name?: string;
  lead_email?: string;
  lead_avatar?: string;
  member_count: number;
  components_count: number;
  projects?: Array<{ id: string; name: string }>;
  products?: Array<{ id: string; name: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_code?: string;
  avatar_url?: string;
  branch_name?: string;
  role_name?: string;
  designation_name?: string;
  role_in_team: 'LEAD' | 'DEVELOPER' | 'QA_ENGINEER' | 'DEVOPS' | 'PRODUCT_OWNER' | 'UI_DESIGNER' | string;
  joined_date: string;
  left_date?: string;
  allocation_percentage: number;
  is_active: boolean;
}

export interface SoftwareComponent {
  id: string;
  component_code: string;
  component_name: string;
  description?: string;
  entity_type: 'PRODUCT' | 'PROJECT';
  product_id?: string;
  project_id?: string;
  project_name?: string;
  product_name?: string;
  owner_team_id?: string;
  owner_team_name?: string;
  owner_team_code?: string;
  tech_lead_user_id?: string;
  tech_lead_name?: string;
  tech_lead_email?: string;
  tech_lead_avatar?: string;
  technology_stack?: string;
  documentation_url?: string;
  repository_url?: string;
  criticality: 'TIER_1_CRITICAL' | 'TIER_2_CORE' | 'TIER_3_SUPPORTING';
  task_count?: number;
  outbound_dep_count?: number;
  inbound_dep_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  outboundDependencies?: ComponentDependency[];
  inboundDependencies?: ComponentDependency[];
}

export interface ComponentDependency {
  id: string;
  component_id: string;
  depends_on_component_id: string;
  dependency_type: 'CONSUMES_API' | 'CALLS_SERVICE' | 'SHARED_DATABASE' | 'EVENT_PUBSUB' | 'CLIENT_SDK';
  description?: string;
  component_code?: string;
  component_name?: string;
  criticality?: string;
  target_team_name?: string;
  source_team_name?: string;
}

export interface ComponentDashboardResponse {
  component: SoftwareComponent;
  summary: {
    totalTasksCount: number;
    activeTasksCount: number;
    defectsCount: number;
    techDebtCount: number;
    criticalIssuesCount: number;
  };
  activeTasks: any[];
  defects: any[];
  techDebt: any[];
  allTasks: any[];
}

export interface ComponentArchitectureMapResponse {
  nodes: Array<{
    id: string;
    component_code: string;
    component_name: string;
    criticality: string;
    technology_stack?: string;
    owner_team?: string;
    task_count: number;
  }>;
  links: Array<{
    id: string;
    source_id: string;
    target_id: string;
    dependency_type: string;
    description?: string;
  }>;
}

// ==========================================
// FLOW-001: Task Handoffs & Waiting Queues
// ==========================================
export type HandoffStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'RETURNED_FOR_REWORK'
  | 'REDIRECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface DurationMetric {
  elapsedSeconds: number;
  elapsedFormatted: string;
  businessSeconds: number;
  businessFormatted: string;
}

export interface TaskHandoff {
  id: string;
  task_id: string;
  task_code?: string;
  task_title?: string;
  task_priority?: string;
  project_name?: string;
  from_team_id?: string;
  from_team_name?: string;
  from_user_id: string;
  from_user_name?: string;
  from_user_email?: string;
  to_team_id?: string;
  to_team_name?: string;
  to_user_id?: string;
  to_user_name?: string;
  to_user_email?: string;
  handoff_type: string;
  status: HandoffStatus;
  sent_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  acknowledged_by_name?: string;
  work_started_at?: string;
  work_started_by?: string;
  work_started_by_name?: string;
  completed_at?: string;
  predecessor_handoff_id?: string;
  required_context?: string;
  rejection_or_return_reason?: string;
  notes?: string;
  is_ownerless?: boolean;
  is_overdue?: boolean;
  timeToAck?: DurationMetric;
  timeToWorkStart?: DurationMetric;
  waitingDuration?: DurationMetric;
  is_active: boolean;
  created_at: string;
}

export interface HandoffAnalyticsResponse {
  summary: {
    totalHandoffs: number;
    totalReworkCount: number;
    reworkRatePct: number;
    redirectedCount: number;
    avgTimeToAckElapsed: string;
    avgTimeToWorkStartElapsed: string;
    ackSampleCount: number;
    workStartSampleCount: number;
  };
  byStage: Array<{
    stage: string;
    totalCount: number;
    reworkCount: number;
    reworkRatePct: number;
    avgTimeToAckFormatted: string;
    avgTimeToWorkStartFormatted: string;
  }>;
}

// ==========================================
// CONFIG-001: Project-Specific Workflow Overrides & Gates
// ==========================================
export type WorkflowScope = 'GLOBAL' | 'PROJECT' | 'PRODUCT';
export type WorkflowSchemeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface WorkflowScheme {
  id: string;
  scheme_code: string;
  scheme_name: string;
  description?: string;
  scope: WorkflowScope;
  project_id?: string;
  project_name?: string;
  product_id?: string;
  product_name?: string;
  task_type_id?: string;
  task_type_name?: string;
  status: WorkflowSchemeStatus;
  version: number;
  transitions_count?: number;
  transitions?: WorkflowSchemeTransition[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowSchemeTransition {
  id?: string;
  scheme_id?: string;
  from_status_id: string;
  from_status_code?: string;
  from_status_name?: string;
  from_status_color?: string;
  from_status_category?: string;
  to_status_id: string;
  to_status_code?: string;
  to_status_name?: string;
  to_status_color?: string;
  to_status_category?: string;
  to_status_is_terminal?: boolean;
  allowed_roles: string[];
  required_fields: string[];
  requires_release_association: boolean;
  requires_qa_signoff: boolean;
  requires_resolution: boolean;
  manual_gate_name?: string;
  transition_notes_prompt?: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalTransitions: number;
  statusCount: number;
  statusList?: Array<{
    id: string;
    name: string;
    category: string;
    isTerminal: boolean;
  }>;
}

// ========================================================
// CLIENT-001 & CLIENT-002: Client Portal & Intake Types
// ========================================================

export type ClientPortalRole = 'CLIENT_USER' | 'CLIENT_ADMIN';
export type ClientContactStatus = 'INVITED' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type ClientRequestType = 'BUG' | 'SUPPORT' | 'CHANGE_REQUEST';
export type ClientRequestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_INFORMATION'
  | 'ACCEPTED'
  | 'DUPLICATE'
  | 'DECLINED';
export type ClientPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TechnicalSeverity = 'TRIVIAL' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';
export type BusinessImpactCategory =
  | 'OPERATIONS'
  | 'REVENUE'
  | 'COMPLIANCE'
  | 'SECURITY'
  | 'USABILITY'
  | 'PERFORMANCE'
  | 'REPORTING'
  | 'OTHER';
export type ImpactBreadth =
  | 'INTERNAL'
  | 'SINGLE_USER'
  | 'ORGANIZATION'
  | 'MULTIPLE_CLIENTS'
  | 'ALL_CLIENTS';

export interface ClientContactProjectGrant {
  grant_id?: string;
  project_id: string;
  project_code?: string;
  project_name?: string;
  project_status?: string;
  can_view_milestones: boolean;
  can_create_requests: boolean;
  can_approve_scope: boolean;
  can_approve_uat: boolean;
}

export interface ClientContact {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  portal_role: ClientPortalRole;
  is_approver: boolean;
  status: ClientContactStatus;
  invitation_sent_at?: string;
  invitation_accepted_at?: string;
  last_login_at?: string;
  company_name?: string;
  client_code?: string;
  granted_project_count?: number;
  projectGrants?: ClientContactProjectGrant[];
  created_at: string;
  updated_at?: string;
}

export interface ClientRequestAttachment {
  s3Key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ClientRequestMessage {
  id: string;
  request_id?: string;
  sender_type: 'CLIENT_CONTACT' | 'INTERNAL_USER';
  authorName?: string;
  contact_author_name?: string;
  staff_author_name?: string;
  message: string;
  is_internal_only?: boolean;
  attachments?: ClientRequestAttachment[];
  created_at: string;
}

export interface ClientIntakeRequest {
  id: string;
  request_number: string;
  client_id: string;
  contact_id: string;
  project_id?: string;
  product_id?: string;
  component_id?: string;
  request_type: ClientRequestType;
  title: string;
  description: string;
  status: ClientRequestStatus;
  client_priority: ClientPriority;
  internal_priority?: ClientPriority;
  technical_severity?: TechnicalSeverity;
  business_impact: BusinessImpactCategory;
  impact_breadth: ImpactBreadth;
  environment_details?: Record<string, any>;
  attachments?: ClientRequestAttachment[];
  rejection_or_decline_reason?: string;
  duplicate_of_request_id?: string;
  duplicate_request_number?: string;
  duplicate_request_title?: string;
  linked_task_id?: string;
  linked_task_number?: string;
  linked_task_title?: string;
  linked_task_status_name?: string;
  linked_task_status_category?: string;
  affected_version?: string;
  target_fix_version?: string;
  company_name?: string;
  client_code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  project_name?: string;
  project_code?: string;
  product_name?: string;
  product_code?: string;
  component_name?: string;
  triaged_by_name?: string;
  customerStatus?: string;
  customerStatusColor?: string;
  created_at: string;
  updated_at: string;
  messages?: ClientRequestMessage[];
}

export interface ImpactSummaryStats {
  byStatus: Array<{ status: string; count: number }>;
  byBusinessImpact: Array<{ business_impact: string; count: number }>;
  byImpactBreadth: Array<{ impact_breadth: string; count: number }>;
  byRequestType: Array<{ request_type: string; count: number }>;
}

// ========================================================
// CLIENT-003: Requirements & Acceptance Traceability Types
// ========================================================

export type RequirementStatus = 'DRAFT' | 'PROPOSED' | 'REVIEWED' | 'BASELINED' | 'AMENDED' | 'ARCHIVED';
export type VerificationMethod = 'MANUAL_TEST' | 'DEMO' | 'DOCUMENTATION' | 'AUTOMATED';
export type ImplementationStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'VERIFIED_QA' | 'ACCEPTED_CLIENT' | 'WAIVED';
export type ClientSignoffStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WAIVED';

export interface RequirementCriterionLinkedTask {
  id: string;
  taskCode: string;
  title: string;
  priority?: string;
  statusId?: string;
  statusName?: string;
  statusCategory?: string;
}

export interface RequirementAcceptanceCriterion {
  id: string;
  requirement_id: string;
  criteria_code: string;
  title: string;
  description: string;
  verification_method: VerificationMethod;
  implementation_status: ImplementationStatus;
  order_index: number;
  qa_evidence_notes?: string;
  qa_evidence_urls?: Array<{ title?: string; url: string; uploadedAt?: string }>;
  qa_verified_by?: string;
  qa_verified_by_name?: string;
  qa_verified_at?: string;
  client_signoff_status: ClientSignoffStatus;
  client_signoff_by_contact_id?: string;
  client_signoff_by_name?: string;
  client_signoff_at?: string;
  client_signoff_notes?: string;
  linked_tasks?: RequirementCriterionLinkedTask[];
  created_at: string;
  updated_at: string;
}

export interface RequirementBaseline {
  id: string;
  requirement_id: string;
  version: number;
  baseline_name: string;
  snapshot_data: any;
  baselined_by: string;
  baselined_by_name?: string;
  baselined_at: string;
  approved_by_contact_id?: string;
  approved_by_name?: string;
  approved_at?: string;
  notes?: string;
}

export interface RequirementSpecification {
  id: string;
  req_code: string;
  title: string;
  project_id?: string;
  product_id?: string;
  project_name?: string;
  project_code?: string;
  product_name?: string;
  product_code?: string;
  module_name?: string;
  business_objective: string;
  in_scope?: string;
  out_of_scope?: string;
  assumptions?: string;
  originating_request_id?: string;
  originating_request_number?: string;
  originating_request_title?: string;
  version: number;
  status: RequirementStatus;
  is_baselined: boolean;
  baselined_at?: string;
  baselined_by?: string;
  baselined_by_name?: string;
  is_client_visible: boolean;
  total_criteria?: number;
  implemented_criteria?: number;
  qa_verified_criteria?: number;
  client_accepted_criteria?: number;
  linked_tasks_count?: number;
  created_at: string;
  updated_at: string;
  criteria?: RequirementAcceptanceCriterion[];
  baselines?: RequirementBaseline[];
}

export interface TraceabilityMatrixSummary {
  totalRequirements: number;
  baselinedRequirements: number;
  totalCriteria: number;
  implementedCount: number;
  implementationCoveragePct: number;
  qaVerifiedCount: number;
  qaCoveragePct: number;
  clientAcceptedCount: number;
  clientAcceptedPct: number;
}

export interface TraceabilityMatrixGapItem {
  requirementId: string;
  reqCode: string;
  criterionId: string;
  criteriaCode: string;
  criterionTitle: string;
  signoffStatus?: string;
}

export interface TraceabilityMatrixRow {
  requirement_id: string;
  req_code: string;
  requirement_title: string;
  requirement_status: RequirementStatus;
  requirement_version: number;
  is_baselined: boolean;
  is_client_visible: boolean;
  project_name?: string;
  product_name?: string;
  originating_request_number?: string;
  criterion_id?: string;
  criteria_code?: string;
  criterion_title?: string;
  verification_method?: VerificationMethod;
  implementation_status?: ImplementationStatus;
  qa_verified_at?: string;
  client_signoff_status?: ClientSignoffStatus;
  client_signoff_at?: string;
  linked_tasks?: Array<{
    id: string;
    taskCode: string;
    title: string;
    statusName?: string;
    statusCategory?: string;
  }>;
}

export interface TraceabilityMatrixResponse {
  summary: TraceabilityMatrixSummary;
  gaps: {
    unimplementedCriteria: TraceabilityMatrixGapItem[];
    unverifiedCriteria: TraceabilityMatrixGapItem[];
    unacceptedCriteria: TraceabilityMatrixGapItem[];
  };
  traceability: TraceabilityMatrixRow[];
}

// ========================================================
// Change Requests & Quotations (CLIENT-004)
// ========================================================

export type ChangeRequestStatus =
  | 'DRAFT'
  | 'INTERNAL_REVIEW'
  | 'AWAITING_CLIENT'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'DEFERRED'
  | 'WITHDRAWN';

export type ChangeRequestRevisionStatus =
  | 'DRAFT'
  | 'INTERNAL_REVIEW'
  | 'AWAITING_CLIENT'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'SUPERSEDED';

export interface ChangeRequestDeliverable {
  title: string;
  description?: string;
  targetDate?: string;
}

export interface ChangeRequestRevision {
  id: string;
  change_request_id: string;
  revision_number: number;
  scope_description: string;
  deliverables: ChangeRequestDeliverable[];
  estimated_hours: number;
  quoted_price: number;
  currency: string;
  schedule_delay_days: number;
  revised_delivery_date?: string;
  revision_reason?: string;
  status: ChangeRequestRevisionStatus;
  submitted_by_user_id: string;
  submitted_by_name?: string;
  submitted_at: string;
  internal_reviewed_by?: string;
  internal_reviewed_by_name?: string;
  internal_reviewed_at?: string;
  internal_review_notes?: string;
  client_decision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  decided_by_contact_id?: string;
  decided_by_contact_name?: string;
  decided_by_contact_email?: string;
  decided_by_client_company?: string;
  decided_at?: string;
  client_remarks?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChangeRequestTask {
  mapping_id: string;
  task_id: string;
  task_code: string;
  task_title: string;
  task_status: string;
  task_priority?: string;
  estimated_hours?: number;
  actual_hours?: number;
  assignee_name?: string;
  is_scope_addition: boolean;
  mapping_notes?: string;
  linked_at: string;
}

export interface ChangeRequest {
  id: string;
  cr_number: string;
  project_id?: string;
  product_id?: string;
  project_name?: string;
  project_code?: string;
  product_name?: string;
  product_code?: string;
  originating_intake_request_id?: string;
  originating_request_number?: string;
  originating_request_title?: string;
  requirement_id?: string;
  title: string;
  description: string;
  business_justification: string;
  impact_summary?: string;
  accountable_pm_user_id: string;
  accountable_pm_name?: string;
  accountable_pm_email?: string;
  current_revision: number;
  status: ChangeRequestStatus;
  linked_milestone_id?: string;
  linked_milestone_name?: string;
  // Current revision fields flattened in list view
  scope_description?: string;
  deliverables?: ChangeRequestDeliverable[];
  estimated_hours?: number;
  quoted_price?: number;
  currency?: string;
  schedule_delay_days?: number;
  revised_delivery_date?: string;
  revision_status?: string;
  client_decision?: string;
  decided_at?: string;
  client_remarks?: string;
  linked_tasks_count?: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  // Populated in detail view
  revisions?: ChangeRequestRevision[];
  tasks?: ChangeRequestTask[];
}

// ========================================================
// Client UAT Packages & Milestone Sign-Off (CLIENT-005)
// ========================================================

export type UatPackageStatus =
  | 'DRAFT'
  | 'INTERNAL_QA'
  | 'READY_FOR_CLIENT'
  | 'ACCEPTED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'SUPERSEDED';

export type UatChecklistClientStatus =
  | 'PENDING'
  | 'PASSED'
  | 'FAILED'
  | 'BLOCKED'
  | 'WAIVED';

export interface UatKnownIssue {
  title: string;
  workaround?: string;
  severity?: string;
  linkedTaskId?: string;
  linkedTaskCode?: string;
}

export interface UatChecklistItem {
  id: string;
  package_revision_id: string;
  item_code: string;
  title: string;
  instructions: string;
  expected_outcome: string;
  criterion_id?: string;
  criteria_code?: string;
  criteria_title?: string;
  order_index: number;
  developer_done: boolean;
  developer_done_at?: string;
  qa_verified: boolean;
  qa_verified_by?: string;
  qa_verified_by_name?: string;
  qa_verified_at?: string;
  qa_evidence_notes?: string;
  client_status: UatChecklistClientStatus;
  client_feedback?: string;
  client_tested_by_contact_id?: string;
  client_tested_by_contact_name?: string;
  client_tested_at?: string;
  linked_defect_task_id?: string;
  linked_defect_code?: string;
  linked_defect_title?: string;
  linked_defect_status?: string;
}

export interface UatPackageRevision {
  id: string;
  package_id: string;
  revision_number: number;
  revision_notes: string;
  status: UatPackageStatus;
  known_issues: UatKnownIssue[];
  test_evidence_urls: string[];
  qa_approved_by?: string;
  qa_approved_by_name?: string;
  qa_approved_at?: string;
  qa_notes?: string;
  client_decision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  decided_by_contact_id?: string;
  decided_by_contact_name?: string;
  decided_by_contact_email?: string;
  decided_by_client_company?: string;
  decided_at?: string;
  client_signoff_remarks?: string;
  submitted_to_client_at?: string;
  checklistItems?: UatChecklistItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UatPackage {
  id: string;
  package_code: string;
  project_id?: string;
  product_id?: string;
  project_name?: string;
  project_code?: string;
  product_name?: string;
  product_code?: string;
  version_id?: string;
  version_name?: string;
  milestone_id?: string;
  milestone_name?: string;
  title: string;
  description: string;
  environment_url?: string;
  build_number?: string;
  test_credentials_instructions?: string;
  current_revision: number;
  status: UatPackageStatus;
  target_signoff_date?: string;
  prepared_by_user_id: string;
  prepared_by_name?: string;
  qa_lead_user_id?: string;
  qa_lead_name?: string;
  total_checklist_items?: number;
  dev_done_items?: number;
  qa_verified_items?: number;
  client_passed_items?: number;
  client_failed_items?: number;
  revisions?: UatPackageRevision[];
  created_at: string;
  updated_at: string;
}

export interface ClientInstalledVersion {
  id: string;
  client_id: string;
  client_name?: string;
  product_id?: string;
  product_name?: string;
  project_id?: string;
  project_name?: string;
  version_id: string;
  version_name?: string;
  environment_name: string;
  accepted_at: string;
  accepted_by_contact_id?: string;
  accepted_by_contact_name?: string;
  installed_at: string;
  installed_by_user_id?: string;
  installed_by_user_name?: string;
  uat_package_id?: string;
  uat_package_code?: string;
  uat_package_title?: string;
  notes?: string;
  is_current_active: boolean;
}

export type ReportOverallHealth = 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK';
export type ReportAudienceScope = 'CLIENT_ALL' | 'CLIENT_APPROVERS_ONLY' | 'INTERNAL_ONLY';
export type ReportStatus = 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface ClientActionItem {
  id?: string;
  title: string;
  owner?: string;
  dueDate?: string;
  status?: string;
  urgency?: string;
}

export interface MilestoneForecast {
  milestoneId?: string;
  milestoneName: string;
  committedDate?: string;
  indicativeForecastDate: string;
  status?: string;
  varianceDays?: number;
  remarks?: string;
}

export interface SanitizedRisk {
  id?: string;
  risk: string;
  impact?: string;
  mitigation?: string;
  status?: string;
}

export interface CommercialSummary {
  currency?: string;
  contractValue?: number;
  approvedCrValue?: number;
  invoicedToDate?: number;
  currentMilestoneBilled?: number;
}

export interface ClientProgressReportRevision {
  id: string;
  report_id: string;
  revision_number: number;
  published_content_snapshot: any;
  revision_reason?: string;
  published_at: string;
  published_by_user_id?: string;
  published_by_name?: string;
}

export interface ClientProgressReport {
  id: string;
  report_code: string;
  project_id?: string;
  product_id?: string;
  project_name?: string;
  project_code?: string;
  product_name?: string;
  product_code?: string;
  title: string;
  period_start_date: string;
  period_end_date: string;
  report_status: ReportStatus;
  overall_health: ReportOverallHealth;
  health_narrative?: string;
  executive_summary: string;
  delivered_work_summary?: string;
  next_steps_summary?: string;
  decisions_needed_summary?: string;
  client_action_items?: ClientActionItem[];
  milestone_forecasts?: MilestoneForecast[];
  sanitized_risks?: SanitizedRisk[];
  include_commercials: boolean;
  commercial_summary?: CommercialSummary | null;
  audience_scope: ReportAudienceScope;
  internal_notes?: string;
  current_revision: number;
  published_at?: string;
  published_by_user_id?: string;
  published_by_name?: string;
  created_by_name?: string;
  revisions?: ClientProgressReportRevision[];
  created_at: string;
  updated_at: string;
}

// ==========================================
// 21. RAID Items, Architecture Decisions & Client Actions (DEL-001)
// ==========================================

export type RaidCategory = 'RISK' | 'ASSUMPTION' | 'DECISION' | 'ISSUE';
export type RaidLikelihood = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type RaidImpact = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ClientVisibility = 'INTERNAL_ONLY' | 'CLIENT_SUMMARY' | 'CLIENT_FULL';

export interface AlternativeConsidered {
  title: string;
  pros?: string;
  cons?: string;
  estimatedCostOrEffort?: string;
  rejectedReason?: string;
}

export interface RaidItemRevision {
  id: string;
  raid_item_id: string;
  revision_number: number;
  snapshot: any;
  change_summary?: string;
  author_name?: string;
  created_at: string;
}

export interface RaidItem {
  id: string;
  item_code: string;
  category: RaidCategory;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  product_id?: string;
  product_name?: string;
  product_code?: string;
  title: string;
  description?: string;
  owner_user_id?: string;
  owner_name?: string;
  owner_email?: string;
  review_date?: string;
  status: string;
  likelihood?: RaidLikelihood;
  impact?: RaidImpact;
  risk_score?: number;
  mitigation_plan?: string;
  contingency_plan?: string;
  internal_discussion?: string;
  requirement_id?: string;
  requirement_title?: string;
  req_code?: string;
  milestone_id?: string;
  milestone_name?: string;
  milestone_code?: string;
  component_id?: string;
  component_name?: string;
  component_code?: string;
  task_id?: string;
  task_title?: string;
  task_code?: string;
  blocker_reason?: string;
  participants?: any[];
  context?: string;
  alternatives_considered?: AlternativeConsidered[];
  rationale?: string;
  consequences?: string;
  technical_impact?: string;
  business_impact?: string;
  superseded_by_id?: string;
  superseded_by_code?: string;
  superseded_by_title?: string;
  supersedes_id?: string;
  supersedes_code?: string;
  supersedes_title?: string;
  is_client_shared: boolean;
  client_visibility: ClientVisibility;
  client_summary?: string;
  current_revision: number;
  revisions?: RaidItemRevision[];
  action_requests?: ClientActionRequest[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ActionStatus = 'PENDING' | 'IN_REVIEW' | 'RESPONDED' | 'RESOLVED' | 'CANCELLED';
export type ActionDecision = 'APPROVED' | 'REJECTED' | 'INFO_PROVIDED' | 'SCOPE_CHANGE_REQUESTED';

export interface ClientActionRequest {
  id: string;
  action_code: string;
  raid_item_id?: string;
  raid_item_code?: string;
  raid_category?: string;
  project_id: string;
  project_name?: string;
  project_code?: string;
  product_id?: string;
  client_id: string;
  client_name?: string;
  title: string;
  description: string;
  context_for_client: string;
  priority: ActionPriority;
  due_date: string;
  assigned_contact_id?: string;
  assigned_contact_name?: string;
  requires_approver: boolean;
  status: ActionStatus;
  response_text?: string;
  responded_by_contact_id?: string;
  responded_by_contact_name?: string;
  responded_by_name?: string;
  responded_at?: string;
  resulting_decision?: ActionDecision;
  resulting_change_request_id?: string;
  created_at: string;
  updated_at: string;
}

// ========================================================
// PROD-001: Product Discovery, Voting & Customer Roadmaps
// ========================================================

export type ProductIdeaStatus =
  | 'PROPOSED'
  | 'UNDER_EVALUATION'
  | 'PLANNED'
  | 'IN_DEVELOPMENT'
  | 'RELEASED'
  | 'DECLINED'
  | 'DEFERRED'
  | 'MERGED';

export type RoadmapBucket = 'NOW' | 'NEXT' | 'LATER';

export type ProductIdeaVisibility = 'INTERNAL_ONLY' | 'PRODUCT_COMMUNITY' | 'PUBLIC';

export interface ProductIdeaMergeHistory {
  id: string;
  canonical_idea_id: string;
  merged_idea_id: string;
  merged_idea_code: string;
  merged_idea_title: string;
  merged_by_user_id: string;
  merged_by_name?: string;
  migrated_votes_count: number;
  deduplicated_votes_count: number;
  merge_notes?: string;
  created_at: string;
}

export interface ProductIdea {
  id: string;
  idea_code: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  module_or_component_id?: string;
  component_name?: string;
  title: string;
  sanitized_description: string;
  customer_problem?: string;
  expected_outcome?: string;
  target_segment?: string;
  status: ProductIdeaStatus;
  status_reason?: string;
  roadmap_bucket?: RoadmapBucket;
  indicative_target?: string;
  // RICE Prioritization
  reach?: number;
  impact_score?: number;
  confidence_score?: number;
  effort_score?: number;
  strategic_fit?: number;
  rice_score?: number;
  scoring_rationale?: string;
  // Moderation & Community
  is_published: boolean;
  visibility: ProductIdeaVisibility;
  published_at?: string;
  moderated_by_user_id?: string;
  moderator_name?: string;
  vote_count: number;
  follower_count: number;
  // Confidential internal audit
  submitted_by_client_id?: string;
  submitted_by_client_name?: string;
  submitted_by_contact_id?: string;
  submitted_by_contact_name?: string;
  submitted_by_user_id?: string;
  submitted_by_user_name?: string;
  private_evidence_notes?: string;
  internal_commercial_impact?: string;
  // Duplicate Merging
  merged_into_idea_id?: string;
  merged_into_code?: string;
  merged_into_title?: string;
  merged_at?: string;
  merge_sources?: ProductIdeaMergeHistory[];
  // Linkages
  target_version_id?: string;
  target_version_name?: string;
  delivery_task_id?: string;
  delivery_task_title?: string;
  changelog_summary?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientProductIdea {
  id: string;
  idea_code: string;
  product_id: string;
  product_name: string;
  product_code: string;
  title: string;
  sanitized_description: string;
  expected_outcome?: string;
  target_segment?: string;
  status: ProductIdeaStatus;
  status_reason?: string;
  roadmap_bucket?: RoadmapBucket;
  indicative_target?: string;
  changelog_summary?: string;
  vote_count: number;
  follower_count: number;
  target_version_name?: string;
  published_at?: string;
  has_client_voted: boolean;
  is_following: boolean;
}

export interface RoadmapBoard {
  now: ClientProductIdea[];
  next: ClientProductIdea[];
  later: ClientProductIdea[];
}

// ========================================================
// QA-001: Manual QA, Test Runs & Release Gatekeeper
// ========================================================

export type TestSeverity = 'TRIVIAL' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';
export type TestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TestExecutionType = 'MANUAL' | 'AUTOMATED';
export type TestRunStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';
export type TestRunItemStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
export type ReleaseGateCategory =
  | 'QA_TESTING'
  | 'SECURITY'
  | 'CLIENT_UAT'
  | 'DOCUMENTATION'
  | 'DATA_MIGRATION'
  | 'PERFORMANCE';
export type ReleaseGateItemStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
export type ReleaseOverallStatus =
  | 'NOT_STARTED'
  | 'IN_REVIEW'
  | 'READY_FOR_RELEASE'
  | 'BLOCKED'
  | 'CONDITIONAL_RELEASE';

export interface TestSuite {
  id: string;
  suite_code: string;
  suite_name: string;
  description?: string;
  entity_type: 'PRODUCT' | 'PROJECT';
  product_id?: string;
  project_id?: string;
  component_id?: string;
  project_name?: string;
  product_name?: string;
  component_name?: string;
  total_cases_count?: number;
  testCases?: TestCase[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestCaseStep {
  step_number: number;
  action: string;
  expected_result: string;
}

export interface TestCase {
  id: string;
  case_code: string;
  suite_id: string;
  title: string;
  description?: string;
  preconditions?: string;
  test_steps: TestCaseStep[];
  expected_result: string;
  severity: TestSeverity;
  priority: TestPriority;
  execution_type: TestExecutionType;
  estimated_minutes: number;
  requirement_criterion_id?: string;
  component_id?: string;
  version: number;
  suite_code?: string;
  suite_name?: string;
  entity_type?: 'PRODUCT' | 'PROJECT';
  product_id?: string;
  project_id?: string;
  project_name?: string;
  product_name?: string;
  component_name?: string;
  criterion_code?: string;
  criterion_title?: string;
  recentExecutions?: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestRun {
  id: string;
  run_code: string;
  title: string;
  description?: string;
  entity_type: 'PRODUCT' | 'PROJECT';
  product_id?: string;
  project_id?: string;
  version_id?: string;
  milestone_id?: string;
  environment: 'LOCAL' | 'QA' | 'STAGING' | 'UAT' | 'PRODUCTION' | 'ON_PREMISE';
  status: TestRunStatus;
  assigned_to_user_id?: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  blocked_cases: number;
  skipped_cases: number;
  started_at?: string;
  completed_at?: string;
  project_name?: string;
  product_name?: string;
  version_name?: string;
  milestone_name?: string;
  assignee_name?: string;
  pass_rate_percentage?: number;
  items?: TestRunItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestRunItem {
  id: string;
  test_run_id: string;
  test_case_id: string;
  status: TestRunItemStatus;
  actual_result?: string;
  execution_notes?: string;
  executed_by_user_id?: string;
  executed_by_name?: string;
  executed_at?: string;
  evidence_urls: string[];
  linked_defect_task_id?: string;
  case_code: string;
  case_title: string;
  severity: TestSeverity;
  priority: TestPriority;
  execution_type: TestExecutionType;
  preconditions?: string;
  test_steps: TestCaseStep[];
  expected_result: string;
  suite_name?: string;
  defect_task_code?: string;
  defect_title?: string;
  defect_priority?: string;
  defect_status_name?: string;
  defect_status_color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReleaseChecklistItem {
  id: string;
  checklist_id: string;
  item_code: string;
  gate_category: ReleaseGateCategory;
  title: string;
  description?: string;
  status: ReleaseGateItemStatus;
  is_mandatory: boolean;
  verified_by_user_id?: string;
  verified_by_name?: string;
  verified_at?: string;
  evidence_notes?: string;
  waived_reason?: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReleaseReadinessChecklist {
  id: string;
  checklist_code: string;
  entity_type: 'PRODUCT' | 'PROJECT';
  product_id?: string;
  project_id?: string;
  version_id?: string;
  milestone_id?: string;
  title: string;
  overall_status: ReleaseOverallStatus;
  target_release_date?: string;
  lead_qa_user_id?: string;
  signoff_pm_user_id?: string;
  signed_off_at?: string;
  signoff_notes?: string;
  exceptions_notes?: string;
  project_name?: string;
  product_name?: string;
  version_name?: string;
  milestone_name?: string;
  lead_qa_name?: string;
  signoff_pm_name?: string;
  total_items_count?: number;
  passed_items_count?: number;
  failed_items_count?: number;
  waived_items_count?: number;
  pending_items_count?: number;
  items?: ReleaseChecklistItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TraceabilityItem {
  test_case_id: string;
  case_code: string;
  case_title: string;
  severity: TestSeverity;
  priority: TestPriority;
  execution_type: TestExecutionType;
  suite_id: string;
  suite_code: string;
  suite_name: string;
  project_name?: string;
  product_name?: string;
  requirement_criterion_id?: string;
  criterion_code?: string;
  criterion_title?: string;
  latest_status?: TestRunItemStatus;
  latest_executed_at?: string;
  latest_run_code?: string;
  linked_defect_code?: string;
  linked_defect_title?: string;
  defect_status_name?: string;
  defect_status_color?: string;
}

export interface TraceabilitySummary {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  pendingCases: number;
  linkedDefectsCount: number;
  coveragePercentage: number;
}// ==========================================
// 24. Versioned Knowledge Base, Decision Docs & Specs (COLLAB-001)
// ==========================================

export type KnowledgeCategory =
  | 'SPECIFICATION'
  | 'ARCHITECTURE_DECISION'
  | 'RUNBOOK'
  | 'MEETING_NOTES'
  | 'RELEASE_NOTES'
  | 'USER_GUIDE'
  | 'POLICY';

export type KnowledgeEntityType = 'GLOBAL' | 'PRODUCT' | 'PROJECT';
export type KnowledgeAudience = 'INTERNAL_ONLY' | 'CLIENT_VISIBLE' | 'PRODUCT_COMMUNITY';
export type KnowledgeDocStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SUPERSEDED' | 'ARCHIVED';
export type DecisionOutcome = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'DEPRECATED' | 'SUPERSEDED';

export type KnowledgeLinkedEntityType =
  | 'TASK'
  | 'VERSION'
  | 'MILESTONE'
  | 'REQUIREMENT_CRITERION'
  | 'CHANGE_REQUEST';

export interface KnowledgeDocumentRevision {
  id: string;
  document_id: string;
  revision_number: number;
  title: string;
  content_markdown: string;
  change_summary?: string;
  author_user_id?: string;
  author_name?: string;
  author_email?: string;
  created_at: string;
  updated_at?: string;
}

export interface KnowledgeDocumentLink {
  id: string;
  document_id: string;
  linked_entity_type: KnowledgeLinkedEntityType;
  linked_entity_id: string;
  linked_entity_label?: string;
  link_notes?: string;
  created_at: string;
}

export interface KnowledgeDocumentAttachment {
  id: string;
  document_id: string;
  revision_number: number;
  file_name: string;
  s3_key: string;
  s3_bucket: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  document_code: string;
  title: string;
  slug: string;
  category: KnowledgeCategory;
  entity_type: KnowledgeEntityType;
  product_id?: string;
  project_id?: string;
  component_id?: string;
  audience: KnowledgeAudience;
  current_version: number;
  status: KnowledgeDocStatus;
  decision_outcome?: DecisionOutcome;
  superseded_by_document_id?: string;
  superseded_by_title?: string;
  superseded_by_code?: string;
  owner_user_id?: string;
  owner_name?: string;
  owner_email?: string;
  tags: string[];
  product_name?: string;
  project_name?: string;
  component_name?: string;
  revision_count?: number;
  links_count?: number;
  attachments_count?: number;
  latest_revision?: KnowledgeDocumentRevision;
  revisions?: KnowledgeDocumentRevision[];
  links?: KnowledgeDocumentLink[];
  attachments?: KnowledgeDocumentAttachment[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========================================================
// COLLAB-002: Project/Task Templates & Recurring Work
// ========================================================

export type ProjectTemplateCategory =
  | 'CLIENT_ONBOARDING'
  | 'FIXED_PRICE_DELIVERY'
  | 'MAINTENANCE_RETAINER'
  | 'SECURITY_AUDIT'
  | 'RELEASE_CHECKLIST'
  | 'INTERNAL_INITIATIVE'
  | 'CUSTOM';

export interface MilestoneTemplateItem {
  name: string;
  description?: string;
  target_offset_days?: number;
  display_order?: number;
}

export interface ProjectTemplate {
  id: string;
  template_code: string;
  template_name: string;
  description?: string;
  category: ProjectTemplateCategory;
  target_engagement_model: string;
  default_estimated_duration_days: number;
  milestone_templates: MilestoneTemplateItem[];
  task_templates_count?: number;
  task_templates?: TaskTemplate[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskTemplatePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskTemplateHierarchyLevel = 'EPIC' | 'TASK' | 'SUBTASK';

export interface ChecklistTemplateItem {
  item: string;
  is_required?: boolean;
}

export interface TaskTemplate {
  id: string;
  project_template_id?: string;
  project_template_name?: string;
  task_template_code: string;
  title: string;
  description?: string;
  task_type_id?: string;
  priority: TaskTemplatePriority;
  hierarchy_level: TaskTemplateHierarchyLevel;
  parent_task_template_id?: string;
  start_offset_days: number;
  duration_days: number;
  estimated_hours: number;
  default_role_code?: string;
  checklists_template: ChecklistTemplateItem[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RecurrenceFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY';

export interface RecurringWorkRule {
  id: string;
  rule_code: string;
  title: string;
  description?: string;
  product_id?: string;
  product_name?: string;
  project_id?: string;
  project_name?: string;
  task_template_id?: string;
  task_template_title?: string;
  frequency: RecurrenceFrequency;
  interval_count: number;
  day_of_month?: number;
  day_of_week?: number;
  month_of_year?: number;
  next_run_date: string;
  end_date?: string;
  max_occurrences?: number;
  total_occurrences_count: number;
  executed_occurrences_count?: number;
  default_assignee_user_id?: string;
  default_assignee_name?: string;
  default_priority: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringTaskOccurrence {
  id: string;
  rule_id: string;
  scheduled_date: string;
  executed_at: string;
  generated_task_id: string;
  task_code?: string;
  task_title?: string;
  priority?: string;
  status_name?: string;
  execution_status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error_message?: string;
  created_at: string;
}


// ==========================================
// PROD-002: Product Goals & Outcome Reviews
// ==========================================

export type ProductGoalCategory =
  | 'ADOPTION'
  | 'PERFORMANCE'
  | 'REVENUE_GROWTH'
  | 'QUALITY_RELIABILITY'
  | 'USER_SATISFACTION'
  | 'STRATEGIC';

export type ProductGoalStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'ACHIEVED'
  | 'MISSED'
  | 'ABANDONED';

export type OutcomeVerdict =
  | 'MET_EXPECTATIONS'
  | 'EXCEEDED_EXPECTATIONS'
  | 'BELOW_EXPECTATIONS'
  | 'INCONCLUSIVE';

export interface ProductGoal {
  id: string;
  goal_code: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  title: string;
  description?: string;
  category: ProductGoalCategory;
  metric_name: string;
  metric_unit: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  target_date: string;
  owner_user_id?: string;
  owner_name?: string;
  owner_email?: string;
  status: ProductGoalStatus;
  progress_percentage?: number;
  reviews_count?: number;
  latest_review?: {
    review_code: string;
    review_date: string;
    outcome_verdict: OutcomeVerdict;
    actual_metric_value?: number;
  };
  outcome_reviews?: ProductOutcomeReview[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductOutcomeReview {
  id: string;
  review_code: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  goal_id?: string;
  goal_code?: string;
  goal_title?: string;
  metric_name?: string;
  metric_unit?: string;
  target_value?: number;
  baseline_value?: number;
  version_id?: string;
  version_code?: string;
  version_name?: string;
  idea_id?: string;
  idea_code?: string;
  idea_title?: string;
  review_title: string;
  review_date: string;
  reviewer_user_id?: string;
  reviewer_name?: string;
  reviewer_email?: string;
  actual_metric_value?: number;
  outcome_verdict: OutcomeVerdict;
  adoption_observations?: string;
  customer_evidence?: string;
  feedback_summary?: string;
  learnings_and_next_steps?: string;
  reconciled_allowance_used?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductGoalsSummary {
  goals: {
    total_goals: number;
    achieved_count: number;
    in_progress_count: number;
    missed_count: number;
    draft_count: number;
    abandoned_count: number;
    adoption_count: number;
    performance_count: number;
    revenue_count: number;
    quality_count: number;
    satisfaction_count: number;
  };
  reviews: {
    total_reviews: number;
    exceeded_count: number;
    met_count: number;
    below_count: number;
    inconclusive_count: number;
    total_reconciled_allowance: number;
  };
}

// ==========================================
// QA-002: Scoped Environments & Issue Verification
// ==========================================

export type QaEnvironmentType =
  | 'INTERNAL_QA'
  | 'DEV'
  | 'STAGING'
  | 'CLIENT_UAT'
  | 'CLIENT_PRODUCTION'
  | 'ON_PREMISE_CLIENT';

export type QaScopeType = 'GLOBAL' | 'PRODUCT' | 'PROJECT' | 'CLIENT';

export type IssueObservationType =
  | 'FOUND_REPRODUCED'
  | 'FIX_AVAILABLE'
  | 'READY_FOR_RETEST'
  | 'PASSED'
  | 'FAILED'
  | 'CANNOT_REPRODUCE'
  | 'BLOCKED';

export interface QaEnvironment {
  id: string;
  env_code: string;
  env_name: string;
  env_type: QaEnvironmentType;
  scope_type: QaScopeType;
  product_id?: string;
  product_name?: string;
  project_id?: string;
  project_name?: string;
  client_id?: string;
  client_name?: string;
  region?: string;
  description?: string;
  context_metadata?: Record<string, any>;
  observations_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IssueEnvironmentObservation {
  id: string;
  observation_code: string;
  task_id: string;
  task_code?: string;
  task_title?: string;
  environment_id: string;
  env_code?: string;
  env_name?: string;
  env_type?: QaEnvironmentType;
  env_region?: string;
  client_name?: string;
  version_id: string;
  version_code?: string;
  version_name?: string;
  observation_type: IssueObservationType;
  observed_at: string;
  tester_user_id?: string;
  tester_name?: string;
  tester_email?: string;
  client_contact_id?: string;
  client_contact_name?: string;
  browser_info?: string;
  os_info?: string;
  device_info?: string;
  build_label?: string;
  evidence_notes?: string;
  attachment_url?: string;
  is_client_visible: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskEnvironmentMatrixResponse {
  task: {
    id: string;
    task_code: string;
    title: string;
    priority: string;
    status_name?: string;
    task_version_code?: string;
    product_name?: string;
    project_name?: string;
  };
  matrix: IssueEnvironmentObservation[];
  evaluationSummary: {
    hasPassedInternalQa: boolean;
    hasFailingClientUat: boolean;
    hasUnresolvedOlderVersion: boolean;
    isFullyResolvedAcrossAllEnvironments: boolean;
  };
}

// ========================================================
// COMM-001: Retainer & AMC Entitlements
// ========================================================

export type CommercialContractType = 'RETAINER' | 'AMC' | 'TIME_AND_MATERIALS_CAP' | 'FIXED_HOURS_BUCKET';
export type CommercialPeriodicity = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'CUSTOM';
export type CommercialRolloverRule = 'NO_ROLLOVER' | 'FULL_ROLLOVER' | 'CAPPED_ROLLOVER' | 'EXPIRE_AFTER_N_PERIODS';
export type CommercialContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'PENDING_RENEWAL' | 'SUSPENDED' | 'TERMINATED';
export type ContractPeriodStatus = 'UPCOMING' | 'OPEN' | 'CLOSED' | 'RECONCILED';
export type OverageRequestStatus = 'PENDING_CLIENT_APPROVAL' | 'APPROVED' | 'REJECTED' | 'WAIVED';

export interface CommercialContract {
  id: string;
  contract_number: string;
  client_id: string;
  client_name?: string;
  client_code?: string;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  product_id?: string;
  product_name?: string;
  product_code?: string;
  title: string;
  contract_type: CommercialContractType;
  periodicity: CommercialPeriodicity;
  included_hours_per_period: number;
  hourly_rate: number;
  overage_hourly_rate: number;
  currency: string;
  rollover_rule: CommercialRolloverRule;
  max_rollover_hours: number;
  rollover_expiry_periods: number;
  start_date: string;
  end_date: string;
  status: CommercialContractStatus;
  accountable_pm_user_id?: string;
  accountable_pm_name?: string;
  terms_and_conditions?: string;
  notes?: string;
  current_period?: Partial<ContractPeriod>;
  total_periods_count?: number;
  periods?: ContractPeriod[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractPeriod {
  id: string;
  contract_id: string;
  contract_number?: string;
  contract_title?: string;
  contract_type?: CommercialContractType;
  rollover_rule?: CommercialRolloverRule;
  max_rollover_hours?: number;
  client_id?: string;
  client_name?: string;
  project_id?: string;
  project_name?: string;
  product_id?: string;
  product_name?: string;
  period_code: string;
  period_sequence: number;
  start_date: string;
  end_date: string;
  included_hours: number;
  rolled_over_hours_in: number;
  total_allowance_hours: number;
  approved_consumed_hours: number;
  remaining_allowance_hours: number;
  overage_hours: number;
  rolled_over_hours_out: number;
  hourly_rate: number;
  overage_hourly_rate: number;
  currency: string;
  status: ContractPeriodStatus;
  closed_at?: string;
  closed_by?: string;
  closed_by_user_name?: string;
  reconciled_notes?: string;
  consumed_worklogs_count?: number;
  overage_requests_count?: number;
  consumptions?: ContractWorklogConsumption[];
  overage_requests?: ContractOverageRequest[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractWorklogConsumption {
  id: string;
  contract_period_id: string;
  time_log_id: string;
  hours_consumed: number;
  is_overage: boolean;
  consumed_at: string;
  log_date?: string;
  worklog_hours?: number;
  worklog_description?: string;
  approval_status?: string;
  task_code?: string;
  task_title?: string;
  task_type_name?: string;
  logged_by_user_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractOverageRequest {
  id: string;
  request_code: string;
  contract_period_id: string;
  change_request_id?: string;
  cr_number?: string;
  cr_title?: string;
  requested_overage_hours: number;
  estimated_amount: number;
  currency: string;
  justification: string;
  status: OverageRequestStatus;
  approved_hours: number;
  approved_by_contact_id?: string;
  approved_by_contact_name?: string;
  approved_at?: string;
  client_remarks?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientStatementResponse {
  statementDate: string;
  contract: {
    id: string;
    contractNumber: string;
    title: string;
    contractType: CommercialContractType;
    periodicity: CommercialPeriodicity;
    clientName: string;
    projectName?: string;
    productName?: string;
    currency: string;
    hourlyRate: number;
    overageHourlyRate: number;
    rolloverRule: CommercialRolloverRule;
    maxRolloverHours: number;
  };
  period: {
    id: string;
    periodCode: string;
    periodSequence: number;
    startDate: string;
    endDate: string;
    status: ContractPeriodStatus;
    includedHours: number;
    rolledOverHoursIn: number;
    totalAllowanceHours: number;
    approvedConsumedHours: number;
    remainingAllowanceHours: number;
    overageHours: number;
    rolledOverHoursOut: number;
  };
  summary: {
    allowanceBurnPercentage: number;
    authorizedOverageHours: number;
    isOveragePresent: boolean;
  };
  approvedUsage: Array<{
    consumptionId: string;
    date: string;
    taskCode: string;
    taskTitle: string;
    taskType: string;
    hoursConsumed: number;
    isOverage: boolean;
    workDescription: string;
    approvalStatus: string;
    consumedAt: string;
  }>;
  overageAuthorizations: Array<{
    requestId: string;
    requestCode: string;
    crNumber?: string;
    requestedHours: number;
    approvedHours: number;
    status: OverageRequestStatus;
    estimatedAmount: number;
    currency: string;
    justification: string;
    clientRemarks?: string;
    approvedAt?: string;
  }>;
}

// ==========================================
// DATA-001: Data Exchange & Portable Imports / Exports
// ==========================================

export type ImportEntityType = 'TASKS' | 'REQUIREMENTS' | 'TEST_CASES' | 'CLIENT_REQUESTS' | 'RAID_ITEMS';
export type ImportMode = 'CREATE_ONLY' | 'UPDATE_ONLY' | 'UPSERT';
export type ImportBatchStatus = 'PREVIEW_READY' | 'VALIDATED' | 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_FAILED' | 'FAILED';
export type RowOutcomeStatus = 'VALID' | 'INVALID' | 'CREATED' | 'UPDATED' | 'SKIPPED' | 'FAILED';

export interface DataImportRowOutcome {
  id: string;
  batch_id: string;
  row_index: number;
  external_id?: string;
  raw_payload?: Record<string, any>;
  mapped_payload?: Record<string, any>;
  outcome_status: RowOutcomeStatus;
  target_record_id?: string;
  target_record_code?: string;
  action_performed?: string;
  validation_errors?: Array<{ field: string; message: string; code: string }>;
  execution_error?: string;
  is_retried: boolean;
  retried_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DataImportBatch {
  id: string;
  batch_number: string;
  entity_type: ImportEntityType;
  import_mode: ImportMode;
  status: ImportBatchStatus;
  original_file_name: string;
  total_rows: number;
  preview_valid_count: number;
  preview_error_count: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  column_mapping?: Record<string, string>;
  error_summary?: Array<{ rowIndex: number; externalId?: string; errors: Array<{ field: string; message: string; code: string }> }>;
  executed_by_id: string;
  executed_by_name?: string;
  created_by_name?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  row_outcomes?: DataImportRowOutcome[];
}

export interface DataImportPreviewResponse {
  batchId: string;
  batchNumber: string;
  entityType: ImportEntityType;
  importMode: ImportMode;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  columnMapping: Record<string, string>;
  detectedHeaders: string[];
  templateHeaders: string[];
  previewRows: Array<{
    rowIndex: number;
    externalId?: string;
    isValid: boolean;
    errors: Array<{ field: string; message: string; code: string }>;
    mappedData: Record<string, any>;
    rawRow: Record<string, any>;
  }>;
}

export interface DataExportQuery {
  entityType: ImportEntityType;
  projectId?: string;
  productId?: string;
  format?: 'csv' | 'json';
  fromDate?: string;
  toDate?: string;
}

// ==========================================
// ANALYTICS-001: Contractual SLA & Risk Alerts
// ==========================================

export type SlaTier = 'TIER_1_CRITICAL' | 'TIER_2_HIGH' | 'TIER_3_STANDARD' | 'TIER_4_BASIC';
export type SlaTimeBasis = 'BUSINESS_HOURS' | 'ELAPSED_HOURS';
export type SlaCycleStatus =
  | 'RUNNING'
  | 'PAUSED'
  | 'RESPONSE_MET'
  | 'RESPONSE_BREACHED'
  | 'RESOLVED_MET'
  | 'RESOLVED_BREACHED'
  | 'CANCELLED';
export type SlaResponseStatus = 'PENDING' | 'MET' | 'BREACHED';

export interface SlaPolicy {
  id: string;
  policy_code: string;
  policy_name: string;
  description?: string;
  client_id?: string;
  client_name?: string;
  project_id?: string;
  project_name?: string;
  task_type_id?: string;
  task_type_name?: string;
  priority?: string;
  severity?: string;
  tier: SlaTier;
  calendar_id?: string;
  calendar_name?: string;
  response_time_minutes: number;
  response_time_basis: SlaTimeBasis;
  resolution_time_minutes: number;
  resolution_time_basis: SlaTimeBasis;
  response_warning_threshold_pct: number;
  resolution_warning_threshold_pct: number;
  escalation_rules?: any[];
  precedence_rank: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlaTrackingCycle {
  id: string;
  cycle_number: string;
  task_id?: string;
  task_code?: string;
  task_title?: string;
  client_request_id?: string;
  sla_policy_id: string;
  policy_name?: string;
  tier?: string;
  project_name?: string;
  cycle_iteration: number;
  policy_snapshot: any;
  calendar_snapshot: any;
  status: SlaCycleStatus;
  response_deadline: string;
  responded_at?: string;
  responded_by_user_id?: string;
  responded_by_name?: string;
  response_status: SlaResponseStatus;
  elapsed_response_minutes: number;
  business_response_minutes: number;
  resolution_deadline: string;
  resolved_at?: string;
  resolved_by_user_id?: string;
  resolved_by_name?: string;
  resolution_status: SlaResponseStatus;
  elapsed_resolution_minutes: number;
  business_resolution_minutes: number;
  is_paused: boolean;
  current_pause_started_at?: string;
  current_pause_reason?: string;
  total_paused_minutes: number;
  pause_episodes: any[];
  original_resolution_deadline: string;
  extension_count: number;
  extension_history: any[];
  change_request_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiskAlert {
  id: string;
  alert_code: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sla_cycle_id?: string;
  task_id?: string;
  task_code?: string;
  task_title?: string;
  project_id?: string;
  project_name?: string;
  client_id?: string;
  client_name?: string;
  title: string;
  description: string;
  trigger_reason: string;
  recommended_action: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED' | 'AUTO_CLEARED';
  escalation_tier: number;
  assigned_owner_id?: string;
  owner_name?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  freshness_updated_at: string;
  created_at: string;
}

export interface SlaDashboardResponse {
  summary: {
    totalCycles: number;
    runningCycles: number;
    pausedCycles: number;
    overallComplianceRate: number;
    responseComplianceRate: number;
    resolutionComplianceRate: number;
    avgResponseMinutes: number;
    avgResolutionMinutes: number;
  };
  alerts: {
    totalActive: number;
    critical: number;
    high: number;
    medium: number;
    responseAlerts: number;
    resolutionAlerts: number;
    staleWorkAlerts: number;
  };
}

// ==========================================
// ANALYTICS-002: Flow Analytics & WIP Limits
// ==========================================

export interface WipLimit {
  id: string;
  limit_code: string;
  name: string;
  description?: string;
  limit_type: 'STAGE' | 'USER' | 'TEAM' | 'PROJECT';
  project_id?: string;
  project_name?: string;
  team_id?: string;
  team_name?: string;
  user_id?: string;
  user_name?: string;
  status_id?: string;
  status_name?: string;
  status_category?: string;
  max_wip_count: number;
  enforcement_mode: 'SOFT_WARNING' | 'HARD_GUARD';
  is_active: boolean;
  created_at: string;
}

export interface WipOverrideException {
  id: string;
  exception_code: string;
  wip_limit_id?: string;
  limit_name?: string;
  limit_type?: string;
  task_id: string;
  task_code: string;
  task_title: string;
  user_id?: string;
  user_name?: string;
  project_id?: string;
  project_name?: string;
  current_wip_count: number;
  limit_value: number;
  reason: string;
  is_expedited: boolean;
  authorized_by: string;
  authorized_by_name: string;
  authorized_at: string;
  expires_at?: string;
  created_at: string;
}

export interface WipStageColumn {
  status_id: string;
  status_code: string;
  status_name: string;
  status_category: string;
  sequence_order: number;
  total_tasks: number;
  blocked_overlay_count: number;
  max_wip_limit: number;
  enforcement_mode?: 'SOFT_WARNING' | 'HARD_GUARD';
}

export interface WipAssigneeRow {
  user_id: string;
  full_name: string;
  email: string;
  primary_active_wip: number;
  collaborator_active_wip: number;
  blocked_primary_count: number;
  max_wip_limit: number;
  enforcement_mode?: 'SOFT_WARNING' | 'HARD_GUARD';
}

export interface WipBoardResponse {
  stages: WipStageColumn[];
  assignees: WipAssigneeRow[];
  timestamp: string;
}

export interface OperationalAgingItem {
  taskId: string;
  taskCode: string;
  title: string;
  priority: string;
  statusName: string;
  statusCategory: string;
  projectName?: string;
  primaryAssignee: string;
  isBlocked: boolean;
  totalItemAgeHours: number;
  currentStatusTenureHours: number;
  primaryOwnerTenureHours: number;
  blockedAgeHours: number;
  queueWaitingAgeHours: number;
  warningThresholdHours: number;
  criticalThresholdHours: number;
  agingSeverity: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface OperationalAgingResponse {
  summary: {
    totalActiveTasks: number;
    normalCount: number;
    warningCount: number;
    criticalCount: number;
    averageTenureHours: number;
  };
  items: OperationalAgingItem[];
  notice: string;
}

export interface FlowTimePartitionResponse {
  partitionValidation: {
    activeMinutes: number;
    waitingMinutes: number;
    unclassifiedMinutes: number;
    totalCycleTimeMinutes: number;
    isPartitionExact: boolean;
  };
  durationsHours: {
    activeHours: number;
    waitingHours: number;
    unclassifiedHours: number;
    totalCycleTimeHours: number;
  };
  flowEfficiencyPercent: number;
  waitingBreakdown: Record<
    string,
    { elapsedMinutes: number; businessMinutes: number; count: number }
  >;
  standardNotice: string;
}

export interface CycleTimeMetricsResponse {
  sampleSize: number;
  cancelledCount: number;
  leadTime: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p85: number;
    p95: number;
  };
  cycleTime: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p85: number;
    p95: number;
  };
  qualityMetrics: {
    firstTimeRightCount: number;
    reworkCount: number;
    firstTimeRightRatePercent: number;
  };
  scatterPoints: Array<{
    taskId: string;
    taskCode: string;
    title: string;
    leadTimeHours: number;
    cycleTimeHours: number;
    storyPoints: number;
    hasRework: boolean;
  }>;
  disclosure: string;
}

export interface CfdDataPoint {
  date: string;
  TODO: number;
  IN_PROGRESS: number;
  REVIEW_TEST: number;
  DONE: number;
  CANCELLED: number;
}

export interface DwellTimeStage {
  statusId: string;
  statusCode: string;
  statusName: string;
  statusCategory: string;
  sampleSize: number;
  avgDwellHours: number;
  avgBusinessDwellHours: number;
  maxDwellHours: number;
  isBottleneck: boolean;
}

export interface DwellTimeResponse {
  stages: DwellTimeStage[];
  timestamp: string;
}

export interface FlowAgingConfig {
  id: string;
  config_code: string;
  name: string;
  description?: string;
  project_id?: string;
  project_name?: string;
  team_id?: string;
  team_name?: string;
  task_type_id?: string;
  type_name?: string;
  priority?: string;
  status_id?: string;
  status_name?: string;
  warning_threshold_hours: number;
  critical_threshold_hours: number;
  time_basis: 'BUSINESS_HOURS' | 'ELAPSED_HOURS';
  calendar_id?: string;
  precedence_rank: number;
  is_active: boolean;
  created_at: string;
}

// ==========================================
// ANALYTICS-003: Delivery, Workload and Capacity Insights
// ==========================================

export interface Skill {
  id: string;
  skill_code: string;
  name: string;
  category: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  user_count?: number;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  skill_name: string;
  skill_code: string;
  category: string;
  proficiency_level: number;
  years_of_experience?: number;
  is_certified: boolean;
  last_used_date?: string;
  notes?: string;
  created_at: string;
}

export interface TaskRequiredSkill {
  id: string;
  task_id: string;
  skill_id: string;
  skill_name: string;
  skill_code: string;
  category: string;
  minimum_proficiency: number;
  is_mandatory: boolean;
  created_at: string;
}

export interface CapacityReservation {
  id: string;
  reservation_code: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  reservation_type: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  daily_hours: number;
  total_reserved_hours: number;
  is_recurring: boolean;
  recurrence_pattern?: string;
  approved_by?: string;
  approver_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface CapacityWorkloadMember {
  userId: string;
  userName: string;
  userEmail: string;
  branchName?: string;
  departmentName?: string;
  roleName?: string;
  timezone?: string;
  baseWorkingHours: number;
  reservedOverheadHours: number;
  netAvailableHours: number;
  committedAllocationPercent: number;
  activeAssignedTasksCount: number;
  activeTaskDemandHours: number;
  demandUtilizationPercent: number;
  status: 'UNDER_ALLOCATED' | 'BALANCED' | 'NEAR_CAPACITY' | 'OVERALLOCATED';
  statusColor: string;
  skills: Array<{
    skill_id: string;
    skill_name: string;
    proficiency_level: number;
  }>;
  reservations: Array<{
    id: string;
    title: string;
    reservation_type: string;
    daily_hours: number;
  }>;
  assignedTasks: Array<{
    taskId: string;
    taskCode: string;
    title: string;
    status: string;
    totalRemainingHours: number;
    userEffortSharePercent: number;
    userDemandHours: number;
  }>;
}

export interface CapacityWorkloadResponse {
  startDate: string;
  endDate: string;
  totalMembers: number;
  summary: {
    totalBaseHours: number;
    totalReservedHours: number;
    totalNetAvailableHours: number;
    totalActiveDemandHours: number;
    overallUtilizationPercent: number;
    membersOverallocated: number;
    membersNearCapacity: number;
    membersBalanced: number;
    membersUnderallocated: number;
  };
  members: CapacityWorkloadMember[];
}

export interface SkillSuggestionCandidate {
  userId: string;
  userName: string;
  userEmail: string;
  departmentName?: string;
  branchName?: string;
  timezone?: string;
  totalFitScore: number;
  skillMatchScore: number;
  availabilityScore: number;
  timezoneScore: number;
  netAvailableHours: number;
  activeTaskDemandHours: number;
  demandUtilizationPercent: number;
  skillsMatched: Array<{
    skillName: string;
    requiredProficiency: number;
    actualProficiency: number;
    isMandatory: boolean;
  }>;
  missingMandatorySkills: string[];
  explanation: string;
}

export interface SkillSuggestionsResponse {
  taskId: string;
  taskCode: string;
  taskTitle: string;
  remainingHours: number;
  requiredSkills: Array<{
    skillId: string;
    skillName: string;
    minimumProficiency: number;
    isMandatory: boolean;
  }>;
  candidates: SkillSuggestionCandidate[];
}

export interface TeamEstimationMetricsResponse {
  teamId?: string;
  projectId?: string;
  sprintId?: string;
  summary: {
    totalTasksAnalyzed: number;
    totalEstimatedHours: number;
    totalActualHours: number;
    estimationAccuracyIndex: number;
    estimationBias: 'OVER_ESTIMATING' | 'UNDER_ESTIMATING' | 'BALANCED';
    estimationBiasPercentage: number;
    onTimeDeliveryRatePercent: number;
    firstTimeRightRatePercent: number;
    reworkTaskCount: number;
    completedTaskCount: number;
  };
  trends: Array<{
    period: string;
    tasksCount: number;
    estimatedHours: number;
    actualHours: number;
    eai: number;
    onTimeDeliveryRate: number;
  }>;
  historicalSnapshots: any[];
  disclosure: string;
}

// ==========================================
// ANALYTICS-004: Project Financials, Variance & Reconciliation
// ==========================================

export interface ProjectFinancialRateCard {
  id: string;
  rate_code: string;
  project_id?: string;
  project_name?: string;
  role_id?: string;
  desig_name?: string;
  user_id?: string;
  user_name?: string;
  currency: string;
  hourly_billing_rate: number;
  hourly_cost_rate?: number | null;
  effective_start_date: string;
  effective_end_date?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ProjectFinancialBaseline {
  id: string;
  baseline_code: string;
  project_id: string;
  name: string;
  description?: string;
  baseline_date: string;
  budgeted_hours: number;
  budgeted_cost?: number | null;
  budgeted_revenue: number;
  currency: string;
  scope_tasks_count: number;
  scope_story_points: number;
  warning_threshold_pct: number;
  critical_threshold_pct: number;
  is_frozen: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ProjectFinancialPeriodicMetric {
  id: string;
  project_id: string;
  baseline_id?: string;
  period_label: string;
  period_start: string;
  period_end: string;
  budgeted_hours: number;
  actual_logged_hours: number;
  approved_billable_hours: number;
  unapproved_draft_hours: number;
  remaining_hours: number;
  eac_hours: number;
  effort_variance_hours: number;
  budget_consumption_pct: number;
  total_recognized_revenue: number;
  total_direct_cost?: number | null;
  direct_contribution?: number | null;
  contribution_margin_pct?: number | null;
  burn_rate_hours_per_week: number;
  projected_completion_date?: string;
  currency: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface CurrencyExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  effective_date: string;
  source?: string;
  is_active: boolean;
  created_at: string;
}

export interface ProjectFinancialOverview {
  project: {
    id: string;
    projectCode: string;
    projectName: string;
    clientName?: string;
    billingType: string;
    currency: string;
    status: string;
  };
  baseline: {
    id: string;
    baselineCode: string;
    name: string;
    baselineDate: string;
    budgetedHours: number;
    budgetedRevenue: number;
    budgetedCost?: number | null;
    warningThresholdPct: number;
    criticalThresholdPct: number;
    isFrozen: boolean;
  } | null;
  effortMetrics: {
    budgetedHours: number;
    totalBaselineEstimatedHours: number;
    totalCurrentEstimatedHours: number;
    actualLoggedHours: number;
    approvedBillableHours: number;
    approvedNonBillableHours: number;
    unapprovedDraftHours: number;
    remainingHours: number;
    eacHours: number;
    effortVarianceHours: number;
    budgetConsumptionPct: number | null;
    eacVarianceHours: number | null;
    thresholdStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OVERRUN';
    totalTasksCount: number;
    completedTasksCount: number;
    worklogEntriesCount: number;
  };
  financialMetrics: {
    totalRecognizedRevenue: number;
    totalDirectCost: number | null;
    directContribution: number | null;
    contributionMarginPct: number | null;
    currency: string;
    isCostRedacted: boolean;
  };
  burnCurve: Array<{
    date: string;
    weeklyHours: number;
    cumulativeActualHours: number;
    approvedHours: number;
  }>;
  disclosure: string;
}

// ========================================================
// LATER-001: Advanced Scheduling, CPM, What-If Scenarios & Calibrated Composite Health
// ========================================================

export interface CPMTaskNode {
  taskId: string;
  taskCode: string;
  title: string;
  durationHours: number;
  durationDays: number;
  startDate: string | null;
  dueDate: string | null;
  priority: string;
  predecessors: Array<{
    sourceTaskId: string;
    linkType: string;
    lagHours: number;
  }>;
  successors: Array<{
    targetTaskId: string;
    linkType: string;
    lagHours: number;
  }>;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  totalSlack: number;
  freeSlack: number;
  isCritical: boolean;
}

export interface CPMAnalysisResult {
  criticalPathLengthHours: number;
  projectDurationDays: number;
  criticalTasksCount: number;
  totalTasksCount: number;
  nodes: CPMTaskNode[];
  criticalChain: string[];
}

export interface ScheduleScenario {
  id: string;
  project_id: string;
  project_name?: string;
  scenario_code: string;
  name: string;
  description?: string;
  scenario_type: 'DATE_SHIFT' | 'CAPACITY_REDUCTION' | 'SCOPE_EXPANSION' | 'PRIORITY_RESHUFFLE' | 'CRITICAL_PATH_OPTIMIZATION' | 'CUSTOM';
  status: 'DRAFT' | 'SIMULATED' | 'APPLIED' | 'ARCHIVED';
  baseline_end_date?: string;
  simulated_end_date?: string;
  critical_path_length_hours: number;
  schedule_variance_days: number;
  impacted_tasks_count: number;
  simulation_summary?: {
    critical_path_tasks?: string[];
    critical_path_length_hours?: number;
    project_duration_days?: number;
    total_tasks_count?: number;
    critical_tasks_count?: number;
    total_float_gain_hours?: number;
  };
  applied_at?: string;
  applied_by?: string;
  applied_by_name?: string;
  created_at: string;
  updated_at: string;
  overrides?: ScheduleScenarioOverride[];
}

export interface ScheduleScenarioOverride {
  id: string;
  scenario_id: string;
  task_id: string;
  task_code?: string;
  title?: string;
  original_estimated_hours?: number;
  original_start_date?: string;
  original_due_date?: string;
  original_priority?: string;
  simulated_start_date?: string;
  simulated_due_date?: string;
  simulated_estimated_hours?: number;
  simulated_priority?: string;
  earliest_start_date?: string;
  earliest_finish_date?: string;
  latest_start_date?: string;
  latest_finish_date?: string;
  total_slack_hours: number;
  free_slack_hours: number;
  is_critical_path: boolean;
  notes?: string;
}

export interface ProjectHealthConfig {
  id?: string;
  project_id?: string;
  weight_schedule: number;
  weight_scope: number;
  weight_quality: number;
  weight_blockers: number;
  weight_budget_flow: number;
  schedule_slip_warning_days: number;
  schedule_slip_critical_days: number;
  defect_density_critical_ratio: number;
  blocker_age_critical_hours: number;
  missing_data_strategy: 'NEUTRAL_SCORE' | 'EXCLUDE_DIMENSION' | 'STRICT_PENALTY';
}

export interface ProjectHealthEvaluation {
  projectId: string;
  compositeScore: number;
  computedState: 'GREEN' | 'AMBER' | 'RED';
  effectiveState: 'GREEN' | 'AMBER' | 'RED';
  isOverridden: boolean;
  activeOverride?: {
    manual_override_state: 'GREEN' | 'AMBER' | 'RED';
    override_reason: string;
    overridden_at: string;
    overridden_by_name?: string;
  } | null;
  dimensionScores: {
    schedule: number;
    scope: number;
    quality: number;
    blockers: number;
    budgetFlow: number;
  };
  dimensionDetails: {
    schedule: { score: number; weight: number; maxSlipDays: number; overdueTasks: number; totalTasks: number };
    scope: { score: number; weight: number; crCount: number };
    quality: { score: number; weight: number; openBugs: number; activeWork: number; defectRatio: number };
    blockers: { score: number; weight: number; activeBlockers: number; maxBlockerAgeHours: number };
    budgetFlow: { score: number; weight: number; budgetConsumptionPct: number };
  };
  config: ProjectHealthConfig;
}

export interface WebhookSubscription {
  id: string;
  subscription_code: string;
  name: string;
  target_url: string;
  masked_secret: string;
  raw_secret_key?: string;
  secret_rotated_at?: string;
  event_types: string[];
  scope_project_ids?: string[];
  is_enabled: boolean;
  max_retries: number;
  timeout_seconds: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  stats?: {
    total_deliveries: string | number;
    successful_deliveries: string | number;
    failed_deliveries: string | number;
    retrying_deliveries: string | number;
    last_delivered_at?: string;
  };
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  subscription_name?: string;
  subscription_code?: string;
  event_id: string;
  event_type: string;
  payload: any;
  destination_url: string;
  attempt_number: number;
  max_attempts: number;
  status: 'PENDING' | 'SUCCESS' | 'RETRYING' | 'FAILED' | 'MANUAL_REPLAY';
  response_status_code?: number;
  response_headers?: any;
  response_body?: string;
  execution_duration_ms?: number;
  error_message?: string;
  next_retry_at?: string;
  delivered_at?: string;
  created_at: string;
}

// ==========================================
// ADMIN-001: Configuration Toolkit & Setup Wizard
// ==========================================

export interface CompanySettings {
  id: string;
  company_name: string;
  legal_name?: string;
  registration_number?: string;
  tax_id?: string;
  company_domain?: string;
  primary_email?: string;
  support_email?: string;
  headquarters_branch_id?: string;
  headquarters_branch_name?: string;
  default_currency: string;
  timezone: string;
  date_format: string;
  branding_primary_color: string;
  branding_accent_color: string;
  logo_url?: string;
  favicon_url?: string;
  setup_wizard_completed: boolean;
  setup_wizard_step: number;
  setup_completed_at?: string;
  enabled_modules: Record<string, boolean>;
  created_at: string;
  updated_at?: string;
}

export interface ConfigurationPackage {
  id: string;
  package_code: string;
  package_name: string;
  version: string;
  pmt_version_compatibility: string;
  package_type: 'FULL' | 'WORKFLOWS_ONLY' | 'ROLES_PERMISSIONS' | 'TEMPLATES' | 'SLA_POLICIES';
  description?: string;
  manifest: Record<string, any>;
  package_data: Record<string, any>;
  is_builtin_template: boolean;
  applied_at?: string;
  applied_by?: string;
  applied_by_name?: string;
  created_at: string;
}

export interface ConfigurationAuditLog {
  id: string;
  package_id?: string;
  package_name?: string;
  package_code?: string;
  action: 'DRY_RUN_PREVIEW' | 'APPLY_PACKAGE' | 'ROLLBACK' | 'EXPORT_PACKAGE';
  applied_changes: any[];
  conflicts_detected: any[];
  status: 'SUCCESS' | 'WARNINGS' | 'FAILED';
  executed_by: string;
  executed_by_name?: string;
  created_at: string;
}

export interface PackageDiffResult {
  compatible: boolean;
  pmtVersion: string;
  totalChanges: number;
  newEntities: number;
  existingEntities: number;
  conflicts: Array<{ entity: string; identifier: string; reason: string }>;
  diffs: Array<{ entity: string; identifier: string; action: string; details: string }>;
}

// ========================================================
// Source-Linked Drafting & Human-Reviewed Summaries (LATER-002)
// ========================================================

export type DraftType =
  | 'DRAFT_SUBTASKS'
  | 'DRAFT_ACCEPTANCE_CRITERIA'
  | 'DRAFT_RELEASE_NOTES'
  | 'DRAFT_SPRINT_SUMMARY'
  | 'DRAFT_BUG_TRIAGE'
  | 'GAP_SUGGESTION'
  | 'DUPLICATE_SUGGESTION';

export type DraftStatus =
  | 'PENDING_REVIEW'
  | 'ACCEPTED'
  | 'MODIFIED_AND_ACCEPTED'
  | 'REJECTED'
  | 'DISCARDED';

export type AudienceScope =
  | 'INTERNAL_ONLY'
  | 'CLIENT_SAFE'
  | 'PUBLIC_COMMUNITY';

export interface DraftSuggestion {
  id: string;
  draft_code: string;
  draft_type: DraftType;
  title: string;
  source_entity_type: 'TASK' | 'REQUIREMENT' | 'VERSION' | 'SPRINT' | 'CLIENT_INTAKE' | 'PRODUCT_IDEA' | 'PROJECT';
  source_entity_id: string;
  source_entity_code?: string;
  audience_scope: AudienceScope;
  status: DraftStatus;
  suggested_content: any;
  reviewed_content?: any;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  applied_entity_type?: string;
  applied_entity_id?: string;
  created_by: string;
  creator_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface DraftRuleConfig {
  id: string;
  rule_code: string;
  rule_name: string;
  rule_type: 'GAP_DETECTION' | 'DUPLICATE_DETECTION' | 'WBS_GENERATION' | 'SUMMARY_GENERATION';
  is_enabled: boolean;
  similarity_threshold?: number;
  rule_parameters: Record<string, any>;
  description?: string;
  created_at: string;
  updated_at?: string;
}









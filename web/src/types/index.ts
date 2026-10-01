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


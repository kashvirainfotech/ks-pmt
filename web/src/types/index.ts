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
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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


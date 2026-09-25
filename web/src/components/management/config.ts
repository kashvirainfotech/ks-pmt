import { Entity, Field } from './EntityManager';
export const f = (
  name: string,
  label: string,
  options: Partial<Field> = {},
): Field => ({ name, label, ...options });
export const ref = (
  name: string,
  label: string,
  source: string,
  optionLabel: string,
  required = false,
): Field => f(name, label, { source, optionLabel, required });
const text = (name: string, label: string, required = false) =>
  f(name, label, { required });
const num = (name: string, label: string, value?: number) =>
  f(name, label, { type: 'number', min: 0, default: value });
const date = (name: string, label: string, editOnly = false) =>
  f(name, label, { type: 'date', editOnly });
const choice = (
  name: string,
  label: string,
  options: string[],
  value?: string,
) => f(name, label, { options, default: value });
const check = (name: string, label: string, value = false) =>
  f(name, label, { type: 'checkbox', default: value });
const desc = f('description', 'Description', { type: 'textarea' });
const currency = text('currency', 'Currency');
const branch = (name = 'branchId', label = 'Branch', required = true) =>
  ref(name, label, '/branches', 'branch_name', required);
const user = (name: string, label: string, required = false) =>
  ref(name, label, '/users', 'full_name', required);
const project = ref('projectId', 'Project', '/projects', 'project_name');
const product = ref('productId', 'Product', '/products', 'product_name');
const client = ref('clientId', 'Client', '/clients', 'company_name', true);
const type = ref('taskTypeId', 'Task type', '/task-types', 'type_name', true);
const status = (name: string, label: string) =>
  ref(name, label, '/task-workflows/statuses', 'status_name', true);
const code = (name: string, label: string) =>
  f(name, label, { required: true, createOnly: true });
export const branchConfig: Entity = {
  title: 'Branches',
  endpoint: '/branches',
  permission: 'BRANCHES:MANAGE',
  status: true,
  columns: ['branch_code', 'branch_name', 'city', 'email', 'is_active'],
  fields: [
    code('branchCode', 'Branch code'),
    text('branchName', 'Branch name', true),
    text('addressLine1', 'Address line 1', true),
    text('addressLine2', 'Address line 2'),
    text('city', 'City', true),
    text('state', 'State', true),
    text('country', 'Country'),
    text('postalCode', 'Postal code', true),
    text('phone', 'Phone'),
    f('email', 'Official email', { type: 'email' }),
    f('latitude', 'Latitude', { type: 'number', min: -90, max: 90 }),
    f('longitude', 'Longitude', { type: 'number', min: -180, max: 180 }),
    f('geofenceRadiusMeters', 'Geofence radius (meters)', {
      type: 'number',
      min: 50,
      default: 200,
    }),
    check('isHeadOffice', 'Head office'),
  ],
};
export const departmentConfig: Entity = {
  title: 'Departments',
  endpoint: '/departments',
  permission: 'USERS:MANAGE',
  status: true,
  columns: ['dept_code', 'dept_name', 'hod_name', 'is_active'],
  fields: [
    code('deptCode', 'Department code'),
    text('deptName', 'Department name', true),
    desc,
    user('hodUserId', 'Department head'),
  ],
};
export const designationConfig: Entity = {
  title: 'Designations',
  endpoint: '/designations',
  permission: 'USERS:MANAGE',
  status: true,
  columns: [
    'desig_code',
    'desig_name',
    'hierarchy_level',
    'dept_name',
    'is_active',
  ],
  fields: [
    code('desigCode', 'Designation code'),
    text('desigName', 'Designation name', true),
    ref('departmentId', 'Department', '/departments', 'dept_name', true),
    f('hierarchyLevel', 'Hierarchy level', {
      type: 'number',
      min: 1,
      max: 20,
      default: 1,
      required: true,
    }),
    desc,
  ],
};
export const userConfig: Entity = {
  title: 'Employees',
  endpoint: '/users',
  permission: 'USERS:MANAGE',
  status: true,
  paginated: true,
  columns: [
    'employee_code',
    'first_name',
    'last_name',
    'email',
    'primary_branch_name',
    'role_name',
    'is_active',
  ],
  fields: [
    code('employeeCode', 'Employee code'),
    text('firstName', 'First name', true),
    text('lastName', 'Last name', true),
    f('email', 'Official email', { type: 'email', required: true }),
    text('mobileNumber', 'Mobile number', true),
    text('emergencyContact', 'Emergency contact'),
    f('password', 'Password (leave blank to retain when editing)', {
      type: 'password',
    }),
    branch('primaryBranchId', 'Primary branch'),
    {
      ...branch('secondaryBranchIds', 'Secondary branches', false),
      type: 'multi',
    },
    ref('departmentId', 'Department', '/departments', 'dept_name', true),
    ref('designationId', 'Designation', '/designations', 'desig_name', true),
    ref('roleId', 'Role', '/rbac/roles', 'role_name', true),
    user('reportingManagerId', 'Reporting manager'),
    check('isEmailLoginAllowed', 'Allow password login', true),
    check('isOtpLoginAllowed', 'Allow OTP login', true),
    choice('employmentStatus', 'Employment status', [
      'ACTIVE',
      'INACTIVE',
      'SUSPENDED',
    ]),
  ],
};
export const typeConfig: Entity = {
  title: 'Task types',
  endpoint: '/task-types',
  permission: 'TASKS:CREATE',
  updatePermission: 'TASKS:UPDATE',
  status: true,
  columns: ['type_code', 'type_name', 'is_chargeable_default', 'is_active'],
  fields: [
    code('typeCode', 'Type code'),
    text('typeName', 'Type name', true),
    desc,
    text('colorHex', 'Badge color (hex)'),
    text('iconName', 'Icon name'),
    check('isChargeableDefault', 'Chargeable by default'),
    text('defaultSeverity', 'Default severity'),
    f('customFields', 'Custom field definitions (JSON)', { type: 'json' }),
  ],
};
export const statusConfig: Entity = {
  title: 'Workflow statuses',
  endpoint: '/task-workflows/statuses',
  permission: 'TASKS:CREATE',
  updatePermission: 'TASKS:UPDATE',
  status: true,
  columns: [
    'status_code',
    'status_name',
    'status_category',
    'sequence_order',
    'is_terminal',
    'is_active',
  ],
  fields: [
    code('statusCode', 'Status code'),
    text('statusName', 'Status name', true),
    desc,
    {
      ...choice('statusCategory', 'Category', [
        'TODO',
        'IN_PROGRESS',
        'REVIEW_TEST',
        'DONE',
        'CANCELLED',
      ]),
      required: true,
    },
    f('sequenceOrder', 'Sequence', { type: 'number', min: 1, default: 1 }),
    text('colorHex', 'Badge color (hex)'),
    check('isTerminal', 'Terminal status'),
  ],
};
export const transitionFields = [
  type,
  status('fromStatusId', 'From status'),
  status('toStatusId', 'To status'),
];
export const assignmentConfig: Entity = {
  title: 'Assignment rules',
  endpoint: '/auto-assignment/rules',
  permission: 'TASKS:ASSIGN',
  noEdit: true,
  columns: ['rule_name', 'trigger_event', 'target_assignment_type'],
  fields: [
    text('ruleName', 'Rule name', true),
    {
      ...choice('triggerEvent', 'Trigger event', [
        'ON_CREATION',
        'ON_STATUS_CHANGE',
      ]),
      required: true,
    },
    { ...type, required: false },
    { ...status('fromStatusId', 'From status'), required: false },
    { ...status('toStatusId', 'To status'), required: false },
    branch('branchId', 'Branch', false),
    {
      ...choice('targetAssignmentType', 'Assignment strategy', [
        'SPECIFIC_USER',
        'DEPARTMENT_HOD',
        'DESIGNATION_HIERARCHY',
        'PROJECT_MANAGER',
        'ROUND_ROBIN',
      ]),
      required: true,
    },
    ref('targetDepartmentId', 'Target department', '/departments', 'dept_name'),
    ref(
      'targetDesignationId',
      'Target designation',
      '/designations',
      'desig_name',
    ),
    user('targetUserId', 'Target employee'),
  ],
};
export const clientConfig: Entity = {
  title: 'Clients',
  endpoint: '/clients',
  status: true,
  paginated: true,
  columns: [
    'client_code',
    'company_name',
    'contact_person',
    'email',
    'client_type',
    'is_active',
  ],
  fields: [
    code('clientCode', 'Client code'),
    text('companyName', 'Company name', true),
    text('contactPerson', 'Contact person', true),
    text('designation', 'Contact designation'),
    f('email', 'Email', { type: 'email', required: true }),
    text('mobileNumber', 'Phone', true),
    text('alternatePhone', 'Alternate phone'),
    text('website', 'Website'),
    f('address', 'Billing address', { type: 'textarea' }),
    text('city', 'City', true),
    text('state', 'State', true),
    text('country', 'Country'),
    text('postalCode', 'Postal code'),
    text('taxIdOrGst', 'Tax / GST ID'),
    choice(
      'clientType',
      'Lifecycle',
      ['PROSPECT', 'ACTIVE_CLIENT', 'FORMER_CLIENT'],
      'PROSPECT',
    ),
    branch(),
    user('accountManagerUserId', 'Account manager'),
  ],
};
export const productConfig: Entity = {
  title: 'Products',
  endpoint: '/products',
  permission: 'PRODUCTS:MANAGE',
  status: true,
  columns: [
    'product_code',
    'product_name',
    'category',
    'current_version',
    'base_license_price',
    'is_active',
  ],
  fields: [
    code('productCode', 'Product code'),
    text('productName', 'Product name', true),
    desc,
    text('category', 'Category'),
    text('currentVersion', 'Production version'),
    text('techStack', 'Tech stack'),
    f('documentationLinks', 'Documentation links', { type: 'textarea' }),
    num('baseLicensePrice', 'Base license price', 0),
    num('standardAmcPercentage', 'AMC percentage', 18),
    text('subscriptionPlans', 'Subscription plans'),
    num('implementationFee', 'Implementation fee'),
    currency,
    user('productManagerUserId', 'Product manager'),
  ],
};
export const projectConfig: Entity = {
  title: 'Projects',
  endpoint: '/projects',
  permission: 'PROJECTS:CREATE',
  updatePermission: 'PROJECTS:UPDATE',
  status: true,
  paginated: true,
  columns: [
    'project_code',
    'project_name',
    'client_name',
    'branch_name',
    'project_status',
    'is_active',
  ],
  fields: [
    code('projectCode', 'Project code'),
    text('projectName', 'Project name', true),
    desc,
    client,
    branch(),
    user('projectManagerUserId', 'Project manager', true),
    text('techStack', 'Tech stack'),
    choice(
      'billingType',
      'Billing model',
      ['FIXED_COST', 'TIME_AND_MATERIAL', 'RETAINER'],
      'FIXED_COST',
    ),
    num('contractAmount', 'Contract value', 0),
    num('hourlyRate', 'Hourly rate', 0),
    num('budgetedHours', 'Budgeted hours', 0),
    currency,
    date('plannedStartDate', 'Planned start'),
    date('plannedEndDate', 'Planned end'),
    date('actualStartDate', 'Actual start', true),
    date('actualEndDate', 'Actual end', true),
    choice(
      'projectStatus',
      'Project status',
      ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'TERMINATED', 'CANCELLED'],
      'PLANNING',
    ),
    f('invoicingMilestones', 'Invoicing milestones', { type: 'textarea' }),
  ],
};
export const versionConfig: Entity = {
  title: 'Versions',
  endpoint: '/versions',
  permission: 'PROJECTS:UPDATE',
  status: true,
  columns: [
    'version_code',
    'version_name',
    'project_name',
    'product_name',
    'target_release_date',
    'status',
  ],
  fields: [
    text('versionCode', 'Version number', true),
    text('versionName', 'Version name'),
    f('description', 'Release notes / changelog', { type: 'textarea' }),
    {
      ...choice('entityType', 'Applies to', ['PRODUCT', 'PROJECT']),
      required: true,
      createOnly: true,
    },
    { ...project, createOnly: true },
    { ...product, createOnly: true },
    date('plannedStartDate', 'Planned start'),
    date('targetReleaseDate', 'Target release'),
    date('actualReleaseDate', 'Actual release', true),
    choice(
      'status',
      'Release status',
      [
        'PLANNING',
        'IN_PROGRESS',
        'CODE_FREEZE',
        'RELEASED',
        'DEPRECATED',
        'ARCHIVED',
      ],
      'PLANNING',
    ),
  ],
};
export const licenseFields: Field[] = [
  client,
  {
    ...choice('licenseType', 'License type', [
      'SAAS_SUBSCRIPTION',
      'ON_PREMISE_PERPETUAL',
      'ANNUAL_LEASE',
      'RENTAL',
    ]),
    required: true,
  },
  { ...num('contractValue', 'Annual contract value', 0), required: true },
  num('amcAmount', 'AMC amount', 0),
  currency,
  { ...date('licenseStartDate', 'License start'), required: true },
  date('licenseEndDate', 'License end'),
  date('amcRenewalDate', 'AMC renewal'),
  text('supportTier', 'Support tier'),
  choice(
    'status',
    'License status',
    ['ACTIVE', 'EXPIRED', 'PENDING_RENEWAL', 'TERMINATED'],
    'ACTIVE',
  ),
  f('notes', 'Notes', { type: 'textarea' }),
];
export const memberFields: Field[] = [
  user('userId', 'Employee', true),
  text('projectRole', 'Project role', true),
  f('allocationPercentage', 'Allocation percent', {
    type: 'number',
    min: 1,
    max: 100,
    default: 100,
  }),
  date('startDate', 'Start date'),
  date('endDate', 'End date'),
];
export const taskFields: Field[] = [
  text('title', 'Title', true),
  desc,
  type,
  choice(
    'priority',
    'Priority',
    ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'],
    'MEDIUM',
  ),
  text('severity', 'Severity'),
  { ...project, createOnly: true },
  { ...product, createOnly: true },
  ref('versionId', 'Version', '/versions', 'version_code'),
  {
    ...ref('parentTaskId', 'Parent task', '/tasks', 'title'),
    createOnly: true,
  },
  branch(),
  { ...user('assigneeIds', 'Assignees'), type: 'multi' },
  user('primaryAssigneeId', 'Primary assignee'),
  date('plannedStartDate', 'Planned start'),
  date('plannedEndDate', 'Planned end'),
  date('actualStartDate', 'Actual start', true),
  date('actualEndDate', 'Actual end', true),
  num('estimatedHours', 'Estimated hours', 0),
  check('isChargeable', 'Chargeable'),
  num('chargeAmount', 'Charge amount', 0),
  currency,
];
